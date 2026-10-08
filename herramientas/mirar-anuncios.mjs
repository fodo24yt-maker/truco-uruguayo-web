/**
 * Mira los anuncios y los candados EN UN NAVEGADOR, sin teléfono.
 *
 *     DESTINO=app npx next dev -p 3100        (en otra terminal)
 *     node herramientas/mirar-anuncios.mjs            recorre cada regla
 *     node herramientas/mirar-anuncios.mjs --fotos    saca las capturas
 *
 * ── Cómo se hace de cuenta que es el teléfono ─────────────────────────────
 * `addInitScript` pone, antes de que cargue la página, lo que en el teléfono
 * pone el puente nativo: `window.Capacitor` diciendo que es nativo, y
 * `CapacitorCustomPlatform` para que `@capacitor/core` crea lo mismo. Con eso
 * se prenden los candados (`lib/plataforma.ts`).
 *
 * La red de anuncios es la DE MENTIRA (`lib/anuncios-simulados.ts`): un
 * "anuncio" es una capa negra con botones de cerrar. Existe sólo en `next dev`
 * —por eso hace falta el servidor de desarrollo y no el build— y se prende
 * con `window.__trucoAnunciosSimulados`, que también deja anotado lo que pasó.
 *
 * ── El reloj ──────────────────────────────────────────────────────────────
 * `page.clock` de Playwright: "pasan siete minutos" es una línea, no siete
 * minutos. Adelanta `performance.now()`, que es el reloj del gestor.
 *
 * Lo que esto NO prueba es el SDK de verdad: que Google mande el evento de
 * recompensa, el consentimiento de Europa, el botón atrás físico. Eso va en la
 * lista de pruebas a mano, con el APK de debug y los anuncios de prueba de
 * Google (`node herramientas/celular-usb.mjs --apk`).
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

// Los tiempos salen del gestor mismo, no se copian: si alguien mueve una perilla,
// esta herramienta prueba el valor nuevo y no uno viejo escrito a mano.
import { MINUTOS_ENTRE_ANUNCIOS as TOPE, MINUTOS_SIN_INTERSTICIAL_TRAS_VIDEO as VENTANA } from "../lib/anuncios.ts";

const RAIZ = process.env.SITIO_APP ?? "http://localhost:3100";
const SALIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "capturas", "anuncios");
const FOTOS = process.argv.includes("--fotos");
const MIN = 60_000;

const nav = await chromium.launch();
let fallos = 0;
const falla = (que) => {
  fallos++;
  console.log(`  FALLA  ${que}`);
};
const bien = (que) => console.log(`  ok     ${que}`);

/** Un navegador que se cree el teléfono, con la red de anuncios de mentira. */
async function telefono({ ancho = 390, alto = 844, control = {}, guardado = {} } = {}) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
  await ctx.addInitScript(
    ([control, guardado]) => {
      window.CapacitorCustomPlatform = { name: "android", plugins: {} };
      window.Capacitor = { isNativePlatform: () => true };
      window.__trucoAnunciosSimulados = { registro: [], ...control };
      // Lo guardado se siembra UNA vez: si no, cada recarga lo volvería a pisar
      if (!sessionStorage.getItem("sembrado")) {
        for (const [k, v] of Object.entries(guardado)) localStorage.setItem(k, JSON.stringify(v));
        sessionStorage.setItem("sembrado", "1");
      }
    },
    [control, guardado],
  );
  const pag = await ctx.newPage();
  return { ctx, pag };
}

/** La pantalla de carga de la app (3/10/2026) tapa todo al abrir: se espera a que se vaya. */
async function sinPantallaCarga(pag) {
  const carga = pag.locator("[data-pantalla-carga]");
  // Con el reloj de Playwright puesto, el tiempo está quieto: hay que empujarlo
  // para que se cumplan los tiempos de la pantalla. Sin él, se espera de verdad.
  // Hasta 15 s de reloj: el tope de la pantalla es 12 s (3/10/2026).
  for (let i = 0; i < 30 && (await carga.count()); i++) {
    const empujado = await pag.clock.fastForward(500).then(() => true, () => false);
    if (!empujado) {
      await carga.waitFor({ state: "detached", timeout: 15000 });
      return;
    }
    await pag.waitForTimeout(50);
  }
}

async function abrir(pag, ruta) {
  await pag.goto(`${RAIZ}${ruta}`, { waitUntil: "domcontentloaded" });
  await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await sinPantallaCarga(pag);
  // Que el gestor ya haya arrancado (consentimiento + SDK de mentira)
  await pag.waitForFunction(() => window.__trucoAnunciosSimulados?.registro?.includes("iniciar"));
}

const registro = (pag) => pag.evaluate(() => [...window.__trucoAnunciosSimulados.registro]);
const cuantos = async (pag, que) => (await registro(pag)).filter((r) => r === que).length;
const guardado = (pag, clave) => pag.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), clave);
const ruta = (pag) => new URL(pag.url()).pathname.replace(/\/$/, "") || "/";

/**
 * Toca "Partida rápida" en /jugar y dice qué pasó: "anuncio" o "directo".
 * Si hubo anuncio, verifica que NO se haya entrado por debajo, lo cierra y
 * verifica que al cerrarse se llegue a la mesa.
 */
async function partidaRapida(pag, cerrar = true) {
  const antes = await cuantos(pag, "mostrado:intersticial");
  await pag.locator('a[href^="/jugar/mesa"]').first().click();
  await pag.waitForTimeout(300);
  const hubo = (await cuantos(pag, "mostrado:intersticial")) > antes;
  if (!hubo) {
    await pag.waitForURL(/\/jugar\/mesa/);
    return "directo";
  }
  if (ruta(pag) !== "/jugar") falla(`con el anuncio en pantalla ya se había entrado a ${ruta(pag)}`);
  if (cerrar) {
    await pag.locator('[data-simulado="Cerrar anuncio"]').click();
    await pag.waitForURL(/\/jugar\/mesa/);
  }
  return "anuncio";
}

/** De la mesa al menú de jugar, por el enlace de la propia mesa (sin recargar). */
async function salirDeLaMesa(pag) {
  await pag.locator('a[href="/jugar/"], a[href="/jugar"]').filter({ hasText: "Salir" }).click();
  await pag.waitForURL((u) => new URL(u).pathname.replace(/\/$/, "") === "/jugar");
  /* Con el reloj de Playwright el tiempo NO corre solo: sin esto, la traba de
     1 s contra el doble toque no se vencería nunca y el próximo toque —de una
     persona, que tarda más de un segundo— se tomaría como el segundo de un
     doble toque. */
  await pag.clock.fastForward(2000);
}

const esperar = (pag, ms) => pag.clock.fastForward(ms);

// ══════════════════════════════ LAS FOTOS ═══════════════════════════════════
if (FOTOS) {
  await mkdir(SALIDA, { recursive: true });
  for (const [nombre, ancho, alto] of [
    ["celular", 390, 844],
    ["celular-bajo", 360, 640],
    ["pc", 1440, 900],
  ]) {
    const foto = (pag, que) => pag.screenshot({ path: path.join(SALIDA, `${que}-${nombre}.png`) });

    {
      const { ctx, pag } = await telefono({ ancho, alto });
      await abrir(pag, "/");
      await pag.waitForSelector('[data-bloqueado="true"]');
      await foto(pag, "1-portada-anotador-bloqueado");
      await pag.locator('a[href^="/anotador"]').click();
      await pag.waitForSelector('[role="dialog"] button:has-text("Ver video"):not([disabled])');
      await foto(pag, "2-dialogo-anotador");
      await ctx.close();
    }
    {
      const { ctx, pag } = await telefono({ ancho, alto, control: { carga: "falla" } });
      await abrir(pag, "/");
      await pag.waitForSelector('[data-bloqueado="true"]');
      await pag.locator('a[href^="/anotador"]').click();
      await pag.waitForSelector('[role="dialog"] >> text=no está disponible');
      await foto(pag, "3-dialogo-sin-video");
      await ctx.close();
    }
    {
      const { ctx, pag } = await telefono({ ancho, alto });
      await abrir(pag, "/jugar/mesa");
      await pag.waitForTimeout(3500);
      await foto(pag, "4-mesa-sin-banner");
      await ctx.close();
    }
    {
      const { ctx, pag } = await telefono({
        ancho,
        alto,
        guardado: { "truco-uy:desbloqueos": { version: 1, anotador: true, gira: false } },
      });
      await abrir(pag, "/anotador");
      await pag.waitForTimeout(800);
      await foto(pag, "5-anotador-sin-banner");
      await ctx.close();
    }
    {
      const { ctx, pag } = await telefono({ ancho, alto });
      await abrir(pag, "/aprender/la-flor");
      await pag.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await pag.waitForTimeout(500);
      await foto(pag, "6-aprender-pie-sin-banner");
      await ctx.close();
    }
    {
      const { ctx, pag } = await telefono({
        ancho,
        alto,
        control: { pidePrivacidad: true },
        guardado: { "truco-uy:aprendido": { version: 1, ejercicios: ["la-baraja", "jerarquia", "la-mano"] } },
      });
      await abrir(pag, "/jugar");
      await pag.waitForSelector('[data-bloqueado="true"]');
      await foto(pag, "7-jugar-gira-bloqueada");
      await pag.locator('a[href^="/jugar/gira"]').click();
      await pag.waitForSelector('[role="dialog"] button:has-text("Ver video"):not([disabled])');
      await foto(pag, "8-dialogo-gira");
      await pag.keyboard.press("Escape");
      await pag.getByRole("button", { name: "Ajustes" }).click();
      await pag.waitForSelector('#titulo-ajustes');
      await foto(pag, "9-menu-anotador-bloqueado-y-privacidad");
      await pag.keyboard.press("Escape");
      await abrir(pag, "/aprender");
      await foto(pag, "10-aprender-contador");
      await ctx.close();
    }
    {
      // Once acertados: al acertar el que falta se abre la Gira
      const once = ["jerarquia", "la-muestra-1", "la-muestra-2", "la-mano", "el-envido-1", "el-envido-2",
        "la-flor", "el-truco-1", "el-truco-2", "puntos-y-partida-1", "puntos-y-partida-2"];
      const { ctx, pag } = await telefono({
        ancho,
        alto,
        guardado: { "truco-uy:aprendido": { version: 1, ejercicios: once } },
      });
      await abrir(pag, "/aprender/la-baraja");
      const opciones = pag.locator("section:has-text('Probá vos') .grid > button");
      for (let i = 0; i < (await opciones.count()); i++) {
        await opciones.nth(i).click();
        if (await pag.locator("text=Bien ahí").count()) break;
        await pag.getByRole("button", { name: "Probar de nuevo" }).click();
      }
      await pag.waitForSelector("text=¡Terminaste Aprender!");
      await pag.locator("text=¡Terminaste Aprender!").scrollIntoViewIfNeeded();
      await foto(pag, "11-terminaste-aprender");
      await ctx.close();
    }
    console.log(`fotos ${nombre}: listas`);
  }
  console.log(`\nEn ${path.relative(process.cwd(), SALIDA)}/`);
  await nav.close();
  process.exit(0);
}

// ═══════════════════════════════ LAS REGLAS ═════════════════════════════════
if (VENTANA <= TOPE) throw new Error("la ventana del video tiene que ser más larga que el tope común");
console.log(`el tope de ${TOPE} minutos y la primera partida:`);
{
  const { ctx, pag } = await telefono();
  await pag.clock.install();
  await abrir(pag, "/jugar");

  (await partidaRapida(pag)) === "directo"
    ? bien("la primera partida de la sesión, sin anuncio")
    : falla("la primera partida llevó anuncio");
  await salirDeLaMesa(pag);

  const casi = TOPE - 1;
  await esperar(pag, casi * MIN);
  (await partidaRapida(pag)) === "directo"
    ? bien(`una partida de ${casi} minutos y otra: sin anuncio`)
    : falla(`a los ${casi} minutos salió un anuncio`);
  await salirDeLaMesa(pag);

  await esperar(pag, 2 * MIN);
  (await partidaRapida(pag)) === "anuncio"
    ? bien(`a los ${casi + 2} minutos: anuncio, y al cerrarlo se llega a la mesa`)
    : falla(`a los ${casi + 2} minutos no salió el anuncio`);
  await salirDeLaMesa(pag);

  await esperar(pag, casi * MIN);
  (await partidaRapida(pag)) === "directo"
    ? bien(`${casi} minutos después de un anuncio: sin anuncio`)
    : falla(`salió otro anuncio a los ${casi} minutos del anterior`);

  // Cambiar de rival a mitad de partida, con el tope cumplido: anuncio ENTRE las dos
  await esperar(pag, (TOPE + 1) * MIN);
  const antes = await cuantos(pag, "mostrado:intersticial");
  await pag.locator('[aria-label*="Tocá para cambiar de rival"]').click();
  await pag.locator("li > button").nth(2).click();
  await pag.waitForTimeout(300);
  (await cuantos(pag, "mostrado:intersticial")) === antes + 1
    ? bien("cambiar de rival a mitad de partida: el anuncio sale entre las dos")
    : falla("cambiar de rival a mitad de partida no pasó por el tope");
  await pag.locator('[data-simulado="Cerrar anuncio"]').click();

  // Y con "Volver" en el selector, no pasa nada
  await esperar(pag, (TOPE + 1) * MIN);
  const antes2 = await cuantos(pag, "mostrar:intersticial");
  await pag.locator('[aria-label*="Tocá para cambiar de rival"]').click();
  await pag.getByRole("button", { name: "Volver" }).click();
  await pag.waitForTimeout(300);
  (await cuantos(pag, "mostrar:intersticial")) === antes2
    ? bien("abrir el selector y volver: ni anuncio ni partida nueva")
    : falla("el selector disparó un anuncio sin elegir rival");
  await ctx.close();
}

console.log(`\nel video, el anotador y los ${VENTANA} minutos:`);
{
  const { ctx, pag } = await telefono();
  await pag.clock.install();
  await abrir(pag, "/");
  await pag.locator('a[href^="/jugar"]').filter({ hasText: /^Jugar$/ }).click();
  await pag.waitForURL(/\/jugar\/?$/);
  await partidaRapida(pag); // la primera
  await salirDeLaMesa(pag);

  // Al anotador, desde la portada
  await pag.locator('header a[href="/"]').first().click();
  await pag.waitForURL((u) => new URL(u).pathname === "/");
  await pag.locator('a[href^="/anotador"]').click();
  await pag.waitForSelector('[role="dialog"] button:has-text("Ver video"):not([disabled])');
  bien("anotador bloqueado: abre el diálogo");

  await pag.getByRole("button", { name: "Ver video" }).click();
  await pag.locator('[data-simulado="Cerrar antes"]').click();
  await esperar(pag, 1500);
  await pag.waitForSelector('[role="dialog"] >> text=antes de que terminara');
  (await guardado(pag, "truco-uy:desbloqueos"))?.anotador === true
    ? falla("cerrar el video antes de tiempo desbloqueó el anotador")
    : bien("video cerrado antes: no desbloquea y lo dice");

  await pag.waitForSelector('[role="dialog"] button:has-text("Ver video"):not([disabled])');
  await pag.getByRole("button", { name: "Ver video" }).click();
  await pag.locator('[data-simulado="Mirar hasta el final"]').click();
  await pag.waitForURL(/\/anotador/);
  (await guardado(pag, "truco-uy:desbloqueos"))?.anotador === true
    ? bien("video completo: desbloqueado, guardado y adentro del anotador")
    : falla("el video completo no dejó el desbloqueo guardado");

  // Para siempre: recargar no lo vuelve a cerrar
  await pag.reload();
  await sinPantallaCarga(pag);
  await pag.waitForTimeout(500);
  ruta(pag) === "/anotador" && !(await pag.locator('[role="dialog"]').count())
    ? bien("después de recargar sigue abierto")
    : falla("al recargar el anotador volvió a estar cerrado");

  // Recargar reinicia la sesión: la primera partida vuelve a ser gratis
  await abrir(pag, "/jugar");
  await partidaRapida(pag);
  await salirDeLaMesa(pag);
  // Un video recién visto: sin intersticial por un rato (se mira otro, el de la Gira)
  await pag.locator('a[href^="/jugar/gira"]').click();
  await pag.waitForSelector('[role="dialog"] >> text=Ir a Aprender');
  bien("Gira bloqueada: diálogo con Ver video / Ir a Aprender / Ahora no");
  await pag.waitForSelector('[role="dialog"] button:has-text("Ver video"):not([disabled])');
  await pag.getByRole("button", { name: "Ver video" }).click();
  await pag.locator('[data-simulado="Mirar hasta el final"]').click();
  await pag.waitForURL(/\/jugar\/gira/);
  bien("Gira desbloqueada con video: lleva al mapa");

  // La flecha "Jugar" del propio mapa (la de la barra está escondida en el mapa)
  await pag.locator('a[href="/jugar/"]:visible, a[href="/jugar"]:visible').first().click();
  await pag.waitForURL(/\/jugar\/?$/);
  // Pasado el tope común pero adentro de la ventana del video: no sale
  await esperar(pag, TOPE * MIN);
  (await partidaRapida(pag)) === "directo"
    ? bien(`${TOPE} minutos después del video: sin intersticial (rige la de ${VENTANA})`)
    : falla(`salió un intersticial dentro de los ${VENTANA} minutos del video`);
  await salirDeLaMesa(pag);
  await esperar(pag, (VENTANA - TOPE) * MIN);
  (await partidaRapida(pag)) === "anuncio"
    ? bien(`pasados los ${VENTANA}: vuelve el intersticial`)
    : falla(`pasados los ${VENTANA} minutos no volvió el intersticial`);
  await ctx.close();
}

console.log("\nsi el anuncio falla, se pasa:");
for (const control of [{ carga: "falla" }, { mostrar: "falla" }, { mostrar: "nunca" }]) {
  const { ctx, pag } = await telefono({ control });
  await pag.clock.install();
  await abrir(pag, "/jugar");
  await partidaRapida(pag);
  await salirDeLaMesa(pag);
  await esperar(pag, (TOPE + 1) * MIN);
  await pag.locator('a[href^="/jugar/mesa"]').first().click();
  if (control.mostrar === "nunca") await esperar(pag, 3500);
  try {
    await pag.waitForURL(/\/jugar\/mesa/, { timeout: 5000 });
    bien(`${JSON.stringify(control)}: entra igual`);
  } catch {
    falla(`${JSON.stringify(control)}: el usuario quedó trabado`);
  }
  await ctx.close();
}

/* La pantalla de carga espera a que las primeras cargas TERMINEN (3/10/2026).
   Antes esperaba sólo el arranque de AdMob, y las cargas seguían cuando ya
   estabas tocando "Jugar". Con cada carga tardando 8 s, la pantalla tiene
   que irse DESPUÉS de las dos (el video también: de entrada la Gira y el
   anotador tienen candado). Sin el reloj de Playwright: tiempo de verdad.

   ¿Por qué 8 s y no algo más corto? Porque en `next dev` no hay prefetch, y
   el paso del código espera hasta su tope (6 s): una demora más corta queda
   tapada por ese paso y la prueba daba bien AUNQUE la pantalla no esperara a
   los anuncios. Se comprobó saboteándola el 3/10/2026: con 2,5 s no lo
   agarraba, con 8 sí. Tiene que quedar entre 6 y 12 (el tope de la pantalla). */
console.log("\nla pantalla de carga espera a los anuncios:");
{
  const { ctx, pag } = await telefono({ control: { demoraCarga: 8000 } });
  await pag.addInitScript(() => {
    let vista = false;
    new MutationObserver(() => {
      const hay = Boolean(document.querySelector("[data-pantalla-carga]"));
      if (hay) vista = true;
      else if (vista) {
        vista = false;
        window.__trucoAnunciosSimulados.registro.push("pantalla-se-fue");
      }
    }).observe(document, { subtree: true, childList: true });
  });
  await pag.goto(`${RAIZ}/`, { waitUntil: "domcontentloaded" });
  await pag.locator("[data-pantalla-carga]").waitFor({ state: "detached", timeout: 15000 });
  const r = await registro(pag);
  const i = (que) => r.indexOf(que);
  const seFue = i("pantalla-se-fue");
  if (seFue < 0) falla(`no se vio irse la pantalla de carga (${r.join(", ")})`);
  else if (i("cargado:intersticial") < 0 || i("cargado:intersticial") > seFue)
    falla(`la pantalla se fue antes de que cargara el intersticial (${r.join(", ")})`);
  else if (i("cargado:video") < 0 || i("cargado:video") > seFue)
    falla(`la pantalla se fue antes de que cargara el video (${r.join(", ")})`);
  else bien(`se fue recién después de las dos cargas: ${r.join(" → ")}`);
  await ctx.close();
}

console.log("\ndoble toque, y Aprender:");
{
  const { ctx, pag } = await telefono();
  await pag.clock.install();
  await abrir(pag, "/jugar");
  await partidaRapida(pag);
  await salirDeLaMesa(pag);
  await esperar(pag, (TOPE + 1) * MIN);
  const enlace = pag.locator('a[href^="/jugar/mesa"]').first();
  await enlace.click();
  await enlace.click({ force: true }).catch(() => {});
  await pag.waitForTimeout(300);
  (await cuantos(pag, "mostrar:intersticial")) === 1
    ? bien("dos toques seguidos: un solo anuncio")
    : falla(`dos toques abrieron ${await cuantos(pag, "mostrar:intersticial")} anuncios`);

  await abrir(pag, "/aprender");
  for (const leccion of ["/aprender/la-baraja", "/aprender/la-flor", "/aprender/el-truco"]) {
    await esperar(pag, 10 * MIN);
    await abrir(pag, leccion);
  }
  (await cuantos(pag, "mostrar:intersticial")) === 0
    ? bien("30 minutos en Aprender: ningún anuncio")
    : falla("salió un anuncio en Aprender");
  await ctx.close();
}

await nav.close();
console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLA(S)`);
process.exit(fallos === 0 ? 0 : 1);
