/**
 * El guardián del arreglo de los píxeles de Aprender (28/10/2026): que el
 * arreglo esté puesto en las lecciones, y que NO toque ninguna otra pantalla.
 *
 *     node herramientas/mirar-aprender.mjs --volcar CARPETA [--base URL]     estilos y fotos de todas las pantallas
 *     node herramientas/mirar-aprender.mjs --comparar ANTES ANTES2 DESPUES   qué cambió, descontado el ruido
 *     node herramientas/mirar-aprender.mjs --css VIEJO.css NUEVO.css         las reglas nuevas, una por una
 *
 * La URL por omisión es `http://127.0.0.1:4173`, el build de la app servido
 * con `npm run servir:app`.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Santiago, al pedir el arreglo: "por lo que más quieras en el mundo NO TOQUES
 * NADA MÁS que no sea la sección de aprender… fijate que lo que toques no
 * rompa lo otro". Eso no se promete: se mide.
 *
 * 1. **`--volcar`** recorre todas las pantallas del sitio con Playwright (360×800 a
 *    DPR 2, como el Redmi). De cada elemento guarda TODOS sus estilos
 *    calculados (`getComputedStyle`), y de cada pantalla una foto.
 * 2. **`--comparar`** necesita DOS volcados del build de antes y uno del de
 *    después. La mesa reparte al azar y anima: dos volcados del MISMO build
 *    ya difieren en algo. Lo que difiere entre los dos de antes es el ruido;
 *    un cambio que no esté en el ruido es un cambio del arreglo. Afuera de las
 *    lecciones tiene que dar CERO.
 * 3. **`--css`** compara la hoja de estilos compilada de los dos builds: cada
 *    regla que aparece o desaparece se lista, y FALLA si alguna no está atada
 *    a `[data-leccion]`, el gancho que sólo pone `app/aprender/[leccion]`.
 *
 * Además, en cada lección `--volcar` comprueba que el arreglo aplicó (ver
 * `ARREGLO`). Si alguien lo saca, FALLA.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

const args = process.argv.slice(2);
const morir = (...m) => { console.error("\n✗", ...m, "\n"); process.exit(1); };
const despues = (bandera) => { const i = args.indexOf(bandera); return i === -1 ? [] : args.slice(i + 1).filter((x, k, xs) => !xs.slice(0, k + 1).some((y) => y.startsWith("--"))); };

const LECCIONES = ["la-baraja", "jerarquia", "la-muestra", "la-mano", "el-envido", "la-flor", "el-truco", "puntos-y-partida"];
const OTRAS = ["/", "/jugar/", "/jugar/mesa/", "/jugar/gira/", "/anotador/", "/aprender/", "/legales/privacidad/", "/legales/terminos/"];

/* Lo que tiene que valer en las lecciones, y en ningún otro lado:
   [selector, propiedad, valor]. Es el arreglo de `app/globals.css` (cada
   carta de la lección en su propia capa), medido en `Historial.md`. El de
   antes (el artículo en su búfer) estaba mal y se sacó. */
export const ARREGLO = [["[data-leccion] .carta", "will-change", "transform"]];

/* Todos los estilos calculados de cada elemento, con un camino estable
   (etiqueta y posición entre hermanos) para encontrarlo del otro lado. */
const VOLCADO = `(() => {
  const camino = (e) => { const p = []; for (let x = e; x && x !== document.documentElement; x = x.parentElement) { let i = 0; for (let h = x; (h = h.previousElementSibling);) i++; p.push(x.tagName.toLowerCase() + ":" + i); } return p.reverse().join(">"); };
  const salida = {};
  for (const e of document.querySelectorAll("body, body *")) {
    if (e.closest("#__next-route-announcer__, next-route-announcer, script, style, noscript")) continue;
    const cs = getComputedStyle(e);
    const props = {};
    for (let i = 0; i < cs.length; i++) props[cs[i]] = cs.getPropertyValue(cs[i]);
    salida[camino(e)] = props;
  }
  return salida;
})()`;

async function volcar(carpeta, base) {
  mkdirSync(carpeta, { recursive: true });
  const nav = await chromium.launch();
  const pag = await nav.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  /* El azar con semilla fija, en cada documento: la mesa reparte con
     `Math.random`, y sin esto cada volcado tenía otras cartas (otros
     elementos) y no se podía comparar uno con otro. */
  await pag.addInitScript(() => {
    let s = 0x2f6e2b1;
    Math.random = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  const resumen = {};
  let fallas = 0;
  const rutas = [...OTRAS, ...LECCIONES.map((l) => `/aprender/${l}/`)];
  for (const ruta of rutas) {
    await pag.goto(base + ruta, { waitUntil: "networkidle" });
    // El build de la app abre con la pantalla de carga: se mide lo de abajo, no ella.
    await pag.waitForSelector("[data-pantalla-carga]", { state: "detached", timeout: 20000 }).catch(() => {});
    await pag.waitForTimeout(ruta.startsWith("/jugar/mesa") ? 3000 : 800);
    const estilos = await pag.evaluate(VOLCADO);
    /* Ordenadas: Chromium no lista las propiedades (sobre todo las `--*`)
       en el mismo orden en cada carga, y el hash de la lista tal cual daba
       "cambió" con los mismos estilos (28/10/2026, primera corrida). */
    const hashes = Object.fromEntries(Object.entries(estilos).map(([k, v]) => [k, createHash("sha1").update(JSON.stringify(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)))).digest("hex").slice(0, 16)]));
    const nombre = ruta.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "portada";
    writeFileSync(path.join(carpeta, `${nombre}.json`), JSON.stringify(estilos));
    await pag.screenshot({ path: path.join(carpeta, `${nombre}.png`), fullPage: !ruta.startsWith("/jugar") && ruta !== "/" });
    resumen[ruta] = hashes;
    if (ruta.startsWith("/aprender/") && ruta !== "/aprender/") {
      /* Se mira cada carta de la lección (no el selector del arreglo, que
         sin el gancho no encontraría nada y "pasaría"). Una lección sin
         cartas no tiene nada que revisar. */
      for (const [sel, prop, valor] of ARREGLO) {
        const v = await pag.evaluate(([p]) => [...document.querySelectorAll("article.prosa .carta")].map((e) => getComputedStyle(e).getPropertyValue(p)), [prop]);
        if (!v.length) { console.log(`   —     ${ruta} sin cartas`); continue; }
        const mal = v.filter((x) => x !== valor).length;
        if (mal) fallas++;
        console.log(`   ${mal ? "FALLA" : "ok   "} ${ruta} ${v.length} cartas, ${prop}${mal ? `: ${mal} sin ${valor} (${sel})` : ` = ${valor}`}`);
      }
    }
    console.log(`   ${ruta.padEnd(28)} ${Object.keys(hashes).length} elementos`);
  }
  writeFileSync(path.join(carpeta, "resumen.json"), JSON.stringify(resumen));
  await nav.close();
  if (fallas) morir(`${fallas} lección(es) sin el arreglo puesto.`);
  console.log(`\n✓ volcado en ${carpeta}`);
}

function comparar(antes, antes2, despues) {
  const leer = (c) => JSON.parse(readFileSync(path.join(c, "resumen.json"), "utf8"));
  const [A, A2, D] = [leer(antes), leer(antes2), leer(despues)];
  let fallas = 0;
  for (const ruta of Object.keys(A)) {
    const leccion = ruta.startsWith("/aprender/") && ruta !== "/aprender/";
    const ruido = new Set(), cambios = [];
    const claves = new Set([...Object.keys(A[ruta] ?? {}), ...Object.keys(A2[ruta] ?? {}), ...Object.keys(D[ruta] ?? {})]);
    for (const k of claves) {
      if (A[ruta]?.[k] !== A2[ruta]?.[k]) { ruido.add(k); continue; }
      if (A[ruta]?.[k] !== D[ruta]?.[k]) cambios.push(k);
    }
    /* El detalle: qué propiedades cambiaron, para leerlo y no sólo contarlo. */
    let detalle = "";
    if (cambios.length) {
      const nombre = ruta.replace(/^\/|\/$/g, "").replace(/\//g, "_") || "portada";
      const ea = JSON.parse(readFileSync(path.join(antes, `${nombre}.json`), "utf8"));
      const ed = JSON.parse(readFileSync(path.join(despues, `${nombre}.json`), "utf8"));
      const props = new Map();
      for (const k of cambios) {
        for (const p of new Set([...Object.keys(ea[k] ?? {}), ...Object.keys(ed[k] ?? {})])) {
          if (ea[k]?.[p] !== ed[k]?.[p]) props.set(p, (props.get(p) ?? 0) + 1);
        }
      }
      detalle = [...props].map(([p, n]) => `${p}×${n}`).join(", ");
    }
    const mal = !leccion && cambios.length > 0;
    if (mal) fallas++;
    console.log(`   ${mal ? "FALLA" : "ok   "} ${ruta.padEnd(28)} cambios ${String(cambios.length).padStart(4)} · ruido ${String(ruido.size).padStart(4)}${detalle ? ` · ${detalle}` : ""}`);
  }
  if (fallas) morir(`${fallas} pantalla(s) afuera de las lecciones cambiaron.`);
  console.log("\n✓ afuera de las lecciones no cambió nada (descontado el ruido)");
}

/* Las reglas de una hoja compilada, SELECTOR POR SELECTOR: el minificador
   junta en una sola regla los selectores que tienen la misma declaración
   (`.pantalla-fija .carta,…,[data-leccion] article.prosa{opacity:.999}`), así
   que comparar reglas enteras daría por cambiada la del menú cuando no lo
   está. Se parte la lista de selectores sólo en las comas de afuera (no las
   de adentro de `:is(…)` o `:not(…)`). Alcanza para el CSS de Tailwind, que
   sale minificado; lo anidado (`@media`, `@supports`) se lee por bloque. */
const partirSelectores = (s) => {
  const out = [];
  let hondo = 0, desde = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(" || s[i] === "[") hondo++;
    else if (s[i] === ")" || s[i] === "]") hondo--;
    else if (s[i] === "," && hondo === 0) { out.push(s.slice(desde, i).trim()); desde = i + 1; }
  }
  out.push(s.slice(desde).trim());
  return out;
};
const reglas = (css) => {
  const out = new Set();
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(limpio))) for (const sel of partirSelectores(m[1].trim())) out.add(`${sel}{${m[2].trim()}}`);
  return out;
};

function compararCss(viejo, nuevo) {
  const [V, N] = [reglas(readFileSync(viejo, "utf8")), reglas(readFileSync(nuevo, "utf8"))];
  const nuevas = [...N].filter((r) => !V.has(r));
  const idas = [...V].filter((r) => !N.has(r));
  let fallas = 0;
  for (const r of nuevas) {
    const ok = r.split("{")[0].split(",").every((s) => s.includes("[data-leccion"));
    if (!ok) fallas++;
    console.log(`   ${ok ? "ok   " : "FALLA"} + ${r.slice(0, 160)}`);
  }
  for (const r of idas) { fallas++; console.log(`   FALLA - ${r.slice(0, 160)}`); }
  if (fallas) morir(`${fallas} regla(s) que no son sólo de las lecciones.`);
  console.log(`\n✓ ${nuevas.length} regla(s) nuevas, todas atadas a [data-leccion]; ninguna se fue`);
}

if (args.includes("--volcar")) {
  const [carpeta] = despues("--volcar");
  if (!carpeta) morir("Uso:  --volcar CARPETA [--base URL]");
  await volcar(carpeta, (despues("--base")[0] || "http://127.0.0.1:4173").replace(/\/$/, ""));
} else if (args.includes("--comparar")) {
  const cs = despues("--comparar");
  if (cs.length !== 3) morir("Uso:  --comparar ANTES ANTES2 DESPUES");
  comparar(...cs);
} else if (args.includes("--css")) {
  const cs = despues("--css");
  if (cs.length !== 2) morir("Uso:  --css VIEJO.css NUEVO.css");
  compararCss(...cs);
} else {
  console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(0, 10).join("\n"));
}
