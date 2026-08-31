/**
 * Una carta española dibujada en SVG, por código.
 *
 * Es baraja propia: no usamos escaneos ni arte de barajas comerciales, que
 * tienen derechos y este repositorio es público. Al ser vectorial se ve nítida
 * a cualquier tamaño, desde los 44px de una miniatura hasta pantalla completa.
 *
 * QUÉ LA HACE LEERSE COMO UNA BARAJA ESPAÑOLA Y NO COMO UNOS ICONOS
 * La versión anterior ponía todos los palos en grilla, todos del mismo color
 * plano, y las figuras como siluetas de un solo tono. Se leía como una
 * infografía. Lo que cambia acá es lo que hace la baraja de verdad:
 *
 *   · ESPADAS Y BASTOS VAN CRUZADAS. Es la firma de la baraja española: el 2
 *     son dos cruzadas, el 4 son dos pares, el 5 son dos pares y una derecha en
 *     el medio. Oros y copas sí van en grilla. Mezclar las dos familias es
 *     justamente lo que hacía que no se distinguieran los palos.
 *   · CADA PALO EN TRES TONOS —contorno, relleno y luz—, no uno plano.
 *   · LAS FIGURAS SON GENTE: la sota parada, el caballo montado y el rey
 *     sentado, con piel, pelo y oro encima.
 *   · LA PINTA. El marco de la carta se corta un número de veces según el palo
 *     —oros 0, copas 1, espadas 2, bastos 3— que es como se reconoce el palo en
 *     un abanico sin abrirlo del todo. No es adorno: es la baraja de verdad.
 */

import type { Carta as CartaType, Palo } from "@/lib/motor/baraja";

/** Los tres tonos de cada palo. Salen de los tokens de globals.css. */
interface Tinta {
  base: string;
  hondo: string;
  luz: string;
}

const TINTA: Record<Palo, Tinta> = {
  espada: {
    base: "var(--color-espada)",
    hondo: "var(--color-espada-hondo)",
    luz: "var(--color-espada-luz)",
  },
  basto: {
    base: "var(--color-basto)",
    hondo: "var(--color-basto-hondo)",
    luz: "var(--color-basto-luz)",
  },
  oro: {
    base: "var(--color-oro)",
    hondo: "var(--color-oro-hondo)",
    luz: "var(--color-oro-luz)",
  },
  copa: {
    base: "var(--color-copa)",
    hondo: "var(--color-copa-hondo)",
    luz: "var(--color-copa-luz)",
  },
};

const PIEL = "var(--color-piel)";
const PIEL_SOMBRA = "var(--color-piel-sombra)";
const PELO = "var(--color-pelo)";
const REALCE = "var(--color-realce)";
const REALCE_HONDO = "var(--color-realce-hondo)";
const TELA = "var(--color-tela)";
const CABALLO = "var(--color-caballo)";
const PAPEL = "var(--color-carta)";

/** Espadas y bastos se dibujan largas y se cruzan; oros y copas van en grilla. */
const esCruzado = (palo: Palo) => palo === "espada" || palo === "basto";

/* ─── Los cuatro palos ──────────────────────────────────────────────────────
   Oros y copas viven en una caja de 24x24 con centro en (12,12).
   Espadas y bastos, que son largas, en una de 16x52 con centro en (8,26). */

function PipOro({ t }: { t: Tinta }) {
  return (
    <g>
      <circle cx="12" cy="12" r="11.2" fill={t.luz} stroke={t.hondo} strokeWidth="1" />
      <circle
        cx="12"
        cy="12"
        r="11.2"
        fill="none"
        stroke={t.hondo}
        strokeWidth="1.5"
        strokeDasharray="1.4 1.7"
        opacity="0.8"
      />
      <circle cx="12" cy="12" r="8.4" fill={t.base} stroke={t.hondo} strokeWidth="0.9" />
      <circle cx="12" cy="12" r="5.4" fill={t.luz} stroke={t.hondo} strokeWidth="0.7" />
      {/* la roseta del centro, que es lo que la hace moneda y no círculo */}
      <path
        d="M12 6.9 L13.4 10.6 L17.1 12 L13.4 13.4 L12 17.1 L10.6 13.4 L6.9 12 L10.6 10.6 Z"
        fill={t.hondo}
      />
      {/* el brillo del metal, arriba a la izquierda: una sola fuente de luz */}
      <path
        d="M5.2 8.6 A 8.6 8.6 0 0 1 12.4 3.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </g>
  );
}

function PipCopa({ t }: { t: Tinta }) {
  return (
    <g strokeLinejoin="round">
      {/* la copa */}
      <path
        d="M4.2 2.6 H19.8 C19.8 5 18.8 6.1 17.2 6.5 C16.7 11 14.6 13.6 12 13.6 C9.4 13.6 7.3 11 6.8 6.5 C5.2 6.1 4.2 5 4.2 2.6 Z"
        fill={t.base}
        stroke={t.hondo}
        strokeWidth="1"
      />
      {/* el labio, que es por donde le pega la luz */}
      <path
        d="M4.2 2.6 H19.8 C19.8 4.4 16.4 5.4 12 5.4 C7.6 5.4 4.2 4.4 4.2 2.6 Z"
        fill={t.luz}
        stroke={t.hondo}
        strokeWidth="0.9"
      />
      {/* el vástago y su nudo */}
      <path d="M10.6 13.4 H13.4 L14 17.8 H10 Z" fill={t.base} stroke={t.hondo} strokeWidth="0.9" />
      <ellipse cx="12" cy="15.6" rx="2.9" ry="1.5" fill={t.luz} stroke={t.hondo} strokeWidth="0.8" />
      {/* el pie */}
      <path
        d="M5.8 21.6 C7 18.9 9.2 17.8 12 17.8 C14.8 17.8 17 18.9 18.2 21.6 Z"
        fill={t.base}
        stroke={t.hondo}
        strokeWidth="1"
      />
      <path d="M5.2 21.6 H18.8" stroke={t.hondo} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

function PipEspada({ t }: { t: Tinta }) {
  return (
    <g strokeLinejoin="round">
      {/* la hoja */}
      <path
        d="M8 1 L10.8 8.2 L10.8 30 L5.2 30 L5.2 8.2 Z"
        fill={t.base}
        stroke={t.hondo}
        strokeWidth="1"
      />
      {/* el filo, más claro: da el metal */}
      <path d="M8 3.4 L9.5 8.6 L9.5 29 L8 29 Z" fill={t.luz} opacity="0.95" />
      {/* la guarda */}
      <path
        d="M1.4 30 H14.6 C14.6 32.9 12 33.8 8 33.8 C4 33.8 1.4 32.9 1.4 30 Z"
        fill={t.base}
        stroke={t.hondo}
        strokeWidth="1"
      />
      {/* la empuñadura, con sus vueltas de cuero */}
      <path d="M6.1 33.6 H9.9 V44.2 H6.1 Z" fill={t.hondo} />
      <path
        d="M6.1 35.8 H9.9 M6.1 38.4 H9.9 M6.1 41 H9.9"
        stroke={t.luz}
        strokeWidth="0.8"
        opacity="0.55"
      />
      {/* el pomo */}
      <circle cx="8" cy="46.8" r="3.1" fill={t.base} stroke={t.hondo} strokeWidth="1" />
      <circle cx="7.1" cy="45.8" r="1.1" fill={t.luz} />
    </g>
  );
}

function PipBasto({ t }: { t: Tinta }) {
  return (
    <g strokeLinejoin="round">
      {/* el tronco, más grueso abajo, como una rama cortada */}
      <path
        d="M6.7 2.6 C6 12 5.2 24 4.9 33 C4.6 41 4.8 46.6 5.3 49.4 L11.1 49.4 C11.4 46.6 11.5 41 11.3 33 C11 24 10.4 12 9.8 2.6 Z"
        fill={t.base}
        stroke={t.hondo}
        strokeWidth="1"
      />
      {/* la luz corriendo por un costado */}
      <path
        d="M9.2 4.4 C9.7 13.4 10.2 24 10.4 33 C10.5 40.6 10.4 45.6 10.2 48.2 L8.6 48.2 C8.8 45.6 8.9 40.6 8.8 33 C8.7 24 8.4 13.4 8 4.4 Z"
        fill={t.luz}
        opacity="0.8"
      />
      {/* los nudos: las ramitas cortadas, que es lo que lo hace basto y no palo */}
      <path d="M10.5 12.6 L15.3 9.9 L14.8 15.4 Z" fill={t.base} stroke={t.hondo} strokeWidth="0.9" />
      <path d="M5.2 22.4 L0.6 19.7 L1.3 25.2 Z" fill={t.base} stroke={t.hondo} strokeWidth="0.9" />
      <path d="M10.9 32.6 L15.5 30.4 L15 35.6 Z" fill={t.base} stroke={t.hondo} strokeWidth="0.9" />
      <path d="M5 41.4 L0.9 39.6 L1.5 44.2 Z" fill={t.base} stroke={t.hondo} strokeWidth="0.9" />
      {/* la punta de arriba, redondeada */}
      <ellipse cx="8.2" cy="2.8" rx="1.7" ry="1.1" fill={t.luz} stroke={t.hondo} strokeWidth="0.8" />
    </g>
  );
}

function Pip({ palo, t }: { palo: Palo; t: Tinta }) {
  switch (palo) {
    case "oro":
      return <PipOro t={t} />;
    case "copa":
      return <PipCopa t={t} />;
    case "espada":
      return <PipEspada t={t} />;
    case "basto":
      return <PipBasto t={t} />;
  }
}

/* ─── Dónde va cada palo según el número ─────────────────────────────────── */

/** Oros y copas: en grilla. El 7 va 2-3-2, como en la baraja impresa. */
const GRILLA: Record<number, { pos: readonly (readonly [number, number])[]; escala: number }> = {
  1: { pos: [[50, 78]], escala: 2.15 },
  2: { pos: [[50, 54], [50, 102]], escala: 1.34 },
  3: { pos: [[50, 48], [50, 78], [50, 108]], escala: 1.22 },
  4: { pos: [[34, 55], [66, 55], [34, 101], [66, 101]], escala: 1.28 },
  5: { pos: [[33, 47], [67, 47], [50, 78], [33, 109], [67, 109]], escala: 1.05 },
  6: { pos: [[34, 49], [66, 49], [34, 78], [66, 78], [34, 107], [66, 107]], escala: 1.1 },
  7: {
    pos: [[34, 48], [66, 48], [29, 78], [50, 78], [71, 78], [34, 108], [66, 108]],
    escala: 0.94,
  },
};

/**
 * Espadas y bastos: cruzadas.
 *
 * `pares` son las alturas donde va un par en X, y `recta` agrega una derecha por
 * el medio. Es la estructura de la baraja de verdad: el 3 son dos cruzadas más
 * una derecha, el 5 son dos pares más una derecha, el 7 son tres pares más una.
 */
const CRUCES: Record<
  number,
  { pares: readonly number[]; recta: number | null; escala: number }
> = {
  1: { pares: [], recta: 1.6, escala: 1.6 },
  2: { pares: [78], recta: null, escala: 1.2 },
  3: { pares: [78], recta: 1.24, escala: 1.06 },
  4: { pares: [55, 101], recta: null, escala: 0.82 },
  5: { pares: [53, 103], recta: 0.98, escala: 0.78 },
  6: { pares: [46, 78, 110], recta: null, escala: 0.68 },
  7: { pares: [46, 78, 110], recta: 0.86, escala: 0.66 },
};

/**
 * Cuánto se abren las cruzadas. Con pares apilados hay que abrirlas más, o las
 * espadas se superponen en una sola columna y no se cuentan de un vistazo.
 */
const anguloDeCruce = (pares: number) => (pares > 1 ? 38 : 27);

/* ─── Las figuras: sota, caballo y rey ──────────────────────────────────────
   Se dibujan en una caja de 44x74 que después se planta en la carta. Tienen que
   leerse a 44px de ancho, que es el tamaño de las cartas jugadas en la mesa:
   por eso son formas grandes y pocas, con el contorno del palo entintándolas. */

function Sota({ t }: { t: Tinta }) {
  return (
    <g strokeLinejoin="round" strokeWidth="1" stroke={t.hondo}>
      {/* las piernas */}
      <path d="M13.5 50 L12.5 68 L19 68 L21.5 55 L24 68 L30.5 68 L29.5 50 Z" fill={t.luz} />
      {/* los zapatos */}
      <path d="M10.5 67.5 H19.5 L20 72 H10.5 Z" fill={t.hondo} />
      <path d="M23.5 67.5 H32.5 L33 72 H23.5 Z" fill={t.hondo} />
      {/* el jubón */}
      <path d="M9 32 C9 26 14 22.5 21.5 22.5 C29 22.5 34 26 34 32 L35.5 51 L7.5 51 Z" fill={t.base} />
      {/* el panel claro del pecho */}
      <path d="M17 23.5 H26 L28 51 H15 Z" fill={TELA} strokeWidth="0.8" />
      {/* los brazos */}
      <path d="M9.2 33 L4 46 L8.6 48 L13 34.5 Z" fill={t.base} />
      <path d="M33.8 33 L39 46 L34.4 48 L31 34.5 Z" fill={t.base} />
      <circle cx="6" cy="48.6" r="2.7" fill={PIEL} strokeWidth="0.8" />
      <circle cx="37" cy="48.6" r="2.7" fill={PIEL} strokeWidth="0.8" />
      {/* el cinto */}
      <path d="M7.8 44.5 H35.2 L35.6 49.5 H7.5 Z" fill={REALCE} strokeWidth="0.9" />
      <path d="M18.5 44.5 H25 V49.5 H18.5 Z" fill={REALCE_HONDO} strokeWidth="0.7" />
      {/* el cuello */}
      <path d="M15.5 23 L21.5 29.5 L27.5 23 Z" fill={TELA} strokeWidth="0.8" />
      {/* la cabeza */}
      <ellipse cx="21.5" cy="14.5" rx="7.6" ry="8.6" fill={PIEL} />
      <path d="M21.5 6 C25.5 6 29 9 29.1 14 C27 11.5 24.5 10.5 21.5 10.5 Z" fill={PIEL_SOMBRA} strokeWidth="0" />
      {/* el pelo, largo como el de la sota de la baraja */}
      <path d="M13.9 14 C13.9 7.5 17 4.5 21.5 4.5 C26 4.5 29.1 7.5 29.1 14 C29.1 11 26.5 9.5 21.5 9.5 C16.5 9.5 13.9 11 13.9 14 Z" fill={PELO} strokeWidth="0.8" />
      <path d="M14 13 C12.8 17.5 13.2 21 14.2 23 L16.6 21 C15.6 19 15.3 16.4 15.6 13.6 Z" fill={PELO} strokeWidth="0.8" />
      <path d="M29 13 C30.2 17.5 29.8 21 28.8 23 L26.4 21 C27.4 19 27.7 16.4 27.4 13.6 Z" fill={PELO} strokeWidth="0.8" />
      {/* la cara */}
      <ellipse cx="18.4" cy="14.6" rx="1.2" ry="1.4" fill={t.hondo} strokeWidth="0" />
      <ellipse cx="24.6" cy="14.6" rx="1.2" ry="1.4" fill={t.hondo} strokeWidth="0" />
      <path d="M19.3 19 Q21.5 20.6 23.7 19" fill="none" strokeWidth="1" strokeLinecap="round" />
      {/* el gorro con su pluma */}
      <path d="M12.8 8.5 C13.6 3 17 0.5 21.5 0.5 C26 0.5 29.4 3 30.2 8.5 C26.5 6 24 5 21.5 5 C19 5 16.5 6 12.8 8.5 Z" fill={t.base} />
      <path d="M30 6.5 C33.5 4 36.5 4.5 38 6.5 C35.5 6.5 33 7.5 31 9.5 Z" fill={REALCE} strokeWidth="0.8" />
    </g>
  );
}

function Caballo({ t }: { t: Tinta }) {
  return (
    <g strokeLinejoin="round" strokeWidth="1" stroke={t.hondo}>
      {/* la cola */}
      <path d="M8 42 C3 43 1 48 2 55 C4 50 6 47.5 9.5 46.5 Z" fill={PELO} />
      {/* el cuerpo del caballo */}
      <path d="M8.5 41 C8.5 36 14 33.5 21 33.5 C28 33.5 33 35.5 34.5 39 L36 45 C34 49 28 50.5 21 50.5 C13 50.5 9 47.5 8.5 41 Z" fill={CABALLO} />
      {/* las patas */}
      <path d="M11 48 L9.5 66 L13.5 66 L14.5 48 Z" fill={CABALLO} />
      <path d="M17.5 49.5 L16.5 66 L20.5 66 L21 49.5 Z" fill={CABALLO} />
      <path d="M27 49.5 L27 66 L31 66 L30.5 49 Z" fill={CABALLO} />
      <path d="M32.5 47 L34 65 L38 65 L36 46 Z" fill={CABALLO} />
      {/* los cascos */}
      <path d="M8.8 65 H14.2 L14.6 69 H8.6 Z" fill={t.hondo} />
      <path d="M15.8 65 H21.2 L21.6 69 H15.6 Z" fill={t.hondo} />
      <path d="M26.4 65 H31.6 L32 69 H26.2 Z" fill={t.hondo} />
      <path d="M33.4 64 H38.6 L39.2 68 H33.6 Z" fill={t.hondo} />
      {/* el pescuezo y la cabeza, mirando adelante */}
      <path d="M31 40 C32 34 34.5 29 38 26 L43 29.5 C40.5 33 38.5 37.5 37.5 42 Z" fill={CABALLO} />
      <path d="M36.5 27.5 C38.5 24 41 22.5 43.5 23.5 L43.8 30 C41.5 30 39.5 30.8 38.2 32 Z" fill={CABALLO} />
      {/* la crin */}
      <path d="M30.5 39 C31.5 33 34 28 37.5 25 L39.5 26.5 C36.5 29.5 34 34 33 39.5 Z" fill={PELO} strokeWidth="0.8" />
      {/* el ojo y la brida */}
      <circle cx="40.5" cy="26.8" r="1.1" fill={t.hondo} strokeWidth="0" />
      <path d="M37.4 27.5 L41.5 30" strokeWidth="1" strokeLinecap="round" />
      {/* el jinete: torso */}
      <path d="M14.5 22 C14.5 17.5 17.5 15 21.5 15 C25.5 15 28.5 17.5 28.5 22 L30.5 37 C27 38.5 16 38.5 12.5 37 Z" fill={t.base} />
      <path d="M18 16 H25 L26.5 37 H16.5 Z" fill={TELA} strokeWidth="0.8" />
      {/* el brazo que lleva la rienda */}
      <path d="M27.5 22.5 L36 28 L34 31 L26 26.5 Z" fill={t.base} />
      <circle cx="36" cy="29" r="2.5" fill={PIEL} strokeWidth="0.8" />
      {/* la cabeza del jinete */}
      <ellipse cx="21.5" cy="9.5" rx="6.4" ry="7.2" fill={PIEL} />
      <path d="M15.4 8.5 C15.4 3.5 18 1 21.5 1 C25 1 27.6 3.5 27.6 8.5 C25.5 6.5 23.5 5.8 21.5 5.8 C19.5 5.8 17.5 6.5 15.4 8.5 Z" fill={PELO} strokeWidth="0.8" />
      <ellipse cx="19" cy="9.6" rx="1.1" ry="1.3" fill={t.hondo} strokeWidth="0" />
      <ellipse cx="24" cy="9.6" rx="1.1" ry="1.3" fill={t.hondo} strokeWidth="0" />
      <path d="M19.6 13.4 Q21.5 14.8 23.4 13.4" fill="none" strokeWidth="0.9" strokeLinecap="round" />
      {/* el sombrero */}
      <path d="M13 5 C13 1 16.5 -1.5 21.5 -1.5 C26.5 -1.5 30 1 30 5 Z" fill={t.base} />
      <path d="M11 4.5 H32 V6.5 H11 Z" fill={t.base} />
    </g>
  );
}

function Rey({ t }: { t: Tinta }) {
  return (
    <g strokeLinejoin="round" strokeWidth="1" stroke={t.hondo}>
      {/* el manto */}
      <path d="M7 40 C7 32 13 27.5 21.5 27.5 C30 27.5 36 32 36 40 L38.5 70 H4.5 Z" fill={t.base} />
      {/* la abertura del manto, con su forro claro */}
      <path d="M17.5 29 L21.5 36 L25.5 29 L28.5 70 H14.5 Z" fill={TELA} strokeWidth="0.8" />
      {/* el armiño del cuello */}
      <path d="M12.5 30.5 C15.5 27.5 18 26.5 21.5 26.5 C25 26.5 27.5 27.5 30.5 30.5 L27 34 C25 32 23.5 31.4 21.5 31.4 C19.5 31.4 18 32 16 34 Z" fill={TELA} strokeWidth="0.8" />
      {/* las mangas */}
      <path d="M7.4 41 L2.5 55 L8 57 L11.5 43 Z" fill={t.base} />
      <path d="M35.6 41 L40.5 55 L35 57 L31.5 43 Z" fill={t.base} />
      <circle cx="5.3" cy="57.5" r="2.8" fill={PIEL} strokeWidth="0.8" />
      {/* el cetro */}
      <path d="M37 33 L36 58" strokeWidth="2.4" stroke={REALCE_HONDO} strokeLinecap="round" />
      <circle cx="37.2" cy="30.5" r="3.4" fill={REALCE} strokeWidth="0.9" />
      <circle cx="36.3" cy="29.6" r="1.2" fill={REALCE_HONDO} strokeWidth="0" />
      <circle cx="37.8" cy="57.5" r="2.8" fill={PIEL} strokeWidth="0.8" />
      {/* el cinto */}
      <path d="M8.6 52 H34.4 L34.8 57 H8.2 Z" fill={REALCE} strokeWidth="0.9" />
      <path d="M18.5 52 H25 V57 H18.5 Z" fill={REALCE_HONDO} strokeWidth="0.7" />
      {/* la barba, que es lo que lo hace rey de un vistazo */}
      <path d="M14 17 C14 26 17 31 21.5 31 C26 31 29 26 29 17 Z" fill={TELA} strokeWidth="0.9" />
      {/* la cabeza */}
      <ellipse cx="21.5" cy="15" rx="7.6" ry="8.4" fill={PIEL} />
      <path d="M14.2 18 C15.5 24 18 28 21.5 28 C25 28 27.5 24 28.8 18 C26 20 24 20.8 21.5 20.8 C19 20.8 17 20 14.2 18 Z" fill={TELA} strokeWidth="0.9" />
      <ellipse cx="18.4" cy="14.4" rx="1.2" ry="1.4" fill={t.hondo} strokeWidth="0" />
      <ellipse cx="24.6" cy="14.4" rx="1.2" ry="1.4" fill={t.hondo} strokeWidth="0" />
      <path d="M15.6 10.6 L19.2 11.6 M27.4 10.6 L23.8 11.6" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      {/* la corona */}
      <path d="M12.6 8.5 L12.6 0.5 L16.5 4.5 L21.5 -1 L26.5 4.5 L30.4 0.5 L30.4 8.5 Z" fill={REALCE} />
      <path d="M12.6 8.5 H30.4 V11 H12.6 Z" fill={REALCE_HONDO} strokeWidth="0.9" />
      <circle cx="16.5" cy="4.6" r="1.2" fill={t.base} strokeWidth="0.6" />
      <circle cx="21.5" cy="0.4" r="1.3" fill={t.base} strokeWidth="0.6" />
      <circle cx="26.5" cy="4.6" r="1.2" fill={t.base} strokeWidth="0.6" />
    </g>
  );
}

function Figura({ numero, t }: { numero: 10 | 11 | 12; t: Tinta }) {
  if (numero === 10) return <Sota t={t} />;
  if (numero === 11) return <Caballo t={t} />;
  return <Rey t={t} />;
}

/* ─── La pinta: los cortes del marco ─────────────────────────────────────────
   En la baraja española el marco se corta un número distinto de veces según el
   palo, y así se reconoce el palo asomando apenas la carta en el abanico. Los
   cortes se pintan del color del papel encima del marco ya dibujado: es una
   línea de código en vez de cuatro marcos distintos. */
const CORTES: Record<Palo, readonly number[]> = {
  oro: [],
  copa: [50],
  espada: [38, 62],
  basto: [30, 50, 70],
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

  const t = TINTA[carta.palo];
  const esFigura = carta.numero >= 10;
  const cruzado = esCruzado(carta.palo);
  const grilla = GRILLA[carta.numero];
  const cruces = CRUCES[carta.numero];

  return (
    <svg
      viewBox="0 0 100 150"
      style={estilo}
      className={`rounded-lg shadow-lg shadow-black/50 ${pieza ? "halo-pieza" : ""} ${className}`}
      role="img"
      aria-label={`${carta.numero} de ${carta.palo}${pieza ? ", es pieza" : ""}`}
    >
      {/* el papel */}
      <rect x="1" y="1" width="98" height="148" rx="7" fill={PAPEL} />
      {/* el filo exterior */}
      <rect
        x="1"
        y="1"
        width="98"
        height="148"
        rx="7"
        fill="none"
        stroke={t.hondo}
        strokeWidth="2"
      />
      {/* el marco interior, que es el que lleva la pinta */}
      <rect
        x="6.5"
        y="6.5"
        width="87"
        height="137"
        rx="4"
        fill="none"
        stroke={t.base}
        strokeWidth="1.6"
      />
      {/* los cortes del marco, del color del papel */}
      {CORTES[carta.palo].map((x) => (
        <g key={x}>
          <rect x={x - 4} y="4.6" width="8" height="3.8" fill={PAPEL} />
          <rect x={x - 4} y="141.6" width="8" height="3.8" fill={PAPEL} />
        </g>
      ))}

      {/* El número en las dos esquinas, como en la baraja de verdad */}
      <text
        x="12"
        y="28"
        fontFamily="var(--font-ui)"
        fontSize="21"
        fontWeight="700"
        fill={t.hondo}
      >
        {carta.numero}
      </text>
      <text
        x="88"
        y="122"
        fontFamily="var(--font-ui)"
        fontSize="21"
        fontWeight="700"
        fill={t.hondo}
        transform="rotate(180 88 122)"
      >
        {carta.numero}
      </text>

      {esFigura ? (
        <>
          <g transform="translate(15, 29) scale(1.16)">
            <Figura numero={carta.numero as 10 | 11 | 12} t={t} />
          </g>
          {/* el palo, al costado de la figura, para que se lea qué es */}
          <g
            transform={
              cruzado
                ? "translate(80, 76) scale(0.58) translate(-8, -26)"
                : "translate(80, 76) scale(0.8) translate(-12, -12)"
            }
          >
            <Pip palo={carta.palo} t={t} />
          </g>
        </>
      ) : cruzado ? (
        <>
          {cruces.pares.map((y) =>
            [-anguloDeCruce(cruces.pares.length), anguloDeCruce(cruces.pares.length)].map((giro) => (
              <g
                key={`${y}-${giro}`}
                transform={`translate(50, ${y}) rotate(${giro}) scale(${cruces.escala}) translate(-8, -26)`}
              >
                <Pip palo={carta.palo} t={t} />
              </g>
            )),
          )}
          {cruces.recta !== null && (
            <g transform={`translate(50, 78) scale(${cruces.recta}) translate(-8, -26)`}>
              <Pip palo={carta.palo} t={t} />
            </g>
          )}
        </>
      ) : (
        grilla.pos.map(([x, y]) => (
          <g
            key={`${x}-${y}`}
            transform={`translate(${x}, ${y}) scale(${grilla.escala}) translate(-12, -12)`}
          >
            <Pip palo={carta.palo} t={t} />
          </g>
        ))
      )}
    </svg>
  );
}
