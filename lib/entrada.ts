/**
 * El ÚNICO punto de entrada para jugar y para el anotador.
 *
 * Todos los botones, menús y revanchas pasan por acá: `pedirPartida` para
 * jugar y `pedirAnotador` para el anotador. Acá se decide, en este orden:
 *
 *  1. si es un doble toque (se ignora);
 *  2. si está bloqueado (se abre el diálogo para desbloquearlo);
 *  3. si toca un intersticial (lo decide `lib/anuncios.ts`);
 *  4. y recién ahí se entra.
 *
 * Ningún otro archivo navega a `/jugar/mesa`, a `/jugar/gira` desde afuera de
 * la gira, ni a `/anotador`. Lo vigila `entradas-unicas.test.ts`, que lee el
 * código como texto y falla si aparece un camino nuevo que no pase por acá.
 *
 * En la web no hay candados ni anuncios (`esApp()` da false): todo pasa en el
 * acto, y los enlaces navegan solos como cualquier enlace.
 *
 * No importa nada de React ni de Next, así se prueba en Node: la navegación se
 * la enchufa `DialogoDesbloqueo.tsx` al montarse.
 */

import { type Gestor, MS_TRABA_DOBLE_TOQUE, gestor as gestorDeLaApp } from "./anuncios.ts";
import { EJERCICIOS, aprendioTodo, cuantosAcertados, leerAprendido, suscribirAprendido } from "./aprendido.ts";
import { type Desbloqueable, desbloquear, leerDesbloqueos, suscribirDesbloqueos } from "./desbloqueos.ts";
import { esApp } from "./plataforma.ts";

export type Pedido = { modo: "rapida" } | { modo: "gira"; depto?: string };

export const RUTA_ANOTADOR = "/anotador";
const SLUG = /^[a-z0-9-]{1,40}$/;

/** Adónde lleva cada pedido. */
export function hrefDe(p: Pedido): string {
  if (p.modo === "rapida") return "/jugar/mesa";
  if (p.depto === undefined) return "/jugar/gira";
  // El slug va a una URL: se valida aunque hoy venga de una lista fija
  return SLUG.test(p.depto) ? `/jugar/mesa?depto=${p.depto}` : "/jugar/gira";
}

/** Lo que ven los botones: qué está bloqueado y cuánto de Aprender falta. */
export interface Candados {
  anotador: boolean;
  gira: boolean;
  acertados: number;
  total: number;
}

/** Sin candados: lo que se dibuja en el servidor y en la web. */
export const SIN_CANDADOS: Candados = {
  anotador: false,
  gira: false,
  acertados: 0,
  total: EJERCICIOS.length,
};

export type AvisoDialogo = null | "no-disponible" | "cerrado-antes";

export interface Dialogo {
  que: Desbloqueable;
  aviso: AvisoDialogo;
}

export interface DependenciasPortero {
  gestor: Pick<
    Gestor,
    "alEntrarAPartida" | "verVideo" | "prepararVideo" | "quererVideo" | "marcarPartidaEnCurso"
  >;
  esApp: () => boolean;
  ahora: () => number;
  rutaActual: () => string;
  leerCandados: () => { anotador: boolean; gira: boolean; acertados: number };
  desbloquear: (que: Desbloqueable) => void;
}

export function crearPortero(dep: DependenciasPortero) {
  let navegar: (href: string) => void = () => {};
  let trabaHasta = -Infinity;
  let esperando = false;
  let dialogo: Dialogo | null = null;
  let candados: Candados = SIN_CANDADOS;

  const oyentes = new Set<() => void>();
  const avisar = () => {
    for (const fn of oyentes) fn();
  };

  /** Relee los candados. En la web, nunca hay. */
  function refrescar(): void {
    if (!dep.esApp()) {
      candados = SIN_CANDADOS;
    } else {
      const c = dep.leerCandados();
      const nuevo: Candados = { ...c, total: EJERCICIOS.length };
      // Mismo objeto si no cambió nada: useSyncExternalStore compara por identidad
      if (
        nuevo.anotador !== candados.anotador ||
        nuevo.gira !== candados.gira ||
        nuevo.acertados !== candados.acertados
      ) {
        candados = nuevo;
      }
      // Mientras quede algo cerrado, conviene tener un video cargado
      dep.gestor.quererVideo(candados.anotador || candados.gira);
    }
    avisar();
  }

  const trabado = () => esperando || dep.ahora() < trabaHasta;
  const trabar = () => {
    trabaHasta = dep.ahora() + MS_TRABA_DOBLE_TOQUE;
  };

  function abrirDialogo(que: Desbloqueable): void {
    dialogo = { que, aviso: null };
    dep.gestor.prepararVideo();
    avisar();
  }

  /**
   * El corazón. `entrar` existe para la revancha: reparte en el lugar en vez
   * de navegar. `desdeEnlace` es para los `<Link>`: si se puede pasar en el
   * acto devuelve `true` y el enlace navega solo.
   */
  function tramitar(pedido: Pedido, entrar: (() => void) | undefined, desdeEnlace: boolean): boolean {
    if (trabado()) return false;
    refrescar();

    if (pedido.modo === "gira" && candados.gira) {
      abrirDialogo("gira");
      return false;
    }
    trabar();

    const href = hrefDe(pedido);
    const seguirYa = (): boolean => {
      if (entrar) {
        entrar();
        return false;
      }
      if (desdeEnlace) return true;
      navegar(href);
      return false;
    };

    // En la web no hay anuncios. E ir al mapa no es entrar a una partida.
    if (!dep.esApp()) return seguirYa();
    if (pedido.modo === "gira" && pedido.depto === undefined) return seguirYa();

    const espera = dep.gestor.alEntrarAPartida();
    if (espera === null) return seguirYa();

    // Hay anuncio: el enlace NO navega, navega esto cuando se cierre.
    esperando = true;
    const ruta = dep.rutaActual();
    void espera.then(() => {
      esperando = false;
      trabar();
      // Si mientras tanto se cambió de pantalla, no se arrastra a nadie.
      if (dep.rutaActual() !== ruta) return;
      if (entrar) entrar();
      else navegar(href);
    });
    return false;
  }

  return {
    /** Lo enchufa el componente del diálogo con el `router.push` de Next. */
    conectarNavegacion(fn: (href: string) => void): void {
      navegar = fn;
    },

    /** Para botones y revanchas. Navega o llama a `entrar`. */
    pedirPartida(pedido: Pedido, entrar?: () => void): void {
      tramitar(pedido, entrar, false);
    },

    /** Para los `<Link>`: `true` = navegá vos. */
    pedirPartidaDesdeEnlace(pedido: Pedido): boolean {
      return tramitar(pedido, undefined, true);
    },

    /** Para los `<Link>` del anotador: `true` = navegá vos. */
    pedirAnotadorDesdeEnlace(): boolean {
      if (trabado()) return false;
      refrescar();
      if (candados.anotador) {
        abrirDialogo("anotador");
        return false;
      }
      trabar();
      return true;
    },

    /**
     * Para las pantallas que se pueden abrir sin pasar por un botón (una URL
     * escrita a mano, una herramienta): si lo que piden está cerrado, abre el
     * diálogo y devuelve `true` para que la pantalla se vaya.
     */
    rebotar(que: Desbloqueable): boolean {
      refrescar();
      if (!candados[que]) return false;
      abrirDialogo(que);
      return true;
    },

    /** "Ver video" en el diálogo. */
    async verVideoParaDesbloquear(): Promise<void> {
      const d = dialogo;
      if (!d) return;
      const que = d.que;
      const r = await dep.gestor.verVideo(() => dep.desbloquear(que));
      refrescar();
      if (dialogo?.que !== que) return; // lo cerraron mientras tanto
      if (r === "ganado") {
        dialogo = null;
        avisar();
        navegar(que === "anotador" ? RUTA_ANOTADOR : hrefDe({ modo: "gira" }));
      } else {
        dialogo = { que, aviso: r };
        avisar();
      }
    },

    /** "Ir a Aprender" en el diálogo de la Gira. */
    irAAprender(): void {
      dialogo = null;
      avisar();
      navegar("/aprender");
    },

    /** "Probar de nuevo" cuando el video no estaba. */
    reintentarVideo(): void {
      if (!dialogo) return;
      dialogo = { ...dialogo, aviso: null };
      dep.gestor.prepararVideo();
      avisar();
    },

    cerrarDialogo(): void {
      if (!dialogo) return;
      dialogo = null;
      avisar();
    },

    leerDialogo: (): Dialogo | null => dialogo,
    leerCandados: (): Candados => candados,
    refrescar,

    /** Lo que la mesa avisa al gestor. */
    marcarPartidaEnCurso: (b: boolean) => dep.gestor.marcarPartidaEnCurso(b),

    suscribir(fn: () => void): () => void {
      oyentes.add(fn);
      return () => oyentes.delete(fn);
    },
  };
}

export type Portero = ReturnType<typeof crearPortero>;

// ─────────────────────────── El de la app ───────────────────────────────────

export const portero: Portero = crearPortero({
  gestor: gestorDeLaApp,
  esApp,
  ahora: () => performance.now(),
  rutaActual: () => (typeof location === "undefined" ? "" : location.pathname),
  leerCandados: () => {
    const d = leerDesbloqueos();
    const a = leerAprendido();
    return {
      anotador: !d.anotador,
      gira: !d.gira && !aprendioTodo(a),
      acertados: cuantosAcertados(a),
    };
  },
  desbloquear,
});

// Si algo se desbloquea (un video, el último ejercicio), los botones se enteran.
suscribirDesbloqueos(() => portero.refrescar());
suscribirAprendido(() => portero.refrescar());
