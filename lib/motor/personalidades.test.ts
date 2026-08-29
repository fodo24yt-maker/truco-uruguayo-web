/**
 * Verifica que las personalidades cambien el juego de verdad, no sólo los
 * números del archivo. Correr con: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";

import { decidirJugada } from "./bot.ts";
import {
  LUKI,
  PERSONALIDADES,
  buscarPersonalidad,
  type Personalidad,
} from "./personalidades.ts";
import {
  type Partida,
  aplicar,
  nuevaPartida,
  siguienteMano,
} from "./partida.ts";

function azarFijo(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** Cuenta cuántas veces canta truco o envido a lo largo de muchas partidas. */
function medirCantos(personalidad: Personalidad, partidas = 60) {
  let cantos = 0;
  let jugadas = 0;

  for (let semilla = 1; semilla <= partidas; semilla++) {
    const azar = azarFijo(semilla);
    let p = nuevaPartida(azar);

    for (let paso = 0; paso < 4000; paso++) {
      if (p.fase === "partida-terminada") break;
      if (p.fase === "mano-terminada") {
        p = siguienteMano(p, azar);
        continue;
      }
      const quien = p.turno;
      // el jugador humano lo hace el bot honesto, para aislar la variable
      const cual = quien === "rival" ? personalidad : LUKI;
      const accion = decidirJugada(p, quien, azar, cual);
      if (!accion) break;

      if (quien === "rival") {
        jugadas++;
        if (accion.tipo === "truco" || accion.tipo === "envido") cantos++;
      }
      p = aplicar(p, accion, quien);
    }
  }
  return { cantos, jugadas, tasa: cantos / Math.max(jugadas, 1) };
}

test("cada personalidad está bien formada", () => {
  const ids = new Set<string>();
  for (const p of PERSONALIDADES) {
    assert.ok(!ids.has(p.id), `id repetido: ${p.id}`);
    ids.add(p.id);
    assert.ok(p.nombre.length > 0 && p.lugar.length > 0);
    assert.ok(p.dificultad >= 1 && p.dificultad <= 5);
    assert.ok(p.mentira >= 0 && p.mentira <= 1, `${p.id}: mentira fuera de rango`);
    assert.ok(p.silencio >= 0 && p.silencio <= 1, `${p.id}: silencio fuera de rango`);
    assert.ok(p.quiereTrucoCon < p.cantaTrucoCon, `${p.id}: querría menos de lo que canta`);
    assert.ok(p.cantaEnvidoCon < p.subeEnvidoCon, `${p.id}: subiría con menos de lo que canta`);
  }
});

test("el mentiroso canta bastante más que el honesto", () => {
  const joao = buscarPersonalidad("joao"); // mentira 0.40, el más mentiroso
  const luki = buscarPersonalidad("luki"); // mentira 0.05, el más honesto

  const conMentira = medirCantos(joao);
  const sinMentira = medirCantos(luki);

  assert.ok(
    conMentira.tasa > sinMentira.tasa,
    `el mentiroso debería cantar más: ${conMentira.tasa.toFixed(3)} vs ${sinMentira.tasa.toFixed(3)}`,
  );
});

test("el que se guarda los cantos canta menos que el que no", () => {
  const nelly = buscarPersonalidad("la-nelly"); // silencio 0.35
  const coca = buscarPersonalidad("la-coca"); // silencio 0, no se calla nada

  const callada = medirCantos(nelly);
  const hablador = medirCantos(coca);

  assert.ok(
    callada.tasa < hablador.tasa,
    `la callada debería cantar menos: ${callada.tasa.toFixed(3)} vs ${hablador.tasa.toFixed(3)}`,
  );
});

test("todas las personalidades terminan sus partidas sin trabarse", () => {
  for (const personalidad of PERSONALIDADES) {
    const azar = azarFijo(99);
    let p: Partida = nuevaPartida(azar);
    let vueltas = 0;

    for (; vueltas < 6000; vueltas++) {
      if (p.fase === "partida-terminada") break;
      if (p.fase === "mano-terminada") {
        p = siguienteMano(p, azar);
        continue;
      }
      const accion = decidirJugada(p, p.turno, azar, personalidad);
      assert.ok(accion, `${personalidad.id} se quedó sin jugada`);
      const antes = p;
      p = aplicar(p, accion!, p.turno);
      assert.notEqual(p, antes, `${personalidad.id} propuso algo inválido: ${accion!.tipo}`);
    }
    assert.equal(p.fase, "partida-terminada", `${personalidad.id} no terminó la partida`);
  }
});

test("buscarPersonalidad devuelve el primero si le piden cualquier cosa", () => {
  assert.equal(buscarPersonalidad("no-existe").id, "luki");
  assert.equal(buscarPersonalidad("el-tucho").nombre, "El Tucho");
});

test("hay un rival por cada uno de los 19 departamentos", () => {
  assert.equal(PERSONALIDADES.length, 19);
  const deptos = new Set(PERSONALIDADES.map((p) => p.departamento));
  assert.equal(deptos.size, 19, "hay departamentos repetidos");

  // La gira arranca en Montevideo y termina en Melo, Cerro Largo
  const enOrden = [...PERSONALIDADES].sort((a, b) => a.paso - b.paso);
  assert.equal(enOrden[0].departamento, "Montevideo");
  assert.equal(enOrden[18].id, "el-melo");
  assert.equal(enOrden[18].lugar, "Melo");

  // y los pasos son 1..19 sin huecos
  assert.deepEqual(
    enOrden.map((p) => p.paso),
    Array.from({ length: 19 }, (_, i) => i + 1),
  );
});

test("la dificultad no baja a medida que avanza la gira", () => {
  const enOrden = [...PERSONALIDADES].sort((a, b) => a.paso - b.paso);
  for (let i = 1; i < enOrden.length; i++) {
    assert.ok(
      enOrden[i].dificultad >= enOrden[i - 1].dificultad,
      `${enOrden[i].nombre} es más fácil que el anterior`,
    );
  }
});

test("versean sólo los de tres estrellas para arriba, y cada vez más", () => {
  // El verso es oficio de mesa: los dos primeros niveles todavía están
  // aprendiendo el juego, no la mesa, y cantan pelado.
  for (const p of PERSONALIDADES) {
    if (p.dificultad <= 2) {
      assert.equal(p.verso, 0, `${p.nombre} es ★${p.dificultad} y no debería versear`);
    } else {
      assert.ok(p.verso > 0, `${p.nombre} es ★${p.dificultad} y tendría que versear`);
      assert.ok(p.verso <= 1, `${p.nombre} tiene una probabilidad imposible`);
    }
  }

  const ordenados = [...PERSONALIDADES].sort((a, b) => a.dificultad - b.dificultad);
  for (let i = 1; i < ordenados.length; i++) {
    assert.ok(ordenados[i].verso >= ordenados[i - 1].verso, "el verso bajó al subir de nivel");
  }
});
