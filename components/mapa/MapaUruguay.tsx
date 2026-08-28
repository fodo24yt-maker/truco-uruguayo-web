"use client";

/**
 * El mapa de la gira: el Uruguay dibujado en SVG, con un rival por departamento.
 *
 * La geometría —las formas, la silueta y dónde va cada etiqueta— sale entera de
 * `lib/mapa-uruguay.ts`, que se genera con `herramientas/generar-mapa.mjs` a
 * partir de datos cartográficos reales. Acá sólo se decide cómo se ve.
 *
 * La estética es la de un mapa de papel apoyado en la mesa del boliche: papel
 * gastado, tinta marrón y chapitas negras con el nombre. Todo con SVG y CSS: ni
 * una sola imagen que descargar.
 */

import { COLOR_DEPARTAMENTO } from "@/lib/mapa-colores";
import { DEPARTAMENTOS, LIENZO, SILUETA } from "@/lib/mapa-uruguay";
import type { Personalidad } from "@/lib/motor/personalidades";

/** Aire alrededor del país, para que entre la orla de agua. */
const MARGEN = 42;
const VISTA = `${-MARGEN} ${-MARGEN} ${LIENZO.ancho + MARGEN * 2} ${LIENZO.alto + MARGEN * 2}`;

/**
 * Cuánto se achica la chapita según el aire que tenga el departamento. Sale de
 * la `holgura` calculada, así que no hay listas de nombres a mano: si mañana
 * cambia una forma, la etiqueta se reacomoda sola.
 */
const escalaEtiqueta = (holgura: number) => Math.max(0.7, Math.min(1, holgura / 80));

/**
 * El único corrimiento a mano de todo el mapa. Montevideo es tan chico que su
 * punto más hondo cae casi sobre la costa, y la chapita terminaba flotando
 * sobre el Río de la Plata. Se la sube apenas para que se apoye en tierra.
 */
const DESVIO: Record<string, [number, number]> = {
  Montevideo: [0, -13],
};

export interface PropsMapa {
  rivales: Personalidad[];
  elegido: string | null;
  onElegir: (departamento: string) => void;
  /** Departamentos que el jugador ya ganó alguna vez. */
  ganados: Set<string>;
}

export function MapaUruguay({ rivales, elegido, onElegir, ganados }: PropsMapa) {
  const rivalDe = (d: string) => rivales.find((r) => r.departamento === d);
  const deptoElegido = DEPARTAMENTOS.find((d) => d.nombre === elegido);

  return (
    <svg
      viewBox={VISTA}
      preserveAspectRatio="xMidYMid meet"
      // Anclado al contenedor: con h-full dependía de que el padre tuviera
      // altura explícita, y dentro de un flex crecía de más.
      className="absolute inset-0 h-full w-full"
      role="group"
      aria-label="Mapa del Uruguay: elegí un departamento para jugar"
    >
      <defs>
        {/* Papel gastado. El feComposite es lo que importa: sin él, el ruido
            rellena el rectángulo entero de la región del filtro y queda una
            mancha cuadrada flotando al lado del país. */}
        <filter id="papel-viejo" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.024" numOctaves="3" seed="11" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.42  0 0 0 0 0.32  0 0 0 0 0.18  0 0 0 0.16 0"
            result="ruido"
          />
          <feComposite in="ruido" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      {/* El agua. No es un polígono: es el CONTORNO del país engordado tres
          veces, cada vez más fino. Como el trazo va centrado sobre la costa, la
          mitad se derrama hacia afuera y queda la orla de los mapas viejos. Al
          ser el borde real, es imposible que se salga en un rectángulo. */}
      <g fill="none" strokeLinejoin="round" className="pointer-events-none">
        <path d={SILUETA} stroke="#2b3a38" strokeWidth={52} opacity={0.55} />
        <path d={SILUETA} stroke="#38504c" strokeWidth={30} opacity={0.6} />
        <path d={SILUETA} stroke="#46635c" strokeWidth={12} opacity={0.7} />
      </g>

      {/* Los departamentos */}
      <g strokeLinejoin="round">
        {DEPARTAMENTOS.map((depto) => {
          const rival = rivalDe(depto.nombre);
          const ganado = ganados.has(depto.nombre);

          return (
            <path
              key={depto.nombre}
              d={depto.forma}
              fill={COLOR_DEPARTAMENTO[depto.nombre]}
              stroke="#5d4326"
              strokeWidth={2.2}
              className="depto cursor-pointer"
              onClick={() => onElegir(depto.nombre)}
              role="button"
              tabIndex={0}
              aria-label={`${depto.nombre}, contra ${rival?.nombre ?? "nadie"}${ganado ? ", ya ganado" : ""}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onElegir(depto.nombre);
                }
              }}
            />
          );
        })}
      </g>

      {/* La textura del papel, recortada a la silueta y aplicada una sola vez.
          Antes iba una por departamento: 19 filtros de ruido son caros en
          celular y no se notaba la diferencia. */}
      <path
        d={SILUETA}
        fill="#000"
        filter="url(#papel-viejo)"
        className="pointer-events-none"
      />

      {/* El borde del país, más firme que las divisiones de adentro */}
      <path
        d={SILUETA}
        fill="none"
        stroke="#3a2418"
        strokeWidth={3.4}
        strokeLinejoin="round"
        className="pointer-events-none"
      />

      {/* El elegido se vuelve a dibujar encima: si no, el vecino que se pinta
          después le tapa medio contorno y el realce queda cortado. */}
      {deptoElegido && (
        <path
          d={deptoElegido.forma}
          fill={COLOR_DEPARTAMENTO[deptoElegido.nombre]}
          stroke="#e8b95c"
          strokeWidth={5}
          strokeLinejoin="round"
          className="pointer-events-none"
        />
      )}

      {/* Las chapitas con el nombre y las estrellas */}
      {DEPARTAMENTOS.map((depto) => {
        const rival = rivalDe(depto.nombre);
        const ganado = ganados.has(depto.nombre);
        const [dx, dy] = DESVIO[depto.nombre] ?? [0, 0];
        const [x, y] = [depto.centro[0] + dx, depto.centro[1] + dy];
        const escala = escalaEtiqueta(depto.holgura);
        const ancho = Math.max(depto.nombre.length * 13.5 + 26, 86);

        return (
          <g
            key={`et-${depto.nombre}`}
            className="pointer-events-none"
            transform={`translate(${x}, ${y}) scale(${escala.toFixed(3)})`}
          >
            <rect x={-ancho / 2} y={-17} width={ancho} height={32} rx={3} fill="#181008" opacity={0.9} />
            <text
              x={0}
              y={4}
              textAnchor="middle"
              fill="#f2e6d0"
              fontSize={19}
              fontFamily="var(--font-ui), sans-serif"
            >
              {depto.nombre.toUpperCase()}
            </text>
            <g transform="translate(0, 34)">
              <rect x={-24} y={-13} width={48} height={25} rx={3} fill="#181008" opacity={0.84} />
              <text
                x={0}
                y={5}
                textAnchor="middle"
                fill={ganado ? "#84cf90" : "#e8b95c"}
                fontSize={16}
                fontFamily="var(--font-ui), sans-serif"
              >
                {ganado ? "✓" : `★${rival?.dificultad ?? 1}`}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
