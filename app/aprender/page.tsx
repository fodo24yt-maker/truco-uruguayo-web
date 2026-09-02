import type { Metadata } from "next";
import Link from "next/link";

import { ApoyarProyecto } from "@/components/ApoyarProyecto";
import { LECCIONES } from "@/lib/lecciones";

export const metadata: Metadata = {
  title: "Aprender",
  description:
    "Ocho lecciones para aprender truco uruguayo de cero: la baraja, la jerarquía, la muestra y las piezas, el envido, la flor y el truco.",
  alternates: { canonical: "/aprender" },
};

export default function Aprender() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* El "volver" ya no va acá: lo pone la barra de la app, y tener dos
          flechas de volver en la misma pantalla es peor que no tener ninguna. */}
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-dorado sm:text-4xl">
        Aprender truco uruguayo
      </h1>
      <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-crema/80">
        Ocho lecciones cortas, en orden. No hace falta saber nada de antes. Si ya
        jugás al truco argentino, andá derecho a la tercera: ahí está todo lo que
        cambia.
      </p>

      {/* POR QUÉ EXISTE ESTO — venía de la portada, que al volverse una pantalla
          de app se quedó con el nombre y las dos puertas y nada más. Se muda acá
          y no se pierde: el que aprieta "Aprender" es justamente el que quiere
          saber qué es esto, y para Google sigue siendo una página indexable de
          las trece del sitemap. */}
      <div className="mt-8 rounded border-l-2 border-dorado/40 pl-4 text-[17px] leading-relaxed text-crema/75">
        <p>
          El truco uruguayo tiene algo que no tiene ningún otro: la muestra. Casi
          todo lo que vas a encontrar en internet la saltea, porque está escrito
          para la versión argentina. Y las pocas apps que enseñan bien la de acá,
          se pagan.
        </p>
        <p className="mt-3">
          <strong className="text-crema">Esto es gratis y sin registro.</strong>{" "}
          Entrás, leés y jugás. No hay cuenta que crear ni versión paga
          esperándote más adelante.
        </p>
      </div>

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
