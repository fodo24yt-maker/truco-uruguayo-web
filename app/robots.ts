import type { MetadataRoute } from "next";

import { urlDe } from "@/lib/sitio";

// El sitio es estático: este archivo se genera al compilar, no en cada visita.
export const dynamic = "force-static";

/**
 * Qué pueden mirar los buscadores. Acá está todo abierto: el proyecto existe
 * justamente para que la gente lo encuentre buscando cómo jugar al truco.
 * Next lo convierte en /robots.txt al compilar.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: urlDe("/sitemap.xml"),
  };
}
