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
  // Provisorio: el subdominio real de Workers (algo como
  // trucouruguayo.TU-CUENTA.workers.dev) lo asigna Cloudflare recién al
  // desplegar. Actualizar acá en cuanto se confirme la dirección real.
  process.env.NEXT_PUBLIC_URL_SITIO ?? "https://trucouruguayo.workers.dev"
).replace(/\/$/, "");

export const NOMBRE_SITIO = "Truco Uruguayo";

export const DESCRIPCION_SITIO =
  "Aprendé a jugar al truco uruguayo desde cero —la muestra, las piezas, el envido y la flor— y practicá contra un bot. Gratis, sin registro y sin publicidad.";

/** Arma una dirección absoluta a partir de una ruta del sitio. */
export const urlDe = (ruta: string) =>
  `${URL_SITIO}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;
