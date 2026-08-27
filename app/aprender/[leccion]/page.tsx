import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApoyarProyecto } from "@/components/ApoyarProyecto";
import { PanelPapel } from "@/components/PanelPapel";
import { LECCIONES, buscarLeccion } from "@/lib/lecciones";

type Props = { params: Promise<{ leccion: string }> };

export function generateStaticParams() {
  return LECCIONES.map((l) => ({ leccion: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const leccion = buscarLeccion((await params).leccion);
  if (!leccion) return {};
  return { title: leccion.titulo, description: leccion.resumen };
}

export default async function PaginaLeccion({ params }: Props) {
  const slug = (await params).leccion;
  const leccion = buscarLeccion(slug);
  if (!leccion) notFound();

  const indice = LECCIONES.findIndex((l) => l.slug === slug);
  const anterior = LECCIONES[indice - 1];
  const siguiente = LECCIONES[indice + 1];
  const { Contenido } = leccion;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-5 flex items-center justify-between gap-4 font-[family-name:var(--font-ui)] text-sm">
        <Link href="/aprender" className="text-crema/60 hover:text-crema">
          ← Aprender
        </Link>
        <span className="text-crema/40">
          {indice + 1} de {LECCIONES.length}
        </span>
      </div>

      <PanelPapel>
        <article className="prosa mx-auto max-w-[62ch]">
          <h1 className="mb-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-tinta sm:text-4xl">
            {leccion.titulo}
          </h1>
          <p className="mb-8 border-b border-tinta/15 pb-5 text-base text-tinta/70">
            {leccion.resumen}
          </p>
          <Contenido />
        </article>
      </PanelPapel>

      <nav className="mt-8 flex flex-wrap items-stretch justify-between gap-3 font-[family-name:var(--font-ui)]">
        {anterior ? (
          <Link
            href={`/aprender/${anterior.slug}`}
            className="flex-1 rounded border border-crema/15 px-4 py-3 text-sm text-crema/70 transition-colors hover:border-dorado/50 hover:text-crema"
          >
            ← {anterior.titulo}
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {siguiente ? (
          <Link
            href={`/aprender/${siguiente.slug}`}
            className="flex-1 rounded bg-bordo px-4 py-3 text-right text-sm text-crema transition-colors hover:bg-bordo-claro"
          >
            {siguiente.titulo} →
          </Link>
        ) : (
          <Link
            href="/jugar"
            className="flex-1 rounded bg-dorado px-4 py-3 text-right text-sm uppercase tracking-wide text-tinta transition-colors hover:bg-dorado-claro"
          >
            Ahora andá a jugar →
          </Link>
        )}
      </nav>

      <ApoyarProyecto className="mt-10" />
    </div>
  );
}
