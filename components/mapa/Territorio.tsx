/**
 * El país dibujado a tinta sobre el papel: el agua, los 19 departamentos y el
 * borde.
 *
 * Los polígonos son el único blanco táctil del mapa —son enormes y no se
 * achican con la pantalla, al revés que cualquier chapita— y se dibujan EN
 * ORDEN DE GIRA, no de norte a sur: así el Tab recorre el recorrido, que es la
 * forma en que se juega. El orden de pintado da igual porque los bordes
 * internos son vértices compartidos idénticos (hay test que lo garantiza) y el
 * borde del país va arriba de todo.
 *
 * Las paradas cerradas siguen siendo clicables a propósito: es mejor tocar y
 * que te digan "primero ganale a La Coca" que tocar y que no pase nada. El
 * estado va en el `aria-label` y no en `aria-disabled`, que sería mentira para
 * algo que responde.
 */

import { COLOR_DEPARTAMENTO } from "@/lib/mapa-colores";
import type { Parada } from "@/lib/gira";
import { DEPARTAMENTOS, SILUETA } from "@/lib/mapa-uruguay";

const FORMA = new Map(DEPARTAMENTOS.map((d) => [d.nombre, d.forma]));

function comoSuena(parada: Parada): string {
  switch (parada.estado) {
    case "ganada":
      return "ya lo ganaste";
    case "abierta":
      return parada.esElProximo ? "te toca ahora" : "abierto";
    case "cerrada":
      return `cerrado: primero ganale a ${parada.abreCon?.nombre ?? "el anterior"}`;
  }
}

export interface PropsTerritorio {
  paradas: readonly Parada[];
  elegido: string | null;
  onElegir: (departamento: string) => void;
}

export function Territorio({ paradas, elegido, onElegir }: PropsTerritorio) {
  const formaElegida = elegido ? FORMA.get(elegido) : undefined;

  return (
    <>
      {/* El agua. No es un polígono: es el CONTORNO del país engordado tres
          veces, cada vez más fino. Como el trazo va centrado sobre la costa, la
          mitad se derrama hacia afuera y quedan las curvas de nivel de los
          mapas viejos. Al ser el borde real, es imposible que se salga en un
          rectángulo. Va en la misma tinta que todo lo demás: el mar de un mapa
          de papel no es celeste, son rayas. */}
      <g fill="none" stroke="var(--color-tinta-mapa)" strokeLinejoin="round" className="pointer-events-none">
        <path d={SILUETA} strokeWidth={24} opacity={0.09} />
        <path d={SILUETA} strokeWidth={14} opacity={0.14} />
        <path d={SILUETA} strokeWidth={6} opacity={0.26} />
      </g>

      {/* Los departamentos, en orden de gira */}
      <g strokeLinejoin="round">
        {paradas.map((parada) => {
          const nombre = parada.personalidad.departamento;
          return (
            <path
              key={nombre}
              d={FORMA.get(nombre)}
              fill={COLOR_DEPARTAMENTO[nombre]}
              stroke="var(--color-tinta-mapa)"
              strokeWidth={1.8}
              strokeOpacity={0.55}
              className="depto cursor-pointer"
              onClick={() => onElegir(nombre)}
              role="button"
              tabIndex={0}
              aria-label={`Paso ${parada.paso}: ${nombre}, contra ${parada.personalidad.nombre}, ${comoSuena(parada)}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onElegir(nombre);
                }
              }}
            />
          );
        })}
      </g>

      {/* El borde del país, más firme que las divisiones de adentro */}
      <path
        d={SILUETA}
        fill="none"
        stroke="var(--color-tinta-mapa)"
        strokeWidth={3.4}
        strokeLinejoin="round"
        className="pointer-events-none"
      />

      {/* El elegido se vuelve a dibujar encima: si no, el vecino que se pinta
          después le tapa medio contorno y el realce queda cortado. */}
      {formaElegida && (
        <path
          d={formaElegida}
          fill="none"
          stroke="var(--color-sangre)"
          strokeWidth={4.5}
          strokeLinejoin="round"
          className="pointer-events-none"
        />
      )}
    </>
  );
}
