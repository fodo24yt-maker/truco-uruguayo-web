"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Carta } from "@/components/Carta";
import { Dialogo } from "@/components/mesa/Dialogo";
import {
  FondoAmbiente,
  Mate,
  RIVAL_VB,
  RivalSentado,
  SombraRival,
  TablaMesa,
} from "@/components/mesa/Escenario";
import { DedosAtras, PulgarAdelante } from "@/components/mesa/Manos";
import { SombraApoyada } from "@/components/mesa/Sombra";
import { Medallon } from "@/components/mesa/Medallon";
import { Marcador, MarcadorBarra } from "@/components/mesa/Marcador";
import { Mazo } from "@/components/mesa/Mazo";
import { type Carta as CartaType, esPieza } from "@/lib/motor/baraja";
import { decidirJugada } from "@/lib/motor/bot";
import {
  type Accion,
  type Jugador,
  type Partida,
  accionesPosibles,
  aplicar,
  laFalta,
  nuevaPartida,
  siguienteMano,
} from "@/lib/motor/partida";
import { versoDelCanto } from "@/lib/motor/versos";
import {
  LUKI,
  PERSONALIDADES,
  buscarPersonalidad,
  type Personalidad,
} from "@/lib/motor/personalidades";
import { fichaVacia, observarMano } from "@/lib/motor/lectura";
import { explicarEnvido, valorEnvido } from "@/lib/motor/tantos";
import { acentoDe, ambienteDe } from "@/lib/ambientes";
import { escalaEnMesa, estiloEnMesa } from "@/lib/mesa-perspectiva";
import { ESCENAS } from "@/lib/escenas";
import { caraDe } from "@/lib/caras";
import { porSlugDeDepartamento } from "@/lib/gira";
import { usaPantallaAncha } from "@/lib/pantalla";
import { botonera } from "@/lib/botonera";
import { anotarPartida, guardarPreferencia, leerProgreso } from "@/lib/progreso";

const DEMORA_BOT = 900; // lo que el bot "piensa", para que se pueda seguir

/* ─── El reloj del reparto ──────────────────────────────────────────────────
   Antes la mano aparecía entera y dada vuelta de un saque: empezabas a jugar
   sin haber visto repartir. Ahora salen del mazo de a una —mano, pie, mano,
   pie— y se dan vuelta recién cuando terminó, que es como se reparte en la
   mesa. Los números están acá arriba y no desparramados en el código porque
   tienen que encajar entre ellos: si el volteo empieza antes de que aterrice
   la última carta, se ve la mano armándose sola. */

/** Lo que pasa entre que sale una carta y sale la siguiente. */
const ENTRE_CARTAS = 110;
/** Lo que tarda cada carta en llegar del mazo a su lugar. Igual que el CSS. */
const VUELO = 320;
/** Entre carta y carta al darlas vuelta: se abren en abanico, no de golpe. */
const ENTRE_VOLTEOS = 80;
/** Cuánto dura el giro de una carta al darla vuelta. Igual que el CSS. */
const VOLTEO = 280;

/** Cuándo se dan vuelta: cuando aterrizó la última de las seis, y un respiro. */
const MOMENTO_VOLTEO = 5 * ENTRE_CARTAS + VUELO + 60;
/** Cuándo se puede volver a jugar: cuando terminó de girar la última. */
const FIN_REPARTO = MOMENTO_VOLTEO + 2 * ENTRE_VOLTEOS + VOLTEO;
/**
 * El ancho de una carta en la mano.
 *
 * Va atado al alto de la ventana y no a puntos de corte de ancho: el problema
 * real nunca fue la pantalla angosta sino la BAJA —una ventana de 620px de alto
 * dejaba tu propia mano cortada por la barra de cantos, que es lo único que no
 * se puede permitir—. Con `clamp` se achica sola hasta donde haga falta y nunca
 * pasa del tamaño lindo en una pantalla grande.
 */
const ANCHO_MANO = "clamp(72px, 15.6vh, 126px)";

/** Lo que queda un verso en pantalla si no lo cerrás ni contestás. */
const DURA_VERSO = 6500;

/**
 * Cuánto se esperan las cartas en la mesa después de que se cierra la mano.
 *
 * La última carta de una mano es la que la decidió, así que barrer en el mismo
 * instante te saca de la pantalla justo lo que estás mirando. Dos segundos
 * alcanzan para ver qué pasó y no llegan a aburrir.
 */
const ESPERA_ANTES_DE_BARRER = 2000;

/**
 * Lo que tarda el barrido, contando el escalonado de las seis cartas.
 *
 * Es lo que espera el cartel de fin de mano antes de aparecer. Y esa espera es
 * la mitad del arreglo: el cartel se montaba APENAS terminaba la mano, tapando
 * la pantalla entera con un velo negro, así que la última baza —la que decidió
 * todo— no se llegaba a ver nunca. Sin esto, barrer la mesa sería barrerla
 * detrás de un telón.
 */
const DURA_BARRIDO = 760;

/* ═══ LOS DOS DISEÑOS DE LA MESA ═══════════════════════════════════════════
   Antes había un solo juego de números, medido todo en `vh`. Andaba en el
   celular y en la compu se veía perdido: el mazo pasaba del 22% del ancho de la
   escena al 7%, porque en `vh` mide los mismos píxeles pero la escena es tres
   veces más ancha. Eso fue el "el mazo es muy chico" del feedback.

   Así que son dos, con los MISMOS campos, uno al lado del otro. Que tengan la
   misma forma no es prolijidad: es lo que obliga a que agregar un objeto sea
   decidir dónde va en las dos, en vez de agregarlo en una y olvidarse.

   Cuál se usa lo decide `usaPantallaAncha()`, por PROPORCIÓN de la ventana y no
   por ancho: ver el porqué en `lib/pantalla.ts`.

   ── Cómo se leen los números ──────────────────────────────────────────────
   · `u` va SIEMPRE del lado izquierdo; `ladoMazo` lo espeja cuando hace falta.
   · `v = 0` es el canto de él y `v = 1` el tuyo.
   · `estiloEnMesa` ancla por la BASE, así que todo crece HACIA ARRIBA: pasado
     cierto punto un objeto se le monta al rival encima del pecho.

   NO SE MUEVEN A OJO. Los fija `herramientas/mirar-mesa-nueva.mjs`, que saca el
   rectángulo de verdad en el navegador, en las tres pantallas de celular y en
   las tres de compu, y falla si algo cruza el canto o se le monta a la libreta.
   En este proyecto ya se calculó dos veces en papel y las dos salió mal: el
   `clamp` de cada objeto, el alto de la ventana y la escala en perspectiva se
   multiplican y no se pueden separar leyendo. */
interface DisenoDeMesa {
  /**
   * Cuánto de la escena se lleva el ambiente, en % del alto. El resto es mesa.
   *
   * Es la palanca del encuadre y de la que cuelga TODO: el alto del rival sale
   * de acá (ver `altoDelRival`), así que bajarlo achica al rival y agranda la
   * mesa de una sola vez, sin despegarlo del canto.
   */
  fondo: number;
  /** El mazo con la muestra, del lado del que reparte. */
  mazo: { u: number; v: number; ancho: string };
  /** El mate, siempre del lado contrario al mazo. */
  mate: { u: number; v: number; alto: string };
  /**
   * La libreta, que es la excepción y va con dos profundidades.
   *
   * Es lo más alto de la mesa, así que es la primera que se le monta al rival
   * si sube de más. Y NO PUEDE ACHICARSE: se agrandó a propósito porque los
   * puntos no se leían en el celular. Como subir ALEJA y alejar ACHICA, se
   * dibuja del tamaño que tendría en `tamano`, que es de donde vino. Sí, eso le
   * miente un poco a la perspectiva, en el único objeto de la mesa que hay que
   * LEER y no sólo mirar. Vale la pena.
   *
   * ── `null` EN EL CELULAR, y por eso el campo es opcional ────────────────
   * Ahí se comía el cuarto de arriba de la mesa: 169 de 390 px de ancho, con
   * la birome llegando al borde. Los puntos ahora los dice `MarcadorBarra`,
   * arriba, que no le saca ni un píxel a la mesa. En la compu se queda: hay
   * lugar de sobra y es lo que hacen las referencias, que tienen los
   * cuadraditos arriba Y el papelito sobre la madera.
   *
   * Es `null` y no un campo ausente a propósito: los dos diseños tienen que
   * seguir teniendo la misma forma, así que sacar la libreta es DECIR que no
   * va, no olvidarse de ponerla.
   */
  libreta: { u: number; v: number; tamano: number; ancho: string } | null;
  /**
   * Las cartas jugadas. `paso` es cuánto se separan las bazas entre sí.
   *
   * Se centran como grupo: ancladas a la izquierda, con una sola baza puesta
   * —que es la mitad del tiempo— quedaba tirada contra el borde.
   */
  baza: { suya: number; tuya: number; ganador: number; ancho: string; paso: number };
  /** Las tres que le reparten a él, que existen sólo mientras dura el reparto. */
  reparto: { v: number; ancho: string };
}

/** Alto y angosta: el caso apretado, y el que manda si algo falla. */
const CELULAR: DisenoDeMesa = {
  fondo: 22,
  mazo: { u: 0.24, v: 0.5, ancho: "clamp(74px, 15vh, 122px)" },
  /* EL MATE SE MUDÓ AL HUECO DE LA LIBRETA. Estaba abajo (v = 0,66) porque
     arriba estaba ocupado; ahora ese costado quedó libre entero. Y crece,
     porque es lo único que queda de ese lado.

     No va tan al fondo como estaba la libreta (v = 0,23): `estiloEnMesa` ancla
     por la BASE y todo crece HACIA ARRIBA, así que un mate apoyado allá se le
     sube al rival por el pecho.

     LOS DOS NÚMEROS LOS FIJÓ LA MEDICIÓN. Calculados a mano daban 0,74 y 0,42,
     y `mirar-mesa-nueva.mjs` los rechazó: a 390x844 la TERCERA baza llegaba a
     x=284 y el mate empezaba en 282. Dos píxeles. Es la tercera vez que en
     este proyecto un número de la mesa se calcula en papel y sale mal, y las
     tres veces por lo mismo: el `clamp` del objeto, el alto de la ventana y la
     escala en perspectiva se multiplican y no se pueden separar leyendo. */
  mate: { u: 0.78, v: 0.34, alto: "clamp(62px, 13vh, 118px)" },
  libreta: null,
  baza: {
    suya: 0.46,
    tuya: 0.64,
    ganador: 0.31,
    ancho: "clamp(44px, 8.8vh, 72px)",
    paso: 0.125,
  },
  reparto: { v: 0.22, ancho: "clamp(28px, 5.6vh, 46px)" },
};

/** Ancha y baja. Lo único que cambia de fondo es el TAMAÑO de las cosas. */
const PC: DisenoDeMesa = {
  fondo: 22,
  mazo: { u: 0.2, v: 0.5, ancho: "clamp(120px, 26vh, 230px)" },
  mate: { u: 0.8, v: 0.66, alto: "clamp(80px, 19vh, 170px)" },
  libreta: { u: 0.79, v: 0.32, tamano: 0.45, ancho: "clamp(180px, 38vh, 330px)" },
  baza: {
    suya: 0.46,
    tuya: 0.64,
    ganador: 0.31,
    ancho: "clamp(60px, 13vh, 112px)",
    paso: 0.135,
  },
  reparto: { v: 0.22, ancho: "clamp(38px, 8vh, 72px)" },
};

/**
 * El alto del rival, en % del alto de la escena.
 *
 * No es un número elegido: sale de pedir que el canto de la mesa del DIBUJO
 * caiga exactamente sobre el canto de la mesa de la ESCENA. Si cambia `fondo` o
 * el `viewBox` del rival, esto se acomoda solo.
 */
const altoDelRival = (fondo: number) => (fondo * RIVAL_VB.alto) / RIVAL_VB.borde;

/**
 * Cuánto espera cada carta antes de salir del mazo.
 *
 * Se reparte de a una y empezando por el mano (reglas.txt 6, paso 1), así que
 * se van alternando: mano, pie, mano, pie, mano, pie.
 */
function retrasoDeReparto(quien: Jugador, indice: number, soyMano: boolean): number {
  const empieza = quien === "vos" ? soyMano : !soyMano;
  return (indice * 2 + (empieza ? 0 : 1)) * ENTRE_CARTAS;
}

/**
 * ¿Se anima el reparto?
 *
 * Si el sistema pidió menos movimiento, no: se muestra la mano y se juega. El
 * CSS ya apaga las animaciones en ese caso, pero acá hay ADEMÁS una espera de
 * segundo y medio antes de poder tocar nada, y eso el CSS no lo apaga. Sin
 * esta comprobación, quien pidió menos movimiento se comía la espera mirando
 * una mesa quieta.
 */
const animacionesPrendidas = () =>
  typeof window !== "undefined" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Giro fijo por carta, para que al tirarla caiga siempre igual y no baile. */
function giroDe(carta: CartaType): number {
  const semilla = carta.numero * 7 + carta.palo.length * 13;
  return ((semilla % 15) - 7) * 1;
}

export default function Jugar() {
  // useSearchParams necesita un límite de Suspense para poder generar la
  // página de forma estática.
  return (
    <Suspense fallback={<Cargando />}>
      <Mesa />
    </Suspense>
  );
}

function Cargando() {
  return (
    <div className="tabla-mesa flex min-h-0 flex-1 items-center justify-center">
      <p className="font-[family-name:var(--font-ui)] uppercase tracking-widest text-crema/60">
        Repartiendo…
      </p>
    </div>
  );
}

function Mesa() {
  /* CUÁL DE LOS DOS DISEÑOS. Por proporción de la ventana, no por ancho: el
     porqué está en `lib/pantalla.ts`. En el primer cuadro de una compu esto
     todavía dice "celular" y cambia al hidratar, adentro de "REPARTIENDO…". */
  const d = usaPantallaAncha() ? PC : CELULAR;
  const parametros = useSearchParams();
  // Partida Rápida: la dirección puede traer a quién enfrentás.
  const rivalPedido = parametros.get("rival");

  /**
   * MODO HISTORIA. Si venís de la gira, la dirección trae el DEPARTAMENTO, y
   * el rival lo pone el mapa: se deriva del parámetro y de ningún otro lado.
   *
   * Esto no es cosmético. Si el rival saliera del estado del selector, alcanzaba
   * con forzar ese estado desde las herramientas de desarrollo para elegirse el
   * más blando y desbloquear igual, y el recorrido perdía todo el sentido. Acá
   * el selector directamente no se monta —no `disabled`, no escondido por CSS—
   * y su estado es irrelevante para la partida.
   *
   * Como bien dice el README, esto es coherencia del juego y no una defensa de
   * seguridad: la partida corre en el cliente y el progreso es local.
   *
   * Un `?depto=` inventado devuelve null y la mesa se queda en modo libre.
   */
  const rivalDelDepto = porSlugDeDepartamento(parametros.get("depto"));
  const esHistoria = rivalDelDepto !== null;

  const [p, setP] = useState<Partida | null>(null);
  const [ayudas, setAyudas] = useState(true);
  const [menuEnvido, setMenuEnvido] = useState(false);
  const [rivalElegido, setRivalElegido] = useState<Personalidad>(LUKI);

  /** El que juega de verdad. En historia manda el mapa; en libre, vos. */
  const rival = rivalDelDepto ?? rivalElegido;
  const [eligiendo, setEligiendo] = useState(false);
  const [marcas, setMarcas] = useState<Record<string, { ganadas: number; jugadas: number }>>({});
  const anotada = useRef<Partida | null>(null);

  /**
   * Lo que el rival tiene anotado de cómo jugás. Dura lo que dura la partida:
   * no se guarda en el navegador ni viaja a ningún lado. Va en un `useRef` y no
   * en el estado porque cambiarla no tiene que redibujar la mesa.
   */
  const ficha = useRef(fichaVacia());
  const manoObservada = useRef<Partida | null>(null);
  /** Se prende cuando las ayudas te salvan una flor que ibas a perder. */
  const [florSalvada, setFlorSalvada] = useState(false);
  /**
   * SE TERMINÓ LA MANO Y LAS CARTAS SE VAN AL MAZO.
   *
   * No apenas termina: se esperan dos segundos. Al cerrarse una mano lo último
   * que pasó fue una carta que decidió todo, y barrer la mesa en el mismo
   * instante te saca de la pantalla justo lo que estás mirando. Dos segundos es
   * el tiempo de darse cuenta de qué pasó; recién ahí se levantan.
   *
   * Es sólo visual: el motor ya cerró la mano, esto no cambia ni un punto.
   */
  const [barrida, setBarrida] = useState(false);
  /** El cartel de fin de mano, que ahora espera a que la mesa se levante. */
  const [carteleada, setCarteleada] = useState(false);

  /**
   * En qué anda el reparto. "repartiendo": las cartas salen del mazo y están
   * boca abajo. "volteando": ya están todas y se dan vuelta. "listo": se juega.
   *
   * Mientras no está en "listo" no se puede tocar nada y el bot tampoco piensa:
   * el que reparte no juega al mismo tiempo.
   */
  const [faseReparto, setFaseReparto] = useState<"repartiendo" | "volteando" | "listo">(
    "listo",
  );
  /** Sube de a uno con cada mano nueva. Es lo que dispara el reloj del reparto. */
  const [manoNro, setManoNro] = useState(0);
  /**
   * Si ESTA mano se está repartiendo con animación.
   *
   * Se decide una sola vez, al repartir, y el reloj de abajo lee de acá. Si
   * cada uno preguntara por su cuenta si hay animaciones, podrían contestarse
   * distinto —alcanza con que el sistema cambie la preferencia justo en el
   * medio— y la mesa quedaba trabada en "repartiendo" para siempre, sin cartas
   * que tocar y sin reloj que la destrabe.
   */
  const animandoReparto = useRef(false);
  const repartiendo = faseReparto !== "listo";
  const carasArriba = faseReparto !== "repartiendo";

  /**
   * El verso que está diciendo el rival, si le tocó versear. Es puro color: el
   * canto de verdad ya está aplicado en la partida cuando esto aparece.
   */
  const [verso, setVerso] = useState<{ lineas: readonly string[]; canto: string } | null>(
    null,
  );
  /** El último que dijo, para no repetirle la misma copla dos veces seguidas. */
  const ultimoVerso = useRef<string | undefined>(undefined);

  /**
   * DOS SEGUNDOS Y SE LEVANTA LA MESA.
   *
   * Vive acá arriba y no adentro del dibujo porque tiene que arrancar cuando
   * cambia la fase, no cuando se dibuja: si la mano termina y no tocás nada, la
   * mesa se limpia igual.
   *
   * `manoNro` está entre las dependencias para que el reloj se reinicie con
   * cada mano nueva: sin eso, una mano que termina rápido podía heredar el
   * temporizador de la anterior.
   */
  useEffect(() => {
    if (!p || p.fase === "jugando") return;
    const barre = setTimeout(() => setBarrida(true), ESPERA_ANTES_DE_BARRER);
    const cartel = setTimeout(
      () => setCarteleada(true),
      ESPERA_ANTES_DE_BARRER + DURA_BARRIDO,
    );
    return () => {
      clearTimeout(barre);
      clearTimeout(cartel);
    };
  }, [p, manoNro]);

  /** Empieza una mano nueva y larga el reparto. Todas las manos pasan por acá. */
  const repartirNueva = (nueva: Partida) => {
    setVerso(null);
    setFlorSalvada(false);
    setMenuEnvido(false);
    setBarrida(false);
    setCarteleada(false);
    // La fase se pone ACÁ y no en el efecto de abajo a propósito: si esperara al
    // efecto, habría un cuadro con la mano nueva ya dada vuelta antes de que
    // arranque la animación, y se vería el parpadeo.
    animandoReparto.current = animacionesPrendidas();
    setFaseReparto(animandoReparto.current ? "repartiendo" : "listo");
    setP(nueva);
    setManoNro((n) => n + 1);
  };

  // El reparto se hace en el navegador: si se hiciera al generar la página,
  // todos verían siempre las mismas cartas.
  useEffect(() => {
    const progreso = leerProgreso();
    setAyudas(progreso.ayudas);
    setMarcas(progreso.rivales);
    // Sólo para el modo libre: en historia el rival ya salió del departamento.
    if (rivalPedido) setRivalElegido(buscarPersonalidad(rivalPedido));
    else if (progreso.ultimoRival) setRivalElegido(buscarPersonalidad(progreso.ultimoRival));
    ficha.current = fichaVacia();
    ultimoVerso.current = undefined;
    repartirNueva(nuevaPartida());
    // Sólo se vuelve a repartir de cero si cambió a quién enfrentás: si acá
    // entrara `repartirNueva`, se rearmaría la partida en cada dibujado.
  }, [rivalPedido, rivalDelDepto]);

  // El reloj del reparto: darlas vuelta, y después soltar el juego.
  useEffect(() => {
    if (manoNro === 0 || !animandoReparto.current) return;
    const alVoltear = setTimeout(() => setFaseReparto("volteando"), MOMENTO_VOLTEO);
    const alTerminar = setTimeout(() => setFaseReparto("listo"), FIN_REPARTO);
    return () => {
      clearTimeout(alVoltear);
      clearTimeout(alTerminar);
    };
  }, [manoNro]);

  // El verso se borra solo. Si contestás antes, lo borra `hacer`.
  useEffect(() => {
    if (!verso) return;
    const reloj = setTimeout(() => setVerso(null), DURA_VERSO);
    return () => clearTimeout(reloj);
  }, [verso]);

  // El turno del bot, con la personalidad del rival elegido
  useEffect(() => {
    if (!p || p.fase !== "jugando" || p.turno !== "rival" || repartiendo) return;
    const reloj = setTimeout(() => {
      const accion = decidirJugada(p, "rival", Math.random, rival, ficha.current);
      if (!accion) return;

      // Con qué verso lo canta, si es de los que versean. Se decide ANTES de
      // aplicar la acción porque el verso depende de cómo está la mesa en ese
      // momento: un "no se ponga tan contento" le contesta a un envido que
      // todavía está sin resolver.
      const copla = versoDelCanto(
        accion,
        p,
        rival.verso,
        Math.random,
        ultimoVerso.current,
      );
      const despues = aplicar(p, accion, "rival");
      if (copla) {
        ultimoVerso.current = copla.id;
        // El primer evento nuevo ES el canto. El último no sirve: una flor que
        // se cobra sola deja abajo el "+3" y ahí se leería eso en vez del canto.
        setVerso({ lineas: copla.lineas, canto: despues.eventos[p.eventos.length]?.texto ?? "" });
      }
      setP(despues);
    }, DEMORA_BOT);
    return () => clearTimeout(reloj);
  }, [p, rival, repartiendo]);

  // Al cerrar cada mano el rival repasa lo que te vio hacer. Sólo mira las
  // cartas que quedaron sobre la mesa y los tantos que se cantaron en voz alta:
  // nunca tu mano (ver lectura.ts).
  useEffect(() => {
    if (!p || p.fase === "jugando" || manoObservada.current === p) return;
    manoObservada.current = p;
    ficha.current = observarMano(ficha.current, p, "vos");
  }, [p]);

  // Cuando termina una partida se anota, una sola vez
  useEffect(() => {
    if (!p || p.fase !== "partida-terminada" || anotada.current === p) return;
    anotada.current = p;
    setMarcas(anotarPartida(rival.id, p.ganadorPartida === "vos").rivales);
  }, [p, rival]);

  if (!p) return <Cargando />;

  const hacer = (accion: Accion) => {
    setMenuEnvido(false);
    setFlorSalvada(false);
    setVerso(null); // contestaste: el verso ya cumplió
    if (repartiendo) return; // todavía se está repartiendo

    /**
     * RED DE SEGURIDAD. En la mesa rige "flor no cantada, flor perdida": si
     * tirás carta sin cantarla, te quedaste sin los 3 puntos. Con las ayudas
     * prendidas eso no pasa: se canta sola y se te avisa.
     *
     * Con las ayudas apagadas rige la regla de verdad y la flor se puede
     * perder, que es como se juega y como se aprende a no olvidársela.
     */
    const esCantoDeFlor = accion.tipo === "flor" || accion.tipo === "flor-canto";
    if (ayudas && !esCantoDeFlor && puede("flor")) {
      const conLaFlor = aplicar(p, { tipo: "flor" }, "vos");
      setFlorSalvada(true);
      // Si después de cantarla la jugada sigue en pie, se hace igual. Si el
      // rival también tiene flor, ahora hay que contestarle a él, y `aplicar`
      // devuelve el mismo estado sin tocar nada.
      setP(aplicar(conLaFlor, accion, "vos"));
      return;
    }

    setP(aplicar(p, accion, "vos"));
  };

  // Mientras se reparte no hay nada que hacer: la lista vacía apaga TODOS los
  // botones de una, sin tener que acordarse de deshabilitar cada uno.
  const posibles = repartiendo ? [] : accionesPosibles(p, "vos");
  /**
   * QUÉ BOTONES VAN. Sale de `lib/botonera.ts`, que es una función pura con
   * test propio, y no de mirar la lista a mano acá abajo.
   *
   * El motivo es un bug de verdad: la barra tenía dos ramas —"algo que
   * contestar" y "todo lo demás"— y cuando te cantaban algo se mostraba SÓLO
   * quiero y no quiero. Pero contestar no es lo único que podés hacer: podés
   * subir el envido que te subieron, retrucar, o cantar envido arriba de un
   * truco. Todo eso vivía en la otra rama y no había forma de llegarle.
   *
   * Ahora lo que decide `contestando` es la FORMA de la barra, no su
   * contenido, y el test verifica que ninguna acción del motor se quede sin
   * botón.
   */
  const b = botonera(posibles);
  const puede = (tipo: Accion["tipo"]) => posibles.some((a) => a.tipo === tipo);
  const miTurno = p.turno === "vos" && p.fase === "jugando" && !repartiendo;
  /**
   * De qué lado de la mesa está el mazo.
   *
   * Del lado del que reparte, que en mano a mano es el pie. Si sos mano te
   * queda a la izquierda; si sos pie, a la derecha. Cambia solo de mano en
   * mano, igual que en la mesa, y es la única señal que te dice de quién es el
   * reparto sin que haya que escribirlo.
   */
  const ladoMazo = p.quienEsMano === "vos" ? "izquierda" : "derecha";
  const soyMano = p.quienEsMano === "vos";
  /** Te cantaron flor a secas y te toca contestar: ahí "no quiero" es achicarse. */
  const meCantaronFlor = p.pendiente?.tipo === "flor" && p.pendiente.cadena.length === 0;
  /** Si ya hay un envido en la mesa, lo que hacés es subirlo; si no, abrirlo. */
  const subiendoEnvido = p.pendiente?.tipo === "envido";
  const bazaActual = p.bazas[p.bazas.length - 1];
  /**
   * POR QUÉ NO HAY ENVIDO.
   *
   * "El envido va primero": si te cantan truco antes de que hayas hablado,
   * podés contestar con envido. Pero hay tres casos donde la regla dice que no,
   * y hasta ahora el botón simplemente desaparecía sin decir nada. Desde tu
   * silla eso se veía como un error del juego —sobre todo cuando el rival había
   * cantado flor y el aviso se perdía debajo del canto siguiente—.
   *
   * Sólo se calcula en el momento exacto en que la regla tendría que aplicar:
   * truco sin contestar, primera baza y todavía no hablaste.
   *
   * NO SOPLA NADA. Mira `florCantada`, que es lo que se dijo en voz alta, nunca
   * `flor[rival].tiene`, que son sus cartas.
   */
  const motivoSinEnvido = (() => {
    if (p.pendiente?.tipo !== "truco" || p.pendiente.de === "vos") return null;
    if (p.bazas.length !== 1 || p.yaHablo.vos) return null;
    // Si hay algo para cantar, no falta nada que explicar.
    if (b.envidos.length > 0 || b.flor || b.florCantos.length > 0) return null;
    if (p.florCantada.rival) return "Cantó flor: la flor anula el envido";
    if (p.florCantada.vos) return "Cantaste flor: el envido queda anulado";
    if (p.historial.some((h) => h.tipo === "envido")) return "El envido ya se jugó en esta mano";
    return null;
  })();

  /**
   * QUE LA BARRA NUNCA CORTE TU MANO.
   *
   * La barra crece hacia arriba: la fila de siempre, más la de la flor cuando se
   * puede cantar, más el menú de envido cuando está abierto. Antes se calculaba
   * su alto a ojo (`filas × 64 + …`) para reservarle un `padding` a la mesa, y
   * el número había que mantenerlo a mano cada vez que se tocaba un botón.
   *
   * Ahora la barra está DENTRO del flujo, como última hermana de la escena, y
   * la escena es `flex-1 min-h-0`: cuando la barra crece, la escena se achica
   * sola. La invariante es la misma —la mano nunca queda debajo de la barra—
   * pero ya no depende de que alguien acierte un número.
   */

  /** Dónde se juega y cómo es la cara del que tenés enfrente. */
  const ambiente = ambienteDe(rival.departamento);
  /* El tono del departamento, el mismo del mapa. Es lo que separa a Salto de
     Paysandú, que comparten el ambiente del litoral y hasta ahora eran la
     misma pantalla. */
  const acento = acentoDe(rival.departamento);
  const caraRival = caraDe(rival.id);
  // El tanto se cuenta con las tres cartas del reparto, nunca con las que quedan
  const miFlor = p.flor.vos;
  const miTanto = valorEnvido(p.manoInicial.vos, p.muestra);

  /**
   * El ancho del abanico, para que la mano lo siga.
   *
   * Las cartas se montan 16px entre vecinas (el `-mx-2` de cada una). Si la mano
   * se dimensionara con un múltiplo fijo del ancho de UNA carta, al quedarte una
   * sola seguiría siendo la mano de tres y taparía media pantalla.
   */
  const nCartas = p.cartas.vos.length;

  /**
   * Cuántas bazas tienen algo puesto, y en qué lugar va cada una.
   *
   * `p.bazas` incluye SIEMPRE la que está abierta, todavía vacía. Si el par se
   * centrara sobre esa cuenta, con una sola carta en la mesa el par quedaría
   * corrido media posición a la izquierda y la mesa se vería torcida.
   */
  const bazasJugadas = p.bazas.filter((b) => b.vos || b.rival).length;
  const lugarDeBaza = (i: number) => (i - (Math.max(bazasJugadas, 1) - 1) / 2) * d.baza.paso;
  const anchoAbanico = `calc(${nCartas} * ${ANCHO_MANO} - ${Math.max(0, nCartas - 1) * 16}px)`;
  /**
   * EL ANCHO DE LA MANO. Ojo: NO es el del abanico.
   *
   * Estaba escrito `anchoAbanico + 0,8 · ANCHO_MANO`, y como el SVG va en
   * `h-auto` el alto sigue al ancho: de tres cartas a una la mano pasaba de
   * 3,8 anchos de carta a 1,8, o sea **perdía más de la mitad**. Por eso con
   * una sola carta —y durante el reparto, mientras las otras dos todavía
   * vienen volando— se veía un bulto y no una mano.
   *
   * Una mano no se achica cuando tirás una carta: los dedos se CIERRAN un
   * poco y nada más. Los dos números de acá abajo están elegidos para que con
   * TRES cartas dé exactamente lo mismo que antes —eso ya estaba bien— y con
   * una se cierre un 37% en vez de un 49%, que es la diferencia entre una mano
   * que cierra los dedos y una que se achica.
   *
   * Que siga colgando del abanico y no sea fijo tampoco es capricho: una mano
   * fija del tamaño de tres cartas, con una sola carta adelante, tapa media
   * pantalla en un celular. Es un punto medio, y se cierra MIRANDO las
   * capturas de 3, 2 y 1 que saca `herramientas/mirar-mesa-nueva.mjs`, no a
   * ojo ni en papel.
   */
  const anchoMano = `calc(1.5 * ${ANCHO_MANO} + 0.745 * (${anchoAbanico}))`;

  /* Del lado del mazo va el mazo; del otro, el mate y la libreta. Los diseños
     guardan el `u` de la IZQUIERDA y acá se espeja, así que hay un solo número
     por objeto y no dos que se puedan desincronizar. */
  const espejo = (u: number) => (ladoMazo === "izquierda" ? u : 1 - u);
  const uMazo = espejo(d.mazo.u);
  const uOtro = espejo(d.mate.u);
  // La libreta es lo más ancho de la mesa: va más adentro que el mate para que
  // no se salga por el costado. En el celular no está y esto queda en null.
  const uLibreta = d.libreta ? espejo(d.libreta.u) : null;
  const altoRival = altoDelRival(d.fondo);
  /**
   * Dónde va una carta jugada, y hacia dónde se va cuando se levanta la mesa.
   *
   * `orden` es el turno en la fila del barrido: se van de a una, no las seis de
   * golpe, que es como se levanta una mesa de verdad. No apunta al mazo con
   * precisión —para eso habría que medir píxeles en vivo— pero sale para SU
   * lado, que es lo que hace que se lea "se las llevó el que reparte".
   */
  const alMazo = (u: number, v: number, orden: number): React.CSSProperties => ({
    ...estiloEnMesa(u, v),
    ...(barrida
      ? ({
          "--hacia-x": ladoMazo === "izquierda" ? "-130px" : "130px",
          "--giro-mazo": ladoMazo === "izquierda" ? "-16deg" : "16deg",
          animationDelay: `${orden * 70}ms`,
        } as React.CSSProperties)
      : {}),
  });
  /**
   * EL RIVAL, cruzando el borde de la mesa.
   *
   * Sale como variable porque el cajón —la medida y el anclaje— lo comparte con
   * su sombra, que se dibuja del otro lado de la tabla.
   *
   * ── Se ancla al CANTO DE LA MESA, no a un `bottom` a ojo ──────────────
   * Como la cabeza queda fuera del encuadre, la figura tiene que tocar el borde
   * de arriba de la escena SIEMPRE: si le queda un hueco arriba deja de leerse
   * "cortado por el marco" y pasa a leerse "torso flotando sin cabeza", que es
   * peor que la cabeza.
   *
   * La cuenta: en el dibujo el canto de la mesa está en `borde` de `alto`, y en
   * la escena está en `d.fondo`. Igualando las dos, el alto de la figura sale
   * solo y el encuadre queda igual en las siete pantallas, de 320×568 a
   * 1440×900. Por eso se mide en % del ALTO y el ancho lo pone `aspect-ratio`:
   * al revés habría que saber el alto para calcular el `bottom`, y no se puede
   * en CSS.
   */
  const cajonRival = {
    height: `${altoRival}%`,
    bottom: `${100 - d.fondo - (1 - RIVAL_VB.borde / RIVAL_VB.alto) * altoRival}%`,
    aspectRatio: `${RIVAL_VB.ancho} / ${RIVAL_VB.alto}`,
  };
  const capaRival = (
    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={cajonRival}>
      <RivalSentado ficha={caraRival} nombre={rival.nombre} luz={ambiente.luz} />
    </div>
  );

  return (
    // La mesa ocupa todo el alto que le queda a la pantalla y NUNCA hace
    // scroll: un juego que te obliga a scrollear para ver tus propias cartas
    // no se puede jugar. Tres hermanas en columna —barra, escena, cantos— y la
    // del medio es la que cede.
    <div className="mesa-pantalla-completa relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0d0906]">
      {/* ─── La barra de juego ─────────────────────────────────────────
          Reemplaza a la del sitio mientras jugás. En las referencias no hay
          navegación adentro de la mesa: hay una franja finita con cómo salir y
          poco más. Los ~45px que se ahorran son cartas, y en una pantalla de
          640 de alto eso se nota. */}
      <div className="barra-juego relative z-30 flex shrink-0 items-center justify-between gap-2 px-2">
        <Link
          href={esHistoria ? "/jugar/gira" : "/jugar"}
          className="flex items-center gap-1 rounded px-1.5 py-1 font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wide text-crema/75 transition-colors hover:text-crema"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {esHistoria ? "Mapa" : "Salir"}
        </Link>

        {/* EL MARCADOR VA ACÁ, en el lugar que tenía el nombre del lugar.
            Es lo que hacen las referencias y, sobre todo, es lo que permite
            sacar la libreta del celular sin que dejes de ver cómo va. El
            nombre del lugar era decorativo —el departamento ya está en el
            medallón— así que vuelve sólo donde sobra ancho. */}
        <div className="flex min-w-0 items-center gap-2.5">
          <MarcadorBarra vos={p.puntos.vos} rival={p.puntos.rival} />
          <span className="hidden truncate font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-[0.14em] text-dorado/60 md:inline">
            {rival.lugar} · {ambiente.nombre}
          </span>
        </div>

        <button
          onClick={() => {
            const nuevo = !ayudas;
            setAyudas(nuevo);
            guardarPreferencia("ayudas", nuevo);
          }}
          className="shrink-0 whitespace-nowrap rounded border border-crema/20 px-2 py-0.5 font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-wide text-crema/70 transition-colors hover:border-crema/50 hover:text-crema"
        >
          Ayudas: {ayudas ? "sí" : "no"}
        </button>
      </div>

      {/* ─── La escena ─────────────────────────────────────────────────
          El ancho se limita CONTRA EL ALTO y no sólo con un máximo fijo. En una
          ventana baja y ancha, un encuadre de 1280×400 deja la mesa como una
          franja y no entra nada; atado al alto, la escena se angosta y queda el
          mismo encuadre que en el celular, con la penumbra a los costados.

          EL TOPE ES UN EQUILIBRIO, no un máximo cualquiera. Con 920px quedaban
          dos barras negras de 180px a los costados y la mesa no llegaba a los
          bordes como en la referencia. Pero llenar la ventana entera es peor:
          los objetos se miden en `vh`, así que al crecer sólo el ancho TODO se
          ve más chico, y la referencia tiene justamente lo contrario, un
          encuadre cerrado con las cartas enormes. 1180px es donde la mesa llega
          casi a los bordes sin que se achique lo que hay que mirar. */}
      <div className="relative flex min-h-0 flex-1 justify-center">
        <div
          className="penumbra relative w-full overflow-hidden"
          style={{ maxWidth: "min(1180px, 158vh)" }}
        >
          {/* El telón: el color del lugar, detrás de todo. Se ve por las
              esquinas transparentes de la mesa, allá donde la madera se
              terminó. */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: ESCENAS[ambiente.clave].colorFondo }}
          />

          {/* el ambiente, al fondo */}
          <div className="absolute inset-x-0 top-0" style={{ height: `${d.fondo}%` }}>
            <FondoAmbiente ambiente={ambiente} acento={acento} />
          </div>

          {/* EL RIVAL VA ANTES DE LA TABLA, y no es un detalle de orden.
              No tiene brazos sobre la madera, así que nada suyo está delante de
              la mesa. Dibujado por encima, el torso terminaría con un corte
              recto justo sobre el canto y se leería un recorte de cartón
              apoyado detrás. Metido debajo, es la MESA la que lo tapa —que es
              lo que pasa de verdad— y por eso se lee alguien sentado del otro
              lado. Su sombra va después: una sombra cae SOBRE la madera. */}
          {capaRival}
          <div className="absolute inset-x-0 bottom-0" style={{ top: `${d.fondo}%` }}>
            <TablaMesa ambiente={ambiente} acento={acento} />
          </div>
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={cajonRival}>
            <SombraRival ficha={caraRival} />
          </div>


          {/* ─── Lo que está APOYADO en la mesa ────────────────────────
              Todo acá adentro se ubica con (u, v) y recibe su escala sola: lo
              que está lejos sale más chico sin que nadie lo escriba.

              Los `data-mesa` no son decoración: son el agarre con el que
              `herramientas/mirar-mesa-nueva.mjs` mide el rectángulo REAL de cada
              objeto en el navegador y verifica que ninguno se le monte al rival
              ni se solape con otro. Es lo que decide cuánto puede subir la
              libreta, que a ojo no se puede saber. Mismo papel que cumple
              `.mano-abanico` para `mirar-mesa.mjs`. */}
          <div
            data-mesa="tabla"
            /* Cuál de los dos diseños quedó activo. Es el agarre con el que
               `mirar-mesa-nueva.mjs` verifica que en una compu se haya elegido
               el de compu: sin esto, medir seis pantallas y que den 0 no prueba
               nada, porque podrían estar todas usando el mismo. */
            data-diseno={d === PC ? "pc" : "celular"}
            /* En qué anda la mano. Sin esto, una herramienta que mire "no puedo
               jugar y hay cartas en la mesa" confunde el turno del rival con el
               fin de la mano. */
            data-fase={p.fase}
            /* Qué canto está esperando respuesta, y el último eslabón de la
               cadena. Lo usa `mirar-web.mjs` para distinguir "no hay con qué
               subir" —que sería un bug— de "arriba de la falta envido no hay
               nada", que es la regla del juego. */
            data-pendiente={
              p.pendiente ? `${p.pendiente.tipo}:${p.pendiente.cadena.at(-1) ?? ""}` : "nada"
            }
            className="absolute inset-x-0 bottom-0"
            style={{ top: `${d.fondo}%` }}
          >
            {/* LA LIBRETA, al costado y cerca. Estaba en el centro del borde
                lejano, o sea justo encima del pecho del rival, y encima salía
                chica: allá la perspectiva achica todo. Ahora va al costado, a
                la altura del mazo pero del lado libre, y bastante más grande.

                SÓLO EN LA COMPU. En el celular se comía el cuarto de arriba de
                la mesa y los puntos los dice `MarcadorBarra`, en la franja de
                arriba, que no le saca alto a la mesa. */}
            {d.libreta && uLibreta !== null && (
              <div
                data-mesa="libreta"
                style={estiloEnMesa(
                  uLibreta,
                  d.libreta.v,
                  escalaEnMesa(d.libreta.tamano) / escalaEnMesa(d.libreta.v),
                )}
              >
                <Marcador vos={p.puntos.vos} rival={p.puntos.rival} ancho={d.libreta.ancho} />
              </div>
            )}

            {/* ── LAS TRES QUE LE REPARTEN A ÉL ───────────────────────────
                Existen SÓLO mientras dura el reparto. Él no tiene las cartas
                sobre la mesa —las mira abajo del canto—, pero el reparto tiene
                que seguir mostrando las seis salir del mazo: si sólo salieran
                las tuyas parecería que le reparten a nadie.

                Así que llegan contra el canto lejano y de ahí bajan
                desvaneciéndose, como si se las llevara. Cada una se va apenas
                llega, con el mismo `retrasoDeReparto` que las tuyas, que es lo
                que mantiene el ritmo mano-pie-mano-pie.

                Van ACÁ y no en el cajón del rival: el cajón está debajo de la
                tabla, así que ahí adentro la mesa las taparía. */}
            {repartiendo && (
              <div
                data-mesa="reparto"
                /* CORRIDAS AL LADO CONTRARIO AL MAZO. Repartidas al medio le
                   caían justo encima de la libreta: se veía media hoja tapada
                   por tres dorsos durante todo el reparto.

                   Se mira `uOtro` —el mate— y no la libreta, que en el celular
                   no existe. Da lo mismo: los dos van siempre del lado
                   contrario al mazo, así que es el mismo costado y encima es
                   uno que está en los dos diseños. */
                style={estiloEnMesa(uOtro > 0.5 ? 0.37 : 0.63, d.reparto.v)}
                className="pointer-events-none"
              >
                {/* SEPARADAS Y CADA UNA TORCIDA DISTINTO. Pegadas y a escuadra
                    formaban un bloque de dorsos rojos y, mientras duraba el
                    reparto, se leía un segundo mazo allá arriba. Tres cartas
                    que le acaban de tirar caen desparejas, no apiladas. */}
                <div className="flex gap-[7px]">
                  {p.cartas.rival.map((_, i) => (
                    <span
                      key={i}
                      className="anim-reparte-baja block"
                      style={
                        {
                          animationDelay: `${retrasoDeReparto("rival", i, soyMano)}ms`,
                          "--desde-x": `${ladoMazo === "izquierda" ? -120 : 120}px`,
                          "--desde-y": "78px",
                          "--giro": `${[-8, 5, -3][i] ?? 0}deg`,
                        } as React.CSSProperties
                      }
                    >
                      <Carta oculta style={{ width: d.reparto.ancho }} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* el mazo con la muestra metida abajo, del lado del que reparte */}
            <div data-mesa="mazo" style={estiloEnMesa(uMazo, d.mazo.v)}>
              <Mazo
                muestra={p.muestra}
                lado={ladoMazo}
                revelada={carasArriba}
                ancho={d.mazo.ancho}
              />
            </div>

            {/* el mate, siempre del lado contrario al mazo */}
            <div data-mesa="mate" style={estiloEnMesa(uOtro, d.mate.v)}>
              <div className="relative" style={{ height: d.mate.alto, aspectRatio: "60 / 84" }}>
                <SombraApoyada ancho={0.55} desvio={ladoMazo === "izquierda" ? 0.3 : -0.3} />
                <Mate />
              </div>
            </div>

            {/* ── ACÁ NO VA UN DESCARTE, Y ES A PROPÓSITO ─────────────────
                Había una pila de dorsos boca abajo con las cartas ya jugadas,
                apoyada en `uMazo`: o sea justo debajo del mazo, del mismo
                color y del mismo tamaño. En la pantalla eran DOS MAZOS, que es
                un error: el mazo es la única señal que dice de quién es el
                reparto, y con dos no dice nada.

                Y encima no agregaba nada. Contaba las mismas cartas de
                `p.bazas` que están dibujadas más abajo BOCA ARRIBA: mostraba
                tapado lo que al lado ya se ve destapado.

                En una mesa de verdad las cartas de la baza se levantan. Acá
                **se quedan a la vista toda la mano**, decidido así el
                31/8/2026: poder ver qué se jugó vale más que la costumbre. Se
                levantan recién cuando apretás "Siguiente mano", o sea cuando
                vos decidís que ya miraste. No volver a poner una pila acá. */}

            {/* Las bazas: pares cruzando la mesa, CENTRADOS como grupo. La tuya
                se monta sobre la de él, como quedan de verdad cuando las tirás
                una encima de otra.

                Centradas y no ancladas a la izquierda: con una sola baza en la
                mesa —que es la mitad del tiempo— quedaba tirada contra el borde
                y la mesa se veía torcida. */}
            {/* AL TERMINAR LA MANO SE VAN TODAS AL MAZO, escalonadas y hacia el
                lado donde está el mazo. `alMazo` mezcla el lugar en la mesa con
                el viaje, y el viaje va en `translate`/`rotate` sueltos y NO en
                `transform`, porque el `transform` ya lo está usando la
                perspectiva para ubicarlas: animarlo se lo comería. */}
            {p.bazas.map((baza, i) => (
              <div key={i}>
                {baza.rival && (
                  <div
                    data-mesa="baza"
                    className={barrida ? "anim-al-mazo" : undefined}
                    style={alMazo(0.5 + lugarDeBaza(i), d.baza.suya, i * 2)}
                  >
                    <CartaApoyada carta={baza.rival} de="rival" ancho={d.baza.ancho} />
                  </div>
                )}
                {baza.vos && (
                  <div
                    data-mesa="baza"
                    className={barrida ? "anim-al-mazo" : undefined}
                    style={alMazo(0.53 + lugarDeBaza(i), d.baza.tuya, i * 2 + 1)}
                  >
                    <CartaApoyada carta={baza.vos} de="vos" ancho={d.baza.ancho} />
                  </div>
                )}
                {baza.ganador && (
                  <div
                    className={barrida ? "anim-al-mazo" : undefined}
                    style={alMazo(0.5 + lugarDeBaza(i), d.baza.ganador, i * 2)}
                  >
                    <span className="block whitespace-nowrap font-[family-name:var(--font-ui)] text-[9px] uppercase tracking-wide text-crema/70 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                      {baza.ganador === "parda" ? "parda" : baza.ganador === "vos" ? "tuya" : "suya"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ─── El medallón y lo que se dice ──────────────────────────
              El medallón es el ancla de la que cuelga el globo: por eso van
              juntos y en la misma esquina. */}
          <div className="absolute right-1.5 top-1.5 z-20 flex w-[min(78%,340px)] flex-col items-end gap-1">
            <Medallon rival={rival} deLaGira={esHistoria} onCambiar={() => setEligiendo(true)} />
            <Dialogo
              lineas={verso?.lineas}
              canto={verso?.canto}
              eventos={p.eventos}
              onCerrarVerso={() => setVerso(null)}
            />
          </div>

          {/* ─── Tu mano ─────────────────────────────────────────────────
              Cuando no es tu turno se apaga TODA junta —dedos, cartas y
              pulgar— y no carta por carta. Cada carta con su `opacity` propia
              se volvía translúcida y dejaba ver el dorso de tu propia mano a
              través del papel: las cartas se veían grises y con un bulto
              adentro. Una mano es un objeto solo y se apaga como uno solo. */}
          <div
            className={`absolute inset-x-0 bottom-0 z-10 transition-opacity duration-200 ${
              miTurno && b.jugar ? "" : "opacity-75"
            }`}
          >
            {florSalvada && (
              <p className="mb-0.5 text-center font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-wide text-dorado/90 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                Te cantamos la flor: se perdía
              </p>
            )}

            {/* La ayuda espera a que las cartas estén dadas vuelta: cantarte el
                tanto de una mano que todavía no viste rompe el reparto. */}
            {ayudas && carasArriba && (
              <p className="relative z-10 mb-2 text-center font-[family-name:var(--font-ui)] text-[11px] uppercase leading-tight tracking-wide text-dorado drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] sm:text-xs">
                {miFlor.tiene ? (
                  <>
                    Tenés flor: {miFlor.valor}
                    {puede("flor") && (
                      <span className="ml-2 normal-case tracking-normal text-crema/70">
                        (cantala antes de tirar)
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Tu tanto: {miTanto}
                    <span className="ml-2 normal-case tracking-normal text-crema/70">
                      ({explicarEnvido(p.manoInicial.vos, p.muestra)})
                    </span>
                  </>
                )}
              </p>
            )}

            {/* LAS CARTAS VAN ENTRE LOS DEDOS. El dorso de la mano se dibuja
                antes que el abanico y el pulgar después: por eso son dos
                piezas y no una. */}
            <div
              className="relative flex items-end justify-center"
              style={{ paddingBottom: `calc(0.26 * ${ANCHO_MANO})` }}
            >
              <span
                className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 ${
                  repartiendo ? "anim-entra-mano" : ""
                }`}
                style={{
                  bottom: `calc(-0.06 * ${ANCHO_MANO})`,
                  width: anchoMano,
                  animationDelay: `${retrasoDeReparto("vos", 0, soyMano)}ms`,
                }}
              >
                <DedosAtras ancho="100%" luz={ambiente.luz} />
              </span>

              <div className="mano-abanico relative z-10 flex justify-center">
                {p.cartas.vos.map((carta, i) => (
                  <CartaEnMano
                    key={`${carta.numero}-${carta.palo}`}
                    carta={carta}
                    posicion={i}
                    total={p.cartas.vos.length}
                    pieza={ayudas && esPieza(carta, p.muestra)}
                    habilitada={miTurno && b.jugar}
                    tapada={!carasArriba}
                    viajando={faseReparto === "repartiendo"}
                    retrasoViaje={retrasoDeReparto("vos", i, soyMano)}
                    retrasoVolteo={i * ENTRE_VOLTEOS}
                    desdeX={ladoMazo === "izquierda" ? -140 : 140}
                    onClick={() => hacer({ tipo: "jugar", carta })}
                  />
                ))}
              </div>

              {/* El pulgar se mide contra LA MANO, no contra una carta.
                  Clavado en 1,7 anchos de carta mientras la mano se achicaba,
                  con una sola carta terminaba casi tan ancho como la mano
                  entera: la proporción se rompía justo en el caso que se veía
                  mal. 0,48 es la proporción que YA tenía con tres cartas, así
                  que con tres no cambia nada y con una y dos se arregla. */}
              <span
                className={`pointer-events-none absolute left-1/2 z-20 ${
                  repartiendo ? "anim-entra-mano" : ""
                }`}
                style={{
                  bottom: `calc(-0.068 * (${anchoMano}))`,
                  width: `calc(0.48 * (${anchoMano}))`,
                  transform: "translateX(-56%)",
                  animationDelay: `${retrasoDeReparto("vos", 0, soyMano)}ms`,
                }}
              >
                <PulgarAdelante ancho="100%" luz={ambiente.luz} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── La barra de cantos ────────────────────────────────────────
          Está EN EL FLUJO, como última hermana: cuando le aparece una fila, la
          escena de arriba se achica sola y tu mano nunca queda debajo. */}
      <div className="relative z-30 shrink-0 border-t-2 filo-dorado bg-[#160f0a]">
        {/* Cuando "el envido va primero" no se puede, se dice por qué. Antes el
            botón desaparecía y nada más, y parecía que el juego estaba roto. */}
        {motivoSinEnvido && (
          <p className="mx-auto max-w-[760px] px-2 pt-1 text-center font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-wide text-dorado/80">
            {motivoSinEnvido}
          </p>
        )}

        {/* La flor la cantás vos. El botón sólo aparece cuando de verdad se
            puede: con flor, en la primera baza y sin haber hablado todavía.
            Si se va la ventana, se pierde (salvo con las ayudas prendidas). */}
        {(b.flor || b.florCantos.length > 0) && (
          <div className="mx-auto flex max-w-[760px] flex-wrap gap-1 border-b border-crema/10 p-1">
            {b.flor && (
              <BotonCanto canto="flor" onClick={() => hacer({ tipo: "flor" })} tono="dorado">
                {meCantaronFlor ? "Yo también" : "¡Flor!"}
              </BotonCanto>
            )}
            {b.florCantos.map((canto) => (
              <BotonCanto key={canto} canto={canto} onClick={() => hacer({ tipo: "flor-canto", canto })} tono="bordo">
                {canto === "con-flor-envido" ? "Con flor envido" : "Contraflor al resto"}
              </BotonCanto>
            ))}
          </div>
        )}

        {/* ── LO QUE PODÉS SUBIR ──────────────────────────────────────────
            Cuando NO hay nada que contestar, esta fila la abre y la cierra el
            botón "Envido" de abajo, como siempre.

            Cuando SÍ hay algo que contestar, se muestra sola y sin botón que la
            esconda, porque ahí es donde estaba el bug: te cantaban real envido y
            la única salida era querer o no querer. Subir es una jugada del
            truco, no una opción avanzada: si está disponible, se ve. */}
        {((menuEnvido && b.envidos.length > 0) ||
          (b.contestando && (b.envidos.length > 0 || b.truco))) && (
          <div className="mx-auto flex max-w-[760px] flex-wrap items-center gap-1 border-b border-crema/10 p-1">
            {b.contestando && (
              <span className="px-1 font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-[0.14em] text-crema/50">
                o subí
              </span>
            )}
            {b.envidos.map((canto) => (
              <BotonCanto key={canto} canto={canto} onClick={() => hacer({ tipo: "envido", canto })} tono="dorado">
                {canto === "falta-envido"
                  ? `Falta (${laFalta(p.puntos)})`
                  : canto === "real-envido"
                    ? "Real envido"
                    : "Envido"}
              </BotonCanto>
            ))}
            {b.contestando && b.truco && (
              <BotonCanto canto="truco" onClick={() => hacer({ tipo: "truco" })} tono="bordo">
                {["Truco", "Retruco", "Vale cuatro"][p.truco.nivel] ?? "Truco"}
              </BotonCanto>
            )}
          </div>
        )}

        {/* HAY DOS BARRAS, Y A PROPÓSITO.
            Cuando hay algo que contestar, la fila entera pasa a ser dos botones
            sólidos, verde y rojo. "Quiero" y "no quiero" se contestan bajo
            presión y con la mesa esperándote: no pueden ser dos palabras más en
            una fila de palabras. El resto del tiempo la barra es la de las
            referencias —texto grande con separadores finos—, que no le compite
            a las cartas. */}
        {b.contestando ? (
          <div className="mx-auto flex max-w-[760px] gap-1.5 p-1.5">
            {b.quiero && (
              <BotonCanto canto="quiero" onClick={() => hacer({ tipo: "quiero" })} tono="quiero">
                Quiero
              </BotonCanto>
            )}
            {b.noQuiero && (
              <BotonCanto canto="no-quiero" onClick={() => hacer({ tipo: "no-quiero" })} tono="no">
                {meCantaronFlor ? "Me achico" : "No quiero"}
              </BotonCanto>
            )}
          </div>
        ) : (
          <div className="mx-auto flex max-w-[760px] items-stretch">
            {b.envidos.length > 0 && (
              <CantoEnFila canto="abrir-envido" onClick={() => setMenuEnvido((v) => !v)}>
                {subiendoEnvido ? "Subir" : "Envido"}
              </CantoEnFila>
            )}
            <CantoEnFila canto="truco" onClick={() => hacer({ tipo: "truco" })} deshabilitada={!b.truco}>
              {["Truco", "Retruco", "Vale cuatro"][p.truco.nivel] ?? "Truco"}
            </CantoEnFila>
            <CantoEnFila canto="irse-al-mazo" onClick={() => hacer({ tipo: "mazo" })} deshabilitada={!b.mazo}>
              Mazo
            </CantoEnFila>
          </div>
        )}
      </div>

      {p.fase !== "jugando" && carteleada && !eligiendo && (
        <Cartel
          partida={p}
          rival={rival}
          desdeLaGira={esHistoria}
          onSeguir={() => {
            anotada.current = null;
            repartirNueva(p.fase === "partida-terminada" ? nuevaPartida() : siguienteMano(p));
          }}
          onCambiarRival={() => setEligiendo(true)}
        />
      )}

      {/* El selector tampoco se monta acá en historia: no hay forma de llegar
          —el botón no existe y el cartel de fin ofrece volver al mapa—, pero
          que el componente no pueda montarse es justamente lo que hace que
          forzar el estado no sirva de nada. */}
      {eligiendo && !esHistoria && (
        <ElegirRival
          actual={rival}
          marcas={marcas}
          onElegir={(nuevo) => {
            setRivalElegido(nuevo);
            guardarPreferencia("ultimoRival", nuevo.id);
            anotada.current = null;
            ultimoVerso.current = undefined;
            repartirNueva(nuevaPartida());
            setEligiendo(false);
          }}
          onCerrar={() => setEligiendo(false)}
        />
      )}
    </div>
  );
}

/**
 * Una carta ya jugada, apoyada sobre la mesa.
 *
 * Antes esto dibujaba también la RANURA VACÍA donde iba a caer: tres rectángulos
 * punteados esperando. Se fueron. En las referencias no hay ranuras —hay mesa
 * vacía y después hay cartas—, y esos rectángulos eran media pantalla de
 * andamiaje visible en celular.
 *
 * El tamaño va atado al alto de la ventana, y encima la perspectiva le pone SU
 * escala: la carta de él, que está más lejos, sale más chica que la tuya sin que
 * nadie escriba un número.
 */
/**
 * Una carta ya jugada, apoyada en la mesa.
 *
 * ── DE DÓNDE VIENE ────────────────────────────────────────────────────────
 *
 * La animación de aterrizaje (`anim-caer`) ya estaba; lo que faltaba era
 * DECIRLE DE DÓNDE SALE. Sin `--desde-x` y `--desde-y` las dos cartas usaban el
 * valor por defecto y caían igual, desde arriba y desde ningún lado: la del
 * rival parecía aparecer sola.
 *
 * La tuya sube desde tu mano, que está abajo del cuadro. La de él baja desde el
 * canto lejano, que es de donde vendría si la tuviera abajo de la mesa —que es
 * exactamente donde la tiene—.
 */
function CartaApoyada({ carta, de, ancho }: { carta: CartaType; de: Jugador; ancho: string }) {
  return (
    <div
      className="carta-apoyada relative"
      style={
        {
          width: ancho,
          aspectRatio: "2 / 3",
          "--desde-y": de === "rival" ? "-72px" : "104px",
        } as React.CSSProperties
      }
    >
      {/* la sombra proyectada sobre la mesa, que se cierra al aterrizar */}
      <div
        className="anim-sombra absolute inset-x-0 bottom-[-3px] top-3 rounded bg-black/70 blur-[3px]"
        aria-hidden="true"
      />
      <Carta
        carta={carta}
        className="anim-caer absolute inset-0 h-full w-full"
        style={{ "--giro": `${giroDe(carta)}deg` } as React.CSSProperties}
      />
    </div>
  );
}

/**
 * Una carta sostenida en la mano: va en abanico, con su rotación y su altura
 * según el lugar que ocupa. Al tocarla se levanta y se endereza, como cuando
 * la separás del resto con el pulgar.
 *
 * TRES TRANSFORM, TRES ELEMENTOS. El abanico va en el <button>, el viaje desde
 * el mazo en el <span> y el giro al darla vuelta en la carta. Amontonados en un
 * solo elemento se pisan entre ellos: la animación gana mientras corre y al
 * soltar, la carta pega un salto para volver a su lugar del abanico.
 */
function CartaEnMano({
  carta,
  posicion,
  total,
  pieza,
  habilitada,
  tapada,
  viajando,
  retrasoViaje,
  retrasoVolteo,
  desdeX,
  onClick,
}: {
  carta: CartaType;
  posicion: number;
  total: number;
  pieza: boolean;
  habilitada: boolean;
  /** Todavía boca abajo: se está repartiendo. */
  tapada: boolean;
  /** Viniendo del mazo en este momento. */
  viajando: boolean;
  /** Su lugar en la ronda de reparto, en milisegundos. */
  retrasoViaje: number;
  /** Su lugar en la ronda de volteo, en milisegundos. */
  retrasoVolteo: number;
  /** De qué lado sale, según dónde esté el mazo. */
  desdeX: number;
  onClick: () => void;
}) {
  const centro = (total - 1) / 2;
  const desvio = posicion - centro;
  const giro = desvio * 7; // grados de apertura del abanico
  const alto = Math.abs(desvio) * 7; // las de los costados quedan más bajas

  return (
    <button
      onClick={onClick}
      disabled={!habilitada}
      aria-label={
        tapada ? "Carta boca abajo, repartiendo" : `Tirar el ${carta.numero} de ${carta.palo}`
      }
      // El apagado de "no es tu turno" NO va acá: va en el grupo entero de la
      // mano (ver más arriba). Una carta translúcida deja ver el dorso de tu
      // propia mano a través del papel.
      className={`group relative -mx-2 rounded-lg transition-transform duration-150 ${
        habilitada ? "cursor-pointer" : "cursor-default"
      }`}
      style={{
        transform: `rotate(${giro}deg) translateY(${alto}px)`,
        transformOrigin: "bottom center",
        zIndex: posicion,
      }}
    >
      <span
        className={`block perspectiva-carta transition-transform duration-150 ${
          viajando ? "anim-reparte" : ""
        } ${
          habilitada
            ? "group-hover:-translate-y-3 group-focus-visible:-translate-y-3"
            : ""
        }`}
        style={
          {
            filter: "drop-shadow(0 10px 12px rgba(0,0,0,0.75))",
            ...(viajando
              ? {
                  animationDelay: `${retrasoViaje}ms`,
                  "--desde-x": `${desdeX}px`,
                  "--desde-y": "-118px",
                }
              : {}),
          } as React.CSSProperties
        }
      >
        {tapada ? (
          <Carta oculta style={{ width: ANCHO_MANO }} />
        ) : (
          <Carta
            carta={carta}
            pieza={pieza}
            className="anim-voltea"
            style={{ width: ANCHO_MANO, animationDelay: `${retrasoVolteo}ms` }}
          />
        )}
      </span>
    </button>
  );
}

/**
 * Un canto de la fila de siempre: texto grande con un separador fino al lado.
 *
 * Es la barra de las referencias, y no es sólo estética: cuatro rectángulos de
 * color le pelean la atención a las cartas, que es lo único que hay que mirar.
 * Apagado se ve apagado —no desaparece— para que la fila no baile de lugar
 * justo cuando estás por tocar.
 */
function CantoEnFila({
  children,
  onClick,
  deshabilitada = false,
  canto,
}: {
  children: React.ReactNode;
  onClick: () => void;
  deshabilitada?: boolean;
  /** Agarre para las herramientas. Mismo papel que `data-mesa`. */
  canto: string;
}) {
  return (
    <button
      data-canto={canto}
      onClick={onClick}
      disabled={deshabilitada}
      className={`min-h-[46px] flex-1 border-l border-crema/12 px-1 py-2.5 font-[family-name:var(--font-display)] text-[17px] leading-[1.35] tracking-wide transition-colors first:border-l-0 sm:text-[19px] ${
        deshabilitada
          ? "cursor-default text-crema/22"
          : "text-crema/90 hover:bg-crema/10 hover:text-crema"
      }`}
    >
      {children}
    </button>
  );
}

function BotonCanto({
  children,
  onClick,
  deshabilitada = false,
  tono = "neutro",
  canto,
}: {
  children: React.ReactNode;
  onClick: () => void;
  deshabilitada?: boolean;
  tono?: "neutro" | "bordo" | "dorado" | "quiero" | "no";
  /**
   * Agarre para las herramientas.
   *
   * `herramientas/mirar-web.mjs` verifica que cuando te suben un canto haya con
   * qué subir, y buscar por el TEXTO no sirve: "Envido" es el nombre del botón
   * que abre el menú y también el del canto que está adentro. Con esto cada
   * botón dice qué es, y la prueba deja de adivinar.
   */
  canto: string;
}) {
  const tonos = {
    neutro: "bg-black/40 text-crema/80 hover:bg-black/60",
    bordo: "bg-bordo text-crema hover:bg-bordo-claro",
    dorado: "bg-dorado text-tinta hover:bg-dorado-claro",
    quiero: "bg-quiero text-crema hover:brightness-110",
    no: "bg-no-quiero text-crema hover:brightness-110",
  };

  return (
    <button
      data-canto={canto}
      onClick={onClick}
      disabled={deshabilitada}
      className={`min-h-[46px] flex-1 rounded px-2 font-[family-name:var(--font-ui)] text-[15px] uppercase tracking-wide transition-colors disabled:cursor-default disabled:bg-black/30 disabled:text-crema/25 ${tonos[tono]}`}
    >
      {children}
    </button>
  );
}

function Cartel({
  partida,
  rival,
  desdeLaGira,
  onSeguir,
  onCambiarRival,
}: {
  partida: Partida;
  rival: Personalidad;
  /** Si llegaste desde el mapa, al terminar te ofrece volver ahí. */
  desdeLaGira: boolean;
  onSeguir: () => void;
  onCambiarRival: () => void;
}) {
  const terminada = partida.fase === "partida-terminada";
  const ganador = terminada ? partida.ganadorPartida : partida.ganadorMano;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
      <div className="papel anim-pop w-full max-w-sm px-6 py-7 text-center shadow-2xl">
        <p className="font-[family-name:var(--font-display)] text-2xl text-tinta">
          {terminada
            ? ganador === "vos"
              ? "¡Ganaste la partida!"
              : "Perdiste la partida"
            : ganador === "vos"
              ? "Ganaste la mano"
              : "Se la llevó él"}
        </p>
        <p className="mt-2 font-[family-name:var(--font-mano)] text-2xl text-bordo">
          {partida.puntos.vos} — {partida.puntos.rival}
        </p>

        <div className="mt-5 space-y-0.5 text-left text-sm text-tinta/70">
          {partida.eventos.slice(-4).map((e, i) => (
            <p key={i}>
              {e.quien === "sistema" ? "· " : e.quien === "vos" ? "Vos: " : "Él: "}
              {e.texto}
            </p>
          ))}
        </div>

        <button
          onClick={onSeguir}
          className="mt-6 w-full rounded bg-bordo py-3 font-[family-name:var(--font-ui)] uppercase tracking-wide text-crema transition-colors hover:bg-bordo-claro"
        >
          {terminada ? `Otra contra ${rival.nombre}` : "Siguiente mano"}
        </button>

        {terminada &&
          (desdeLaGira ? (
            <Link
              href="/jugar/gira"
              className="mt-2 block w-full rounded border border-tinta/25 py-2.5 text-center font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-tinta/75 transition-colors hover:border-tinta/50 hover:text-tinta"
            >
              Volver al mapa
            </Link>
          ) : (
            <button
              onClick={onCambiarRival}
              className="mt-2 w-full rounded border border-tinta/25 py-2.5 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-tinta/75 transition-colors hover:border-tinta/50 hover:text-tinta"
            >
              Cambiar de rival
            </button>
          ))}
      </div>
    </div>
  );
}

/**
 * La lista de rivales. Cada uno juega distinto de verdad: el mismo bot con
 * otros umbrales de canto, de mentira y de silencio.
 */
function ElegirRival({
  actual,
  marcas,
  onElegir,
  onCerrar,
}: {
  actual: Personalidad;
  marcas: Record<string, { ganadas: number; jugadas: number }>;
  onElegir: (p: Personalidad) => void;
  onCerrar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <div className="papel anim-pop max-h-[86dvh] w-full max-w-md overflow-y-auto px-5 py-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-tinta">
          ¿Contra quién jugás?
        </h2>
        <p className="mt-1 text-sm text-tinta/65">
          Cada uno tiene su manera. Aprender a leerlos es parte del juego.
        </p>

        <ul className="mt-5 space-y-2">
          {PERSONALIDADES.map((personalidad) => {
            const marca = marcas[personalidad.id];
            const esActual = personalidad.id === actual.id;
            return (
              <li key={personalidad.id}>
                <button
                  onClick={() => onElegir(personalidad)}
                  className={`w-full rounded border p-3 text-left transition-colors ${
                    esActual
                      ? "border-bordo bg-bordo/10"
                      : "border-tinta/15 hover:border-tinta/40 hover:bg-tinta/5"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-[family-name:var(--font-ui)] text-lg leading-tight text-tinta">
                      {personalidad.nombre}
                    </span>
                    <span
                      className="font-[family-name:var(--font-ui)] text-xs text-dorado"
                      aria-label={`dificultad ${personalidad.dificultad} de 5`}
                    >
                      {"★".repeat(personalidad.dificultad)}
                      <span className="text-tinta/20">
                        {"★".repeat(5 - personalidad.dificultad)}
                      </span>
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-tinta/70">
                    {personalidad.lugar} — {personalidad.descripcion}
                  </span>
                  {marca && marca.jugadas > 0 && (
                    <span className="mt-1.5 block font-[family-name:var(--font-mano)] text-base text-bordo">
                      {marca.ganadas} de {marca.jugadas}{" "}
                      {marca.jugadas === 1 ? "partida" : "partidas"}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <button
          onClick={onCerrar}
          className="mt-5 w-full rounded border border-tinta/25 py-2.5 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-tinta/75 transition-colors hover:border-tinta/50"
        >
          Volver
        </button>
      </div>
    </div>
  );
}
