/**
 * Los datos del sitio, en un solo lugar.
 *
 * Cuando haya dominio propio, se cambia acá y se actualiza solo en el sitemap,
 * en las etiquetas para compartir y en todo lo demás.
 */

/**
 * La dirección donde vive el sitio, sin barra al final.
 *
 * En Cloudflare Pages se puede definir la variable de entorno
 * NEXT_PUBLIC_URL_SITIO con el dominio real; si no está, se usa el que sigue.
 */
export const URL_SITIO = (
  process.env.NEXT_PUBLIC_URL_SITIO ?? "https://truquito.smmqo08.workers.dev"
).replace(/\/$/, "");

export const NOMBRE_SITIO = "Truco Uruguayo";

/** El identificador de la app de Android en Play. No cambia nunca. */
export const ID_APP_ANDROID = "uy.trucouruguayo.app";

/**
 * Quién publica la app: el "nombre del desarrollador" de la ficha de Play, el
 * que aparece abajo del nombre de la app. La política de privacidad tiene que
 * nombrar al MISMO responsable que la ficha.
 *
 * `null` mientras no esté elegido (27/10/2026): las legales no lo muestran.
 * Completarlo es un paso obligatorio antes de publicar, y está en la lista de
 * `ideas/publicar-play.md`.
 */
export const DESARROLLADOR: string | null = null;

/**
 * El correo de contacto: el mismo "correo electrónico del desarrollador" de la
 * ficha de Play, que es público. Lo piden Play (en la ficha) y la política de
 * privacidad (un contacto de verdad: un issue de GitHub es público y pide
 * cuenta). `null` mientras no esté; mismo paso obligatorio que el de arriba.
 */
export const CORREO_CONTACTO: string | null = null;

export const DESCRIPCION_SITIO =
  "Aprendé a jugar al truco uruguayo desde cero —la muestra, las piezas, el envido y la flor— y practicá contra un bot. Gratis, sin registro y sin publicidad.";

/** Arma una dirección absoluta a partir de una ruta del sitio. */
export const urlDe = (ruta: string) =>
  `${URL_SITIO}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;
