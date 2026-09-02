"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { volverDesde } from "@/lib/navegacion";

/**
 * El botón físico de atrás del teléfono.
 *
 * ── Por qué hay que programarlo ───────────────────────────────────────────
 *
 * Sin esto, el atrás de Android hace lo de fábrica: cerrar la app. O sea que
 * estando en medio de una partida, un toque en el botón de siempre te saca del
 * juego. Es la primera cosa que prueba cualquiera que instala una app.
 *
 * ── Por qué no hace `history.back()` ──────────────────────────────────────
 *
 * Usa la MISMA `volverDesde()` que la flecha de la barra, así que los dos
 * botones van al mismo lugar por construcción y no por acuerdo. Si algún día
 * cambia dónde vuelve una pantalla, cambian los dos juntos.
 *
 * Con el historial no pasaría: entrás a una lección desde el inicio, apretás
 * "siguiente" cuatro veces, y el atrás te hace desandar lección por lección en
 * vez de salir del capítulo.
 *
 * ── Por qué no importa Capacitor arriba del archivo ───────────────────────
 *
 * Este componente lo carga TAMBIÉN la web, donde `@capacitor/app` no sirve para
 * nada y sería peso muerto en la descarga. Capacitor deja un objeto global en
 * el WebView, así que primero se pregunta si estamos adentro de la app mirando
 * ese global —sin importar nada— y recién ahí se pide el módulo. En el
 * navegador esto no baja un solo byte de más.
 */
export function BotonAtrasAndroid() {
  const ruta = usePathname() ?? "/";
  const router = useRouter();

  useEffect(() => {
    const global = window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    };
    if (!global.Capacitor?.isNativePlatform?.()) return;

    let soltar: (() => void) | undefined;
    let vivo = true;

    void import("@capacitor/app").then(({ App }) => {
      if (!vivo) return;
      void App.addListener("backButton", () => {
        /* Si hay algo abierto encima —la vitrina de trofeos—, el atrás lo
           cierra en vez de navegar. Se hace mirando el DOM y mandando Escape,
           que es la tecla que esas hojas ya escuchan: así el que abre una hoja
           nueva no tiene que acordarse de avisarle a este archivo. */
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
          return;
        }

        const destino = volverDesde(ruta, window.location.search);
        if (destino) router.push(destino);
        // Sin adónde volver estás en el inicio, y ahí el atrás sale de la app,
        // que es lo que espera cualquiera que use Android.
        else void App.exitApp();
      }).then((manija) => {
        if (vivo) soltar = () => void manija.remove();
        else void manija.remove();
      });
    });

    return () => {
      vivo = false;
      soltar?.();
    };
  }, [ruta, router]);

  return null;
}
