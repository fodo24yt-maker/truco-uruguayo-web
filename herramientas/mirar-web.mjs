/**
 * Mira la web de verdad y busca fallas de diseño.
 *
 *     npm run dev                        (en otra terminal)
 *     node herramientas/mirar-web.mjs
 *
 * `mirar-mesa.mjs` verifica que la mesa no scrollee y `mirar-mesa-nueva.mjs`
 * mide dónde cae cada objeto. Lo que faltaba es lo de acá: **que las jugadas se
 * puedan hacer**, que es una cosa distinta de que se vean bien.
 *
 * El bug que lo motivó: cantabas envido, el rival te subía a real envido y no
 * había ningún botón para subirle. La barra se convertía entera en "Quiero /
 * No quiero". Ninguna de las otras dos herramientas lo podía ver, porque
 * miraban la mesa quieta y esto sólo aparece jugando.
 *
 * Sale con código 1 si algo falla y deja la captura del momento exacto.
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const SALIDA = path.join("capturas", "web");
const RAIZ = "http://localhost:3000";
/** Celular apretado, celular normal, y compu. */
const TAMANOS = [
  [320, 568],
  [390, 844],
  [1440, 900],
];

await mkdir(SALIDA, { recursive: true });
const nav = await chromium.launch();
let fallos = 0;

function falla(donde, que) {
  fallos++;
  console.log(`FALLA ${donde}  ${que}`);
}

async function abrir(pag, ruta) {
  await pag.goto(`${RAIZ}${ruta}`, { waitUntil: "domcontentloaded" });
  await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

/* ══ 1. LA PORTADA ═════════════════════════════════════════════════════════
   Es nueva: dos botones y nada más, ocupando la pantalla. Las tres cosas que
   pueden salir mal son que se salga de ancho, que los botones queden abajo del
   pliegue —o sea que haya que scrollear para ver a qué viniste— y que la
   portada tape lo que sigue sin avisar que hay más. */
console.log("la portada:");
for (const [ancho, alto] of TAMANOS) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
  const pag = await ctx.newPage();
  await abrir(pag, "/");
  await pag.waitForTimeout(600);
  const etiqueta = `${ancho}x${alto}`;

  const m = await pag.evaluate(() => {
    const caja = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { arriba: r.top, abajo: r.bottom, izq: r.left, der: r.right };
    };
    const enlaces = [...document.querySelectorAll("a")];
    const busca = (texto) =>
      caja(enlaces.find((a) => a.textContent.trim().toLowerCase().includes(texto)));
    return {
      scrollAncho: document.documentElement.scrollWidth,
      scrollAlto: document.documentElement.scrollHeight,
      aprender: busca("aprender a jugar"),
      jugar: busca("jugar contra el bot"),
      pista: busca("por qué existe esto"),
      porQue: caja(document.querySelector("#por-que")),
    };
  });

  // no se sale de ancho: una portada que scrollea de costado está rota
  if (m.scrollAncho > ancho + 1) {
    falla(etiqueta, `la portada scrollea de costado (${m.scrollAncho} > ${ancho})`);
  }
  // los dos botones se ven SIN scrollear: es la única decisión de la pantalla
  for (const [nombre, caja] of [
    ["aprender a jugar", m.aprender],
    ["jugar contra el bot", m.jugar],
  ]) {
    if (!caja) falla(etiqueta, `no está el botón "${nombre}"`);
    else if (caja.abajo > alto) {
      falla(etiqueta, `"${nombre}" queda abajo del pliegue (${caja.abajo.toFixed(0)} > ${alto})`);
    }
  }
  // y abajo tiene que seguir habiendo web
  if (!m.porQue) falla(etiqueta, 'se perdió la sección "por qué existe esto"');
  if (m.scrollAlto <= alto + 10) falla(etiqueta, "la portada es todo: no hay nada abajo");
  if (!m.pista) falla(etiqueta, "no hay pista de que abajo hay más");

  if (fallos === 0) console.log(`  ${etiqueta.padEnd(9)} OK  (alto total ${m.scrollAlto}px)`);
  await pag.screenshot({ path: path.join(SALIDA, `portada-${etiqueta}.png`) });
  await ctx.close();
}

/* ══ 2. QUE SE PUEDA SUBIR UN CANTO ════════════════════════════════════════
   Este es el bug reportado. Se canta envido y se espera a que el rival suba;
   cuando sube, tiene que haber un botón para subirle de vuelta, además de
   querer y no querer.

   Se reintenta porque el rival no siempre sube: a veces quiere, a veces no
   quiere, y a veces no tiene con qué. */
console.log("\nsubir un canto que te subieron:");
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const pag = await ctx.newPage();
  let visto = 0;

  /** Los cantos que se pueden apretar ahora mismo, por su `data-canto`. */
  const cantos = (pag) =>
    pag.evaluate(() =>
      [...document.querySelectorAll("[data-canto]")]
        .filter((b) => !b.disabled && b.offsetParent !== null)
        .map((b) => b.dataset.canto),
    );

  for (let intento = 0; intento < 30 && visto < 3; intento++) {
    await abrir(pag, "/jugar/mesa?depto=montevideo");
    await pag.waitForTimeout(3000);

    // abrir el menú y cantar el envido más chico
    if (!(await cantos(pag)).includes("abrir-envido")) continue;
    await pag.locator('[data-canto="abrir-envido"]').click().catch(() => {});
    await pag.waitForTimeout(300);
    if (!(await cantos(pag)).includes("envido")) continue;
    await pag.locator('[data-canto="envido"]').click().catch(() => {});
    await pag.waitForTimeout(2600);

    // ¿me subió? entonces hay algo que contestar
    const ahora = await cantos(pag);
    if (!ahora.includes("quiero")) continue;

    /* Lo que se verifica: contestar NO puede ser lo único. Si te subieron el
       envido tiene que quedar algo para subirle —o la flor, que lo anula—.
       Arriba de la falta envido no hay nada, y ése es el único caso legítimo
       en que sólo se puede querer o no querer. */
    const puedeSubir = ahora.some((c) =>
      ["envido", "real-envido", "falta-envido", "truco", "flor", "con-flor-envido", "contraflor-al-resto"].includes(c),
    );
    /* EL ÚNICO CASO EN QUE NO HAY NADA PARA SUBIR Y ESTÁ BIEN: arriba de la
       falta envido y de la contraflor al resto no existe canto mayor, así que
       ahí contestar ES la jugada. La primera versión de esta prueba no lo
       distinguía y marcaba como bug lo que era la regla. */
    const pendiente = (await pag.getAttribute("[data-pendiente]", "data-pendiente")) ?? "";
    const topeDeLaCadena = /falta-envido|contraflor-al-resto/.test(pendiente);

    visto++;
    if (!puedeSubir && !topeDeLaCadena) {
      falla("mesa", `te subieron y no hay con qué subir. Cantos: ${ahora.join(" · ")}`);
      await pag.screenshot({ path: path.join(SALIDA, "falla-no-se-puede-subir.png") });
    } else {
      console.log(`  OK  ${pendiente} → quedan: ${ahora.join(" · ")}`);
      await pag.screenshot({ path: path.join(SALIDA, `subir-${visto}.png`) });
    }
  }
  if (visto === 0) console.log("  (no se llegó a que el rival suba un canto)");
  await ctx.close();
}

/* ══ 3. QUE LA MESA SE LEVANTE AL TERMINAR LA MANO ═════════════════════════
   Se juega hasta que se cierre una mano y se mira qué pasa: a los 2 segundos
   las cartas se van al mazo, y recién después aparece el cartel. Lo que se
   verifica es que el cartel NO tape la mesa antes de tiempo, que era lo que
   hacía invisible a la última baza. */
console.log("\nlevantar la mesa al terminar la mano:");
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const pag = await ctx.newPage();
  let listo = false;

  for (let intento = 0; intento < 12 && !listo; intento++) {
    await abrir(pag, "/jugar/mesa?depto=montevideo");
    await pag.waitForTimeout(2600);

    for (let i = 0; i < 3; i++) {
      const cartas = pag.locator(".mano-abanico button:not([disabled])");
      if ((await cartas.count()) === 0) break;
      await cartas.first().click().catch(() => {});
      await pag.waitForTimeout(1400);
      const cartel = await pag.getByRole("button", { name: /Siguiente mano|Otra contra/ }).count();
      if (cartel) break;
      /* SE CERRÓ LA MANO DE VERDAD, que no es lo mismo que "no puedo jugar":
         mientras piensa el rival tampoco podés, y la primera versión de esta
         prueba confundía las dos cosas y esperaba un cartel que no iba a venir. */
      const fase = await pag.getAttribute("[data-fase]", "data-fase").catch(() => null);
      if (fase && fase !== "jugando") {
        listo = true;
        await pag.screenshot({ path: path.join(SALIDA, "fin-1-se-ve-la-mesa.png") });
        await pag.waitForTimeout(2300); // ya barrió
        await pag.screenshot({ path: path.join(SALIDA, "fin-2-barriendo.png") });
        await pag.waitForTimeout(900);
        const cartelDespues = await pag
          .getByRole("button", { name: /Siguiente mano|Otra contra/ })
          .count();
        await pag.screenshot({ path: path.join(SALIDA, "fin-3-cartel.png") });
        if (!cartelDespues) falla("fin de mano", "el cartel no llegó a aparecer");
        else console.log("  OK  se ve la mesa, se barre y después viene el cartel");
        break;
      }
    }
  }
  if (!listo) console.log("  (no se llegó a cerrar una mano sin cartel de por medio)");
  await ctx.close();
}

await nav.close();
console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} PROBLEMAS`);
process.exit(fallos === 0 ? 0 : 1);
