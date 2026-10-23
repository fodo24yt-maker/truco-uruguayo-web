/**
 * El escudo, como texto SVG, para las herramientas que corren en Node:
 * `generar-icono.mjs` (lo hornea `sharp`) y `marca/ficha.mjs` (la ficha de
 * Play).
 *
 * El dibujo NO está acá: está en `lib/escudo.ts`, que es el mismo que dibuja
 * `components/Marca.tsx` en la portada y en la pantalla de carga. Acá sólo se
 * pasa ese árbol de piezas a texto. Ver el porqué en el encabezado de
 * `lib/escudo.ts`.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const { COLORES, escudo: piezas } = await import(path.join(AQUI, "..", "..", "lib", "escudo.ts"));

export const C = COLORES;

/** `strokeWidth` → `stroke-width`. `clipPath` como atributo → `clip-path`; como etiqueta queda igual. */
const atributo = (k) => k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

/* Los valores salen de `lib/escudo.ts` y son números, colores o caminos: se
   escapan igual, para que esto no dependa de que eso siga siendo cierto. */
const escapar = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Una pieza (y sus hijas) a texto SVG. */
export function aTexto(p) {
  const attrs = Object.entries(p.a).map(([k, v]) => ` ${atributo(k)}="${escapar(v)}"`).join("");
  const hijos = (p.hijos ?? []).map(aTexto).join("");
  return `<${p.el}${attrs}>${hijos}</${p.el}>`;
}

let usados = 0;

/**
 * El escudo como `<g>` en texto. Misma firma que antes del 18/10/2026, para
 * que no cambie nada del que lo usa: `escudo(k, { contorno, sombra, id })`.
 * Si no se da `id`, se numera solo.
 */
export function escudo(k = 1, { contorno = C.marino, sombra = true, id } = {}) {
  return aTexto(piezas(id ?? `escudo${++usados}`, { k, contorno, sombra }));
}

/**
 * La marca para ícono: el escudo adentro de una figurita blanca, apenas
 * girada, sobre un panel celeste. Es el ícono de la ficha de Play.
 *
 * Se dibuja en un cuadrado de `lado` unidades; `escala` es cuánto ocupa la
 * figurita (1 = el alto entero del cuadrado).
 */
export function figuritaConEscudo(lado, escala, { id = "fig" } = {}) {
  const alto = lado * escala;
  const ancho = alto * (372 / 420);
  const x = (lado - ancho) / 2;
  const y = (lado - alto) / 2;
  const borde = alto * 0.04;
  const radio = alto * 0.08;
  const k = (alto * 0.6) / 470;
  return `<defs>
      <radialGradient id="${id}-panel" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#9fd0f5"/><stop offset="1" stop-color="${C.celesteHondo}"/></radialGradient>
    </defs>
    <g transform="rotate(-5 ${lado / 2} ${lado / 2})">
      <rect x="${x + alto * 0.012}" y="${y + alto * 0.03}" width="${ancho}" height="${alto}" rx="${radio}" fill="${C.marino}" opacity=".35"/>
      <rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="${radio}" fill="${C.blanco}"/>
      <rect x="${x + borde}" y="${y + borde}" width="${ancho - borde * 2}" height="${alto - borde * 2}" rx="${radio * 0.6}" fill="url(#${id}-panel)"/>
      <g transform="translate(${lado / 2 - 200 * k} ${lado / 2 - 235 * k})">${escudo(k, { sombra: false, id: `${id}-escudo` })}</g>
    </g>`;
}
