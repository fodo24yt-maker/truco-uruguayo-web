"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Carta } from "@/components/Carta";
import { BarraCarga } from "@/components/PantallaCarga";
import { portero } from "@/lib/entrada";
import { DialogoMio, DialogoRival } from "@/components/mesa/Dialogo";
import { ObjetoDeMesa } from "@/components/mesa/Objetos";
import { CartelEnMesa, TantosBajoMedallon } from "@/components/mesa/Tantos";
import { type ClaveObjeto, PROPORCION } from "@/lib/objetos";
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
import { MarcadorBarra } from "@/components/mesa/Marcador";
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
import {
  LUKI,
  PERSONALIDADES,
  buscarPersonalidad,
  type Personalidad,
} from "@/lib/motor/personalidades";
import { fichaVacia, observarMano, sumarFichas } from "@/lib/motor/lectura";
import { anotarEnLegajo, fichaSembrada, leerLegajo } from "@/lib/legajo";
import { explicarEnvido, valorEnvido } from "@/lib/motor/tantos";
import { ambienteDe, escenaDe, objetoDe } from "@/lib/ambientes";
import { esperarEscena, precargarDepartamento } from "@/lib/precarga";
import { estiloEnMesa } from "@/lib/mesa-perspectiva";
import { caraDe } from "@/lib/caras";
import { porSlugDeDepartamento } from "@/lib/gira";
import { botonera } from "@/lib/botonera";
import { cartasEnMesa } from "@/lib/cartas-en-mesa";
import { BAZA, uDeBaza, uDeEnseñada, uEnFila, vDeFila } from "@/lib/lugares-en-mesa";
import { tantosAlCierre } from "@/lib/tantos-al-cierre";
import {
  anotarPartida,
  guardarPreferencia,
  leerProgreso,
} from "@/lib/progreso";

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
 * La sombra de una carta en la mano.
 *
 * ── Es un `box-shadow` y NO un `drop-shadow`, a propósito ─────────────────
 *
 * Era `filter: drop-shadow(...)` en el envoltorio de cada carta, y ahí está la
 * mitad del bug del glitch del 1/9/2026: la mano entera se apagaba con
 * `opacity`, el navegador componía TODO el subárbol en una superficie aparte,
 * y un filtro adentro era una segunda superficie anidada. (El apagado se fue
 * el 7/9/2026 —era la OTRA mitad del mismo bug, ver el comentario del `<div>`
 * de la mano—; el filtro no vuelve igual.)
 * Eso es lo que en el celular devolvía una banda de rayas del tamaño exacto
 * de la mano. El detalle largo está en `components/mesa/Manos.tsx`.
 *
 * La carta es un `<svg>` con `rounded-lg` sobre un `rect` de `rx="7"`, así que
 * la sombra sigue la misma silueta que seguía el filtro y no se ve distinto.
 * NO VOLVER A PONER UN FILTRO ACÁ: `mirar-mesa.mjs` falla si aparece uno.
 *
 * ── Y TAMPOCO UN DESENFOQUE (8/10/2026) ─────────────────────────────────
 * Esto era `0 10px 12px -3px rgba(0,0,0,0.75), 0 4px 8px -4px
 * rgba(0,0,0,0.6)`, y el box-shadow con desenfoque TAMBIÉN rompía: en el
 * Redmi, la basura de 4×4 caía sobre la palma, justo debajo de las cartas,
 * que es donde cae esta sombra. Ahora es la misma sombra hecha con capas sin
 * desenfoque: la variable la escribe `herramientas/sombras-duras.mjs` en
 * `globals.css`, con los números al lado.
 */
const SOMBRA_EN_MANO = "var(--sombra-mano)";

/**
 * Cuánto se esperan las cartas en la mesa después de que se cierra la mano.
 *
 * La última carta de una mano es la que la decidió, así que barrer en el mismo
 * instante te saca de la pantalla justo lo que estás mirando. Dos segundos
 * alcanzan para ver qué pasó y no llegan a aburrir.
 */
const ESPERA_ANTES_DE_BARRER = 2000;

/**
 * Cuánto tarda el que ganó el envido o cantó la flor en dar vuelta lo que le
 * quedaba, desde que se cierra la mano.
 *
 * Va ADENTRO de los dos segundos de arriba y no después: la ventana en que la
 * mesa queda a la vista sigue siendo la misma, y estas cartas caen al principio
 * para que se las pueda mirar el resto del tiempo. Medio segundo es lo que
 * tarda una persona en darse cuenta de que la mano terminó; antes de eso el
 * gesto se pierde entre la última baza y esto.
 *
 * Qué cartas caen y de quién lo decide `lib/cartas-en-mesa.ts`, que es función
 * pura y tiene test. Acá sólo se decide CUÁNDO.
 */
const ESPERA_ANTES_DE_ENSEÑAR = 450;

/** Lo que se escalona una carta enseñada respecto de la anterior. */
const ENTRE_ENSEÑADAS = 90;

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

/* ═══ EL DISEÑO DE LA MESA, QUE ES UNO SOLO ════════════════════════════════
   Hasta el 5/9/2026 fueron DOS tablas de números con los mismos campos, una
   para el celular y otra para la compu, y `usaPantallaAncha()` elegía. Es la
   simplificación que pidió Santiago, y al hacerla apareció que las dos tablas
   nunca fueron dos diseños: eran **el mismo objeto medido en dos ejes**.

   ── Por qué había dos, y por qué ya no ────────────────────────────────────
   Los objetos medían en `vh`, o sea contra la VENTANA, pero viven adentro de
   la ESCENA. Por eso el mazo pasaba del 22% del ancho de la escena al 7% con
   el mismo número —el "el mazo es muy chico" del feedback— y hubo que escribir
   una segunda tabla a mano.

   Ahora la escena es la unidad (`container-type: size` en `.escena`, ver
   `app/globals.css`) y cada medida es:

       min(A cqw, B cqh)

   o sea: **lo que entre por ancho, o lo que entre por alto, lo que sea menos**.
   En un celular —alto y angosto— manda el ancho; en una compu —ancha y baja—
   manda el alto. Es una sola regla, y da los dos tamaños que antes había que
   escribir por separado.

   NO ES UN PROMEDIO NI UN PUNTO MEDIO. Se derivó midiendo las dos tablas
   viejas en los seis tamaños y quedó dentro del 5% de cada una:

       mazo   celular 85,2 px → 86,4    ·  compu 161,2 px → 156,6
       mate   celular 73,8    → 73,6    ·  compu 117,8    → 113,6
       baza   celular 45,4    → 44,8    ·  compu  80,6    →  75,8

   ── Cómo se leen los números ──────────────────────────────────────────────
   · `u` va SIEMPRE del lado izquierdo; `ladoMazo` lo espeja cuando hace falta.
   · `v = 0` es el canto de él y `v = 1` el tuyo.
   · `estiloEnMesa` ancla por la BASE, así que todo crece HACIA ARRIBA: pasado
     cierto punto un objeto se le monta al rival encima del pecho.

   NO SE MUEVEN A OJO. Los fija `herramientas/mirar-mesa-nueva.mjs`, que saca el
   rectángulo de verdad en el navegador, en las tres pantallas de celular y en
   las tres de compu, y falla si algo cruza el canto o se le monta a otra cosa.
   En este proyecto ya se calculó dos veces en papel y las dos salió mal: la
   medida de cada objeto, el tamaño de la escena y la escala en perspectiva se
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
  /**
   * El ancho de UNA carta de tu mano. De acá cuelga toda la zona de abajo: el
   * abanico, el dibujo de la mano y el hueco que dejan.
   *
   * Sigue sin haber puntos de corte por ancho: el problema real nunca fue la
   * pantalla angosta sino la BAJA —una ventana de 620px de alto dejaba tu
   * propia mano cortada por la barra de cantos, que es lo único que no se
   * puede permitir—. Lo que cambió es contra QUÉ se mide: contra la escena y
   * no contra la ventana.
   */
  mano: { ancho: string };
  /** El mazo con la muestra, del lado del que reparte. */
  mazo: { u: number; v: number; ancho: string };
  /** El mate, siempre del lado contrario al mazo. */
  mate: { u: number; v: number; alto: string };
  /**
   * Las cartas jugadas. `paso` es cuánto se separan las bazas entre sí.
   *
   * Se centran como grupo: ancladas a la izquierda, con una sola baza puesta
   * —que es la mitad del tiempo— quedaba tirada contra el borde.
   */
  baza: {
    suya: number;
    tuya: number;
    ganador: number;
    ancho: string;
    paso: number;
  };
  /** Las tres que le reparten a él, que existen sólo mientras dura el reparto. */
  reparto: { v: number; ancho: string };
}

/**
 * LA MESA, UNA SOLA.
 *
 * Cada medida es `min(A cqw, B cqh)`: lo que entre por el ancho de la escena o
 * lo que entre por su alto, lo que sea menos. En el celular manda el ancho, en
 * la compu el alto. El porqué está arriba.
 *
 * Las POSICIONES son las que tenía el celular. No es que se haya elegido una
 * de las dos: la compu tenía el mate abajo (v = 0,66) sólo porque arriba estaba
 * la libreta, y la libreta se fue el 5/9/2026. Sacado ese estorbo, las dos
 * tablas querían el mismo lugar.
 */
const MESA: DisenoDeMesa = {
  fondo: 22,
  /* La mano de tres cartas es lo que más ancho se lleva, y en un celular de
     390 llegó a taparlo el 89%. Por eso el coeficiente de ancho es bajo: es el
     que manda ahí. */
  mano: { ancho: "min(21cqw, 18cqh)" },
  mazo: { u: 0.24, v: 0.5, ancho: "min(27cqw, 31cqh)" },
  /* EL MATE VA EN EL HUECO QUE DEJÓ LA LIBRETA, del lado contrario al mazo.

     No va tan al fondo como estaba la libreta (v = 0,23): `estiloEnMesa` ancla
     por la BASE y todo crece HACIA ARRIBA, así que un mate apoyado allá se le
     sube al rival por el pecho.

     LOS DOS NÚMEROS LOS FIJÓ LA MEDICIÓN. Calculados a mano daban 0,74 y 0,42,
     y `mirar-mesa-nueva.mjs` los rechazó: a 390x844 la TERCERA baza llegaba a
     x=284 y el mate empezaba en 282. Dos píxeles. Es la tercera vez que en
     este proyecto un número de la mesa se calcula en papel y sale mal, y las
     tres veces por lo mismo: la medida del objeto, el tamaño de la escena y la
     escala en perspectiva se multiplican y no se pueden separar leyendo. */
  mate: { u: 0.78, v: 0.34, alto: "min(23cqw, 22.5cqh)" },
  /* Las bazas viven en `lib/lugares-en-mesa.ts` desde el 9/10/2026, con su
     historia: ahí está también dónde cae cada carta enseñada, y de ahí las lee
     `mirar-mesa-nueva.mjs` para medir todos los lugares posibles. */
  baza: BAZA,
  reparto: { v: 0.22, ancho: "min(10cqw, 9.5cqh)" },
};

/**
 * El alto del rival, en % del alto de la escena.
 *
 * No es un número elegido: sale de pedir que el canto de la mesa del DIBUJO
 * caiga exactamente sobre el canto de la mesa de la ESCENA. Si cambia `fondo` o
 * el `viewBox` del rival, esto se acomoda solo.
 */
const altoDelRival = (fondo: number) =>
  (fondo * RIVAL_VB.alto) / RIVAL_VB.borde;

/**
 * Cuánto espera cada carta antes de salir del mazo.
 *
 * Se reparte de a una y empezando por el mano (reglas.txt 6, paso 1), así que
 * se van alternando: mano, pie, mano, pie, mano, pie.
 */
function retrasoDeReparto(
  quien: Jugador,
  indice: number,
  soyMano: boolean,
): number {
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

/**
 * Lo que se ve mientras la mesa espera su escena (`esperarEscena`, como mucho
 * `MS_TOPE_ESPERA_ESCENA`). Con la escena ya precargada no se ve nunca: el
 * texto y la barrita aparecen recién a los 250 ms (`.aparece-tarde`), así una
 * espera corta no parpadea.
 */
function Cargando() {
  return (
    <div className="tabla-mesa flex min-h-0 flex-1 items-center justify-center">
      <div className="aparece-tarde flex flex-col items-center gap-3">
        <p className="font-[family-name:var(--font-ui)] uppercase tracking-widest text-crema/60">
          Repartiendo…
        </p>
        <BarraCarga />
      </div>
    </div>
  );
}

function Mesa() {
  /* Un solo diseño, desde el 5/9/2026. Queda con nombre corto porque se lee en
     cada objeto de la escena; el porqué de cada número está arriba, en `MESA`. */
  const d = MESA;
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
  const router = useRouter();

  /* En la app, la Gira tiene candado. Los botones ya lo respetan (pasan por
     `lib/entrada.ts`); esto es para la mesa abierta a mano con `?depto=`: si
     la Gira está cerrada, se vuelve al menú con el diálogo abierto. */
  useEffect(() => {
    if (esHistoria && portero.rebotar("gira")) router.replace("/jugar");
  }, [esHistoria, router]);

  const [p, setP] = useState<Partida | null>(null);
  const [ayudas, setAyudas] = useState(true);
  const [menuEnvido, setMenuEnvido] = useState(false);
  const [rivalElegido, setRivalElegido] = useState<Personalidad>(LUKI);

  /** El que juega de verdad. En historia manda el mapa; en libre, vos. */
  const rival = rivalDelDepto ?? rivalElegido;
  const [eligiendo, setEligiendo] = useState(false);
  const [marcas, setMarcas] = useState<
    Record<string, { ganadas: number; jugadas: number }>
  >({});
  const anotada = useRef<Partida | null>(null);
  /** El último rival elegido en el selector, mientras su escena termina de cargar. */
  const ultimoPedido = useRef<symbol | null>(null);

  /**
   * Lo que el rival tiene anotado de cómo jugás. Dura lo que dura la partida:
   * no se guarda en el navegador ni viaja a ningún lado. Va en un `useRef` y no
   * en el estado porque cambiarla no tiene que redibujar la mesa.
   */
  /**
   * Lo que el rival tiene anotado de vos, en DOS PARTES que no se mezclan.
   *
   * `sembrada` es lo que se acuerda de otras partidas (sale del legajo, y trae
   * decimales porque lo viejo pesa menos). `observada` es lo de esta partida, en
   * cuentas enteras. El bot decide con la suma de las dos; al legajo va sólo
   * `observada`.
   *
   * Separadas y no en una sola, porque juntas se guardaba la suma al terminar:
   * lo de esta partida más el eco de las anteriores, y con decimales, que el
   * saneador del legajo rechaza. O sea que contra los ★4 y ★5 —los únicos que
   * siembran— después de la primera partida no se guardaba ninguna más, sin que
   * nada avisara.
   */
  const sembrada = useRef(fichaVacia());
  const observada = useRef(fichaVacia());
  /**
   * Y lo que VOS pudiste anotar de ÉL. Es la misma ficha corrida al revés, y de
   * ahí sale si le vas a creer la próxima (ver `lib/motor/plan.ts`). Se lleva
   * siempre, aunque hoy los diales que la consumen estén en cero: llevarla no
   * cuesta nada y no llevarla es lo que hace que prenderlos sea un lío.
   */
  const comoLoVes = useRef(fichaVacia());
  const manoObservada = useRef<Partida | null>(null);

  /**
   * Empezar de cero con este rival: se olvida lo de la partida anterior y se
   * siembra lo que el legajo diga que él se acuerda de vos.
   *
   * Va en una función porque hay TRES lugares que reparten una partida nueva
   * —montarse, la revancha y cambiar de rival— y hasta el 11/9/2026 sólo el
   * primero limpiaba la ficha. O sea que la revancha arrancaba con todo lo que
   * el rival te había visto hacer en la partida anterior, justo lo contrario de
   * lo que promete el encabezado de `lectura.ts`. Ahora la memoria entre
   * partidas existe, tiene reglas y pasa por el legajo: colarse por atrás ya no
   * es un descuido, es saltearse las reglas.
   */
  const reiniciarMemoria = (persona: Personalidad) => {
    sembrada.current = fichaSembrada(leerLegajo(), persona.memoria);
    observada.current = fichaVacia();
    comoLoVes.current = fichaVacia();
    manoObservada.current = null;
  };
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
  /**
   * Si ya se apoyaron sobre la mesa las cartas del que tenía que enseñar.
   *
   * Es lo único que se agrega a la cadena de tiempos del cierre de mano, y no
   * tiene reloj propio: comparte el `useEffect` de más abajo con los otros dos.
   */
  /**
   * El premio recién ganado, para el cartel de fin de partida.
   *
   * Se prende sólo la PRIMERA vez que le ganás a un rival de la gira. Cómo se
   * sabe que es la primera está abajo, en el efecto que anota la partida.
   */
  const [premio, setPremio] = useState<ClaveObjeto | null>(null);
  const [enseñadas, setEnseñadas] = useState(false);
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
  const [faseReparto, setFaseReparto] = useState<
    "repartiendo" | "volteando" | "listo"
  >("listo");
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
    /* LOS TRES VAN EN EL MISMO EFECTO, y eso no es prolijidad: si el de
       enseñar viviera en un `useEffect` aparte, tendría sus propias
       dependencias y una mano que termina rápido podría heredar el reloj de la
       anterior. Es el bug que el comentario de arriba ya evitó una vez con
       `manoNro`, y no se repite. */
    const muestra = setTimeout(
      () => setEnseñadas(true),
      ESPERA_ANTES_DE_ENSEÑAR,
    );
    const barre = setTimeout(() => setBarrida(true), ESPERA_ANTES_DE_BARRER);
    const cartel = setTimeout(
      () => setCarteleada(true),
      ESPERA_ANTES_DE_BARRER + DURA_BARRIDO,
    );
    return () => {
      clearTimeout(muestra);
      clearTimeout(barre);
      clearTimeout(cartel);
    };
  }, [p, manoNro]);

  /** Empieza una mano nueva y larga el reparto. Todas las manos pasan por acá. */
  const repartirNueva = (nueva: Partida) => {
    setPremio(null);
    setEnseñadas(false);
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
  //
  // LA ESCENA ENTRA ENTERA (3/10/2026). Antes de repartir se espera a que las
  // dos imágenes de la mesa estén decodificadas (o al tope, 1,2 s). Si no, se
  // pintaba un color liso y la textura "saltaba" encima un rato después: un
  // segundo redibujado de toda la escena justo después del cambio de
  // pantalla, que es el terreno del bug de los píxeles. Casi siempre ya están:
  // las precarga la pantalla de carga de la app, o el menú de jugar.
  //
  // Hasta que se reparte se ve `Cargando`, y el reloj del reparto arranca con
  // la escena ya puesta: la animación no se pierde.
  useEffect(() => {
    const progreso = leerProgreso();
    setAyudas(progreso.ayudas);
    setMarcas(progreso.rivales);
    const contra =
      rivalDelDepto ?? buscarPersonalidad(rivalPedido ?? progreso.ultimoRival ?? "");
    let vigente = true;
    void esperarEscena(escenaDe(contra.departamento)).then(() => {
      if (!vigente) return; // se fue de la mesa, o cambió el rival mientras tanto
      // Sólo para el modo libre: en historia el rival ya salió del departamento.
      if (rivalPedido) setRivalElegido(buscarPersonalidad(rivalPedido));
      else if (progreso.ultimoRival) setRivalElegido(buscarPersonalidad(progreso.ultimoRival));
      reiniciarMemoria(contra);
      repartirNueva(nuevaPartida());
    });
    return () => {
      vigente = false;
    };
    // Sólo se vuelve a repartir de cero si cambió a quién enfrentás: si acá
    // entrara `repartirNueva`, se rearmaría la partida en cada dibujado.
  }, [rivalPedido, rivalDelDepto]);

  // El reloj del reparto: darlas vuelta, y después soltar el juego.
  useEffect(() => {
    if (manoNro === 0 || !animandoReparto.current) return;
    const alVoltear = setTimeout(
      () => setFaseReparto("volteando"),
      MOMENTO_VOLTEO,
    );
    const alTerminar = setTimeout(() => setFaseReparto("listo"), FIN_REPARTO);
    return () => {
      clearTimeout(alVoltear);
      clearTimeout(alTerminar);
    };
  }, [manoNro]);

  // El turno del bot, con la personalidad del rival elegido
  useEffect(() => {
    if (!p || p.fase !== "jugando" || p.turno !== "rival" || repartiendo)
      return;
    const reloj = setTimeout(() => {
      const accion = decidirJugada(
        p,
        "rival",
        Math.random,
        rival,
        sumarFichas(sembrada.current, observada.current),
        comoLoVes.current,
      );
      if (!accion) return;
      /* Canta pelado, y eso es todo lo que hay que hacer acá: el texto del
         canto —"¡Truco!", "¡Envido!"— lo arma `partida.ts` y sale por
         `p.eventos` a la chapa del diálogo. Hasta el 10/9/2026 acá se elegía
         además una copla de `versos.ts`; se fue el archivo entero. */
      setP(aplicar(p, accion, "rival"));
    }, DEMORA_BOT);
    return () => clearTimeout(reloj);
  }, [p, rival, repartiendo]);

  // Al cerrar cada mano el rival repasa lo que te vio hacer. Sólo mira las
  // cartas que quedaron sobre la mesa y los tantos que se cantaron en voz alta:
  // nunca tu mano (ver lectura.ts).
  useEffect(() => {
    if (!p || p.fase === "jugando" || manoObservada.current === p) return;
    manoObservada.current = p;
    observada.current = observarMano(observada.current, p, "vos");
    // Y lo que vos le viste a él, que es lo que él supone que vos sabés.
    comoLoVes.current = observarMano(comoLoVes.current, p, "rival");
  }, [p]);

  /* Cuando termina una partida se anota, una sola vez.
     Junto con el resultado va el MARCADOR, que es lo que después convierte el
     trofeo en "le ganaste 30 a 4". No es un dato nuevo: los dos números están a
     la vista en la barra durante toda la partida y en el cartel del final. Del
     otro lado, `anotarPartida` sólo se queda con la mejor victoria y descarta
     el marcador si perdiste. */
  useEffect(() => {
    if (!p || p.fase !== "partida-terminada" || anotada.current === p) return;
    anotada.current = p;
    const gane = p.ganadorPartida === "vos";
    const nuevas = anotarPartida(rival.id, gane, {
      vos: p.puntos.vos,
      rival: p.puntos.rival,
    });

    /* Y al legajo, que es lo que los rivales duros se acuerdan de vos en la
       próxima. Se anota SIEMPRE, contra cualquiera y gane quien gane: el legajo
       es tuyo, no del rival, así que también lo llenan las partidas contra
       Luquita —que no lee nada— y por eso El Turco te conoce antes de que te
       sientes con él. */
    anotarEnLegajo(rival.id, gane, observada.current);

    /* ── EL PREMIO DEL DEPARTAMENTO, DESDE EL 10/9/2026 ──────────────────
       Los objetos salieron de la mesa y pasaron a ser lo que se gana. Este es
       el momento en que se ganan, así que el aviso va acá.

       **La primera victoria se deduce, no se guarda.** `anotarPartida` devuelve
       el progreso YA actualizado, así que si después de anotar tenés
       exactamente una ganada, ésta fue la primera. No hace falta ningún campo
       nuevo en `localStorage`, y eso importa: en este proyecto tocar dónde vive
       el progreso es de lo más caro que hay —está avisado dos veces en
       `CLAUDE.md`— porque un cambio ahí le borra la gira a quien ya jugó.

       Sólo en la gira: en partida libre elegís vos al rival y no hay
       departamento que ganar. */
    setPremio(
      gane && esHistoria && (nuevas.rivales[rival.id]?.ganadas ?? 0) === 1
        ? objetoDe(rival.departamento)
        : null,
    );
    setMarcas(
      nuevas.rivales,
    );
  }, [p, rival]);

  /* Le avisa al gestor de anuncios si hay una partida en juego. Con partida
     en juego no sale NINGÚN anuncio: ni en medio de una mano ni mientras se
     canta. Terminada (el cartel de "Otra contra…"), sí puede, si toca. */
  useEffect(() => {
    portero.marcarPartidaEnCurso(p !== null && p.fase !== "partida-terminada");
  }, [p]);
  useEffect(() => () => portero.marcarPartidaEnCurso(false), []);

  if (!p) return <Cargando />;

  const hacer = (accion: Accion) => {
    setMenuEnvido(false);
    setFlorSalvada(false);
    if (repartiendo) return; // todavía se está repartiendo

    /**
     * RED DE SEGURIDAD. En la mesa rige "flor no cantada, flor perdida": si
     * tirás carta sin cantarla, te quedaste sin los 3 puntos. Con las ayudas
     * prendidas eso no pasa: se canta sola y se te avisa.
     *
     * Con las ayudas apagadas rige la regla de verdad y la flor se puede
     * perder, que es como se juega y como se aprende a no olvidársela.
     */
    const esCantoDeFlor =
      accion.tipo === "flor" || accion.tipo === "flor-canto";
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
  const meCantaronFlor =
    p.pendiente?.tipo === "flor" && p.pendiente.cadena.length === 0;
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
    if (p.historial.some((h) => h.tipo === "envido"))
      return "El envido ya se jugó en esta mano";
    return null;
  })();

  /* Los dos grupos que flotan sobre tus cartas. Se nombran acá porque el JSX
     los pregunta dos veces —para decidir si dibuja el envoltorio y para
     decidir qué mete adentro— y repetir la condición es la forma más barata de
     que un día digan cosas distintas. */
  const hayFlor = b.flor || b.florCantos.length > 0;
  const haySubida =
    (menuEnvido && b.envidos.length > 0) ||
    (b.contestando && (b.envidos.length > 0 || b.truco));

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
  /* La textura del departamento, con su tono ya horneado adentro. Es lo que
     separa a Salto de Paysandú, que comparten el ambiente del litoral y sin eso
     serían la misma pantalla.

     Hasta el 5/9/2026 el tono se pintaba en vivo con dos capas de
     `mix-blend-mode: color`; el porqué de que se hayan ido está en
     `components/mesa/Escenario.tsx`. */
  const escena = escenaDe(rival.departamento);
  const caraRival = caraDe(rival.id);
  // El tanto se cuenta con las tres cartas del reparto, nunca con las que quedan
  const miFlor = p.flor.vos;

  const miTanto = valorEnvido(p.manoInicial.vos, p.muestra);

  /**
   * LOS TANTOS QUE SE ENSEÑAN AL CERRAR LA MANO.
   *
   * Sólo mientras dura la ventana en la que la mesa queda a la vista, o sea
   * hasta que empieza el barrido: `barrida` se prende a los 2 s. No hace falta
   * un reloj propio, y no tenerlo es lo que garantiza que el cartel se vaya
   * junto con las cartas en vez de quedar colgado sobre una mesa ya limpia.
   *
   * Cuándo hay algo que enseñar lo decide `tantosAlCierre`, no esto: si la mano
   * se jugó entera devuelve vacío y acá no aparece nada.
   */
  const tantosEnseñados = barrida ? [] : tantosAlCierre(p);

  /**
   * LAS CARTAS QUE SE APOYAN SOBRE LA MESA AL CERRARSE LA MANO.
   *
   * Quién las da vuelta y en qué lugar caen lo decide `lib/cartas-en-mesa.ts`,
   * que es función pura y tiene test: acá no hay ni una regla. Lo único que se
   * decide en la pantalla es CUÁNDO —entre `enseñadas` y `barrida`, o sea la
   * misma ventana en la que la mesa queda a la vista— y eso es a propósito: no
   * hay dos lugares donde equivocarse.
   *
   * Con la mano jugada entera la lista viene vacía y no se apoya nada, porque
   * las seis cartas ya están sobre la mesa.
   *
   * SIGUEN EN LA LISTA DURANTE EL BARRIDO (arreglado el 7/10/2026). Hasta ese
   * día la condición era `enseñadas && !barrida`: al empezar el barrido la
   * lista se vaciaba, las apoyadas desaparecían de la mesa de golpe en vez de
   * irse al mazo con las demás (su `anim-al-mazo` de abajo no corría nunca) y,
   * peor, `enMesaMias` quedaba vacío y la tuya VOLVÍA AL ABANICO durante los
   * 760 ms del barrido. Lo vio Santiago en el teléfono: "tiré mi última carta
   * y volvió a mi mano al recoger". Se ve en los cuadros 212 → 222 de la
   * sesión de medición de ese día. Se apagan solas con la mano nueva, que pone
   * `enseñadas` en `false`.
   */
  const enMesa = enseñadas ? cartasEnMesa(p) : { clase: null, cartas: [] };

  /* Las tuyas SALEN DEL ABANICO en el mismo cuadro en que caen sobre la mesa.
     Sin esto se ven dos veces: en la mano y en la mesa. */
  const enMesaMias = new Set(
    enMesa.cartas.filter((c) => c.quien === "vos").map((c) => c.carta),
  );

  /**
   * LAS CARTAS QUE TENÉS EN LA MANO, que es lo que se dibuja en el abanico.
   *
   * Las que se apoyaron sobre la mesa no están (ver arriba), y con el barrido
   * no queda ninguna: lo que te quedaba se va con la mesa, que es lo que eligió
   * Santiago el 9/10/2026 para que cada reparto arranque igual —la mano entra
   * desde abajo con la primera carta— en vez de bajar y volver a subir.
   *
   * DE ACÁ SALE TODO lo de abajo: el abanico, su ancho y si la mano se dibuja.
   * Hasta ese día el ancho contaba `p.cartas.vos` y no lo que había en el
   * abanico, así que cuando TUS cartas se enseñaban quedaba una mano grande y
   * vacía; y con la última tirada quedaba un puño pelado hasta el reparto.
   */
  const enAbanico = barrida ? [] : p.cartas.vos.filter((carta) => !enMesaMias.has(carta));

  /**
   * El ancho del abanico, para que la mano lo siga.
   *
   * Las cartas se montan 16px entre vecinas (el `-mx-2` de cada una). Si la mano
   * se dimensionara con un múltiplo fijo del ancho de UNA carta, al quedarte una
   * sola seguiría siendo la mano de tres y taparía media pantalla.
   */
  const nCartas = enAbanico.length;

  /**
   * Cuántas bazas tienen algo puesto, y en qué lugar va cada una.
   *
   * `p.bazas` incluye SIEMPRE la que está abierta, todavía vacía. Si el par se
   * centrara sobre esa cuenta, con una sola carta en la mesa el par quedaría
   * corrido media posición a la izquierda y la mesa se vería torcida.
   */
  const bazasJugadas = p.bazas.filter((b) => b.vos || b.rival).length;
  const lugarDeBaza = (i: number) => uDeBaza(i, bazasJugadas);
  const anchoAbanico = `calc(${nCartas} * ${d.mano.ancho} - ${Math.max(0, nCartas - 1) * 16}px)`;
  /**
   * EL ANCHO DE LA MANO. Ojo: NO es el del abanico.
   *
   * Estaba escrito `anchoAbanico + 0,8 · el ancho de una carta`, y como el SVG va en
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
  const anchoMano = `calc(1.5 * ${d.mano.ancho} + 0.745 * (${anchoAbanico}))`;

  /* Del lado del mazo va el mazo; del otro, el mate y la libreta. Los diseños
     guardan el `u` de la IZQUIERDA y acá se espeja, así que hay un solo número
     por objeto y no dos que se puedan desincronizar. */
  const espejo = (u: number) => (ladoMazo === "izquierda" ? u : 1 - u);
  const uMazo = espejo(d.mazo.u);
  const uOtro = espejo(d.mate.u);
  const altoRival = altoDelRival(d.fondo);
  /**
   * Dónde va una carta jugada, y hacia dónde se va cuando se levanta la mesa.
   *
   * `orden` es el turno en la fila del barrido: se van de a una, no las seis de
   * golpe, que es como se levanta una mesa de verdad. No apunta al mazo con
   * precisión —para eso habría que medir píxeles en vivo— pero sale para SU
   * lado, que es lo que hace que se lea "se las llevó el que reparte".
   */
  const alMazo = (
    u: number,
    v: number,
    orden: number,
  ): React.CSSProperties => ({
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
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2"
      style={cajonRival}
    >
      <RivalSentado
        ficha={caraRival}
        nombre={rival.nombre}
        luz={ambiente.luz}
      />
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
            <path
              d="M15 5 L8 12 L15 19"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {esHistoria ? "Mapa" : "Salir"}
        </Link>

        {/* EL MARCADOR VA ACÁ, en el lugar que tenía el nombre del lugar.
            Es lo que hacen las referencias y, sobre todo, es lo que permite
            sacar la libreta del celular sin que dejes de ver cómo va.

            ── ACÁ ESTABA EL NOMBRE DEL LUGAR, y se fue el 2/9/2026 ──────────
            Decía "La Blanqueada · Tugurio" pegado a los puntos. Era decorativo
            —el departamento ya está en el medallón, que está a la vista todo el
            tiempo— y ese ancho es justo el que los puntos necesitaban para
            poder crecer. Dos veces la misma información, y la que se quedó es
            la que hace falta leer. */}
        <div className="flex min-w-0 items-center">
          <MarcadorBarra vos={p.puntos.vos} rival={p.puntos.rival} />
        </div>

        {/* VA EN DOS RENGLONES SIEMPRE, desde el 5/9/2026. Antes se apilaba
            sólo en el celular, y quién era "el celular" lo decidía el diseño
            elegido; con un solo diseño esa pregunta ya no existe.

            Se quedó la forma apilada y no la seguida porque es la que entra en
            el caso apretado: "Ayudas: no" en una línea se lleva 86px de los
            ~300 que tiene la barra de un celular, y ese ancho lo necesita el
            marcador. Apilado ocupa 50 y encima se lee mejor, porque el estado
            queda solo en su línea. En la compu sobra lugar, así que no molesta. */}
        <button
          onClick={() => {
            const nuevo = !ayudas;
            setAyudas(nuevo);
            guardarPreferencia("ayudas", nuevo);
          }}
          aria-label={`Ayudas ${ayudas ? "encendidas" : "apagadas"}. Tocá para cambiar.`}
          className="shrink-0 whitespace-nowrap rounded border border-crema/20 px-2 py-0.5 text-center font-[family-name:var(--font-ui)] text-[10px] uppercase leading-tight transition-colors hover:border-crema/50"
        >
          {/* Sin `tracking`: a 10px la de la interfaz ya viene separada y
              con un poco más se lee "AY UD AS". */}
          <span className="block text-[10px] leading-tight text-crema/55">
            Ayudas
          </span>
          <span
            className={`block text-[12px] leading-tight ${ayudas ? "text-dorado" : "text-crema/70"}`}
          >
            {ayudas ? "sí" : "no"}
          </span>
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
          className="escena penumbra relative w-full overflow-hidden"
          style={{ maxWidth: "min(1180px, 158vh)" }}
        >
          {/* El telón: el color del lugar, detrás de todo. Se ve por las
              esquinas transparentes de la mesa, allá donde la madera se
              terminó. */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: escena.colorTelon }}
          />

          {/* el ambiente, al fondo */}
          <div
            className="absolute inset-x-0 top-0"
            style={{ height: `${d.fondo}%` }}
          >
            <FondoAmbiente escena={escena} />
          </div>

          {/* EL RIVAL VA ANTES DE LA TABLA, y no es un detalle de orden.
              No tiene brazos sobre la madera, así que nada suyo está delante de
              la mesa. Dibujado por encima, el torso terminaría con un corte
              recto justo sobre el canto y se leería un recorte de cartón
              apoyado detrás. Metido debajo, es la MESA la que lo tapa —que es
              lo que pasa de verdad— y por eso se lee alguien sentado del otro
              lado. Su sombra va después: una sombra cae SOBRE la madera. */}
          {capaRival}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{ top: `${d.fondo}%` }}
          >
            <TablaMesa escena={escena} />
          </div>
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={cajonRival}
          >
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
            /* En qué anda la mano. Sin esto, una herramienta que mire "no puedo
               jugar y hay cartas en la mesa" confunde el turno del rival con el
               fin de la mano. */
            data-fase={p.fase}
            /* Qué canto está esperando respuesta, y el último eslabón de la
               cadena. Lo usa `mirar-web.mjs` para distinguir "no hay con qué
               subir" —que sería un bug— de "arriba de la falta envido no hay
               nada", que es la regla del juego. */
            data-pendiente={
              p.pendiente
                ? `${p.pendiente.tipo}:${p.pendiente.cadena.at(-1) ?? ""}`
                : "nada"
            }
            className="absolute inset-x-0 bottom-0"
            style={{ top: `${d.fondo}%` }}
          >
            {/* ── ACÁ ESTABA LA LIBRETA, Y SE FUE EL 5/9/2026 ─────────────
                Era el papelito de puntos apoyado sobre la madera, y existía
                SÓLO en la compu: en el celular se comía el cuarto de arriba de
                la mesa —169 de 390 px de ancho— así que estaba en `null`.

                Con un solo diseño había que decidir si iba a las dos o a
                ninguna, y Santiago eligió que se fuera. Los puntos los dice
                `MarcadorBarra`, en la franja de arriba, que no le saca ni un
                píxel de alto a la mesa y se lee igual en las dos.

                De paso se llevó uno de los dos `clip-path` del proyecto, que
                fuerzan una superficie de composición aparte. */}

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
              <div
                className="relative"
                style={{ height: d.mate.alto, aspectRatio: "60 / 84" }}
              >
                <SombraApoyada
                  ancho={0.55}
                  desvio={ladoMazo === "izquierda" ? 0.3 : -0.3}
                />
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
                vos decidís que ya miraste. No volver a poner una pila acá.

                Y EL OBJETO DEL DEPARTAMENTO TAMBIÉN SE FUE, el 10/9/2026.
                Estuvo acá desde el 1/9 y era lo que hacía que Salto y Paysandú
                no fueran la misma pantalla; Santiago lo sacó porque ocupa
                lugar que la mesa necesita, en la misma pasada en que se fueron
                los versos y los recuadros de tantos. **No desapareció**: los
                diecinueve siguen dibujados en `components/mesa/Objetos.tsx` y
                ahora se ganan como trofeo, que es donde se los mira de cerca.
                Ver `components/Trofeos.tsx` y el cartel de fin de partida. */}

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
                    style={alMazo(uEnFila("rival", lugarDeBaza(i), ladoMazo), vDeFila("rival"), i * 2)}
                  >
                    <CartaApoyada
                      carta={baza.rival}
                      de="rival"
                      ancho={d.baza.ancho}
                    />
                  </div>
                )}
                {baza.vos && (
                  <div
                    data-mesa="baza"
                    className={barrida ? "anim-al-mazo" : undefined}
                    style={alMazo(
                      uEnFila("vos", lugarDeBaza(i), ladoMazo),
                      vDeFila("vos"),
                      i * 2 + 1,
                    )}
                  >
                    <CartaApoyada
                      carta={baza.vos}
                      de="vos"
                      ancho={d.baza.ancho}
                    />
                  </div>
                )}
                {baza.ganador && (
                  <div
                    className={barrida ? "anim-al-mazo" : undefined}
                    style={alMazo(uEnFila("rival", lugarDeBaza(i), ladoMazo), d.baza.ganador, i * 2)}
                  >
                    <span /* `text-shadow` y no `drop-shadow`: el segundo es un `filter` y
                          sobre texto chico dentro de un contenedor que la
                          perspectiva escala por un factor fraccionario deja
                          basura con forma de letras. Ver `Mazo.tsx`. */
                      className="block whitespace-nowrap font-[family-name:var(--font-ui)] text-[9px] uppercase tracking-wide text-crema/70 [text-shadow:0_1px_3px_rgba(0,0,0,1)]"
                    >
                      {baza.ganador === "parda"
                        ? "parda"
                        : baza.ganador === "vos"
                          ? "tuya"
                          : "suya"}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* ─── LO QUE SE ENSEÑA AL CERRARSE LA MANO ──────────────────
                Las cartas que le quedaban al que ganó el envido o cantó la
                flor, dadas vuelta y apoyadas, como en la mesa de verdad.

                ── TRES COSAS QUE NO SON CASUALES ─────────────────────────

                1. **Es la MISMA `<CartaApoyada>`** que dibuja una carta
                   jugada, así que cae con la misma animación (`anim-caer` +
                   `anim-sombra`). No hay CSS nuevo: si se vieran distinto,
                   se leerían como otra cosa.
                2. **`data-mesa="baza-enseñada"`, y no `"baza"`.** Son un
                   agarre aparte para que las herramientas puedan medirlas
                   sin confundirlas con las jugadas de verdad — y para que
                   nadie que lea el DOM las confunda tampoco.
                3. **El centro del grupo NO se recalcula.** `lugarDeBaza` se
                   sigue calculando con `bazasJugadas`, que cuenta sólo lo
                   jugado: si estas cartas entraran en esa cuenta, todas las
                   que ya están apoyadas se correrían de golpe. "La mesa no
                   se mueve" es justo lo que vigila `mirar-mesa-nueva.mjs`.
                   Éstas caen al costado, que es donde se apoyan de verdad.

                ── Y AL COSTADO CONTRARIO AL MAZO (9/10/2026) ─────────────
                Hasta ese día caían siempre a la derecha, y con la mano
                cortada temprano la tercera quedaba ENCIMA del mazo —tapando
                la muestra— cuando el mazo estaba a la derecha. Ahora las que
                caen afuera del grupo van hacia el lado libre. La regla y el
                porqué están en `uDeEnseñada` (`lib/lugares-en-mesa.ts`). */}
            {enMesa.cartas.map((c) => (
              <div
                key={`${c.quien}-${c.carta.numero}-${c.carta.palo}`}
                data-mesa="baza-enseñada"
                className={barrida ? "anim-al-mazo" : undefined}
                style={{
                  ...alMazo(
                    uEnFila(c.quien, uDeEnseñada(c.baza, bazasJugadas, ladoMazo), ladoMazo),
                    vDeFila(c.quien),
                    c.baza * 2 + (c.quien === "rival" ? 0 : 1),
                  ),
                  // escalonadas, para que se lea el gesto de ir dándolas vuelta
                  ...(barrida
                    ? {}
                    : { animationDelay: `${c.orden * ENTRE_ENSEÑADAS}ms` }),
                }}
              >
                <CartaApoyada
                  carta={c.carta}
                  de={c.quien}
                  ancho={d.baza.ancho}
                />
              </div>
            ))}

            {/* El rótulo: "ENVIDO EN MESA". Sale sólo si hay algo apoyado, o
                sea nunca con la mano jugada entera.

                Va SOBRE LA MADERA, apenas por encima de la fila de bazas, y no
                arriba del todo: allá arriba está el registro de lo que dijo el
                rival, que en una pantalla baja ocupa toda la franja. Centrado y
                a esa altura no se pisa con nada. */}
            {/* Con el barrido el rótulo se va, igual que los tantos en número
                (`tantosEnseñados`): las cartas se van al mazo y ya no hay nada
                que rotular. */}
            {enMesa.clase && !barrida && (
              <CartelEnMesa
                clase={enMesa.clase}
                posicion={estiloEnMesa(0.5, d.baza.ganador - 0.1)}
              />
            )}
          </div>

          {/* ─── El medallón y lo que se dice ──────────────────────────
              El medallón es el ancla de la que cuelga el globo: por eso van
              juntos y en la misma esquina. */}
          <div
            /* El agarre con el que `mirar-rivales.mjs` TAPA esta columna antes
               de medir el borde de la escena. Cuelga sobre la esquina de
               arriba a la derecha, justo donde arranca la madera, y sin
               esconderla la herramienta medía el medallón y daba luma 62 en
               los siete: un falso positivo que tapaba el defecto de verdad. */
            data-encima="medallon"
            className="absolute right-1.5 top-1.5 z-20 flex w-[min(78%,340px)] flex-col items-end gap-1"
          >
            <Medallon
              rival={rival}
              deLaGira={esHistoria}
              onCambiar={() => setEligiendo(true)}
            />
            {/* Los dos tantos en número, ENTRE el medallón y el globo, para
                que no haya que contar las cartas en dos segundos. Reserva alto
                fijo aunque no diga nada: si creciera y se achicara empujaría
                el globo de abajo y la mesa saltaría. */}
            <TantosBajoMedallon tantos={tantosEnseñados} />
            <DialogoRival eventos={p.eventos} compacto={enMesa.cartas.length > 0} />
          </div>

          {/* ─── Tu lado de la mesa: lo que decís vos, y tu mano ──────────
              Van en el mismo envoltorio y en este orden porque lo que decís
              tiene que quedar ARRIBA de las cartas, empujando hacia la madera
              y nunca sobre ellas.

              Y tu diálogo queda AFUERA del apagado de la mano, que es todo el
              punto: justo cuando no es tu turno es cuando hay que poder leer
              lo que acabás de cantar. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
            <DialogoMio eventos={p.eventos} />

            {/* ─── LO QUE PODÉS CANTAR, APOYADO SOBRE TUS CARTAS ─────────
                Esto vivía adentro de la barra de abajo, y por eso la barra
                crecía y la mesa entera saltaba 43 px cada vez que abrías el
                envido. Acá está fuera del flujo: aparece y desaparece sin
                mover un solo píxel de la escena.

                Y sin la franja marrón atrás: son botones sueltos sobre la
                madera, con su propio color y su propia sombra. El fondo de la
                fila era lo que los hacía parecer parte de un cajón.

                ── POR QUÉ VA `absolute bottom-2` Y NO UN `translate-y` ───────
                El 4/9/2026 Santiago los quiso más abajo: apoyados sobre las
                cartas y a unos píxeles de la barra de Truco / Envido / Mazo,
                no flotando en el aire arriba de la mano.

                "A unos píxeles de la barra" es una distancia al PIE de la
                escena, no un desplazamiento desde donde caían antes. Y el pie
                de la escena es justo el borde de abajo de este envoltorio
                (`inset-x-0 bottom-0`), que termina donde empieza la barra. Así
                que se ancla ahí y son 8 px, y no hay ningún número mágico que
                mantener a mano cuando cambie el alto de la mano o de la barra.

                Sigue estando fuera del flujo, que es lo que importa: no le
                corre un píxel a la mano y la mesa no se mueve al cantar.

                El `z-30` tampoco es al azar: apoyados sobre las cartas hay que
                GANARLES a las cartas. El abanico es `z-10` y el pulgar `z-20`,
                y los dos vienen DESPUÉS en el documento, así que con un empate
                de z-index ganaban ellos y los botones quedaban tapados por la
                mano: se veía una franja dorada asomando y nada más. */}
            {(hayFlor || haySubida) && (
              <div className="pointer-events-auto absolute inset-x-0 bottom-2 z-30 mx-auto flex max-w-[760px] flex-wrap items-center justify-center gap-1.5 px-2">
                {b.flor && (
                  <BotonCanto
                    canto="flor"
                    onClick={() => hacer({ tipo: "flor" })}
                    tono="dorado"
                    suelto
                  >
                    {meCantaronFlor ? "Yo también" : "¡Flor!"}
                  </BotonCanto>
                )}
                {b.florCantos.map((canto) => (
                  <BotonCanto
                    key={canto}
                    canto={canto}
                    onClick={() => hacer({ tipo: "flor-canto", canto })}
                    tono="bordo"
                    suelto
                  >
                    {canto === "con-flor-envido"
                      ? "Con flor envido"
                      : "Contraflor al resto"}
                  </BotonCanto>
                ))}
                {haySubida && b.contestando && (
                  <span className="rounded bg-black/55 px-2 py-1 font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-[0.14em] text-crema/70">
                    o subí
                  </span>
                )}
                {haySubida &&
                  b.envidos.map((canto) => (
                    <BotonCanto
                      key={canto}
                      canto={canto}
                      onClick={() => hacer({ tipo: "envido", canto })}
                      tono="dorado"
                      suelto
                    >
                      {canto === "falta-envido"
                        ? `Falta (${laFalta(p.puntos)})`
                        : canto === "real-envido"
                          ? "Real envido"
                          : "Envido"}
                    </BotonCanto>
                  ))}
                {haySubida && b.contestando && b.truco && (
                  <BotonCanto
                    canto="truco"
                    onClick={() => hacer({ tipo: "truco" })}
                    tono="bordo"
                    suelto
                  >
                    {["Truco", "Retruco", "Vale cuatro"][p.truco.nivel] ??
                      "Truco"}
                  </BotonCanto>
                )}
              </div>
            )}

            {/* Cuando "el envido va primero" no se puede, se dice por qué.
                Antes el botón desaparecía y nada más, y parecía que el juego
                estaba roto. También flota: es un renglón que aparece y se va. */}
            {motivoSinEnvido && (
              <p className="mx-auto mb-1 max-w-[760px] px-2 text-center font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-wide text-dorado/90 [text-shadow:0_1px_3px_rgba(0,0,0,1)]">
                {motivoSinEnvido}
              </p>
            )}

            {/* ── ACÁ LA MANO SE APAGABA CUANDO NO ERA TU TURNO ────────────
                Era `opacity-75` sobre todo el grupo —dedos, cartas y pulgar—
                con una transición de 200 ms, y **se fue el 7/9/2026**.

                ── Por qué, y esta vez con la foto ──────────────────────────
                El 1/9/2026 se vio en el celular "una banda de rayas del tamaño
                exacto de la mano". Ese día se le sacó el `filter` de adentro,
                bajó siete veces y se dio por cerrado. **No estaba cerrado.** El
                7/9, mirando el teléfono en vivo, apareció otra vez y se midió:

                    caja de este <div>              y=1109 de pantalla, alto 310
                    banda de ruido en la foto       y=1105,              alto 295

                Es el mismo rectángulo. Y el `opacity` era lo único que quedaba
                acá forzando una superficie de ese tamaño: un grupo translúcido
                obliga al navegador a dibujar todo lo de adentro en una textura
                aparte para después mezclarla, y una textura que vuelve mal se
                ve así. Se repitió idéntica en doce cuadros a lo largo de 24 s:
                cuando vuelve mal, queda mal.

                ── Qué se pierde, y por qué se aceptó ───────────────────────
                Que la mano ya no se atenúa cuando no te toca. La señal de "no
                es tu turno" sigue estando y es más fuerte: la barra de abajo
                pasa a ser QUIERO / NO QUIERO, y las cartas no responden al
                toque. Lo decidió Santiago con la foto de la banda delante.

                ── Lo que NO cambia ─────────────────────────────────────────
                Adentro de acá sigue sin poder haber un `filter` (ver
                `SOMBRA_EN_MANO` y `components/mesa/Manos.tsx`), y
                `mirar-mesa.mjs` sigue fallando si aparece uno. El agarre de
                abajo es el que usa para mirar. Se llamaba `apagable` y ahora
                se llama `tuya`: ya no apaga nada, y un nombre que miente
                cuesta una sesión. */}
            <div
              /* El agarre con el que `mirar-mesa.mjs` comprueba que acá adentro
                 no haya ni un `filter`. Ver el comentario de arriba.

                 Y ES LO QUE VA EN SU PROPIA CAPA (11/10/2026): `globals.css`
                 le pone `will-change: transform` a `[data-mano="tuya"]`, y eso
                 se llevó el resto de los cuadraditos de las cartas. Si este
                 agarre cambia de nombre, la regla deja de aplicar en silencio;
                 `mirar-mesa.mjs` lo agarra. */
              data-mano="tuya"
              className="pointer-events-auto"
            >
              {florSalvada && (
                <p className="mb-0.5 text-center font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-wide text-dorado/90 [text-shadow:0_1px_3px_rgba(0,0,0,1)]">
                  Te cantamos la flor: se perdía
                </p>
              )}

              {/* La ayuda espera a que las cartas estén dadas vuelta: cantarte el
                  tanto de una mano que todavía no viste rompe el reparto.

                  Y SE CALLA CUANDO LA MANO TERMINÓ. No es sólo que ya no sirva
                  —el tanto de una mano cerrada no lo vas a cantar—: es que
                  justo ahí aparece el papel de "acá está mi flor", que sale de
                  este mismo lado, y las dos cosas quedaban una encima de la
                  otra.

                  Y SIN CARTAS EN LA MANO TAMPOCO (9/10/2026): habla de tus
                  cartas, y desde que la mano se va al quedarse vacía quedaba
                  flotando sola sobre la madera. */}
              {ayudas && carasArriba && p.fase === "jugando" && nCartas > 0 && (
                <p className="relative z-10 mb-2 text-center font-[family-name:var(--font-ui)] text-[11px] uppercase leading-tight tracking-wide text-dorado [text-shadow:0_1px_3px_rgba(0,0,0,0.95)] sm:text-xs">
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
                  piezas y no una.

                  ── SIN CARTAS NO HAY MANO (9/10/2026) ─────────────────────
                  Las dos piezas existen sólo mientras hay algo en el abanico
                  (`enAbanico`, arriba). Se DESMONTAN, no se apagan: ni
                  `opacity: 0`, ni `visibility`, ni una animación de salida que
                  quede pegada con `forwards`. Una opacidad sobre la mano es lo
                  que dejaba la banda de rayas del 7/9, y una animación pegada
                  mantiene viva su capa (ver `.anim-pop` en `globals.css`).
                  Desmontada, en el teléfono es un redibujado y nada más.

                  `data-pieza` es el agarre de `mirar-mesa-nueva.mjs`, que
                  comprueba que no salten al repartir y que se vayan sin cartas.

                  ── EL DORSO SE CENTRA CON `transform`, NO CON `-translate-x-1/2`
                  En Tailwind 4 esa clase escribe la propiedad `translate`, que
                  es la MISMA que anima `anim-entra-mano`: mientras subía, la
                  animación le pisaba el −50% y la palma entraba corrida media
                  mano a la derecha (141 px a 390×844), con el pulgar en su
                  lugar, y al terminar saltaba. Es "la mano se mueve del lugar"
                  que vio Santiago el 9/10/2026. */}
              <div
                className="relative flex items-end justify-center"
                style={{ paddingBottom: `calc(0.26 * ${d.mano.ancho})` }}
              >
                {nCartas > 0 && (
                  <span
                    data-pieza="dedos"
                    className={`pointer-events-none absolute left-1/2 z-0 ${
                      repartiendo ? "anim-entra-mano" : ""
                    }`}
                    style={{
                      bottom: `calc(-0.06 * ${d.mano.ancho})`,
                      width: anchoMano,
                      transform: "translateX(-50%)",
                      animationDelay: `${retrasoDeReparto("vos", 0, soyMano)}ms`,
                    }}
                  >
                    <DedosAtras ancho="100%" luz={ambiente.luz} />
                  </span>
                )}

                <div className="mano-abanico relative z-10 flex justify-center">
                  {/* Las que ya se apoyaron sobre la mesa NO se dibujan
                      acá: si no, la misma carta se ve dos veces, en la mano y
                      en la mesa. */}
                  {enAbanico.map((carta, i, quedan) => (
                    <CartaEnMano
                      key={`${carta.numero}-${carta.palo}`}
                      carta={carta}
                      posicion={i}
                      total={quedan.length}
                      pieza={ayudas && esPieza(carta, p.muestra)}
                      habilitada={miTurno && b.jugar}
                      tapada={!carasArriba}
                      viajando={faseReparto === "repartiendo"}
                      retrasoViaje={retrasoDeReparto("vos", i, soyMano)}
                      retrasoVolteo={i * ENTRE_VOLTEOS}
                      desdeX={ladoMazo === "izquierda" ? -140 : 140}
                      ancho={d.mano.ancho}
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
                {nCartas > 0 && (
                  <span
                    data-pieza="pulgar"
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── La barra de cantos ────────────────────────────────────────
          Está EN EL FLUJO, como última hermana, y **no cambia de alto**: es
          siempre una sola fila. Lo que antes le crecía arriba —la flor y lo que
          podés subir— ahora flota sobre tus cartas, en `CantosFlotantes`.

          ── POR QUÉ, MEDIDO EL 4/9/2026 ─────────────────────────────────
          Al abrir el envido la barra pasaba de 48 a 103 px y la mesa entera
          saltaba 43 px: el mate, el mazo y las cartas se corrían de golpe justo
          cuando estás decidiendo si querés. A 320x568 eso es el 12% de la mesa
          yéndose y volviendo.

          El primer intento fue reservarle a la barra el alto de un renglón. Se
          hizo, se midió (el salto pasó a 0) y **Santiago lo rechazó con razón**:
          una franja marrón de 103 px abajo de todo, casi siempre vacía, para
          evitar un movimiento. La cura era peor.

          Lo que quedó no paga alto ninguno: los botones que aparecen y
          desaparecen se sacaron del flujo. */}
      <div className="relative z-30 shrink-0 border-t-2 filo-dorado bg-[#160f0a]">
        {/* HAY DOS BARRAS, Y A PROPÓSITO.
            Cuando hay algo que contestar, la fila entera pasa a ser dos botones
            sólidos, verde y rojo. "Quiero" y "no quiero" se contestan bajo
            presión y con la mesa esperándote: no pueden ser dos palabras más en
            una fila de palabras. El resto del tiempo la barra es la de las
            referencias —texto grande con separadores finos—, que no le compite
            a las cartas. */}
        {b.contestando ? (
          /* `py-0` y no `p-1.5`: con relleno vertical esta fila medía 58px y la
             de las referencias 48, o sea que la barra —y con ella la mesa
             entera— daba un saltito de 10px cada vez que el rival te cantaba
             algo. Ahora los dos botones ocupan el alto entero de la barra, que
             además es lo que ese momento pide: son la respuesta. */
          <div className="mx-auto flex max-w-[760px] gap-1.5 px-1.5 py-0">
            {b.quiero && (
              <BotonCanto
                canto="quiero"
                onClick={() => hacer({ tipo: "quiero" })}
                tono="quiero"
              >
                Quiero
              </BotonCanto>
            )}
            {b.noQuiero && (
              <BotonCanto
                canto="no-quiero"
                onClick={() => hacer({ tipo: "no-quiero" })}
                tono="no"
              >
                {meCantaronFlor ? "Me achico" : "No quiero"}
              </BotonCanto>
            )}
          </div>
        ) : (
          <div className="mx-auto flex max-w-[760px] items-stretch">
            {b.envidos.length > 0 && (
              <CantoEnFila
                canto="abrir-envido"
                onClick={() => setMenuEnvido((v) => !v)}
              >
                {subiendoEnvido ? "Subir" : "Envido"}
              </CantoEnFila>
            )}
            <CantoEnFila
              canto="truco"
              onClick={() => hacer({ tipo: "truco" })}
              deshabilitada={!b.truco}
            >
              {["Truco", "Retruco", "Vale cuatro"][p.truco.nivel] ?? "Truco"}
            </CantoEnFila>
            <CantoEnFila
              canto="irse-al-mazo"
              onClick={() => hacer({ tipo: "mazo" })}
              deshabilitada={!b.mazo}
            >
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
          premio={premio}
          onSeguir={() => {
            if (p.fase === "partida-terminada") {
              /* PARTIDA NUEVA: entra por la puerta de todos (`lib/entrada.ts`),
                 que decide si antes va un anuncio. Y TODO lo que reparte va
                 adentro de la función que se llama después: si
                 `anotada.current = null` corriera antes del anuncio, con la
                 partida terminada todavía en pantalla, el efecto que anota
                 los resultados la volvería a anotar.

                 El rival se olvida de ésta y arranca con lo que el legajo
                 diga. Una mano más de la MISMA partida, no: ahí lo que te vio
                 hacer sigue valiendo, que es todo el asunto. */
              const deptoActual = parametros.get("depto");
              portero.pedirPartida(
                esHistoria && deptoActual ? { modo: "gira", depto: deptoActual } : { modo: "rapida" },
                () => {
                  anotada.current = null;
                  reiniciarMemoria(rival);
                  repartirNueva(nuevaPartida());
                },
              );
            } else {
              anotada.current = null;
              repartirNueva(siguienteMano(p));
            }
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
            /* Elegir rival es empezar OTRA partida, también a mitad de una
               (desde el medallón). La que quedaba a medias se da por
               terminada acá, al elegir —no al abrir el selector: con "Volver"
               la partida sigue y no pasa nada—, y la nueva entra por la
               puerta de todos. Si toca un anuncio, sale ENTRE las dos.
               Decisión de Santiago, 2/10/2026. */
            portero.marcarPartidaEnCurso(false);
            // La escena del rival nuevo se empieza a bajar YA, al tocar: si
            // sale un anuncio, para cuando se cierra ya está.
            void precargarDepartamento(nuevo.departamento);
            const pedido = Symbol(nuevo.id);
            ultimoPedido.current = pedido;
            portero.pedirPartida({ modo: "rapida" }, () => {
              // Y entra entera, como al llegar a la mesa (ver el primer reparto).
              void esperarEscena(escenaDe(nuevo.departamento)).then(() => {
                // Si mientras tanto se eligió otro, gana el último.
                if (ultimoPedido.current !== pedido) return;
                setRivalElegido(nuevo);
                guardarPreferencia("ultimoRival", nuevo.id);
                anotada.current = null;
                // Es otra persona: no puede heredar lo que anotó la anterior.
                reiniciarMemoria(nuevo);
                repartirNueva(nuevaPartida());
                setEligiendo(false);
              });
            });
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
function CartaApoyada({
  carta,
  de,
  ancho,
}: {
  carta: CartaType;
  de: Jugador;
  ancho: string;
}) {
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
      {/* La sombra proyectada sobre la mesa, que se cierra al aterrizar.

          ── ERA UN `blur-[3px]`, Y ADEMÁS ANIMADO ────────────────────────
          `blur-[3px]` es `filter: blur(3px)` de Tailwind, y el `@keyframes`
          que lo acompañaba le cambiaba el radio en cada cuadro. Por cada
          carta jugada —hasta seis en la mesa— eso era una superficie de
          composición que se rehacía sola. Es de donde salían los píxeles
          blancos alrededor de las cartas del 4/9/2026.

          Ahora el borde suave lo da un `box-shadow`, que sigue la misma
          silueta redondeada del `rounded`: es el cambio que ya se le hizo a
          las cartas de la mano el 2/9 (ver `SOMBRA_EN_MANO`). NO VOLVER A
          PONER UN FILTRO ACÁ: `mirar-mesa.mjs` falla si aparece uno.

          Y desde el 8/10/2026, tampoco un DESENFOQUE: era `0 0 7px 2px`, y
          un box-shadow con desenfoque también rompía en el Redmi (ver
          `globals.css`, "Las sombras de la mesa"). Es la misma sombra, hecha
          con capas sin desenfoque. */}
      <div
        className="anim-sombra absolute inset-x-0 bottom-[-3px] top-3 rounded bg-black/70"
        style={{ boxShadow: "var(--sombra-baza)" }}
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
  ancho,
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
  /** El ancho de una carta, que lo decide el diseño de mesa que esté activo. */
  ancho: string;
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
        tapada
          ? "Carta boca abajo, repartiendo"
          : `Tirar el ${carta.numero} de ${carta.palo}`
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
          <Carta oculta style={{ width: ancho, boxShadow: SOMBRA_EN_MANO }} />
        ) : (
          <Carta
            carta={carta}
            pieza={pieza}
            className="anim-voltea"
            style={{
              width: ancho,
              animationDelay: `${retrasoVolteo}ms`,
              /* La pieza tiene su propio halo y NO se le pisa: es lo que dice
                 que esa carta vale más, y una sombra encima lo apagaría. */
              ...(pieza ? {} : { boxShadow: SOMBRA_EN_MANO }),
            }}
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
  suelto = false,
  canto,
}: {
  children: React.ReactNode;
  onClick: () => void;
  deshabilitada?: boolean;
  tono?: "neutro" | "bordo" | "dorado" | "quiero" | "no";
  /**
   * Suelto = flotando sobre la madera, sin la barra atrás.
   *
   * Los de la barra ocupan su fila entera (`flex-1`) porque comparten un fondo
   * y se leen como una fila. Los sueltos miden lo que dice su texto y llevan
   * sombra propia: sin ella, un botón dorado sobre madera oscura se ve pegado
   * al fondo y no apoyado encima.
   */
  suelto?: boolean;
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
      className={`min-h-[46px] rounded font-[family-name:var(--font-ui)] text-[15px] uppercase tracking-wide transition-colors disabled:cursor-default disabled:bg-black/30 disabled:text-crema/25 ${
        suelto
          ? /* Suelto sobre la madera: mide lo que dice, con aire a los costados
               y una sombra dura que lo despega del fondo. El filo claro de
               arriba es lo que lo hace parecer una ficha y no una mancha. */
            "px-3.5 sombra-canto"
          : "flex-1 px-2"
      } ${tonos[tono]}`}
    >
      {children}
    </button>
  );
}

function Cartel({
  partida,
  rival,
  desdeLaGira,
  premio,
  onSeguir,
  onCambiarRival,
}: {
  partida: Partida;
  rival: Personalidad;
  /** Si llegaste desde el mapa, al terminar te ofrece volver ahí. */
  desdeLaGira: boolean;
  /**
   * El objeto del departamento, si acabás de ganarlo.
   *
   * Viene con algo SÓLO la primera vez que le ganás a ese rival, y sólo en la
   * gira: quién decide eso está en el efecto que anota la partida. Acá se
   * dibuja y nada más.
   */
  premio: ClaveObjeto | null;
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

        {/* ─── EL PREMIO DEL DEPARTAMENTO ────────────────────────────────
            Va ADENTRO de este cartel y no en uno propio: son dos noticias del
            mismo momento —ganaste y te llevás esto— y dos carteles seguidos
            son dos cosas montándose y desmontándose encima de la mesa, que es
            justo la familia de problemas que este proyecto viene apagando.

            El objeto se dibuja igual que en la vitrina: caja de alto fijo con
            su `PROPORCION`, sin `ALTURA` ni `APOYO`. Ésos dos son para cuando
            está apoyado sobre la madera y acá no lo está — el porqué está
            escrito en `components/Trofeos.tsx`. */}
        {premio && (
          <div className="mt-5 flex items-center justify-center gap-3 border-y border-tinta/15 py-3">
            <div className="shrink-0" style={{ height: "2.6rem", aspectRatio: PROPORCION[premio] }}>
              <ObjetoDeMesa objeto={premio} />
            </div>
            <p className="text-left font-[family-name:var(--font-ui)] text-[11px] uppercase leading-snug tracking-wide text-bordo">
              Ganaste el premio
              <br />
              de {rival.departamento}
            </p>
          </div>
        )}

        <div className="mt-5 space-y-0.5 text-left text-sm text-tinta/70">
          {partida.eventos.slice(-4).map((e, i) => (
            <p key={i}>
              {e.quien === "sistema"
                ? "· "
                : e.quien === "vos"
                  ? "Vos: "
                  : "Él: "}
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
