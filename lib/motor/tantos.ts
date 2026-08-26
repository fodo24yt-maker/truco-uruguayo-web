/**
 * Contar el envido y la flor (reglas.txt, secciones 8 y 9).
 *
 * Las dos cuentas dependen de la muestra: las piezas valen 30, 29, 28, 27 y 27
 * y son lo que dispara los tantos altos del truco uruguayo.
 */

import {
  type Carta,
  esPieza,
  indice,
  valorPieza,
} from "./baraja.ts";

export type MotivoFlor = "tres-del-mismo-palo" | "dos-piezas" | "pieza-y-par";

export interface Flor {
  tiene: boolean;
  motivo: MotivoFlor | null;
  valor: number;
}

/**
 * Tenés flor si (reglas.txt 8.1):
 *   a) tus 3 cartas son del mismo palo,
 *   b) tenés 2 o 3 piezas,
 *   c) tenés 1 pieza y las otras dos son del mismo palo entre sí.
 */
export function analizarFlor(mano: readonly Carta[], muestra: Carta): Flor {
  const piezas = mano.filter((c) => esPieza(c, muestra));
  const palos = new Set(mano.map((c) => c.palo));

  let motivo: MotivoFlor | null = null;
  if (palos.size === 1) {
    motivo = "tres-del-mismo-palo";
  } else if (piezas.length >= 2) {
    motivo = "dos-piezas";
  } else if (piezas.length === 1) {
    const otras = mano.filter((c) => !esPieza(c, muestra));
    if (otras[0].palo === otras[1].palo) motivo = "pieza-y-par";
  }

  return {
    tiene: motivo !== null,
    motivo,
    valor: motivo === null ? 0 : valorFlor(mano, muestra),
  };
}

/**
 * El valor de una flor: 20 más lo que aporta cada carta (reglas.txt 8.4).
 * Una pieza aporta su valor menos 20; una carta común, su número.
 * El máximo es 47: el 2, el 4 y el 5 de la muestra.
 */
export function valorFlor(mano: readonly Carta[], muestra: Carta): number {
  return mano.reduce(
    (total, c) =>
      total + (esPieza(c, muestra) ? valorPieza(c, muestra) - 20 : indice(c)),
    20,
  );
}

/**
 * El tanto del envido (reglas.txt 9.2). Tres casos, en este orden:
 *   A) con pieza: la pieza + el número de la más alta de las otras dos,
 *      sin importar el palo (la pieza liga con cualquier carta),
 *   B) dos cartas del mismo palo: la suma de sus números + 20,
 *   C) tres palos distintos: el número de la carta más alta.
 * Va de 0 a 37.
 */
export function valorEnvido(mano: readonly Carta[], muestra: Carta): number {
  const piezas = mano.filter((c) => esPieza(c, muestra));

  if (piezas.length > 0) {
    const mejor = piezas.reduce((a, b) =>
      valorPieza(a, muestra) >= valorPieza(b, muestra) ? a : b,
    );
    const otras = mano.filter((c) => c !== mejor);
    return valorPieza(mejor, muestra) + Math.max(...otras.map(indice));
  }

  let mejor = Math.max(...mano.map(indice)); // caso C
  for (let i = 0; i < mano.length; i++) {
    for (let j = i + 1; j < mano.length; j++) {
      if (mano[i].palo === mano[j].palo) {
        mejor = Math.max(mejor, 20 + indice(mano[i]) + indice(mano[j])); // caso B
      }
    }
  }
  return mejor;
}

/** Cómo se explica el tanto en pantalla, para la sección Aprender. */
export function explicarEnvido(mano: readonly Carta[], muestra: Carta): string {
  const piezas = mano.filter((c) => esPieza(c, muestra));

  if (piezas.length > 0) {
    const mejor = piezas.reduce((a, b) =>
      valorPieza(a, muestra) >= valorPieza(b, muestra) ? a : b,
    );
    const otras = mano.filter((c) => c !== mejor);
    const alta = Math.max(...otras.map(indice));
    return `pieza (${valorPieza(mejor, muestra)}) + ${alta} = ${valorEnvido(mano, muestra)}`;
  }

  for (let i = 0; i < mano.length; i++) {
    for (let j = i + 1; j < mano.length; j++) {
      if (mano[i].palo === mano[j].palo) {
        const suma = indice(mano[i]) + indice(mano[j]);
        if (20 + suma === valorEnvido(mano, muestra)) {
          return `20 + ${indice(mano[i])} + ${indice(mano[j])} = ${20 + suma}`;
        }
      }
    }
  }
  return `tres palos distintos: ${valorEnvido(mano, muestra)}`;
}
