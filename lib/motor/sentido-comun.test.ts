/**
 * El bot no puede cantar truco cuando la baza ya está perdida.
 *
 * Caso real reportado jugando (27/08/2026): el jugador tiró el 2 de la muestra
 * —la carta más fuerte del juego, a la que no le gana nada— y el bot cantó
 * truco igual. Estas pruebas verifican que eso no vuelva a pasar con los
 * rivales de nivel alto.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { desdeTexto as c, type Carta } from "./baraja.ts";
import { decidirJugada } from "./bot.ts";
import { buscarPersonalidad, PERSONALIDADES } from "./personalidades.ts";
import { analizarFlor } from "./tantos.ts";
import { type Jugador, type Partida, nuevaPartida } from "./partida.ts";

/** Arma una mesa donde el jugador ya tiró una carta y el bot tiene que responder. */
function mesaCon({
  cartasBot,
  cartaEnMesa,
  muestra,
  bazasPrevias = [],
}: {
  cartasBot: string[];
  cartaEnMesa: string;
  muestra: string;
  bazasPrevias?: ("vos" | "rival" | "parda")[];
}): Partida {
  const base = nuevaPartida(() => 0);
  const m = c(muestra);
  const mano = cartasBot.map(c);

  type BazaTest = {
    vos: Carta | null;
    rival: Carta | null;
    abre: Jugador;
    ganador: "vos" | "rival" | "parda" | null;
  };
  const bazas: BazaTest[] = bazasPrevias.map((ganador) => ({
    vos: null,
    rival: null,
    abre: "vos",
    ganador,
  }));
  bazas.push({ vos: c(cartaEnMesa), rival: null, abre: "vos", ganador: null });

  return {
    ...base,
    puntos: { vos: 0, rival: 0 },
    quienEsMano: "vos",
    muestra: m,
    cartas: { vos: [] as Carta[], rival: mano },
    manoInicial: { vos: [], rival: [...mano] },
    flor: { vos: analizarFlor([], m), rival: analizarFlor(mano, m) },
    bazas,
    turno: "rival",
    pendiente: null,
    envidoCerrado: true,
    florResuelta: true,
    truco: { nivel: 0, querido: false, cantadoPor: null },
    fase: "jugando",
    ganadorMano: null,
    ganadorPartida: null,
    eventos: [],
  } as Partida;
}

/** Cuenta cuántas veces canta truco en muchos intentos. */
function vecesQueCanta(p: Partida, id: string, intentos = 300) {
  const personalidad = buscarPersonalidad(id);
  let cantos = 0;
  for (let i = 0; i < intentos; i++) {
    const a = decidirJugada(p, "rival", Math.random, personalidad);
    if (a?.tipo === "truco") cantos++;
  }
  return cantos;
}

test("EL CASO REPORTADO: le tiran el 2 de la muestra y el bot no canta truco", () => {
  // Muestra de oro: el 2 de oro es la pieza más fuerte, no le gana nada.
  // Al bot le quedan tres cartas flojas y ya perdió la primera baza.
  const mesa = mesaCon({
    cartasBot: ["4C", "5B", "6E"],
    cartaEnMesa: "2O",
    muestra: "3O",
    bazasPrevias: ["vos"],
  });

  // El Melo cierra la gira y es de los impecables: no se le escapa nunca.
  const melo = vecesQueCanta(mesa, "el-melo");
  assert.equal(melo, 0, `el Melo cantó ${melo} veces con la mano perdida`);

  // Los de nivel 4 se entusiasman muy de vez en cuando, y está bien.
  const tucho = vecesQueCanta(mesa, "el-tucho");
  assert.ok(tucho <= 60, `el Tucho cantó demasiado: ${tucho}/300`);

  const donRamon = vecesQueCanta(mesa, "don-ramon");
  assert.ok(donRamon <= 60, `Don Ramón cantó demasiado: ${donRamon}/300`);
});

test("cuanto más duro el rival, menos veces canta con la mano perdida", () => {
  const mesa = mesaCon({
    cartasBot: ["4C", "5B", "6E"],
    cartaEnMesa: "1E", // ancho de espada: no le gana ninguna de las suyas
    muestra: "3O",
    bazasPrevias: ["vos"],
  });

  // Los de nivel 5 son impecables: no se les escapa nunca.
  for (const p of PERSONALIDADES.filter((x) => x.dificultad === 5)) {
    const cantos = vecesQueCanta(mesa, p.id, 200);
    assert.equal(cantos, 0, `${p.nombre} (nivel 5) cantó ${cantos} veces`);
  }

  // Los de nivel 4 se equivocan muy de vez en cuando, a propósito: un rival
  // que nunca falla en nada se siente una máquina, no una persona.
  for (const p of PERSONALIDADES.filter((x) => x.dificultad === 4)) {
    const cantos = vecesQueCanta(mesa, p.id, 200);
    assert.ok(cantos <= 40, `${p.nombre} (nivel 4) cantó demasiado: ${cantos}/200`);
  }

  // Y los principiantes fallan seguido, que es lo que los hace principiantes.
  // Se compara contra uno de nivel 5, que es el que nunca se equivoca: contra
  // un nivel 4 la diferencia se mezcla con lo mentiroso que sea cada uno.
  const luki = vecesQueCanta(mesa, "luki", 200);
  const melo = vecesQueCanta(mesa, "el-melo", 200);
  assert.ok(luki > melo, "Luki debería equivocarse más que el Melo");
});

test("pero SÍ canta cuando la carta de la mesa se le puede ganar", () => {
  // Le tiran un 4: el bot tiene el ancho de espada, la baza es suya
  const mesa = mesaCon({
    cartasBot: ["1E", "3C", "12B"],
    cartaEnMesa: "4C",
    muestra: "6O",
  });

  const cantos = vecesQueCanta(mesa, "el-tucho");
  assert.ok(cantos > 0, "con la baza ganada debería cantar alguna vez");
});

test("los principiantes todavía se entusiasman: es parte de su carácter", () => {
  const mesa = mesaCon({
    cartasBot: ["4C", "5B", "6E"],
    cartaEnMesa: "2O",
    muestra: "3O",
    bazasPrevias: ["vos"],
  });

  // Luki tiene sentidoComun 0.15: se equivoca seguido, y está bien que así sea
  const luki = buscarPersonalidad("luki");
  assert.ok(luki.sentidoComun < 0.3, "Luki debería ser despistado");
  assert.equal(buscarPersonalidad("el-melo").sentidoComun, 1, "el Melo, impecable");
});

test("el sentido común sube con la dificultad", () => {
  const ordenados = [...PERSONALIDADES].sort((a, b) => a.dificultad - b.dificultad);
  for (let i = 1; i < ordenados.length; i++) {
    assert.ok(
      ordenados[i].sentidoComun >= ordenados[i - 1].sentidoComun,
      `${ordenados[i].nombre} tiene menos sentido común que uno más fácil`,
    );
  }
});
