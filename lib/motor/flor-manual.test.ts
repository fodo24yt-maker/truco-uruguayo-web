/**
 * La flor se canta a mano, y el envido va primero.
 *
 * Estas dos cosas cambiaron juntas y son las que más fácil se rompen, porque
 * dependen de CUÁNDO habló cada uno. Casi todo lo de acá verifica lo contrario
 * de lo que se suele testear: que el botón NO esté disponible en los momentos
 * en que no corresponde. Un botón de flor que aparece de más regala 3 puntos;
 * uno que aparece de menos te hace perder la flor sin motivo.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { type Carta, desdeTexto as c } from "./baraja.ts";
import {
  type Accion,
  type Jugador,
  type Partida,
  accionesPosibles,
  aplicar,
  nuevaPartida,
} from "./partida.ts";
import { analizarFlor } from "./tantos.ts";

/** Una mesa con las cartas puestas a mano, para poder probar casos concretos. */
function mesa(vos: string[], rival: string[], muestra: string, esMano: Jugador = "vos"): Partida {
  const m = c(muestra);
  const cartasVos = vos.map(c);
  const cartasRival = rival.map(c);
  return {
    ...nuevaPartida(() => 0),
    puntos: { vos: 0, rival: 0 },
    quienEsMano: esMano,
    muestra: m,
    cartas: { vos: cartasVos, rival: cartasRival },
    manoInicial: { vos: [...cartasVos], rival: [...cartasRival] },
    flor: { vos: analizarFlor(cartasVos, m), rival: analizarFlor(cartasRival, m) },
    bazas: [{ vos: null, rival: null, abre: esMano, ganador: null }],
    turno: esMano,
    pendiente: null,
    trucoEnEspera: null,
    envidoCerrado: false,
    florResuelta: true,
    florCantada: { vos: false, rival: false },
    yaHablo: { vos: false, rival: false },
    truco: { nivel: 0, querido: false, cantadoPor: null },
    fase: "jugando",
    ganadorMano: null,
    ganadorPartida: null,
    eventos: [],
    historial: [],
  };
}

const tipos = (p: Partida, quien: Jugador) =>
  new Set(accionesPosibles(p, quien).map((a: Accion) => a.tipo));
const puede = (p: Partida, quien: Jugador, tipo: Accion["tipo"]) => tipos(p, quien).has(tipo);

// Manos de referencia. Muestra 3B: las piezas son de basto.
const FLOR_VOS = ["7C", "6C", "3C"]; // tres copas: flor 36
const FLOR_RIVAL = ["2B", "4B", "5B"]; // tres piezas: flor 47, la máxima
const SIN_FLOR_VOS = ["1E", "7E", "4O"];
const SIN_FLOR_RIVAL = ["3O", "12O", "6C"];

// ─── Cuándo NO tiene que estar el botón ─────────────────────────────────────

test("sin flor, la acción no aparece nunca: barrido por muchos repartos", () => {
  for (let semilla = 1; semilla <= 300; semilla++) {
    let p = nuevaPartida(() => (semilla * 7919) % 1000 / 1000);
    p = nuevaPartida(Math.random);
    for (const quien of ["vos", "rival"] as Jugador[]) {
      if (p.flor[quien].tiene) continue;
      assert.ok(
        !accionesPosibles(p, quien).some((a) => a.tipo === "flor" || a.tipo === "flor-canto"),
        "apareció la flor sin tenerla",
      );
    }
  }
});

test("no aparece si no es tu turno", () => {
  const p = mesa(FLOR_VOS, FLOR_RIVAL, "3B", "rival");
  assert.ok(p.flor.vos.tiene);
  assert.deepEqual(accionesPosibles(p, "vos"), [], "no es tu turno: no podés hacer nada");
});

test("no aparece después de tirar tu primera carta: flor no cantada, flor perdida", () => {
  let p = mesa(FLOR_VOS, SIN_FLOR_RIVAL, "3B");
  assert.ok(puede(p, "vos", "flor"));

  p = aplicar(p, { tipo: "jugar", carta: c("3C") }, "vos");
  p = aplicar(p, { tipo: "jugar", carta: c("3O") }, "rival");
  assert.ok(!puede(p, p.turno, "flor"), "la flor tenía que perderse al tirar carta");
  assert.equal(p.puntos.vos, 0, "no se cobró una flor que nunca se cantó");
});

test("no aparece en la segunda ni en la tercera baza", () => {
  let p = mesa(FLOR_VOS, SIN_FLOR_RIVAL, "3B");
  p = aplicar(p, { tipo: "jugar", carta: c("3C") }, "vos");
  p = aplicar(p, { tipo: "jugar", carta: c("12O") }, "rival");
  assert.equal(p.bazas.length, 2, "tendría que haber arrancado la segunda baza");
  for (const quien of ["vos", "rival"] as Jugador[]) {
    assert.ok(!puede(p, quien, "flor"));
    assert.ok(!puede(p, quien, "flor-canto"));
  }
});

test("no se puede cantar dos veces", () => {
  let p = mesa(FLOR_VOS, SIN_FLOR_RIVAL, "3B");
  p = aplicar(p, { tipo: "flor" }, "vos");
  assert.equal(p.puntos.vos, 3);
  assert.ok(!puede(p, "vos", "flor"), "ya la cantó: no puede cobrarla de nuevo");

  // Y por las dudas: forzar la acción no cambia nada
  const forzado = aplicar(p, { tipo: "flor" }, "vos");
  assert.equal(forzado.puntos.vos, 3, "cantarla dos veces no puede sumar 6");
});

test("teniendo flor, el envido no está entre tus opciones (reglas 9.1)", () => {
  const p = mesa(FLOR_VOS, SIN_FLOR_RIVAL, "3B");
  assert.ok(puede(p, "vos", "flor"));
  assert.ok(!puede(p, "vos", "envido"), "la flor anula el envido");
});

// ─── Que no se filtre la flor del rival ─────────────────────────────────────

test("ANTI-FILTRACIÓN: el envido sigue disponible para el que no tiene flor", () => {
  // El rival tiene flor y vos no. Si el motor cerrara el envido al repartir,
  // verías el botón apagado y sabrías que el rival tiene flor sin que haya
  // cantado nada. Eso es hacer trampa a favor tuyo.
  const p = mesa(SIN_FLOR_VOS, FLOR_RIVAL, "3B");
  assert.ok(p.flor.rival.tiene && !p.flor.vos.tiene);
  assert.equal(p.envidoCerrado, false, "el envido no se cierra al repartir");
  assert.ok(puede(p, "vos", "envido"), "tenés que poder cantar envido igual");
});

test("los tres cantos de flor aparecen tenga o no tenga flor el rival", () => {
  // Si "con flor envido" sólo apareciera cuando el rival tiene flor, el botón
  // sería un soplo. Aparecen siempre; si el otro no tiene, se cobran los 3.
  const conRival = tipos(mesa(FLOR_VOS, FLOR_RIVAL, "3B"), "vos");
  const sinRival = tipos(mesa(FLOR_VOS, SIN_FLOR_RIVAL, "3B"), "vos");
  assert.deepEqual(conRival, sinRival, "las opciones no pueden delatar al rival");
});

test("cantar con flor envido cuando el rival no tiene: se cobran los 3 y sigue", () => {
  let p = mesa(FLOR_VOS, SIN_FLOR_RIVAL, "3B");
  p = aplicar(p, { tipo: "flor-canto", canto: "con-flor-envido" }, "vos");
  assert.equal(p.puntos.vos, 3, "no había con quién subirla");
  assert.equal(p.fase, "jugando");
  assert.equal(p.pendiente, null);
});

// ─── La flor arriba de otros cantos ─────────────────────────────────────────

test("la flor anula el envido cantado y no se cobra nada por él (reglas 14.3.3)", () => {
  let p = mesa(FLOR_VOS, SIN_FLOR_RIVAL, "3B", "rival");
  p = aplicar(p, { tipo: "envido", canto: "envido" }, "rival");
  assert.equal(p.turno, "vos");
  assert.ok(puede(p, "vos", "flor"), "con flor podés contestarle la flor");
  assert.ok(!puede(p, "vos", "envido"), "no vas a envidar teniendo flor");

  p = aplicar(p, { tipo: "flor" }, "vos");
  assert.equal(p.puntos.rival, 0, "el envido anulado no se cobra");
  assert.equal(p.puntos.vos, 3, "sólo se cobra la flor");
});

test("la flor arriba de un truco: el truco queda esperando, no se pierde", () => {
  // Éste es el caso que trababa la mano entera: el truco quedaba sin nadie a
  // quien preguntarle y la partida no terminaba nunca.
  let p = mesa(FLOR_VOS, SIN_FLOR_RIVAL, "3B", "rival");
  p = aplicar(p, { tipo: "truco" }, "rival");
  assert.ok(puede(p, "vos", "flor"));

  p = aplicar(p, { tipo: "flor" }, "vos");
  assert.equal(p.puntos.vos, 3);
  assert.equal(p.pendiente?.tipo, "truco", "el truco tiene que volver");
  assert.equal(p.turno, "vos", "y te toca contestarlo a vos");
  assert.ok(puede(p, "vos", "quiero"));
});

// ─── El envido va primero ───────────────────────────────────────────────────

test("EL ENVIDO VA PRIMERO: si el mano canta truco, el pie puede envidar", () => {
  // El rival es mano y abre cantando truco. Vos no hablaste todavía.
  let p = mesa(SIN_FLOR_VOS, SIN_FLOR_RIVAL, "3B", "rival");
  p = aplicar(p, { tipo: "truco" }, "rival");

  assert.equal(p.turno, "vos");
  assert.ok(puede(p, "vos", "envido"), "el envido va primero (reglas 14.2)");

  p = aplicar(p, { tipo: "envido", canto: "envido" }, "vos");
  assert.equal(p.pendiente?.tipo, "envido", "ahora se discute el envido");
  assert.equal(p.trucoEnEspera?.tipo, "truco", "y el truco espera su turno");

  p = aplicar(p, { tipo: "quiero" }, "rival");
  assert.equal(p.pendiente?.tipo, "truco", "resuelto el envido, vuelve el truco");
  assert.equal(p.turno, "vos", "y lo contesta el mismo que lo tenía que contestar");
});

test("pero si YA HABLASTE, se te fue: el mano que tiró carta no puede envidar", () => {
  // Sos mano, tirás carta sin cantar nada. El pie te canta truco. Ya está: tu
  // oportunidad de cantar el envido era antes.
  let p = mesa(SIN_FLOR_VOS, SIN_FLOR_RIVAL, "3B", "vos");
  p = aplicar(p, { tipo: "jugar", carta: c("4O") }, "vos");
  assert.equal(p.yaHablo.vos, true);

  p = aplicar(p, { tipo: "truco" }, "rival");
  assert.equal(p.turno, "vos");
  assert.ok(!puede(p, "vos", "envido"), "ya habló: se le fue el envido");
  assert.deepEqual(tipos(p, "vos"), new Set(["quiero", "no-quiero", "truco"]));
});

test("el que canta truco tampoco puede después salir con el envido", () => {
  let p = mesa(SIN_FLOR_VOS, SIN_FLOR_RIVAL, "3B", "vos");
  p = aplicar(p, { tipo: "truco" }, "vos");
  assert.equal(p.yaHablo.vos, true, "cantar truco gasta tu turno de hablar");
  p = aplicar(p, { tipo: "quiero" }, "rival");
  assert.ok(!puede(p, "vos", "envido"));
});

test("el envido sigue vivo en turno libre mientras no se tire la segunda carta", () => {
  let p = mesa(SIN_FLOR_VOS, SIN_FLOR_RIVAL, "3B", "rival");
  p = aplicar(p, { tipo: "jugar", carta: c("3O") }, "rival");
  // El pie todavía no tiró: puede cantarlo (reglas 9.1)
  assert.ok(puede(p, "vos", "envido"));
  p = aplicar(p, { tipo: "jugar", carta: c("1E") }, "vos");
  assert.equal(p.envidoCerrado, true);
});

// ─── Que las partidas no se traben ──────────────────────────────────────────

test("cantar flor arriba de un truco nunca deja la mano trabada", () => {
  // Recorre las dos combinaciones de quién es mano y verifica que siempre haya
  // algo que hacer: si en algún momento el que tiene el turno se queda sin
  // acciones posibles, la mano se cuelga para siempre.
  for (const esMano of ["vos", "rival"] as Jugador[]) {
    for (const canto of ["flor", "con-flor-envido", "contraflor-al-resto"] as const) {
      let p = mesa(FLOR_VOS, FLOR_RIVAL, "3B", esMano);
      const otroJugador: Jugador = esMano === "vos" ? "rival" : "vos";
      p = aplicar(p, { tipo: "truco" }, esMano);
      const accion: Accion =
        canto === "flor" ? { tipo: "flor" } : { tipo: "flor-canto", canto };
      p = aplicar(p, accion, otroJugador);

      // Se juega hasta que la mano cierre, sin quedarse nunca sin jugadas
      for (let i = 0; i < 60 && p.fase === "jugando"; i++) {
        const posibles = accionesPosibles(p, p.turno);
        assert.ok(posibles.length > 0, `se trabó con ${canto}, mano ${esMano}`);
        p = aplicar(p, posibles[0], p.turno);
      }
      assert.notEqual(p.fase, "jugando", `no cerró con ${canto}, mano ${esMano}`);
    }
  }
});

test("ANTI-FILTRACIÓN: no se muestra la flor de quien no la cantó", () => {
  // Vos tenés flor pero tirás carta sin cantarla: la perdiste. El rival canta
  // la suya y cobra. Tu flor NO puede aparecer en el registro: en la mesa, la
  // flor que no se canta no la ve nadie, y saber que el otro tenía 38 le dice
  // al rival que te quedan cartas buenas.
  // (Tu flor es 36: 20 + 7 + 6 + 3, sin piezas porque la muestra es de basto.)
  let p = mesa(FLOR_VOS, FLOR_RIVAL, "3B", "vos");
  assert.equal(p.flor.vos.valor, 36);
  assert.equal(p.flor.rival.valor, 47);

  p = aplicar(p, { tipo: "jugar", carta: c("3C") }, "vos");
  p = aplicar(p, { tipo: "flor" }, "rival");

  const registro = p.eventos.map((e) => e.texto).join(" | ");
  assert.ok(registro.includes("Flor: 47"), "la flor cantada sí se muestra");
  assert.ok(!registro.includes("Flor: 36"), `se filtró tu flor sin cantar: ${registro}`);
  assert.equal(p.puntos.rival, 3);
});
