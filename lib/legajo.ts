/**
 * Copyright (c) 2026 fodo24yt-maker. Ver LICENSE en la raíz del repositorio.
 *
 * El legajo: lo que los rivales duros se acuerdan de vos de otras partidas.
 *
 * La ficha de `lib/motor/lectura.ts` dura lo que dura una partida y después se
 * olvida. Eso está bien para los primeros de la gira, que te miran jugar y no
 * mucho más. Pero los últimos tienen que sentarse SABIENDO cómo jugás, porque
 * es lo que hace que el final de la gira pegue distinto que el principio.
 *
 * ─── ES UN LEGAJO DEL JUGADOR, NO DE CADA RIVAL ──────────────────────────────
 *
 * Uno solo, compartido. Así El Turco ya te conoce la primera vez que te sentás
 * con él, porque venís de jugar dieciocho departamentos y en la gira se corre la
 * voz. La alternativa —uno por rival— hacía que justo los que tienen que ser
 * bravos arrancaran ciegos y recién apretaran en la revancha.
 *
 * ─── QUÉ GUARDA, QUE NO ES NINGUNA CARTA ─────────────────────────────────────
 *
 * Guarda la `Ficha` con la que cerró cada partida, y la ficha sólo tiene
 * contadores de lo que se vio en la mesa: cuántas veces cantaste, cuántas te
 * achicaste, cuántas te fuiste al mazo. **Ni una carta tuya**, porque la ficha
 * nunca las tuvo: la regla anti-trampa de `lectura.ts` vale igual acá y hay un
 * test que compara los campos guardados contra los de una ficha vacía.
 *
 * ─── DÓNDE VIVE, Y POR QUÉ NO EN EL PROGRESO ─────────────────────────────────
 *
 * Clave propia, `truco-uy:legajo`, igual que hizo `lib/sonido.ts`. Meterlo
 * adentro de `truco-uy:progreso` sería arriesgar la gira entera de quien ya
 * jugó por un dato que, si se pierde, no le duele a nadie: `CLAUDE.md` avisa
 * dos veces que tocar dónde vive el progreso es lo más caro que hay acá. Una
 * clave nueva es puramente aditiva y no puede romper nada que ya exista.
 *
 * Y como todo lo que sale de `localStorage`, se trata como sospechoso: se valida
 * campo por campo, con el mismo `sanear` de `lib/progreso.ts`. Cualquiera puede
 * editarlo a mano desde la consola, y lo peor que tiene que poder lograr es que
 * el bot juegue como si no supiera nada.
 */

import { CAMPOS_FICHA, type Ficha, fichaVacia } from "./motor/lectura.ts";

const CLAVE = "truco-uy:legajo";
const VERSION = 1;

/** Cuántas partidas se recuerdan. Más allá de esto no cambia la lectura. */
export const CUANTAS_PARTIDAS = 3;

/** Ningún contador honesto llega ni cerca. Lo de afuera que se pase, se cae. */
const TOPE_CONTADOR = 10000;

export interface Entrada {
  /** Contra quién fue. No cambia nada de la lectura: es para poder depurarlo. */
  rival: string;
  cuando: number;
  ganaste: boolean;
  ficha: Ficha;
}

export interface Legajo {
  version: number;
  /** De la más vieja a la más nueva. Nunca más de `CUANTAS_PARTIDAS`. */
  partidas: Entrada[];
}

export const LEGAJO_VACIO: Legajo = { version: VERSION, partidas: [] };

const esContador = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= TOPE_CONTADOR;

/**
 * Las cuentas que tienen que cerrar sí o sí.
 *
 * No se puede haber mentido más veces de las que se cantó, ni haberse achicado
 * más veces de las que le cantaron. Es la misma idea del `ganadas > jugadas` de
 * `progreso.ts`, y acá importa más: sin esto, editando el `localStorage` a mano
 * se le puede fabricar al bot una lectura que ninguna partida produjo.
 */
const COHERENCIAS: readonly (readonly [keyof Ficha, keyof Ficha])[] = [
  ["envidosFlojos", "envidosCantados"],
  ["trucosFlojos", "trucosCantados"],
  ["trucosNoQueridos", "trucosRecibidos"],
  ["envidosNoQueridos", "envidosRecibidos"],
  ["manosVistas", "manosJugadas"],
  ["manosConCartas", "manosJugadas"],
  ["envidosCantados", "manosJugadas"],
  ["trucosCantados", "manosJugadas"],
  ["abrioEnvido", "manosJugadas"],
  ["abrioTruco", "manosJugadas"],
  ["pescas", "manosJugadas"],
  ["mazos", "manosJugadas"],
  ["farolesCazados", "manosJugadas"],
  ["tantoAltoCallado", "manosConCartas"],
  ["manoFuerteCallada", "manosConCartas"],
];

/** Una ficha confiable, o `null` si lo que vino no cierra. */
function sanearFicha(crudo: unknown): Ficha | null {
  if (typeof crudo !== "object" || crudo === null) return null;
  const d = crudo as Record<string, unknown>;

  /* Se construye un objeto NUEVO con las claves conocidas, en vez de filtrar el
     que vino. Así nada de lo que traiga de más entra, ni siquiera si viene por
     la cadena de prototipos: `Object.hasOwn` y no un acceso pelado, que es el
     agujero que ya mordió a este proyecto una vez (ver `progreso.ts`). */
  const ficha = fichaVacia();
  for (const campo of CAMPOS_FICHA) {
    if (!Object.hasOwn(d, campo)) return null;
    const v = d[campo];
    if (!esContador(v)) return null;
    ficha[campo] = v;
  }

  for (const [parte, total] of COHERENCIAS) {
    if (ficha[parte] > ficha[total]) return null;
  }
  return ficha;
}

/** Una entrada confiable, o `null`. Una entrada mala no tira el legajo entero. */
function sanearEntrada(crudo: unknown): Entrada | null {
  if (typeof crudo !== "object" || crudo === null) return null;
  const d = crudo as Record<string, unknown>;

  if (typeof d.rival !== "string" || !/^[a-z0-9-]{1,40}$/.test(d.rival)) return null;
  if (typeof d.ganaste !== "boolean") return null;
  if (typeof d.cuando !== "number" || !Number.isFinite(d.cuando) || d.cuando < 0) return null;

  const ficha = sanearFicha(d.ficha);
  if (ficha === null) return null;
  return { rival: d.rival, cuando: d.cuando, ganaste: d.ganaste, ficha };
}

/** Convierte lo que haya guardado en un legajo confiable. Nunca lanza. */
export function sanear(crudo: unknown): Legajo {
  if (typeof crudo !== "object" || crudo === null) return { ...LEGAJO_VACIO, partidas: [] };
  const d = crudo as Record<string, unknown>;
  if (!Array.isArray(d.partidas)) return { ...LEGAJO_VACIO, partidas: [] };

  const partidas = d.partidas
    .map(sanearEntrada)
    .filter((e): e is Entrada => e !== null)
    .slice(-CUANTAS_PARTIDAS);

  return { version: VERSION, partidas };
}

/** Lee el legajo. Devuelve el vacío si no hay nada o si el navegador no deja. */
export function leerLegajo(): Legajo {
  if (typeof window === "undefined") return { ...LEGAJO_VACIO, partidas: [] };
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return { ...LEGAJO_VACIO, partidas: [] };
    return sanear(JSON.parse(crudo));
  } catch {
    // Modo privado, cuota llena, JSON corrupto: se sigue jugando igual
    return { ...LEGAJO_VACIO, partidas: [] };
  }
}

/** Guarda el legajo. Si el navegador no deja, se ignora en silencio. */
export function guardarLegajo(legajo: Legajo): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(legajo));
  } catch {
    // Que no se pueda guardar no puede romper nada: se juega sin memoria
  }
}

/**
 * Anota la partida que se acaba de terminar y devuelve el legajo nuevo.
 *
 * Se llama SIEMPRE, gane quien gane y contra quien sea, incluido Luquita: el
 * legajo es tuyo, no del rival, así que también lo llenan las partidas contra
 * los que no leen nada.
 *
 * Se valida al escribir y no sólo al leer, igual que `lib/sonido.ts`: si la
 * ficha que llega no cierra, no se guarda basura que después haya que descartar.
 */
export function anotarEnLegajo(rival: string, ganaste: boolean, ficha: Ficha): Legajo {
  const entrada = sanearEntrada({ rival, ganaste, cuando: Date.now(), ficha });
  const legajo = leerLegajo();
  if (entrada === null) return legajo;

  const nuevo: Legajo = {
    version: VERSION,
    partidas: [...legajo.partidas, entrada].slice(-CUANTAS_PARTIDAS),
  };
  guardarLegajo(nuevo);
  return nuevo;
}

/**
 * CUÁNTO PESA LO VIEJO. De la partida más nueva a la más vieja.
 *
 * Bajan rápido a propósito: lo de hace tres partidas es una pista, no una
 * sentencia. Alguien que cambia de estilo tiene que poder reeducar al bot
 * dentro de la partida que está jugando, y eso es justamente lo que separa
 * "difícil" de "injusto".
 */
const PESO_POR_ANTIGUEDAD = [0.5, 0.3, 0.15] as const;

/**
 * EL TOPE, QUE ES LA DECISIÓN QUE MÁS IMPORTA DE TODO EL ARCHIVO.
 *
 * El legajo entra como si fueran seis manos ya vistas, y ni una más, por más
 * partidas que se acumulen. Con eso `confianza` arranca en 0,66 en vez de 0
 * —el bot se sienta sabiendo— pero a las pocas manos de juego real lo nuevo ya
 * pesa más que lo viejo.
 *
 * Sin este tope, tres partidas largas entraban con veinte manos de evidencia y
 * el bot quedaba clavado en la idea que se había hecho de vos, sin forma de
 * cambiarla jugando. Eso no es un rival difícil: es un rival sordo.
 */
export const TOPE_SIEMBRA = 6;

/**
 * Con qué ficha arranca la partida.
 *
 * `memoria` es cuánto recuerda este rival en particular, de 0 a 1. En 0 —los
 * ★1, ★2 y ★3— devuelve una ficha vacía y el rival te mira jugar desde cero,
 * que es justamente lo que los hace enseñables.
 *
 * Ojo con los números que devuelve: son FRACCIONARIOS, a diferencia de los que
 * cuenta `observarMano`. No molesta porque todo lo que hace `ajustePorLectura`
 * con ellos es dividir uno por otro, pero lo que se GUARDA en el legajo sigue
 * siendo entero, y el saneador lo exige.
 */
export function fichaSembrada(legajo: Legajo, memoria: number): Ficha {
  const ficha = fichaVacia();
  if (memoria <= 0 || legajo.partidas.length === 0) return ficha;

  // `partidas` viene de la más vieja a la más nueva, así que se recorre al revés
  const deLaMasNueva = [...legajo.partidas].reverse();
  for (let i = 0; i < deLaMasNueva.length; i++) {
    const peso = (PESO_POR_ANTIGUEDAD[i] ?? 0) * memoria;
    if (peso <= 0) continue;
    for (const campo of CAMPOS_FICHA) {
      ficha[campo] += deLaMasNueva[i].ficha[campo] * peso;
    }
  }

  // El tope se aplica reescalando TODO el vector por igual: si se recortara
  // sólo `manosJugadas`, las tasas quedarían mintiendo (ocho envidos flojos
  // sobre seis manos).
  if (ficha.manosJugadas > TOPE_SIEMBRA) {
    const factor = TOPE_SIEMBRA / ficha.manosJugadas;
    for (const campo of CAMPOS_FICHA) ficha[campo] *= factor;
  }
  return ficha;
}

/**
 * Borra el legajo.
 *
 * Todavía no la llama nadie: el botón de "empezar de nuevo" del progreso no
 * existe, y cuando exista tiene que llamar a ésta además de a `borrarProgreso`.
 * Se deja escrita para que ese día sea una línea y no haya que acordarse de que
 * hay una segunda clave. Mientras tanto, limpiar los datos del sitio desde el
 * navegador la borra igual, que es lo que dice la página de privacidad.
 */
export function borrarLegajo(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    /* nada que hacer */
  }
}
