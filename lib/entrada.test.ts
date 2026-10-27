/**
 * El punto de entrada único, con un gestor de anuncios de mentira.
 *
 * Lo que se prueba es el portero: candados, doble toque, que entrar a jugar
 * nunca lleve anuncio (sólo dejar el cartel de una partida terminada), que la
 * revancha reparta en el lugar y que volver de un anuncio lleve a la pantalla
 * correcta.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { crearPortero, hrefDe } from "./entrada.ts";
import type { Desbloqueable } from "./desbloqueos.ts";
import type { ResultadoVideo } from "./anuncios.ts";

const vaciar = () => new Promise<void>((r) => setImmediate(r));

function armar(op: { app?: boolean; anotador?: boolean; gira?: boolean; anuncio?: boolean } = {}) {
  let t = 0;
  let ruta = "/jugar";
  const candados = { anotador: op.anotador ?? true, gira: op.gira ?? true, acertados: 3 };
  const navegaciones: string[] = [];
  const desbloqueados: Desbloqueable[] = [];
  let soltarAnuncio: () => void = () => {};
  let resultadoVideo: ResultadoVideo = "ganado";
  const llamadas = { anuncios: 0, entradas: 0, enCurso: [] as boolean[], prepararVideo: 0 };

  const p = crearPortero({
    gestor: {
      alEntrarAPartida: () => {
        llamadas.entradas++;
      },
      alDejarPartidaTerminada: () => {
        llamadas.anuncios++;
        if (!op.anuncio) return null;
        return new Promise<void>((r) => {
          soltarAnuncio = r;
        });
      },
      verVideo: async (alGanar) => {
        if (resultadoVideo === "ganado") alGanar();
        return resultadoVideo;
      },
      prepararVideo: () => {
        llamadas.prepararVideo++;
      },
      quererVideo: () => {},
      marcarPartidaEnCurso: (b) => llamadas.enCurso.push(b),
    },
    esApp: () => op.app ?? true,
    ahora: () => t,
    rutaActual: () => ruta,
    leerCandados: () => ({ ...candados }),
    desbloquear: (que) => {
      desbloqueados.push(que);
      candados[que] = false;
    },
  });
  p.conectarNavegacion((href) => {
    navegaciones.push(href);
    ruta = href.split("?")[0];
  });
  return {
    p,
    navegaciones,
    desbloqueados,
    llamadas,
    avanzar: (ms: number) => (t += ms),
    irA: (r: string) => (ruta = r),
    soltarAnuncio: () => soltarAnuncio(),
    videoDa: (r: ResultadoVideo) => (resultadoVideo = r),
  };
}

test("en la web todo pasa directo: sin candados, sin anuncios", () => {
  const x = armar({ app: false });
  assert.equal(x.p.pedirPartidaDesdeEnlace({ modo: "gira" }), true);
  x.avanzar(2000);
  assert.equal(x.p.pedirAnotadorDesdeEnlace(), true);
  x.avanzar(2000);
  assert.equal(x.p.pedirPartidaDesdeEnlace({ modo: "rapida" }), true);
  assert.equal(x.p.leerDialogo(), null);
  assert.equal(x.llamadas.anuncios, 0);
  assert.equal(x.llamadas.entradas, 0);
});

test("Gira bloqueada: abre el diálogo y no entra", () => {
  const x = armar();
  assert.equal(x.p.pedirPartidaDesdeEnlace({ modo: "gira" }), false);
  assert.deepEqual(x.p.leerDialogo(), { que: "gira", aviso: null });
  assert.equal(x.llamadas.prepararVideo, 1, "pide el video apenas se abre");
  assert.deepEqual(x.navegaciones, []);
});

test("la parada del mapa también respeta el candado de la Gira", () => {
  const x = armar();
  assert.equal(x.p.pedirPartidaDesdeEnlace({ modo: "gira", depto: "rocha" }), false);
  assert.equal(x.p.leerDialogo()?.que, "gira");
  assert.equal(x.llamadas.anuncios, 0);
});

test("Partida rápida está libre desde el inicio", () => {
  const x = armar();
  assert.equal(x.p.pedirPartidaDesdeEnlace({ modo: "rapida" }), true);
  assert.equal(x.p.leerDialogo(), null);
});

test("anotador bloqueado: diálogo; desbloqueado: pasa", () => {
  const x = armar();
  assert.equal(x.p.pedirAnotadorDesdeEnlace(), false);
  assert.equal(x.p.leerDialogo()?.que, "anotador");
  const y = armar({ anotador: false });
  assert.equal(y.p.pedirAnotadorDesdeEnlace(), true);
});

test("ir al mapa de la Gira no consulta anuncios, ni cuenta como entrar a jugar", () => {
  const x = armar({ gira: false, anuncio: true });
  assert.equal(x.p.pedirPartidaDesdeEnlace({ modo: "gira" }), true);
  assert.equal(x.llamadas.anuncios, 0);
  assert.equal(x.llamadas.entradas, 0);
});

test("doble toque rápido: una sola entrada", () => {
  const x = armar({ gira: false });
  assert.equal(x.p.pedirPartidaDesdeEnlace({ modo: "rapida" }), true);
  assert.equal(x.p.pedirPartidaDesdeEnlace({ modo: "rapida" }), false);
  x.avanzar(1000);
  assert.equal(x.p.pedirPartidaDesdeEnlace({ modo: "rapida" }), true);
});

test("entrar a jugar desde un enlace NUNCA lleva anuncio, aunque toque", () => {
  const x = armar({ gira: false, anuncio: true });
  assert.equal(x.p.pedirPartidaDesdeEnlace({ modo: "rapida" }), true, "el enlace navega solo");
  x.avanzar(1000);
  assert.equal(x.p.pedirPartidaDesdeEnlace({ modo: "gira", depto: "cerro-largo" }), true);
  assert.equal(x.llamadas.anuncios, 0);
  assert.equal(x.llamadas.entradas, 2, "pero el gestor se entera de que se entró");
});

test("cambiar de rival a mitad de partida tampoco lleva anuncio: reparte en el acto", () => {
  const x = armar({ anuncio: true });
  x.irA("/jugar/mesa");
  let repartidas = 0;
  x.p.pedirPartida({ modo: "rapida" }, () => repartidas++);
  assert.equal(repartidas, 1);
  assert.equal(x.llamadas.anuncios, 0);
  assert.equal(x.llamadas.entradas, 1);
});

test("un botón que pide la mesa de un departamento navega ahí", () => {
  const x = armar({ gira: false });
  x.irA("/jugar/gira");
  x.p.pedirPartida({ modo: "gira", depto: "cerro-largo" });
  assert.deepEqual(x.navegaciones, ["/jugar/mesa?depto=cerro-largo"]);
});

test("la revancha: con anuncio, reparte en el lugar cuando se cierra, una vez, sin navegar", async () => {
  const x = armar({ anuncio: true });
  x.irA("/jugar/mesa");
  let repartidas = 0;
  x.p.pedirRevancha({ modo: "rapida" }, () => repartidas++);
  assert.equal(repartidas, 0, "no reparte con el anuncio en pantalla");
  assert.equal(x.llamadas.entradas, 0, "todavía no se entró");
  // tocar de nuevo mientras está el anuncio no hace nada
  x.avanzar(5000);
  x.p.pedirRevancha({ modo: "rapida" }, () => repartidas++);
  assert.equal(x.llamadas.anuncios, 1, "un solo anuncio");
  x.soltarAnuncio();
  await vaciar();
  assert.equal(repartidas, 1);
  assert.equal(x.llamadas.entradas, 1);
  assert.deepEqual(x.navegaciones, []);
});

test("la revancha sin anuncio reparte en el acto", () => {
  const x = armar({ gira: false });
  x.irA("/jugar/mesa");
  let repartidas = 0;
  x.p.pedirRevancha({ modo: "gira", depto: "rocha" }, () => repartidas++);
  assert.equal(repartidas, 1);
  assert.equal(x.llamadas.anuncios, 1, "se consultó");
  assert.equal(x.llamadas.entradas, 1);
});

test("si al cerrarse el anuncio ya se está en otra pantalla, no arrastra a nadie", async () => {
  const x = armar({ anuncio: true });
  x.irA("/jugar/mesa");
  let repartidas = 0;
  x.p.pedirRevancha({ modo: "rapida" }, () => repartidas++);
  x.irA("/jugar");
  x.soltarAnuncio();
  await vaciar();
  assert.equal(repartidas, 0);
  assert.equal(x.llamadas.entradas, 0);
  assert.deepEqual(x.navegaciones, []);
});

test("dejar el cartel de fin (volver al mapa, cambiar de rival): anuncio y después lo que se pidió", async () => {
  const x = armar({ anuncio: true });
  x.irA("/jugar/mesa");
  let siguio = 0;
  x.p.dejarPartidaTerminada(() => siguio++);
  assert.equal(siguio, 0, "con el anuncio en pantalla, nada");
  x.avanzar(5000);
  x.p.dejarPartidaTerminada(() => siguio++);
  x.soltarAnuncio();
  await vaciar();
  assert.equal(siguio, 1, "una sola vez");
  assert.equal(x.llamadas.anuncios, 1);
  assert.equal(x.llamadas.entradas, 0, "dejar el cartel no es entrar a una partida");
});

test("dejar el cartel de fin sin anuncio sigue en el acto, y en la web ni pregunta", () => {
  const x = armar();
  let siguio = 0;
  x.p.dejarPartidaTerminada(() => siguio++);
  assert.equal(siguio, 1);
  const y = armar({ app: false, anuncio: true });
  y.p.dejarPartidaTerminada(() => siguio++);
  assert.equal(siguio, 2);
  assert.equal(y.llamadas.anuncios, 0);
});

test("video completo: desbloquea y lleva a lo que se pidió", async () => {
  const x = armar();
  x.p.pedirAnotadorDesdeEnlace();
  await x.p.verVideoParaDesbloquear();
  assert.deepEqual(x.desbloqueados, ["anotador"]);
  assert.equal(x.p.leerDialogo(), null);
  assert.deepEqual(x.navegaciones, ["/anotador"]);
});

test("video cerrado antes: no desbloquea, el diálogo lo dice", async () => {
  const x = armar();
  x.videoDa("cerrado-antes");
  x.p.pedirPartidaDesdeEnlace({ modo: "gira" });
  await x.p.verVideoParaDesbloquear();
  assert.deepEqual(x.desbloqueados, []);
  assert.deepEqual(x.p.leerDialogo(), { que: "gira", aviso: "cerrado-antes" });
  assert.deepEqual(x.navegaciones, []);
});

test("video no disponible: no desbloquea, se ofrece Aprender", async () => {
  const x = armar();
  x.videoDa("no-disponible");
  x.p.pedirPartidaDesdeEnlace({ modo: "gira" });
  await x.p.verVideoParaDesbloquear();
  assert.equal(x.p.leerDialogo()?.aviso, "no-disponible");
  x.p.irAAprender();
  assert.deepEqual(x.navegaciones, ["/aprender"]);
  assert.equal(x.p.leerDialogo(), null);
});

test("la Gira desbloqueada con video lleva al mapa", async () => {
  const x = armar();
  x.p.pedirPartidaDesdeEnlace({ modo: "gira" });
  await x.p.verVideoParaDesbloquear();
  assert.deepEqual(x.navegaciones, ["/jugar/gira"]);
});

test("una pantalla abierta a mano rebota si está bloqueada", () => {
  const x = armar();
  assert.equal(x.p.rebotar("anotador"), true);
  assert.equal(x.p.leerDialogo()?.que, "anotador");
  const y = armar({ anotador: false });
  assert.equal(y.p.rebotar("anotador"), false);
});

test("hrefDe no deja pasar un departamento raro a la URL", () => {
  assert.equal(hrefDe({ modo: "gira", depto: "rocha" }), "/jugar/mesa?depto=rocha");
  assert.equal(hrefDe({ modo: "gira", depto: "x&y=1" }), "/jugar/gira");
  assert.equal(hrefDe({ modo: "gira", depto: "../../" }), "/jugar/gira");
  assert.equal(hrefDe({ modo: "rapida" }), "/jugar/mesa");
});
