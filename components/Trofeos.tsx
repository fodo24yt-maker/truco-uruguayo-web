"use client";

import { useEffect, useRef } from "react";

import { ObjetoDeMesa } from "@/components/mesa/Objetos";
import { PROPORCION } from "@/lib/objetos";
import type { Trofeo } from "@/lib/trofeos";

/**
 * La vitrina: qué te quedaste de cada rival de la gira.
 *
 * ── Qué es un trofeo acá ──────────────────────────────────────────────────
 *
 * El objeto que ya estaba sobre la mesa de ese departamento —el vaso de
 * Montevideo, la naranja de Salto, el sombrero de Tacuarembó—. Ganarle al rival
 * te lo deja. No hay dibujo nuevo: es exactamente el mismo `<ObjetoDeMesa>` que
 * la mesa apoya sobre la madera, que resulta que no sabe nada de la perspectiva
 * y sirve tal cual en una lista.
 *
 * ── Tres decisiones que conviene tener escritas ───────────────────────────
 *
 * 1. **Se muestran los diecinueve, no sólo los ganados.** Una vitrina donde
 *    faltan los que no consiguiste no dice cuántos faltan, que es la mitad de
 *    para qué sirve.
 * 2. **Los que faltan no muestran el objeto.** Se ve el departamento y un hueco.
 *    Si se viera la silueta se perdería la sorpresa, que es el premio.
 * 3. **`ALTURA` no se usa acá, y sí en la mesa.** Allá una botella tiene que
 *    medir más que una llave porque están apoyadas en el mismo lugar; en una
 *    lista eso deja a la llave del tamaño de una uña. Cada objeto entra en una
 *    caja del mismo alto y se queda con su forma (`PROPORCION`), que es lo que
 *    lo hace reconocible.
 *
 * Y va sobre el mapa de la gira, no sobre la mesa: la mesa ya dibuja el objeto
 * de su ambiente, y los `<defs>` de estos SVG usan ids fijos que se repetirían.
 */
export function Trofeos({ trofeos, onCerrar }: { trofeos: Trofeo[]; onCerrar: () => void }) {
  const cerrar = useRef<HTMLButtonElement>(null);
  const ganados = trofeos.filter((t) => t.ganado).length;

  // Escape cierra, y el foco arranca en el botón de cerrar: sin eso, abrir la
  // vitrina con el teclado te deja el foco atrás, sobre el mapa que ya no ves.
  useEffect(() => {
    cerrar.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-trofeos"
      className="absolute inset-0 z-30 flex flex-col bg-noche/95"
    >
      <header className="madera flex shrink-0 items-center justify-between border-b-2 filo-dorado px-3 py-2.5">
        <h2
          id="titulo-trofeos"
          className="font-[family-name:var(--font-display)] text-xl text-dorado"
        >
          Trofeos
        </h2>
        <span className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-widest text-crema/55">
          {ganados} de {trofeos.length}
        </span>
        <button
          ref={cerrar}
          type="button"
          onClick={onCerrar}
          className="rounded px-3 py-1.5 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-crema/80 transition-colors hover:bg-black/30 hover:text-crema"
        >
          Cerrar
        </button>
      </header>

      {/* La única parte que scrollea. Diecinueve no entran en ninguna pantalla
          de celular y forzarlos sería achicar los objetos hasta que no se
          reconozcan, que es lo único que tienen que hacer. */}
      <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {trofeos.map((t) => (
          <li key={t.id}>
            <Fila trofeo={t} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fila({ trofeo: t }: { trofeo: Trofeo }) {
  return (
    <div
      className={`flex items-center gap-3 border-b border-crema/10 py-2.5 ${
        t.ganado ? "" : "opacity-45"
      }`}
    >
      {/* El objeto, sobre un cuadradito de papel: el contorno es de tinta y
          sobre el fondo de noche se perdería. */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-crema/15">
        {t.ganado && t.objeto ? (
          <div className="papel flex h-11 w-11 items-center justify-center rounded-sm">
            <div style={{ height: "1.7rem", aspectRatio: PROPORCION[t.objeto] }}>
              <ObjetoDeMesa objeto={t.objeto} />
            </div>
          </div>
        ) : (
          <span aria-hidden="true" className="text-lg leading-none text-crema/30">
            ·
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-[family-name:var(--font-ui)] text-base leading-tight text-crema">
          {t.paso}. {t.nombre}
        </p>
        <p className="truncate text-xs text-crema/55">{t.departamento}</p>
      </div>

      <p className="shrink-0 text-right font-[family-name:var(--font-mano)] text-lg leading-none text-dorado">
        {t.ganado ? (
          t.mejor ? (
            <>
              {t.mejor.vos}
              <span className="px-1 text-sm text-crema/45">a</span>
              {t.mejor.rival}
            </>
          ) : (
            /* Ganado antes de que se guardaran los marcadores. El trofeo está;
               el número no lo sabe nadie y no se inventa. */
            <span className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-widest text-dorado/70">
              ganado
            </span>
          )
        ) : (
          <span className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-widest text-crema/35">
            —
          </span>
        )}
      </p>
    </div>
  );
}
