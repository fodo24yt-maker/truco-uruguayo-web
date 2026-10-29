/**
 * El jugador automático de APRENDER: lee lecciones y responde ejercicios en
 * el celular mientras `medir-celular.mjs` mide.
 *
 *     node herramientas/medir-celular.mjs --sesion 27 --jpeg 90 --liviano      (en una terminal)
 *     node herramientas/jugar-aprender.mjs 27 LOG --dedo --control CARPETA/control.txt
 *     node herramientas/jugar-aprender.mjs 10 LOG --latido     sólo mantener la pantalla despierta
 *
 * ── Por qué existe (28/10/2026) ──────────────────────────────────────────
 *
 * Santiago ve cuadraditos en los ejercicios de Aprender, "sobre las cartas y
 * los botones de respuesta", "al llegar al ejercicio y al tocar una
 * respuesta". `jugar-celular.mjs` sabe jugar la mesa y en una lección se
 * queda quieto (ahí "aprender" está en su lista de lo que no se toca). Éste
 * hace lo que hace una persona en Aprender: entra a una lección, baja hasta
 * el ejercicio deslizando el dedo, responde (bien o mal), a veces "Probar de
 * nuevo", y sigue a otra lección, por la lista, por "siguiente" o desde la
 * portada. Cada cosa queda anotada en la línea de tiempo de la sesión.
 *
 * Como `jugar-celular`, no abre su propio puente: usa el de la sesión de
 * `medir-celular.mjs` (el puerto 9223 en la IP de Windows).
 *
 * ── Lo que no se negocia: sólo adentro de la app, y sólo Aprender ─────────
 *
 * 1. **El cerrojo antes de CADA toque y CADA deslizamiento**, en una sola
 *    consulta: la actividad de arriba tiene que ser la nuestra, la pantalla
 *    prendida, y el FOCO de la ventana el de nuestra actividad. Esto último
 *    agarra lo que `topResumedActivity` deja pasar: la cortina de
 *    notificaciones o la pantalla de bloqueo encima de la app.
 * 2. **Una lista BLANCA de lo que se toca**, no una negra: la puerta
 *    "Aprender a jugar" de la portada, las lecciones de la lista, las
 *    respuestas del ejercicio, "Probar de nuevo", anterior/siguiente si van a
 *    otra lección, y la flecha de la barra si vuelve a la lista o a la
 *    portada. Nada más: ni "Ir a la Gira", ni "Ahora andá a jugar", ni el
 *    engranaje, ni los legales. Con `--caminos` se suman "Jugar" en la
 *    portada, "Partida rápida" y "Salir" de la mesa. La tecla Atrás sólo con
 *    un anuncio arriba Y con el foco (cierra el anuncio, no sale de la app).
 * 3. **Justo antes de tocar, se pregunta otra vez qué hay en ese punto**
 *    (`elementFromPoint`): si cambió la pantalla, no toca.
 * 4. **Los deslizamientos van por el centro**, entre el 30% y el 75% del alto:
 *    desde un borde abrirían la cortina, Inicio o el gesto de atrás de MIUI.
 * 5. **Nunca desbloquea el teléfono.** Si se bloqueó, espera.
 *
 * ── El latido ────────────────────────────────────────────────────────────
 *
 * El teléfono se apaga a los 5 minutos sin toques y Santiago no lo puede
 * volver a prender. Los clics por CDP no cuentan como actividad: sólo los
 * toques de verdad. Con `--latido` no juega: cada 40 s hace un deslizamiento
 * corto en el centro (que no es un clic), para cuando se está compilando o
 * contando entre dos sesiones.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

import { adb, PAQUETE } from "./celular-usb.mjs";
import { ipDeWindows } from "./puente-devtools.mjs";

const posicionales = process.argv.slice(2).filter((a, i, xs) => !a.startsWith("--") && xs[i - 1] !== "--control");
const minutos = Number(posicionales[0] || 10);
const LOG = posicionales[1] || null;
const CONTROL = process.argv.includes("--control") ? process.argv[process.argv.indexOf("--control") + 1] : null;
/** El dedo apoyado 70–220 ms y no siempre en el mismo píxel, como una persona. */
const DEDO = process.argv.includes("--dedo");
/** Responder y volver a probar sin pausas: "al tocar una respuesta". */
const RAPIDO = process.argv.includes("--rapido");
const LATIDO = process.argv.includes("--latido");
/* `--scroll` (28/10/2026): en los primeros arranques en frío lo que más
   basura dejaba era SCROLLEAR (0,2 bloques nuevos por scroll, contra 0,05 por
   respuesta), que es "al llegar al ejercicio". Con esto, la mitad de las
   veces, en vez de responder, recorre la lección arriba y abajo pasando por el
   ejercicio: más mosaicos nuevos por minuto, para distinguir ramas en menos
   tiempo. */
const SCROLL = process.argv.includes("--scroll");
/* `--sonda` (28/10/2026, segunda tanda): la basura que se ve no son sólo
   cuadraditos de 4×4. Con el arreglo del artículo en su búfer, una captura del
   teléfono mostró la parte de arriba de un ejercicio CORRIDA ~13 px (pedazos de
   imagen vieja pegados), y el detector de bloques planos no ve eso: medía
   "8 veces menos" mientras Santiago veía "más lugares". La sonda ve cualquier
   forma: con la página quieta, después de cada cosa que hace el jugador, saca
   una captura de lo que HAY en pantalla, obliga a Chromium a volver a
   rasterizar el artículo con un cambio casi invisible (un fondo blanco al 6%:
   a lo sumo ~13/255 sobre las letras; al 0,4% y al 2% el papel claro no
   cambiaba ni un píxel y el screencast no mandaba cuadro nuevo); va también
   en las figuras, el ejercicio y cada carta, porque si están en su propia capa
   del compositor el fondo del artículo no las vuelve a dibujar sin cambiar cómo se dibuja (no crea ni saca búferes), y saca
   otra. Si las dos difieren de verdad (saltos de más de 40/255), lo que había
   en pantalla estaba roto. Va adentro del jugador para que ningún toque caiga
   entre las dos capturas, que fue lo que arruinó la primera prueba A/B. */
const SONDA = process.argv.includes("--sonda");
/* `--caminos` (28/10/2026, lo pidió Santiago): los caminos de un usuario de
   verdad, para que la basura salga en las situaciones reales y en los bordes.
   Cada 30–60 s en una lección hace UNO:
     · ir a la lista y volver ENSEGUIDA a la misma lección;
     · ir a la lección siguiente o anterior ENSEGUIDA;
     · salir a la portada, entrar a Jugar, a una Partida rápida, quedarse unos
       segundos en la mesa (sin jugar), salir, y volver a Aprender.
   Cerrar y volver a abrir la app es `arranques-en-frio.mjs --aprender`. */
const CAMINOS = process.argv.includes("--caminos");
/* `--lecciones a,b,c` (28/10/2026): sólo esas lecciones. En los arranques en
   frío, 7 de cada 9 bloques cayeron en La muestra, entre cartas vecinas:
   concentrarse en las de varias filas de cartas da más casos por minuto. */
const SOLO = process.argv.includes("--lecciones")
  ? String(process.argv[process.argv.indexOf("--lecciones") + 1] || "").split(",").filter((x) => /^[a-z-]+$/.test(x))
  : null;
const permitida = (href) => !SOLO || SOLO.some((l) => (href || "").replace(/\/$/, "").endsWith(`/aprender/${l}`));

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const azar = (a, b) => a + Math.random() * (b - a);
const unoDe = (xs) => xs[Math.floor(Math.random() * xs.length)];
const log = (...a) => {
  const linea = `${new Date().toTimeString().slice(0, 8)} ${a.join(" ")}\n`;
  if (LOG) appendFileSync(LOG, linea);
  else process.stdout.write(linea);
};
/** Una marca en la línea de tiempo de la sesión. Una línea sola: el texto puede venir de la página. */
const nota = (texto) => {
  if (CONTROL) appendFileSync(CONTROL, `nota ${String(texto).replace(/[\r\n]+/g, " ").slice(0, 120)}\n`);
};

// ── El cerrojo ───────────────────────────────────────────────────────────

const NUESTRA = `${PAQUETE}/.MainActivity`;
const FOCO = `${PAQUETE}/${PAQUETE}.MainActivity`;
const ANUNCIO = `${PAQUETE}/com.google.android.gms.ads.AdActivity`;

/* UNA llamada, con las tres preguntas filtradas en el teléfono. Es texto fijo:
   no entra nada de la página en esta línea. */
function cerrojo() {
  const s = adb("shell", "dumpsys activity activities | grep -m1 topResumedActivity; dumpsys power | grep -m1 mWakefulness=; dumpsys window | grep -m1 mCurrentFocus").stdout || "";
  const arriba = /topResumedActivity=\S+\s+\S+\s+(\S+)/.exec(s)?.[1] || "";
  const despierta = /mWakefulness=Awake/.test(s);
  const foco = /mCurrentFocus=Window\{\S+\s+\S+\s+(\S+)\}/.exec(s)?.[1] || "";
  return { ok: arriba === NUESTRA && despierta && foco === FOCO, arriba, despierta, foco };
}

// ── Tocar y deslizar, siempre detrás del cerrojo ─────────────────────────

const ALTO = 1600, ANCHO = 720; // el Redmi; se corrige con la página si es otro

function deslizar(desdeY, hastaY, ms, porque) {
  const c = cerrojo();
  if (!c.ok) { log(`CERROJO: no deslizo (arriba: ${c.arriba || "?"}, foco: ${c.foco || "?"}, despierta: ${c.despierta})`); return false; }
  // Por el centro y lejos de los bordes, pase lo que pase.
  const lim = (y) => Math.round(Math.min(ALTO * 0.75, Math.max(ALTO * 0.3, y)));
  const x = Math.round(ANCHO / 2 + azar(-40, 40));
  adb("shell", "input", "swipe", String(x), String(lim(desdeY)), String(x + Math.round(azar(-6, 6))), String(lim(hastaY)), String(Math.round(ms)));
  log(`desliza (${porque}) ${lim(desdeY)}→${lim(hastaY)} en ${Math.round(ms)} ms`);
  return true;
}

// ── CDP a mano, contra el puente de la sesión ────────────────────────────

const ip = ipDeWindows();
if (!ip) { console.error("No encuentro la IP de Windows (ip route show default)."); process.exit(1); }
const url = `http://${ip}:9223`;
let ws = null;
let id = 0;
const pendientes = new Map();
async function conectar() {
  const lista = await (await fetch(`${url}/json/list`)).json();
  const pag = lista.find((t) => t.type === "page" && t.url.startsWith("https://localhost"));
  if (!pag) throw new Error("no está la página de la app");
  ws = new WebSocket(pag.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, url.replace("http", "ws")));
  await new Promise((ok, mal) => { ws.addEventListener("open", ok); ws.addEventListener("error", mal); });
  ws.addEventListener("message", (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pendientes.has(d.id)) { pendientes.get(d.id)(d); pendientes.delete(d.id); }
  });
}
/* La sonda habla por SU PROPIA conexión al inspector. Por la del jugador, la
   captura quedaba sin respuesta una de cada dos veces (más de 15 s), y por una
   conexión aparte, en el mismo momento, salía en 0,4–1,9 s (medido el
   28/10/2026). */
let wsSonda = null;
const pendSonda = new Map();
async function conectarSonda() {
  const lista = await (await fetch(`${url}/json/list`)).json();
  const pag = lista.find((t) => t.type === "page" && t.url.startsWith("https://localhost"));
  if (!pag) throw new Error("no está la página de la app");
  wsSonda = new WebSocket(pag.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, url.replace("http", "ws")));
  await new Promise((ok, mal) => { wsSonda.addEventListener("open", ok); wsSonda.addEventListener("error", mal); });
  wsSonda.addEventListener("message", (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pendSonda.has(d.id)) { pendSonda.get(d.id)(d); pendSonda.delete(d.id); }
  });
}
/** Un pedido cualquiera al inspector, por la conexión de la sonda. */
const cdp = async (method, params = {}) => {
  if (!wsSonda || wsSonda.readyState !== 1) { try { await conectarSonda(); } catch { return null; } }
  return new Promise((ok) => {
    const i = ++id;
    pendSonda.set(i, (d) => ok(d.result ?? null));
    wsSonda.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { if (pendSonda.has(i)) { pendSonda.delete(i); ok(null); } }, 15000);
  });
};
const evaluar = (expr) => new Promise((ok) => {
  if (!ws || ws.readyState !== 1) return ok(null);
  const i = ++id;
  pendientes.set(i, (d) => ok(d.result?.result?.value));
  ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true } }));
  setTimeout(() => { if (pendientes.has(i)) { pendientes.delete(i); ok(null); } }, 4000);
});

/* Lo que hay en pantalla y se PUEDE tocar, ya filtrado por la lista blanca.
   Cada blanco lleva su clase (`que`) y un camino para volver a encontrarlo
   justo antes de tocar. Coordenadas en px CSS de la ventana. */
const ESTADO = `(() => {
  const ruta = location.pathname;
  const leccion = /^\\/aprender\\/[^/]+\\/?$/.test(ruta);
  // Sólo enlaces de la app: uno a la raíz de otro sitio no es "la portada".
  const camino = (a) => { try { const u = new URL(a.href); return u.origin === location.origin ? u.pathname : "-afuera-"; } catch { return ""; } };
  const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 4 && b.height > 4 && b.top > 8 && b.bottom < innerHeight - 8; };
  const arriba = (e) => { const b = e.getBoundingClientRect(); const h = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return !!h && (h === e || e.contains(h)); };
  const blancos = [];
  const sumar = (e, que) => { if (!vis(e) || !arriba(e) || e.disabled) return; const b = e.getBoundingClientRect(); blancos.push({ que, t: (e.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 60), x: b.x + b.width / 2, y: b.y + b.height / 2, href: e.tagName === "A" ? camino(e) : null }); };
  const hayDialogo = !!document.querySelector("[role=dialog], .hoja-completa");
  if (!hayDialogo) {
    if (ruta === "/") for (const a of document.querySelectorAll('a')) { if (camino(a).replace(/\\/$/, "") === "/aprender" && /aprender/i.test(a.textContent || "")) sumar(a, "puerta"); }
    if (ruta.replace(/\\/$/, "") === "/aprender") for (const a of document.querySelectorAll("main a")) { if (/^\\/aprender\\/[^/]+\\/?$/.test(camino(a))) sumar(a, "leccion"); }
    if (leccion) {
      for (const b of document.querySelectorAll("article.prosa section button[data-sonido]")) sumar(b, b.dataset.sonido === "acierto" ? "bien" : "mal");
      for (const b of document.querySelectorAll("article.prosa section button:not([data-sonido])")) { if (/probar de nuevo/i.test(b.textContent || "")) sumar(b, "de-nuevo"); }
      for (const a of document.querySelectorAll("main nav a")) { if (/^\\/aprender\\/[^/]+\\/?$/.test(camino(a))) sumar(a, "otra-leccion"); }
    }
    for (const a of document.querySelectorAll("header.barra-app a")) { const c = camino(a).replace(/\\/$/, ""); if (c === "/aprender" || c === "") sumar(a, c === "" ? "a-la-portada" : "a-la-lista"); }
    /* Para \`--caminos\`: la puerta de Jugar en la portada, Partida rápida en
       el menú de jugar, y Salir en la mesa. Nada más de esas pantallas. */
    if (ruta === "/") for (const a of document.querySelectorAll("a")) { if (camino(a).replace(/\\/$/, "") === "/jugar" && /^jugar/i.test((a.textContent || "").trim())) sumar(a, "jugar"); }
    if (ruta.replace(/\\/$/, "") === "/jugar") for (const b of document.querySelectorAll("a, button")) { if (/partida r[áa]pida/i.test(b.textContent || "")) sumar(b, "partida"); }
    if (ruta.startsWith("/jugar/mesa")) for (const b of document.querySelectorAll("button, a")) { if (/^salir$/i.test((b.getAttribute("aria-label") || b.textContent || "").trim())) sumar(b, "salir"); }
  }
  const secciones = [...document.querySelectorAll("article.prosa section")].map((s) => { const b = s.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, respondido: !!s.querySelector(".anim-pop") }; });
  return { ruta, leccion, dpr: devicePixelRatio, alto: innerHeight, ancho: innerWidth, scrollY, largo: document.documentElement.scrollHeight,
    carga: !!document.querySelector("[data-pantalla-carga]"), hayDialogo, blancos, secciones };
})()`;

/* Justo antes de tocar: ¿lo que hay en ese punto sigue siendo un blanco de
   la misma clase y el mismo texto? Si la pantalla cambió, no se toca. */
const sigueAhi = (b) => `(() => {
  const h = document.elementFromPoint(${b.x}, ${b.y});
  const e = h && h.closest("a, button");
  if (!e || e.disabled) return false;
  return (e.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 60) === ${JSON.stringify(b.t)};
})()`;

async function tocar(b, dpr, porque) {
  if (!(await evaluar(sigueAhi(b)))) { log(`no toco "${b.t}": cambió la pantalla`); return false; }
  const c = cerrojo();
  if (!c.ok) {
    /* Un anuncio arriba (al entrar a una partida): se cierra con Atrás, que no
       sale de nuestra app. Igual que `jugar-celular.mjs`. Nunca se lo toca. */
    if (c.arriba === ANUNCIO && c.foco === ANUNCIO && c.despierta) { adb("shell", "input", "keyevent", "KEYCODE_BACK"); log("anuncio arriba: Atrás"); await dormir(3000); return false; }
    log(`CERROJO: no toco (arriba: ${c.arriba || "?"}, foco: ${c.foco || "?"}, despierta: ${c.despierta})`); return false;
  }
  let X = Math.round(b.x * dpr), Y = Math.round(b.y * dpr);
  let r;
  if (DEDO) {
    X += Math.round(azar(-3, 3)); Y += Math.round(azar(-3, 3));
    r = adb("shell", "input", "swipe", String(X), String(Y), String(X), String(Y), String(Math.round(azar(70, 220))));
  } else r = adb("shell", "input", "tap", String(X), String(Y));
  const err = ((r.stderr || "") + (r.stdout || "")).trim();
  log(`toque (${porque}) ${b.que}: "${b.t}" @${X},${Y}${err ? " ✗ " + err.slice(0, 160) : ""}`);
  if (/INJECT_EVENTS|SecurityException/.test(err)) { log("Android no deja inyectar toques: corto."); process.exit(1); }
  return true;
}

/** Espera a que el scroll quede quieto (dos lecturas iguales seguidas). */
async function quieto() {
  let antes = null;
  for (let i = 0; i < 20; i++) {
    await dormir(150);
    const y = await evaluar("scrollY");
    if (y !== null && y === antes) return;
    antes = y;
  }
}


// ── La sonda: ¿lo que hay en pantalla es lo que tendría que haber? ────────

const QUIETO = `new Promise((ok) => { let a = scrollY, n = 0; const f = () => { if (scrollY === a) n++; else { n = 0; a = scrollY; } if (n >= 20) ok(scrollY); else requestAnimationFrame(f); }; requestAnimationFrame(f); setTimeout(() => ok(null), 4000); })`;
/* Antes de cada sonda se sacan TODOS los estilos de sonda que haya: un
   jugador cortado a mitad de una sonda dejaba el suyo puesto, y con el fondo
   ya puesto agregar otro igual no cambia nada (28/10/2026: había tres colgados
   y ninguna sonda recibía cuadro nuevo). */
const LIMPIAR_SONDA = `document.querySelectorAll("style#sonda-aprender").forEach((s) => s.remove())`;
const RERASTER = `(() => { const s = document.createElement("style"); s.id = "sonda-aprender"; s.textContent = "article.prosa, article.prosa figure, article.prosa section, article.prosa .carta { background-color: rgba(255,255,255,0.06) !important; }"; document.head.appendChild(s); return new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok(1)))); })()`;
const SESION = CONTROL ? path.dirname(CONTROL) : null;
const DONDE_SONDA = SESION ? path.join(SESION, "sonda") : null;
/** El último cuadro que guardó la sesión, ya escrito en disco. */
async function ultimoCuadro() {
  for (let k = 0; k < 10; k++) {
    try {
      const texto = readFileSync(path.join(SESION, "cuadros.jsonl"), "utf8");
      const lineas = texto.slice(-4000).split("\n").filter(Boolean);
      const c = JSON.parse(lineas[lineas.length - 1]);
      if (existsSync(path.join(SESION, "cuadros", c.f))) return c;
    } catch { /* la última línea todavía se está escribiendo */ }
    await dormir(100);
  }
  return null;
}
let nSonda = 0;
// Cada corrida del jugador numera sus sondas desde 1: el prefijo evita pisar las imágenes de otra.
const CORRIDA = Date.now().toString(36);
async function sondear(porque) {
  if (!SONDA || !DONDE_SONDA) return;
  await dormir(500);
  const y0 = (await cdp("Runtime.evaluate", { expression: QUIETO, awaitPromise: true, returnByValue: true }))?.result?.value ?? null;
  if (y0 === null) { log("sonda: la página no se quedó quieta"); return; }
  if ((await evaluar(`document.querySelectorAll("style#sonda-aprender").length`)) > 0) {
    await evaluar(LIMPIAR_SONDA);
    log("sonda: había estilos de sonda colgados; se sacaron y se espera a la próxima");
    return;
  }
  const info = await evaluar(`({ ruta: location.pathname, rama: document.getElementById("rama-medir")?.dataset.rama ?? "A", leccion: !!document.querySelector("article.prosa") })`);
  if (!info?.leccion) { log("sonda: no es una lección"); return; }
  /* Las dos imágenes son CUADROS DEL SCREENCAST de la sesión (los que guarda
     `medir-celular`), no `Page.captureScreenshot`: con la página quieta, la
     captura a pedido a veces no volvía nunca (más de 15 s, una de cada dos),
     y el screencast ya trae lo que hay en pantalla: el último cuadro es el de
     ahora, porque si nada cambia no manda otro. */
  /* "Lo que hay" se PIDE, no se toma el último cuadro que llegó: el screencast
     se saltea cuadros cuando no le confirman a tiempo, y si justo se salteó el
     último (después de "Probar de nuevo", por ejemplo) el último que llegó es
     viejo y la comparación da "roto" sin que haya nada roto (pasó). Se mueve
     la opacidad de un puntito de 2 px fijo en su propia capa: eso obliga a
     componer un cuadro nuevo SIN volver a rasterizar nada, o sea con los
     mosaicos tal cual están, rotos o sanos. Y antes se espera a que no quede
     ninguna animación ni transición corriendo. */
  const quieta = await evaluar(`(() => { if (document.getAnimations().some((a) => a.playState === "running")) return false; let p = document.getElementById("sonda-punto"); if (!p) { p = document.createElement("div"); p.id = "sonda-punto"; p.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;background:#000;opacity:0.01;will-change:opacity;pointer-events:none;z-index:2147483647"; document.body.appendChild(p); } return true; })()`);
  if (!quieta) { log("sonda: hay animaciones corriendo"); return; }
  await dormir(200);
  const previo = await ultimoCuadro();
  await evaluar(`(() => { const p = document.getElementById("sonda-punto"); p.style.opacity = p.style.opacity === "0.01" ? "0.02" : "0.01"; })()`);
  let antes = null;
  for (let k = 0; k < 10; k++) {
    await dormir(120);
    antes = await ultimoCuadro();
    if (antes && previo && antes.n > previo.n) break;
  }
  if (!antes || !previo || antes.n <= previo.n) { log("sonda: el puntito no trajo cuadro"); return; }
  if (Math.abs((antes.scroll ?? -1e9) - y0) > 1) { log(`sonda: el cuadro es de otro scroll (${antes.scroll} contra ${y0})`); return; }
  /* DOS dibujos frescos: uno con el cambio puesto y otro después de sacarlo
     (sacarlo también obliga a rasterizar). Un píxel está roto EN PANTALLA si
     lo que había difiere de los DOS y los dos coinciden entre sí. Si lo que
     difiere es uno de los frescos, la basura la hizo el redibujado de la
     propia sonda, y se cuenta aparte (pasó: un cuadradito que sólo estaba en
     el fresco). */
  const esperarNuevo = async (desde) => {
    let c = null;
    for (let k = 0; k < 12; k++) {
      await dormir(120);
      c = await ultimoCuadro();
      if (c && c.n > desde.n) break;
    }
    if (!c || c.n <= desde.n) return null;
    await dormir(300); // que termine de rasterizar: se toma el último
    const u = await ultimoCuadro();
    return u && u.n >= c.n ? u : c;
  };
  await cdp("Runtime.evaluate", { expression: RERASTER, awaitPromise: true });
  const f1 = await esperarNuevo(antes);
  await evaluar(LIMPIAR_SONDA);
  const f2 = f1 ? await esperarNuevo(f1) : null;
  const y1 = await evaluar("scrollY");
  if (!f1 || !f2) { log(`sonda: el cambio no trajo cuadro nuevo (${f1 ? "sí" : "no"}/${f2 ? "sí" : "no"})`); return; }
  if (y1 !== y0 || [f1, f2].some((c) => Math.abs((c.scroll ?? -1e9) - antes.scroll) > 0.5)) { log(`sonda: descartada (se movió)`); return; }
  const hay = readFileSync(path.join(SESION, "cuadros", antes.f)).toString("base64");
  const fresca = readFileSync(path.join(SESION, "cuadros", f1.f)).toString("base64");
  const fresca2 = readFileSync(path.join(SESION, "cuadros", f2.f)).toString("base64");
  const [a, b, c2] = await Promise.all([hay, fresca, fresca2].map((x) => sharp(Buffer.from(x, "base64")).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (a.data.length !== b.data.length || a.data.length !== c2.data.length) return;
  const W = a.info.width;
  const salto = (p, q, i) => Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]));
  let fuertes = 0, deLaSonda = 0, x0 = 1e9, y0p = 1e9, x1 = -1, y1p = -1;
  for (let i = 0; i < a.data.length; i += 3) {
    const ab = salto(a.data, b.data, i), ac = salto(a.data, c2.data, i), bc = salto(b.data, c2.data, i);
    if (ab > 40 && ac > 40 && bc <= 20) {
      fuertes++;
      const p = i / 3, x = p % W, y = Math.floor(p / W);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0p) y0p = y; if (y > y1p) y1p = y;
    } else if (bc > 40) deLaSonda++;
  }
  nSonda++;
  const roto = fuertes >= 12; // un bloque de 4×4 son 16 píxeles
  const fila = { t: Date.now(), corrida: CORRIDA, n: nSonda, porque, ruta: info.ruta, rama: info.rama, scroll: Math.round(y0), fuertes, deLaSonda, caja: fuertes ? [x0, y0p, x1, y1p] : null, roto };
  mkdirSync(DONDE_SONDA, { recursive: true });
  appendFileSync(path.join(DONDE_SONDA, "sonda.jsonl"), JSON.stringify(fila) + "\n");
  if (roto) {
    writeFileSync(path.join(DONDE_SONDA, `${CORRIDA}-${nSonda}-${String(info.rama).replace(/[^\w-]/g, "")}-hay.jpg`), Buffer.from(hay, "base64"));
    writeFileSync(path.join(DONDE_SONDA, `${CORRIDA}-${nSonda}-${String(info.rama).replace(/[^\w-]/g, "")}-fresca.jpg`), Buffer.from(fresca, "base64"));
    nota(`sonda-rota ${fuertes}`);
  }
  log(`sonda ${nSonda} (${porque}) rama ${info.rama}: ${fuertes} px rotos en pantalla${roto ? " ROTO" : ""}${deLaSonda ? ` · ${deLaSonda} px de la propia sonda` : ""}`);
}

// ── El latido solo ───────────────────────────────────────────────────────

if (LATIDO) {
  const fin = Date.now() + minutos * 60000;
  let sube = true;
  log(`latido: ${minutos} min`);
  while (Date.now() < fin) {
    deslizar(sube ? 900 : 850, sube ? 850 : 900, 250, "latido");
    sube = !sube;
    await dormir(40000);
  }
  process.exit(0);
}

// ── Cómo lee una persona una lección ─────────────────────────────────────

let objetivo = null;   // qué ejercicio de la página toca ahora (índice)
let vueltasAca = 0;    // cuántas respuestas en este ejercicio
let tope = 3;          // cuántas antes de irse
/* Ya respondió lo suyo y se está yendo de la lección. Sin esto (28/10/2026,
   primera corrida) "irse" bajaba hasta "siguiente", la vuelta siguiente
   volvía a elegir el ejercicio, y se quedó 6 minutos en La baraja. */
let saliendo = false;
let rutaAntes = "";
let haciaLaPortada = false;
let camino = null;          // "mesa" mientras va y vuelve por una partida
let volverA = null;         // la lección a la que vuelve enseguida desde la lista
let proximoCamino = Date.now() + azar(20000, 40000);
let enMesaDesde = 0;

/** Qué hacer en una lección. Devuelve una promesa que termina cuando hizo UNA cosa. */
async function enLeccion(e) {
  const dpr = e.dpr;
  const px = (y) => y * dpr;
  if (objetivo === null || objetivo >= e.secciones.length) {
    objetivo = e.secciones.length ? Math.floor(Math.random() * e.secciones.length) : -1;
    vueltasAca = 0;
    tope = (RAPIDO ? 6 : 2) + Math.floor(Math.random() * 3);
  }
  // Sin ejercicio (no debería pasar en ninguna lección), o ya respondió lo suyo: a otra.
  if (saliendo || objetivo === -1 || vueltasAca >= tope) { saliendo = true; return irse(e); }

  const s = e.secciones[objetivo];
  if (SCROLL && Math.random() < 0.5) {
    const d = (Math.random() < 0.5 ? 1 : -1) * e.alto * azar(0.25, 0.4);
    const desde = e.alto * (d > 0 ? 0.7 : 0.33);
    deslizar(px(desde), px(desde - d), azar(220, 480), "recorre la lección");
    await quieto();
    return;
  }
  /* Que el ejercicio entero quede a la vista: arriba con aire, y abajo hasta
     los botones. Si es más alto que la pantalla, alcanza con que las cartas y
     el principio de los botones estén. */
  const margen = 40;
  const cabe = s.bottom - s.top <= e.alto - 2 * margen;
  const hayBotones = e.blancos.some((b) => b.que === "bien" || b.que === "mal" || b.que === "de-nuevo");
  /* Fuera de la vista, o con las cartas cortadas arriba (si entra entero), o
     sin los botones a la vista: moverse. Nunca menos de 90 px CSS: un
     deslizamiento más corto no pasa el umbral del toque y no mueve nada (la
     primera corrida se quedó oscilando así, de a 14 px). */
  if (s.bottom < margen || s.top > e.alto - margen || (cabe && s.top < 0) || !hayBotones) {
    const meta = cabe ? Math.max(margen, (e.alto - (s.bottom - s.top)) / 3) : margen;
    let d = s.top - meta; // CSS px a mover (positivo: bajar)
    if (!cabe && !hayBotones && s.top < margen) d = e.alto * 0.35; // ya está arriba: bajar a los botones
    if (Math.abs(d) < 90) d = Math.sign(d || 1) * 90;
    d = Math.max(-e.alto * 0.4, Math.min(e.alto * 0.4, d));
    // Para subir, el dedo arranca arriba: abajo lo frena el límite del 75%.
    const desde = e.alto * (d > 0 ? 0.7 : 0.33);
    deslizar(px(desde), px(desde - d), azar(280, 520), d > 0 ? "baja al ejercicio" : "sube al ejercicio");
    await quieto();
    return;
  }

  const bien = e.blancos.filter((b) => b.que === "bien");
  const mal = e.blancos.filter((b) => b.que === "mal");
  const deNuevo = e.blancos.find((b) => b.que === "de-nuevo");
  if (bien.length || mal.length) {
    const b = Math.random() < 0.5 && bien.length ? bien[0] : unoDe(mal.length ? mal : bien);
    if (await tocar(b, dpr, "responde")) { vueltasAca++; nota(`responde ${b.que}`); }
    await dormir(RAPIDO ? azar(250, 700) : azar(900, 2200));
    return;
  }
  if (deNuevo) {
    // Leer la explicación (o no), y a veces apartar el ejercicio y volver.
    if (!RAPIDO && Math.random() < 0.3) {
      const d = (Math.random() < 0.5 ? 1 : -1) * e.alto * azar(0.25, 0.45);
      deslizar(px(e.alto * 0.6), px(e.alto * 0.6 - d), azar(280, 520), "aparta el ejercicio");
      await quieto();
      return;
    }
    if (await tocar(deNuevo, dpr, "de nuevo")) nota("de-nuevo");
    await dormir(RAPIDO ? azar(200, 500) : azar(600, 1400));
    return;
  }
}

/** Irse de la lección: siguiente/anterior, la lista, o la portada. */
async function irse(e) {
  const dado = Math.random();
  const otras = e.blancos.filter((b) => b.que === "otra-leccion" && permitida(b.href));
  const lista = e.blancos.find((b) => b.que === "a-la-lista");
  if (dado < 0.5) {
    if (otras.length) {
      const b = unoDe(otras);
      if (await tocar(b, e.dpr, "otra lección")) { nota(`va-a-otra-leccion ${b.href}`); await dormir(1800); }
      return;
    }
    // La navegación está al final de la página: bajar.
    deslizar(e.dpr * e.alto * 0.72, e.dpr * e.alto * 0.3, azar(250, 400), "baja a siguiente");
    await quieto();
    return;
  }
  if (lista) {
    haciaLaPortada = dado > 0.8;
    if (await tocar(lista, e.dpr, "a la lista")) { nota("vuelve-a-la-lista"); await dormir(1800); }
    return;
  }
  // La flecha de la barra quedó arriba: subir.
  deslizar(e.dpr * e.alto * 0.3, e.dpr * e.alto * 0.75, azar(200, 350), "sube a la barra");
  await quieto();
}

// ── El bucle ─────────────────────────────────────────────────────────────

await conectar();
const fin = Date.now() + minutos * 60000;
let sinNada = 0;
log(`jugador de Aprender: ${minutos} min${DEDO ? " · dedo" : ""}${RAPIDO ? " · rápido" : ""}`);
while (Date.now() < fin) {
  const e = await evaluar(ESTADO);
  if (!e) {
    await dormir(1000);
    try { await conectar(); } catch { /* todavía no volvió */ }
    continue;
  }
  if (e.carga) { await dormir(1000); continue; }
  if (e.ruta !== rutaAntes) {
    log(`ruta ${e.ruta}`);
    if (e.leccion) nota(`llega-leccion ${e.ruta}`);
    rutaAntes = e.ruta;
    objetivo = null;
    saliendo = false;
  }
  const ruta = e.ruta.replace(/(.)\/$/, "$1");
  let hizo = false;
  if (e.leccion && !permitida(e.ruta)) {
    // Una lección que no está en la lista: volver a la lista por la barra.
    const lista = e.blancos.find((b) => b.que === "a-la-lista");
    if (lista) { hizo = await tocar(lista, e.dpr, "lección fuera de la lista"); await dormir(1500); }
    else { hizo = deslizar(e.dpr * e.alto * 0.33, e.dpr * e.alto * 0.75, azar(200, 350), "sube a la barra"); await quieto(); }
  } else if (e.leccion && CAMINOS && Date.now() > proximoCamino) {
    proximoCamino = Date.now() + azar(30000, 60000);
    const lista = e.blancos.find((b) => b.que === "a-la-lista");
    const otras = e.blancos.filter((b) => b.que === "otra-leccion" && permitida(b.href));
    const dado = Math.random();
    if (dado < 0.35 && lista) {
      volverA = e.ruta;
      hizo = await tocar(lista, e.dpr, "camino: a la lista y vuelve enseguida");
      if (hizo) nota("camino lista-y-vuelve");
      await dormir(900); // que cambie la página antes de mirar de nuevo
    } else if (dado < 0.55 && otras.length) {
      hizo = await tocar(unoDe(otras), e.dpr, "camino: otra lección enseguida");
      if (hizo) nota("camino otra-leccion");
      await dormir(900);
    } else if (lista) {
      camino = "mesa";
      hizo = await tocar(lista, e.dpr, "camino: por una partida");
      if (hizo) nota("camino por-la-mesa");
      await dormir(900);
    } else { deslizar(e.dpr * e.alto * 0.33, e.dpr * e.alto * 0.75, azar(200, 350), "sube a la barra"); await quieto(); hizo = true; proximoCamino = 0; }
  } else if (e.leccion) { await enLeccion(e); hizo = true; await sondear("leccion"); }
  else if (ruta === "/jugar/mesa" || ruta.startsWith("/jugar/mesa")) {
    // En la mesa no se juega: se espera unos segundos y se sale.
    if (!enMesaDesde) enMesaDesde = Date.now() + azar(3000, 8000);
    if (Date.now() > enMesaDesde) {
      const salir = e.blancos.find((b) => b.que === "salir");
      if (salir && (await tocar(salir, e.dpr, "camino: sale de la mesa"))) { camino = null; enMesaDesde = 0; hizo = true; nota("camino sale-de-la-mesa"); await dormir(1200); }
    } else { await dormir(500); hizo = true; }
  } else if (ruta === "/jugar") {
    enMesaDesde = 0;
    const partida = e.blancos.find((b) => b.que === "partida");
    const portada = e.blancos.find((b) => b.que === "a-la-portada");
    if (camino === "mesa" && partida) hizo = await tocar(partida, e.dpr, "camino: partida rápida");
    else if (portada) hizo = await tocar(portada, e.dpr, "camino: de Jugar a la portada");
    else { hizo = deslizar(e.dpr * e.alto * 0.33, e.dpr * e.alto * 0.75, azar(200, 350), "sube en Jugar"); await quieto(); }
    await dormir(800);
  } else if (ruta === "/aprender" && (camino === "mesa" || volverA)) {
    if (camino === "mesa") {
      const portada = e.blancos.find((b) => b.que === "a-la-portada");
      if (portada) hizo = await tocar(portada, e.dpr, "camino: a la portada");
      // La barra va en el flujo de la página: si la lista quedó scrolleada, no se ve. Subir.
      else { hizo = deslizar(e.dpr * e.alto * 0.33, e.dpr * e.alto * 0.75, azar(200, 350), "sube a la barra"); await quieto(); }
    } else {
      const misma = e.blancos.find((b) => b.que === "leccion" && b.href && b.href.replace(/\/$/, "") === volverA.replace(/\/$/, ""));
      if (misma) { hizo = await tocar(misma, e.dpr, "camino: vuelve a la misma lección"); volverA = null; }
      else { hizo = deslizar(e.dpr * e.alto * 0.7, e.dpr * e.alto * 0.35, azar(200, 350), "busca la misma lección"); await quieto(); }
    }
    await dormir(300);
  } else if (ruta === "/" && camino === "mesa") {
    const jugar = e.blancos.find((b) => b.que === "jugar");
    if (jugar) hizo = await tocar(jugar, e.dpr, "camino: a Jugar");
    await dormir(800);
  }
  else if (ruta === "/aprender") {
    const volver = e.blancos.find((b) => b.que === "a-la-portada");
    if (haciaLaPortada && volver) {
      haciaLaPortada = false;
      hizo = await tocar(volver, e.dpr, "a la portada");
      if (hizo) nota("va-a-la-portada");
    } else {
      const ls = e.blancos.filter((b) => b.que === "leccion" && permitida(b.href));
      /* En la pantalla sólo entran las primeras lecciones: sin bajar, elegía
         casi siempre La baraja (28/10/2026), que no tiene muestra. La mitad
         de las veces, bajar primero (si queda lista abajo). */
      if (ls.length && Math.random() < 0.5 && e.scrollY < e.largo - e.alto - 10) {
        hizo = deslizar(e.dpr * e.alto * 0.7, e.dpr * e.alto * 0.3, azar(250, 450), "recorre la lista");
        await quieto();
      } else if (ls.length) {
        const b = unoDe(ls);
        hizo = await tocar(b, e.dpr, "elige lección");
      } else {
        // La lista es más larga que la pantalla: mover un poco para ver otras.
        hizo = deslizar(e.dpr * e.alto * 0.7, e.dpr * e.alto * (Math.random() < 0.5 ? 0.4 : 0.95), azar(250, 450), "recorre la lista");
      }
    }
    await dormir(1500);
  } else if (ruta === "/") {
    const p = e.blancos.find((b) => b.que === "puerta");
    if (p) { hizo = await tocar(p, e.dpr, "entra a Aprender"); await dormir(1800); }
  }
  if (!hizo) {
    /* Una pantalla que no es de Aprender, o un cartel: no se toca nada. Se
       espera, pero cada 30 s un latido (un deslizamiento corto por el centro,
       que no es un clic) para que el teléfono no se apague esperando. */
    if (++sinNada % 10 === 0) log(`nada para tocar en ${e.ruta}${e.hayDialogo ? " (hay un cartel)" : ""}`);
    if (sinNada % 30 === 0) deslizar(900, 860, 250, "latido");
    await dormir(1000);
  } else sinNada = 0;
}
log("fin");
ws?.close();
process.exit(0);
