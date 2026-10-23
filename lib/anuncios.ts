/**
 * EL gestor de anuncios. Es el único: todas las reglas de tiempo viven acá.
 *
 * Qué hay, y qué no (decidido el 2/10/2026):
 *
 *  - **Intersticial** (pantalla completa, unos 5 s, saltable): sólo al ENTRAR a
 *    una partida. Nunca en medio de una, nunca en Aprender, nunca al abrir ni
 *    al salir de la app.
 *  - **Video con recompensa** (unos 30 s, lo elige el usuario): desbloquea para
 *    siempre el anotador o la Gira. La recompensa se da SÓLO en el evento de
 *    recompensa ganada, nunca al cerrar.
 *  - **Banners: ninguno.** Se sacaron todos.
 *
 * La duración del anuncio y si se puede saltar a los 5 s lo decide la red de
 * anuncios, no la app.
 *
 * Este archivo no sabe nada de AdMob: habla con un `MotorAnuncios`, que en el
 * teléfono es `anuncios-admob.ts` y en los tests es uno de mentira. Así las
 * reglas se prueban en Node con un reloj falso, sin teléfono y sin esperar
 * tres minutos de verdad.
 */

// ───────────────────────────── Las perillas ─────────────────────────────────

/**
 * Tope de frecuencia: no se muestra un intersticial si pasó menos que esto
 * desde el último anuncio que SE MOSTRÓ (de cualquier tipo).
 *
 * El reloj arranca al abrir la app: el primero puede salir recién a los 3
 * minutos (y nunca en la primera partida). Era 6 hasta el 2/10/2026; Santiago
 * lo probó en el teléfono y seis minutos era demasiado.
 *
 * Se cuenta desde el último que se mostró, no desde el último que se intentó.
 * Por eso no hace falta castigar al que juega sin internet: cuando vuelve a
 * tener conexión, la próxima partida ya lleva su anuncio.
 */
export const MINUTOS_ENTRE_ANUNCIOS = 3;

/**
 * Después de mirar un video (que el usuario ELIGIÓ mirar), ningún intersticial
 * por este tiempo. Cubre también el caso de desbloquear la Gira y entrar
 * enseguida a jugar: ahí no sale nada. Era 15 hasta el 2/10/2026.
 *
 * Tiene que ser MAYOR que `MINUTOS_ENTRE_ANUNCIOS`: si fuera igual o menor, el
 * tope común ya la cubriría y esta perilla no haría nada.
 */
export const MINUTOS_SIN_INTERSTICIAL_TRAS_VIDEO = 7;

/**
 * Cuánto se espera a que el anuncio aparezca después de pedirle que se
 * muestre. Si no aparece, se lo da por fallado y el usuario pasa: nunca se lo
 * deja trabado mirando una pantalla que no cambia.
 */
export const SEGUNDOS_ESPERA_QUE_APAREZCA = 3;

/**
 * Cuánto puede tardar en cargar el video con el botón "Cargando video…" a la
 * vista, antes de decir que no está disponible. Si carga después, el botón se
 * habilita solo.
 */
export const SEGUNDOS_MAXIMOS_CARGA_VIDEO = 15;

/**
 * Margen para una recompensa que llegue DESPUÉS del cierre. Google la manda
 * antes, pero si el orden se diera vuelta alguna vez, se perdería un
 * desbloqueo que el usuario se ganó.
 */
export const SEGUNDOS_GRACIA_RECOMPENSA = 1;

/**
 * Si la app vuelve a primer plano con un anuncio supuestamente en pantalla y
 * el aviso de cierre no llega en este tiempo, se lo da por cerrado. Pasa al
 * reabrir desde el ícono con el anuncio abierto: la actividad es `singleTask`
 * y Android se lleva puesto el anuncio sin avisar.
 */
export const SEGUNDOS_VOLVER_SIN_CIERRE = 1.5;

/** Google da por vencido un anuncio cargado a la hora. Se recarga antes. */
export const MINUTOS_VIDA_ANUNCIO = 55;

/** Si una carga falla, se reintenta con estas esperas (la última se repite). */
export const REINTENTOS_CARGA_SEGUNDOS = [30, 60, 120, 300] as const;

/**
 * Durante este tiempo después de ENTRAR a una partida no se carga ningún
 * anuncio: lo que se pida, espera a que se cumpla. (Desde el 3/10/2026.)
 *
 * El plugin carga en el hilo principal de Android, el mismo que dibuja, y la
 * primera carga del proceso arma además el navegador interno de los anuncios.
 * Hasta ese día eso caía justo al entrar a la mesa —la primera partida pedía
 * su intersticial en el mismo toque— y la mesa tardaba en aparecer.
 *
 * Se cuenta desde que la mesa arranca: si antes salió un anuncio, desde que se
 * cerró, no desde el toque. Si no, un anuncio de 15 s agotaba la ventana y la
 * carga del siguiente caía otra vez al entrar.
 */
export const SEGUNDOS_SIN_CARGAR_AL_ENTRAR = 8;

/** Traba contra el doble toque en los botones de jugar y del anotador. */
export const MS_TRABA_DOBLE_TOQUE = 1000;

/**
 * El techo de lo que pueden mostrar los anuncios. "Para mayores de 13 con guía
 * de los padres": el truco se aprende en familia.
 */
export const CLASIFICACION_MAXIMA = "ParentalGuidance";

/**
 * La app NO está dirigida a menores de 13 (README → Publicidad: marcarla así
 * la mete en "Diseñado para familias"). Si algún día cambia, se cambia acá y
 * en la ficha de Play Console, las dos cosas juntas.
 */
export const DIRIGIDA_A_MENORES = false;

// ──────────────────────────── El contrato ───────────────────────────────────

export type Formato = "intersticial" | "video";

export type EventoMotor =
  | { tipo: "mostrado"; formato: Formato }
  | { tipo: "fallo-mostrar"; formato: Formato }
  | { tipo: "cerrado"; formato: Formato }
  | { tipo: "recompensa" }
  /** La app volvió a primer plano. */
  | { tipo: "volvio" };

export interface InicioMotor {
  /** Si hay consentimiento (o no hace falta) y el SDK arrancó. */
  puedePedir: boolean;
  /** Si hay que ofrecer "Privacidad de los anuncios" (UMP lo exige en Europa). */
  pidePrivacidad: boolean;
}

/** Lo que el gestor necesita de la red de anuncios. */
export interface MotorAnuncios {
  /** Consentimiento + arranque del SDK. Puede rechazar (sin internet). */
  iniciar(): Promise<InicioMotor>;
  /** Resuelve cuando hay un anuncio listo; rechaza si no hubo. */
  cargar(formato: Formato): Promise<void>;
  /**
   * Pide mostrarlo. RECHAZA si no se pudo; si se pudo, puede no resolver
   * nunca —el video de AdMob sólo resuelve al ganar la recompensa—. Lo que
   * pasa después llega por `alEvento`.
   */
  mostrar(formato: Formato): Promise<unknown>;
  alEvento(fn: (e: EventoMotor) => void): void;
  /** El formulario de privacidad de UMP. */
  abrirPrivacidad(): Promise<InicioMotor>;
}

export interface Reloj {
  /** Milisegundos, monótono. */
  ahora(): number;
  /** Programa algo; devuelve cómo cancelarlo. */
  esperar(ms: number, fn: () => void): () => void;
}

export type ResultadoVideo = "ganado" | "cerrado-antes" | "no-disponible";

/** Lo que ve el botón "Ver video". */
export type EstadoVideo = "cargando" | "listo" | "no-disponible" | "mirando";

// ─────────────────────────── La regla, pura ─────────────────────────────────

export interface Tiempos {
  /** Cuándo se abrió la app. */
  inicioSesion: number;
  /** Cuándo se mostró el último anuncio de cualquier tipo. */
  ultimoAnuncio: number | null;
  /** Cuándo se mostró el último video con recompensa. */
  ultimoVideo: number | null;
  /** Si ya se entró a una partida en esta sesión. */
  huboPrimeraPartida: boolean;
}

const MIN = 60_000;

/**
 * ¿Toca un intersticial al entrar a esta partida? Sólo las reglas de tiempo;
 * que haya un anuncio cargado y que el momento sea válido lo mira el gestor.
 */
export function tocaIntersticial(t: Tiempos, ahora: number): boolean {
  // La primera partida de cada sesión nunca lleva anuncio.
  if (!t.huboPrimeraPartida) return false;
  // Desde que se abrió la app o desde el último anuncio, lo que sea más nuevo.
  // Si el reloj diera negativo, la resta da menos que el tope: no sale nada.
  const desde = Math.max(t.inicioSesion, t.ultimoAnuncio ?? t.inicioSesion);
  if (ahora - desde < MINUTOS_ENTRE_ANUNCIOS * MIN) return false;
  if (t.ultimoVideo !== null && ahora - t.ultimoVideo < MINUTOS_SIN_INTERSTICIAL_TRAS_VIDEO * MIN) {
    return false;
  }
  return true;
}

// ──────────────────────────── El gestor ─────────────────────────────────────

type Carga = "vacio" | "cargando" | "listo" | "fallo";

interface EstadoCarga {
  estado: Carga;
  desde: number;
  intentos: number;
  cancelarReintento: () => void;
  /** Para el video: pasaron los 15 s mostrando "Cargando…". */
  esperaVencida: boolean;
}

interface FlujoIntersticial {
  mostrado: boolean;
  terminar: () => void;
}

interface FlujoVideo {
  alGanar: () => void;
  gano: boolean;
  mostrado: boolean;
  terminado: boolean;
  fin: (r: ResultadoVideo) => void;
}

export interface Dependencias {
  reloj: Reloj;
  /** La pantalla actual es de Aprender: ahí no va nunca nada. */
  enAprender: () => boolean;
}

export function crearGestor({ reloj, enAprender }: Dependencias) {
  const t: Tiempos = {
    inicioSesion: reloj.ahora(),
    ultimoAnuncio: null,
    ultimoVideo: null,
    huboPrimeraPartida: false,
  };

  let motor: MotorAnuncios | null = null;
  let puedePedir = false;
  let pidePrivacidad = false;
  let iniciando: Promise<void> | null = null;
  let partidaEnCurso = false;
  let quiereVideo = false;
  let enPantalla: Formato | null = null;
  let flujoIntersticial: FlujoIntersticial | null = null;
  /** El último video pedido: una recompensa tardía todavía le llega. */
  let flujoVideo: FlujoVideo | null = null;
  let cancelarVueltaSinCierre: () => void = () => {};
  /** Hasta cuándo no se carga nada: se acaba de entrar a una partida. */
  let entrandoHasta = -Infinity;
  /** Lo que se pidió cargar adentro de esa ventana, y espera a que se cumpla. */
  const aplazadas = new Set<Formato>();
  let cancelarAplazadas: (() => void) | null = null;

  const nuevaCarga = (): EstadoCarga => ({
    estado: "vacio",
    desde: 0,
    intentos: 0,
    cancelarReintento: () => {},
    esperaVencida: false,
  });
  const carga: Record<Formato, EstadoCarga> = {
    intersticial: nuevaCarga(),
    video: nuevaCarga(),
  };

  const oyentes = new Set<() => void>();
  const avisar = () => {
    for (const fn of oyentes) fn();
  };
  const suscribir = (fn: () => void): (() => void) => {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  };

  const vencido = (f: Formato) =>
    carga[f].estado === "listo" && reloj.ahora() - carga[f].desde > MINUTOS_VIDA_ANUNCIO * MIN;

  // ── Cargar ──

  /**
   * `yaMismo` saltea la ventana de entrada: es para cuando la persona PIDIÓ
   * el video (abrió el diálogo) y está mirando el botón esperando.
   */
  function cargar(f: Formato, { yaMismo = false }: { yaMismo?: boolean } = {}): void {
    const c = carga[f];
    if (!motor || !puedePedir) return;
    if (f === "video" && !quiereVideo) return;
    if (c.estado === "cargando") return;
    if (c.estado === "listo" && !vencido(f)) return;
    /* Nunca mientras ese mismo formato está en pantalla: el plugin guarda los
       anuncios cargados en un mapa por ID de unidad y, al cerrar, BORRA esa
       entrada; si ya hubiera uno nuevo cargado, se borraría el nuevo. Por eso
       se precarga al cerrarse (o fallar), no al mostrarse. */
    if (enPantalla === f) return;
    if (!yaMismo && reloj.ahora() < entrandoHasta) {
      aplazar(f);
      return;
    }
    c.cancelarReintento();
    c.estado = "cargando";
    avisar();
    motor.cargar(f).then(
      () => {
        c.estado = "listo";
        c.desde = reloj.ahora();
        c.intentos = 0;
        avisar();
      },
      () => {
        c.estado = "fallo";
        avisar();
        const espera =
          REINTENTOS_CARGA_SEGUNDOS[Math.min(c.intentos, REINTENTOS_CARGA_SEGUNDOS.length - 1)];
        c.intentos++;
        c.cancelarReintento = reloj.esperar(espera * 1000, () => cargar(f));
      },
    );
  }

  /** Se reintenta al cumplirse la ventana; `cargar` vuelve a mirar todo. */
  function aplazar(f: Formato): void {
    aplazadas.add(f);
    if (cancelarAplazadas) return;
    cancelarAplazadas = reloj.esperar(entrandoHasta - reloj.ahora(), () => {
      cancelarAplazadas = null;
      const lista = [...aplazadas];
      aplazadas.clear();
      for (const g of lista) cargar(g);
    });
  }

  /** La mesa está por arrancar: empieza la ventana sin cargas. */
  function marcarEntrada(): void {
    entrandoHasta = reloj.ahora() + SEGUNDOS_SIN_CARGAR_AL_ENTRAR * 1000;
  }

  // ── Arrancar ──

  function iniciar(): Promise<void> {
    if (!motor || puedePedir) return Promise.resolve();
    if (iniciando) return iniciando;
    const m = motor;
    iniciando = m
      .iniciar()
      .then(
        (r) => {
          puedePedir = r.puedePedir;
          pidePrivacidad = r.pidePrivacidad;
        },
        () => {
          // Sin internet o el formulario falló: se reintenta al volver a la app
          puedePedir = false;
        },
      )
      .then(() => {
        iniciando = null;
        /* Los dos al arrancar, desde el 3/10/2026: el intersticial también,
           para que su primera carga —la más pesada, la que arma el navegador
           de los anuncios— caiga en la pantalla de carga y no al entrar a la
           primera partida. Cargado dura `MINUTOS_VIDA_ANUNCIO`. */
        if (puedePedir) {
          if (quiereVideo) cargar("video");
          cargar("intersticial");
        }
        avisar();
      });
    avisar();
    return iniciando;
  }

  // ── Lo que llega de la red de anuncios ──

  function alEvento(e: EventoMotor): void {
    const ahora = reloj.ahora();
    switch (e.tipo) {
      case "mostrado":
        t.ultimoAnuncio = ahora;
        if (e.formato === "video") {
          t.ultimoVideo = ahora;
          if (flujoVideo) flujoVideo.mostrado = true;
        } else if (flujoIntersticial) {
          flujoIntersticial.mostrado = true;
        }
        break;

      case "recompensa":
        /* El ÚNICO lugar donde se da la recompensa. Sincrónico: si el sistema
           mata la app un segundo después, el desbloqueo ya quedó escrito. */
        t.ultimoVideo = ahora;
        if (flujoVideo && !flujoVideo.gano) {
          flujoVideo.gano = true;
          try {
            flujoVideo.alGanar();
          } catch {
            /* desbloquear() no lanza; esto es por si un día lo hace */
          }
          if (enPantalla !== "video") flujoVideo.fin("ganado");
        }
        break;

      case "cerrado":
        t.ultimoAnuncio = ahora;
        if (e.formato === "video") t.ultimoVideo = ahora;
        terminarEnPantalla(e.formato, "cerrado");
        break;

      case "fallo-mostrar":
        terminarEnPantalla(e.formato, "fallo");
        break;

      case "volvio":
        if (!puedePedir) void iniciar();
        if (enPantalla !== null) {
          const cual = enPantalla;
          cancelarVueltaSinCierre();
          cancelarVueltaSinCierre = reloj.esperar(SEGUNDOS_VOLVER_SIN_CIERRE * 1000, () => {
            if (enPantalla === cual) terminarEnPantalla(cual, "cerrado");
          });
        }
        break;
    }
  }

  /** Lo que se mostraba ya no está (se cerró o falló). */
  function terminarEnPantalla(f: Formato, como: "cerrado" | "fallo"): void {
    if (enPantalla === f) enPantalla = null;
    if (f === "intersticial") {
      flujoIntersticial?.terminar();
    } else if (flujoVideo && !flujoVideo.terminado) {
      const flujo = flujoVideo;
      if (como === "fallo") flujo.fin("no-disponible");
      else if (flujo.gano) flujo.fin("ganado");
      else
        reloj.esperar(SEGUNDOS_GRACIA_RECOMPENSA * 1000, () =>
          flujo.fin(flujo.gano ? "ganado" : "cerrado-antes"),
        );
    }
    cargar(f);
    avisar();
  }

  // ── Lo que pide el resto de la app ──

  /**
   * Se llama al entrar a una partida. Devuelve `null` si no va anuncio (el
   * usuario sigue en el acto) o una promesa que se cumple cuando puede
   * seguir. NUNCA rechaza: si algo falla, se pasa.
   */
  function alEntrarAPartida(): Promise<void> | null {
    const ahora = reloj.ahora();
    const corresponde =
      motor !== null &&
      puedePedir &&
      !partidaEnCurso &&
      enPantalla === null &&
      !enAprender() &&
      tocaIntersticial(t, ahora) &&
      carga.intersticial.estado === "listo" &&
      !vencido("intersticial");

    t.huboPrimeraPartida = true;
    if (!corresponde || !motor) {
      // Se entra ya: la ventana sin cargas arranca ahora. Si el anuncio
      // cargado se venció, se pide otro, que espera a que se cumpla.
      marcarEntrada();
      if (vencido("intersticial")) {
        carga.intersticial.estado = "vacio";
        cargar("intersticial");
      }
      return null;
    }

    const m = motor;
    return new Promise<void>((resolver) => {
      let cancelarVigia: () => void = () => {};
      const flujo: FlujoIntersticial = {
        mostrado: false,
        terminar: () => {
          if (flujoIntersticial !== flujo) return;
          flujoIntersticial = null;
          cancelarVigia();
          // Se entra ahora, después del anuncio: la ventana cuenta desde acá,
          // y la carga del siguiente (que pide `terminarEnPantalla`) espera.
          marcarEntrada();
          resolver();
        },
      };
      flujoIntersticial = flujo;
      enPantalla = "intersticial";
      carga.intersticial.estado = "vacio"; // se consume al mostrarse
      avisar();

      cancelarVigia = reloj.esperar(SEGUNDOS_ESPERA_QUE_APAREZCA * 1000, () => {
        if (!flujo.mostrado) terminarEnPantalla("intersticial", "fallo");
      });
      m.mostrar("intersticial").catch(() => terminarEnPantalla("intersticial", "fallo"));
    });
  }

  /**
   * Muestra el video. `alGanar` se ejecuta adentro del evento de recompensa y
   * en ningún otro lado.
   */
  function verVideo(alGanar: () => void): Promise<ResultadoVideo> {
    const c = carga.video;
    if (
      !motor ||
      !puedePedir ||
      partidaEnCurso ||
      enPantalla !== null ||
      enAprender() ||
      c.estado !== "listo" ||
      vencido("video")
    ) {
      if (vencido("video")) {
        c.estado = "vacio";
        cargar("video");
      }
      return Promise.resolve("no-disponible");
    }
    const m = motor;
    return new Promise<ResultadoVideo>((resolver) => {
      let cancelarVigia: () => void = () => {};
      const flujo: FlujoVideo = {
        alGanar,
        gano: false,
        mostrado: false,
        terminado: false,
        fin: (r) => {
          if (flujo.terminado) return;
          flujo.terminado = true;
          cancelarVigia();
          resolver(r);
          avisar();
        },
      };
      flujoVideo = flujo;
      enPantalla = "video";
      c.estado = "vacio";
      avisar();

      cancelarVigia = reloj.esperar(SEGUNDOS_ESPERA_QUE_APAREZCA * 1000, () => {
        if (!flujo.mostrado) terminarEnPantalla("video", "fallo");
      });
      m.mostrar("video").catch(() => terminarEnPantalla("video", "fallo"));
    });
  }

  /** Abrir el diálogo: si el video no está, se pide ya, con su tiempo máximo. */
  function prepararVideo(): void {
    if (!motor) return;
    if (!puedePedir) {
      void iniciar();
      return;
    }
    const c = carga.video;
    if (c.estado === "listo" && !vencido("video")) return;
    if (c.estado !== "cargando") {
      c.intentos = 0;
      if (vencido("video")) c.estado = "vacio";
      cargar("video", { yaMismo: true });
    }
    c.esperaVencida = false;
    reloj.esperar(SEGUNDOS_MAXIMOS_CARGA_VIDEO * 1000, () => {
      if (c.estado === "cargando") {
        c.esperaVencida = true;
        avisar();
      }
    });
    avisar();
  }

  function estadoVideo(): EstadoVideo {
    if (!motor) return "no-disponible";
    if (enPantalla === "video") return "mirando";
    if (!puedePedir) return iniciando ? "cargando" : "no-disponible";
    const c = carga.video;
    if (c.estado === "listo" && !vencido("video")) return "listo";
    if (c.estado === "cargando" && !c.esperaVencida) return "cargando";
    return "no-disponible";
  }

  return {
    /** Conecta la red de anuncios de verdad (o la de mentira) y arranca. */
    conectar(m: MotorAnuncios): Promise<void> {
      if (motor) return Promise.resolve();
      motor = m;
      m.alEvento(alEvento);
      return iniciar();
    },
    alEntrarAPartida,
    verVideo,
    prepararVideo,
    estadoVideo,
    /** La mesa avisa si hay una partida en juego: con partida, nada. */
    marcarPartidaEnCurso(b: boolean): void {
      partidaEnCurso = b;
    },
    /** Si queda algo bloqueado, vale la pena tener un video cargado. */
    quererVideo(b: boolean): void {
      if (quiereVideo === b) return;
      quiereVideo = b;
      if (b) cargar("video");
      else carga.video.cancelarReintento();
    },
    pidePrivacidad: () => pidePrivacidad,
    /**
     * Si hay un anuncio tapando la pantalla ahora mismo. Lo mira la música
     * (`lib/audio.ts`, desde el 21/10/2026): con un anuncio delante se calla,
     * porque el anuncio trae su propio sonido. Cambia siempre junto con un
     * aviso a los suscriptos.
     */
    anuncioEnPantalla: (): boolean => enPantalla !== null,
    async abrirPrivacidad(): Promise<void> {
      if (!motor) return;
      try {
        const r = await motor.abrirPrivacidad();
        pidePrivacidad = r.pidePrivacidad;
        puedePedir = r.puedePedir;
      } catch {
        /* el formulario no abrió: no cambia nada */
      }
      avisar();
    },
    /**
     * Se cumple cuando ya no queda nada cargando: terminó el arranque y cada
     * carga salió, bien o mal (una que falló no espera su reintento). Nunca
     * rechaza, y sin red de anuncios se cumple enseguida.
     *
     * Es lo que espera la pantalla de carga de la app (desde el 3/10/2026).
     * Antes esperaba sólo el arranque, y las cargas seguían DESPUÉS de que se
     * iba: AdMob trabaja en el hilo principal de Android y el anuncio corre en
     * el mismo proceso de dibujo que la página, así que el primer toque en
     * "Jugar" caía en el medio de ese trabajo.
     */
    cargasQuietas(): Promise<void> {
      const quieto = () =>
        !iniciando && carga.intersticial.estado !== "cargando" && carga.video.estado !== "cargando";
      return new Promise<void>((listo) => {
        if (quieto()) return listo();
        const quitar = suscribir(() => {
          if (!quieto()) return;
          quitar();
          listo();
        });
      });
    },
    suscribir,
    /** Sólo para los tests. */
    _tiempos: (): Readonly<Tiempos> => ({ ...t }),
  };
}

export type Gestor = ReturnType<typeof crearGestor>;

// ─────────────────────── El de la app, uno solo ─────────────────────────────

const relojDelNavegador: Reloj = {
  // Monótono: no salta si el usuario cambia la hora del teléfono.
  ahora: () => performance.now(),
  esperar: (ms, fn) => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
  },
};

/**
 * El gestor de la app. Se crea al cargar el módulo, o sea al abrir la app:
 * ése es el momento en que arranca el reloj de la sesión.
 */
export const gestor: Gestor = crearGestor({
  reloj: relojDelNavegador,
  enAprender: () =>
    typeof location !== "undefined" && /^\/aprender(\/|$)/.test(location.pathname),
});
