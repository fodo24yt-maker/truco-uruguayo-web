/**
 * Los versos: que estén bien guardados y que salgan cuando corresponde.
 *
 * Lo que más importa acá no es el sorteo sino el ARCHIVADO. Un verso metido en
 * la familia equivocada hace que el rival te diga "le digo quiero y retruco"
 * cuando cantó envido, y eso no se ve en ningún otro test: el motor lo deja
 * pasar porque para el motor es texto.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { type Partida, nuevaPartida } from "./partida.ts";
import { VERSOS, claveDelCanto, versoDelCanto, type ClaveVerso } from "./versos.ts";

const CLAVES = Object.keys(VERSOS) as ClaveVerso[];

/** Un azar que devuelve siempre lo mismo, para que el test no dependa de suerte. */
const fijo = (n: number) => () => n;

const mesa = (): Partida => nuevaPartida(() => 0.5);

// ─── El archivado ───────────────────────────────────────────────────────────

test("cada verso nombra el canto al que pertenece", () => {
  // Es la red contra archivarlo mal: si un verso de truco termina en la
  // familia del envido, no va a nombrar la palabra "envido" y salta acá.
  const nombra: Record<ClaveVerso, string[]> = {
    flor: ["flor"],
    "contraflor-al-resto": ["contraflor al resto"],
    envido: ["envido"],
    "real-envido": ["real envido"],
    "falta-envido": ["falta envido"],
    truco: ["truco"],
    retruco: ["retruco"],
  };

  for (const clave of CLAVES) {
    for (const verso of VERSOS[clave]) {
      const texto = verso.lineas.join(" ").toLowerCase();
      assert.ok(
        nombra[clave].some((palabra) => texto.includes(palabra)),
        `${verso.id} está en "${clave}" pero no nombra el canto: ${texto}`,
      );
    }
  }
});

test("los ids no se repiten y las coplas están enteras", () => {
  const vistos = new Set<string>();
  for (const clave of CLAVES) {
    assert.ok(VERSOS[clave].length > 0, `${clave} se quedó sin versos`);
    for (const verso of VERSOS[clave]) {
      assert.ok(!vistos.has(verso.id), `id repetido: ${verso.id}`);
      vistos.add(verso.id);
      assert.ok(verso.lineas.length >= 4, `${verso.id} no llega a copla`);
      for (const linea of verso.lineas) {
        assert.ok(linea.trim().length > 0, `${verso.id} tiene un renglón vacío`);
      }
    }
  }
});

// ─── A qué canto corresponde ────────────────────────────────────────────────

test("el truco y el retruco se distinguen por el nivel de ANTES del canto", () => {
  const p = mesa();
  assert.equal(claveDelCanto({ tipo: "truco" }, p), "truco");

  const conTruco = { ...p, truco: { nivel: 1, querido: false, cantadoPor: "vos" as const } };
  assert.equal(claveDelCanto({ tipo: "truco" }, conTruco), "retruco");

  // El vale cuatro no tiene copla en la lista: se canta pelado.
  const conRetruco = { ...p, truco: { nivel: 2, querido: true, cantadoPor: "rival" as const } };
  assert.equal(claveDelCanto({ tipo: "truco" }, conRetruco), null);
});

test("cada canto de envido y de flor cae en su familia", () => {
  const p = mesa();
  assert.equal(claveDelCanto({ tipo: "envido", canto: "envido" }, p), "envido");
  assert.equal(claveDelCanto({ tipo: "envido", canto: "real-envido" }, p), "real-envido");
  assert.equal(claveDelCanto({ tipo: "envido", canto: "falta-envido" }, p), "falta-envido");
  assert.equal(claveDelCanto({ tipo: "flor" }, p), "flor");
  assert.equal(
    claveDelCanto({ tipo: "flor-canto", canto: "contraflor-al-resto" }, p),
    "contraflor-al-resto",
  );
  // Sin copla: se cantan pelados y no pasa nada.
  assert.equal(claveDelCanto({ tipo: "flor-canto", canto: "con-flor-envido" }, p), null);
  assert.equal(claveDelCanto({ tipo: "jugar", carta: p.muestra }, p), null);
  assert.equal(claveDelCanto({ tipo: "quiero" }, p), null);
});

// ─── Quién versea y quién no ────────────────────────────────────────────────

test("con la probabilidad en cero no versea nunca: son los de 1 y 2 estrellas", () => {
  for (const tirada of [0, 0.1, 0.5, 0.99]) {
    assert.equal(versoDelCanto({ tipo: "truco" }, mesa(), 0, fijo(tirada)), null);
  }
});

test("la probabilidad decide, y decide una sola vez", () => {
  // Con 0,3 de versero: una tirada de 0,2 versea y una de 0,4 no.
  assert.ok(versoDelCanto({ tipo: "truco" }, mesa(), 0.3, fijo(0.2)));
  assert.equal(versoDelCanto({ tipo: "truco" }, mesa(), 0.3, fijo(0.4)), null);
});

// ─── Los dos versos que necesitan que algo esté pasando en la mesa ──────────

test('"no se ponga tan contento" sólo sale si hay un envido enfrente', () => {
  const solo = mesa();
  const subiendo: Partida = {
    ...solo,
    pendiente: { tipo: "envido", cadena: ["envido"], de: "vos" },
  };

  // Abriendo con falta envido no hay envite ajeno del cual reírse.
  for (let i = 0; i < 40; i++) {
    const azar = fijo(i / 40);
    const v = versoDelCanto({ tipo: "envido", canto: "falta-envido" }, solo, 1, azar);
    assert.notEqual(v?.id, "falta-contento", "le contestó a un envido que nadie cantó");
  }

  // Subiendo, en cambio, tiene que poder salir.
  const salieron = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const v = versoDelCanto({ tipo: "envido", canto: "falta-envido" }, subiendo, 1, fijo(i / 40));
    if (v) salieron.add(v.id);
  }
  assert.ok(salieron.has("falta-contento"), "subiendo tendría que poder salir");
});

test('"le digo quiero y retruco" sólo sale contestando un truco cantado', () => {
  const nivelUno = { nivel: 1, querido: false, cantadoPor: "vos" as const };
  const libre: Partida = { ...mesa(), truco: nivelUno };
  const contestando: Partida = {
    ...libre,
    pendiente: { tipo: "truco", cadena: [], de: "vos" },
  };

  // En turno libre el verso no encaja y no hay otro de retruco: canta pelado.
  assert.equal(versoDelCanto({ tipo: "truco" }, libre, 1, fijo(0.1)), null);
  assert.equal(versoDelCanto({ tipo: "truco" }, contestando, 1, fijo(0.1))?.id, "retruco-cuco");
});

// ─── El sorteo ──────────────────────────────────────────────────────────────

test("no repite el mismo verso dos veces seguidas si hay con qué", () => {
  for (let i = 0; i < 60; i++) {
    const azar = fijo(i / 60);
    const primero = versoDelCanto({ tipo: "truco" }, mesa(), 1, azar);
    assert.ok(primero);
    const segundo = versoDelCanto({ tipo: "truco" }, mesa(), 1, azar, primero.id);
    assert.notEqual(segundo?.id, primero.id, "repitió la misma copla");
  }
});

test("si el único que encaja es el que hay que evitar, lo dice igual", () => {
  // El envido tiene una sola copla. Quedarse mudo por no repetir sería peor.
  const v = versoDelCanto({ tipo: "envido", canto: "envido" }, mesa(), 1, fijo(0.5), "envido-lazo");
  assert.equal(v?.id, "envido-lazo");
});

test("con probabilidad 1 siempre sale alguno de los que encajan", () => {
  for (let i = 0; i < 60; i++) {
    const v = versoDelCanto({ tipo: "flor" }, mesa(), 1, fijo(i / 60));
    assert.ok(v, "con probabilidad 1 no puede quedarse callado");
    assert.ok(VERSOS.flor.some((x) => x.id === v.id), `${v.id} no es un verso de flor`);
  }
});
