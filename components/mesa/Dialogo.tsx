/**
 * La zona de diálogo: todo lo que se dice en la mesa, en un solo lugar.
 *
 * POR QUÉ EXISTE. Antes el globo del verso flotaba sobre la mesa y le tapaba la
 * cara al rival, y la chapa del canto mostraba UN SOLO evento: el último. Con el
 * globo en pantalla la chapa ni se dibujaba. El resultado era que se perdían
 * cosas importantes sin que nadie se enterara —el caso feo era "El rival cobra
 * la flor: +3", que aparecía y lo pisaba el canto siguiente, y desde tu silla
 * parecía que el juego te había sacado el botón de envido de la nada—.
 *
 * Ahora es una franja PROPIA, con alto reservado fijo, que cuelga del medallón.
 * No se superpone con nada porque no flota: ocupa su lugar en la columna. Y
 * cuando no hay verso muestra las últimas líneas, no solo la última.
 */

import type { Evento } from "@/lib/motor/partida";

export function Dialogo({
  lineas,
  canto,
  eventos,
  onCerrarVerso,
}: {
  /** Los renglones de la copla, si el rival está verseando. */
  lineas?: readonly string[];
  /** El canto en limpio, abajo de la copla: es lo que hay que contestar. */
  canto?: string;
  /** Lo último que pasó en la mesa, del más viejo al más nuevo. */
  eventos: readonly Evento[];
  onCerrarVerso: () => void;
}) {
  const versea = lineas !== undefined && lineas.length > 0;
  const ultimos = eventos.slice(-3);
  const ultimo = ultimos[ultimos.length - 1];
  const previos = ultimos.slice(0, -1);

  return (
    // El alto reservado es lo que impide que la mesa salte cada vez que alguien
    // abre la boca. Está en la franja, no en el globo, a propósito.
    <div
      className="flex min-h-[68px] shrink-0 items-start justify-end sm:min-h-[84px]"
      role="status"
      aria-live="polite"
    >
      {/* Ancho completo: el contenedor de afuera YA lo limita. Cuando acá había
          otro `80%` los dos se multiplicaban y el globo quedaba tan angosto que
          "Ganás la baza" salía cortado en "Ganás la…". */}
      <div className="w-full">
        {versea ? (
          <button
            onClick={onCerrarVerso}
            className="papel anim-pop relative w-full rounded-sm px-3 py-2 text-center shadow-2xl shadow-black/80"
          >
            {/* la puntita, apuntando al medallón que está justo arriba */}
            <span
              className="absolute right-6 top-[-5px] h-[11px] w-[11px] rotate-45"
              style={{ background: "var(--color-papel)" }}
            />
            {lineas.map((linea, i) => (
              <span
                key={i}
                className="block font-[family-name:var(--font-mano)] text-[14px] leading-[1.35] text-tinta sm:text-[16px]"
              >
                {linea}
              </span>
            ))}
            {canto && (
              <span className="mt-1.5 block border-t border-tinta/15 pt-1 font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wide text-bordo">
                {canto}
              </span>
            )}
          </button>
        ) : (
          <div className="text-right">
            {/* lo de antes, apagado: queda como registro sin robar atención */}
            {previos.map((e, i) => (
              <p
                key={`${eventos.length}-${i}`}
                className="truncate font-[family-name:var(--font-ui)] text-[10px] uppercase leading-snug tracking-wide text-crema/40 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
              >
                {e.quien === "sistema" ? "" : e.quien === "vos" ? "Vos: " : "Él: "}
                {e.texto}
              </p>
            ))}
            {ultimo && (
              <p
                key={eventos.length}
                className={`anim-pop mt-0.5 inline-block max-w-full truncate rounded-full px-3 py-1 font-[family-name:var(--font-ui)] text-[13px] uppercase tracking-wide sm:text-sm ${
                  ultimo.quien === "sistema"
                    ? "text-crema/80 drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]"
                    : "bg-crema text-tinta shadow-lg shadow-black/60"
                }`}
              >
                {ultimo.texto}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
