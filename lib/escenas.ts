/**
 * Las texturas de cada DEPARTAMENTO. GENERADO: no se edita a mano.
 *
 *     node herramientas/generar-escena.mjs
 *
 * ── Por qué por departamento y no por ambiente ────────────────────────────
 *
 * Hasta el 5/9/2026 eran siete, una por ambiente, y encima de cada una iba una
 * capa `<div>` con `mix-blend-mode: color` que le ponía el tono del
 * departamento. Esa capa se fue: un blend obliga al navegador a leer de vuelta
 * todo lo que dibujó debajo cada vez que algo repinta, y eso es una superficie
 * compuesta más que la GPU del teléfono comprime de a bloques de 4×4 —de donde
 * salen las manchitas—. Ahora el tono viene horneado y son diecinueve.
 *
 * El navegador baja SÓLO las dos imágenes del departamento que estás jugando,
 * así que pesa lo mismo que antes por partida.
 *
 * Las rutas están escritas enteras a propósito, no armadas con plantillas: el
 * departamento entra por la dirección del navegador y una ruta que se arma
 * pegando texto es una ruta que se puede empujar. Acá sólo se puede elegir
 * entre estas diecinueve.
 */

export interface Escena {
  /** La tabla, ya en perspectiva, con el borde lejano recortado y entonada. */
  mesa: string;
  /** El ambiente detrás de la mesa, en tres capas de profundidad. */
  fondo: string;
  /** El color medio, para pintar mientras la textura carga. */
  colorMesa: string;
  colorFondo: string;
  /**
   * El telón, que es lo que asoma por las esquinas transparentes de la mesa
   * —allá arriba, donde la madera ya se terminó—. Lleva el acento con la
   * fuerza de la MESA y no la del fondo, porque quien lo tapaba era la capa de
   * la mesa.
   */
  colorTelon: string;
}

export const ESCENAS: Record<string, Escena> = {
  "Artigas": {
    mesa: "/escenas/artigas-mesa.webp",
    fondo: "/escenas/artigas-fondo.webp",
    colorMesa: "#634728",
    colorFondo: "#473c26",
    colorTelon: "#473c27",
  },
  "Salto": {
    mesa: "/escenas/salto-mesa.webp",
    fondo: "/escenas/salto-fondo.webp",
    colorMesa: "#593e22",
    colorFondo: "#4b3e2b",
    colorTelon: "#4b3e2b",
  },
  "Rivera": {
    mesa: "/escenas/rivera-mesa.webp",
    fondo: "/escenas/rivera-fondo.webp",
    colorMesa: "#624829",
    colorFondo: "#453d27",
    colorTelon: "#463c28",
  },
  "Paysandú": {
    mesa: "/escenas/paysandu-mesa.webp",
    fondo: "/escenas/paysandu-fondo.webp",
    colorMesa: "#5a3e20",
    colorFondo: "#4c3e27",
    colorTelon: "#4c3e28",
  },
  "Tacuarembó": {
    mesa: "/escenas/tacuarembo-mesa.webp",
    fondo: "/escenas/tacuarembo-fondo.webp",
    colorMesa: "#634729",
    colorFondo: "#473c27",
    colorTelon: "#473c27",
  },
  "Cerro Largo": {
    mesa: "/escenas/cerro-largo-mesa.webp",
    fondo: "/escenas/cerro-largo-fondo.webp",
    colorMesa: "#5d4121",
    colorFondo: "#3b341e",
    colorTelon: "#3a3420",
  },
  "Río Negro": {
    mesa: "/escenas/rio-negro-mesa.webp",
    fondo: "/escenas/rio-negro-fondo.webp",
    colorMesa: "#573f22",
    colorFondo: "#48402a",
    colorTelon: "#493f2a",
  },
  "Durazno": {
    mesa: "/escenas/durazno-mesa.webp",
    fondo: "/escenas/durazno-fondo.webp",
    colorMesa: "#5e4023",
    colorFondo: "#3d3221",
    colorTelon: "#3b3322",
  },
  "Treinta y Tres": {
    mesa: "/escenas/treinta-y-tres-mesa.webp",
    fondo: "/escenas/treinta-y-tres-fondo.webp",
    colorMesa: "#5b4123",
    colorFondo: "#383521",
    colorTelon: "#383422",
  },
  "Soriano": {
    mesa: "/escenas/soriano-mesa.webp",
    fondo: "/escenas/soriano-fondo.webp",
    colorMesa: "#583f20",
    colorFondo: "#4a3f28",
    colorTelon: "#4b3e28",
  },
  "Flores": {
    mesa: "/escenas/flores-mesa.webp",
    fondo: "/escenas/flores-fondo.webp",
    colorMesa: "#5e4122",
    colorFondo: "#3d331f",
    colorTelon: "#3b3320",
  },
  "Lavalleja": {
    mesa: "/escenas/lavalleja-mesa.webp",
    fondo: "/escenas/lavalleja-fondo.webp",
    colorMesa: "#583d22",
    colorFondo: "#392f29",
    colorTelon: "#372f2b",
  },
  "Florida": {
    mesa: "/escenas/florida-mesa.webp",
    fondo: "/escenas/florida-fondo.webp",
    colorMesa: "#5d4121",
    colorFondo: "#3b341f",
    colorTelon: "#3a3420",
  },
  "Rocha": {
    mesa: "/escenas/rocha-mesa.webp",
    fondo: "/escenas/rocha-fondo.webp",
    colorMesa: "#5e4124",
    colorFondo: "#543f2b",
    colorTelon: "#533f2b",
  },
  "Colonia": {
    mesa: "/escenas/colonia-mesa.webp",
    fondo: "/escenas/colonia-fondo.webp",
    colorMesa: "#5a3e20",
    colorFondo: "#4d3e27",
    colorTelon: "#4c3e28",
  },
  "San José": {
    mesa: "/escenas/san-jose-mesa.webp",
    fondo: "/escenas/san-jose-fondo.webp",
    colorMesa: "#5b4125",
    colorFondo: "#393422",
    colorTelon: "#383423",
  },
  "Canelones": {
    mesa: "/escenas/canelones-mesa.webp",
    fondo: "/escenas/canelones-fondo.webp",
    colorMesa: "#654d2c",
    colorFondo: "#4e4d40",
    colorTelon: "#4d4d43",
  },
  "Maldonado": {
    mesa: "/escenas/maldonado-mesa.webp",
    fondo: "/escenas/maldonado-fondo.webp",
    colorMesa: "#5d4126",
    colorFondo: "#533f2f",
    colorTelon: "#523f2e",
  },
  "Montevideo": {
    mesa: "/escenas/montevideo-mesa.webp",
    fondo: "/escenas/montevideo-fondo.webp",
    colorMesa: "#4e3319",
    colorFondo: "#291d0d",
    colorTelon: "#291d0f",
  },
};
