"use client";

/**
 * ¿La ventana es ancha o alta?
 *
 * ── Por qué existe, si el proyecto no usa puntos de corte ─────────────────
 *
 * La regla del proyecto es que las medidas van atadas al ALTO y no a puntos de
 * corte por ancho, porque el problema de verdad era la pantalla baja y no la
 * angosta. Eso sigue siendo cierto y no se toca.
 *
 * Pero hay una cosa que el alto solo no puede resolver: la mesa se dibuja
 * dentro de una escena cuya FORMA cambia por completo. En un celular es alta y
 * angosta; en una computadora es ancha y baja. Con los objetos medidos en `vh`
 * el mazo mide los mismos píxeles en las dos, sólo que en el celular es el 22%
 * del ancho de la escena y en la compu es el 7%: el mismo número se ve grande
 * de un lado y perdido del otro.
 *
 * Así que hay dos diseños, y esto es lo que elige. El corte NO es el ancho:
 * es la PROPORCIÓN. Una pantalla baja y ancha —1280×620, que es el caso duro—
 * entra por donde tiene que entrar, y no por ser ancha sino por ser apaisada.
 *
 * ── Y por qué `useSyncExternalStore` ──────────────────────────────────────
 *
 * El sitio es estático: se genera en el build, cuando no hay ventana. La
 * instantánea de servidor devuelve `false` a propósito —el celular es el caso
 * difícil y es el que tiene que salir bien si algo falla—. En una compu el
 * primer cuadro usa el diseño de celular y cambia al hidratar; eso cae adentro
 * de "REPARTIENDO…", así que no se ve.
 *
 * Leerlo con `useState` + `useEffect` daría lo mismo en la pantalla pero
 * mentiría durante un render: `useSyncExternalStore` es lo que React tiene para
 * esto justamente porque no deja que el valor quede desincronizado.
 */

import { useSyncExternalStore } from "react";

/** Apaisada: tan ancha como alta, o más. */
const CONSULTA = "(min-aspect-ratio: 1/1)";

function suscribir(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

const enElNavegador = () => window.matchMedia(CONSULTA).matches;
/** En el build no hay ventana. Se asume celular, que es el caso apretado. */
const enElServidor = () => false;

export function usaPantallaAncha(): boolean {
  return useSyncExternalStore(suscribir, enElNavegador, enElServidor);
}
