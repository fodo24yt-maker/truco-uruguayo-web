/**
 * La cara del rival, armada con las piezas de su ficha (ver `lib/caras.ts`).
 *
 * Se dibuja para verse dentro de un círculo: la cabeza va centrada y los
 * hombros entran por abajo y se cortan solos contra el borde del medallón.
 *
 * ES EL ÚNICO LUGAR DONDE SE LE VE LA CARA. El de la mesa se le ve el cuerpo
 * —hombros, saco, brazos apoyados— pero no los rasgos, y va desenfocado: está
 * detrás de la lámpara. La misma ficha le da al de la mesa la forma del
 * sombrero y el color de la ropa, así que los dos no se pueden contradecir.
 */

import type { Cara as FichaCara } from "@/lib/caras";

/** Un tono más oscuro del mismo color, para las sombras. Sin librerías. */
function oscurecer(hex: string, cuanto = 0.72): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * cuanto);
  const g = Math.round(((n >> 8) & 255) * cuanto);
  const b = Math.round((n & 255) * cuanto);
  return `rgb(${r} ${g} ${b})`;
}

export function Cara({ ficha, nombre }: { ficha: FichaCara; nombre: string }) {
  const sombra = oscurecer(ficha.piel, 0.82);
  const sombraRopa = oscurecer(ficha.ropa, 0.7);
  const sombraSombrero = oscurecer(ficha.colorSombrero, 0.68);

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label={`Cara de ${nombre}`}>
      {/* los hombros, que entran por abajo */}
      <path d="M6 100 C10 84 26 76 50 76 C74 76 90 84 94 100 Z" fill={ficha.ropa} />
      <path d="M50 76 C62 76 72 78 79 81 L21 81 C28 78 38 76 50 76 Z" fill={sombraRopa} />
      {/* el cuello */}
      <path d="M40 66 H60 V80 C60 82 40 82 40 80 Z" fill={sombra} />

      {/* la melena, si la tiene: va DETRÁS de la cara */}
      {ficha.melena && (
        <path
          d="M20 44 C20 22 33 12 50 12 C67 12 80 22 80 44 L80 74 C76 68 74 58 74 48 L26 48 C26 58 24 68 20 74 Z"
          fill={ficha.pelo}
        />
      )}

      {/* las orejas */}
      <ellipse cx="24" cy="48" rx="5" ry="7" fill={ficha.piel} />
      <ellipse cx="76" cy="48" rx="5" ry="7" fill={ficha.piel} />

      {/* la cabeza */}
      <ellipse cx="50" cy="45" rx="25" ry="29" fill={ficha.piel} />
      {/* la luz cae de arriba: la mitad de abajo se apaga */}
      <path d="M25 45 C25 61 36 74 50 74 C64 74 75 61 75 45 C68 55 60 59 50 59 C40 59 32 55 25 45 Z" fill={sombra} opacity="0.55" />

      {/* el pelo de arriba, si no lleva algo que lo tape del todo */}
      {ficha.sombrero !== "gorro" && ficha.sombrero !== "panuelo" && (
        <path
          d="M25 44 C25 24 36 15 50 15 C64 15 75 24 75 44 C71 33 62 28 50 28 C38 28 29 33 25 44 Z"
          fill={ficha.pelo}
        />
      )}

      {/* la cara */}
      <ellipse cx="39" cy="45" rx="3.4" ry="4" fill="#241a12" />
      <ellipse cx="61" cy="45" rx="3.4" ry="4" fill="#241a12" />
      <circle cx="40.2" cy="43.6" r="1.2" fill="#fff" opacity="0.85" />
      <circle cx="62.2" cy="43.6" r="1.2" fill="#fff" opacity="0.85" />
      <path d="M31 36 L45 38.5" stroke={ficha.pelo} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M69 36 L55 38.5" stroke={ficha.pelo} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M50 48 L46 58 L54 58 Z" fill={sombra} />

      {/* la boca: sonríe apenas, que está jugando y le gusta */}
      <path
        d="M42 64 Q50 70 58 64"
        fill="none"
        stroke="#6b3a2a"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* barba, bigote o chiva */}
      {ficha.peloCara === "barba" && (
        <path
          d="M26 46 C26 66 36 78 50 78 C64 78 74 66 74 46 C72 58 64 62 50 62 C36 62 28 58 26 46 Z"
          fill={ficha.pelo}
        />
      )}
      {ficha.peloCara === "chiva" && (
        <path d="M43 68 C43 76 46 79 50 79 C54 79 57 76 57 68 C55 70 45 70 43 68 Z" fill={ficha.pelo} />
      )}
      {(ficha.peloCara === "bigote" || ficha.peloCara === "barba") && (
        <path
          d="M36 60 C42 56 47 58 50 58 C53 58 58 56 64 60 C59 66 55 67 50 67 C45 67 41 66 36 60 Z"
          fill={ficha.pelo}
        />
      )}

      {/* los lentes */}
      {ficha.lentes && (
        <g fill="none" stroke="#2b2118" strokeWidth="2.2">
          <circle cx="39" cy="45" r="9" />
          <circle cx="61" cy="45" r="9" />
          <path d="M48 45 H52 M30 43 L24 45 M70 43 L76 45" strokeLinecap="round" />
        </g>
      )}

      {/* ─── El sombrero, que es lo que más los distingue de lejos ─────────── */}
      {ficha.sombrero === "ala" && (
        <g>
          <ellipse cx="50" cy="27" rx="42" ry="8" fill={sombraSombrero} />
          <ellipse cx="50" cy="25.5" rx="42" ry="7.5" fill={ficha.colorSombrero} />
          <path d="M27 25 C27 8 37 0 50 0 C63 0 73 8 73 25 C66 21 59 19 50 19 C41 19 34 21 27 25 Z" fill={ficha.colorSombrero} />
          <path d="M27 21 C34 24 41 25 50 25 C59 25 66 24 73 21 L73 26 C66 29 59 30 50 30 C41 30 34 29 27 26 Z" fill={sombraSombrero} />
          <path d="M35 10 C40 4 45 2 50 2 C55 2 60 4 65 10 C59 7 55 6 50 6 C45 6 41 7 35 10 Z" fill={ficha.colorSombrero} opacity="0.55" />
        </g>
      )}
      {ficha.sombrero === "boina" && (
        <g>
          <path d="M22 30 C22 15 34 8 50 8 C68 8 80 16 80 26 C80 31 70 33 50 33 C32 33 22 33 22 30 Z" fill={ficha.colorSombrero} />
          <path d="M22 30 C22 27 32 26 50 26 C70 26 80 27 80 28 C80 32 70 34 50 34 C32 34 22 33 22 30 Z" fill={sombraSombrero} />
          <circle cx="52" cy="8" r="3.4" fill={sombraSombrero} />
        </g>
      )}
      {ficha.sombrero === "gorro" && (
        <g>
          <path d="M23 40 C23 18 34 9 50 9 C66 9 77 18 77 40 C68 34 60 32 50 32 C40 32 32 34 23 40 Z" fill={ficha.colorSombrero} />
          <path d="M22 36 H78 V44 C68 40 60 38 50 38 C40 38 32 40 22 44 Z" fill={sombraSombrero} />
          <circle cx="50" cy="7" r="5" fill={sombraSombrero} />
        </g>
      )}
      {ficha.sombrero === "gorra" && (
        <g>
          <path d="M24 36 C24 17 35 9 50 9 C65 9 76 17 76 36 C67 31 60 29 50 29 C40 29 33 31 24 36 Z" fill={ficha.colorSombrero} />
          <path d="M24 34 C34 30 41 29 50 29 C59 29 66 30 76 34 L76 38 C66 34 59 33 50 33 C41 33 34 34 24 38 Z" fill={sombraSombrero} />
          {/* la visera */}
          <path d="M24 35 C14 36 8 39 6 43 C16 44 22 42 26 39 Z" fill={sombraSombrero} />
        </g>
      )}
      {ficha.sombrero === "panuelo" && (
        <g>
          <path d="M23 44 C23 20 34 11 50 11 C66 11 77 20 77 44 C68 36 60 33 50 33 C40 33 32 36 23 44 Z" fill={ficha.colorSombrero} />
          <path d="M23 42 C23 38 30 36 50 36 C70 36 77 38 77 42 L77 47 C68 40 60 38 50 38 C40 38 32 40 23 47 Z" fill={sombraSombrero} />
          {/* el nudo, atrás y a un costado */}
          <path d="M74 40 C82 38 88 42 88 48 C84 45 79 45 75 47 Z" fill={ficha.colorSombrero} />
          {/* lunares, que un pañuelo liso no se lee como pañuelo */}
          <g fill="#fff" opacity="0.35">
            <circle cx="36" cy="24" r="2" />
            <circle cx="50" cy="19" r="2" />
            <circle cx="64" cy="24" r="2" />
            <circle cx="30" cy="34" r="2" />
            <circle cx="70" cy="34" r="2" />
          </g>
        </g>
      )}
    </svg>
  );
}
