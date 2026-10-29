/**
 * Lo que se puede probar del sonido sin un navegador: el orden de los temas,
 * la curva del cruce, qué suena en cada sección, y que los índices de la música
 * y de las voces apunten a archivos de verdad.
 * Lo que suena de verdad se mira con Playwright (está en el Historial).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AMBIENTES_MUSICALES,
  ANTES_DE_SON_BUENAS,
  CAMBIO,
  CRUCE,
  ENTRADA,
  ENTRE_CANTOS,
  ambienteDeRuta,
  barajar,
  curvaCruce,
  esperaAntesDe,
} from "./audio.ts";
import { CLAVES_VOZ } from "./motor/partida.ts";
import { PERSONALIDADES } from "./motor/personalidades.ts";
import { TEMAS } from "./musica.ts";
import { VOCES } from "./voces.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** mulberry32, para que los tests den siempre lo mismo. */
function azarCon(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("barajar: siempre son todos los temas, una vez cada uno", () => {
  for (let s = 0; s < 200; s++) {
    const orden = barajar(7, null, azarCon(s));
    assert.deepEqual([...orden].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
  }
});

test("barajar: la vuelta nueva no empieza por el que acaba de sonar", () => {
  for (let s = 0; s < 500; s++) {
    for (let ultimo = 0; ultimo < 7; ultimo++) {
      assert.notEqual(barajar(7, ultimo, azarCon(s * 7 + ultimo))[0], ultimo, `semilla ${s}: repitió el ${ultimo}`);
    }
  }
});

test("barajar: con un solo tema no hay a quién cambiar, y no se rompe", () => {
  assert.deepEqual(barajar(1, 0), [0]);
  assert.deepEqual(barajar(0, null), []);
});

test("el cruce es de igual potencia: a mitad de camino no hay pozo", () => {
  const sube = curvaCruce(true);
  const baja = curvaCruce(false);
  assert.equal(sube[0], 0);
  assert.ok(Math.abs(sube.at(-1)! - 1) < 1e-6);
  assert.equal(baja[0], 1);
  assert.ok(Math.abs(baja.at(-1)!) < 1e-6);
  for (let i = 0; i < sube.length; i++) {
    // seno² + coseno² = 1: la potencia de los dos juntos es la de uno solo
    assert.ok(Math.abs(sube[i] ** 2 + baja[i] ** 2 - 1) < 1e-6, `en el punto ${i} la potencia no es 1`);
  }
});

test("lib/musica.ts: cada tema es un .m4a de public/audio/musica que existe", () => {
  assert.ok(TEMAS.length > 0, "no hay música");
  for (const t of TEMAS) {
    // Ruta escrita entera y sin nada raro: el reproductor no arma rutas.
    assert.match(t.archivo, /^\/audio\/musica\/[a-z0-9-]+\.m4a$/);
    const archivo = path.join(RAIZ, "public", t.archivo);
    assert.ok(existsSync(archivo), `falta ${t.archivo}`);
    assert.ok(statSync(archivo).size > 10_000, `${t.archivo} está casi vacío`);
  }
});

test("cada tema dura bastante más que dos cruces (si no, los cruces se pisan)", () => {
  for (const t of TEMAS) {
    assert.ok(t.segundos > 2 * CRUCE + ENTRADA, `${t.archivo} dura ${t.segundos} s`);
  }
});

test("qué suena dónde: cada ruta cae en su sección, con o sin barra final (la app la lleva)", () => {
  const casos: [string, string][] = [
    ["/", "menu"],
    ["/jugar", "menu"],
    ["/jugar/", "menu"],
    ["/legales/privacidad/", "menu"],
    ["/jugar/mesa", "mesa"],
    ["/jugar/mesa/", "mesa"],
    ["/jugar/gira/", "gira"],
    ["/aprender", "aprender"],
    ["/aprender/la-flor/", "aprender"],
    ["/aprendermucho", "menu"], // no es /aprender: el prefijo tiene que ser una carpeta
    ["/anotador/", "silencio"], // se usa jugando con gente: sin música
  ];
  for (const [ruta, esperado] of casos) assert.equal(ambienteDeRuta(ruta), esperado, ruta);
});

test("cada sección nombra temas que existen, y ningún tema quedó sin sección", () => {
  const claves = new Set(TEMAS.map((t) => t.clave));
  const usados = new Set<string>();
  for (const [seccion, { temas, nivel }] of Object.entries(AMBIENTES_MUSICALES)) {
    assert.ok(temas.length > 0, `${seccion} no tiene temas`);
    assert.ok(nivel > 0 && nivel <= 1, `${seccion}: nivel ${nivel}`);
    for (const t of temas) {
      assert.ok(claves.has(t), `${seccion} nombra ${t}, que no está en lib/musica.ts`);
      usados.add(t);
    }
  }
  assert.deepEqual([...claves].filter((c) => !usados.has(c)), [], "hay temas publicados que nunca suenan");
});

test("en la mesa la música suena más bajo que en los menús: ahí mandan los cantos", () => {
  assert.ok(AMBIENTES_MUSICALES.mesa.nivel < AMBIENTES_MUSICALES.menu.nivel);
  assert.ok(CAMBIO < CRUCE, "el cambio de sección tendría que ser más corto que el cruce entre temas");
});

test("el \"Son buenas\" no se pisa con el \"¡Quiero!\": en el medio se dijo un tanto", () => {
  // Lo de Santiago (25/10/2026): con 0,12 s de respiro salían casi encimados.
  assert.ok(ANTES_DE_SON_BUENAS >= 0.8, "el otro no llega a decir \"veintisiete\"");
  assert.equal(esperaAntesDe("son-buenas", true), ANTES_DE_SON_BUENAS);
  // Y espera aunque llegue solo: el tanto del medio pudo ser el tuyo, sin voz.
  assert.equal(esperaAntesDe("son-buenas", false), ANTES_DE_SON_BUENAS);
});

test("entre dos cantos seguidos hay respiro, y uno suelto sale en el momento", () => {
  assert.ok(ENTRE_CANTOS >= 0.3 && ENTRE_CANTOS < ANTES_DE_SON_BUENAS);
  for (const clave of CLAVES_VOZ.filter((c) => c !== "son-buenas")) {
    assert.equal(esperaAntesDe(clave, true), ENTRE_CANTOS, clave);
    assert.equal(esperaAntesDe(clave, false), 0, clave);
  }
});

test("lib/voces.ts: cada voz es de un rival y un canto que existen, y su archivo está", () => {
  const ids = new Set(PERSONALIDADES.map((p) => p.id));
  for (const [id, cantos] of Object.entries(VOCES)) {
    assert.ok(ids.has(id), `voces de un rival que no existe: ${id}`);
    for (const [clave, tomas] of Object.entries(cantos)) {
      assert.ok((CLAVES_VOZ as readonly string[]).includes(clave), `${id}: canto desconocido ${clave}`);
      assert.ok(tomas && tomas.length > 0, `${id}/${clave} sin tomas`);
      for (const t of tomas ?? []) {
        assert.match(t, new RegExp(`^/audio/voces/${id}/${clave}-\\d\\.m4a$`));
        assert.ok(existsSync(path.join(RAIZ, "public", t)), `falta ${t}`);
      }
    }
  }
});
