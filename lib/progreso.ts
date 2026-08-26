/**
 * El progreso del jugador, guardado en su propio navegador.
 *
 * No hay servidor ni cuenta: esto vive en el `localStorage` del dispositivo y
 * no viaja a ningún lado. Si el jugador borra los datos del sitio, se pierde,
 * y está bien: es el precio de no pedirle un correo a nadie.
 *
 * Todo lo que sale de `localStorage` se trata como sospechoso. Cualquiera puede
 * editarlo a mano desde la consola, así que se valida campo por campo antes de
 * usarlo: si algo no cierra, se descarta y se arranca de cero.
 */

const CLAVE = "truco-uy:progreso";
const VERSION = 1;

export interface Progreso {
  version: number;
  /** Partidas ganadas y jugadas contra cada rival, por su id. */
  rivales: Record<string, { ganadas: number; jugadas: number }>;
  /** Lecciones que el jugador marcó como leídas. */
  leccionesLeidas: string[];
  /** Si quiere las ayudas prendidas en la mesa. */
  ayudas: boolean;
  /** El último rival elegido, para no volver a preguntar. */
  ultimoRival: string | null;
}

export const PROGRESO_VACIO: Progreso = {
  version: VERSION,
  rivales: {},
  leccionesLeidas: [],
  ayudas: true,
  ultimoRival: null,
};

const esEnteroNoNegativo = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 1e6;

/**
 * Convierte lo que haya guardado en un progreso confiable. Nunca lanza: ante
 * cualquier duda devuelve el progreso vacío.
 */
function sanear(crudo: unknown): Progreso {
  if (typeof crudo !== "object" || crudo === null) return { ...PROGRESO_VACIO };
  const d = crudo as Record<string, unknown>;

  const rivales: Progreso["rivales"] = {};
  if (typeof d.rivales === "object" && d.rivales !== null) {
    for (const [id, valor] of Object.entries(d.rivales as Record<string, unknown>)) {
      // ids raros o gigantes: fuera
      if (!/^[a-z0-9-]{1,40}$/.test(id)) continue;
      if (typeof valor !== "object" || valor === null) continue;
      const v = valor as Record<string, unknown>;
      if (!esEnteroNoNegativo(v.ganadas) || !esEnteroNoNegativo(v.jugadas)) continue;
      // no se puede haber ganado más de lo que se jugó
      if (v.ganadas > v.jugadas) continue;
      rivales[id] = { ganadas: v.ganadas, jugadas: v.jugadas };
    }
  }

  const leccionesLeidas = Array.isArray(d.leccionesLeidas)
    ? d.leccionesLeidas
        .filter((s): s is string => typeof s === "string" && /^[a-z0-9-]{1,40}$/.test(s))
        .slice(0, 50)
    : [];

  return {
    version: VERSION,
    rivales,
    leccionesLeidas,
    ayudas: typeof d.ayudas === "boolean" ? d.ayudas : true,
    ultimoRival:
      typeof d.ultimoRival === "string" && /^[a-z0-9-]{1,40}$/.test(d.ultimoRival)
        ? d.ultimoRival
        : null,
  };
}

/** Lee el progreso. Devuelve el vacío si no hay nada o si el navegador no deja. */
export function leerProgreso(): Progreso {
  if (typeof window === "undefined") return { ...PROGRESO_VACIO };
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return { ...PROGRESO_VACIO };
    return sanear(JSON.parse(crudo));
  } catch {
    // Modo privado, cuota llena, JSON corrupto: se sigue jugando igual
    return { ...PROGRESO_VACIO };
  }
}

/** Guarda el progreso. Si el navegador no deja, se ignora en silencio. */
export function guardarProgreso(progreso: Progreso): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(progreso));
  } catch {
    // Que no se pueda guardar no puede romper la partida en curso
  }
}

/** Anota el resultado de una partida contra un rival. */
export function anotarPartida(id: string, gane: boolean): Progreso {
  const progreso = leerProgreso();
  const actual = progreso.rivales[id] ?? { ganadas: 0, jugadas: 0 };
  const nuevo: Progreso = {
    ...progreso,
    rivales: {
      ...progreso.rivales,
      [id]: {
        ganadas: actual.ganadas + (gane ? 1 : 0),
        jugadas: actual.jugadas + 1,
      },
    },
  };
  guardarProgreso(nuevo);
  return nuevo;
}

/** Guarda una preferencia suelta sin tocar el resto. */
export function guardarPreferencia<C extends keyof Progreso>(
  campo: C,
  valor: Progreso[C],
): Progreso {
  const nuevo = { ...leerProgreso(), [campo]: valor };
  guardarProgreso(nuevo);
  return nuevo;
}

/** Borra todo el progreso. Para el botón de "empezar de nuevo". */
export function borrarProgreso(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    /* nada que hacer */
  }
}
