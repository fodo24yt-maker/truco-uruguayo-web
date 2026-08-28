/**
 * Los rivales: uno por cada departamento del Uruguay.
 *
 * El bot es UNO SOLO. Lo que cambia de rival en rival son estos números: con
 * qué tanto canta, cuánto miente, cuánto se guarda. El mentiroso de Rocha y el
 * mozo de Ciudad Vieja corren exactamente el mismo código.
 *
 * El orden de `paso` es el de la gira: arranca en Montevideo y termina en
 * Melo, Cerro Largo. El recorrido sube por estrellas, así que la dificultad
 * nunca baja de un paso al siguiente: hay un test que lo verifica.
 */

export interface Personalidad {
  id: string;
  nombre: string;
  /** El departamento, tal como se llama en el mapa. */
  departamento: string;
  /** La ciudad o el barrio de donde es, para darle color. */
  lugar: string;
  /** De 1 a 5. */
  dificultad: number;
  /** Lugar en la gira: 1 es Montevideo, 19 es Melo. */
  paso: number;
  /** Cómo juega, en una línea, para que sepas a qué atenerte. */
  descripcion: string;

  // ── Envido ────────────────────────────────────────────────────────────
  cantaEnvidoCon: number;
  quiereEnvidoCon: number;
  subeEnvidoCon: number;

  // ── Truco ─────────────────────────────────────────────────────────────
  cantaTrucoCon: number;
  quiereTrucoCon: number;
  subeTrucoCon: number;

  // ── Carácter ──────────────────────────────────────────────────────────
  /** Probabilidad de cantar igual sin tener con qué. 0 = incapaz de mentir. */
  mentira: number;
  /** Probabilidad de callarse un canto que podría hacer. */
  silencio: number;
  /**
   * Qué tanto se fija en lo que hay sobre la mesa antes de cantar, de 0 a 1.
   *
   * En 1 nunca canta truco si la carta que tiró el rival ya le ganó a todo lo
   * que le queda: sabe que esa baza está perdida. En 0 canta igual, como el
   * que se entusiasma sin mirar. Es lo que separa a un rival duro de uno que
   * regala puntos.
   */
  sentidoComun: number;

  // ── Flor ──────────────────────────────────────────────────────────────
  contraflorCon: number;
  conFlorEnvidoCon: number;
  quiereFlorCon: number;
}

/**
 * Arma una personalidad a partir de un nivel base, para no repetir 19 veces
 * los mismos números. Después cada rival ajusta lo suyo.
 */
function segunNivel(nivel: 1 | 2 | 3 | 4 | 5) {
  const tabla = {
    1: { cantaEnvidoCon: 27, quiereEnvidoCon: 26, subeEnvidoCon: 32, cantaTrucoCon: 0.74, quiereTrucoCon: 0.44, subeTrucoCon: 0.82, sentidoComun: 0.15 },
    2: { cantaEnvidoCon: 26, quiereEnvidoCon: 25, subeEnvidoCon: 31, cantaTrucoCon: 0.7, quiereTrucoCon: 0.4, subeTrucoCon: 0.76, sentidoComun: 0.4 },
    3: { cantaEnvidoCon: 26, quiereEnvidoCon: 25, subeEnvidoCon: 30, cantaTrucoCon: 0.66, quiereTrucoCon: 0.36, subeTrucoCon: 0.72, sentidoComun: 0.65 },
    4: { cantaEnvidoCon: 25, quiereEnvidoCon: 24, subeEnvidoCon: 29, cantaTrucoCon: 0.62, quiereTrucoCon: 0.33, subeTrucoCon: 0.68, sentidoComun: 0.85 },
    5: { cantaEnvidoCon: 24, quiereEnvidoCon: 23, subeEnvidoCon: 28, cantaTrucoCon: 0.58, quiereTrucoCon: 0.3, subeTrucoCon: 0.64, sentidoComun: 1 },
  } as const;
  return tabla[nivel];
}

const FLOR_POR_NIVEL = {
  1: { contraflorCon: 44, conFlorEnvidoCon: 37, quiereFlorCon: 35 },
  2: { contraflorCon: 42, conFlorEnvidoCon: 35, quiereFlorCon: 33 },
  3: { contraflorCon: 40, conFlorEnvidoCon: 34, quiereFlorCon: 32 },
  4: { contraflorCon: 37, conFlorEnvidoCon: 31, quiereFlorCon: 29 },
  5: { contraflorCon: 35, conFlorEnvidoCon: 29, quiereFlorCon: 27 },
} as const;

interface Semilla {
  id: string;
  nombre: string;
  departamento: string;
  lugar: string;
  nivel: 1 | 2 | 3 | 4 | 5;
  descripcion: string;
  mentira: number;
  silencio: number;
}

/**
 * Los 19, en el orden de la gira.
 *
 * El orden ES el recorrido: `paso` sale del índice de este array. Y el
 * recorrido sube por dificultad, no por geografía: arranca en el área
 * metropolitana, hace el este y la costa, cruza el centro hacia el oeste, sube
 * todo el litoral desde Colonia, y termina cruzando el norte gaucho, que es
 * donde está el truco bravo de verdad.
 */
const SEMILLAS: Semilla[] = [
  // ── ★1 · El área metropolitana: acá se aprende ──────────────────────────
  {
    id: "luki", nombre: "Luki", departamento: "Montevideo", lugar: "La Blanqueada",
    nivel: 1, mentira: 0.05, silencio: 0.1,
    descripcion: "Juega en el liceo y no salió nunca de ahí. Canta lo que tiene, nada más.",
  },
  {
    id: "la-coca", nombre: "La Coca", departamento: "Canelones", lugar: "Las Piedras",
    nivel: 1, mentira: 0.12, silencio: 0,
    descripcion: "Feriante. Canta envido en todas las manos, tenga o no tenga.",
  },
  {
    id: "el-rulo", nombre: "El Rulo", departamento: "San José", lugar: "Ciudad del Plata",
    nivel: 1, mentira: 0.08, silencio: 0.2,
    descripcion: "Tranquilo y previsible. Si no canta, no tiene.",
  },

  // ── ★2 · El este y la costa ─────────────────────────────────────────────
  {
    id: "tito", nombre: "Tito", departamento: "Florida", lugar: "Sarandí Grande",
    nivel: 2, mentira: 0.15, silencio: 0.05,
    descripcion: "Juega siempre igual. Agarrale el ritmo y lo tenés.",
  },
  {
    id: "la-nelly", nombre: "La Nelly", departamento: "Lavalleja", lugar: "Minas",
    nivel: 2, mentira: 0.1, silencio: 0.35,
    descripcion: "Callada. Te deja hablar a vos y after te cobra.",
  },
  {
    id: "marito", nombre: "Marito", departamento: "Maldonado", lugar: "Piriápolis",
    nivel: 2, mentira: 0.25, silencio: 0.1,
    descripcion: "De temporada. Se entusiasma rápido y canta de más.",
  },
  {
    id: "el-pescador", nombre: "El Pescador", departamento: "Rocha", lugar: "La Paloma",
    nivel: 2, mentira: 0.3, silencio: 0.15,
    descripcion: "Paciencia de pescador: te tira el anzuelo y espera que piques.",
  },

  // ── ★3 · El centro, de este a oeste ─────────────────────────────────────
  {
    id: "don-aparicio", nombre: "Don Aparicio", departamento: "Treinta y Tres", lugar: "Vergara",
    nivel: 3, mentira: 0.12, silencio: 0.4,
    descripcion: "Olimareño de ley. No apura nada y no se le escapa una cuenta.",
  },
  {
    id: "cachila", nombre: "Cachila", departamento: "Durazno", lugar: "Sarandí del Yí",
    nivel: 3, mentira: 0.2, silencio: 0.25,
    descripcion: "Mira el marcador antes que las cartas. Te canta la falta justo.",
  },
  {
    id: "el-trinitario", nombre: "El Trinitario", departamento: "Flores", lugar: "Trinidad",
    nivel: 3, mentira: 0.22, silencio: 0.3,
    descripcion: "De pueblo chico y mesa grande. Juega el envido como nadie.",
  },
  {
    id: "la-rosa", nombre: "La Rosa", departamento: "Soriano", lugar: "Mercedes",
    nivel: 3, mentira: 0.3, silencio: 0.35,
    descripcion: "No pierde una mano por apurada. Te deja creer que vas ganando.",
  },

  // ── ★4 · El litoral, subiendo, y la frontera ────────────────────────────
  {
    id: "el-tucho", nombre: "El Tucho", departamento: "Colonia", lugar: "Carmelo",
    nivel: 4, mentira: 0.38, silencio: 0.4,
    descripcion: "Carmelero de mesa larga. Miente cuando conviene, y nunca cuando no.",
  },
  {
    id: "el-fray", nombre: "El Fray", departamento: "Río Negro", lugar: "Fray Bentos",
    nivel: 4, mentira: 0.26, silencio: 0.3,
    descripcion: "Sabe esperar. Si te quiere el truco, andá con cuidado.",
  },
  {
    id: "beto", nombre: "Beto", departamento: "Paysandú", lugar: "Paysandú",
    nivel: 4, mentira: 0.32, silencio: 0.22,
    descripcion: "Sanducero de bar. Te canta el retruco sin despeinarse.",
  },
  {
    id: "don-ramon", nombre: "Don Ramón", departamento: "Salto", lugar: "Salto",
    nivel: 4, mentira: 0.22, silencio: 0.35,
    descripcion: "Citricultor. Cuenta las piezas antes de que las des vuelta.",
  },
  {
    id: "el-piedra", nombre: "El Piedra", departamento: "Artigas", lugar: "Bella Unión",
    nivel: 4, mentira: 0.28, silencio: 0.3,
    descripcion: "Duro como las amatistas de allá. No regala una sola mano.",
  },
  {
    id: "joao", nombre: "Joao", departamento: "Rivera", lugar: "Rivera",
    nivel: 4, mentira: 0.4, silencio: 0.2,
    descripcion: "Mitad y mitad, como la frontera. Nunca sabés si te está cargando.",
  },

  // ── ★5 · El norte gaucho: los últimos dos ───────────────────────────────
  {
    id: "peralta", nombre: "El Gaucho Peralta", departamento: "Tacuarembó", lugar: "Paso de los Toros",
    nivel: 5, mentira: 0.18, silencio: 0.35,
    descripcion: "De la Patria Gaucha. Aguanta, aguanta, y te liquida en la tercera.",
  },
  {
    id: "el-melo", nombre: "El Melo", departamento: "Cerro Largo", lugar: "Melo",
    nivel: 5, mentira: 0.35, silencio: 0.15,
    descripcion: "El último de la gira. Te canta truco mirándote a los ojos con un cuatro.",
  },
];

export const PERSONALIDADES: Personalidad[] = SEMILLAS.map((s, i) => ({
  id: s.id,
  nombre: s.nombre,
  departamento: s.departamento,
  lugar: s.lugar,
  dificultad: s.nivel,
  paso: i + 1,
  descripcion: s.descripcion,
  mentira: s.mentira,
  silencio: s.silencio,
  ...segunNivel(s.nivel),
  ...FLOR_POR_NIVEL[s.nivel],
}));

/** El primero de la gira: el rival con el que conviene aprender. */
export const LUKI = PERSONALIDADES[0];

/** Compatibilidad con el modo de partida rápida. */
export const EL_CHUECO = LUKI;

export const buscarPersonalidad = (id: string) =>
  PERSONALIDADES.find((p) => p.id === id) ?? LUKI;

export const porDepartamento = (departamento: string) =>
  PERSONALIDADES.find((p) => p.departamento === departamento);
