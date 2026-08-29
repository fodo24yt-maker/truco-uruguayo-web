/**
 * Copyright (c) 2026 fodo24yt-maker. Ver LICENSE en la raíz del repositorio.
 * Código visible, no código libre: se puede leer y estudiar, no republicar
 * ni usar comercialmente.
 *
 * LOS VERSOS DEL TRUCO.
 *
 * En la mesa de verdad nadie dice "envido" a secas todo el tiempo: se canta
 * con un verso. Son coplas de payada, de dominio público, que andan hace
 * más de un siglo en las mesas de acá y del litoral argentino.
 *
 * QUÉ HACE ESTE ARCHIVO Y QUÉ NO
 * El bot decide QUÉ cantar (bot.ts) y el motor decide si ese canto es legal
 * (partida.ts). Esto de acá decide solamente CÓMO lo dice, y no toca ni una
 * regla: si sacás este archivo entero, la partida sigue funcionando igual.
 * Por eso vive aparte y no adentro del motor.
 *
 * QUIÉN VERSEA
 * Sólo los rivales de 3, 4 y 5 estrellas. Los de 1 y 2 juegan sus cartas y
 * ya: el verso es oficio de mesa, y el oficio se gana. El número está en
 * `verso` de cada personalidad (personalidades.ts).
 *
 * CÓMO ESTÁ ORDENADA LA LISTA
 * Cada copla de acá se sostiene sola: se entiende sin la anterior ni la que
 * sigue. Las dos que NO se sostienen solas quedaron marcadas, porque el
 * verso nombra algo que tiene que estar pasando en la mesa:
 *
 *   · "No se ponga tan contento / por el envite que ha echao" sólo tiene
 *     sentido si el otro ya cantó envido: le está contestando. Va marcada
 *     `soloSubiendo`.
 *   · "y si es que no me detengo / le digo quiero y retruco" sólo tiene
 *     sentido contestando un truco cantado, porque el verso mismo dice que
 *     lo quiere. Va marcada `soloRespondiendo`.
 *
 * Si no se respeta eso, el rival te dice "no se ponga tan contento" cuando
 * vos no dijiste nada, y el verso queda hablando solo.
 */

import type { Accion, Partida } from "./partida.ts";

/** El canto al que corresponde cada verso. */
export type ClaveVerso =
  | "flor"
  | "contraflor-al-resto"
  | "envido"
  | "real-envido"
  | "falta-envido"
  | "truco"
  | "retruco";

export interface Verso {
  /** Para no repetir dos veces seguidas el mismo. */
  id: string;
  /** Una línea por renglón: así se muestra, como copla y no como párrafo. */
  lineas: readonly string[];
  /** Le contesta a un canto que ya está sobre la mesa (no sirve para abrir). */
  soloSubiendo?: boolean;
  /** Es la respuesta a un canto sin contestar todavía. */
  soloRespondiendo?: boolean;
}

export const VERSOS: Record<ClaveVerso, readonly Verso[]> = {
  flor: [
    {
      id: "flor-parana",
      lineas: [
        "Por el río Paraná",
        "venía navegando un piojo,",
        "con un hachazo en el ojo",
        "y una flor en el ojal.",
      ],
    },
    {
      id: "flor-china",
      lineas: [
        "Para pintar a mi china",
        "no hay pinceles ni pintor,",
        "ni flores en los jardines",
        "comparadas con mi flor.",
      ],
    },
    {
      id: "flor-estancia",
      lineas: [
        "En la estancia del querer",
        "no hay animal que se pierda,",
        "ni mujer que sea lerda",
        "con el criollo trovador,",
        "que pa' cantarle a una flor",
        "se pone a templar la cuerda.",
      ],
    },
    {
      id: "flor-pebeta",
      lineas: [
        "Por querer a una pebeta,",
        "muy estrecha de cadera,",
        "se me quedaron los ojos",
        "como flor de regadera.",
      ],
    },
    {
      id: "flor-pajaro",
      lineas: [
        "Como lágrimas de olvido,",
        "como suspiros de amor,",
        "cantaba sus grandes penas",
        "un pájaro en una flor.",
      ],
    },
  ],

  "contraflor-al-resto": [
    {
      id: "contraflor-cabestro",
      lineas: [
        "El otro día a mi pingo",
        "se le cortó el cabestro,",
        "y al verme pasar un gringo",
        "dijo: ¡contraflor al resto!",
      ],
    },
    {
      id: "contraflor-callado",
      lineas: [
        "Por no quedarme callado",
        "a mi amigo le contesto",
        "que no le temo a nadie",
        "con mi contraflor al resto.",
      ],
    },
  ],

  envido: [
    {
      id: "envido-lazo",
      lineas: [
        "Cuando vine de La Isla",
        "traiba un lazo retorcido;",
        "con él enlacé dos cartas",
        "y con dos le digo envido.",
      ],
    },
  ],

  "real-envido": [
    {
      id: "real-olorosa",
      lineas: [
        "No piense en un descuido…",
        "si no es pa' tanto la cosa,",
        "yo le digo real envido",
        "que es lo mesmo que olorosa.",
      ],
    },
    {
      id: "real-grana",
      lineas: [
        "Con su boquita de grana",
        "y su pelo renegrido,",
        "no envidia a la mañana",
        "este hermoso real envido.",
      ],
    },
  ],

  "falta-envido": [
    {
      id: "falta-paloma",
      lineas: [
        "Una vez una paloma",
        "ofreció darme su nido,",
        "y yo creyendo una broma",
        "no le eché la falta envido.",
      ],
    },
    {
      // Le contesta a un envite ajeno: sin envido cantado enfrente no va.
      id: "falta-contento",
      soloSubiendo: true,
      lineas: [
        "No se ponga tan contento",
        "por el envite que ha echao,",
        "porque escuchará al momento:",
        "¡falta envido, cuñao!",
      ],
    },
  ],

  truco: [
    {
      id: "truco-general",
      lineas: [
        "Los gauchos del General",
        "peleaba con trabuco,",
        "yo peleo con tres cartas",
        "porque estoy jugando al truco.",
      ],
    },
    {
      id: "truco-sapo",
      lineas: [
        "Una carrera corrieron",
        "el sapo y la comadreja,",
        "y el sapo al aventajarla",
        "le dijo truco en la oreja.",
      ],
    },
    {
      id: "truco-convite",
      lineas: [
        "Al truco estamos jugando",
        "dijo el viejo a toda voz,",
        "si me acepta este convite",
        "le parto el ojete en dos.",
      ],
    },
    {
      id: "truco-tordillo",
      lineas: [
        "Aquí me presento yo",
        "en mi tordillo pazuco",
        "pa' contarle los primores",
        "que puede tener el truco.",
      ],
    },
  ],

  retruco: [
    {
      // "le digo QUIERO y retruco": el verso acepta y sube en el mismo aire,
      // así que sólo cabe contestando un truco que está sin responder.
      id: "retruco-cuco",
      soloRespondiendo: true,
      lineas: [
        "Con las cartas que yo tengo",
        "tampoco me asusta el cuco,",
        "y si es que no me detengo",
        "le digo quiero y retruco.",
      ],
    },
  ],
};

/**
 * A qué familia de versos corresponde el canto que está por hacerse.
 *
 * OJO: `p` es la partida ANTES de aplicar la acción. Por eso el truco se mira
 * por `nivel`: en 0 el canto que viene es truco, en 1 es retruco. Después de
 * aplicarlo el número ya subió y la cuenta daría corrida.
 *
 * Los cantos sin verso en la lista —vale cuatro, con flor envido— devuelven
 * null y se cantan pelados, como siempre.
 */
export function claveDelCanto(accion: Accion, p: Partida): ClaveVerso | null {
  switch (accion.tipo) {
    case "flor":
      return "flor";
    case "flor-canto":
      return accion.canto === "contraflor-al-resto" ? "contraflor-al-resto" : null;
    case "envido":
      return accion.canto;
    case "truco":
      return p.truco.nivel === 0 ? "truco" : p.truco.nivel === 1 ? "retruco" : null;
    default:
      return null;
  }
}

/**
 * El verso con el que este rival canta esto, o null si lo canta pelado.
 *
 * `probabilidad` es cuán versero es (0 = nunca, 1 = siempre). `evitar` es el
 * id del último que dijo: no se repite dos veces seguidas, salvo que sea el
 * único que encaja, porque quedarse mudo sería peor.
 *
 * El sorteo de la probabilidad se hace SIEMPRE primero y una sola vez, así el
 * mismo generador de azar da siempre el mismo resultado: es lo que permite
 * testearlo sin que dependa del orden en que se evalúen las condiciones.
 */
export function versoDelCanto(
  accion: Accion,
  p: Partida,
  probabilidad: number,
  azar: () => number = Math.random,
  evitar?: string,
): Verso | null {
  const clave = claveDelCanto(accion, p);
  if (clave === null) return null;
  if (probabilidad <= 0) return null;
  if (azar() >= probabilidad) return null;

  // Qué está pasando en la mesa, para descartar los versos que no encajan.
  const subiendo = p.pendiente?.tipo === "envido";
  const respondiendo = p.pendiente?.tipo === "truco";

  const encajan = VERSOS[clave].filter(
    (v) => (!v.soloSubiendo || subiendo) && (!v.soloRespondiendo || respondiendo),
  );
  if (encajan.length === 0) return null;

  const sinRepetir = encajan.filter((v) => v.id !== evitar);
  const candidatos = sinRepetir.length > 0 ? sinRepetir : encajan;

  return candidatos[Math.floor(azar() * candidatos.length) % candidatos.length];
}
