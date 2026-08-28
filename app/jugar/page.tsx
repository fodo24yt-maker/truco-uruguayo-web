import Link from "next/link";

import { Carta } from "@/components/Carta";
import { desdeTexto } from "@/lib/motor/baraja";

export default function ElegirModo() {
  return (
    <div className="tabla-mesa relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10">
      <h1 className="text-center font-[family-name:var(--font-display)] text-3xl text-crema sm:text-4xl">
        ¿Cómo querés jugar?
      </h1>

      <div className="mt-8 grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        {/* Partida suelta */}
        <Link
          href="/jugar/mesa"
          className="group flex flex-col rounded border-2 border-crema/15 bg-black/40 p-5 transition-colors hover:border-dorado/60 hover:bg-black/55"
        >
          <div className="mb-3 flex gap-1.5">
            <Carta carta={desdeTexto("1E")} className="w-[44px] -rotate-6" />
            <Carta carta={desdeTexto("7O")} className="w-[44px] rotate-3" />
          </div>
          <span className="font-[family-name:var(--font-ui)] text-xl uppercase tracking-wide text-crema">
            Partida rápida
          </span>
          <span className="mt-1 text-sm leading-snug text-crema/65">
            Una partida suelta contra el rival que elijas. Ideal para practicar
            un canto puntual.
          </span>
        </Link>

        {/* La gira */}
        <Link
          href="/jugar/gira"
          className="group flex flex-col rounded border-2 border-dorado/40 bg-black/40 p-5 transition-colors hover:border-dorado hover:bg-black/55"
        >
          <div className="mb-3 flex gap-1.5">
            <Carta carta={desdeTexto("2O")} className="w-[44px] -rotate-3" pieza />
            <Carta carta={desdeTexto("4O")} className="w-[44px] rotate-6" pieza />
          </div>
          <span className="font-[family-name:var(--font-ui)] text-xl uppercase tracking-wide text-dorado">
            Gira nacional
          </span>
          <span className="mt-1 text-sm leading-snug text-crema/65">
            Diecinueve rivales, uno por departamento. Recorrés todo el Uruguay
            jugando truco.
          </span>
        </Link>
      </div>

      <p className="mt-8 max-w-md text-center text-sm text-crema/45">
        Las dos son gratis y no hace falta registrarse. Lo que ganes se guarda
        en este dispositivo.
      </p>
    </div>
  );
}
