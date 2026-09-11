/**
 * Qué se enseña cuando se cierra la mano.
 *
 * ── LA COSTUMBRE QUE ESTO COPIA ───────────────────────────────────────────
 *
 * En la mesa de verdad, el que ganó el envido no muestra las cartas en el
 * momento: canta el número y sigue jugando. Recién al terminar la mano se
 * enseña lo que se tenía —"acá está mi envido"— y el otro se queda tranquilo de
 * que no le mintieron.
 *
 * ── QUÉ CAMBIÓ EL 10/9/2026, Y POR QUÉ ────────────────────────────────────
 *
 * Antes esto devolvía NÚMEROS y la pantalla dibujaba un papelito que decía
 * "Yo 31 · Él 27". Ahora devuelve además LAS CARTAS, porque el recuadro nuevo
 * las dibuja de verdad y resalta las que suman el tanto. Y cambiaron dos
 * reglas, las dos porque Santiago las pidió así:
 *
 *   1. **Se enseña aunque la mano se haya jugado entera.** Antes, con las seis
 *      cartas sobre la mesa esto devolvía `[]` con el argumento de que el tanto
 *      lo puede contar cualquiera. Es cierto y no alcanza: contarlo es
 *      justamente lo que alguien que está aprendiendo todavía no sabe hacer, y
 *      ver las cartas resaltadas es la mitad del valor del recuadro.
 *   2. **El que dijo "son buenas" aparece igual, pero VACÍO.** Entra a la lista
 *      con `revelado: false`, sin valor y sin cartas, para que el recuadro
 *      pueda dibujar los dos lados. Ver abajo.
 *
 * ── QUÉ NO PUEDE APARECER ACÁ ─────────────────────────────────────────────
 *
 * Esto se dibuja sobre la mesa, así que todo lo que devuelva se lo está
 * diciendo al jugador. Y desde que devuelve cartas, la pregunta pasó de "¿se
 * puede decir este número?" a "¿se pueden mirar estas tres cartas?", que es más
 * cara. Hay exactamente dos casos en los que sí:
 *
 *   · la FLOR de quien la cantó. Cantarla es declarar que se tienen tres cartas
 *     que ligan; enseñarlas al final es lo que se hace en la mesa para probarlo.
 *     La que alguien se guardó no se ve, y ésa es la misma regla que ya cumple
 *     `revelarFlores` en el motor: saber que el otro tenía 41 te dice que le
 *     quedan tres cartas buenas.
 *   · el ENVIDO de quien haya DICHO SU NÚMERO, y sólo si se quiso. Ojo con
 *     esto, que estuvo mal hasta el 5/9/2026: al quererse NO cantan los dos.
 *     `reglas.txt` 9.4 dice que empieza el mano y que el que no puede superarlo
 *     dice "son buenas" y **no revela su tanto**. Quién llegó a decirlo está en
 *     `envidoJugado.dicho`, y es lo único que se puede leer de acá.
 *
 * El que dijo "son buenas" entra a la lista igual —hace falta para dibujar su
 * lado del recuadro— pero con `valor: null` y `cartas: null`. **No es un
 * descuido que estén en `null`: es la regla.** La pantalla dibuja ahí tres
 * dorsos y la palabra "Son buenas". Si algún día alguien los llena "porque ya
 * terminó la mano", le está enseñando al jugador un tanto que en la mesa nadie
 * dijo, y con las cartas que lo forman.
 *
 * Es una función pura y con test propio por lo mismo que `botonera.ts`: la
 * pantalla no tiene que decidir reglas del truco.
 */

import type { Carta } from "./motor/baraja.ts";
import type { Jugador, Partida } from "./motor/partida.ts";
import { cartasDelEnvido } from "./motor/tantos.ts";

export interface TantoMostrado {
  quien: Jugador;
  /** De dónde sale el número, que es lo que decide la frase que lo acompaña. */
  clase: "envido" | "flor";
  /**
   * Si llegó a decir su número en voz alta.
   *
   * En `false` —o sea, dijo "son buenas"— `valor` y `cartas` son `null` y no
   * hay nada que dibujar de su lado más que los dorsos.
   */
  revelado: boolean;
  valor: number | null;
  /** Las TRES del reparto, en el orden en que se repartieron. */
  cartas: readonly Carta[] | null;
  /**
   * Cuáles de esas tres suman el tanto, para resaltarlas.
   *
   * En la flor son las tres siempre (`valorFlor` las suma todas). En el envido
   * son una o dos, y las elige `cartasDelEnvido`.
   */
  cuentan: readonly Carta[] | null;
  /** Si se lo llevó. */
  gano: boolean;
}

/**
 * Lo que hay que enseñar al cerrarse la mano, o `[]` si no hay nada.
 *
 * `[]` en dos casos, y conviene tenerlos separados porque son dos razones
 * distintas: la mano no terminó todavía; o no hubo ni envido querido ni flor
 * cantada, o sea que en toda la mano nadie cantó un tanto.
 */
export function tantosAlCierre(p: Partida): TantoMostrado[] {
  if (p.fase === "jugando") return [];

  const mostrados: TantoMostrado[] = [];

  /* LA FLOR VA PRIMERO porque cuando hay flor el envido no se juega: la flor lo
     anula (reglas.txt 8.2). Nunca aparecen las dos, pero el orden deja la lista
     leyéndose igual que la mano.

     Acá no hay lado vacío: el que no cantó flor puede no tenerla, y dibujarle
     un lugar sería contar algo de sus cartas. Con una sola flor, la fila es
     una sola y la gana quien la cantó. */
  for (const quien of ["vos", "rival"] as Jugador[]) {
    if (p.florCantada[quien] && p.flor[quien].tiene) {
      mostrados.push({
        quien,
        clase: "flor",
        revelado: true,
        valor: p.flor[quien].valor,
        cartas: p.manoInicial[quien],
        cuentan: p.manoInicial[quien], // la flor suma las tres
        gano: ganadorDeLasFlores(p) === quien,
      });
    }
  }

  /* EL ENVIDO SÍ LLEVA LOS DOS LADOS, y el del que dijo "son buenas" va vacío.
     Quién ganó es público —se cobraron los puntos y el registro lo dijo—, así
     que marcarlo no cuenta nada nuevo. Su número y sus cartas, en cambio, no
     los dijo nadie. */
  if (p.envidoJugado) {
    const { ganador, dicho } = p.envidoJugado;
    for (const quien of ["vos", "rival"] as Jugador[]) {
      const revelado = dicho[quien];
      mostrados.push({
        quien,
        clase: "envido",
        revelado,
        valor: revelado ? p.envidoJugado[quien] : null,
        cartas: revelado ? p.manoInicial[quien] : null,
        cuentan: revelado ? cartasDelEnvido(p.manoInicial[quien], p.muestra) : null,
        gano: ganador === quien,
      });
    }
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
