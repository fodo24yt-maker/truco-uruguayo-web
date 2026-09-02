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

/**
 * El marcador con el que se cerró una partida ganada.
 *
 * Es lo que convierte "le gané a Luquita" en "le gané 30 a 4", que es lo que se
 * cuenta cuando se cuenta. No hay dato nuevo acá: los dos números ya se ven en
 * la barra durante toda la partida y en el cartel del final.
 */
export interface Marcador {
  vos: number;
  rival: number;
}

export interface Progreso {
  version: number;
  /**
   * Partidas ganadas y jugadas contra cada rival, por su id, y el marcador de
   * la mejor victoria si la hubo.
   *
   * `mejor` es opcional a propósito: los progresos guardados antes de que esto
   * existiera no lo traen, y ésa es toda la migración que hace falta. Subir
   * `VERSION` para agregar un campo opcional sólo serviría para tirarle el
   * progreso a quien ya venía jugando.
   */
  rivales: Record<string, { ganadas: number; jugadas: number; mejor?: Marcador }>;
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
 * El techo de un marcador guardado.
 *
 * La partida se gana a los 30, pero **el ganador no queda siempre en 30**:
 * `sumar()` en `lib/motor/partida.ts` suma y DESPUÉS compara, así que estando
 * 29 le ganás un vale cuatro y quedás en 33. Con el techo en 30 se descartarían
 * victorias legítimas —justo las más grandes—. 40 deja lugar de sobra y sigue
 * rechazando cualquier número inventado a mano desde la consola.
 */
const TOPE_MARCADOR = 40;

const esMarcador = (v: unknown): v is Marcador => {
  if (typeof v !== "object" || v === null) return false;
  const m = v as Record<string, unknown>;
  const bien = (n: unknown) =>
    typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= TOPE_MARCADOR;
  // `vos > rival` porque esto guarda VICTORIAS: un marcador donde perdiste no
  // es un trofeo, es basura.
  return bien(m.vos) && bien(m.rival) && (m.vos as number) > (m.rival as number);
};

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
      /* El marcador se valida aparte y, si no cierra, SE DESCARTA SÓLO ÉL: la
         entrada del rival queda con sus victorias intactas. Descartarla entera
         —que es lo que hace la línea de arriba con `ganadas`/`jugadas`— haría
         que un marcador corrupto le borrara el progreso a alguien, y un trofeo
         vale mucho menos que una victoria.
         Y sin `ganadas > 0` no puede haber marcador: sería el de una partida
         que nunca se ganó. */
      if (v.ganadas > 0 && esMarcador(v.mejor)) {
        rivales[id].mejor = { vos: v.mejor.vos, rival: v.mejor.rival };
      }
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

/**
 * Anota el resultado de una partida contra un rival.
 *
 * `marcador` es opcional para que la firma vieja siga andando, y sólo se mira
 * cuando ganaste. De las victorias se guarda **la mejor**, medida por la
 * diferencia: entre ganar 30 a 27 y ganar 30 a 2, la que se cuenta es la
 * segunda. Nunca se pisa una mejor con una peor.
 */
export function anotarPartida(id: string, gane: boolean, marcador?: Marcador): Progreso {
  const progreso = leerProgreso();
  /* `Object.hasOwn` y no un acceso pelado: indexar un objeto plano con un texto
     devuelve también lo que hay en la cadena de prototipos, y `rivales["__proto__"]`
     saldría con un objeto que nadie guardó. Hoy el id sale de PERSONALIDADES y
     no llega nadie de afuera, pero es el agujero que ya mordió a este proyecto
     una vez. */
  const actual = Object.hasOwn(progreso.rivales, id)
    ? progreso.rivales[id]
    : { ganadas: 0, jugadas: 0 };

  const mejor = elMejorMarcador(actual.mejor, gane ? marcador : undefined);

  const nuevo: Progreso = {
    ...progreso,
    rivales: {
      ...progreso.rivales,
      [id]: {
        ganadas: actual.ganadas + (gane ? 1 : 0),
        jugadas: actual.jugadas + 1,
        ...(mejor ? { mejor } : {}),
      },
    },
  };
  guardarProgreso(nuevo);
  return nuevo;
}

/** El que se queda de los dos, o `undefined` si no hay ninguno válido. */
function elMejorMarcador(viejo?: Marcador, nuevo?: Marcador): Marcador | undefined {
  const validos = [viejo, nuevo].filter((m): m is Marcador => esMarcador(m));
  if (validos.length === 0) return undefined;
  return validos.reduce((a, b) => (b.vos - b.rival > a.vos - a.rival ? b : a));
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
