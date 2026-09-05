/**
 * El contador de BLOQUES: la basura de dibujo del celular, contada sin opinar.
 *
 *     node herramientas/bloques.mjs foto.png [otra.png ...]
 *
 * ── Por qué existe, si ya está `motas.mjs` ────────────────────────────────
 *
 * Porque `motas.mjs` no distingue basura de un detalle chiquito del diseño, y
 * él mismo lo dice. Contando motas, el mapa da 534 y el menú 88, y ninguno de
 * esos números significa nada: esas pantallas son casi todas detalles chicos.
 * Tres sesiones seguidas se diagnosticó mirando ese número y las tres se
 * diagnosticó mal.
 *
 * Este cuenta otra cosa, y por eso sí sirve.
 *
 * ── Qué es un bloque, y cómo lo sabemos ───────────────────────────────────
 *
 * El 5/9/2026, con la primera foto SIN PÉRDIDA del framebuffer (por USB, no
 * por el espejo de Windows), se midieron las 29 manchitas de una mesa con el
 * envido cantado. Salió esto:
 *
 *     29 de 29 terminan en un múltiplo de 4
 *     28 de 29 empiezan en un múltiplo de 4
 *     29 de 29 arrancan en y ≡ 2 (mod 4)   ← la misma grilla, corrida por la
 *                                            barra de estado
 *     anchos 4px (25), 8px (3)  ·  altos 4px (26), 8px (2)
 *     28 de 29 son de UN SOLO COLOR PLANO
 *
 * Una manchita de dibujo no cae en una grilla de 4. Esto sí: es la
 * **compresión de bloques de la GPU** —AFBC en la Mali del teléfono— que
 * comprime las superficies compuestas de a 4×4 píxeles. Un bloque cuyo dato
 * vuelve mal se dibuja como un rectángulo de color plano.
 *
 * O sea: NO LO DIBUJA NUESTRO CÓDIGO. Pero sí depende de cuántas superficies
 * separadas le demos a comprimir, y eso sí lo decidimos nosotros: sacar los
 * filtros el 1/9 y el 4/9 bajó el bug 7 veces sin tocar una sola forma.
 *
 * Por eso este número es el que hay que mirar al cambiar el dibujo.
 *
 * ── Cómo los encuentra ────────────────────────────────────────────────────
 *
 * La paleta del proyecto es CÁLIDA en todos lados: la madera, el pergamino y
 * las cartas tienen r > g > b. Un píxel neutro —gris o blanco parejo— no lo
 * puede haber puesto la escena. Se marcan esos, se agrupan, y se queda con las
 * manchas chicas que además caen en la grilla de 4: las cartas y los carteles
 * son manchas grandes y quedan afuera solas.
 *
 * ── Su límite, dicho acá para que nadie lo descubra tarde ─────────────────
 *
 * La banda por omisión salta la barra de arriba y la mano de abajo, que son
 * las dos zonas donde SÍ hay blanco dibujado a propósito. Si se mide otra
 * pantalla hay que darle otra banda, o va a contar diseño.
 */

import path from "node:path";

import { leer, manchas } from "./motas.mjs";

/** Más claro que esto para que un neutro se note sobre la madera oscura. */
const CLARO = 150;
/** Cuánto puede separarse un canal de otro y seguir siendo "neutro". */
const NEUTRO = 22;
/** Una mancha de más de esto es algo dibujado: una carta, un cartel. */
const BLOQUE = 40;
/** El lado de la grilla de compresión. */
const REJILLA = 4;

/**
 * Más oscuro que esto para que un neutro se note sobre el pergamino claro.
 *
 * Hacen falta LAS DOS polaridades: en la mesa la madera es oscura y el bloque
 * sale claro, y en el mapa el pergamino es claro y el bloque sale gris. La
 * primera versión sólo miraba la clara y daba 0 en el mapa, que era justo la
 * pantalla donde el bug se había visto primero.
 */
const OSCURO = 110;

export async function bloquesDe(ruta, banda = [0.27, 0.72]) {
  const { data, ancho, alto, canales } = await leer(ruta);
  const marca = new Uint8Array(ancho * alto);
  const y0 = Math.round(alto * banda[0]);
  const y1 = Math.round(alto * banda[1]);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = (y * ancho + x) * canales;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const neutro = Math.abs(r - b) <= NEUTRO && Math.abs(g - b) <= NEUTRO;
      if (neutro && (r > CLARO || r < OSCURO)) marca[y * ancho + x] = 1;
    }
  }
  const chicas = manchas(marca, ancho, alto).filter((m) => m.n <= BLOQUE);
  /* En la grilla: el ancho y el alto son múltiplos de 4, que es lo que
     separa un bloque de compresión de un detalle chico del dibujo. */
  const enGrilla = chicas.filter(
    (m) => (m.x1 - m.x0 + 1) % REJILLA === 0 && (m.y1 - m.y0 + 1) % REJILLA === 0,
  );
  return { ancho, alto, bloques: enGrilla.length, chicas: chicas.length, cajas: enGrilla };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  /* La banda importa y no es un detalle: la de la mesa (0,27–0,72) salta la
     barra de arriba y la mano, que son las dos zonas con blanco dibujado a
     propósito. El mapa necesita empezar más arriba —su basura cae en y=376—,
     y con la banda de la mesa daba 0 justo en la pantalla donde el bug se vio
     primero. */
  const i = args.indexOf("--banda");
  const banda = i >= 0 ? args[i + 1].split(",").map(Number) : undefined;
  /* `i + 1` sólo tapa un argumento si `--banda` está: sin él `i` vale −1 y
     `i + 1` es 0, que es el primer archivo. */
  const fotos = args.filter((a, k) => !a.startsWith("--") && !(i >= 0 && k === i + 1));
  if (!fotos.length) {
    console.log("Uso: node herramientas/bloques.mjs foto.png [otra.png ...] [--banda 0.2,0.72]");
    console.log("     la banda va en fracción del alto; sin ella, 0,27–0,72 (la mesa).\n");
    process.exit(1);
  }
  for (const f of fotos) {
    const r = await bloquesDe(f, banda);
    console.log(
      `${path.basename(f).padEnd(30)} ${r.ancho}x${r.alto}  ` +
        `${String(r.bloques).padStart(4)} bloques  (de ${r.chicas} manchas chicas)`,
    );
  }
  console.log("\nUn bloque es basura de la GPU, no del dibujo. El número sirve para");
  console.log("comparar un antes con un después de la MISMA pantalla.\n");
}
