/**
 * Las fotos del tutorial de la mesa: `public/tutorial/*.webp` y
 * `lib/tutorial-fotos.ts`.
 *
 *     node herramientas/generar-tutorial.mjs              saca las fotos y escribe las zonas
 *     node herramientas/generar-tutorial.mjs --comprobar  vuelve a jugar igual y compara las zonas (no escribe)
 *     node herramientas/generar-tutorial.mjs --base URL   otra dirección (por omisión, `npm run servir:app`)
 *
 * Necesita el build de la app servido: `npm run build:app && npm run servir:app`.
 *
 * ── Por qué una foto y no la mesa dibujada otra vez (29/10/2026) ─────────
 *
 * Lo eligió Santiago. El tutorial tiene que mostrar LA mesa, no una parecida,
 * y la mesa es una función enorme con estado que no se puede poner "quieta"
 * en un estado elegido sin tocarla. Rearmarla a mano con las mismas piezas
 * era duplicar medio `app/jugar/mesa/page.tsx` (y que se fuera despegando),
 * con decenas de cartas con sombra, que es justo lo que le cuesta a la GPU
 * del teléfono (`Historial.md`, 8/10 y 28/10).
 *
 * Así que se hace lo mismo que con las texturas (`generar-escena.mjs`): lo
 * dibuja nuestro código, UNA vez, y la app recibe una imagen. Esta
 * herramienta juega una partida de verdad en el build de la app hasta llegar
 * a dos momentos, y en cada uno saca la foto y mide dónde quedó cada cosa:
 *
 *   A  "juego normal": empieza una mano, te toca, con puntos en el marcador.
 *   B  "te cantaron truco": el globo del rival, las respuestas abajo, y lo
 *      que se dijo antes en la mano, más tenue.
 *
 * NO toca una línea de la mesa: la mira desde afuera, con los anclajes que
 * ya tiene (`data-mano`, `data-mesa`, `data-encima`, `data-canto`…).
 *
 * ── Siempre la misma partida ─────────────────────────────────────────────
 *
 * `Math.random` va con semilla (el mismo generador que `mirar-aprender.mjs`),
 * y el jugador de acá sigue una regla fija. La partida sale igual en cada
 * corrida, y eso es lo que usa `--comprobar`: vuelve a jugarla con la semilla
 * anotada en `lib/tutorial-fotos.ts`, y si la mesa se movió (las zonas no
 * caen donde estaban) FALLA, porque las fotos del tutorial ya son de una mesa
 * vieja. Si una semilla no llega a B en `MANOS_TOPE` manos, prueba la que
 * sigue.
 *
 * Cuando cambie la mesa: se vuelve a correr esto, como con las texturas. Las
 * fotos y `lib/tutorial-fotos.ts` no se editan a mano.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import sharp from "sharp";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");
const SALIDA = path.join(RAIZ, "public", "tutorial");
const ZONAS_TS = path.join(RAIZ, "lib", "tutorial-fotos.ts");

const args = process.argv.slice(2);
const BASE = (args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:4173").replace(/\/$/, "");
const COMPROBAR = args.includes("--comprobar");
/* Cada cambio de estado de la mesa, para ver por qué una semilla no llega. */
const DEPURAR = args.includes("--depurar");

/* Los dos tamaños. El celular es el Redmi (360 de ancho a DPR 2) con un alto
   del medio entre los teléfonos comunes; la PC, la pantalla más común. La de
   PC va a DPR 1,5: a 2 la foto pesaba el doble y en una pantalla de compu no
   se nota. */
export const TAMANOS = {
  celular: { width: 360, height: 780, dpr: 2 },
  pc: { width: 1366, height: 768, dpr: 1.5 },
};

const MANOS_TOPE = 14;
const SEMILLAS_TOPE = 30;
/* Cuánto se puede haber corrido una zona (px CSS) para que `--comprobar` la
   dé por igual. Las cartas y los globos se acomodan con animaciones; dos
   corridas de la misma partida no caen al píxel exacto. */
const TOLERANCIA = 6;

/* El azar con semilla, en cada documento (es el de `mirar-aprender.mjs`). */
const conSemilla = (semilla) => `(() => {
  let s = ${semilla} | 0;
  Math.random = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { localStorage.setItem("truco-uy:tutorial-mesa", JSON.stringify({ version: 1, visto: true })); } catch {}
})()`;

/* ── Lo que se mira en la página ─────────────────────────────────────────── */

/** El estado de la mesa, leído de sus anclajes. Corre en la página. */
const LEER = () => {
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
  const tabla = document.querySelector('[data-mesa="tabla"]');
  const cartas = [...document.querySelectorAll(".mano-abanico button")];
  const puntos = (quien) => {
    const e = document.querySelector(`[aria-label^="${quien}:"]`);
    const m = e?.getAttribute("aria-label")?.match(/(\d+)/);
    return m ? +m[1] : 0;
  };
  /* El primer `role=status` de la columna son los tantos (`data-tantos`); el
     diálogo es el otro. */
  const dialogo = document.querySelector('[data-encima="medallon"] [role="status"]:not([data-tantos])');
  const lineas = dialogo ? [...dialogo.querySelectorAll("p")] : [];
  const botones = [...document.querySelectorAll("button")].filter(vis);
  return {
    fase: tabla?.getAttribute("data-fase") ?? "",
    pendiente: tabla?.getAttribute("data-pendiente") ?? "",
    repartiendo: !!document.querySelector('[data-mesa="reparto"]'),
    enMano: cartas.length,
    puedoTirar: cartas.some((b) => !b.disabled),
    bazas: document.querySelectorAll('[data-mesa="baza"]').length,
    enseñadas: document.querySelectorAll('[data-mesa="baza-enseñada"]').length,
    yo: puntos("Yo"),
    el: puntos("Él"),
    previas: lineas.filter((p) => !p.className.includes("anim-pop")).length,
    globo: lineas.find((p) => p.className.includes("anim-pop"))?.textContent?.trim() ?? "",
    quiero: vis(document.querySelector('[data-canto="quiero"]')),
    envido: vis(document.querySelector('[data-canto="abrir-envido"]')),
    flor: vis(document.querySelector('[data-canto="flor"]')),
    cartel: botones.find((b) => /^(Siguiente mano|Otra contra)/.test(b.textContent?.trim() ?? ""))?.textContent?.trim() ?? "",
  };
};

/**
 * Dónde quedó cada cosa, en px CSS de la pantalla. Corre en la página.
 * Los nombres son los que usan los pasos (`lib/tutorial-pasos.ts`).
 */
const MEDIR = () => {
  /* Acepta elementos o rectángulos ya medidos. */
  const caja = (...es) => {
    const rs = es.flat().filter(Boolean).map((e) => (e instanceof Element ? e.getBoundingClientRect() : e)).filter((r) => r.width > 0 && r.height > 0);
    if (!rs.length) return null;
    const x = Math.min(...rs.map((r) => r.left)), y = Math.min(...rs.map((r) => r.top));
    const x2 = Math.max(...rs.map((r) => r.right)), y2 = Math.max(...rs.map((r) => r.bottom));
    return { x: Math.round(x), y: Math.round(y), w: Math.round(x2 - x), h: Math.round(y2 - y) };
  };
  /* Lo que ocupa el TEXTO de un elemento, no su caja: los renglones son
     bloques del ancho de la columna, y el aro tiene que rodear lo escrito. */
  const texto = (e) => {
    if (!e) return null;
    const r = document.createRange();
    r.selectNodeContents(e);
    return r.getBoundingClientRect();
  };
  const q = (s) => document.querySelector(s);
  const qq = (s) => [...document.querySelectorAll(s)];
  const barraAbajo = qq("div.filo-dorado.shrink-0").at(-1);
  const columna = q('[data-encima="medallon"]');
  const dialogo = columna?.querySelector('[role="status"]:not([data-tantos])');
  const lineas = dialogo ? [...dialogo.querySelectorAll("p")] : [];
  const mano = q('[data-mano="tuya"]');
  /* El "Tu tanto" va arriba del abanico, adentro de la mano: el elemento más
     de adentro que lo dice. */
  const dice = (e) => /^(Tu tanto|Tenés flor)/i.test(e.textContent?.trim() ?? "");
  const pista = mano ? [...mano.querySelectorAll("*")].filter(dice).find((e) => ![...e.children].some(dice)) : null;
  const subidas = qq("[data-canto]").filter((b) => !barraAbajo?.contains(b) && b.getClientRects().length);
  /* La barra ocupa todo el ancho, pero los botones van en una fila de 760 px
     como mucho, centrada: en la PC el aro marca la fila, no la pantalla. */
  const filaAbajo = barraAbajo?.firstElementChild;
  return {
    /* Las cartas van giradas en abanico y se salen de `.mano-abanico`: se
       mide cada una (su caja ya incluye el giro). */
    mano: caja(qq(".mano-abanico button"), texto(pista)),
    muestra: caja(q('[data-mesa="mazo"]'), q('[data-mesa="muestra-cartel"]')),
    cantos: caja(filaAbajo),
    rival: caja(q('[role="img"][aria-label*="tu rival"]'), q('[aria-label*="Tocá para cambiar de rival"]')),
    medallon: caja(q('[aria-label*="Tocá para cambiar de rival"]')),
    globo: caja(lineas.filter((p) => p.className.includes("anim-pop"))),
    responder: caja(filaAbajo, subidas),
    historial: caja(lineas.filter((p) => !p.className.includes("anim-pop")).map(texto)),
    /* Lo tuyo es un globo (el `p` con fondo), no un renglón: se mide entero. */
    mio: caja(qq('[data-dialogo="mio"] p')),
    marcador: caja(qq('[aria-label^="Yo:"], [aria-label^="Él:"]')),
    ayudas: caja(q('[aria-label^="Ayudas"]')),
    salir: caja(qq(".barra-juego a").slice(0, 1)),
  };
};

/* ── Jugar ───────────────────────────────────────────────────────────────── */

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Lo que hace el jugador de acá cuando le toca, siempre lo mismo. Canta envido
 * al empezar cada mano que puede (eso llena el diálogo con lo que se dice, que
 * es lo que el paso del historial necesita), quiere todo lo que le cantan, y
 * tira la primera carta que puede. Nunca se va al mazo.
 */
async function jugarUnPaso(pag, e, mano) {
  if (e.cartel) {
    await pag.getByRole("button", { name: e.cartel }).click();
    mano.numero++;
    mano.canteEnvido = false;
    return true;
  }
  if (e.flor) { await pag.click('[data-canto="flor"]'); return true; }
  if (e.quiero) { await pag.click('[data-canto="quiero"]'); return true; }
  if (!e.puedoTirar) return false;
  if (e.envido && !mano.canteEnvido) {
    mano.canteEnvido = true;
    await pag.click('[data-canto="abrir-envido"]');
    await pag.waitForSelector('[data-canto="envido"]', { timeout: 3000 }).catch(() => {});
    if (await pag.$('[data-canto="envido"]')) { await pag.click('[data-canto="envido"]'); return true; }
  }
  await pag.click(".mano-abanico button:not([disabled])");
  return true;
}

/** El momento A: empieza una mano, te toca, hay puntos, sin flor ni nada pendiente. */
const esA = (e) => e.fase === "jugando" && e.pendiente === "nada" && !e.repartiendo && !e.cartel && e.enMano === 3 && e.puedoTirar
  && e.bazas === 0 && e.enseñadas === 0 && e.envido && !e.flor && e.yo >= 2 && e.el >= 2;
/** El momento B: te cantaron truco, con lo de antes en el diálogo. */
const esB = (e) => e.pendiente.startsWith("truco") && e.quiero && !e.cartel && /truco/i.test(e.globo) && e.previas >= 2;

/**
 * Juega con una semilla hasta encontrar los dos momentos. Devuelve, para
 * cada uno, la foto (PNG) y las zonas; o `null` si no llegó a B.
 */
async function jugarConSemilla(nav, tam, semilla) {
  const pag = await nav.newPage({ viewport: { width: tam.width, height: tam.height }, deviceScaleFactor: tam.dpr, isMobile: tam.width < 600, hasTouch: tam.width < 600 });
  await pag.addInitScript(conSemilla(semilla));
  await pag.goto(`${BASE}/jugar/mesa/`, { waitUntil: "networkidle" });
  await pag.waitForSelector("[data-pantalla-carga]", { state: "detached", timeout: 20000 }).catch(() => {});
  await pag.waitForSelector(".mano-abanico", { timeout: 20000 });
  const fotos = {};
  const mano = { numero: 1, canteEnvido: false };
  const fin = Date.now() + 6 * 60_000;
  let ultimo = "";
  try {
    while (mano.numero <= MANOS_TOPE && Date.now() < fin) {
      const e = await pag.evaluate(LEER);
      if (DEPURAR) {
        const linea = JSON.stringify(e);
        if (linea !== ultimo) console.log(`      ${mano.numero} ${linea}`);
        ultimo = linea;
      }
      for (const [nombre, es] of [["a", esA], ["b", esB]]) {
        if (fotos[nombre] || !es(e)) continue;
        /* Que terminen de acomodarse las cosas (el reparto, el globo que
           aparece con `anim-pop`) y que siga siendo el mismo momento. */
        await pausa(1500);
        if (!es(await pag.evaluate(LEER))) continue;
        fotos[nombre] = { png: await pag.screenshot(), zonas: await pag.evaluate(MEDIR), mano: mano.numero, estado: e };
        console.log(`   ${nombre.toUpperCase()}  semilla ${semilla}, mano ${mano.numero}: ${e.yo}–${e.el}${nombre === "b" ? `, "${e.globo}" con ${e.previas} antes` : ""}`);
      }
      if (fotos.a && fotos.b) return fotos;
      if (!(await jugarUnPaso(pag, e, mano).catch(() => false))) await pausa(250);
    }
    return null;
  } finally {
    await pag.close();
  }
}

/* ── Escribir y comprobar ────────────────────────────────────────────────── */

async function leerAnotado() {
  const ts = await readFile(ZONAS_TS, "utf8").catch(() => null);
  const m = ts?.match(/\/\* JSON \*\/ ([\s\S]*?) \/\* fin \*\//);
  return m ? JSON.parse(m[1]) : null;
}

function escribirTs(datos) {
  return `/* ── generado por \`node herramientas/generar-tutorial.mjs\`: no editar a mano ──
   Las fotos de \`public/tutorial/\` y dónde quedó cada cosa en ellas, en px CSS
   de la pantalla en que se sacaron (\`ancho\` × \`alto\`). Si la mesa cambia, se
   vuelve a correr la herramienta; \`herramientas/mirar-tutorial.mjs\` avisa si
   las fotos quedaron viejas. */

export type ZonaTutorial = { x: number; y: number; w: number; h: number };
export type FotoTutorial = {
  src: string;
  ancho: number;
  alto: number;
  zonas: Partial<Record<string, ZonaTutorial>>;
};
export type FotosTutorial = Record<"celular" | "pc", { semilla: number; a: FotoTutorial; b: FotoTutorial }>;

export const FOTOS_TUTORIAL: FotosTutorial = /* JSON */ ${JSON.stringify(datos, null, 2)} /* fin */;
`;
}

const lejos = (a, b) => !a !== !b || (a && b && ["x", "y", "w", "h"].some((k) => Math.abs(a[k] - b[k]) > TOLERANCIA));

async function main() {
  const anotado = COMPROBAR ? await leerAnotado() : null;
  if (COMPROBAR && !anotado) {
    console.error("✗ No hay lib/tutorial-fotos.ts para comprobar: correlo primero sin --comprobar.");
    process.exit(1);
  }
  await mkdir(SALIDA, { recursive: true });
  const nav = await chromium.launch();
  const datos = {};
  let fallas = 0;
  try {
    for (const [nombre, tam] of Object.entries(TAMANOS)) {
      console.log(`\n${nombre} (${tam.width}×${tam.height} a DPR ${tam.dpr})`);
      const semillas = COMPROBAR ? [anotado[nombre].semilla] : Array.from({ length: SEMILLAS_TOPE }, (_, i) => 1 + i);
      let fotos = null, semilla = null;
      for (const s of semillas) {
        fotos = await jugarConSemilla(nav, tam, s);
        if (fotos) { semilla = s; break; }
        console.log(`   semilla ${s}: no llegó a los dos momentos en ${MANOS_TOPE} manos`);
      }
      if (!fotos) {
        console.error(`✗ ${nombre}: ninguna semilla llegó a los dos momentos.`);
        fallas++;
        continue;
      }
      datos[nombre] = { semilla };
      for (const momento of ["a", "b"]) {
        const src = `/tutorial/${nombre}-${momento}.webp`;
        const zonas = Object.fromEntries(Object.entries(fotos[momento].zonas).filter(([, z]) => z));
        datos[nombre][momento] = { src, ancho: tam.width, alto: tam.height, zonas };
        if (COMPROBAR) {
          const viejas = anotado[nombre][momento].zonas;
          for (const k of new Set([...Object.keys(viejas), ...Object.keys(zonas)])) {
            if (!lejos(viejas[k], zonas[k])) continue;
            fallas++;
            console.log(`   FALLA ${momento}.${k}: estaba ${JSON.stringify(viejas[k])}, ahora ${JSON.stringify(zonas[k])}`);
          }
        } else {
          const archivo = path.join(SALIDA, `${nombre}-${momento}.webp`);
          await sharp(fotos[momento].png).webp({ quality: 78, effort: 6 }).toFile(archivo);
          const { size } = await import("node:fs").then((fs) => fs.statSync(archivo));
          console.log(`   ✓ public${src} (${Math.round(size / 1024)} KB)`);
        }
      }
    }
  } finally {
    await nav.close();
  }
  if (COMPROBAR) {
    if (fallas) {
      console.error(`\n✗ ${fallas} zona(s) se movieron: las fotos del tutorial son de una mesa vieja. Volvé a correr  node herramientas/generar-tutorial.mjs\n`);
      process.exit(1);
    }
    console.log("\n✓ la mesa de las fotos es la de hoy: todas las zonas caen donde estaban");
    return;
  }
  if (fallas) process.exit(1);
  await writeFile(ZONAS_TS, escribirTs(datos));
  console.log(`\n✓ lib/tutorial-fotos.ts`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
