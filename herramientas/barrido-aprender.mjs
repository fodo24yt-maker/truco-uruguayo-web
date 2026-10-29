/**
 * LO QUE QUEDA EN PANTALLA DESPUÉS DE SCROLLEAR, variante contra variante
 * (28/10/2026). Es el instrumento más cercano a lo que ve Santiago en Aprender.
 *
 *     node herramientas/medir-celular.mjs --sesion 25 --jpeg 90 --liviano   (en otra terminal: da los cuadros y el puente)
 *     node herramientas/barrido-aprender.mjs CARPETA_SESION PARADAS O,LG,FIGC   barre la lección abierta
 *     node herramientas/barrido-aprender.mjs --resumen CARPETA [CARPETA…]      la tabla por variante y lección
 *
 * ── Qué hace ─────────────────────────────────────────────────────────────
 *
 * Recorre la lección que esté abierta deslizando por el centro (con el cerrojo
 * de siempre antes de cada deslizamiento), de arriba abajo y de vuelta. Antes
 * de cada deslizamiento pone la VARIANTE de turno (un CSS de `VARIANTES`), así
 * que lo que queda en pantalla en la parada lo dibujó esa variante. En cada
 * parada compara tres cuadros del screencast de la sesión:
 *
 *   1. lo que HAY: se pide moviendo la opacidad de un puntito de 2 px en su
 *      propia capa, o sea un cuadro compuesto SIN rasterizar nada de nuevo;
 *   2. un dibujo FRESCO: un fondo blanco al 6% en el artículo, sus figuras, el
 *      ejercicio y cada carta (mueve a lo sumo ~13/255) obliga a rasterizar
 *      todo, también lo que una variante haya puesto en su propia capa;
 *   3. otro FRESCO, al sacar ese fondo.
 *
 * Un píxel está roto EN PANTALLA si lo que había difiere de los dos frescos
 * (más de 40/255) y los dos frescos coinciden entre sí (20 o menos). Si los
 * que difieren son los frescos, la basura la hizo el propio redibujado, y se
 * cuenta aparte. Una parada está "rota" con 12 píxeles o más (un cuadradito
 * de 4×4 son 16).
 *
 * ── Por qué así, y no de otra forma (todo aprendido el 28/10) ───────────
 *
 *  · INTERCALADO, una variante por parada: corridas una después de otra, el
 *    estado del teléfono (que cambia con el tiempo) se mezcla con la
 *    variante. Pasó: una variante dio 10 de 10 roto en un tramo en el que
 *    también los dibujos frescos salían rotos.
 *  · "Lo que hay" se pide con el puntito: el último cuadro que llegó puede ser
 *    viejo (el screencast se saltea cuadros) y la comparación inventa roturas.
 *  · Los cuadros tienen que ser del mismo scroll (cada uno trae el suyo).
 *  · MIRAR LAS IMÁGENES (se guardan las paradas rotas): cada instrumento de
 *    ese día tuvo un punto ciego, y dos "curas" resultaron ser puntos ciegos.
 *
 * Toca el teléfono: sólo deslizamientos por el centro (30–75% del alto), con
 * el cerrojo antes de cada uno (nuestra actividad arriba, pantalla prendida,
 * el foco en nuestra ventana). Lo que escribe va a CARPETA/barrido/, adentro
 * de `capturas/`, que no sube.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

import { adb } from "./celular-usb.mjs";
import { ipDeWindows } from "./puente-devtools.mjs";

const args = process.argv.slice(2);
const morir = (...m) => { console.error("\n✗", ...m, "\n"); process.exit(1); };

/* Las variantes: el CSS que queda puesto mientras se scrollea. "O" es la app
   tal cual. Los selectores no usan ganchos propios: `article.prosa` también
   está en los legales, pero el barrido sólo corre en una lección. */
export const VARIANTES = {
  O: "",
  // Cada hijo del artículo (párrafo, figura, ejercicio) en su búfer; los h3 ya tienen su opacidad (.85).
  LG: "article.prosa > :not(h3) { opacity: 0.999; }",
  // Las figuras con cartas y el ejercicio en su PROPIA CAPA del compositor: el texto no comparte mosaico con las cartas.
  FIGC: "article.prosa figure, article.prosa section { will-change: transform; }",
  // Lo mismo, pero en un búfer (opacity) en vez de una capa.
  FIGO: "article.prosa figure, article.prosa section { opacity: 0.999; }",
  // Cada carta en su propia capa.
  CARTAC: "article.prosa .carta { will-change: transform; }",
};

// ── El resumen ──────────────────────────────────────────────────────────

if (args[0] === "--resumen") {
  const filas = args.slice(1).flatMap((c) => {
    const f = path.join(c, "barrido", "barrido.jsonl");
    return existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  }).filter((x) => (x.metodo ?? 1) === 2); // sólo las del dibujo fresco que alcanza las capas propias
  const vs = [...new Set(filas.map((x) => x.variante))];
  const lecs = [...new Set(filas.map((x) => x.leccion))].sort();
  const celda = (xs) => (xs.length ? `${xs.filter((x) => x.rota).length}/${xs.length}` : "—");
  console.log("paradas con basura en pantalla / paradas");
  console.log("variante".padEnd(10) + lecs.map((l) => l.padEnd(14)).join("") + "TOTAL".padEnd(14) + "px (mediana de las rotas)");
  for (const v of vs) {
    const f = filas.filter((x) => x.variante === v);
    const px = f.filter((x) => x.rota).map((x) => x.rotos).sort((a, b) => a - b);
    const t = f.filter((x) => x.rota).length;
    console.log(v.padEnd(10) + lecs.map((l) => celda(f.filter((x) => x.leccion === l)).padEnd(14)).join("")
      + `${t}/${f.length} (${f.length ? Math.round((100 * t) / f.length) : 0}%)`.padEnd(14) + (px.length ? px[Math.floor(px.length / 2)] : "—"));
  }
  process.exit(0);
}

// ── El barrido ──────────────────────────────────────────────────────────

const [SESION, paradasArg = "16", listaArg = "O"] = args;
if (!SESION || !existsSync(path.join(SESION, "cuadros.jsonl"))) morir("Uso:  node herramientas/barrido-aprender.mjs CARPETA_SESION PARADAS O,LG,…   (con una sesión de medir-celular grabando)");
const LISTA = listaArg.split(",").filter((v) => Object.hasOwn(VARIANTES, v));
if (!LISTA.length) morir(`Variantes: ${Object.keys(VARIANTES).join(", ")}`);
const PARADAS = Math.max(1, Math.min(200, Number(paradasArg) || 16));
const SAL = path.join(SESION, "barrido");
mkdirSync(SAL, { recursive: true });
const log = (...a) => { const l = `${new Date().toTimeString().slice(0, 8)} ${a.join(" ")}`; console.log(l); appendFileSync(path.join(SAL, "barrido.log"), l + "\n"); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const ip = ipDeWindows();
if (!ip) morir("No encuentro la IP de Windows.");
const url = `http://${ip}:9223`;
const pag = (await (await fetch(`${url}/json/list`)).json()).find((t) => t.type === "page" && t.url.startsWith("https://localhost"));
if (!pag) morir("No está la página de la app en el inspector.");
const ws = new WebSocket(pag.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, url.replace("http", "ws")));
await new Promise((ok, mal) => { ws.addEventListener("open", ok); ws.addEventListener("error", mal); });
let id = 0;
const pend = new Map();
ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } });
const ev = (expr, aw = false) => new Promise((ok) => {
  const i = ++id;
  pend.set(i, (d) => ok(d.result?.result?.value));
  ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true, awaitPromise: aw } }));
  setTimeout(() => { if (pend.has(i)) { pend.delete(i); ok(null); } }, 8000);
});

const ultimo = () => {
  try {
    const L = readFileSync(path.join(SESION, "cuadros.jsonl"), "utf8").slice(-4000).split("\n").filter(Boolean);
    const c = JSON.parse(L[L.length - 1]);
    return existsSync(path.join(SESION, "cuadros", c.f)) ? c : null;
  } catch { return null; }
};
/** El primer cuadro posterior a `desde`, y ya rasterizado: se espera un poco y se toma el último. */
const nuevo = async (desde) => {
  for (let k = 0; k < 15; k++) {
    await dormir(120);
    const c = ultimo();
    if (c && c.n > desde.n) { await dormir(350); return ultimo() ?? c; }
  }
  return null;
};
const NUESTRA = "uy.trucouruguayo.app/.MainActivity";
const FOCO = "uy.trucouruguayo.app/uy.trucouruguayo.app.MainActivity";
function cerrojo() {
  const s = adb("shell", "dumpsys activity activities | grep -m1 topResumedActivity; dumpsys power | grep -m1 mWakefulness=; dumpsys window | grep -m1 mCurrentFocus").stdout || "";
  const arriba = /topResumedActivity=\S+\s+\S+\s+(\S+)/.exec(s)?.[1] || "";
  const foco = /mCurrentFocus=Window\{\S+\s+\S+\s+(\S+)\}/.exec(s)?.[1] || "";
  return arriba === NUESTRA && foco === FOCO && /mWakefulness=Awake/.test(s);
}

const QUIETO = `new Promise((ok) => { let a = scrollY, n = 0; const f = () => { if (scrollY === a) n++; else { n = 0; a = scrollY; } if (n >= 20 && !document.getAnimations().some((x) => x.playState === "running")) ok(scrollY); else requestAnimationFrame(f); }; requestAnimationFrame(f); setTimeout(() => ok(null), 4000); })`;
const PUNTO = `(() => { let p = document.getElementById("sonda-punto"); if (!p) { p = document.createElement("div"); p.id = "sonda-punto"; p.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;background:#000;opacity:0.01;will-change:opacity;pointer-events:none;z-index:2147483647"; document.body.appendChild(p); } p.style.opacity = p.style.opacity === "0.01" ? "0.02" : "0.01"; })()`;
const PONER = (sid, css) => `(() => { document.querySelectorAll("style#${sid}").forEach((s) => s.remove()); if (!${JSON.stringify(css)}) return; const s = document.createElement("style"); s.id = "${sid}"; s.textContent = ${JSON.stringify(css)}; document.head.appendChild(s); })()`;
const SACAR = (sid) => `document.querySelectorAll("style#${sid}").forEach((s) => s.remove())`;
/* El fondo fresco va también en las figuras, el ejercicio y cada carta: si
   una variante los pone en su PROPIA CAPA, cambiarle el fondo sólo al
   artículo no los vuelve a dibujar, y la basura que quede adentro de esas
   capas no se ve (28/10: dos variantes con capas dieron 0 de 27 así, y no se
   les podía creer). */
const FONDO = "article.prosa, article.prosa figure, article.prosa section, article.prosa .carta { background-color: rgba(255,255,255,0.06) !important; }";
const leer = (c) => sharp(path.join(SESION, "cuadros", c.f)).removeAlpha().raw().toBuffer({ resolveWithObject: true });

let i = 0, hechas = 0, bajando = true;
await ev(SACAR("barrido-fresco"));
await ev(PONER("barrido-variante", VARIANTES[LISTA[0]]));
for (let intento = 0; intento < PARADAS * 3 && hechas < PARADAS; intento++) {
  const variante = LISTA[i % LISTA.length];
  const ruta = await ev("location.pathname");
  if (!/^\/aprender\/[^/]+\/?$/.test(ruta || "")) { log("no es una lección:", ruta); await dormir(2000); continue; }
  const y0 = await ev(QUIETO, true);
  if (y0 != null) {
    await dormir(300);
    const p0 = ultimo();
    await ev(PUNTO);
    const hay = p0 && await nuevo(p0);
    await ev(PONER("barrido-fresco", FONDO));
    const f1 = hay && await nuevo(hay);
    await ev(SACAR("barrido-fresco"));
    const f2 = f1 && await nuevo(f1);
    const y1 = await ev("scrollY");
    if (!hay || !f1 || !f2 || y1 !== y0 || [f1, f2].some((c) => Math.abs(c.scroll - hay.scroll) > 0.5) || Math.abs(hay.scroll - y0) > 1) {
      log(`${variante} · descartada (sin cuadro o se movió)`);
    } else {
      const [a, b, c] = await Promise.all([leer(hay), leer(f1), leer(f2)]);
      const W = a.info.width;
      const salto = (p, q, k) => Math.max(Math.abs(p[k] - q[k]), Math.abs(p[k + 1] - q[k + 1]), Math.abs(p[k + 2] - q[k + 2]));
      let rotos = 0, deLaSonda = 0, x0 = 1e9, ya = 1e9, x1 = -1, yb = -1;
      for (let k = 0; k < a.data.length; k += 3) {
        const ab = salto(a.data, b.data, k), ac = salto(a.data, c.data, k), bc = salto(b.data, c.data, k);
        if (ab > 40 && ac > 40 && bc <= 20) {
          rotos++;
          const p = k / 3, x = p % W, y = Math.floor(p / W);
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < ya) ya = y; if (y > yb) yb = y;
        } else if (bc > 40) deLaSonda++;
      }
      hechas++;
      const rota = rotos >= 12;
      const fila = { t: Date.now(), metodo: 2, variante, leccion: ruta.replace(/^\/aprender\/|\/$/g, ""), scroll: Math.round(y0), rotos, deLaSonda, rota, caja: rotos ? [x0, ya, x1, yb] : null };
      appendFileSync(path.join(SAL, "barrido.jsonl"), JSON.stringify(fila) + "\n");
      log(`${variante} · ${fila.leccion} · scroll ${fila.scroll} · ${rotos} px rotos en pantalla${rota ? " ROTA" : ""}${deLaSonda ? ` · ${deLaSonda} de la propia sonda` : ""}`);
      if (rota) {
        const base = `${fila.t.toString(36)}-${variante}`;
        writeFileSync(path.join(SAL, `${base}-hay.jpg`), readFileSync(path.join(SESION, "cuadros", hay.f)));
        writeFileSync(path.join(SAL, `${base}-fresca.jpg`), readFileSync(path.join(SESION, "cuadros", f2.f)));
      }
    }
  }
  // La variante siguiente se pone ANTES de deslizar: lo que quede en pantalla lo dibuja ella.
  i++;
  await ev(PONER("barrido-variante", VARIANTES[LISTA[i % LISTA.length]]));
  const largo = await ev("document.documentElement.scrollHeight - innerHeight");
  const y = await ev("scrollY");
  if (y != null && largo != null) { if (y >= largo - 5) bajando = false; if (y <= 5) bajando = true; }
  if (!cerrojo()) { log("CERROJO: no deslizo"); await dormir(2000); continue; }
  const [d0, d1] = bajando ? [1120, 600] : [600, 1120];
  adb("shell", "input", "swipe", "360", String(d0), "362", String(d1), "450");
  await dormir(600);
}
await ev(SACAR("barrido-variante"));
await ev(SACAR("barrido-fresco"));
ws.close();
log("fin", hechas);
process.exit(0);
