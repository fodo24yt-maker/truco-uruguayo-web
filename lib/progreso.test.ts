/**
 * El progreso sale del navegador del jugador, así que cualquiera puede
 * editarlo a mano. Estas pruebas verifican que nada de lo que venga de ahí
 * pueda romper la aplicación.
 */
import test from "node:test";
import assert from "node:assert/strict";

// localStorage de mentira, para poder probar sin navegador
const almacen = new Map<string, string>();
(globalThis as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => almacen.set(k, v),
    removeItem: (k: string) => almacen.delete(k),
  },
};

const { leerProgreso, guardarProgreso, anotarPartida, borrarProgreso, PROGRESO_VACIO } =
  await import("./progreso.ts");

const CLAVE = "truco-uy:progreso";

test("sin nada guardado devuelve el progreso vacío", () => {
  almacen.clear();
  assert.deepEqual(leerProgreso(), PROGRESO_VACIO);
});

test("guarda y recupera lo que anotó", () => {
  almacen.clear();
  anotarPartida("bruno", true);
  anotarPartida("bruno", false);
  const p = leerProgreso();
  assert.deepEqual(p.rivales.bruno, { ganadas: 1, jugadas: 2 });
});

test("aguanta basura sin romperse", () => {
  for (const basura of [
    "no soy json",
    "null",
    "[]",
    '{"rivales": "hola"}',
    '{"rivales": {"bruno": "trampa"}}',
    '{"leccionesLeidas": "no es lista"}',
    '{"ayudas": "sí"}',
    "{}",
  ]) {
    almacen.clear();
    almacen.set(CLAVE, basura);
    const p = leerProgreso();
    assert.equal(p.version, 1, `se rompió con: ${basura}`);
    assert.equal(typeof p.ayudas, "boolean");
    assert.ok(Array.isArray(p.leccionesLeidas));
  }
});

test("descarta números imposibles y trampas", () => {
  almacen.clear();
  almacen.set(
    CLAVE,
    JSON.stringify({
      version: 1,
      rivales: {
        tramposo: { ganadas: 999, jugadas: 1 }, // ganó más de lo que jugó
        negativo: { ganadas: -5, jugadas: 10 },
        enorme: { ganadas: 1e12, jugadas: 1e12 },
        "id con espacios": { ganadas: 1, jugadas: 1 },
        "<script>": { ganadas: 1, jugadas: 1 },
        valido: { ganadas: 2, jugadas: 3 },
      },
      leccionesLeidas: ["la-flor", "<img src=x>", 42, "x".repeat(200)],
      ayudas: true,
      ultimoRival: "'; DROP TABLE --",
    }),
  );
  const p = leerProgreso();

  assert.deepEqual(Object.keys(p.rivales), ["valido"], "sólo debería quedar el válido");
  assert.deepEqual(p.leccionesLeidas, ["la-flor"], "sólo el slug bien formado");
  assert.equal(p.ultimoRival, null, "el id raro se descarta");
});

test("no se cae si el navegador prohíbe guardar", () => {
  const original = (globalThis as Record<string, unknown>).window;
  (globalThis as Record<string, unknown>).window = {
    localStorage: {
      getItem: () => { throw new Error("bloqueado"); },
      setItem: () => { throw new Error("bloqueado"); },
      removeItem: () => { throw new Error("bloqueado"); },
    },
  };

  assert.deepEqual(leerProgreso(), PROGRESO_VACIO);
  assert.doesNotThrow(() => guardarProgreso(PROGRESO_VACIO));
  assert.doesNotThrow(() => borrarProgreso());

  (globalThis as Record<string, unknown>).window = original;
});

test("una lista larguísima de lecciones se recorta", () => {
  almacen.clear();
  almacen.set(
    CLAVE,
    JSON.stringify({ leccionesLeidas: Array.from({ length: 5000 }, (_, i) => `x${i}`) }),
  );
  assert.ok(leerProgreso().leccionesLeidas.length <= 50);
});
