/**
 * Medir la app EN EL CELULAR mientras una persona juega: cada cuadro, cada
 * toque, cada tarea larga, y lo que pasa en el sistema. Sin tocar la pantalla.
 *
 *     node herramientas/medir-celular.mjs --sesion [MIN]      graba hasta MIN minutos (30)
 *     node herramientas/medir-celular.mjs --sesion --sin-cuadros   lo mismo, sin capturar cuadros
 *     node herramientas/medir-celular.mjs --sesion --jpeg [CALIDAD]  cuadros en JPEG (90): muchos más por segundo
 *     node herramientas/medir-celular.mjs --analizar CARPETA  el informe de una sesión grabada
 *     node herramientas/medir-celular.mjs --pixeles CARPETA   la basura en la mano, cuadro por cuadro
 *
 * Anda con el APK de depuración de siempre (`celular-usb.mjs --apk`), que
 * publica el inspector del WebView por su cuenta (ver `puente-devtools.mjs`).
 *
 * ── Por qué existe (7/10/2026) ────────────────────────────────────────────
 *
 * Santiago pidió un método fijo para los píxeles de la mano y la lentitud:
 * medir, hipótesis, arreglo, medir, informe. `rig-celular.mjs` mide píxeles con
 * Playwright y en tandas; esto graba una sesión ENTERA de juego normal y deja
 * todo en disco, para analizarla después todas las veces que haga falta con
 * detectores distintos sin volver a pedirle a nadie que juegue.
 *
 * ── Los canales ───────────────────────────────────────────────────────────
 *
 *  · cuadros.jsonl + cuadros/   los cuadros que el compositor confirma
 *                               (`Page.startScreencast`). La hora es la del
 *                               propio cuadro, no la de llegada.
 *
 *                               OJO CON EL PNG (medido el 7/10/2026): sin
 *                               pérdida, pero cada cuadro de 720×1600 pesa
 *                               1–2 MB, y el teléfono los entrega en RÁFAGAS
 *                               de 3 con casi un segundo vacío entre ráfaga y
 *                               ráfaga. Un fallo de menos de un segundo se
 *                               puede caer entero en el hueco. `--jpeg` pesa
 *                               ~10 veces menos; mueve unos pocos valores de
 *                               color, y la basura que se ve a ojo salta 65 a
 *                               129 sobre 255, así que para cazarla alcanza.
 *                               Para medir píxeles de 1 px CSS, PNG.
 *  · pagina.jsonl               desde adentro de la página, por un "binding"
 *                               de CDP (llega aunque la página se recargue):
 *                               cada toque, Event Timing (cuánto tardó cada
 *                               toque en pintarse, y en qué), Long Animation
 *                               Frames (qué script frenó el hilo), y cada
 *                               navegación, blanda (sin recargar) o dura.
 *  · muestras.jsonl             cada 500 ms: la ruta y las cajas de la mano y
 *                               de la escena, para saber DÓNDE mirar en cada
 *                               cuadro, y la rama de CSS puesta.
 *  · sistema.jsonl              memoria libre, memoria de la app (gráficos),
 *                               hilos que más CPU usan, temperatura.
 *  · tramos.jsonl               `dumpsys gfxinfo` por tramo: % de cuadros
 *                               tarde y percentiles, del lado de Android.
 *  · logcat.txt                 el `logcat` del proceso de la app.
 *
 * Todo en la hora del TELÉFONO (ms desde 1970): los cuadros, la página y el
 * `logcat -v epoch` ya vienen así, y lo que mide la computadora se corrige con
 * la diferencia de relojes que se mide al arrancar.
 *
 * ── Se maneja con un archivo, mientras corre ──────────────────────────────
 *
 * En la carpeta de la sesión, `control.txt`. Cada renglón nuevo es una orden:
 *
 *     tramo NOMBRE     cierra el tramo anterior (con su gfxinfo) y abre otro
 *     rama X           pone la rama de CSS X (ver `RAMAS`); "rama A" la saca
 *     traza N          una traza de Chromium de N segundos (máx 60)
 *     definir X CSS    una rama nueva sin reiniciar (después, "rama X")
 *     nota TEXTO       una marca en la línea de tiempo ("Santiago vio algo")
 *     parar            termina, guarda y sale
 *
 * ── Lo que NO hace, a propósito ───────────────────────────────────────────
 *
 *  · No toca la pantalla. Los píxeles los dispara una persona: está medido
 *    que los toques automáticos no los reproducen (1 de 16 contra 14 de 15).
 *  · No lee los toques del sistema (`getevent`): ve TODO lo que se toca en el
 *    teléfono, también en otras apps. Los toques se miden adentro de la página,
 *    que sólo ve los de la app, y la hora que da el navegador es la del
 *    hardware.
 *  · No saca fotos del framebuffer (`screencap`): cuesta ~800 ms de procesador
 *    del teléfono cada una y ensuciaría los tiempos. Para los píxeles alcanza
 *    la captura de adentro, que el 8/9 se midió que trae la basura igual o más.
 *  · No se conecta a otro WebView que el de la app: el de los anuncios
 *    (doubleclick) tiene su propio inspector y se ignora.
 *  · No lee el contenido del `localStorage`.
 *
 * El cerrojo: cada segundo pregunta quién está en primer plano. Si no es la
 * app, los cuadros que lleguen se descartan y queda anotado.
 */

import { spawn } from "node:child_process";
import {
  appendFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync,
} from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { adb, ADB, enPrimerPlano, PAQUETE } from "./celular-usb.mjs";

const morir = (...m) => { console.error("\n✗", ...m, "\n"); process.exit(1); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const numero = (bandera, porOmision) => {
  const i = args.indexOf(bandera);
  return i === -1 ? porOmision : Number(args[i + 1]) || porOmision;
};

// ── Las ramas de CSS ────────────────────────────────────────────────────────

/* Cada rama es un cambio candidato que se prueba EN VIVO, sin compilar, y
   cómo comprobar que aplicó. `revisar` son pares [selector, propiedad] que se
   leen con `getComputedStyle`: el elemento Y su padre, que es el error del 8/9
   (una rama que no aplicó se mide como si fuera el control).

   La hija de abajo de la escena (la que lleva la mano y los cantos) se busca
   subiendo desde `[data-mano]`, no por posición: `:last-child` dejaría de ser
   ella el día que se agregue algo al final. */
const HIJA_DE_ABAJO = '.escena > :has([data-mano="tuya"])';
export const RAMAS = {
  A: { que: "control: como está", css: "", revisar: [] },
  L2: {
    que: "la escena SIN la opacity .999 de sus hijas (el arreglo del 8/9): ¿cuánto le cuesta a la GPU?",
    css: ".escena > * { opacity: 1 !important; }",
    revisar: [[".escena > *", "opacity"], [HIJA_DE_ABAJO, "opacity"]],
  },
  /* Las tres que salen de la traza de la mano (7/10/2026): lo caro es
     RASTERIZAR en la GPU. Son pruebas de costo, no arreglos: S0 y R0
     cambian cómo se ve, y si ayudan se busca una forma equivalente más
     barata, con captura y permiso. */
  S0: {
    que: "sin las sombras difuminadas de las cartas (shadow-lg, la de la mano y el halo)",
    css: ".escena .carta, .escena .carta * { box-shadow: none !important; } .escena [style*='box-shadow'] { box-shadow: none !important; }",
    revisar: [[".escena .carta", "boxShadow"]],
  },
  R0: {
    que: "sin el desenfoque vivo del rival (feGaussianBlur)",
    css: ".escena [filter] { filter: none !important; }",
    revisar: [[".escena [filter]", "filter"]],
  },
  C1: {
    que: "la mano en su propia capa del compositor (tirar no re-rasteriza la mesa de abajo)",
    css: `[data-mano="tuya"] { will-change: transform; }`,
    revisar: [['[data-mano="tuya"]', "willChange"]],
  },
  M0: {
    que: "sin animaciones ni transiciones en la mesa (cada animación dura 1 ms): ¿la basura sale de las capas que crean?",
    css: ".escena *, .escena *::before, .escena *::after { animation-duration: 1ms !important; transition: none !important; }",
    revisar: [[".mano-abanico > *", "transitionProperty"], [".escena", "animationDuration"]],
  },
  P1a: {
    que: "la hija de abajo de la escena SIN la opacity .999 (la mano deja de ir en su textura)",
    css: `${HIJA_DE_ABAJO} { opacity: 1 !important; }`,
    revisar: [[HIJA_DE_ABAJO, "opacity"], ['[data-mano="tuya"]', "opacity"]],
  },
  P1b: {
    que: "P1a + cada carta de la mano en su propia textura",
    css: `${HIJA_DE_ABAJO} { opacity: 1 !important; } .mano-abanico > * { opacity: 0.999; }`,
    revisar: [[HIJA_DE_ABAJO, "opacity"], [".mano-abanico > *", "opacity"]],
  },
  P1c: {
    que: "P1a + la mano entera (sin los cantos) en su textura",
    css: `${HIJA_DE_ABAJO} { opacity: 1 !important; } [data-mano="tuya"] { opacity: 0.999; }`,
    revisar: [[HIJA_DE_ABAJO, "opacity"], ['[data-mano="tuya"]', "opacity"]],
  },
};

// ── Lo que se inyecta en la página ──────────────────────────────────────────

/* Corre en cada documento nuevo (`Page.addScriptToEvaluateOnNewDocument`) y
   en el actual. Manda todo por `__medirEnviar`, un binding de CDP: llega a la
   herramienta en el momento, así que una recarga de la página no se lleva lo
   que todavía no se había leído.

   Los tiempos se mandan relativos a `performance.timeOrigin` (que también se
   manda): así se pasan a la hora del teléfono sin perder precisión.

   `quien` describe lo tocado sin leer contenido de la persona: la etiqueta, el
   aria-label o hasta 24 letras del texto del botón ("Truco", "Envido"). */
const GUION_PAGINA = `(() => {
  if (window.__medir) return;
  window.__medir = 1;
  const enviar = (tipo, datos) => {
    try { window.__medirEnviar(JSON.stringify({ tipo, origen: performance.timeOrigin, ...datos })); } catch {}
  };
  const quien = (el) => {
    if (!el || !el.tagName) return "";
    const t = el.closest("button,a,[role=button]") || el;
    let s = t.tagName.toLowerCase();
    const a = t.getAttribute && t.getAttribute("aria-label");
    if (a) s += "[" + a.slice(0, 30) + "]";
    else {
      const tx = (t.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 24);
      if (tx) s += '"' + tx + '"';
    }
    if (el.closest && el.closest('[data-mano="tuya"]')) s = "mano>" + s;
    return s;
  };
  const nav = performance.getEntriesByType("navigation")[0];
  enviar("documento", { ruta: location.pathname, tipoNav: nav ? nav.type : null });
  addEventListener("pointerdown", (e) => enviar("toque", { t: e.timeStamp, x: Math.round(e.clientX), y: Math.round(e.clientY), quien: quien(e.target) }), { capture: true, passive: true });
  addEventListener("load", () => {
    const n = performance.getEntriesByType("navigation")[0];
    if (n) enviar("carga", { dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, resp: n.responseEnd });
  });
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) enviar("evento", {
      nombre: e.name, t: e.startTime, dur: e.duration, ps: e.processingStart, pe: e.processingEnd,
      id: e.interactionId || 0, quien: quien(e.target),
    }); }).observe({ type: "event", durationThreshold: 16, buffered: true });
  } catch {}
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) enviar("loaf", {
      t: e.startTime, dur: e.duration, bloqueo: e.blockingDuration, render: e.renderStart, estilo: e.styleAndLayoutStart,
      scripts: e.scripts.map((s) => ({ inv: s.invoker, tipo: s.invokerType, url: (s.sourceURL || "").replace(location.origin, ""),
        fn: s.sourceFunctionName, dur: Math.round(s.duration), layout: Math.round(s.forcedStyleAndLayoutDuration), pausa: Math.round(s.pauseDuration) })),
    }); }).observe({ type: "long-animation-frame", buffered: true });
  } catch {}
  try {
    navigation.addEventListener("navigate", (e) => enviar("navega", { t: performance.now(), a: new URL(e.destination.url).pathname, tipo: e.navigationType }));
    navigation.addEventListener("navigatesuccess", () => enviar("navegado", { t: performance.now(), ruta: location.pathname }));
  } catch {}
})()`;

/* Cada 500 ms: dónde está la mano, la escena y la hija de abajo, la ruta, y si
   la rama pedida está puesta (la pone si falta: una recarga la saca). */
const muestreo = (rama) => `(() => {
  const caja = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
  const R = ${JSON.stringify(RAMAS[rama])};
  let st = document.getElementById("rama-medir");
  if (!st || st.dataset.rama !== ${JSON.stringify(rama)}) {
    if (st) st.remove();
    if (R.css) { st = document.createElement("style"); st.id = "rama-medir"; st.dataset.rama = ${JSON.stringify(rama)}; st.textContent = R.css; document.head.appendChild(st); }
  }
  const revisado = R.revisar.map(([sel, prop]) => { const e = document.querySelector(sel); return sel + " " + prop + "=" + (e ? getComputedStyle(e)[prop] : "∅"); });
  const mano = document.querySelector('[data-mano="tuya"]');
  let abajo = mano; while (abajo && abajo.parentElement && !abajo.parentElement.classList.contains("escena")) abajo = abajo.parentElement;
  return { ahora: Date.now(), ruta: location.pathname, carga: !!document.querySelector("[data-pantalla-carga]"),
    mano: caja(mano), abajo: mano ? caja(abajo) : null, escena: caja(document.querySelector(".escena")),
    abanico: caja(document.querySelector(".mano-abanico")), revisado };
})()`;

// ── CDP a mano, sin Playwright ──────────────────────────────────────────────

/* Sin Playwright a propósito: al conectarse, Playwright prende sus propios
   dominios e inyecta sus guiones en la página, y eso es carga extra en el
   mismo hilo que se está midiendo. Acá se habla el protocolo directo por el
   WebSocket que Node ya trae. */
async function conectar(urlPuente) {
  const lista = await (await fetch(`${urlPuente}/json/list`)).json();
  const pag = lista.find((t) => t.type === "page" && t.url.startsWith("https://localhost"));
  if (!pag) morir("No encuentro la página de la app en el inspector (¿está abierta?).");
  // El WebView arma la dirección con su propio host; se cambia por el del puente.
  const ws = new WebSocket(pag.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, urlPuente.replace(/^http/, "ws")));
  await new Promise((ok, mal) => { ws.addEventListener("open", ok); ws.addEventListener("error", mal); });
  let id = 0;
  const pendientes = new Map();
  const oyentes = new Map();
  ws.addEventListener("message", (m) => {
    const d = JSON.parse(m.data);
    if (d.id) {
      const p = pendientes.get(d.id);
      if (p) { pendientes.delete(d.id); d.error ? p.mal(new Error(d.error.message)) : p.ok(d.result); }
    } else for (const fn of oyentes.get(d.method) || []) fn(d.params);
  });
  return {
    send: (method, params = {}) => new Promise((ok, mal) => {
      const i = ++id;
      pendientes.set(i, { ok, mal });
      ws.send(JSON.stringify({ id: i, method, params }));
    }),
    on: (metodo, fn) => oyentes.set(metodo, [...(oyentes.get(metodo) || []), fn]),
    cerrar: () => ws.close(),
  };
}

// ── El sistema, del lado de Android ─────────────────────────────────────────

const texto = (...a) => { const r = adb(...a); return (r.stdout || "") + (r.stderr || ""); };

function gfxinfo() {
  const s = texto("shell", "dumpsys", "gfxinfo", PAQUETE);
  const n = (re) => { const m = re.exec(s); return m ? Number(m[1]) : null; };
  return {
    cuadros: n(/Total frames rendered: (\d+)/),
    tarde: n(/Janky frames: \d+ \(([\d.]+)%\)/),
    p50: n(/^50th percentile: (\d+)ms/m), p90: n(/^90th percentile: (\d+)ms/m),
    p95: n(/^95th percentile: (\d+)ms/m), p99: n(/^99th percentile: (\d+)ms/m),
    gpuP50: n(/50th gpu percentile: (\d+)ms/), gpuP90: n(/90th gpu percentile: (\d+)ms/),
    hiloUI: n(/Number Slow UI thread: (\d+)/), dibujo: n(/Number Slow issue draw commands: (\d+)/),
    entrada: n(/Number High input latency: (\d+)/), vencidos: n(/Number Frame deadline missed: (\d+)/),
  };
}

/* El WebView dibuja en OTRO proceso: el "renderer" aislado de Chromium
   (`com.google.android.webview:sandboxed_process0…`). Ahí corren el JavaScript,
   el estilo, el diseño y el pintado de la página; en el proceso de la app
   quedan el hilo principal de Android y el que compone en la GPU. Hay uno por
   cada app que usa WebView, así que el nuestro se busca entre los servicios
   que levantó la app, no por nombre. */
function pidDelRenderer() {
  const s = texto("shell", "dumpsys", "activity", "services", PAQUETE);
  return /app=ProcessRecord\{\w+ (\d+):com\.google\.android\.webview:sandboxed_process/.exec(s)?.[1] ?? null;
}

function memoria(pid, renderer) {
  const libre = Number(/MemAvailable:\s+(\d+)/.exec(texto("shell", "cat", "/proc/meminfo"))?.[1] ?? 0);
  const de = (p) => {
    if (!p) return {};
    const m = texto("shell", "dumpsys", "meminfo", p);
    const kb = (re) => Math.round(Number(re.exec(m)?.[1] ?? 0) / 1024);
    return { pss: kb(/TOTAL PSS:\s+(\d+)/), swap: kb(/TOTAL SWAP PSS:\s+(\d+)/), graficos: kb(/Graphics:\s+(\d+)/) };
  };
  return { libreMB: Math.round(libre / 1024), app: de(pid), pagina: de(renderer) };
}

/* Los hilos que más procesador gastan en este momento. `top` necesita un
   intervalo para medir %CPU; con `-n 1` mide desde el arranque del hilo, así
   que se piden dos pasadas y se queda la segunda. Los nombres vienen cortados
   a 15 letras por el kernel: "CrRendererMain", "VizCompositorTh"… */
function hilos(pid, renderer) {
  const lista = renderer ? `${pid},${renderer}` : pid;
  const s = texto("shell", "top", "-H", "-b", "-n", "2", "-d", "1", "-p", lista, "-o", "PID,%CPU,CMD");
  const ultima = s.split(/Threads:/).pop() || "";
  return ultima.split("\n").map((l) => /^\s*(\d+)\s+([\d.]+)\s+(.+?)\s*$/.exec(l)).filter(Boolean)
    .map((m) => [`${m[1] === pid ? "app" : "pág"}:${m[3]}`, Number(m[2])])
    .filter(([, c]) => c >= 1).sort((a, b) => b[1] - a[1]).slice(0, 8);
}

/* La temperatura de la CPU según el servicio térmico de Android: los
   `/sys/class/thermal` no se pueden leer sin root en este teléfono (medido el
   7/10/2026: vienen vacíos). Se toma la sección "Current temperatures from
   HAL", que es la lectura de ahora y no la de la última alerta. */
function temperatura() {
  const s = texto("shell", "dumpsys", "thermalservice");
  const ahora = s.split("Current temperatures from HAL:")[1] || "";
  const m = /mValue=([\d.]+), mType=0, mName=CPU/.exec(ahora);
  return m ? Number(m[1]) : null;
}

/** Ancho y alto de un JPEG, del marcador SOF (sin decodificarlo). */
function medidasJpeg(buf) {
  for (let i = 2; i < buf.length - 9;) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return [null, null];
}

// ── La sesión ───────────────────────────────────────────────────────────────

async function sesion(minutos, conCuadros, jpeg) {
  if (enPrimerPlano() !== PAQUETE) morir("La app no está en primer plano: abrila y volvé a correr esto.");
  const { abrirDevtools, pidDeLaApp } = await import("./puente-devtools.mjs");
  const pid = pidDeLaApp();
  const renderer = pidDelRenderer();

  const carpeta = path.join("capturas/celular", `sesion-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}`);
  mkdirSync(path.join(carpeta, "cuadros"), { recursive: true });
  const archivo = (n) => path.join(carpeta, n);
  const anotar = (n, obj) => appendFileSync(archivo(n), JSON.stringify(obj) + "\n");
  writeFileSync(archivo("control.txt"), "");

  const cdp = await conectar(await abrirDevtools());

  // La diferencia de relojes: la hora del teléfono menos la de acá
  const antes = Date.now();
  const { result } = await cdp.send("Runtime.evaluate", { expression: "Date.now()", returnByValue: true });
  const reloj = result.value - (antes + Date.now()) / 2;
  const ahoraTel = () => Math.round(Date.now() + reloj);

  let rama = "A";
  let tramo = "inicio";
  let fuera = false;
  const cuenta = { cuadros: 0, descartados: 0, pagina: 0 };
  anotar("eventos.jsonl", { t: ahoraTel(), que: "inicio", pid, renderer, conCuadros });

  // Desde adentro de la página
  cdp.on("Runtime.bindingCalled", (e) => {
    if (e.name !== "__medirEnviar") return;
    cuenta.pagina++;
    try { anotar("pagina.jsonl", { ...JSON.parse(e.payload), tramo, rama }); } catch { /* mal formado: se ignora */ }
  });
  cdp.on("Runtime.consoleAPICalled", (e) => {
    const s = (e.args || []).map((a) => a.value ?? a.description ?? "").join(" ");
    anotar("consola.jsonl", { t: Math.round(e.timestamp), tipo: e.type, s: s.slice(0, 400) });
  });
  cdp.on("Page.frameNavigated", (e) => {
    if (!e.frame.parentId) anotar("eventos.jsonl", { t: ahoraTel(), que: "documento-nuevo", url: new URL(e.frame.url).pathname });
  });
  cdp.on("Page.navigatedWithinDocument", (e) => anotar("eventos.jsonl", { t: ahoraTel(), que: "navegacion-blanda", url: new URL(e.url).pathname }));

  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Runtime.addBinding", { name: "__medirEnviar" });
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: GUION_PAGINA });
  await cdp.send("Runtime.evaluate", { expression: GUION_PAGINA });

  // Los cuadros
  const escrituras = new Set();
  if (conCuadros) {
    cdp.on("Page.screencastFrame", (e) => {
      cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
      if (fuera) { cuenta.descartados++; return; }
      const n = ++cuenta.cuadros;
      const buf = Buffer.from(e.data, "base64");
      const nombre = `${String(n).padStart(6, "0")}.${jpeg ? "jpg" : "png"}`;
      const md = e.metadata;
      const [ancho, alto] = jpeg ? medidasJpeg(buf) : [buf.readUInt32BE(16), buf.readUInt32BE(20)];
      anotar("cuadros.jsonl", {
        n, t: Math.round(md.timestamp * 1000), f: nombre, ancho, alto,
        dw: md.deviceWidth, dh: md.deviceHeight, arriba: md.offsetTop, tramo, rama,
      });
      const w = writeFile(archivo(`cuadros/${nombre}`), buf).finally(() => escrituras.delete(w));
      escrituras.add(w);
    });
    await cdp.send("Page.startScreencast", jpeg
      ? { format: "jpeg", quality: jpeg, everyNthFrame: 1 }
      : { format: "png", everyNthFrame: 1 });
  }

  // El logcat del proceso, con la hora del teléfono
  const logcat = spawn(ADB, ["logcat", "-v", "epoch", "-T", "1", `--pid=${pid}`], { stdio: ["ignore", "pipe", "ignore"] });
  logcat.stdout.pipe(createWriteStream(archivo("logcat.txt")));

  // gfxinfo arranca de cero
  adb("shell", "dumpsys", "gfxinfo", PAQUETE, "reset");
  let desdeTramo = ahoraTel();
  const cerrarTramo = () => {
    const g = gfxinfo();
    anotar("tramos.jsonl", { tramo, rama, desde: desdeTramo, hasta: ahoraTel(), ...g });
    adb("shell", "dumpsys", "gfxinfo", PAQUETE, "reset");
    desdeTramo = ahoraTel();
    return g;
  };

  console.log(`\n── GRABANDO en ${carpeta}`);
  console.log(`   cuadros ${conCuadros ? (jpeg ? `JPEG ${jpeg}` : "PNG") : "no"} · hasta ${minutos} min · órdenes en ${archivo("control.txt")}\n`);

  /* TRAZA DE CHROMIUM (orden "traza N"): lo que hace cada hilo, como la
     pestaña Performance de DevTools. Va por la MISMA conexión: el 7/10/2026
     se sacó una con un segundo puente y, al cerrarse, ese segundo puente le
     sacó el `adb forward` a la sesión. Pesa (hasta 40.000 eventos en 15 s):
     se usa en ventanas cortas y se anota en la línea de tiempo. */
  let trazando = false;
  let nTraza = 0;
  const CATEGORIAS = [
    "devtools.timeline", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.frame",
    "blink", "cc", "gpu", "viz", "toplevel", "v8.execute", "benchmark", "android_webview",
  ];
  let bufferTraza = [];
  cdp.on("Tracing.dataCollected", (e) => bufferTraza.push(...e.value));
  cdp.on("Tracing.tracingComplete", () => {
    const nombre = `traza-${++nTraza}-${tramo}-${rama}.json`;
    writeFileSync(archivo(nombre), JSON.stringify({ traceEvents: bufferTraza }));
    console.log(`   ▸ traza guardada: ${nombre} (${bufferTraza.length} eventos)`);
    anotar("eventos.jsonl", { t: ahoraTel(), que: "traza-fin", archivo: nombre });
    bufferTraza = [];
    trazando = false;
  });
  const trazar = async (segundos) => {
    trazando = true;
    anotar("eventos.jsonl", { t: ahoraTel(), que: "traza-inicio", segundos });
    console.log(`   ▸ traza de ${segundos} s…`);
    try {
      await cdp.send("Tracing.start", { transferMode: "ReportEvents", traceConfig: { recordMode: "recordContinuously", includedCategories: CATEGORIAS } });
      await dormir(segundos * 1000);
      await cdp.send("Tracing.end");
    } catch (e) { console.log(`   ✗ traza: ${e.message}`); trazando = false; }
  };

  let leidas = 0;
  let parar = false;
  const fin = Date.now() + minutos * 60000;
  for (const s of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(s, () => { parar = true; });

  let ultimoSistema = 0, ultimoHilos = 0, ultimoAviso = 0, ultimoCerrojo = 0;
  while (!parar && Date.now() < fin) {
    await dormir(500);

    // Las órdenes
    const renglones = readFileSync(archivo("control.txt"), "utf8").split("\n").filter(Boolean);
    for (const r of renglones.slice(leidas)) {
      const [orden, ...resto] = r.trim().split(/\s+/);
      const valor = resto.join(" ");
      if (orden === "parar") parar = true;
      else if (orden === "tramo" && valor) {
        const g = cerrarTramo();
        console.log(`   ▸ tramo "${tramo}" cerrado: ${g.cuadros} cuadros · ${g.tarde}% tarde · p50 ${g.p50} · p90 ${g.p90} · p99 ${g.p99} ms`);
        tramo = valor.slice(0, 40);
        anotar("eventos.jsonl", { t: ahoraTel(), que: "tramo", tramo });
        console.log(`   ▸ tramo "${tramo}"`);
      } else if (orden === "rama" && RAMAS[valor]) {
        rama = valor;
        anotar("eventos.jsonl", { t: ahoraTel(), que: "rama", rama });
        console.log(`   ▸ rama ${rama}: ${RAMAS[rama].que}`);
      } else if (orden === "definir" && resto.length > 1) {
        // "definir NOMBRE css…": una rama nueva sin reiniciar la sesión
        RAMAS[resto[0]] = { que: "definida en vivo", css: resto.slice(1).join(" "), revisar: [] };
        anotar("eventos.jsonl", { t: ahoraTel(), que: "definir", rama: resto[0], css: RAMAS[resto[0]].css });
        console.log(`   ▸ rama ${resto[0]} definida`);
      } else if (orden === "traza" && !trazando) {
        trazar(Math.min(60, Number(valor) || 15));
      } else if (orden === "nota") {
        anotar("eventos.jsonl", { t: ahoraTel(), que: "nota", nota: valor.slice(0, 200) });
        console.log(`   ▸ nota: ${valor}`);
      } else console.log(`   ? orden desconocida: ${r}`);
    }
    leidas = renglones.length;

    // El cerrojo, una vez por segundo
    if (Date.now() - ultimoCerrojo >= 1000) {
      ultimoCerrojo = Date.now();
      const quien = enPrimerPlano();
      const ahoraFuera = quien !== PAQUETE;
      if (ahoraFuera !== fuera) {
        fuera = ahoraFuera;
        anotar("eventos.jsonl", { t: ahoraTel(), que: fuera ? "app-fuera" : "app-vuelve" });
        console.log(fuera ? "   ⚠ la app salió del primer plano: no se guardan cuadros" : "   ▸ la app volvió");
      }
    }

    // Dónde está la mano, y la rama
    try {
      const r = await cdp.send("Runtime.evaluate", { expression: muestreo(rama), returnByValue: true });
      if (r.result?.value) anotar("muestras.jsonl", { ...r.result.value, rama, tramo });
    } catch { /* la página se estaba recargando */ }

    // El sistema: memoria y temperatura cada 5 s, hilos cada 15 s
    if (Date.now() - ultimoSistema >= 5000) {
      ultimoSistema = Date.now();
      const fila = { t: ahoraTel(), ...memoria(pid, renderer), temp: temperatura() };
      if (Date.now() - ultimoHilos >= 15000) { ultimoHilos = Date.now(); fila.hilos = hilos(pid, renderer); }
      anotar("sistema.jsonl", fila);
    }
    if (Date.now() - ultimoAviso >= 20000) {
      ultimoAviso = Date.now();
      console.log(`   ··· ${cuenta.cuadros} cuadros · ${cuenta.pagina} datos de la página · tramo "${tramo}" · rama ${rama}`);
    }
  }

  cerrarTramo();
  if (conCuadros) await cdp.send("Page.stopScreencast").catch(() => {});
  await Promise.all(escrituras);
  anotar("eventos.jsonl", { t: ahoraTel(), que: "fin", ...cuenta });
  logcat.kill();
  cdp.cerrar();
  console.log(`\n✓ sesión guardada en ${carpeta}: ${cuenta.cuadros} cuadros (${cuenta.descartados} descartados por el cerrojo)`);
  console.log(`  Para el informe:  node herramientas/medir-celular.mjs --analizar ${carpeta}\n`);
  process.exit(0);
}

// ── El análisis ─────────────────────────────────────────────────────────────

const leerJsonl = (f) => existsSync(f)
  ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
  : [];

const percentil = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const ms = (x) => (x == null ? "—" : `${Math.round(x)}`);

/* Qué tipo de toque fue, por lo que se tocó. */
function claseDeToque(quien) {
  if (quien.startsWith("mano>")) return "carta";
  if (/^a\b|^a\[|^a"/.test(quien)) return "navegación";
  if (/^button/.test(quien)) return "botón";
  return "otro";
}

async function analizar(carpeta) {
  if (!existsSync(carpeta)) morir(`No existe ${carpeta}`);
  const f = (n) => path.join(carpeta, n);
  const pagina = leerJsonl(f("pagina.jsonl"));
  const eventos = leerJsonl(f("eventos.jsonl"));
  const tramos = leerJsonl(f("tramos.jsonl"));
  const sistema = leerJsonl(f("sistema.jsonl"));
  const consola = leerJsonl(f("consola.jsonl"));
  const cuadros = leerJsonl(f("cuadros.jsonl"));
  const abs = (e, t) => e.origen + t;

  console.log(`\n══ INFORME de ${carpeta}\n`);

  // 1. Los tramos, del lado de Android
  console.log("── Cuadros según Android (gfxinfo), por tramo");
  console.log("   tramo                  rama  cuadros  %tarde   p50   p90   p99  gpuP90  hiloUI  dibujo");
  for (const t of tramos) {
    console.log(`   ${t.tramo.padEnd(22)} ${t.rama.padEnd(5)} ${String(t.cuadros).padStart(7)} ${String(t.tarde).padStart(7)} ${ms(t.p50).padStart(5)} ${ms(t.p90).padStart(5)} ${ms(t.p99).padStart(5)} ${ms(t.gpuP90).padStart(7)} ${String(t.hiloUI).padStart(7)} ${String(t.dibujo).padStart(7)}`);
  }

  // 2. Los toques: Event Timing, juntando por interacción
  const toques = pagina.filter((e) => e.tipo === "toque");
  const evs = pagina.filter((e) => e.tipo === "evento" && e.id);
  const porId = new Map();
  for (const e of evs) {
    const k = `${e.origen}:${e.id}`;
    const prev = porId.get(k);
    if (!prev || e.dur > prev.dur) porId.set(k, e);
  }
  const filas = [...porId.values()].map((e) => {
    // `quien` del toque mismo: el blanco del evento puede haber desaparecido
    const t = toques.find((x) => x.origen === e.origen && Math.abs(x.t - e.t) < 2) ;
    const quien = e.quien || t?.quien || "";
    return {
      quien, clase: claseDeToque(quien), t: abs(e, e.t), tramo: e.tramo, rama: e.rama,
      total: e.dur, espera: e.ps - e.t, js: e.pe - e.ps, pintar: e.t + e.dur - e.pe,
    };
  });
  console.log(`\n── Toques: ${toques.length} toques en la página · ${filas.length} interacciones de 16 ms o más`);
  console.log("   (total = del dedo al cuadro pintado · espera = hasta que el JS lo atiende · js = lo que tarda el JS · pintar = del JS al cuadro)");
  console.log("   clase        n   total p50/p90   espera p50   js p50/p90   pintar p50/p90");
  for (const clase of ["carta", "botón", "navegación", "otro"]) {
    const xs = filas.filter((x) => x.clase === clase);
    if (!xs.length) continue;
    const c = (k, p) => ms(percentil(xs.map((x) => x[k]), p));
    console.log(`   ${clase.padEnd(11)} ${String(xs.length).padStart(3)}   ${c("total", 50).padStart(5)}/${c("total", 90).padEnd(5)}   ${c("espera", 50).padStart(6)}       ${c("js", 50).padStart(4)}/${c("js", 90).padEnd(5)}   ${c("pintar", 50).padStart(5)}/${c("pintar", 90)}`);
  }
  console.log("   los 8 más lentos:");
  for (const x of [...filas].sort((a, b) => b.total - a.total).slice(0, 8)) {
    console.log(`     ${ms(x.total).padStart(5)} ms  (espera ${ms(x.espera)} · js ${ms(x.js)} · pintar ${ms(x.pintar)})  ${x.quien}  [${x.tramo}/${x.rama}]`);
  }

  // 3. Lo que frenó el hilo: Long Animation Frames
  const loafs = pagina.filter((e) => e.tipo === "loaf");
  const porScript = new Map();
  for (const l of loafs) for (const s of l.scripts) {
    const k = `${s.inv} · ${s.url.split("/").pop()}${s.fn ? ` · ${s.fn}` : ""}`;
    const v = porScript.get(k) || { n: 0, ms: 0, layout: 0 };
    v.n++; v.ms += s.dur; v.layout += s.layout;
    porScript.set(k, v);
  }
  const durLoaf = loafs.map((l) => l.dur);
  console.log(`\n── Cuadros largos del hilo de la página (LoAF, 50 ms o más): ${loafs.length} · p50 ${ms(percentil(durLoaf, 50))} · p90 ${ms(percentil(durLoaf, 90))} · máx ${ms(Math.max(0, ...durLoaf))} ms`);
  const sinScript = loafs.map((l) => l.dur - l.scripts.reduce((s, x) => s + x.dur, 0));
  console.log(`   de eso, fuera de los scripts (estilo, diseño, pintado): p50 ${ms(percentil(sinScript, 50))} ms`);
  for (const [k, v] of [...porScript.entries()].sort((a, b) => b[1].ms - a[1].ms).slice(0, 8)) {
    console.log(`     ${String(v.ms).padStart(6)} ms en ${String(v.n).padStart(3)} veces (diseño forzado ${v.layout} ms)  ${k}`);
  }

  // 4. Navegación: blanda o dura
  const docs = eventos.filter((e) => e.que === "documento-nuevo");
  const blandas = eventos.filter((e) => e.que === "navegacion-blanda");
  console.log(`\n── Navegación: ${blandas.length} blandas (sin recargar) · ${docs.length} documentos nuevos (recarga entera)`);
  for (const d of docs.slice(0, 12)) console.log(`     recarga → ${d.url}`);
  const cargas = consola.filter((c) => c.s.includes("[carga]"));
  for (const c of cargas) console.log(`   ${c.s}`);

  // 5. El sistema
  if (sistema.length) {
    const rango = (xs) => { const v = xs.filter((x) => x != null); return v.length ? `${Math.min(...v)}–${Math.max(...v)}` : "—"; };
    const temps = sistema.map((s) => s.temp);
    console.log(`\n── Sistema: memoria libre ${rango(sistema.map((s) => s.libreMB))} MB · temperatura CPU ${rango(temps)} °C`);
    console.log(`   app:    PSS ${rango(sistema.map((s) => s.app?.pss))} MB · en swap ${rango(sistema.map((s) => s.app?.swap))} MB · gráficos ${rango(sistema.map((s) => s.app?.graficos))} MB`);
    console.log(`   página: PSS ${rango(sistema.map((s) => s.pagina?.pss))} MB · en swap ${rango(sistema.map((s) => s.pagina?.swap))} MB`);
    const conHilos = sistema.filter((s) => s.hilos?.length);
    const suma = new Map();
    for (const s of conHilos) for (const [h, c] of s.hilos) suma.set(h, (suma.get(h) || 0) + c);
    console.log("   hilos que más CPU usaron (suma de las muestras):");
    for (const [h, c] of [...suma.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`     ${h.padEnd(18)} ${c.toFixed(0)}`);
  }

  // 6. El logcat
  if (existsSync(f("logcat.txt"))) {
    const lc = readFileSync(f("logcat.txt"), "utf8").split("\n");
    const saltos = lc.filter((l) => /Skipped \d+ frames/.test(l));
    const gpu = lc.filter((l) => /lost|OUT_OF_MEMORY|context|tile memory|GPU process/i.test(l) && /chromium|cr_/i.test(l));
    const ads = lc.filter((l) => /\bAds\b|admob|GoogleMobileAds/i.test(l));
    console.log(`\n── logcat: ${saltos.length} avisos de cuadros salteados · ${gpu.length} líneas de GPU de Chromium · ${ads.length} líneas de anuncios`);
    for (const l of saltos.slice(0, 6)) console.log(`     ${l.trim().slice(0, 140)}`);
    for (const l of gpu.slice(0, 6)) console.log(`     ${l.trim().slice(0, 140)}`);
  }

  // 7. Los cuadros: cuántos, a qué ritmo
  if (cuadros.length) {
    const huecos = cuadros.slice(1).map((c, i) => c.t - cuadros[i].t).filter((d) => d > 0 && d < 1000);
    console.log(`\n── Cuadros capturados: ${cuadros.length} · tamaño ${cuadros[0].ancho}×${cuadros[0].alto} · entre cuadros (animando): p50 ${ms(percentil(huecos, 50))} ms · p90 ${ms(percentil(huecos, 90))} ms`);
    console.log(`   para buscar píxeles:  node herramientas/medir-celular.mjs --pixeles ${carpeta}`);
  }

  const trazas = eventos.filter((e) => e.que === "traza-fin").map((e) => f(e.archivo)).filter(existsSync);
  if (trazas.length) {
    console.log("\n── Trazas de Chromium");
    for (const t of trazas) resumenTraza(t);
  }

  const notas = eventos.filter((e) => e.que === "nota");
  if (notas.length) {
    console.log("\n── Notas");
    for (const n of notas) console.log(`     ${new Date(n.t).toISOString().slice(11, 19)}  ${n.nota}`);
  }
  console.log("");
}

/* Lo que importa de una traza, en una línea por hilo. Los nombres salen de
   la traza de la mano del 7/10/2026: ahí se vio que el cuadro lo frena la
   espera del hilo que dibuja (RenderThread) a que la GPU termine de
   rasterizar, y no el JavaScript. */
function resumenTraza(ruta) {
  const { traceEvents: ev } = JSON.parse(readFileSync(ruta, "utf8"));
  const hilos = new Map();
  for (const e of ev) if (e.ph === "M" && e.name === "thread_name") hilos.set(`${e.pid}:${e.tid}`, e.args.name);
  const pilas = new Map();
  const tot = new Map();
  const sumar = (k, name, dur) => {
    const clave = `${hilos.get(k) || k}|${name}`;
    const v = tot.get(clave) || { n: 0, us: 0, max: 0 };
    v.n++; v.us += dur; v.max = Math.max(v.max, dur);
    tot.set(clave, v);
  };
  for (const e of ev) {
    const k = `${e.pid}:${e.tid}`;
    if (e.ph === "X" && e.dur != null) sumar(k, e.name, e.dur);
    else if (e.ph === "B") { if (!pilas.has(k)) pilas.set(k, []); pilas.get(k).push(e); }
    else if (e.ph === "E") { const b = pilas.get(k)?.pop(); if (b) sumar(k, b.name, e.ts - b.ts); }
  }
  const ts = ev.filter((e) => e.ts).map((e) => e.ts);
  const seg = (Math.max(...ts) - Math.min(...ts)) / 1e6;
  const de = (hilo, nombre) => {
    const v = tot.get(`${hilo}|${nombre}`);
    return v ? `${(v.us / 1000).toFixed(0)} ms (${v.n}×, máx ${(v.max / 1000).toFixed(0)})` : "—";
  };
  console.log(`   ${path.basename(ruta)} · ${seg.toFixed(1)} s`);
  console.log(`     pantalla  dibujar ${de("RenderThread", "HardwareRenderer::Draw")} · esperar a Viz ${de("RenderThread", "ScheduleOnVizAndBlock")} · esperar a la GPU ${de("RenderThread", "BlockingSequenceRunner::Sequence::RunAllTasks::WaitSyncToken")}`);
  console.log(`     GPU       rasterizar ${de("Chrome_InProcGpuThread", "RendererRasterWorker")} · terminar raster ${de("Chrome_InProcGpuThread", "RasterDecoderImpl::DoEndRasterCHROMIUM")}`);
  console.log(`     página    tareas ${de("CrRendererMain", "ThreadControllerImpl::RunTask")} · ciclo de dibujo ${de("CrRendererMain", "WebFrameWidgetImpl::UpdateLifecycle")} · estilo y diseño ${de("CrRendererMain", "LocalFrameView::UpdateStyleAndLayout")}`);
}

// ── Los píxeles de la mano ──────────────────────────────────────────────────

/* Mira cada cuadro grabado en la caja de la HIJA DE ABAJO de la escena (la
   mano y los cantos: es donde Santiago ve la basura), con tres detectores que
   se cuentan POR SEPARADO y nunca se suman:

    · bloques     los cuadrados de 4×4 grises y planos (`bloques.mjs`)
    · cromáticas  las motas de color imposible de 1 px CSS (`bloques.mjs`)
    · destellos   lo que aparece en UN cuadro y se va en el siguiente: el
                  píxel cambia fuerte contra el cuadro de antes Y contra el de
                  después, mientras esos dos coinciden entre sí. Es la firma
                  de "un frame se rompe y después vuelve", y no necesita saber
                  nada del dibujo: una carta que se mueve no vuelve a donde
                  estaba, así que no lo dispara. Sólo se mira cuando los tres
                  cuadros están a menos de 200 ms y con la misma caja.

   No hay una referencia limpia como la del menú (las cartas cambian), así que
   el piso de cada detector se lee de la propia sesión: los cuadros sin toques
   cerca dicen cuánto da el dibujo solo. */
const DIF_FUERTE = 48;
const DIF_IGUAL = 12;

/* ── LOS "RANCIOS": pedazos de la pantalla de ANTES que quedan sin tapar ───
   Es el modelo de Santiago, medido el 10/9: "los píxeles son del color de la
   escena anterior". En el teléfono se ven como rectangulitos color madera
   encima de una carta recién llegada, o al costado de un botón que apareció
   (medido el 7/10/2026 en los cuadros de la mano). `bloques.mjs` no los ve:
   busca grises, y éstos son marrones.

   Para cada toque hay tres imágenes: ANTES (el último cuadro antes del
   toque, la escena vieja ya quieta), DESPUÉS (el último antes del toque
   siguiente, la escena nueva ya quieta) y cada cuadro del medio. Un píxel
   del medio es rancio si es igual al de ANTES y distinto al de DESPUÉS. Eso
   solo también lo cumple una carta a mitad de camino, así que la mancha se
   cuenta si además:
     · es chica (hasta 32×32 px) — una carta que falta es una mancha enorme;
     · lo que la RODEA ya está como en DESPUÉS (al menos 3/4 del anillo):
       la basura es un agujero en la escena nueva, no una parte que todavía
       no llegó.
   Si el rancio sigue ahí en DESPUÉS, no se ve (DESPUÉS lo tiene igual): este
   detector cuenta lo que aparece y se va, que es "va y vuelve". */
function rancios(medio, antes, despues, width, height, manchas, tolerancia) {
  const dif = (p, q, o) => Math.max(Math.abs(p[o] - q[o]), Math.abs(p[o + 1] - q[o + 1]), Math.abs(p[o + 2] - q[o + 2]));
  const marca = new Uint8Array(width * height);
  let algo = 0;
  for (let p = 0; p < width * height; p++) {
    const o = p * 3;
    if (dif(medio, antes, o) <= tolerancia && dif(medio, despues, o) > 40) { marca[p] = 1; algo++; }
  }
  if (!algo) return [];
  return manchas(marca, width, height).filter((m) => {
    const w = m.x1 - m.x0 + 1, h = m.y1 - m.y0 + 1;
    if (m.n < 4 || w > 32 || h > 32) return false;
    let bien = 0, total = 0;
    const mirar = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      total++;
      if (dif(medio, despues, (y * width + x) * 3) <= tolerancia) bien++;
    };
    for (let x = m.x0 - 2; x <= m.x1 + 2; x++) { mirar(x, m.y0 - 2); mirar(x, m.y1 + 2); }
    for (let y = m.y0 - 1; y <= m.y1 + 1; y++) { mirar(m.x0 - 2, y); mirar(m.x1 + 2, y); }
    return total > 0 && bien / total >= 0.75;
  });
}

async function pixeles(carpeta) {
  const sharp = (await import("sharp")).default;
  const { bloquesDe, cromaticasDe } = await import("./bloques.mjs");
  const { manchas } = await import("./motas.mjs");
  const f = (n) => path.join(carpeta, n);
  const cuadros = leerJsonl(f("cuadros.jsonl")).sort((a, b) => a.t - b.t);
  const muestras = leerJsonl(f("muestras.jsonl")).sort((a, b) => a.ahora - b.ahora);
  const toques = leerJsonl(f("pagina.jsonl")).filter((e) => e.tipo === "toque").map((e) => ({ t: e.origen + e.t, quien: e.quien })).sort((a, b) => a.t - b.t);
  if (!cuadros.length) morir("Esa sesión no tiene cuadros (¿se grabó con --sin-cuadros?).");

  // La caja de cada cuadro: la última muestra antes de él, en la mesa
  let j = 0;
  const conCaja = [];
  for (const c of cuadros) {
    while (j + 1 < muestras.length && muestras[j + 1].ahora <= c.t) j++;
    const m = muestras[j];
    if (!m || !m.ruta.startsWith("/jugar/mesa") || !m.abajo || m.carga) continue;
    const esc = c.ancho / c.dw;
    const [x, y, w, h] = m.abajo;
    const x0 = Math.max(0, Math.round((x - 4) * esc)), y0 = Math.max(0, Math.round((y - 4 + c.arriba) * esc));
    const caja = { left: x0, top: y0, width: Math.min(c.ancho - x0, Math.round((w + 8) * esc)), height: Math.min(c.alto - y0, Math.round((h + 8) * esc)) };
    conCaja.push({ ...c, caja, clave: JSON.stringify(caja) });
  }
  console.log(`\n── Píxeles en la mano: ${conCaja.length} cuadros en la mesa (de ${cuadros.length})`);

  const recortar = (c) => sharp(f(`cuadros/${c.f}`)).extract(c.caja).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const salida = path.join(carpeta, "pixeles");
  mkdirSync(salida, { recursive: true });
  const filas = [];
  // Ventana de tres cuadros, decodificando adelantado de a cuatro
  const pendientes = new Map();
  const pedir = (i) => { if (i < conCaja.length && !pendientes.has(i)) pendientes.set(i, recortar(conCaja[i])); return pendientes.get(i); };
  for (let i = 0; i < conCaja.length; i++) {
    for (let k = i; k < i + 4; k++) pedir(k);
    const c = conCaja[i];
    const actual = await pedir(i);
    const png = await sharp(actual.data, { raw: { width: actual.info.width, height: actual.info.height, channels: 3 } }).png({ compressionLevel: 1 }).toBuffer();
    const b = await bloquesDe(png, [0, 1]);
    const cr = await cromaticasDe(png, [0, 1]);

    let destello = 0, manchasDestello = 0;
    const a = conCaja[i - 1], d = conCaja[i + 1];
    if (a && d && a.clave === c.clave && d.clave === c.clave && c.t - a.t < 200 && d.t - c.t < 200) {
      const [ra, rd] = [await pedir(i - 1), await pedir(i + 1)];
      const { width, height } = actual.info;
      const marca = new Uint8Array(width * height);
      const dif = (p, q, o) => Math.max(Math.abs(p[o] - q[o]), Math.abs(p[o + 1] - q[o + 1]), Math.abs(p[o + 2] - q[o + 2]));
      /* En JPEG el propio compresor mueve unos valores: los umbrales suben. */
      const fuerte = c.f.endsWith(".jpg") ? DIF_FUERTE + 12 : DIF_FUERTE;
      const igual = c.f.endsWith(".jpg") ? DIF_IGUAL + 10 : DIF_IGUAL;
      /* ZONA QUIETA (7/10/2026): la primera versión contaba los bordes de una
         carta en movimiento —el de antes y el de después coinciden por
         casualidad en algún píxel—. Ahora el píxel cuenta sólo si TODO su
         vecindario de 5×5 está igual antes y después: una carta que se mueve
         no deja quieto el vecindario de su borde. Se cuenta con una imagen
         integral de los píxeles que se movieron. */
      const integral = new Int32Array((width + 1) * (height + 1));
      for (let y = 0; y < height; y++) {
        let fila = 0;
        for (let x = 0; x < width; x++) {
          const o = (y * width + x) * 3;
          fila += dif(ra.data, rd.data, o) > igual ? 1 : 0;
          integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + fila;
        }
      }
      const movidosCerca = (x, y) => {
        const x0 = Math.max(0, x - 2), y0 = Math.max(0, y - 2), x1 = Math.min(width, x + 3), y1 = Math.min(height, y + 3);
        const W = width + 1;
        return integral[y1 * W + x1] - integral[y0 * W + x1] - integral[y1 * W + x0] + integral[y0 * W + x0];
      };
      for (let p = 0; p < width * height; p++) {
        const o = p * 3;
        if (dif(actual.data, ra.data, o) > fuerte && dif(actual.data, rd.data, o) > fuerte && movidosCerca(p % width, (p / width) | 0) === 0) { marca[p] = 1; destello++; }
      }
      /* LA FORMA (7/10/2026): una carta que vuela durante el reparto TAMBIÉN
         aparece y desaparece en cada lugar por donde pasa, y deja una mancha
         grande (la carta entera) o un borde largo y finito. La basura medida
         en este proyecto son parches chicos y compactos: cuadraditos de 4×4 a
         8×8 (5/9), 2×2 (7/9), pedazos de 8×4 (10/9). Se cuentan sólo las
         manchas de hasta 24×24 que llenan al menos la mitad de su caja. */
      if (destello) manchasDestello = manchas(marca, width, height).filter((m) => {
        const w = m.x1 - m.x0 + 1, h = m.y1 - m.y0 + 1;
        return m.n >= 2 && w <= 24 && h <= 24 && m.n / (w * h) >= 0.5;
      }).length;
    }
    // Los rancios: ANTES = último cuadro antes del toque; DESPUÉS = último antes del toque siguiente
    const previo = [...toques].reverse().find((x) => x.t <= c.t);
    const siguiente = toques.find((x) => x.t > c.t);
    let nRancios = 0;
    if (previo) {
      const iAntes = conCaja.findLastIndex((x) => x.t < previo.t);
      const iDespues = conCaja.findLastIndex((x) => x.t < (siguiente ? siguiente.t : Infinity));
      const A = conCaja[iAntes], Z = conCaja[iDespues];
      if (A && Z && iDespues > i && A.clave === c.clave && Z.clave === c.clave) {
        const [ra, rz] = [await recortar(A), await recortar(Z)];
        const tol = c.f.endsWith(".jpg") ? 22 : 12;
        nRancios = rancios(actual.data, ra.data, rz.data, actual.info.width, actual.info.height, manchas, tol).length;
      }
    }
    pendientes.delete(i - 2);

    filas.push({ n: c.n, f: c.f, t: c.t, rama: c.rama, tramo: c.tramo, bloques: b.bloques, cromaticas: cr.cromaticas, destello, manchasDestello, rancios: nRancios, desdeToque: previo ? c.t - previo.t : null, quien: previo?.quien ?? "" });
    if ((i + 1) % 200 === 0) console.log(`   … ${i + 1}/${conCaja.length}`);
  }
  writeFileSync(path.join(salida, "pixeles.jsonl"), filas.map((x) => JSON.stringify(x)).join("\n") + "\n");

  // El piso: cuadros sin un toque en los 3 s anteriores
  const quietos = filas.filter((x) => x.desdeToque == null || x.desdeToque > 3000);
  const resumen = (k) => {
    const xs = filas.map((x) => x[k]);
    const sucios = filas.filter((x) => x[k] > 0);
    return `${String(sucios.length).padStart(5)} de ${filas.length} con algo · p90 ${percentil(xs, 90)} · máx ${Math.max(0, ...xs)} · piso (quieto) máx ${Math.max(0, ...quietos.map((x) => x[k]))}`;
  };
  console.log(`   bloques      ${resumen("bloques")}`);
  console.log(`   cromáticas   ${resumen("cromaticas")}`);
  console.log(`   destellos    ${resumen("manchasDestello")}  (parches compactos de hasta 24×24 px)`);
  console.log(`   RANCIOS      ${resumen("rancios")}  (pedazos de la escena anterior)`);
  const ramas = [...new Set(filas.map((x) => x.rama))];
  if (ramas.length > 1) {
    console.log("   por rama:");
    for (const r of ramas) {
      const xs = filas.filter((x) => x.rama === r);
      const conDest = xs.filter((x) => x.manchasDestello > 0).length;
      const conR = xs.filter((x) => x.rancios > 0).length;
      console.log(`     ${r.padEnd(5)} ${String(xs.length).padStart(5)} cuadros · con rancios ${conR} (${((100 * conR) / (xs.length || 1)).toFixed(1)}%) · con destello ${conDest} · bloques>0 ${xs.filter((x) => x.bloques > 0).length}`);
    }
  }

  // Los peores de cada detector, recortados con sus vecinos para mirarlos
  const guardar = async (lista, nombre) => {
    for (const x of lista) {
      const i = conCaja.findIndex((c) => c.n === x.n);
      const trio = [conCaja[i - 1], conCaja[i], conCaja[i + 1]].filter(Boolean);
      const partes = await Promise.all(trio.map((c) => sharp(f(`cuadros/${c.f}`)).extract(c.caja).png().toBuffer()));
      // Los vecinos pueden tener otra caja: cada uno con su ancho, separados por 8 px magenta
      const medidas = await Promise.all(partes.map((p) => sharp(p).metadata()));
      let izq = 0;
      const capas = partes.map((p, k) => { const capa = { input: p, left: izq, top: 0 }; izq += medidas[k].width + 8; return capa; });
      await sharp({ create: { width: izq - 8, height: Math.max(...medidas.map((m) => m.height)), channels: 3, background: "#ff00ff" } })
        .composite(capas).png().toFile(path.join(salida, `${nombre}-${x.f}`));
    }
  };
  const peores = (k) => [...filas].filter((x) => x[k] > 0).sort((a, b) => b[k] - a[k]).slice(0, 6);
  await guardar(peores("rancios"), "rancios");
  await guardar(peores("manchasDestello"), "destello");
  await guardar(peores("bloques"), "bloques");
  await guardar(peores("cromaticas"), "cromaticas");
  console.log("   los peores de cada uno (antes · ESE · después), con lo último que se tocó:");
  for (const [k, nom] of [["rancios", "rancios"], ["manchasDestello", "destello"], ["bloques", "bloques"], ["cromaticas", "cromáticas"]]) {
    for (const x of peores(k).slice(0, 4)) console.log(`     ${nom.padEnd(10)} ${String(x[k]).padStart(4)}  cuadro ${x.n} · ${x.desdeToque == null ? "—" : `${x.desdeToque} ms`} después de tocar ${x.quien}  [${x.rama}]`);
  }
  console.log(`   recortes en ${salida}\n`);
}

// ── Andar ───────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  if (args.includes("--sesion")) {
    await sesion(numero("--sesion", 30), !args.includes("--sin-cuadros"), args.includes("--jpeg") ? numero("--jpeg", 90) : 0);
  } else if (args.includes("--pixeles")) {
    await pixeles(args[args.indexOf("--pixeles") + 1]);
  } else if (args.includes("--analizar")) {
    await analizar(args[args.indexOf("--analizar") + 1]);
  } else {
    console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(0, 8).join("\n"));
  }
}
