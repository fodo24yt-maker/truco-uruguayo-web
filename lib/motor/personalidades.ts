/**
 * Las personalidades de los rivales.
 *
 * El bot es uno solo: lo que cambia de rival en rival son estos números. Un
 * mentiroso y un cerrado corren exactamente el mismo código, sólo que uno canta
 * truco con un cuatro y el otro no canta ni con el ancho de espada.
 *
 * Cada personaje de la ruta (ver ideas/concepto.md) es una fila de esta tabla.
 */

export interface Personalidad {
  id: string;
  nombre: string;
  lugar: string;
  /** De 1 a 5, para mostrar en pantalla. */
  dificultad: number;
  /** Cómo juega, en una línea, para que el jugador sepa a qué atenerse. */
  descripcion: string;

  // ── Envido ────────────────────────────────────────────────────────────
  /** Tanto mínimo para cantar envido. Más bajo = más atrevido. */
  cantaEnvidoCon: number;
  /** Tanto mínimo para querer un envido que le cantaron. */
  quiereEnvidoCon: number;
  /** Tanto mínimo para subir a real envido. */
  subeEnvidoCon: number;

  // ── Truco ─────────────────────────────────────────────────────────────
  /** Calidad de mano (0 a 1) mínima para cantar truco. */
  cantaTrucoCon: number;
  /** Calidad mínima para querer un truco. */
  quiereTrucoCon: number;
  /** Calidad mínima para subir a retruco o vale cuatro. */
  subeTrucoCon: number;

  // ── Carácter ──────────────────────────────────────────────────────────
  /**
   * Cuánto miente, de 0 a 1. Es la probabilidad de cantar igual cuando NO
   * tiene con qué. Un 0 es incapaz de mentir; un 0,5 miente una de cada dos.
   */
  mentira: number;
  /**
   * Cuánto se guarda, de 0 a 1. Probabilidad de callarse un canto que sí
   * podría hacer. Sirve para que no sea un reloj: si canta siempre que puede,
   * le leés el tanto exacto.
   */
  silencio: number;

  // ── Flor ──────────────────────────────────────────────────────────────
  /** Valor de flor mínimo para ir a la contraflor al resto. */
  contraflorCon: number;
  /** Valor de flor mínimo para cantar con flor envido. */
  conFlorEnvidoCon: number;
  /** Valor de flor mínimo para querer una apuesta de flor. */
  quiereFlorCon: number;
}

/** El rival de siempre: honesto, tranquilo, el que conviene para aprender. */
export const EL_CHUECO: Personalidad = {
  id: "el-chueco",
  nombre: "El Chueco",
  lugar: "Ciudad Vieja",
  dificultad: 1,
  descripcion: "El mozo. Nunca miente: si canta, tiene.",
  cantaEnvidoCon: 26,
  quiereEnvidoCon: 25,
  subeEnvidoCon: 31,
  cantaTrucoCon: 0.68,
  quiereTrucoCon: 0.38,
  subeTrucoCon: 0.72,
  mentira: 0.0,
  silencio: 0.15,
  contraflorCon: 40,
  conFlorEnvidoCon: 34,
  quiereFlorCon: 32,
};

export const PERSONALIDADES: Personalidad[] = [
  EL_CHUECO,
  {
    id: "la-tota",
    nombre: "La Tota",
    lugar: "Canelones",
    dificultad: 1,
    descripcion: "Canta envido en todas las manos. Truco, casi nunca.",
    cantaEnvidoCon: 20, // canta con cualquier cosa
    quiereEnvidoCon: 22,
    subeEnvidoCon: 30,
    cantaTrucoCon: 0.85, // sólo con mano bárbara
    quiereTrucoCon: 0.45,
    subeTrucoCon: 0.9,
    mentira: 0.1,
    silencio: 0.0, // no se guarda nada
    contraflorCon: 44,
    conFlorEnvidoCon: 36,
    quiereFlorCon: 34,
  },
  {
    id: "machado",
    nombre: "Machado",
    lugar: "Colonia",
    dificultad: 2,
    descripcion: "Juega siempre igual. Aprendé el patrón y lo tenés.",
    cantaEnvidoCon: 27,
    quiereEnvidoCon: 26,
    subeEnvidoCon: 31,
    cantaTrucoCon: 0.7,
    quiereTrucoCon: 0.4,
    subeTrucoCon: 0.75,
    mentira: 0.05,
    silencio: 0.0, // total previsibilidad: siempre canta lo mismo
    contraflorCon: 42,
    conFlorEnvidoCon: 35,
    quiereFlorCon: 33,
  },
  {
    id: "bruno",
    nombre: "Bruno",
    lugar: "Rocha",
    dificultad: 3,
    descripcion: "Mentiroso. Te canta truco con un cuatro y te lo hace creer.",
    cantaEnvidoCon: 24,
    quiereEnvidoCon: 23,
    subeEnvidoCon: 28,
    cantaTrucoCon: 0.5,
    quiereTrucoCon: 0.28, // quiere casi todo
    subeTrucoCon: 0.55,
    mentira: 0.45, // miente casi una de cada dos
    silencio: 0.1,
    contraflorCon: 36,
    conFlorEnvidoCon: 30,
    quiereFlorCon: 28,
  },
  {
    id: "dona-elsa",
    nombre: "Doña Elsa",
    lugar: "Tacuarembó",
    dificultad: 3,
    descripcion: "Paciente. Te deja ganar la primera y te liquida en la tercera.",
    cantaEnvidoCon: 28,
    quiereEnvidoCon: 26,
    subeEnvidoCon: 32,
    cantaTrucoCon: 0.74,
    quiereTrucoCon: 0.42,
    subeTrucoCon: 0.8,
    mentira: 0.12,
    silencio: 0.45, // se guarda mucho: es difícil leerle la mano
    contraflorCon: 41,
    conFlorEnvidoCon: 35,
    quiereFlorCon: 33,
  },
  {
    id: "el-rusito",
    nombre: "El Rusito",
    lugar: "Salto",
    dificultad: 4,
    descripcion: "Fanático de las piezas y la flor. No se le escapa una cuenta.",
    cantaEnvidoCon: 25,
    quiereEnvidoCon: 24,
    subeEnvidoCon: 29,
    cantaTrucoCon: 0.7,
    quiereTrucoCon: 0.36,
    subeTrucoCon: 0.74,
    mentira: 0.2,
    silencio: 0.2,
    contraflorCon: 34, // se juega la partida con flores que otros no arriesgan
    conFlorEnvidoCon: 28,
    quiereFlorCon: 26,
  },
  {
    id: "cacho",
    nombre: "Cacho",
    lugar: "Melo",
    dificultad: 4,
    descripcion: "Mira el marcador antes que las cartas. Te canta la falta en el peor momento.",
    cantaEnvidoCon: 25,
    quiereEnvidoCon: 24,
    subeEnvidoCon: 28,
    cantaTrucoCon: 0.6,
    quiereTrucoCon: 0.32,
    subeTrucoCon: 0.65,
    mentira: 0.32,
    silencio: 0.25,
    contraflorCon: 37,
    conFlorEnvidoCon: 31,
    quiereFlorCon: 29,
  },
];

export const buscarPersonalidad = (id: string) =>
  PERSONALIDADES.find((p) => p.id === id) ?? EL_CHUECO;
