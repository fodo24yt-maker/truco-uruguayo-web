"use client";

/**
 * La música de fondo. No dibuja nada: se monta una vez en `app/layout.tsx` y,
 * como el layout no se vuelve a cargar al navegar, la música sigue sonando de
 * una pantalla a otra sin cortarse.
 *
 * Hace tres cosas, y el resto es de `lib/audio.ts`:
 *
 *  1. **Arranca con el primer toque o tecla.** Antes los navegadores no dejan
 *     sonar nada. Se escucha `pointerup` y `click` y no `pointerdown`: en un
 *     celular, apoyar el dedo todavía no cuenta como "la persona hizo algo"
 *     para el navegador; levantarlo, sí.
 *  2. **La calla si la pantalla no se ve**: otra pestaña, el teléfono
 *     bloqueado, la app en segundo plano. En la app además se escucha
 *     `pause`/`resume` de Capacitor, por si el WebView no avisa con
 *     `visibilitychange` (pedido sin importar Capacitor en la web, igual que
 *     `BotonAtrasAndroid.tsx`).
 *  3. **La calla mientras hay un anuncio delante**, que trae su propio sonido.
 */

import { useEffect } from "react";

import { gestor } from "@/lib/anuncios";
import { arrancarMusica, pausarPor } from "@/lib/audio";

const TOQUES = ["pointerup", "click", "keydown"] as const;

export function Musica() {
  useEffect(() => {
    let vivo = true;

    const alTocar = () => {
      void arrancarMusica().then((suena) => {
        // Sólo se deja de escuchar cuando de verdad arrancó: si el navegador
        // no lo dejó con este toque, se prueba con el próximo.
        if (suena) for (const t of TOQUES) window.removeEventListener(t, alTocar);
      });
    };
    for (const t of TOQUES) window.addEventListener(t, alTocar);

    const alCambiarVista = () => pausarPor("oculta", document.hidden);
    alCambiarVista();
    document.addEventListener("visibilitychange", alCambiarVista);

    const quitarAnuncios = gestor.suscribir(() => pausarPor("anuncio", gestor.anuncioEnPantalla()));

    let soltarApp: (() => void) | undefined;
    const g = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    if (g.Capacitor?.isNativePlatform?.()) {
      void import("@capacitor/app").then(async ({ App }) => {
        const pausa = await App.addListener("pause", () => pausarPor("oculta", true));
        const vuelta = await App.addListener("resume", () => pausarPor("oculta", document.hidden));
        soltarApp = () => {
          void pausa.remove();
          void vuelta.remove();
        };
        if (!vivo) soltarApp();
      });
    }

    return () => {
      vivo = false;
      for (const t of TOQUES) window.removeEventListener(t, alTocar);
      document.removeEventListener("visibilitychange", alCambiarVista);
      quitarAnuncios();
      soltarApp?.();
    };
  }, []);

  return null;
}
