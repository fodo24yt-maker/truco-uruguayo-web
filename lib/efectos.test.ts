/**
 * Los efectos de la interfaz se arman por código (`lib/efectos.ts`): acá se
 * prueba que salgan sanos a las dos frecuencias de muestreo que hay en la
 * calle, que no chasqueen en las puntas, que no suenen más fuerte de lo
 * pactado y que los botones pidan efectos que existen.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { EFECTOS, LARGO, PICO, esEfecto, sintetizar } from "./efectos.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

/** 48 000 es casi todo Android; 44 100, casi toda PC. */
const FRECUENCIAS = [44100, 48000];

test("cada efecto sale sano: con su largo, sin NaN y sin pasarse de su pico", () => {
  for (const sr of FRECUENCIAS) {
    for (const e of EFECTOS) {
      const x = sintetizar(e, sr);
      assert.equal(x.length, Math.round(LARGO[e] * sr), `${e} a ${sr}`);
      let pico = 0;
      for (const v of x) {
        assert.ok(Number.isFinite(v), `${e} a ${sr} tiene un NaN`);
        pico = Math.max(pico, Math.abs(v));
      }
      assert.ok(Math.abs(pico - PICO[e]) < 1e-6, `${e} a ${sr}: pico ${pico}, pactado ${PICO[e]}`);
    }
  }
});

test("todos quedan bajos: ninguno pica arriba de -10 dBFS (las voces llegan a -3)", () => {
  for (const e of EFECTOS) assert.ok(PICO[e] <= 0.32, e);
});

test("arrancan y terminan en cero: un corte en medio de una onda es un chasquido", () => {
  for (const sr of FRECUENCIAS) {
    for (const e of EFECTOS) {
      const x = sintetizar(e, sr);
      assert.ok(Math.abs(x[0]) < 1e-3, `${e} arranca en ${x[0]}`);
      assert.ok(Math.abs(x[x.length - 1]) < 1e-3, `${e} termina en ${x[x.length - 1]}`);
    }
  }
});

test("son cortos: un clic que dura más que el toque se pisa con el siguiente", () => {
  for (const e of EFECTOS) assert.ok(LARGO[e] > 0.04 && LARGO[e] <= 0.5, `${e} dura ${LARGO[e]} s`);
  for (const e of ["toque", "volver", "palito"] as const) assert.ok(LARGO[e] <= 0.1, e);
});

test("siempre suenan igual: el ruido tiene semilla", () => {
  for (const e of EFECTOS) assert.deepEqual(sintetizar(e, 48000), sintetizar(e, 48000), e);
});

test("esEfecto sólo acepta los de la lista (lo que viene de un data-sonido es texto suelto)", () => {
  for (const e of EFECTOS) assert.ok(esEfecto(e));
  for (const x of ["", "no", "Toque", "toque ", "constructor", "__proto__", null, undefined, 3]) {
    assert.equal(esEfecto(x), false, String(x));
  }
});

test("cada data-sonido escrito en el código es un efecto, o \"no\"", () => {
  const archivos = (dir: string): string[] =>
    readdirSync(join(RAIZ, dir)).flatMap((n) => {
      const ruta = join(dir, n);
      if (statSync(join(RAIZ, ruta)).isDirectory()) return archivos(ruta);
      return /\.tsx$/.test(n) ? [ruta] : [];
    });
  let vistos = 0;
  for (const ruta of ["app", "components"].flatMap(archivos)) {
    const codigo = readFileSync(join(RAIZ, ruta), "utf8");
    // Los literales que aparecen en el atributo, también los de un `? :`.
    for (const m of codigo.matchAll(/data-sonido=(?:"([^"]*)"|\{([^}]*)\})/g)) {
      const literales = m[1] !== undefined ? [m[1]] : [...m[2].matchAll(/"([^"]*)"/g)].map((l) => l[1]);
      for (const l of literales) {
        vistos++;
        assert.ok(l === "no" || esEfecto(l), `${ruta}: data-sonido "${l}" no es ningún efecto`);
      }
    }
  }
  assert.ok(vistos >= 8, `se encontraron sólo ${vistos}: ¿cambió la forma de escribirlo?`);
});
