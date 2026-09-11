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
import { cartasDelEnvido, valorEnvido } from "./motor/tantos.ts";

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
          assert.ok(t.revelado, `semilla ${semilla}: una flor cantada tiene que enseñarse entera`);
          assert.equal(t.valor, p.flor[t.quien].valor, `semilla ${semilla}: valor de flor cambiado`);
        } else {
          assert.ok(
            p.envidoJugado !== null,
            `semilla ${semilla}: se enseñó un envido que no se quiso`,
          );
          if (t.revelado) {
            assert.equal(
              t.valor,
              valorEnvido(p.manoInicial[t.quien], p.muestra),
              `semilla ${semilla}: el tanto no es el de la mano con la que se jugó`,
            );
          }
        }

        /* Y LAS CARTAS, que es lo que se agregó el 10/9/2026. Van juntas con el
           número: o está todo o no está nada. Un `valor` con `cartas: null`
           sería un recuadro a medio dibujar; un `cartas` con `valor: null`
           sería enseñar tres cartas sin decir para qué. */
        if (t.revelado) {
          assert.notEqual(t.valor, null, `semilla ${semilla}: revelado sin valor`);
          assert.deepEqual(
            t.cartas,
            p.manoInicial[t.quien],
            `semilla ${semilla}: las cartas enseñadas no son las del reparto`,
          );
          assert.ok(
            t.cuentan!.every((x) => t.cartas!.includes(x)),
            `semilla ${semilla}: se resaltó una carta que no está en la mano`,
          );

          /* CUÁNTAS se resaltan, que es lo que separa un recuadro que enseña de
             uno que sólo decora. Esta aserción se agregó porque faltaba: sin
             ella, resaltar las tres cartas del envido —o sea no resaltar nada—
             pasaba las 174 pruebas. Se comprobó saboteándolo. */
          if (t.clase === "flor") {
            assert.equal(t.cuentan!.length, 3, `semilla ${semilla}: la flor suma las tres`);
          } else {
            assert.ok(
              t.cuentan!.length === 1 || t.cuentan!.length === 2,
              `semilla ${semilla}: el envido resaltó ${t.cuentan!.length} cartas`,
            );
            assert.deepEqual(
              t.cuentan,
              cartasDelEnvido(p.manoInicial[t.quien], p.muestra),
              `semilla ${semilla}: las cartas resaltadas no son las que dan el tanto`,
            );
          }
        } else {
          assert.equal(t.valor, null, `semilla ${semilla}: se coló el tanto de un callado`);
          assert.equal(t.cartas, null, `semilla ${semilla}: se colaron las cartas de un callado`);
          assert.equal(t.cuentan, null, `semilla ${semilla}: se coló el resaltado de un callado`);
        }
      }
    });
  }
});

/* ── ESTE TEST PEDÍA LO CONTRARIO HASTA EL 10/9/2026 ───────────────────────
   Pedía que con las seis cartas jugadas no se enseñara NADA, con el argumento
   de que están todas sobre la mesa y el tanto lo cuenta cualquiera. Es cierto
   y no alcanza: contarlo es justo lo que el que está aprendiendo todavía no
   sabe hacer. Ahora se enseña siempre que se haya cantado algo. */
test("con las seis cartas jugadas TAMBIÉN se enseña", () => {
  let casos = 0;
  for (let semilla = 1; semilla <= 80; semilla++) {
    recorrerManos(semilla, (p) => {
      if (p.cartas.vos.length > 0 || p.cartas.rival.length > 0) return;
      const hubo = p.envidoJugado !== null || p.florCantada.vos || p.florCantada.rival;
      if (!hubo) return;
      casos++;
      assert.ok(
        tantosAlCierre(p).length > 0,
        `semilla ${semilla}: se cantó un tanto y con la mano entera no se enseñó nada`,
      );
    });
  }
  assert.ok(casos > 0, "en 80 semillas nunca se jugó entera una mano con tanto cantado");
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
test("y sin embargo se enseña de verdad: el envido y la flor aparecen", () => {
  let conEnvido = 0;
  let conFlor = 0;

  for (let semilla = 1; semilla <= 80; semilla++) {
    recorrerManos(semilla, (p) => {
      const mostrados = tantosAlCierre(p);
      if (mostrados.length === 0) return;
      // Si hay algo que enseñar, es porque alguien cantó algo en esta mano.
      assert.ok(
        p.envidoJugado !== null || p.florCantada.vos || p.florCantada.rival,
        `semilla ${semilla}: se enseñó algo sin que nadie hubiera cantado`,
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
      const todos = tantosAlCierre(p).filter((t) => t.clase === "envido");
      if (todos.length === 0) return;

      /* Los DOS lados salen siempre —hace falta para dibujar el recuadro— pero
         sólo los revelados traen número. Uno siempre; dos sólo cuando el pie
         superó al mano, porque ahí los dos dijeron su número en voz alta. */
      assert.equal(todos.length, 2, `semilla ${semilla}: el envido no trajo los dos lados`);
      const envidos = todos.filter((t) => t.revelado);
      assert.ok(
        envidos.length === 1 || envidos.length === 2,
        `semilla ${semilla}: el envido reveló ${envidos.length} tantos`,
      );
      if (envidos.length === 2) conDos++;

      assert.equal(
        todos.filter((t) => t.gano).length,
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

      /* Y DESDE EL 10/9/2026, TAMPOCO SUS CARTAS. Es lo mismo de arriba una
         vuelta más arriba: el recuadro nuevo dibuja cartas, así que filtrar su
         mano es peor que filtrar su número —con las tres cartas el tanto se
         cuenta solo—. Su lado del recuadro se dibuja con dorsos. */
      const suyo2 = tantosAlCierre(p).find((t) => t.quien === callado && t.clase === "envido");
      assert.ok(suyo2, `semilla ${semilla}: falta el lado de ${callado} para dibujar el recuadro`);
      assert.equal(suyo2!.revelado, false, `semilla ${semilla}: ${callado} figura como revelado`);
      assert.equal(suyo2!.valor, null, `semilla ${semilla}: se coló el tanto de ${callado}`);
      assert.equal(suyo2!.cartas, null, `semilla ${semilla}: se colaron las cartas de ${callado}`);

      /* La comprobación bruta, que es la que de verdad cierra la puerta: NINGUNA
         de sus tres cartas puede estar en ningún lado de lo que se devuelve, ni
         siquiera colgada del lado del otro. */
      const salida = JSON.stringify(tantosAlCierre(p));
      for (const carta of p.manoInicial[callado]) {
        const suPar = tantosAlCierre(p)
          .flatMap((t) => [...(t.cartas ?? []), ...(t.cuentan ?? [])])
          .filter((x) => x.numero === carta.numero && x.palo === carta.palo);
        // puede aparecer sólo si el OTRO tiene la misma carta, que no puede pasar
        assert.equal(
          suPar.length,
          0,
          `semilla ${semilla}: la ${carta.numero} de ${carta.palo} de ${callado} se filtró en ${salida}`,
        );
      }
    });
  }
  assert.ok(casos > 0, "en 80 semillas nadie dijo nunca “son buenas”");
});
