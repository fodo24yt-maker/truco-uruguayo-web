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
 *
 * ── TRES FORMAS Y UN SOLO HUECO ───────────────────────────────────────────
 *
 * La franja sabe mostrar tres cosas: el globo del verso, el registro de lo que
 * pasó, y —al cerrarse la mano— los tantos que se cantaron.
 *
 * Las tres van en el MISMO hueco, y eso no es ahorro de código: es lo que
 * impide que se solapen. La columna del medallón es `absolute` y crece hacia
 * abajo, y justo abajo está la libreta, que en la compu cae de este mismo lado
 * cuando el mazo está a la izquierda. Un cuarto elemento colgado abajo la
 * empujaría contra el papel. Turnándose en el hueco que ya tiene el alto
 * reservado, la mesa no se mueve ni un píxel.
 */

import type { Evento } from "@/lib/motor/partida";
import type { TantoMostrado } from "@/lib/tantos-al-cierre";

export function Dialogo({
  lineas,
  canto,
  eventos,
  tantos,
  onCerrarVerso,
}: {
  /** Los renglones de la copla, si el rival está verseando. */
  lineas?: readonly string[];
  /** El canto en limpio, abajo de la copla: es lo que hay que contestar. */
  canto?: string;
  /** Lo último que pasó en la mesa, del más viejo al más nuevo. */
  eventos: readonly Evento[];
  /**
   * Lo que se enseña al cerrarse la mano, si quedó algo sin ver.
   *
   * Viene vacío casi siempre: sólo trae algo cuando la mano se cortó antes de
   * jugarse las seis cartas Y hubo un tanto cantado. Lo decide
   * `lib/tantos-al-cierre.ts`, que es donde vive la regla.
   */
  tantos?: readonly TantoMostrado[];
  onCerrarVerso: () => void;
}) {
  const versea = lineas !== undefined && lineas.length > 0;
  /* GANA A LAS OTRAS DOS. Cuando la mano se cerró, el registro ya no importa
     —sus últimas líneas son las mismas que este cartel dice mejor— y un globo
     de verso colgado de un canto anterior quedaría hablando de una mano que ya
     terminó. */
  const enseña = tantos !== undefined && tantos.length > 0;
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
        {enseña ? (
          <TantosEnseñados tantos={tantos} />
        ) : versea ? (
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

/**
 * "Acá está mi envido": lo que se enseña cuando la mano se cortó antes.
 *
 * ── Por qué es un papel y no una línea más del registro ───────────────────
 *
 * Porque es un gesto de la mesa, no una anotación. El que ganó el envido da
 * vuelta las cartas y las apoya, y el otro mira. El mismo `papel` del globo del
 * verso —que es el otro momento en que alguien ENSEÑA algo— con la puntita
 * apuntando al medallón.
 *
 * ── Los números van en la manuscrita, y el nombre no ──────────────────────
 *
 * Es la misma división que hace la libreta: lo escrito a mano es el número, y
 * la etiqueta va en la de siempre. Un tanto es algo que alguien anotó.
 *
 * ── El ancho ──────────────────────────────────────────────────────────────
 *
 * El peor caso son los dos tantos del envido con la franja a su mínimo: 78% de
 * 320px, o sea ~250px. Por eso las dos columnas van en un `grid` de fracciones
 * iguales y no en un `flex` con `justify-between`: con `flex`, "Vos 31" y
 * "Él 27" se separan hasta los bordes y la fila se lee como dos cosas sueltas.
 */
function TantosEnseñados({ tantos }: { tantos: readonly TantoMostrado[] }) {
  /* Nunca aparecen las dos clases juntas —la flor anula el envido— pero la
     lista puede traer las dos flores si los dos la cantaron. Se agrupa por
     clase para que el título se escriba una sola vez. */
  const clase = tantos[0].clase;
  const titulo = clase === "flor" ? "Acá está mi flor" : "Acá está mi envido";

  return (
    <div
      /* El agarre con el que `mirar-web.mjs` mide el rectángulo REAL del cartel
         en el navegador y verifica que no se le monte a la libreta ni se salga
         de la escena. Mismo papel que cumplen los `data-mesa`. */
      data-tantos={clase}
      className="papel anim-pop relative w-full rounded-sm px-3 py-2 shadow-2xl shadow-black/80"
    >
      {/* la puntita, apuntando al medallón que está justo arriba */}
      <span
        className="absolute right-6 top-[-5px] h-[11px] w-[11px] rotate-45"
        style={{ background: "var(--color-papel)" }}
      />
      <p className="text-center font-[family-name:var(--font-ui)] text-[10px] uppercase tracking-[0.14em] text-tinta/60">
        {titulo}
      </p>
      <div
        className="mt-0.5 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${tantos.length}, minmax(0, 1fr))` }}
      >
        {tantos.map((t) => (
          <p key={`${t.clase}-${t.quien}`} className="flex items-baseline justify-center gap-1.5">
            <span
              className={`font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wide ${
                t.gano ? "text-tinta/70" : "text-tinta/40"
              }`}
            >
              {t.quien === "vos" ? "Yo" : "Él"}
            </span>
            <span
              className={`font-[family-name:var(--font-mano)] leading-none ${
                t.gano ? "text-[26px] text-bordo" : "text-[22px] text-tinta/45"
              }`}
            >
              {t.valor}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
