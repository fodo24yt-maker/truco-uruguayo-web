/**
 * Las texturas de cada ambiente. GENERADO: no se edita a mano.
 *
 *     node herramientas/generar-escena.mjs
 *
 * Las rutas están escritas enteras a propósito, no armadas con plantillas: el
 * departamento entra por la dirección del navegador y una ruta que se arma
 * pegando texto es una ruta que se puede empujar. Acá sólo se puede elegir
 * entre estas siete.
 */

import type { ClaveAmbiente } from "./ambientes.ts";

export interface Escena {
  /** La tabla, ya en perspectiva y con el borde lejano recortado. */
  mesa: string;
  /** El ambiente detrás de la mesa, en tres capas de profundidad. */
  fondo: string;
  /** El color medio, para pintar mientras la textura carga. */
  colorMesa: string;
  colorFondo: string;
}

export const ESCENAS: Record<ClaveAmbiente, Escena> = {
  "bar-ciudad": {
    mesa: "/escenas/bar-ciudad-mesa.webp",
    fondo: "/escenas/bar-ciudad-fondo.webp",
    colorMesa: "#4e331c",
    colorFondo: "#2c2012",
  },
  "feria": {
    mesa: "/escenas/feria-mesa.webp",
    fondo: "/escenas/feria-fondo.webp",
    colorMesa: "#6c4f2f",
    colorFondo: "#7e837c",
  },
  "campo": {
    mesa: "/escenas/campo-mesa.webp",
    fondo: "/escenas/campo-fondo.webp",
    colorMesa: "#614326",
    colorFondo: "#4a4731",
  },
  "sierra": {
    mesa: "/escenas/sierra-mesa.webp",
    fondo: "/escenas/sierra-fondo.webp",
    colorMesa: "#5b4026",
    colorFondo: "#454145",
  },
  "costa": {
    mesa: "/escenas/costa-mesa.webp",
    fondo: "/escenas/costa-fondo.webp",
    colorMesa: "#634428",
    colorFondo: "#765b45",
  },
  "litoral": {
    mesa: "/escenas/litoral-mesa.webp",
    fondo: "/escenas/litoral-fondo.webp",
    colorMesa: "#5d4124",
    colorFondo: "#695a3f",
  },
  "norte": {
    mesa: "/escenas/norte-mesa.webp",
    fondo: "/escenas/norte-fondo.webp",
    colorMesa: "#684a2d",
    colorFondo: "#5f553d",
  },
};
