/**
 * Copyright (c) 2026 fodo24yt-maker. Ver LICENSE en la raíz del repositorio.
 *
 * La ficha que el bot te va armando mientras juegan.
 *
 * Un jugador de truco no mira sólo sus cartas: mira cómo jugás vos. Si cantaste
 * envido y después mostraste un 21, lo anota. Si tenías 33 y te quedaste
 * callado esperando que cante él para subirle, también. Eso es lo que hay acá.
 *
 * ─── LA REGLA QUE NO SE ROMPE ────────────────────────────────────────────────
 * El bot NUNCA mira tus cartas. Esta ficha se arma sólo con lo que cualquiera
 * sentado en esa mesa habría visto:
 *
 *   · las cartas que TIRASTE, que están sobre la mesa a la vista de todos;
 *   · los tantos que se CANTARON en voz alta, cuando el envido se quiso.
 *
 * Si te fuiste al mazo sin mostrar las tres, el bot vio menos y anota menos:
 * nunca completa lo que no vio. Hay un test que lo verifica.
 *
 * La ficha dura lo que dura la partida. Al terminar se olvida y no se guarda
 * nada en el navegador.
 */

import { type Carta, calidadDeMano } from "./baraja.ts";
import type { Jugador, Partida, Registro } from "./partida.ts";
import { analizarFlor, valorEnvido } from "./tantos.ts";

/** Debajo de esto, cantar envido es mentir. */
const ENVIDO_FLOJO = 25;
/** De acá para arriba, callarse el tanto es irse a la pesca. */
const ENVIDO_BUENO = 27;
/** Debajo de esto, cantar truco es mentir. */
const TRUCO_FLOJO = 0.5;
/** De acá para arriba, no cantar truco es guardarse una mano brava. */
const TRUCO_BRAVO = 0.7;

export interface Ficha {
  /** Manos en las que se pudo ver algo. Es la confianza de todo lo demás. */
  manosVistas: number;
  envidosCantados: number;
  envidosFlojos: number;
  /** Buen tanto callado que después subió el envido del otro. */
  pescas: number;
  /** Buen tanto que nunca cantó ni subió. */
  tantoAltoCallado: number;
  trucosCantados: number;
  trucosFlojos: number;
  manoFuerteCallada: number;
}

export const FICHA_VACIA: Ficha = {
  manosVistas: 0,
  envidosCantados: 0,
  envidosFlojos: 0,
  pescas: 0,
  tantoAltoCallado: 0,
  trucosCantados: 0,
  trucosFlojos: 0,
  manoFuerteCallada: 0,
};

export const fichaVacia = (): Ficha => ({ ...FICHA_VACIA });

/**
 * ¿Se sabe que tenía flor, sin espiarle la mano?
 *
 * Hay dos formas honestas de saberlo: que la haya CANTADO, o que haya mostrado
 * las tres cartas y se pueda contar. Preguntarle a `p.flor` directamente sería
 * hacer trampa: una flor que el rival se guardó no la vio nadie. El bot
 * necesita esto para no anotar como "se calló un buen tanto" a alguien que en
 * realidad no podía cantar envido porque tenía flor.
 */
function teniaFlorALaVista(
  p: Partida,
  quien: Jugador,
  vistas: readonly Carta[],
  mostroTodo: boolean,
): boolean {
  if (p.florCantada[quien]) return true;
  return mostroTodo && analizarFlor(vistas, p.muestra).tiene;
}

/** Las cartas que ese jugador dejó sobre la mesa. Información pública. */
function cartasSobreLaMesa(p: Partida, quien: Jugador): Carta[] {
  return p.bazas.map((b) => b[quien]).filter((c): c is Carta => c !== null);
}

/**
 * ¿El envido se llegó a querer? Si sí, los dos tantos se cantaron en voz alta y
 * son información pública, aunque después nadie muestre una carta.
 *
 * Se reconstruye del historial siguiendo el mismo hilo que sigue el motor: cada
 * canto abre algo, cada respuesta lo cierra.
 */
function envidoFueQuerido(historial: readonly Registro[]): boolean {
  let abierto: "envido" | "truco" | "flor" | null = null;
  for (const r of historial) {
    if (r.tipo === "envido") abierto = "envido";
    else if (r.tipo === "truco") abierto = "truco";
    else if (r.tipo === "flor" || r.tipo === "flor-canto") abierto = "flor";
    else if (r.tipo === "quiero") {
      if (abierto === "envido") return true;
      abierto = null;
    } else if (r.tipo === "no-quiero") abierto = null;
  }
  return false;
}

/**
 * Repasa la mano que se acaba de terminar y actualiza la ficha de `sobre`.
 *
 * Devuelve una ficha nueva: no toca la que le pasan.
 */
export function observarMano(ficha: Ficha, p: Partida, sobre: Jugador): Ficha {
  const f = { ...ficha };
  const mios = p.historial.filter((r) => r.quien === sobre);
  const vistas = cartasSobreLaMesa(p, sobre);
  const mostroTodo = vistas.length === 3;

  // ── El tanto que tenía de verdad ────────────────────────────────────────
  // Dos formas honestas de saberlo, y ninguna es espiarle la mano:
  //   1) el envido se quiso, así que lo cantó en voz alta;
  //   2) jugó las tres cartas, así que están todas sobre la mesa.
  let tantoReal: number | null = null;
  if (envidoFueQuerido(p.historial)) {
    tantoReal = valorEnvido(p.manoInicial[sobre], p.muestra); // se cantó: es público
  } else if (mostroTodo) {
    tantoReal = valorEnvido(vistas, p.muestra); // las tres están en la mesa
  }

  const cantosEnvido = mios.filter((r) => r.tipo === "envido");
  const huboEnvidoDelOtro = p.historial.some(
    (r) => r.tipo === "envido" && r.quien !== sobre,
  );

  if (tantoReal !== null) {
    if (cantosEnvido.length > 0) {
      f.envidosCantados++;
      if (tantoReal < ENVIDO_FLOJO) f.envidosFlojos++;

      // Se fue a la pesca: se calló, dejó que cantara el otro, y recién ahí
      // subió. Con buen tanto, eso no es timidez, es oficio.
      const abrioEl = p.historial.find((r) => r.tipo === "envido")?.quien === sobre;
      if (!abrioEl && huboEnvidoDelOtro && tantoReal >= ENVIDO_BUENO) f.pescas++;
    } else if (tantoReal >= ENVIDO_BUENO && !teniaFlorALaVista(p, sobre, vistas, mostroTodo)) {
      // Tenía con qué y no dijo nada en toda la mano.
      f.tantoAltoCallado++;
    }
  }

  // ── El truco ────────────────────────────────────────────────────────────
  if (mostroTodo) {
    const calidad = calidadDeMano(vistas, p.muestra);
    const cantoTruco = mios.some((r) => r.tipo === "truco");
    if (cantoTruco) {
      f.trucosCantados++;
      if (calidad < TRUCO_FLOJO) f.trucosFlojos++;
    } else if (calidad >= TRUCO_BRAVO) {
      f.manoFuerteCallada++;
    }
  }

  if (tantoReal !== null || mostroTodo) f.manosVistas++;
  return f;
}

/**
 * Cuánta cuerda darle a la ficha. Con dos manos vistas no se puede concluir
 * gran cosa; con diez, bastante. Va de 0 a 1 y nunca llega del todo.
 */
const confianza = (manosVistas: number) => manosVistas / (manosVistas + 3);

/** Con qué frecuencia canta sin tener. Cuando no hay datos, se asume neutro. */
const tasa = (parte: number, total: number, neutro: number) =>
  total === 0 ? neutro : parte / total;

/** El punto neutro: por debajo el rival es honesto, por encima es mentiroso. */
const MENTIRA_NEUTRA = 0.35;
/** Cuánto se guarda un jugador del montón. Por debajo es lanzado, por encima es de los que esperan. */
const PASIVIDAD_NEUTRA = 0.25;

const acotar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export interface Ajuste {
  /** Se suma al umbral de tanto para querer el envido. */
  quiereEnvido: number;
  /** Se suma al umbral de calidad para querer el truco. */
  quiereTruco: number;
  /** Se suma al umbral para cantar el envido de primera. */
  cantaEnvido: number;
}

export const SIN_AJUSTE: Ajuste = { quiereEnvido: 0, quiereTruco: 0, cantaEnvido: 0 };

/**
 * Qué hace el bot con lo que anotó.
 *
 * `lectura` es cuánto caso le hace este rival en particular: los primeros de la
 * gira no miran nada (0) y los últimos te tienen fichado (1). Ese es el dial
 * que mantiene la gira en escalera.
 */
export function ajustePorLectura(ficha: Ficha, lectura: number): Ajuste {
  if (lectura <= 0 || ficha.manosVistas === 0) return { ...SIN_AJUSTE };

  const peso = confianza(ficha.manosVistas) * lectura;

  const mentiraEnvido = tasa(ficha.envidosFlojos, ficha.envidosCantados, MENTIRA_NEUTRA);
  const mentiraTruco = tasa(ficha.trucosFlojos, ficha.trucosCantados, MENTIRA_NEUTRA);

  // Cuánto se guarda: el que tiene mano brava y no canta es peligroso, porque
  // cuando habla es porque tiene. Cuenta a favor de creerle. Se mide contra un
  // valor neutro para que un rival del montón dé cero y no corra nada.
  const pasividad =
    (ficha.tantoAltoCallado + ficha.manoFuerteCallada) / (ficha.manosVistas * 2);
  const seGuarda = pasividad - PASIVIDAD_NEUTRA;

  // Mentiroso -> le bajo el umbral y le pago a ver.
  // Honesto o callado -> se lo subo y me achico, porque si canta, tiene.
  //
  // Los topes NO son simétricos, y es a propósito: los umbrales de los rivales
  // duros ya están parados en el punto que conviene contra un jugador del
  // montón, medido con el banco de pruebas. Así que hay mucho para ganar
  // bajándolos contra un mentiroso y poco para ganar subiéndolos: pasarse de
  // largo cuesta puntos. La primera versión de esto no tenía tope y empujaba a
  // El Turco más allá de su propio óptimo, o sea que leer al rival lo hacía
  // jugar PEOR.
  const quiereEnvido = acotar((MENTIRA_NEUTRA - mentiraEnvido + seGuarda * 0.5) * 5 * peso, -5, 1.5);
  const quiereTruco = acotar((MENTIRA_NEUTRA - mentiraTruco + seGuarda * 0.5) * 0.15 * peso, -0.14, 0.05);

  // Si va seguido a la pesca, dejo de abrirle el envido con tanto mediano: es
  // justo lo que está esperando para subirme.
  const cantaEnvido = acotar((ficha.pescas / ficha.manosVistas) * 4 * peso, 0, 3);

  return { quiereEnvido, quiereTruco, cantaEnvido };
}
