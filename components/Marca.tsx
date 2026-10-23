/**
 * La marca: el escudo.
 *
 * ── POR QUÉ ES ÉSTE ───────────────────────────────────────────────────────
 *
 * Desde el 18/10/2026 el logo del proyecto es el escudo celeste: la bandera
 * adentro de un escudo de club, con una carta de oro adelante. Se eligió entre
 * veintiséis propuestas (ver `Historial.md`). Antes, acá había dos cartas con
 * el halo dorado, que era el motivo del ícono de Android de entonces.
 *
 * La regla de siempre sigue: la marca de adentro y la del cajón de
 * aplicaciones son LA MISMA. Por eso este archivo no dibuja nada: el dibujo
 * está en `lib/escudo.ts`, y de ahí lo toman también el ícono de Android
 * (`herramientas/generar-icono.mjs`) y la ficha de Play. Acá sólo se pasa ese
 * árbol de piezas a elementos de React.
 *
 * ── LO QUE NO SE PUEDE HACER ACÁ ──────────────────────────────────────────
 *
 * Ni un `filter`, ni un `feGaussianBlur`: la portada es `.pantalla-fija`, una
 * de las tres pantallas en las que este proyecto midió manchitas. El escudo no
 * lleva ninguno, y `lib/escudo.test.ts` lo verifica.
 */

import { createElement, type ReactNode } from "react";

import { escudo, VIEWBOX, type Pieza } from "@/lib/escudo";

/** Una pieza de `lib/escudo.ts`, con sus hijas, como elemento de React. */
function dibujar(p: Pieza, clave: number): ReactNode {
  return createElement(p.el, { key: clave, ...p.a }, p.hijos?.map(dibujar));
}

/**
 * La marca entera, para poner arriba del nombre.
 *
 * `alto` va en unidades CSS (lo normal es un `clamp` contra el alto de la
 * ventana). El SVG mantiene la proporción solo.
 *
 * La clase `marca` NO ES DECORACIÓN: es el gancho del que cuelga la regla de
 * `app/globals.css` que parte el rasterizado en esta pantalla, igual que la
 * clase `carta` de `components/Carta.tsx`. Ver el comentario de la regla.
 *
 * `idRecorte` existe porque la marca puede estar DOS veces en la página: la
 * pantalla de carga de la app la dibuja encima de la portada, que tiene la
 * suya. Dos `<clipPath>` con el mismo `id` es HTML inválido, y el `url(#…)` de
 * una terminaría apuntando al de la otra.
 */
export function Marca({
  alto,
  className = "",
  idRecorte = "escudo-marca",
}: {
  alto: string;
  className?: string;
  idRecorte?: string;
}) {
  return (
    <svg
      viewBox={VIEWBOX}
      style={{ height: alto, width: "auto" }}
      className={`marca ${className}`}
      role="img"
      aria-label="Truco Uruguayo"
    >
      {dibujar(escudo(idRecorte), 0)}
    </svg>
  );
}
