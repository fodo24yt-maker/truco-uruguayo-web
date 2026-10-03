"use client";

/**
 * El diálogo de lo bloqueado: el anotador y la Gira nacional (sólo en la app).
 *
 * Dice claro qué se recibe a cambio: el video es UNA vez y lo desbloqueado es
 * PARA SIEMPRE. Sin esa frase un video de 30 segundos se lee como un peaje en
 * cada entrada, y nadie lo mira.
 *
 * ── Dónde vive, y por qué ─────────────────────────────────────────────────
 * Se monta UNA vez en `app/layout.tsx`, directo en el `<body>`. No adentro de
 * la barra: en la mesa y en el mapa el `<header>` se esconde con `display:
 * none`, y eso esconde también todo lo que cuelgue de él, aunque sea `fixed`.
 *
 * ── Cumple el contrato del botón atrás ────────────────────────────────────
 * `role="dialog"` + `aria-modal="true"` y escucha `Escape` en `window`, que es
 * exactamente lo que `BotonAtrasAndroid.tsx` busca y manda. El atrás de Android
 * lo cierra como si fuera "Ahora no", sin tocar ese archivo.
 *
 * ── Fondo OPACO ───────────────────────────────────────────────────────────
 * `bg-noche` entero, sin transparencia ni `backdrop-blur`: por lo mismo que el
 * panel de ajustes (está explicado en `MenuAjustes.tsx`, es el bug de las
 * manchitas). `z-[60]` para quedar arriba del panel de ajustes (`z-50`) y del
 * selector de rival de la mesa (`z-40`).
 */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { Candado } from "@/components/Candado";
import { type EstadoVideo, gestor } from "@/lib/anuncios";
import { type Dialogo, portero } from "@/lib/entrada";

const sinDialogo = () => null;
const videoEnServidor = (): EstadoVideo => "cargando";

const TITULO = { anotador: "El anotador", gira: "La Gira nacional" } as const;

export function DialogoDesbloqueo() {
  const router = useRouter();
  const dialogo = useSyncExternalStore<Dialogo | null>(
    portero.suscribir,
    portero.leerDialogo,
    sinDialogo,
  );

  // El portero navega con el router de Next (para el "volver de un anuncio")
  useEffect(() => {
    portero.conectarNavegacion((href) => router.push(href));
  }, [router]);

  if (!dialogo) return null;
  return <Contenido key={dialogo.que} dialogo={dialogo} />;
}

function Contenido({ dialogo }: { dialogo: Dialogo }) {
  const video = useSyncExternalStore(gestor.suscribir, gestor.estadoVideo, videoEnServidor);
  const candados = useSyncExternalStore(portero.suscribir, portero.leerCandados, portero.leerCandados);
  const primero = useRef<HTMLButtonElement>(null);
  const esGira = dialogo.que === "gira";

  useEffect(() => {
    primero.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") portero.cerrarDialogo();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  const noHay = dialogo.aviso === "no-disponible" || (dialogo.aviso === null && video === "no-disponible");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-desbloqueo"
      aria-describedby="texto-desbloqueo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-noche px-4 py-6"
    >
      <div className="w-full max-w-sm overflow-hidden rounded border-2 border-dorado/50 bg-black/40">
        <header className="madera flex items-center gap-3 border-b-2 filo-dorado px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-dorado/70 bg-noche text-dorado">
            <Candado className="h-5 w-5" />
          </span>
          <h2
            id="titulo-desbloqueo"
            className="font-[family-name:var(--font-display)] text-xl leading-tight text-dorado"
          >
            {TITULO[dialogo.que]}
          </h2>
        </header>

        <div className="px-4 py-4">
          <p id="texto-desbloqueo" className="text-[0.95rem] leading-relaxed text-crema/85">
            {esGira ? (
              <>
                La Gira se desbloquea terminando <strong className="text-crema">Aprender</strong>{" "}
                (llevás {candados.acertados} de {candados.total} ejercicios). ¿Ya jugás como los
                grandes? Saltate la práctica mirando un video corto.{" "}
                <strong className="text-crema">Es una sola vez</strong>: después queda abierta
                para siempre.
              </>
            ) : (
              <>
                Desbloqueá el anotador para tus partidas de siempre mirando un video de unos 30
                segundos. <strong className="text-crema">Es una sola vez</strong>: después queda
                tuyo para siempre.
              </>
            )}
          </p>

          {/* Los avisos. `role="status"` para que el lector de pantalla los lea
              al aparecer, que es cuando importan. */}
          <div role="status" className="empty:hidden">
            {dialogo.aviso === "cerrado-antes" && (
              <p className="mt-3 rounded border border-crema/20 bg-black/30 px-3 py-2 text-sm leading-snug text-crema/80">
                Cerraste el video antes de que terminara, así que todavía no se desbloqueó. Cuando
                quieras, probá de nuevo.
              </p>
            )}
            {noHay && (
              <p className="mt-3 rounded border border-crema/20 bg-black/30 px-3 py-2 text-sm leading-snug text-crema/80">
                El video no está disponible ahora. Probá en un ratito
                {esGira ? ", o terminá Aprender, que también la desbloquea." : "."}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <BotonVideo estado={video} noHay={noHay} refPrimero={primero} />
            {esGira && (
              <button
                type="button"
                onClick={() => portero.irAAprender()}
                className="rounded border-2 border-crema/30 px-5 py-3 font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-crema transition-colors hover:border-dorado/70 hover:bg-black/25"
              >
                Ir a Aprender
              </button>
            )}
            <button
              type="button"
              onClick={() => portero.cerrarDialogo()}
              className="rounded px-5 py-2.5 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-crema/60 transition-colors hover:bg-black/25 hover:text-crema"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BotonVideo({
  estado,
  noHay,
  refPrimero,
}: {
  estado: EstadoVideo;
  noHay: boolean;
  refPrimero: React.RefObject<HTMLButtonElement | null>;
}) {
  const clase =
    "rounded bg-dorado px-5 py-3 font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-tinta transition-colors hover:bg-dorado-claro disabled:cursor-default disabled:bg-dorado/40 disabled:text-tinta/70";

  if (noHay) {
    return (
      <button ref={refPrimero} type="button" onClick={() => portero.reintentarVideo()} className={clase}>
        Probar de nuevo
      </button>
    );
  }
  const listo = estado === "listo";
  const texto = estado === "mirando" ? "Mirando el video…" : listo ? "Ver video" : "Cargando video…";
  return (
    <button
      ref={refPrimero}
      type="button"
      disabled={!listo}
      aria-busy={!listo}
      onClick={() => void portero.verVideoParaDesbloquear()}
      className={clase}
    >
      {texto}
    </button>
  );
}
