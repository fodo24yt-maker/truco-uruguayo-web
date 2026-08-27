"use client";

/**
 * El ejercicio del final de cada lección.
 *
 * La idea: en vez de leer que "el 2 de la muestra es la carta más fuerte", te
 * ponemos una mano sobre la mesa y te preguntamos cuál tirás. Elegís, y el
 * ejercicio te dice si acertaste Y POR QUÉ —sobre todo si erraste, que es
 * cuando de verdad se aprende—.
 *
 * Toda la corrección sale del motor del juego, no de textos escritos a mano:
 * si mañana cambia una regla, los ejercicios cambian con ella y no pueden
 * quedar mintiendo.
 */

import { useState } from "react";

import { Carta } from "@/components/Carta";
import { type Carta as CartaType, desdeTexto, esPieza } from "@/lib/motor/baraja";

export interface Opcion {
  /** Lo que se muestra en el botón. */
  texto: string;
  /** Si es la respuesta correcta. */
  correcta: boolean;
  /** Por qué. Se muestra siempre al responder, acierte o no. */
  porque: string;
}

export interface PropsEjercicio {
  /** La pregunta concreta. */
  pregunta: string;
  /** La muestra de la mano, en notación corta ("3O"). */
  muestra?: string;
  /** Tus cartas. */
  mano?: string[];
  /** Las del rival, cuando el ejercicio las revela (envido, flor). */
  manoRival?: string[];
  /** Una carta ya jugada sobre la mesa. */
  enMesa?: string;
  opciones: Opcion[];
}

export function Ejercicio({
  pregunta,
  muestra,
  mano,
  manoRival,
  enMesa,
  opciones,
}: PropsEjercicio) {
  const [elegida, setElegida] = useState<number | null>(null);
  const respondido = elegida !== null;
  const acerto = respondido && opciones[elegida].correcta;
  const laMuestra = muestra ? desdeTexto(muestra) : undefined;

  const dibujar = (txt: string, i: number) => {
    const carta = desdeTexto(txt);
    return (
      <Carta
        key={`${txt}-${i}`}
        carta={carta}
        className="w-[52px] sm:w-[62px]"
        pieza={laMuestra ? esPieza(carta, laMuestra) : false}
      />
    );
  };

  return (
    <section className="my-8 border-2 border-bordo/25 bg-tinta/[0.04] p-4 sm:p-5">
      <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.14em] text-bordo">
        Probá vos
      </p>
      <p className="mt-2 text-[17px] font-semibold leading-snug text-tinta">{pregunta}</p>

      {/* La situación de juego */}
      {(laMuestra || mano || manoRival) && (
        <div className="my-4 flex flex-wrap items-end justify-center gap-4 sm:gap-6">
          {laMuestra && (
            <div className="text-center">
              <Carta carta={laMuestra} className="mx-auto w-[52px] rotate-90 sm:w-[62px]" />
              <p className="mt-4 font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-widest text-tinta/55">
                muestra
              </p>
            </div>
          )}

          {manoRival && (
            <div className="text-center">
              <div className="flex gap-1.5">{manoRival.map(dibujar)}</div>
              <p className="mt-2 font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-widest text-tinta/55">
                él tiene
              </p>
            </div>
          )}

          {enMesa && (
            <div className="text-center">
              <div className="flex gap-1.5">{[enMesa].map(dibujar)}</div>
              <p className="mt-2 font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-widest text-tinta/55">
                tiró
              </p>
            </div>
          )}

          {mano && (
            <div className="text-center">
              <div className="flex gap-1.5">{mano.map(dibujar)}</div>
              <p className="mt-2 font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-widest text-tinta/55">
                vos tenés
              </p>
            </div>
          )}
        </div>
      )}

      {/* Las opciones */}
      <div className="mt-4 grid gap-2">
        {opciones.map((opcion, i) => {
          const esLaElegida = elegida === i;
          const mostrarComoCorrecta = respondido && opcion.correcta;
          const mostrarComoError = esLaElegida && !opcion.correcta;

          return (
            <button
              key={opcion.texto}
              onClick={() => !respondido && setElegida(i)}
              disabled={respondido}
              className={`rounded border-2 px-4 py-3 text-left text-[15px] transition-colors ${
                mostrarComoCorrecta
                  ? "border-quiero bg-quiero/15 text-tinta"
                  : mostrarComoError
                    ? "border-no-quiero bg-no-quiero/10 text-tinta"
                    : respondido
                      ? "border-tinta/15 text-tinta/45"
                      : "border-tinta/25 text-tinta hover:border-bordo hover:bg-bordo/5"
              }`}
            >
              <span className="font-[family-name:var(--font-ui)]">
                {mostrarComoCorrecta && "✓ "}
                {mostrarComoError && "✗ "}
                {opcion.texto}
              </span>
            </button>
          );
        })}
      </div>

      {/* La explicación: lo importante del ejercicio */}
      {respondido && (
        <div className="anim-pop mt-4 border-l-4 border-bordo pl-4">
          <p className="font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-bordo">
            {acerto ? "Bien ahí" : "No era esa"}
          </p>

          {/* Si erró, primero por qué su elección estaba mal */}
          {!acerto && (
            <p className="mt-1.5 text-[15px] leading-relaxed text-tinta/85">
              {opciones[elegida].porque}
            </p>
          )}

          {/* Y siempre, por qué la correcta es la correcta */}
          <p className="mt-1.5 text-[15px] leading-relaxed text-tinta">
            {!acerto && <strong>La buena era “{opciones.find((o) => o.correcta)!.texto}”: </strong>}
            {opciones.find((o) => o.correcta)!.porque}
          </p>

          <button
            onClick={() => setElegida(null)}
            className="mt-3 font-[family-name:var(--font-ui)] text-xs uppercase tracking-wide text-tinta/50 underline underline-offset-2 hover:text-tinta"
          >
            Probar de nuevo
          </button>
        </div>
      )}
    </section>
  );
}
