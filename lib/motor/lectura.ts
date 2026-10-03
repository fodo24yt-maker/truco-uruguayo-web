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
 *   · los tantos que se CANTARON en voz alta, cuando el envido se quiso;
 *   · lo que dijiste: qué cantaste, qué no quisiste, cuándo te fuiste al mazo.
 *
 * Si te fuiste al mazo sin mostrar las tres, el bot vio menos y anota menos:
 * nunca completa lo que no vio. Hay tests que lo verifican.
 *
 * ─── TRES EJES, TRES DENOMINADORES ───────────────────────────────────────────
 *
 * Hasta el 11/9/2026 todo esto tenía un solo eje —¿mintió?— y un solo
 * denominador, `manosVistas`. Y para saber si alguien mintió hace falta ver sus
 * cartas, que pasa en el 33% de las manos. Medido: la ficha anotaba algo en una
 * de cada tres manos, `confianza` se quedaba clavada en 0,46, y el dial
 * `lectura` —lo único que separaba a un ★5 de un ★3— movía la aguja ±2 puntos.
 * Contra un rival que paga todo, leerlo hacía jugar PEOR.
 *
 * La salida no fue exprimir más ese eje, fue separar tres, cada uno con el
 * denominador que le corresponde:
 *
 *   VERACIDAD   ¿cantó sin tener?      pide evidencia    ~33% de las manos
 *   FRECUENCIA  ¿cada cuánto abre?     gratis            100%
 *   AGUANTE     ¿se achica?            gratis            100%
 *
 * Los dos últimos no necesitan ver una sola carta, y son justamente los que le
 * permiten al bot cobrarte el vicio: al que se achica siempre hay que cantarle
 * siempre. Con eso la cobertura pasó de 33% a prácticamente todas las manos.
 */

import { type Carta, calidadConHuecos, calidadDeMano } from "./baraja.ts";
import type { Jugador, Partida } from "./partida.ts";
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
  // ── EJE 1 · VERACIDAD ────────────────────────────────────────────────────
  // Todo esto necesita PROBAR qué tenía, así que sólo se anota cuando el tanto
  // se cantó en voz alta o las tres cartas quedaron sobre la mesa.
  /** Manos con evidencia suficiente para juzgar. Denominador de este eje. */
  manosVistas: number;
  envidosCantados: number;
  envidosFlojos: number;
  trucosCantados: number;
  trucosFlojos: number;
  /** Buen tanto callado que después subió el envido del otro. */
  pescas: number;

  // ── EJE 2 · FRECUENCIA ───────────────────────────────────────────────────
  // Gratis: se ve en todas las manos. El que abre el envido en ocho de cada
  // diez manos está mintiendo seguido por aritmética, sin verle una carta.
  /** Todas las manos que se jugaron. Denominador de este eje. */
  manosJugadas: number;
  /** Abrió él el envido (no lo contestó: lo abrió). */
  abrioEnvido: number;
  /** Cantó él el truco primero. */
  abrioTruco: number;

  // ── EJE 3 · AGUANTE ──────────────────────────────────────────────────────
  // También gratis, y es la mitad que faltaba: qué hace cuando le cantan A ÉL.
  /** Cantos de truco que recibió (truco, retruco o vale cuatro). */
  trucosRecibidos: number;
  /** …y de ésos, cuántos no quiso. Esto es la cobardía. */
  trucosNoQueridos: number;
  envidosRecibidos: number;
  envidosNoQueridos: number;
  /**
   * Cantó truco y después se achicó ante la subida.
   *
   * Es una mentira PROBADA sin haberle visto una sola carta: el que tiene con
   * qué no se achica cuando le suben lo que él mismo cantó. Cubre buena parte
   * del 41% de manos donde alguien canta truco y nunca se le ven las tres.
   */
  farolesCazados: number;
  /** Veces que se fue al mazo. */
  mazos: number;

  // ── Lo que se calló, que se juzga con cotas ──────────────────────────────
  /** Manos donde dejó al menos dos cartas a la vista: ahí se puede juzgar. */
  manosConCartas: number;
  /** Tenía buen tanto —probado o acotado— y no dijo nada. */
  tantoAltoCallado: number;
  /** Tenía mano brava —probada o acotada— y no cantó truco. */
  manoFuerteCallada: number;
}

export const FICHA_VACIA: Ficha = {
  manosVistas: 0,
  envidosCantados: 0,
  envidosFlojos: 0,
  trucosCantados: 0,
  trucosFlojos: 0,
  pescas: 0,
  manosJugadas: 0,
  abrioEnvido: 0,
  abrioTruco: 0,
  trucosRecibidos: 0,
  trucosNoQueridos: 0,
  envidosRecibidos: 0,
  envidosNoQueridos: 0,
  farolesCazados: 0,
  mazos: 0,
  manosConCartas: 0,
  tantoAltoCallado: 0,
  manoFuerteCallada: 0,
};

export const fichaVacia = (): Ficha => ({ ...FICHA_VACIA });

/** Los nombres de los contadores, para validar lo que venga de afuera. */
export const CAMPOS_FICHA = Object.keys(FICHA_VACIA) as (keyof Ficha)[];

/**
 * Junta dos fichas en una.
 *
 * Existe para poder tener SEPARADAS la ficha que viene del legajo —lo que el
 * rival se acuerda de otras partidas, con números fraccionarios porque lo viejo
 * pesa menos— y la de la partida que se está jugando, que son cuentas enteras.
 *
 * Tenerlas juntas en una sola parecía más simple y tenía un bug feo: al
 * terminar la partida se guardaba la suma, o sea lo de esta partida MÁS el eco
 * de las anteriores, y encima con decimales, que el saneador del legajo
 * rechaza. Contra los ★4 y ★5 —los únicos que siembran— eso hacía que después
 * de la primera partida no se guardara ninguna más, en silencio.
 */
export function sumarFichas(a: Ficha, b: Ficha): Ficha {
  const suma = fichaVacia();
  for (const campo of CAMPOS_FICHA) suma[campo] = a[campo] + b[campo];
  return suma;
}

/**
 * ¿Se sabe que tenía flor, sin espiarle la mano?
 *
 * Hay dos formas honestas de saberlo: que la haya CANTADO, o que haya mostrado
 * las tres cartas y se pueda contar. Preguntarle a `p.flor` directamente sería
 * hacer trampa: una flor que el rival se guardó no la vio nadie.
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
 * ¿ESTE jugador llegó a decir su tanto en voz alta?
 *
 * Ojo con la diferencia, que es fina y es justo donde estuvo la fuga. Que el
 * envido se haya QUERIDO no quiere decir que los dos hayan cantado su número:
 * por `reglas.txt` 9.4 el mano canta, y el pie, si no lo supera, dice **"son
 * buenas"** y no muestra nada. El motor ya lo sabe y lo anota en
 * `envidoJugado.dicho`; `lib/tantos-al-cierre.ts` lo respeta desde el 5/9/2026
 * para no soplar el tanto en pantalla.
 *
 * Acá se miraba sólo que el envido se hubiera querido, y después se leía
 * `p.manoInicial`. O sea que de un jugador que dijo "son buenas" el bot sacaba
 * el tanto exacto que nadie escuchó. Dos manos jugadas idénticamente, con
 * distinta carta guardada, daban fichas distintas: exactamente lo que los tests
 * ANTI-TRAMPA de este archivo prometen que no puede pasar.
 *
 * Era una fuga vieja y duraba lo que duraba la partida. Con el legajo pasaría a
 * guardarse, así que se arregla ahora.
 */
const loDijoEnVozAlta = (p: Partida, quien: Jugador) =>
  p.envidoJugado?.dicho[quien] === true;

/**
 * Y si dijo "son buenas", ¿hasta cuánto podía tener?
 *
 * Decir "son buenas" ES información: quiere decir que no le gana al número que
 * el otro acaba de cantar en voz alta. O sea que su tanto es MENOR O IGUAL a
 * ése. Eso no es espiar nada —lo escuchó toda la mesa— y es una cota SUPERIOR,
 * que es la única clase de cota que puede probar que alguien mintió: si el otro
 * cantó 24 y éste dijo "son buenas", tenía 24 o menos, y si además había
 * cantado el envido, lo cantó con menos de 25.
 *
 * Es la contracara exacta de las cotas de `baraja.ts`, que son inferiores y por
 * eso sólo pueden probar que TENÍA. Entre las dos cubren lo que se puede saber
 * honestamente sentado en esa mesa, y nada más que eso.
 */
function hastaCuantoPodiaTener(p: Partida, quien: Jugador): number | null {
  const e = p.envidoJugado;
  if (e === null || e.dicho[quien]) return null; // o no se jugó, o lo dijo él
  return e[e.ganador];
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

  // ── EJE 2 · Frecuencia: esto se ve siempre ──────────────────────────────
  f.manosJugadas++;
  if (p.historial.find((r) => r.tipo === "envido")?.quien === sobre) f.abrioEnvido++;
  if (p.historial.find((r) => r.tipo === "truco")?.quien === sobre) f.abrioTruco++;
  if (mios.some((r) => r.tipo === "mazo")) f.mazos++;

  // ── EJE 3 · Aguante: qué hace cuando le cantan a él ─────────────────────
  // Todo público: quién cantó y qué contestó. No hace falta ver una carta.
  for (const r of p.historial) {
    if (r.quien !== sobre && (r.tipo === "truco" || r.tipo === "envido")) {
      if (r.tipo === "truco") f.trucosRecibidos++;
      else f.envidosRecibidos++;
    }
    if (r.quien === sobre && r.tipo === "no-quiero") {
      if (r.sobre === "truco") f.trucosNoQueridos++;
      if (r.sobre === "envido") f.envidosNoQueridos++;
    }
  }

  // Cantó truco y después se achicó ante la subida: mentira probada sin ver
  // cartas. Sólo se anota cuando NO se le pudieron ver las tres, para no
  // juzgar dos veces la misma mano (abajo ya se juzga por cartas).
  const cantoTruco = mios.some((r) => r.tipo === "truco");
  const seAchicoEnSuPropioTruco = mios.some(
    (r) => r.tipo === "no-quiero" && r.sobre === "truco",
  );
  if (!mostroTodo && cantoTruco && seAchicoEnSuPropioTruco) f.farolesCazados++;

  // ── El tanto que tenía de verdad ────────────────────────────────────────
  // Dos formas honestas de saberlo, y ninguna es espiarle la mano:
  //   1) el envido se quiso, así que lo cantó en voz alta;
  //   2) jugó las tres cartas, así que están todas sobre la mesa.
  let tantoReal: number | null = null;
  if (loDijoEnVozAlta(p, sobre)) {
    tantoReal = valorEnvido(p.manoInicial[sobre], p.muestra); // lo cantó él: es público
  } else if (mostroTodo) {
    tantoReal = valorEnvido(vistas, p.muestra); // las tres están en la mesa
  }

  const cantosEnvido = mios.filter((r) => r.tipo === "envido");
  const huboEnvidoDelOtro = p.historial.some(
    (r) => r.tipo === "envido" && r.quien !== sobre,
  );

  // ── EJE 1 · Veracidad: acusar de mentir necesita PRUEBA ─────────────────
  if (tantoReal !== null) {
    if (cantosEnvido.length > 0) {
      f.envidosCantados++;
      if (tantoReal < ENVIDO_FLOJO) f.envidosFlojos++;

      // Se fue a la pesca: se calló, dejó que cantara el otro, y recién ahí
      // subió. Con buen tanto, eso no es timidez, es oficio.
      const abrioEl = p.historial.find((r) => r.tipo === "envido")?.quien === sobre;
      if (!abrioEl && huboEnvidoDelOtro && tantoReal >= ENVIDO_BUENO) f.pescas++;
    }
  } else if (cantosEnvido.length > 0) {
    // No se sabe cuánto tenía, pero puede saberse hasta cuánto PODÍA tener.
    const tope = hastaCuantoPodiaTener(p, sobre);
    if (tope !== null) {
      f.envidosCantados++;
      if (tope < ENVIDO_FLOJO) f.envidosFlojos++;
      f.manosVistas++; // se pudo juzgar el canto, aunque no verle las cartas
    }
    // Ojo: acá NO se puede anotar una pesca. Para eso haría falta saber que
    // tenía BUEN tanto, y una cota superior nunca prueba eso.
  }

  if (mostroTodo) {
    const calidad = calidadDeMano(vistas, p.muestra);
    if (cantoTruco) {
      f.trucosCantados++;
      if (calidad < TRUCO_FLOJO) f.trucosFlojos++;
    }
  }

  // ── Lo que se calló, juzgado con COTAS ──────────────────────────────────
  //
  // Acá está la diferencia que triplicó la cobertura, y la razón por la que hay
  // que leerla con cuidado. Con dos cartas sobre la mesa se puede calcular una
  // cota INFERIOR del tanto y de la calidad: lo que no se vio cuenta como la
  // peor carta de la baraja.
  //
  // Una cota inferior sólo puede probar una cosa: que TENÍA. Nunca que no
  // tenía. Por eso alimenta "se calló algo bueno" —que es un hecho, si la cota
  // ya llega al umbral— y NUNCA `envidosFlojos` ni `trucosFlojos`, que son
  // acusaciones de mentir. Ésa es la garantía anti-trampa escrita como una
  // propiedad y no como una promesa, y hay un test de fuerza bruta que verifica
  // que las dos cotas nunca superan el valor real.
  if (vistas.length >= 2) {
    f.manosConCartas++;

    const cotaTanto = tantoReal ?? valorEnvido(vistas, p.muestra);
    if (
      cantosEnvido.length === 0 &&
      cotaTanto >= ENVIDO_BUENO &&
      !teniaFlorALaVista(p, sobre, vistas, mostroTodo)
    ) {
      f.tantoAltoCallado++;
    }

    const cotaCalidad = calidadConHuecos(vistas, p.muestra, 3);
    if (!cantoTruco && cotaCalidad >= TRUCO_BRAVO) f.manoFuerteCallada++;
  }

  if (tantoReal !== null || mostroTodo) f.manosVistas++;
  return f;
}

// ─── Qué hace el bot con lo que anotó ────────────────────────────────────────

/**
 * Cuánta cuerda darle a un eje. Con dos observaciones no se puede concluir gran
 * cosa; con diez, bastante. Va de 0 a 1 y nunca llega del todo.
 *
 * **Cada eje se pesa con SU propio contador**, y eso es la mitad del arreglo
 * del 11/9/2026: antes todo se pesaba con `manosVistas`, que promedia 2,5 por
 * partida. `trucosRecibidos` junta como nueve en el mismo tiempo, así que la
 * cobardía se puede leer con confianza mientras la mentira todavía no.
 */
const confianza = (observaciones: number) => observaciones / (observaciones + 3);

/** Con qué frecuencia hace algo. Cuando no hay datos, se asume neutro. */
const tasa = (parte: number, total: number, neutro: number) =>
  total === 0 ? neutro : parte / total;

/** El punto neutro: por debajo el rival es honesto, por encima es mentiroso. */
const MENTIRA_NEUTRA = 0.35;
/** Cuánto se guarda un jugador del montón. */
const PASIVIDAD_NEUTRA = 0.25;
/**
 * Cada cuánto se achica un jugador del montón.
 *
 * MEDIDOS, no puestos a ojo: son el promedio de los 19 rivales de la gira,
 * sacados con el banco sobre 5.700 partidas. Por encima de esto el rival es un
 * cobarde y hay que cantarle más; por debajo aguanta y hay que cantarle con
 * cartas.
 *
 * El del truco baja limpio con el nivel —0,67 en los ★1 y 0,37 en El Turco—, y
 * por eso sirve para leer a alguien: es lo primero que delata a un jugador que
 * se achica. El del envido va al revés (0,29 → 0,70), porque un jugador bueno
 * no quiere el envido por selectivo y no por miedoso. Para el que lo lee da
 * igual el motivo: si no te lo quiere, cantarlo paga.
 */
const COBARDIA_TRUCO_NEUTRA = 0.54;
const COBARDIA_ENVIDO_NEUTRA = 0.49;

const acotar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export interface Ajuste {
  /** Se suma al umbral de tanto para querer el envido. */
  quiereEnvido: number;
  /** Se suma al umbral de calidad para querer el truco. */
  quiereTruco: number;
  /** Se suma al umbral para cantar el envido de primera. */
  cantaEnvido: number;
  /** Se suma al umbral para cantar el truco de primera. */
  cantaTruco: number;
}

export const SIN_AJUSTE: Ajuste = {
  quiereEnvido: 0,
  quiereTruco: 0,
  cantaEnvido: 0,
  cantaTruco: 0,
};

/**
 * LOS TOPES, Y POR QUÉ NO SON SIMÉTRICOS.
 *
 * Los umbrales de los rivales duros ya están parados en el punto que conviene
 * contra un jugador del montón, medido con el banco de pruebas. Así que hay
 * mucho para ganar bajándolos contra un mentiroso y poco para ganar subiéndolos:
 * pasarse de largo cuesta puntos. La primera versión de esto no tenía tope y
 * empujaba a El Turco más allá de su propio óptimo, o sea que leer al rival lo
 * hacía jugar PEOR.
 *
 * El signo es siempre el mismo y conviene tenerlo presente al tocar cualquiera
 * de estos números: **el ajuste se SUMA al umbral**. Positivo = más exigente,
 * más desconfiado. Negativo = más lanzado.
 */
export const TOPES = {
  quiereEnvido: [-5, 1.5],
  quiereTruco: [-0.14, 0.05],
  cantaEnvido: [-2, 3],
  cantaTruco: [-0.2, 0.1],
} as const;

/**
 * Qué hace el bot con lo que anotó.
 *
 * `lectura` es cuánto caso le hace este rival en particular: los primeros de la
 * gira no miran nada (0) y los últimos te tienen fichado (1). Ese es el dial
 * que mantiene la gira en escalera.
 */
export function ajustePorLectura(ficha: Ficha, lectura: number): Ajuste {
  if (lectura <= 0 || ficha.manosJugadas === 0) return { ...SIN_AJUSTE };

  const peso = (observaciones: number) => confianza(observaciones) * lectura;
  const pesoVeracidad = peso(ficha.manosVistas);

  const mentiraEnvido = tasa(ficha.envidosFlojos, ficha.envidosCantados, MENTIRA_NEUTRA);
  // La mentira de truco tiene DOS fuentes y se suman sin contarse dos veces:
  // las manos donde se le vieron las tres cartas, y los faroles cazados, que
  // son mentira probada en manos donde no se le vio ninguna.
  const mentiraTruco = tasa(
    ficha.trucosFlojos + ficha.farolesCazados,
    ficha.trucosCantados + ficha.farolesCazados,
    MENTIRA_NEUTRA,
  );

  // Cuánto se guarda: el que tiene mano brava y no canta es peligroso, porque
  // cuando habla es porque tiene. Cuenta a favor de creerle.
  const pasividad =
    ficha.manosConCartas === 0
      ? PASIVIDAD_NEUTRA
      : (ficha.tantoAltoCallado + ficha.manoFuerteCallada) / (ficha.manosConCartas * 2);
  const seGuarda = pasividad - PASIVIDAD_NEUTRA;

  // Mentiroso -> le bajo el umbral y le pago a ver.
  // Honesto o callado -> se lo subo y me achico, porque si canta, tiene.
  const quiereEnvido = acotar(
    (MENTIRA_NEUTRA - mentiraEnvido + seGuarda * 0.5) * 5 * pesoVeracidad,
    ...TOPES.quiereEnvido,
  );
  const quiereTruco = acotar(
    (MENTIRA_NEUTRA - mentiraTruco + seGuarda * 0.5) * 0.15 * pesoVeracidad,
    ...TOPES.quiereTruco,
  );

  // ── Lo que se puede cobrar sin verle una carta ──────────────────────────
  //
  // Al que se achica siempre hay que cantarle siempre. Es la mitad del oficio
  // que al bot le faltaba entera: hasta ahora podía decidir si te CREÍA, pero
  // no si te convenía cantarle.
  const cobardiaTruco = tasa(ficha.trucosNoQueridos, ficha.trucosRecibidos, COBARDIA_TRUCO_NEUTRA);
  const cantaTruco = acotar(
    -(cobardiaTruco - COBARDIA_TRUCO_NEUTRA) * 0.5 * peso(ficha.trucosRecibidos),
    ...TOPES.cantaTruco,
  );

  const cobardiaEnvido = tasa(ficha.envidosNoQueridos, ficha.envidosRecibidos, COBARDIA_ENVIDO_NEUTRA);
  // Si va seguido a la pesca, dejo de abrirle el envido con tanto mediano: es
  // justo lo que está esperando para subirme. Y si se achica, se lo canto más.
  const porPesca = (ficha.pescas / ficha.manosJugadas) * 4 * peso(ficha.manosJugadas);
  const porCobardia = -(cobardiaEnvido - COBARDIA_ENVIDO_NEUTRA) * 4 * peso(ficha.envidosRecibidos);
  const cantaEnvido = acotar(porPesca + porCobardia, ...TOPES.cantaEnvido);

  return { quiereEnvido, quiereTruco, cantaEnvido, cantaTruco };
}
