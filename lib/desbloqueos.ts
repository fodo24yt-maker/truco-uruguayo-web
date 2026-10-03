/**
 * Lo que se desbloqueó para siempre: el anotador y la Gira nacional.
 *
 * Sólo tiene sentido en la app de Android, que es donde hay candados (la web
 * queda libre: ver `lib/plataforma.ts`). Pero se guarda igual en los dos lados,
 * porque guardar no cuesta nada y así este archivo no necesita saber dónde
 * corre.
 *
 * Clave PROPIA, `truco-uy:desbloqueos`, y no un campo más de `truco-uy:progreso`:
 * es lo mismo que hicieron `sonido.ts` y `legajo.ts`. Un progreso corrupto no se
 * tiene que llevar puesto lo que alguien se ganó mirando un video, ni al revés.
 *
 * Como todo lo que sale de `localStorage`, se trata como sospechoso: se valida
 * campo por campo con el mismo patrón que `lib/progreso.ts`. Lo único que se
 * acepta como desbloqueado es un `true` de verdad; cualquier otra cosa —un
 * "true" en texto, un 1, un objeto— cuenta como bloqueado.
 *
 * ¿Se puede hacer trampa editándolo a mano? En la web, sí, y da igual: ahí no
 * hay candados. En la app de release no hay consola (`webContentsDebuggingEnabled`
 * está en false), y aun con el teléfono rooteado lo único que se consigue es
 * lo mismo que se consigue mirando un video de 30 segundos.
 */

const CLAVE = "truco-uy:desbloqueos";
const VERSION = 1;

export type Desbloqueable = "anotador" | "gira";

export interface Desbloqueos {
  version: number;
  anotador: boolean;
  gira: boolean;
}

export const DESBLOQUEOS_VACIOS: Desbloqueos = {
  version: VERSION,
  anotador: false,
  gira: false,
};

/**
 * Lo desbloqueado en ESTA sesión, aunque no se haya podido guardar.
 *
 * Si el `localStorage` está lleno o el navegador no deja escribir, el que miró
 * el video no puede quedarse sin lo que se ganó: por lo menos hasta que cierre
 * la app, queda desbloqueado. Es lo más que se puede hacer sin servidor.
 */
const enMemoria: Record<Desbloqueable, boolean> = { anotador: false, gira: false };

/** Nunca lanza: ante cualquier duda, todo bloqueado. */
export function sanear(crudo: unknown): Desbloqueos {
  if (typeof crudo !== "object" || crudo === null) return { ...DESBLOQUEOS_VACIOS };
  const d = crudo as Record<string, unknown>;
  return {
    version: VERSION,
    anotador: d.anotador === true,
    gira: d.gira === true,
  };
}

function leerGuardado(): Desbloqueos {
  if (typeof window === "undefined") return { ...DESBLOQUEOS_VACIOS };
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return { ...DESBLOQUEOS_VACIOS };
    return sanear(JSON.parse(crudo));
  } catch {
    return { ...DESBLOQUEOS_VACIOS };
  }
}

/** Lo guardado más lo que se ganó en esta sesión aunque no se haya podido guardar. */
export function leerDesbloqueos(): Desbloqueos {
  const g = leerGuardado();
  return {
    version: VERSION,
    anotador: g.anotador || enMemoria.anotador,
    gira: g.gira || enMemoria.gira,
  };
}

const oyentes = new Set<() => void>();

/** Para que la pantalla se entere cuando algo se desbloquea. */
export function suscribirDesbloqueos(fn: () => void): () => void {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/**
 * Desbloquea para siempre. Devuelve `true` si quedó guardado; `false` si sólo
 * quedó en memoria (dura hasta cerrar la app).
 *
 * Es SINCRÓNICO a propósito: se llama desde adentro del evento de recompensa
 * del video, y si el sistema mata la app un segundo después, lo que ya se
 * escribió quedó escrito.
 */
export function desbloquear(que: Desbloqueable): boolean {
  enMemoria[que] = true;
  let guardado = false;
  if (typeof window !== "undefined") {
    try {
      const nuevo = { ...leerGuardado(), [que]: true };
      window.localStorage.setItem(CLAVE, JSON.stringify(nuevo));
      guardado = true;
    } catch {
      // Cuota llena o modo privado: queda en memoria por esta sesión
    }
  }
  for (const fn of oyentes) fn();
  return guardado;
}

/** Sólo para los tests: olvida lo que quedó en memoria. */
export function _olvidarMemoria(): void {
  enMemoria.anotador = false;
  enMemoria.gira = false;
}
