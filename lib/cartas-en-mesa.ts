/**
 * Las cartas que el juego apoya SOLO al cerrarse la mano, para enseñar el tanto.
 *
 * ── QUÉ ES ESTO, Y POR QUÉ REEMPLAZÓ A UN RECUADRO ────────────────────────
 *
 * El 10/9/2026 se probaron dos recuadros que enseñaban las cartas del envido y
 * de la flor dibujadas adentro de un papel. Santiago los descartó los dos, por
 * lo mismo que viene guiando la sesión: la pantalla se llena. Lo que pidió en
 * cambio es lo que se hace en la mesa de verdad — que el que tiene que mostrar
 * **dé vuelta lo que le quedaba y lo apoye**, sin ningún dibujo nuevo.
 *
 * Así que esto no inventa una pantalla: dice qué cartas van sobre la mesa y en
 * qué lugar, y la mesa las dibuja con la MISMA `<CartaApoyada>` con la que
 * dibuja una carta jugada. Caen igual, con la misma animación, porque son la
 * misma cosa.
 *
 * ── ESTO NO ES UNA JUGADA, Y ESA ES LA DECISIÓN QUE MÁS PROTEGE AL JUEGO ──
 *
 * Nada de esto pasa por el motor. `aplicar()` no se llama, `p.bazas` no se
 * toca, los puntos no se mueven: la mano YA TERMINÓ y lo que se agrega es
 * pintura sobre una partida cerrada.
 *
 * Hacerlo al revés —"tirar de verdad" las cartas que faltan— habría sido meter
 * jugadas falsas en el historial de una mano ya resuelta, con el riesgo de que
 * alguna cambie un resultado. Acá eso es imposible por construcción: esta
 * función devuelve una lista y no puede hacer nada más.
 *
 * ── QUIÉN MUESTRA ────────────────────────────────────────────────────────
 *
 * `lib/tantos-al-cierre.ts` ya decide qué se puede enseñar sin soplarle cartas
 * a nadie, y tiene test. Esto se apoya en eso y encima aprieta una vuelta más:
 *
 *   · **la FLOR la enseña quien la cantó**, y si los dos la cantaron, los dos.
 *     Cantarla es declararla en voz alta y en la mesa se prueba enseñándola.
 *   · **el ENVIDO lo enseña sólo EL QUE LO GANÓ**. El que dijo "son buenas" no
 *     reveló su número, así que tampoco muestra sus cartas; y el que perdió
 *     habiendo cantado su tanto tampoco las da vuelta, porque en la mesa el que
 *     enseña es el que se lo llevó. Lo eligió Santiago, y de paso deja la mesa
 *     más limpia.
 *
 * Un `revelado: false` llega desde `tantosAlCierre` con `cartas: null`, así que
 * la puerta ya está cerrada aguas arriba y acá no hay de dónde sacarlas.
 *
 * ── CON LA MANO JUGADA ENTERA NO SE APOYA NADA ───────────────────────────
 *
 * Si no quedó ninguna carta sin jugar, la lista sale vacía y la mesa no dibuja
 * ni cartel ni cartas: están las seis a la vista y no hay nada que enseñar. Los
 * dos tantos en número igual aparecen bajo el medallón, que es otra cosa y sale
 * directo de `tantosAlCierre`.
 */

import type { Carta } from "./motor/baraja.ts";
import type { Jugador, Partida } from "./motor/partida.ts";
import { tantosAlCierre } from "./tantos-al-cierre.ts";

export interface CartaEnMesa {
  quien: Jugador;
  carta: Carta;
  /**
   * En qué lugar de la fila de bazas se apoya.
   *
   * Puede ser mayor que `p.bazas.length - 1`: las bazas que no se llegaron a
   * jugar NO EXISTEN en el motor —el array arranca con una y se le hace `push`
   * cuando la anterior se completa— así que los lugares de más se sintetizan
   * acá. Ver `lugaresPara`.
   */
  baza: number;
  /** Para escalonar la caída, como hace el barrido con las suyas. */
  orden: number;
}

export interface EnseñadoEnMesa {
  /**
   * Qué se está enseñando, para el cartel. `null` cuando no hay nada que
   * apoyar, y entonces tampoco hay cartel.
   */
  clase: "envido" | "flor" | null;
  cartas: CartaEnMesa[];
}

/** Lo que hay que apoyar sobre la mesa, o nada. */
export function cartasEnMesa(p: Partida): EnseñadoEnMesa {
  const muestran = tantosAlCierre(p).filter(
    (t) => t.revelado && (t.clase === "flor" || t.gano),
  );
  if (muestran.length === 0) return { clase: null, cartas: [] };

  const cartas: CartaEnMesa[] = [];
  let orden = 0;

  /* EL RIVAL PRIMERO, igual que en la fila de bazas, donde su carta se dibuja
     antes que la tuya para que la tuya quede encima. */
  for (const quien of ["rival", "vos"] as Jugador[]) {
    const suyo = muestran.find((t) => t.quien === quien);
    if (!suyo) continue;
    const quedan = p.cartas[quien];
    if (quedan.length === 0) continue;

    const lugares = lugaresPara(p, quien, quedan.length);
    quedan.forEach((carta, i) => {
      cartas.push({ quien, carta, baza: lugares[i], orden: orden++ });
    });
  }

  // Sin cartas que apoyar no hay cartel: la mano se jugó entera.
  return { clase: cartas.length > 0 ? muestran[0].clase : null, cartas };
}

/**
 * En qué lugares caen las cartas de alguien.
 *
 * Primero los huecos que YA EXISTEN —una baza que está en el array y que ese
 * jugador no llegó a contestar— y después lugares nuevos a la derecha.
 *
 * ── POR QUÉ A LA DERECHA Y NO RECENTRANDO ────────────────────────────────
 *
 * Porque la mesa NO SE PUEDE MOVER. `lugarDeBaza`, en la mesa, centra el grupo
 * sobre cuántas bazas tienen algo puesto: si estas cartas hicieran subir esa
 * cuenta, todas las cartas ya apoyadas se correrían de golpe en el mismo
 * cuadro. "La mesa no se mueve" es exactamente lo que vigila
 * `herramientas/mirar-mesa-nueva.mjs` desde el 4/9/2026.
 *
 * Y además es lo que se hace en la mesa de verdad: las que se enseñan se apoyan
 * al costado de lo jugado, no en el medio.
 */
function lugaresPara(p: Partida, quien: Jugador, cuantas: number): number[] {
  const lugares: number[] = [];
  for (let i = 0; i < p.bazas.length && lugares.length < cuantas; i++) {
    if (p.bazas[i][quien] === null) lugares.push(i);
  }
  let siguiente = p.bazas.length;
  while (lugares.length < cuantas) lugares.push(siguiente++);
  return lugares;
}
