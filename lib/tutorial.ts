/**
 * Si ya viste el tutorial de la mesa (`components/TutorialMesa.tsx`).
 *
 * Sale solo la primera vez que entrás a Jugar, y después se puede volver a ver
 * desde Ajustes. Lo único que hay que acordarse es eso: si ya salió.
 *
 * Clave PROPIA, `truco-uy:tutorial-mesa`, y no un campo más de
 * `truco-uy:progreso`, igual que `desbloqueos.ts`, `sonido.ts` y `legajo.ts`:
 * un progreso corrupto no tiene que volver a mostrarte el tutorial, y un
 * tutorial roto no tiene que tocar el progreso de la gira.
 *
 * Como todo lo que sale de `localStorage`, se trata como sospechoso y se
 * valida con el patrón de `lib/progreso.ts`: lo único que cuenta como visto es
 * un `true` de verdad. Si alguien lo edita a mano, lo peor que consigue es ver
 * el tutorial otra vez, o no verlo.
 */

const CLAVE = "truco-uy:tutorial-mesa";
const VERSION = 1;

/** El evento con el que Ajustes pide abrirlo (`components/MenuAjustes.tsx`). */
export const EVENTO_TUTORIAL = "truco-uy:tutorial";

export interface Tutorial {
  version: number;
  visto: boolean;
}

export const TUTORIAL_VACIO: Tutorial = { version: VERSION, visto: false };

/**
 * Visto en ESTA sesión aunque no se haya podido guardar. Con el
 * almacenamiento lleno o bloqueado, que por lo menos no salga en cada vuelta
 * a Jugar hasta que se cierre la app.
 */
let vistoEnMemoria = false;

/** Nunca lanza: ante cualquier duda, no visto. */
export function sanear(crudo: unknown): Tutorial {
  if (typeof crudo !== "object" || crudo === null) return { ...TUTORIAL_VACIO };
  const d = crudo as Record<string, unknown>;
  return { version: VERSION, visto: d.visto === true };
}

/** ¿Ya salió alguna vez? */
export function yaVisto(): boolean {
  if (vistoEnMemoria) return true;
  if (typeof window === "undefined") return false;
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return false;
    return sanear(JSON.parse(crudo)).visto;
  } catch {
    return false;
  }
}

/** Lo marca como visto. Devuelve `false` si sólo quedó en memoria. */
export function marcarVisto(): boolean {
  vistoEnMemoria = true;
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify({ version: VERSION, visto: true } satisfies Tutorial));
    return true;
  } catch {
    // Cuota llena o modo privado: queda en memoria por esta sesión
    return false;
  }
}

/** Sólo para los tests: olvida lo que quedó en memoria. */
export function _olvidarMemoria(): void {
  vistoEnMemoria = false;
}
