/**
 * Qué se precarga al abrir la app. La parte de navegador (decodificar
 * imágenes) la prueba `herramientas/mirar-carga.mjs`; acá va lo que decide.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { armarGira, proximaParada } from "./gira.ts";
import { PERSONALIDADES, buscarPersonalidad } from "./motor/personalidades.ts";
import {
  MAX_DEPARTAMENTOS_A_PRECARGAR,
  conTope,
  departamentosAPrecargar,
  precargarEscena,
} from "./precarga.ts";
import { escenaDe } from "./ambientes.ts";

const sinRepetir = (xs: string[]) => [...new Set(xs)];
const deptoDeSiempre = buscarPersonalidad("").departamento;
const primeraParada = proximaParada(armarGira({}))!.personalidad.departamento;

/** Ganadas todas las paradas de la Gira. */
const giraEntera = Object.fromEntries(PERSONALIDADES.map((p) => [p.id, { ganadas: 1, jugadas: 1 }]));

test("sin progreso: el rival de siempre y la primera parada de la Gira", () => {
  assert.deepEqual(
    departamentosAPrecargar({ ultimoRival: null, rivales: {} }, true),
    sinRepetir([deptoDeSiempre, primeraParada]),
  );
});

test("la Partida rápida va primero: el último rival elegido", () => {
  const rival = PERSONALIDADES[5];
  const lista = departamentosAPrecargar({ ultimoRival: rival.id, rivales: {} }, true);
  assert.equal(lista[0], rival.departamento);
});

test("con la Gira cerrada (candado), sólo la Partida rápida", () => {
  assert.deepEqual(departamentosAPrecargar({ ultimoRival: null, rivales: {} }, false), [
    deptoDeSiempre,
  ]);
});

test("con la Gira terminada no hay próxima parada: sólo la Partida rápida", () => {
  assert.deepEqual(departamentosAPrecargar({ ultimoRival: null, rivales: giraEntera }, true), [
    deptoDeSiempre,
  ]);
});

test("un último rival que no existe cae en el de siempre, sin romper", () => {
  for (const basura of ["__proto__", "constructor", "no-existe", ""]) {
    assert.equal(departamentosAPrecargar({ ultimoRival: basura, rivales: {} }, false)[0], deptoDeSiempre);
  }
});

test("nunca más del máximo, nunca repetidos, siempre departamentos de verdad", () => {
  const deptos = new Set(PERSONALIDADES.map((p) => p.departamento));
  for (const rival of PERSONALIDADES) {
    for (let ganadas = 0; ganadas <= PERSONALIDADES.length; ganadas++) {
      const rivales = Object.fromEntries(
        [...PERSONALIDADES]
          .sort((a, b) => a.paso - b.paso)
          .slice(0, ganadas)
          .map((p) => [p.id, { ganadas: 1, jugadas: 1 }]),
      );
      const lista = departamentosAPrecargar({ ultimoRival: rival.id, rivales }, true);
      assert.ok(lista.length >= 1 && lista.length <= MAX_DEPARTAMENTOS_A_PRECARGAR);
      assert.equal(new Set(lista).size, lista.length);
      for (const d of lista) assert.ok(deptos.has(d), d);
    }
  }
});

test("conTope: se cumple con la promesa", async () => {
  let vencer = () => {};
  const fin = conTope(Promise.resolve(), 1000, ((fn: () => void) => {
    vencer = fn;
  }) as unknown as typeof setTimeout);
  await fin; // se colgaría si no
  vencer();
});

test("conTope: una promesa que no termina nunca se corta en el tope", async () => {
  let vencer = () => {};
  let cumplida = false;
  const fin = conTope(new Promise(() => {}), 1000, ((fn: () => void) => {
    vencer = fn;
  }) as unknown as typeof setTimeout).then(() => {
    cumplida = true;
  });
  await new Promise((r) => setImmediate(r));
  assert.equal(cumplida, false, "antes del tope, espera");
  vencer();
  await fin;
  assert.equal(cumplida, true);
});

test("conTope: una promesa que falla no rechaza", async () => {
  await conTope(Promise.reject(new Error("no bajó")), 1000, (() => {}) as unknown as typeof setTimeout);
});

test("fuera del navegador, precargar no hace nada y no traba", async () => {
  await precargarEscena(escenaDe("Montevideo"));
});
