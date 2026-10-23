/**
 * Lo que se puede probar del sonido sin un navegador: el orden de los temas,
 * la curva del cruce, y que el índice de la música apunte a archivos de verdad.
 * Lo que suena de verdad se mira con Playwright (está en el Historial).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CRUCE, ENTRADA, barajar, curvaCruce } from "./audio.ts";
import { TEMAS } from "./musica.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** mulberry32, para que los tests den siempre lo mismo. */
function azarCon(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("barajar: siempre son todos los temas, una vez cada uno", () => {
  for (let s = 0; s < 200; s++) {
    const orden = barajar(7, null, azarCon(s));
    assert.deepEqual([...orden].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
  }
});

test("barajar: la vuelta nueva no empieza por el que acaba de sonar", () => {
  for (let s = 0; s < 500; s++) {
    for (let ultimo = 0; ultimo < 7; ultimo++) {
      assert.notEqual(barajar(7, ultimo, azarCon(s * 7 + ultimo))[0], ultimo, `semilla ${s}: repitió el ${ultimo}`);
    }
  }
});

test("barajar: con un solo tema no hay a quién cambiar, y no se rompe", () => {
  assert.deepEqual(barajar(1, 0), [0]);
  assert.deepEqual(barajar(0, null), []);
});

test("el cruce es de igual potencia: a mitad de camino no hay pozo", () => {
  const sube = curvaCruce(true);
  const baja = curvaCruce(false);
  assert.equal(sube[0], 0);
  assert.ok(Math.abs(sube.at(-1)! - 1) < 1e-6);
  assert.equal(baja[0], 1);
  assert.ok(Math.abs(baja.at(-1)!) < 1e-6);
  for (let i = 0; i < sube.length; i++) {
    // seno² + coseno² = 1: la potencia de los dos juntos es la de uno solo
    assert.ok(Math.abs(sube[i] ** 2 + baja[i] ** 2 - 1) < 1e-6, `en el punto ${i} la potencia no es 1`);
  }
});

test("lib/musica.ts: cada tema es un .m4a de public/audio/musica que existe", () => {
  assert.ok(TEMAS.length > 0, "no hay música");
  for (const t of TEMAS) {
    // Ruta escrita entera y sin nada raro: el reproductor no arma rutas.
    assert.match(t.archivo, /^\/audio\/musica\/[a-z0-9-]+\.m4a$/);
    const archivo = path.join(RAIZ, "public", t.archivo);
    assert.ok(existsSync(archivo), `falta ${t.archivo}`);
    assert.ok(statSync(archivo).size > 10_000, `${t.archivo} está casi vacío`);
  }
});

test("cada tema dura bastante más que dos cruces (si no, los cruces se pisan)", () => {
  for (const t of TEMAS) {
    assert.ok(t.segundos > 2 * CRUCE + ENTRADA, `${t.archivo} dura ${t.segundos} s`);
  }
});
