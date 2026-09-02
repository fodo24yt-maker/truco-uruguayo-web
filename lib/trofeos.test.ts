/**
 * La vitrina de trofeos.
 *
 * Lo que esto tiene que atajar son tres cosas, y ninguna es de dibujo:
 *
 *   · que se muestre como ganado algo que no se ganó, o al revés;
 *   · que un rival quede sin objeto y el trofeo salga vacío;
 *   · que el marcador aparezca donde no corresponde. Es un dato del progreso y,
 *     como todo lo que sale del navegador, puede venir mentido.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { PERSONALIDADES } from "./motor/personalidades.ts";
import { PROPORCION } from "./objetos.ts";
import { type Trofeo, cuantosGanados, trofeosDe } from "./trofeos.ts";

/** El trofeo de ese rival, o revienta. Que falte uno ya sería la falla. */
function elDe(trofeos: Trofeo[], id: string): Trofeo {
  const t = trofeos.find((x) => x.id === id);
  assert.ok(t, `no está el trofeo de ${id}`);
  return t;
}

test("están los diecinueve, en el orden de la gira", () => {
  const t = trofeosDe({});
  assert.equal(t.length, PERSONALIDADES.length);
  assert.equal(t.length, 19);
  assert.deepEqual(
    t.map((x) => x.paso),
    Array.from({ length: 19 }, (_, i) => i + 1),
    "el orden tiene que ser el del recorrido, de Montevideo al norte",
  );
});

test("los diecinueve tienen objeto, y es uno que se sabe dibujar", () => {
  for (const t of trofeosDe({})) {
    const objeto = t.objeto;
    assert.ok(objeto, `${t.nombre} (${t.departamento}) se quedó sin objeto`);
    assert.ok(
      Object.hasOwn(PROPORCION, objeto),
      `el objeto "${objeto}" de ${t.departamento} no tiene forma declarada`,
    );
  }
});

test("sin haber jugado nada, no hay ninguno ganado", () => {
  const t = trofeosDe({});
  assert.equal(cuantosGanados(t), 0);
  assert.ok(t.every((x) => !x.ganado && x.mejor === undefined));
});

test("se gana con una victoria, y jugar sin ganar no alcanza", () => {
  const t = trofeosDe({
    luki: { ganadas: 1, jugadas: 1 },
    "la-coca": { ganadas: 0, jugadas: 9 },
  });
  assert.equal(elDe(t, "luki").ganado, true);
  assert.equal(elDe(t, "la-coca").ganado, false, "nueve derrotas no son un trofeo");
  assert.equal(cuantosGanados(t), 1);
});

test("el marcador acompaña al trofeo cuando está", () => {
  const t = trofeosDe({ luki: { ganadas: 2, jugadas: 3, mejor: { vos: 30, rival: 4 } } });
  assert.deepEqual(elDe(t, "luki").mejor, { vos: 30, rival: 4 });
});

test("un progreso viejo tiene el trofeo pero no el número", () => {
  // Los guardados de antes de que existiera el marcador: la victoria está y
  // `mejor` no. El trofeo se muestra igual.
  const luki = elDe(trofeosDe({ luki: { ganadas: 5, jugadas: 8 } }), "luki");
  assert.equal(luki.ganado, true);
  assert.equal(luki.mejor, undefined);
});

test("un marcador sin victoria no se cuela", () => {
  const luki = elDe(
    trofeosDe({ luki: { ganadas: 0, jugadas: 4, mejor: { vos: 30, rival: 0 } } }),
    "luki",
  );
  assert.equal(luki.ganado, false);
  assert.equal(luki.mejor, undefined, "sin ganar no hay marcador que mostrar");
});

test("una clave de prototipo no regala trofeos", () => {
  // `{}` hereda `constructor`, `toString`… Si esto indexara sin cuidado, un
  // rival cuyo id fuera uno de ésos saldría 'ganado' sin haber jugado.
  const t = trofeosDe(Object.create({ luki: { ganadas: 99, jugadas: 99 } }));
  assert.equal(cuantosGanados(t), 0, "se leyó la cadena de prototipos");
});

test("ids repetidos: cada trofeo es de un rival distinto", () => {
  const ids = trofeosDe({}).map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

/*
 * Ésta parece de más y no lo es. Sin ella, todas las anteriores pasarían igual
 * si `trofeosDe` devolviera SIEMPRE los diecinueve sin ganar: el orden estaría
 * bien, los objetos estarían, y "sin jugar no hay ninguno" sería trivialmente
 * cierto. Lo que se comprueba acá es que de verdad lee lo que le pasan.
 */
test("y sin embargo cuenta de verdad: los diecinueve ganados dan diecinueve", () => {
  const todas = Object.fromEntries(
    PERSONALIDADES.map((p) => [p.id, { ganadas: 1, jugadas: 1, mejor: { vos: 30, rival: 7 } }]),
  );
  const t = trofeosDe(todas);
  assert.equal(cuantosGanados(t), 19);
  assert.ok(t.every((x) => x.mejor?.rival === 7));
});
