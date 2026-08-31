/**
 * La cara de cada rival de la gira.
 *
 * NO SON DIECINUEVE DIBUJOS. Es una sola cara con piezas intercambiables —piel,
 * pelo, sombrero, bigote, lentes— y diecinueve fichas que eligen las piezas. Con
 * eso alcanza para que se distingan de un vistazo, y agregar un rival nuevo es
 * una línea, no un dibujo.
 *
 * DÓNDE SE USA. En el medallón, que es el ÚNICO lugar donde se le ve la CARA al
 * rival. Al de la mesa **la cabeza no le entra en el encuadre**: se le ve el
 * torso y los brazos apoyados en la madera, y de los hombros para arriba está
 * fuera del cuadro.
 *
 * Eso cierra una discusión que se dio cuatro veces. Se probó con silueta, con
 * volumen, con desenfoque y con la cara del medallón, y la cabeza siempre
 * terminaba leyéndose como un fantasma. Recortada por el marco deja de haber
 * dónde ponerla, y el problema desaparece en vez de mitigarse.
 *
 * PERO NO ES GRATIS. El sombrero era lo que más distinguía a un rival de otro
 * de lejos, y al recortarlo ese peso pasa entero a LA ROPA. Por eso la ficha
 * tiene ahora `contextura`, `prenda` y `detalle`: sin eso, recortar la cabeza
 * los devuelve a ser todos el mismo bulto.
 *
 * La misma ficha le da al de la mesa el color de la ropa, así que el del
 * medallón y el de la mesa no se pueden contradecir.
 *
 * La clave es el `id` de la personalidad, que es nuestro y nunca sale de la URL.
 */

export type Sombrero = "ala" | "boina" | "gorro" | "gorra" | "panuelo" | "ninguno";
export type PeloCara = "bigote" | "barba" | "chiva" | "ninguno";

/**
 * Cómo está hecho el que se sienta enfrente.
 *
 * Es lo primero que se lee de una persona a la que no le ves la cara: un pibe
 * de liceo no ocupa el mismo ancho de mesa que un gaucho.
 */
export type Contextura = "menudo" | "medio" | "recio";

/**
 * Qué lleva puesto. Con la cabeza fuera del cuadro, ESTO es lo que cuenta de
 * dónde es y a qué se dedica.
 *
 * Va de la city para adentro, que es el mismo viaje que hace la gira: el buzo
 * con capucha es de Montevideo y el poncho es del norte.
 */
export type Prenda =
  | "buzo"
  | "camisa"
  | "cuadros"
  | "campera"
  | "saco"
  | "chaleco"
  | "sueter"
  | "poncho"
  | "chal"
  | "delantal";

/**
 * El detalle chico que lo termina de contar.
 *
 * Uno solo y chico a propósito: es lo que se mira dos veces. El anzuelo en el
 * bolsillo del pescador dice más de él que cualquier cosa que se le pueda poner
 * en la cara.
 */
export type Detalle = "ninguno" | "anzuelo" | "panuelo" | "cadenita" | "lapicera";

export interface Cara {
  piel: string;
  pelo: string;
  sombrero: Sombrero;
  colorSombrero: string;
  peloCara: PeloCara;
  lentes: boolean;
  /** El color de la ropa. Es el que también pinta al de la mesa. */
  ropa: string;
  /** Pelo largo: le cambia la silueta tanto como el sombrero. Sólo el medallón. */
  melena: boolean;
  /** Del cuerpo de la mesa: cuánto ocupa. */
  contextura: Contextura;
  /** Del cuerpo de la mesa: qué lleva puesto. */
  prenda: Prenda;
  /** Del cuerpo de la mesa: la pieza chica que lo termina de contar. */
  detalle: Detalle;
}

const POR_DEFECTO: Cara = {
  piel: "#d9a878",
  pelo: "#3b2a1c",
  sombrero: "ninguno",
  colorSombrero: "#4a3524",
  peloCara: "ninguno",
  lentes: false,
  ropa: "#3f4a55",
  melena: false,
  contextura: "medio",
  prenda: "camisa",
  detalle: "ninguno",
};

/** Las diecinueve fichas, en el orden de la gira. */
export const CARAS: Record<string, Cara> = {
  // ★1 · el área metropolitana
  // Juega en el liceo: el único con buzo con capucha y el único menudo de todos.
  luki: {
    ...POR_DEFECTO,
    piel: "#e3b487", pelo: "#2c1f14", ropa: "#3a5c8a",
    contextura: "menudo", prenda: "buzo", detalle: "ninguno",
  },
  "la-coca": {
    ...POR_DEFECTO,
    piel: "#d69f72", pelo: "#4a2a18", melena: true,
    sombrero: "panuelo", colorSombrero: "#b8452f", ropa: "#a8323f",
    contextura: "medio", prenda: "delantal", detalle: "panuelo",
  },
  "el-rulo": {
    ...POR_DEFECTO,
    piel: "#dcae80", pelo: "#5a3a20", sombrero: "boina", colorSombrero: "#3d4a2c",
    peloCara: "bigote", ropa: "#4e6b2f",
    contextura: "medio", prenda: "campera", detalle: "ninguno",
  },

  // ★2 · el este y la costa
  tito: {
    ...POR_DEFECTO,
    piel: "#cf9d69", pelo: "#33241a", sombrero: "gorra",
    colorSombrero: "#6b4a31", ropa: "#7a5a3a",
    contextura: "medio", prenda: "cuadros", detalle: "ninguno",
  },
  "la-nelly": {
    ...POR_DEFECTO,
    piel: "#dcb08a", pelo: "#8e8a84", melena: true, lentes: true, ropa: "#6d4a6b",
    contextura: "menudo", prenda: "chal", detalle: "cadenita",
  },
  marito: {
    ...POR_DEFECTO,
    piel: "#e0b183", pelo: "#241a12", lentes: true, ropa: "#3f7d96",
    contextura: "medio", prenda: "camisa", detalle: "ninguno",
  },
  "el-pescador": {
    ...POR_DEFECTO,
    piel: "#c58d5c", pelo: "#4a3a2a", sombrero: "gorro", colorSombrero: "#b4642a",
    peloCara: "barba", ropa: "#c07a2c",
    contextura: "recio", prenda: "sueter", detalle: "anzuelo",
  },

  // ★3 · el centro
  "don-aparicio": {
    ...POR_DEFECTO,
    piel: "#c99a6d", pelo: "#a9a29a", sombrero: "ala", colorSombrero: "#3b2c1e",
    peloCara: "bigote", ropa: "#4f5560",
    contextura: "recio", prenda: "chaleco", detalle: "panuelo",
  },
  cachila: {
    ...POR_DEFECTO,
    piel: "#c08b5a", pelo: "#2a1e14", sombrero: "gorra", colorSombrero: "#2f3d24",
    peloCara: "chiva", ropa: "#33512f",
    contextura: "medio", prenda: "camisa", detalle: "lapicera",
  },
  "el-trinitario": {
    ...POR_DEFECTO,
    piel: "#d5a173", pelo: "#42301e", sombrero: "boina", colorSombrero: "#5a3a22",
    peloCara: "bigote", ropa: "#7a5230",
    contextura: "medio", prenda: "saco", detalle: "ninguno",
  },
  "la-rosa": {
    ...POR_DEFECTO,
    piel: "#cd9769", pelo: "#241812", melena: true, ropa: "#9c3552",
    contextura: "menudo", prenda: "chal", detalle: "ninguno",
  },

  // ★4 · el litoral y la frontera
  "el-tucho": {
    ...POR_DEFECTO,
    piel: "#d7a679", sombrero: "ala", colorSombrero: "#6f5636", ropa: "#8a7752",
    contextura: "recio", prenda: "saco", detalle: "ninguno",
  },
  "el-fray": {
    ...POR_DEFECTO,
    piel: "#c08e60", pelo: "#2e2118", sombrero: "gorra", colorSombrero: "#2b3f55",
    peloCara: "barba", ropa: "#2b4a6f",
    contextura: "medio", prenda: "campera", detalle: "ninguno",
  },
  beto: {
    ...POR_DEFECTO,
    piel: "#dda87a", pelo: "#33241a", peloCara: "bigote", ropa: "#8c2f2f",
    contextura: "recio", prenda: "camisa", detalle: "ninguno",
  },
  "don-ramon": {
    ...POR_DEFECTO,
    piel: "#c99a6d", pelo: "#d6d1c8", sombrero: "ala", colorSombrero: "#b8a173",
    peloCara: "barba", ropa: "#c2b18c",
    contextura: "recio", prenda: "chaleco", detalle: "panuelo",
  },
  "el-piedra": {
    ...POR_DEFECTO,
    piel: "#b8814f", pelo: "#241812", sombrero: "ala", colorSombrero: "#5a4128",
    peloCara: "chiva", ropa: "#c06a2a",
    contextura: "recio", prenda: "cuadros", detalle: "ninguno",
  },
  joao: {
    ...POR_DEFECTO,
    piel: "#b07a4c", pelo: "#1f1610", sombrero: "gorra",
    colorSombrero: "#2f5a3a", peloCara: "bigote", ropa: "#4a7a4a",
    contextura: "medio", prenda: "campera", detalle: "ninguno",
  },

  // ★5 · el norte gaucho
  peralta: {
    ...POR_DEFECTO,
    piel: "#b8875a", pelo: "#2a2018", sombrero: "ala", colorSombrero: "#241811",
    peloCara: "barba", ropa: "#2f3a42",
    contextura: "recio", prenda: "poncho", detalle: "panuelo",
  },
  "el-melo": {
    ...POR_DEFECTO,
    piel: "#c08e5e", pelo: "#1e1610", sombrero: "ala", colorSombrero: "#1a1109",
    peloCara: "bigote", ropa: "#3a2f28",
    contextura: "recio", prenda: "poncho", detalle: "ninguno",
  },
};

/** La cara de un rival. Un id desconocido cae en la de por defecto. */
export const caraDe = (id: string): Cara => CARAS[id] ?? POR_DEFECTO;
