/**
 * Los tres números de cada objeto de la mesa.
 *
 * ── Por qué esto vive en `lib/` y el dibujo en `components/` ──────────────
 *
 * Porque son datos, no pintura. `lib/ambientes.ts` necesita el tipo para su
 * tabla de departamentos y `lib/objetos.test.ts` necesita las tres tablas para
 * verificar que ningún ambiente repita objeto; ninguno de los dos quiere saber
 * cómo se dibuja un sombrero. Y hay una razón más concreta: las pruebas corren
 * con `node --test`, que sabe sacarle los tipos a un `.ts` pero no transformar
 * el JSX de un `.tsx`, así que un dato que viva en el componente no se puede
 * verificar.
 *
 * El dibujo de cada uno está en `components/mesa/Objetos.tsx`.
 */

/** Los diecinueve, uno por departamento. */
export type ClaveObjeto =
  | "vaso"
  | "cajon"
  | "tarro"
  | "boina"
  | "durazno"
  | "flor"
  | "espuela"
  | "guampa"
  | "farol"
  | "caracol"
  | "estrella"
  | "llave"
  | "espiga"
  | "lata"
  | "botella"
  | "naranja"
  | "cafecito"
  | "amatista"
  | "sombrero";

/** Ancho/alto del dibujo, para que la mesa no tenga que adivinarlo. */
export const PROPORCION: Record<ClaveObjeto, string> = {
  vaso: "44 / 62",
  cajon: "92 / 58",
  tarro: "52 / 78",
  boina: "72 / 38",
  durazno: "54 / 56",
  flor: "46 / 74",
  espuela: "68 / 48",
  guampa: "58 / 66",
  farol: "52 / 80",
  caracol: "46 / 62",
  estrella: "60 / 58",
  llave: "80 / 32",
  espiga: "38 / 82",
  lata: "64 / 42",
  botella: "38 / 94",
  naranja: "54 / 54",
  cafecito: "64 / 44",
  amatista: "68 / 52",
  sombrero: "94 / 48",
};

/**
 * Cuánto del alto base ocupa cada uno. 1 = el vaso, que es la referencia.
 *
 * Salen de compararlos entre sí sobre una mesa de verdad: una botella de
 * cerveza es más alta que un vaso, una naranja le llega a la mitad y un
 * sombrero apoyado es bajo aunque sea lo más ancho de todos.
 */
export const ALTURA: Record<ClaveObjeto, number> = {
  vaso: 1,
  cajon: 0.86,
  tarro: 1.12,
  boina: 0.52,
  durazno: 0.62,
  flor: 1.06,
  espuela: 0.6,
  guampa: 0.82,
  farol: 1.18,
  caracol: 0.78,
  estrella: 0.5,
  llave: 0.34,
  espiga: 1.12,
  lata: 0.5,
  botella: 1.38,
  naranja: 0.58,
  cafecito: 0.56,
  amatista: 0.6,
  sombrero: 0.6,
};

/** Cuánto de su ancho toca la madera. Decide el ancho de la sombra. */
export const APOYO: Record<ClaveObjeto, number> = {
  vaso: 0.5,
  cajon: 0.92,
  tarro: 0.6,
  boina: 0.86,
  durazno: 0.5,
  flor: 0.44,
  espuela: 0.7,
  guampa: 0.55,
  farol: 0.62,
  caracol: 0.52,
  estrella: 0.86,
  llave: 0.9,
  espiga: 0.7,
  lata: 0.9,
  botella: 0.42,
  naranja: 0.5,
  cafecito: 0.85,
  amatista: 0.8,
  sombrero: 0.94,
};
