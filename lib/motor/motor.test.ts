/**
 * Verifica el motor contra los ejemplos de reglas.txt.
 * Correr con: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  BARAJA,
  type Carta,
  type Numero,
  type Palo,
  esPieza,
  fuerza,
  indice,
  piezaQueRepresenta,
  valorPieza,
} from "./baraja.ts";
import { analizarFlor, cartasDelEnvido, valorEnvido, valorFlor } from "./tantos.ts";

/** "7C" -> siete de copa, "10B" -> sota de basto */
function c(txt: string): Carta {
  const palos: Record<string, Palo> = {
    E: "espada",
    B: "basto",
    O: "oro",
    C: "copa",
  };
  return {
    numero: Number(txt.slice(0, -1)) as Numero,
    palo: palos[txt.slice(-1)],
  };
}
const mano = (...cs: string[]) => cs.map(c);

test("flor: cuándo se tiene (reglas 8.1)", () => {
  const m = c("3O");
  assert.equal(analizarFlor(mano("7C", "6C", "3C"), m).motivo, "tres-del-mismo-palo");
  assert.equal(analizarFlor(mano("2O", "4O", "7E"), m).motivo, "dos-piezas");
  assert.equal(analizarFlor(mano("2O", "6C", "12C"), m).motivo, "pieza-y-par");
  assert.equal(analizarFlor(mano("2O", "3O", "5C"), m).tiene, false);
});

test("flor: cuánto vale (reglas 8.4)", () => {
  const m = c("3O");
  assert.equal(valorFlor(mano("7C", "6C", "3C"), m), 36);
  assert.equal(valorFlor(mano("2O", "6C", "12C"), m), 36);
  assert.equal(valorFlor(mano("2O", "11O", "7E"), m), 44);
  assert.equal(valorFlor(mano("2O", "4O", "5O"), m), 47); // la máxima
});

test("envido: los ocho ejemplos de reglas 9.2", () => {
  const m = c("3B");
  assert.equal(valorEnvido(mano("7C", "6C", "12E"), m), 33);
  assert.equal(valorEnvido(mano("5E", "4E", "10O"), m), 29);
  assert.equal(valorEnvido(mano("12O", "7O", "3E"), m), 27);
  assert.equal(valorEnvido(mano("4B", "1E", "10C"), m), 30);
  assert.equal(valorEnvido(mano("2B", "7O", "12C"), m), 37); // el máximo
  assert.equal(valorEnvido(mano("10B", "12E", "12C"), m), 27);
  assert.equal(valorEnvido(mano("1E", "7O", "4C"), m), 7);
  assert.equal(valorEnvido(mano("12E", "11O", "10C"), m), 0);
});

/* ── CON QUÉ CARTAS SE CUENTA, QUE ES LO QUE SE DIBUJA AL CERRAR LA MANO ────
   `cartasDelEnvido` existe desde el 10/9/2026 porque el recuadro del final de
   la mano resalta las cartas que suman. Se prueban las tres cosas que pueden
   salir mal por separado: CUÁNTAS devuelve, CUÁLES, y —la que de verdad
   importa— que sean siempre las que dan el número. */
test("cartasDelEnvido: los tres casos, con cuántas y cuáles", () => {
  const m = c("3B");
  const txt = (cartas: readonly Carta[]) =>
    cartas.map((x) => `${x.numero}${x.palo[0].toUpperCase()}`).join("+");

  // A) con pieza: la pieza y la más alta de las otras dos, sin mirar el palo.
  //    (el 4 de basto es pieza porque la muestra es de basto)
  assert.equal(txt(cartasDelEnvido(mano("4B", "1E", "10C"), m)), "4B+1E");
  // y con DOS piezas, la segunda entra por su número pelado
  assert.equal(txt(cartasDelEnvido(mano("2B", "7O", "12C"), m)), "2B+7O");

  // B) dos del mismo palo: las dos que más suman, no las dos primeras
  assert.equal(txt(cartasDelEnvido(mano("7C", "6C", "12E"), m)), "7C+6C");
  assert.equal(txt(cartasDelEnvido(mano("12O", "7O", "3E"), m)), "12O+7O");

  // C) tres palos distintos: UNA SOLA carta, la más alta
  const sola = cartasDelEnvido(mano("1E", "7O", "4C"), m);
  assert.equal(sola.length, 1, "con tres palos distintos se cuenta una sola");
  assert.equal(txt(sola), "7O");
  // y con tres figuras, que valen 0, sigue siendo una sola
  assert.equal(cartasDelEnvido(mano("12E", "11O", "10C"), m).length, 1);
});

/* Este es el que sostiene a los otros: sin él, `cartasDelEnvido` podría
   devolver cualquier par y las pruebas de arriba seguirían pasando mientras el
   número, que sale de otro lado, diera bien. Recorre la baraja entera. */
test("las cartas del envido son SIEMPRE las que dan el número", () => {
  for (const muestra of BARAJA) {
    for (let i = 0; i < BARAJA.length; i += 7) {
      for (let j = i + 1; j < BARAJA.length; j += 11) {
        for (let k = j + 1; k < BARAJA.length; k += 13) {
          const tres = [BARAJA[i], BARAJA[j], BARAJA[k]];
          const elegidas = cartasDelEnvido(tres, muestra);
          const nombre = `${tres.map((x) => `${x.numero}${x.palo[0]}`).join(",")} con muestra ${muestra.numero}${muestra.palo[0]}`;

          // todas salen de la mano, ninguna repetida
          assert.equal(new Set(elegidas).size, elegidas.length, `repetida en ${nombre}`);
          for (const x of elegidas) assert.ok(tres.includes(x), `carta ajena en ${nombre}`);

          /* Y suman exactamente el tanto. La cuenta se rehace ACÁ, escrita
             de nuevo desde reglas 9.2, para no preguntarle a la misma función
             que estamos probando. */
          const suma =
            elegidas.length === 1
              ? indice(elegidas[0])
              : esPieza(elegidas[0], muestra)
                ? valorPieza(elegidas[0], muestra) + indice(elegidas[1])
                : 20 + indice(elegidas[0]) + indice(elegidas[1]);
          assert.equal(suma, valorEnvido(tres, muestra), `no cuadra en ${nombre}`);

          // con pieza, la pieza va PRIMERA: de eso depende la cuenta de arriba
          // y también la que hace `sumarEnvido` adentro de tantos.ts
          if (elegidas.length === 2 && esPieza(elegidas[1], muestra)) {
            assert.ok(esPieza(elegidas[0], muestra), `pieza en segundo lugar en ${nombre}`);
          }
        }
      }
    }
  }
});

test("la muestra es pieza: el 12 la reemplaza (reglas 4.3)", () => {
  const m = c("5O"); // el cinco de oro es la muestra
  assert.equal(esPieza(c("12O"), m), true);
  assert.equal(valorPieza(c("12O"), m), 28); // hace de 5
  assert.equal(piezaQueRepresenta(c("12O"), m), 5);
  assert.equal(esPieza(c("12E"), m), false); // los otros reyes, comunes
  assert.equal(fuerza(c("12O"), m) > fuerza(c("1E"), m), true);
});

test("las tres manos de ejemplo (reglas 15)", () => {
  let m = c("3C");
  assert.equal(valorEnvido(mano("1E", "7E", "4B"), m), 28);
  assert.equal(valorEnvido(mano("3O", "12O", "6B"), m), 23);

  m = c("5O");
  assert.equal(valorFlor(mano("2O", "11O", "7B"), m), 44);
  assert.equal(valorFlor(mano("7C", "6C", "3C"), m), 36);

  m = c("6E");
  assert.equal(valorEnvido(mano("4E", "7C", "3B"), m), 36);
  assert.equal(analizarFlor(mano("4E", "7C", "3B"), m).tiene, false);
  assert.equal(valorEnvido(mano("3O", "3C", "2B"), m), 3);
});

test("jerarquía: las piezas le ganan a todo, y los treses pardan", () => {
  const m = c("3O");
  assert.equal(fuerza(c("4O"), m) > fuerza(c("1E"), m), true); // pieza > ancho
  assert.equal(fuerza(c("1E"), m) > fuerza(c("1B"), m), true);
  assert.equal(fuerza(c("7O"), m) > fuerza(c("3E"), m), true); // el 7 de oro
  assert.equal(fuerza(c("3E"), m), fuerza(c("3C"), m)); // parda
  assert.equal(fuerza(c("1O"), m) < fuerza(c("2C"), m), true); // ancho falso
  assert.equal(fuerza(c("4C"), m) < fuerza(c("5C"), m), true); // la más floja
});

test("máximos y mínimos, por fuerza bruta sobre las 40 cartas", () => {
  let maxEnvido = 0;
  let minEnvido = 99;
  let maxFlor = 0;
  let maxEnvidoSinPiezas = 0;

  for (const muestra of BARAJA) {
    const resto = BARAJA.filter((x) => x !== muestra);
    for (let i = 0; i < resto.length; i++) {
      for (let j = i + 1; j < resto.length; j++) {
        for (let k = j + 1; k < resto.length; k++) {
          const h = [resto[i], resto[j], resto[k]];
          if (analizarFlor(h, muestra).tiene) {
            maxFlor = Math.max(maxFlor, valorFlor(h, muestra));
          } else {
            const e = valorEnvido(h, muestra);
            maxEnvido = Math.max(maxEnvido, e);
            minEnvido = Math.min(minEnvido, e);
            if (!h.some((x) => esPieza(x, muestra))) {
              maxEnvidoSinPiezas = Math.max(maxEnvidoSinPiezas, e);
            }
          }
        }
      }
    }
  }

  assert.equal(maxEnvido, 37);
  assert.equal(minEnvido, 0);
  assert.equal(maxEnvidoSinPiezas, 33);
  assert.equal(maxFlor, 47);
});

test("la jerarquía cubre las 40 cartas sin agujeros", () => {
  const m = c("3O");
  const fuerzas = BARAJA.map((x) => fuerza(x, m));
  assert.equal(BARAJA.length, 40);
  assert.equal(new Set(fuerzas).size, 19); // 19 escalones (reglas 5.1)
  assert.equal(Math.max(...fuerzas), 100); // el 2 de la muestra
});
