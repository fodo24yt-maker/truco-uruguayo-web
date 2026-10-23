/**
 * Hornea el ícono y el splash de la app Android, y el ícono de la ficha de Play.
 *
 *     node herramientas/generar-icono.mjs            el de Android
 *     node herramientas/generar-icono.mjs --tienda   además, el de 512 de la ficha
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * Capacitor y Android Studio dejan puestos SUS dibujos: el robot verde de
 * Android y el logo de Capacitor. La regla del proyecto es que no entra una
 * sola imagen de nadie, así que se reemplazan por los nuestros, dibujados en
 * SVG y horneados a PNG con `sharp` —el mismo camino que `generar-escena.mjs`
 * usa para la madera de la mesa—.
 *
 * ── Qué se dibuja ─────────────────────────────────────────────────────────
 *
 * Desde el 18/10/2026, EL ESCUDO: la bandera adentro de un escudo de club, con
 * una carta de oro adelante. El dibujo está en `lib/escudo.ts`, el único lugar
 * donde está, y lo comparten la portada y la pantalla de carga de la app
 * (`components/Marca.tsx`); acá llega pasado a texto por `marca/escudo.mjs`.
 * Antes era una carta española con un oro sobre la
 * madera del boliche; se cambió al elegir la marca nueva entre veintiséis
 * propuestas (ver `Historial.md`).
 *
 * ── Los tres íconos que pide Android, y por qué son distintos ─────────────
 *
 * · **adaptativo** (`ic_launcher_foreground` + `_background`): el lienzo mide
 *   108 y el launcher muestra los 72 del medio, recortados con cualquier
 *   forma —círculo, cuadrado redondeado, gota—. Lo único garantizado es el
 *   círculo central de 66. Por eso el frente es el escudo SOLO, entero adentro
 *   de esos 66, y el fondo es el panel celeste: el recorte del launcher hace
 *   de figurita.
 * · **legado** (`ic_launcher`): para Android 7 y anteriores. Ahí el ícono se
 *   muestra tal cual, así que va la figurita entera: el borde blanco, el panel
 *   celeste y el escudo. Es el mismo dibujo que el de la ficha de Play.
 * · **redondo** (`ic_launcher_round`): el panel en círculo con el escudo.
 */

import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { C, escudo, figuritaConEscudo } from "./marca/escudo.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RES = path.join(AQUI, "..", "android", "app", "src", "main", "res");

/* El fondo de la app. Está escrito y no importado porque `globals.css` lo
   declara en CSS y esto corre en Node. */
const NOCHE = "#14100e";

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
   íconos adaptativos. */

/**
 * El celeste de fondo: un degradé en diagonal, el mismo del fondo de las
 * slides. Un degradé y no un desenfoque: `sharp` dibuja cualquier
 * `linearGradient`, y los filtros no siempre (ver el halo de la versión vieja
 * en la historia del archivo).
 */
const celeste = (id = "cel") => `
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${C.celeste}"/><stop offset="1" stop-color="${C.celesteHondo}"/></linearGradient></defs>
  <rect width="108" height="108" fill="url(#${id})"/>`;

/** El panel de adentro de la figurita: celeste más claro al medio. */
const panel = (id = "pan") => `
  <defs><radialGradient id="${id}" cx=".5" cy=".42" r=".75">
    <stop offset="0" stop-color="#9fd0f5"/><stop offset="1" stop-color="${C.celesteHondo}"/></radialGradient></defs>
  <rect width="108" height="108" fill="url(#${id})"/>`;

/**
 * El escudo solo, centrado, de `alto` unidades.
 *
 * Para el adaptativo, 48 de alto: las esquinas de arriba —que son las que más
 * se alejan del centro— quedan a 31,5 del centro, adentro del círculo seguro
 * de 33 (66 de diámetro). Con 54 quedaban a 35,5 y, en un launcher redondo,
 * tocaban el borde (se vio en la simulación del 18/10/2026).
 */
const escudoSolo = (alto, id) => {
  const k = alto / 470;
  return `<g transform="translate(${54 - 200 * k} ${54 - 235 * k})">${escudo(k, { sombra: false, id })}</g>`;
};

const envolver = (lado, dentro) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 108 108">${dentro}</svg>`;

/** El frente adaptativo: sin fondo, el escudo adentro del círculo seguro. */
const foreground = (lado) => envolver(lado, escudoSolo(48, "fg"));

/** El fondo adaptativo: el panel celeste, que es lo que el launcher recorta. */
const fondo = (lado) => envolver(lado, panel());

/** El de siempre: la figurita entera sobre el celeste. Es el de la ficha. */
const figurita = () => `${celeste()}${figuritaConEscudo(108, 0.82)}`;

const legado = (lado) =>
  envolver(lado, `<clipPath id="c"><rect width="108" height="108" rx="19"/></clipPath><g clip-path="url(#c)">${figurita()}</g>`);

/** El panel en círculo con el escudo: una figurita en un círculo se veía torcida. */
const redondo = (lado) =>
  envolver(lado, `<clipPath id="r"><circle cx="54" cy="54" r="54"/></clipPath><g clip-path="url(#r)">${panel()}${escudoSolo(66, "rd")}</g>`);

/**
 * El splash, para Android 11 y anteriores: el escudo chico sobre la noche.
 *
 * SIN USO DESDE EL 3/10/2026: el tema del arranque (`res/values/styles.xml`)
 * pasó a `noche` liso, sin logo, y el plugin de splash ya no muestra el suyo
 * (`launchShowDuration: 0`). Se sigue horneando porque el plugin lo busca por
 * nombre si alguna vez cae en su camino viejo, y sin él la app se cerraría.
 */
function splash(ancho, alto) {
  const lado = Math.min(ancho, alto) * 0.34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
    <rect width="${ancho}" height="${alto}" fill="${NOCHE}"/>
    <g transform="translate(${(ancho - lado) / 2} ${(alto - lado) / 2}) scale(${lado / 108})">
      ${escudoSolo(80, "sp")}
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

/* El ícono adaptativo usa NUESTRO fondo en vez de un color plano. El
   monocromo (los íconos temáticos de Android 13) es el mismo frente: el
   sistema se queda con la silueta, y la del escudo se reconoce sola. */
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

/* ══ EL ÍCONO DE LA FICHA DE PLAY STORE ════════════════════════════════════
   `node herramientas/generar-icono.mjs --tienda`

   Sale de acá y no de `branding.mjs` porque es el mismo dibujo que el ícono de
   Android (`legado`, sin redondear). El gráfico destacado, en cambio, sí sale
   de `branding.mjs`: lleva texto, y `sharp` no carga las tipografías de la
   marca. El logo, igual, está dibujado una sola vez: los dos lo toman de
   `lib/escudo.ts`.

   Es aditivo: sin el flag, este archivo hace exactamente lo de siempre. Con el
   flag escribe además un PNG en `app branding/`, que está en el `.gitignore`. */

if (process.argv.includes("--tienda")) {
  const TIENDA = path.join(AQUI, "..", "app branding", "ficha-play");

  /* El de la ficha NO lleva las esquinas redondeadas de `legado`. Play pide
     el cuadrado lleno y el redondeo lo aplica ella, distinto en cada lugar
     donde muestra la app. Redondearlo acá es redondearlo dos veces. */
  await mkdir(TIENDA, { recursive: true });
  await png(envolver(512, figurita()), path.join(TIENDA, "icono-512.png"));

  console.log("\ny en 'app branding/ficha-play' (que NO sube a GitHub):");
  console.log("  icono-512.png   512x512, con alfa");
  console.log("El gráfico destacado lo arma `node herramientas/branding.mjs`.");
}
