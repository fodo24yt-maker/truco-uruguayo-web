/**
 * Qué botones tiene que mostrar la barra de cantos.
 *
 * ── Por qué esto es una función aparte y con test ─────────────────────────
 *
 * Porque la barra tenía un agujero, y era grande: **había cosas que el motor te
 * dejaba hacer y que no tenían ningún botón**.
 *
 * La barra estaba escrita como un `if` de dos ramas. Si había algo que
 * contestar, la fila ENTERA se convertía en "Quiero" y "No quiero"; si no, era
 * la fila normal con envido, truco y mazo. Y ahí estaba el problema: cuando te
 * cantan algo, contestar no es lo único que podés hacer.
 *
 *   · te canto envido y me contestás **real envido**: podés subirlo a falta,
 *     y el botón vivía en la otra rama;
 *   · te cantan truco: podés **retrucar**, misma historia;
 *   · te cantan truco en la primera baza y todavía no hablaste: podés cantar
 *     **envido**, que es "el envido va primero", y tampoco había con qué.
 *
 * Eso no era un detalle de interfaz: eran jugadas del truco que directamente no
 * se podían hacer.
 *
 * ── La invariante ─────────────────────────────────────────────────────────
 *
 * Por eso esto es una función pura sobre lo que devuelve `accionesPosibles`, y
 * por eso tiene test propio: **toda acción que el motor ofrece tiene que caer
 * en algún botón**. Mientras esa invariante se verifique sola, el agujero no
 * puede volver, ni acá ni cuando se agregue un canto nuevo.
 */

import type { Accion, CantoEnvido, CantoFlor } from "./motor/partida.ts";

export interface Botonera {
  /** "¡Flor!" a secas, o "Yo también" si ya la cantó él. */
  flor: boolean;
  /** Lo que se canta ARRIBA de una flor: con flor envido, contraflor al resto. */
  florCantos: CantoFlor[];
  /** Envido, real envido, falta envido. Sirve para abrir y para subir. */
  envidos: CantoEnvido[];
  /** Truco, retruco o vale cuatro: el motor no distingue, lo dice el nivel. */
  truco: boolean;
  mazo: boolean;
  quiero: boolean;
  noQuiero: boolean;
  /** Podés tirar una carta. */
  jugar: boolean;
  /**
   * Hay algo cantado esperando tu respuesta.
   *
   * Es lo que decide la FORMA de la barra —dos botones grandes, verde y rojo—,
   * pero ya no decide su CONTENIDO: lo que se puede subir se muestra igual, en
   * una fila fina arriba.
   */
  contestando: boolean;
}

export function botonera(posibles: readonly Accion[]): Botonera {
  const envidos: CantoEnvido[] = [];
  const florCantos: CantoFlor[] = [];
  let flor = false;
  let truco = false;
  let mazo = false;
  let quiero = false;
  let noQuiero = false;
  let jugar = false;

  for (const a of posibles) {
    switch (a.tipo) {
      case "envido":
        envidos.push(a.canto);
        break;
      case "flor-canto":
        florCantos.push(a.canto);
        break;
      case "flor":
        flor = true;
        break;
      case "truco":
        truco = true;
        break;
      case "mazo":
        mazo = true;
        break;
      case "quiero":
        quiero = true;
        break;
      case "no-quiero":
        noQuiero = true;
        break;
      case "jugar":
        jugar = true;
        break;
    }
  }

  return {
    flor,
    florCantos,
    envidos,
    truco,
    mazo,
    quiero,
    noQuiero,
    jugar,
    contestando: quiero || noQuiero,
  };
}

/**
 * ¿Queda alguna acción sin botón?
 *
 * Devuelve los tipos de acción que la botonera NO representa. Es lo que usa el
 * test para verificar la invariante de arriba, y está acá y no en el test para
 * que se pueda usar desde cualquier lado sin copiarla.
 */
export function accionesSinBoton(posibles: readonly Accion[]): Accion["tipo"][] {
  const b = botonera(posibles);
  const tiene: Record<Accion["tipo"], boolean> = {
    jugar: b.jugar,
    envido: b.envidos.length > 0,
    flor: b.flor,
    "flor-canto": b.florCantos.length > 0,
    truco: b.truco,
    quiero: b.quiero,
    "no-quiero": b.noQuiero,
    mazo: b.mazo,
  };
  const faltan = new Set<Accion["tipo"]>();
  for (const a of posibles) if (!tiene[a.tipo]) faltan.add(a.tipo);
  return [...faltan];
}
