/**
 * El guion del tutorial contra las fotos: cada zona que un paso marca tiene que
 * existir en la foto que ese paso muestra, en el celular Y en la compu. Si
 * `generar-tutorial.mjs` deja de encontrar algo en la mesa (o un paso pide una
 * zona que nunca se midió), el aro no tendría dónde ir.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { FOTOS_TUTORIAL } from "./tutorial-fotos.ts";
import { PASOS_TUTORIAL } from "./tutorial-pasos.ts";

test("cada zona de cada paso existe en su foto, en los dos tamaños", () => {
  for (const [i, paso] of PASOS_TUTORIAL.entries()) {
    for (const tam of ["celular", "pc"] as const) {
      const foto = FOTOS_TUTORIAL[tam][paso.foto];
      for (const zona of paso.zonas) {
        const z = foto.zonas[zona];
        assert.ok(z, `paso ${i + 1} (${paso.titulo}): no hay "${zona}" en ${tam}-${paso.foto}`);
        assert.ok(z.w > 0 && z.h > 0, `paso ${i + 1}: "${zona}" vacía en ${tam}`);
        assert.ok(z.x >= 0 && z.y >= 0 && z.x + z.w <= foto.ancho && z.y + z.h <= foto.alto, `paso ${i + 1}: "${zona}" se sale de la foto en ${tam}`);
      }
    }
  }
});

test("el primero muestra la mesa entera, y todos tienen qué decir", () => {
  assert.equal(PASOS_TUTORIAL[0].zonas.length, 0);
  for (const paso of PASOS_TUTORIAL) {
    assert.ok(paso.titulo.trim().length > 0);
    /* La tarjeta tiene que entrar en el pedazo de mesa libre de un celular
       bajo: más de esto ya no es un paso, es una lección. */
    assert.ok(paso.texto.length <= 190, `"${paso.titulo}" tiene ${paso.texto.length} letras`);
  }
});

test("las fotos son de la carpeta del tutorial y de nuestro propio sitio", () => {
  for (const tam of ["celular", "pc"] as const) {
    for (const m of ["a", "b"] as const) {
      assert.match(FOTOS_TUTORIAL[tam][m].src, /^\/tutorial\/[a-z-]+\.webp$/);
    }
  }
});
