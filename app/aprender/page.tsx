import type { Metadata } from "next";
import Link from "next/link";

import { ApoyarProyecto } from "@/components/ApoyarProyecto";
import { LECCIONES } from "@/lib/lecciones";

export const metadata: Metadata = {
  title: "Aprender",
  description:
    "Ocho lecciones para aprender truco uruguayo de cero: la baraja, la jerarquía, la muestra y las piezas, el envido, la flor y el truco.",
};

export default function Aprender() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-dorado sm:text-4xl">
        Aprender truco uruguayo
      </h1>
      <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-crema/80">
        Ocho lecciones cortas, en orden. No hace falta saber nada de antes. Si ya
        jugás al truco argentino, andá derecho a la tercera: ahí está todo lo que
        cambia.
      </p>

      <ol className="mt-9 space-y-3">
        {LECCIONES.map((leccion, i) => (
          <li key={leccion.slug}>
            <Link
              href={`/aprender/${leccion.slug}`}
              className="group flex items-start gap-4 rounded border border-crema/12 bg-black/20 p-4 transition-colors hover:border-dorado/50 hover:bg-black/35"
            >
              <span className="mt-0.5 font-[family-name:var(--font-display)] text-2xl leading-none text-dorado/60 group-hover:text-dorado">
                {i + 1}
              </span>
              <span className="flex-1">
                <span className="block font-[family-name:var(--font-ui)] text-lg leading-tight text-crema">
                  {leccion.titulo}
                </span>
                <span className="mt-1 block text-sm leading-snug text-crema/65">
                  {leccion.resumen}
                </span>
              </span>
              <span className="font-[family-name:var(--font-ui)] text-xs text-crema/35">
                {leccion.minutos} min
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <ApoyarProyecto className="mt-12" />
    </div>
  );
}
