/**
 * Adónde se vuelve desde cada pantalla, y en qué sección estás.
 *
 * ── Por qué esto es una función y no un `router.back()` ───────────────────
 *
 * Una app tiene DOS botones de atrás: el que se dibuja arriba a la izquierda y
 * el botón físico de Android. Si cada uno decide por su cuenta, tarde o
 * temprano hacen cosas distintas —el de la pantalla te lleva al menú y el del
 * teléfono te saca de la app en medio de una partida—, y eso se nota enseguida.
 *
 * Acá se decide UNA vez y los dos preguntan lo mismo.
 *
 * Y se vuelve al PADRE de la ruta, no al historial. `history.back()` te manda a
 * la pantalla anterior, que no es lo mismo: si entraste a una lección desde el
 * inicio y de ahí saltaste a otra con "siguiente", el historial te hace
 * retroceder lección por lección, mientras que lo que quiere el que aprieta la
 * flecha es salir del capítulo. Con el padre, la flecha siempre dice la verdad
 * porque lleva escrito el destino.
 *
 * ── Por qué hay que normalizar la ruta ────────────────────────────────────
 *
 * La app se compila con `trailingSlash` prendido —lo necesita el servidor local
 * de Capacitor, que busca `jugar/mesa/index.html` y no `jugar/mesa.html`—, y
 * eso hace que `usePathname()` devuelva `/aprender` en la web y `/aprender/` en
 * el APK. Comparar contra `"/aprender"` a secas anda perfecto en `next dev` y
 * falla adentro del teléfono, que es la peor forma de fallar: la que no se ve
 * hasta que ya está instalado.
 *
 * Es una función pura y con test propio por lo mismo que `botonera.ts` y
 * `tantos-al-cierre.ts`: la pantalla no decide reglas.
 */

/** Las dos secciones que tienen atajo propio en la barra de arriba. */
export type Seccion = "aprender" | "jugar";

/**
 * De qué pantalla cuelga cada una.
 *
 * Es un `Map` y no un objeto por lo mismo que `POR_SLUG` en `lib/gira.ts`: una
 * clave rara —`"__proto__"`, `"constructor"`— no puede caer en la cadena de
 * prototipos y devolver algo que nadie escribió acá.
 *
 * Ojo con `/legales/*`: NO se resuelve cortando la ruta por la última barra.
 * `/legales` no existe como página, así que el padre de las dos legales es el
 * inicio y no una pantalla en blanco.
 */
const PADRE = new Map<string, string>([
  ["/aprender", "/"],
  ["/jugar", "/"],
  ["/jugar/gira", "/jugar"],
  ["/legales/privacidad", "/"],
  ["/legales/terminos", "/"],
]);

/** La ruta sin la barra del final. `/` se queda como `/`. */
export function normalizarRuta(ruta: string): string {
  if (!ruta) return "/";
  const sinBarra = ruta.replace(/\/+$/, "");
  return sinBarra === "" ? "/" : sinBarra;
}

/**
 * Adónde lleva el "volver", o `null` si estás en el inicio.
 *
 * `null` es la señal de que no hay adónde ir: la barra no dibuja el botón y el
 * botón físico de Android cierra la app.
 *
 * `busqueda` es la parte de la dirección que va después del `?`, y hace falta
 * por un solo caso: la mesa se abre desde dos lugares. Con `?depto=` viniste
 * del mapa de la gira y volvés al mapa; sin él es una partida suelta y volvés
 * al menú de jugar. Se pasa como texto —y no como `URLSearchParams` ni con
 * `useSearchParams()`— para que esto siga siendo una función pura y para no
 * arrastrar a la barra adentro de un `<Suspense>`, que es lo que Next exige
 * cuando un componente lee la dirección en un sitio estático.
 */
export function volverDesde(ruta: string, busqueda = ""): string | null {
  const r = normalizarRuta(ruta);
  if (r === "/") return null;

  if (r === "/jugar/mesa") {
    return new URLSearchParams(busqueda).get("depto") ? "/jugar/gira" : "/jugar";
  }

  const anotado = PADRE.get(r);
  if (anotado) return anotado;

  // Las ocho lecciones. Van por prefijo y no una por una: el día que se agregue
  // la novena, esto ya la sabe.
  if (r.startsWith("/aprender/")) return "/aprender";

  // Cualquier otra cosa —un 404, una ruta que todavía no existe— al inicio.
  // Que la flecha lleve a algún lado siempre es mejor que que no haga nada.
  return "/";
}

/**
 * En qué sección estás, para marcar el atajo que corresponde en la barra.
 *
 * `null` en el inicio y en las legales: ahí no hay nada que marcar. Marcar algo
 * que no es cierto es peor que no marcar nada.
 */
export function seccionDe(ruta: string): Seccion | null {
  const r = normalizarRuta(ruta);
  if (r === "/aprender" || r.startsWith("/aprender/")) return "aprender";
  if (r === "/jugar" || r.startsWith("/jugar/")) return "jugar";
  return null;
}
