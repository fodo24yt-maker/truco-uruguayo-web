import test from "node:test";
import assert from "node:assert/strict";

import { COLOR_DEPARTAMENTO } from "./mapa-colores.ts";
import { DEPARTAMENTOS, LIENZO, SILUETA } from "./mapa-uruguay.ts";
import { PERSONALIDADES } from "./motor/personalidades.ts";

/** Los paths son todos "M x y L x y ... Z": se leen como lista de puntos. */
function puntosDe(forma: string): [number, number][] {
  const numeros = forma
    .replace(/[MLZ]/g, " ")
    .trim()
    .split(/\s+/)
    .map(Number);
  assert.ok(numeros.every(Number.isFinite), "el path tiene algo que no es un número");
  assert.equal(numeros.length % 2, 0, "el path tiene un número suelto");
  const puntos: [number, number][] = [];
  for (let i = 0; i < numeros.length; i += 2) puntos.push([numeros[i], numeros[i + 1]]);
  return puntos;
}

/** Área con signo (fórmula del cordón de zapato). El valor absoluto es el área. */
function area(puntos: [number, number][]): number {
  let doble = 0;
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++)
    doble += (puntos[j][0] + puntos[i][0]) * (puntos[j][1] - puntos[i][1]);
  return Math.abs(doble / 2);
}

function estáAdentro([px, py]: [number, number], poligono: [number, number][]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

const clave = ([x, y]: [number, number]) => `${x},${y}`;

test("el mapa tiene los 19 departamentos, sin repetir", () => {
  assert.equal(DEPARTAMENTOS.length, 19);
  assert.equal(new Set(DEPARTAMENTOS.map((d) => d.nombre)).size, 19);
});

test("cada departamento del mapa tiene su rival, y al revés", () => {
  const enMapa = new Set(DEPARTAMENTOS.map((d) => d.nombre));
  const conRival = new Set(PERSONALIDADES.map((p) => p.departamento));

  for (const d of enMapa) {
    assert.ok(conRival.has(d), `${d} está en el mapa pero no tiene rival`);
  }
  for (const d of conRival) {
    assert.ok(enMapa.has(d), `${d} tiene rival pero no está en el mapa`);
  }
});

test("cada departamento tiene su color", () => {
  for (const d of DEPARTAMENTOS) {
    const color = COLOR_DEPARTAMENTO[d.nombre];
    assert.ok(color, `${d.nombre} se quedó sin color`);
    assert.match(color, /^#[0-9a-f]{6}$/, `${d.nombre}: color mal escrito`);
  }
  assert.equal(
    Object.keys(COLOR_DEPARTAMENTO).length,
    19,
    "sobra un color: hay un nombre de departamento mal escrito",
  );
});

test("las formas son válidas y entran en el lienzo", () => {
  for (const d of DEPARTAMENTOS) {
    assert.match(d.forma, /^M [\d\s.L]+Z$/, `${d.nombre}: forma mal armada`);
    const puntos = puntosDe(d.forma);
    assert.ok(puntos.length >= 3, `${d.nombre}: no llega a ser un polígono`);
    for (const [x, y] of puntos) {
      assert.ok(x >= 0 && x <= LIENZO.ancho, `${d.nombre}: se sale del lienzo a lo ancho`);
      assert.ok(y >= 0 && y <= LIENZO.alto, `${d.nombre}: se sale del lienzo a lo alto`);
    }
  }
});

test("la chapita del nombre cae dentro de su propio departamento", () => {
  for (const d of DEPARTAMENTOS) {
    assert.ok(
      estáAdentro(d.centro, puntosDe(d.forma)),
      `${d.nombre}: la etiqueta quedó fuera del departamento`,
    );
    assert.ok(d.holgura > 0, `${d.nombre}: holgura imposible`);
  }
});

test("no hay rendijas entre departamentos", () => {
  // La geometría se simplifica por arcos compartidos, así que un vértice de un
  // borde interno tiene que aparecer IDÉNTICO en el vecino. Si alguna vez se
  // simplificara cada departamento por su cuenta, este test se cae: es
  // justamente el bug que dejaría una franja blanca entre Salto y Artigas.
  const enSilueta = new Set(puntosDe(SILUETA).map(clave));
  const cuántos = new Map<string, number>();
  for (const d of DEPARTAMENTOS)
    for (const k of new Set(puntosDe(d.forma).map(clave)))
      cuántos.set(k, (cuántos.get(k) ?? 0) + 1);

  for (const d of DEPARTAMENTOS) {
    for (const p of puntosDe(d.forma)) {
      const k = clave(p);
      assert.ok(
        enSilueta.has(k) || (cuántos.get(k) ?? 0) >= 2,
        `${d.nombre}: el vértice ${k} no es ni costa ni borde compartido — hay una rendija`,
      );
    }
  }
});

test("los 19 departamentos cubren el país entero, sin huecos ni solapes", () => {
  const total = DEPARTAMENTOS.reduce((suma, d) => suma + area(puntosDe(d.forma)), 0);
  const país = area(puntosDe(SILUETA));
  const desvío = Math.abs(total - país) / país;
  assert.ok(
    desvío < 0.005,
    `la suma de los departamentos difiere del país en ${(desvío * 100).toFixed(2)}%`,
  );
});

test("la silueta del país cierra", () => {
  const puntos = puntosDe(SILUETA);
  assert.ok(puntos.length > 100, "la silueta quedó demasiado pobre");
  assert.deepEqual(puntos[0], puntos[puntos.length - 1], "la silueta no cierra");
});
