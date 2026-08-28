"use client";

/**
 * El mapa de la gira: un mapa del tesoro de papel viejo con el Uruguay
 * dibujado a tinta encima, el camino punteado y un sombrero de gaucho parado
 * donde te toca jugar.
 *
 * La geometría del país sale entera de `lib/mapa-uruguay.ts`, que se genera
 * con `herramientas/generar-mapa.mjs` desde datos cartográficos reales; la del
 * camino, de `lib/gira-camino.ts`. Acá sólo se decide el orden de las capas.
 *
 * Es UN solo `<svg>`, y esa es toda la ventaja de tener el país en SVG: un
 * único sistema de coordenadas donde el papel, el país, el camino y el
 * sombrero se ubican con los mismos números.
 *
 * Y sigue sin haber una sola imagen: el pergamino, el mate, la rosa de los
 * vientos y el sombrero son coordenadas.
 */

import { type Parada, estadosDeTramos } from "@/lib/gira";

import { Adornos } from "./Adornos";
import { CaminoGira } from "./CaminoGira";
import { ParadasGira } from "./ParadasGira";
import { Pergamino } from "./Pergamino";
import { Territorio } from "./Territorio";
import { HOJA, VISTA } from "./lienzo";

/**
 * `Pergamino` y `Adornos` no tienen props y no cambian nunca, así que se
 * declaran como elementos constantes: React saltea el re-render de un hijo
 * referencialmente idéntico. Más barato que `React.memo` y sin ceremonia.
 */
const PERGAMINO = <Pergamino />;
const ADORNOS = <Adornos />;

export interface PropsMapa {
  paradas: readonly Parada[];
  elegido: string | null;
  onElegir: (departamento: string) => void;
}

export function MapaUruguay({ paradas, elegido, onElegir }: PropsMapa) {
  const tramos = estadosDeTramos(paradas);

  return (
    <svg
      viewBox={VISTA}
      preserveAspectRatio="xMidYMid meet"
      // Anclado al contenedor: con h-full dependía de que el padre tuviera
      // altura explícita, y dentro de un flex crecía de más.
      className="absolute inset-0 h-full w-full"
      role="group"
      aria-label="Mapa del Uruguay: la gira, departamento por departamento"
    >
      <defs>
        {/* EL ÚNICO FILTRO DE LA PANTALLA, y tiene que seguir siendo el único:
            un `feTurbulence` sobre esta superficie son millones de evaluaciones
            de ruido por cuadro en un celular. Ya se corrigió una vez el error
            de poner uno por departamento (19 → 1); si algún día hace falta más
            grano, se agranda ESTE, no se agrega otro.

            El `feComposite` es lo que importa: sin él, el ruido rellena el
            rectángulo entero de la región del filtro y queda una mancha
            cuadrada flotando al lado del papel. */}
        <filter id="papel-viejo" x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.024" numOctaves="3" seed="11" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.42  0 0 0 0 0.32  0 0 0 0 0.18  0 0 0 0.13 0"
            result="ruido"
          />
          <feComposite in="ruido" in2="SourceGraphic" operator="in" />
        </filter>

        {/* El envejecido de los bordes: limpio en el medio, quemado en las
            orillas. Un degradado se rasteriza una vez; un filtro, no. */}
        <radialGradient id="envejecido" cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="var(--color-quemado)" stopOpacity={0} />
          <stop offset="58%" stopColor="var(--color-quemado)" stopOpacity={0.06} />
          <stop offset="86%" stopColor="var(--color-quemado)" stopOpacity={0.3} />
          <stop offset="100%" stopColor="var(--color-quemado)" stopOpacity={0.62} />
        </radialGradient>
      </defs>

      {/* ─── Las capas, de abajo hacia arriba ──────────────────────────── */}

      {/* 1. El papel: sombra sobre la mesa, hoja rasgada, manchas y marco */}
      {PERGAMINO}

      {/* 2. El país dibujado encima. Es la única capa que recibe clicks. */}
      <Territorio paradas={paradas} elegido={elegido} onElegir={onElegir} />

      {/* 3. Los adornos, en los huecos que el encuadre ya pagaba */}
      {ADORNOS}

      {/* 4. El grano del papel, UNA vez y sobre todo lo dibujado: así el país y
             el margen son la misma hoja y no un dibujo pegado encima. */}
      <path d={HOJA} fill="#000" filter="url(#papel-viejo)" className="pointer-events-none" />

      {/* 5. y 6. Lo vivo: el camino y las paradas van sobre el grano, limpios */}
      <CaminoGira estados={tramos} />
      <ParadasGira paradas={paradas} elegido={elegido} />
    </svg>
  );
}
