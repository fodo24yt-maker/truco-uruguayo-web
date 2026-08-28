/**
 * Los adornos del mapa: el cartucho con el título, la rosa de los vientos con
 * el Sol de Mayo adentro, y el mate.
 *
 * Van en los dos huecos que el encuadre ya venía pagando —el noreste, que es
 * el más grande, y el Río de la Plata— así que no cuestan ni una unidad de
 * ancho, que es lo único escaso: el mapa es limitado por el ancho en todas las
 * pantallas reales.
 *
 * Sin props y sin estado: se declara una vez como elemento constante y React
 * no lo vuelve a mirar.
 */

import { HUECO_NORESTE, HUECO_SUROESTE } from "./lienzo";

const ROSA_X = HUECO_NORESTE.x + HUECO_NORESTE.ancho / 2;
const ROSA_Y = HUECO_NORESTE.y + 186;
const ROSA_R = 70;

/** Dos decimales, como en el resto del mapa. */
const r = (v: number) => Math.round(v * 100) / 100;

/**
 * Una punta de la rosa: dos triángulos que comparten la punta, uno claro y uno
 * oscuro. Es lo que le da el relieve de las rosas grabadas.
 */
function punta(grados: number, largo: number, ancho: number): [string, string] {
  const rad = (grados * Math.PI) / 180;
  const gira = (x: number, y: number): string =>
    `${r(x * Math.cos(rad) - y * Math.sin(rad))} ${r(x * Math.sin(rad) + y * Math.cos(rad))}`;

  const pico = gira(0, -largo);
  const izq = gira(-ancho, 0);
  const der = gira(ancho, 0);
  return [`M 0 0 L ${izq} L ${pico} Z`, `M 0 0 L ${pico} L ${der} Z`];
}

/** Las ocho puntas: cuatro largas (los rumbos) y cuatro cortas. */
const PUNTAS = [0, 45, 90, 135, 180, 225, 270, 315].map((g) =>
  g % 90 === 0 ? punta(g, ROSA_R, 10) : punta(g, ROSA_R * 0.6, 7),
);

/** Los rayos del Sol de Mayo: rectos y triangulares, alternados como el del pabellón. */
const RAYOS = Array.from({ length: 16 }, (_, i) => {
  const rad = (i * 22.5 * Math.PI) / 180;
  const [x0, y0] = [Math.cos(rad) * 9, Math.sin(rad) * 9];
  const largo = i % 2 === 0 ? 21 : 15;
  return `M ${r(x0)} ${r(y0)} L ${r(Math.cos(rad) * largo)} ${r(Math.sin(rad) * largo)}`;
}).join(" ");

export function Adornos() {
  return (
    <g className="pointer-events-none" fill="none">
      {/* ─── El cartucho con el título ──────────────────────────────────── */}
      <g transform={`translate(${ROSA_X}, ${HUECO_NORESTE.y + 46})`}>
        {/* La cinta: cuerpo con las puntas dobladas para adentro */}
        <path
          d="M -150 -26 L 150 -26 L 168 0 L 150 26 L -150 26 L -168 0 Z"
          fill="var(--color-pergamino-luz)"
          stroke="var(--color-tinta-mapa)"
          strokeWidth={2.4}
          opacity={0.95}
        />
        <path
          d="M -150 -26 L -150 26 M 150 -26 L 150 26"
          stroke="var(--color-tinta-mapa)"
          strokeWidth={1.4}
          opacity={0.5}
        />
        <text
          x={0}
          y={10}
          textAnchor="middle"
          fill="var(--color-tinta-mapa)"
          fontSize={30}
          letterSpacing={5}
          fontFamily="var(--font-display), Georgia, serif"
        >
          GIRA NACIONAL
        </text>
      </g>

      {/* ─── La rosa de los vientos ─────────────────────────────────────── */}
      <g transform={`translate(${ROSA_X}, ${ROSA_Y})`}>
        <circle r={ROSA_R + 12} stroke="var(--color-tinta-mapa)" strokeWidth={1.6} opacity={0.45} />
        <circle r={ROSA_R + 6} stroke="var(--color-tinta-mapa)" strokeWidth={1} opacity={0.3} />

        {PUNTAS.map(([oscura, clara], i) => (
          <g key={i}>
            <path d={oscura} fill="var(--color-tinta-mapa)" opacity={0.8} />
            <path
              d={clara}
              fill="var(--color-pergamino-luz)"
              stroke="var(--color-tinta-mapa)"
              strokeWidth={1.2}
            />
          </g>
        ))}

        {/* El Sol de Mayo en el centro, que es lo que hace que esta rosa sea de acá */}
        <circle r={14} fill="var(--color-pergamino-luz)" stroke="var(--color-tinta-mapa)" strokeWidth={1.6} />
        <path d={RAYOS} stroke="var(--color-quemado)" strokeWidth={2.2} opacity={0.9} />
        <circle r={9} fill="var(--color-quemado)" opacity={0.85} />

        <text
          x={0}
          y={-ROSA_R - 14}
          textAnchor="middle"
          fill="var(--color-tinta-mapa)"
          fontSize={26}
          fontFamily="var(--font-display), Georgia, serif"
        >
          N
        </text>
      </g>

      {/* ─── El mate, en el Río de la Plata ─────────────────────────────── */}
      <g transform={`translate(${HUECO_SUROESTE.x + 62}, ${HUECO_SUROESTE.y + 52})`}>
        {/* La bombilla, primero: el mate la tapa por delante */}
        <path
          d="M 8 -14 L 34 -58"
          stroke="var(--color-tinta-mapa)"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.85}
        />
        <ellipse
          cx={35}
          cy={-60}
          rx={7}
          ry={4}
          fill="var(--color-pergamino-luz)"
          stroke="var(--color-tinta-mapa)"
          strokeWidth={2}
          transform="rotate(-30 35 -60)"
        />

        {/* La calabaza */}
        <path
          d="M -25 -8 C -31 26, -17 46, 0 46 C 17 46, 31 26, 25 -8 Z"
          fill="var(--color-quemado)"
          stroke="var(--color-tinta-mapa)"
          strokeWidth={2.4}
          opacity={0.9}
        />
        {/* La boca y la yerba */}
        <ellipse cx={0} cy={-8} rx={25} ry={8} fill="var(--color-pergamino-luz)" stroke="var(--color-tinta-mapa)" strokeWidth={2.4} />
        <ellipse cx={0} cy={-7} rx={18} ry={5} fill="var(--color-tinta-mapa)" opacity={0.55} />
        {/* El pie */}
        <ellipse cx={0} cy={46} rx={13} ry={4} fill="var(--color-tinta-mapa)" opacity={0.5} />
      </g>
    </g>
  );
}
