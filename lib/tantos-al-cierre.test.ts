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

/**
 * ── ESTE TEST DECÍA LO CONTRARIO HASTA EL 5/9/2026 ─────────────────────────
 *
 * Pedía que se enseñaran los DOS tantos, porque el motor cantaba los dos. Los
 * dos estaban mal: `reglas.txt` 9.4 dice que empieza el mano y que **el que no
 * puede superar lo que ya se cantó dice "son buenas" y no revela su tanto**.
 *
 * Enseñar el del perdedor es soplarle las cartas al otro: con su tanto y la
 * muestra se deduce buena parte de lo que le queda en la mano. Santiago lo vio
 * jugando —se leía "ÉL: 28" aunque el rival hubiera perdido— y por eso el test
 * ahora pide lo de verdad.
 */
test("el envido querido enseña sólo el tanto del que lo dijo, y siempre el del ganador", () => {
  let conDos = 0;
  for (let semilla = 1; semilla <= 80; semilla++) {
    recorrerManos(semilla, (p) => {
      const envidos = tantosAlCierre(p).filter((t) => t.clase === "envido");
      if (envidos.length === 0) return;

      /* Uno siempre; dos sólo cuando el pie superó al mano, porque ahí los dos
         llegaron a decir su número en voz alta. */
      assert.ok(
        envidos.length === 1 || envidos.length === 2,
        `semilla ${semilla}: el envido enseñó ${envidos.length} tantos`,
      );
      if (envidos.length === 2) conDos++;

      assert.equal(
        envidos.filter((t) => t.gano).length,
        1,
        `semilla ${semilla}: el envido no tiene exactamente un ganador`,
      );

      /* El que ganó SIEMPRE dijo su número: o es el mano, que habla primero, o
         es el pie y lo dijo justamente porque superaba. */
      assert.ok(
        envidos.some((t) => t.gano),
        `semilla ${semilla}: no se enseñó el tanto del que ganó el envido`,
      );

      /* Y el perdedor, si aparece, es sólo porque el mano habló primero y
         después el pie lo superó: nunca se enseña a alguien que dijo
         "son buenas". */
      const perdedor = envidos.find((t) => !t.gano);
      if (perdedor) {
        assert.equal(
          perdedor.quien,
          p.envidoJugado?.ganador === "vos" ? "rival" : "vos",
          `semilla ${semilla}: el perdedor enseñado no es el que corresponde`,
        );
        assert.ok(
          p.envidoJugado?.dicho[perdedor.quien],
          `semilla ${semilla}: se enseñó el tanto de alguien que dijo "son buenas"`,
        );
      }
    });
  }
  /* Que el caso de dos exista de verdad: si nunca pasara, el test de arriba
     estaría pasando por no comprobar nada. */
  assert.ok(conDos > 0, "en 80 semillas nunca ganó el pie superando al mano");
});

test('el que no supera al mano dice "son buenas" y su tanto no aparece en ningún lado', () => {
  let casos = 0;
  for (let semilla = 1; semilla <= 80; semilla++) {
    recorrerManos(semilla, (p) => {
      if (!p.envidoJugado) return;
      const { ganador, dicho } = p.envidoJugado;
      const callado = (["vos", "rival"] as const).find((q) => !dicho[q]);
      if (!callado) return;
      casos++;

      /* El que se calla nunca es el que ganó. */
      assert.notEqual(callado, ganador, `semilla ${semilla}: el ganador dijo "son buenas"`);

      /* Y su número no puede estar escrito en ningún evento de la mano: es la
         comprobación que de verdad cierra la filtración, porque la pantalla
         dibuja los eventos tal cual. */
      const suyo = String(p.envidoJugado[callado]);
      const suyos = p.eventos.filter((e) => e.quien === callado);
      assert.ok(
        suyos.every((e) => e.texto !== suyo),
        `semilla ${semilla}: ${callado} dijo "son buenas" pero su tanto (${suyo}) quedó en los eventos`,
      );
      assert.ok(
        suyos.some((e) => e.texto === "Son buenas"),
        `semilla ${semilla}: ${callado} no llegó a decir "son buenas"`,
      );
    });
  }
  assert.ok(casos > 0, "en 80 semillas nadie dijo nunca “son buenas”");
});
