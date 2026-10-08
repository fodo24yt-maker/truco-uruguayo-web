/**
 * Las reglas de los anuncios, con un reloj y una red de anuncios de mentira.
 *
 * Así se prueba "a los 3 minutos sí, a los 2 no" sin esperar tres minutos ni
 * tener un teléfono enchufado. Cada test es una de las reglas que pidió
 * Santiago el 2/10/2026, con el número de la regla en el nombre cuando lo hay.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  type EventoMotor,
  type Formato,
  type MotorAnuncios,
  MINUTOS_ENTRE_ANUNCIOS,
  MINUTOS_SIN_INTERSTICIAL_TRAS_VIDEO,
  SEGUNDOS_SIN_CARGAR_AL_ENTRAR,
  crearGestor,
  tocaIntersticial,
} from "./anuncios.ts";

const MIN = 60_000;

// ── Un reloj que avanza cuando el test quiere ──
function relojFalso() {
  let t = 0;
  const tareas: { en: number; fn: () => void; viva: boolean }[] = [];
  return {
    ahora: () => t,
    esperar(ms: number, fn: () => void) {
      const tarea = { en: t + ms, fn, viva: true };
      tareas.push(tarea);
      return () => {
        tarea.viva = false;
      };
    },
    avanzar(ms: number) {
      const fin = t + ms;
      for (;;) {
        tareas.sort((a, b) => a.en - b.en);
        const i = tareas.findIndex((x) => x.viva && x.en <= fin);
        if (i < 0) break;
        const [tarea] = tareas.splice(i, 1);
        t = tarea.en;
        tarea.fn();
      }
      t = fin;
    },
  };
}

// ── Una red de anuncios de mentira ──
function motorFalso() {
  let oyente: (e: EventoMotor) => void = () => {};
  const m = {
    cargaFalla: false,
    mostrarFalla: false,
    cargas: [] as Formato[],
    mostrados: [] as Formato[],
    iniciar: async () => ({ puedePedir: true, pidePrivacidad: false }),
    cargar: async (f: Formato) => {
      m.cargas.push(f);
      if (m.cargaFalla) throw new Error("sin fill");
    },
    mostrar: (f: Formato) => {
      m.mostrados.push(f);
      return new Promise((_, rechazar) => {
        if (m.mostrarFalla) rechazar(new Error("no había"));
      });
    },
    alEvento: (fn: (e: EventoMotor) => void) => {
      oyente = fn;
    },
    abrirPrivacidad: async () => ({ puedePedir: true, pidePrivacidad: false }),
    emitir: (e: EventoMotor) => oyente(e),
  };
  return m;
}

/** Deja correr las promesas pendientes. */
const vaciar = () => new Promise<void>((r) => setImmediate(r));

async function armar(opciones: { aprendiendo?: boolean; cargaFalla?: boolean } = {}) {
  const reloj = relojFalso();
  const motor = motorFalso();
  // Antes de conectar: desde el 3/10/2026 el intersticial se carga al arrancar.
  motor.cargaFalla = opciones.cargaFalla ?? false;
  const g = crearGestor({ reloj, enAprender: () => opciones.aprendiendo ?? false });
  await g.conectar(motor as unknown as MotorAnuncios);
  await vaciar();
  return { reloj, motor, g };
}

/** Entra a una partida y dice si hubo anuncio. Si lo hubo, lo cierra. */
async function entrar(x: Awaited<ReturnType<typeof armar>>): Promise<boolean> {
  const espera = x.g.alEntrarAPartida();
  await vaciar();
  if (espera === null) return false;
  x.motor.emitir({ tipo: "mostrado", formato: "intersticial" });
  x.motor.emitir({ tipo: "cerrado", formato: "intersticial" });
  await espera;
  await vaciar();
  return true;
}

// ───────────────────────── La regla pura ─────────────────────────

test("regla: la primera partida de la sesión nunca lleva anuncio", () => {
  const t = { inicioSesion: 0, ultimoAnuncio: null, ultimoVideo: null, huboPrimeraPartida: false };
  assert.equal(tocaIntersticial(t, 60 * MIN), false);
});

test("regla: el tope desde que se abrió la app o desde el último anuncio", () => {
  const t = { inicioSesion: 0, ultimoAnuncio: null, ultimoVideo: null, huboPrimeraPartida: true };
  assert.equal(tocaIntersticial(t, 2 * MIN), false);
  assert.equal(tocaIntersticial(t, MINUTOS_ENTRE_ANUNCIOS * MIN - 1), false);
  assert.equal(tocaIntersticial(t, MINUTOS_ENTRE_ANUNCIOS * MIN), true);
  const conAnuncio = { ...t, ultimoAnuncio: 10 * MIN };
  assert.equal(tocaIntersticial(conAnuncio, (10 + MINUTOS_ENTRE_ANUNCIOS) * MIN - 1), false);
  assert.equal(tocaIntersticial(conAnuncio, (10 + MINUTOS_ENTRE_ANUNCIOS) * MIN), true);
});

test("regla: la ventana sin intersticial después de un video", () => {
  const t = { inicioSesion: 0, ultimoAnuncio: 20 * MIN, ultimoVideo: 20 * MIN, huboPrimeraPartida: true };
  assert.equal(
    tocaIntersticial(t, (20 + MINUTOS_ENTRE_ANUNCIOS) * MIN),
    false,
    "el tope común ya se cumplió, pero rige la ventana del video",
  );
  assert.equal(tocaIntersticial(t, (20 + MINUTOS_SIN_INTERSTICIAL_TRAS_VIDEO) * MIN - 1), false);
  assert.equal(tocaIntersticial(t, (20 + MINUTOS_SIN_INTERSTICIAL_TRAS_VIDEO) * MIN), true);
});

test("las perillas: la ventana del video es más larga que el tope común", () => {
  // Si no, la ventana no haría nada: el tope común ya la cubriría.
  assert.ok(MINUTOS_SIN_INTERSTICIAL_TRAS_VIDEO > MINUTOS_ENTRE_ANUNCIOS);
  assert.ok(MINUTOS_ENTRE_ANUNCIOS > 0);
});

test("regla: si el reloj va para atrás, no sale nada", () => {
  const t = { inicioSesion: 100 * MIN, ultimoAnuncio: null, ultimoVideo: null, huboPrimeraPartida: true };
  assert.equal(tocaIntersticial(t, 0), false);
});

// ───────────────────────── El intersticial ─────────────────────────

test("partida de 2 minutos y otra: NO; partida de 7 y otra: SÍ", async () => {
  const x = await armar();
  assert.equal(await entrar(x), false, "la primera nunca");
  x.reloj.avanzar(2 * MIN);
  assert.equal(await entrar(x), false, "a los 2 minutos de abrir, no");
  x.reloj.avanzar(5 * MIN);
  assert.equal(await entrar(x), true, "a los 7, sí");
  x.reloj.avanzar(2 * MIN);
  assert.equal(await entrar(x), false, "2 minutos después del anuncio, no");
  x.reloj.avanzar(7 * MIN);
  assert.equal(await entrar(x), true, "7 minutos después del anuncio, sí");
});

test("la primera partida no lleva anuncio aunque hayan pasado 10 minutos en Aprender", async () => {
  const x = await armar();
  x.reloj.avanzar(10 * MIN);
  assert.equal(await entrar(x), false);
});

test("el intersticial se precarga al abrir la app, y NO al entrar a la primera partida", async () => {
  const x = await armar();
  assert.deepEqual(x.motor.cargas, ["intersticial"], "al arrancar, en la pantalla de carga");
  await entrar(x);
  assert.deepEqual(x.motor.cargas, ["intersticial"], "entrar a jugar no carga nada");
});

test("si no carga (sin fill, sin internet), se pasa directo", async () => {
  const x = await armar({ cargaFalla: true });
  await entrar(x);
  x.reloj.avanzar(10 * MIN);
  assert.equal(x.g.alEntrarAPartida(), null);
});

test("si mostrar rechaza, el usuario pasa en el acto", async () => {
  const x = await armar();
  await entrar(x);
  x.reloj.avanzar(7 * MIN);
  x.motor.mostrarFalla = true;
  const espera = x.g.alEntrarAPartida();
  assert.notEqual(espera, null);
  await espera; // si no resolviera, el test se colgaría
});

test("si el anuncio nunca aparece, a los 3 segundos se pasa igual", async () => {
  const x = await armar();
  await entrar(x);
  x.reloj.avanzar(7 * MIN);
  const espera = x.g.alEntrarAPartida();
  let paso = false;
  void espera!.then(() => {
    paso = true;
  });
  await vaciar();
  assert.equal(paso, false);
  x.reloj.avanzar(3000);
  await vaciar();
  assert.equal(paso, true);
});

test("al volver a la app sin aviso de cierre, se da por cerrado", async () => {
  const x = await armar();
  await entrar(x);
  x.reloj.avanzar(7 * MIN);
  const espera = x.g.alEntrarAPartida();
  x.motor.emitir({ tipo: "mostrado", formato: "intersticial" });
  x.motor.emitir({ tipo: "volvio" });
  x.reloj.avanzar(1500);
  await espera; // se colgaría si no
});

test("con una partida en curso no sale nada, aunque toque", async () => {
  const x = await armar();
  await entrar(x);
  x.reloj.avanzar(7 * MIN);
  x.g.marcarPartidaEnCurso(true);
  assert.equal(x.g.alEntrarAPartida(), null);
  x.g.marcarPartidaEnCurso(false);
  assert.notEqual(x.g.alEntrarAPartida(), null);
});

test("en Aprender no sale nada, nunca", async () => {
  const x = await armar({ aprendiendo: true });
  await entrar(x);
  x.reloj.avanzar(30 * MIN);
  assert.equal(x.g.alEntrarAPartida(), null);
  assert.equal(await x.g.verVideo(() => {}), "no-disponible");
});

test("no se precarga el mismo formato mientras está en pantalla (el plugin lo borraría)", async () => {
  const x = await armar();
  await entrar(x);
  x.reloj.avanzar(7 * MIN);
  const antes = x.motor.cargas.length;
  const espera = x.g.alEntrarAPartida();
  x.motor.emitir({ tipo: "mostrado", formato: "intersticial" });
  await vaciar();
  assert.equal(x.motor.cargas.length, antes, "con el anuncio en pantalla, no carga otro");
  x.motor.emitir({ tipo: "cerrado", formato: "intersticial" });
  await espera;
  await vaciar();
  assert.equal(x.motor.cargas.length, antes, "al cerrarse se entra a la mesa: espera la ventana");
  x.reloj.avanzar(SEGUNDOS_SIN_CARGAR_AL_ENTRAR * 1000);
  await vaciar();
  assert.equal(x.motor.cargas.length, antes + 1, "cumplida la ventana, sí");
});

test("sin internet un rato: al volver la conexión, la próxima partida ya lleva anuncio", async () => {
  const x = await armar({ cargaFalla: true }); // la carga del arranque falla
  await entrar(x); // primera
  for (let i = 0; i < 6; i++) {
    x.reloj.avanzar(10 * MIN); // los reintentos fallan
    assert.equal(await entrar(x), false, "sin internet se juega igual");
  }
  x.motor.cargaFalla = false;
  x.reloj.avanzar(5 * MIN); // el próximo reintento carga
  await vaciar();
  assert.equal(await entrar(x), true);
});

test("un anuncio cargado hace más de 55 minutos no se muestra: se recarga", async () => {
  const x = await armar();
  await entrar(x);
  x.reloj.avanzar(60 * MIN);
  assert.equal(x.g.alEntrarAPartida(), null);
  await vaciar();
  assert.equal(x.motor.cargas.filter((f) => f === "intersticial").length, 1, "no al entrar");
  x.reloj.avanzar(SEGUNDOS_SIN_CARGAR_AL_ENTRAR * 1000);
  await vaciar();
  assert.equal(x.motor.cargas.filter((f) => f === "intersticial").length, 2, "pasada la ventana");
});

// ─────────────── La ventana sin cargas al entrar (3/10/2026) ───────────────

test("al entrar a una partida no se carga nada hasta que se cumple la ventana", async () => {
  const x = await armar();
  await entrar(x);
  x.g.quererVideo(true); // p. ej., la mesa de la Gira refresca los candados al montarse
  await vaciar();
  assert.equal(x.motor.cargas.includes("video"), false, "adentro de la ventana, nada");
  x.reloj.avanzar(SEGUNDOS_SIN_CARGAR_AL_ENTRAR * 1000 - 1);
  await vaciar();
  assert.equal(x.motor.cargas.includes("video"), false, "un milisegundo antes, tampoco");
  x.reloj.avanzar(1);
  await vaciar();
  assert.equal(x.motor.cargas.includes("video"), true, "cumplida, sale lo que esperaba");
});

test("un reintento que cae adentro de la ventana espera a que se cumpla", async () => {
  const x = await armar({ cargaFalla: true }); // falla al arrancar: reintento a los 30 s
  x.motor.cargaFalla = false;
  x.reloj.avanzar(25_000);
  await entrar(x); // la ventana va de los 25 s a los 33 s
  x.reloj.avanzar(6_000); // a los 31 s le tocaba el reintento
  await vaciar();
  assert.equal(x.motor.cargas.length, 1, "el reintento no cae al entrar");
  x.reloj.avanzar(2_000);
  await vaciar();
  assert.equal(x.motor.cargas.length, 2, "sale al cumplirse la ventana");
});

test("después de un anuncio, la ventana cuenta desde que se cierra y no desde el toque", async () => {
  const x = await armar();
  await entrar(x);
  x.reloj.avanzar((MINUTOS_ENTRE_ANUNCIOS + 1) * MIN);
  const antes = x.motor.cargas.length;
  const espera = x.g.alEntrarAPartida();
  x.motor.emitir({ tipo: "mostrado", formato: "intersticial" });
  x.reloj.avanzar(20_000); // un anuncio de 20 s: más largo que la ventana
  x.motor.emitir({ tipo: "cerrado", formato: "intersticial" });
  await espera;
  await vaciar();
  assert.equal(x.motor.cargas.length, antes, "al entrar a la mesa después del anuncio, nada");
  x.reloj.avanzar(SEGUNDOS_SIN_CARGAR_AL_ENTRAR * 1000);
  await vaciar();
  assert.equal(x.motor.cargas.length, antes + 1);
});

test("el video que la persona pidió (abrió el diálogo) no espera la ventana", async () => {
  const x = await armar();
  await entrar(x);
  x.g.quererVideo(true);
  x.g.prepararVideo();
  await vaciar();
  assert.equal(x.motor.cargas.includes("video"), true);
});

// ───────────────────────── El video ─────────────────────────

async function conVideo() {
  const x = await armar();
  x.g.quererVideo(true);
  await vaciar();
  return x;
}

test("el video sólo se precarga si queda algo bloqueado", async () => {
  const x = await armar();
  assert.equal(x.motor.cargas.includes("video"), false);
  x.g.quererVideo(true);
  await vaciar();
  assert.equal(x.motor.cargas.includes("video"), true);
});

test("cerrar el video antes de tiempo NO da la recompensa", async () => {
  const x = await conVideo();
  let gano = false;
  const r = x.g.verVideo(() => {
    gano = true;
  });
  x.motor.emitir({ tipo: "mostrado", formato: "video" });
  x.motor.emitir({ tipo: "cerrado", formato: "video" });
  x.reloj.avanzar(1000);
  assert.equal(await r, "cerrado-antes");
  assert.equal(gano, false);
});

test("la recompensa se da en el evento de recompensa, ANTES del cierre", async () => {
  const x = await conVideo();
  let gano = false;
  const r = x.g.verVideo(() => {
    gano = true;
  });
  x.motor.emitir({ tipo: "mostrado", formato: "video" });
  x.motor.emitir({ tipo: "recompensa" });
  assert.equal(gano, true, "ya quedó dado, aunque el video siga en pantalla");
  x.motor.emitir({ tipo: "cerrado", formato: "video" });
  assert.equal(await r, "ganado");
});

test("una recompensa que llega apenas después del cierre también cuenta", async () => {
  const x = await conVideo();
  let gano = false;
  const r = x.g.verVideo(() => {
    gano = true;
  });
  x.motor.emitir({ tipo: "mostrado", formato: "video" });
  x.motor.emitir({ tipo: "cerrado", formato: "video" });
  x.motor.emitir({ tipo: "recompensa" });
  assert.equal(await r, "ganado");
  assert.equal(gano, true);
});

test("sin video cargado: no disponible, y no se desbloquea nada", async () => {
  const x = await armar();
  x.motor.cargaFalla = true;
  x.g.quererVideo(true);
  await vaciar();
  let gano = false;
  assert.equal(await x.g.verVideo(() => (gano = true)), "no-disponible");
  assert.equal(gano, false);
  assert.equal(x.g.estadoVideo(), "no-disponible");
});

test("el botón dice 'cargando' y a los 15 segundos 'no disponible'", async () => {
  const x = await armar();
  x.motor.cargar = () => new Promise(() => {}); // carga eterna
  x.g.quererVideo(true);
  x.g.prepararVideo();
  assert.equal(x.g.estadoVideo(), "cargando");
  x.reloj.avanzar(15_000);
  assert.equal(x.g.estadoVideo(), "no-disponible");
});

test("si el video falla al mostrarse, no disponible", async () => {
  const x = await conVideo();
  x.motor.mostrarFalla = true;
  assert.equal(await x.g.verVideo(() => {}), "no-disponible");
});

test("después de un video, la ventana sin intersticial", async () => {
  const x = await conVideo();
  await entrar(x); // primera partida
  x.reloj.avanzar(1 * MIN);
  const r = x.g.verVideo(() => {});
  x.motor.emitir({ tipo: "mostrado", formato: "video" });
  x.motor.emitir({ tipo: "recompensa" });
  x.motor.emitir({ tipo: "cerrado", formato: "video" });
  assert.equal(await r, "ganado");
  assert.equal(await entrar(x), false, "desbloquear y entrar enseguida: nada");
  x.reloj.avanzar(MINUTOS_ENTRE_ANUNCIOS * MIN);
  assert.equal(await entrar(x), false, "pasado el tope común, todavía rige la del video");
  x.reloj.avanzar((MINUTOS_SIN_INTERSTICIAL_TRAS_VIDEO - MINUTOS_ENTRE_ANUNCIOS) * MIN + 1000);
  assert.equal(await entrar(x), true, "pasada la ventana del video, sí");
});

test("con un anuncio en pantalla no se puede pedir otro (doble toque)", async () => {
  const x = await armar();
  await entrar(x);
  x.reloj.avanzar(7 * MIN);
  const primero = x.g.alEntrarAPartida();
  assert.notEqual(primero, null);
  assert.equal(x.g.alEntrarAPartida(), null, "no abre un segundo anuncio");
  assert.equal(x.motor.mostrados.length, 1);
});

test("sin red de anuncios (la web), nunca hay nada", () => {
  const reloj = relojFalso();
  const g = crearGestor({ reloj, enAprender: () => false });
  reloj.avanzar(60 * MIN);
  assert.equal(g.alEntrarAPartida(), null);
  reloj.avanzar(60 * MIN);
  assert.equal(g.alEntrarAPartida(), null);
  assert.equal(g.estadoVideo(), "no-disponible");
});

// ─────────── Lo que espera la pantalla de carga (3/10/2026) ───────────

/**
 * Una red de anuncios cuyas cargas quedan colgadas hasta que el test las
 * suelta: así se ve qué hace `cargasQuietas` MIENTRAS se carga.
 */
function motorDeMano(opciones: { puedePedir?: boolean } = {}) {
  const pendientes = new Map<Formato, { bien: () => void; mal: () => void }>();
  const m = {
    iniciar: async () => ({ puedePedir: opciones.puedePedir ?? true, pidePrivacidad: false }),
    cargar: (f: Formato) =>
      new Promise<void>((bien, mal) => {
        pendientes.set(f, { bien, mal: () => mal(new Error("sin fill")) });
      }),
    mostrar: () => new Promise<void>(() => {}),
    alEvento: () => {},
    abrirPrivacidad: async () => ({ puedePedir: true, pidePrivacidad: false }),
    soltar(f: Formato, como: "bien" | "mal") {
      const p = pendientes.get(f);
      assert.ok(p, `no había una carga de ${f} esperando`);
      pendientes.delete(f);
      p[como]();
    },
  };
  return m;
}

/** Dice si la promesa ya se cumplió, sin esperarla. */
async function cumplida(p: Promise<unknown>): Promise<boolean> {
  let ya = false;
  void p.then(() => {
    ya = true;
  });
  await vaciar();
  return ya;
}

test("cargas quietas: sin red de anuncios (la web) se cumple enseguida", async () => {
  const g = crearGestor({ reloj: relojFalso(), enAprender: () => false });
  assert.equal(await cumplida(g.cargasQuietas()), true);
});

test("cargas quietas: si no se pueden pedir anuncios (sin consentimiento), enseguida", async () => {
  const g = crearGestor({ reloj: relojFalso(), enAprender: () => false });
  await g.conectar(motorDeMano({ puedePedir: false }) as unknown as MotorAnuncios);
  assert.equal(await cumplida(g.cargasQuietas()), true);
});

test("cargas quietas: espera el intersticial Y el video del arranque", async () => {
  const motor = motorDeMano();
  const g = crearGestor({ reloj: relojFalso(), enAprender: () => false });
  g.quererVideo(true); // queda algo bloqueado: también se carga el video
  await g.conectar(motor as unknown as MotorAnuncios);
  const quietas = g.cargasQuietas();
  assert.equal(await cumplida(quietas), false, "con las dos cargando, todavía no");
  motor.soltar("intersticial", "bien");
  assert.equal(await cumplida(quietas), false, "falta el video");
  motor.soltar("video", "bien");
  assert.equal(await cumplida(quietas), true);
});

test("cargas quietas: una carga que falla cuenta como terminada (no espera el reintento)", async () => {
  const motor = motorDeMano();
  const g = crearGestor({ reloj: relojFalso(), enAprender: () => false });
  await g.conectar(motor as unknown as MotorAnuncios);
  const quietas = g.cargasQuietas();
  assert.equal(await cumplida(quietas), false);
  motor.soltar("intersticial", "mal");
  assert.equal(await cumplida(quietas), true);
});

test("cargas quietas: si no queda nada bloqueado, sólo espera el intersticial", async () => {
  const motor = motorDeMano();
  const g = crearGestor({ reloj: relojFalso(), enAprender: () => false });
  await g.conectar(motor as unknown as MotorAnuncios);
  const quietas = g.cargasQuietas();
  motor.soltar("intersticial", "bien");
  assert.equal(await cumplida(quietas), true);
});

test("cargas quietas: pedida ANTES de que termine el arranque, espera también las cargas", async () => {
  const motor = motorDeMano();
  const g = crearGestor({ reloj: relojFalso(), enAprender: () => false });
  const conectado = g.conectar(motor as unknown as MotorAnuncios);
  const quietas = g.cargasQuietas(); // el arranque todavía no terminó
  await conectado;
  assert.equal(await cumplida(quietas), false, "terminó el arranque, pero el intersticial sigue cargando");
  motor.soltar("intersticial", "bien");
  assert.equal(await cumplida(quietas), true);
});
