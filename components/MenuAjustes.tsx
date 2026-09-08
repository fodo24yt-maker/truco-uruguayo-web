"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { seccionDe, type Seccion } from "@/lib/navegacion";

/**
 * El engranaje de la barra de arriba, y el panel que abre.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * Hasta el 8/9/2026 la barra tenía dos atajos escritos, "Aprender" y "Jugar", y
 * ésos eran TODOS los huecos que hay: a 320px de ancho, con el volver a la
 * izquierda, no entra un tercero. El día que apareció el anotador ya eran tres,
 * y el sonido va a ser el cuarto.
 *
 * Un engranaje ocupa un hueco y adentro entran los que sean. Se paga con un
 * toque de más para ir a Jugar; se cobra en que la barra deja de ser el techo
 * de lo que la app puede ofrecer.
 *
 * ── Tres cosas que el panel hace gratis por ser un `dialog` ───────────────
 *
 * 1. **El botón físico de atrás de Android lo cierra sin saber que existe.**
 *    `components/BotonAtrasAndroid.tsx` busca `[role="dialog"][aria-modal="true"]`
 *    y le manda `Escape` en vez de navegar. Ese contrato ya lo cumple la vitrina
 *    de trofeos; con las mismas dos propiedades puestas acá, el atrás cierra el
 *    panel en vez de sacarte de la pantalla, y no hubo que tocar ese archivo.
 * 2. **`Escape` y el foco**, con el mismo patrón de `components/Trofeos.tsx`:
 *    al abrir, el foco va al botón de cerrar. Sin eso, abrirlo con el teclado
 *    te deja el foco atrás, sobre una pantalla que ya no ves.
 * 3. **El lector de pantalla anuncia que se abrió algo encima**, que es lo que
 *    de verdad está pasando.
 *
 * ── Por qué el fondo es OPACO y no translúcido ────────────────────────────
 *
 * `bg-noche` a secas, sin `/95` ni `backdrop-blur`. Una hoja translúcida que
 * tapa la pantalla entera obliga al navegador a dibujar todo lo de abajo en una
 * superficie aparte para poder mezclarla, y superficies compuestas de más es
 * EXACTAMENTE el bug de las manchitas que este proyecto viene peleando desde el
 * 1/9/2026 (está contado en `README.md` y en `Historial.md`). No se ve peor: se
 * ve como una pantalla, que es lo que es.
 */

/**
 * Los ocho dientes del engranaje, calculados UNA vez al cargar el módulo.
 *
 * Se calculan en vez de escribirse a mano porque son ocho pares de coordenadas
 * con senos y cosenos adentro, y una tabla de dieciséis números copiada a mano
 * es un lugar donde nadie va a ver un error. Al ser una constante de módulo, el
 * costo en cada dibujo es cero.
 *
 * Van de r=5,4 a r=8,6 sobre un lienzo de 24: arrancan ADENTRO del círculo para
 * que no quede una ranura entre el diente y la rueda. Empezaron llegando a 9,2
 * y con el trazo fino, y en la captura no era un engranaje: era un sol. Un
 * diente corto y gordo se lee como diente; uno largo y flaco, como rayo.
 */
const DIENTES = Array.from({ length: 8 }, (_, i) => {
  const angulo = (i * Math.PI) / 4;
  const [cx, cy] = [Math.cos(angulo), Math.sin(angulo)];
  return {
    x1: 12 + cx * 5.4,
    y1: 12 + cy * 5.4,
    x2: 12 + cx * 8.6,
    y2: 12 + cy * 8.6,
  };
});

/**
 * Adónde se puede ir desde el panel.
 *
 * `seccion` es contra qué se compara para marcar dónde estás parado, y sale de
 * `seccionDe()` en `lib/navegacion.ts`: la misma función que ya usaba la barra
 * para encender un atajo. Marcar la pantalla en la que ya estás evita el toque
 * al pedo de ir a donde ya estabas.
 */
const DESTINOS: { href: string; texto: string; detalle: string; seccion: Seccion }[] = [
  {
    href: "/aprender",
    texto: "Aprender a jugar",
    detalle: "Las lecciones, de cero",
    seccion: "aprender",
  },
  {
    href: "/jugar",
    texto: "Jugar",
    detalle: "Partida suelta o la gira nacional",
    seccion: "jugar",
  },
  {
    href: "/anotador",
    texto: "Anotador",
    detalle: "La tablita, para cuando jugás con cartas de verdad",
    seccion: "anotador",
  },
];

export function MenuAjustes() {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname() ?? "/";
  const seccion = seccionDe(ruta);
  const cerrar = useRef<HTMLButtonElement>(null);

  /* Al cambiar de pantalla, el panel se cierra solo. Hace falta porque la barra
     —y con ella esto— no se desmonta al navegar: sin esto, tocar "Jugar" te
     dejaba en el menú de jugar con el panel todavía puesto encima. */
  useEffect(() => {
    setAbierto(false);
  }, [ruta]);

  useEffect(() => {
    if (!abierto) return;
    cerrar.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Ajustes"
        aria-expanded={abierto}
        className="rounded p-2 text-crema/85 transition-colors hover:bg-black/25 hover:text-dorado"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {DIENTES.map((d, i) => (
              <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} />
            ))}
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2.3" />
          </g>
        </svg>
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-ajustes"
          className="hoja-completa fixed inset-0 z-50 flex flex-col bg-noche"
        >
          <header className="madera flex shrink-0 items-center justify-between border-b-2 filo-dorado px-3 py-2.5">
            <h2
              id="titulo-ajustes"
              className="font-[family-name:var(--font-display)] text-xl text-dorado"
            >
              Ajustes
            </h2>
            <button
              ref={cerrar}
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar ajustes"
              className="rounded px-2 py-1.5 text-crema/80 transition-colors hover:bg-black/30 hover:text-crema"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M6 6 L18 18 M18 6 L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <div className="mx-auto flex w-full max-w-md flex-col gap-2">
              {DESTINOS.map((d) => {
                const acá = seccion === d.seccion;
                return (
                  <Link
                    key={d.href}
                    href={d.href}
                    aria-current={acá ? "page" : undefined}
                    className={`rounded border-2 px-4 py-3 transition-colors ${
                      acá
                        ? "border-dorado bg-black/40"
                        : "border-crema/15 bg-black/25 hover:border-dorado/60 hover:bg-black/40"
                    }`}
                  >
                    <span className="block font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-crema">
                      {d.texto}
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug text-crema/60">
                      {d.detalle}
                    </span>
                  </Link>
                );
              })}

              {/* EL SONIDO NO HACE NADA, Y ES A PROPÓSITO.
                  Santiago lo va a agregar más adelante; lo que se reserva hoy es
                  el LUGAR, para no tener que rediseñar el panel cuando llegue.
                  Va deshabilitado de verdad (`disabled`, no un `pointer-events`
                  apagado) para que el lector de pantalla y el teclado también se
                  enteren de que todavía no se puede tocar. */}
              <button
                type="button"
                disabled
                className="mt-2 flex cursor-not-allowed items-center justify-between rounded border-2 border-crema/10 px-4 py-3 text-left"
              >
                <span className="font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-crema/40">
                  Sonido
                </span>
                <span className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-widest text-crema/30">
                  Próximamente
                </span>
              </button>

              {/* Los legales. Hasta hoy sólo se llegaba desde el pie de
                  `/aprender` (ver `components/PieLegales.tsx`): adentro de
                  ajustes es donde los busca cualquiera que use una app, y Play
                  Store pide que se encuentren. */}
              <nav className="mt-4 flex items-center justify-center gap-x-4 font-[family-name:var(--font-ui)] text-xs uppercase tracking-wide text-crema/45">
                <Link href="/legales/privacidad" className="hover:text-crema">
                  Privacidad
                </Link>
                <span aria-hidden="true" className="text-crema/20">
                  ·
                </span>
                <Link href="/legales/terminos" className="hover:text-crema">
                  Términos
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
