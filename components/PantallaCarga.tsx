"use client";

/**
 * La pantalla de carga de la app. SÓLO en la app: la web no la tiene.
 *
 * ── POR QUÉ EXISTE (2/10/2026) ────────────────────────────────────────────
 * La primera partida tardaba en aparecer y se veía mal mientras tanto. Lo que
 * se puede adelantar se adelanta acá, al abrir la app, para que al tocar
 * "Partida rápida" sólo falte repartir.
 *
 * Lo que NO se precarga: la mesa, el rival y la mano. Son dibujos de código;
 * no hay nada que bajar, y tenerlos montados y escondidos sería gastar memoria
 * de la GPU todo el tiempo, que es justo el terreno del bug de los píxeles.
 *
 * ── CÓMO SE VE ────────────────────────────────────────────────────────────
 * El fondo es `noche`, el mismo color del splash de Android que viene antes:
 * el pase del uno a la otra no se nota. Al medio, la marca (el mismo motivo
 * del ícono), y abajo una barrita que se llena.
 *
 * La barra la mueve el CSS (`.barra-carga-relleno`, en `globals.css`), así
 * que se mueve desde el primer cuadro, antes de que cargue el JavaScript. Va
 * frenando hasta ~90% y la completa este componente cuando la carga terminó
 * de verdad.
 *
 * ── SE VA DE GOLPE ────────────────────────────────────────────────────────
 * Sin fundido. Una capa de pantalla completa que se funde es una capa
 * compuesta animándose justo en un cambio de escena, y este proyecto no midió
 * eso contra el bug de los píxeles. Por las dudas, no.
 *
 * ── NUNCA SE TRABA ────────────────────────────────────────────────────────
 * Dos redes. La de acá: a los `MS_MAXIMO_PANTALLA_CARGA` se va aunque la carga
 * no haya terminado. La del CSS: a los 6 s se esconde sola aunque el
 * JavaScript no haya llegado a correr nunca.
 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { arrancarAnuncios } from "@/components/Anuncios";
import { Marca } from "@/components/Marca";
import { portero } from "@/lib/entrada";
import { leerProgreso } from "@/lib/progreso";

/** Lo mínimo que se ve, para que no sea un parpadeo. Desde que abre la página. */
export const MS_MINIMO_PANTALLA_CARGA = 800;

/** Lo máximo: si la carga tarda más, la pantalla se va igual. */
export const MS_MAXIMO_PANTALLA_CARGA = 4000;

/** Lo que tarda la barra en llenarse del todo antes de que la pantalla se vaya. */
const MS_COMPLETAR_BARRA = 200;

/** Espera hasta que hayan pasado `ms` desde que se abrió la página. */
const hasta = (ms: number) =>
  new Promise<void>((listo) => setTimeout(listo, Math.max(0, ms - performance.now())));

type Fase = "cargando" | "completa" | "fuera";

/**
 * Lo que se carga mientras se ve la pantalla:
 *
 *  · el código de las pantallas de jugar y las imágenes de las mesas
 *    probables (`lib/precarga.ts`, importado acá adentro para no sumarle peso
 *    al primer paquete);
 *  · el arranque de AdMob con su primera carga, que corre en el hilo
 *    principal de Android: mejor que caiga ahora que al entrar a jugar.
 *
 * Si la Gira tiene candado, su próxima parada no se precarga: no se va a jugar.
 */
function cargarTodo(prefetch: (href: string) => void): Promise<unknown> {
  portero.refrescar();
  const conGira = !portero.leerCandados().gira;
  return Promise.all([
    import("@/lib/precarga").then((m) =>
      m.precargarJuego({ prefetch, datos: leerProgreso(), conGira }),
    ),
    arrancarAnuncios(),
  ]);
}

/**
 * En la web devuelve `null` y nada más. `NEXT_PUBLIC_DESTINO` se fija al
 * compilar: en el build de la web la condición es constante, el minificador
 * tira `PantallaDeLaApp` entera, y con ella la precarga y su import. Sin esto
 * el código viajaba igual en el paquete que la web baja en cada página
 * (medido el 3/10/2026), aunque el layout no la monte nunca.
 */
export function PantallaCarga() {
  if (process.env.NEXT_PUBLIC_DESTINO !== "app") return null;
  return <PantallaDeLaApp />;
}

function PantallaDeLaApp() {
  const [fase, setFase] = useState<Fase>("cargando");
  const router = useRouter();

  useEffect(() => {
    let viva = true;
    // La carga nunca rechaza hacia acá: si algo falla, la pantalla se va igual.
    const tarea = cargarTodo((href) => router.prefetch(href)).catch(() => {});
    Promise.race([
      Promise.all([tarea, hasta(MS_MINIMO_PANTALLA_CARGA)]),
      hasta(MS_MAXIMO_PANTALLA_CARGA),
    ]).then(() => {
      if (!viva) return;
      setFase("completa");
      setTimeout(() => viva && setFase("fuera"), MS_COMPLETAR_BARRA);
    });
    return () => {
      viva = false;
    };
    // Una sola vez por carga de página: es la pantalla del arranque. El router
    // de Next es el mismo objeto toda la vida de la página.
  }, [router]);

  if (fase === "fuera") return null;

  return (
    <div
      data-pantalla-carga
      data-completa={fase === "completa" ? "true" : undefined}
      className="pantalla-carga fixed inset-0 z-[70] flex flex-col items-center justify-center bg-noche px-6"
    >
      <Marca alto="clamp(6.5rem, 21vh, 10.5rem)" idHalo="halo-marca-carga" />
      <p className="mt-[clamp(0.5rem,2vh,1rem)] font-[family-name:var(--font-display)] text-[clamp(1.6rem,4.6vh,2.25rem)] leading-none text-dorado">
        Truco Uruguayo
      </p>

      <div
        role="status"
        aria-label="Cargando"
        className="mt-[clamp(1.75rem,6vh,3rem)] flex flex-col items-center gap-[clamp(0.6rem,1.6vh,0.9rem)]"
      >
        <BarraCarga />
        <p
          aria-hidden="true"
          className="font-[family-name:var(--font-ui)] text-[0.7rem] uppercase tracking-[0.3em] text-crema/55"
        >
          Barajando…
        </p>
      </div>
    </div>
  );
}

/**
 * La barrita, sola: la usa esta pantalla y el "Repartiendo…" de la mesa. Se
 * mueve por CSS (`.barra-carga-relleno`, en `globals.css`), así que anda
 * desde el primer cuadro, antes del JavaScript.
 */
export function BarraCarga({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-2 w-[min(62vw,15rem)] overflow-hidden rounded-full border border-dorado/45 bg-black/45 ${className}`}
    >
      <div className="barra-carga-relleno h-full w-full rounded-full bg-dorado" />
    </div>
  );
}
