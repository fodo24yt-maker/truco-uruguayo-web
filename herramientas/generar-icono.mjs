/**
 * Hornea el ícono y el splash de la app Android.
 *
 *     node herramientas/generar-icono.mjs
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * Capacitor y Android Studio dejan puestos SUS dibujos: el robot verde de
 * Android y el logo de Capacitor. La regla del proyecto es que no entra una
 * sola imagen de nadie, así que se reemplazan por los nuestros, dibujados acá
 * en SVG y horneados a PNG con `sharp` — el mismo camino que
 * `generar-escena.mjs` usa para la madera de la mesa.
 *
 * ── Qué se dibuja ─────────────────────────────────────────────────────────
 *
 * Una carta española con un oro, apoyada sobre la madera del boliche y con el
 * halo dorado. Es el mismo motivo con el que arranca todo el sitio: el halo es
 * el que marca la muestra y las piezas, que es lo único que este juego tiene y
 * los otros trucos no.
 *
 * A 48 px no se lee un abanico ni una escena: se lee UNA silueta. Por eso es
 * una carta sola, inclinada, con un solo oro grande adentro.
 *
 * ── Los tres íconos que pide Android, y por qué son distintos ─────────────
 *
 * · **adaptativo** (`ic_launcher_foreground`): el lienzo mide 108 y el launcher
 *   puede recortarlo con cualquier forma —círculo, cuadrado redondeado, gota—.
 *   Sólo el círculo central de 72 está garantizado. Un dibujo que llene el
 *   cuadrado sale cortado en la mayoría de los teléfonos, así que la carta
 *   entera vive adentro de esos 72.
 * · **legado** (`ic_launcher`): para Android 7 y anteriores. Ahí el ícono se
 *   muestra tal cual, así que el dibujo SÍ llena el cuadrado.
 * · **redondo** (`ic_launcher_round`): lo mismo, recortado en círculo.
 */

import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RES = path.join(AQUI, "..", "android", "app", "src", "main", "res");

/* Los mismos colores del sitio. Están escritos y no importados porque
   `globals.css` los declara en CSS y esto corre en Node. */
const NOCHE = "#14100e";
const MADERA = "#3a2418";
const MADERA_CLARA = "#6b4a31";
const PAPEL = "#eddfc0";
const PAPEL_SOMBRA = "#d6c39a";
const DORADO = "#c9922e";
const DORADO_HONDO = "#8a5f18";
const TINTA = "#2a1c14";

/** Las cinco densidades de Android, con el factor de cada una. */
const DENSIDADES = [
  ["mdpi", 1],
  ["hdpi", 1.5],
  ["xhdpi", 2],
  ["xxhdpi", 3],
  ["xxxhdpi", 4],
];

/* ── Las piezas del dibujo ─────────────────────────────────────────────────
   Todo va en un viewBox de 108, que es la unidad con la que Android piensa los
   íconos adaptativos. Para el legado se reusa el mismo dibujo más grande. */

/** La madera del boliche: tablas verticales con su veta. */
const madera = () => `
  <rect width="108" height="108" fill="${MADERA}"/>
  ${[0, 27, 54, 81]
    .map(
      (x) => `
    <rect x="${x}" y="0" width="27" height="108" fill="none"
          stroke="${NOCHE}" stroke-width="1.1" opacity="0.75"/>
    <rect x="${x + 1.1}" y="0" width="1" height="108" fill="${MADERA_CLARA}" opacity="0.35"/>`,
    )
    .join("")}
  <rect width="108" height="108" fill="${NOCHE}" opacity="0.22"/>`;

/**
 * El halo dorado: un degradé radial, no un desenfoque y no anillos.
 *
 * `feGaussianBlur` lo tiene que resolver el rasterizador de SVG de `sharp`, y
 * los filtros no todos los dibujan igual: un resplandor puede salir como una
 * mancha o no salir. La primera versión de esto fueron cuatro rectángulos con
 * opacidad decreciente y **se veían los escalones**, que es peor que no tener
 * halo. Un `radialGradient` es SVG del común, lo dibuja cualquiera, y no tiene
 * bordes que se noten.
 */
const halo = (cx, cy, r, id = "halo") => `
  <defs>
    <radialGradient id="${id}">
      <stop offset="0%" stop-color="${DORADO}" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="${DORADO}" stop-opacity="0.28"/>
      <stop offset="75%" stop-color="${DORADO}" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="${DORADO}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r * 1.5}" fill="url(#${id})"/>`;

/**
 * La carta con su oro.
 *
 * `escala` es cuánto mide de alto respecto del lienzo de 108, y `giro` cuánto
 * se inclina. Inclinada y no derecha por una razón concreta: derecha se lee
 * como un rectángulo cualquiera —un cartel, una tarjeta—, y ladeada se lee como
 * una carta que alguien tiene en la mano.
 */
function carta({ alto, giro = -13 }) {
  const h = alto;
  const w = h * 0.68;
  const cx = 54;
  const cy = 54;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const rOro = w * 0.3;

  return `
  ${halo(cx, cy, h * 0.5)}
  <g transform="rotate(${giro} ${cx} ${cy})">
    <!-- la sombra de contacto, que es lo que la despega de la madera -->
    <rect x="${x + h * 0.035}" y="${y + h * 0.045}" width="${w}" height="${h}"
          rx="${w * 0.09}" fill="${NOCHE}" opacity="0.55"/>
    <!-- el papel -->
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.09}" fill="${PAPEL}"/>
    <!-- el marco, cortado a los costados: es la PINTA, la marca con la que se
         reconoce el palo asomando la carta sin abrir el abanico -->
    <rect x="${x + w * 0.09}" y="${y + h * 0.06}" width="${w * 0.82}" height="${h * 0.88}"
          rx="${w * 0.05}" fill="none" stroke="${DORADO}" stroke-width="${w * 0.055}"/>
    <!-- los dos cortes del marco: chicos y sólo en el filo. Al principio eran
         una franja de lado a lado y partían la carta al medio; la pinta es una
         muesca, no un tajo. -->
    <rect x="${x + w * 0.04}" y="${y + h * 0.45}" width="${w * 0.16}" height="${h * 0.1}" fill="${PAPEL}"/>
    <rect x="${x + w * 0.8}" y="${y + h * 0.45}" width="${w * 0.16}" height="${h * 0.1}" fill="${PAPEL}"/>
    <!-- el oro -->
    <circle cx="${cx}" cy="${cy}" r="${rOro}" fill="${DORADO}"/>
    <circle cx="${cx}" cy="${cy}" r="${rOro}" fill="none"
            stroke="${DORADO_HONDO}" stroke-width="${rOro * 0.16}"/>
    <circle cx="${cx}" cy="${cy}" r="${rOro * 0.62}" fill="none"
            stroke="${DORADO_HONDO}" stroke-width="${rOro * 0.13}"/>
    <circle cx="${cx}" cy="${cy}" r="${rOro * 0.26}" fill="${DORADO_HONDO}"/>
    <!-- el número, arriba a la izquierda, como en la baraja de verdad -->
    <text x="${x + w * 0.2}" y="${y + h * 0.19}" fill="${TINTA}"
          font-family="Georgia, 'Times New Roman', serif" font-weight="bold"
          font-size="${h * 0.17}" text-anchor="middle">1</text>
    <!-- el filo de abajo, que es lo que le da grosor al mazo -->
    <rect x="${x}" y="${y + h * 0.955}" width="${w}" height="${h * 0.045}"
          rx="${w * 0.04}" fill="${PAPEL_SOMBRA}"/>
  </g>`;
}

const envolver = (lado, dentro) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 108 108">${dentro}</svg>`;

/** El foreground adaptativo: sin fondo y con la carta adentro del círculo seguro. */
const foreground = (lado) => envolver(lado, carta({ alto: 58 }));

/** El fondo adaptativo: sólo la madera, que es lo que el launcher va a recortar. */
const fondo = (lado) => envolver(lado, madera());

/** El de siempre: madera y carta, llenando el cuadrado. */
const legado = (lado) =>
  envolver(
    lado,
    `<clipPath id="c"><rect width="108" height="108" rx="19"/></clipPath>
     <g clip-path="url(#c)">${madera()}${carta({ alto: 78 })}</g>`,
  );

/** El mismo, recortado en círculo. */
const redondo = (lado) =>
  envolver(
    lado,
    `<clipPath id="r"><circle cx="54" cy="54" r="54"/></clipPath>
     <g clip-path="url(#r)">${madera()}${carta({ alto: 76 })}</g>`,
  );

/**
 * El splash, para Android 11 y anteriores.
 *
 * Es el fondo de noche del sitio con la carta chica en el medio. Sin esto el
 * arranque es un flashazo blanco sobre una app que es toda penumbra: lo primero
 * que ve el que la abre y lo único que no se puede arreglar después.
 */
function splash(ancho, alto) {
  const lado = Math.min(ancho, alto) * 0.34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
    <rect width="${ancho}" height="${alto}" fill="${NOCHE}"/>
    <g transform="translate(${(ancho - lado) / 2} ${(alto - lado) / 2}) scale(${lado / 108})">
      ${carta({ alto: 70 })}
    </g>
  </svg>`;
}

const png = async (svg, destino) => {
  await mkdir(path.dirname(destino), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(destino);
};

/* ── A horneárselos ────────────────────────────────────────────────────────── */

let hechos = 0;

for (const [densidad, factor] of DENSIDADES) {
  const mip = path.join(RES, `mipmap-${densidad}`);
  await png(legado(Math.round(48 * factor)), path.join(mip, "ic_launcher.png"));
  await png(redondo(Math.round(48 * factor)), path.join(mip, "ic_launcher_round.png"));
  await png(foreground(Math.round(108 * factor)), path.join(mip, "ic_launcher_foreground.png"));
  await png(fondo(Math.round(108 * factor)), path.join(mip, "ic_launcher_background.png"));
  hechos += 4;

  // El splash a pantalla completa, en las dos orientaciones que pide Capacitor
  const largo = Math.round(480 * factor);
  const corto = Math.round(320 * factor);
  await png(splash(corto, largo), path.join(RES, `drawable-port-${densidad}`, "splash.png"));
  await png(splash(largo, corto), path.join(RES, `drawable-land-${densidad}`, "splash.png"));
  hechos += 2;
}

await png(splash(480, 320), path.join(RES, "drawable", "splash.png"));
hechos++;

/* El ícono adaptativo pasa a usar NUESTRO fondo en vez de un color plano: la
   madera del boliche se reconoce entre los demás íconos de la pantalla. */
for (const nombre of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
  await writeFile(
    path.join(RES, "mipmap-anydpi-v26", nombre),
    `<?xml version="1.0" encoding="utf-8"?>
<!-- GENERADO por herramientas/generar-icono.mjs. No se edita a mano. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`,
    "utf8",
  );
  hechos++;
}

/* Los dibujos que venían de fábrica: el robot verde de Android Studio. No son
   nuestros y ya no los usa nadie. */
for (const sobra of [
  path.join(RES, "drawable", "ic_launcher_background.xml"),
  path.join(RES, "drawable-v24", "ic_launcher_foreground.xml"),
]) {
  await rm(sobra, { force: true });
}
await rm(path.join(RES, "drawable-v24"), { recursive: true, force: true });

console.log(`${hechos} archivos horneados en android/app/src/main/res`);
console.log("y afuera el robot verde de Android Studio");
