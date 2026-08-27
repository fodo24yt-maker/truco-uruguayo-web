"use client";

import { useEffect, useRef, useState } from "react";

import { Carta } from "@/components/Carta";
import { FondoBar, Rival, TexturaMadera } from "@/components/mesa/Escenario";
import { Marcador } from "@/components/mesa/Marcador";
import { type Carta as CartaType, esPieza } from "@/lib/motor/baraja";
import { decidirJugada } from "@/lib/motor/bot";
import {
  type Accion,
  type Partida,
  accionesPosibles,
  aplicar,
  laFalta,
  nuevaPartida,
  siguienteMano,
} from "@/lib/motor/partida";
import {
  EL_CHUECO,
  PERSONALIDADES,
  buscarPersonalidad,
  type Personalidad,
} from "@/lib/motor/personalidades";
import { explicarEnvido, valorEnvido } from "@/lib/motor/tantos";
import { anotarPartida, guardarPreferencia, leerProgreso } from "@/lib/progreso";

const DEMORA_BOT = 900; // lo que el bot "piensa", para que se pueda seguir

/** Giro fijo por carta, para que al tirarla caiga siempre igual y no baile. */
function giroDe(carta: CartaType): number {
  const semilla = carta.numero * 7 + carta.palo.length * 13;
  return ((semilla % 15) - 7) * 1;
}

export default function Jugar() {
  const [p, setP] = useState<Partida | null>(null);
  const [ayudas, setAyudas] = useState(true);
  const [menuEnvido, setMenuEnvido] = useState(false);
  const [rival, setRival] = useState<Personalidad>(EL_CHUECO);
  const [eligiendo, setEligiendo] = useState(false);
  const [marcas, setMarcas] = useState<Record<string, { ganadas: number; jugadas: number }>>({});
  const anotada = useRef<Partida | null>(null);

  // El reparto se hace en el navegador: si se hiciera al generar la página,
  // todos verían siempre las mismas cartas.
  useEffect(() => {
    const progreso = leerProgreso();
    setAyudas(progreso.ayudas);
    setMarcas(progreso.rivales);
    if (progreso.ultimoRival) setRival(buscarPersonalidad(progreso.ultimoRival));
    setP(nuevaPartida());
  }, []);

  // El turno del bot, con la personalidad del rival elegido
  useEffect(() => {
    if (!p || p.fase !== "jugando" || p.turno !== "rival") return;
    const reloj = setTimeout(() => {
      const accion = decidirJugada(p, "rival", Math.random, rival);
      if (accion) setP((actual) => (actual ? aplicar(actual, accion, "rival") : actual));
    }, DEMORA_BOT);
    return () => clearTimeout(reloj);
  }, [p, rival]);

  // Cuando termina una partida se anota, una sola vez
  useEffect(() => {
    if (!p || p.fase !== "partida-terminada" || anotada.current === p) return;
    anotada.current = p;
    setMarcas(anotarPartida(rival.id, p.ganadorPartida === "vos").rivales);
  }, [p, rival]);

  if (!p) {
    return (
      <div className="tabla-mesa flex min-h-[70dvh] items-center justify-center">
        <p className="font-[family-name:var(--font-ui)] uppercase tracking-widest text-crema/60">
          Repartiendo…
        </p>
      </div>
    );
  }

  const hacer = (accion: Accion) => {
    setMenuEnvido(false);
    setP(aplicar(p, accion, "vos"));
  };

  const posibles = accionesPosibles(p, "vos");
  const puede = (tipo: Accion["tipo"]) => posibles.some((a) => a.tipo === tipo);
  const envidosPosibles = posibles.filter((a) => a.tipo === "envido");
  const florCantos = posibles.filter((a) => a.tipo === "flor-canto");
  const miTurno = p.turno === "vos" && p.fase === "jugando";
  const bazaActual = p.bazas[p.bazas.length - 1];
  // El tanto se cuenta con las tres cartas del reparto, nunca con las que quedan
  const miFlor = p.flor.vos;
  const miTanto = valorEnvido(p.manoInicial.vos, p.muestra);
  const ultimoEvento = p.eventos[p.eventos.length - 1];

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] justify-center overflow-hidden bg-[#0d0906] pb-[68px]">
      <div className="penumbra relative flex w-full max-w-[860px] flex-col">
        {/* ─── El bar y el rival, al fondo ───────────────────────────── */}
        <div className="relative h-[168px] shrink-0">
          <FondoBar />

          {/* El rival, sentado enfrente */}
          <div className="absolute bottom-0 left-1/2 h-[124px] w-[212px] -translate-x-1/2">
            <Rival nombre={rival.nombre} />
          </div>

          {/* Sus cartas, sostenidas delante de él */}
          <div className="absolute bottom-[6px] left-1/2 flex -translate-x-1/2 gap-1">
            {p.cartas.rival.map((_, i) => (
              <Carta
                key={i}
                oculta
                ancho={40}
                style={{
                  transform: `rotate(${(i - 1) * 7}deg) translateY(${Math.abs(i - 1) * 3}px)`,
                }}
              />
            ))}
          </div>

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
        </div>

        {/* ─── El canto de la mesa ───────────────────────────────────── */}
        <div className="canto-mesa relative z-10 h-[14px] shrink-0" />

        {/* ─── La mesa, en perspectiva ───────────────────────────────── */}
        <div className="escena-3d relative flex flex-1 flex-col">
          {/* la tabla, inclinada como si la vieras desde tu silla */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="tabla-mesa plano-mesa absolute inset-x-[-30%] top-0 h-[170%]">
              <TexturaMadera intensidad={0.85} vertical />
            </div>
          </div>

          {/* La UI va plana encima: si se inclinara, no se leería */}
          <div className="relative mx-auto flex max-h-[520px] w-full flex-1 flex-col px-2 py-2 sm:px-3">
            <div className="flex items-start justify-between gap-3">
              <Marcador vos={p.puntos.vos} rival={p.puntos.rival} />
              <button
                onClick={() => {
                  const nuevo = !ayudas;
                  setAyudas(nuevo);
                  guardarPreferencia("ayudas", nuevo);
                }}
                className="mt-1 rounded border border-crema/25 bg-black/40 px-2.5 py-1.5 font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-wide text-crema/70 transition-colors hover:border-crema/50 hover:text-crema"
              >
                Ayudas: {ayudas ? "sí" : "no"}
              </button>
            </div>

            <div className="flex min-h-[2.1rem] items-center justify-center">
              {ultimoEvento && (
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

            {/* Centro: la muestra a un costado, las bazas en el medio */}
            <div className="relative flex flex-1 items-center justify-center py-2">
              {/* La muestra, apoyada en el borde izquierdo de la mesa */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-center sm:left-8">
                <Carta
                  carta={p.muestra}
                  ancho={50}
                  className="halo-pieza mx-auto rotate-90"
                />
                <p className="mt-5 font-[family-name:var(--font-ui)] text-[10px] uppercase leading-tight tracking-[0.12em] text-dorado drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
                  muestra
                  <br />
                  <span className="text-crema/80">manda {p.muestra.palo}</span>
                </p>
              </div>

              {/* El mazo, apoyado del otro lado. No se toca: es el objeto que
                  hace que la mesa se lea como una mesa. */}
              <div
                className="absolute right-2 top-1/2 hidden -translate-y-1/2 sm:right-8 sm:block"
                aria-hidden="true"
              >
                <div className="relative h-[74px] w-[50px]">
                  <div className="absolute inset-x-0 bottom-[-4px] h-3 rounded-full bg-black/70 blur-[5px]" />
                  <Carta oculta ancho={50} className="absolute left-[3px] top-[3px] opacity-70" />
                  <Carta oculta ancho={50} className="absolute left-[1px] top-[1px] opacity-85" />
                  <Carta oculta ancho={50} className="absolute inset-0" />
                </div>
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
            <div className="mt-1">
              {ayudas && (
                <p className="mb-1 text-center font-[family-name:var(--font-ui)] text-xs uppercase tracking-wide text-dorado drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {miFlor.tiene ? (
                    <>Tenés flor: {miFlor.valor}</>
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
          onSeguir={() => {
            anotada.current = null;
            setP(p.fase === "partida-terminada" ? nuevaPartida() : siguienteMano(p));
          }}
          onCambiarRival={() => setEligiendo(true)}
        />
      )}

      {eligiendo && (
        <ElegirRival
          actual={rival}
          marcas={marcas}
          onElegir={(nuevo) => {
            setRival(nuevo);
            guardarPreferencia("ultimoRival", nuevo.id);
            anotada.current = null;
            setP(nuevaPartida());
            setEligiendo(false);
          }}
          onCerrar={() => setEligiendo(false)}
        />
      )}

      {/* ─── La barra de cantos ──────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 filo-dorado bg-[#1a120c]">
        {!p.florResuelta && (
          <div className="mx-auto flex max-w-[760px] gap-1 border-b border-crema/10 p-1.5">
            {puede("flor") && (
              <BotonCanto onClick={() => hacer({ tipo: "flor" })} tono="dorado">
                Me quedo con la flor
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
          {puede("quiero") && (
            <>
              <BotonCanto onClick={() => hacer({ tipo: "quiero" })} tono="quiero">
                Quiero
              </BotonCanto>
              <BotonCanto onClick={() => hacer({ tipo: "no-quiero" })} tono="no">
                No quiero
              </BotonCanto>
            </>
          )}

          {envidosPosibles.length > 0 && (
            <BotonCanto onClick={() => setMenuEnvido((v) => !v)} tono="dorado">
              {puede("quiero") ? "Subir" : "Envido"}
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
  if (!carta) {
    return (
      <div
        className="h-[78px] w-[52px] rounded border border-black/20 bg-black/10"
        aria-hidden="true"
      />
    );
  }
  return (
    <div className="carta-apoyada relative h-[78px] w-[52px]">
      {/* la sombra proyectada sobre la mesa, que se cierra al aterrizar */}
      <div
        className="anim-sombra absolute inset-x-0 bottom-[-3px] top-3 rounded bg-black/70 blur-[3px]"
        aria-hidden="true"
      />
      <Carta
        carta={carta}
        ancho={52}
        className="anim-caer absolute inset-0"
        style={{ "--giro": `${giroDe(carta)}deg` } as React.CSSProperties}
      />
    </div>
  );
}

/**
 * Una carta sostenida en la mano: va en abanico, con su rotación y su altura
 * según el lugar que ocupa. Al tocarla se levanta y se endereza, como cuando
 * la separás del resto con el pulgar.
 */
function CartaEnMano({
  carta,
  posicion,
  total,
  pieza,
  habilitada,
  onClick,
}: {
  carta: CartaType;
  posicion: number;
  total: number;
  pieza: boolean;
  habilitada: boolean;
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
      aria-label={`Tirar el ${carta.numero} de ${carta.palo}`}
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
        className={`block transition-transform duration-150 ${
          habilitada
            ? "group-hover:-translate-y-3 group-focus-visible:-translate-y-3"
            : ""
        }`}
        style={{ filter: "drop-shadow(0 10px 12px rgba(0,0,0,0.75))" }}
      >
        <Carta carta={carta} ancho={92} pieza={pieza} />
      </span>
    </button>
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
  onSeguir,
  onCambiarRival,
}: {
  partida: Partida;
  rival: Personalidad;
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

        {terminada && (
          <button
            onClick={onCambiarRival}
            className="mt-2 w-full rounded border border-tinta/25 py-2.5 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-tinta/75 transition-colors hover:border-tinta/50 hover:text-tinta"
          >
            Cambiar de rival
          </button>
        )}
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
