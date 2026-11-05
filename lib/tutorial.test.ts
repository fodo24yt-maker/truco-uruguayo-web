/**
 * Si ya viste el tutorial de la mesa sale de `localStorage`: cualquiera lo
 * puede editar a mano. Estas pruebas verifican que la basura no cuente como
 * visto, que lo visto quede, y que sin almacenamiento no salga en cada vuelta.
 */
import test from "node:test";
import assert from "node:assert/strict";

const almacen = new Map<string, string>();
let escrituraFalla = false;
let lecturaFalla = false;
(globalThis as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string) => {
      if (lecturaFalla) throw new Error("SecurityError");
      return almacen.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (escrituraFalla) throw new Error("QuotaExceededError");
      almacen.set(k, v);
    },
    removeItem: (k: string) => almacen.delete(k),
  },
};

const { yaVisto, marcarVisto, sanear, _olvidarMemoria } = await import("./tutorial.ts");

const CLAVE = "truco-uy:tutorial-mesa";

function limpio() {
  almacen.clear();
  escrituraFalla = false;
  lecturaFalla = false;
  _olvidarMemoria();
}

test("la primera vez no está visto", () => {
  limpio();
  assert.equal(yaVisto(), false);
});

test("marcado, queda visto y guardado", () => {
  limpio();
  assert.equal(marcarVisto(), true);
  _olvidarMemoria();
  assert.equal(yaVisto(), true);
  assert.deepEqual(JSON.parse(almacen.get(CLAVE)!), { version: 1, visto: true });
});

test("sólo un true de verdad cuenta como visto", () => {
  for (const crudo of ['"visto"', "true", "1", "null", "[]", '{"visto":"true"}', '{"visto":1}', '{"visto":{}}', "{}", "no es json"]) {
    limpio();
    almacen.set(CLAVE, crudo);
    assert.equal(yaVisto(), false, crudo);
  }
});

test("sanear nunca lanza y devuelve siempre la misma forma", () => {
  for (const crudo of [undefined, null, 0, "x", [], {}, { visto: true, extra: "<script>" }, Object.create(null)]) {
    const t = sanear(crudo);
    assert.deepEqual(Object.keys(t).sort(), ["version", "visto"]);
    assert.equal(typeof t.visto, "boolean");
  }
  assert.equal(sanear({ visto: true }).visto, true);
});

test("otra versión con visto:true también cuenta: lo único que importa es si ya salió", () => {
  limpio();
  almacen.set(CLAVE, '{"version":7,"visto":true}');
  assert.equal(yaVisto(), true);
});

test("sin poder escribir, queda visto en memoria por esta sesión", () => {
  limpio();
  escrituraFalla = true;
  assert.equal(marcarVisto(), false);
  assert.equal(yaVisto(), true);
  assert.equal(almacen.has(CLAVE), false);
});

test("sin poder leer, no revienta: cuenta como no visto", () => {
  limpio();
  lecturaFalla = true;
  assert.equal(yaVisto(), false);
});
