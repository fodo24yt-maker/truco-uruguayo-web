/**
 * La ficha de Play Store: las seis slides, el gráfico destacado y los logos.
 *
 *     npm run build:app && npm run servir:app     (en otra terminal)
 *     node herramientas/branding.mjs              saca las capturas y arma todo
 *     node herramientas/branding.mjs --sin-capturas   arma con las capturas que ya hay
 *     node herramientas/generar-icono.mjs --tienda    el ícono de 512 (el logo vive allá)
 *
 * Deja todo en `app branding/`, que NO sube a GitHub:
 *
 *   capturas/limpias/        las pantallas de la app tal cual, y las caras
 *   capturas/celular/        las seis slides, 1080 x 1920
 *   ficha-play/              el gráfico destacado (y el ícono, de generar-icono)
 *   logo/                    el escudo y los logos, en SVG y PNG
 *
 * El diseño y los textos están en `herramientas/marca/ficha.mjs`; el dibujo del
 * escudo, en `lib/escudo.ts` (el mismo de la portada). Esto sólo saca las
 * fotos, arma y comprueba.
 *
 * ── Por qué contra la app COMPILADA y no contra `next dev` ────────────────
 *
 * Porque la ficha es de la app de Android, y la app es el build de
 * `out-app/`: con la pantalla de carga, los candados y la CSP de producción.
 * Hasta el 18/10/2026 esto se sacaba contra `next dev`.
 *
 * ── Por qué 360 x 640 a DPR 3 ─────────────────────────────────────────────
 *
 * Play rechaza una captura cuyo lado mayor pase del DOBLE del menor. 390x844 a
 * DPR 3 da 1170x2532, o sea 2,16 veces: rebotada. 360x640 a DPR 3 da 1080x1920.
 * `isMobile` y `hasTouch` porque sin eso se activan las reglas `@media (hover:
 * hover)` del mapa de la Gira y la captura no muestra lo de un teléfono.
 *
 * ── Dos trucos que NO cambian la app ──────────────────────────────────────
 *
 *   - `Math.random` con semilla, en la pestaña que saca la foto: el reparto
 *     sale siempre igual, y una mano con flor se puede volver a sacar.
 *   - El `localStorage` cargado antes de abrir: la Gira y el anotador
 *     desbloqueados y seis rivales ganados. Es lo mismo que consigue quien
 *     mira el video o gana esas partidas.
 *
 * ── Las capturas se COMPRUEBAN ────────────────────────────────────────────
 *
 * Las slides dicen cosas concretas: "Tenés flor: 36", "31 a 1", "Bien ahí". Si
 * mañana cambia el reparto o el motor, la misma semilla puede dar otra mano, y
 * la slide quedaría mintiendo. Por eso, antes de usar una captura, se busca en
 * la pantalla el texto que la slide promete; si no está, esto para y lo dice.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import sharp from "sharp";

import { C, historia, slide, destacado, logo, escudoSuelto, fuenteEmbebida, pagina, CARAS_NECESARIAS } from "./marca/ficha.mjs";

const RAIZ = process.env.SITIO ?? "http://127.0.0.1:4173";

/* La salida se ancla AL ARCHIVO y no al directorio desde el que se corre: con
   una ruta relativa, correr esto parado en `herramientas/` escribiría FUERA de
   lo que protege `/app branding/` en el `.gitignore`. */
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const MARCA = path.join(AQUI, "..", "app branding");
const LIMPIAS = path.join(MARCA, "capturas", "limpias");
const SLIDES = path.join(MARCA, "capturas", "celular");
const FICHA = path.join(MARCA, "ficha-play");
const LOGO = path.join(MARCA, "logo");
const CACHE_FUENTES = path.join(MARCA, ".fuentes");

/* Los argumentos: se valida contra una lista cerrada, y uno desconocido para. */
const BANDERAS = new Set(["--sin-capturas"]);
const desconocidos = process.argv.slice(2).filter((a) => !BANDERAS.has(a));
if (desconocidos.length) {
  console.error(`No conozco ${desconocidos.join(", ")}. Hay: ${[...BANDERAS].join(", ")}`);
  process.exit(1);
}
const sinCapturas = process.argv.includes("--sin-capturas");

/* ── Las capturas ───────────────────────────────────────────────────────── */

const GANADOS = ["luki", "la-coca", "el-rulo", "tito", "la-nelly", "marito"];

/** Corre en la página antes que la app. Sólo recibe constantes de este archivo. */
function preparar({ semilla, conProgreso }) {
  let a = semilla >>> 0;
  Math.random = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    localStorage.setItem("truco-uy:desbloqueos", JSON.stringify({ version: 1, anotador: true, gira: true }));
    if (conProgreso) {
      const rivales = {};
      conProgreso.forEach((id, i) => {
        rivales[id] = { ganadas: 1 + (i % 2), jugadas: 2 + (i % 3), mejor: { vos: 30, rival: 12 + i * 2 } };
      });
      localStorage.setItem("truco-uy:progreso", JSON.stringify({ version: 1, rivales, leccionesLeidas: [], ayudas: true, ultimoRival: conProgreso.at(-1) }));
    }
  } catch {}
}

/** Juega una partida entera contra Luquita hasta ganarla. Ver la escena "victoria". */
async function ganarPartida(p) {
  p.setDefaultTimeout(3000);
  const boton = (n) => p.getByRole("button", { name: n, exact: true });
  const hay = async (n) => (await boton(n).count()) > 0 && (await boton(n).first().isVisible().catch(() => false)) && (await boton(n).first().isEnabled().catch(() => false));
  const tanto = (t) => +((t.match(/TU TANTO:\s*(\d+)/i) || t.match(/TENÉS FLOR:\s*(\d+)/i) || [0, 0])[1]);
  let truco = false;
  let envido = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 15 * 60 * 1000) {
    const txt = await p.evaluate(() => document.body.innerText);
    if (txt.includes("¡Ganaste la partida!")) { await p.waitForTimeout(1200); return; }
    if (txt.includes("Perdiste la partida")) throw new Error("La partida automática contra Luquita se perdió: probar otra semilla en ESCENAS.");
    if (await hay("Siguiente mano")) { await boton("Siguiente mano").click().catch(() => {}); truco = envido = false; await p.waitForTimeout(1100); continue; }
    if (await hay("¡Flor!")) { await boton("¡Flor!").first().click().catch(() => {}); await p.waitForTimeout(900); continue; }
    if (await hay("Quiero")) {
      const u = txt.toUpperCase();
      const esEnvido = /ENVIDO!|FALTA/.test(u.slice(0, 1200)) && !/TRUCO!|RETRUCO!|VALE CUATRO!/.test(u.slice(0, 400));
      const acepto = esEnvido ? tanto(txt) >= 27 : truco && !/RETRUCO|VALE CUATRO/.test(u.slice(0, 600));
      await boton(acepto ? "Quiero" : "No quiero").first().click().catch(() => {});
      await p.waitForTimeout(900);
      continue;
    }
    if (!envido && tanto(txt) >= 27 && (await hay("Envido"))) {
      await boton("Envido").last().click().catch(() => {});
      await p.waitForTimeout(400);
      if (await hay("Envido")) await boton("Envido").first().click().catch(() => {});
      envido = true;
      await p.waitForTimeout(1000);
      continue;
    }
    if (!truco && (await hay("Truco"))) { await boton("Truco").click().catch(() => {}); truco = true; await p.waitForTimeout(1000); continue; }
    const cartas = p.locator('[aria-label^="Tirar el"]');
    if ((await cartas.count()) > 0) { await cartas.last().click().catch(() => {}); await p.waitForTimeout(1100); continue; }
    await p.waitForTimeout(400);
  }
  throw new Error("La partida automática no terminó en 15 minutos.");
}

/**
 * Las pantallas. `debe` es el texto que la slide promete y que tiene que estar
 * en la captura.
 */
const ESCENAS = [
  { nombre: "aprender", ruta: "/aprender/", espera: 800, debe: "Ocho lecciones cortas" },
  { nombre: "ejercicio-resuelto", ruta: "/aprender/jerarquia/", espera: 800, debe: "Bien ahí",
    pasos: async (p) => {
      const sec = p.locator("section", { hasText: "Probá vos" }).first();
      await sec.evaluate((el) => el.scrollIntoView({ block: "start" }));
      await p.evaluate(() => window.scrollBy(0, -36));
      await sec.getByRole("button", { name: "El 1 de basto" }).click();
      await p.waitForTimeout(700);
    } },
  { nombre: "jugar", ruta: "/jugar/", espera: 900, debe: "Partida rápida" },
  { nombre: "gira-historia", ruta: "/jugar/gira/", espera: 1500, progreso: GANADOS, debe: "El Pescador",
    pasos: async (p) => {
      await p.click('[aria-label^="Paso 7:"]');
      await p.waitForTimeout(800);
      await p.click("[data-ver-historia]");
      await p.waitForTimeout(700);
    } },
  { nombre: "mesa-cerro-largo", ruta: "/jugar/mesa/?depto=cerro-largo", semilla: 13, espera: 5000, debe: "El Turco" },
  { nombre: "mesa-salto", ruta: "/jugar/mesa/?depto=salto", semilla: 19, espera: 5000, debe: "TENÉS FLOR: 36" },
  { nombre: "victoria", ruta: "/jugar/mesa/?depto=montevideo", semilla: 55, espera: 4000, debe: "31 — 1",
    pasos: ganarPartida },
];

async function capturar(nav) {
  await mkdir(path.join(LIMPIAS, "caras"), { recursive: true });
  const contexto = async ({ semilla = 1, progreso = null } = {}) => {
    const ctx = await nav.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    await ctx.addInitScript(preparar, { semilla, conProgreso: progreso });
    return ctx;
  };
  const sinCarga = async (p) => {
    try { await p.waitForSelector("[data-pantalla-carga]", { state: "detached", timeout: 8000 }); } catch {}
  };

  for (const e of ESCENAS) {
    const ctx = await contexto({ semilla: e.semilla ?? 1, progreso: e.progreso ?? null });
    const p = await ctx.newPage();
    await p.goto(RAIZ + e.ruta);
    await sinCarga(p);
    await p.waitForTimeout(e.espera);
    if (e.pasos) await e.pasos(p);
    const texto = await p.evaluate(() => document.body.innerText);
    if (!texto.toUpperCase().includes(e.debe.toUpperCase())) {
      throw new Error(`La captura "${e.nombre}" no muestra "${e.debe}", y la slide lo promete. ¿Cambió el juego? Revisar la semilla o el texto.`);
    }
    await p.screenshot({ path: path.join(LIMPIAS, `${e.nombre}.png`) });
    console.log(`  ${e.nombre}`.padEnd(24) + `ok (muestra "${e.debe}")`);
    await ctx.close();
  }

  /* Las caras, como vector: el `<svg>` que dibuja `components/mesa/Cara.tsx`
     en el medallón, copiado tal cual. Se agranda sin perder nitidez. */
  const ctx = await contexto();
  const p = await ctx.newPage();
  for (const d of CARAS_NECESARIAS) {
    await p.goto(`${RAIZ}/jugar/mesa/?depto=${d}`);
    await sinCarga(p);
    await p.waitForTimeout(1500);
    const svg = await p.locator("span.overflow-hidden.rounded-full svg").first().evaluate((s) => {
      const c = s.cloneNode(true);
      c.removeAttribute("class");
      c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      return c.outerHTML;
    });
    /* La cara se mete después adentro de las slides. Viene de nuestro build,
       pero si `SITIO` apuntara a otro lado podría traer un script: se rechaza
       cualquier cosa que no sea dibujo. */
    if (!svg.startsWith("<svg") || /<script|<foreignObject|\son[a-z]+\s*=|javascript:|href\s*=\s*["']?(?!#)/i.test(svg)) {
      throw new Error(`La cara de ${d} trae algo que no es dibujo (script, evento o enlace). No se usa.`);
    }
    await writeFile(path.join(LIMPIAS, "caras", `${d}.svg`), svg);
  }
  console.log(`  caras`.padEnd(24) + `ok (${CARAS_NECESARIAS.length})`);
  await ctx.close();
}

/* ── El armado ──────────────────────────────────────────────────────────── */

const pag = { actual: null };

/** Saca la foto de un HTML a la medida exacta, sin metadatos y, salvo que se pida, sin alfa. */
async function foto(html, { ancho, alto, salida, alfa = false }) {
  const p = pag.actual;
  await p.setViewportSize({ width: ancho, height: alto });
  await p.setContent(html, { waitUntil: "load", timeout: 90000 });
  await p.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => (im.onload = im.onerror = r)))));
  });
  const rotas = await p.evaluate(() => [...document.fonts].filter((f) => f.status === "error").map((f) => f.family));
  if (rotas.length) throw new Error(`No cargaron las tipografías ${[...new Set(rotas)].join(", ")} en ${path.basename(salida)}. ¿Hay internet?`);
  await p.waitForTimeout(120);
  const buf = await p.screenshot({ omitBackground: alfa, clip: { x: 0, y: 0, width: ancho, height: alto } });
  /* Play rechaza el alfa en las capturas y en el destacado. sharp, además, no
     copia metadatos: el PNG sale sin un solo `tEXt`. */
  const img = sharp(buf);
  await (alfa ? img.png({ compressionLevel: 9 }) : img.flatten({ background: "#000" }).removeAlpha().png({ compressionLevel: 9 })).toFile(salida);
}

const uri = async (ruta) => `data:image/png;base64,${(await readFile(ruta)).toString("base64")}`;

async function armar() {
  const cap = {};
  for (const e of ESCENAS) cap[e.nombre] = await uri(path.join(LIMPIAS, `${e.nombre}.png`));
  const caras = {};
  for (const d of CARAS_NECESARIAS) caras[d] = await readFile(path.join(LIMPIAS, "caras", `${d}.svg`), "utf8");

  await mkdir(SLIDES, { recursive: true });
  const h = historia(cap);
  for (const [i, s] of h.entries()) {
    const archivo = `${String(i + 1).padStart(2, "0")}-${s.nombre}.png`;
    await foto(slide(s, i + 1, caras), { ancho: 1080, alto: 1920, salida: path.join(SLIDES, archivo) });
    console.log(`  capturas/celular/${archivo}`);
  }

  await mkdir(FICHA, { recursive: true });
  await foto(destacado(caras), { ancho: 1024, alto: 500, salida: path.join(FICHA, "grafico-destacado-1024x500.png") });
  console.log("  ficha-play/grafico-destacado-1024x500.png");

  /* Los logos: el SVG lleva las tipografías adentro, así se ve igual en
     cualquier compu. El PNG, de 2000 px de ancho y con fondo transparente. */
  await mkdir(LOGO, { recursive: true });
  const estilo = `<style>${await fuenteEmbebida("Big Shoulders Display", 900, CACHE_FUENTES)}${await fuenteEmbebida("Big Shoulders Display", 800, CACHE_FUENTES)}</style>`;
  const logos = [
    ["escudo", escudoSuelto(), 440, 510],
    ["logo", logo({ estilo }), 1000, 720],
    ["logo-horizontal", logo({ horizontal: true, estilo }), 1500, 560],
    ["logo-horizontal-sobre-oscuro", logo({ horizontal: true, estilo, tinta: C.blanco, segunda: C.celeste }), 1500, 560],
  ];
  for (const [nombre, svg, w, hh] of logos) {
    await writeFile(path.join(LOGO, `${nombre}.svg`), svg);
    const ancho = 2000;
    const alto = Math.round((ancho * hh) / w);
    await foto(pagina({ ancho, alto, fondo: "transparent", cuerpo: svg.replace("<svg ", `<svg width="${ancho}" height="${alto}" `) }), { ancho, alto, salida: path.join(LOGO, `${nombre}.png`), alfa: true });
    console.log(`  logo/${nombre}.svg + .png`);
  }
}

/* ── La comprobación de Play ────────────────────────────────────────────── */

async function comprobar() {
  const revisar = async (archivo, ancho, alto, { alfa = false, proporcion = true } = {}) => {
    const m = await sharp(archivo).metadata();
    const problemas = [];
    if (m.width !== ancho || m.height !== alto) problemas.push(`mide ${m.width}x${m.height}`);
    if (!alfa && m.hasAlpha) problemas.push("tiene canal alfa");
    if (proporcion && Math.max(m.width, m.height) > 2 * Math.min(m.width, m.height)) problemas.push("el lado mayor pasa del doble del menor");
    return problemas.length ? [`${path.relative(MARCA, archivo)}: ${problemas.join(", ")}`] : [];
  };
  const mal = [];
  const { readdir } = await import("node:fs/promises");
  for (const f of (await readdir(SLIDES)).filter((x) => x.endsWith(".png"))) mal.push(...(await revisar(path.join(SLIDES, f), 1080, 1920)));
  mal.push(...(await revisar(path.join(FICHA, "grafico-destacado-1024x500.png"), 1024, 500, { proporcion: false })));
  try {
    mal.push(...(await revisar(path.join(FICHA, "icono-512.png"), 512, 512, { alfa: true })));
  } catch {
    console.log("\n  Falta el ícono: node herramientas/generar-icono.mjs --tienda");
  }
  if (mal.length) {
    console.error("\nFUERA DE LO QUE PIDE PLAY:\n  " + mal.join("\n  "));
    process.exitCode = 1;
  } else {
    console.log("\nTodo dentro de lo que pide Play (medidas, proporción y alfa).");
  }
}

/* ── A trabajar ─────────────────────────────────────────────────────────── */

const nav = await chromium.launch();
try {
  if (!sinCapturas) {
    console.log(`Capturas contra ${RAIZ}`);
    await capturar(nav);
  }
  console.log("\nArmando");
  pag.actual = await nav.newPage();
  await armar();
  await comprobar();
} finally {
  await nav.close();
}
console.log("\nNada de esto sube a GitHub: 'app branding/' está en el .gitignore.");
