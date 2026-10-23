/**
 * El escudo lo dibujan tres lugares a partir de los mismos datos: la portada
 * (React), el ícono de Android (`sharp`) y la ficha de Play (Chromium). Estas
 * pruebas cuidan lo que los tres necesitan que siga siendo cierto.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { escudo, type Pieza } from "./escudo.ts";

/** Todas las piezas del árbol, aplanadas. */
const todas = (p: Pieza): Pieza[] => [p, ...(p.hijos ?? []).flatMap(todas)];

test("no lleva filtros ni letras: sharp no los dibuja igual y la portada es pantalla fija", () => {
  for (const p of todas(escudo("x"))) {
    assert.ok(["g", "defs", "clipPath", "path", "rect", "circle"].includes(p.el), `pieza ${p.el}`);
    for (const k of Object.keys(p.a)) {
      assert.ok(!/filter|font|text/i.test(k), `atributo ${k} en ${p.el}`);
    }
  }
});

test("los colores son hexadecimales, 'none' o el propio recorte: sharp no entiende variables de CSS", () => {
  for (const p of todas(escudo("recorte"))) {
    for (const k of ["fill", "stroke"] as const) {
      const v = p.a[k];
      if (v === undefined) continue;
      assert.match(String(v), /^(#[0-9a-f]{6}|none)$/i, `${k}=${v} en ${p.el}`);
    }
    if (p.a.clipPath !== undefined) assert.equal(p.a.clipPath, "url(#recorte)");
  }
});

test("cada escudo usa el id de recorte que se le da: dos en la misma página no se pisan", () => {
  const ids = (p: Pieza) => todas(p).filter((x) => x.el === "clipPath").map((x) => x.a.id);
  assert.deepEqual(ids(escudo("portada")), ["portada"]);
  assert.deepEqual(ids(escudo("carga")), ["carga"]);
});

test("la escala agranda todo: el contorno de k = 2 es el doble de grueso", () => {
  const contorno = (k: number) => todas(escudo("x", { k })).at(-1)!.a.strokeWidth;
  assert.equal(contorno(2), 2 * Number(contorno(1)));
});
