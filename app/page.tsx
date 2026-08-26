import Link from "next/link";

import { Carta } from "@/components/Carta";
import { EspacioAviso } from "@/components/EspacioAviso";
import { LECCIONES } from "@/lib/lecciones";
import { desdeTexto } from "@/lib/motor/baraja";

export default function Inicio() {
  return (
    <>
      {/* El hero es la regla que hace único al truco uruguayo, puesta en cartas */}
      <section className="tabla-mesa relative overflow-hidden border-b-4 border-mesa-canto px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-9 flex items-end justify-center gap-3 sm:gap-6">
            <div>
              <Carta
                carta={desdeTexto("4B")}
                ancho={104}
                pieza
                className="anim-caer -rotate-6"
              />
              <p className="mt-3 font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-[0.18em] text-dorado">
                pieza
              </p>
            </div>
            <p className="pb-12 font-[family-name:var(--font-display)] text-3xl text-crema/70">
              &gt;
            </p>
            <div>
              <Carta carta={desdeTexto("1E")} ancho={104} className="anim-caer rotate-3" />
              <p className="mt-3 font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-[0.18em] text-crema/50">
                le gana al 1 de espada
              </p>
            </div>
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-crema sm:text-5xl">
            En el truco, el 4 le puede ganar al 1
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-crema/80">
            Depende de la muestra: esa carta que se da vuelta al repartir y
            cambia quién manda. Es la primera cosa rara del truco uruguayo, y es
            más fácil de lo que parece.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-crema/60">
            Empezá de cero, aunque nunca hayas tocado una baraja.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/aprender"
              className="rounded bg-dorado px-7 py-3.5 font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-tinta transition-colors hover:bg-dorado-claro"
            >
              Aprender de cero
            </Link>
            <Link
              href="/jugar"
              className="rounded border-2 border-crema/30 px-7 py-3.5 font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-crema transition-colors hover:border-crema/60"
            >
              Jugar contra el bot
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
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

      <EspacioAviso className="mb-14" />
    </>
  );
}
