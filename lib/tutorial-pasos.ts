/**
 * Los pasos del tutorial de la mesa (`components/TutorialMesa.tsx`), en orden.
 *
 * Cada paso dice qué foto se ve (`a`, la mesa en juego normal; `b`, cuando te
 * cantaron truco), qué se marca en ella y qué se explica. Las zonas son las que
 * mide `herramientas/generar-tutorial.mjs` en la mesa de verdad, y su nombre
 * tiene que existir en `lib/tutorial-fotos.ts`: lo exige
 * `lib/tutorial-pasos.test.ts`.
 *
 * Están separados de la vista para poder leerlos y corregirlos de corrido, como
 * un guion.
 */

export type ZonaDelTutorial =
  | "mano"
  | "muestra"
  | "cantos"
  | "rival"
  | "medallon"
  | "globo"
  | "responder"
  | "historial"
  | "mio"
  | "marcador"
  | "ayudas"
  | "salir";

export interface PasoTutorial {
  foto: "a" | "b";
  /** Lo que se marca. Vacío: se ve la mesa entera, sin apagar nada. */
  zonas: readonly ZonaDelTutorial[];
  titulo: string;
  texto: string;
}

export const PASOS_TUTORIAL: readonly PasoTutorial[] = [
  {
    foto: "a",
    zonas: [],
    titulo: "Así se ve una partida",
    texto: "Te muestro en un minuto dónde está cada cosa de la mesa. Si ya la conocés, tocá Saltar.",
  },
  {
    foto: "a",
    zonas: ["mano"],
    titulo: "Tus cartas",
    texto: "Abajo están tus tres cartas. Cuando te toca, tocá una y la tirás a la mesa. Arriba, con las ayudas prendidas, te dice tu tanto.",
  },
  {
    foto: "a",
    zonas: ["muestra"],
    titulo: "La muestra",
    texto: "La carta dada vuelta al lado del mazo es la muestra: decide cuáles son las piezas, las cartas más bravas de la mano. Abajo dice cuál es.",
  },
  {
    foto: "a",
    zonas: ["cantos"],
    titulo: "Cantar",
    texto: "Para cantar, los botones de abajo: Envido (abre sus opciones), Truco y Mazo, que es irte al mazo y dejar la mano. Si tenés flor, aparece un botón arriba de tus cartas.",
  },
  {
    foto: "a",
    zonas: ["rival"],
    titulo: "Tu rival",
    texto: "Enfrente está tu rival. Arriba a la derecha, su medallón: cómo se llama, de dónde es y sus estrellas, que dicen qué tan bravo juega.",
  },
  {
    foto: "a",
    zonas: ["medallon"],
    titulo: "Cambiar de rival",
    texto: "En Partida rápida, tocá su medallón y elegís contra quién jugar. En la Gira no se cambia: cada departamento tiene el suyo.",
  },
  {
    foto: "b",
    zonas: ["globo"],
    titulo: "Lo que canta él",
    texto: "Cuando tu rival canta, aparece en este globo, abajo de su medallón. Y también lo dice en voz alta.",
  },
  {
    foto: "b",
    zonas: ["responder"],
    titulo: "Responder",
    texto: "Si te cantan, abajo cambian los botones: Quiero o No quiero. Y arriba de ellos, lo que podés subir, como el Retruco.",
  },
  {
    foto: "b",
    zonas: ["historial", "mio"],
    titulo: "Lo que se fue diciendo",
    texto: "Lo anterior queda arriba del globo, más clarito, para no perder el hilo. Lo que decís vos sale a la izquierda, arriba de tus cartas.",
  },
  {
    foto: "a",
    zonas: ["marcador"],
    titulo: "Los puntos",
    texto: "Arriba van los puntos, Yo y Él: palitos de a cinco como en la libreta, con el número al lado. Gana el primero que llega a 30.",
  },
  {
    foto: "a",
    zonas: ["salir", "ayudas"],
    titulo: "Ayudas y Salir",
    texto: "Ayudas te dice tu tanto y por qué no podés cantar algo; si ya sabés, apagalas. Salir te lleva de vuelta al menú.",
  },
  {
    foto: "a",
    zonas: [],
    titulo: "¡Listo!",
    texto: "Ya sabés dónde está cada cosa. Si te olvidás de algo, lo volvés a ver en Ajustes (el engranaje), en «Cómo se usa la mesa».",
  },
];
