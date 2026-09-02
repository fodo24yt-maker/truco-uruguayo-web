/**
 * Qué tantos se enseñan cuando se cierra la mano.
 *
 * ── La costumbre que esto copia ───────────────────────────────────────────
 *
 * En la mesa de verdad, el que ganó el envido no muestra las cartas en el
 * momento: canta el número y sigue jugando. Recién al terminar la mano, si
 * quedó alguna carta sin salir, se enseña lo que se tenía —"acá está mi
 * envido"— y el otro se queda tranquilo de que no le mintieron.
 *
 * Y si la mano se jugó ENTERA no se enseña nada, porque no hace falta: las seis
 * cartas están sobre la mesa y el tanto lo puede contar cualquiera. Por eso
 * esto devuelve `[]` en ese caso, que es el más común de todos.
 *
 * ── Qué NO puede aparecer acá ─────────────────────────────────────────────
 *
 * Esto se dibuja sobre la mesa, así que todo lo que devuelva se lo está
 * diciendo al jugador. Hay exactamente dos cosas que se pueden enseñar, y las
 * dos porque **ya se dijeron en voz alta**:
 *
 *   · la FLOR de quien la cantó. La que alguien se guardó no se ve, ni la del
 *     que se achicó sin enseñarla: es la misma regla que ya cumple
 *     `revelarFlores` en el motor, y está ahí porque saber que el otro tenía 41
 *     te dice que le quedan tres cartas buenas.
 *   · los dos tantos del ENVIDO, y sólo si se quiso. Al quererse, los dos
 *     cantan su número: son públicos. Un envido cantado y no querido no deja
 *     ningún número dicho, y por eso `envidoJugado` se queda en `null`.
 *
 * Fuera de esas dos, acá no se puede agregar nada sin soplarle cartas a
 * alguien. Si algún día hay que mostrar más, primero hay que poder decir en qué
 * momento de la mano eso se cantó en voz alta.
 *
 * Es una función pura y con test propio por lo mismo que `botonera.ts`: la
 * pantalla no tiene que decidir reglas del truco.
 */

import type { Jugador, Partida } from "./motor/partida.ts";

export interface TantoMostrado {
  quien: Jugador;
  /** De dónde sale el número, que es lo que decide la frase que lo acompaña. */
  clase: "envido" | "flor";
  valor: number;
  /** Si se lo llevó. En la flor no cantada por los dos, siempre es el único. */
  gano: boolean;
}

/**
 * Lo que hay que enseñar al cerrarse la mano, o `[]` si no hay nada.
 *
 * `[]` en tres casos, y conviene tenerlos separados porque son tres razones
 * distintas: la mano no terminó todavía; se jugaron las seis cartas y está todo
 * a la vista; o no hubo ni envido querido ni flor cantada, o sea que nadie dijo
 * un número en toda la mano.
 */
export function tantosAlCierre(p: Partida): TantoMostrado[] {
  if (p.fase === "jugando") return [];

  // Con las seis cartas jugadas no hay nada escondido que enseñar.
  const quedanCartas = p.cartas.vos.length > 0 || p.cartas.rival.length > 0;
  if (!quedanCartas) return [];

  const mostrados: TantoMostrado[] = [];

  /* LA FLOR VA PRIMERO porque cuando hay flor el envido no se juega: la flor lo
     anula (reglas.txt 8.2). Nunca aparecen las dos, pero el orden deja la lista
     leyéndose igual que la mano. */
  for (const quien of ["vos", "rival"] as Jugador[]) {
    if (p.florCantada[quien] && p.flor[quien].tiene) {
      mostrados.push({
        quien,
        clase: "flor",
        valor: p.flor[quien].valor,
        gano: ganadorDeLasFlores(p) === quien,
      });
    }
  }

  if (p.envidoJugado) {
    const { vos, rival, ganador } = p.envidoJugado;
    mostrados.push({ quien: "vos", clase: "envido", valor: vos, gano: ganador === "vos" });
    mostrados.push({ quien: "rival", clase: "envido", valor: rival, gano: ganador === "rival" });
  }

  return mostrados;
}

/**
 * Quién ganó la comparación de flores, para marcar cuál se la llevó.
 *
 * Con una sola flor cantada, la gana el que la cantó y no hay nada que
 * comparar. Con las dos, empate al mano, igual que en el motor (reglas 3.3).
 *
 * Se recalcula acá en vez de guardarlo: el motor ya tiene los dos valores en
 * `p.flor` y son los mismos con los que cobró. Un campo más sería otro estado
 * que puede quedar desincronizado con ése.
 */
function ganadorDeLasFlores(p: Partida): Jugador | null {
  const cantaron = (["vos", "rival"] as Jugador[]).filter(
    (q) => p.florCantada[q] && p.flor[q].tiene,
  );
  if (cantaron.length === 0) return null;
  if (cantaron.length === 1) return cantaron[0];
  const { vos, rival } = p.flor;
  return vos.valor === rival.valor ? p.quienEsMano : vos.valor > rival.valor ? "vos" : "rival";
}
