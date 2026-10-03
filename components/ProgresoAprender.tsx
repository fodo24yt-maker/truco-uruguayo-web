"use client";

/**
 * Cuánto falta de Aprender para abrir la Gira. Sólo en la app, y sólo mientras
 * la Gira esté cerrada.
 *
 * Existe por el botón "Ir a Aprender" del diálogo de la Gira: el que llega por
 * ahí viene a terminar algo, y sin un número no sabe cuánto le falta ni que lo
 * que cuenta son los ejercicios del final de cada lección. Una vez abierta la
 * Gira —o en la web, donde no hay candados— no dibuja nada.
 */

import { Candado } from "@/components/Candado";
import { useCandados } from "@/components/EntradaJuego";

export function ProgresoAprender() {
  const { gira, acertados, total } = useCandados();
  if (!gira) return null;
  return (
    <p className="mt-[clamp(1rem,3vh,2rem)] flex items-start gap-2.5 rounded border-2 border-dorado/40 bg-black/30 px-3 py-2.5 text-[clamp(0.85rem,1.9vh,1rem)] leading-snug text-crema/85">
      <Candado className="mt-0.5 h-4 w-4 shrink-0 text-dorado" />
      <span>
        Acertá los ejercicios de las ocho lecciones y se abre la{" "}
        <strong className="text-crema">Gira nacional</strong>.{" "}
        <span className="whitespace-nowrap text-dorado">
          Llevás {acertados} de {total}.
        </span>
      </span>
    </p>
  );
}
