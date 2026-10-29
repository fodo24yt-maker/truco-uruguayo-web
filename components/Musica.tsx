"use client";

/**
 * El sonido de la app. No dibuja nada: se monta una vez en `app/layout.tsx` y,
 * como el layout no se vuelve a cargar al navegar, la música sigue sonando de
 * una pantalla a otra sin cortarse.
 *
 * Hace cinco cosas, y el resto es de `lib/audio.ts`:
 *
 *  1. **Arranca con el primer toque o tecla.** Antes los navegadores no dejan
 *     sonar nada. Se escucha `pointerup` y `click` y no `pointerdown`: en un
 *     celular, apoyar el dedo todavía no cuenta como "la persona hizo algo";
 *     levantarlo, sí.
 *  2. **Le dice en qué sección estás**, con cada cambio de ruta: la música de
 *     los menús no es la de la mesa ni la del mapa (`ambienteDeRuta`).
 *  3. **Calla todo si la pantalla no se ve**: otra pestaña, el teléfono
 *     bloqueado, la app en segundo plano. En la app además se escucha
 *     `pause`/`resume` de Capacitor, por si el WebView no avisa con
 *     `visibilitychange` (pedido sin importar Capacitor en la web, igual que
 *     `BotonAtrasAndroid.tsx`).
 *  4. **Calla todo mientras hay un anuncio delante**, que trae su propio sonido.
 *  5. **Hace sonar los botones** (desde el 25/10/2026): cada toque en algo
 *     tocable suena con el efecto que diga su `data-sonido`, o con el clic de
 *     siempre (`efectoDelToque`). Es UN solo oyente para toda la app, y no un
 *     `tocarEfecto` en cada botón, para que un botón nuevo suene sin que nadie
 *     se acuerde de pedirlo.
 *
 * Los `data-sonido` que hay: `volver` (la flecha, cerrar una hoja), `palito` y
 * `borrar` (el anotador), `acierto` y `error` (las opciones de un ejercicio), y
 * `no` para uno que no tiene que sonar.
 */

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { gestor } from "@/lib/anuncios";
import { ambienteDeRuta, arrancarSonido, pausarPor, ponerAmbiente, tocarEfecto } from "@/lib/audio";
import { esEfecto, type Efecto } from "@/lib/efectos";

const TOQUES = ["pointerup", "click", "keydown"] as const;

/** Lo que hace clic al tocarlo. Las barras de volumen no: la de Efectos suena aparte (`MenuAjustes`). */
const TOCABLE = 'button, a[href], [role="button"], [role="switch"], [role="tab"], summary';

/**
 * Qué suena al tocar `objetivo`, o nada.
 *
 * En la mesa, lo de la partida no hace clic, como pidió Santiago: ahí van a
 * sonar las cartas. Sólo suena lo que lo pide con su `data-sonido` (irse:
 * "Salir", "Mapa", "Volver al mapa"). La mesa esconde la barra de arriba del
 * sitio y trae la suya, adentro del `<main>`. Lo que se abre encima por fuera
 * del `<main>` —el diálogo de desbloqueo— suena como en todos lados.
 */
function efectoDelToque(objetivo: EventTarget | null, ruta: string): Efecto | null {
  if (!(objetivo instanceof Element)) return null;
  const el = objetivo.closest(TOCABLE);
  if (!el || el.matches(":disabled") || el.closest('[aria-disabled="true"]')) return null;
  const pedido = el.getAttribute("data-sonido");
  if (pedido === "no") return null;
  if (ambienteDeRuta(ruta) === "mesa" && el.closest("main") && pedido === null) return null;
  return esEfecto(pedido) ? pedido : "toque";
}

export function Musica() {
  const ruta = usePathname() ?? "/";

  useEffect(() => {
    ponerAmbiente(ambienteDeRuta(ruta));
  }, [ruta]);

  useEffect(() => {
    let vivo = true;

    const alTocar = () => {
      void arrancarSonido().then((anda: boolean) => {
        // Sólo se deja de escuchar cuando de verdad arrancó: si el navegador
        // no lo dejó con este toque, se prueba con el próximo.
        if (anda) for (const t of TOQUES) window.removeEventListener(t, alTocar);
      });
    };
    for (const t of TOQUES) window.addEventListener(t, alTocar);

    const alCambiarVista = () => pausarPor("oculta", document.hidden);
    alCambiarVista();
    document.addEventListener("visibilitychange", alCambiarVista);

    const quitarAnuncios = gestor.suscribir(() => pausarPor("anuncio", gestor.anuncioEnPantalla()));

    /* El efecto se ELIGE en captura, antes de que el botón haga lo suyo: el
       `+` del anotador en 29 tiene que sonar a palito aunque al soltarlo
       quede en 30 y su `data-sonido` cambie. Y se TOCA un instante después,
       con lo del botón ya hecho: así "Silenciar todo" no suena al callar y sí
       al volver, y la barra de Efectos ya tiene el volumen nuevo. */
    const alClic = (e: MouseEvent) => {
      const efecto = efectoDelToque(e.target, window.location.pathname);
      if (efecto) window.setTimeout(() => tocarEfecto(efecto), 0);
    };
    window.addEventListener("click", alClic, { capture: true });

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
      window.removeEventListener("click", alClic, { capture: true });
      quitarAnuncios();
      soltarApp?.();
    };
  }, []);

  return null;
}
