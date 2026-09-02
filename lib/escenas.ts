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
    colorFondo: "#291d11",
  },
  "feria": {
    mesa: "/escenas/feria-mesa.webp",
    fondo: "/escenas/feria-fondo.webp",
    colorMesa: "#674c2d",
    colorFondo: "#4c4d46",
  },
  "campo": {
    mesa: "/escenas/campo-mesa.webp",
    fondo: "/escenas/campo-fondo.webp",
    colorMesa: "#5d4024",
    colorFondo: "#383524",
  },
  "sierra": {
    mesa: "/escenas/sierra-mesa.webp",
    fondo: "/escenas/sierra-fondo.webp",
    colorMesa: "#573d25",
    colorFondo: "#343030",
  },
  "costa": {
    mesa: "/escenas/costa-mesa.webp",
    fondo: "/escenas/costa-fondo.webp",
    colorMesa: "#5e4126",
    colorFondo: "#523f2f",
  },
  "litoral": {
    mesa: "/escenas/litoral-mesa.webp",
    fondo: "/escenas/litoral-fondo.webp",
    colorMesa: "#593e22",
    colorFondo: "#4a3e2b",
  },
  "norte": {
    mesa: "/escenas/norte-mesa.webp",
    fondo: "/escenas/norte-fondo.webp",
    colorMesa: "#63472b",
    colorFondo: "#453c2b",
  },
};
