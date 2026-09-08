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
 */

/** A cuánto se juega. Es el truco uruguayo: 30, no 40. */
export const META = 30;

/** Dónde se corta entre malas y buenas. La mitad justa. */
export const MITAD = META / 2;

/** Cuántos palitos entran en un grupo: el cuadrado más la diagonal. */
export const POR_GRUPO = 5;

/** Cuántos grupos tiene cada mitad. Con 15 y grupos de 5, son tres. */
export const GRUPOS_POR_MITAD = MITAD / POR_GRUPO;

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
export function sumar(cuenta: Cuenta, lado: Lado, cuánto: number): Cuenta {
  const nuevo = Math.min(META, Math.max(0, cuenta[lado] + cuánto));
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

/** Los puntos que van en las malas: los primeros 15. */
export const malasDe = (puntos: number): number => Math.min(MITAD, Math.max(0, puntos));

/** Los que van en las buenas: lo que pase de 15. */
export const buenasDe = (puntos: number): number =>
  Math.min(MITAD, Math.max(0, puntos - MITAD));

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
export function comoSeDice(puntos: number): string {
  const enBuenas = puntos > MITAD;
  const n = enBuenas ? puntos - MITAD : puntos;
  const palabra = enBuenas ? (n === 1 ? "buena" : "buenas") : n === 1 ? "mala" : "malas";
  return `${n} ${palabra}`;
}

/** Quién llegó a 30, o `null` si la partida sigue. */
export function ganador(cuenta: Cuenta): Lado | null {
  if (cuenta.nosotros >= META) return "nosotros";
  if (cuenta.ellos >= META) return "ellos";
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
   volver y encontrar la tablita vacía es perder lo único que esto hace. */

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
 */
function sanear(crudo: unknown): Cuenta {
  if (typeof crudo !== "object" || crudo === null) return { ...CUENTA_VACIA };
  const d = crudo as Record<string, unknown>;
  const bien = (v: unknown): number => {
    if (typeof v !== "number" || !Number.isInteger(v)) return 0;
    return Math.min(META, Math.max(0, v));
  };
  return { nosotros: bien(d.nosotros), ellos: bien(d.ellos) };
}

/** Lee la cuenta guardada. Devuelve la vacía si no hay o si el navegador no deja. */
export function leerCuenta(): Cuenta {
  if (typeof window === "undefined") return { ...CUENTA_VACIA };
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return { ...CUENTA_VACIA };
    return sanear(JSON.parse(crudo));
  } catch {
    // Modo privado, cuota llena, JSON corrupto: se sigue anotando igual
    return { ...CUENTA_VACIA };
  }
}

/** Guarda la cuenta. Si el navegador no deja, se ignora en silencio. */
export function guardarCuenta(cuenta: Cuenta): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(cuenta));
  } catch {
    // Que no se pueda guardar no puede romper la cuenta que estás llevando
  }
}

/** Se exporta sólo para el test: es la puerta de entrada de datos ajenos. */
export const _sanear = sanear;
