/**
 * Verifica las tablas de puntos y la resolución de la mano contra reglas.txt.
 * Correr con: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  type Baza,
  type Jugador,
  type Partida,
  type ResultadoBaza,
  accionesPosibles,
  aplicar,
  ganadorDeLaMano,
  laFalta,
  nuevaPartida,
  puntosEnvido,
  puntosTruco,
  siguienteMano,
} from "./partida.ts";

/** Azar determinista, para que los tests den siempre lo mismo. */
function azarFijo(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

test("puntos del envido: toda la tabla de reglas 9.3", () => {
  const p = { vos: 0, rival: 0 };
  assert.deepEqual(puntosEnvido(["envido"], p), { querido: 2, noQuerido: 1 });
  assert.deepEqual(puntosEnvido(["envido", "envido"], p), { querido: 4, noQuerido: 2 });
  assert.deepEqual(puntosEnvido(["real-envido"], p), { querido: 3, noQuerido: 1 });
  assert.deepEqual(puntosEnvido(["envido", "real-envido"], p), { querido: 5, noQuerido: 2 });
  assert.deepEqual(puntosEnvido(["envido", "envido", "real-envido"], p), {
    querido: 7,
    noQuerido: 4,
  });
});

test("la falta envido vale lo que le falta al que va ganando", () => {
  assert.equal(laFalta({ vos: 22, rival: 10 }), 8);
  assert.equal(laFalta({ vos: 25, rival: 22 }), 5); // el ejemplo de reglas 15.3
  assert.equal(laFalta({ vos: 0, rival: 0 }), 30);

  const marcador = { vos: 25, rival: 22 };
  assert.deepEqual(puntosEnvido(["falta-envido"], marcador), {
    querido: 5,
    noQuerido: 1,
  });
  assert.deepEqual(puntosEnvido(["real-envido", "falta-envido"], marcador), {
    querido: 5,
    noQuerido: 3,
  });
});

test("puntos del truco: 2/1, 3/2, 4/3 (reglas 10.1)", () => {
  assert.equal(puntosTruco(0, false), 1); // sin cantos, la mano vale 1
  assert.equal(puntosTruco(1, true), 2);
  assert.equal(puntosTruco(1, false), 1);
  assert.equal(puntosTruco(2, true), 3);
  assert.equal(puntosTruco(2, false), 2);
  assert.equal(puntosTruco(3, true), 4);
  assert.equal(puntosTruco(3, false), 3);
});

/** Arma una partida de mentira con las bazas ya resueltas. */
function conBazas(resultados: ResultadoBaza[], quienEsMano: Jugador = "vos") {
  const bazas: Baza[] = resultados.map((ganador) => ({
    vos: null,
    rival: null,
    abre: quienEsMano,
    ganador,
  }));
  return { bazas, quienEsMano } as Partida;
}

test("quién gana la mano: la tabla completa de pardas (reglas 7.3)", () => {
  assert.equal(ganadorDeLaMano(conBazas(["vos", "vos"])), "vos");
  assert.equal(ganadorDeLaMano(conBazas(["vos", "rival", "vos"])), "vos");
  assert.equal(ganadorDeLaMano(conBazas(["vos", "rival", "parda"])), "vos");
  assert.equal(ganadorDeLaMano(conBazas(["vos", "parda"])), "vos");
  assert.equal(ganadorDeLaMano(conBazas(["parda", "vos"])), "vos");
  assert.equal(ganadorDeLaMano(conBazas(["parda", "parda", "rival"])), "rival");
  assert.equal(ganadorDeLaMano(conBazas(["parda", "parda", "parda"], "rival")), "rival");
  // sin definir todavía
  assert.equal(ganadorDeLaMano(conBazas(["vos"])), null);
  assert.equal(ganadorDeLaMano(conBazas(["parda"])), null);
});

test("el mano arranca tirando y la condición rota cada mano (reglas 3)", () => {
  const p = nuevaPartida(azarFijo(7));
  assert.equal(p.turno, p.quienEsMano);
  assert.equal(p.cartas.vos.length, 3);
  assert.equal(p.cartas.rival.length, 3);

  const siguiente = siguienteMano({ ...p, fase: "mano-terminada" }, azarFijo(8));
  assert.notEqual(siguiente.quienEsMano, p.quienEsMano);
});

test("no podés subir tu propio truco: la alternancia es obligatoria (reglas 10.3)", () => {
  const p = nuevaPartida(azarFijo(3));
  const quien = p.turno;
  const conTruco = aplicar(p, { tipo: "truco" }, quien);

  assert.equal(conTruco.truco.nivel, 1);
  assert.equal(conTruco.turno, quien === "vos" ? "rival" : "vos");
  // el que cantó no puede hacer nada hasta que le respondan
  assert.deepEqual(accionesPosibles(conTruco, quien), []);
  // el rival sí puede querer, no querer o subir a retruco
  const tipos = accionesPosibles(conTruco, conTruco.turno).map((a) => a.tipo);
  assert.ok(tipos.includes("quiero") && tipos.includes("no-quiero") && tipos.includes("truco"));
});

test("el envido vive sólo en la primera baza (reglas 9.1)", () => {
  let p = nuevaPartida(azarFijo(11));
  while (p.flor.vos.tiene || p.flor.rival.tiene) {
    p = nuevaPartida(azarFijo(Math.floor(Math.random() * 1e6)));
  }

  assert.ok(accionesPosibles(p, p.turno).some((a) => a.tipo === "envido"));

  // se juega la primera baza entera
  p = aplicar(p, { tipo: "jugar", carta: p.cartas[p.turno][0] }, p.turno);
  p = aplicar(p, { tipo: "jugar", carta: p.cartas[p.turno][0] }, p.turno);

  assert.equal(p.envidoCerrado, true);
  assert.ok(!accionesPosibles(p, p.turno).some((a) => a.tipo === "envido"));
});

test("la flor ya no se canta sola: hay que cantarla (reglas 8.2)", () => {
  // busca un reparto donde el que es mano tenga flor
  let p = nuevaPartida(azarFijo(1));
  for (let i = 2; i < 400 && !p.flor[p.turno].tiene; i++) p = nuevaPartida(azarFijo(i));
  assert.ok(p.flor[p.turno].tiene, "no apareció ninguna flor");

  // Al repartir no se cobró nada y el envido sigue ABIERTO. Cerrarlo acá
  // delataría que alguien tiene flor sin que nadie haya cantado.
  assert.equal(p.puntos.vos + p.puntos.rival, 0);
  assert.equal(p.envidoCerrado, false);

  // El que la tiene puede cantarla, y ahí sí se cobra y se cierra el envido.
  const quien = p.turno;
  assert.ok(accionesPosibles(p, quien).some((a) => a.tipo === "flor"));
  p = aplicar(p, { tipo: "flor" }, quien);
  assert.equal(p.envidoCerrado, true);
  assert.ok(!accionesPosibles(p, p.turno).some((a) => a.tipo === "envido"));
  // 3 puntos si el otro no tenía flor; si tenía, queda la discusión abierta
  assert.ok(p.puntos[quien] === 3 || p.pendiente?.tipo === "flor");
});

test("el que tiene flor no puede cantar envido: la flor lo anula (reglas 9.1)", () => {
  let p = nuevaPartida(azarFijo(1));
  for (let i = 2; i < 400 && !p.flor[p.turno].tiene; i++) p = nuevaPartida(azarFijo(i));
  assert.ok(!accionesPosibles(p, p.turno).some((a) => a.tipo === "envido"));
});

test("una acción inválida no cambia el estado", () => {
  const p = nuevaPartida(azarFijo(5));
  const quienNoJuega = p.turno === "vos" ? "rival" : "vos";
  assert.equal(aplicar(p, { tipo: "truco" }, quienNoJuega), p);
  assert.equal(aplicar(p, { tipo: "quiero" }, p.turno), p);
});

test("la partida termina al llegar a 30 (reglas 6)", () => {
  let p = nuevaPartida(azarFijo(21));
  p = { ...p, puntos: { vos: 29, rival: 0 } };
  const quien = p.turno;
  p = aplicar(p, { tipo: "truco" }, quien);
  p = aplicar(p, { tipo: "no-quiero" }, p.turno);

  if (quien === "vos") {
    assert.equal(p.fase, "partida-terminada");
    assert.equal(p.ganadorPartida, "vos");
  }
});

// ─── La flor con apuesta: reglas 8.5 (con flor envido / contraflor al resto) ─

import { type Carta as CartaFlorTest, desdeTexto as cFlor } from "./baraja.ts";
import { aplicar as aplicarFlor } from "./partida.ts";
import { analizarFlor as analizarFlorTest, valorEnvido as valorEnvidoTest } from "./tantos.ts";

/** Arma una partida donde los dos jugadores tienen una flor conocida. */
function partidaConDobleFlor(
  vos: string[],
  rival: string[],
  muestra: string,
  quienEsMano: Jugador = "vos",
): Partida {
  const m = cFlor(muestra);
  const manoVos = vos.map(cFlor);
  const manoRival = rival.map(cFlor);
  return repartirManoFalsa(manoVos, manoRival, m, quienEsMano);
}

/** repartirMano, pero con las cartas fijas en vez de al azar. */
function repartirManoFalsa(
  manoVos: CartaFlorTest[],
  manoRival: CartaFlorTest[],
  muestra: CartaFlorTest,
  quienEsMano: Jugador,
): Partida {
  // Se arma a mano en vez de mockear el reparto: más directo para el test.
  const base = nuevaPartida(() => 0);
  return {
    ...base,
    puntos: { vos: 0, rival: 0 },
    quienEsMano,
    muestra,
    cartas: { vos: manoVos, rival: manoRival },
    manoInicial: { vos: [...manoVos], rival: [...manoRival] },
    flor: {
      vos: analizarFlorTest(manoVos, muestra),
      rival: analizarFlorTest(manoRival, muestra),
    },
    bazas: [{ vos: null, rival: null, abre: quienEsMano, ganador: null }],
    turno: quienEsMano,
    pendiente: null,
    envidoCerrado: true,
    florResuelta: false,
    truco: { nivel: 0, querido: false, cantadoPor: null },
    fase: "jugando",
    ganadorMano: null,
    ganadorPartida: null,
    eventos: [],
  };
}

test("con flor envido: 6 al que gana, 3 al que cantó si se rechaza", () => {
  // vos: 7,6,3 de copa (36) — rival: 2,4,5 de la muestra (47, la máxima)
  let p = partidaConDobleFlor(["7C", "6C", "3C"], ["2B", "4B", "5B"], "3B");
  assert.equal(p.flor.vos.valor, 36);
  assert.equal(p.flor.rival.valor, 47);

  p = aplicarFlor(p, { tipo: "flor-canto", canto: "con-flor-envido" }, "vos");
  assert.equal(p.pendiente?.tipo, "flor");
  assert.equal(p.turno, "rival");

  const querido = aplicarFlor(p, { tipo: "quiero" }, "rival");
  assert.equal(querido.puntos.rival, 6); // tiene más flor, se lleva los 6
  assert.equal(querido.puntos.vos, 0);
  assert.equal(querido.florResuelta, true);

  const rechazado = aplicarFlor(p, { tipo: "no-quiero" }, "rival");
  assert.equal(rechazado.puntos.vos, 3); // el que cantó cobra lo de antes: 3
  assert.equal(rechazado.puntos.rival, 0);
});

test("contraflor al resto directo desde flor: si se rechaza, 3 (no 6)", () => {
  let p = partidaConDobleFlor(["7C", "6C", "3C"], ["2B", "4B", "5B"], "3B");
  p = aplicarFlor(p, { tipo: "flor-canto", canto: "contraflor-al-resto" }, "vos");

  const rechazado = aplicarFlor(p, { tipo: "no-quiero" }, "rival");
  assert.equal(rechazado.puntos.vos, 3); // no pasó por "con flor envido": vale 3
});

test("contraflor al resto después de con flor envido: si se rechaza, 6", () => {
  let p = partidaConDobleFlor(["7C", "6C", "3C"], ["2B", "4B", "5B"], "3B");
  p = aplicarFlor(p, { tipo: "flor-canto", canto: "con-flor-envido" }, "vos");
  p = aplicarFlor(p, { tipo: "flor-canto", canto: "contraflor-al-resto" }, "rival");

  assert.equal(p.pendiente?.de, "rival");
  const rechazado = aplicarFlor(p, { tipo: "no-quiero" }, "vos");
  assert.equal(rechazado.puntos.rival, 6); // ya había pasado por con flor envido
});

test("contraflor al resto querida y ganada: se lleva la partida entera", () => {
  let p = partidaConDobleFlor(["2B", "4B", "5B"], ["7C", "6C", "3C"], "3B");
  p = { ...p, puntos: { vos: 5, rival: 5 } }; // lejos de los 30
  p = aplicarFlor(p, { tipo: "flor-canto", canto: "contraflor-al-resto" }, "vos");
  p = aplicarFlor(p, { tipo: "quiero" }, "rival");

  assert.equal(p.fase, "partida-terminada");
  assert.equal(p.ganadorPartida, "vos"); // 47 le gana a 36
  assert.ok(p.puntos.vos >= 30);
});

test("con flor a secas: 3 puntos, gana la más alta, sin subir la apuesta", () => {
  let p = partidaConDobleFlor(["7C", "6C", "3C"], ["2B", "4B", "5B"], "3B");

  // Ahora son dos pasos: uno canta y el otro contesta que también tiene.
  p = aplicarFlor(p, { tipo: "flor" }, "vos");
  assert.equal(p.pendiente?.tipo, "flor");
  assert.equal(p.turno, "rival");

  p = aplicarFlor(p, { tipo: "flor" }, "rival");
  assert.equal(p.puntos.rival, 3); // 47 le gana a 36
  assert.equal(p.puntos.vos, 0);
  assert.equal(p.florResuelta, true);
  assert.equal(p.fase, "jugando"); // la mano sigue, ahora a jugar cartas
});

test("con flor me achico: el que cantó cobra 3 sin comparar (reglas 8.5)", () => {
  let p = partidaConDobleFlor(["7C", "6C", "3C"], ["2B", "4B", "5B"], "3B");
  p = aplicarFlor(p, { tipo: "flor" }, "vos");
  // El rival tiene 47 y ganaría, pero si se achica los 3 son del que cantó
  p = aplicarFlor(p, { tipo: "no-quiero" }, "rival");
  assert.equal(p.puntos.vos, 3);
  assert.equal(p.puntos.rival, 0);
});

test("con flor podés cantarla o no, pero el envido no está entre las opciones", () => {
  const p = partidaConDobleFlor(["7C", "6C", "3C"], ["2B", "4B", "5B"], "3B");
  const tipos = new Set(accionesPosibles(p, "vos").map((a) => a.tipo));
  // Ahora la flor es una decisión tuya: podés cantarla, tirar carta o cantar
  // truco. Lo que no podés es envidar, porque la flor anula el envido.
  assert.ok(tipos.has("flor"));
  assert.ok(tipos.has("flor-canto"));
  assert.ok(tipos.has("jugar"), "tenés que poder tirar carta sin cantar la flor");
  assert.ok(tipos.has("truco"));
  assert.ok(!tipos.has("envido"), "con flor no se canta envido");
  assert.deepEqual(accionesPosibles(p, "rival"), []); // no es su turno
});

test("flor no cantada, flor perdida: si tirás carta, se te fue (reglas 8.2)", () => {
  let p = partidaConDobleFlor(["7C", "6C", "3C"], ["2B", "4B", "5B"], "3B");
  p = aplicarFlor(p, { tipo: "jugar", carta: cFlor("3C") }, "vos");
  assert.equal(p.yaHablo.vos, true);
  // Le toca al rival; cuando vuelva a ser tu turno la flor ya no está
  assert.ok(!accionesPosibles(p, "rival").some((a) => a.tipo === "jugar" && false));
  const tipos = new Set(accionesPosibles(p, "vos").map((a) => a.tipo));
  assert.ok(!tipos.has("flor"), "la flor tenía que perderse al tirar carta");
});

// ─── El tanto se cuenta con la mano del reparto, no con lo que queda ─────────
// Bug real detectado jugando: al tirar una carta quedaban dos del mismo palo y
// la interfaz anunciaba "tenés flor" con el marcador en cero.

test("el tanto no cambia al tirar una carta", () => {
  let p = nuevaPartida(azarFijo(31));
  while (p.flor.vos.tiene || p.flor.rival.tiene) {
    p = nuevaPartida(azarFijo(Math.floor(Math.random() * 1e6)));
  }

  const antes = p.manoInicial.vos.map((c) => `${c.numero}${c.palo}`).join();
  p = aplicar(p, { tipo: "jugar", carta: p.cartas[p.turno][0] }, p.turno);

  assert.equal(p.manoInicial.vos.length, 3, "la mano del reparto no se toca");
  assert.equal(p.manoInicial.vos.map((c) => `${c.numero}${c.palo}`).join(), antes);
});

test("dos cartas del mismo palo que quedan en la mano NO son flor", () => {
  // 11 y 6 de oro quedan en la mano; la tercera era de otro palo: no hay flor
  const base = partidaConDobleFlor(["11O", "6O", "12B"], ["1E", "3C", "5B"], "2C");
  const p = { ...base, florResuelta: true }; // ninguno tiene flor: nada que resolver
  assert.equal(p.flor.vos.tiene, false, "no debería haber flor con la mano completa");

  // aunque se tire la carta suelta y queden dos oros, la flor sigue sin existir
  const jugada = aplicarFlor(p, { tipo: "jugar", carta: cFlor("12B") }, "vos");
  assert.equal(jugada.flor.vos.tiene, false);
  assert.equal(jugada.cartas.vos.length, 2);
  assert.equal(jugada.manoInicial.vos.length, 3);
});

test("el envido querido se cuenta con las tres cartas aunque ya se haya tirado una", () => {
  let p = nuevaPartida(azarFijo(77));
  while (p.flor.vos.tiene || p.flor.rival.tiene) {
    p = nuevaPartida(azarFijo(Math.floor(Math.random() * 1e6)));
  }
  const esperadoVos = valorEnvidoTest(p.manoInicial.vos, p.muestra);
  const esperadoRival = valorEnvidoTest(p.manoInicial.rival, p.muestra);

  // el mano tira, y el pie canta envido antes de tirar la suya
  const mano = p.turno;
  p = aplicar(p, { tipo: "jugar", carta: p.cartas[mano][0] }, mano);
  p = aplicar(p, { tipo: "envido", canto: "envido" }, p.turno);
  p = aplicar(p, { tipo: "quiero" }, p.turno);

  // el ganador del envido tiene que ser el del tanto más alto de la mano entera
  const ganador =
    esperadoVos === esperadoRival
      ? p.quienEsMano
      : esperadoVos > esperadoRival
        ? "vos"
        : "rival";
  assert.equal(p.puntos[ganador], 2);
});
