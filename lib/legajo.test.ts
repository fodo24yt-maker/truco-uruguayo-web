/**
 * El legajo sale del navegador del jugador, así que cualquiera puede editarlo a
 * mano desde la consola. Estas pruebas verifican dos cosas distintas:
 *
 *  1. que nada de lo que venga de ahí pueda romper la aplicación;
 *  2. que nada de lo que venga de ahí pueda fabricarle al bot una lectura que
 *     ninguna partida produjo. Eso es lo propio de este archivo: acá lo de
 *     afuera no es sólo un dato que se muestra, es algo con lo que el rival
 *     decide cómo jugarte.
 */
import test from "node:test";
import assert from "node:assert/strict";

// localStorage de mentira, para poder probar sin navegador
const almacen = new Map<string, string>();
(globalThis as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => almacen.set(k, v),
    removeItem: (k: string) => almacen.delete(k),
  },
};

const {
  leerLegajo, guardarLegajo, anotarEnLegajo, borrarLegajo, fichaSembrada, sanear,
  LEGAJO_VACIO, CUANTAS_PARTIDAS, TOPE_SIEMBRA,
} = await import("./legajo.ts");
const { fichaVacia, sumarFichas, CAMPOS_FICHA } = await import("./motor/lectura.ts");

const CLAVE = "truco-uy:legajo";

/** Una ficha con números que cierran, como la que deja una partida de verdad. */
const fichaDe = (extra: Record<string, number> = {}) => ({
  ...fichaVacia(),
  manosJugadas: 10,
  manosVistas: 4,
  manosConCartas: 6,
  envidosCantados: 4,
  envidosFlojos: 3,
  trucosRecibidos: 8,
  trucosNoQueridos: 6,
  ...extra,
});

test("sin nada guardado devuelve el legajo vacío", () => {
  almacen.clear();
  assert.deepEqual(leerLegajo(), LEGAJO_VACIO);
});

test("anota una partida y la recupera", () => {
  almacen.clear();
  anotarEnLegajo("el-melo", true, fichaDe());
  const l = leerLegajo();
  assert.equal(l.partidas.length, 1);
  assert.equal(l.partidas[0].rival, "el-melo");
  assert.equal(l.partidas[0].ficha.envidosFlojos, 3);
});

test("guarda sólo las últimas tres, y tira la más vieja", () => {
  almacen.clear();
  for (const r of ["luki", "tito", "cachila", "beto", "el-melo"]) {
    anotarEnLegajo(r, true, fichaDe());
  }
  const l = leerLegajo();
  assert.equal(l.partidas.length, CUANTAS_PARTIDAS);
  assert.deepEqual(
    l.partidas.map((p) => p.rival),
    ["cachila", "beto", "el-melo"],
    "se queda con las más nuevas",
  );
});

// ─── Lo que venga de afuera ─────────────────────────────────────────────────

test("basura en localStorage no rompe nada", () => {
  for (const basura of ['{"partidas":', "null", "[]", '"texto"', "42", '{"partidas":"no"}', ""]) {
    almacen.clear();
    almacen.set(CLAVE, basura);
    assert.deepEqual(leerLegajo(), LEGAJO_VACIO, `se cayó con: ${basura}`);
  }
});

test("una entrada rota se descarta SOLA, sin llevarse a las buenas", () => {
  almacen.clear();
  guardarLegajo({
    version: 1,
    partidas: [
      { rival: "luki", cuando: 1, ganaste: true, ficha: fichaDe() },
      { rival: "NO VALE", cuando: 2, ganaste: true, ficha: fichaDe() },
      { rival: "beto", cuando: 3, ganaste: false, ficha: fichaDe() },
    ],
  });
  const l = leerLegajo();
  assert.deepEqual(l.partidas.map((p) => p.rival), ["luki", "beto"]);
});

test("los contadores inventados se caen: negativos, gigantes, textos y NaN", () => {
  for (const valor of [-1, 1e9, "8", NaN, Infinity, 2.5, null, {}]) {
    almacen.clear();
    almacen.set(
      CLAVE,
      JSON.stringify({
        version: 1,
        partidas: [{ rival: "luki", cuando: 1, ganaste: true, ficha: fichaDe({ envidosFlojos: valor as number }) }],
      }),
    );
    assert.equal(leerLegajo().partidas.length, 0, `se coló un envidosFlojos = ${String(valor)}`);
  }
});

test("una ficha a la que le falta un campo no entra", () => {
  almacen.clear();
  const incompleta = fichaDe() as Record<string, unknown>;
  delete incompleta.mazos;
  almacen.set(CLAVE, JSON.stringify({ version: 1, partidas: [{ rival: "luki", cuando: 1, ganaste: true, ficha: incompleta }] }));
  assert.equal(leerLegajo().partidas.length, 0);
});

test("NO SE PUEDE FABRICAR UN BOT OMNISCIENTE: las cuentas tienen que cerrar", () => {
  // El ataque que importa acá no es romper la página: es escribir a mano un
  // legajo que le haga creer al rival que mentiste veinte veces en diez manos,
  // o al revés, que sos un santo. Las dos cosas le cambian cómo te juega.
  const imposibles: Record<string, number>[] = [
    { envidosFlojos: 99, envidosCantados: 4 },   // mintió más veces de las que cantó
    { trucosNoQueridos: 99, trucosRecibidos: 8 }, // se achicó más veces de las que le cantaron
    { manosVistas: 999, manosJugadas: 10 },       // vio más manos de las que se jugaron
    { tantoAltoCallado: 99, manosConCartas: 6 },  // se calló en manos que no existieron
  ];
  for (const trampa of imposibles) {
    almacen.clear();
    almacen.set(
      CLAVE,
      JSON.stringify({ version: 1, partidas: [{ rival: "luki", cuando: 1, ganaste: true, ficha: fichaDe(trampa) }] }),
    );
    assert.equal(leerLegajo().partidas.length, 0, `entró una cuenta imposible: ${JSON.stringify(trampa)}`);
  }
});

test("una clave de prototipo no se cuela por la ficha", () => {
  almacen.clear();
  almacen.set(
    CLAVE,
    '{"version":1,"partidas":[{"rival":"luki","cuando":1,"ganaste":true,"ficha":{"__proto__":{"manosJugadas":9}}}]}',
  );
  assert.equal(leerLegajo().partidas.length, 0);
  assert.equal(fichaVacia().manosJugadas, 0, "el prototipo de Ficha quedó tocado");
});

test("EL LEGAJO NO GUARDA CARTAS, Y NO PUEDE EMPEZAR A GUARDARLAS", () => {
  // Si alguien agrega a `Ficha` un campo con una carta adentro, el bot pasaría
  // a acordarse de cartas que vio en OTRA partida, que es exactamente la
  // trampa que `lectura.ts` promete no hacer. Esto lo agarra.
  almacen.clear();
  anotarEnLegajo("el-melo", true, fichaDe());
  const guardado = leerLegajo().partidas[0].ficha;
  assert.deepEqual(
    Object.keys(guardado).sort(),
    [...CAMPOS_FICHA].sort(),
    "la ficha guardada tiene campos que no son los contadores de lectura.ts",
  );
  for (const v of Object.values(guardado)) {
    assert.equal(typeof v, "number", "un campo de la ficha guardada no es un número");
  }
});

// ─── La siembra ─────────────────────────────────────────────────────────────

test("con memoria en 0 el rival se sienta sin saber nada", () => {
  almacen.clear();
  anotarEnLegajo("el-melo", true, fichaDe());
  assert.deepEqual(fichaSembrada(leerLegajo(), 0), fichaVacia());
});

test("con memoria el rival arranca sabiendo, y lo viejo pesa menos que lo nuevo", () => {
  almacen.clear();
  anotarEnLegajo("a", true, fichaDe({ envidosFlojos: 0, envidosCantados: 4 })); // vieja: honesto
  anotarEnLegajo("b", true, fichaDe({ envidosFlojos: 4, envidosCantados: 4 })); // nueva: mentiroso
  const f = fichaSembrada(leerLegajo(), 1);

  assert.ok(f.manosJugadas > 0, "no se sembró nada");
  // La partida nueva pesa 0,5 y la vieja 0,3: la tasa tiene que tirar para el
  // lado de la nueva, o sea más cerca de mentiroso que de honesto.
  assert.ok(
    f.envidosFlojos / f.envidosCantados > 0.5,
    `lo viejo pesó más que lo nuevo: ${f.envidosFlojos}/${f.envidosCantados}`,
  );
});

test("EL TOPE: por más partidas que junte, el legajo nunca pesa más que seis manos", () => {
  // Sin esto, tres partidas largas entraban con veinte manos de evidencia y el
  // bot quedaba clavado en la idea que se había hecho: un rival sordo, que no
  // se puede reeducar jugando. Eso es injusto, no difícil.
  almacen.clear();
  for (const r of ["a", "b", "c"]) {
    anotarEnLegajo(r, true, fichaDe({ manosJugadas: 60, manosVistas: 40, manosConCartas: 50 }));
  }
  const f = fichaSembrada(leerLegajo(), 1);
  assert.ok(
    f.manosJugadas <= TOPE_SIEMBRA + 1e-9,
    `el legajo entró con ${f.manosJugadas} manos, y el tope es ${TOPE_SIEMBRA}`,
  );
  // Y reescalado PAREJO: las tasas no pueden haberse deformado
  assert.ok(f.manosVistas < f.manosJugadas, "las proporciones se rompieron al recortar");
});

test("sembrar no puede inventar proporciones que el legajo no tenía", () => {
  almacen.clear();
  anotarEnLegajo("a", true, fichaDe({ manosJugadas: 20, envidosCantados: 10, envidosFlojos: 5, manosVistas: 10, manosConCartas: 10 }));
  const f = fichaSembrada(leerLegajo(), 1);
  assert.ok(Math.abs(f.envidosFlojos / f.envidosCantados - 0.5) < 1e-9, "la tasa cambió al sembrar");
});

test("EL VIAJE REDONDO: sembrar, jugar y anotar, tres partidas seguidas", () => {
  /* ÉSTE es el test que faltaba, y sin él pasó lo siguiente sin que nada
     avisara: `fichaSembrada` devuelve números FRACCIONARIOS a propósito —lo
     viejo pesa menos—, y el saneador exige enteros al guardar. La mesa sembraba
     y observaba sobre la MISMA ficha, así que al terminar la partida mandaba al
     legajo una ficha con decimales, `sanearEntrada` la rechazaba y
     `anotarEnLegajo` volvía sin guardar, en silencio.

     Resultado: contra los ★1 al ★3 el legajo andaba (siembran vacío, o sea
     enteros) y contra los ★4 y ★5 se anotaba la primera partida y nunca más.
     Justo los dos únicos rivales para los que el legajo existe.

     Los tests de antes no lo veían porque llamaban a `anotarEnLegajo` con
     fichas enteras escritas a mano y nunca cerraban el círculo. */
  almacen.clear();
  for (let partida = 1; partida <= 3; partida++) {
    // 1. el rival se sienta con lo que se acuerda
    const arranque = fichaSembrada(leerLegajo(), 1);
    // 2. juega la partida: lo de la mesa se cuenta APARTE, en enteros
    const deEstaPartida = fichaDe();
    // 3. y lo que se guarda es lo de esta partida, no la suma
    anotarEnLegajo("el-melo", partida % 2 === 0, deEstaPartida);

    assert.equal(
      leerLegajo().partidas.length,
      partida,
      `después de la partida ${partida} el legajo tiene ${leerLegajo().partidas.length}: se perdió alguna`,
    );
    if (partida > 1) {
      assert.ok(arranque.manosJugadas > 0, "a la segunda ya se tenía que acordar de algo");
    }
  }
});

test("una ficha con decimales NO entra al legajo, y por eso se guarda la observada", () => {
  // La otra mitad del bug de arriba, dicha al derecho: esto es lo que el
  // saneador tiene que seguir haciendo. Si algún día acepta decimales, el que
  // lo cambie tiene que venir a leer por qué estaban prohibidos.
  almacen.clear();
  // 9 manos por el 0,5 que pesa la última partida dan 4,5: el decimal es el
  // punto del test, así que la ficha se elige para que salga uno.
  anotarEnLegajo("luki", true, fichaDe({ manosJugadas: 9 }));
  const conDecimales = fichaSembrada(leerLegajo(), 1);
  assert.ok(
    !Number.isInteger(conDecimales.manosJugadas),
    "la siembra tiene que traer decimales, si no este test no prueba nada",
  );

  almacen.clear();
  anotarEnLegajo("luki", true, conDecimales);
  assert.equal(leerLegajo().partidas.length, 0, "una ficha sembrada no se puede volver a guardar");
});

test("sumar dos fichas suma campo por campo y no inventa nada", () => {
  const a = { ...fichaVacia(), manosJugadas: 3, envidosCantados: 2 };
  const b = { ...fichaVacia(), manosJugadas: 4, envidosFlojos: 1 };
  const suma = sumarFichas(a, b);
  assert.equal(suma.manosJugadas, 7);
  assert.equal(suma.envidosCantados, 2);
  assert.equal(suma.envidosFlojos, 1);
  assert.deepEqual(Object.keys(suma).sort(), [...CAMPOS_FICHA].sort());
  assert.equal(a.manosJugadas, 3, "no puede tocar las que le pasaron");
});

test("borrar deja el legajo en cero", () => {
  almacen.clear();
  anotarEnLegajo("luki", true, fichaDe());
  borrarLegajo();
  assert.deepEqual(leerLegajo(), LEGAJO_VACIO);
});

test("sanear nunca lanza, le tires lo que le tires", () => {
  for (const v of [null, undefined, 0, "", [], {}, { partidas: [null, 1, "x", {}] }, new Date()]) {
    assert.doesNotThrow(() => sanear(v));
  }
});
