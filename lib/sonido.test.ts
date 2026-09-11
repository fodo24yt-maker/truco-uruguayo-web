/**
 * Que los volúmenes sobrevivan, y que la basura no.
 *
 * Este archivo guarda una preferencia en `localStorage`, que es exactamente el
 * lugar del que `CLAUDE.md` dice que hay que desconfiar: cualquiera lo edita a
 * mano desde la consola. Lo que se prueba acá son las dos mitades de eso:
 *
 *   1. que lo que se guarda se recupere igual —si no, la barra es un adorno—;
 *   2. que NADA de lo que pueda escribirse a mano salga de `leerSonido`.
 *
 * Y una tercera que no es seguridad sino la única regla del archivo:
 * `volumenReal`, que es el renglón que el día de mañana van a consumir el que
 * reproduce la música, el que reproduce las voces y el que reproduce los
 * efectos. Se prueba ahora, con el motor sin existir, para que los tres lo
 * consuman en vez de deducirlo cada uno por su lado.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  BARRAS,
  type Barra,
  CANALES,
  PASO,
  SONIDO_POR_DEFECTO,
  type Sonido,
  guardarSilencio,
  guardarSonido,
  guardarVolumen,
  leerSonido,
  volumenReal,
} from "./sonido.ts";

const CLAVE = "truco-uy:sonido";

/**
 * Un `window` de mentira con su `localStorage` adentro.
 *
 * Hace falta porque `lib/sonido.ts` arranca cada función preguntando
 * `typeof window === "undefined"` —que es lo que la deja funcionar del lado del
 * servidor, donde Next dibuja el HTML—. Sin esto, en Node todo devuelve el
 * valor por defecto y el archivo se probaría a sí mismo respondiendo que sí.
 *
 * `crudo` es lo que hay guardado ANTES de empezar, o sea el lugar donde se
 * escribe la basura que se quiere probar.
 */
function montarNavegador(crudo?: string) {
  const datos = new Map<string, string>();
  if (crudo !== undefined) datos.set(CLAVE, crudo);
  (globalThis as Record<string, unknown>).window = {
    localStorage: {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
      removeItem: (k: string) => void datos.delete(k),
    },
  };
  return datos;
}

const desmontarNavegador = () => {
  delete (globalThis as Record<string, unknown>).window;
};

test("sin nada guardado, valen los de por defecto", () => {
  montarNavegador();
  assert.deepEqual(leerSonido(), SONIDO_POR_DEFECTO);
  desmontarNavegador();
});

test("del lado del servidor no se rompe: no hay window y devuelve los de por defecto", () => {
  desmontarNavegador();
  assert.deepEqual(leerSonido(), SONIDO_POR_DEFECTO);
  // Y guardar no explota aunque no haya dónde
  assert.doesNotThrow(() => guardarSonido(SONIDO_POR_DEFECTO));
});

test("lo que se guarda se recupera igual", () => {
  montarNavegador();
  const puesto: Sonido = {
    version: 1,
    silencio: true,
    general: 45,
    musica: 0,
    voces: 100,
    efectos: 25,
  };
  guardarSonido(puesto);
  assert.deepEqual(leerSonido(), puesto);
  desmontarNavegador();
});

test("mover una barra no toca las otras", () => {
  montarNavegador();
  const despues = guardarVolumen("musica", 15);
  assert.equal(despues.musica, 15);
  assert.equal(despues.voces, SONIDO_POR_DEFECTO.voces);
  assert.equal(despues.efectos, SONIDO_POR_DEFECTO.efectos);
  assert.equal(despues.general, SONIDO_POR_DEFECTO.general);
  // y quedó escrito, no sólo devuelto
  assert.equal(leerSonido().musica, 15);
  desmontarNavegador();
});

test("silenciar NO baja los volúmenes: al desprenderlo vuelve todo como estaba", () => {
  montarNavegador();
  guardarVolumen("musica", 35);
  const callado = guardarSilencio(true);
  assert.equal(callado.silencio, true);
  assert.equal(callado.musica, 35, "silenciar le pisó el volumen a la música");
  assert.equal(volumenReal(callado, "musica"), 0);

  const devuelta = guardarSilencio(false);
  assert.equal(volumenReal(devuelta, "musica"), 0.35);
  desmontarNavegador();
});

/**
 * LA FILA DE BASURA.
 *
 * Cada caso es algo que se puede escribir a mano en la consola en treinta
 * segundos. Lo que se exige de todos es lo mismo: que `leerSonido` devuelva
 * cuatro enteros de 0 a 100 y un booleano, sin lanzar.
 */
test("la basura guardada a mano no sale nunca de leerSonido", () => {
  const basura: [string, string][] = [
    ["JSON roto", "{no es json"],
    ["texto pelado", '"hola"'],
    ["nulo", "null"],
    ["una lista", "[1,2,3]"],
    ["un número suelto", "42"],
    ["vacío", "{}"],
    ["negativo", '{"general":-5}'],
    ["pasado de 100", '{"musica":101}'],
    ["enorme", '{"voces":999999999}'],
    ["con coma", '{"efectos":60.5}'],
    ["texto donde va un número", '{"general":"80"}'],
    ["NaN disfrazado", '{"general":null,"musica":true}'],
    ["silencio que no es booleano", '{"silencio":"si"}'],
    ["campos de más", '{"general":50,"rootkit":"x","__proto__":{"voces":1}}'],
  ];

  for (const [nombre, crudo] of basura) {
    montarNavegador(crudo);
    const s = leerSonido();

    assert.equal(typeof s.silencio, "boolean", `${nombre}: el silencio no es booleano`);
    assert.equal(s.version, 1, `${nombre}: versión equivocada`);
    for (const barra of BARRAS) {
      const v = s[barra];
      assert.ok(
        typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100,
        `${nombre}: ${barra} salió como ${JSON.stringify(v)}`,
      );
    }
    desmontarNavegador();
  }
});

test("un campo podrido no se lleva puestos a los otros", () => {
  // `musica` es basura, pero `voces` es un número legítimo y tiene que llegar.
  montarNavegador('{"musica":"fuerte","voces":30}');
  const s = leerSonido();
  assert.equal(s.musica, SONIDO_POR_DEFECTO.musica, "la música no cayó en su valor por defecto");
  assert.equal(s.voces, 30, "se descartó un valor que estaba bien");
  desmontarNavegador();
});

test("no se puede ensuciar Object.prototype desde la clave guardada", () => {
  montarNavegador('{"__proto__":{"silencio":true,"contaminado":true}}');
  leerSonido();
  assert.equal(
    (Object.prototype as Record<string, unknown>).contaminado,
    undefined,
    "se escribió en Object.prototype desde localStorage",
  );
  assert.equal(({} as Record<string, unknown>).silencio, undefined);
  desmontarNavegador();
});

test("guardarVolumen también valida: lo inválido no llega a guardarse", () => {
  montarNavegador();
  // Hoy sólo llama el panel, que manda un entero del <input type="range">.
  // Esto es para que mañana no importe quién llame.
  for (const malo of [-1, 101, 33.3, Number.NaN, Number.POSITIVE_INFINITY]) {
    guardarVolumen("voces", malo);
    assert.equal(
      leerSonido().voces,
      SONIDO_POR_DEFECTO.voces,
      `se guardó ${malo} como volumen`,
    );
  }
  desmontarNavegador();
});

test("una clave de la cadena de prototipos no se cuela como volumen", () => {
  /* `SONIDO_POR_DEFECTO["constructor"]` devuelve una FUNCIÓN, no `undefined`:
     indexar un objeto plano con un texto también ve lo que cuelga del
     prototipo. Si esa función terminara de "valor por defecto", saldría de
     `guardarVolumen` metida adentro del objeto.

     ── DÓNDE SE MIRA, QUE ES LO QUE HACE QUE ESTE TEST SIRVA ───────────────
     Se mira **lo que DEVUELVE `guardarVolumen`**, y no lo que después lee
     `leerSonido()`. La primera versión de este test miraba lo segundo y pasaba
     igual con el arreglo sacado: `JSON.stringify` descarta las funciones al
     guardar, así que la ida y vuelta por `localStorage` tapa el agujero y el
     test daba verde sobre código roto.

     Y el valor devuelto no es un detalle: el panel hace
     `setSonido(guardarVolumen(...))`, o sea que ESE objeto es el que entra al
     estado de React y el que se dibuja en pantalla. Es el camino real.

     Hoy `barra` viene siempre de `BARRAS` y TypeScript no deja otra cosa, así
     que hay que forzarlo con un `as`. Se tapa igual porque es el mismo agujero
     que `lib/progreso.ts` ya cerró una vez. */
  montarNavegador();
  for (const clave of ["constructor", "toString", "hasOwnProperty", "valueOf", "__proto__"]) {
    const devuelto = guardarVolumen(clave as Barra, Number.NaN);
    for (const barra of BARRAS) {
      assert.ok(
        Number.isInteger(devuelto[barra]) && devuelto[barra] >= 0 && devuelto[barra] <= 100,
        `con la clave "${clave}", ${barra} volvió como ${typeof devuelto[barra]}`,
      );
    }
    // y tampoco se coló nada raro en la clave que se escribió
    const colado = (devuelto as unknown as Record<string, unknown>)[clave];
    assert.notEqual(typeof colado, "function", `se devolvió una función bajo "${clave}"`);
    assert.equal(typeof devuelto.silencio, "boolean");
  }
  desmontarNavegador();
});

test("volumenReal: el maestro multiplica", () => {
  const s: Sonido = { ...SONIDO_POR_DEFECTO, silencio: false, general: 50, musica: 40 };
  assert.equal(volumenReal(s, "musica"), 0.2);
  assert.equal(volumenReal(s, "voces"), 0.5); // voces en 100
});

test("volumenReal: el general en 0 apaga los tres canales", () => {
  const s: Sonido = { ...SONIDO_POR_DEFECTO, general: 0 };
  for (const canal of CANALES) assert.equal(volumenReal(s, canal), 0, `${canal} sonaba igual`);
});

test("volumenReal: el silencio le gana a cualquier volumen", () => {
  const s: Sonido = {
    version: 1,
    silencio: true,
    general: 100,
    musica: 100,
    voces: 100,
    efectos: 100,
  };
  for (const canal of CANALES) assert.equal(volumenReal(s, canal), 0, `${canal} sonaba silenciado`);
});

test("volumenReal siempre devuelve algo que se le puede dar a un .volume", () => {
  // Un `HTMLMediaElement.volume` fuera de 0..1 lanza IndexSizeError. Esto es lo
  // único que el motor va a necesitar que sea cierto SIEMPRE.
  for (const general of [0, 5, 50, 100]) {
    for (const propio of [0, 5, 50, 100]) {
      for (const silencio of [true, false]) {
        const v = volumenReal({ version: 1, silencio, general, musica: propio, voces: propio, efectos: propio }, "musica");
        assert.ok(v >= 0 && v <= 1 && Number.isFinite(v), `salió ${v}`);
      }
    }
  }
});

test("los valores por defecto caen en el paso de la barra", () => {
  // Si no, la barra no puede volver a su propio valor de fábrica: la arrastrás
  // y se te pasa de largo para los dos lados.
  for (const barra of BARRAS) {
    assert.equal(
      SONIDO_POR_DEFECTO[barra] % PASO,
      0,
      `${barra} arranca en ${SONIDO_POR_DEFECTO[barra]}, que no es múltiplo de ${PASO}`,
    );
  }
});
