import type { MetadataRoute } from "next";

import { LECCIONES } from "@/lib/lecciones";
import { urlDe } from "@/lib/sitio";

// El sitio es estático: este archivo se genera al compilar, no en cada visita.
export const dynamic = "force-static";

/**
 * El mapa del sitio, para que los buscadores sepan qué páginas hay.
 * Next lo convierte en /sitemap.xml al compilar.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const hoy = new Date();

  return [
    { url: urlDe("/"), lastModified: hoy, changeFrequency: "monthly", priority: 1 },
    {
      url: urlDe("/aprender"),
      lastModified: hoy,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    // Las lecciones son el contenido por el que la gente va a llegar buscando
    ...LECCIONES.map((leccion) => ({
      url: urlDe(`/aprender/${leccion.slug}`),
      lastModified: hoy,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: urlDe("/jugar"), lastModified: hoy, changeFrequency: "monthly", priority: 0.7 },
    { url: urlDe("/legales/privacidad"), lastModified: hoy, priority: 0.2 },
    { url: urlDe("/legales/terminos"), lastModified: hoy, priority: 0.2 },
  ];
}
