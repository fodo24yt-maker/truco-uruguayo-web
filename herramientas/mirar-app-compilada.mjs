/**
 * Prueba el export de la APP, no el de la web.
 *
 *     npm run build:app
 *     npm run servir:app          (en otra terminal)
 *     node herramientas/mirar-app-compilada.mjs
 *
 * ── Por qué hace falta una prueba aparte ──────────────────────────────────
 *
 * `mirar-web.mjs` mira `next dev`, y ahí hay tres cosas que NO son como en el
 * teléfono:
 *
 *   1. **La CSP no existe.** Se inyecta sólo en producción (`app/layout.tsx`),
 *      porque en desarrollo Next usa `eval` y la política lo bloquearía. O sea
 *      que todo lo que la CSP pueda romper, en `next dev` no se ve.
 *   2. **Las rutas son otras.** La app se compila con `trailingSlash`, así que
 *      `usePathname()` devuelve `/aprender/` y no `/aprender`. Todo lo que
 *      compare rutas puede andar en desarrollo y fallar adentro del APK.
 *   3. **Nunca se recarga en una ruta profunda.** Adentro del WebView eso pasa
 *      cuando Android mata el proceso y lo vuelve a abrir.
 *
 * El servidor de Python resuelve `/ruta/` → `/ruta/index.html`, que es
 * exactamente lo que hace el servidor local de Capacitor. Si acá anda, allá
 * anda.
 */

import { chromium } from "playwright";

import { volverDesde } from "../lib/navegacion.ts";

const RAIZ = "http://localhost:4173";
const RUTAS = ["/", "/aprender/", "/aprender/la-flor/", "/jugar/", "/jugar/gira/",
  "/jugar/mesa/", "/jugar/mesa/?depto=rocha", "/legales/terminos/"];

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
const pag = await ctx.newPage();
let fallos = 0;
const falla = (donde, que) => { fallos++; console.log(`FALLA ${donde}  ${que}`); };

/* Todo lo que la CSP BLOQUEE sale por acá. Es el motivo principal de esta
   prueba: un `Refused to …` adentro del APK no lo ve nadie.

   Se busca "Refused to", que es lo que Chrome escribe cuando de verdad frena
   algo, y NO cualquier mención a la política. La primera versión de esto miraba
   "Content Security Policy" a secas y fallaba en las ocho rutas por un aviso
   que no bloquea nada: `frame-ancestors` no se puede aplicar desde un `<meta>`.
   Eso ya se sabía —es la razón por la que existe `public/_headers`— y adentro
   de un APK no importa, porque no hay ningún iframe donde meter la app. */
const bloqueos = [];
const avisos = new Set();
pag.on("console", (m) => {
  const t = m.text();
  if (/Refused to/i.test(t)) bloqueos.push(t);
  else if (/Content Security Policy/i.test(t)) avisos.add(t.slice(0, 100));
});
pag.on("pageerror", (e) => falla("js", `error en la página: ${e.message}`));

console.log("recarga dura en cada ruta, sobre el export de la app:\n");
for (const ruta of RUTAS) {
  bloqueos.length = 0;
  const resp = await pag.goto(`${RAIZ}${ruta}`, { waitUntil: "domcontentloaded" });
  await pag.waitForTimeout(ruta.includes("mesa") ? 3200 : 700);

  const m = await pag.evaluate(() => {
    const barra = document.querySelector("body > header.barra-app");
    const visible = barra ? barra.getBoundingClientRect().height > 0 : false;
    return {
      ruta: location.pathname,
      csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content ?? null,
      // La prueba de que hidrató LA página correcta y no la portada de rebote
      h1: document.querySelector("main h1")?.textContent?.trim().slice(0, 34) ?? null,
      hayBarra: visible,
      volver: visible ? barra.querySelector("nav > a")?.getAttribute("href") ?? null : null,
      // localStorage, que es donde vive todo el progreso
      guarda: (() => {
        try { localStorage.setItem("prueba", "1"); return localStorage.getItem("prueba") === "1"; }
        catch { return false; }
      })(),
    };
  });

  if (resp?.status() !== 200) falla(ruta, `el servidor devolvió ${resp?.status()}`);
  if (!m.csp) falla(ruta, "no llegó la política de seguridad (CSP)");
  if (!m.guarda) falla(ruta, "no se puede guardar en localStorage: se pierde el progreso");
  if (bloqueos.length) falla(ruta, `la CSP bloqueó algo: ${bloqueos[0].slice(0, 120)}`);

  const camino = ruta.split("?")[0];
  const busqueda = ruta.includes("?") ? ruta.slice(ruta.indexOf("?")) : "";
  /* Los dos lados se comparan sin la barra final. Next se la agrega al `href`
     que emite —con `trailingSlash` un `<Link href="/aprender">` sale como
     `/aprender/`—, así que compararlo crudo contra `volverDesde()` daba una
     falla que no era: los dos llevan al mismo lugar. */
  const sinBarra = (r) => (r && r !== "/" ? r.replace(/\/+$/, "") : r);
  const esperado = volverDesde(camino, busqueda);
  const deberiaHaberBarra = !camino.startsWith("/jugar/gira") && !camino.startsWith("/jugar/mesa");

  if (m.hayBarra !== deberiaHaberBarra) {
    falla(ruta, deberiaHaberBarra ? "falta la barra" : "la barra tapa la pantalla de juego");
  }
  /* ACÁ ES DONDE APARECE EL BUG DE LA BARRA FINAL. Si `usePathname()` devuelve
     `/aprender/` y alguien lo comparó contra `/aprender`, el volver apunta mal
     y sólo se ve en este build. */
  if (deberiaHaberBarra && sinBarra(m.volver) !== sinBarra(esperado)) {
    falla(ruta, `el volver apunta a ${m.volver} y tendría que ir a ${esperado}`);
  }

  console.log(
    `  ${fallos ? "" : "ok  "}${ruta.padEnd(26)} h1=${JSON.stringify(m.h1)} volver=${m.volver ?? "-"}`,
  );
}

await nav.close();
if (avisos.size) {
  console.log("\navisos de la política (no bloquean nada, quedan anotados):");
  for (const a of avisos) console.log(`  · ${a}`);
}
console.log(fallos ? `\n${fallos} FALLAS` : "\nTODO OK: el export de la app aguanta la recarga dura");
process.exit(fallos ? 1 : 0);
