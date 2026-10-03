/**
 * Copyright (c) 2026 fodo24yt-maker. Ver LICENSE en la raíz del repositorio.
 *
 * El arnés del banco de pruebas: sentar dos personalidades a la mesa, jugar
 * miles de partidas y contar quién gana.
 *
 * Vive acá y no en `herramientas/` por dos razones:
 *
 *  1. **Estaba duplicado.** `herramientas/medir-bots.mjs` y
 *     `lib/motor/dificultad.test.ts` tenían cada uno su copia del mismo loop, y
 *     ya habían divergido.
 *  2. **En `.ts` el compilador lo mira.** El `SPARRING` que vivía en el `.mjs`
 *     todavía declaraba `verso: 0` —un dial que se borró el 10/9/2026— y nadie
 *     se enteró, porque un `.mjs` se traga cualquier objeto. Acá eso no compila.
 *
 * Esto lo importan los tests y las herramientas. **Nunca `app/`**: no es parte
 * del juego, es el instrumento con el que se lo mide.
 */

import { type Jugador, type Partida, aplicar, nuevaPartida, otro, siguienteMano } from "./partida.ts";
import { decidirJugada } from "./bot.ts";
import { type Ficha, fichaVacia, observarMano } from "./lectura.ts";
import type { Personalidad } from "./personalidades.ts";

/**
 * Azar determinista (xorshift). Un test de balance que falla de a ratos no
 * sirve para nada: o mide siempre lo mismo, o no mide.
 */
export function azarFijo(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * EL MARGEN DE ERROR, QUE ES LO QUE FALTABA.
 *
 * Barriendo 48 combinaciones de umbrales con 900 partidas cada una, la "mejor"
 * dio 76,1%. Verificada con 4.000: 72,6%. Era ruido, y el barrido lo eligió
 * justamente por eso.
 *
 * Así que ningún número de este archivo se informa sin su margen. Al 95%, sobre
 * una moneda: 1,96·√(p(1−p)/n). Con p=0,5, que es el peor caso y el que
 * corresponde entre dos bots parecidos.
 */
export const margenDeError = (partidas: number) => (196 * 0.5) / Math.sqrt(partidas);

/**
 * ¿Esta diferencia es de verdad, o es el generador?
 *
 * Dos winrates medidos con la misma cantidad de partidas difieren de verdad
 * sólo si se separan más que el margen de los dos juntos.
 */
export const esDiferenciaReal = (a: number, b: number, partidas: number) =>
  Math.abs(a - b) > margenDeError(partidas) * Math.SQRT2;

/** Lo que deja una partida jugada: quién ganó y qué anotó cada uno del otro. */
export interface Resultado {
  ganador: Jugador;
  /** Lo que cada uno anotó del OTRO. */
  fichas: Record<Jugador, Ficha>;
  manos: number;
}

/** Juega una partida entera entre dos personalidades. */
export function jugarPartida(
  personaVos: Personalidad,
  personaRival: Personalidad,
  azar: () => number = Math.random,
): Resultado {
  let p: Partida = nuevaPartida(azar);
  // Cada uno lleva su propia ficha del otro, igual que en la mesa de verdad.
  let fichas: Record<Jugador, Ficha> = { vos: fichaVacia(), rival: fichaVacia() };
  let manos = 0;

  for (let vuelta = 0; vuelta < 20000; vuelta++) {
    if (p.fase === "partida-terminada") break;
    if (p.fase === "mano-terminada") {
      fichas = {
        vos: observarMano(fichas.vos, p, "rival"),
        rival: observarMano(fichas.rival, p, "vos"),
      };
      manos++;
      p = siguienteMano(p, azar);
      continue;
    }
    const quien = p.turno;
    const persona = quien === "vos" ? personaVos : personaRival;
    /* El espejo de uno es, exactamente, la ficha que lleva el otro: lo que el
       rival pudo anotar de él. No hace falta ninguna estructura nueva, y así el
       bot se juzga a sí mismo con la información que el otro tiene y no con la
       que tiene él. Sin esto, los rivales con `plan` alto arrancan sin crédito
       y no lo construyen nunca, o sea que mienten MENOS que los de nivel más
       bajo: medido, le costaba al ★5 el escalón entero contra el ★4. */
    const accion = decidirJugada(p, quien, azar, persona, fichas[quien], fichas[otro(quien)]);
    if (!accion) throw new Error(`${persona.nombre} se quedó sin jugadas posibles`);
    const antes = p;
    p = aplicar(p, accion, quien);
    if (p === antes) throw new Error(`jugada inválida: ${accion.tipo} de ${persona.nombre}`);
  }

  if (p.ganadorPartida === null) {
    // Una partida sin ganador es SIEMPRE un bug del motor. Callarlo ensuciaría
    // todas las mediciones sin que nadie se entere, que es justo lo que pasó
    // una vez.
    throw new Error("la partida terminó sin ganador: el motor se trabó");
  }
  return { ganador: p.ganadorPartida, fichas, manos };
}

/**
 * Winrate de A contra B, alternando de qué lado se sienta cada uno.
 *
 * En el truco ser mano es una ventaja real, así que medir sin alternar mide la
 * silla y no al jugador.
 */
export function duelo(
  a: Personalidad,
  b: Personalidad,
  partidas = 400,
  semilla?: number,
): number {
  const azar = semilla === undefined ? Math.random : azarFijo(semilla);
  let ganaA = 0;
  for (let i = 0; i < partidas; i++) {
    const derecha = i % 2 === 0;
    const { ganador } = derecha ? jugarPartida(a, b, azar) : jugarPartida(b, a, azar);
    if (ganador === (derecha ? "vos" : "rival")) ganaA++;
  }
  return (100 * ganaA) / partidas;
}

// ─── Los blancos de medición ─────────────────────────────────────────────────
//
// TIENEN QUE SER UN BLANCO QUIETO. Son los metros con los que se mide la gira,
// así que no pueden salir de ninguna personalidad de la gira: el día que se
// recalibre a Cachila, las mediciones viejas dejarían de ser comparables con
// las nuevas y nadie se daría cuenta. Por eso están escritos enteros acá.

/** El molde. No se usa para medir: es de donde salen los demás. */
const BASE: Personalidad = {
  id: "base", nombre: "Base", departamento: "-", lugar: "-",
  dificultad: 3, paso: 0, descripcion: "molde del banco de pruebas",
  cantaEnvidoCon: 28, quiereEnvidoCon: 24, subeEnvidoCon: 32,
  cantaTrucoCon: 0.73, quiereTrucoCon: 0.44, subeTrucoCon: 0.75,
  mentira: 0.2, silencio: 0.2, sentidoComun: 0.6,
  criterio: 0.7, lectura: 0, aguante: 0.5, memoria: 0, plan: 0,
  contraflorCon: 41, conFlorEnvidoCon: 36, quiereFlorCon: 35,
};

/**
 * El sparring: un rival de fuerza media que NO es ninguno de los 19.
 *
 * Medir contra uno de la gira comprimía justo la punta que interesa. Con un
 * sparring parado en el medio, los 19 se despliegan a los dos lados.
 *
 * No te lee (`lectura: 0`) a propósito: así el ajuste de lectura de los niveles
 * altos se mide contra un blanco quieto.
 */
export const SPARRING: Personalidad = {
  ...BASE, id: "sparring", nombre: "Sparring", descripcion: "referencia de medición",
  cantaEnvidoCon: 27, quiereEnvidoCon: 26, subeEnvidoCon: 32,
  cantaTrucoCon: 0.72, quiereTrucoCon: 0.42, subeTrucoCon: 0.75,
  criterio: 0.75,
};

/**
 * LAS CUATRO FORMAS DE JUGAR DE UNA PERSONA.
 *
 * Esto es lo que le faltaba al banco, y es la diferencia entre medir si un bot
 * es fuerte y medir si es DIFÍCIL. Bot contra bot, mentir no rinde: el otro no
 * te lee la mentira. Contra una persona sí, y al revés —una persona que miente
 * siempre es un regalo para quien la tiene fichada—.
 *
 * Un ★5 tiene que castigar a los cuatro. Un ★1 no tiene que poder con ninguno.
 * Si un nivel no separa mejor que el anterior, las estrellas mienten.
 */
export const PERFILES = {
  /** Canta todo, siempre, tenga o no tenga. Hay que pagarle a ver. */
  mentiroso: {
    ...BASE, id: "mentiroso", nombre: "Mentiroso", descripcion: "canta todo sin tener",
    mentira: 0.85, silencio: 0, cantaEnvidoCon: 18, cantaTrucoCon: 0.35,
  },
  /** Si canta, tiene. Hay que creerle y achicarse. */
  honesto: {
    ...BASE, id: "honesto", nombre: "Honesto", descripcion: "si canta, tiene",
    mentira: 0, silencio: 0.05,
  },
  /** Se achica con todo. Hay que cantarle sin parar. */
  miedoso: {
    ...BASE, id: "miedoso", nombre: "Miedoso", descripcion: "se achica con todo",
    mentira: 0.05, silencio: 0.5, quiereTrucoCon: 0.7, quiereEnvidoCon: 30, aguante: 0,
  },
  /** Te paga cualquier cosa. Hay que cantarle sólo con cartas. */
  pagador: {
    ...BASE, id: "pagador", nombre: "Pagador", descripcion: "quiere todo lo que le cantes",
    mentira: 0.2, silencio: 0.2, quiereTrucoCon: 0.05, quiereEnvidoCon: 15, aguante: 1,
  },
  /** Se calla el tanto bueno y espera para subirte. */
  pescador: {
    ...BASE, id: "pescador", nombre: "Pescador", descripcion: "se calla y después sube",
    mentira: 0.1, silencio: 0.6, subeEnvidoCon: 28,
  },
} as const satisfies Record<string, Personalidad>;

export const NOMBRES_PERFIL = Object.keys(PERFILES) as (keyof typeof PERFILES)[];
