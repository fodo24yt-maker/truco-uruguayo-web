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
  /**
   * Qué tan bien elige la carta que tira, de 0 a 1.
   *
   * En 1 juega el manual: la más baja que gana, y la más alta al abrir. Más
   * abajo se le escapan los dos errores que nombra reglas.txt 16.3 —guardarse
   * la mata para la tercera, matar con la más alta cuando alcanzaba una chica—.
   * Es la diferencia que MÁS se siente jugando contra ellos: las manos de truco
   * se ganan y se pierden acá, no en con qué tanto se canta.
   */
  criterio: number;
  /**
   * Cuánto te lee, de 0 a 1. Multiplica todo el ajuste de lectura.ts.
   *
   * En 0 no mira nada de lo que hacés: juega sus cartas y ya. En 1 te tiene
   * fichado y te cobra las mentiras. Es el dial que mantiene la gira en
   * escalera sin tener que tocar todo lo demás.
   */
  lectura: number;
  /**
   * Cada cuánto canta con un verso en vez de cantar pelado, de 0 a 1.
   *
   * Es puro color: no cambia una sola regla ni una sola decisión, sólo cómo
   * suena. Los de 1 y 2 estrellas están en 0 —recién están aprendiendo el
   * juego, no la mesa— y de ★3 para arriba empiezan a versear cada vez más.
   * Las coplas están en versos.ts.
   */
  verso: number;

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
  // OJO CON ESTA TABLA: la versión anterior estaba dada vuelta.
  //
  // Se había armado suponiendo que "más difícil = canta más, quiere más,
  // miente más". Midiéndolo resultó al revés: querer con el umbral bajo es
  // pagar apuestas perdidas, y mentir sólo rinde si el otro te cree. Luki, el
  // primero de la gira, le ganaba a El Melo el 61% de las veces.
  //
  // Ahora los umbrales de QUERER bajan hacia el punto que conviene a medida que
  // sube el nivel, en vez de pasarse de largo. Los de abajo se van demasiado
  // seguido —lo que los hace fáciles de mentir, y transparentes: si cantan,
  // tienen— y los de arriba pagan a ver en el momento justo.
  //
  // Se calibra con `node herramientas/medir-bots.mjs`, que saca la tabla de
  // winrates. Hay un test (dificultad.test.ts) que no deja que se vuelva a dar
  // vuelta sin que nadie se entere.
  // Los dos umbrales de QUERER son los que más pesan, y cada uno tiene su punto
  // justo, medido con el banco de pruebas: el envido conviene quererlo con 29 y
  // el truco con 0,29. Los niveles bajos se alejan de ahí, cada uno para el
  // lado que le da carácter:
  //
  //   · del TRUCO se van de más (0,55): por eso es tan fácil mentirles. Le
  //     cantás truco con un cuatro y se achican.
  //   · el ENVIDO lo pagan de más (22): todavía no saben cuándo su tanto es
  //     malo, así que te quieren cualquier cosa. Es el vicio más caro que hay
  //     —13 puntos de winrate— y el que más rápido se aprende a explotar.
  //
  // Los de arriba juegan los dos en el punto y encima te leen.
  const tabla = {
    1: { cantaEnvidoCon: 30, quiereEnvidoCon: 20, subeEnvidoCon: 34, cantaTrucoCon: 0.82, quiereTrucoCon: 0.58, subeTrucoCon: 0.88, sentidoComun: 0.15 },
    2: { cantaEnvidoCon: 29, quiereEnvidoCon: 22, subeEnvidoCon: 33, cantaTrucoCon: 0.78, quiereTrucoCon: 0.5, subeTrucoCon: 0.82, sentidoComun: 0.35 },
    3: { cantaEnvidoCon: 28, quiereEnvidoCon: 24, subeEnvidoCon: 32, cantaTrucoCon: 0.73, quiereTrucoCon: 0.44, subeTrucoCon: 0.75, sentidoComun: 0.6 },
    4: { cantaEnvidoCon: 26, quiereEnvidoCon: 26, subeEnvidoCon: 31, cantaTrucoCon: 0.67, quiereTrucoCon: 0.36, subeTrucoCon: 0.68, sentidoComun: 0.85 },
    5: { cantaEnvidoCon: 25, quiereEnvidoCon: 28, subeEnvidoCon: 30, cantaTrucoCon: 0.62, quiereTrucoCon: 0.29, subeTrucoCon: 0.55, sentidoComun: 1 },
  } as const;
  return tabla[nivel];
}

// La flor promedio anda por 34. Querer un "con flor envido" con menos que eso
// es regalar 6 puntos, así que el umbral bueno está ARRIBA, no abajo: los de
// nivel alto quieren cerca del promedio y los principiantes se achican de más.
const FLOR_POR_NIVEL = {
  1: { contraflorCon: 45, conFlorEnvidoCon: 40, quiereFlorCon: 37 },
  2: { contraflorCon: 43, conFlorEnvidoCon: 38, quiereFlorCon: 36 },
  3: { contraflorCon: 41, conFlorEnvidoCon: 36, quiereFlorCon: 35 },
  4: { contraflorCon: 39, conFlorEnvidoCon: 35, quiereFlorCon: 34 },
  5: { contraflorCon: 38, conFlorEnvidoCon: 34, quiereFlorCon: 33 },
} as const;

/**
 * Cuántos errores comete con las cartas, cuánto te lee y cuánto versea.
 *
 * `verso` no toca el juego: es cada cuánto canta con una copla en vez de decir
 * el canto pelado. Va de la mano del oficio a propósito —el que sabe jugar es
 * el que sabe versear— y arranca recién en ★3, para que se note el salto
 * cuando la gira sale del área metropolitana.
 */
const OFICIO_POR_NIVEL = {
  // `criterio` se volvió a medir al arreglar la flor. Antes iba
  // 0,35 · 0,52 · 0,62 · 0,72 · 1: apretado en el medio y con un salto grande
  // al final. Eso no se notaba porque la contraflor al resto tapaba el hueco
  // —los niveles altos la cantaban de entrada y se llevaban partidas enteras—,
  // y esa jugada NO EXISTE: contraflorearle a nadie no se puede. Sacada de la
  // lista de cantos válidos, el escalón ★4→★5 quedó en 50,1% y ★3→★2 en 49,3%:
  // dos niveles seguidos que jugaban igual.
  //
  // Repartido parejo, cada escalón vuelve a ganarle al anterior por 51-54% y
  // el ★5 le gana al ★1 por 62%. Medido con 3.600 partidas por escalón:
  //     node herramientas/medir-bots.mjs
  1: { criterio: 0.3, lectura: 0, verso: 0 },
  2: { criterio: 0.46, lectura: 0, verso: 0 },
  3: { criterio: 0.62, lectura: 0.3, verso: 0.3 },
  4: { criterio: 0.8, lectura: 0.55, verso: 0.45 },
  5: { criterio: 1, lectura: 1, verso: 0.6 },
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
    nivel: 1, mentira: 0.02, silencio: 0.05,
    descripcion: "Juega en el liceo y no salió nunca de ahí. Si canta, tiene: no sabe mentir.",
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
  ...OFICIO_POR_NIVEL[s.nivel],
}));

/** El primero de la gira: el rival con el que conviene aprender. */
export const LUKI = PERSONALIDADES[0];

/** Compatibilidad con el modo de partida rápida. */
export const EL_CHUECO = LUKI;

export const buscarPersonalidad = (id: string) =>
  PERSONALIDADES.find((p) => p.id === id) ?? LUKI;

export const porDepartamento = (departamento: string) =>
  PERSONALIDADES.find((p) => p.departamento === departamento);
