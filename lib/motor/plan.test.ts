/**
 * El plan: el marcador y la administración de la mentira.
 *
 * OJO AL LEER ESTO: el dial `plan` está hoy en CERO para los 19 rivales, y el
 * motivo está contado largo en `plan.ts` —se midió de cinco formas y no se pudo
 * demostrar que sirva—. Estos tests siguen valiendo igual por dos razones:
 *
 *  1. lo que NO depende de `plan` sí está en uso: el umbral de la falta envido
 *     y cómo lo corre la lectura, que es lo que produce el "con 31 te la
 *     aceptan igual porque saben que mentís";
 *  2. el día que se prenda el dial, tiene que hacer lo que dice que hace.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  ajustePorMarcador,
  convieneLaFalta,
  creditoDe,
  mentiraEfectiva,
  situacion,
  umbralDeLaFalta,
} from "./plan.ts";
import { SIN_AJUSTE, fichaVacia } from "./lectura.ts";

const marcador = (vos: number, rival: number) => situacion({ vos, rival }, "vos");

// ─── Leer el marcador ───────────────────────────────────────────────────────

test("la falta envido apunta siempre al que va ganando", () => {
  // No es una heurística: la falta paga lo que le falta AL PUNTERO. Si el
  // puntero sos vos, ganarla te deja justo en 30; si vas abajo, ganarla te
  // acerca y perderla lo deja a él en 30. Toda la asimetría del canto es ésta.
  const arriba = marcador(20, 8);
  assert.equal(arriba.faltaMeDaLaPartida, true);
  assert.equal(arriba.faltaSeLaDa, false);
  assert.equal(arriba.mios + arriba.falta, 30, "ganarla tiene que dejarme justo en 30");

  const abajo = marcador(8, 20);
  assert.equal(abajo.faltaMeDaLaPartida, false);
  assert.equal(abajo.faltaSeLaDa, true);
  assert.ok(abajo.mios + abajo.falta < 30, "yendo abajo, ganarla NO alcanza");
});

test("empatados, la falta se la lleva el que la gane", () => {
  const s = marcador(15, 15);
  assert.equal(s.faltaMeDaLaPartida, true);
  assert.equal(s.faltaSeLaDa, true);
});

test("ahogado es que el otro está por ganar y yo no", () => {
  assert.equal(marcador(5, 27).ahogado, true, "él a 3 de ganar y yo a 25");
  assert.equal(marcador(27, 5).ahogado, false, "el que va ganando no está ahogado");
  assert.equal(marcador(26, 27).ahogado, false, "a un punto cada uno no hay nada que soltar");
});

// ─── El ajuste por marcador ─────────────────────────────────────────────────

test("con plan en 0 el marcador no mueve absolutamente nada", () => {
  for (const [a, b] of [[0, 0], [27, 3], [3, 27], [29, 29]]) {
    assert.deepEqual(ajustePorMarcador(marcador(a, b), 0), SIN_AJUSTE);
  }
});

test("EL QUE VA ABAJO ARRIESGA Y EL QUE VA ARRIBA CUIDA, no al revés", () => {
  /* La primera versión de esto tenía el signo dado vuelta —el que iba perdiendo
     se ponía prudente— y medido costaba dos puntos de winrate. Es el mismo error
     que ya se había cometido una vez en la tabla de `personalidades.ts`, así que
     queda con test propio: no jugar es la forma más segura de seguir perdiendo. */
  const abajo = ajustePorMarcador(marcador(5, 20), 1);
  const arriba = ajustePorMarcador(marcador(20, 5), 1);

  assert.ok(abajo.quiereEnvido < 0, "el que va abajo tiene que querer con menos tanto");
  assert.ok(abajo.quiereTruco < 0, "y querer el truco con menos mano");
  assert.ok(arriba.quiereTruco > abajo.quiereTruco, "el que va arriba se juega menos");
});

test("ahogado suelta todo, y eso pisa a las demás reglas", () => {
  const s = marcador(4, 28);
  const a = ajustePorMarcador(s, 1);
  assert.ok(a.quiereEnvido <= -3, `ahogado tiene que soltarse: ${a.quiereEnvido}`);
  assert.ok(a.cantaTruco < 0, "y cantar más");
});

// ─── La falta envido ────────────────────────────────────────────────────────

test("EL NÚMERO QUE PIDIÓ SANTIAGO: la falta se quiere con 33, y con 30 si el otro miente", () => {
  /* Textual: "usualmente un falta envido lo aceptás con 33 o 34. Pero si ven
     que mentís mucho, con 31 o 32 te la aceptan igual".

     El umbral sale de `quiereEnvidoCon` del ★5 (28) más lo que se le exige de
     más a la falta (5), y la lectura lo corre. Entra SIEMPRE, tenga plan o no:
     es lo que hace que mentirle seguido a El Turco se pague. */
  const s = marcador(10, 10);
  const sinDatos = umbralDeLaFalta(28, 0, s, 0);
  assert.equal(sinDatos, 33, "contra alguien de quien no sabe nada, 33");

  const contraMentiroso = umbralDeLaFalta(28, -5, s, 0);
  assert.ok(
    contraMentiroso >= 29 && contraMentiroso <= 31,
    `al mentiroso hay que quererle la falta con ~30, no con ${contraMentiroso}`,
  );

  const contraHonesto = umbralDeLaFalta(28, 1.5, s, 0);
  assert.ok(contraHonesto > sinDatos, "al honesto hay que creerle más, no menos");
});

test("la lectura no puede volver loco al que quiere una falta envido", () => {
  // Con la partida entera sobre la mesa, el tope general de la lectura (−5) es
  // demasiado: dejaría al ★5 queriendo la falta con 28, que no lo hace nadie
  // por más mentiroso que sea el otro.
  const s = marcador(10, 10);
  for (const lectura of [-50, -5, 0, 5, 50]) {
    const u = umbralDeLaFalta(28, lectura, s, 1);
    assert.ok(u >= 28 && u <= 37, `umbral fuera de lo jugable: ${u}`);
  }
});

test("con plan, la falta se canta yendo arriba y no yendo abajo", () => {
  assert.equal(convieneLaFalta(marcador(20, 8), 1), true, "yendo arriba, la falta cierra la partida");
  assert.equal(convieneLaFalta(marcador(8, 20), 1), false, "yendo abajo, se la estoy regalando");
  assert.equal(convieneLaFalta(marcador(4, 28), 1), true, "ahogado, ya da lo mismo");
});

test("sin plan, la falta se canta con la regla de siempre", () => {
  assert.equal(convieneLaFalta(marcador(8, 20), 0), true, "la falta paga 10: se canta");
  assert.equal(convieneLaFalta(marcador(8, 27), 0), false, "paga 3: no vale la pena");
});

// ─── El crédito ─────────────────────────────────────────────────────────────

const espejoCon = (extra: Record<string, number>) => ({ ...fichaVacia(), ...extra });

test("el crédito arranca en cero: primero hay que ganarse que te crean", () => {
  assert.equal(creditoDe(fichaVacia()), 0);
});

test("mostrar cartas buenas cuando cantás da crédito; que te agarren lo funde", () => {
  const honesto = espejoCon({ envidosCantados: 2, envidosFlojos: 0, trucosCantados: 2, trucosFlojos: 0 });
  assert.ok(creditoDe(honesto) > 0.9, "cuatro cantos y ninguna mentira: te creen");

  const agarrado = espejoCon({ envidosCantados: 2, envidosFlojos: 2, trucosCantados: 2, trucosFlojos: 2 });
  assert.equal(creditoDe(agarrado), 0, "si te agarraron todas, no te cree nadie");

  const unFarol = espejoCon({ envidosCantados: 3, envidosFlojos: 0, farolesCazados: 2 });
  assert.ok(creditoDe(unFarol) < creditoDe(honesto), "un farol cazado cuesta, aunque no se vean cartas");
});

// ─── La mentira administrada ────────────────────────────────────────────────

test("con plan en 0 la mentira es exactamente la de siempre", () => {
  const s = marcador(10, 10);
  for (const credito of [0, 0.5, 1]) {
    assert.equal(mentiraEfectiva(0.35, credito, s, 0), 0.35);
  }
});

test("NO MIENTE ANTES DE HABERSE GANADO QUE LE CREAN, y después sí", () => {
  /* Lo que pidió Santiago con todas las letras: "mentir solamente cuando
     anteriormente te dijeron la verdad y te ganaron mostrándote cartas buenas".

     Y el detalle que hace que sea una jugada y no una pérdida: con el crédito
     lleno miente MÁS que su base, no igual. La cantidad total de mentiras se
     parece a la de antes; lo que cambia es CUÁNDO se dicen. */
  const s = marcador(10, 10);
  const base = 0.35;
  const sinCredito = mentiraEfectiva(base, 0, s, 1);
  const conCredito = mentiraEfectiva(base, 1, s, 1);

  assert.ok(sinCredito < base * 0.3, `recién sentado casi no miente: ${sinCredito}`);
  assert.ok(conCredito > base, `con crédito tiene que mentir MÁS que su base: ${conCredito}`);
  assert.ok(conCredito > sinCredito * 5, "la diferencia tiene que ser grande, si no no es una jugada");
});

test("el que se está por quedar sin partida miente igual", () => {
  // Administrar la fama no le sirve de nada al que va 8 a 27. Eso también es
  // verdad en la mesa.
  const ahogado = marcador(8, 27);
  assert.equal(mentiraEfectiva(0.35, 0, ahogado, 1), 0.35);
});

test("el que no miente nunca sigue sin mentir, tenga el crédito que tenga", () => {
  const s = marcador(10, 10);
  assert.equal(mentiraEfectiva(0, 1, s, 1), 0);
});
