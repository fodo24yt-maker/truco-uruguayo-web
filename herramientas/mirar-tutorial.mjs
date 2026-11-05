/**
 * El guardián del tutorial de la mesa (`components/TutorialMesa.tsx`, 29/10/2026).
 *
 *     npm run build:app
 *     npm run servir:app                         (en otra terminal)
 *     node herramientas/mirar-tutorial.mjs       todo, con la comprobación de las fotos (~6 min más)
 *     node herramientas/mirar-tutorial.mjs --sin-fotos    sin volver a jugar la partida de las fotos
 *     node herramientas/mirar-tutorial.mjs --base URL
 *
 * ── Qué mira ──────────────────────────────────────────────────────────────
 *
 *  1. **El recorrido entero**, con el perfil vacío, en los siete tamaños de
 *     `mirar-mesa.mjs` y en los del Redmi. Portada → tocar Jugar → aparece la
 *     hoja (`role=dialog`, `aria-modal`). En CADA paso:
 *       · cada aro es más grande que cero y cae adentro de la pantalla;
 *       · la tarjeta entra entera en la pantalla y no tapa lo marcado;
 *       · la página no scrollea;
 *       · los botones miden ≥ 44 px de alto;
 *       · el foco está en "Siguiente" (o en "¡A jugar!", el último).
 *     "¡A jugar!" la cierra y queda visto; al recargar Jugar no vuelve a salir.
 *  2. **Escape** (que es el atrás de Android) la cierra y también queda visto.
 *  3. **Ajustes → "Cómo se usa la mesa"** la abre, con el panel de Ajustes
 *     cerrado: un solo diálogo, para que un solo atrás alcance.
 *  4. **El ensayo de la pantalla de carga** (teléfono de mentira, como
 *     `mirar-carga.mjs`): pasa por `/jugar` con el perfil vacío, y ahí el
 *     tutorial NO tiene que salir ni quedar visto. Después, tocar Jugar sí lo
 *     muestra.
 *  5. **Que las fotos no sean de una mesa vieja**: corre
 *     `generar-tutorial.mjs --comprobar`, que vuelve a jugar la partida de las
 *     fotos y compara dónde cae cada cosa.
 *
 * Las capturas de cada paso quedan en `capturas/tutorial/` (ignorada por Git).
 */
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const BASE = (args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:4173").replace(/\/$/, "");
const SALIDA = path.resolve(AQUI, "..", "capturas", "tutorial");
const CLAVE = "truco-uy:tutorial-mesa";

/* Los de `mirar-mesa.mjs`, más el Redmi (360×760 y 360×800). */
const TAMANOS = [
  [390, 844], [360, 640], [360, 600], [320, 568],
  [360, 760], [360, 800],
  [1100, 800], [1280, 620], [1440, 900],
];

let fallos = 0;
const falla = (donde, que) => { fallos++; console.log(`  FALLA  ${donde}: ${que}`); };
const bien = (que) => console.log(`  ok     ${que}`);

await mkdir(SALIDA, { recursive: true });
const nav = await chromium.launch();

const movil = (w) => w < 700;
async function telefono(w, h, { visto = false, capacitor = false } = {}) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: movil(w) ? 2 : 1, isMobile: movil(w), hasTouch: movil(w) });
  await ctx.addInitScript(([visto, capacitor, clave]) => {
    if (capacitor) {
      // Lo que en el teléfono pone el puente nativo (igual que mirar-carga.mjs)
      window.CapacitorCustomPlatform = { name: "android", plugins: {} };
      window.Capacitor = { isNativePlatform: () => true };
    }
    if (visto) localStorage.setItem(clave, JSON.stringify({ version: 1, visto: true }));
  }, [visto, capacitor, CLAVE]);
  return { ctx, pag: await ctx.newPage() };
}
const sinCarga = (pag) => pag.waitForSelector("[data-pantalla-carga]", { state: "detached", timeout: 20000 }).catch(() => {});
const tocarJugar = (pag) => pag.locator("main a", { hasText: /^jugar$/i }).first().click();
const hoja = '[data-tutorial][role="dialog"][aria-modal="true"]';

/** Lo que hay en pantalla en este paso del tutorial. Corre en la página. */
const LEER_PASO = () => {
  const d = document.querySelector("[data-tutorial]");
  const r = (e) => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
  const tarjeta = d.querySelector("[aria-live]");
  return {
    contador: d.querySelector("h2")?.textContent ?? "",
    titulo: tarjeta?.querySelector("h3")?.textContent ?? "",
    aros: [...d.querySelectorAll("svg rect")].map(r),
    tarjeta: tarjeta ? r(tarjeta) : null,
    botones: [...d.querySelectorAll("button")].map((b) => ({ texto: b.textContent.trim(), alto: b.getBoundingClientRect().height })),
    foco: document.activeElement?.closest("[data-tutorial]") ? document.activeElement.textContent.trim() : null,
    scroll: Math.max(document.documentElement.scrollHeight - innerHeight, document.documentElement.scrollWidth - innerWidth),
    ancho: innerWidth,
    alto: innerHeight,
  };
};

const tapado = (a, b) => {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return (x * y) / (a.w * a.h);
};

// ─── 1. El recorrido entero ───
console.log("\nel recorrido, con el perfil vacío:");
for (const [w, h] of TAMANOS) {
  const etiqueta = `${w}x${h}`;
  const antes = fallos;
  const { ctx, pag } = await telefono(w, h);
  const errores = [];
  pag.on("pageerror", (e) => errores.push(String(e)));
  await pag.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await sinCarga(pag);
  await tocarJugar(pag);
  if (!(await pag.waitForSelector(hoja, { timeout: 8000 }).catch(() => null))) {
    falla(etiqueta, "tocar Jugar por primera vez no mostró el tutorial");
    await ctx.close();
    continue;
  }
  let paso = 1;
  for (;;) {
    await pag.waitForTimeout(500); // que la tarjeta se ubique y termine su `anim-pop`
    const e = await pag.evaluate(LEER_PASO);
    const donde = `${etiqueta} paso ${paso} (${e.titulo})`;
    await pag.screenshot({ path: path.join(SALIDA, `${etiqueta}-${String(paso).padStart(2, "0")}.png`) });
    if (e.scroll > 1) falla(donde, `la página scrollea ${e.scroll}px`);
    for (const a of e.aros) {
      if (a.w < 4 || a.h < 4) falla(donde, `un aro mide ${Math.round(a.w)}×${Math.round(a.h)}`);
      if (a.x < -1 || a.y < -1 || a.x + a.w > e.ancho + 1 || a.y + a.h > e.alto + 1) falla(donde, "un aro se sale de la pantalla");
    }
    const t = e.tarjeta;
    if (!t) falla(donde, "no hay tarjeta");
    else {
      if (t.x < 0 || t.y < 0 || t.x + t.w > e.ancho + 0.5 || t.y + t.h > e.alto + 0.5) falla(donde, "la tarjeta se sale de la pantalla");
      for (const a of e.aros) {
        const parte = tapado(a, t);
        if (parte > 0.15) falla(donde, `la tarjeta tapa el ${Math.round(parte * 100)}% de lo marcado`);
      }
    }
    for (const b of e.botones) if (b.alto < 44) falla(donde, `el botón "${b.texto}" mide ${Math.round(b.alto)}px de alto`);
    const ultimo = e.botones.some((b) => b.texto === "¡A jugar!");
    const esperado = ultimo ? "¡A jugar!" : "Siguiente →";
    if (e.foco !== esperado) falla(donde, `el foco está en ${JSON.stringify(e.foco)}, no en "${esperado}"`);
    if (ultimo) break;
    if (paso > 30) { falla(etiqueta, "el tutorial no termina nunca"); break; }
    await pag.locator(`${hoja} button`, { hasText: "Siguiente" }).click();
    paso++;
  }
  await pag.locator(`${hoja} button`, { hasText: "¡A jugar!" }).click();
  await pag.waitForTimeout(250);
  if (await pag.$(hoja)) falla(etiqueta, "¡A jugar! no cierra el tutorial");
  const guardado = await pag.evaluate((k) => localStorage.getItem(k), CLAVE);
  if (!guardado?.includes('"visto":true')) falla(etiqueta, `no quedó guardado como visto (${guardado})`);
  await pag.reload({ waitUntil: "networkidle" });
  await sinCarga(pag);
  await pag.waitForTimeout(800);
  if (await pag.$(hoja)) falla(etiqueta, "al recargar Jugar, el tutorial vuelve a salir");
  if (errores.length) falla(etiqueta, `errores en la página: ${errores.join(" | ")}`);
  if (fallos === antes) bien(`${etiqueta.padEnd(9)} ${paso} pasos`);
  await ctx.close();
}

// ─── 2. Escape ───
console.log("\nEscape (el atrás de Android):");
{
  const { ctx, pag } = await telefono(360, 760);
  await pag.goto(`${BASE}/jugar/`, { waitUntil: "networkidle" });
  await sinCarga(pag);
  if (!(await pag.waitForSelector(hoja, { timeout: 8000 }).catch(() => null))) falla("escape", "entrando derecho a Jugar no salió");
  else {
    await pag.locator(`${hoja} button`, { hasText: "Siguiente" }).click();
    await pag.waitForTimeout(300);
    await pag.keyboard.press("Escape");
    await pag.waitForTimeout(250);
    const guardado = await pag.evaluate((k) => localStorage.getItem(k), CLAVE);
    (await pag.$(hoja))
      ? falla("escape", "Escape no lo cierra")
      : guardado?.includes('"visto":true')
        ? bien("Escape lo cierra a mitad y queda visto")
        : falla("escape", "lo cierra pero no queda visto");
  }
  await ctx.close();
}

// ─── 3. Desde Ajustes ───
console.log("\ndesde Ajustes:");
{
  const { ctx, pag } = await telefono(360, 760, { visto: true });
  await pag.goto(`${BASE}/jugar/`, { waitUntil: "networkidle" });
  await sinCarga(pag);
  await pag.waitForTimeout(800);
  if (await pag.$(hoja)) falla("ajustes", "ya visto, igual salió solo");
  await pag.click('header.barra-app button[aria-label="Ajustes"]');
  await pag.getByRole("button", { name: /Cómo se usa la mesa/ }).click();
  await pag.waitForTimeout(500);
  const dialogos = await pag.$$('[role="dialog"][aria-modal="true"]');
  const contador = await pag.locator(`${hoja} h2`).textContent().catch(() => "");
  if (dialogos.length !== 1) falla("ajustes", `quedaron ${dialogos.length} diálogos abiertos, tiene que ser 1`);
  else if (!/(^|\D)1 de \d/.test(contador ?? "")) falla("ajustes", `no abrió el tutorial en el primer paso (${contador})`);
  else bien("lo abre en el primer paso, con Ajustes cerrado");
  await pag.keyboard.press("Escape");
  await pag.waitForTimeout(250);
  if (await pag.$('[role="dialog"]')) falla("ajustes", "Escape no lo cierra");
  await ctx.close();
}

// ─── 4. El ensayo de la pantalla de carga ───
console.log("\nel ensayo de la pantalla de carga (teléfono de mentira):");
{
  const { ctx, pag } = await telefono(360, 800, { capacitor: true });
  await pag.addInitScript(() => {
    window.__tutorialEnElEnsayo = false;
    new MutationObserver(() => {
      if (document.querySelector("[data-pantalla-carga]") && document.querySelector("[data-tutorial]")) window.__tutorialEnElEnsayo = true;
    }).observe(document, { subtree: true, childList: true });
  });
  await pag.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const vista = await pag.waitForSelector("[data-pantalla-carga]", { timeout: 5000 }).catch(() => null);
  if (!vista) falla("ensayo", "no apareció la pantalla de carga (¿el build no es el de la app?)");
  await sinCarga(pag);
  await pag.waitForTimeout(800);
  const e = await pag.evaluate((k) => ({ ruta: location.pathname, abierto: !!document.querySelector("[data-tutorial]"), durante: window.__tutorialEnElEnsayo, guardado: localStorage.getItem(k) }), CLAVE);
  if (e.durante) falla("ensayo", "el tutorial apareció debajo de la pantalla de carga");
  if (e.abierto) falla("ensayo", `al irse la pantalla de carga, el tutorial quedó abierto en ${e.ruta}`);
  if (e.guardado) falla("ensayo", `el ensayo lo dejó marcado como visto (${e.guardado})`);
  if (!e.durante && !e.abierto && !e.guardado) bien(`el ensayo pasó por Jugar y el tutorial ni salió ni quedó visto (quedó en ${e.ruta})`);
  await tocarJugar(pag);
  (await pag.waitForSelector(hoja, { timeout: 8000 }).catch(() => null))
    ? bien("después, tocar Jugar sí lo muestra")
    : falla("ensayo", "después del ensayo, tocar Jugar no mostró el tutorial");
  await ctx.close();
}

await nav.close();

// ─── 5. Las fotos, contra la mesa de hoy ───
if (!args.includes("--sin-fotos")) {
  console.log("\nlas fotos, contra la mesa de hoy (generar-tutorial.mjs --comprobar):");
  const r = spawnSync(process.execPath, [path.join(AQUI, "generar-tutorial.mjs"), "--comprobar", "--base", BASE], { stdio: "inherit" });
  if (r.status !== 0) { fallos++; console.log("  FALLA  las fotos del tutorial son de una mesa vieja"); }
}

console.log(fallos ? `\n✗ ${fallos} falla(s). Capturas en capturas/tutorial/\n` : "\n✓ TODO OK. Capturas en capturas/tutorial/\n");
process.exit(fallos ? 1 : 0);
