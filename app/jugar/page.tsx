import type { Metadata } from "next";

import { Carta } from "@/components/Carta";
import { EntradaPartida } from "@/components/EntradaJuego";
import { PrecargaEscenas } from "@/components/PrecargaEscenas";
import { desdeTexto } from "@/lib/motor/baraja";

export const metadata: Metadata = {
  alternates: { canonical: "/jugar" },
};

/**
 * El menú de jugar.
 *
 * Es una pantalla y no una página: dos opciones y se elige. Por eso lleva
 * `pantalla-fija`, que esconde el pie y le fija el alto al body. Sin eso, a
 * 360×640 —el celular apretado— la página scrolleaba 205 px y había que
 * arrastrar para ver la gira, que es la mitad de lo que hay para elegir.
 *
 * Los espacios van en `clamp(…vh…)` y no en un número fijo por la regla de la
 * casa: **el problema siempre es la pantalla BAJA, no la angosta**. Con `py-10`
 * y `mt-8` clavados, lo que sobraba en un celular normal era justo lo que
 * faltaba en uno chico.
 *
 * Las dos puertas son `EntradaPartida` y no un `<Link>` pelado: pasan por
 * `lib/entrada.ts`, que es el único que decide si se entra, si antes va un
 * anuncio o si la Gira está cerrada (en la app, hasta terminar Aprender o
 * mirar un video). Partida rápida está libre siempre.
 */
export default function ElegirModo() {
  return (
    <div className="pantalla-fija tabla-mesa relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-[clamp(0.75rem,3vh,2.5rem)]">
      <h1 className="text-center font-[family-name:var(--font-display)] text-[clamp(1.5rem,4.5vh,2.25rem)] text-crema">
        ¿Cómo querés jugar?
      </h1>

      <div className="mt-[clamp(1rem,3.5vh,2rem)] grid w-full max-w-2xl gap-[clamp(0.6rem,2vh,1rem)] sm:grid-cols-2">
        {/* Partida suelta */}
        <EntradaPartida
          pedido={{ modo: "rapida" }}
          className="group flex flex-col rounded border-2 border-crema/15 bg-black/40 p-[clamp(0.75rem,2.5vh,1.25rem)] transition-colors hover:border-dorado/60 hover:bg-black/55"
        >
          <div className="mb-[clamp(0.4rem,1.5vh,0.75rem)] flex gap-1.5">
            <Carta carta={desdeTexto("1E")} className="w-[clamp(32px,5.5vh,44px)] -rotate-6" />
            <Carta carta={desdeTexto("7O")} className="w-[clamp(32px,5.5vh,44px)] rotate-3" />
          </div>
          <span className="font-[family-name:var(--font-ui)] text-[clamp(1rem,2.8vh,1.25rem)] uppercase tracking-wide text-crema">
            Partida rápida
          </span>
          <span className="mt-1 text-[clamp(0.78rem,1.9vh,0.875rem)] leading-snug text-crema/65">
            Una partida suelta contra el rival que elijas. Ideal para practicar
            un canto puntual.
          </span>
        </EntradaPartida>

        {/* La gira. En la app tiene candado hasta terminar Aprender o mirar un
            video, una vez: el candado va en la esquina y la descripción pasa a
            decir cómo se abre, así se entiende antes de tocar. Partida rápida
            no lleva nada: el que ya sabe jugar entra directo. */}
        <EntradaPartida
          pedido={{ modo: "gira" }}
          conCandado
          etiquetaBloqueado="Gira nacional, bloqueada: se desbloquea terminando Aprender o mirando un video"
          className="group flex flex-col rounded border-2 border-dorado/40 bg-black/40 p-[clamp(0.75rem,2.5vh,1.25rem)] transition-colors hover:border-dorado hover:bg-black/55"
        >
          <div className="mb-[clamp(0.4rem,1.5vh,0.75rem)] flex gap-1.5">
            <Carta carta={desdeTexto("2O")} className="w-[clamp(32px,5.5vh,44px)] -rotate-3" pieza />
            <Carta carta={desdeTexto("4O")} className="w-[clamp(32px,5.5vh,44px)] rotate-6" pieza />
          </div>
          <span className="font-[family-name:var(--font-ui)] text-[clamp(1rem,2.8vh,1.25rem)] uppercase tracking-wide text-dorado">
            Gira nacional
          </span>
          <span className="mt-1 text-[clamp(0.78rem,1.9vh,0.875rem)] leading-snug text-crema/65 group-data-[bloqueado=true]:hidden">
            Diecinueve rivales, uno por departamento. Recorrés todo el Uruguay
            jugando truco.
          </span>
          <span className="mt-1 hidden text-[clamp(0.78rem,1.9vh,0.875rem)] leading-snug text-dorado/85 group-data-[bloqueado=true]:block">
            Se abre al terminar Aprender, o una sola vez con un video corto.
          </span>
        </EntradaPartida>
      </div>

      <p className="mt-[clamp(0.75rem,3vh,2rem)] max-w-md text-center text-[clamp(0.72rem,1.8vh,0.875rem)] text-crema/45">
        Las dos son gratis y no hace falta registrarse. Lo que ganes se guarda
        en este dispositivo.
      </p>

      {/* No dibuja nada: baja las imágenes de las mesas probables mientras
          elegís, para que la mesa entre entera. */}
      <PrecargaEscenas />
    </div>
  );
}
