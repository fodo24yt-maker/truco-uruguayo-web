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

/* ══ EL MARCADOR DE LA MEJOR VICTORIA ══════════════════════════════════════
   Lo que se guarda por rival cuando le ganás, para que el trofeo diga "30 a 4"
   y no sólo "ganado". Es un dato que sale del navegador como todo lo demás, así
   que se valida igual, pero con una regla propia: **un marcador roto no puede
   costar una victoria**. Es lo contrario de lo que hace `ganadas`/`jugadas`,
   donde ante la duda se tira la entrada entera. */

test("guarda el marcador de la victoria", () => {
  almacen.clear();
  anotarPartida("luki", true, { vos: 30, rival: 4 });
  assert.deepEqual(leerProgreso().rivales.luki.mejor, { vos: 30, rival: 4 });
});

test("se queda con la mejor y no la pisa con una peor", () => {
  almacen.clear();
  anotarPartida("luki", true, { vos: 30, rival: 2 });
  anotarPartida("luki", true, { vos: 30, rival: 28 });
  assert.deepEqual(
    leerProgreso().rivales.luki.mejor,
    { vos: 30, rival: 2 },
    "una victoria más ajustada no borra la mejor",
  );

  anotarPartida("luki", true, { vos: 30, rival: 0 });
  assert.deepEqual(leerProgreso().rivales.luki.mejor, { vos: 30, rival: 0 });
});

test("perder no deja marcador, ni siquiera si viene uno", () => {
  almacen.clear();
  anotarPartida("luki", false, { vos: 12, rival: 30 });
  assert.equal(leerProgreso().rivales.luki.mejor, undefined);
  // …y perder después de haber ganado no borra el trofeo que ya tenías
  anotarPartida("luki", true, { vos: 30, rival: 9 });
  anotarPartida("luki", false, { vos: 5, rival: 30 });
  assert.deepEqual(leerProgreso().rivales.luki.mejor, { vos: 30, rival: 9 });
});

test("acepta ganar con más de 30, que pasa de verdad", () => {
  // `sumar()` suma y después compara: estando 29 le ganás un vale cuatro y
  // quedás en 33. Con el techo en 30 esto se descartaría.
  almacen.clear();
  anotarPartida("el-melo", true, { vos: 33, rival: 29 });
  assert.deepEqual(leerProgreso().rivales["el-melo"].mejor, { vos: 33, rival: 29 });
});

test("un marcador inventado se descarta SOLO a él, no la victoria", () => {
  for (const mentira of [
    { vos: 30, rival: 40 },        // perdiste: no es un trofeo
    { vos: 30, rival: 30 },        // empate: no existe
    { vos: 999, rival: 0 },        // fuera del techo
    { vos: 30.5, rival: 1 },       // no es entero
    { vos: "30", rival: 1 },       // no es número
    { vos: -1, rival: -9 },        // negativos
    "no soy un marcador",
    null,
  ]) {
    almacen.clear();
    almacen.set(
      CLAVE,
      JSON.stringify({ version: 1, rivales: { luki: { ganadas: 3, jugadas: 5, mejor: mentira } } }),
    );
    const luki = leerProgreso().rivales.luki;
    assert.deepEqual(
      { ganadas: luki?.ganadas, jugadas: luki?.jugadas },
      { ganadas: 3, jugadas: 5 },
      `con mejor=${JSON.stringify(mentira)} se perdieron las victorias`,
    );
    assert.equal(luki.mejor, undefined, `entró un marcador inválido: ${JSON.stringify(mentira)}`);
  }
});

test("sin victorias no puede haber marcador", () => {
  almacen.clear();
  almacen.set(
    CLAVE,
    JSON.stringify({ rivales: { luki: { ganadas: 0, jugadas: 7, mejor: { vos: 30, rival: 1 } } } }),
  );
  assert.equal(leerProgreso().rivales.luki.mejor, undefined);
});

test("un id con truco de prototipo no se lleva nada por delante", () => {
  almacen.clear();
  // `__proto__` no pasa la regex de ids, así que ni siquiera entra al saneo;
  // y `anotarPartida` con ese id no puede leer el prototipo de Object.
  const p = anotarPartida("__proto__", true, { vos: 30, rival: 1 });
  assert.equal(typeof p.rivales.__proto__, "object");
  assert.equal(({} as Record<string, unknown>).ganadas, undefined, "se ensució Object.prototype");
  assert.equal(leerProgreso().rivales.__proto__?.ganadas, undefined, "el id raro no se guarda");
});
