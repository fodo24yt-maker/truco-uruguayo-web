"use client";

/**
 * Arranca los anuncios. En la app, y sólo en la app.
 *
 * Se monta una vez en `app/layout.tsx` y no dibuja nada. Al abrir la app:
 *
 *  1. pide el consentimiento (UMP), que en Europa muestra el formulario de
 *     Google ANTES de pedir un solo anuncio;
 *  2. si se puede, arranca el SDK de AdMob;
 *  3. precarga el intersticial y, si queda algo bloqueado, el video. Desde el
 *     3/10/2026 el intersticial también se carga acá y no al entrar a la
 *     primera partida: esa carga pesa, corre en el hilo principal de Android
 *     y hacía tardar la mesa. Ahora cae durante la pantalla de carga.
 *
 * No es un anuncio al abrir la app, ni nada que se vea: es preparar.
 *
 * En la web, `NEXT_PUBLIC_DESTINO` vale "web" al compilar y todo el efecto es
 * código muerto: el import del plugin desaparece del build y la web no trae
 * una sola línea de AdMob. Se verifica con `grep` sobre `out/`.
 */

import { useEffect } from "react";

import { gestor } from "@/lib/anuncios";
import { portero } from "@/lib/entrada";
import { esApp } from "@/lib/plataforma";

/** Una vez por carga de página, aunque React monte dos veces en desarrollo. */
let arranque: Promise<void> | null = null;

function arrancar(): Promise<void> {
  if (process.env.NEXT_PUBLIC_DESTINO !== "app") return Promise.resolve();

  /* La red de anuncios DE MENTIRA, para `herramientas/mirar-anuncios.mjs`.
     `NODE_ENV` es "production" en los dos builds, así que esta rama no existe
     en nada que se publique: sólo en `next dev`, y sólo si la herramienta
     puso la bandera antes de cargar la página. */
  if (
    process.env.NODE_ENV !== "production" &&
    (window as unknown as { __trucoAnunciosSimulados?: object }).__trucoAnunciosSimulados
  ) {
    return import("@/lib/anuncios-simulados").then((m) => gestor.conectar(m.crearMotorSimulado()));
  }

  if (!esApp()) return Promise.resolve();
  return import("@/lib/anuncios-admob")
    .then((m) => m.crearMotorAdmob())
    .then((motor) => (motor ? gestor.conectar(motor) : undefined))
    .catch(() => {
      // Si algo del plugin falla, la app sigue: sin anuncios y sin trabas.
    });
}

/**
 * El arranque, compartido: lo pide este componente y también la pantalla de
 * carga de la app, que lo espera (con su tope) para que el trabajo pesado de
 * AdMob —que corre en el hilo principal de Android— caiga mientras se ve
 * "Barajando…" y no al entrar a la primera partida. Corre una sola vez.
 */
export function arrancarAnuncios(): Promise<void> {
  arranque ??= arrancar();
  return arranque;
}

export function Anuncios() {
  useEffect(() => {
    portero.refrescar();
    void arrancarAnuncios();
  }, []);
  return null;
}
