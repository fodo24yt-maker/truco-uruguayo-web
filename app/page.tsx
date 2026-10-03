import type { Metadata } from "next";
import Link from "next/link";

import { Candado } from "@/components/Candado";
import { EntradaAnotador } from "@/components/EntradaJuego";
import { Marca } from "@/components/Marca";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * El inicio.
 *
 * ── POR QUÉ ES UNA PANTALLA Y NO UNA PÁGINA ───────────────────────────────
 *
 * Antes acá había una portada larga: el título, las dos puertas, y abajo por
 * scroll el porqué del proyecto y el camino de las ocho lecciones. Eso está
 * bien para una web, donde el que llega de Google necesita leer antes de
 * decidir. Adentro de una app está mal: al abrir una app nadie scrollea
 * buscando el contenido, elige.
 *
 * Lo que se fue no se perdió: el porqué y el camino están en `/aprender`, que
 * es donde alguien que apretó "Aprender" los va a buscar. Y los legales se
 * fueron el 4/9/2026 al pie de esa misma página.
 *
 * `pantalla-fija` es lo que garantiza que no scrollee: esconde el pie —que con
 * su margen de arriba empujaba la pantalla fuera de la ventana— y le fija el
 * alto al body. Está explicada en `app/globals.css`.
 *
 * ── EL DIBUJO, QUE CAMBIÓ EL 10/9/2026 ────────────────────────────────────
 *
 * Antes era el nombre en tipografía sobre un degradé, y Santiago lo describió
 * como "muy meh". Se probaron tres portadas con `?portada=` —el escudo, un
 * cartucho con filete, y una con el fondo del boliche horneado— y eligió ésta.
 * Las otras dos se borraron junto con el parámetro: el sitio es público y una
 * variante que quedó puesta se publica.
 *
 * Las dos cosas que la sacaron del "meh", y conviene no deshacerlas:
 *
 *   · **La marca.** Es el mismo motivo del ícono de Android, que ya era la
 *     marca del proyecto: dos cartas con el halo dorado que marca la muestra.
 *     Ver `components/Marca.tsx`.
 *   · **Las vetas.** `.tabla-mesa` sola es un `radial-gradient`, y se veía como
 *     un degradé. `.vetas-madera` le pone la madera encima con tres
 *     `repeating-linear-gradient` en UNA sola capa de pintura. Está en
 *     `app/globals.css`, con el porqué de cada uno de los tres.
 *
 * Y sigue **sin descargar una sola imagen**: la marca es SVG y el fondo, CSS.
 * Eso importa acá más que en ninguna otra pantalla, porque es la primera que
 * abre la app.
 *
 * ── CASI SIN JAVASCRIPT, Y ES A PROPÓSITO ─────────────────────────────────
 *
 * Mientras duró la elección, esta página tuvo un componente cliente adentro
 * para poder leer `?portada=`. Volvió a ser un Server Component: es la primera
 * pantalla que se abre y no tiene casi nada que decidir en el navegador.
 *
 * Lo único que se decide allá, desde el 2/10/2026, es el candado del
 * anotador: en la app está bloqueado hasta mirar un video, una vez. Por eso
 * esa puerta es `EntradaAnotador`, el enlace que pasa por `lib/entrada.ts`. El
 * dibujo del candado sigue siendo de servidor: se prende con
 * `group-data-[bloqueado=true]`, un atributo que pone el enlace.
 */
export default function Inicio() {
  return (
    <section className="pantalla-fija tabla-mesa vetas-madera penumbra relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-6">
      <div className="relative mx-auto w-full max-w-sm text-center">
        <Marca alto="clamp(4.4rem,17vh,8rem)" className="mx-auto" />

        <h1 className="mt-[clamp(0.5rem,1.6vh,1rem)] font-[family-name:var(--font-display)] text-[clamp(1.75rem,7.2vh,3rem)] leading-tight text-crema [text-shadow:0_2px_10px_rgba(0,0,0,0.85)]">
          Truco Uruguayo
        </h1>

        {/* La línea de abajo decía "Aprendelo de cero y jugalo. Con muestra,
            con flor y gratis." y hacía un énfasis raro en el precio. El
            "gratis" no se perdió: sigue en el `<title>` y en la `description`
            de `app/layout.tsx`, que es donde lo lee Google. Acá se cuenta lo
            que se hace. */}
        <p className="mx-auto mt-2 max-w-[19rem] text-[clamp(0.86rem,2.1vh,1.05rem)] leading-relaxed text-crema/70">
          Aprendé a jugar al truco uruguayo y recorré el país enfrentando a los mejores.
        </p>

        {/* ─── Las tres puertas ─────────────────────────────────────────
            En columna y anchas: en un celular dos botones al lado quedan
            angostos, y la decisión es de UNO, no de dos.

            OJO CON LOS TEXTOS: `herramientas/mirar-web.mjs:105-119` busca los
            tres literalmente, y el de "Jugar" por IGUALDAD EXACTA. Cambiar uno
            deja la prueba mirando cero elementos y siguiendo en verde con la
            navegación rota, que es el error del 7/9/2026. */}
        <div className="mt-[clamp(1.1rem,4vh,2.2rem)] flex flex-col gap-3">
          <Link
            href="/aprender"
            className="rounded bg-dorado px-7 py-[clamp(0.8rem,2.7vh,1.2rem)] font-[family-name:var(--font-ui)] text-[clamp(1rem,2.5vh,1.125rem)] uppercase tracking-wide text-tinta transition-colors hover:bg-dorado-claro"
          >
            Aprender a jugar
          </Link>
          <Link
            href="/jugar"
            className="rounded border-2 border-crema/30 px-7 py-[clamp(0.8rem,2.7vh,1.2rem)] font-[family-name:var(--font-ui)] text-[clamp(1rem,2.5vh,1.125rem)] uppercase tracking-wide text-crema transition-colors hover:border-dorado/70 hover:bg-black/25"
          >
            Jugar
          </Link>
          {/* LA TERCERA PUERTA, DESDE EL 8/9/2026.
              Va apagada a propósito —borde más tenue, letra más chica— y no
              porque valga menos: las otras dos son la app, ésta es una
              herramienta. Alguien que entra por primera vez tiene que elegir
              entre aprender y jugar, no entre tres cosas del mismo peso.

              Y es la única que sirve SIN la app: es para cuando estás jugando
              con las cartas en la mano. */}
          {/* BLOQUEADO EN LA APP, DESDE EL 2/10/2026: se abre una vez mirando un
              video y queda abierto para siempre. El candado va adelante del
              nombre y la línea de abajo dice cómo se abre, así se entiende
              ANTES de tocar. En la web no hay candado: no se dibuja nada de
              esto. Lo de abajo cambia con CSS según `data-bloqueado`. */}
          <EntradaAnotador
            etiquetaBloqueado="Anotador, bloqueado: se desbloquea una sola vez mirando un video corto"
            className="group rounded border-2 border-crema/15 px-7 py-[clamp(0.55rem,2vh,0.85rem)] font-[family-name:var(--font-ui)] text-[clamp(0.85rem,2.1vh,1rem)] uppercase tracking-wide text-crema/70 transition-colors hover:border-dorado/50 hover:bg-black/25 hover:text-crema data-[bloqueado=true]:border-dorado/35"
          >
            Anotador
            <Candado className="relative -top-px ml-1.5 hidden h-[1.05em] w-[1.05em] align-middle text-dorado group-data-[bloqueado=true]:inline-block" />
            <span className="mt-0.5 block font-[family-name:var(--font-texto)] text-[clamp(0.68rem,1.5vh,0.78rem)] normal-case tracking-normal text-crema/45 group-data-[bloqueado=true]:hidden">
              La tablita, para jugar con cartas de verdad
            </span>
            <span className="mt-0.5 hidden font-[family-name:var(--font-texto)] text-[clamp(0.68rem,1.5vh,0.78rem)] normal-case tracking-normal text-dorado/80 group-data-[bloqueado=true]:block">
              Se desbloquea una vez, con un video corto
            </span>
          </EntradaAnotador>
        </div>
      </div>
    </section>
  );
}
