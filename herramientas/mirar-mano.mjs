/**
 * Filma tu mano y lo que se enseña al cerrar la mano, para MIRARLO.
 *
 *     npm run dev                                   (en otra terminal)
 *     node herramientas/mirar-mano.mjs [etiqueta]
 *
 * Deja todo en `capturas/mano/` (ignorado por Git), con la etiqueta en el
 * nombre —`antes`, `despues`— para poder ponerlas lado a lado.
 *
 * ── Por qué existe (9/10/2026) ───────────────────────────────────────────
 *
 * Santiago vio que "la mano se mueve del lugar" al repartir y al terminar la
 * mano, y que las cartas enseñadas caían encima del mazo. Las dos cosas pasan
 * en MOVIMIENTO y en momentos que las otras herramientas no fotografían:
 * `mirar-mesa-nueva.mjs` mide la mesa quieta y con cartas puestas.
 *
 * Esto no falla ni aprueba: saca las fotos y, del reparto, imprime cuánto se
 * apartó el centro de cada pieza de la mano de donde termina. Los guardianes
 * que fallan están en `mirar-mesa-nueva.mjs`.
 *
 *   1. EL REPARTO, cuadro a cuadro: la tira y el centro de la palma y del pulgar.
 *   2. LA MANO VACÍA: lo que queda abajo después de tirar la última carta.
 *   3. LO QUE SE ENSEÑA CON EL MAZO A LA DERECHA: se juega la primera mano
 *      yéndose al mazo, y en la segunda —que tiene el mazo a la derecha— se
 *      canta el envido y se vuelve a ir al mazo, hasta que alguien enseñe.
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";
import sharp from "sharp";

const SALIDA = path.join("capturas", "mano");
const RAIZ = "http://localhost:3000";
const ETIQUETA = (process.argv[2] ?? "ahora").replace(/[^a-z0-9-]/gi, "");
const [ANCHO, ALTO] = [390, 844];

await mkdir(SALIDA, { recursive: true });
const nav = await chromium.launch();

async function abrir(pag) {
  await pag.goto(`${RAIZ}/jugar/mesa?depto=montevideo`, { waitUntil: "domcontentloaded" });
  await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

/** Las dos piezas de la mano. Con el agarre nuevo o, si no está, por su capa. */
const PIEZAS = () =>
  [
    ["palma", document.querySelector('[data-pieza="dedos"]') ?? document.querySelector('[data-mano="tuya"] span.z-0')],
    ["pulgar", document.querySelector('[data-pieza="pulgar"]') ?? document.querySelector('[data-mano="tuya"] span.z-20')],
  ].map(([que, el]) => {
    if (!el) return { que, hay: false };
    const r = el.getBoundingClientRect();
    return { que, hay: true, x: (r.left + r.right) / 2, abajo: r.bottom, ancho: r.width };
  });

/** Pega cuadros en una tira de dos filas. */
async function tira(cuadros, archivo) {
  const medidas = await Promise.all(cuadros.map((c) => sharp(c).metadata()));
  const w = Math.max(...medidas.map((m) => m.width));
  const h = Math.max(...medidas.map((m) => m.height));
  const porFila = Math.ceil(cuadros.length / 2);
  await sharp({ create: { width: w * porFila, height: h * 2, channels: 3, background: "#15100a" } })
    .composite(cuadros.map((input, i) => ({ input, left: (i % porFila) * w, top: Math.floor(i / porFila) * h })))
    .png()
    .toFile(archivo);
  console.log(`  ${archivo}`);
}

const ctx = await nav.newContext({ viewport: { width: ANCHO, height: ALTO } });
const pag = await ctx.newPage();

/* ── 1. El reparto ─────────────────────────────────────────────────────── */
console.log("1. el reparto (cada cuadro, ~60 ms):");
{
  await abrir(pag);
  await pag.waitForSelector(".mano-abanico", { timeout: 15000 });
  const muestras = [];
  const cuadros = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 1500) {
    muestras.push({ t: Date.now() - t0, piezas: await pag.evaluate(PIEZAS) });
    if (cuadros.length < 12) {
      cuadros.push(await pag.screenshot({ clip: { x: 0, y: ALTO - 330, width: ANCHO, height: 330 } }));
    }
  }
  const final = await pag.evaluate(PIEZAS);
  for (const pieza of ["palma", "pulgar"]) {
    const fin = final.find((p) => p.que === pieza);
    const desvios = muestras
      .map((m) => m.piezas.find((p) => p.que === pieza))
      .filter((p) => p?.hay)
      .map((p) => Math.abs(p.x - fin.x));
    console.log(
      `  ${pieza.padEnd(6)} se apartó hasta ${Math.max(0, ...desvios).toFixed(0)} px de su centro final ` +
        `(${desvios.length} muestras)`,
    );
  }
  await tira(cuadros, path.join(SALIDA, `reparto-${ETIQUETA}.png`));
}

/* ── 2. La mano vacía ───────────────────────────────────────────────────── */
console.log("2. después de tirar la última carta:");
{
  let foto = null;
  for (let intento = 0; intento < 10 && !foto; intento++) {
    await abrir(pag);
    await pag.waitForTimeout(2600);
    for (let i = 0; i < 3; i++) {
      const cartas = pag.locator(".mano-abanico button:not([disabled])");
      if ((await cartas.count()) === 0) break;
      await cartas.first().click().catch(() => {});
      await pag.waitForTimeout(i < 2 ? 2200 : 500);
    }
    if ((await pag.locator(".mano-abanico button").count()) === 0) {
      foto = await pag.screenshot({ clip: { x: 0, y: ALTO - 330, width: ANCHO, height: 330 } });
      const piezas = await pag.evaluate(PIEZAS);
      console.log(`  piezas montadas: ${piezas.filter((p) => p.hay).map((p) => p.que).join(", ") || "ninguna"}`);
    }
  }
  if (foto) {
    const archivo = path.join(SALIDA, `mano-vacia-${ETIQUETA}.png`);
    await sharp(foto).toFile(archivo);
    console.log(`  ${archivo}`);
  } else console.log("  (no se llegó a tirar las tres)");
}

/* ── 3. Lo que se enseña, con el mazo a la derecha ──────────────────────── */
console.log("3. lo que se enseña con el mazo a la derecha:");
{
  const cantos = () =>
    pag.evaluate(() =>
      [...document.querySelectorAll("[data-canto]")]
        .filter((b) => !b.disabled && b.offsetParent !== null)
        .map((b) => b.dataset.canto),
    );
  const apretar = async (canto, espera = 1500) => {
    await pag.locator(`[data-canto="${canto}"]`).first().click().catch(() => {});
    await pag.waitForTimeout(espera);
  };
  const ladoDelMazo = () =>
    pag.evaluate(() => {
      const m = document.querySelector('[data-mesa="mazo"]')?.getBoundingClientRect();
      const t = document.querySelector('[data-mesa="tabla"]')?.getBoundingClientRect();
      if (!m || !t) return null;
      return (m.left + m.right) / 2 > (t.left + t.right) / 2 ? "derecha" : "izquierda";
    });
  const siguiente = async () => {
    const boton = pag.getByRole("button", { name: /Siguiente mano|Otra contra/ });
    await boton.waitFor({ timeout: 8000 }).catch(() => {});
    await boton.click().catch(() => {});
    await pag.waitForTimeout(2600);
  };

  let visto = false;
  await abrir(pag);
  await pag.waitForTimeout(2600);
  for (let mano = 0; mano < 24 && !visto; mano++) {
    if ((await ladoDelMazo()) !== "derecha") {
      // esta mano no sirve: irse al mazo y pasar a la siguiente
      if ((await cantos()).includes("quiero")) await apretar("no-quiero");
      await apretar("irse-al-mazo", 400);
      await siguiente();
      continue;
    }
    let hay = await cantos();
    if (hay.includes("flor")) await apretar("flor");
    else if (hay.includes("abrir-envido")) {
      await apretar("abrir-envido", 300);
      await apretar("envido");
    }
    if ((await cantos()).includes("quiero")) await apretar("quiero");
    hay = await cantos();
    if (hay.includes("quiero")) await apretar("quiero");
    await apretar("irse-al-mazo", 1100);
    const cuantas = await pag.locator('[data-mesa="baza-enseñada"]').count();
    if (cuantas > 0) {
      visto = true;
      const archivo = path.join(SALIDA, `ensenadas-mazo-derecha-${ETIQUETA}.png`);
      await pag.screenshot({ path: archivo });
      console.log(`  ${cuantas} cartas enseñadas → ${archivo}`);
    } else await siguiente();
  }
  if (!visto) console.log("  (no salió en 24 manos)");
}

await nav.close();
