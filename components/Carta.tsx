/**
 * Una carta española dibujada en SVG, por código.
 *
 * Es baraja propia: no usamos escaneos ni arte de barajas comerciales, que
 * tienen derechos y este repositorio es público. Al ser vectorial se ve nítida
 * a cualquier tamaño, desde los 44px de una miniatura hasta pantalla completa.
 */

import type { Carta as CartaType, Palo } from "@/lib/motor/baraja";

const COLOR_PALO: Record<Palo, string> = {
  espada: "var(--color-espada)",
  basto: "var(--color-basto)",
  oro: "var(--color-oro)",
  copa: "var(--color-copa)",
};

/** Los cuatro símbolos, dibujados en una caja de 24x24 centrada en (12,12). */
function SimboloPalo({ palo, color }: { palo: Palo; color: string }) {
  switch (palo) {
    case "espada":
      return (
        <g fill={color}>
          <path d="M12 1.5 L14.4 6.5 L14.4 15.5 L9.6 15.5 L9.6 6.5 Z" />
          <path d="M4.5 15.5 H19.5 V17.6 H4.5 Z" />
          <path d="M10.6 17.6 H13.4 V20.6 H10.6 Z" />
          <circle cx="12" cy="21.8" r="1.7" />
        </g>
      );
    case "basto":
      return (
        <g fill={color}>
          <path d="M10.2 22 C9.4 17 9.8 9 11 2.5 L13 2.5 C14.2 9 14.6 17 13.8 22 Z" />
          <path d="M13.2 6.2 L16.4 4.6 L16.8 7.4 Z" />
          <path d="M10.8 12 L7.6 10.6 L7.2 13.6 Z" />
          <path d="M13.4 16.4 L16.2 15.4 L16.4 17.8 Z" />
        </g>
      );
    case "oro":
      return (
        <g fill="none" stroke={color}>
          <circle cx="12" cy="12" r="10.6" strokeWidth="1.6" strokeDasharray="1.6 1.7" />
          <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4.4" strokeWidth="1.2" />
          <circle cx="12" cy="12" r="1.9" fill={color} stroke="none" />
        </g>
      );
    case "copa":
      return (
        <g fill={color}>
          <path d="M5.4 2.6 H18.6 C18.6 9.8 15.6 13.6 12 13.6 C8.4 13.6 5.4 9.8 5.4 2.6 Z" />
          <path d="M11 13.4 H13 V18 H11 Z" />
          <path d="M6.8 18 H17.2 C17.2 20.6 15 21.6 12 21.6 C9 21.6 6.8 20.6 6.8 18 Z" />
        </g>
      );
  }
}

/** Las tres figuras, como siluetas planas: se tienen que leer a 60px. */
function Figura({ numero, color }: { numero: 10 | 11 | 12; color: string }) {
  if (numero === 10) {
    return (
      <g fill={color}>
        <path d="M6 7.4 Q12 2.8 18 7.4 L18 8.8 L6 8.8 Z" />
        <circle cx="12" cy="11.6" r="3.1" />
        <path d="M6.8 22 C6.8 16.6 9.4 14.4 12 14.4 C14.6 14.4 17.2 16.6 17.2 22 Z" />
      </g>
    );
  }
  if (numero === 11) {
    return (
      <g fill={color}>
        <path d="M7 22 C7 17 9 14.4 12 12.4 C10.6 11.9 9 12.4 8 13.4 L6.4 10.8 C8 8.2 10.6 6.6 13 6.2 L12.4 3 L15.2 4.8 C18.2 6.4 19.8 9.6 19.8 13 C19.8 17.4 18.2 19.8 17.6 22 Z" />
      </g>
    );
  }
  return (
    <g fill={color}>
      <path d="M6 8.4 L6 3.6 L9 6.4 L12 2.8 L15 6.4 L18 3.6 L18 8.4 Z" />
      <circle cx="12" cy="12.2" r="3.1" />
      <path d="M6.6 22 C6.6 16.8 9.2 14.8 12 14.8 C14.8 14.8 17.4 16.8 17.4 22 Z" />
    </g>
  );
}

/** Dónde van los símbolos según el número, en el área central de la carta. */
const POSICIONES: Record<number, [number, number][]> = {
  1: [[50, 76]],
  2: [
    [50, 48],
    [50, 104],
  ],
  3: [
    [50, 42],
    [50, 76],
    [50, 110],
  ],
  4: [
    [33, 48],
    [67, 48],
    [33, 104],
    [67, 104],
  ],
  5: [
    [33, 46],
    [67, 46],
    [50, 76],
    [33, 106],
    [67, 106],
  ],
  6: [
    [33, 42],
    [67, 42],
    [33, 76],
    [67, 76],
    [33, 110],
    [67, 110],
  ],
  7: [
    [33, 42],
    [67, 42],
    [33, 76],
    [67, 76],
    [50, 93],
    [33, 110],
    [67, 110],
  ],
};

export interface PropsCarta {
  carta?: CartaType;
  /** Boca abajo: se dibuja el dorso. */
  oculta?: boolean;
  /** Es pieza en esta mano: se prende con el halo dorado de la muestra. */
  pieza?: boolean;
  /**
   * Ancho en píxeles. Si se omite, la carta ocupa el ancho que le dé el CSS
   * (por ejemplo `className="w-[76px] sm:w-[92px]"`) y mantiene sola la
   * proporción 2:3. Eso es lo que permite que la misma carta se achique en
   * celular sin JavaScript ni parpadeo al cargar.
   */
  ancho?: number;
  className?: string;
  /** Para pasarle el giro con el que aterriza, o cualquier ajuste puntual. */
  style?: React.CSSProperties;
}

export function Carta({
  carta,
  oculta = false,
  pieza = false,
  ancho,
  className = "",
  style,
}: PropsCarta) {
  const estilo: React.CSSProperties = {
    // Sin ancho explícito, manda el CSS y la proporción se mantiene sola
    // Sin ancho explícito NO se toca el width: si lo pusiéramos acá en línea,
    // pisaría a la clase de CSS (los estilos en línea siempre ganan) y las
    // medidas por breakpoint no servirían de nada.
    ...(ancho === undefined
      ? { aspectRatio: "2 / 3" }
      : { width: ancho, height: Math.round((ancho * 150) / 100) }),
    ...style,
  };

  if (oculta || !carta) {
    return (
      <svg
        viewBox="0 0 100 150"
        style={estilo}
        className={`rounded-lg shadow-lg shadow-black/50 ${className}`}
        aria-hidden="true"
      >
        <rect x="1" y="1" width="98" height="148" rx="7" fill="var(--color-bordo)" />
        <rect
          x="6"
          y="6"
          width="88"
          height="138"
          rx="4"
          fill="none"
          stroke="var(--color-dorado)"
          strokeWidth="1.2"
          opacity="0.7"
        />
        {[28, 55, 82, 109, 136].map((y) =>
          [22, 50, 78].map((x) => (
            <path
              key={`${x}-${y}`}
              d={`M${x} ${y - 7} L${x + 7} ${y} L${x} ${y + 7} L${x - 7} ${y} Z`}
              fill="none"
              stroke="var(--color-dorado)"
              strokeWidth="0.9"
              opacity="0.45"
            />
          )),
        )}
      </svg>
    );
  }

  const color = COLOR_PALO[carta.palo];
  const esFigura = carta.numero >= 10;
  const posiciones = POSICIONES[carta.numero] ?? [];
  const escalaPip = carta.numero === 1 ? 2.1 : 1.15;

  return (
    <svg
      viewBox="0 0 100 150"
      style={estilo}
      className={`rounded-lg shadow-lg shadow-black/50 ${pieza ? "halo-pieza" : ""} ${className}`}
      role="img"
      aria-label={`${carta.numero} de ${carta.palo}${pieza ? ", es pieza" : ""}`}
    >
      <rect x="1" y="1" width="98" height="148" rx="7" fill="var(--color-crema)" />
      <rect
        x="1"
        y="1"
        width="98"
        height="148"
        rx="7"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      <rect
        x="6.5"
        y="6.5"
        width="87"
        height="137"
        rx="4"
        fill="none"
        stroke={color}
        strokeWidth="0.8"
        opacity="0.4"
      />

      {/* El número en las dos esquinas, como en la baraja de verdad */}
      <text
        x="12"
        y="27"
        fontFamily="var(--font-ui)"
        fontSize="21"
        fontWeight="700"
        fill={color}
      >
        {carta.numero}
      </text>
      <text
        x="88"
        y="123"
        fontFamily="var(--font-ui)"
        fontSize="21"
        fontWeight="700"
        fill={color}
        transform="rotate(180 88 123)"
      >
        {carta.numero}
      </text>

      {esFigura ? (
        <>
          <g transform="translate(26, 44) scale(2)">
            <Figura numero={carta.numero as 10 | 11 | 12} color={color} />
          </g>
          <g transform="translate(66, 100) scale(0.85)">
            <SimboloPalo palo={carta.palo} color={color} />
          </g>
        </>
      ) : (
        posiciones.map(([x, y]) => (
          <g
            key={`${x}-${y}`}
            transform={`translate(${x - 12 * escalaPip}, ${y - 12 * escalaPip}) scale(${escalaPip})`}
          >
            <SimboloPalo palo={carta.palo} color={color} />
          </g>
        ))
      )}
    </svg>
  );
}
