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
 */

import { useEffect } from "react";

import { portero } from "@/lib/entrada";
import { leerProgreso } from "@/lib/progreso";

export function PrecargaEscenas() {
  useEffect(() => {
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
  return null;
}
