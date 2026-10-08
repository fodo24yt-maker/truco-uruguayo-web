"use client";

/**
 * Precarga las escenas de las mesas probables apenas se abre el menú de jugar,
 * en la web y en la app. No dibuja nada.
 *
 * En la app ya las precargó la pantalla de carga y esto no hace nada (cada
 * escena se decodifica una sola vez). En la web es lo único que hay: el
 * código de la mesa lo trae solo Next, porque el enlace está a la vista; las
 * imágenes no las trae nadie, y son lo que llegaba tarde. Son dos imágenes
 * por departamento (unos 60 KB), y sólo cuando estás por jugar.
 *
 * Va con un respiro: primero se termina de pintar el menú.
 *
 * ── Y LA LETRA MANUSCRITA (3/10/2026) ─────────────────────────────────────
 * La de la libreta, el marcador y el mapa (`--fuente-mano`, declarada en
 * `app/jugar/layout.tsx`). El navegador la pide recién cuando algo la usa, o
 * sea con la mesa ya a la vista: medido, al aparecer la escena todavía no
 * estaba, así que se veía otra letra y después se cambiaba, que es otro
 * redibujado justo después de entrar. Acá se pide antes. No baja nada nuevo:
 * es el mismo archivo que este layout ya precargaba.
 *
 * El nombre de la familia no se escribe a mano (Next le agrega un sufijo): se
 * lee de la variable, en un `<span>` escondido que la hereda.
 */

import { useEffect, useRef } from "react";

import { portero } from "@/lib/entrada";
import { leerProgreso } from "@/lib/progreso";

export function PrecargaEscenas() {
  const testigo = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    // La letra, ya: es un archivo chico y local, y si se toca rápido una de
    // las dos opciones tiene que llegar antes que la mesa.
    const familia = testigo.current
      ? getComputedStyle(testigo.current).getPropertyValue("--fuente-mano").trim()
      : "";
    if (familia && document.fonts) void document.fonts.load(`1em ${familia}`).catch(() => {});
    // Las imágenes, con el respiro.
    const id = setTimeout(() => {
      portero.refrescar();
      const conGira = !portero.leerCandados().gira;
      void import("@/lib/precarga").then((m) =>
        Promise.all(
          m.departamentosAPrecargar(leerProgreso(), conGira).map(m.precargarDepartamento),
        ),
      );
    }, 300);
    return () => clearTimeout(id);
  }, []);
  return <span ref={testigo} hidden />;
}
