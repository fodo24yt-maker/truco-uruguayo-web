/**
 * El banco de pruebas del CELULAR: tocar, fotografiar y contar, sin manos.
 *
 *     node herramientas/rig-celular.mjs --mapa [N]     N toques a departamentos
 *     node herramientas/rig-celular.mjs --mesa [N]     N tandas jugando y cantando
 *     node herramientas/rig-celular.mjs --capas        el árbol de capas, sin tocar
 *     node herramientas/rig-celular.mjs --mirar        graba mientras jugás vos
 *
 * Opciones de `--mesa`:
 *
 *     --pasos N        cuántas acciones por tanda (por omisión 16)
 *     --depto NOMBRE   contra qué rival de la gira (por omisión "Cerro Largo",
 *                      que es El Turco, de 5 estrellas: los de 5 VERSEAN, y una
 *                      copla monta un panel de papel entero en vez de una
 *                      chapita, o sea que repinta mucho más)
 *     --sin-arreglo    apaga por CSS el `opacity: .999` de `app/globals.css`.
 *                      Es la rama de control, y la única que da señal: con el
 *                      arreglo puesto todo da 0 y no se distingue nada.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * La sesión del 8/9/2026 armó este rig en el temporal de la sesión, midió las
 * cinco ramas que encontraron el arreglo del mapa, y LO PERDIÓ. La receta quedó
 * escrita en `Historial.md` en prosa. Rehacerlo cuesta una hora cada vez, así
 * que esta vez queda en el repositorio.
 *
 * ── El cerrojo, que no es opcional ────────────────────────────────────────
 *
 * Santiago dio permiso para trabajar EN LA APP y en nada más de su teléfono.
 * Eso se cumple con código, no con cuidado: antes de cada toque y de cada foto
 * se pregunta quién está en primer plano y, si no es `uy.trucouruguayo.app`,
 * esto corta. El del 8/9 saltó de verdad dos veces y evitó fotografiar el
 * escritorio.
 *
 * ── Lo que este rig hace y el del 8/9 no ──────────────────────────────────
 *
 * 1. **Cada toque es un experimento con su propio control.** Se recarga la
 *    pantalla, se fotografía LIMPIA, se toca, y se fotografía SUCIA. El 8/9
 *    medía 40 fotos seguidas sin recargar, y como la basura del mapa QUEDA
 *    (80 fotos idénticas byte a byte en 76 segundos), esas 40 no eran 40
 *    medidas independientes.
 *
 * 2. **Anota la memoria libre.** Es la variable que nunca se controló, y hay
 *    tres mediciones que dicen que importa: la basura apareció con 86 MB
 *    libres y no apareció con 165 ni con 228.
 *
 * 3. **Toca donde hay que tocar, medido.** Las coordenadas salen del
 *    `getBoundingClientRect()` de cada `.depto` pedido por CDP al WebView de
 *    verdad, no de una cuenta sobre el `viewBox`.
 *
 * 4. **Cuenta las DOS poblaciones por separado**, que es lo que pide
 *    `bloques.mjs`: los bloques de 4×4 grises de la compresión de la GPU y las
 *    cromáticas de 1 píxel CSS. No son el mismo bug y no se suman nunca.
 *
 * ── CÓMO SE CAPTURA, Y POR QUÉ NO ES CON FOTOS ────────────────────────────
 *
 * El 8/9 quedó anotado como pendiente que «el screencast entrega ~1 cuadro por
 * segundo, poco para un fallo de un frame». **Es falso, y se midió.**
 *
 * `Page.startScreencast` no entrega a ritmo fijo: entrega los cuadros que el
 * compositor CONFIRMA. Con la pantalla quieta no hay ninguno que entregar —de
 * ahí salía ese «1 por segundo»—, y cuando algo pasa, están todos.
 *
 * Se calibró inyectando en la página un destello verde a pantalla completa que
 * dura EXACTAMENTE N cuadros de pantalla, contados con `requestAnimationFrame`,
 * que es el reloj del compositor. Seis intentos por duración, a 90 Hz:
 *
 *     destello de  1 cuadro  (11 ms)    screencast 0/6   ·   screencap 0/6
 *     destello de  2 cuadros (22 ms)    screencast 6/6   ·   screencap 0/6
 *     destello de  3 cuadros (33 ms)    screencast 6/6   ·   screencap 0/6
 *     destello de 20 cuadros (222 ms)   screencast 6/6   ·   screencap 0/6
 *
 * O sea: **el screencast ve todo lo que dure dos cuadros o más**, y la foto del
 * framebuffer NO VE NADA transitorio, ni un destello de 222 ms, porque
 * `screencap` tarda 800 ms en disparar y no está sincronizado con la página.
 *
 * Por eso `--mapa` sigue con fotos —ahí la basura QUEDA, son 80 fotos idénticas
 * en 76 segundos— y `--mesa` va por screencast, porque ahí el fallo es de dos
 * cuadros. Usar el instrumento equivocado da 0 y parece una buena noticia: pasó
 * hoy, una tanda de fotos dio 0 de 65 en la rama que se sabe sucia.
 *
 * Lo único que queda fuera del alcance es el fallo de UN cuadro (11 ms). Ahí el
 * ojo de una persona todavía gana, y por eso está `--mirar`.
 *
 * ── El puente, y por qué hace falta ───────────────────────────────────────
 *
 * `adb.exe` es un programa de Windows, así que el `adb forward` deja el puerto
 * de DevTools atado al `127.0.0.1` de WINDOWS, que WSL no ve. El puente es un
 * reenviador de catorce líneas que corre con el `node.exe` de Windows y escucha
 * en todas las interfaces. Se levanta solo y se apaga al terminar.
 */

import { spawnSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync, renameSync } from "node:fs";
import path from "node:path";

import { adb, sacarFoto, elCelular, enPrimerPlano, PAQUETE, ACTIVIDAD } from "./celular-usb.mjs";
import { abrirDevtools, cerrarDevtools } from "./puente-devtools.mjs";
import { bloquesDe, cromaticasDe } from "./bloques.mjs";

const morir = (...m) => { console.error("\n✗", ...m, "\n"); process.exit(1); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/* La pantalla de carga de la app (desde el 3/10/2026) tapa todo al abrir una
   página: hasta 12 s, y la red del CSS la saca a los 14. Ninguna foto puede
   salir antes de que se vaya, o se mide la pantalla de carga. */
const sinPantallaCarga = (pag) =>
  pag.waitForSelector("[data-pantalla-carga]", { state: "detached", timeout: 15000 }).catch(() => {});

/** La banda del mapa. La de la mesa (por omisión de `bloques.mjs`) da 0 acá. */
const BANDA_MAPA = [0.15, 0.68];
const BANDA_MESA = [0.27, 0.72];

// ── El cerrojo ──────────────────────────────────────────────────────────────
// `enPrimerPlano()` vive en `celular-usb.mjs` desde el 3/10/2026: también lo
// usa su modo `--tiempos`, y un cerrojo escrito dos veces es un cerrojo que un
// día dice dos cosas distintas.

/* La lista de paquetes permitidos va EXPLÍCITA en cada llamada, y no hay un
   valor por omisión escondido: así, leyendo la corrida, se ve cuál tiene
   permiso de qué. El 9/9 Santiago amplió el permiso a Chrome —y a nada más—
   para poder contestar si el bug es de Capacitor o del teléfono; el resto de
   las corridas siguen encerradas en la app. */
function exigirAlguno(permitidos, queIbaAHacer) {
  const quien = enPrimerPlano();
  if (!permitidos.includes(quien)) {
    morir(
      `El primer plano del teléfono es "${quien ?? "nada reconocible"}".\n`,
      ` No voy a ${queIbaAHacer}: sólo tengo permiso para trabajar dentro de\n`,
      ` ${permitidos.join(" y ")}. Abrilo y volvé a correr esto.`,
    );
  }
  return quien;
}

const exigirLaApp = (queIbaAHacer) => exigirAlguno([PAQUETE], queIbaAHacer);

// ── Las tres cosas que el rig sabe hacer ────────────────────────────────────

function tocar(x, y) {
  exigirLaApp("tocar la pantalla");
  adb("shell", "input", "tap", String(Math.round(x)), String(Math.round(y)));
}

function foto(destino) {
  exigirLaApp("sacar una foto");
  return sacarFoto(destino);
}

/** Los KB de `MemAvailable`. Es LA variable que nunca se controló. */
function memoriaLibre() {
  const s = adb("shell", "cat", "/proc/meminfo").stdout || "";
  return Number(/MemAvailable:\s+(\d+)/.exec(s)?.[1] ?? 0);
}

async function contar(ruta, banda) {
  const b = await bloquesDe(ruta, banda);
  const c = await cromaticasDe(ruta, banda);
  return { bloques: b.bloques, cromaticas: c.cromaticas };
}

// ── El puente a DevTools ────────────────────────────────────────────────────
// Vive en `puente-devtools.mjs` desde el 7/10/2026: también lo usa
// `medir-celular.mjs`. Ahí están las reglas que no se negocian (una sola
// dirección, apagado a los 30 min, cierre en `exit`) y se elige el socket por
// el PID de la app.

/* ── EL PUENTE SE CIERRA TAMBIÉN SI ESTO SE MATA A LO BRUTO ────────────────
   El `finally` de abajo cubre la salida normal y las excepciones, pero NO una
   señal: el 10/9 se cortó una corrida con `pkill` y el puente quedó escuchando
   en Windows con el rig ya muerto. Eso deja abierto el puerto que da acceso al
   inspector del WebView —con permiso para ejecutar JavaScript adentro de la
   app y leerle el `localStorage`, donde vive todo el progreso de la gira— sin
   nadie mirando y sin que quede rastro de que quedó abierto.

   Con Ctrl-C pasaba lo mismo, que es la forma NORMAL de cortar `--mirar`. */
for (const senal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(senal, () => { cerrarDevtools(); process.exit(130); });
}

/* El gancho de `exit` —el que cubre `process.exit`, que no ejecuta los
   `finally`; lo encontró la revisión de seguridad del 10/9— lo pone
   `puente-devtools.mjs` al importarlo. */

// ── Los recorridos ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const numero = (bandera, porOmision) => {
  const i = args.indexOf(bandera);
  return i === -1 ? porOmision : Number(args[i + 1]) || porOmision;
};

const carpeta = path.join("capturas/celular", `rig-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}`);

function encabezado(titulo, cuantos) {
  const celular = elCelular();
  /* El `?? "celular"` NO es cosmética: sin él, cuando `adb devices -l` no trae
     `model:` —pasa con algún cable, y con el teléfono en `unauthorized`— esto
     imprimía el NÚMERO DE SERIE. Las tablas de medición de este proyecto se
     pegan tal cual en `Historial.md` y en los comentarios del CSS, o sea que
     un serial tenía camino directo al repositorio público. */
  const modelo = /model:(\S+)/.exec(celular.linea)?.[1] ?? "celular";
  console.log(`\n── ${titulo} ──`);
  console.log(`   celular ${modelo} · ${cuantos} tandas · memoria libre ${(memoriaLibre() / 1024).toFixed(0)} MB`);
  console.log(`   fotos en ${carpeta}\n`);
  mkdirSync(carpeta, { recursive: true });
}

function resumen(filas, cuales) {
  const sucias = filas.filter((f) => f[cuales] > 0).length;
  const media = filas.reduce((a, f) => a + f[cuales], 0) / (filas.length || 1);
  const max = filas.reduce((a, f) => Math.max(a, f[cuales]), 0);
  return `${String(sucias).padStart(2)}/${filas.length} sucias · media ${media.toFixed(1).padStart(5)} · max ${String(max).padStart(3)}`;
}

async function recorridoMapa(cuantos, cdp) {
  const { chromium } = await import("playwright");
  encabezado("EL MAPA: un toque a un departamento por tanda", cuantos);

  const navegador = await chromium.connectOverCDP(cdp);
  const pagina = navegador.contexts()[0].pages()[0];

  const antes = [];
  const despues = [];
  const memoria = [];

  for (let i = 1; i <= cuantos; i++) {
    /* Recargar es lo que hace que cada tanda sea una medida independiente. La
       basura del mapa QUEDA una vez que apareció, así que sin esto las tandas
       2..N estarían midiendo la 1.

       ── SE ENTRA POR CLICKS Y NO POR LA DIRECCIÓN, Y NO ES UN CAPRICHO ────
       El servidor local de Capacitor NO resuelve `/jugar/gira/` a
       `/jugar/gira/index.html`: devuelve la PORTADA, con la dirección de la
       gira en la barra. Medido el 8/9/2026 contra el WebView de verdad, en las
       seis rutas del sitio. `mirar-app-compilada.mjs` no lo ve porque prueba
       contra `python3 -m http.server`, que sí resuelve las carpetas.
       De paso, entrar por clicks es lo que hace una persona. */
    await pagina.goto("https://localhost/", { waitUntil: "load" }); await sinPantallaCarga(pagina);
    await pagina.click('a[href="/jugar/"]');
    await pagina.click('a[href="/jugar/gira/"]');
    await pagina.waitForSelector(".depto", { state: "attached", timeout: 10000 });
    await dormir(900);

    const limpia = path.join(carpeta, `t${String(i).padStart(2, "0")}-limpia.png`);
    foto(limpia);

    /* El rectángulo real del departamento, pedido al WebView. `elementFromPoint`
       de paso confirma que el punto no está tapado por otra cosa: un centro
       geométrico puede caer fuera de un departamento con forma rara. */
    const punto = await pagina.evaluate((n) => {
      const deptos = [...document.querySelectorAll(".depto")];
      const el = deptos[n % deptos.length];
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const encima = document.elementFromPoint(cx, cy);
      return { x: cx, y: cy, nombre: el.getAttribute("aria-label") || el.getAttribute("data-depto") || "?", tapado: encima !== el };
    }, i - 1);

    tocar(punto.x * 2, punto.y * 2); // CSS → píxeles de pantalla, DPR 2
    await dormir(900);

    const sucia = path.join(carpeta, `t${String(i).padStart(2, "0")}-tocada.png`);
    foto(sucia);

    const a = await contar(limpia, BANDA_MAPA);
    const d = await contar(sucia, BANDA_MAPA);
    antes.push(a); despues.push(d);
    const mem = memoriaLibre(); memoria.push(mem);

    console.log(
      `  ${String(i).padStart(2)}  ${punto.nombre.padEnd(16).slice(0, 16)}` +
      `  limpia ${String(a.bloques).padStart(3)}b ${String(a.cromaticas).padStart(3)}c` +
      `  →  tocada ${String(d.bloques).padStart(3)}b ${String(d.cromaticas).padStart(3)}c` +
      `   ${(mem / 1024).toFixed(0).padStart(4)} MB${punto.tapado ? "  ⚠ punto tapado" : ""}`,
    );
  }

  await navegador.close();

  console.log(`\n  ── bloques (4×4 grises, compresión de la GPU) ──`);
  console.log(`     recién cargado   ${resumen(antes, "bloques")}`);
  console.log(`     después de tocar ${resumen(despues, "bloques")}`);
  console.log(`\n  ── cromáticas (1 px CSS, saturadas) ──`);
  console.log(`     recién cargado   ${resumen(antes, "cromaticas")}`);
  console.log(`     después de tocar ${resumen(despues, "cromaticas")}`);
  console.log(`\n  memoria libre: ${(Math.min(...memoria) / 1024).toFixed(0)}–${(Math.max(...memoria) / 1024).toFixed(0)} MB\n`);
}

// ── LA MESA: jugar, cantar y grabar ─────────────────────────────────────────

/* mulberry32. Con la misma semilla, las dos ramas de un A/B eligen las mismas
   opciones en el mismo orden.

   OJO CON LO QUE ESTO **NO** FIJA: el reparto del motor usa `Math.random()`,
   así que las cartas cambian de tanda en tanda. La semilla iguala las
   DECISIONES, no la partida. Por eso las tandas se alternan entre ramas y se
   corren varias: es lo único que promedia esa varianza. */
function dado(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Lo que se puede tocar ahora mismo. Corre DENTRO de la página, así que se
   escribe como una función suelta y sin nada de afuera.

   "Mazo" queda afuera a propósito: irse al mazo termina la mano, y una tanda
   que se va al mazo en el paso 2 mide catorce pasos de pantalla quieta. Lo que
   se busca es el bug DEL CANTO. */
const OPCIONES = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
  const marca = (arr, clase) => arr.map((el, i) => ({ clase, i, texto: el.textContent.trim().slice(0, 22) }));
  const sueltos = [...document.querySelectorAll("div.pointer-events-auto > button")].filter(vis);
  const barra = [...document.querySelectorAll("button.min-h-\\[46px\\].flex-1")].filter(vis)
    .filter((b) => !/^Mazo$/i.test(b.textContent.trim()));
  const quiero = [...document.querySelectorAll("button")]
    .filter((b) => vis(b) && /^(Quiero|No quiero)$/.test(b.textContent.trim()));
  const cartas = [...document.querySelectorAll('[data-mano="tuya"] button[aria-label^="Tirar"]')].filter(vis);
  return [...marca(quiero, "quiero"), ...marca(sueltos, "suelto"), ...marca(barra, "barra"), ...marca(cartas, "carta")];
};

const TOCAR = ({ clase, i }) => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
  const por = {
    suelto: () => [...document.querySelectorAll("div.pointer-events-auto > button")].filter(vis),
    barra: () => [...document.querySelectorAll("button.min-h-\\[46px\\].flex-1")].filter(vis)
      .filter((b) => !/^Mazo$/i.test(b.textContent.trim())),
    quiero: () => [...document.querySelectorAll("button")]
      .filter((b) => vis(b) && /^(Quiero|No quiero)$/.test(b.textContent.trim())),
    carta: () => [...document.querySelectorAll('[data-mano="tuya"] button[aria-label^="Tirar"]')].filter(vis),
  };
  const el = por[clase]()[i];
  if (!el) return null;
  const t = el.textContent.trim().slice(0, 22);
  el.click();
  return t;
};

/** Los 19 ids de `lib/motor/personalidades.ts`, en el orden de la gira. */
const IDS_DE_LA_GIRA = [
  "luki", "la-coca", "el-rulo", "tito", "la-nelly", "marito", "el-pescador",
  "don-aparicio", "cachila", "el-trinitario", "la-rosa", "el-tucho", "el-fray",
  "beto", "don-ramon", "el-piedra", "joao", "peralta", "el-melo",
];

/* Abre la gira entera para poder entrar a cualquier departamento.

   ESTO ESCRIBE EN EL `localStorage` DE LA APP, o sea que le pisa el progreso a
   quien esté usando ese teléfono. Se hace igual porque medir contra un rival de
   5 estrellas es el caso que importa —los de 5 versean, y una copla monta un
   panel de papel entero— y porque el rig corre sobre un APK de depuración. Si
   alguna vez se corre contra un teléfono con progreso de verdad, guardar el
   valor viejo antes y devolverlo al terminar. */
async function abrirLaGira(pag, base) {
  await pag.goto(`${base}/`, { waitUntil: "load" }); await sinPantallaCarga(pag);
  await pag.evaluate((ids) => {
    const rivales = {};
    for (const id of ids) rivales[id] = { ganadas: 1, jugadas: 1 };
    localStorage.setItem("truco-uy:progreso", JSON.stringify({
      version: 1, rivales, leccionesLeidas: [], ayudas: true, ultimoRival: null,
    }));
    /* Desde el 2/10/2026 la Gira tiene candado en la app (se abre terminando
       Aprender o mirando un video). Sin esto, el toque a la Gira abre el
       diálogo de desbloqueo y `.depto` no aparece nunca. Y la primera partida
       de cada sesión no lleva anuncio: como cada vuelta recarga, el rig no se
       cruza con un intersticial. */
    localStorage.setItem("truco-uy:desbloqueos", JSON.stringify({
      version: 1, anotador: true, gira: true,
    }));
  }, IDS_DE_LA_GIRA);
}

/* Entra a la mesa DE LA GIRA, que es lo que se juega de verdad.

   Se entra por clicks y no por la dirección por lo mismo que en `--mapa`: el
   servidor local de Capacitor NO resuelve `/jugar/mesa/` a su `index.html` y
   devuelve la PORTADA. Medido el 8/9 en las seis rutas del sitio. */
async function entrarPorLaGira(pag, depto, base) {
  await pag.goto(`${base}/`, { waitUntil: "load" }); await sinPantallaCarga(pag);
  await pag.click('a[href="/jugar/"]');
  await pag.click('a[href="/jugar/gira/"]');
  await pag.waitForSelector(".depto", { timeout: 15000 });
  await dormir(700);
  await pag.click(`[aria-label*="${depto}" i]`);
  await dormir(900);
  const fue = await pag.evaluate(() => {
    const a = [...document.querySelectorAll("a")]
      .find((x) => /jugar/i.test(x.textContent) && /mesa/.test(x.getAttribute("href") || ""));
    if (!a) return null;
    a.click();
    return a.getAttribute("href");
  });
  if (!fue) morir(`No encontré el botón de jugar en la ficha de ${depto}.`);
  await pag.waitForSelector(".escena", { timeout: 15000 });
  await dormir(2200);
}

/** UNA tanda: entra, aplica la rama, juega N pasos y devuelve los cuadros. */
async function unaTandaDeMesa({ pag, css, pasos, semilla, guardarEn, depto, base, permitidos }) {
  exigirAlguno(permitidos, "jugar una tanda");
  await entrarPorLaGira(pag, depto, base);
  if (css) await pag.addStyleTag({ content: css });
  mkdirSync(guardarEn, { recursive: true });

  const ses = await pag.context().newCDPSession(pag);
  const cuadros = [];
  /* El ack va SIN `await`: esperarlo serializa el manejador, y Chromium no
     manda el cuadro siguiente hasta que llega, así que cada `await` se comía un
     viaje de ida y vuelta por el cable. */
  ses.on("Page.screencastFrame", (e) => {
    cuadros.push({ t: Date.now(), buf: Buffer.from(e.data, "base64") });
    ses.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
  });
  await ses.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });

  const azar = dado(semilla);
  const hechos = [];
  for (let n = 0; n < pasos; n++) {
    const ops = await pag.evaluate(OPCIONES);
    if (!ops.length) { await dormir(700); continue; }
    /* Se prefiere cantar antes que tirar carta: tirando cartas la mano se
       termina enseguida y se canta poco, que es al revés de lo que se busca. */
    const cantos = ops.filter((o) => o.clase !== "carta");
    const pool = cantos.length && azar() < 0.75 ? cantos : ops;
    const eleg = pool[Math.floor(azar() * pool.length)];
    const t0 = Date.now();
    const texto = await pag.evaluate(TOCAR, eleg);
    hechos.push({ t: t0, clase: eleg.clase, texto });
    await dormir(1050);
  }
  await ses.send("Page.stopScreencast").catch(() => {});
  await dormir(250);
  await ses.detach().catch(() => {});

  const filas = [];
  for (let i = 0; i < cuadros.length; i++) {
    const f = path.join(guardarEn, `c${String(i).padStart(3, "0")}.png`);
    writeFileSync(f, cuadros[i].buf);
    const b = await bloquesDe(f, BANDA_MESA);
    const c = await cromaticasDe(f, BANDA_MESA);
    const previa = hechos.filter((h) => h.t <= cuadros[i].t).at(-1);
    filas.push({
      bloques: b.bloques, cromaticas: c.cromaticas,
      tras: previa?.texto ?? "—", clase: previa?.clase ?? "—",
      msDespues: previa ? cuadros[i].t - previa.t : null,
    });
    if (!b.bloques) rmSync(f, { force: true });   // sólo se guardan los sucios
  }
  return { filas, hechos };
}

const SIN_ARREGLO = ".escena > * { opacity: 1 !important; }";

async function recorridoMesa(cuantos, cdp, { pasos, depto, sinArreglo }) {
  const { chromium } = await import("playwright");
  encabezado(`LA MESA de la gira, contra ${depto}${sinArreglo ? " · SIN el arreglo" : ""}`, cuantos);

  const navegador = await chromium.connectOverCDP(cdp);
  const pagina = navegador.contexts()[0].pages().at(-1);
  await abrirLaGira(pagina, "https://localhost");

  const todas = [];
  const memoria = [];
  for (let i = 1; i <= cuantos; i++) {
    const { filas } = await unaTandaDeMesa({
      pag: pagina, css: sinArreglo ? SIN_ARREGLO : null, pasos, semilla: 7000 + i,
      guardarEn: path.join(carpeta, `t${String(i).padStart(2, "0")}`),
      depto, base: "https://localhost", permitidos: [PAQUETE],
    });
    todas.push(...filas);
    const sucios = filas.filter((f) => f.bloques > 0);
    const mem = memoriaLibre(); memoria.push(mem);
    console.log(
      `  ${String(i).padStart(2)}  ${String(filas.length).padStart(3)} cuadros` +
      `  ${String(sucios.length).padStart(3)} sucios` +
      `   ${(mem / 1024).toFixed(0).padStart(4)} MB` +
      (sucios.length ? `   ← max ${Math.max(...sucios.map((f) => f.bloques))} tras "${sucios[0].tras}"` : ""),
    );
  }
  await navegador.close();

  const sucios = todas.filter((f) => f.bloques > 0);
  console.log(`\n  ── bloques (4×4 grises, compresión de la GPU) ──`);
  console.log(`     ${String(sucios.length).padStart(3)}/${todas.length} cuadros sucios` +
    ` · media ${(todas.reduce((a, f) => a + f.bloques, 0) / (todas.length || 1)).toFixed(2)}` +
    ` · max ${todas.reduce((a, f) => Math.max(a, f.bloques), 0)}`);
  if (sucios.length) {
    console.log(`\n  qué acción los precedía, y a cuántos ms:`);
    for (const f of sucios) {
      console.log(`     ${String(f.bloques).padStart(3)} bloques  ${String(f.msDespues).padStart(5)} ms tras  ${f.clase.padEnd(7)} "${f.tras}"`);
    }
  }
  console.log(`\n  memoria libre: ${(Math.min(...memoria) / 1024).toFixed(0)}–${(Math.max(...memoria) / 1024).toFixed(0)} MB\n`);
}

// ── EL MENÚ DE JUGAR: NO ES LLEGAR, ES VOLVER ───────────────────────────────

/* ── EL CAMINO QUE ROMPE, Y CUÁNTO COSTÓ ENCONTRARLO ──────────────────────
   La primera versión de esto medía UNA llegada al menú desde la portada y daba
   0 en todo, con la pantalla rota a la vista. Estaba midiendo el camino
   equivocado. El de verdad lo dictó Santiago el 9/9/2026:

       menú → Gira nacional → tocar un departamento → volver al menú
            → Gira nacional → tocar un departamento → volver al menú → …

   Lo que rompe es **volver**, y ninguna de estas cosas rompe sola: llegar al
   menú de frente da 0, entrar y volver UNA vez da 0, y volver con el botón
   físico de atrás en vez del enlace da la misma foto byte a byte.

   ── ES INTERMITENTE, ASÍ QUE SE MIDE UNA TASA Y NO UN CASO ───────────────
   Dos corridas de control, con el mismo guión:

       corrida 1   vuelta 1 limpia · vueltas 2, 3 y 4 SUCIAS (838 px)
       corrida 2   vuelta 1 SUCIA (806 px) · vueltas 2 y 3 limpias

   O sea que ni aparece siempre en la misma vuelta ni se queda para siempre: a
   veces se limpia sola. Una sola corrida no dice nada; hay que contar cuántos
   regresos de N vuelven sucios, y alternar las ramas.

   ── CÓMO SE MIDE, Y POR QUÉ NO CON `bloques.mjs` ─────────────────────────
   `bloques.mjs` está calibrado para la mesa y para el mapa. En esta pantalla
   —papel casi neutro (#f7f1e1: r−b = 22, justo en el límite de lo que llama
   "neutro") y cartas de 44 px— no separa basura de diseño: da 0 con la
   pantalla rota. Se probó, y por eso no se usa acá.

   Lo que se usa es mejor y no necesita definir qué es una mancha: **la foto
   limpia sale del propio teléfono**. Como el dibujo es fijo, todos los
   regresos limpios son idénticos BYTE A BYTE; se agrupan las fotos por hash y
   el grupo más numeroso es la referencia limpia de esa rama. Cada píxel que se
   aparta de ahí es basura. Es `motas.movimiento()` aplicado al regreso, y se
   calibra solo en cada rama —que hace falta, porque hay ramas que cambian el
   dibujo a propósito—.

   Medido así, la basura son cuadraditos planos de 4×4 —negros sobre el papel
   de la carta, grises sobre la madera— repartidos por el PERÍMETRO de la caja
   que rodea la fila de cartas: una franja arriba, otra a la derecha, otra
   abajo, y una columna en el borde de la primera carta. */
const RAMAS_MENU = {
  A: { nombre: "control, como está", css: null },
  B: { nombre: "halo APAGADO (diagnóstico)", css: ".halo-pieza{box-shadow:none!important}" },
  C: { nombre: "halo sin desenfoque, sólo el aro", css: ".halo-pieza{box-shadow:0 0 0 2px var(--color-dorado)!important}" },
  D: { nombre: "cartas de la gira sin rotar", css: ".halo-pieza{transform:none!important}" },
  E: { nombre: "opacity .999 en los hijos de la pantalla", css: ".pantalla-fija.tabla-mesa>*{opacity:.999}" },
  /* F salió de la medición del 10/9: H limpia la zona de la gira entera pero
     deja intacta la basura de la zona de Partida rápida, porque `.halo-pieza`
     sólo existe en las cartas de la gira. Las cuatro cartas cubren las dos. */
  F: { nombre: "opacity .999 en las cuatro cartas", css: '.pantalla-fija.tabla-mesa svg[role="img"]{opacity:.999}' },
  H: { nombre: "opacity .999 sólo en las de la gira", css: ".halo-pieza{opacity:.999}" },

  /* Diagnóstico incómodo pero obligatorio: apagar el arreglo del mapa del
     8/9. Santiago encontró este bug DESPUÉS de aquel arreglo, así que hay que
     poder contestar si lo causamos nosotros. No es un candidato: si ganara,
     habría que buscar otra salida, porque apagarlo devuelve las manchitas del
     mapa (media 1,8 y 11 de 12 tandas sucias). */
  M: { nombre: "SIN el arreglo del mapa del 8/9 (diagnóstico)", css: ".mapa-gira>*:not(defs){opacity:1!important}" },
};

/* ── LA ZONA QUE SE MIRA, Y POR QUÉ SE AGRANDÓ EL 10/9 ────────────────────
   Hasta el 9/9 esto devolvía la caja de las CARTAS más 16px. Santiago venía
   diciendo desde el principio "las cartas Y LAS LETRAS", y las letras quedaban
   afuera: si la basura caía sobre "GIRA NACIONAL" o sobre el texto de abajo,
   la medición no la veía nunca y devolvía 0 con la pantalla rota.

   Ahora se mira `.pantalla-fija` entera, que es todo el menú. Deja afuera el
   reloj del sistema —que cambia cada minuto y ensuciaría cada comparación— y
   la barra del sitio, que están arriba de ella. */
async function zonaDeLaPantalla(pag) {
  const c = await pag.evaluate(() => {
    const el = document.querySelector(".pantalla-fija");
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, dpr: devicePixelRatio };
  });
  return {
    left: Math.round(c.x * c.dpr), top: Math.round(c.y * c.dpr),
    width: Math.round(c.w * c.dpr), height: Math.round(c.h * c.dpr),
  };
}

/** El recorte de la zona de las cartas, en crudo, para hashear y para comparar. */
async function recorte(ruta, caja) {
  const sharp = (await import("sharp")).default;
  return sharp(ruta).extract(caja).raw().toBuffer({ resolveWithObject: true });
}

async function cuantoCambio(a, b) {
  const { width: w, height: h, channels: c } = a.info;
  let distintos = 0, suma = 0, peor = 0;
  for (let i = 0, p = 0; i < w * h; i++, p += c) {
    const d = Math.max(Math.abs(a.data[p] - b.data[p]), Math.abs(a.data[p + 1] - b.data[p + 1]), Math.abs(a.data[p + 2] - b.data[p + 2]));
    if (d > 8) { distintos++; suma += d; if (d > peor) peor = d; }
  }
  return { distintos, total: w * h, media: suma / (distintos || 1), peor };
}

/** Una vuelta: entra a la gira, toca un departamento y vuelve al menú. */
async function unaVuelta(pag, n) {
  await pag.click('a[href="/jugar/gira/"]');
  await pag.waitForSelector(".depto", { state: "attached", timeout: 20000 });
  await dormir(1500);

  /* El toque va con `input tap` de verdad y no con un click de CDP: es lo que
     hace una persona, y es como se midió el mapa el 8/9. */
  const p = await pag.evaluate((i) => {
    const d = [...document.querySelectorAll(".depto")];
    const el = d[(i * 5) % d.length];
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, nombre: (el.getAttribute("aria-label") || "?").split(",")[0] };
  }, n);
  tocar(p.x * 2, p.y * 2);
  await dormir(1500);

  /* Se vuelve por el enlace de la ficha, que es lo que toca una persona. El
     botón físico de atrás da lo mismo: medido, las dos fotos salieron
     idénticas byte a byte. */
  await pag.click('a[href="/jugar"], a[href="/jugar/"]').catch(() => pag.evaluate(() => history.back()));
  await pag.waitForSelector(".halo-pieza", { state: "attached", timeout: 15000 });
  await dormir(1600);
  return p.nombre;
}

/** Deja la página en el menú, con la rama puesta desde antes del primer cuadro. */
async function entrarAlMenu(pag, css, id) {
  /* La rama se inyecta EN LA PORTADA. Si se agregara ya estando en `/jugar`,
     la rasterización que se quiere medir ya pasó. La navegación de Next es del
     lado del cliente y no toca el `<head>`: la regla sobrevive el recorrido. */
  await pag.goto("https://localhost/", { waitUntil: "load" }); await sinPantallaCarga(pag);
  if (css) await pag.addStyleTag({ content: css });
  await pag.click('a[href="/jugar/"]');
  await pag.waitForSelector(".halo-pieza", { state: "attached" });
  await dormir(1200);

  /* El 8/9 una regla no aplicó NUNCA —había quedado adentro de un
     `@media (hover:hover)`, que en un celular no existe— y se midió una rama
     que era el control disfrazado. Desde entonces se pregunta y se imprime. */
  if (css) {
    const s = await pag.evaluate(() => {
      const c = getComputedStyle(document.querySelector(".halo-pieza"));
      const p = document.querySelector(".pantalla-fija.tabla-mesa");
      return `carta: opacity ${c.opacity} · sombra ${c.boxShadow.slice(0, 34)} · hijo de la pantalla: opacity ${p ? getComputedStyle(p.children[0]).opacity : "?"}`;
    });
    console.log(`  ${id}  la regla quedó → ${s}`);
  }
}

async function recorridoMenu(bloques, cdp, ramas, porBloque) {
  const { chromium } = await import("playwright");
  const { createHash } = await import("node:crypto");
  encabezado(`EL MENÚ DE JUGAR · ida y vuelta a la gira · ramas ${ramas.join(" ")}`, bloques);
  console.log(`   ${bloques} bloques por rama · ${porBloque} vueltas por bloque · las ramas se ALTERNAN\n`);

  const navegador = await chromium.connectOverCDP(cdp);
  const pagina = navegador.contexts()[0].pages().at(-1);
  const fotos = Object.fromEntries(ramas.map((r) => [r, []]));
  let caja = null;

  /* Se alternan los BLOQUES y no las vueltas sueltas: la basura necesita
     varias idas y vueltas seguidas sobre la misma carga para aparecer, y a la
     vez la memoria del teléfono deriva a lo largo de la corrida y tiene que
     pegarle igual a las dos ramas. Un bloque son las dos cosas. */
  for (let b = 1; b <= bloques; b++) {
    for (const id of ramas) {
      await entrarAlMenu(pagina, RAMAS_MENU[id].css, id);
      if (!caja) caja = await zonaDeLaPantalla(pagina);
      const salida = path.join(carpeta, id);
      mkdirSync(salida, { recursive: true });

      for (let v = 1; v <= porBloque; v++) {
        const depto = await unaVuelta(pagina, v + b);
        const f = path.join(salida, `b${b}-v${v}.png`);
        foto(f);
        fotos[id].push({ f, depto, bloque: b, vuelta: v, mem: memoriaLibre() });
      }
    }
  }
  await navegador.close();

  /* La referencia limpia de CADA rama sale de sus propias fotos: el grupo más
     numeroso de fotos idénticas. Hace falta que sea por rama porque hay ramas
     que cambian el dibujo a propósito (apagar el halo, sacar la rotación) y
     ahí la "limpia" es otra imagen. */
  console.log(`\n  ── cada regreso al menú, contra la foto limpia de su propia rama ──`);
  const resumenes = {};
  for (const id of ramas) {
    const recortes = [];
    for (const x of fotos[id]) recortes.push({ ...x, r: await recorte(x.f, caja) });
    const grupos = new Map();
    for (const x of recortes) {
      const h = createHash("sha1").update(x.r.data).digest("hex");
      grupos.set(h, (grupos.get(h) || 0) + 1);
      x.hash = h;
    }
    const limpio = [...grupos.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const patron = recortes.find((x) => x.hash === limpio).r;

    const filas = [];
    for (const x of recortes) {
      const d = x.hash === limpio ? { distintos: 0, total: patron.info.width * patron.info.height, media: 0, peor: 0 } : await cuantoCambio(patron, x.r);
      filas.push(d);
      console.log(
        `  ${id}  b${x.bloque} v${x.vuelta}  tras ${x.depto.padEnd(16).slice(0, 16)}` +
        `  ${String(d.distintos).padStart(6)} px  media ${d.media.toFixed(1).padStart(5)}  peor ${String(d.peor).padStart(3)}` +
        `   ${(x.mem / 1024).toFixed(0).padStart(4)} MB`,
      );
      if (!d.distintos) rmSync(x.f, { force: true });   // sólo se guardan las sucias
    }
    resumenes[id] = filas;
    console.log();
  }

  console.log(`  ── RESUMEN · píxeles que cambian en la zona de las cartas (${caja.width}x${caja.height}) ──`);
  for (const id of ramas) {
    const f = resumenes[id];
    const sucias = f.filter((x) => x.distintos > 0).length;
    console.log(`     ${id}  ${RAMAS_MENU[id].nombre.padEnd(40)} ${String(sucias).padStart(2)}/${f.length} regresos sucios` +
      ` · media ${(f.reduce((a, x) => a + x.distintos, 0) / (f.length || 1)).toFixed(1).padStart(7)} px` +
      ` · max ${String(Math.max(...f.map((x) => x.distintos))).padStart(5)}`);
  }
  console.log();
}

/* ── EL MISMO MENÚ, PERO TOCA UNA PERSONA Y MIDE EL RIG ────────────────────

   Es el recorrido de arriba con UNA diferencia, y es la que importa: acá el
   rig NO TOCA LA PANTALLA. Toca Santiago, a su ritmo, y esto sólo mira.

   ── POR QUÉ, QUE NO ES UN CAPRICHO ──────────────────────────────────────
   El 9/9 este mismo recorrido tocó 16 veces solo, con `input tap`, y de esas
   16 vueltas volvió UNA sucia. Con eso no se distingue ninguna rama de
   ninguna. El bug pide el ritmo de una persona —los tiempos entre toques, que
   el dedo tape media pantalla, que la vuelta salga antes de que termine de
   asentarse— y `input tap` no lo tiene. Medir con las manos de Santiago no es
   una comodidad: es la única forma que hay de que el bug aparezca.

   ── LAS RAMAS SE ALTERNAN SOLAS, Y ÉL NO SE ENTERA ──────────────────────
   Cambiar de rama es inyectar una regla de CSS, o sea que cuesta milisegundos
   y no se ve. Así que esto alterna A/B/A/B por bloques POR DEBAJO mientras
   Santiago hace sus vueltas de corrido. Él hace 32 idas y vueltas seguidas y
   se entera al final de que eran dos ramas.

   Eso es lo mejor que se puede pedir de un A/B acá: la memoria del teléfono
   deriva a lo largo de la tarde, la mano se cansa y el ritmo cambia, y todo
   eso le pega IGUAL a las dos ramas. Las corridas del 8/9, con una rama
   entera y después la otra, no podían decir lo mismo.

   El cambio se hace SIEMPRE justo después de la foto, con Santiago parado en
   el menú: así la vuelta siguiente entra a la gira con la rama nueva ya
   puesta, y ningún repintado del cambio se le atribuye a la rama que entra.

   ── EL CERROJO ACÁ ESPERA EN VEZ DE MATAR ───────────────────────────────
   En los recorridos automáticos, si el primer plano no es la app el guión
   corta. Acá cortar sería tirar media hora de trabajo de manos porque entró
   una llamada. La regla que importa —no fotografiar nada que no sea la app—
   se cumple igual: si el primer plano no es la app, esto NO saca la foto y
   espera. */

/** Lo que corre DENTRO de la página en cada sondeo. No modifica el dibujo. */
const SONDEO = ({ css, marca }) => {
  /* 1. La rama. Idempotente a propósito: si Santiago recarga, el `<style>` se
        pierde y esto lo vuelve a poner solo en el sondeo siguiente. */
  const puesto = document.getElementById("rama-rig");
  if (puesto && puesto.dataset.rama !== marca) puesto.remove();
  if (css && !document.getElementById("rama-rig")) {
    const s = document.createElement("style");
    s.id = "rama-rig";
    s.dataset.rama = marca;
    s.textContent = css;
    document.head.appendChild(s);
  }
  if (!css && document.getElementById("rama-rig")) document.getElementById("rama-rig").remove();

  /* 2. Los observadores de tamaño. Van por evento y no por sondeo: un
        `getBoundingClientRect()` en cada cuadro obligaría a la página a
        recalcular la distribución todo el tiempo, que es justo la operación
        que estamos investigando. Un `ResizeObserver` no la fuerza. */
  if (!window.__rig) {
    const medidas = [];
    const anotar = (que, w, h) =>
      medidas.push({ t: Math.round(performance.now()), que, w: Math.round(w), h: Math.round(h) });
    const ro = new ResizeObserver((es) => {
      for (const e of es) {
        const q = e.target === document.body ? "body" : (e.target.getAttribute("class") || "?").split(" ")[0];
        anotar(q, e.contentRect.width, e.contentRect.height);
      }
    });
    ro.observe(document.body);
    if (window.visualViewport) {
      visualViewport.addEventListener("resize", () =>
        anotar("visualViewport", visualViewport.width, visualViewport.height));
    }
    window.__rig = { medidas, ro, atados: new WeakSet() };
  }
  const { ro, atados, medidas } = window.__rig;
  /* Re-atar desde afuera y no con un MutationObserver: React cambia el DOM
     muchas veces por segundo y un observador de mutaciones estaría llamando a
     `querySelector` todo el tiempo adentro de la página que se está midiendo. */
  for (const sel of [".pantalla-fija", ".mesa-pantalla-completa", ".tabla-mesa", ".mapa-gira"]) {
    const el = document.querySelector(sel);
    if (el && !atados.has(el)) { atados.add(el); ro.observe(el); }
  }
  const halo = document.querySelector(".halo-pieza");
  const fila = halo?.parentElement;
  if (fila && !atados.has(fila)) { atados.add(fila); ro.observe(fila); }

  /* 3. El informe. `medidas.splice(0)` las vacía: se acumulan afuera, por
        vuelta, y así el arreglo de adentro no crece sin límite. */
  const r = fila?.getBoundingClientRect();
  return {
    ruta: location.pathname.replace(/\/+$/, "") || "/",
    ancho: innerWidth,
    halo: !!halo,
    /* El 8/9 se midió una rama entera que era el control disfrazado, porque la
       regla había quedado adentro de un `@media (hover:hover)` y no aplicó
       nunca. Desde entonces la rama se PREGUNTA, no se supone. */
    opacidad: halo ? getComputedStyle(halo).opacity : null,
    /* La opacidad del BLOQUE también, porque hay ramas que se la ponen al
       padre y no a la carta: mirando sólo la carta, esas ramas se ven como el
       control y se mide un control disfrazado de arreglo. Es el error del 8/9
       —una regla adentro de un `@media (hover:hover)` que en un celular no
       existe— repetido de otra forma. */
    opacidadBloque: (() => {
      const pf = document.querySelector(".pantalla-fija");
      return pf && pf.children[0] ? getComputedStyle(pf.children[0]).opacity : null;
    })(),
    sombra: halo ? getComputedStyle(halo).boxShadow.slice(0, 30) : null,
    fila: r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null,
    medidas: medidas.splice(0),
  };
};

/* ── POR QUÉ NO ALCANZA CON LA FOTO DEL FRAMEBUFFER ───────────────────────
   El 9/9 quedó anotado que en el menú la basura A VECES SE LIMPIA SOLA. Una
   foto sacada 1,6s después de llegar sólo ve lo que sobrevivió a esos 1,6s, y
   dar 0 por eso parece una buena noticia cuando es el instrumento equivocado
   —el encabezado de este archivo cuenta que ya pasó una vez, con una tanda de
   fotos que dio 0 de 65 en una rama que se sabía sucia—.

   Así que van los dos canales a la vez:

     · `screencap`   la foto del framebuffer: ve lo que QUEDA
     · screencast    los cuadros que confirma el compositor: ve lo que dura
                     dos cuadros o más, y está medido que los ve todos

   Los cuadros del screencast son del viewport de Chromium y la foto es de la
   pantalla entera, o sea que son DOS geometrías distintas: cada canal se
   recorta con su propia caja y se compara contra su propia referencia limpia.
   Mezclarlos daría todo sucio. */
async function recorridoMenuAMano(cdp, ramas, porRama, tamBloque, minutos, refExplicita) {
  const { chromium } = await import("playwright");
  const { createHash } = await import("node:crypto");

  /* El plan dice qué rama le toca a cada vuelta, en bloques alternados. */
  const plan = [];
  for (let hechas = 0; hechas < porRama; hechas += tamBloque)
    for (const id of ramas)
      for (let k = 0; k < Math.min(tamBloque, porRama - hechas); k++) plan.push(id);

  encabezado(`EL MENÚ · TOCA SANTIAGO, MIDE EL RIG · ramas ${ramas.join(" ")}`, plan.length);
  console.log(`   ${porRama} vueltas por rama · se alternan de a ${tamBloque}, por debajo`);
  console.log(`   hasta ${minutos} minutos de espera\n`);
  console.log(`   ┌─────────────────────────────────────────────────────────────┐`);
  console.log(`   │  DALE CUANDO QUIERAS:                                       │`);
  console.log(`   │    menú → Gira nacional → tocar un depto → volver al menú    │`);
  console.log(`   │    ... y otra vez, ${String(plan.length).padEnd(2)} veces en total.                   │`);
  console.log(`   └─────────────────────────────────────────────────────────────┘\n`);

  const navegador = await chromium.connectOverCDP(cdp);
  const pagina = navegador.contexts()[0].pages().at(-1);

  /* Los cuadros entran todo el tiempo, pero sólo interesan los del ratito
     siguiente a llegar al menú. Fuera de esa ventana se tiran: media hora de
     idas y vueltas son miles de PNG y no entran en memoria. */
  const ses = await pagina.context().newCDPSession(pagina);
  let capturando = false;
  let cuadros = [];
  let cuadrosVistos = 0;
  ses.on("Page.screencastFrame", (e) => {
    cuadrosVistos++;
    cuadros.push({ t: Date.now(), buf: Buffer.from(e.data, "base64") });
    if (!capturando && cuadros.length > 4) cuadros.shift();
    /* El ack va SIN await: esperarlo serializa el manejador y Chromium no
       manda el cuadro siguiente hasta que llega. */
    ses.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
  });
  await ses.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });

  const fotos = Object.fromEntries(ramas.map((r) => [r, []]));
  const diario = path.join(carpeta, "vueltas.json");
  let caja = null;
  let i = 0;
  let enMenuAntes = false;
  /* ── SE CUENTA EL REGRESO DESDE CUALQUIER PANTALLA, DESDE EL 10/9 ──────
     La primera versión exigía haber pasado por `/jugar/gira`. Santiago midió
     a mano que el bug sale por tres caminos y no por uno:

         gira → menú             la basura trae el color del MAPA
         partida rápida → menú   trae el color de la MESA
         portada → menú de jugar también rompe, repitiendo

     Y en los tres casos la basura cae en la MISMA zona, la del menú. Exigir
     la gira dejaba dos tercios del bug sin medir. */
  let vioOtraPantalla = false;
  /* Si Santiago ya miró una pantalla y dijo "ésta está limpia", esa manda.
     Es la única referencia que no se puede equivocar. */
  let referencia = refExplicita || null;
  if (referencia) console.log(`   referencia limpia: ${referencia}  (la miró Santiago)\n`);
  let bufer = [];
  let avisoCerrojo = 0;
  const limite = Date.now() + minutos * 60000;

  while (i < plan.length && Date.now() < limite) {
    const rama = plan[i];
    let info;
    try {
      info = await pagina.evaluate(SONDEO, { css: RAMAS_MENU[rama].css, marca: rama });
    } catch {
      await dormir(250);   // está navegando: el contexto se destruyó y vuelve
      continue;
    }
    bufer.push(...info.medidas);
    if (info.ruta !== "/jugar") vioOtraPantalla = true;

    const enMenu = info.ruta === "/jugar" && info.halo;

    /* ── LA REFERENCIA LIMPIA, QUE ES EL ARREGLO DE FONDO DEL 10/9 ────────
       El método del 9/9 llamaba "limpia" a la foto que más se repetía. Pero
       esta basura está medida como DETERMINISTA —el 8/9, 20 tandas y los
       bloques cayendo en exactamente los mismos dos píxeles—, así que si
       aparece siempre en el mismo lugar, todas las fotos salen idénticas
       ENTRE SÍ Y SUCIAS, el método las corona referencia limpia, y devuelve
       0 sucias con la pantalla rota. Da cero justo cuando el bug está.

       Se arregla pidiendo una limpia de verdad: la primera llegada al menú,
       ANTES de haber entrado a la gira. Eso es una pantalla recién dibujada,
       que es el estado que está medido como limpio. */
    if (enMenu && !referencia && !vioOtraPantalla) {
      await dormir(1200);
      if (enPrimerPlano() === PAQUETE) {
        if (!caja) caja = await zonaDeLaPantalla(pagina);
        referencia = path.join(carpeta, "REFERENCIA-limpia.png");
        foto(referencia);
        console.log(`  ✓ referencia limpia tomada (menú recién abierto, sin haber entrado a la gira)`);
        console.log(`    zona: ${caja.width}x${caja.height} px de pantalla — la pantalla del menú entera\n`);
      }
    }

    if (enMenu && !enMenuAntes && vioOtraPantalla) {
      /* Se abre la ventana de cuadros AHORA, que es cuando puede aparecer lo
         que se limpia solo, y se deja correr mientras la pantalla se aquieta.
         La foto del framebuffer se saca al final de esa misma espera. */
      capturando = true;
      cuadros = [];
      await dormir(1600);
      capturando = false;
      const suyos = cuadros.map((c) => c.buf);
      cuadros = [];


      /* El cerrojo, en su versión que espera. */
      while (enPrimerPlano() !== PAQUETE && Date.now() < limite) {
        if (Date.now() - avisoCerrojo > 10000) {
          avisoCerrojo = Date.now();
          console.log(`   ··· esperando: el primer plano no es la app. No saco la foto.`);
        }
        await dormir(1000);
      }

      if (!caja) caja = await zonaDeLaPantalla(pagina);
      const salida = path.join(carpeta, rama);
      mkdirSync(salida, { recursive: true });
      const f = path.join(salida, `v${String(i + 1).padStart(2, "0")}.png`);

      /* ── LA COMPROBACIÓN VA PEGADA AL DISPARO, Y NO ANTES ────────────────
         La primera versión comprobaba que siguiera en el menú y DESPUÉS hacía
         el cerrojo y pedía la caja por CDP: entre medio quedaban unos décimos
         de segundo, y en la corrida del 10/9 dos fotos de dieciséis salieron
         siendo el MAPA. Una foto de otra pantalla entra a la cuenta como una
         diferencia enorme y hay que salir a explicarla después.

         Perder una vuelta es barato. Meter un dato falso, no. */
      let sigue = false;
      try {
        const ahora = await pagina.evaluate(SONDEO, { css: RAMAS_MENU[rama].css, marca: rama });
        sigue = ahora.ruta === "/jugar" && ahora.halo;
        bufer.push(...ahora.medidas);
      } catch { sigue = false; }
      if (!sigue) {
        console.log(`  ··  vuelta salteada: se fue del menú antes de la foto`);
        enMenuAntes = false;
        vioOtraPantalla = false;
        bufer = [];
        await dormir(200);
        continue;
      }

      foto(f);

      const cuadrosDir = path.join(salida, `v${String(i + 1).padStart(2, "0")}-cuadros`);
      mkdirSync(cuadrosDir, { recursive: true });
      const rutasCuadros = suyos.map((buf, n) => {
        const rc = path.join(cuadrosDir, `c${String(n).padStart(2, "0")}.png`);
        writeFileSync(rc, buf);
        return rc;
      });

      const mem = memoriaLibre();
      const cambios = bufer.filter((m) => m.que !== "visualViewport").length;
      fotos[rama].push({ f, vuelta: i + 1, mem, medidas: bufer, fila: info.fila, anchoCss: info.ancho, cuadros: rutasCuadros });
      writeFileSync(diario, JSON.stringify(fotos, null, 1));

      console.log(
        `  ${String(i + 1).padStart(2)}/${plan.length}  rama ${rama}` +
        `  ${String(cambios).padStart(2)} resize` +
        `  ${String(rutasCuadros.length).padStart(2)} cuadros` +
        `  fila ${info.fila ? `${info.fila.w}x${info.fila.h} @${info.fila.y}` : "?"}` +
        `  opacity carta ${info.opacidad} bloque ${info.opacidadBloque}` +
        `   ${(mem / 1024).toFixed(0).padStart(4)} MB`,
      );

      i++;
      bufer = [];
      vioOtraPantalla = false;
    }
    enMenuAntes = enMenu;
    await dormir(200);
  }

  await ses.send("Page.stopScreencast").catch(() => {});
  await dormir(250);
  await ses.detach().catch(() => {});
  await navegador.close();
  console.log(`\n  (el compositor entregó ${cuadrosVistos} cuadros en toda la corrida)`);

  if (!referencia) {
    console.log(`\n  ⚠ Nunca vi el menú recién abierto, así que no`);
    console.log(`    tengo referencia limpia. Se cae al método viejo (la foto que más`);
    console.log(`    se repite), que puede mentir si la basura es determinista.\n`);
  }

  if (i === 0) {
    console.log(`\n  ✗ No conté ninguna vuelta. ¿Se hizo el recorrido completo`);
    console.log(`    (menú → gira → tocar un depto → volver)?\n`);
    return;
  }
  if (i < plan.length) console.log(`\n  ⚠ Se cortó por tiempo: ${i} vueltas de ${plan.length}.\n`);

  await informeMenu(fotos, ramas, caja, createHash, referencia);
}

/** Agrupa recortes por hash y devuelve el más numeroso: la referencia limpia.

   Tiene que ser POR RAMA porque hay ramas que cambian el dibujo a propósito
   (apagar el halo, sacar el desenfoque) y ahí "lo limpio" es otra imagen. Si
   el grupo mayoritario fuera menos de la mitad, la referencia es sospechosa y
   por eso se imprime cuántas cayeron adentro. */
function referenciaLimpia(recortes, createHash) {
  const grupos = new Map();
  for (const x of recortes) {
    x.hash = createHash("sha1").update(x.r.data).digest("hex");
    grupos.set(x.hash, (grupos.get(x.hash) || 0) + 1);
  }
  const [hash, cuantas] = [...grupos.entries()].sort((a, b) => b[1] - a[1])[0];
  return { hash, cuantas, patron: recortes.find((x) => x.hash === hash).r };
}

/* Un corrimiento de la distribución cambia MILES de píxeles de golpe; la
   basura del 9/9 eran ~800, en cuadraditos de 4x4. Separarlos evita leer un
   corrimiento como si fuera basura de la GPU, que son dos bugs distintos. */
const UMBRAL_CORRIMIENTO = 6000;
const clasificar = (px) => (px === 0 ? "limpia" : px > UMBRAL_CORRIMIENTO ? "SE MOVIÓ" : "sucia");

/** La misma zona de las cartas, pero en las coordenadas de un cuadro del
    screencast, que es del viewport y puede venir a otra escala. */
async function cajaEnCuadro(ruta, fila, anchoCss) {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(ruta).metadata();
  const escala = meta.width / anchoCss;
  const M = 16;
  const left = Math.max(0, Math.round((fila.x - M) * escala));
  const top = Math.max(0, Math.round((fila.y - M) * escala));
  return {
    left, top,
    width: Math.min(meta.width - left, Math.round((fila.w + M * 2) * escala)),
    height: Math.min(meta.height - top, Math.round((fila.h + M * 2) * escala)),
    alto: meta.height, ancho: meta.width,
  };
}

/** El análisis: cada vuelta contra la referencia limpia, en los dos canales.

   ── DE DÓNDE SALE "LO LIMPIO", QUE ES TODO EL ASUNTO ──────────────────────
   Si se pasa `patronLimpio` —una foto de la pantalla que una PERSONA miró y
   dijo "ésta está bien"— se compara contra eso. Es lo único que no se puede
   equivocar, y el 10/9 quedó comprobado que vale: esa referencia contra la
   foto sucia del 9/9 dio 32 píxeles distintos en TODA la pantalla del menú,
   una sola mancha de 8x4 alineada a la grilla de 4. O sea que el dibujo es
   estable al píxel entre corridas y entre días, y todo lo que se aparta es
   basura.

   Sin ella se cae al método del 9/9 —la foto que más se repite—, que MIENTE
   cuando la basura es determinista: si cae siempre en el mismo lugar, todas
   las fotos salen idénticas entre sí y sucias, y el método las corona limpias.
   Por eso se avisa a los gritos cuando se está usando ese camino. */
async function informeMenu(fotos, ramas, caja, createHash, patronLimpio) {
  const sharp = (await import("sharp")).default;
  console.log(`\n  ── CANAL 1 · la foto del framebuffer (ve lo que QUEDA) ──`);
  const resumenes = {};
  const patronDeVerdad = patronLimpio ? await recorte(patronLimpio, caja) : null;

  for (const id of ramas) {
    if (!fotos[id].length) continue;
    const recortes = [];
    for (const x of fotos[id]) recortes.push({ ...x, r: await recorte(x.f, caja) });
    const propio = referenciaLimpia(recortes, createHash);
    const { hash, cuantas } = propio;
    const patron = patronDeVerdad ?? propio.patron;

    console.log(`\n  ${id} · ${RAMAS_MENU[id].nombre}`);
    if (patronDeVerdad) {
      /* La comprobación que delata el defecto del método viejo: si la foto que
         más se repite NO coincide con la limpia de verdad, es que lo repetido
         era la basura, y el método del 9/9 habría dado 0 sucias. */
      const d = await cuantoCambio(patronDeVerdad, propio.patron);
      console.log(`     referencia: la foto limpia que miró Santiago` +
        (d.distintos ? `  ⚠ la más repetida (${cuantas}/${recortes.length}) NO es limpia: ${d.distintos} px` : ""));
    } else {
      console.log(`     ⚠ SIN referencia limpia: se usa la más repetida (${cuantas} de ${recortes.length}), que puede mentir`);
    }

    const filas = [];
    for (const x of recortes) {
      const d = (!patronDeVerdad && x.hash === hash)
        ? { distintos: 0, total: patron.info.width * patron.info.height, media: 0, peor: 0 }
        : await cuantoCambio(patron, x.r);
      const tipo = clasificar(d.distintos);
      const resizes = (x.medidas || []).filter((m) => m.que !== "visualViewport").length;
      filas.push({ ...d, tipo, vuelta: x.vuelta, resizes, mem: x.mem });
      console.log(
        `     v${String(x.vuelta).padStart(2)}  ${tipo.padEnd(8)}` +
        `  ${String(d.distintos).padStart(6)} px  media ${d.media.toFixed(1).padStart(5)}  peor ${String(d.peor).padStart(3)}` +
        `  ${String(resizes).padStart(2)} resize   ${(x.mem / 1024).toFixed(0).padStart(4)} MB`,
      );
      /* Las sucias se renombran para que se encuentren solas al abrir la
         carpeta; las limpias se borran, que son la mayoría y todas iguales. */
      if (d.distintos) renameSync(x.f, path.join(path.dirname(x.f), `SUCIA-v${String(x.vuelta).padStart(2, "0")}-${d.distintos}px.png`));
      else rmSync(x.f, { force: true });
    }
    resumenes[id] = filas;
  }

  // ── Canal 2: los cuadros del compositor ──────────────────────────────────
  console.log(`\n  ── CANAL 2 · los cuadros del compositor (ven lo que se limpia solo) ──`);
  const porRamaCuadros = {};
  for (const id of ramas) {
    const conCuadros = (fotos[id] || []).filter((x) => (x.cuadros || []).length && x.fila && x.anchoCss);
    if (!conCuadros.length) { console.log(`\n  ${id} · sin cuadros`); continue; }

    const cajaC = await cajaEnCuadro(conCuadros[0].cuadros[0], conCuadros[0].fila, conCuadros[0].anchoCss);
    const recortes = [];
    for (const x of conCuadros) {
      for (const rc of x.cuadros) {
        const meta = await sharp(rc).metadata();
        /* Sólo los cuadros del MISMO tamaño: los de la transición vienen con
           el viewport de la otra pantalla y no se pueden comparar. */
        if (meta.width !== cajaC.ancho || meta.height !== cajaC.alto) continue;
        recortes.push({ f: rc, vuelta: x.vuelta, r: await recorte(rc, { left: cajaC.left, top: cajaC.top, width: cajaC.width, height: cajaC.height }) });
      }
    }
    if (!recortes.length) { console.log(`\n  ${id} · ningún cuadro comparable`); continue; }

    const { hash, cuantas, patron } = referenciaLimpia(recortes, createHash);
    const filas = [];
    for (const x of recortes) {
      const d = x.hash === hash
        ? { distintos: 0, media: 0, peor: 0 }
        : await cuantoCambio(patron, x.r);
      filas.push({ ...d, tipo: clasificar(d.distintos), vuelta: x.vuelta, f: x.f });
      if (!d.distintos) rmSync(x.f, { force: true });
    }
    porRamaCuadros[id] = filas;
    const sucios = filas.filter((x) => x.tipo === "sucia");
    const vueltasSucias = new Set(sucios.map((x) => x.vuelta));
    console.log(`\n  ${id} · ${RAMAS_MENU[id].nombre}`);
    console.log(`     ${recortes.length} cuadros comparables · referencia limpia ${cuantas}`);
    console.log(`     ${sucios.length} cuadros sucios, en ${vueltasSucias.size} vueltas distintas` +
      (sucios.length ? ` · max ${Math.max(...sucios.map((x) => x.distintos))} px` : ""));
    for (const x of sucios) console.log(`       v${String(x.vuelta).padStart(2)}  ${String(x.distintos).padStart(6)} px  peor ${x.peor}  ${path.basename(x.f)}`);
  }

  // ── Resumen y la pregunta del día ────────────────────────────────────────
  console.log(`\n  ── RESUMEN · zona de las cartas ──`);
  for (const id of ramas) {
    const f = resumenes[id];
    if (!f) continue;
    const sucias = f.filter((x) => x.tipo === "sucia");
    const movidas = f.filter((x) => x.tipo === "SE MOVIÓ").length;
    const c = porRamaCuadros[id];
    console.log(
      `     ${id}  ${RAMAS_MENU[id].nombre.padEnd(40)}` +
      ` foto ${String(sucias.length).padStart(2)}/${f.length}` +
      ` · media ${(sucias.reduce((a, x) => a + x.distintos, 0) / (f.length || 1)).toFixed(1).padStart(7)} px` +
      ` · max ${String(Math.max(0, ...sucias.map((x) => x.distintos))).padStart(5)}` +
      (c ? `  ·  cuadros ${c.filter((x) => x.tipo === "sucia").length}/${c.length}` : "") +
      (movidas ? `  ⚠ ${movidas} se movieron` : ""),
    );
  }

  /* La correlación que motivó la instrumentación nueva. No sirve preguntar
     "¿hubo cambio de tamaño?", porque hay en TODAS las vueltas: el body pasa
     de 800 a 766 y vuelve en cada ida y vuelta. Lo que puede decir algo es
     CUÁNTOS, que es cuánta agitación hubo. */
  const todas = ramas.flatMap((id) => resumenes[id] || []);
  const media = (a, campo) => (a.length ? (a.reduce((s, x) => s + x[campo], 0) / a.length).toFixed(1) : "—");
  const suc = todas.filter((x) => x.tipo === "sucia");
  const lim = todas.filter((x) => x.tipo === "limpia");
  console.log(`\n  ── ¿tiene que ver con la agitación de la distribución? ──`);
  console.log(`     vueltas SUCIAS  (${String(suc.length).padStart(2)})  media ${media(suc, "resizes").padStart(5)} resize · ${(media(suc, "mem") / 1024 || 0).toFixed(0)} MB libres`);
  console.log(`     vueltas LIMPIAS (${String(lim.length).padStart(2)})  media ${media(lim, "resizes").padStart(5)} resize · ${(media(lim, "mem") / 1024 || 0).toFixed(0)} MB libres`);
  console.log();
}

async function verCapas(cdp, ruta) {
  const { chromium } = await import("playwright");
  const navegador = await chromium.connectOverCDP(cdp);
  const pagina = navegador.contexts()[0].pages()[0];
  if (ruta) { await pagina.goto(`https://localhost${ruta}`, { waitUntil: "load" }); await sinPantallaCarga(pagina); await dormir(1200); }

  const sesion = await pagina.context().newCDPSession(pagina);
  await sesion.send("DOM.enable");
  await sesion.send("LayerTree.enable");

  const capas = await new Promise((res) => {
    sesion.on("LayerTree.layerTreeDidChange", (e) => res(e.layers || []));
    setTimeout(() => res([]), 4000);
  });

  console.log(`\n── capas en el celular de verdad ${ruta ?? ""} ──`);
  console.log(`   ${capas.length} capas\n`);
  for (const c of capas) {
    let motivos = [];
    try { motivos = (await sesion.send("LayerTree.compositingReasons", { layerId: c.layerId })).compositingReasonIds || []; } catch { /* capa que ya se fue */ }
    const mpx = ((c.width * c.height) / 1e6).toFixed(2);
    console.log(`   ${String(c.width).padStart(5)}×${String(c.height).padEnd(5)} ${mpx.padStart(6)} Mpx  ${motivos.join(", ") || "—"}`);
  }
  console.log();
  await navegador.close();
}


/* ── GRABAR MIENTRAS JUEGA UNA PERSONA ────────────────────────────────────
   No toca la pantalla: sólo mira. Es la salida para el fallo de UN cuadro, que
   es el único que el capturador no alcanza (ver el encabezado): si alguien lo
   ve y esto no anota nada, eso también es un dato.

   El análisis va en una cola aparte de la recepción: contar bloques tarda
   ~200 ms y hacerlo adentro del manejador perdería cuadros mientras cuenta. */
async function mirarMientrasJuegan(cdp) {
  const { chromium } = await import("playwright");
  const navegador = await chromium.connectOverCDP(cdp);
  const pagina = navegador.contexts()[0].pages().at(-1);
  const ses = await pagina.context().newCDPSession(pagina);
  mkdirSync(carpeta, { recursive: true });

  const arranque = Date.now();
  const cola = [];
  let recibidos = 0, sucios = 0, analizados = 0;

  ses.on("Page.screencastFrame", (e) => {
    recibidos++;
    const f = path.join(carpeta, `tmp-${String(recibidos).padStart(5, "0")}.png`);
    writeFileSync(f, Buffer.from(e.data, "base64"));
    cola.push({ f, ms: Date.now() - arranque, n: recibidos });
    ses.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
  });
  await ses.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });

  console.log(`\n── GRABANDO. Jugá tranquilo: esto no toca la pantalla.`);
  console.log(`   Los cuadros sucios quedan en ${carpeta}`);
  console.log(`   Cortá con Ctrl-C cuando termines.\n`);

  let ultimoAviso = 0;
  for (;;) {
    const item = cola.shift();
    if (!item) {
      await dormir(120);
      if (Date.now() - ultimoAviso > 15000) {
        ultimoAviso = Date.now();
        const quien = enPrimerPlano();
        console.log(`   ··· ${((Date.now() - arranque) / 1000).toFixed(0)}s · ${recibidos} cuadros · ${sucios} sucios` +
          (quien !== PAQUETE ? `   ⚠ primer plano: ${quien}` : ""));
      }
      continue;
    }
    const b = await bloquesDe(item.f, BANDA_MESA);
    const c = await cromaticasDe(item.f, BANDA_MESA);
    analizados++;
    if (b.bloques > 0) {
      sucios++;
      const destino = path.join(carpeta, `SUCIO-${String(Math.round(item.ms / 1000)).padStart(4, "0")}s-${b.bloques}bloques.png`);
      renameSync(item.f, destino);
      console.log(`   ★ ${(item.ms / 1000).toFixed(1)}s   ${String(b.bloques).padStart(3)} BLOQUES   ${String(c.cromaticas).padStart(3)} cromáticas   →  ${path.basename(destino)}`);
    } else {
      rmSync(item.f, { force: true });
    }
  }
}

// ── Andar ───────────────────────────────────────────────────────────────────

const texto = (bandera, porOmision) => {
  const i = args.indexOf(bandera);
  return i === -1 || !args[i + 1] || args[i + 1].startsWith("--") ? porOmision : args[i + 1];
};

const conMapa = args.includes("--mapa");
const conMesa = args.includes("--mesa");
const conCapas = args.includes("--capas");
const conMirar = args.includes("--mirar");
const conMenu = args.includes("--menu");

if (!conMapa && !conMesa && !conCapas && !conMirar && !conMenu) {
  console.log(`
  node herramientas/rig-celular.mjs --menu --a-mano  toca Santiago, mide el rig  ← el que sirve
  node herramientas/rig-celular.mjs --menu [N]      N bloques de idas y vueltas al menú (por omisión 4)
  node herramientas/rig-celular.mjs --mapa [N]      N toques a departamentos (por omisión 40)
  node herramientas/rig-celular.mjs --mesa [N]      N tandas jugando y cantando (por omisión 12)
  node herramientas/rig-celular.mjs --mirar         graba mientras jugás vos, sin tocar nada
  node herramientas/rig-celular.mjs --capas [ruta]  el árbol de capas en el celular

  Para --menu --a-mano (el rig NO toca la pantalla: toca una persona):
    --ramas A,H      qué ramas se alternan POR DEBAJO mientras se juega
    --vueltas N      idas y vueltas por rama (16)
    --bloque N       cada cuántas vueltas se cambia de rama (4)
    --minutos N      hasta cuánto espera (25)
    --referencia F   una foto del menú que una persona miró y dio por limpia.
                     Es lo que hace confiable toda la medición: sin ella se
                     usa "la foto que más se repite", que da 0 sucias cuando
                     la basura es determinista y cae siempre en el mismo lugar.

  El 9/9 el rig tocó solo 16 veces y volvió UNA sucia: "input tap" no tiene
  el ritmo de una persona. Por eso existe --a-mano.

  Para --menu automático:
    --ramas A,E      qué ramas se alternan (A control · B halo apagado ·
                     C halo sin desenfoque · D sin rotar · E opacity en los
                     hijos de la pantalla · F en las cuatro cartas ·
                     H sólo en las de la gira · M sin el arreglo del mapa)
    --vueltas N      idas y vueltas a la gira por bloque (4)

  Lo del menú es INTERMITENTE: hay que contar cuántos regresos de N vuelven
  sucios. Con 4 bloques de 4 vueltas por rama son 16 regresos por rama, que es
  el mínimo con el que se distinguió algo.

  Para --mesa:
    --pasos N        acciones por tanda (16)
    --depto NOMBRE   contra quién ("Cerro Largo", que es El Turco y versea)
    --sin-arreglo    apaga el opacity: .999 — es la rama de control

  El A/B se corre alternando las dos ramas, no una entera y después la otra:
  la memoria del teléfono deriva a lo largo de la corrida y así le pega igual
  a las dos.
`);
  process.exit(1);
}

exigirLaApp("arrancar");
const cdp = await abrirDevtools();
try {
  if (conCapas) {
    const i = args.indexOf("--capas");
    await verCapas(cdp, args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null);
  }
  if (conMenu) {
    const ramas = texto("--ramas", "A,B").split(",").map((r) => r.trim().toUpperCase()).filter(Boolean);
    const desconocida = ramas.find((r) => !RAMAS_MENU[r]);
    if (desconocida) morir(`No conozco la rama "${desconocida}". Las que hay: ${Object.keys(RAMAS_MENU).join(" ")}`);
    if (args.includes("--a-mano")) {
      const ref = texto("--referencia", null);
      if (ref && !existsSync(ref)) morir(`No encuentro la referencia limpia "${ref}".`);
      await recorridoMenuAMano(cdp, ramas, numero("--vueltas", 16), numero("--bloque", 4), numero("--minutos", 25), ref);
    } else {
      await recorridoMenu(numero("--menu", 4), cdp, ramas, numero("--vueltas", 4));
    }
  }
  if (conMapa) await recorridoMapa(numero("--mapa", 40), cdp);
  if (conMesa) {
    await recorridoMesa(numero("--mesa", 12), cdp, {
      pasos: numero("--pasos", 16),
      depto: texto("--depto", "Cerro Largo"),
      sinArreglo: args.includes("--sin-arreglo"),
    });
  }
  if (conMirar) await mirarMientrasJuegan(cdp);
} finally {
  cerrarDevtools();
}
