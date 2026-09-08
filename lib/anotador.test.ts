import assert from "node:assert/strict";
import test from "node:test";

import {
  CUENTA_VACIA,
  GRUPOS_POR_MITAD,
  LADOS,
  META,
  MITAD,
  POR_GRUPO,
  _sanear,
  buenasDe,
  comoSeDice,
  ganador,
  malasDe,
  palitosDelGrupo,
  sumar,
} from "./anotador.ts";

test("los números de la tablita cierran entre sí", () => {
  // Si alguien cambia META a 40 y se olvida del resto, esto avisa antes de que
  // la pantalla dibuje media mitad.
  assert.equal(MITAD * 2, META);
  assert.equal(GRUPOS_POR_MITAD * POR_GRUPO, MITAD);
  assert.ok(Number.isInteger(GRUPOS_POR_MITAD), "los grupos por mitad tienen que ser enteros");
});

test("sumar no baja de cero ni pasa de treinta", () => {
  assert.deepEqual(sumar(CUENTA_VACIA, "nosotros", 1), { nosotros: 1, ellos: 0 });
  assert.deepEqual(sumar(CUENTA_VACIA, "ellos", 1), { nosotros: 0, ellos: 1 });
  // el `−` de más, apretado en cero
  assert.deepEqual(sumar(CUENTA_VACIA, "nosotros", -1), { nosotros: 0, ellos: 0 });
  // el `+` de más, con la partida terminada
  assert.deepEqual(sumar({ nosotros: 30, ellos: 4 }, "nosotros", 1), { nosotros: 30, ellos: 4 });
  // y de 29 no se salta a 31
  assert.deepEqual(sumar({ nosotros: 29, ellos: 0 }, "nosotros", 5), { nosotros: 30, ellos: 0 });
});

test("sumar no le toca los puntos al otro lado", () => {
  const antes = { nosotros: 7, ellos: 12 };
  assert.equal(sumar(antes, "nosotros", 1).ellos, 12);
  assert.equal(sumar(antes, "ellos", -3).nosotros, 7);
  // y no muta el original: la pantalla guarda estado con esto
  assert.deepEqual(antes, { nosotros: 7, ellos: 12 });
});

test("los puntos caen en la mitad que les toca", () => {
  assert.equal(malasDe(0), 0);
  assert.equal(buenasDe(0), 0);

  // 15 justos siguen siendo TODAS malas: las buenas empiezan en el dieciséis
  assert.equal(malasDe(15), 15);
  assert.equal(buenasDe(15), 0);

  assert.equal(malasDe(16), 15);
  assert.equal(buenasDe(16), 1);

  assert.equal(malasDe(30), 15);
  assert.equal(buenasDe(30), 15);
});

test("las dos mitades siempre suman el total", () => {
  for (let p = 0; p <= META; p++) {
    assert.equal(malasDe(p) + buenasDe(p), p, `con ${p} puntos las mitades no cierran`);
  }
});

test("los grupos se llenan de a uno y en orden", () => {
  // sin puntos, ningún palito
  assert.equal(palitosDelGrupo(0, 0), 0);

  // el primer grupo se llena antes de que el segundo empiece
  assert.equal(palitosDelGrupo(3, 0), 3);
  assert.equal(palitosDelGrupo(3, 1), 0);

  assert.equal(palitosDelGrupo(5, 0), 5);
  assert.equal(palitosDelGrupo(5, 1), 0);

  assert.equal(palitosDelGrupo(7, 0), 5);
  assert.equal(palitosDelGrupo(7, 1), 2);
  assert.equal(palitosDelGrupo(7, 2), 0);

  // una mitad completa: los tres cerrados
  assert.equal(palitosDelGrupo(15, 2), 5);
});

test("los palitos dibujados son exactamente los puntos de la mitad", () => {
  // Es la prueba que de verdad importa: que no se dibuje ni un palito de más ni
  // de menos. Sin esto, un error de un punto en el reparto de grupos no lo ve
  // nadie hasta que Santiago cuenta cuadraditos en el celular.
  for (let p = 0; p <= MITAD; p++) {
    let dibujados = 0;
    for (let g = 0; g < GRUPOS_POR_MITAD; g++) dibujados += palitosDelGrupo(p, g);
    assert.equal(dibujados, p, `con ${p} puntos se dibujan ${dibujados} palitos`);
  }
});

test("nunca se dibuja un grupo con más de cinco palitos", () => {
  for (let p = 0; p <= META; p++) {
    for (let g = 0; g < GRUPOS_POR_MITAD; g++) {
      const n = palitosDelGrupo(p, g);
      assert.ok(n >= 0 && n <= POR_GRUPO, `grupo ${g} con ${p} puntos dio ${n}`);
    }
  }
});

test("el renglón de abajo del nombre se lee como se habla", () => {
  assert.equal(comoSeDice(0), "0 malas");
  assert.equal(comoSeDice(1), "1 mala");
  assert.equal(comoSeDice(7), "7 malas");
  assert.equal(comoSeDice(15), "15 malas");
  // pasando de 15 se cuenta desde cero otra vez, y en buenas
  assert.equal(comoSeDice(16), "1 buena");
  assert.equal(comoSeDice(19), "4 buenas");
  assert.equal(comoSeDice(30), "15 buenas");
});

test("gana el que llega a treinta", () => {
  assert.equal(ganador(CUENTA_VACIA), null);
  assert.equal(ganador({ nosotros: 29, ellos: 29 }), null);
  assert.equal(ganador({ nosotros: 30, ellos: 12 }), "nosotros");
  assert.equal(ganador({ nosotros: 3, ellos: 30 }), "ellos");
});

/* ══ Lo que sale de localStorage es de afuera ══════════════════════════════
   Cualquiera puede escribir esa clave a mano desde la consola. Estas pruebas
   son las que aseguran que eso no pueda dejar la pantalla en un estado que no
   sabe dibujar: un NaN, un negativo o un 9e99 pintarían cualquier cosa. */

test("una cuenta guardada normal vuelve tal cual", () => {
  assert.deepEqual(_sanear({ nosotros: 12, ellos: 7 }), { nosotros: 12, ellos: 7 });
});

test("basura en el localStorage no rompe nada", () => {
  for (const basura of [null, undefined, 42, "hola", [], true]) {
    assert.deepEqual(_sanear(basura), CUENTA_VACIA, `con ${JSON.stringify(basura)}`);
  }
});

test("números imposibles se recortan al rango dibujable", () => {
  assert.deepEqual(_sanear({ nosotros: -5, ellos: 999 }), { nosotros: 0, ellos: META });
  assert.deepEqual(_sanear({ nosotros: 1e99, ellos: -1e99 }), { nosotros: META, ellos: 0 });
  // lo que no es un entero no es una cuenta: cero
  assert.deepEqual(_sanear({ nosotros: 1.5, ellos: NaN }), CUENTA_VACIA);
  assert.deepEqual(_sanear({ nosotros: "12", ellos: null }), CUENTA_VACIA);
});

test("una clave rara guardada al lado no se cuela", () => {
  // El objeto de vuelta tiene EXACTAMENTE los dos campos que la pantalla sabe
  // dibujar, y nada más de lo que hubiera guardado.
  const saneado = _sanear({ nosotros: 3, ellos: 4, __proto__: { malicia: 1 }, extra: "x" });
  assert.deepEqual(Object.keys(saneado).sort(), ["ellos", "nosotros"]);
  assert.equal((saneado as unknown as Record<string, unknown>).extra, undefined);
});

test("todo lo que sale de sanear se puede dibujar", () => {
  // El contrato entre este archivo y la pantalla: cualquier cosa que entre sale
  // como dos enteros de 0 a 30. La pantalla no vuelve a chequear nada.
  const entradas = [{ nosotros: -1, ellos: 31 }, "x", { nosotros: 3.3 }, { ellos: 1e9 }];
  for (const entrada of entradas) {
    const c = _sanear(entrada);
    for (const lado of LADOS) {
      assert.ok(
        Number.isInteger(c[lado]) && c[lado] >= 0 && c[lado] <= META,
        `${JSON.stringify(entrada)} dejó ${lado} en ${c[lado]}`,
      );
    }
  }
});
