/**
 * En qué lugar de la fila de bazas cae cada carta: las jugadas y las enseñadas.
 *
 * Vivía adentro de la mesa (`lugarDeBaza`, en `app/jugar/mesa/page.tsx`) y se
 * mudó acá el 9/10/2026 por dos razones: para que tenga test, y para que
 * `herramientas/mirar-mesa-nueva.mjs` pueda medir TODOS los lugares posibles
 * con los mismos números con los que dibuja la mesa, sin copiarlos.
 *
 * `u` va de 0 (borde izquierdo de la mesa) a 1 (el derecho); lo convierte en
 * píxeles `estiloEnMesa`, de `lib/mesa-perspectiva.ts`.
 *
 * ── LAS ENSEÑADAS VAN DEL LADO CONTRARIO AL MAZO (9/10/2026) ──────────────
 *
 * Hasta ese día las cartas que se enseñan al cerrar la mano se agregaban
 * SIEMPRE a la derecha del grupo. Con la mano cortada temprano —"me voy al
 * mazo" después de un envido, un truco no querido— el grupo de las jugadas
 * está en el medio y la tercera enseñada caía en u = 0,76: encima del mazo
 * cuando el mazo está a la derecha (tapando la muestra), y encima del mate
 * cuando está a la izquierda. Lo vio Santiago y lo pidió así: "si el mazo está
 * a la izquierda, se tira más a la derecha; si está a la derecha, al revés".
 */

import type { Jugador } from "./motor/partida.ts";

export type LadoMazo = "izquierda" | "derecha";

/**
 * Las cartas jugadas. `suya`, `tuya` y `ganador` son las `v` de cada fila;
 * `paso` es cuánto se separan las bazas entre sí, en `u`.
 *
 * Se centran como grupo: ancladas a la izquierda, con una sola baza puesta
 * —que es la mitad del tiempo— quedaba tirada contra el borde.
 *
 * Las bazas bajaron el 2/9/2026: con las dos puestas y el mate al costado, la
 * mitad de la mesa quedaba ocupada y no se veía la madera.
 */
export const BAZA = {
  suya: 0.46,
  tuya: 0.64,
  ganador: 0.31,
  ancho: "min(14cqw, 15cqh)",
  paso: 0.13,
};

/**
 * Tu carta va un poco corrida de la de él, para que se monte encima como
 * quedan de verdad cuando las tirás una sobre otra.
 *
 * HACIA EL LADO LIBRE, no siempre a la derecha (9/10/2026). Corrida a la
 * derecha con el mazo a la derecha, tu tercera carta tapaba el cartelito de la
 * muestra —"MUESTRA / 11 DE ORO"— 2 px a 320x568, 6 a 360x600 y 9 a 1440x900.
 * Lo encontró la medición con sondas de `mirar-mesa-nueva.mjs`; nadie lo había
 * visto porque pasa sólo con las tres bazas jugadas y el mazo de ese lado.
 */
export const CORRIMIENTO_TUYA = 0.03;

/**
 * Cuánto se separan entre sí las enseñadas que caen AFUERA del grupo.
 *
 * Es MENOR que el paso de las bazas (0,13), y no es un gusto: del lado libre
 * está el mate, y la tercera enseñada del rival se le montaba. Lo fijó un
 * barrido en el navegador, en los seis tamaños y con el mazo de los dos lados
 * (9/10/2026), midiendo cuánto se metía en el mate la peor de todas:
 *
 *     paso    320x568  360x600  390x844  1100x800  1280x620  1440x900
 *     0,13      12       16        1        62        46        71
 *     0,11      12       16        1        17         3        24
 *     0,10       9       10        1         0         0         0
 *     0,09       1        1        1         0         0         0
 *     0,085      0        0        0         0         0         0
 *
 * Con 0,085 en un celular quedan una al lado de la otra, casi tocándose (la
 * carta mide ~0,083 de ancho): se leen como un grupo aparte del de las bazas,
 * que es justo lo que son. Lo verifica `mirar-mesa-nueva.mjs`.
 */
export const PASO_ENSEÑADAS = 0.085;

/**
 * Dónde va la baza `i`, como desvío del centro de la mesa.
 *
 * `bazasJugadas` cuenta sólo las bazas que tienen ALGO puesto. `p.bazas`
 * incluye siempre la que está abierta, todavía vacía: si el grupo se centrara
 * sobre esa cuenta, con una sola carta en la mesa el par quedaría corrido media
 * posición a la izquierda y la mesa se vería torcida.
 */
export function uDeBaza(i: number, bazasJugadas: number): number {
  return (i - (Math.max(bazasJugadas, 1) - 1) / 2) * BAZA.paso;
}

/**
 * Dónde va una carta enseñada, como desvío del centro de la mesa.
 *
 * `baza` es el lugar que le dio `lib/cartas-en-mesa.ts`:
 *
 *   · si es un HUECO de una baza ya jugada (`baza < bazasJugadas`: el otro tiró
 *     y esta persona no llegó a contestar), cae ahí, al lado de la carta del
 *     otro, como si la hubiera jugado;
 *   · si es una baza que no llegó a jugarse, cae AFUERA del grupo y del lado
 *     contrario al mazo, a `PASO_ENSEÑADAS` una de otra.
 *
 * EL GRUPO DE LAS JUGADAS NO SE MUEVE: su centro sigue siendo el de
 * `uDeBaza`. Si las enseñadas entraran en la cuenta, todas las cartas ya
 * apoyadas se correrían de golpe, que es justo lo que vigila
 * `mirar-mesa-nueva.mjs` ("la mesa no se mueve").
 */
export function uDeEnseñada(baza: number, bazasJugadas: number, ladoMazo: LadoMazo): number {
  if (baza < bazasJugadas) return uDeBaza(baza, bazasJugadas);
  // El borde del grupo del lado libre. Sin nada jugado no hay grupo, y la
  // primera cae en el medio de la mesa.
  const borde =
    bazasJugadas === 0 ? -PASO_ENSEÑADAS : uDeBaza(bazasJugadas - 1, bazasJugadas);
  const afuera = borde + (baza - bazasJugadas + 1) * PASO_ENSEÑADAS;
  return ladoMazo === "izquierda" ? afuera : -afuera;
}

/** El `u` de una carta de la fila, sumándole el centro de la mesa y lo de la tuya. */
export function uEnFila(quien: Jugador, desvio: number, ladoMazo: LadoMazo): number {
  const corrimiento =
    quien === "vos" ? (ladoMazo === "izquierda" ? CORRIMIENTO_TUYA : -CORRIMIENTO_TUYA) : 0;
  return 0.5 + corrimiento + desvio;
}

/** La `v` de la fila de cada uno. */
export function vDeFila(quien: Jugador): number {
  return quien === "rival" ? BAZA.suya : BAZA.tuya;
}
