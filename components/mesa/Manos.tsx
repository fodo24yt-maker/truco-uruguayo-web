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
   puntos: es la misma mano, pero fuera de la luz.

   `CLARO` es sólo el filo de los nudillos, no el color de la mano. Estuvo de
   entrada en el 30% del degradé y por eso la mano se veía cremosa: mientras las
   cartas la tapaban no se notaba, pero DURANTE EL REPARTO —con las cartas
   todavía en el aire— quedaba un bulto claro y brillante en el medio de la
   pantalla. Tu mano está delante de la mesa, o sea AFUERA del charco de luz de
   la lámpara: le llega un filo por arriba y nada más. */
const CLARO = "#d8ac80";
const MEDIO = "#b98a60";
const HONDO = "#7d5837";
/** El fondo del bulto, donde ya no llega nada de la lámpara. */
const NOCHE = "#553a20";

function Tonos({ id, luz }: { id: string; luz: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-piel`} x1="0.3" y1="0" x2="0.55" y2="1">
        <stop offset="0%" stopColor={MEDIO} />
        <stop offset="42%" stopColor={HONDO} />
        <stop offset="100%" stopColor={NOCHE} />
      </linearGradient>
      <linearGradient id={`${id}-filo`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={luz} stopOpacity="0.5" />
        <stop offset="100%" stopColor={luz} stopOpacity="0" />
      </linearGradient>
      {/* El hueco entre dedo y dedo: hondo arriba, donde se separan, y perdido
          abajo, donde ya es una sola masa. Una raya pareja se lee dibujada. */}
      <linearGradient id={`${id}-valle`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={HONDO} stopOpacity="0.7" />
        <stop offset="100%" stopColor={HONDO} stopOpacity="0" />
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
 * Se le ven los nudillos y el canto de los dedos asomando a los costados de las
 * cartas; lo de adentro queda tapado, que es lo que pasa cuando sostenés tres.
 *
 * ── Tiene que aguantar DESNUDA, y por eso se redibujó ─────────────────────
 *
 * La primera versión era una masa redonda con cuatro elipses encima. Detrás de
 * tres cartas funcionaba, porque de la mano se veían nada más que los bordes.
 * Pero hay dos momentos en que queda a la vista entera —MIENTRAS SE REPARTE,
 * con las cartas todavía en el aire, y cuando te queda UNA sola— y ahí se leía
 * un pan: un bulto liso, sin nada que dijera "dedos".
 *
 * Lo que lo arregla no es más sombreado, es la FORMA:
 *
 *   · el borde de arriba no es una curva sola sino CUATRO ARCOS, uno por
 *     nudillo. Eso solo ya lo dice, incluso chiquito y desenfocado;
 *   · TRES VALLES que caen de los huecos entre nudillo y nudillo. Es lo que
 *     separa un dedo del otro; sin ellos los arcos se leen decorativos;
 *   · los dos costados con su canto marcado —el del índice y el del meñique—,
 *     para que sea una mano de perfil y no un barril.
 *
 * El filo de luz de arriba y la penumbra de abajo se conservan tal cual: son
 * los que la mantienen EN PENUMBRA, que es lo que la deja atrás de las cartas
 * en vez de robarles el brillo.
 */
export function DedosAtras({ ancho, luz }: { ancho: string; luz: string }) {
  /* Dónde está cada nudillo y dónde el hueco entre dos. Salen como listas y no
     escritos adentro del `path` porque los valles y los brillos tienen que caer
     EXACTO en los mismos lugares: si se mueve un nudillo, se mueve todo junto. */
  const NUDILLOS = [
    [55, 22],
    [85, 20],
    [116, 26],
    [147, 48],
  ];
  const VALLES = [
    [70, 34],
    [100, 31],
    [131, 37],
  ];
  /* El borde de arriba, de izquierda a derecha: sube al primer nudillo, baja al
     hueco, sube al siguiente… Se usa dos veces —para recortar la silueta y para
     el filo de luz— así que va una vez sola. */
  const CRESTA =
    "C37 24 46 16 55 16 C63 16 67 24 70 33 " +
    "C73 21 78 14 85 14 C93 14 97 21 100 30 " +
    "C104 22 110 20 116 20 C124 20 128 27 131 36 " +
    "C136 36 141 40 147 42 C156 46 166 51 172 58";

  return (
    <svg
      viewBox="0 0 200 96"
      width={ancho}
      className="pointer-events-none block h-auto"
      aria-hidden="true"
    >
      <Tonos id="atras" luz={luz} />

      {/* la silueta: sale del borde de abajo y arriba va nudillo por nudillo */}
      <path d={`M20 96 C17 74 21 48 32 34 ${CRESTA} C180 68 184 80 182 96 Z`} fill="url(#atras-piel)" />

      {/* el bulto de cada nudillo */}
      {NUDILLOS.map(([x, y]) => (
        <ellipse key={x} cx={x} cy={y} rx="13" ry="9" fill={CLARO} opacity="0.26" />
      ))}

      {/* y el hueco entre dos: esto es lo que los separa en dedos */}
      {VALLES.map(([x, y]) => (
        <path
          key={x}
          d={`M${x} ${y} C${x + 1} ${y + 12} ${x + 1} ${y + 22} ${x} ${y + 32}`}
          fill="none"
          stroke="url(#atras-valle)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      ))}

      {/* el canto del índice, que es el que da vuelta el bulto y no lo deja plano */}
      <path
        d="M20 96 C17 74 21 48 32 34 C38 26 45 20 52 17 C42 38 37 62 39 96 Z"
        fill={HONDO}
        opacity="0.34"
      />
      {/* y el del meñique del otro lado, más marcado: ese costado ya está en
          sombra, y con una sola carta es una de las dos cosas que se ven */}
      <path
        d="M182 96 C184 80 180 68 172 58 C169 55 166 53 163 51 C173 67 176 80 175 96 Z"
        fill={HONDO}
        opacity="0.3"
      />
      {/* el filo de luz de arriba: lo único que le llega de la lámpara */}
      <path
        d={`M32 34 ${CRESTA}`}
        fill="none"
        stroke={luz}
        strokeOpacity="0.34"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
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
