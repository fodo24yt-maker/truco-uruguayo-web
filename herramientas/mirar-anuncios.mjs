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
 * Desde el 27/10/2026 tiene que ser SIEMPRE "directo": entrar a jugar no
 * lleva anuncio. Si hubiera uno, lo cierra igual para poder seguir.
 */
async function partidaRapida(pag) {
  const antes = await cuantos(pag, "mostrado:intersticial");
  await pag.locator('a[href^="/jugar/mesa"]').first().click();
  await pag.waitForTimeout(300);
  const hubo = (await cuantos(pag, "mostrado:intersticial")) > antes;
  if (hubo) await pag.locator('[data-simulado="Cerrar anuncio"]').click();
  await pag.waitForURL(/\/jugar\/mesa/);
  return hubo ? "anuncio" : "directo";
}

const cartelDeFin = (pag) => pag.locator("button", { hasText: /^Otra contra/i });

/**
 * Juega la partida hasta el final yéndose al mazo, que es lo más corto: unos
 * dos minutos del reloj de mentira (se midió el 27/10/2026: 1,8). Contesta
 * "No quiero" a lo que le canten (o "Me achico", si los dos tienen flor) y
 * pasa los carteles de cada mano.
 */
async function terminarPartida(pag) {
  for (let i = 0; i < 800; i++) {
    if (await cartelDeFin(pag).count()) return;
    const siguiente = pag.getByRole("button", { name: /^Siguiente mano$/i });
    const noQuiero = pag.getByRole("button", { name: /^(No quiero|Me achico)$/i });
    const mazo = pag.locator("button:not([disabled])", { hasText: /^Mazo$/ });
    if (await siguiente.count()) await siguiente.click().catch(() => {});
    else if (await noQuiero.count()) await noQuiero.first().click().catch(() => {});
    else if (await mazo.count()) await mazo.first().click().catch(() => {});
    await pag.clock.fastForward(400);
    await pag.waitForTimeout(30);
  }
  throw new Error("la partida no terminó en 800 pasos");
}

/**
 * Toca un botón del cartel de fin de partida y dice qué pasó: "anuncio" o
 * "directo". Si hubo anuncio, verifica que el cartel siga ahí abajo —que no
 * se haya repartido ni navegado por debajo— y lo cierra.
 */
async function dejarCartel(pag, boton) {
  const antes = await cuantos(pag, "mostrado:intersticial");
  await pag.locator("button", { hasText: boton }).first().click();
  await pag.waitForTimeout(300);
  const hubo = (await cuantos(pag, "mostrado:intersticial")) > antes;
  if (hubo) {
    if (!(await pag.locator("button", { hasText: boton }).count()))
      falla(`con el anuncio en pantalla ya se había seguido por debajo de "${boton}"`);
    await pag.locator('[data-simulado="Cerrar anuncio"]').click();
  }
  await pag.waitForTimeout(300);
  // La traba de 1 s contra el doble toque: con el reloj quieto no se vence sola
  await pag.clock.fastForward(2000);
  return hubo ? "anuncio" : "directo";
}

/** Los minutos del reloj de la página (el del gestor) desde `desde`. */
const minutosDesde = async (pag, desde) => ((await pag.evaluate(() => performance.now())) - desde) / MIN;
const ahora = (pag) => pag.evaluate(() => performance.now());

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
console.log("entrar a jugar nunca lleva anuncio (27/10/2026):");
{
  const { ctx, pag } = await telefono();
  await pag.clock.install();
  await abrir(pag, "/jugar");

  (await partidaRapida(pag)) === "directo"
    ? bien("la primera partida de la sesión, sin anuncio")
    : falla("la primera partida llevó anuncio");
  await salirDeLaMesa(pag);

  await esperar(pag, (TOPE + 1) * MIN);
  (await partidaRapida(pag)) === "directo"
    ? bien(`entrar con el tope de ${TOPE} minutos cumplido: sin anuncio`)
    : falla("entrar desde el menú llevó anuncio");

  // Cambiar de rival a mitad de partida, con el tope cumplido: tampoco
  await esperar(pag, (TOPE + 1) * MIN);
  const antes = await cuantos(pag, "mostrar:intersticial");
  await pag.locator('[aria-label*="Tocá para cambiar de rival"]').click();
  await pag.locator("li > button").nth(2).click();
  await pag.waitForTimeout(300);
  (await cuantos(pag, "mostrar:intersticial")) === antes
    ? bien("cambiar de rival a mitad de partida: sin anuncio")
    : falla("cambiar de rival a mitad de partida llevó anuncio");

  // Y con "Volver" en el selector, no pasa nada
  await esperar(pag, 2000);
  await pag.locator('[aria-label*="Tocá para cambiar de rival"]').click();
  await pag.getByRole("button", { name: "Volver" }).click();
  await pag.waitForTimeout(300);
  (await cuantos(pag, "mostrar:intersticial")) === antes
    ? bien("abrir el selector y volver: ni anuncio ni partida nueva")
    : falla("el selector disparó un anuncio sin elegir rival");
  await ctx.close();
}

console.log(`\nel cartel de fin de partida y el tope de ${TOPE} minutos:`);
{
  const { ctx, pag } = await telefono();
  await pag.clock.install();
  await abrir(pag, "/jugar");
  const abierta = await ahora(pag);
  await partidaRapida(pag);

  await terminarPartida(pag);
  if ((await minutosDesde(pag, abierta)) >= TOPE) falla("la primera partida tardó más que el tope: no se puede probar el 'no'");
  else
    (await dejarCartel(pag, /^Otra contra/i)) === "directo"
      ? bien(`una partida de menos de ${TOPE} minutos y otra: sin anuncio`)
      : falla(`salió un anuncio antes de los ${TOPE} minutos`);

  await terminarPartida(pag); // ya van más de TOPE desde que se abrió
  if ((await dejarCartel(pag, /^Otra contra/i)) !== "anuncio") falla("pasado el tope, 'Otra contra…' no llevó anuncio");
  else {
    await pag.waitForTimeout(300);
    (await cartelDeFin(pag).count()) === 0
      ? bien("pasado el tope: anuncio al dejar el cartel, y al cerrarlo se reparte la nueva")
      : falla("después del anuncio no se repartió la partida nueva");
  }
  const tras = await ahora(pag);

  await terminarPartida(pag);
  if ((await minutosDesde(pag, tras)) >= TOPE) falla("la partida tardó más que el tope: no se puede probar el 'no'");
  else
    (await dejarCartel(pag, /^Cambiar de rival$/i)) === "directo"
      ? bien(`menos de ${TOPE} minutos después de un anuncio: sin anuncio`)
      : falla(`salió otro anuncio antes de ${TOPE} minutos del anterior`);
  await pag.getByRole("button", { name: "Volver" }).click(); // del selector, al cartel

  await esperar(pag, TOPE * MIN);
  (await dejarCartel(pag, /^Cambiar de rival$/i)) === "anuncio"
    ? bien("'Cambiar de rival' con el tope cumplido: el anuncio sale ANTES del selector")
    : falla("'Cambiar de rival' con el tope cumplido no llevó anuncio");
  (await pag.locator("text=¿Contra quién jugás?").count())
    ? bien("al cerrarlo se abre el selector")
    : falla("después del anuncio no apareció el selector de rival");
  const antes = await cuantos(pag, "mostrar:intersticial");
  await pag.locator("li > button").nth(2).click();
  await pag.waitForTimeout(300);
  (await cuantos(pag, "mostrar:intersticial")) === antes
    ? bien("elegir el rival después ya no lleva otro")
    : falla("elegir rival después del anuncio llevó otro");
  await ctx.close();
}

console.log("\nla Gira: 'Volver al mapa' también deja el cartel:");
{
  const { ctx, pag } = await telefono({
    guardado: { "truco-uy:desbloqueos": { version: 1, anotador: false, gira: true } },
  });
  await pag.clock.install();
  await abrir(pag, "/jugar/gira");
  // La ficha de la parada se abre tocando el departamento en el mapa
  await pag.locator('[role="button"][aria-label^="Paso 1:"]').click();
  await pag.locator('a[href^="/jugar/mesa"][href*="depto="]').first().click();
  await pag.waitForURL(/\/jugar\/mesa/);
  bien("entrar desde el mapa: directo, sin anuncio");
  await esperar(pag, (TOPE + 1) * MIN);
  await terminarPartida(pag);
  (await dejarCartel(pag, /^Volver al mapa$/i)) === "anuncio"
    ? bien("'Volver al mapa' con el tope cumplido: anuncio")
    : falla("'Volver al mapa' con el tope cumplido no llevó anuncio");
  await pag.waitForURL(/\/jugar\/gira/, { timeout: 5000 }).then(
    () => bien("y al cerrarlo se llega al mapa"),
    () => falla("después del anuncio no se volvió al mapa"),
  );
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
  const video = await ahora(pag);
  await partidaRapida(pag);
  // Pasado el tope común pero adentro de la ventana del video: no sale
  await esperar(pag, TOPE * MIN);
  await terminarPartida(pag);
  if ((await minutosDesde(pag, video)) >= VENTANA) falla("la partida tardó demasiado: no se puede probar la ventana del video");
  else
    (await dejarCartel(pag, /^Otra contra/i)) === "directo"
      ? bien(`más de ${TOPE} minutos después del video: sin intersticial (rige la de ${VENTANA})`)
      : falla(`salió un intersticial dentro de los ${VENTANA} minutos del video`);
  await esperar(pag, (VENTANA - TOPE) * MIN);
  await terminarPartida(pag);
  (await dejarCartel(pag, /^Otra contra/i)) === "anuncio"
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
  await esperar(pag, (TOPE + 1) * MIN);
  await terminarPartida(pag);
  await cartelDeFin(pag).click();
  if (control.mostrar === "nunca") await esperar(pag, 3500);
  await pag.waitForTimeout(500);
  (await cartelDeFin(pag).count()) === 0
    ? bien(`${JSON.stringify(control)}: se reparte la nueva igual`)
    : falla(`${JSON.stringify(control)}: el usuario quedó trabado en el cartel`);
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
  await esperar(pag, (TOPE + 1) * MIN);
  await terminarPartida(pag);
  const boton = cartelDeFin(pag);
  await boton.click();
  await boton.click({ force: true }).catch(() => {});
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
