/**
 * Verifica que las personalidades cambien el juego de verdad, no sólo los
 * números del archivo. Correr con: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";

import { decidirJugada } from "./bot.ts";
import {
  EL_CHUECO,
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
      const cual = quien === "rival" ? personalidad : EL_CHUECO;
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
  const bruno = buscarPersonalidad("bruno"); // mentira 0.45
  const chueco = buscarPersonalidad("el-chueco"); // mentira 0

  const conMentira = medirCantos(bruno);
  const sinMentira = medirCantos(chueco);

  assert.ok(
    conMentira.tasa > sinMentira.tasa,
    `el mentiroso debería cantar más: ${conMentira.tasa.toFixed(3)} vs ${sinMentira.tasa.toFixed(3)}`,
  );
});

test("el que se guarda los cantos canta menos que el que no", () => {
  const elsa = buscarPersonalidad("dona-elsa"); // silencio 0.45
  const machado = buscarPersonalidad("machado"); // silencio 0

  // mismos umbrales de truco, casi; la diferencia grande es el silencio
  const callada = medirCantos(elsa);
  const hablador = medirCantos(machado);

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

test("buscarPersonalidad devuelve el honesto si le piden cualquier cosa", () => {
  assert.equal(buscarPersonalidad("no-existe").id, "el-chueco");
  assert.equal(buscarPersonalidad("bruno").nombre, "Bruno");
});
