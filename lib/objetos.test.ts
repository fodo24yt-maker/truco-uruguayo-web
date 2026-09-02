/**
 * Que cada departamento tenga su objeto, y que no se repitan donde se notaría.
 *
 * Los 19 departamentos comparten 7 ambientes, así que SEIS juegan en "el
 * galpón" y CINCO en "el litoral" con la misma escena horneada. El objeto de la
 * mesa es lo que los distingue ahí, y por eso la regla no es "que no se repita
 * ninguno" —entre ambientes distintos se puede, no se ven nunca juntos— sino
 * **que no se repita adentro de un mismo ambiente**, que es justo donde la
 * pantalla ya es idéntica.
 *
 * Es una regla que se cumple mirando una tabla, y por eso se olvida: alcanza
 * con agregar un rival y copiar la línea de arriba.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { ambienteDe, objetoDe } from "./ambientes.ts";
import { ALTURA, APOYO, PROPORCION } from "./objetos.ts";
import { PERSONALIDADES } from "./motor/personalidades.ts";

test("los 19 departamentos tienen objeto", () => {
  const sin = PERSONALIDADES.filter((p) => objetoDe(p.departamento) === null);
  assert.deepEqual(
    sin.map((p) => p.departamento),
    [],
    "hay departamentos sin objeto propio",
  );
});

test("dos departamentos del mismo ambiente no llevan el mismo objeto", () => {
  const porAmbiente = new Map<string, Map<string, string>>();

  for (const p of PERSONALIDADES) {
    const objeto = objetoDe(p.departamento);
    if (objeto === null) continue;
    const clave = ambienteDe(p.departamento).clave;
    const vistos = porAmbiente.get(clave) ?? new Map<string, string>();
    const yaLoTiene = vistos.get(objeto);
    assert.equal(
      yaLoTiene,
      undefined,
      `en "${clave}", ${p.departamento} repite el "${objeto}" de ${yaLoTiene}: ` +
        `comparten la misma escena y con el mismo objeto quedan idénticos`,
    );
    vistos.set(objeto, p.departamento);
    porAmbiente.set(clave, vistos);
  }
});

/* Los tres números de cada objeto viven en tres tablas separadas de
   `Objetos.tsx`, así que se puede dibujar uno y olvidarse de una. Sin esto, el
   olvido sale como un `aspect-ratio: undefined` en la mesa y no como un error. */
test("cada objeto dibujado tiene su proporción, su altura y su apoyo", () => {
  for (const p of PERSONALIDADES) {
    const o = objetoDe(p.departamento);
    if (o === null) continue;
    assert.ok(PROPORCION[o], `${o} no tiene PROPORCION`);
    assert.ok(ALTURA[o] > 0, `${o} no tiene ALTURA`);
    assert.ok(APOYO[o] > 0 && APOYO[o] <= 1, `${o} tiene un APOYO fuera de 0..1`);
  }
});
