/**
 * La basura MIENTRAS SE SCROLLEA, de cualquier forma (28/10/2026).
 *
 *     node herramientas/consistencia.mjs CARPETA [CARPETA…] [--guardar N]
 *
 * Al scrollear, la página se mueve ENTERA: dos cuadros seguidos del screencast,
 * corridos uno contra el otro lo que se movió el scroll, tienen que coincidir
 * píxel a píxel en la parte que comparten. Lo que no coincide es algo que
 * apareció o desapareció entre los dos cuadros sin que nada se moviera: la
 * basura de rasterizado, sea un cuadradito de 4×4, una raya o un pedazo de
 * pantalla corrido.
 *
 * Por qué hace falta: Santiago ve los cuadraditos "scrolleando, al entrar a la
 * lección y recién abierta la app", y los dos instrumentos de antes no miran
 * eso. `--pixeles` sólo ve cuadraditos planos de 4×4 (no vio los pedazos
 * corridos del 28/10), y la sonda de `jugar-aprender.mjs --sonda` sólo mira
 * con la página quieta.
 *
 * Cómo:
 *   · sólo pares de cuadros de una lección, a menos de 100 ms, con un scroll
 *     de entre 2 y 400 px de pantalla, y del mismo tramo;
 *   · el corrimiento se prueba en el redondeo y ±1 px, y se queda el mejor
 *     (el scroll viene en px CSS con decimales);
 *   · se descartan los pares en los 1,2 s después de responder, de que
 *     aparezca la explicación o de un toque: ahí la página cambia de verdad;
 *   · un par está "roto" si quedan ≥ 16 píxeles con un salto de más de 60/255
 *     (el JPEG y los degradados mueven ~10; un cuadradito de 4×4 son 16).
 *
 * Calibrado sobre `sesion-2026-10-28-22-02`: la gran mayoría de los pares da
 * 0 píxeles de más de 60.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

const args = process.argv.slice(2);
const carpetas = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--guardar");
const guardar = args.includes("--guardar") ? Number(args[args.indexOf("--guardar") + 1]) || 0 : 0;
if (!carpetas.length) { console.error("Uso:  node herramientas/consistencia.mjs CARPETA [CARPETA…] [--guardar N]"); process.exit(1); }

const leer = (f) => (existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);
const ES_LECCION = /^\/aprender\/[^/]+\/?$/;
const UMBRAL = 60, MINIMO = 16, QUIETO_MS = 1200;

const total = new Map(); // "rama|lección" → { pares, rotos }
const ejemplos = [];
for (const C of carpetas) {
  const cuadros = leer(path.join(C, "cuadros.jsonl")).sort((a, b) => a.t - b.t);
  const muestras = leer(path.join(C, "muestras.jsonl")).sort((a, b) => a.ahora - b.ahora);
  const pagina = leer(path.join(C, "pagina.jsonl"));
  /* Lo que cambia la página de verdad: un CLIC (responder, "Probar de nuevo",
     un enlace) y la explicación que aparece o se va. No los toques: cada
     deslizamiento empieza con uno, y descartarlos dejaba afuera todo el
     scroll (primera corrida: 0 pares mirados). */
  const cambios = pagina.filter((e) => typeof e.origen === "number" && ((e.tipo === "evento" && e.nombre === "click") || (e.tipo === "aprender" && /^explicacion/.test(e.que || ""))))
    .map((e) => e.origen + e.t).sort((a, b) => a - b);
  const cercaDeUnCambio = (t0, t1) => cambios.some((t) => t <= t1 && t1 - t < QUIETO_MS) || cambios.some((t) => t >= t0 && t <= t1);
  let j = 0;
  const rutaEn = (t) => { while (j + 1 < muestras.length && muestras[j + 1].ahora <= t) j++; const m = muestras[j]; return m && m.ahora <= t && !m.carga ? m.ruta : null; };
  let previo = null, imgPrevia = null;
  for (const c of cuadros) {
    const ruta = rutaEn(c.t);
    const sirve = ruta && ES_LECCION.test(ruta) && c.tramo !== "inicio" && typeof c.scroll === "number";
    if (!sirve) { previo = null; imgPrevia = null; continue; }
    let img;
    try { img = await sharp(path.join(C, "cuadros", c.f)).removeAlpha().raw().toBuffer({ resolveWithObject: true }); } catch { previo = null; continue; }
    if (previo && previo.tramo === c.tramo && previo.rama === c.rama && c.t - previo.t < 100 && imgPrevia) {
      const d = (c.scroll - previo.scroll) * (img.info.width / (c.dw || 360));
      if (Math.abs(d) >= 2 && Math.abs(d) <= 400 && !cercaDeUnCambio(previo.t, c.t)) {
        const W = img.info.width, H = img.info.height, A = imgPrevia.data, B = img.data;
        let mejor = null;
        for (const D of [Math.round(d) - 1, Math.round(d), Math.round(d) + 1]) {
          let fuertes = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
          // y en el cuadro nuevo; y + D en el anterior. Se dejan 4 px de margen arriba y abajo.
          for (let y = Math.max(0, -D) + 4; y < Math.min(H, H - D) - 4; y++) {
            for (let x = 0; x < W; x++) {
              const ia = ((y + D) * W + x) * 3, ib = (y * W + x) * 3;
              const v = Math.max(Math.abs(A[ia] - B[ib]), Math.abs(A[ia + 1] - B[ib + 1]), Math.abs(A[ia + 2] - B[ib + 2]));
              if (v > UMBRAL) { fuertes++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            }
          }
          if (!mejor || fuertes < mejor.fuertes) mejor = { D, fuertes, caja: [x0, y0, x1, y1] };
          if (fuertes === 0) break;
        }
        const k = `${c.rama}|${ruta.replace(/^\/aprender\/|\/$/g, "")}`;
        const T = total.get(k) ?? { pares: 0, rotos: 0 };
        T.pares++;
        if (mejor.fuertes >= MINIMO) { T.rotos++; ejemplos.push({ C, a: previo.f, b: c.f, rama: c.rama, ruta, ...mejor }); }
        total.set(k, T);
      }
    }
    previo = c;
    imgPrevia = img;
  }
}

const ramas = [...new Set([...total.keys()].map((k) => k.split("|")[0]))];
const lecs = [...new Set([...total.keys()].map((k) => k.split("|")[1]))].sort();
console.log("pares de cuadros scrolleando con basura / pares mirados (%)");
console.log("rama".padEnd(8) + lecs.map((l) => l.padEnd(20)).join("") + "TOTAL");
for (const r of ramas) {
  let p = 0, b = 0;
  const celdas = lecs.map((l) => { const T = total.get(`${r}|${l}`); if (!T) return "—".padEnd(20); p += T.pares; b += T.rotos; return `${T.rotos}/${T.pares} (${((100 * T.rotos) / T.pares).toFixed(1)}%)`.padEnd(20); });
  console.log(r.padEnd(8) + celdas.join("") + `${b}/${p} (${p ? ((100 * b) / p).toFixed(1) : "—"}%)`);
}
if (guardar && ejemplos.length) {
  const salida = path.join(carpetas[0], "consistencia");
  mkdirSync(salida, { recursive: true });
  for (const e of ejemplos.slice(0, guardar)) {
    const [x0, y0, x1, y1] = e.caja;
    const cx = Math.round((x0 + x1) / 2), cy = Math.round((y0 + y1) / 2);
    const w = 240, h = 180, left = Math.max(0, Math.min(720 - w, cx - w / 2));
    const topB = Math.max(0, Math.min(1600 - h, cy - h / 2)), topA = Math.max(0, Math.min(1600 - h, topB + e.D));
    const [ia, ib] = await Promise.all([
      sharp(path.join(e.C, "cuadros", e.a)).extract({ left, top: topA, width: w, height: h }).png().toBuffer(),
      sharp(path.join(e.C, "cuadros", e.b)).extract({ left, top: topB, width: w, height: h }).png().toBuffer(),
    ]);
    await sharp({ create: { width: w * 2 + 10, height: h, channels: 3, background: "#fff" } })
      .composite([{ input: ia, left: 0, top: 0 }, { input: ib, left: w + 10, top: 0 }]).resize((w * 2 + 10) * 2, h * 2, { kernel: "nearest" })
      .png().toFile(path.join(salida, `${e.rama}-${path.basename(e.b, ".jpg")}-${e.fuertes}.png`));
  }
  console.log(`\n  ${Math.min(guardar, ejemplos.length)} ejemplos (anterior | nuevo, alineados) en ${salida}`);
}
