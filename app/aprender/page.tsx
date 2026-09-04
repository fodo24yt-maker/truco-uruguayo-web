import type { Metadata } from "next";
import Link from "next/link";

import { LECCIONES } from "@/lib/lecciones";

export const metadata: Metadata = {
  title: "Aprender",
  description:
    "Ocho lecciones para aprender truco uruguayo de cero: la baraja, la jerarquía, la muestra y las piezas, el envido, la flor y el truco.",
  alternates: { canonical: "/aprender" },
};

export default function Aprender() {
  return (
    /* Los espacios van en `clamp(…vh…)` y no clavados, que es la regla de la
       casa: el problema siempre es la pantalla BAJA. Con `py-12` fijo, un
       celular de 568 se comía 96px de los 568 en aire, y lo primero que se veía
       era medio título. */
    <div className="mx-auto max-w-3xl px-4 py-[clamp(1rem,3.5vh,3rem)]">
      {/* El "volver" ya no va acá: lo pone la barra de la app, y tener dos
          flechas de volver en la misma pantalla es peor que no tener ninguna. */}
      <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,5.5vw,2.25rem)] leading-tight text-dorado">
        Aprender truco uruguayo
      </h1>
      <p className="mt-3 max-w-xl text-[clamp(0.95rem,2vh,1.0625rem)] leading-relaxed text-crema/80">
        Ocho lecciones cortas, en orden. No hace falta saber nada de antes. Si ya
        jugás al truco argentino, andá derecho a la tercera: ahí está todo lo que
        cambia.
      </p>

      {/* POR QUÉ EXISTE ESTO — venía de la portada, que al volverse una pantalla
          de app se quedó con el nombre y las dos puertas y nada más. Se muda acá
          y no se pierde: el que aprieta "Aprender" es justamente el que quiere
          saber qué es esto, y para Google sigue siendo una página indexable de
          las trece del sitemap. */}
      <div className="mt-[clamp(1rem,3vh,2rem)] rounded border-l-2 border-dorado/40 pl-3 text-[clamp(0.9rem,1.95vh,1.0625rem)] leading-relaxed text-crema/75 sm:pl-4">
        <p>
          El truco uruguayo tiene algo que no tiene ningún otro: la muestra. Casi
          todo lo que vas a encontrar en internet la saltea, porque está escrito
          para la versión argentina. Y las pocas apps que enseñan bien la de acá,
          se pagan.
        </p>
        <p className="mt-2.5">
          <strong className="text-crema">Esto es gratis y sin registro.</strong>{" "}
          Entrás, leés y jugás. No hay cuenta que crear ni versión paga
          esperándote más adelante.
        </p>
      </div>

      {/* Ocho tarjetas de tres renglones son novecientos píxeles: en un celular
          eso es scrollear tres pantallas para ver la lista entera. Se aprietan
          el relleno y la separación, y LOS MINUTOS PASAN AL LADO DEL TÍTULO en
          vez de en una columna propia —esa columna se llevaba 46px de ancho de
          los 358 que hay, y el resumen quedaba en tres líneas en vez de dos—. */}
      <ol className="mt-[clamp(1.25rem,3.5vh,2.25rem)] space-y-2">
        {LECCIONES.map((leccion, i) => (
          <li key={leccion.slug}>
            <Link
              href={`/aprender/${leccion.slug}`}
              className="group flex items-start gap-3 rounded border border-crema/12 bg-black/20 p-3 transition-colors hover:border-dorado/50 hover:bg-black/35 sm:gap-4 sm:p-4"
            >
              <span className="mt-0.5 font-[family-name:var(--font-display)] text-xl leading-none text-dorado/60 group-hover:text-dorado sm:text-2xl">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-[family-name:var(--font-ui)] text-[17px] leading-tight text-crema sm:text-lg">
                  {leccion.titulo}
                  <span className="ml-2 whitespace-nowrap align-middle font-[family-name:var(--font-ui)] text-[11px] font-normal text-crema/35">
                    {leccion.minutos} min
                  </span>
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-crema/65 sm:text-sm">
                  {leccion.resumen}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {/* ACÁ ESTABA EL "¿TE SIRVIÓ? / SEGUIR EN GITHUB", y se fue el 4/9/2026.
          Esto es una app, no la vidriera de un repositorio: el que entra a
          aprender truco no viene a seguir a nadie en GitHub. Los enlaces al
          repositorio que sí hacen falta —las reglas, la licencia y por dónde
          escribir— siguen en Términos y en Privacidad, que es donde Play Store
          los va a buscar.

          Y EL HUECO DEL ANUNCIO NO VA ACÁ, aunque parezca el lugar natural: lo
          lleva el pie, que está en esta misma pantalla dos centímetros más
          abajo. Puestos los dos quedaban PEGADOS, sin una línea de contenido en
          el medio, y eso además de verse mal está prohibido por las políticas
          de AdMob. Uno por pantalla. */}
    </div>
  );
}
