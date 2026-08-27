"use client";

/**
 * El mapa de la gira: el Uruguay dibujado en SVG, con un rival por departamento.
 *
 * La estética es la de un mapa viejo de papel —pergamino, tinta marrón y
 * chapitas negras con el nombre— como el de la referencia. Todo se dibuja con
 * SVG y CSS: ni una sola imagen que descargar.
 */

import { AGUA, DEPARTAMENTOS } from "@/lib/mapa-uruguay";
import type { Personalidad } from "@/lib/motor/personalidades";

/** Cada nivel tiene su color: la progresión se ve de un vistazo. */
const COLOR_POR_NIVEL: Record<number, string> = {
  1: "#c9ba8c",
  2: "#c5a96b",
  3: "#c1904f",
  4: "#b1723d",
  5: "#975130",
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

  return (
    <svg
      viewBox="140 50 780 830"
      preserveAspectRatio="xMidYMid meet"
      // Anclado al contenedor: con h-full dependía de que el padre tuviera
      // altura explícita, y dentro de un flex crecía de más.
      className="absolute inset-0 h-full w-full"
      role="group"
      aria-label="Mapa del Uruguay: elegí un departamento para jugar"
    >
      <defs>
        <filter id="papel-viejo" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="4" seed="11" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.42  0 0 0 0 0.32  0 0 0 0 0.18  0 0 0 0.13 0"
          />
        </filter>
        {/* El realce del elegido: un halo, no una caja. El filtro con
            dropShadow recortaba un rectángulo visible sobre el papel. */}
      </defs>

      {/* El agua: el río Uruguay de un lado, el Río de la Plata abajo */}
      <g opacity="0.45">
        <path d={AGUA.rioUruguay} fill="#7f9ba0" />
        <path d={AGUA.rioDeLaPlata} fill="#7f9ba0" />
      </g>

      {DEPARTAMENTOS.map((depto) => {
        const rival = rivalDe(depto.nombre);
        const esElegido = elegido === depto.nombre;
        const ganado = ganados.has(depto.nombre);

        return (
          <g key={depto.nombre}>
            <path
              d={depto.forma}
              fill={COLOR_POR_NIVEL[rival?.dificultad ?? 1]}
              stroke={esElegido ? "#2a1808" : "#7a5c33"}
              strokeWidth={esElegido ? 7 : 2.5}
              strokeLinejoin="round"
              fillOpacity={esElegido ? 1 : 0.92}
              className="cursor-pointer"
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
            <path
              d={depto.forma}
              filter="url(#papel-viejo)"
              className="pointer-events-none"
            />
          </g>
        );
      })}

      {DEPARTAMENTOS.map((depto) => {
        const rival = rivalDe(depto.nombre);
        const ganado = ganados.has(depto.nombre);
        const [x, y] = depto.centro;
        // En el sur los departamentos son chicos y las chapitas se pisaban:
        // ahí van más compactas.
        const apretado = ["Montevideo", "Canelones", "San José", "Maldonado", "Flores"].includes(
          depto.nombre,
        );
        const escala = apretado ? 0.76 : 1;
        const ancho = Math.max(depto.nombre.length * 14 + 24, 88);

        return (
          <g
            key={`et-${depto.nombre}`}
            className="pointer-events-none"
            transform={`translate(${x}, ${y}) scale(${escala})`}
          >
            <rect x={-ancho / 2} y={-16} width={ancho} height={32} rx={3} fill="#181008" opacity={0.88} />
            <text
              x={0}
              y={5}
              textAnchor="middle"
              fill="#f2e6d0"
              fontSize={19}
              fontFamily="var(--font-ui), sans-serif"
            >
              {depto.nombre.toUpperCase()}
            </text>
            <g transform="translate(0, 30)">
              <rect x={-24} y={-13} width={48} height={25} rx={3} fill="#181008" opacity={0.82} />
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
