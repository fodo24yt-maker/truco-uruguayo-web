/**
 * Que cada rival de la gira tenga su historia, y que entre en la ficha.
 * Correr con: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";

import { HISTORIAS, historiaDe } from "./historias.ts";
import { PERSONALIDADES } from "./motor/personalidades.ts";

test("los diecinueve tienen historia", () => {
  for (const p of PERSONALIDADES) {
    const h = historiaDe(p.id);
    assert.ok(h && h.trim().length > 0, `${p.nombre} (${p.id}) no tiene historia`);
  }
});

test("no hay historias huérfanas: cada clave es el id de un rival", () => {
  // Si alguien cambia un `id` —que no se debe, es la clave del progreso—, la
  // historia quedaría colgando de uno que ya no existe y el rival sin la suya.
  const ids = new Set(PERSONALIDADES.map((p) => p.id));
  for (const clave of Object.keys(HISTORIAS)) {
    assert.ok(ids.has(clave), `"${clave}" no es el id de ningún rival`);
  }
});

test("ninguna se pasa del largo que entra en la ficha", () => {
  // 300 está medido, no elegido: en un celular de 320×568, que es la pantalla
  // más chica que se mira, las de 274 a 299 letras ya llenan la ficha y lo que
  // queda afuera es el margen de abajo, no el texto. Una más larga empieza a
  // cortar el último renglón (ver `app/jugar/gira/page.tsx`).
  for (const [id, h] of Object.entries(HISTORIAS)) {
    assert.ok(h.length <= 300, `la de ${id} tiene ${h.length} letras; el tope es 300`);
  }
});

test("una historia no nombra el id ni deja código a la vista", () => {
  // Se escriben a mano en un archivo de código: que no se cuele un `id` entre
  // comillas invertidas, ni un espacio doble de una concatenación mal hecha.
  for (const [id, h] of Object.entries(HISTORIAS)) {
    assert.ok(!h.includes("`"), `la de ${id} tiene comillas de código`);
    assert.ok(!/ {2}/.test(h), `la de ${id} tiene un espacio doble`);
    assert.equal(h, h.trim(), `la de ${id} empieza o termina con espacio`);
  }
});

test("un id desconocido o heredado no devuelve nada", () => {
  // `Object.hasOwn`, como en progreso.ts: "constructor" no es un rival.
  assert.equal(historiaDe("no-existe"), null);
  assert.equal(historiaDe("constructor"), null);
  assert.equal(historiaDe("__proto__"), null);
});
