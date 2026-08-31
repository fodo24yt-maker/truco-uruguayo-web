/**
 * Genera las texturas de la mesa: public/escenas/*.webp y lib/escenas.ts
 *
 *     node herramientas/generar-escena.mjs             # los siete ambientes
 *     node herramientas/generar-escena.mjs bar-ciudad  # uno solo
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────
 *
 * El rediseño del nivel se frenó contra un techo: las referencias son una FOTO
 * de una mesa, y lo que había era una interfaz apoyada sobre un fondo. Lo que
 * falta para cruzar esa distancia —madera con nudos y rayones, tres capas de
 * profundidad, perspectiva de verdad— son decenas de filtros SVG sobre toda la
 * pantalla. Dibujarlos EN VIVO, en cada cuadro, arrastra cualquier celular.
 *
 * Así que se dibujan UNA VEZ, acá, y el navegador recibe una imagen.
 *
 * Sigue siendo arte nuestro: lo dibuja el código de `escena/`, igual que
 * `generar-mapa.mjs` dibuja el mapa. No entra una imagen de nadie más, que es
 * lo que importa en un repositorio público.
 *
 * ── Las tres pasadas ─────────────────────────────────────────────────────
 *
 * 1. LA MADERA, PLANA. El SVG de `escena/madera.mjs`, mirado desde arriba.
 * 2. LA CÁMARA. Chromium inclina esa imagen con `perspective` + `rotateX`, que
 *    es una transformación PROYECTIVA de verdad: la veta se junta hacia el
 *    fondo sola. No se puede hacer con `sharp` —su `affine` es afín, no
 *    proyectiva— ni escribiendo el SVG ya torcido sin deformar a mano cada nudo.
 *    Por eso el horneado pasa por un navegador y no sólo por una librería.
 * 3. EL REMUESTREO. `sharp` baja de 2800px a 1400px con Lanczos. Ese
 *    sobremuestreo 2× es lo que le da el grano fotográfico: cada píxel final es
 *    el promedio de cuatro, como en una foto de verdad.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import sharp from "sharp";

import { AMBIENTES } from "../lib/ambientes.ts";
import { maderaPlana } from "./escena/madera.mjs";
import { fondoPlano } from "./escena/fondo.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");
const SALIDA = path.join(RAIZ, "public", "escenas");

/* ── La cámara ────────────────────────────────────────────────────────────────
   Los números salen de querer tres cosas a la vez:
     · el borde lejano de la mesa cae justo arriba del cuadro,
     · ese borde mide el 62% del cercano (la mesa se angosta, se nota),
     · el borde cercano se pasa del cuadro, así la mesa llena el ancho abajo.

   Con inclinación θ y alto del cuadro Hc, el plano tiene que medir Hc/cos(θ) de
   fondo para que su punta caiga en el borde de arriba; y la perspectiva P sale
   de pedirle al lejano que mida 0,62 del cercano. Cambiar uno obliga a recalcular
   los otros dos: por eso están juntos y con la cuenta escrita. */
const CUADRO = { ancho: 2800, alto: 1800 };
const INCLINACION = 58; // grados
const PLANO = {
  ancho: 3600, // más ancho que el cuadro: abajo la mesa se sale, como en la referencia
  alto: Math.round(CUADRO.alto / Math.cos((INCLINACION * Math.PI) / 180)), // 3397
};
/** P tal que el borde lejano quede al 62% del ancho del cercano. */
const RATIO_LEJOS = 0.62;
const PERSPECTIVA = Math.round(
  (RATIO_LEJOS * PLANO.alto * Math.sin((INCLINACION * Math.PI) / 180)) / (1 - RATIO_LEJOS),
);

/** Lo que se versiona: la mitad de lo que se rinde. */
const FINAL_MESA = { ancho: 1400, alto: 900 };
const FINAL_FONDO = { ancho: 1200, alto: 450 };

const aDataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** Rinde un SVG suelto, tal cual, al tamaño que dice su propio viewBox. */
async function rendir(navegador, svg, ancho, alto) {
  const pag = await navegador.newPage({ viewport: { width: ancho, height: alto } });
  await pag.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}</style>${svg}`,
    { waitUntil: "load" },
  );
  const png = await pag.screenshot({ omitBackground: true });
  await pag.close();
  return png;
}

/**
 * Inclina la madera plana con la cámara.
 *
 * `omitBackground` es lo que deja TRANSPARENTE lo que queda fuera del trapecio:
 * arriba a la izquierda y a la derecha, donde la mesa ya se terminó, tiene que
 * verse el fondo del ambiente. Si eso saliera negro, la mesa volvería a ser un
 * rectángulo pegado y perderíamos justo lo que fuimos a buscar.
 */
async function inclinar(navegador, pngPlano) {
  const pag = await navegador.newPage({
    viewport: { width: CUADRO.ancho, height: CUADRO.alto },
  });
  await pag.setContent(
    `<style>
       html,body{margin:0;padding:0;background:transparent}
       #camara{
         position:fixed; inset:0; overflow:hidden;
         perspective:${PERSPECTIVA}px; perspective-origin:50% 0%;
       }
       #tabla{
         position:absolute; bottom:0; left:50%;
         width:${PLANO.ancho}px; height:${PLANO.alto}px;
         margin-left:${-PLANO.ancho / 2}px;
         transform-origin:50% 100%;
         transform:rotateX(${INCLINACION}deg);
       }
     </style>
     <div id="camara"><img id="tabla" src="data:image/png;base64,${pngPlano.toString("base64")}"></div>`,
    { waitUntil: "load" },
  );
  await pag.waitForTimeout(120);
  const png = await pag.screenshot({ omitBackground: true });
  await pag.close();
  return png;
}

/** El color medio de una imagen: es lo que se pinta mientras la textura carga. */
async function colorMedio(buffer) {
  const { channels } = await sharp(buffer).stats();
  const aHex = (n) => Math.round(n).toString(16).padStart(2, "0");
  return `#${aHex(channels[0].mean)}${aHex(channels[1].mean)}${aHex(channels[2].mean)}`;
}

async function generarUno(navegador, ambiente) {
  const plano = await rendir(navegador, maderaPlana(ambiente), 2400, 2900);
  const inclinada = await inclinar(navegador, plano);
  const mesa = await sharp(inclinada)
    .resize(FINAL_MESA.ancho, FINAL_MESA.alto, { kernel: "lanczos3", fit: "fill" })
    .webp({ quality: 82, effort: 6 })
    .toBuffer();

  const fondoPng = await rendir(navegador, fondoPlano(ambiente), 2400, 900);
  const fondo = await sharp(fondoPng)
    .resize(FINAL_FONDO.ancho, FINAL_FONDO.alto, { kernel: "lanczos3", fit: "fill" })
    .webp({ quality: 80, effort: 6 })
    .toBuffer();

  await writeFile(path.join(SALIDA, `${ambiente.clave}-mesa.webp`), mesa);
  await writeFile(path.join(SALIDA, `${ambiente.clave}-fondo.webp`), fondo);

  const kb = (b) => (b.length / 1024).toFixed(0);
  console.log(
    `  ${ambiente.clave.padEnd(11)} mesa ${kb(mesa).padStart(4)} KB · fondo ${kb(fondo).padStart(4)} KB`,
  );

  return {
    clave: ambiente.clave,
    colorMesa: await colorMedio(inclinada),
    colorFondo: await colorMedio(fondoPng),
    pesoKb: Math.round((mesa.length + fondo.length) / 1024),
  };
}

/**
 * Escribe lib/escenas.ts.
 *
 * Sale un objeto con las rutas ESCRITAS ENTERAS, una por ambiente, y no un
 * `/escenas/${clave}-mesa.webp` armado al vuelo. La diferencia importa: el
 * departamento entra por la dirección (`?depto=`), y aunque hoy pase por una
 * tabla fija antes de llegar acá, una ruta que se arma pegando texto es una
 * ruta que algún día se puede empujar a donde no va. Escritas enteras, no.
 */
async function escribirIndice(fichas) {
  const lineas = fichas
    .map(
      (f) => `  "${f.clave}": {
    mesa: "/escenas/${f.clave}-mesa.webp",
    fondo: "/escenas/${f.clave}-fondo.webp",
    colorMesa: "${f.colorMesa}",
    colorFondo: "${f.colorFondo}",
  },`,
    )
    .join("\n");

  const archivo = `/**
 * Las texturas de cada ambiente. GENERADO: no se edita a mano.
 *
 *     node herramientas/generar-escena.mjs
 *
 * Las rutas están escritas enteras a propósito, no armadas con plantillas: el
 * departamento entra por la dirección del navegador y una ruta que se arma
 * pegando texto es una ruta que se puede empujar. Acá sólo se puede elegir
 * entre estas siete.
 */

import type { ClaveAmbiente } from "./ambientes.ts";

export interface Escena {
  /** La tabla, ya en perspectiva y con el borde lejano recortado. */
  mesa: string;
  /** El ambiente detrás de la mesa, en tres capas de profundidad. */
  fondo: string;
  /** El color medio, para pintar mientras la textura carga. */
  colorMesa: string;
  colorFondo: string;
}

export const ESCENAS: Record<ClaveAmbiente, Escena> = {
${lineas}
};
`;
  await writeFile(path.join(RAIZ, "lib", "escenas.ts"), archivo);
}

async function principal() {
  const pedido = process.argv[2];
  const claves = pedido ? [pedido] : Object.keys(AMBIENTES);

  for (const c of claves) {
    if (!Object.hasOwn(AMBIENTES, c)) {
      console.error(`No existe el ambiente "${c}". Hay: ${Object.keys(AMBIENTES).join(", ")}`);
      process.exit(1);
    }
  }

  await mkdir(SALIDA, { recursive: true });
  console.log(
    `Horneando ${claves.length} ambiente(s) · plano ${PLANO.ancho}×${PLANO.alto} · ` +
      `perspectiva ${PERSPECTIVA}px · inclinación ${INCLINACION}°`,
  );

  const navegador = await chromium.launch();
  const fichas = [];
  for (const c of claves) fichas.push(await generarUno(navegador, AMBIENTES[c]));
  await navegador.close();

  // El índice se reescribe entero SIEMPRE, con los siete: si se regenerara sólo
  // el que se pidió, el archivo quedaría sin los otros seis y no compilaría.
  const porClave = new Map(fichas.map((f) => [f.clave, f]));
  const todas = [];
  for (const c of Object.keys(AMBIENTES)) {
    todas.push(porClave.get(c) ?? (await leerFichaVieja(c)));
  }
  await escribirIndice(todas);
  console.log(`Listo. ${todas.reduce((s, f) => s + (f.pesoKb ?? 0), 0)} KB en total.`);
}

/** Si sólo se regeneró un ambiente, los otros conservan lo que ya decía el índice. */
async function leerFichaVieja(clave) {
  try {
    const { ESCENAS } = await import(path.join(RAIZ, "lib", "escenas.ts"));
    const e = ESCENAS[clave];
    if (e) return { clave, colorMesa: e.colorMesa, colorFondo: e.colorFondo, pesoKb: 0 };
  } catch {
    /* todavía no existe: primera corrida */
  }
  const a = AMBIENTES[clave];
  return { clave, colorMesa: a.mesa[2], colorFondo: a.cielo[1], pesoKb: 0 };
}

await principal();
