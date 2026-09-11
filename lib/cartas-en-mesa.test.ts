/**
 * Que la mesa enseñe lo que corresponde, y NADA más.
 *
 * Hay tres formas de que esto salga mal, en orden de gravedad:
 *
 *   1. que apoye una carta de alguien que no tenía que mostrar —o peor, con la
 *      mano todavía jugándose—, que es soplarle cartas al jugador;
 *   2. que apoye dos cartas en el mismo lugar, o una donde ya hay otra, que se
 *      ve como un montón;
 *   3. que no apoye nada nunca, que es la forma más fácil de "no mostrar de
 *      más" y deja la función sin sentido.
 *
 * Las tres se verifican acá recorriendo partidas de verdad.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { cartasEnMesa } from "./cartas-en-mesa.ts";
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
 * termina. Al azar y no con el bot, por lo mismo que en `botonera.test.ts`: el
 * bot juega bien, y jugar bien es no meterse en las ramas raras. Acá las ramas
 * raras son todo el asunto.
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
    p = aplicar(p, posibles[Math.floor(azar() * posibles.length)], p.turno);
  }
}

const mismaCarta = (a: { numero: number; palo: string }, b: { numero: number; palo: string }) =>
  a.numero === b.numero && a.palo === b.palo;

/* ── 1. LO QUE NO PUEDE PASAR NUNCA ─────────────────────────────────────── */

test("MIENTRAS LA MANO SE JUEGA no se apoya ni una carta", () => {
  for (let semilla = 1; semilla <= 40; semilla++) {
    recorrerManos(
      semilla,
      () => {},
      (p) => {
        const enseñado = cartasEnMesa(p);
        assert.deepEqual(
          enseñado.cartas,
          [],
          `semilla ${semilla}: se apoyaron cartas con la mano todavía jugándose`,
        );
        assert.equal(enseñado.clase, null, `semilla ${semilla}: hubo cartel a media mano`);
      },
    );
  }
});

test("si en la mano nadie cantó nada, no se apoya ni una carta", () => {
  let casos = 0;
  for (let semilla = 1; semilla <= 80; semilla++) {
    recorrerManos(semilla, (p) => {
      const hubo = p.envidoJugado !== null || p.florCantada.vos || p.florCantada.rival;
      if (hubo) return;
      casos++;
      assert.deepEqual(
        cartasEnMesa(p).cartas,
        [],
        `semilla ${semilla}: se enseñó algo sin que nadie hubiera cantado`,
      );
    });
  }
  assert.ok(casos > 0, "en 80 semillas nunca hubo una mano sin cantos");
});

test('el que dijo "son buenas" NO da vuelta sus cartas', () => {
  let casos = 0;
  for (let semilla = 1; semilla <= 120; semilla++) {
    recorrerManos(semilla, (p) => {
      if (!p.envidoJugado) return;
      const callado = (["vos", "rival"] as Jugador[]).find((q) => !p.envidoJugado!.dicho[q]);
      if (!callado) return;
      casos++;

      const suyas = cartasEnMesa(p).cartas.filter((c) => c.quien === callado);
      assert.deepEqual(
        suyas,
        [],
        `semilla ${semilla}: ${callado} dijo "son buenas" y sus cartas se apoyaron igual`,
      );

      /* Y la comprobación bruta: ninguna de sus tres cartas puede aparecer en
         la lista, ni siquiera colgada del lado del otro. */
      for (const suya of p.manoInicial[callado]) {
        const coladas = cartasEnMesa(p).cartas.filter((c) => mismaCarta(c.carta, suya));
        // sólo vale si el OTRO tiene la misma carta, que no puede pasar
        assert.equal(
          coladas.length,
          0,
          `semilla ${semilla}: la ${suya.numero} de ${suya.palo} de ${callado} se filtró`,
        );
      }
    });
  }
  assert.ok(casos > 0, "en 120 semillas nadie dijo nunca “son buenas”");
});

test("el que PERDIÓ el envido no da vuelta sus cartas, aunque haya cantado su tanto", () => {
  let casos = 0;
  for (let semilla = 1; semilla <= 120; semilla++) {
    recorrerManos(semilla, (p) => {
      const envidos = tantosAlCierre(p).filter((t) => t.clase === "envido");
      const perdedor = envidos.find((t) => t.revelado && !t.gano);
      if (!perdedor) return;
      casos++;
      assert.deepEqual(
        cartasEnMesa(p).cartas.filter((c) => c.quien === perdedor.quien),
        [],
        `semilla ${semilla}: el que perdió el envido enseñó igual`,
      );
    });
  }
  assert.ok(casos > 0, "en 120 semillas el pie nunca superó al mano");
});

/* ── 2. QUE LO QUE SE APOYA SEA COHERENTE ───────────────────────────────── */

test("cada carta apoyada es suya, le quedaba sin jugar, y va en un lugar propio", () => {
  for (let semilla = 1; semilla <= 80; semilla++) {
    recorrerManos(semilla, (p) => {
      const { cartas, clase } = cartasEnMesa(p);
      if (cartas.length === 0) {
        assert.equal(clase, null, `semilla ${semilla}: cartel sin cartas`);
        return;
      }
      assert.ok(clase !== null, `semilla ${semilla}: cartas sin cartel`);

      const ocupados = new Set<string>();
      for (const c of cartas) {
        // es de su propia mano
        assert.ok(
          p.manoInicial[c.quien].some((x) => mismaCarta(x, c.carta)),
          `semilla ${semilla}: se apoyó una carta que no es de ${c.quien}`,
        );
        // y le quedaba SIN JUGAR: una ya jugada estaría dos veces en la mesa
        assert.ok(
          p.cartas[c.quien].some((x) => mismaCarta(x, c.carta)),
          `semilla ${semilla}: se apoyó una carta que ${c.quien} ya había jugado`,
        );
        // el lugar está libre de verdad
        const clave = `${c.quien}-${c.baza}`;
        assert.ok(!ocupados.has(clave), `semilla ${semilla}: dos cartas en ${clave}`);
        ocupados.add(clave);
        if (c.baza < p.bazas.length) {
          assert.equal(
            p.bazas[c.baza][c.quien],
            null,
            `semilla ${semilla}: ${clave} ya tenía una carta jugada`,
          );
        }
      }

      // el orden no se repite: es lo que escalona la caída
      assert.equal(
        new Set(cartas.map((c) => c.orden)).size,
        cartas.length,
        `semilla ${semilla}: dos cartas con el mismo orden de caída`,
      );
      // y nunca más de 3 por lado, que es lo que se reparte
      for (const q of ["vos", "rival"] as Jugador[]) {
        assert.ok(
          cartas.filter((c) => c.quien === q).length <= 3,
          `semilla ${semilla}: ${q} apoyó más de tres cartas`,
        );
      }
    });
  }
});

/* ── 3. Y SIN EMBARGO SE ENSEÑA DE VERDAD ───────────────────────────────
   Sin esto, los cinco de arriba pasarían igual si la función devolviera
   siempre la lista vacía, que es la forma más fácil de "no mostrar de más". */
test("y sin embargo se enseña de verdad: el envido y la flor se apoyan", () => {
  let conEnvido = 0;
  let conFlor = 0;
  let manosEnteras = 0;

  for (let semilla = 1; semilla <= 120; semilla++) {
    recorrerManos(semilla, (p) => {
      const { clase, cartas } = cartasEnMesa(p);
      if (clase === "envido") conEnvido++;
      if (clase === "flor") conFlor++;
      // con la mano jugada entera no se apoya nada, aunque se haya cantado
      if (p.cartas.vos.length === 0 && p.cartas.rival.length === 0) {
        manosEnteras++;
        assert.deepEqual(cartas, [], `semilla ${semilla}: se apoyó algo con la mano entera`);
      }
    });
  }

  assert.ok(conEnvido > 0, "en 120 semillas nunca se apoyó un envido");
  assert.ok(conFlor > 0, "en 120 semillas nunca se apoyó una flor");
  assert.ok(manosEnteras > 0, "en 120 semillas ninguna mano se jugó entera");
});
