import assert from "node:assert/strict";
import test from "node:test";

import {
  CUENTA_VACIA,
  GRUPOS_POR_MITAD,
  LADOS,
  META,
  MITAD,
  POR_GRUPO,
  MAX_GRUPOS_POR_MITAD,
  _olvidarAviso,
  _sanear,
  _sanearMeta,
  avisoMetaVisto,
  buenasDe,
  comoSeDice,
  ganador,
  gruposPorMitad,
  guardarAnotador,
  leerAnotador,
  malasDe,
  marcarAvisoMeta,
  mitadDe,
  otraMeta,
  palitosDelGrupo,
  puedeCambiarA,
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

/* ══ A 40 (desde el 1/11/2026) ═════════════════════════════════════════════
   Todo lo de arriba es a 30, la meta de fábrica, y sigue valiendo tal cual.
   Lo de acá es la otra meta: 20 malas y 20 buenas, cuatro grupos por mitad. */

test("a 40 los números también cierran", () => {
  assert.equal(mitadDe(40), 20);
  assert.equal(gruposPorMitad(40), 4);
  assert.equal(gruposPorMitad(30), GRUPOS_POR_MITAD);
  assert.equal(MAX_GRUPOS_POR_MITAD, 4);
  assert.ok(Number.isInteger(gruposPorMitad(40)));
});

test("a 40 se frena en 40, no en 30", () => {
  assert.deepEqual(sumar({ nosotros: 30, ellos: 0 }, "nosotros", 1, 40), { nosotros: 31, ellos: 0 });
  assert.deepEqual(sumar({ nosotros: 39, ellos: 0 }, "nosotros", 5, 40), { nosotros: 40, ellos: 0 });
  assert.deepEqual(sumar(CUENTA_VACIA, "ellos", -1, 40), CUENTA_VACIA);
});

test("a 40 las buenas empiezan en el veintiuno", () => {
  assert.equal(comoSeDice(15, 40), "15 malas");
  assert.equal(comoSeDice(20, 40), "20 malas");
  assert.equal(comoSeDice(21, 40), "1 buena");
  assert.equal(comoSeDice(40, 40), "20 buenas");
  assert.equal(malasDe(25, 40), 20);
  assert.equal(buenasDe(25, 40), 5);
  for (let p = 0; p <= 40; p++) assert.equal(malasDe(p, 40) + buenasDe(p, 40), p);
});

test("a 40 los palitos dibujados son los puntos de la mitad", () => {
  for (let p = 0; p <= mitadDe(40); p++) {
    let dibujados = 0;
    for (let g = 0; g < gruposPorMitad(40); g++) dibujados += palitosDelGrupo(p, g);
    assert.equal(dibujados, p, `a 40, con ${p} puntos se dibujan ${dibujados} palitos`);
  }
});

test("a 40 no gana el que llega a 30", () => {
  assert.equal(ganador({ nosotros: 30, ellos: 12 }, 40), null);
  assert.equal(ganador({ nosotros: 39, ellos: 39 }, 40), null);
  assert.equal(ganador({ nosotros: 40, ellos: 12 }, 40), "nosotros");
});

test("el número va y viene, y no deja perder puntos", () => {
  assert.equal(otraMeta(30), 40);
  assert.equal(otraMeta(40), 30);
  // de 30 a 40 siempre se puede
  assert.equal(puedeCambiarA({ nosotros: 30, ellos: 30 }, 40), true);
  // de 40 a 30, sólo si nadie pasó de 30
  assert.equal(puedeCambiarA({ nosotros: 30, ellos: 4 }, 30), true);
  assert.equal(puedeCambiarA({ nosotros: 31, ellos: 4 }, 30), false);
  assert.equal(puedeCambiarA({ nosotros: 2, ellos: 38 }, 30), false);
});

test("la meta guardada: sólo un 40 de verdad es 40", () => {
  assert.equal(_sanearMeta({ meta: 40 }), 40);
  for (const basura of [{ meta: 30 }, { meta: "40" }, { meta: 35 }, { meta: 40.5 }, {}, null, "40", 40, []]) {
    assert.equal(_sanearMeta(basura), 30, `con ${JSON.stringify(basura)}`);
  }
});

test("jugando a 40 se conservan los puntos de más de 30", () => {
  assert.deepEqual(_sanear({ nosotros: 35, ellos: 2, meta: 40 }), { nosotros: 35, ellos: 2 });
  assert.deepEqual(_sanear({ nosotros: 99, ellos: 2, meta: 40 }), { nosotros: 40, ellos: 2 });
  // lo guardado antes de que existiera la meta se lee a 30, como siempre
  assert.deepEqual(_sanear({ nosotros: 35, ellos: 2 }), { nosotros: 30, ellos: 2 });
  // y una meta trucha no abre el tope
  assert.deepEqual(_sanear({ nosotros: 35, ellos: 2, meta: "40" }), { nosotros: 30, ellos: 2 });
  assert.deepEqual(Object.keys(_sanear({ nosotros: 3, ellos: 4, meta: 40 })).sort(), ["ellos", "nosotros"]);
});

/* ══ Lo guardado, de ida y vuelta, con un localStorage de mentira ══════════ */

const almacen = new Map<string, string>();
let escrituraFalla = false;
const conAlmacen = () => {
  almacen.clear();
  escrituraFalla = false;
  _olvidarAviso();
  (globalThis as Record<string, unknown>).window = {
    localStorage: {
      getItem: (k: string) => almacen.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (escrituraFalla) throw new Error("QuotaExceededError");
        almacen.set(k, v);
      },
    },
  };
};

test("la cuenta y la meta vuelven como se guardaron", () => {
  conAlmacen();
  assert.deepEqual(leerAnotador(), { cuenta: CUENTA_VACIA, meta: 30 });
  guardarAnotador({ nosotros: 33, ellos: 8 }, 40);
  assert.deepEqual(leerAnotador(), { cuenta: { nosotros: 33, ellos: 8 }, meta: 40 });
  almacen.set("truco-uy:anotador", "{no es json");
  assert.deepEqual(leerAnotador(), { cuenta: CUENTA_VACIA, meta: 30 });
});

test("el cartelito: sólo un true de verdad cuenta como visto", () => {
  conAlmacen();
  assert.equal(avisoMetaVisto(), false);
  for (const basura of ['{"visto":"sí"}', '{"visto":1}', "true", "null", "{roto"]) {
    almacen.set("truco-uy:anotador-aviso", basura);
    assert.equal(avisoMetaVisto(), false, `con ${basura}`);
  }
  almacen.clear();
  marcarAvisoMeta();
  assert.equal(avisoMetaVisto(), true);
  assert.deepEqual(JSON.parse(almacen.get("truco-uy:anotador-aviso") ?? "null"), { version: 1, visto: true });
});

test("el cartelito sin almacenamiento sale una vez por sesión, no en cada vuelta", () => {
  conAlmacen();
  escrituraFalla = true;
  marcarAvisoMeta();
  assert.equal(avisoMetaVisto(), true);
  delete (globalThis as Record<string, unknown>).window;
});
