/**
 * El bot.
 *
 * Hay uno solo: lo que cambia de rival en rival es la personalidad que se le
 * pasa (ver personalidades.ts). El mentiroso de Rocha y el mozo de Ciudad
 * Vieja corren exactamente este código; lo único distinto son los umbrales con
 * los que canta, quiere y miente.
 *
 * Sólo mira SUS cartas y lo que está sobre la mesa. Nunca lee la mano del
 * jugador: eso sería hacer trampa, y además arruinaría el aprendizaje.
 */

import { type Carta, fuerza } from "./baraja.ts";
import { valorEnvido } from "./tantos.ts";
import {
  type Accion,
  type Jugador,
  type Partida,
  accionesPosibles,
  laFalta,
} from "./partida.ts";
import { EL_CHUECO, type Personalidad } from "./personalidades.ts";

/** Qué tan buena es la mano, de 0 a 1, según la fuerza de sus cartas. */
function calidadDeMano(cartas: readonly Carta[], muestra: Carta): number {
  if (cartas.length === 0) return 0;
  // fuerza va de 82 (el cuatro) a 100 (el 2 de la muestra)
  const normalizar = (c: Carta) => (fuerza(c, muestra) - 82) / 18;
  const mejor = Math.max(...cartas.map(normalizar));
  const promedio = cartas.reduce((t, c) => t + normalizar(c), 0) / cartas.length;
  return mejor * 0.6 + promedio * 0.4;
}

/**
 * Decide si canta aunque no tenga con qué.
 *
 * Es toda la mentira del bot: si le falta poco para el umbral, con cierta
 * probabilidad canta igual. Cuanto peor es su mano, menos probable es que se
 * anime, así que un mentiroso no canta vale cuatro con un cuatro cada vez,
 * sino de a ratos, que es lo que lo hace creíble.
 */
function seAnima(
  tiene: number,
  necesita: number,
  personalidad: Personalidad,
  azar: () => number,
): boolean {
  if (tiene >= necesita) return azar() > personalidad.silencio;
  if (personalidad.mentira === 0) return false;

  const leFalta = necesita - tiene;
  // Cuanto más lejos está del umbral, más difícil que se mande
  const ganas = personalidad.mentira / (1 + leFalta * 0.5);
  return azar() < ganas;
}

/**
 * Qué haría el bot en el lugar de `quien`. Por defecto juega de rival, pero
 * puede razonar por cualquiera de los dos lados: eso es lo que después permite
 * ofrecer una sugerencia al jugador en modo aprendizaje.
 */
export function decidirJugada(
  p: Partida,
  quien: Jugador = "rival",
  azar: () => number = Math.random,
  personalidad: Personalidad = EL_CHUECO,
): Accion | null {
  const posibles = accionesPosibles(p, quien);
  if (posibles.length === 0) return null;

  const misCartas = p.cartas[quien];
  const calidad = calidadDeMano(misCartas, p.muestra);
  // El tanto se cuenta con las tres cartas del reparto, no con las que quedan
  const tanto = valorEnvido(p.manoInicial[quien], p.muestra);
  const puede = (tipo: Accion["tipo"]) => posibles.some((a) => a.tipo === tipo);

  // ── Los dos tienen flor: hay que decidir si se sube la apuesta ───────────
  // El bot sólo mira su propio tanto de flor, nunca el del rival.
  if (puede("flor") || puede("flor-canto")) {
    const miFlor = p.flor[quien].valor;

    if (p.pendiente?.tipo === "flor") {
      if (miFlor >= personalidad.contraflorCon && puede("flor-canto")) {
        return { tipo: "flor-canto", canto: "contraflor-al-resto" };
      }
      return miFlor >= personalidad.quiereFlorCon
        ? { tipo: "quiero" }
        : { tipo: "no-quiero" };
    }

    if (miFlor >= personalidad.contraflorCon) {
      return { tipo: "flor-canto", canto: "contraflor-al-resto" };
    }
    if (seAnima(miFlor, personalidad.conFlorEnvidoCon, personalidad, azar)) {
      return { tipo: "flor-canto", canto: "con-flor-envido" };
    }
    return { tipo: "flor" };
  }

  // ── Le cantaron algo: hay que responder ──────────────────────────────────
  if (p.pendiente) {
    if (p.pendiente.tipo === "envido") {
      // Con la falta en juego se pone exigente: se juega la partida
      const enJuegoLaFalta = p.pendiente.cadena.includes("falta-envido");
      const umbral = enJuegoLaFalta
        ? personalidad.quiereEnvidoCon + 4
        : personalidad.quiereEnvidoCon;

      if (
        tanto >= personalidad.subeEnvidoCon &&
        !enJuegoLaFalta &&
        laFalta(p.puntos) > 4
      ) {
        return { tipo: "envido", canto: "falta-envido" };
      }
      if (
        tanto >= personalidad.subeEnvidoCon - 3 &&
        puedeCantar(posibles, "real-envido")
      ) {
        return { tipo: "envido", canto: "real-envido" };
      }
      return tanto >= umbral ? { tipo: "quiero" } : { tipo: "no-quiero" };
    }

    // Truco: quiere con cartas, sube sólo con cartas muy buenas
    if (calidad > personalidad.subeTrucoCon && puede("truco")) {
      return { tipo: "truco" };
    }
    return calidad > personalidad.quiereTrucoCon
      ? { tipo: "quiero" }
      : { tipo: "no-quiero" };
  }

  // ── Turno libre ──────────────────────────────────────────────────────────

  // Canta el envido cuando tiene con qué. El "silencio" hace que a veces se lo
  // guarde: si cantara siempre que puede, le leerías el tanto exacto.
  if (
    puedeCantar(posibles, "envido") &&
    seAnima(tanto, personalidad.cantaEnvidoCon, personalidad, azar)
  ) {
    if (tanto >= personalidad.subeEnvidoCon) {
      return { tipo: "envido", canto: "real-envido" };
    }
    return { tipo: "envido", canto: "envido" };
  }

  // Canta truco con mano fuerte, o con mano mediana si ya ganó la primera
  const ganoLaPrimera = p.bazas[0]?.ganador === quien;
  const umbralTruco = ganoLaPrimera
    ? personalidad.cantaTrucoCon - 0.23
    : personalidad.cantaTrucoCon;
  if (puede("truco") && seAnima(calidad, umbralTruco, personalidad, azar)) {
    return { tipo: "truco" };
  }

  return { tipo: "jugar", carta: elegirCarta(p, quien) };
}

const puedeCantar = (posibles: Accion[], canto: string) =>
  posibles.some((a) => a.tipo === "envido" && a.canto === canto);

/**
 * Qué carta tirar. La regla de oro: si el rival ya tiró, la más baja que le
 * gane; si no le puede ganar, la más baja de todas (no se regalan cartas).
 * Si abre la baza, tira la más alta: guardar la mata para la tercera es el
 * error clásico (reglas.txt 16.3).
 */
function elegirCarta(p: Partida, quien: Jugador): Carta {
  const misCartas = [...p.cartas[quien]].sort(
    (a, b) => fuerza(a, p.muestra) - fuerza(b, p.muestra),
  );
  const baza = p.bazas[p.bazas.length - 1];
  const cartaRival = quien === "rival" ? baza.vos : baza.rival;

  if (!cartaRival) return misCartas[misCartas.length - 1];

  const fuerzaRival = fuerza(cartaRival, p.muestra);
  const ganadora = misCartas.find((c) => fuerza(c, p.muestra) > fuerzaRival);
  return ganadora ?? misCartas[0];
}
