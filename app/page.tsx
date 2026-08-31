import Link from "next/link";

import { ApoyarProyecto } from "@/components/ApoyarProyecto";
import { LECCIONES } from "@/lib/lecciones";

export default function Inicio() {
  return (
    <>
      {/* ── LA PORTADA ────────────────────────────────────────────────────
          Antes acá había una lección: dos cartas, "el 4 le puede ganar al 1" y
          tres párrafos explicando la muestra. Enseñaba bien, pero enseñaba
          ANTES de que el que entra hubiera decidido nada, y lo que hay que
          resolver en la primera pantalla es una sola cosa: **a qué vine**.

          Así que ahora es una portada de verdad, con las dos puertas y nada
          más. Lo que estaba explicado no se perdió: la muestra es la primera
          lección del camino, y el porqué de la web está acá abajo, a un scroll.

          Ocupa la pantalla menos el encabezado (`100svh`, que en un celular
          descuenta la barra del navegador y `100vh` no). Y `min-h`, no `h`: si
          la pantalla es muy baja, la portada crece en vez de recortarse. */}
      <section className="tabla-mesa relative flex min-h-[calc(100svh-58px)] flex-col items-center justify-center overflow-hidden border-b-4 border-mesa-canto px-4 py-14">
        <div className="mx-auto w-full max-w-lg text-center">
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-crema sm:text-6xl">
            Truco Uruguayo
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-lg leading-relaxed text-crema/75 sm:max-w-md">
            Aprendelo de cero y jugalo. Con muestra, con flor y gratis.
          </p>

          {/* Las dos puertas. En columna y anchas: en un celular dos botones al
              lado quedan angostos y la decisión es de UNO, no de dos. */}
          <div className="mt-10 flex flex-col gap-3">
            <Link
              href="/aprender"
              className="rounded bg-dorado px-7 py-5 font-[family-name:var(--font-ui)] text-lg uppercase tracking-wide text-tinta transition-colors hover:bg-dorado-claro"
            >
              Aprender a jugar
            </Link>
            <Link
              href="/jugar"
              className="rounded border-2 border-crema/30 px-7 py-5 font-[family-name:var(--font-ui)] text-lg uppercase tracking-wide text-crema transition-colors hover:border-dorado/70 hover:bg-black/25"
            >
              Jugar contra el bot
            </Link>
          </div>
        </div>

        {/* Que se note que abajo hay más. Sin esto, una portada que ocupa la
            pantalla entera parece que fuera todo lo que hay. */}
        <a
          href="#por-que"
          className="absolute bottom-5 left-1/2 -translate-x-1/2 font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-[0.18em] text-crema/45 transition-colors hover:text-crema/80"
        >
          por qué existe esto
          <span aria-hidden="true" className="mt-1 block text-base leading-none">
            ↓
          </span>
        </a>
      </section>

      <section id="por-que" className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-dorado">
          Por qué existe esto
        </h2>
        <div className="mt-5 space-y-4 text-[17px] leading-relaxed text-crema/85">
          <p>
            El truco uruguayo tiene algo que no tiene ningún otro: la muestra.
            Casi todo lo que vas a encontrar en internet la saltea, porque está
            escrito para la versión argentina. Y las pocas apps que enseñan bien
            la de acá, se pagan.
          </p>
          <p>
            <strong className="text-crema">Esto es gratis y sin registro.</strong>{" "}
            Entrás, leés y jugás. No hay cuenta que crear ni versión paga
            esperándote más adelante.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-14">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-dorado">
          El camino, de cero a jugar
        </h2>
        <ol className="mt-6 space-y-2">
          {LECCIONES.map((leccion, i) => (
            <li key={leccion.slug}>
              <Link
                href={`/aprender/${leccion.slug}`}
                className="flex items-baseline gap-4 rounded border border-crema/10 px-4 py-3 transition-colors hover:border-dorado/50 hover:bg-black/25"
              >
                <span className="font-[family-name:var(--font-ui)] text-sm text-dorado/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">
                  <span className="block font-[family-name:var(--font-ui)] text-lg leading-tight text-crema">
                    {leccion.titulo}
                  </span>
                  <span className="mt-0.5 block text-sm text-crema/60">
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
      </section>

      <ApoyarProyecto className="mb-16" />
    </>
  );
}
