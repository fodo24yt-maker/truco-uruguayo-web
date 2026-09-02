/**
 * Que al cerrar la mano se enseñe lo que se cantó, y NADA más.
 *
 * Hay dos formas de que esto salga mal y son opuestas:
 *
 *   · que no muestre nada cuando la mano se cortó antes de tiempo, que es
 *     justamente cuando hace falta —el otro se quedó sin ver las cartas—;
 *   · que muestre de más, que es peor, porque enseñar una flor que nadie cantó
 *     o un tanto que nadie dijo en voz alta es soplarle cartas al jugador.
 *
 * Las dos se verifican acá recorriendo partidas de verdad.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { tantosAlCierre } from "./tantos-al-cierre.ts";
import {
  type Accion,
  type Jugador,
  type Partida,
  accionesPosibles,
  aplicar,
  nuevaPartida,
  siguienteMano,
} from "./motor/partida.ts";
import { valorEnvido } from "./motor/tantos.ts";

/** Azar reproducible: si una partida rompe, rompe siempre igual. */
function azarCon(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Juega partidas enteras al azar y llama a `alCerrar` cada vez que una mano
 * termina, que es el único momento en que esto tiene algo que decir.
 *
 * Al azar y no con el bot, por lo mismo que en `botonera.test.ts`: el bot juega
 * bien, y jugar bien es no meterse en las ramas raras. Acá las ramas raras son
 * todo el asunto —el truco no querido con el envido ya jugado, la flor cantada
 * y la mano que se corta en la segunda baza— y con un bot sensato casi no
 * aparecen.
 */
function recorrerManos(
  semilla: number,
  alCerrar: (p: Partida) => void,
  enCurso?: (p: Partida) => void,
) {
  const azar = azarCon(semilla);
  let p = nuevaPartida(azar);

  for (let paso = 0; paso < 4000; paso++) {
    if (p.fase === "partida-terminada") {
      alCerrar(p);
      return;
    }
    if (p.fase !== "jugando") {
      alCerrar(p);
      p = siguienteMano(p, azar);
      continue;
    }
    enCurso?.(p);
    const posibles = accionesPosibles(p, p.turno);
    if (posibles.length === 0) return;
    const elegida: Accion = posibles[Math.floor(azar() * posibles.length)];
    p = aplicar(p, elegida, p.turno);
  }
}

test("nunca se enseña una flor que no se cantó, ni un envido que no se quiso", () => {
  for (let semilla = 1; semilla <= 80; semilla++) {
    recorrerManos(semilla, (p) => {
      for (const t of tantosAlCierre(p)) {
        if (t.clase === "flor") {
          assert.ok(
            p.florCantada[t.quien] && p.flor[t.quien].tiene,
            `semilla ${semilla}: se enseñó una flor de ${t.quien} que no se cantó`,
          );
          assert.equal(t.valor, p.flor[t.quien].valor, `semilla ${semilla}: valor de flor cambiado`);
        } else {
          assert.ok(
            p.envidoJugado !== null,
            `semilla ${semilla}: se enseñó un envido que no se quiso`,
          );
          assert.equal(
            t.valor,
            valorEnvido(p.manoInicial[t.quien], p.muestra),
            `semilla ${semilla}: el tanto no es el de la mano con la que se jugó`,
          );
        }
      }
    });
  }
});

test("con las seis cartas jugadas no se enseña nada: ya está todo a la vista", () => {
  for (let semilla = 1; semilla <= 80; semilla++) {
    recorrerManos(semilla, (p) => {
      if (p.cartas.vos.length === 0 && p.cartas.rival.length === 0) {
        assert.deepEqual(
          tantosAlCierre(p),
          [],
          `semilla ${semilla}: se enseñaron tantos con la mano jugada entera`,
        );
      }
    });
  }
});

test("mientras la mano está en curso no se enseña nada", () => {
  for (let semilla = 1; semilla <= 40; semilla++) {
    recorrerManos(
      semilla,
      () => {},
      (p) => {
        assert.deepEqual(
          tantosAlCierre(p),
          [],
          `semilla ${semilla}: se enseñaron tantos con la mano todavía jugándose`,
        );
      },
    );
  }
});

/* Sin esto, los tres de arriba pasarían igual si la función devolviera SIEMPRE
   la lista vacía, que es la forma más fácil de "no mostrar de más". */
test("y sin embargo se enseña de verdad: la mano cortada con el tanto cantado", () => {
  let conEnvido = 0;
  let conFlor = 0;

  for (let semilla = 1; semilla <= 80; semilla++) {
    recorrerManos(semilla, (p) => {
      const mostrados = tantosAlCierre(p);
      if (mostrados.length === 0) return;
      // Si hay algo que enseñar, es porque quedó una carta sin salir.
      assert.ok(
        p.cartas.vos.length > 0 || p.cartas.rival.length > 0,
        `semilla ${semilla}: se enseñó algo con la mano jugada entera`,
      );
      if (mostrados.some((t) => t.clase === "envido")) conEnvido++;
      if (mostrados.some((t) => t.clase === "flor")) conFlor++;
    });
  }

  assert.ok(conEnvido > 0, "en 80 partidas nunca se enseñó un envido");
  assert.ok(conFlor > 0, "en 80 partidas nunca se enseñó una flor");
});

test("el envido querido enseña los DOS tantos, y uno solo va marcado como ganador", () => {
  for (let semilla = 1; semilla <= 80; semilla++) {
    recorrerManos(semilla, (p) => {
      const envidos = tantosAlCierre(p).filter((t) => t.clase === "envido");
      if (envidos.length === 0) return;
      assert.equal(envidos.length, 2, `semilla ${semilla}: el envido no enseñó los dos tantos`);
      assert.equal(
        envidos.filter((t) => t.gano).length,
        1,
        `semilla ${semilla}: el envido no tiene exactamente un ganador`,
      );
    });
  }
});
