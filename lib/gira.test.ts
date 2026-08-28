import test from "node:test";
import assert from "node:assert/strict";

import {
  EN_ORDEN,
  type Marcas,
  armarGira,
  estadosDeTramos,
  porSlugDeDepartamento,
  proximaParada,
  slugDepartamento,
} from "./gira.ts";

/** Marcas de "le gané a estos", sin tocar el localStorage para nada. */
const ganadas = (...ids: string[]): Marcas =>
  Object.fromEntries(ids.map((id) => [id, { ganadas: 1, jugadas: 1 }]));

const id = (paso: number) => EN_ORDEN[paso - 1].id;
const estadoDe = (paradas: ReturnType<typeof armarGira>, paso: number) =>
  paradas[paso - 1].estado;

test("sin nada guardado sólo está abierta la primera", () => {
  const paradas = armarGira({});

  assert.equal(paradas.length, 19);
  assert.equal(estadoDe(paradas, 1), "abierta");
  assert.equal(paradas[0].personalidad.departamento, "Montevideo");

  for (let paso = 2; paso <= 19; paso++) {
    assert.equal(estadoDe(paradas, paso), "cerrada", `el paso ${paso} no tendría que estar abierto`);
  }
  assert.equal(proximaParada(paradas)?.paso, 1);
});

test("ganar una abre exactamente la siguiente, ni una más", () => {
  const paradas = armarGira(ganadas(id(1)));

  assert.equal(estadoDe(paradas, 1), "ganada");
  assert.equal(estadoDe(paradas, 2), "abierta");
  assert.equal(estadoDe(paradas, 3), "cerrada");
  assert.equal(proximaParada(paradas)?.paso, 2);
});

test("jugar y perder no abre nada", () => {
  const perdidas: Marcas = { [id(1)]: { ganadas: 0, jugadas: 7 } };
  const paradas = armarGira(perdidas);

  assert.equal(estadoDe(paradas, 1), "abierta");
  assert.equal(estadoDe(paradas, 2), "cerrada");
  assert.equal(proximaParada(paradas)?.paso, 1);
});

test("hay exactamente un próximo, salvo con la gira entera ganada", () => {
  for (const marcas of [{}, ganadas(id(1)), ganadas(id(1), id(2), id(3)), ganadas(id(5))]) {
    const cuántos = armarGira(marcas).filter((p) => p.esElProximo).length;
    assert.equal(cuántos, 1, `deberían ser 1 y son ${cuántos}`);
  }

  const todas = armarGira(ganadas(...EN_ORDEN.map((p) => p.id)));
  assert.ok(
    todas.every((p) => p.estado === "ganada"),
    "con las 19 ganadas no puede quedar ninguna abierta",
  );
  assert.equal(proximaParada(todas), null, "con la gira completa no hay adónde ir");
});

test("ganar fuera de orden no rompe la cadena", () => {
  // Pasa de verdad: la Partida Rápida anota contra el mismo id que la gira, así
  // que se puede tener ganado el paso 10 sin haber pasado por el 9.
  const paradas = armarGira(ganadas(id(10)));

  assert.equal(estadoDe(paradas, 10), "ganada");
  assert.equal(estadoDe(paradas, 11), "abierta", "ganarle al 10 abre el 11 igual");
  assert.equal(estadoDe(paradas, 9), "cerrada", "y el 9 sigue cerrado: no se saltea");
  assert.equal(proximaParada(paradas)?.paso, 1, "el próximo sigue siendo el primero sin ganar");
});

test("las marcas con ids que no existen se ignoran sin romper nada", () => {
  const paradas = armarGira({
    "no-existe": { ganadas: 99, jugadas: 99 },
    "": { ganadas: 1, jugadas: 1 },
  } as Marcas);

  assert.equal(paradas.length, 19);
  assert.equal(estadoDe(paradas, 1), "abierta");
  assert.equal(estadoDe(paradas, 2), "cerrada");
});

test("cada parada sabe a quién hay que ganarle para abrirla", () => {
  const paradas = armarGira({});

  assert.equal(paradas[0].abreCon, null, "la primera no depende de nadie");
  for (let i = 1; i < paradas.length; i++) {
    assert.equal(paradas[i].abreCon?.id, EN_ORDEN[i - 1].id);
  }
});

test("los tramos son 18 y siguen el avance", () => {
  assert.equal(estadosDeTramos(armarGira({})).length, 18);

  // Con los pasos 1 y 2 ganados: el salto 1→2 está hecho, el 2→3 es el que
  // toca —y el único que se anima—, y de ahí en adelante está todo cerrado.
  const tramos = estadosDeTramos(armarGira(ganadas(id(1), id(2))));
  assert.deepEqual(tramos.slice(0, 4), ["recorrido", "proximo", "cerrado", "cerrado"]);

  const cuántosSeAniman = tramos.filter((t) => t === "proximo").length;
  assert.equal(cuántosSeAniman, 1, "se anima uno solo, o la pantalla se llena de hormigas");
});

test("sin nada ganado no se anima ningún tramo", () => {
  // El próximo es el paso 1, y a la primera parada no llega ningún salto.
  const tramos = estadosDeTramos(armarGira({}));
  assert.ok(tramos.every((t) => t === "cerrado"));
});

test("el slug del departamento sale del nombre, sin tabla a mano", () => {
  assert.equal(slugDepartamento("Treinta y Tres"), "treinta-y-tres");
  assert.equal(slugDepartamento("Río Negro"), "rio-negro");
  assert.equal(slugDepartamento("Cerro Largo"), "cerro-largo");
  assert.equal(slugDepartamento("San José"), "san-jose");
  assert.equal(slugDepartamento("Paysandú"), "paysandu");
  assert.equal(slugDepartamento("Montevideo"), "montevideo");
});

test("los 19 slugs son distintos y se pueden volver a resolver", () => {
  const slugs = EN_ORDEN.map((p) => slugDepartamento(p.departamento));
  assert.equal(new Set(slugs).size, 19, "dos departamentos comparten slug");

  for (const personalidad of EN_ORDEN) {
    const vuelta = porSlugDeDepartamento(slugDepartamento(personalidad.departamento));
    assert.equal(vuelta?.id, personalidad.id);
  }
});

test("un ?depto inventado no resuelve a nadie y no rompe nada", () => {
  // Cae en null, y quien lo llame se queda en modo libre. Se valida con la
  // misma regla que `progreso.ts` usa para lo que viene de afuera.
  for (const basura of [
    null,
    undefined,
    "",
    "no-existe",
    "__proto__",
    "constructor",
    "toString",
    "MONTEVIDEO",
    "monte video",
    "montevideo?x=1",
    "../../etc/passwd",
    "<script>alert(1)</script>",
    "a".repeat(200),
  ]) {
    assert.equal(porSlugDeDepartamento(basura), null, `${basura} no tendría que resolver`);
  }
});
