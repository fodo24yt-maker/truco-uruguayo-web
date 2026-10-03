/**
 * La ficha que el bot arma del rival.
 *
 * Lo más importante que se prueba acá no es que la ficha acierte, sino que NO
 * SEPA COSAS QUE NO PUEDE SABER. El bot no mira tus cartas: si en dos partidas
 * jugaste igual pero te quedó otra carta en la mano, la ficha tiene que salir
 * idéntica. Eso es lo que separa un rival de un tramposo.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { BARAJA, calidadConHuecos, calidadDeMano, desdeTexto as c } from "./baraja.ts";
import {
  type Accion,
  type Jugador,
  type Partida,
  aplicar,
  nuevaPartida,
} from "./partida.ts";
import { analizarFlor, valorEnvido } from "./tantos.ts";
import { SIN_AJUSTE, TOPES, ajustePorLectura, fichaVacia, observarMano } from "./lectura.ts";
import { decidirJugada } from "./bot.ts";
import { buscarPersonalidad } from "./personalidades.ts";

function mesa(vos: string[], rival: string[], muestra: string, esMano: Jugador = "vos"): Partida {
  const m = c(muestra);
  const cv = vos.map(c);
  const cr = rival.map(c);
  return {
    ...nuevaPartida(() => 0),
    puntos: { vos: 0, rival: 0 },
    quienEsMano: esMano,
    muestra: m,
    cartas: { vos: cv, rival: cr },
    manoInicial: { vos: [...cv], rival: [...cr] },
    flor: { vos: analizarFlor(cv, m), rival: analizarFlor(cr, m) },
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

/**
 * Aplica las jugadas en orden, siempre al que le toca. Deducir el turno del
 * propio motor evita escribir mal el orden en el test, que es un error muy
 * fácil de cometer cuando cambia quién abre según quién ganó la baza.
 */
function correr(p: Partida, jugadas: Accion[]): Partida {
  for (const accion of jugadas) {
    const quien = p.turno;
    const antes = p;
    p = aplicar(p, accion, quien);
    assert.notEqual(p, antes, `jugada rechazada: ${quien} ${accion.tipo}`);
  }
  return p;
}

const jugar = (carta: string): Accion => ({ tipo: "jugar", carta: c(carta) });
const ENVIDO: Accion = { tipo: "envido", canto: "envido" };
const QUIERO: Accion = { tipo: "quiero" };
const NO_QUIERO: Accion = { tipo: "no-quiero" };
const TRUCO: Accion = { tipo: "truco" };

// ─── Lo que ve, lo anota ────────────────────────────────────────────────────

test("cantaste envido con poco y te lo quisieron: queda anotado", () => {
  // Muestra 3B. Vos: 12O, 5C, 4E -> tanto 5, un desastre. Cantás igual.
  let p = mesa(["12O", "5C", "4E"], ["7O", "6O", "1B"], "3B");
  p = correr(p, [
    ENVIDO, QUIERO,
    jugar("12O"), jugar("6O"), // la gana vos
    jugar("5C"), jugar("7O"), // la gana el rival
    jugar("1B"), jugar("4E"), // y la tercera también
  ]);

  const f = observarMano(fichaVacia(), p, "vos");
  assert.equal(f.envidosCantados, 1);
  assert.equal(f.envidosFlojos, 1, "cantó envido con 5: eso es mentir");
});

test("EL CASO QUE PEDISTE: te dijeron no quiero, pero mostraste las tres cartas", () => {
  // El bot no le quiso el envido, así que el tanto no se cantó. Pero la mano se
  // jugó entera: las tres cartas quedaron sobre la mesa y las puede contar.
  let p = mesa(["12O", "5C", "4E"], ["7O", "6O", "1B"], "3B");
  p = correr(p, [
    ENVIDO, NO_QUIERO,
    jugar("12O"), jugar("6O"),
    jugar("5C"), jugar("7O"),
    jugar("1B"), jugar("4E"),
  ]);

  const f = observarMano(fichaVacia(), p, "vos");
  assert.equal(f.envidosCantados, 1);
  assert.equal(f.envidosFlojos, 1, "las tres cartas estaban a la vista: tenía 5");
});

test("te fuiste a la pesca: te callaste con buen tanto y después subiste", () => {
  // Vos: 7O, 6O, 12E -> tanto 33. No cantás; deja que cante él y le sube.
  let p = mesa(["7O", "6O", "12E"], ["5C", "4E", "12B"], "3B", "rival");
  p = correr(p, [
    ENVIDO,
    { tipo: "envido", canto: "real-envido" },
    NO_QUIERO,
    jugar("12B"), jugar("6O"), // la gana el rival
    jugar("5C"), jugar("12E"), // la gana vos
    jugar("7O"), jugar("4E"), // y la tercera
  ]);

  const f = observarMano(fichaVacia(), p, "vos");
  assert.equal(f.pescas, 1, "33 callado y después subiendo es pesca de manual");
});

test("tenías buen tanto y no dijiste nada en toda la mano", () => {
  let p = mesa(["7O", "6O", "12E"], ["5C", "4E", "12B"], "3B");
  p = correr(p, [
    jugar("6O"), jugar("12B"), // la gana el rival
    jugar("5C"), jugar("12E"), // la gana vos
    jugar("7O"), jugar("4E"), // y la tercera
  ]);
  const f = observarMano(fichaVacia(), p, "vos");
  assert.equal(f.tantoAltoCallado, 1, "tenía 33 y se lo guardó");
  assert.equal(f.envidosCantados, 0);
});

test("cantaste truco con basura, y con mano brava te quedaste callado", () => {
  const flojas = ["4E", "5C", "6O"];
  const bravas = ["1E", "1B", "7E"];

  let conTruco = mesa(flojas, ["12O", "11O", "5O"], "3B");
  conTruco = correr(conTruco, [
    { tipo: "truco" }, QUIERO,
    jugar("6O"), jugar("5O"), // la gana vos por poco
    jugar("5C"), jugar("11O"), // la gana el rival
    jugar("12O"), jugar("4E"), // y la tercera
  ]);
  const f1 = observarMano(fichaVacia(), conTruco, "vos");
  assert.equal(f1.trucosCantados, 1);
  assert.equal(f1.trucosFlojos, 1, "cantó truco con un 4, un 5 y un 6");

  let callado = mesa(bravas, ["12O", "11O", "10O"], "3B");
  callado = correr(callado, [
    jugar("1E"), jugar("10O"),
    jugar("1B"), jugar("11O"), // gana dos seguidas: la tercera no se juega
  ]);
  const f2 = observarMano(fichaVacia(), callado, "vos");
  assert.equal(f2.trucosCantados, 0);
  // Sólo mostró dos cartas: no se le juzga la mano entera
  assert.equal(f2.manoFuerteCallada, 0, "con dos cartas no alcanza para juzgar");
});

// ─── Lo que NO ve, NO lo anota ──────────────────────────────────────────────

test("ANTI-TRAMPA: la carta que no tiraste no puede cambiar la ficha", () => {
  // Misma mano jugada igual, con distinta carta guardada sin tirar. Si la
  // ficha saliera distinta, el bot estaría espiando.
  const armar = (tercera: string) => {
    let p = mesa(["4E", "5C", tercera], ["12O", "11O", "10O"], "3B");
    return correr(p, [
      jugar("4E"), jugar("10O"), // la gana el rival
      jugar("11O"), jugar("5C"), // y la segunda: la tercera no se juega
    ]);
  };
  // Se va al mazo antes de la tercera, con un 6 flojo o con el ancho de espada
  const conFloja = observarMano(fichaVacia(), armar("6O"), "vos");
  const conMata = observarMano(fichaVacia(), armar("1E"), "vos");
  assert.deepEqual(conFloja, conMata, "la ficha cambió según una carta que nunca vio");
});

test("ANTI-TRAMPA: tener flor y guardársela no puede cambiar la ficha", () => {
  // Las dos manos se juegan idéntico y cantan el mismo tanto (33). La única
  // diferencia es la carta que NO se tiró: con el 5 de copa hay flor, con el 5
  // de espada no. Si el bot preguntara "¿tenía flor?" en vez de mirar la mesa,
  // las fichas saldrían distintas y estaría espiando.
  const armar = (tercera: string) => {
    let p = mesa(["7C", "6C", tercera], ["1E", "1B", "12O"], "3B", "rival");
    return correr(p, [
      ENVIDO, QUIERO, // el envido se canta en voz alta: el tanto es público
      jugar("1E"), jugar("7C"), // la gana el rival
      jugar("1B"), jugar("6C"), // y la segunda: la tercera no se juega
    ]);
  };
  const conFlor = armar("5C"); // tres copas
  const sinFlor = armar("5E");
  assert.equal(conFlor.flor.vos.tiene, true, "el caso tiene que ser el de flor");
  assert.equal(sinFlor.flor.vos.tiene, false);

  const f1 = observarMano(fichaVacia(), conFlor, "vos");
  const f2 = observarMano(fichaVacia(), sinFlor, "vos");
  assert.deepEqual(f1, f2, "la ficha cambió según una flor que nunca se cantó ni se mostró");
});

test("una mano cortada de entrada no enseña nada DE LAS CARTAS", () => {
  // Ojo con lo que cambió acá el 11/9/2026. Antes esta mano no dejaba ni un
  // rastro. Ahora deja dos, y los dos son cosas que cualquiera sentado en esa
  // mesa vio con sus ojos: que la mano se jugó, y que este se fue al mazo. De
  // las CARTAS se sigue sin anotar nada, que es lo que el test protege.
  let p = mesa(["4E", "5C", "6O"], ["12O", "11O", "10O"], "3B");
  p = correr(p, [{ tipo: "mazo" }]);
  const f = observarMano(fichaVacia(), p, "vos");

  assert.deepEqual(
    f,
    { ...fichaVacia(), manosJugadas: 1, mazos: 1 },
    "de una mano cortada no se puede deducir una sola carta",
  );
});

// ─── Qué hace el bot con eso ────────────────────────────────────────────────

test("con lectura en 0 la ficha no cambia absolutamente nada", () => {
  const cargada = {
    ...fichaVacia(),
    manosJugadas: 12,
    manosVistas: 12,
    envidosCantados: 8,
    envidosFlojos: 8,
    pescas: 4,
    trucosCantados: 6,
    trucosFlojos: 6,
    trucosRecibidos: 10,
    trucosNoQueridos: 9,
  };
  const a = ajustePorLectura(cargada, 0);
  assert.deepEqual(a, SIN_AJUSTE);

  // Y el bot de nivel 1 decide exactamente lo mismo con ficha o sin ella
  const luki = buscarPersonalidad("luki");
  assert.equal(luki.lectura, 0, "los ★1 no leen a nadie");
  const p = mesa(["1E", "7E", "4O"], ["3O", "12O", "6C"], "3B", "rival");
  for (let s = 1; s <= 40; s++) {
    const semilla = () => (s * 0.02347) % 1;
    const sin = decidirJugada(p, "rival", semilla, luki, fichaVacia());
    const con = decidirJugada(p, "rival", semilla, luki, cargada);
    assert.deepEqual(sin, con, "un ★1 no puede cambiar por lo que anotó");
  }
});

test("contra un mentiroso le paga a ver; contra uno serio se achica", () => {
  const mentiroso = {
    ...fichaVacia(), manosJugadas: 12, manosVistas: 12, manosConCartas: 12,
    envidosCantados: 8, envidosFlojos: 8, trucosCantados: 8, trucosFlojos: 8,
  };
  const serio = {
    ...fichaVacia(), manosJugadas: 12, manosVistas: 12, manosConCartas: 12,
    envidosCantados: 8, envidosFlojos: 0, tantoAltoCallado: 6,
    trucosCantados: 8, trucosFlojos: 0, manoFuerteCallada: 6,
  };
  const aM = ajustePorLectura(mentiroso, 1);
  const aS = ajustePorLectura(serio, 1);

  assert.ok(aM.quiereEnvido < 0, "al mentiroso hay que quererle con menos tanto");
  assert.ok(aM.quiereTruco < 0, "y quererle el truco con menos mano");
  assert.ok(aS.quiereEnvido > aM.quiereEnvido, "al serio hay que creerle más");
  assert.ok(aS.quiereTruco > aM.quiereTruco);
});

test("el ajuste está acotado: leer al rival nunca puede empeorar la jugada", () => {
  // Los umbrales de los rivales duros ya están en su punto justo. Si el ajuste
  // no tuviera tope, leer al rival los empujaba MÁS ALLÁ del óptimo y jugaban
  // peor por prestar atención. Pasó de verdad.
  const base = { ...fichaVacia(), manosJugadas: 200, manosVistas: 200, manosConCartas: 200 };
  const extremos = [
    // El mentiroso cobarde de manual: canta todo sin tener y no aguanta nada
    { ...base, envidosCantados: 200, envidosFlojos: 200, pescas: 200, trucosCantados: 200,
      trucosFlojos: 200, farolesCazados: 200, trucosRecibidos: 200, trucosNoQueridos: 200,
      envidosRecibidos: 200, envidosNoQueridos: 200 },
    // El serio que aguanta todo: si canta tiene, y no se achica nunca
    { ...base, envidosCantados: 200, envidosFlojos: 0, tantoAltoCallado: 200,
      trucosCantados: 200, trucosFlojos: 0, manoFuerteCallada: 200,
      trucosRecibidos: 200, trucosNoQueridos: 0, envidosRecibidos: 200, envidosNoQueridos: 0 },
  ];
  for (const f of extremos) {
    const a = ajustePorLectura(f, 1);
    for (const campo of ["quiereEnvido", "quiereTruco", "cantaEnvido", "cantaTruco"] as const) {
      const [min, max] = TOPES[campo];
      assert.ok(
        a[campo] >= min && a[campo] <= max,
        `${campo} fuera de tope: ${a[campo]} no está en [${min}, ${max}]`,
      );
    }
  }
});

test("con poca evidencia el ajuste es chico: no se vuelve loco por una mano", () => {
  const unaMano = { ...fichaVacia(), manosJugadas: 1, manosVistas: 1, envidosCantados: 1, envidosFlojos: 1 };
  const muchas = { ...fichaVacia(), manosJugadas: 20, manosVistas: 20, envidosCantados: 20, envidosFlojos: 20 };
  const a1 = ajustePorLectura(unaMano, 1);
  const a20 = ajustePorLectura(muchas, 1);
  assert.ok(Math.abs(a1.quiereEnvido) < Math.abs(a20.quiereEnvido), "la confianza tiene que crecer");
});

// ─── Las cotas, que son la garantía anti-trampa hecha aritmética ────────────

test("PROPIEDAD: con dos cartas a la vista, la cota NUNCA supera lo que había", () => {
  /* Toda la honestidad del cambio del 11/9/2026 se apoya en esto. Con dos
     cartas sobre la mesa no se puede saber el tanto ni la calidad, pero sí se
     puede acotarlos POR ABAJO, contando lo que falta como la peor carta de la
     baraja.

     Que la cota sea inferior es lo que hace que sólo pueda probar que el rival
     TENÍA algo, y nunca que no lo tenía. Por eso alimenta "se calló una mano
     brava" —que es un hecho— y nunca `envidosFlojos` ni `trucosFlojos`, que son
     acusaciones de mentir. Si esta propiedad se rompiera, el bot pasaría a
     deducir de lo que no vio.

     Se verifica por fuerza bruta y no con tres ejemplos: son 11.340 casos de
     mano y muestra, con las tres formas de mostrar dos cartas de tres. */
  let casos = 0;
  for (const muestra of BARAJA) {
    for (let i = 0; i < 40; i++)
      for (let j = i + 1; j < 40; j++)
        for (let k = j + 1; k < 40; k++) {
          const mano = [BARAJA[i], BARAJA[j], BARAJA[k]];
          if (mano.some((x) => x.numero === muestra.numero && x.palo === muestra.palo)) continue;
          if ((i * 7 + j * 13 + k * 3 + muestra.numero) % 97 !== 0) continue; // muestreo parejo
          const tantoReal = valorEnvido(mano, muestra);
          const calidadReal = calidadDeMano(mano, muestra);
          for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) {
            const vistas = [mano[a], mano[b]];
            casos++;
            assert.ok(
              valorEnvido(vistas, muestra) <= tantoReal,
              `la cota del tanto se pasó: ${valorEnvido(vistas, muestra)} > ${tantoReal}`,
            );
            assert.ok(
              calidadConHuecos(vistas, muestra, 3) <= calidadReal + 1e-9,
              `la cota de la calidad se pasó con muestra ${muestra.numero}${muestra.palo}`,
            );
          }
        }
  }
  assert.ok(casos > 10000, `se probaron sólo ${casos} casos: el muestreo se rompió`);
});

test("calidadConHuecos sin huecos es exactamente calidadDeMano", () => {
  // `calidadDeMano` pasó a ser un caso particular de la otra, así que esto
  // verifica que generalizarla no le cambió el comportamiento a nadie.
  for (const muestra of [c("3B"), c("2E"), c("12O")]) {
    for (let i = 0; i < 40; i += 3) {
      const mano = [BARAJA[i], BARAJA[(i + 11) % 40], BARAJA[(i + 23) % 40]];
      assert.equal(calidadConHuecos(mano, muestra, mano.length), calidadDeMano(mano, muestra));
    }
  }
});

test("se calló una mano brava: con DOS cartas ya se puede anotar, sin acusarlo de mentir", () => {
  // Antes hacían falta las tres cartas y por eso se tiraba a la basura el 31%
  // de las manos. Con dos matas a la vista y sin haber cantado truco, que se
  // guardó una mano brava es un hecho, no una sospecha.
  // El 2 de basto con muestra de basto es la carta más fuerte que hay, y el
  // ancho de espada le sigue de cerca. Ojo con qué cartas se eligen: la cota es
  // CONSERVADORA a propósito, así que dos anchos comunes no le alcanzan para
  // afirmar nada —lo que no vio cuenta como un cuatro— y ahí no anota, que es
  // justo lo que tiene que hacer.
  let p = mesa(["2B", "1E", "4O"], ["12O", "11O", "10O"], "3B");
  p = correr(p, [
    jugar("2B"), jugar("10O"),
    jugar("1E"), jugar("11O"), // gana las dos: la tercera no se juega
  ]);
  const f = observarMano(fichaVacia(), p, "vos");
  assert.equal(f.manoFuerteCallada, 1, "la pieza mayor sobre la mesa y sin cantar truco");
  assert.equal(f.trucosFlojos, 0, "no cantó truco: no se le puede anotar una mentira");
  assert.equal(f.envidosFlojos, 0);
});

test("un farol cazado es una mentira probada SIN verle una sola carta", () => {
  // Cantó truco, le subieron a retruco y se achicó. El que tiene con qué no se
  // achica en su propio truco. Cubre parte del 41% de manos donde alguien canta
  // truco y nunca se le llegan a ver las tres cartas.
  let p = mesa(["4E", "5C", "6O"], ["1E", "1B", "12O"], "3B");
  p = correr(p, [TRUCO, TRUCO, NO_QUIERO]);
  const f = observarMano(fichaVacia(), p, "vos");
  assert.equal(f.farolesCazados, 1, "cantó truco y se achicó cuando le subieron");
});
