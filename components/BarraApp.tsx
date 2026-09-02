"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { seccionDe, volverDesde } from "@/lib/navegacion";

/**
 * La barra de arriba de la app.
 *
 * ── EL <header> TIENE QUE SER LA RAÍZ DE ESTE COMPONENTE ──────────────────
 *
 * No lo envuelvas en un `<div>`. `app/globals.css` esconde la barra en la mesa
 * y en el mapa con
 *
 *     body:has(.mesa-pantalla-completa) > header { display: none }
 *
 * y ese `>` está puesto a propósito —el porqué completo está allá—. Sólo
 * funciona mientras el `<header>` siga siendo hijo DIRECTO del `<body>`. Con un
 * `<div>` en el medio la regla deja de encontrarlo y la barra reaparece encima
 * de la mesa, que es la única pantalla que no puede perder un píxel de alto.
 *
 * ── Qué hay adentro ───────────────────────────────────────────────────────
 *
 * A la izquierda el volver, CON EL DESTINO ESCRITO y no una flecha suelta: es
 * la misma decisión que se tomó para la flecha del mapa, después de que una
 * flecha sola en un círculo no se encontrara. En el inicio no se dibuja, porque
 * no hay adónde volver.
 *
 * A la derecha los dos atajos, siempre. Son el motivo por el que esto existe:
 * poder saltar de Aprender a Jugar sin pasar por el menú.
 *
 * Y no va el nombre del sitio. En el inicio ya está escrito grande abajo, y en
 * las demás pantallas esa fila a 360 px la necesitan los botones.
 */
/**
 * Cómo se llama cada destino cuando lo nombra la flecha.
 *
 * Se escribe el nombre de la PANTALLA, no "atrás": lo que hace que una flecha
 * se entienda es saber adónde te lleva antes de apretarla.
 *
 * Es un `Map` y no un objeto por lo mismo que en `lib/navegacion.ts` y en
 * `lib/gira.ts`: indexar un objeto plano con un texto devuelve también lo que
 * hay en la cadena de prototipos.
 */
const NOMBRE_DE = new Map([
  ["/", "Inicio"],
  ["/aprender", "Aprender"],
  ["/jugar", "Jugar"],
  ["/jugar/gira", "Mapa"],
]);

export function BarraApp() {
  const ruta = usePathname() ?? "/";
  const volver = volverDesde(ruta);
  const seccion = seccionDe(ruta);

  return (
    <header className="barra-app madera border-b-2 filo-dorado">
      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-2 py-2">
        {volver ? (
          <Link
            href={volver}
            className="flex items-center gap-1 rounded px-2 py-2 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-dorado transition-colors hover:bg-black/30"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path
                d="M15 5 L8 12 L15 19"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {NOMBRE_DE.get(volver) ?? "Volver"}
          </Link>
        ) : (
          /* Un hueco vacío, para que los atajos queden a la derecha y no
             saltando de lado según la pantalla en la que estés. */
          <span />
        )}

        <div className="flex gap-1 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide">
          <Atajo href="/aprender" activo={seccion === "aprender"}>
            Aprender
          </Atajo>
          <Atajo href="/jugar" activo={seccion === "jugar"} destacado>
            Jugar
          </Atajo>
        </div>
      </nav>
    </header>
  );
}

function Atajo({
  href,
  activo,
  destacado,
  children,
}: {
  href: string;
  activo: boolean;
  /** El de Jugar va en bordo, como estaba en la barra de antes. */
  destacado?: boolean;
  children: React.ReactNode;
}) {
  const base = "rounded px-3 py-2 transition-colors";
  const color = destacado
    ? "bg-bordo text-crema hover:bg-bordo-claro"
    : "text-crema/85 hover:bg-black/25 hover:text-crema";
  // El activo se marca con el filo dorado y no cambiándole el fondo: así los
  // dos botones se siguen leyendo igual y lo único que cambia es cuál está
  // encendido.
  const marca = activo ? "ring-2 ring-inset ring-dorado" : "";

  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`${base} ${color} ${marca}`}
    >
      {children}
    </Link>
  );
}
