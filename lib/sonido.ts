/**
 * Cuánto suena cada cosa, guardado en el navegador de quien juega.
 *
 * ── QUÉ ES ESTO, Y QUÉ NO ────────────────────────────────────────────────
 *
 * Acá no suena nada: hay cuatro números y un interruptor, que se guardan y se
 * vuelven a leer. El que hace sonar es `lib/audio.ts`, que desde el 21/10/2026
 * pone la música de fondo (las voces y los efectos vienen después) y lee de
 * acá cuánto. Cuando una barra cambia, este archivo avisa con el evento
 * `EVENTO_SONIDO` (con los ajustes nuevos adentro, ver `sonidoDelAviso`) y el
 * reproductor se acomoda en el momento.
 *
 * Se escribió antes que el motor a propósito. Los volúmenes son una preferencia
 * de la persona: el día que se borren porque hubo que mover dónde vivían, se
 * borran para todos los que ya jugaron. Elegir la clave y el formato ahora, con
 * el archivo vacío, no le cuesta nada a nadie.
 *
 * ── POR QUÉ NO ESTÁ ADENTRO DE `lib/progreso.ts` ─────────────────────────
 *
 * Clave propia, `truco-uy:sonido`, y no un campo más de `Progreso`. Dos razones:
 *
 *   1. `borrarProgreso()` es el botón de "empezar de nuevo". Que empezar la
 *      gira de cero te deje además la música al 60% es un efecto que nadie
 *      pidió y que nadie relaciona con el botón que tocó.
 *   2. `CLAUDE.md` avisa dos veces que tocar dónde vive el progreso es de lo
 *      más caro que hay en este proyecto. Una clave nueva es puramente
 *      aditiva: no puede romper una gira que ya existe.
 *
 * ── LO QUE SALE DE `localStorage` ES SOSPECHOSO ──────────────────────────
 *
 * Cualquiera abre la consola y escribe lo que quiera adentro de esta clave. Se
 * valida campo por campo antes de usarlo, con el mismo criterio de
 * `lib/progreso.ts`: **si un valor no cierra, vale el de por defecto**, y esto
 * nunca lanza. El peor caso de un volumen corrupto es un ruido a todo volumen
 * en el oído de alguien, así que la regla también se aplica al GUARDAR y no
 * sólo al leer.
 */

const CLAVE = "truco-uy:sonido";
const VERSION = 1;

/** Lo que se dispara en `window` cada vez que se guardan los ajustes. */
export const EVENTO_SONIDO = "truco-uy:sonido";

/**
 * Las tres cosas que suenan, cada una con su barra.
 *
 * Están separadas porque se quieren cosas distintas de cada una: la música
 * molesta en el ómnibus, las voces son las que traen la información —"¡Truco!"
 * es lo que pasó— y los efectos son los que hacen que la mesa se sienta mesa.
 * Quien quiera jugar callado baja la música y deja las voces.
 */
export type Canal = "musica" | "voces" | "efectos";

/** Las cuatro barras del panel: los tres canales y el maestro. */
export type Barra = Canal | "general";

export const CANALES: readonly Canal[] = ["musica", "voces", "efectos"];
export const BARRAS: readonly Barra[] = ["general", "musica", "voces", "efectos"];

/**
 * De a cuánto se mueve una barra.
 *
 * De a 5 y no de a 1: con el dedo en una pantalla de 320px, cien posiciones son
 * noventa y nueve que nadie puede elegir a propósito. Veintiuna alcanzan de
 * sobra para un volumen y hacen que soltar el dedo caiga siempre en un número
 * redondo.
 *
 * Es sólo del panel: `sanear` acepta cualquier entero de 0 a 100, porque un
 * valor guardado no tiene por qué haber salido de esta barra.
 */
export const PASO = 5;

export interface Sonido {
  version: number;
  /** El interruptor general. Manda sobre todos los volúmenes. */
  silencio: boolean;
  /** 0 a 100. Multiplica a los otros tres. */
  general: number;
  musica: number;
  voces: number;
  efectos: number;
}

/**
 * Con qué arranca alguien que nunca tocó nada.
 *
 * No son los cuatro en 100, y es a propósito: las voces son las que traen la
 * información y tienen que ganarle a todo, los efectos acompañan, y la música
 * es fondo. Arrancar con los cuatro iguales obliga a cada persona a hacer a
 * mano la mezcla que ya sabemos que queremos.
 *
 * **La música arranca en 30, no en 60** (21/10/2026). Santiago la escuchó y
 * pidió "que se escuche poquito". Los temas ya vienen todos a -23 LUFS
 * (`herramientas/publicar-musica.mjs`), y la barra es lineal en amplitud
 * (`volumenReal` va directo a una ganancia): 30 son unos 10 dB menos, o sea
 * que de fábrica la música queda unos 14 dB debajo de las voces. Quien la
 * quiera más fuerte la sube; el máximo sigue siendo un nivel de fondo sensato.
 *
 * Bajar este número no le cambia nada a quien ya movió la barra: lo guardado
 * manda, y el valor de fábrica sólo vale para quien nunca la tocó.
 */
export const SONIDO_POR_DEFECTO: Sonido = {
  version: VERSION,
  silencio: false,
  general: 100,
  musica: 30,
  voces: 100,
  efectos: 80,
};

/**
 * Un volumen confiable, o el de por defecto.
 *
 * Una sola regla —entero de 0 a 100— en vez de dos. Recortar `150` a `100` y
 * `-5` a `0` sonaba más amable, pero son dos comportamientos para dos formas de
 * estar mal y ninguna de las dos la produce alguien jugando: un número fuera de
 * rango en esta clave salió de la consola. Con una sola regla, lo que hace esto
 * se dice en un renglón y se prueba en uno.
 *
 * `Number.isInteger` ya descarta `NaN`, `Infinity`, `"80"` y `null` de una.
 */
const nivel = (v: unknown, porDefecto: number): number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100 ? v : porDefecto;

/** Convierte lo que haya guardado en algo usable. Nunca lanza. */
function sanear(crudo: unknown): Sonido {
  if (typeof crudo !== "object" || crudo === null) return { ...SONIDO_POR_DEFECTO };
  const d = crudo as Record<string, unknown>;

  return {
    version: VERSION,
    silencio: typeof d.silencio === "boolean" ? d.silencio : SONIDO_POR_DEFECTO.silencio,
    general: nivel(d.general, SONIDO_POR_DEFECTO.general),
    musica: nivel(d.musica, SONIDO_POR_DEFECTO.musica),
    voces: nivel(d.voces, SONIDO_POR_DEFECTO.voces),
    efectos: nivel(d.efectos, SONIDO_POR_DEFECTO.efectos),
  };
}

/** Lee los ajustes. Devuelve los de por defecto si no hay nada o si no se puede. */
export function leerSonido(): Sonido {
  if (typeof window === "undefined") return { ...SONIDO_POR_DEFECTO };
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return { ...SONIDO_POR_DEFECTO };
    return sanear(JSON.parse(crudo));
  } catch {
    // Modo privado, cuota llena, JSON corrupto: se sigue jugando igual
    return { ...SONIDO_POR_DEFECTO };
  }
}

/** Guarda los ajustes y avisa. Si el navegador no deja guardar, se ignora en silencio. */
export function guardarSonido(sonido: Sonido): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(sonido));
  } catch {
    // Que no se pueda guardar un volumen no puede romper nada
  }
  /* El aviso sale aunque no se haya podido guardar (modo privado): lo que se
     eligió vale igual para lo que queda de la sesión. Por eso lleva el valor
     adentro, ya saneado, y no obliga a releer `localStorage`, que en ese caso
     devolvería lo de antes. `dispatchEvent` puede faltar en el navegador de
     mentira de los tests. */
  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(EVENTO_SONIDO, { detail: sanear(sonido) }));
  }
}

/**
 * Los ajustes que trae un aviso de `EVENTO_SONIDO`, o los guardados si el aviso
 * no trae nada usable. Pasa por `sanear` igual: un evento en `window` lo puede
 * disparar cualquiera que corra en la página, y el criterio de este archivo es
 * que nada entra sin validar.
 */
export function sonidoDelAviso(e: Event): Sonido {
  const detalle = (e as CustomEvent<unknown>).detail;
  return detalle === undefined || detalle === null ? leerSonido() : sanear(detalle);
}

/**
 * Mueve una barra y guarda. Devuelve los ajustes ya actualizados.
 *
 * El valor pasa por `nivel` ANTES de guardarse, y no sólo al leerlo. Hoy sólo
 * llama el panel, que manda un entero del `<input type="range">`; validar
 * también acá es lo que hace que mañana no importe quién llame.
 */
export function guardarVolumen(barra: Barra, valor: number): Sonido {
  /* `Object.hasOwn` y no un acceso pelado. Indexar un objeto plano con un texto
     devuelve también lo que cuelga de la cadena de prototipos, y
     `SONIDO_POR_DEFECTO["constructor"]` no sale `undefined`: sale una FUNCIÓN.
     Ese valor terminaría de "volumen por defecto".

     Hoy no hay por dónde entrar —`barra` sale siempre de `BARRAS` y TypeScript
     no deja pasar otra cosa— y se pone igual, porque es exactamente el agujero
     que `anotarPartida` ya tuvo que tapar en `lib/progreso.ts`, donde el
     comentario dice que "ya mordió a este proyecto una vez". El patrón de este
     archivo se copia de ahí, no se reinventa. */
  const porDefecto = Object.hasOwn(SONIDO_POR_DEFECTO, barra)
    ? SONIDO_POR_DEFECTO[barra]
    : SONIDO_POR_DEFECTO.general;

  const nuevo: Sonido = {
    ...leerSonido(),
    [barra]: nivel(valor, porDefecto),
  };
  guardarSonido(nuevo);
  return nuevo;
}

/** Prende o apaga el interruptor general, sin tocar los volúmenes. */
export function guardarSilencio(silencio: boolean): Sonido {
  const nuevo: Sonido = { ...leerSonido(), silencio };
  guardarSonido(nuevo);
  return nuevo;
}

/**
 * Cuánto sale de verdad por ese canal, de 0 a 1, listo para un `.volume`.
 *
 * ── Es la única regla que hay en este archivo, y por eso está acá ────────
 *
 * "El maestro multiplica y el silencio manda" parecen dos renglones obvios, y
 * lo son hasta que están escritos en tres lugares: el que reproduce la música,
 * el que reproduce las voces y el que reproduce los efectos. Ahí dejan de ser
 * obvios y empiezan a poder contradecirse —el clásico es que el silencio calle
 * las voces pero no la música, porque la música se resolvió aparte—.
 *
 * Se escribe hoy, con el motor sin existir, porque escrita hoy el motor la
 * consume; escrita después, el motor la deduce de nuevo.
 *
 * El silencio corta ANTES de multiplicar y no pone los volúmenes en 0: al
 * desprender el interruptor tiene que volver todo como estaba, que es
 * justamente lo que no pasaría si silenciar fuera bajar el maestro a 0.
 */
export function volumenReal(sonido: Sonido, canal: Canal): number {
  if (sonido.silencio) return 0;
  return (sonido.general / 100) * (sonido[canal] / 100);
}
