/**
 * El medallón del rival: un círculo con su cara, el nombre y las estrellas.
 *
 * Es lo ÚNICO que muestra la cara. Antes había una placa con el nombre arriba a
 * la derecha y además un busto dibujado en el centro: dos veces el mismo
 * personaje, y ninguna de las dos se veía bien. Ahora el de atrás es una silueta
 * sin rasgos y la identidad vive acá.
 *
 * De acá cuelga el globo de diálogo, así que el medallón es también el ancla de
 * todo lo que el rival dice.
 *
 * EN MODO GIRA NO ES UN BOTÓN. El rival lo pone el departamento de la dirección
 * y no se puede cambiar: si acá hubiera un botón, se podría elegir el rival más
 * blando y desbloquear la parada igual.
 */

import { Cara } from "@/components/mesa/Cara";
import { caraDe } from "@/lib/caras";
import type { Personalidad } from "@/lib/motor/personalidades";

function Contenido({ rival, alPie }: { rival: Personalidad; alPie: string }) {
  const ficha = caraDe(rival.id);
  return (
    <>
      <span className="min-w-0 text-right">
        <span className="block truncate font-[family-name:var(--font-ui)] text-[12px] uppercase leading-tight tracking-wide text-crema [text-shadow:0_1px_3px_rgba(0,0,0,0.95)] sm:text-[14px]">
          {rival.nombre}
        </span>
        <span
          className="block font-[family-name:var(--font-ui)] text-[9px] leading-tight tracking-wide text-dorado [text-shadow:0_1px_3px_rgba(0,0,0,0.95)] sm:text-[10px]"
          aria-label={`dificultad ${rival.dificultad} de 5`}
        >
          {"★".repeat(rival.dificultad)}
          <span className="text-crema/25">{"★".repeat(5 - rival.dificultad)}</span>
        </span>
        <span className="block truncate font-[family-name:var(--font-ui)] text-[8px] uppercase leading-tight tracking-wide text-crema/50 sm:text-[9px]">
          {alPie}
        </span>
      </span>

      {/* el marco dorado: es lo que lo hace un medallón y no un avatar */}
      <span className="relative block h-[48px] w-[48px] shrink-0 sm:h-[60px] sm:w-[60px]">
        <span
          className="absolute inset-0 overflow-hidden rounded-full"
          style={{
            background: `radial-gradient(circle at 34% 26%, ${ficha.piel}22, rgba(0,0,0,0.55))`,
            boxShadow:
              "0 0 0 2px var(--color-dorado), 0 0 0 3.5px rgba(0,0,0,0.65), 0 6px 14px -3px rgba(0,0,0,0.9)",
          }}
        >
          <Cara ficha={ficha} nombre={rival.nombre} />
        </span>
      </span>
    </>
  );
}

export function Medallon({
  rival,
  deLaGira,
  onCambiar,
}: {
  rival: Personalidad;
  /** En la gira el rival lo manda el mapa: no se puede cambiar. */
  deLaGira: boolean;
  onCambiar: () => void;
}) {
  /* ── ACÁ HABÍA UN `backdrop-blur-[2px]`, Y ERA EL MÁS CARO DE TODOS ──────
     Un `backdrop-filter` no desenfoca lo propio: obliga al navegador a LEER DE
     VUELTA todo lo que ya dibujó detrás, desenfocarlo y volver a componer, y
     eso pasa en cada cuadro en que algo de abajo se mueve —o sea toda la
     partida, porque abajo está la mesa—. El medallón cuelga sobre la esquina
     donde arranca la madera, que es justo donde Santiago fotografió basura.

     Sobre un fondo al 45% de negro el desenfoque casi no se veía; lo que hacía
     el trabajo de despegarlo de la madera era la opacidad. Sube a 55% y queda
     igual de legible, sin leer de vuelta un solo píxel. */
  const clases = "flex items-center gap-2 rounded-full bg-black/55 py-1 pl-3 pr-1";

  if (deLaGira) {
    return (
      <div className={clases}>
        <Contenido rival={rival} alPie={`${rival.departamento} · gira`} />
      </div>
    );
  }

  return (
    <button
      onClick={onCambiar}
      className={`${clases} transition-colors hover:bg-black/75`}
      aria-label={`Estás jugando contra ${rival.nombre}. Tocá para cambiar de rival.`}
    >
      <Contenido rival={rival} alPie={`${rival.lugar} · cambiar`} />
    </button>
  );
}
