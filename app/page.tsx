import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * El inicio.
 *
 * ── Por qué es UNA pantalla y no una página ───────────────────────────────
 *
 * Antes acá había una portada larga: el título, las dos puertas, y abajo por
 * scroll el porqué del proyecto y el camino de las ocho lecciones. Eso está
 * bien para una web, donde el que llega de Google necesita leer antes de
 * decidir. Adentro de una app está mal: al abrir una app nadie scrollea
 * buscando el contenido, elige.
 *
 * Así que quedan el nombre y las dos puertas, y nada más. Lo que se fue no se
 * perdió: el porqué y el camino están en `/aprender`, que es donde alguien que
 * apretó "Aprender" los va a buscar.
 *
 * `pantalla-fija` es lo que garantiza que no scrollee: esconde el pie —que con
 * su margen de arriba empujaba la pantalla fuera de la ventana— y le fija el
 * alto al body. Está explicada en `app/globals.css`.
 *
 * El alto sale de la cadena de flex (`body → main → esta sección`) y NO de un
 * `calc(100svh - 58px)` como antes: ese 58 era el alto del encabezado viejo,
 * escrito a mano, y la barra nueva no mide lo mismo.
 */
export default function Inicio() {
  return (
    <section className="pantalla-fija tabla-mesa relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-6">
      <div className="mx-auto w-full max-w-sm text-center">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(2rem,9vh,3.5rem)] leading-tight text-crema">
          Truco Uruguayo
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-[clamp(0.95rem,2.4vh,1.125rem)] leading-relaxed text-crema/75">
          Aprendelo de cero y jugalo. Con muestra, con flor y gratis.
        </p>

        {/* Las dos puertas. En columna y anchas: en un celular dos botones al
            lado quedan angostos y la decisión es de UNO, no de dos. */}
        <div className="mt-[clamp(1.5rem,5vh,2.5rem)] flex flex-col gap-3">
          <Link
            href="/aprender"
            className="rounded bg-dorado px-7 py-[clamp(0.9rem,3vh,1.25rem)] font-[family-name:var(--font-ui)] text-[clamp(1rem,2.6vh,1.125rem)] uppercase tracking-wide text-tinta transition-colors hover:bg-dorado-claro"
          >
            Aprender a jugar
          </Link>
          <Link
            href="/jugar"
            className="rounded border-2 border-crema/30 px-7 py-[clamp(0.9rem,3vh,1.25rem)] font-[family-name:var(--font-ui)] text-[clamp(1rem,2.6vh,1.125rem)] uppercase tracking-wide text-crema transition-colors hover:border-dorado/70 hover:bg-black/25"
          >
            Jugar
          </Link>
        </div>
      </div>

      {/* ACÁ ESTABAN LOS LEGALES, Y SE FUERON EL 4/9/2026.
          Estaban porque la portada esconde el pie y eran el único camino para
          llegar a ellos. Ahora el camino existe igual —portada → Aprender, y
          ahí sí está el pie con los dos enlaces—, y Santiago los quiere en un
          solo lugar y no repartidos por todas las pantallas. Play Store pide
          que existan y se encuentren, no que estén en cada pantalla.
          Ver `components/PieLegales.tsx`. */}
    </section>
  );
}
