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

import { ambienteDe } from "../lib/ambientes.ts";
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
let fallos = 0;
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

/* ── QUE EL MARCO CIERRE, EN LOS SIETE AMBIENTES ────────────────────────────
   Esto es lo que estaba roto y no lo veía ninguna herramienta: los seis
   ambientes de día dejaban el cielo pálido llegando hasta el borde del
   encuadre, y contra el negro de la pantalla se leía un panel gris pegado al
   costado. `bar-ciudad` no, porque era el único con `deNoche` y a ése el marco
   sí le cerraba.

   VA A UN TAMAÑO DE COMPUTADORA Y NO AL CELULAR de las capturas de arriba, y
   no es un detalle: en el celular la escena ocupa el ancho entero, no hay
   marco negro contra el cual el borde pueda desentonar, y encima
   `object-cover` recorta justo los costados del fondo. El defecto sólo existe
   donde hay marco.

   El criterio es una comparación y no un número inventado: la franja de borde
   del fondo tiene que quedar TAN OSCURA COMO EL MARCO o más. Si queda más
   clara, hay un escalón visible y es exactamente lo que se reportó. */
console.log("\nel cierre del marco, uno por ambiente (a 1266x841):");
{
  const TAMANO_PC = { width: 1266, height: 841 };
  /* Un departamento por ambiente: son 7 páginas y no 19. El primero de
     `EN_ORDEN` que caiga en cada ambiente, así el orden es el de la gira. */
  const porAmbiente = new Map();
  for (const p of EN_ORDEN) {
    const clave = ambienteDe(p.departamento).clave;
    if (!porAmbiente.has(clave)) porAmbiente.set(clave, slugDepartamento(p.departamento));
  }

  const { default: sharp } = await import("sharp");
  const nav2 = await chromium.launch();
  const ctx2 = await nav2.newContext({ viewport: TAMANO_PC });
  const pag2 = await ctx2.newPage();

  for (const [clave, slug] of porAmbiente) {
    await pag2.goto(`http://localhost:3000/jugar/mesa?depto=${slug}`, {
      waitUntil: "domcontentloaded",
    });
    await pag2.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await pag2.waitForTimeout(2600);

    /* Dónde está la escena y dónde el fondo, preguntado y no supuesto: el tope
       de ancho es `min(1180px, 158vh)` y cambia con el alto de la ventana. */
    const caja = await pag2.evaluate(() => {
      const escena = document.querySelector(".penumbra");
      const fondo = document.querySelector(".penumbra > div:nth-child(2)");
      const e = escena.getBoundingClientRect();
      const f = fondo.getBoundingClientRect();
      return { x: Math.round(e.x), ancho: Math.round(e.width), abajo: Math.round(f.bottom), arriba: Math.round(f.top) };
    });
    if (caja.x < 20) {
      console.log(`  ${clave.padEnd(11)} sin marco a los costados: no aplica`);
      continue;
    }
    const foto = await pag2.screenshot();
    /* La franja de ABAJO del fondo, que es la que se ve en las dos pantallas.
       Y el medallón vive arriba a la derecha, así que se lo esquiva midiendo
       del medio del fondo para abajo. */
    const arriba = Math.round((caja.arriba + caja.abajo) / 2);
    const alto = Math.max(8, caja.abajo - arriba - 6);
    const luma = async (izquierda, ancho) => {
      const buf = await sharp(foto).extract({ left: izquierda, top: arriba, width: ancho, height: alto }).png().toBuffer();
      const [r, g, b] = (await sharp(buf).stats()).channels.slice(0, 3).map((c) => c.mean);
      return 0.2 * r + 0.7 * g + 0.1 * b;
    };
    const ANCHO_BORDE = 120;
    const marco = await luma(4, Math.min(24, caja.x - 6));
    const izq = await luma(caja.x + 2, ANCHO_BORDE);
    const der = await luma(caja.x + caja.ancho - ANCHO_BORDE - 2, ANCHO_BORDE);
    const peor = Math.max(izq, der);
    if (peor > marco + 1) {
      fallos++;
      console.log(
        `FALLA ${clave.padEnd(11)} el borde del fondo (izq ${izq.toFixed(0)}, der ${der.toFixed(0)})` +
          ` queda MÁS CLARO que el marco (${marco.toFixed(0)}): se ve el escalón`,
      );
      await pag2.screenshot({ path: path.join(SALIDA, `falla-marco-${clave}.png`) });
    } else {
      console.log(
        `  ${clave.padEnd(11)} OK  borde ${izq.toFixed(0)}/${der.toFixed(0)} contra marco ${marco.toFixed(0)}`,
      );
    }
  }
  await ctx2.close();
  await nav2.close();
}

console.log(`\n${paradas.length} capturas en ${SALIDA}/`);
if (fallos) {
  console.log(`\n${fallos} PROBLEMAS`);
  process.exitCode = 1;
}
