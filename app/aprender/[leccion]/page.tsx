import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PanelPapel } from "@/components/PanelPapel";
import { LECCIONES, buscarLeccion } from "@/lib/lecciones";

type Props = { params: Promise<{ leccion: string }> };

export function generateStaticParams() {
  return LECCIONES.map((l) => ({ leccion: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const leccion = buscarLeccion((await params).leccion);
  if (!leccion) return {};
  return {
    title: leccion.titulo,
    description: leccion.resumen,
    alternates: { canonical: `/aprender/${leccion.slug}` },
  };
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
    <div className="mx-auto max-w-3xl px-3 py-[clamp(0.75rem,3vh,3rem)] sm:px-4">
      {/* El "volver" lo pone la barra de la app. Lo que sí se queda es el
          contador: no es navegación, es saber cuánto falta. */}
      <div className="mb-5 flex items-center justify-end font-[family-name:var(--font-ui)] text-sm">
        <span className="text-crema/40">
          {indice + 1} de {LECCIONES.length}
        </span>
      </div>

      <PanelPapel>
        <article className="prosa mx-auto max-w-[62ch]">
          <h1 className="mb-2 font-[family-name:var(--font-display)] text-[clamp(1.5rem,5.5vw,2.25rem)] leading-tight text-tinta">
            {leccion.titulo}
          </h1>
          <p className="mb-6 border-b border-tinta/15 pb-4 text-[clamp(0.95rem,2vh,1rem)] text-tinta/70 sm:mb-8 sm:pb-5">
            {leccion.resumen}
          </p>
          <Contenido />
        </article>
      </PanelPapel>

      {/* EN CELULAR VAN APILADOS, y el que sigue va PRIMERO.
          Al lado, en un celular de 320, cada botón queda de 150px con un título
          de cinco palabras adentro: "El truco, el retruco y el vale cuatro" se
          partía en cuatro renglones. Y el orden invertido no es capricho: el
          botón que se usa en el 95% de los casos es "siguiente", así que en la
          columna va arriba, al alcance del pulgar. En una compu vuelven a la
          fila de siempre, con el anterior a la izquierda. */}
      <nav className="mt-6 flex flex-col-reverse gap-2 font-[family-name:var(--font-ui)] sm:mt-8 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3">
        {anterior ? (
          <Link
            href={`/aprender/${anterior.slug}`}
            className="rounded border border-crema/15 px-4 py-3 text-sm text-crema/70 transition-colors hover:border-dorado/50 hover:text-crema sm:flex-1"
          >
            ← {anterior.titulo}
          </Link>
        ) : (
          <span className="hidden sm:block sm:flex-1" />
        )}
        {siguiente ? (
          <Link
            href={`/aprender/${siguiente.slug}`}
            className="rounded bg-bordo px-4 py-3 text-sm text-crema transition-colors hover:bg-bordo-claro sm:flex-1 sm:text-right"
          >
            {siguiente.titulo} →
          </Link>
        ) : (
          <Link
            href="/jugar"
            className="rounded bg-dorado px-4 py-3 text-sm uppercase tracking-wide text-tinta transition-colors hover:bg-dorado-claro sm:flex-1 sm:text-right"
          >
            Ahora andá a jugar →
          </Link>
        )}
      </nav>

      {/* Acá estaba el "¿Te sirvió? / Seguir en GitHub". Se fue el 4/9/2026.
          Y Aprender no lleva NINGÚN anuncio: ni banner (se sacaron todos el
          2/10/2026) ni de pantalla completa. Lo cuida `lib/anuncios.ts`. */}
    </div>
  );
}
