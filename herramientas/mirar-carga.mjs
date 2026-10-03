/**
 * La pantalla de carga de la app, y que la mesa entre ENTERA. (3/10/2026)
 *
 *     npm run build:app
 *     npm run servir:app          (en otra terminal)
 *     node herramientas/mirar-carga.mjs
 *
 * Va contra la app COMPILADA y no contra `next dev`: la pantalla de carga
 * viene en el HTML estático de la app, y el prefetch de Next sólo trabaja en
 * producción. Simula el teléfono igual que `mirar-anuncios.mjs`.
 *
 * ── Qué mira ──────────────────────────────────────────────────────────────
 *
 *  1. Que la pantalla de carga venga en el HTML (primer cuadro, sin JS).
 *  2. Que se vaya entre `MS_MINIMO` y `MS_MAXIMO` de abrir la página.
 *  3. Que, ida ella, ir portada → jugar → Partida rápida NO pida ningún .js
 *     ni ninguna imagen de escena: todo eso tenía que estar precargado.
 *  4. LO QUE IMPORTA: que el primer cuadro en que existe la escena ya tenga
 *     sus dos imágenes listas. Lo mira un MutationObserver, que corre después
 *     de que React toca el DOM y ANTES de pintar: si en ese momento la imagen
 *     no está `complete`, el primer cuadro sale con el color liso y la textura
 *     "salta" después, que es justo lo que se arregló. Se mira en:
 *       · la Partida rápida (precargada por la pantalla de carga);
 *       · un cambio de rival a OTRO departamento, que no estaba precargado:
 *         ahí trabaja la espera de la mesa (`esperarEscena`), no la precarga;
 *       · la Gira, entrando por la ficha de una parada.
 *  5. Que sin JavaScript la pantalla se vaya sola a los 6 s (la red del CSS).
 */

import { readFileSync } from "node:fs";

import { chromium } from "playwright";

import { PERSONALIDADES } from "../lib/motor/personalidades.ts";

const RAIZ = "http://localhost:4173";
const MS_MINIMO = 800;
const MS_MAXIMO = 4000;

let fallos = 0;
const bien = (que) => console.log(`  ok     ${que}`);
const falla = (que) => {
  fallos++;
  console.log(`  FALLA  ${que}`);
};

const nav = await chromium.launch();

async function telefono({ js = true, desbloqueos = null, progreso = null } = {}) {
  const ctx = await nav.newContext({
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    javaScriptEnabled: js,
  });
  if (js) {
    await ctx.addInitScript((d) => {
      // Lo que en el teléfono pone el puente nativo
      window.CapacitorCustomPlatform = { name: "android", plugins: {} };
      window.Capacitor = { isNativePlatform: () => true };
      if (d.desbloqueos) localStorage.setItem("truco-uy:desbloqueos", JSON.stringify(d.desbloqueos));
      if (d.progreso) localStorage.setItem("truco-uy:progreso", JSON.stringify(d.progreso));

      // Cada imagen de escena que entra al DOM (o cambia de `src`): ¿estaba lista?
      window.__escenas = [];
      // Cuándo se fue la pantalla de carga
      window.__carga = { vista: false, seFue: null };
      const mirar = (muts) => {
        if (document.querySelector("[data-pantalla-carga]")) window.__carga.vista = true;
        else if (window.__carga.vista && window.__carga.seFue === null)
          window.__carga.seFue = performance.now();
        for (const m of muts) {
          const imgs = [];
          if (m.type === "attributes") imgs.push(m.target);
          else
            for (const n of m.addedNodes) {
              if (n.nodeType !== 1) continue;
              if (n.tagName === "IMG") imgs.push(n);
              else imgs.push(...n.querySelectorAll("img"));
            }
          for (const img of imgs) {
            const src = img.getAttribute("src") ?? "";
            if (!src.includes("/escenas/")) continue;
            window.__escenas.push({ src, lista: img.complete && img.naturalWidth > 0 });
          }
        }
      };
      new MutationObserver(mirar).observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["src"],
      });
    }, { desbloqueos, progreso });
  }
  const pag = await ctx.newPage();
  /* Lo que se baja de verdad, por CDP y no por el evento `request` de
     Playwright: ése también avisa de pedidos que el navegador resuelve con su
     caché, y entonces "pidió el .js al entrar" no distingue entre bajarlo de
     nuevo y usar lo que ya estaba. Medido el 3/10/2026: el prefetch termina a
     los ~125 ms de abrir, y aun así en algunas corridas Playwright reportaba
     los mismos archivos al entrar a la mesa. */
  const pedidos = [];
  if (js) {
    const cdp = await ctx.newCDPSession(pag);
    await cdp.send("Network.enable");
    const porId = new Map();
    cdp.on("Network.requestWillBeSent", (e) => {
      const r = { camino: new URL(e.request.url).pathname, deCache: false, estado: 0 };
      porId.set(e.requestId, r);
      pedidos.push(r);
    });
    cdp.on("Network.requestServedFromCache", (e) => {
      const r = porId.get(e.requestId);
      if (r) r.deCache = true;
    });
    cdp.on("Network.responseReceived", (e) => {
      const r = porId.get(e.requestId);
      if (!r) return;
      r.estado = e.response.status;
      if (e.response.fromDiskCache || e.response.fromPrefetchCache) r.deCache = true;
    });
  }
  return { ctx, pag, pedidos };
}

const sinCarga = (pag) =>
  pag.waitForSelector("[data-pantalla-carga]", { state: "detached", timeout: 8000 });

const escenas = (pag) => pag.evaluate(() => window.__escenas.splice(0));

/** Las imágenes de escena que aparecieron, y si alguna llegó tarde. */
function revisarEscenas(lista, donde) {
  if (!lista.length) return falla(`${donde}: no apareció ninguna imagen de escena`);
  const tarde = lista.filter((e) => !e.lista);
  tarde.length
    ? falla(`${donde}: ${tarde.length} de ${lista.length} imágenes NO estaban listas al aparecer (${tarde.map((e) => e.src).join(", ")})`)
    : bien(`${donde}: las ${lista.length} imágenes de la escena ya estaban listas en su primer cuadro`);
}

// ─── 1 y 2. La pantalla, en el HTML y con sus tiempos ───
console.log("la pantalla de carga:");
{
  const html = readFileSync("out-app/index.html", "utf8");
  html.includes("data-pantalla-carga")
    ? bien("viene en el HTML estático de la app (se ve antes del JavaScript)")
    : falla("no está en out-app/index.html");

  const { ctx, pag } = await telefono();
  await pag.goto(`${RAIZ}/`, { waitUntil: "domcontentloaded" });
  await sinCarga(pag);
  const { vista, seFue } = await pag.evaluate(() => window.__carga);
  if (!vista) falla("no se llegó a ver");
  else if (seFue < MS_MINIMO - 50) falla(`se fue demasiado rápido: ${Math.round(seFue)} ms`);
  else if (seFue > MS_MAXIMO + 400) falla(`tardó demasiado en irse: ${Math.round(seFue)} ms`);
  else bien(`se fue a los ${Math.round(seFue)} ms de abrir (entre ${MS_MINIMO} y ${MS_MAXIMO})`);
  // `esperarCodigo` (lib/precarga.ts) se apoya en el nombre `__PAGE__` de Next.
  // Si un día cambia, la espera se va al tope (2,5 s) en CADA arranque.
  if (vista && seFue > 2400)
    falla("la pantalla se fue en el tope de la espera del código: ¿Next cambió el nombre de `__PAGE__`?");
  await ctx.close();
}

// ─── 3 y 4. Partida rápida y cambio de rival ───
console.log("\nla Partida rápida, ya precargada:");
{
  const { ctx, pag, pedidos } = await telefono();
  await pag.goto(`${RAIZ}/`, { waitUntil: "domcontentloaded" });
  await sinCarga(pag);
  await pag.waitForTimeout(300);
  await escenas(pag); // lo de antes no cuenta
  const desde = pedidos.length;

  await pag.click('a[href="/jugar/"]:visible');
  await pag.waitForURL(/\/jugar\/$/);
  await pag.click('a[href="/jugar/mesa/"]');
  await pag.waitForURL(/\/jugar\/mesa\/$/);
  await pag.waitForSelector(".escena", { timeout: 5000 });
  await pag.waitForTimeout(400);

  const alEntrar = pedidos.slice(desde).filter((p) => /\.js$|\/escenas\/.*\.webp$/.test(p.camino));
  // Bajado de nuevo: ni de la caché, ni un 304 (que es "lo que tenías sirve").
  const bajados = alEntrar.filter((p) => !p.deCache && p.estado !== 304);
  bajados.length
    ? falla(`al entrar se BAJÓ lo que debía estar precargado: ${[...new Set(bajados.map((p) => `${p.camino} (${p.estado})`))].join(", ")}`)
    : bien(
        alEntrar.length
          ? `ir a la mesa no bajó nada nuevo (${alEntrar.length} pedidos resueltos con la caché)`
          : "ir a la mesa no pidió ni un .js ni una imagen: todo estaba precargado",
      );
  revisarEscenas(await escenas(pag), "Partida rápida");

  // Cambio de rival a otro departamento: esa escena NO estaba precargada.
  // Se elige por nombre un rival de un departamento distinto del de siempre.
  const antes = await pag.$eval(".escena img", (i) => i.getAttribute("src")).catch(() => null);
  const otro = PERSONALIDADES.find((p) => p.departamento !== PERSONALIDADES[0].departamento);
  // Como una persona: se deja terminar el reparto. (Y antes de 1 s de haber
  // entrado, el portero lo tomaría por un doble toque y no haría nada.)
  await pag.waitForTimeout(1600);
  await pag.locator('[aria-label*="Tocá para cambiar de rival"]').click();
  await pag.locator("li > button", { hasText: otro.nombre }).first().click();
  const cambio = await pag
    .waitForFunction(
      (src) => {
        const img = document.querySelector(".escena img");
        return img && img.getAttribute("src") !== src;
      },
      antes,
      { timeout: 4000 },
    )
    .then(() => true, () => false);
  await pag.waitForTimeout(400);
  cambio
    ? revisarEscenas(await escenas(pag), "cambio de rival a otro departamento")
    : falla("no se pudo cambiar a un rival de otro departamento");
  await ctx.close();
}

// ─── 4. La Gira, por la ficha de una parada ───
// Con la Gira entera ganada no hay "próxima parada": la pantalla de carga no
// precarga ninguna, y lo que se prueba es la precarga de la FICHA. Se toca una
// parada del medio, de otro departamento que el rival de siempre.
console.log("\nla Gira:");
{
  const rivales = Object.fromEntries(PERSONALIDADES.map((p) => [p.id, { ganadas: 1, jugadas: 1 }]));
  const { ctx, pag } = await telefono({
    desbloqueos: { version: 1, anotador: true, gira: true },
    progreso: { version: 1, rivales, leccionesLeidas: [], ayudas: true, ultimoRival: null },
  });
  await pag.goto(`${RAIZ}/jugar/gira/`, { waitUntil: "domcontentloaded" });
  await sinCarga(pag);
  await pag.waitForTimeout(300);
  const deSiempre = PERSONALIDADES[0].departamento;
  const otra = [...PERSONALIDADES].sort((a, b) => a.paso - b.paso).find((p) => p.paso >= 10 && p.departamento !== deSiempre);
  const parada = pag.locator(`path.depto[aria-label^="Paso ${otra.paso}:"]`);
  if (!(await parada.count())) {
    falla(`no se encontró la parada ${otra.paso} en el mapa`);
  } else {
    // Por teclado: el camino de la gira y las etiquetas van encima del territorio
    await parada.focus();
    await parada.press("Enter");
    const jugar = pag.locator('a[href^="/jugar/mesa/?depto="]').first();
    await jugar.waitFor({ timeout: 4000 });
    await pag.waitForTimeout(1500); // el tiempo de leer la ficha
    await escenas(pag);
    await jugar.click();
    await pag.waitForSelector(".escena", { timeout: 5000 });
    await pag.waitForTimeout(400);
    revisarEscenas(await escenas(pag), "Gira, desde la ficha");
  }
  await ctx.close();
}

// ─── 5. Sin JavaScript ───
console.log("\nsin JavaScript:");
{
  const { ctx, pag } = await telefono({ js: false });
  const t0 = Date.now();
  await pag.goto(`${RAIZ}/`, { waitUntil: "domcontentloaded" });
  await pag.waitForTimeout(Math.max(0, 6300 - (Date.now() - t0)));
  const vis = await pag.$eval("[data-pantalla-carga]", (e) => getComputedStyle(e).visibility);
  vis === "hidden"
    ? bien("a los 6 s se escondió sola: la red del CSS anda sin JavaScript")
    : falla(`a los 6 s seguía ${vis}`);
  await ctx.close();
}

await nav.close();
console.log(fallos ? `\n${fallos} FALLA(S)` : "\nTODO OK");
process.exit(fallos ? 1 : 0);
