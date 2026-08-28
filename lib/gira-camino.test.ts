import test from "node:test";
import assert from "node:assert/strict";

import { CAMINO, PARADAS_XY, type Punto } from "./gira-camino.ts";
import { EN_ORDEN } from "./gira.ts";
import { DEPARTAMENTOS, SILUETA } from "./mapa-uruguay.ts";

// `puntosDe` y `estáAdentro` son los mismos de `mapa-uruguay.test.ts`. Van
// copiados y no importados a propósito: importar un archivo de test hace que
// `node --test` corra sus pruebas de nuevo acá adentro, y el total se duplica.
function puntosDe(forma: string): Punto[] {
  const numeros = forma.replace(/[MLZ]/g, " ").trim().split(/\s+/).map(Number);
  const puntos: Punto[] = [];
  for (let i = 0; i < numeros.length; i += 2) puntos.push([numeros[i], numeros[i + 1]]);
  return puntos;
}

function estáAdentro([px, py]: Punto, poligono: Punto[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

const PAIS = puntosDe(SILUETA);

/** Distancia de un punto a un segmento. */
function distanciaASegmento([px, py]: Punto, [x1, y1]: Punto, [x2, y2]: Punto): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / largo2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Cuánto le sobra al punto hasta el borde del país. Negativo = se salió. */
function holgura(p: Punto): number {
  let min = Infinity;
  for (let i = 0, j = PAIS.length - 1; i < PAIS.length; j = i++)
    min = Math.min(min, distanciaASegmento(p, PAIS[j], PAIS[i]));
  return estáAdentro(p, PAIS) ? min : -min;
}

/** Lee el `d` que arma el módulo: "M x y C c1 c2 fin C c1 c2 fin ...". */
function cúbicasDe(d: string): { arranque: Punto; curvas: [Punto, Punto, Punto][] } {
  const trozos = d.split("C");
  const numeros = (s: string) => s.replace(/[MC,]/g, " ").trim().split(/\s+/).map(Number);

  const inicio = numeros(trozos[0]);
  assert.equal(inicio.length, 2, `el arranque del path está mal: ${trozos[0]}`);

  const curvas = trozos.slice(1).map((trozo) => {
    const n = numeros(trozo);
    assert.equal(n.length, 6, `una cúbica no tiene 6 números: ${trozo}`);
    assert.ok(n.every(Number.isFinite), `hay algo que no es número: ${trozo}`);
    return [
      [n[0], n[1]],
      [n[2], n[3]],
      [n[4], n[5]],
    ] as [Punto, Punto, Punto];
  });

  return { arranque: [inicio[0], inicio[1]], curvas };
}

/** Muestrea un tramo entero, cúbica por cúbica. */
function muestrear(d: string, porCurva = 60): Punto[] {
  const { arranque, curvas } = cúbicasDe(d);
  const puntos: Punto[] = [arranque];
  let p0 = arranque;

  for (const [c1, c2, fin] of curvas) {
    for (let s = 1; s <= porCurva; s++) {
      const u = s / porCurva;
      const v = 1 - u;
      puntos.push([
        v * v * v * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * fin[0],
        v * v * v * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * fin[1],
      ]);
    }
    p0 = fin;
  }
  return puntos;
}

/** ¿Se cruzan dos segmentos? Con los extremos abiertos. */
function seCruzan(a: Punto, b: Punto, c: Punto, d: Punto): boolean {
  const lado = (p: Punto, q: Punto, r: Punto) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = lado(a, b, c);
  const d2 = lado(a, b, d);
  const d3 = lado(c, d, a);
  const d4 = lado(c, d, b);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

test("el camino tiene los 18 saltos de la gira", () => {
  assert.equal(CAMINO.length, 18);
  assert.equal(PARADAS_XY.length, 19);
  assert.equal(EN_ORDEN.length, 19);
});

test("cada tramo sale de una parada y llega a la siguiente", () => {
  const centro = new Map(DEPARTAMENTOS.map((d) => [d.nombre, d.centro]));

  CAMINO.forEach((tramo, i) => {
    assert.equal(tramo.desde, EN_ORDEN[i].departamento);
    assert.equal(tramo.hasta, EN_ORDEN[i + 1].departamento);

    const { arranque, curvas } = cúbicasDe(tramo.d);
    const final = curvas[curvas.length - 1][2];

    assert.deepEqual([...arranque], centro.get(tramo.desde), `${tramo.desde}: no arranca en su centro`);
    assert.deepEqual([...final], centro.get(tramo.hasta), `${tramo.hasta}: no termina en su centro`);
  });
});

test("los tramos se encadenan: donde termina uno arranca el otro", () => {
  // Es lo que hace que el camino se lea como un solo recorrido y no como 18
  // rayas sueltas.
  for (let i = 0; i + 1 < CAMINO.length; i++) {
    const curvas = cúbicasDe(CAMINO[i].d).curvas;
    const final = curvas[curvas.length - 1][2];
    assert.deepEqual([...final], [...cúbicasDe(CAMINO[i + 1].d).arranque]);
  }
});

test("el camino entero pasa por adentro del país, con aire de sobra", () => {
  // Hoy la holgura mínima es 17.4 —la del propio centro de Montevideo, que es
  // la parada más apretada del mapa—, así que este test se cae si alguien
  // cambia la tensión de la curva o borra la escala de Artigas→Rivera.
  let peor = Infinity;
  let dónde = "";

  for (const tramo of CAMINO) {
    for (const p of muestrear(tramo.d)) {
      const h = holgura(p);
      if (h < peor) {
        peor = h;
        dónde = `${tramo.desde}→${tramo.hasta} en (${p[0].toFixed(0)}, ${p[1].toFixed(0)})`;
      }
    }
  }

  assert.ok(peor >= 12, `el camino se arrima demasiado al borde: ${peor.toFixed(1)} en ${dónde}`);
});

test("ningún tramo se muerde a sí mismo", () => {
  for (const tramo of CAMINO) {
    const p = muestrear(tramo.d, 40);
    for (let i = 0; i + 1 < p.length; i++) {
      for (let j = i + 2; j + 1 < p.length; j++) {
        assert.ok(
          !seCruzan(p[i], p[i + 1], p[j], p[j + 1]),
          `${tramo.desde}→${tramo.hasta}: la curva se cruza con ella misma`,
        );
      }
    }
  }
});

test("el `d` es sólo números: nada calculado se cuela en el atributo", () => {
  for (const tramo of CAMINO) {
    assert.match(tramo.d, /^M [-\d. ]+(C [-\d. ]+, [-\d. ]+, [-\d. ]+)+$/, `path raro: ${tramo.d}`);
  }
});
