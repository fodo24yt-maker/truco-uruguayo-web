/**
 * Que cada carta de la fila caiga donde tiene que caer, y que las enseñadas
 * vayan del lado contrario al mazo.
 *
 * Lo que NO se prueba acá es que no se monten al mazo ni al mate en la
 * pantalla: eso depende del tamaño de la ventana y de la perspectiva, y lo
 * mide en el navegador `herramientas/mirar-mesa-nueva.mjs`. Acá se prueba la
 * regla, sobre manos de verdad.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { cartasEnMesa } from "./cartas-en-mesa.ts";
import {
  BAZA,
  type LadoMazo,
  uDeBaza,
  uDeEnseñada,
  uEnFila,
} from "./lugares-en-mesa.ts";
import {
  type Jugador,
  type Partida,
  accionesPosibles,
  aplicar,
  nuevaPartida,
  siguienteMano,
} from "./motor/partida.ts";

/** Azar reproducible: si una partida rompe, rompe siempre igual. */
function azarCon(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Juega partidas al azar y llama a `alCerrar` con cada mano terminada. */
function recorrerManos(semilla: number, alCerrar: (p: Partida) => void) {
  const azar = azarCon(semilla);
  let p = nuevaPartida(azar);
  for (let paso = 0; paso < 4000; paso++) {
    if (p.fase === "partida-terminada") return alCerrar(p);
    if (p.fase !== "jugando") {
      alCerrar(p);
      p = siguienteMano(p, azar);
      continue;
    }
    const posibles = accionesPosibles(p, p.turno);
    if (posibles.length === 0) return;
    p = aplicar(p, posibles[Math.floor(azar() * posibles.length)], p.turno);
  }
}

/** Lo mismo que cuenta la mesa: las bazas que tienen ALGO puesto. */
const jugadasEn = (p: Partida) => p.bazas.filter((b) => b.vos || b.rival).length;

const LADOS: LadoMazo[] = ["izquierda", "derecha"];
const cerca = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("uDeBaza da lo mismo que la cuenta que tenía la mesa", () => {
  // La de antes del 9/10/2026, copiada tal cual de `page.tsx`.
  const antes = (i: number, n: number) => (i - (Math.max(n, 1) - 1) / 2) * 0.13;
  for (let n = 0; n <= 3; n++) {
    for (let i = 0; i <= 2; i++) {
      assert.ok(cerca(uDeBaza(i, n), antes(i, n)), `baza ${i} con ${n} jugadas`);
    }
  }
  assert.equal(BAZA.paso, 0.13);
});

test("las enseñadas de más caen del lado CONTRARIO al mazo", () => {
  let casos = 0;
  for (let semilla = 1; semilla <= 120; semilla++) {
    recorrerManos(semilla, (p) => {
      const n = jugadasEn(p);
      for (const c of cartasEnMesa(p).cartas) {
        if (c.baza < n) continue; // los huecos van aparte
        casos++;
        // el borde del grupo de lo jugado, de cada lado
        const der = n === 0 ? 0 : uDeBaza(n - 1, n);
        const izq = n === 0 ? 0 : uDeBaza(0, n);
        const conMazoIzq = uDeEnseñada(c.baza, n, "izquierda");
        const conMazoDer = uDeEnseñada(c.baza, n, "derecha");
        const etiqueta = `semilla ${semilla}, ${c.quien}, baza ${c.baza} con ${n} jugadas`;
        if (n === 0 && c.baza === 0) {
          // sin nada jugado, la primera va al medio, de los dos lados
          assert.ok(cerca(conMazoIzq, 0) && cerca(conMazoDer, 0), etiqueta);
          continue;
        }
        assert.ok(conMazoIzq > der, `${etiqueta}: con el mazo a la izquierda no fue a la derecha`);
        assert.ok(conMazoDer < izq, `${etiqueta}: con el mazo a la derecha no fue a la izquierda`);
      }
    });
  }
  assert.ok(casos > 20, `muy pocos casos de enseñadas afuera del grupo (${casos})`);
});

test("las de más: un lado es el espejo exacto del otro", () => {
  for (let n = 0; n <= 3; n++) {
    // los huecos NO se espejan: están donde está la carta del otro
    for (let baza = n; baza <= 2; baza++) {
      assert.ok(
        cerca(uDeEnseñada(baza, n, "derecha"), -uDeEnseñada(baza, n, "izquierda")),
        `baza ${baza} con ${n} jugadas`,
      );
    }
  }
});

test("los huecos caen en su baza, al lado de la carta del otro", () => {
  let casos = 0;
  for (let semilla = 1; semilla <= 120; semilla++) {
    recorrerManos(semilla, (p) => {
      const n = jugadasEn(p);
      for (const c of cartasEnMesa(p).cartas) {
        if (c.baza >= n) continue;
        casos++;
        for (const lado of LADOS) {
          assert.ok(cerca(uDeEnseñada(c.baza, n, lado), uDeBaza(c.baza, n)));
        }
      }
    });
  }
  assert.ok(casos > 0, "en 120 semillas no hubo ni un hueco");
});

test("ninguna enseñada cae donde ya hay otra carta de la misma fila", () => {
  for (let semilla = 1; semilla <= 120; semilla++) {
    recorrerManos(semilla, (p) => {
      const n = jugadasEn(p);
      for (const lado of LADOS) {
        for (const quien of ["rival", "vos"] as Jugador[]) {
          const jugadas = p.bazas
            .map((b, i) => (b[quien] ? uDeBaza(i, n) : null))
            .filter((u): u is number => u !== null);
          const enseñadas = cartasEnMesa(p)
            .cartas.filter((c) => c.quien === quien)
            .map((c) => uDeEnseñada(c.baza, n, lado));
          const todas = [...jugadas, ...enseñadas];
          for (let a = 0; a < todas.length; a++) {
            for (let b = a + 1; b < todas.length; b++) {
              assert.ok(
                !cerca(todas[a], todas[b]),
                `semilla ${semilla}, ${quien}, mazo a la ${lado}: dos cartas en el mismo lugar`,
              );
            }
          }
        }
      }
    });
  }
});

test("tu carta se corre de la de él hacia el lado LIBRE, nunca hacia el mazo", () => {
  // Corrida siempre a la derecha, con el mazo a la derecha tu tercera carta
  // tapaba el cartelito de la muestra (medido el 9/10/2026).
  for (const desvio of [-0.13, 0, 0.13]) {
    assert.ok(uEnFila("vos", desvio, "izquierda") > uEnFila("rival", desvio, "izquierda"));
    assert.ok(uEnFila("vos", desvio, "derecha") < uEnFila("rival", desvio, "derecha"));
    // la de él no se corre nunca
    assert.ok(cerca(uEnFila("rival", desvio, "izquierda"), 0.5 + desvio));
    assert.ok(cerca(uEnFila("rival", desvio, "derecha"), 0.5 + desvio));
  }
});
