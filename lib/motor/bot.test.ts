import test from "node:test";
import assert from "node:assert/strict";

import { nuevaPartida, aplicar, siguienteMano, type Partida } from "./partida.ts";
import { decidirJugada } from "./bot.ts";

function azarFijo(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** Juega una partida entera con el bot manejando los dos lados. */
function partidaCompleta(semilla: number): Partida {
  const azar = azarFijo(semilla);
  let p = nuevaPartida(azar);

  for (let vueltas = 0; vueltas < 5000; vueltas++) {
    if (p.fase === "partida-terminada") break;
    if (p.fase === "mano-terminada") {
      p = siguienteMano(p, azar);
      continue;
    }
    const accion = decidirJugada(p, p.turno, azar);
    if (!accion) break;
    const antes = p;
    p = aplicar(p, accion, p.turno);
    assert.notEqual(p, antes, `el bot propuso una acción inválida: ${accion.tipo}`);
  }
  return p;
}

test("el bot siempre elige una acción válida y las partidas terminan", () => {
  for (let semilla = 1; semilla <= 40; semilla++) {
    const p = partidaCompleta(semilla);
    assert.equal(p.fase, "partida-terminada", `la partida ${semilla} no terminó`);
    assert.ok(p.ganadorPartida !== null);
    assert.ok(p.puntos[p.ganadorPartida] >= 30);
  }
});

test("el bot no toca las cartas del jugador", () => {
  const p = nuevaPartida(azarFijo(4));
  const antes = JSON.stringify(p.cartas.vos);
  decidirJugada(p, "rival", azarFijo(9));
  assert.equal(JSON.stringify(p.cartas.vos), antes);
});
