import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sitio 100% estático: se puede publicar gratis en GitHub Pages y no
  // necesita servidor. El juego corre entero en el navegador.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
