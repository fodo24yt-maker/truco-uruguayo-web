"use client";

/**
 * La gira: el mapa del Uruguay con un rival por departamento.
 *
 * Por ahora están todos habilitados —se puede jugar cualquiera— y el progreso
 * sólo marca cuáles ya ganaste. El desbloqueo en cadena viene después; la
 * estructura ya está lista para eso, porque cada rival tiene su `paso` (1 a 19)
 * y el progreso ya guarda qué departamentos se ganaron.
 */

import Link from "next/link";
import { useEffect, useState } from "react";

import { MapaUruguay } from "@/components/mapa/MapaUruguay";
import { PERSONALIDADES, porDepartamento } from "@/lib/motor/personalidades";
import { leerProgreso } from "@/lib/progreso";

export default function Gira() {
  const [elegido, setElegido] = useState<string | null>(null);
  const [ganados, setGanados] = useState<Set<string>>(new Set());

  // El progreso vive en el navegador, así que se lee recién del lado del cliente
  useEffect(() => {
    const progreso = leerProgreso();
    const conVictoria = PERSONALIDADES.filter(
      (p) => (progreso.rivales[p.id]?.ganadas ?? 0) > 0,
    ).map((p) => p.departamento);
    setGanados(new Set(conVictoria));
  }, []);

  const rival = elegido ? porDepartamento(elegido) : undefined;
  const total = PERSONALIDADES.length;

  // Pantalla completa, igual que la mesa: la gira es una pantalla de juego, no
  // una página para leer. Sin esto el mapa queda encajonado entre el pie de
  // página y la barra, y en escritorio los nombres no se leen. La clase
  // `mesa-pantalla-completa` ya existe y esconde el pie.
  return (
    <div className="mesa-pantalla-completa flex min-h-0 flex-1 flex-col bg-noche">
      {/* Barra de arriba, como la del mapa de la referencia */}
      <header className="madera flex shrink-0 items-center justify-between border-b-2 filo-dorado px-3 py-2.5">
        <Link
          href="/jugar"
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dorado/60 text-dorado transition-colors hover:bg-black/30"
          aria-label="Volver"
        >
          ←
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-xl text-dorado sm:text-2xl">
          Gira Nacional
        </h1>
        <span className="font-[family-name:var(--font-ui)] text-xs text-crema/60">
          {ganados.size}/{total}
        </span>
      </header>

      {/* El mapa. Va sobre el fondo de noche del sitio, no sobre una caja
          crema: el mapa es el papel, y el papel está apoyado en la mesa oscura
          del boliche. El ancho máximo evita que en pantalla ancha se estire a
          lo largo y quede una franja de mapa perdida en el medio. */}
      <div className="relative mx-auto min-h-0 w-full max-w-[min(100%,calc(100vh-13rem))] flex-1">
        <MapaUruguay
          rivales={PERSONALIDADES}
          elegido={elegido}
          onElegir={setElegido}
          ganados={ganados}
        />
      </div>

      {/* Sin nada elegido, una franja discreta invita a tocar el mapa. Antes
          iba superpuesta y tapaba justo Montevideo, que es donde se arranca. */}
      {!rival && (
        <p className="shrink-0 border-t-2 border-madera bg-[#181008] py-3 text-center font-[family-name:var(--font-ui)] text-xs uppercase tracking-widest text-crema/55">
          Tocá un departamento para ver contra quién jugás
        </p>
      )}

      {/* La ficha del rival elegido */}
      {rival && (
        <div className="papel anim-pop shrink-0 border-t-4 border-madera px-4 py-4">
          <div className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-widest text-tinta/50">
                {rival.departamento} · {rival.lugar}
              </p>
              <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-tinta">
                {rival.nombre}
              </p>
              <p className="mt-1 text-sm leading-snug text-tinta/75">{rival.descripcion}</p>
              <p
                className="mt-1.5 font-[family-name:var(--font-ui)] text-sm text-dorado"
                aria-label={`Dificultad ${rival.dificultad} de 5`}
              >
                {"★".repeat(rival.dificultad)}
                <span className="text-tinta/20">{"★".repeat(5 - rival.dificultad)}</span>
                {ganados.has(rival.departamento) && (
                  <span className="ml-2 text-quiero">✓ ganado</span>
                )}
              </p>
            </div>

            <Link
              href={`/jugar/mesa?rival=${rival.id}`}
              className="shrink-0 rounded bg-bordo px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-crema transition-colors hover:bg-bordo-claro"
            >
              Jugar
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
