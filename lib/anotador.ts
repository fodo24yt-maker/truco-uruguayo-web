/**
 * El anotador: la tablita de treinta, en código.
 *
 * ── Qué es esto y por qué no vive adentro de la pantalla ──────────────────
 *
 * Acá no hay partida ni motor: esto no sabe jugar al truco. Sabe llevar una
 * cuenta de dos lados a treinta, partida en malas y buenas, y traducirla a
 * palitos. Sirve para cuando se juega con cartas de verdad y hace falta dónde
 * anotar.
 *
 * Es un archivo de reglas puras con test propio, por lo mismo que
 * `lib/botonera.ts`, `lib/navegacion.ts` y `lib/tantos-al-cierre.ts`: **la
 * pantalla no decide reglas**. Cuántos palitos lleva un grupo a medio hacer y
 * en qué momento se pasa de malas a buenas son preguntas que se contestan una
 * vez y se prueban, no cosas que se miran a ojo en una captura.
 *
 * ── Malas y buenas ────────────────────────────────────────────────────────
 *
 * La partida es a 30 y se anota en dos mitades: los primeros 15 son las
 * **malas** y los últimos 15 las **buenas**. Es como se anota en Uruguay y es
 * lo que hace que la tablita tenga una raya en el medio en vez de ser una
 * columna de treinta rayitas.
 *
 * Cada mitad son **tres grupos de cinco**, y cada grupo es el cuadradito de
 * toda la vida: arriba, derecha, abajo, izquierda y la diagonal.
 *
 * ── A 30 o a 40, desde el 1/11/2026 ───────────────────────────────────────
 *
 * Hay mesas que juegan a 40, y se elige tocando el número de arriba. A 40 son
 * 20 malas y 20 buenas, o sea cuatro grupos por mitad: la raya sigue en la
 * mitad justa. Por eso todo lo que depende de a cuánto se juega recibe la
 * `meta`, y la de fábrica es 30: llamado sin ella, da lo mismo que antes.
 */

/** A cuánto se puede jugar. */
export type Meta = 30 | 40;

export const METAS: readonly Meta[] = [30, 40];

/** A cuánto se juega si no se eligió otra cosa. Es el truco uruguayo: 30. */
export const META: Meta = 30;

/** Dónde se corta entre malas y buenas. La mitad justa. */
export const MITAD = META / 2;

/** Cuántos palitos entran en un grupo: el cuadrado más la diagonal. */
export const POR_GRUPO = 5;

/** Cuántos grupos tiene cada mitad. Con 15 y grupos de 5, son tres. */
export const GRUPOS_POR_MITAD = MITAD / POR_GRUPO;

/** La mitad de una partida a `meta`: 15 a 30, 20 a 40. */
export const mitadDe = (meta: Meta): number => meta / 2;

/** Cuántos grupos tiene cada mitad: tres a 30, cuatro a 40. */
export const gruposPorMitad = (meta: Meta): number => mitadDe(meta) / POR_GRUPO;

/** Los grupos de la mitad más larga que existe: lo que tiene que entrar en el dibujo. */
export const MAX_GRUPOS_POR_MITAD = Math.max(...METAS.map(gruposPorMitad));

/** La otra: el número de arriba va y viene entre las dos. */
export const otraMeta = (meta: Meta): Meta => (meta === 30 ? 40 : 30);

/**
 * Si se puede pasar a jugar a `nueva` con la cuenta como está.
 *
 * Bajar de 40 a 30 con alguien en 31 obligaría a recortarle los puntos que ya
 * anotó, y eso no lo deshace nadie: mientras algún lado esté arriba de la
 * nueva meta, no se cambia.
 */
export const puedeCambiarA = (cuenta: Cuenta, nueva: Meta): boolean =>
  cuenta.nosotros <= nueva && cuenta.ellos <= nueva;

export type Lado = "nosotros" | "ellos";

export const LADOS: readonly Lado[] = ["nosotros", "ellos"];

export interface Cuenta {
  nosotros: number;
  ellos: number;
}

export const CUENTA_VACIA: Cuenta = { nosotros: 0, ellos: 0 };

/**
 * Suma (o resta) puntos de un lado, sin salirse nunca del rango.
 *
 * Se frena en 0 y en 30 a propósito. En 0 porque no existe deber puntos; en 30
 * porque ahí la partida se terminó y seguir sumando sería anotar en una tablita
 * que ya no tiene lugar. Ojo con la diferencia contra `lib/motor/partida.ts`,
 * donde SÍ se pasa de 30 —estando 29 le ganás un vale cuatro y quedás en 33—:
 * allá el número es un resultado y acá es un dibujo, y el dibujo tiene 30
 * lugares.
 */
export function sumar(cuenta: Cuenta, lado: Lado, cuánto: number, meta: Meta = META): Cuenta {
  const nuevo = Math.min(meta, Math.max(0, cuenta[lado] + cuánto));
  return { ...cuenta, [lado]: nuevo };
}

/**
 * Cuántos palitos lleva dibujados el grupo `indice` de una mitad que va por
 * `puntos` puntos.
 *
 * Devuelve de 0 a 5. Los grupos se llenan de a uno y en orden: el segundo no
 * arranca hasta que el primero está cerrado, que es como se anota a mano.
 */
export function palitosDelGrupo(puntos: number, indice: number): number {
  return Math.max(0, Math.min(POR_GRUPO, puntos - indice * POR_GRUPO));
}

/** Los puntos que van en las malas: los primeros 15 (20 a 40). */
export const malasDe = (puntos: number, meta: Meta = META): number =>
  Math.min(mitadDe(meta), Math.max(0, puntos));

/** Los que van en las buenas: lo que pase de 15 (de 20 a 40). */
export const buenasDe = (puntos: number, meta: Meta = META): number =>
  Math.min(mitadDe(meta), Math.max(0, puntos - mitadDe(meta)));

/**
 * El renglón que va debajo del nombre: "7 malas", "1 buena".
 *
 * Muestra la mitad EN LA QUE ESTÁS, no las dos, que es como se dice en la mesa:
 * nadie dice "quince malas y tres buenas", dice "tres buenas". Mientras no
 * pasaste de 15 son malas —incluso con 15 justos, porque las buenas empiezan en
 * el dieciséis— y de ahí en adelante, buenas.
 *
 * El singular importa: "1 malas" se lee como un error de programación, y esta
 * pantalla tiene que parecer un papel.
 */
export function comoSeDice(puntos: number, meta: Meta = META): string {
  const mitad = mitadDe(meta);
  const enBuenas = puntos > mitad;
  const n = enBuenas ? puntos - mitad : puntos;
  const palabra = enBuenas ? (n === 1 ? "buena" : "buenas") : n === 1 ? "mala" : "malas";
  return `${n} ${palabra}`;
}

/** Quién llegó a la meta, o `null` si la partida sigue. */
export function ganador(cuenta: Cuenta, meta: Meta = META): Lado | null {
  if (cuenta.nosotros >= meta) return "nosotros";
  if (cuenta.ellos >= meta) return "ellos";
  return null;
}

/* ══ Guardarlo en el navegador ═════════════════════════════════════════════
   Clave PROPIA, separada de `truco-uy:progreso`.

   No es prolijidad: el progreso guarda la gira y los trofeos, y `CLAUDE.md`
   avisa dos veces de lo caro que sale tocar dónde vive eso —cambiar un id o el
   origen de la app le borra la gira entera a quien ya jugó—. La cuenta de una
   partida de anoche no tiene por qué compartir archivo con eso: si algún día
   este anotador guarda algo raro y hay que borrarlo, se borra esta clave y la
   gira ni se entera.

   Y se guarda, en vez de arrancar en cero cada vez, porque se juega con las
   cartas en la mano: la pantalla se apaga sola, alguien atiende un mensaje, y
   volver y encontrar la tablita vacía es perder lo único que esto hace.

   La meta va EN LA MISMA CLAVE que los puntos, `{ nosotros, ellos, meta }`, y
   no aparte: los puntos se recortan al tope de la meta al leerlos, así que si
   vivieran separados un 35 jugando a 40 podría volver como 30. Lo que guardó
   alguien antes del 1/11/2026 no tiene `meta`, y eso se lee como 30. */

const CLAVE = "truco-uy:anotador";

/**
 * Convierte lo que haya guardado en una cuenta confiable. Nunca lanza.
 *
 * Mismo criterio que `sanear()` en `lib/progreso.ts`: **lo que sale de
 * `localStorage` es sospechoso siempre**, porque cualquiera lo puede editar a
 * mano desde la consola del navegador. Se valida campo por campo y ante
 * cualquier duda se arranca de cero.
 *
 * Un número fuera de rango no descarta la cuenta entera: se recorta al rango,
 * que conserva la partida en curso. Lo que no es un número entero sí se
 * descarta, porque ahí no hay nada que conservar.
 *
 * El rango es el de la meta guardada al lado: hasta 40 si se jugaba a 40.
 */
function sanear(crudo: unknown): Cuenta {
  if (typeof crudo !== "object" || crudo === null) return { ...CUENTA_VACIA };
  const d = crudo as Record<string, unknown>;
  const tope = sanearMeta(crudo);
  const bien = (v: unknown): number => {
    if (typeof v !== "number" || !Number.isInteger(v)) return 0;
    return Math.min(tope, Math.max(0, v));
  };
  return { nosotros: bien(d.nosotros), ellos: bien(d.ellos) };
}

/** La meta guardada. Sólo un `40` de verdad es 40; cualquier otra cosa, 30. */
function sanearMeta(crudo: unknown): Meta {
  if (typeof crudo !== "object" || crudo === null) return META;
  return (crudo as Record<string, unknown>).meta === 40 ? 40 : META;
}

/** Lee la cuenta y la meta guardadas. Las de fábrica si no hay o si el navegador no deja. */
export function leerAnotador(): { cuenta: Cuenta; meta: Meta } {
  const vacío = { cuenta: { ...CUENTA_VACIA }, meta: META };
  if (typeof window === "undefined") return vacío;
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return vacío;
    const datos: unknown = JSON.parse(crudo);
    return { cuenta: sanear(datos), meta: sanearMeta(datos) };
  } catch {
    // Modo privado, cuota llena, JSON corrupto: se sigue anotando igual
    return vacío;
  }
}

/** Guarda la cuenta y la meta. Si el navegador no deja, se ignora en silencio. */
export function guardarAnotador(cuenta: Cuenta, meta: Meta): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CLAVE,
      JSON.stringify({ nosotros: cuenta.nosotros, ellos: cuenta.ellos, meta }),
    );
  } catch {
    // Que no se pueda guardar no puede romper la cuenta que estás llevando
  }
}

/** Se exportan sólo para el test: son la puerta de entrada de datos ajenos. */
export const _sanear = sanear;
export const _sanearMeta = sanearMeta;

/* ══ El cartelito de "tocá el número" ══════════════════════════════════════
   Sale la primera vez que se entra al anotador y avisa que el 30 se toca para
   pasar a 40. Hay que acordarse de una sola cosa: si ya salió.

   Clave PROPIA, `truco-uy:anotador-aviso`, y el mismo patrón que
   `lib/tutorial.ts`: lo único que cuenta como visto es un `true` de verdad, y
   si el navegador no deja guardar queda visto en memoria por esta sesión, para
   que no salga cada vez que se vuelve al anotador. Va aparte de la cuenta para
   que empezar una cuenta nueva no lo vuelva a mostrar. Si alguien lo edita a
   mano, lo peor que consigue es verlo otra vez, o no verlo. */

const CLAVE_AVISO = "truco-uy:anotador-aviso";
const VERSION_AVISO = 1;

let avisoEnMemoria = false;

/** ¿Ya salió alguna vez el cartelito? */
export function avisoMetaVisto(): boolean {
  if (avisoEnMemoria) return true;
  if (typeof window === "undefined") return false;
  try {
    const crudo = window.localStorage.getItem(CLAVE_AVISO);
    if (!crudo) return false;
    const d: unknown = JSON.parse(crudo);
    return typeof d === "object" && d !== null && (d as Record<string, unknown>).visto === true;
  } catch {
    return false;
  }
}

/** Lo marca como visto. Si no se puede guardar, queda en memoria. */
export function marcarAvisoMeta(): void {
  avisoEnMemoria = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE_AVISO, JSON.stringify({ version: VERSION_AVISO, visto: true }));
  } catch {
    // Cuota llena o modo privado: queda en memoria por esta sesión
  }
}

/** Sólo para los tests: olvida lo que quedó en memoria. */
export function _olvidarAviso(): void {
  avisoEnMemoria = false;
}
