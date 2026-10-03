/**
 * ¿Estamos adentro de la app de Android?
 *
 * Es la pregunta que decide si hay anuncios y candados. La respuesta es SÍ
 * sólo si se cumplen las dos cosas:
 *
 *  1. **El build es el de la app** (`npm run build:app`). `NEXT_PUBLIC_DESTINO`
 *     lo fija `next.config.ts` al compilar y Next lo reemplaza por el texto
 *     literal, así que en el build de la web esta función es `return false` y
 *     el compilador tira todo lo que cuelga de ella. Por eso la web no lleva
 *     ni una línea de anuncios: no es que no los muestre, es que no los tiene.
 *  2. **Corre de verdad en el teléfono.** El mismo `out-app/` abierto en un
 *     navegador (`mirar-app-compilada.mjs`) no tiene puente nativo, y ahí no
 *     hay a quién pedirle un anuncio.
 *
 * Se lee `window.Capacitor` sin importar `@capacitor/core`, igual que
 * `BotonAtrasAndroid.tsx`: en el teléfono ese objeto lo pone el puente nativo
 * antes de que arranque la página.
 */
export function esApp(): boolean {
  if (process.env.NEXT_PUBLIC_DESTINO !== "app") return false;
  if (typeof window === "undefined") return false;
  const g = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return g.Capacitor?.isNativePlatform?.() === true;
}
