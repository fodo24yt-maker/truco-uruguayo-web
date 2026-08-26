/**
 * La baraja española de 40 cartas, la muestra, las piezas y la jerarquía.
 * Todo lo de acá sale de reglas.txt, secciones 1, 4 y 5.
 */

export type Palo = "espada" | "basto" | "oro" | "copa";
export type Numero = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export interface Carta {
  numero: Numero;
  palo: Palo;
}

export const PALOS: readonly Palo[] = ["espada", "basto", "oro", "copa"];
export const NUMEROS: readonly Numero[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

/** Las 40 cartas. Sin ochos ni nueves. */
export const BARAJA: readonly Carta[] = PALOS.flatMap((palo) =>
  NUMEROS.map((numero) => ({ numero, palo })),
);

/** Las piezas, de la más fuerte a la más floja (reglas.txt 4.2). */
const ORDEN_PIEZAS: readonly Numero[] = [2, 4, 5, 11, 10];

/** Lo que vale cada pieza para el envido (reglas.txt 9.2). */
const VALOR_ENVIDO_PIEZA: Record<number, number> = {
  2: 30,
  4: 29,
  5: 28,
  11: 27,
  10: 27,
};

export const esMismaCarta = (a: Carta, b: Carta) =>
  a.numero === b.numero && a.palo === b.palo;

export const cartaATexto = (c: Carta) => `${c.numero} de ${c.palo}`;

/**
 * Qué números del palo de la muestra son pieza en esta mano, y qué pieza
 * representa cada uno.
 *
 * Normalmente cada pieza se representa a sí misma. Pero si la muestra ES una
 * pieza, esa carta no se puede jugar (está sobre la mesa), así que el 12 de
 * ese palo ocupa su lugar (reglas.txt 4.3).
 */
export function piezasDe(muestra: Carta): Map<Numero, Numero> {
  const piezas = new Map<Numero, Numero>();
  for (const n of ORDEN_PIEZAS) piezas.set(n, n);

  if (ORDEN_PIEZAS.includes(muestra.numero)) {
    piezas.delete(muestra.numero);
    piezas.set(12, muestra.numero); // el rey hace de la pieza que falta
  }
  return piezas;
}

export function esPieza(c: Carta, muestra: Carta): boolean {
  return c.palo === muestra.palo && piezasDe(muestra).has(c.numero);
}

/** Qué pieza representa esta carta (el 12 puede estar haciendo de 5, etc.). */
export function piezaQueRepresenta(c: Carta, muestra: Carta): Numero | null {
  if (c.palo !== muestra.palo) return null;
  return piezasDe(muestra).get(c.numero) ?? null;
}

/** Lo que vale esta carta para el envido y la flor. 0 si es figura. */
export function valorPieza(c: Carta, muestra: Carta): number {
  const pieza = piezaQueRepresenta(c, muestra);
  return pieza === null ? 0 : VALOR_ENVIDO_PIEZA[pieza];
}

/** El número que suma para contar el tanto. Las figuras valen 0. */
export function indice(c: Carta): number {
  return c.numero <= 7 ? c.numero : 0;
}

const esMata = (c: Carta) =>
  (c.numero === 1 && (c.palo === "espada" || c.palo === "basto")) ||
  (c.numero === 7 && (c.palo === "espada" || c.palo === "oro"));

/** Las matas, de mayor a menor (reglas.txt 5.2). */
const ORDEN_MATAS: readonly Carta[] = [
  { numero: 1, palo: "espada" },
  { numero: 1, palo: "basto" },
  { numero: 7, palo: "espada" },
  { numero: 7, palo: "oro" },
];

/** Los escalones comunes, de mayor a menor (reglas.txt 5.1, filas 10 a 19). */
const ORDEN_COMUNES: readonly Numero[] = [3, 2, 1, 12, 11, 10, 7, 6, 5, 4];

/**
 * Qué tan fuerte es una carta en esta mano. Más alto gana.
 *
 * Dos cartas con la misma fuerza empatan: eso es una parda (reglas.txt 7.3).
 * Por eso los cuatro treses devuelven el mismo número.
 */
export function fuerza(c: Carta, muestra: Carta): number {
  const pieza = piezaQueRepresenta(c, muestra);
  if (pieza !== null) return 100 - ORDEN_PIEZAS.indexOf(pieza); // 100 a 96

  if (esMata(c)) {
    return 95 - ORDEN_MATAS.findIndex((m) => esMismaCarta(m, c)); // 95 a 92
  }
  return 91 - ORDEN_COMUNES.indexOf(c.numero); // 91 a 82
}

/** Mezcla una copia de la baraja. Usa la fuente de azar que se le pase. */
export function mezclar(
  cartas: readonly Carta[] = BARAJA,
  azar: () => number = Math.random,
): Carta[] {
  const mazo = [...cartas];
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
  }
  return mazo;
}

/** Reparte 3 cartas a cada uno y da vuelta la muestra (reglas.txt 6, paso 1). */
export function repartir(azar: () => number = Math.random) {
  const mazo = mezclar(BARAJA, azar);
  return {
    mano: mazo.slice(0, 3),
    pie: mazo.slice(3, 6),
    muestra: mazo[6],
  };
}

/**
 * Escribe una carta en corto: "7C" es el siete de copa, "10B" la sota de basto.
 * Sirve para los ejemplos de las lecciones y para los tests.
 */
export function desdeTexto(txt: string): Carta {
  const abreviaturas: Record<string, Palo> = {
    E: "espada",
    B: "basto",
    O: "oro",
    C: "copa",
  };
  const palo = abreviaturas[txt.slice(-1).toUpperCase()];
  const numero = Number(txt.slice(0, -1)) as Numero;
  if (!palo || !NUMEROS.includes(numero)) {
    throw new Error(`No existe la carta "${txt}"`);
  }
  return { numero, palo };
}
