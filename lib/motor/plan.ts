/**
 * Copyright (c) 2026 fodo24yt-maker. Ver LICENSE en la raíz del repositorio.
 *
 * El plan: lo que separa a un rival que juega bien sus cartas de uno que además
 * juega la PARTIDA.
 *
 * Todo lo que hay en `bot.ts` mira la mano que se está jugando: qué cartas
 * tengo, qué hay sobre la mesa, qué me cantaron. Acá se mira lo otro, que es lo
 * que hace un jugador con oficio y el bot no hacía nunca:
 *
 *   1. **El marcador.** No es lo mismo un truco yendo 27 a 10 que yendo 10 a 27,
 *      y hasta el 11/9/2026 al bot le daba exactamente igual.
 *   2. **La cara que uno viene poniendo.** Mentir no es una moneda que se tira
 *      en cada mano: rinde cuando el otro tiene motivos para creerte, y no
 *      rinde cuando te acaba de agarrar. Eso se administra.
 *
 * Son funciones puras sobre datos planos, con una constante nombrada por regla
 * y un test por constante. Es a propósito: la alternativa natural para esto es
 * una bolsa de condiciones que nadie puede medir por separado.
 *
 * `plan` va de 0 a 1 y es el dial por nivel. **En 0 todo este archivo devuelve
 * exactamente lo de antes**, así que los primeros de la gira siguen jugando
 * igual que siempre y no hay que medirlos de nuevo.
 *
 * ═══ POR QUÉ HOY ESTÁ EN CERO PARA LOS 19, Y QUÉ HARÍA FALTA PARA PRENDERLO ══
 *
 * Esto se escribió entero, se arregló tres veces y se midió de cinco formas
 * distintas el 11/9/2026. **No se pudo demostrar que sirva**, así que quedó
 * apagado: en este proyecto no se deja prendido algo que mide peor.
 *
 * Los números, para que el que lo retome no los tenga que sacar de nuevo
 * (★5, panel de cinco perfiles, 11.000 partidas por casilla):
 *
 *     plan = 0 .................. 61,9%   ← la referencia
 *     plan = 1, primera versión . 57,9%
 *     …con el marcador arreglado  60,0%
 *     …con el crédito calibrado   60,5%
 *
 * Y contra un rival con MEMORIA CORTA, que es el que más debería premiar la
 * mentira administrada —es lo que se parece a una persona: te acordás de la
 * mano pasada, no de la tasa de toda la noche—, sale **peor todavía**: −2,6
 * puntos, que es más que el margen de error. O sea que no es que falte el
 * instrumento para verlo. Se midió con el instrumento correcto y no está.
 *
 * En retrospectiva tiene sentido: contra alguien de memoria corta, construir
 * fama de honesto no sirve porque se le olvida, y gastarla mintiendo de golpe
 * te deja pareciendo mentiroso justo en las manos que sí recuerda.
 *
 * Lo que SÍ quedó de acá, y sí está medido: `FALTA_EXIGE`. El umbral para
 * querer una falta envido era `quiereEnvidoCon + 4` y el bueno es **+5**
 * (61,4% → 62,6%). Ese número sigue vivo y lo usa `bot.ts` con `plan` en 0.
 *
 * Para prenderlo haría falta un juez que hoy no existe: un rival que modele la
 * SECUENCIA de lo que pasó y no la tasa agregada. Mientras tanto, el dial está
 * acá y se prende cambiando una columna de `OFICIO_POR_NIVEL`.
 */

import { PUNTOS_PARA_GANAR, type Jugador, laFalta, otro } from "./partida.ts";
import { type Ajuste, type Ficha, SIN_AJUSTE } from "./lectura.ts";

export interface Situacion {
  mios: number;
  suyos: number;
  /** Lo que paga hoy la falta envido. */
  falta: number;
  meFalta: number;
  leFalta: number;
  /**
   * Ganar la falta me da la partida en el acto.
   *
   * No es una heurística, es aritmética: la falta paga lo que le falta AL QUE VA
   * GANANDO. Si el que va ganando soy yo, ganarla me deja justo en 30. Si voy
   * perdiendo, ganarla me acerca pero no me alcanza… y perderla lo deja a él en
   * 30. Ésa es toda la asimetría de la falta envido y es lo que hace que sea la
   * mejor jugada del juego para el que va arriba y la peor para el que va abajo.
   */
  faltaMeDaLaPartida: boolean;
  /** Perder la falta se la da a él. */
  faltaSeLaDa: boolean;
  /** Está a punto de ganar igual: ya no hay ventaja que cuidar. */
  ahogado: boolean;
}

/** A cuántos puntos de ganar tiene que estar el otro para que sea urgente. */
const AHOGO = 4;
/**
 * Y cuánto más lejos tengo que estar yo.
 *
 * Las dos condiciones, no una. Con una sola, ir 26 a 27 daba "ahogado" —él a
 * tres de ganar— y ahí no hay nada que soltar: está parejísimo y el que se
 * desespera regala la partida que tenía. Ahogado es que él esté por ganar Y que
 * yo esté lejos.
 */
const AHOGO_DIFERENCIA = 6;

export function situacion(puntos: Record<Jugador, number>, quien: Jugador): Situacion {
  const mios = puntos[quien];
  const suyos = puntos[otro(quien)];
  const meFalta = PUNTOS_PARA_GANAR - mios;
  const leFalta = PUNTOS_PARA_GANAR - suyos;
  return {
    mios,
    suyos,
    falta: laFalta(puntos),
    meFalta,
    leFalta,
    faltaMeDaLaPartida: mios >= suyos,
    faltaSeLaDa: suyos >= mios,
    ahogado: leFalta <= AHOGO && meFalta - leFalta >= AHOGO_DIFERENCIA,
  };
}

// ─── 1. El marcador ──────────────────────────────────────────────────────────

/**
 * ─── EL ERROR QUE TUVO ESTO EL PRIMER DÍA, PORQUE VUELVE SOLO ───────────────
 *
 * La primera versión corría el umbral de TODOS los envidos con la asimetría de
 * la falta: "yendo perdiendo la falta se la regalo, así que me pongo exigente".
 * Medido, le costaba 2 puntos de winrate, y el motivo es que el razonamiento
 * era cierto pero estaba aplicado donde no va. **Un envido común no le da la
 * partida a nadie.** Esa asimetría existe sólo en la falta envido, y por eso
 * ahora vive sólo en `umbralDeLaFalta` y en `convieneLaFalta`, acá abajo.
 *
 * Y el signo estaba dado vuelta, que es el mismo error que ya se había cometido
 * una vez en la tabla de `personalidades.ts`: al que va perdiendo no le sirve
 * ponerse prudente. No jugar es la forma más segura de seguir perdiendo. El que
 * va abajo arriesga, el que va arriba cuida.
 */

/** Lo que se suelta el que va perdiendo: no jugar no lo va a salvar. */
const VOY_ABAJO_ENVIDO = -1.5;
const VOY_ABAJO_TRUCO = -0.05;
/** Lo que se guarda el que va cómodo: no hace falta jugarse manos grandes. */
const VOY_ARRIBA_TRUCO = 0.04;
/** Con cuánta diferencia se considera que la partida está inclinada. */
const DIFERENCIA_QUE_PESA = 6;
/** Lo que se suelta el que ya no tiene nada que cuidar. */
const AHOGADO_ENVIDO = -2.5;
const AHOGADO_TRUCO = -0.08;
/** Cuánto se lanza el que con esta mano cierra la partida. */
const CERRANDO = -0.06;

/**
 * Cómo corre el marcador los umbrales.
 *
 * Cuatro reglas, ni una más, y cada una con su constante arriba para que se
 * pueda mover una sola y medir qué pasó. Eso no es prolijidad: es la única
 * forma de haber encontrado que la versión anterior estaba al revés.
 */
export function ajustePorMarcador(s: Situacion, plan: number): Ajuste {
  if (plan <= 0) return { ...SIN_AJUSTE };

  let quiereEnvido = 0;
  let quiereTruco = 0;
  let cantaTruco = 0;

  // 1 y 2. Quién va arriba y quién va abajo.
  if (s.suyos - s.mios >= DIFERENCIA_QUE_PESA) {
    quiereEnvido += VOY_ABAJO_ENVIDO;
    quiereTruco += VOY_ABAJO_TRUCO;
  } else if (s.mios - s.suyos >= DIFERENCIA_QUE_PESA) {
    quiereTruco += VOY_ARRIBA_TRUCO;
  }

  // 3. Con ésta cierro: vale la pena arriesgar la mano.
  if (s.meFalta <= 2) cantaTruco += CERRANDO;

  // 4. Ahogado. Va último y pisa a los demás a propósito: cuando el otro está a
  //    tres puntos de ganar, cuidar una ventaja que no existe es la única forma
  //    segura de perder. Es el "hay veces que hay que aceptar que probablemente
  //    gane el otro" leído al derecho: se juega la partida ahora.
  if (s.ahogado) {
    quiereEnvido += AHOGADO_ENVIDO;
    quiereTruco += AHOGADO_TRUCO;
    cantaTruco += AHOGADO_TRUCO;
  }

  return {
    quiereEnvido: quiereEnvido * plan,
    quiereTruco: quiereTruco * plan,
    cantaEnvido: 0,
    cantaTruco: cantaTruco * plan,
  };
}

/**
 * CUÁNTO MÁS SE LE PIDE A LA FALTA ENVIDO QUE A UN ENVIDO CUALQUIERA.
 *
 * Calibrado contra cómo se juega de verdad y no contra el banco: una falta
 * envido se quiere con 33 ó 34. Sobre el umbral del ★5 —28— eso da 6.
 */
const FALTA_EXIGE = 5;

/**
 * Cuánto de la lectura entra cuando lo que está en juego es la partida entera.
 *
 * El tope general de `quiereEnvido` es −5, y con la falta sobre la mesa eso es
 * demasiado: dejaría al ★5 queriéndola con 29, que no lo hace nadie por más
 * mentiroso que sea el otro. Acotado a −3 queda en 31 contra un mentiroso
 * probado y en 34 contra uno honesto, que es exactamente cómo se juega.
 */
const LECTURA_EN_LA_FALTA = 3;

/** Cuánto se afloja para querer la falta el que, ganándola, cierra la partida. */
const FALTA_A_FAVOR = 2;

/** Con qué tanto se quiere una falta envido. */
export function umbralDeLaFalta(
  quiereEnvidoCon: number,
  ajusteDeLectura: number,
  s: Situacion,
  plan: number,
): number {
  /* La LECTURA entra siempre, tenga plan o no: leer al rival está medido y es
     lo que produce lo que se pidió —"con 31 te la aceptan igual, porque saben
     que mentís"—. Lo único que depende de `plan` es la asimetría del marcador. */
  const lectura = Math.max(-LECTURA_EN_LA_FALTA, Math.min(LECTURA_EN_LA_FALTA, ajusteDeLectura));
  // Y la asimetría, que es el único canto del juego que la tiene: al que va
  // arriba ganarla lo deja en 30, y al que va abajo perderla lo liquida.
  const asimetria = s.faltaMeDaLaPartida && !s.faltaSeLaDa ? -FALTA_A_FAVOR : 0;
  return quiereEnvidoCon + FALTA_EXIGE + lectura + asimetria * plan;
}

/**
 * ¿Conviene CANTAR la falta envido?
 *
 * Con `plan` en 0 queda la regla de antes —cantarla sólo si paga más de 4—, que
 * mira cuánto se lleva y no a quién se la está regalando. Con plan, se mira lo
 * que importa: yendo arriba la falta cierra la partida y hay que cantarla;
 * yendo abajo, es el otro el que la cierra, y sólo se canta si ya da lo mismo.
 */
export function convieneLaFalta(s: Situacion, plan: number): boolean {
  if (plan <= 0) return s.falta > 4;
  if (s.ahogado) return true;
  if (s.faltaSeLaDa && !s.faltaMeDaLaPartida) return false;
  return true;
}

// ─── 2. La cara que uno viene poniendo ───────────────────────────────────────

/**
 * Cuánto te cuesta que te agarren una mentira, en mentiras dichas.
 *
 * Pesa el doble que una verdad porque así funciona: construir fama de honesto
 * lleva varias manos y perderla lleva una.
 */
const LO_QUE_CUESTA_QUE_TE_AGARREN = 2;
/** Cuántas verdades mostradas hacen falta para tener crédito lleno. */
const VERDADES_PARA_CREDITO = 3;

/**
 * El crédito que tiene el bot con el jugador, de 0 a 1.
 *
 * ─── EL TRUCO DE ESTO, QUE ES NO TENER NINGUNO ──────────────────────────────
 *
 * `espejo` NO es una estructura nueva ni una contabilidad aparte: es la ficha
 * que `lectura.ts` arma, corrida sobre el propio bot. O sea, literalmente lo
 * que VOS pudiste anotar de él mirando la mesa.
 *
 * Eso tiene dos consecuencias buenas. La primera es que no hay una línea nueva
 * de código de observación, y por lo tanto ninguna superficie nueva por donde
 * se pueda colar una trampa: corre el mismo `observarMano` que ya tiene dos
 * tests anti-trampa. La segunda es que el bot se juzga a sí mismo con la
 * información que tiene el otro, y no con la que tiene él. Un farol que no le
 * descubrieron no le gasta crédito, porque desde tu silla nunca pasó.
 */
export function creditoDe(espejo: Ficha): number {
  const mostradas =
    espejo.envidosCantados - espejo.envidosFlojos + (espejo.trucosCantados - espejo.trucosFlojos);
  const desnudadas = espejo.envidosFlojos + espejo.trucosFlojos + espejo.farolesCazados;
  const neto = mostradas - LO_QUE_CUESTA_QUE_TE_AGARREN * desnudadas;
  return Math.max(0, Math.min(1, neto / VERDADES_PARA_CREDITO));
}

/**
 * Cuánto miente el bot cuando todavía no se ganó que le crean.
 *
 * No es cero: un rival que no miente NUNCA hasta cierta mano es tan legible
 * como uno que miente siempre, y además no se podría construir crédito jugando.
 */
const SIN_CREDITO = 0.15;

/**
 * CUÁNTO MIENTE CUANDO YA SE GANÓ QUE LE CREAN. Y por qué es mayor que 1.
 *
 * La primera versión de esto iba de 0,15 a 1: o sea que administrar la mentira
 * sólo podía SACAR mentiras, nunca moverlas de lugar. Con la mentira base ya
 * calibrada, eso es alejarse del punto bueno y nada más, y medido costaba dos
 * puntos de winrate contra cualquiera, incluso contra rivales que leen.
 *
 * Que el techo pase de 1 es lo que convierte la idea en una jugada: la cantidad
 * total de mentiras se parece a la de antes, pero se corren de lugar. Se dicen
 * cuando el otro tiene motivos para creer, y no cuando te acaban de agarrar.
 */
const CON_CREDITO = 1.8;

/**
 * La mentira, administrada.
 *
 * Esto es lo que pidió Santiago con todas las letras: *"mentir solamente cuando
 * anteriormente te dijeron la verdad y te ganaron mostrándote cartas buenas"*.
 * El bot no miente porque le tocó el número: miente cuando tiene con qué
 * respaldarlo, y se calla cuando lo acaban de agarrar.
 *
 * Con `plan` en 0 devuelve la mentira de siempre, tal cual, sin tocar nada.
 */
export function mentiraEfectiva(
  base: number,
  credito: number,
  s: Situacion,
  plan: number,
): number {
  if (plan <= 0) return base;
  // Al que se está por quedar sin partida no le sirve administrar nada. Un tipo
  // que va 8 a 27 miente igual, y eso también es verdad en la mesa.
  if (s.ahogado) return base;

  const factor = SIN_CREDITO + (CON_CREDITO - SIN_CREDITO) * credito;
  return base * ((1 - plan) + plan * factor);
}
