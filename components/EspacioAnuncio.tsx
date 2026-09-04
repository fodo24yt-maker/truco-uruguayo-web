/**
 * El lugar reservado para el banner de anuncios.
 *
 * ── Qué es esto hoy, y qué NO es ──────────────────────────────────────────
 *
 * Es UN HUECO. No carga AdMob, no carga un script de nadie, no pone una cookie
 * ni hace una sola petición de red: es un `<div>` con una medida y, si está
 * prendida la silueta, un rectángulo dibujado con CSS.
 *
 * Existe ahora porque el problema de meter publicidad en esta app no es pegar
 * un SDK: es que **la mesa está medida para entrar exacta en una pantalla que
 * no scrollea nunca**, y un banner que aparece después le come 50px a las
 * cartas. Reservando el hueco desde ahora, `mirar-mesa.mjs` mide la mesa CON el
 * banner puesto en los siete tamaños, y el día que se prenda no se rompe nada.
 *
 * Lo que falta antes de encender publicidad de verdad, y no es poco: el flujo
 * de consentimiento (UMP/GDPR), la declaración de recolección de datos de Play
 * Store, y decidir si la app se marca como dirigida a menores —que cambia qué
 * anuncios se pueden servir—. Y `app/legales/privacidad` se actualiza ANTES,
 * que es lo que esa página promete por escrito.
 *
 * ── Por qué es un solo componente para los tres lugares ───────────────────
 *
 * Va en la mesa, en el pie del sitio y abajo de cada lección. Tres huecos que
 * se puedan desincronizar son tres veces el mismo bug, por lo mismo que
 * `lib/navegacion.ts` decide UNA vez adónde vuelve la flecha y el botón físico
 * de Android.
 *
 * ── De dónde sale la altura ───────────────────────────────────────────────
 *
 * El banner anclado adaptativo de AdMob mide según el ALTO de la ventana: hasta
 * 400dp son 32, hasta 720dp son 50, y más arriba 90. Da la casualidad de que
 * esa es exactamente la regla de esta casa —las medidas van atadas al alto,
 * porque el problema siempre fue la pantalla baja y no la angosta— así que un
 * `clamp(…vh…)` la escribe tal cual.
 *
 * EN LA MESA SE CAPA EN 50 y no llega a 90: en la escena esos 40px de más son
 * una carta menos, y la mesa es lo único de la app que no puede ceder alto.
 */

/**
 * ¿Se dibuja la silueta?
 *
 * Apagada, el hueco sigue midiendo lo mismo y no se ve nada. Está acá arriba
 * para poder mirar la app sin la franja sin tener que tocar la distribución:
 * lo que no puede cambiar es el ESPACIO, porque de eso cuelga que la mesa entre.
 */
const MOSTRAR_SILUETA = true;

/** La medida de cada lugar, en un solo sitio. */
const ALTO = {
  /* La mesa: capada en 50. Ver arriba. */
  mesa: "clamp(32px, 6vh, 50px)",
  /* El resto del sitio scrollea, así que acá sí llega al banner grande. */
  sitio: "clamp(50px, 8vh, 90px)",
} as const;

export function EspacioAnuncio({
  donde,
  className = "",
}: {
  /** `mesa` va adentro de la partida; `sitio` en el pie y en las lecciones. */
  donde: keyof typeof ALTO;
  className?: string;
}) {
  return (
    <div
      /* El agarre con el que las herramientas comprueban que el hueco existe y
         mide lo que dice medir. Mismo papel que `data-mesa`. */
      data-anuncio={donde}
      aria-hidden="true"
      className={`w-full shrink-0 ${className}`}
      style={{ height: ALTO[donde] }}
    >
      {MOSTRAR_SILUETA && (
        <div className="mx-auto flex h-full max-w-[760px] items-center justify-center rounded-[3px] border border-dashed border-crema/12 bg-black/25">
          <span className="font-[family-name:var(--font-ui)] text-[9px] uppercase tracking-[0.22em] text-crema/22">
            espacio para anuncio
          </span>
        </div>
      )}
    </div>
  );
}
