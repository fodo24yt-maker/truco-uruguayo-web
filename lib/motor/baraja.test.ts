/**
 * Que el reparto sea de verdad aleatorio, y que las flores sean tan frecuentes
 * como dicen las reglas.
 *
 * Esto nació de una sospecha jugando: "me tocan un montón de flores, es medio
 * raro". El reparto estaba bien; lo raro es el truco uruguayo, que hace la flor
 * tres veces más frecuente que el argentino porque una pieza más dos cartas del
 * mismo palo ya es flor (reglas.txt 8.1, caso c).
 *
 * Estas pruebas dejan las dos cosas ancladas: si alguien toca el mezclador o la
 * definición de flor, saltan acá.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { BARAJA, type Carta, PALOS, NUMEROS, mezclar, repartir } from "./baraja.ts";
import { analizarFlor } from "./tantos.ts";

/** Azar determinista: las pruebas no pueden fallar un día sí y otro no. */
function azarFijo(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    // xorshift32: barato y con mucha mejor distribución que un LCG chico
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const idDe = (c: Carta) => PALOS.indexOf(c.palo) * 10 + NUMEROS.indexOf(c.numero);

test("el mezclador reparte parejo: ninguna carta prefiere ninguna posición", () => {
  const REPARTOS = 40000;
  const azar = azarFijo(20260828);

  // tabla[carta][posición] = cuántas veces esa carta cayó en esa posición
  const tabla = Array.from({ length: 40 }, () => new Array(40).fill(0));
  for (let i = 0; i < REPARTOS; i++) {
    const mazo = mezclar(BARAJA, azar);
    for (let pos = 0; pos < 40; pos++) tabla[idDe(mazo[pos])][pos]++;
  }

  const esperado = REPARTOS / 40;
  let chi = 0;
  for (let c = 0; c < 40; c++) {
    for (let pos = 0; pos < 40; pos++) {
      const d = tabla[c][pos] - esperado;
      chi += (d * d) / esperado;
    }
  }

  // 39x39 = 1521 grados de libertad. Un mezclador uniforme da un chi-cuadrado
  // parecido a los grados de libertad. El margen es holgado a propósito: acá
  // interesa cazar un sesgo grosero, no discutir el cuarto decimal.
  const gl = 39 * 39;
  assert.ok(
    chi > gl * 0.8 && chi < gl * 1.2,
    `chi-cuadrado ${chi.toFixed(1)} fuera de rango para ${gl} grados de libertad`,
  );
});

test("la muestra no tiene cartas preferidas", () => {
  const REPARTOS = 40000;
  const azar = azarFijo(7);
  const veces = new Array(40).fill(0);
  for (let i = 0; i < REPARTOS; i++) veces[idDe(repartir(azar).muestra)]++;

  const esperado = REPARTOS / 40;
  for (let c = 0; c < 40; c++) {
    const desvio = Math.abs(veces[c] - esperado) / esperado;
    assert.ok(desvio < 0.25, `la carta ${c} salió de muestra con ${(desvio * 100).toFixed(1)}% de desvío`);
  }
});

test("mano, pie y muestra son siempre siete cartas distintas", () => {
  const azar = azarFijo(99);
  for (let i = 0; i < 2000; i++) {
    const { mano, pie, muestra } = repartir(azar);
    const todas = [...mano, ...pie, muestra];
    assert.equal(todas.length, 7);
    const distintas = new Set(todas.map((c) => `${c.numero}${c.palo}`));
    assert.equal(distintas.size, 7, "se repartió una carta dos veces");
  }
});

test("la flor aparece el 15,5% de las manos: es el juego, no el reparto", () => {
  // Enumeración EXACTA: las 40 muestras por las 9139 manos de 3 cartas que
  // quedan. Sin muestreo y sin azar, así que el número es el número.
  let total = 0;
  let conFlor = 0;
  const porMotivo: Record<string, number> = {};

  for (let m = 0; m < 40; m++) {
    const muestra = BARAJA[m];
    const resto = BARAJA.filter((_, i) => i !== m);
    for (let a = 0; a < resto.length; a++) {
      for (let b = a + 1; b < resto.length; b++) {
        for (let c = b + 1; c < resto.length; c++) {
          total++;
          const flor = analizarFlor([resto[a], resto[b], resto[c]], muestra);
          if (flor.tiene) {
            conFlor++;
            porMotivo[flor.motivo!] = (porMotivo[flor.motivo!] ?? 0) + 1;
          }
        }
      }
    }
  }

  assert.equal(total, 365560);
  const pct = (100 * conFlor) / total;
  assert.ok(pct > 15.4 && pct < 15.7, `la flor salió ${pct.toFixed(2)}%, se esperaba 15,53%`);

  // El desglose importa: el caso (c) —una pieza y dos del mismo palo— es el que
  // no existe en el truco argentino, y es justo el que más pesa.
  const p = (k: string) => (100 * porMotivo[k]) / total;
  assert.ok(p("tres-del-mismo-palo") > 4.8 && p("tres-del-mismo-palo") < 4.9);
  assert.ok(p("dos-piezas") > 3.2 && p("dos-piezas") < 3.35);
  assert.ok(p("pieza-y-par") > 7.3 && p("pieza-y-par") < 7.45);
  assert.ok(
    porMotivo["pieza-y-par"] > porMotivo["tres-del-mismo-palo"],
    "el caso uruguayo tiene que pesar más que el de tres del mismo palo",
  );
});
