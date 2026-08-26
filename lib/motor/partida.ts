/**
 * Copyright (c) 2026 fodo24yt-maker. Ver LICENSE en la raíz del repositorio.
 * Código visible, no código libre: se puede leer y estudiar, no republicar
 * ni usar comercialmente.
 *
 * El estado de una partida mano a mano y las reglas que la gobiernan.
 * Sigue el orden de fases de reglas.txt, sección 6, y la tabla de cantos
 * válidos de la sección 14.
 *
 * Alcance de esta versión: 1 contra 1, con flor automática (decisión 6 del
 * apéndice A). Con flor envido y contraflor al resto usan los valores de
 * reglas.txt 8.5 (decisión 4): 6 puntos y la partida entera.
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
  envidoCerrado: boolean; // ya se jugó, se rechazó o se pasó la ventana
  florResuelta: boolean; // false mientras los dos tienen flor y no se decidió
  truco: { nivel: number; querido: boolean; cantadoPor: Jugador | null };
  fase: "jugando" | "mano-terminada" | "partida-terminada";
  ganadorMano: Jugador | null;
  ganadorPartida: Jugador | null;
  eventos: Evento[];
}

export type Accion =
  | { tipo: "jugar"; carta: Carta }
  | { tipo: "envido"; canto: CantoEnvido }
  | { tipo: "flor" } // quedarse con la flor a secas, sin subir
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

  const p: Partida = {
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
    envidoCerrado: false,
    florResuelta: true,
    truco: { nivel: 0, querido: false, cantadoPor: null },
    fase: "jugando",
    ganadorMano: null,
    ganadorPartida: null,
    eventos: [],
  };

  return resolverFlor(p);
}

/**
 * Quién gana la comparación de flores. Empate: gana el mano (reglas 3.3).
 */
function compararFlores(p: Partida): Jugador {
  const { vos, rival } = p.flor;
  return vos.valor === rival.valor ? p.quienEsMano : vos.valor > rival.valor ? "vos" : "rival";
}

/** Muestra los dos tantos de flor en el registro, recién cuando se resuelve. */
function revelarFlores(p: Partida) {
  p.eventos.push({ quien: "vos", texto: `Flor: ${p.flor.vos.valor}` });
  p.eventos.push({ quien: "rival", texto: `Flor: ${p.flor.rival.valor}` });
}

/**
 * La flor se detecta sola, apenas se reparte (decisión 6): nadie se olvida de
 * cantarla. La flor siempre anula el envido, la tenga uno o los dos.
 *
 * Si la tiene uno solo, no hay nada que apostar: cobra sus 3 puntos ahí mismo.
 * Si la tienen los dos, se abre la ventana de cantos (reglas.txt 8.5): quien
 * habla primero puede quedarse con la flor a secas o subir la apuesta.
 */
function resolverFlor(p: Partida): Partida {
  const { vos, rival } = p.flor;
  if (!vos.tiene && !rival.tiene) return p;

  p.envidoCerrado = true;

  if (vos.tiene && rival.tiene) {
    p.florResuelta = false;
    p.eventos.push({ quien: "vos", texto: "¡Flor!" });
    p.eventos.push({ quien: "rival", texto: "¡Flor!" });
    return p;
  }

  const quien: Jugador = vos.tiene ? "vos" : "rival";
  p.eventos.push({ quien, texto: `¡Flor! ${p.flor[quien].valor}` });
  return sumar(p, quien, 3, "cobra la flor");
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

/** El envido sólo vive en la primera baza (reglas.txt 9.1 y 14.2). */
function envidoDisponible(p: Partida): boolean {
  return !p.envidoCerrado && p.bazas.length === 1 && !p.pendiente;
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

export function accionesPosibles(p: Partida, quien: Jugador): Accion[] {
  if (p.fase !== "jugando" || p.turno !== quien) return [];

  if (p.pendiente) {
    if (p.pendiente.de === quien) return []; // no te respondés a vos mismo
    const acciones: Accion[] = [{ tipo: "quiero" }, { tipo: "no-quiero" }];

    if (p.pendiente.tipo === "envido") {
      for (const c of envidosPosibles(p.pendiente.cadena as CantoEnvido[])) {
        acciones.push({ tipo: "envido", canto: c });
      }
    } else if (p.pendiente.tipo === "flor") {
      // de con-flor-envido se puede subir directo a contraflor al resto
      if (!p.pendiente.cadena.includes("contraflor-al-resto")) {
        acciones.push({ tipo: "flor-canto", canto: "contraflor-al-resto" });
      }
    } else if (p.truco.nivel < 3) {
      acciones.push({ tipo: "truco" }); // subir: retruco o vale cuatro
    }
    return acciones;
  }

  // Los dos tienen flor y todavía no se decidió: no se puede hacer otra cosa
  // hasta resolver eso (reglas.txt 8.5, y paso 3 de la sección 6).
  if (!p.florResuelta) {
    return [
      { tipo: "flor" },
      { tipo: "flor-canto", canto: "con-flor-envido" },
      { tipo: "flor-canto", canto: "contraflor-al-resto" },
    ];
  }

  const acciones: Accion[] = [];
  for (const carta of p.cartas[quien]) acciones.push({ tipo: "jugar", carta });

  if (envidoDisponible(p)) {
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
  pendiente: p.pendiente ? { ...p.pendiente, cadena: [...p.pendiente.cadena] } : null,
  eventos: [...p.eventos],
});

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

  switch (accion.tipo) {
    case "jugar":
      return jugarCarta(p, quien, accion.carta);

    case "envido": {
      const cadena = p.pendiente ? [...p.pendiente.cadena, accion.canto] : [accion.canto];
      p.pendiente = { tipo: "envido", cadena, de: quien };
      p.turno = otro(quien);
      p.eventos.push({ quien, texto: textoCanto(accion.canto, p) });
      return p;
    }

    case "flor": {
      const ganador = compararFlores(p);
      revelarFlores(p);
      p.florResuelta = true;
      sumar(p, ganador, 3, "se lleva la flor");
      p.turno = turnoDeLaBaza(p);
      return p;
    }

    case "flor-canto": {
      const cadena = p.pendiente ? [...p.pendiente.cadena, accion.canto] : [accion.canto];
      p.pendiente = { tipo: "flor", cadena, de: quien };
      p.turno = otro(quien);
      p.eventos.push({
        quien,
        texto: accion.canto === "con-flor-envido" ? "¡Con flor envido!" : "¡Contraflor al resto!",
      });
      return p;
    }

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
    p.turno = turnoDeLaBaza(p);
    return p;
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
  p.turno = turnoDeLaBaza(p);
  return p;
}

function responderNoQuiero(p: Partida, quien: Jugador): Partida {
  const pendiente = p.pendiente!;
  p.pendiente = null;
  p.eventos.push({ quien, texto: "No quiero" });

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
    p.turno = turnoDeLaBaza(p);
    return p;
  }

  p.envidoCerrado = true;
  const { noQuerido } = puntosEnvido(pendiente.cadena as CantoEnvido[], p.puntos);
  sumar(p, pendiente.de, noQuerido, "cobra el envido no querido");
  p.turno = turnoDeLaBaza(p);
  return p;
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
