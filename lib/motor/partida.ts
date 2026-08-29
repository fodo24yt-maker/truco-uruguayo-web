/**
 * Copyright (c) 2026 fodo24yt-maker. Ver LICENSE en la raíz del repositorio.
 * Código visible, no código libre: se puede leer y estudiar, no republicar
 * ni usar comercialmente.
 *
 * El estado de una partida mano a mano y las reglas que la gobiernan.
 * Sigue el orden de fases de reglas.txt, sección 6, y la tabla de cantos
 * válidos de la sección 14.
 *
 * Alcance de esta versión: 1 contra 1. La flor SE CANTA A MANO (ver
 * `yaHablo` más abajo y la decisión 6 del apéndice A): hay un botón, y quien
 * no la canta a tiempo la pierde. La interfaz pone una red de seguridad
 * cuando las ayudas están prendidas, pero el motor no sabe nada de eso: acá
 * rige la regla de mesa.
 *
 * LÍMITE CONOCIDO: toda la partida vive en el navegador, así que las cartas del
 * rival están en memoria del cliente. No aparecen en el HTML (se dibujan de
 * dorso), pero alguien decidido puede leerlas con las herramientas de
 * desarrollo. Hoy no importa: no hay ranking, ni premios, ni nada que ganar
 * haciendo trampa contra un bot. El día que haya partidas entre personas o
 * puntajes que se guarden, el estado tiene que mudarse al servidor.
 */

import { type Carta, esMismaCarta, fuerza, repartir } from "./baraja.ts";
import { analizarFlor, type Flor, valorEnvido } from "./tantos.ts";

export type Jugador = "vos" | "rival";
export type ResultadoBaza = Jugador | "parda";
export type CantoEnvido = "envido" | "real-envido" | "falta-envido";
export type CantoFlor = "con-flor-envido" | "contraflor-al-resto";

export const PUNTOS_PARA_GANAR = 30;
export const otro = (j: Jugador): Jugador => (j === "vos" ? "rival" : "vos");

export interface Baza {
  vos: Carta | null;
  rival: Carta | null;
  abre: Jugador;
  ganador: ResultadoBaza | null;
}

export interface Pendiente {
  tipo: "envido" | "truco" | "flor";
  cadena: (CantoEnvido | CantoFlor)[]; // sólo para envido y flor
  de: Jugador; // quién cantó y espera respuesta
}

export interface Evento {
  quien: Jugador | "sistema";
  texto: string;
}

/**
 * El registro de qué hizo cada uno, en limpio. Los `eventos` son texto para
 * mostrar en pantalla; esto es para que el bot pueda repasar la mano sin tener
 * que interpretar frases (ver lectura.ts).
 */
export interface Registro {
  quien: Jugador;
  tipo: Accion["tipo"];
  canto?: CantoEnvido | CantoFlor;
  /** En qué baza pasó: 0, 1 ó 2. */
  baza: number;
}

export interface Partida {
  puntos: Record<Jugador, number>;
  quienEsMano: Jugador;
  muestra: Carta;
  /** Las cartas que todavía quedan por jugar. */
  cartas: Record<Jugador, Carta[]>;
  /**
   * Las tres cartas con las que arrancó cada uno. El envido y la flor se
   * cuentan SIEMPRE con éstas: el tanto no cambia porque hayas tirado una
   * carta. Recalcularlo con la mano ya jugada daba resultados falsos.
   */
  manoInicial: Record<Jugador, Carta[]>;
  flor: Record<Jugador, Flor>;
  bazas: Baza[];
  turno: Jugador;
  pendiente: Pendiente | null;
  /**
   * El truco que quedó esperando porque alguien cantó el envido arriba.
   * "El envido va primero" (reglas.txt 14.1): se resuelve el envido entero y
   * recién ahí vuelve la pregunta del truco a quien la tenía que contestar.
   */
  trucoEnEspera: Pendiente | null;
  envidoCerrado: boolean; // ya se jugó, se rechazó o se pasó la ventana
  florResuelta: boolean; // false mientras hay una flor cantada sin decidir
  florCantada: Record<Jugador, boolean>;
  /**
   * Si ese jugador YA USÓ su primera oportunidad de hablar en la primera baza.
   *
   * Es lo que decide quién puede contestar "el envido va primero" arriba de un
   * truco: sólo el que todavía no habló (reglas.txt 14.2). Si el mano tira
   * carta y después el pie le canta truco, el mano ya gastó su turno y no puede
   * salir con el envido.
   *
   * Cantar envido o flor NO lo gasta: eso es usar el turno para lo que
   * corresponde. Tirar carta, cantar truco o contestar un truco, sí.
   */
  yaHablo: Record<Jugador, boolean>;
  truco: { nivel: number; querido: boolean; cantadoPor: Jugador | null };
  fase: "jugando" | "mano-terminada" | "partida-terminada";
  ganadorMano: Jugador | null;
  ganadorPartida: Jugador | null;
  eventos: Evento[];
  historial: Registro[];
}

export type Accion =
  | { tipo: "jugar"; carta: Carta }
  | { tipo: "envido"; canto: CantoEnvido }
  | { tipo: "flor" } // cantar "¡Flor!"
  | { tipo: "flor-canto"; canto: CantoFlor }
  | { tipo: "truco" }
  | { tipo: "quiero" }
  | { tipo: "no-quiero" }
  | { tipo: "mazo" };

// ─── Puntos de los cantos (reglas.txt 9.3 y 10.1) ────────────────────────────

const VALOR_CANTO: Record<CantoEnvido, number> = {
  envido: 2,
  "real-envido": 3,
  "falta-envido": 0, // se calcula con el marcador
};

export const laFalta = (puntos: Record<Jugador, number>) =>
  PUNTOS_PARA_GANAR - Math.max(puntos.vos, puntos.rival);

/**
 * Lo que vale una cadena de envido. Al rechazar se cobra lo que estaba en
 * juego antes del último canto, con un mínimo de 1: rechazar nunca sale gratis.
 */
export function puntosEnvido(
  cadena: readonly CantoEnvido[],
  puntos: Record<Jugador, number>,
): { querido: number; noQuerido: number } {
  const noQuerido = Math.max(
    cadena.slice(0, -1).reduce((t, c) => t + VALOR_CANTO[c], 0),
    1,
  );
  const querido = cadena.includes("falta-envido")
    ? laFalta(puntos)
    : cadena.reduce((t, c) => t + VALOR_CANTO[c], 0);
  return { querido, noQuerido };
}

/** Truco 2/1, retruco 3/2, vale cuatro 4/3. Sin cantos, la mano vale 1. */
export const puntosTruco = (nivel: number, querido: boolean) =>
  querido ? Math.max(nivel + 1, 1) : Math.max(nivel, 1);

export const NOMBRE_TRUCO = ["truco", "retruco", "vale cuatro"] as const;

// ─── Empezar ────────────────────────────────────────────────────────────────

export function nuevaPartida(azar: () => number = Math.random): Partida {
  return repartirMano(
    {
      puntos: { vos: 0, rival: 0 },
      quienEsMano: "vos",
    },
    azar,
  );
}

/** Reparte una mano nueva conservando el marcador (reglas.txt 6, paso 6). */
export function repartirMano(
  previo: { puntos: Record<Jugador, number>; quienEsMano: Jugador },
  azar: () => number = Math.random,
): Partida {
  const { mano, pie, muestra } = repartir(azar);
  const esMano = previo.quienEsMano;

  const cartas: Record<Jugador, Carta[]> =
    esMano === "vos" ? { vos: mano, rival: pie } : { vos: pie, rival: mano };

  return {
    puntos: { ...previo.puntos },
    quienEsMano: esMano,
    muestra,
    cartas,
    manoInicial: { vos: [...cartas.vos], rival: [...cartas.rival] },
    flor: {
      vos: analizarFlor(cartas.vos, muestra),
      rival: analizarFlor(cartas.rival, muestra),
    },
    bazas: [{ vos: null, rival: null, abre: esMano, ganador: null }],
    turno: esMano,
    pendiente: null,
    trucoEnEspera: null,
    // OJO: el envido arranca ABIERTO aunque alguien tenga flor. Cerrarlo acá
    // sería soplarle al jugador que el rival tiene flor: vería el botón de
    // envido apagado sin que nadie haya cantado nada. Se cierra recién cuando
    // alguien CANTA la flor, o cuando se juega el envido, o cuando se pasa la
    // ventana de la primera baza.
    envidoCerrado: false,
    florResuelta: true,
    florCantada: { vos: false, rival: false },
    yaHablo: { vos: false, rival: false },
    truco: { nivel: 0, querido: false, cantadoPor: null },
    fase: "jugando",
    ganadorMano: null,
    ganadorPartida: null,
    eventos: [],
    historial: [],
  };
}

/**
 * Quién gana la comparación de flores. Empate: gana el mano (reglas 3.3).
 */
function compararFlores(p: Partida): Jugador {
  const { vos, rival } = p.flor;
  return vos.valor === rival.valor ? p.quienEsMano : vos.valor > rival.valor ? "vos" : "rival";
}

/**
 * Muestra en el registro los tantos de flor, recién cuando se resuelve.
 *
 * SÓLO los de quien la cantó. Mostrar la del que se la guardó —o la del que se
 * achicó sin enseñarla— sería contar una carta que nadie puso sobre la mesa: en
 * la mesa de verdad, la flor que no se canta no se ve, y saber que el otro
 * tenía 41 te dice que le quedan tres cartas buenas.
 */
function revelarFlores(p: Partida) {
  for (const quien of ["vos", "rival"] as Jugador[]) {
    if (p.florCantada[quien] && p.flor[quien].tiene) {
      p.eventos.push({ quien, texto: `Flor: ${p.flor[quien].valor}` });
    }
  }
}

/** El equipo se lleva la partida entera: es lo que paga una contraflor al resto. */
function ganarLaPartida(p: Partida, quien: Jugador, motivo: string): Partida {
  p.puntos[quien] = Math.max(p.puntos[quien], PUNTOS_PARA_GANAR);
  p.eventos.push({
    quien: "sistema",
    texto: `${quien === "vos" ? "Vos" : "El rival"} ${motivo}: gana la partida`,
  });
  p.ganadorPartida = quien;
  p.fase = "partida-terminada";
  return p;
}

function sumar(p: Partida, quien: Jugador, puntos: number, motivo: string) {
  p.puntos[quien] += puntos;
  p.eventos.push({
    quien: "sistema",
    texto: `${quien === "vos" ? "Vos" : "El rival"} ${motivo}: +${puntos}`,
  });
  if (p.puntos[quien] >= PUNTOS_PARA_GANAR) {
    p.ganadorPartida = quien;
    p.fase = "partida-terminada";
  }
  return p;
}

// ─── Qué se puede hacer ─────────────────────────────────────────────────────

/** La ventana del envido: primera baza y todavía nadie tiró la segunda carta. */
function ventanaEnvidoAbierta(p: Partida): boolean {
  return !p.envidoCerrado && p.bazas.length === 1;
}

/**
 * ¿Este jugador todavía puede cantar su flor?
 *
 * Tiene que tenerla, no haberla cantado ya, estar en la primera baza y no
 * haber gastado su turno de hablar. Eso último es "flor no cantada, flor
 * perdida" (reglas.txt 8.2): si tiraste carta, se te fue.
 */
function puedeCantarFlor(p: Partida, quien: Jugador): boolean {
  return (
    p.flor[quien].tiene &&
    !p.florCantada[quien] &&
    p.bazas.length === 1 &&
    !p.yaHablo[quien]
  );
}

/** Los cantos de envido que se pueden encadenar arriba de lo ya cantado. */
function envidosPosibles(cadena: readonly CantoEnvido[]): CantoEnvido[] {
  if (cadena.length === 0) return ["envido", "real-envido", "falta-envido"];
  const ultimo = cadena[cadena.length - 1];
  if (ultimo === "falta-envido") return [];
  if (ultimo === "real-envido") return ["falta-envido"];
  return cadena.filter((c) => c === "envido").length < 2
    ? ["envido", "real-envido", "falta-envido"]
    : ["real-envido", "falta-envido"];
}

/**
 * Los cantos con los que se declara flor.
 *
 * "¡Flor!" a secas SIEMPRE que la tengas. "Con flor envido" y "contraflor al
 * resto" SÓLO si el rival ya cantó la suya: las dos son subidas de una flor
 * que ya está sobre la mesa (reglas.txt 8.5, escalones 2 y 3), no formas de
 * abrir. Contraflorearle a nadie no existe.
 *
 * ESTO NO SOPLA NADA. La condición mira `florCantada`, que es lo que el rival
 * DIJO en voz alta, no `flor[rival].tiene`, que son sus cartas. Con esas dos
 * cosas mezcladas sí habría filtración: verías aparecer "contraflor" y sabrías
 * que el otro tiene flor antes de que la cante. Acá los botones salen del
 * registro de la mesa, que es información que cualquiera que esté sentado ahí
 * ya escuchó.
 */
function cantosDeFlor(p: Partida, quien: Jugador): Accion[] {
  const acciones: Accion[] = [{ tipo: "flor" }];
  if (p.florCantada[otro(quien)]) {
    acciones.push(
      { tipo: "flor-canto", canto: "con-flor-envido" },
      { tipo: "flor-canto", canto: "contraflor-al-resto" },
    );
  }
  return acciones;
}

export function accionesPosibles(p: Partida, quien: Jugador): Accion[] {
  if (p.fase !== "jugando" || p.turno !== quien) return [];

  if (p.pendiente) {
    if (p.pendiente.de === quien) return []; // no te respondés a vos mismo
    const acciones: Accion[] = [];

    // ── Te cantaron flor ──────────────────────────────────────────────────
    if (p.pendiente.tipo === "flor") {
      const aSecas = p.pendiente.cadena.length === 0;
      if (aSecas) {
        // La flor a secas no se quiere ni se rechaza (reglas 8.5, escalón 1):
        // o tenés flor y se comparan, o te achicás.
        if (puedeCantarFlor(p, quien)) acciones.push(...cantosDeFlor(p, quien));
        acciones.push({ tipo: "no-quiero" }); // "con flor me achico"
        return acciones;
      }
      acciones.push({ tipo: "quiero" }, { tipo: "no-quiero" });
      if (!p.pendiente.cadena.includes("contraflor-al-resto")) {
        acciones.push({ tipo: "flor-canto", canto: "contraflor-al-resto" });
      }
      return acciones;
    }

    acciones.push({ tipo: "quiero" }, { tipo: "no-quiero" });

    // ── Te cantaron envido ────────────────────────────────────────────────
    if (p.pendiente.tipo === "envido") {
      // La flor anula el envido (reglas 14.2 y 14.3.3). Si la tenés, es lo
      // único que podés cantar arriba: no vas a envidar teniendo flor.
      if (puedeCantarFlor(p, quien)) {
        acciones.push(...cantosDeFlor(p, quien));
      } else {
        for (const c of envidosPosibles(p.pendiente.cadena as CantoEnvido[])) {
          acciones.push({ tipo: "envido", canto: c });
        }
      }
      return acciones;
    }

    // ── Te cantaron truco ─────────────────────────────────────────────────
    if (p.truco.nivel < 3) acciones.push({ tipo: "truco" }); // retruco o vale cuatro

    // EL ENVIDO VA PRIMERO (reglas.txt 14.1 y 14.2): sólo si todavía no
    // gastaste tu turno de hablar en esta primera baza. Si el mano tiró carta
    // y el pie le cantó truco, el mano ya habló y se jode.
    if (!p.yaHablo[quien] && ventanaEnvidoAbierta(p)) {
      if (puedeCantarFlor(p, quien)) {
        acciones.push(...cantosDeFlor(p, quien));
      } else if (!p.flor[quien].tiene) {
        for (const c of envidosPosibles([])) acciones.push({ tipo: "envido", canto: c });
      }
    }
    return acciones;
  }

  // ── Turno libre ───────────────────────────────────────────────────────────
  const acciones: Accion[] = [];
  for (const carta of p.cartas[quien]) acciones.push({ tipo: "jugar", carta });

  if (puedeCantarFlor(p, quien)) acciones.push(...cantosDeFlor(p, quien));

  // El envido también es cosa de tu primera oportunidad de hablar (reglas 9.1):
  // si ya tiraste carta o ya cantaste truco, se te fue. Y con flor no se canta,
  // porque la flor lo anula (reglas 8.3).
  if (ventanaEnvidoAbierta(p) && !p.yaHablo[quien] && !p.flor[quien].tiene) {
    for (const c of envidosPosibles([])) acciones.push({ tipo: "envido", canto: c });
  }

  // La alternancia es obligatoria: no podés subir tu propio canto (reglas 10.3)
  if (p.truco.nivel < 3 && p.truco.cantadoPor !== quien) {
    acciones.push({ tipo: "truco" });
  }

  acciones.push({ tipo: "mazo" });
  return acciones;
}

export const puedeHacer = (p: Partida, quien: Jugador, tipo: Accion["tipo"]) =>
  accionesPosibles(p, quien).some((a) => a.tipo === tipo);

// ─── Aplicar una acción ─────────────────────────────────────────────────────

const clonar = (p: Partida): Partida => ({
  ...p,
  puntos: { ...p.puntos },
  cartas: { vos: [...p.cartas.vos], rival: [...p.cartas.rival] },
  manoInicial: { vos: [...p.manoInicial.vos], rival: [...p.manoInicial.rival] },
  bazas: p.bazas.map((b) => ({ ...b })),
  truco: { ...p.truco },
  florCantada: { ...p.florCantada },
  yaHablo: { ...p.yaHablo },
  pendiente: p.pendiente ? { ...p.pendiente, cadena: [...p.pendiente.cadena] } : null,
  trucoEnEspera: p.trucoEnEspera
    ? { ...p.trucoEnEspera, cadena: [...p.trucoEnEspera.cadena] }
    : null,
  eventos: [...p.eventos],
  historial: [...p.historial],
});

/** Hablar gasta el turno, salvo que hables para cantar envido o flor. */
const GASTA_EL_TURNO: ReadonlySet<Accion["tipo"]> = new Set([
  "jugar",
  "truco",
  "quiero",
  "no-quiero",
  "mazo",
]);

export function aplicar(previo: Partida, accion: Accion, quien: Jugador): Partida {
  const valida = accionesPosibles(previo, quien).some(
    (a) =>
      a.tipo === accion.tipo &&
      (a.tipo !== "jugar" ||
        (accion.tipo === "jugar" && esMismaCarta(a.carta, accion.carta))) &&
      (a.tipo !== "envido" ||
        (accion.tipo === "envido" && a.canto === accion.canto)) &&
      (a.tipo !== "flor-canto" ||
        (accion.tipo === "flor-canto" && a.canto === accion.canto)),
  );
  if (!valida) return previo; // acción imposible: el estado no se toca

  const p = clonar(previo);

  p.historial.push({
    quien,
    tipo: accion.tipo,
    canto: accion.tipo === "envido" || accion.tipo === "flor-canto" ? accion.canto : undefined,
    baza: p.bazas.length - 1,
  });
  if (GASTA_EL_TURNO.has(accion.tipo)) p.yaHablo[quien] = true;

  switch (accion.tipo) {
    case "jugar":
      return jugarCarta(p, quien, accion.carta);

    case "envido": {
      // Si venía un truco sin contestar, queda esperando: el envido va primero
      if (p.pendiente?.tipo === "truco") p.trucoEnEspera = p.pendiente;
      const cadena =
        p.pendiente?.tipo === "envido" ? [...p.pendiente.cadena, accion.canto] : [accion.canto];
      p.pendiente = { tipo: "envido", cadena, de: quien };
      p.turno = otro(quien);
      p.eventos.push({ quien, texto: textoCanto(accion.canto, p) });
      return p;
    }

    case "flor":
      return cantarFlor(p, quien, null);

    case "flor-canto":
      return cantarFlor(p, quien, accion.canto);

    case "truco": {
      p.truco.nivel += 1;
      p.truco.cantadoPor = quien;
      p.pendiente = { tipo: "truco", cadena: [], de: quien };
      p.turno = otro(quien);
      p.eventos.push({ quien, texto: `¡${NOMBRE_TRUCO[p.truco.nivel - 1]}!` });
      return p;
    }

    case "quiero":
      return responderQuiero(p, quien);

    case "no-quiero":
      return responderNoQuiero(p, quien);

    case "mazo": {
      p.eventos.push({ quien, texto: "Me voy al mazo" });
      return terminarMano(p, otro(quien), puntosTruco(p.truco.nivel, p.truco.querido));
    }
  }
}

function textoCanto(canto: CantoEnvido, p: Partida): string {
  if (canto === "falta-envido") return `¡Falta envido! (${laFalta(p.puntos)})`;
  return canto === "real-envido" ? "¡Real envido!" : "¡Envido!";
}

/**
 * Cantar la flor, a secas o subiendo la apuesta de una.
 *
 * Si el rival también tiene flor y todavía puede contestar, se abre la
 * discusión (reglas 8.5). Si no, no hay con quién discutir: se cobran los 3 y
 * la mano sigue. Ojo con esto último: los tres cantos se ofrecen SIEMPRE que
 * tengas flor, tenga el rival o no, justamente para no soplar si el otro la
 * tiene.
 */
function cantarFlor(p: Partida, quien: Jugador, canto: CantoFlor | null): Partida {
  p.florCantada[quien] = true;
  p.eventos.push({
    quien,
    texto:
      canto === "con-flor-envido"
        ? "¡Con flor envido!"
        : canto === "contraflor-al-resto"
          ? "¡Contraflor al resto!"
          : "¡Flor!",
  });

  // Si venía un truco sin contestar, queda esperando su turno: la flor también
  // va antes que el truco (reglas.txt 14.1). Sin esto el truco quedaba
  // huérfano —nadie a quien preguntarle— y la mano se trababa para siempre.
  if (p.pendiente?.tipo === "truco") {
    p.trucoEnEspera = p.pendiente;
    p.pendiente = null;
  }

  // La flor anula el envido, y lo cantado antes no se cobra (reglas 14.3.3)
  if (p.pendiente?.tipo === "envido") {
    p.eventos.push({ quien: "sistema", texto: "La flor anula el envido" });
    p.pendiente = null;
  }
  p.envidoCerrado = true;

  const rival = otro(quien);

  // ¿El rival estaba contestando una flor ya cantada? Entonces esto la iguala
  // o la sube.
  const respondiendo = p.pendiente?.tipo === "flor";
  const cadenaPrevia = respondiendo ? [...p.pendiente!.cadena] : [];

  if (canto === null && respondiendo) {
    // "Yo también tengo flor": se comparan y la más alta se lleva los 3.
    return resolverFlorASecas(p);
  }

  // Si ya estamos discutiendo la flor, el otro sigue en la conversación aunque
  // ya haya cantado la suya: es él quien tiene que contestar la subida.
  const rivalPuedeContestar =
    respondiendo ||
    (p.flor[rival].tiene && !p.florCantada[rival] && !p.yaHablo[rival] && p.bazas.length === 1);

  if (!rivalPuedeContestar) {
    // Nadie con quién discutirla: se cobran los 3 y se sigue jugando.
    revelarFlores(p);
    p.florResuelta = true;
    sumar(p, quien, 3, "cobra la flor");
    return seguirDespuesDeApuesta(p);
  }

  p.florResuelta = false;
  p.pendiente = {
    tipo: "flor",
    cadena: canto === null ? cadenaPrevia : [...cadenaPrevia, canto],
    de: quien,
  };
  p.turno = rival;
  return p;
}

/** Los dos cantaron flor y nadie subió: gana la más alta (reglas 8.5, escalón 1). */
function resolverFlorASecas(p: Partida): Partida {
  const ganador = compararFlores(p);
  revelarFlores(p);
  p.pendiente = null;
  p.florResuelta = true;
  sumar(p, ganador, 3, "se lleva la flor");
  return seguirDespuesDeApuesta(p);
}

/**
 * Se terminó de resolver una apuesta. Si había un truco esperando porque el
 * envido iba primero, ahora sí toca contestarlo.
 */
function seguirDespuesDeApuesta(p: Partida): Partida {
  if (p.fase !== "jugando") return p;
  if (p.trucoEnEspera) {
    p.pendiente = p.trucoEnEspera;
    p.trucoEnEspera = null;
    p.turno = otro(p.pendiente.de);
    return p;
  }
  p.turno = turnoDeLaBaza(p);
  return p;
}

function responderQuiero(p: Partida, quien: Jugador): Partida {
  const pendiente = p.pendiente!;
  p.pendiente = null;
  p.eventos.push({ quien, texto: "¡Quiero!" });

  if (pendiente.tipo === "truco") {
    p.truco.querido = true;
    p.turno = turnoDeLaBaza(p);
    return p;
  }

  if (pendiente.tipo === "flor") {
    const ganador = compararFlores(p);
    revelarFlores(p);
    p.florResuelta = true;
    if (pendiente.cadena.includes("contraflor-al-resto")) {
      return ganarLaPartida(p, ganador, "gana la contraflor al resto");
    }
    sumar(p, ganador, 6, "gana la flor con envido");
    return seguirDespuesDeApuesta(p);
  }

  // Envido querido: se cantan los tantos y se cobra al instante (reglas 6, paso 3)
  const tantos = {
    vos: valorEnvido(p.manoInicial.vos, p.muestra),
    rival: valorEnvido(p.manoInicial.rival, p.muestra),
  };
  const ganador: Jugador =
    tantos.vos === tantos.rival
      ? p.quienEsMano
      : tantos.vos > tantos.rival
        ? "vos"
        : "rival";

  p.envidoCerrado = true;
  p.eventos.push({ quien: "vos", texto: `${tantos.vos}` });
  p.eventos.push({ quien: "rival", texto: `${tantos.rival}` });

  const { querido } = puntosEnvido(pendiente.cadena as CantoEnvido[], p.puntos);
  sumar(p, ganador, querido, "gana el envido");
  return seguirDespuesDeApuesta(p);
}

function responderNoQuiero(p: Partida, quien: Jugador): Partida {
  const pendiente = p.pendiente!;
  p.pendiente = null;
  p.eventos.push({
    quien,
    texto: pendiente.tipo === "flor" ? "Con flor me achico" : "No quiero",
  });

  if (pendiente.tipo === "truco") {
    // El que cantó se lleva la mano con lo que valía antes de su canto
    return terminarMano(p, pendiente.de, puntosTruco(p.truco.nivel - 1, true));
  }

  if (pendiente.tipo === "flor") {
    revelarFlores(p);
    p.florResuelta = true;
    // Se cobra lo que estaba en juego antes del canto rechazado (reglas 8.5):
    // 3 si venía sólo de la flor, 6 si venía de un "con flor envido" ya en pie.
    const ultimo = pendiente.cadena[pendiente.cadena.length - 1];
    const valorAntes = ultimo === "contraflor-al-resto" && pendiente.cadena.length > 1 ? 6 : 3;
    sumar(p, pendiente.de, valorAntes, "cobra la flor no querida");
    return seguirDespuesDeApuesta(p);
  }

  p.envidoCerrado = true;
  const { noQuerido } = puntosEnvido(pendiente.cadena as CantoEnvido[], p.puntos);
  sumar(p, pendiente.de, noQuerido, "cobra el envido no querido");
  return seguirDespuesDeApuesta(p);
}

/** A quién le toca tirar en la baza en curso. */
function turnoDeLaBaza(p: Partida): Jugador {
  const baza = p.bazas[p.bazas.length - 1];
  if (baza.vos === null && baza.rival === null) return baza.abre;
  return baza.vos === null ? "vos" : "rival";
}

function jugarCarta(p: Partida, quien: Jugador, carta: Carta): Partida {
  p.cartas[quien] = p.cartas[quien].filter((c) => !esMismaCarta(c, carta));
  const baza = p.bazas[p.bazas.length - 1];
  baza[quien] = carta;

  if (p.bazas.length === 1 && baza.vos && baza.rival) {
    p.envidoCerrado = true; // se cerró la ventana del envido
  }

  if (!baza.vos || !baza.rival) {
    p.turno = otro(quien);
    return p;
  }

  // Baza completa: se compara
  const fv = fuerza(baza.vos, p.muestra);
  const fr = fuerza(baza.rival, p.muestra);
  baza.ganador = fv === fr ? "parda" : fv > fr ? "vos" : "rival";
  p.eventos.push({
    quien: "sistema",
    texto:
      baza.ganador === "parda"
        ? "Parda"
        : `${baza.ganador === "vos" ? "Ganás" : "Gana el rival"} la baza`,
  });

  const ganador = ganadorDeLaMano(p);
  if (ganador) {
    return terminarMano(p, ganador, puntosTruco(p.truco.nivel, p.truco.querido));
  }

  const abre: Jugador = baza.ganador === "parda" ? baza.abre : baza.ganador;
  p.bazas.push({ vos: null, rival: null, abre, ganador: null });
  p.turno = abre;
  return p;
}

/**
 * Quién ganó la mano, o null si todavía se sigue jugando (reglas.txt 7.3).
 * Con pardas de por medio gana el que se llevó una baza primero; si las tres
 * son pardas, gana el mano.
 */
export function ganadorDeLaMano(p: Partida): Jugador | null {
  const cerradas = p.bazas.filter((b) => b.ganador !== null);
  const ganadas = { vos: 0, rival: 0 };
  for (const b of cerradas) {
    if (b.ganador === "vos" || b.ganador === "rival") ganadas[b.ganador]++;
  }

  if (ganadas.vos >= 2) return "vos";
  if (ganadas.rival >= 2) return "rival";

  if (cerradas.length >= 2) {
    const [primera, segunda] = cerradas;
    if (primera.ganador === "parda" && segunda.ganador !== "parda") {
      return segunda.ganador as Jugador;
    }
    if (segunda.ganador === "parda" && primera.ganador !== "parda") {
      return primera.ganador as Jugador;
    }
  }

  if (cerradas.length === 3) {
    const primera = cerradas.find((b) => b.ganador !== "parda");
    return primera ? (primera.ganador as Jugador) : p.quienEsMano;
  }

  return null;
}

function terminarMano(p: Partida, ganador: Jugador, puntos: number): Partida {
  p.ganadorMano = ganador;
  p.fase = "mano-terminada";
  sumar(p, ganador, puntos, "gana la mano");
  return p;
}

/** Empieza la mano siguiente: rota quién es mano (reglas.txt 3.4). */
export function siguienteMano(p: Partida, azar: () => number = Math.random): Partida {
  if (p.fase === "partida-terminada") return p;
  return repartirMano(
    { puntos: p.puntos, quienEsMano: otro(p.quienEsMano) },
    azar,
  );
}
