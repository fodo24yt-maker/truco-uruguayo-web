import type { NextConfig } from "next";

/**
 * El mismo código se compila de dos maneras.
 *
 * ── La web (`npm run build`) ──────────────────────────────────────────────
 * Sale en `out/` y se publica tal cual. No cambia nada respecto de siempre.
 *
 * ── La app (`npm run build:app`) ──────────────────────────────────────────
 * Sale en `out-app/` y es lo que Capacitor mete adentro del APK. La única
 * diferencia es `trailingSlash`, y no es un gusto: **sin él la app no anda.**
 *
 * Por defecto, `output: "export"` emite archivos planos —`out/jugar/mesa.html`—
 * y deja en `out/jugar/mesa/` sólo los `.txt` de navegación. El servidor local
 * que Capacitor levanta adentro del WebView busca `jugar/mesa/index.html`, no
 * lo encuentra, y cae al `index.html` de la raíz: la app hidrata LA PORTADA
 * mientras la dirección dice `/jugar/mesa`. Con `trailingSlash` cada ruta pasa
 * a tener su carpeta con su `index.html` y eso deja de pasar.
 *
 * Está documentado en la doc de Next que viene con el proyecto:
 * `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`.
 *
 * Se hace con una variable y no cambiando el archivo a mano para que la web
 * publicada no cambie ni una URL: `trailingSlash` le agregaría la barra final a
 * las trece direcciones del sitemap.
 */
const paraLaApp = process.env.DESTINO === "app";

const nextConfig: NextConfig = {
  // Sitio 100% estático: se puede publicar gratis en GitHub Pages y no
  // necesita servidor. El juego corre entero en el navegador.
  output: "export",
  images: { unoptimized: true },
  ...(paraLaApp ? { trailingSlash: true } : {}),
};

export default nextConfig;
