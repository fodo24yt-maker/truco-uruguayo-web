import test from "node:test";
import assert from "node:assert/strict";

import { DEPARTAMENTOS } from "./mapa-uruguay.ts";
import { PERSONALIDADES } from "./motor/personalidades.ts";

test("el mapa tiene los 19 departamentos, sin repetir", () => {
  assert.equal(DEPARTAMENTOS.length, 19);
  assert.equal(new Set(DEPARTAMENTOS.map((d) => d.nombre)).size, 19);
});

test("cada departamento del mapa tiene su rival, y al revés", () => {
  const enMapa = new Set(DEPARTAMENTOS.map((d) => d.nombre));
  const conRival = new Set(PERSONALIDADES.map((p) => p.departamento));

  for (const d of enMapa) {
    assert.ok(conRival.has(d), `${d} está en el mapa pero no tiene rival`);
  }
  for (const d of conRival) {
    assert.ok(enMapa.has(d), `${d} tiene rival pero no está en el mapa`);
  }
});

test("las formas son válidas y las etiquetas caen dentro del lienzo", () => {
  for (const d of DEPARTAMENTOS) {
    assert.match(d.forma, /^M [\d\s.LZ]+Z$/, `${d.nombre}: forma mal armada`);
    const [x, y] = d.centro;
    assert.ok(x > 0 && x < 1000 && y > 0 && y < 1000, `${d.nombre}: etiqueta fuera del mapa`);
  }
});
