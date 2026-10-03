/**
 * Los desbloqueos y lo aprendido salen de `localStorage`: cualquiera los puede
 * editar a mano. Estas pruebas verifican que la basura no desbloquee nada, que
 * lo desbloqueado sea para siempre y que terminar Aprender abra la Gira.
 */
import test from "node:test";
import assert from "node:assert/strict";

const almacen = new Map<string, string>();
let escrituraFalla = false;
(globalThis as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (escrituraFalla) throw new Error("QuotaExceededError");
      almacen.set(k, v);
    },
    removeItem: (k: string) => almacen.delete(k),
  },
};

const { leerDesbloqueos, desbloquear, sanear, _olvidarMemoria } = await import("./desbloqueos.ts");
const aprendido = await import("./aprendido.ts");

const DES = "truco-uy:desbloqueos";
const APR = "truco-uy:aprendido";

function limpio() {
  almacen.clear();
  escrituraFalla = false;
  _olvidarMemoria();
}

test("arranca todo bloqueado", () => {
  limpio();
  const d = leerDesbloqueos();
  assert.equal(d.anotador, false);
  assert.equal(d.gira, false);
});

test("lo desbloqueado queda guardado (sobrevive a cerrar la app)", () => {
  limpio();
  assert.equal(desbloquear("anotador"), true);
  _olvidarMemoria(); // como si se cerrara la app
  assert.equal(leerDesbloqueos().anotador, true);
  assert.equal(leerDesbloqueos().gira, false);
});

test("la basura no desbloquea nada", () => {
  for (const basura of [
    "no soy json",
    "null",
    "[]",
    '"true"',
    '{"anotador":"true","gira":1}',
    '{"anotador":{},"gira":[true]}',
    '{"__proto__":{"anotador":true},"gira":"si"}',
    '{"constructor":{"prototype":{"gira":true}}}',
  ]) {
    limpio();
    almacen.set(DES, basura);
    const d = leerDesbloqueos();
    assert.equal(d.anotador, false, basura);
    assert.equal(d.gira, false, basura);
  }
  // Y el ataque no ensució el prototipo de nadie
  assert.equal(({} as Record<string, unknown>).anotador, undefined);
  assert.equal(({} as Record<string, unknown>).gira, undefined);
});

test("sanear construye un objeto nuevo, con sólo los dos campos", () => {
  const d = sanear(JSON.parse('{"anotador":true,"gira":false,"extra":"<script>"}'));
  assert.deepEqual(Object.keys(d).sort(), ["anotador", "gira", "version"]);
});

test("si no se puede guardar, queda desbloqueado igual por esta sesión", () => {
  limpio();
  escrituraFalla = true;
  assert.equal(desbloquear("gira"), false);
  assert.equal(leerDesbloqueos().gira, true);
});

test("desbloquear uno no toca el otro", () => {
  limpio();
  desbloquear("gira");
  desbloquear("anotador");
  _olvidarMemoria();
  const d = leerDesbloqueos();
  assert.equal(d.anotador && d.gira, true);
});

// ───────────────────────── Aprender ─────────────────────────

test("son doce ejercicios, sin repetir", () => {
  assert.equal(aprendido.EJERCICIOS.length, 12);
  assert.equal(new Set(aprendido.EJERCICIOS).size, 12);
});

test("acertar los doce desbloquea la Gira, una sola vez", () => {
  limpio();
  let abiertas = 0;
  aprendido.EJERCICIOS.forEach((id, i) => {
    const r = aprendido.anotarAcierto(id);
    assert.equal(r.acertados, i + 1);
    if (r.giraRecienAbierta) abiertas++;
    assert.equal(leerDesbloqueos().gira, i === 11, `después del ${id}`);
  });
  assert.equal(abiertas, 1);
  // Acertar de nuevo no avisa otra vez
  assert.equal(aprendido.anotarAcierto("la-baraja").giraRecienAbierta, false);
});

test("acertar dos veces el mismo no cuenta doble", () => {
  limpio();
  aprendido.anotarAcierto("la-flor");
  aprendido.anotarAcierto("la-flor");
  assert.equal(aprendido.cuantosAcertados(), 1);
});

test("la Gira abierta por Aprender queda abierta aunque se borre lo aprendido", () => {
  limpio();
  for (const id of aprendido.EJERCICIOS) aprendido.anotarAcierto(id);
  almacen.delete(APR);
  _olvidarMemoria();
  assert.equal(leerDesbloqueos().gira, true);
});

test("lo aprendido no acepta ids inventados ni repetidos", () => {
  limpio();
  almacen.set(
    APR,
    JSON.stringify({
      ejercicios: ["la-flor", "la-flor", "inventado", 3, null, "__proto__", ...Array(500).fill("x")],
    }),
  );
  assert.deepEqual(aprendido.leerAprendido().ejercicios, ["la-flor"]);
});

test("no se puede fabricar 'aprendí todo' con ids que no existen", () => {
  limpio();
  almacen.set(APR, JSON.stringify({ ejercicios: Array.from({ length: 12 }, (_, i) => `e${i}`) }));
  assert.equal(aprendido.aprendioTodo(), false);
});

test("anotarAcierto ignora un id que no está en la lista", () => {
  limpio();
  // @ts-expect-error: a propósito, un id que no existe
  const r = aprendido.anotarAcierto("no-existe");
  assert.equal(r.acertados, 0);
  assert.equal(almacen.has(APR), false);
});
