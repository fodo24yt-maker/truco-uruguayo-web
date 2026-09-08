import type { Metadata } from "next";

/**
 * Los metadatos del anotador viven ACÁ y no en la página, y no es un capricho
 * de organización: `app/anotador/page.tsx` es un componente de cliente —lleva
 * estado, escucha toques y guarda en `localStorage`— y Next no deja exportar
 * `metadata` desde un componente de cliente. El layout es de servidor y sí
 * puede. Es el mismo reparto que usa `app/jugar/layout.tsx`.
 *
 * El `canonical` va acá por lo mismo que en el resto: `app/layout.tsx` NO
 * declara ninguno, porque todo lo que declara el layout raíz lo heredan todas
 * las páginas y eso ya hizo que ocho lecciones le dijeran a Google que eran
 * duplicados de la portada.
 *
 * Y ésta sí lleva uno, a diferencia de la mesa y la gira: el anotador es una
 * página que alguien puede estar buscando —"anotador de truco"— y sirve entera
 * sin haber jugado nunca acá.
 */
export const metadata: Metadata = {
  title: "Anotador de truco",
  description:
    "La tablita de anotar del truco uruguayo: dos columnas a 30 puntos, con malas y buenas. Para llevar la cuenta cuando jugás con cartas de verdad. Gratis y sin registro.",
  alternates: { canonical: "/anotador" },
};

export default function LayoutAnotador({ children }: { children: React.ReactNode }) {
  /* Pasa la cadena de flex tal cual —`main` es `flex min-h-0 flex-1 flex-col`—
     porque el anotador cuelga de eso para ocupar el alto exacto de la ventana.
     Si se le corta, la pantalla scrollea. Es la misma advertencia que tiene
     `app/jugar/layout.tsx` para la mesa. */
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
