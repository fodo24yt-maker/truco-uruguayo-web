"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Los enlaces a Privacidad y Términos, en el pie.
 *
 * ── Por qué no están en todas las pantallas ───────────────────────────────
 *
 * Santiago los quiere sólo en la parte de aprender, y tiene razón: son dos
 * enlaces que nadie abre por gusto y que en la portada compiten con lo único
 * que esa pantalla tiene para decir. Play Store pide que existan y que se
 * puedan encontrar, no que estén repetidos en cada pantalla.
 *
 * Se quedan además adentro de las propias páginas legales, porque si no, desde
 * Privacidad no habría forma de llegar a Términos sin volver atrás.
 *
 * ── Por qué es un componente de cliente ───────────────────────────────────
 *
 * Necesita saber en qué ruta estás, y eso sólo se sabe del lado del navegador.
 * No agrega peso: `BarraApp` ya monta el mismo `usePathname` en todas las
 * pantallas, así que el costo real es cero.
 */
export function PieLegales() {
  const ruta = usePathname() ?? "/";
  const corresponde = ruta.startsWith("/aprender") || ruta.startsWith("/legales");
  if (!corresponde) return null;

  return (
    <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-[family-name:var(--font-ui)] text-xs uppercase tracking-wide">
      <Link href="/legales/privacidad" className="hover:text-crema">
        Privacidad
      </Link>
      <span aria-hidden="true" className="text-crema/25">
        ·
      </span>
      <Link href="/legales/terminos" className="hover:text-crema">
        Términos
      </Link>
    </nav>
  );
}
