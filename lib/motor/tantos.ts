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
 * CON QUÉ CARTAS se cuenta el envido (reglas.txt 9.2). Tres casos, en este
 * orden:
 *   A) con pieza: la pieza + la más alta de las otras dos, sin importar el palo
 *      (la pieza liga con cualquier carta) → devuelve DOS,
 *   B) dos cartas del mismo palo: las dos que más suman → devuelve DOS,
 *   C) tres palos distintos: la más alta → devuelve UNA SOLA.
 *
 * ── POR QUÉ ESTO ES UNA FUNCIÓN Y NO ESTÁ ADENTRO DE `valorEnvido` ────────
 *
 * Porque desde el 10/9/2026 el recuadro que se enseña al cerrarse la mano
 * dibuja las tres cartas del reparto y RESALTA las que suman. Elegirlas es
 * exactamente la misma decisión que tomaba `valorEnvido` para sumarlas, y
 * estaba escrita tres veces: acá, en `valorEnvido` y en `explicarEnvido`.
 * Ahora se decide una sola vez y las otras dos se apoyan en ésta, así que un
 * número y las cartas que lo explican no pueden decir cosas distintas.
 *
 * El caso A gana SIEMPRE que haya pieza, y eso no es un olvido: la pieza más
 * baja aporta 27 y con la más chica de las otras da 27, mientras que el mejor
 * par del mismo palo posible es 20 + 7 + 6 = 33… pero con pieza esas dos
 * cartas quedan en `otras`, y el máximo que puede dar el caso A ahí es 27 + 7 =
 * 34. Nunca se cruzan al revés. La regla de la mesa dice lo mismo: con pieza se
 * cuenta con la pieza.
 */
export function cartasDelEnvido(mano: readonly Carta[], muestra: Carta): readonly Carta[] {
  const piezas = mano.filter((c) => esPieza(c, muestra));

  if (piezas.length > 0) {
    // caso A. `otras` puede tener OTRA pieza adentro, y ahí cuenta por su
    // número crudo: sólo una pieza vale como pieza.
    const mejor = piezas.reduce((a, b) =>
      valorPieza(a, muestra) >= valorPieza(b, muestra) ? a : b,
    );
    const otras = mano.filter((c) => c !== mejor);
    return [mejor, otras.reduce((a, b) => (indice(a) >= indice(b) ? a : b))];
  }

  // caso B: el par del mismo palo que más suma
  let par: readonly Carta[] | null = null;
  let mayor = -1;
  for (let i = 0; i < mano.length; i++) {
    for (let j = i + 1; j < mano.length; j++) {
      if (mano[i].palo !== mano[j].palo) continue;
      const suma = indice(mano[i]) + indice(mano[j]);
      if (suma > mayor) {
        mayor = suma;
        par = [mano[i], mano[j]];
      }
    }
  }
  if (par) return par;

  // caso C
  return [mano.reduce((a, b) => (indice(a) >= indice(b) ? a : b))];
}

/**
 * Cuánto suman las cartas que eligió `cartasDelEnvido`.
 *
 * Una sola carta es el caso C y vale su número pelado; dos cartas son el caso A
 * si la primera es pieza —siempre va primera— y el caso B si no.
 */
function sumarEnvido(cartas: readonly Carta[], muestra: Carta): number {
  if (cartas.length === 1) return indice(cartas[0]);
  const [a, b] = cartas;
  if (esPieza(a, muestra)) return valorPieza(a, muestra) + indice(b);
  return 20 + indice(a) + indice(b);
}

/**
 * El tanto del envido (reglas.txt 9.2). Va de 0 a 37.
 *
 * Los ocho ejemplos de la sección 9.2 están en `motor.test.ts` y son lo que
 * protege esta cuenta: la decisión de con qué cartas se cuenta vive en
 * `cartasDelEnvido`, así que si alguna vez cambia, el test la agarra acá.
 */
export function valorEnvido(mano: readonly Carta[], muestra: Carta): number {
  return sumarEnvido(cartasDelEnvido(mano, muestra), muestra);
}

/** Cómo se explica el tanto en pantalla, para la sección Aprender. */
export function explicarEnvido(mano: readonly Carta[], muestra: Carta): string {
  const cartas = cartasDelEnvido(mano, muestra);
  const total = sumarEnvido(cartas, muestra);

  if (cartas.length === 1) return `tres palos distintos: ${total}`;
  const [a, b] = cartas;
  if (esPieza(a, muestra)) return `pieza (${valorPieza(a, muestra)}) + ${indice(b)} = ${total}`;
  return `20 + ${indice(a)} + ${indice(b)} = ${total}`;
}
