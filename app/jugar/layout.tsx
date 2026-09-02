import type { Metadata } from "next";
import { Caveat } from "next/font/google";

/**
 * LA MANUSCRITA SE CARGA ACÁ Y NO EN EL LAYOUT DEL SITIO.
 *
 * Es la tipografía más pesada de las cuatro —74,5 KB del subconjunto latino,
 * más que las otras tres juntas— y se usa en exactamente cuatro lugares, todos
 * abajo de `/jugar`: la libreta y el marcador, el globo del verso, las paradas
 * del mapa de la gira y el marcador del cartel de fin.
 *
 * Estando declarada en `app/layout.tsx`, su variable colgaba del `<html>` y
 * Next la PRECARGABA en todas las páginas: la portada, las ocho lecciones y las
 * dos legales se bajaban 74,5 KB de una letra manuscrita que no usan. Medido
 * sobre `out/`: de 139 KB de tipografía precargada, 74,5 eran ésta.
 *
 * Acá abajo la precarga sólo la mesa y la gira, que son las que la usan. El
 * resto del sitio baja 64,5 KB en vez de 139.
 *
 * OJO CON EL ENVOLTORIO. Tiene que pasar la cadena de flex tal cual: `main` es
 * `flex min-h-0 flex-1 flex-col` y las tres páginas de acá abajo cuelgan de eso
 * para ocupar el alto exacto de la ventana. Si se le corta, la mesa scrollea, y
 * una mesa que scrollea no se puede jugar. Lo verifica `mirar-mesa.mjs` en los
 * siete tamaños.
 */
const manuscrita = Caveat({
  subsets: ["latin"],
  variable: "--fuente-mano",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jugar contra el bot",
  description:
    "Practicá truco uruguayo mano a mano contra un bot, con la muestra, las piezas, el envido, la flor y el truco. Gratis y sin registro.",
};

export default function LayoutJugar({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${manuscrita.variable} flex min-h-0 flex-1 flex-col`}>{children}</div>
  );
}
