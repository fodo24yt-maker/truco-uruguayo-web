"use client";

/**
 * El tutorial de la mesa: la primera vez que entrás a Jugar, una foto de una
 * partida de verdad y, paso a paso, qué es cada cosa (29/10/2026, lo pidió
 * Santiago). Después se vuelve a ver desde Ajustes.
 *
 * ── Por qué una FOTO de la mesa ──────────────────────────────────────────
 *
 * La saca `herramientas/generar-tutorial.mjs` jugando en la mesa real, igual
 * que las texturas las hornea `generar-escena.mjs`: así es LA mesa y no una
 * parecida, en el celular y en la compu, y la mesa no se toca. Las zonas que
 * se marcan son las que midió esa herramienta (`lib/tutorial-fotos.ts`), y
 * los pasos, el guion, están en `lib/tutorial-pasos.ts`.
 *
 * ── Cómo se arma ─────────────────────────────────────────────────────────
 *
 * La foto, lo que se apaga y el aro van en UN SVG con el `viewBox` del tamaño
 * de la pantalla en que se sacó: lo marcado cae justo arriba de lo que marca,
 * en cualquier pantalla, sin hacer cuentas. Lo apagado es un solo `path` con
 * agujeros (`evenodd`) y SIN desenfoque, que es la regla de la mesa desde el
 * 8/10 (`Historial.md`): nada de `filter`, `backdrop-filter` ni sombras
 * borrosas, que en el Mali del Redmi dejan basura. Y la hoja es opaca, como
 * la de Ajustes.
 *
 * ── Cuándo sale ──────────────────────────────────────────────────────────
 *
 * - La primera vez que la ruta es `/jugar`, venga de donde venga (la portada,
 *   Ajustes, el final de Aprender). Pero NUNCA debajo de la pantalla de carga:
 *   ahí la app hace su ensayo, que pasa por `/jugar` con el perfil nuevo
 *   (`components/PantallaCarga.tsx`). Mientras esté, se espera; si cuando se
 *   va ya no estás en `/jugar` (el ensayo vuelve al inicio), no sale.
 * - Cuando Ajustes manda `EVENTO_TUTORIAL`.
 *
 * Queda visto al cerrarlo de cualquier forma: terminar, Saltar, Escape o el
 * atrás de Android (que manda Escape a un diálogo modal, ver
 * `BotonAtrasAndroid.tsx`). Si se cierra la app a mitad, vuelve a salir.
 */

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { EVENTO_TUTORIAL, marcarVisto, yaVisto } from "@/lib/tutorial";
import { FOTOS_TUTORIAL, type ZonaTutorial } from "@/lib/tutorial-fotos";
import { PASOS_TUTORIAL } from "@/lib/tutorial-pasos";

/** La ruta sin la barra final que agrega el build de la app (`trailingSlash`). */
const limpia = (ruta: string) => ruta.replace(/(.)\/$/, "$1");

/** Cuánto aire se deja alrededor de lo marcado, en px de la foto. */
const AIRE = 6;
const RADIO = 10;
/** Lo que no se explica en el paso: la mesa queda, pero de fondo. */
const APAGADO = "rgba(8,5,3,0.7)";
/** La separación entre la tarjeta, lo marcado y los bordes, en px de pantalla. */
const MARGEN = 12;

const DESCRIPCION = {
  a: "Una partida en la mesa: tu rival enfrente, la muestra al lado del mazo, tus tres cartas abajo y los botones de cantar.",
  b: "La misma mesa cuando tu rival te cantó truco: su globo arriba a la derecha y abajo los botones para contestar.",
};

/** Un rectángulo redondeado, para hacer el agujero en lo apagado. */
function agujero({ x, y, w, h }: ZonaTutorial): string {
  const r = Math.min(RADIO, w / 2, h / 2);
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

export function TutorialMesa() {
  const ruta = limpia(usePathname() ?? "/");
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(0);
  const [marco, setMarco] = useState<{ w: number; h: number } | null>(null);
  /* Dónde va la tarjeta, y para qué paso se calculó: hasta tenerlo, no se ve. */
  const [lugar, setLugar] = useState<{ paso: number; x: number; y: number } | null>(null);
  const rutaAlAbrir = useRef<string | null>(null);
  const cajaMarco = useRef<HTMLDivElement>(null);
  const tarjeta = useRef<HTMLDivElement>(null);
  const siguiente = useRef<HTMLButtonElement>(null);

  const abrir = useCallback(() => {
    rutaAlAbrir.current = limpia(window.location.pathname);
    setPaso(0);
    setLugar(null);
    setAbierto(true);
  }, []);

  const cerrar = useCallback(() => {
    marcarVisto();
    setAbierto(false);
  }, []);

  /* La primera vez en Jugar, fuera del ensayo de la pantalla de carga. */
  useEffect(() => {
    if (ruta !== "/jugar" || yaVisto()) return;
    const probar = () => {
      if (document.querySelector("[data-pantalla-carga]")) return false;
      if (limpia(window.location.pathname) === "/jugar" && !yaVisto()) abrir();
      return true;
    };
    if (probar()) return;
    const reloj = window.setInterval(() => {
      if (probar()) window.clearInterval(reloj);
    }, 250);
    return () => window.clearInterval(reloj);
  }, [ruta, abrir]);

  /* Desde Ajustes. */
  useEffect(() => {
    window.addEventListener(EVENTO_TUTORIAL, abrir);
    return () => window.removeEventListener(EVENTO_TUTORIAL, abrir);
  }, [abrir]);

  /* Si cambia la pantalla con el tutorial abierto, se cierra. */
  useEffect(() => {
    if (abierto && rutaAlAbrir.current !== null && ruta !== rutaAlAbrir.current) cerrar();
  }, [ruta, abierto, cerrar]);

  /* Escape (y con él, el atrás de Android) lo cierra. */
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto, cerrar]);

  /* El tamaño de lo que queda para la foto: decide cuál foto y la escala. */
  useLayoutEffect(() => {
    if (!abierto) return;
    const el = cajaMarco.current;
    if (!el) return;
    const medir = () => setMarco({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [abierto]);

  /* Las dos fotos del tamaño que toca, cargadas de entrada: pasar de la A a la
     B no tiene que mostrar un cuadro vacío. */
  const apaisada = marco ? marco.w > marco.h : false;
  const fotos = FOTOS_TUTORIAL[apaisada ? "pc" : "celular"];
  useEffect(() => {
    if (!abierto) return;
    for (const f of [fotos.a, fotos.b]) new Image().src = f.src;
  }, [abierto, fotos]);

  const p = PASOS_TUTORIAL[paso];
  const foto = fotos[p.foto];
  const zonas = p.zonas
    .map((n) => foto.zonas[n])
    .filter((z): z is ZonaTutorial => !!z)
    .map((z) => {
      const x = Math.max(0, z.x - AIRE), y = Math.max(0, z.y - AIRE);
      return { x, y, w: Math.min(foto.ancho, z.x + z.w + AIRE) - x, h: Math.min(foto.alto, z.y + z.h + AIRE) - y };
    });

  /* De px de la foto a px de pantalla: es el `meet` del SVG. */
  const escala = marco ? Math.min(marco.w / foto.ancho, marco.h / foto.alto) : 1;
  const ox = marco ? (marco.w - foto.ancho * escala) / 2 : 0;
  const oy = marco ? (marco.h - foto.alto * escala) / 2 : 0;
  /* Lo marcado, en px de pantalla y de arriba hacia abajo. */
  const cajas = zonas
    .map((z) => ({ x: ox + z.x * escala, y: oy + z.y * escala, x2: ox + (z.x + z.w) * escala, y2: oy + (z.y + z.h) * escala }))
    .sort((a, b) => a.y - b.y);
  const ancho = marco ? Math.min(marco.w - 2 * MARGEN, 420) : 0;

  /* DÓNDE VA LA TARJETA. En el hueco de pantalla libre más grande entre lo
     marcado: arriba de todo, abajo de todo, o ENTRE dos zonas (el paso de lo
     que se dijo marca lo de él arriba y lo tuyo abajo, y en el celular la
     tarjeta sólo entra en el medio). Pegada a la zona de al lado, o centrada
     si el hueco está entre dos. Sin nada marcado, en el medio de la madera,
     que en la foto está vacía. */
  const clave = cajas.map((c) => `${c.x}:${c.y}:${c.x2}:${c.y2}`).join("|");
  useLayoutEffect(() => {
    if (!abierto || !marco || !tarjeta.current) return;
    const alto = tarjeta.current.offsetHeight;
    let y: number;
    let centro = marco.w / 2;
    if (!cajas.length) y = oy + foto.alto * escala * 0.55 - alto / 2;
    else {
      const huecos = [
        { desde: 0, hasta: cajas[0].y, junto: cajas[0], lado: "arriba" as const },
        ...cajas.slice(1).map((c, i) => ({ desde: cajas[i].y2, hasta: c.y, junto: null, lado: "entre" as const })),
        { desde: cajas.at(-1)!.y2, hasta: marco.h, junto: cajas.at(-1)!, lado: "abajo" as const },
      ];
      const entra = (h: (typeof huecos)[number]) => h.hasta - h.desde >= alto + 2 * MARGEN;
      const hueco = [...huecos].sort((a, b) => Number(entra(b)) - Number(entra(a)) || b.hasta - b.desde - (a.hasta - a.desde))[0];
      if (hueco.lado === "arriba") y = hueco.hasta - MARGEN - alto;
      else if (hueco.lado === "abajo") y = hueco.desde + MARGEN;
      else y = (hueco.desde + hueco.hasta - alto) / 2;
      if (hueco.junto) centro = (hueco.junto.x + hueco.junto.x2) / 2;
    }
    y = Math.max(MARGEN, Math.min(y, marco.h - alto - MARGEN));
    const x = Math.max(MARGEN, Math.min(centro - ancho / 2, marco.w - ancho - MARGEN));
    setLugar({ paso, x, y });
    // `clave` resume `cajas`, que es una lista nueva en cada render.
  }, [abierto, marco, paso, clave, ancho, oy, escala, foto.alto]);

  const puesta = lugar?.paso === paso;

  /* El foco, en "Siguiente": es lo que se toca en cada paso. Recién cuando la
     tarjeta está en su lugar: mientras se mide es `invisible`, y a un botón
     invisible el navegador no le da el foco. */
  useEffect(() => {
    if (abierto && puesta) siguiente.current?.focus();
  }, [abierto, paso, puesta]);

  if (!abierto) return null;

  const ultimo = paso === PASOS_TUTORIAL.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-tutorial"
      data-tutorial
      className="hoja-completa fixed inset-0 z-50 flex flex-col bg-noche"
    >
      <header className="madera flex shrink-0 items-center justify-between gap-3 border-b-2 filo-dorado px-3 py-1.5">
        <h2 id="titulo-tutorial" className="font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-dorado">
          Cómo se usa la mesa
          <span className="ml-2 text-crema/50">
            {paso + 1} de {PASOS_TUTORIAL.length}
          </span>
        </h2>
        <button
          type="button"
          onClick={cerrar}
          data-sonido="volver"
          className="min-h-[44px] rounded px-3 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-crema/80 transition-colors hover:bg-black/30 hover:text-crema"
        >
          Saltar
        </button>
      </header>

      <div ref={cajaMarco} className="relative min-h-0 flex-1 overflow-hidden">
        {marco && (
          <svg
            viewBox={`0 0 ${foto.ancho} ${foto.alto}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={DESCRIPCION[p.foto]}
          >
            <image href={foto.src} width={foto.ancho} height={foto.alto} />
            {zonas.length > 0 && (
              <>
                <path
                  d={`M0 0H${foto.ancho}V${foto.alto}H0Z${zonas.map(agujero).join("")}`}
                  fill={APAGADO}
                  fillRule="evenodd"
                />
                {zonas.map((z, i) => (
                  <rect
                    key={i}
                    x={z.x}
                    y={z.y}
                    width={z.w}
                    height={z.h}
                    rx={Math.min(RADIO, z.w / 2, z.h / 2)}
                    fill="none"
                    stroke="var(--color-dorado)"
                    strokeWidth={2.5}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </>
            )}
          </svg>
        )}

        <div
          ref={tarjeta}
          key={paso}
          aria-live="polite"
          className={`absolute rounded-md border-2 border-dorado/70 bg-crema p-4 text-tinta sombra-globo ${puesta ? "anim-pop" : "invisible"}`}
          style={{ left: puesta ? lugar.x : 0, top: puesta ? lugar.y : 0, width: ancho || undefined }}
        >
          <h3 className="font-[family-name:var(--font-display)] text-xl leading-tight">{p.titulo}</h3>
          <p className="mt-1.5 text-[15px] leading-snug text-tinta/85">{p.texto}</p>
          <div className="mt-3 flex items-center justify-between gap-2 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide">
            {paso > 0 ? (
              <button
                type="button"
                onClick={() => setPaso(paso - 1)}
                className="min-h-[44px] rounded px-3 text-tinta/70 transition-colors hover:bg-tinta/10 hover:text-tinta"
              >
                ← Anterior
              </button>
            ) : (
              <span />
            )}
            <button
              ref={siguiente}
              type="button"
              onClick={() => (ultimo ? cerrar() : setPaso(paso + 1))}
              className="min-h-[44px] rounded bg-bordo px-4 text-crema transition-colors hover:bg-bordo-claro"
            >
              {ultimo ? "¡A jugar!" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
