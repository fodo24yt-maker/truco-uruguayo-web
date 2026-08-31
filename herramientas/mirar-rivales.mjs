/**
 * Mira a los diecinueve rivales, uno por uno, en la mesa de verdad.
 *
 *     npm run dev                              (en otra terminal)
 *     node herramientas/mirar-rivales.mjs      # los 19
 *     node herramientas/mirar-rivales.mjs montevideo rocha   # sólo esos
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────
 *
 * "Mirar los 19 departamentos" quedó de pendiente en tres sesiones seguidas, y
 * siempre por lo mismo: a mano son diecinueve idas y vueltas al navegador, así
 * que nunca se hace y las escenas se dan por buenas sin haberlas visto. Con
 * esto es un comando.
 *
 * Y sirve para lo único que decide si el rediseño anduvo: **poner a varios uno
 * al lado del otro y ver si se distinguen sin leer el nombre.** Al rival no se
 * le ve la cara —queda fuera del encuadre—, así que lo que tiene que
 * distinguirlo es la ropa: el buzo del pibe de Montevideo contra el poncho del
 * gaucho de Tacuarembó. Si en la tira salen todos iguales, el sistema no anda,
 * por más que cada uno mirado solo se vea bien.
 *
 * Deja las capturas en `capturas/rivales/`, que está en .gitignore.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { EN_ORDEN, slugDepartamento } from "../lib/gira.ts";

const SALIDA = path.join("capturas", "rivales");
/** Un celular: es donde la escena va más justa y donde primero se rompe algo. */
const TAMANO = { width: 390, height: 844 };

/** Los cuatro que más contrastan. Si estos no se distinguen, no lo hace ninguno. */
const CONTRASTE = ["montevideo", "canelones", "treinta-y-tres", "tacuarembo"];

const pedidos = process.argv.slice(2);
const paradas = EN_ORDEN.map((p) => ({
  slug: slugDepartamento(p.departamento),
  nombre: p.nombre,
  departamento: p.departamento,
})).filter((p) => pedidos.length === 0 || pedidos.includes(p.slug));

if (paradas.length === 0) {
  console.error(`Ningún departamento coincide. Los slugs son:\n  ${EN_ORDEN.map((p) => slugDepartamento(p.departamento)).join(", ")}`);
  process.exit(1);
}

await mkdir(SALIDA, { recursive: true });
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: TAMANO });
const pag = await ctx.newPage();

for (const parada of paradas) {
  await pag.goto(`http://localhost:3000/jugar/mesa?depto=${parada.slug}`, {
    waitUntil: "domcontentloaded",
  });
  // El cartel de errores de Next se mete en la captura y no es parte del juego.
  await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  // Esperar a que termine el reparto: si no, las cartas están viajando.
  await pag.waitForTimeout(2600);

  await pag.screenshot({ path: path.join(SALIDA, `${parada.slug}.png`) });
  console.log(`  ${parada.slug.padEnd(16)} ${parada.nombre}`);
}

await ctx.close();
await nav.close();

/* La tira de contraste: los cuatro pegados, para mirarlos juntos. Se arma sólo
   si se corrieron todos, porque si no faltan piezas. */
if (pedidos.length === 0) {
  const { default: sharp } = await import("sharp");
  const anchos = [];
  const piezas = [];
  for (const slug of CONTRASTE) {
    const archivo = path.join(SALIDA, `${slug}.png`);
    piezas.push({ input: archivo, left: anchos.reduce((a, b) => a + b, 0), top: 0 });
    anchos.push(TAMANO.width);
  }
  await sharp({
    create: {
      width: TAMANO.width * CONTRASTE.length,
      height: TAMANO.height,
      channels: 3,
      background: "#15100a",
    },
  })
    .composite(piezas)
    .png()
    .toFile(path.join(SALIDA, "contraste.png"));
  console.log(`\ntira de contraste: ${path.join(SALIDA, "contraste.png")}`);
}

console.log(`\n${paradas.length} capturas en ${SALIDA}/`);
