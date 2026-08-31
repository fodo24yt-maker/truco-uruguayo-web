/**
 * Tu mano sosteniendo las cartas.
 *
 * ── Por qué esto era lo primero que había que hacer ───────────────────────
 *
 * En las CUATRO referencias hay una mano cortada por el borde de abajo. No es
 * un adorno: es lo que te SIENTA EN LA SILLA. Sin ella las cartas flotan sobre
 * una foto de una mesa; con ella la mesa pasa a ser la tuya. Es el único
 * elemento que, solo, cambia de qué se trata la pantalla.
 *
 * ── Van DOS piezas y no una ───────────────────────────────────────────────
 *
 * Porque las cartas van ENTRE los dedos, no delante ni detrás:
 *
 *      <DedosAtras/>      ← el dorso de la mano, DEBAJO del abanico
 *      …el abanico…
 *      <PulgarAdelante/>  ← el pulgar cruzando, ENCIMA del abanico
 *
 * Si fuera una sola pieza habría que elegir: o la mano tapa las cartas o las
 * cartas tapan la mano, y las dos se ven mal.
 *
 * ── Está EN PENUMBRA, y es a propósito ────────────────────────────────────
 *
 * El primer intento la pintó con la piel a pleno color y quedó un bulto crema
 * más brillante que las propias cartas, comiéndose el tercio de abajo. Tu mano
 * está DELANTE de la mesa, o sea fuera del charco de luz de la lámpara: le
 * llega un filo por arriba y nada más. Apagada se lee como una mano; encendida
 * se lee como una mancha, y encima le gana en brillo a lo único que hay que
 * mirar, que son las cartas.
 *
 * ── Lo que NO puede tapar ─────────────────────────────────────────────────
 *
 * El pulgar va sobre el TERCIO DE ABAJO de la carta del medio, que es donde el
 * abanico ya se superpone consigo mismo y no hay nada que leer. El número de la
 * esquina de arriba y los cortes del marco —la pinta— quedan siempre libres:
 * así es como se lee una carta, y taparlos sería cambiar el juego por un dibujo.
 *
 * Y no se mueve. Una mano animada le pelea la atención a las cartas.
 */

/* Los tonos salen de la piel de la gente de la baraja, bajados un par de
   puntos: es la misma mano, pero fuera de la luz. */
const CLARO = "#d8ac80";
const MEDIO = "#b98a60";
const HONDO = "#7d5837";

function Tonos({ id, luz }: { id: string; luz: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-piel`} x1="0.3" y1="0" x2="0.55" y2="1">
        <stop offset="0%" stopColor={CLARO} />
        <stop offset="30%" stopColor={MEDIO} />
        <stop offset="100%" stopColor={HONDO} />
      </linearGradient>
      <linearGradient id={`${id}-filo`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={luz} stopOpacity="0.5" />
        <stop offset="100%" stopColor={luz} stopOpacity="0" />
      </linearGradient>
      <filter id={`${id}-blanda`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
    </defs>
  );
}

/**
 * El dorso de la mano, por detrás del abanico.
 *
 * Se le ven los nudillos y el canto del índice asomando a los costados de las
 * cartas; los dedos en sí quedan tapados, que es exactamente lo que pasa cuando
 * sostenés tres cartas.
 */
export function DedosAtras({ ancho, luz }: { ancho: string; luz: string }) {
  return (
    <svg
      viewBox="0 0 200 96"
      width={ancho}
      className="pointer-events-none block h-auto"
      aria-hidden="true"
    >
      <Tonos id="atras" luz={luz} />

      {/* el dorso: una masa redondeada que sale del borde de abajo */}
      <path
        d="M20 96 C16 70 22 44 38 32 C56 19 78 14 100 14 C124 14 146 20 162 34
           C178 46 184 70 180 96 Z"
        fill="url(#atras-piel)"
      />

      {/* los nudillos: cuatro lomas en el borde de arriba, con su sombrita */}
      {[
        [54, 26],
        [82, 19],
        [113, 20],
        [144, 29],
      ].map(([x, y]) => (
        <ellipse key={x} cx={x} cy={y} rx="16" ry="10" fill={CLARO} opacity="0.5" />
      ))}
      {[
        [68, 30],
        [98, 25],
        [129, 27],
      ].map(([x, y]) => (
        <ellipse key={x} cx={x} cy={y} rx="3.5" ry="9" fill={HONDO} opacity="0.4" />
      ))}

      {/* el canto del índice: es lo que da vuelta el bulto y no lo deja plano */}
      <path
        d="M20 96 C16 70 22 44 38 32 C44 27 51 23 59 20 C47 36 40 60 41 96 Z"
        fill={HONDO}
        opacity="0.34"
      />
      {/* el filo de luz de arriba: lo único que le llega de la lámpara */}
      <path
        d="M38 32 C56 19 78 14 100 14 C124 14 146 20 162 34"
        fill="none"
        stroke={luz}
        strokeOpacity="0.34"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* y la penumbra de abajo, donde ya no llega nada */}
      <path d="M16 96 H184 V72 C140 90 62 90 16 72 Z" fill="#1a0e06" opacity="0.34" />
    </svg>
  );
}

/**
 * El pulgar, cruzando por delante de las cartas.
 *
 * Lleva SU PROPIA SOMBRA dibujada adentro, antes del dedo: sin eso el pulgar se
 * ve pegado como una calcomanía. La sombra es lo que lo apoya sobre la carta.
 */
export function PulgarAdelante({ ancho, luz }: { ancho: string; luz: string }) {
  const dedo =
    "M44 120 C36 100 39 80 52 68 C64 56 81 46 99 38 C113 32 126 31 134 38 " +
    "C143 45 143 58 133 66 C121 77 105 88 93 99 C83 108 78 114 76 120 Z";
  return (
    <svg
      viewBox="0 0 200 120"
      width={ancho}
      className="pointer-events-none block h-auto"
      aria-hidden="true"
    >
      <Tonos id="pulgar" luz={luz} />

      {/* la sombra sobre la carta: corrida abajo y a la derecha, contraria a la luz */}
      <path d={dedo} transform="translate(8 10)" fill="rgba(0,0,0,0.45)" filter="url(#pulgar-blanda)" />

      <path d={dedo} fill="url(#pulgar-piel)" />

      {/* el pliegue del nudillo */}
      <path
        d="M58 82 C69 73 78 68 89 63"
        fill="none"
        stroke={HONDO}
        strokeOpacity="0.6"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* la uña */}
      <path
        d="M111 43 C121 38 131 39 135 45 C138 50 134 57 126 61 C118 65 111 62 109 56 C107 50 107 46 111 43 Z"
        fill={CLARO}
        opacity="0.85"
      />
      <path
        d="M111 43 C121 38 131 39 135 45"
        fill="none"
        stroke={luz}
        strokeOpacity="0.45"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* el filo de luz del canto de arriba */}
      <path
        d="M52 68 C64 56 81 46 99 38 C111 32 124 31 132 37"
        fill="none"
        stroke={luz}
        strokeOpacity="0.4"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* la penumbra del canto de abajo */}
      <path
        d="M44 120 C36 100 39 80 52 68 C56 64 60 60 65 56 C55 72 53 96 59 120 Z"
        fill="#1a0e06"
        opacity="0.3"
      />
    </svg>
  );
}
