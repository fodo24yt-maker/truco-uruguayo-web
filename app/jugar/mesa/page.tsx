"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Carta } from "@/components/Carta";
import { FondoBar, Rival, TexturaMadera } from "@/components/mesa/Escenario";
import { Marcador } from "@/components/mesa/Marcador";
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
import { porSlugDeDepartamento } from "@/lib/gira";
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
/** Lo que queda un verso en pantalla si no lo cerrás ni contestás. */
const DURA_VERSO = 6500;

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

  /** Empieza una mano nueva y larga el reparto. Todas las manos pasan por acá. */
  const repartirNueva = (nueva: Partida) => {
    setVerso(null);
    setFlorSalvada(false);
    setMenuEnvido(false);
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
  const puede = (tipo: Accion["tipo"]) => posibles.some((a) => a.tipo === tipo);
  const envidosPosibles = posibles.filter((a) => a.tipo === "envido");
  const florCantos = posibles.filter((a) => a.tipo === "flor-canto");
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
  // El tanto se cuenta con las tres cartas del reparto, nunca con las que quedan
  const miFlor = p.flor.vos;
  const miTanto = valorEnvido(p.manoInicial.vos, p.muestra);
  const ultimoEvento = p.eventos[p.eventos.length - 1];

  return (
    // La mesa ocupa todo el alto que le queda a la pantalla y NUNCA hace
    // scroll: un juego que te obliga a scrollear para ver tus propias cartas
    // no se puede jugar. Adentro, cada zona se reparte lo que hay.
    <div className="mesa-pantalla-completa relative flex min-h-0 flex-1 justify-center overflow-hidden bg-[#0d0906]">
      <div className="penumbra relative flex w-full max-w-[860px] flex-col">
        {/* ─── El bar y el rival, al fondo ───────────────────────────── */}
        <div className="relative h-[104px] shrink-0 sm:h-[168px]">
          <FondoBar />

          {/* El rival, sentado enfrente */}
          <div className="absolute bottom-0 left-1/2 h-[86px] w-[148px] -translate-x-1/2 sm:h-[124px] sm:w-[212px]">
            <Rival nombre={rival.nombre} />
          </div>

          {/* Sus cartas, sostenidas delante de él.
              El viaje desde el mazo va en un <span> de afuera y el abanico en la
              carta de adentro: si los dos transform vivieran en el mismo
              elemento, la animación le pisaría el abanico y al terminar las tres
              cartas pegarían un salto para acomodarse. */}
          <div className="absolute bottom-[6px] left-1/2 flex -translate-x-1/2 gap-1">
            {p.cartas.rival.map((_, i) => (
              <span
                key={i}
                className={repartiendo ? "anim-reparte" : ""}
                style={
                  repartiendo
                    ? ({
                        animationDelay: `${retrasoDeReparto("rival", i, soyMano)}ms`,
                        "--desde-x": `${ladoMazo === "izquierda" ? -110 : 110}px`,
                        "--desde-y": "96px",
                      } as React.CSSProperties)
                    : undefined
                }
              >
                <Carta
                  oculta
                  className="w-[30px] sm:w-[40px]"
                  style={{
                    transform: `rotate(${(i - 1) * 7}deg) translateY(${Math.abs(i - 1) * 3}px)`,
                  }}
                />
              </span>
            ))}
          </div>

          {/* Lo que está diciendo el rival, cuando canta con verso */}
          {verso && (
            <BocadilloVerso
              lineas={verso.lineas}
              canto={verso.canto}
              onCerrar={() => setVerso(null)}
            />
          )}

          {/* En historia va una placa fija con el departamento y el rival; el
              selector NO se monta. En libre, el botón de siempre. */}
          {esHistoria ? (
            <div className="absolute right-3 top-3 rounded-sm border border-dorado/30 bg-black/60 px-2.5 py-1.5 text-right">
              <span className="block font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wide text-crema/90">
                {rival.nombre}
              </span>
              <span className="block font-[family-name:var(--font-ui)] text-[9px] uppercase tracking-wide text-dorado/70">
                {rival.departamento} · gira
              </span>
            </div>
          ) : (
            <button
              onClick={() => setEligiendo(true)}
              className="absolute right-3 top-3 rounded-sm bg-black/60 px-2.5 py-1.5 text-right transition-colors hover:bg-black/80"
            >
              <span className="block font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wide text-crema/90">
                {rival.nombre}
              </span>
              <span className="block font-[family-name:var(--font-ui)] text-[9px] uppercase tracking-wide text-crema/45">
                {rival.lugar} · cambiar
              </span>
            </button>
          )}
        </div>

        {/* ─── El canto de la mesa ───────────────────────────────────── */}
        <div className="canto-mesa relative z-10 h-[14px] shrink-0" />

        {/* ─── La mesa, en perspectiva ───────────────────────────────── */}
        <div className="escena-3d relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* la tabla, inclinada como si la vieras desde tu silla */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="tabla-mesa plano-mesa absolute inset-x-[-30%] top-0 h-[170%]">
              <TexturaMadera intensidad={0.85} vertical />
            </div>
          </div>

          {/* La UI va plana encima: si se inclinara, no se leería */}
          <div className="relative mx-auto flex w-full min-h-0 flex-1 flex-col px-2 pb-[74px] pt-1.5 sm:px-3 sm:pb-[80px] sm:pt-2">
            <div className="flex shrink-0 items-start justify-between gap-2">
              <Marcador vos={p.puntos.vos} rival={p.puntos.rival} />
              <button
                onClick={() => {
                  const nuevo = !ayudas;
                  setAyudas(nuevo);
                  guardarPreferencia("ayudas", nuevo);
                }}
                className="mt-1 shrink-0 rounded border border-crema/25 bg-black/40 px-2 py-1 font-[family-name:var(--font-ui)] text-[9px] uppercase tracking-wide text-crema/70 transition-colors hover:border-crema/50 hover:text-crema sm:px-2.5 sm:py-1.5 sm:text-[10px]"
              >
                Ayudas: {ayudas ? "sí" : "no"}
              </button>
            </div>

            {florSalvada && (
              <p className="shrink-0 text-center font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-wide text-dorado/90">
                Te cantamos la flor: se perdía
              </p>
            )}

            {/* La chapa del último canto. Con un verso en pantalla se esconde: el
                globo ya lo dice abajo de la copla y leerlo dos veces distrae.
                Cuando el globo se va, la chapa vuelve y queda como registro. */}
            <div className="flex min-h-[1.75rem] shrink-0 items-center justify-center sm:min-h-[2.1rem]">
              {ultimoEvento && !verso && (
                <p
                  key={p.eventos.length}
                  className={`anim-pop rounded-full px-4 py-1.5 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide ${
                    ultimoEvento.quien === "sistema"
                      ? "text-crema/75 drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
                      : "bg-crema text-tinta shadow-lg shadow-black/60"
                  }`}
                >
                  {ultimoEvento.texto}
                </p>
              )}
            </div>

            {/* Centro: el mazo a un costado, las bazas en el medio */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center py-1 sm:py-2">
              {/* El mazo con la muestra metida abajo, del lado del que reparte.
                  Antes eran dos objetos separados en las dos puntas de la mesa;
                  en la mesa de verdad son uno solo. */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 ${
                  ladoMazo === "izquierda"
                    ? "left-0 origin-left sm:left-4"
                    : "right-0 origin-right sm:right-4"
                } sm:scale-[1.14]`}
              >
                <Mazo muestra={p.muestra} lado={ladoMazo} revelada={carasArriba} />
              </div>

              <div className="flex gap-3 sm:gap-4">
                {p.bazas.map((baza, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <RanuraCarta carta={baza.rival} />
                    <RanuraCarta carta={baza.vos} />
                    <span className="h-3 font-[family-name:var(--font-ui)] text-[9px] uppercase tracking-wide text-crema/60">
                      {baza.ganador === "parda"
                        ? "parda"
                        : baza.ganador === "vos"
                          ? "tuya"
                          : baza.ganador === "rival"
                            ? "suya"
                            : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tu mano */}
            <div className="mt-auto shrink-0 pb-1">
              {/* La ayuda espera a que las cartas estén dadas vuelta: cantarte el
                  tanto de una mano que todavía no viste rompe el reparto. */}
              {ayudas && carasArriba && (
                <p className="mb-1 text-center font-[family-name:var(--font-ui)] text-[11px] uppercase leading-tight tracking-wide text-dorado drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-xs">
                  {miFlor.tiene ? (
                    <>
                      Tenés flor: {miFlor.valor}
                      {puede("flor") && (
                        <span className="ml-2 normal-case tracking-normal text-crema/60">
                          (cantala antes de tirar)
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      Tu tanto: {miTanto}
                      <span className="ml-2 normal-case tracking-normal text-crema/60">
                        ({explicarEnvido(p.manoInicial.vos, p.muestra)})
                      </span>
                    </>
                  )}
                </p>
              )}

              <div className="mano-abanico flex justify-center">
                {p.cartas.vos.map((carta, i) => (
                  <CartaEnMano
                    key={`${carta.numero}-${carta.palo}`}
                    carta={carta}
                    posicion={i}
                    total={p.cartas.vos.length}
                    pieza={ayudas && esPieza(carta, p.muestra)}
                    habilitada={miTurno && puede("jugar")}
                    tapada={!carasArriba}
                    viajando={faseReparto === "repartiendo"}
                    retrasoViaje={retrasoDeReparto("vos", i, soyMano)}
                    retrasoVolteo={i * ENTRE_VOLTEOS}
                    desdeX={ladoMazo === "izquierda" ? -140 : 140}
                    onClick={() => hacer({ tipo: "jugar", carta })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {p.fase !== "jugando" && !eligiendo && (
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

      {/* ─── La barra de cantos ────────────────────────────────────────
          Va dentro del flujo, no fija: fija tapaba las cartas de la mano en
          celular, que es justamente lo que hay que poder ver y tocar. */}
      <div className="absolute inset-x-0 bottom-0 z-20 border-t-2 filo-dorado bg-[#1a120c]">
        {/* La flor la cantás vos. El botón sólo aparece cuando de verdad se
            puede: con flor, en la primera baza y sin haber hablado todavía.
            Si se va la ventana, se pierde (salvo con las ayudas prendidas). */}
        {(puede("flor") || florCantos.length > 0) && (
          <div className="mx-auto flex max-w-[760px] gap-1 border-b border-crema/10 p-1.5">
            {puede("flor") && (
              <BotonCanto onClick={() => hacer({ tipo: "flor" })} tono="dorado">
                {meCantaronFlor ? "Yo también" : "¡Flor!"}
              </BotonCanto>
            )}
            {florCantos.map((a) =>
              a.tipo === "flor-canto" ? (
                <BotonCanto key={a.canto} onClick={() => hacer(a)} tono="bordo">
                  {a.canto === "con-flor-envido" ? "Con flor envido" : "Contraflor al resto"}
                </BotonCanto>
              ) : null,
            )}
          </div>
        )}

        {menuEnvido && envidosPosibles.length > 0 && (
          <div className="mx-auto flex max-w-[760px] gap-1 border-b border-crema/10 p-1.5">
            {envidosPosibles.map((a) => (
              <BotonCanto
                key={a.tipo === "envido" ? a.canto : ""}
                onClick={() => hacer(a)}
                tono="dorado"
              >
                {a.tipo === "envido" &&
                  (a.canto === "falta-envido"
                    ? `Falta (${laFalta(p.puntos)})`
                    : a.canto === "real-envido"
                      ? "Real envido"
                      : "Envido")}
              </BotonCanto>
            ))}
          </div>
        )}

        <div className="mx-auto flex max-w-[760px] gap-1 p-1.5">
          {/* La flor a secas no se quiere ni se rechaza (reglas 8.5): o tenés
              flor y se comparan, o te achicás. Por eso van por separado. */}
          {puede("quiero") && (
            <BotonCanto onClick={() => hacer({ tipo: "quiero" })} tono="quiero">
              Quiero
            </BotonCanto>
          )}
          {puede("no-quiero") && (
            <BotonCanto onClick={() => hacer({ tipo: "no-quiero" })} tono="no">
              {meCantaronFlor ? "Me achico" : "No quiero"}
            </BotonCanto>
          )}

          {envidosPosibles.length > 0 && (
            <BotonCanto onClick={() => setMenuEnvido((v) => !v)} tono="dorado">
              {subiendoEnvido ? "Subir" : "Envido"}
            </BotonCanto>
          )}

          <BotonCanto
            onClick={() => hacer({ tipo: "truco" })}
            deshabilitada={!puede("truco")}
            tono="bordo"
          >
            {["Truco", "Retruco", "Vale cuatro"][p.truco.nivel] ?? "Truco"}
          </BotonCanto>

          <BotonCanto
            onClick={() => hacer({ tipo: "mazo" })}
            deshabilitada={!puede("mazo")}
          >
            Mazo
          </BotonCanto>
        </div>
      </div>
    </div>
  );
}

/** El lugar donde aterriza una carta jugada. Vacío, casi no se nota. */
function RanuraCarta({ carta }: { carta: CartaType | null }) {
  const medidas = "w-[44px] h-[66px] sm:w-[52px] sm:h-[78px]";

  if (!carta) {
    return (
      <div
        className={`${medidas} rounded border border-black/20 bg-black/10`}
        aria-hidden="true"
      />
    );
  }
  return (
    <div className={`carta-apoyada relative ${medidas}`}>
      {/* la sombra proyectada sobre la mesa, que se cierra al aterrizar */}
      <div
        className="anim-sombra absolute inset-x-0 bottom-[-3px] top-3 rounded bg-black/70 blur-[3px]"
        aria-hidden="true"
      />
      <Carta
        carta={carta}
        className="anim-caer absolute inset-0 w-full"
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
      className={`group relative -mx-2 rounded-lg transition-transform duration-150 ${
        habilitada ? "cursor-pointer" : "cursor-default opacity-70"
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
          <Carta oculta className="w-[74px] sm:w-[92px]" />
        ) : (
          <Carta
            carta={carta}
            pieza={pieza}
            className="w-[74px] anim-voltea sm:w-[92px]"
            style={{ animationDelay: `${retrasoVolteo}ms` }}
          />
        )}
      </span>
    </button>
  );
}

/**
 * Lo que el rival está recitando cuando canta con verso.
 *
 * Sale de la boca del rival y se mete sobre la mesa: es una persona hablando,
 * no un cartel del sistema. Abajo, separado por una línea, va el canto en
 * limpio —"¡Truco!"— porque el verso es lindo pero lo que hay que contestar es
 * el canto, y el globo tapa por un rato la chapa donde se lee.
 *
 * Se cierra tocándolo, contestando, o solo a los seis segundos y medio.
 */
function BocadilloVerso({
  lineas,
  canto,
  onCerrar,
}: {
  lineas: readonly string[];
  canto: string;
  onCerrar: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute left-1/2 top-[44px] z-30 w-[min(90vw,320px)] -translate-x-1/2 sm:top-[76px]"
    >
      <button
        onClick={onCerrar}
        className="papel anim-pop relative w-full rounded-sm px-4 py-3 text-center shadow-2xl shadow-black/80"
      >
        {/* la puntita que lo ata a la boca del rival */}
        <span
          className="absolute left-1/2 top-[-5px] h-[11px] w-[11px] -translate-x-1/2 rotate-45"
          style={{ background: "var(--color-papel)" }}
        />
        {lineas.map((linea, i) => (
          <span
            key={i}
            className="block font-[family-name:var(--font-mano)] text-[15px] leading-[1.4] text-tinta sm:text-[17px]"
          >
            {linea}
          </span>
        ))}
        <span className="mt-2 block border-t border-tinta/15 pt-1.5 font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wide text-bordo">
          {canto}
        </span>
      </button>
    </div>
  );
}

function BotonCanto({
  children,
  onClick,
  deshabilitada = false,
  tono = "neutro",
}: {
  children: React.ReactNode;
  onClick: () => void;
  deshabilitada?: boolean;
  tono?: "neutro" | "bordo" | "dorado" | "quiero" | "no";
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
      onClick={onClick}
      disabled={deshabilitada}
      className={`min-h-[52px] flex-1 rounded px-2 font-[family-name:var(--font-ui)] text-[15px] uppercase tracking-wide transition-colors disabled:cursor-default disabled:bg-black/30 disabled:text-crema/25 ${tonos[tono]}`}
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
