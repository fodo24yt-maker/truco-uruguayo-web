/**
 * El camino punteado: los 18 saltos de la gira, de parada a parada.
 *
 * La geometría entera sale de `lib/gira-camino.ts`, donde está calculada como
 * constante de módulo: acá sólo se decide de qué color va cada salto. Que el
 * `d` no cambie nunca de identidad es lo que deja que React no toque el
 * atributo y la animación CSS no se reinicie sola.
 *
 * Son 18 paths y no uno porque cada salto tiene su estado, y porque así se
 * anima UNO solo: la marcha de hormigas es `stroke-dashoffset`, que no es
 * compositable y repinta en cada cuadro. Uno es un detalle; dieciocho es una
 * pantalla que se calienta.
 */

import type { EstadoTramo } from "@/lib/gira";
import { CAMINO } from "@/lib/gira-camino";

/** El período del punteado. El keyframe de la marcha corre exactamente esto. */
const RAYA = "16 18";

const ESTILO: Record<EstadoTramo, { grosor: number; opacidad: number; clase: string }> = {
  recorrido: { grosor: 9, opacidad: 0.9, clase: "" },
  proximo: { grosor: 10, opacidad: 1, clase: "camino-marcha" },
  cerrado: { grosor: 7, opacidad: 0.4, clase: "" },
};

export function CaminoGira({ estados }: { estados: readonly EstadoTramo[] }) {
  return (
    <g fill="none" strokeLinecap="round" className="pointer-events-none">
      {CAMINO.map((tramo, i) => {
        const estilo = ESTILO[estados[i] ?? "cerrado"];
        return (
          <g key={`${tramo.desde}-${tramo.hasta}`} opacity={estilo.opacidad}>
            {/* El halo de papel debajo: sin esto el colorado se pierde contra
                las aguadas más oscuras. Lleva el mismo punteado, si no se ve
                una línea continua fantasma por abajo. */}
            <path
              d={tramo.d}
              stroke="var(--color-pergamino-luz)"
              strokeWidth={estilo.grosor + 5}
              strokeDasharray={RAYA}
              opacity={0.55}
            />
            <path
              d={tramo.d}
              stroke="var(--color-sangre)"
              strokeWidth={estilo.grosor}
              strokeDasharray={RAYA}
              className={estilo.clase}
            />
          </g>
        );
      })}
    </g>
  );
}
