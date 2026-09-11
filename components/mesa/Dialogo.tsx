/**
 * La zona de diálogo: todo lo que se dice en la mesa.
 *
 * POR QUÉ EXISTE. Antes el globo del verso flotaba sobre la mesa y le tapaba la
 * cara al rival, y la chapa del canto mostraba UN SOLO evento: el último. Con el
 * globo en pantalla la chapa ni se dibujaba. El resultado era que se perdían
 * cosas importantes sin que nadie se enterara —el caso feo era "El rival cobra
 * la flor: +3", que aparecía y lo pisaba el canto siguiente, y desde tu silla
 * parecía que el juego te había sacado el botón de envido de la nada—.
 *
 * EL GLOBO DEL VERSO YA NO EXISTE, DESDE EL 10/9/2026. Los rivales cantaban con
 * coplas de payada de ★3 para arriba; se fueron todas, junto con `versos.ts`.
 * Ahora todos cantan pelado —"¡Truco!", "¡Envido!"— y eso sale por `eventos`
 * como cualquier otra cosa que pase en la mesa. El hueco de acá quedó igual: lo
 * que se sacó fue una de las formas que sabía tomar, no la franja.
 *
 * Ahora son franjas PROPIAS, con alto reservado fijo. No se superponen con nada
 * porque no flotan: ocupan su lugar en la columna.
 *
 * ── SON DOS ZONAS, Y ESO SE ARREGLÓ EL 2/9/2026 ───────────────────────────
 *
 * Había una sola, colgada del medallón del rival, y mostraba TODO: también lo
 * que decías vos. O sea que cantabas la flor, la ganabas, te tocaba cantar los
 * tantos… y el número salía de la boca del otro. Reportado jugando en el
 * celular, y con razón: en una mesa cada uno habla desde su silla.
 *
 *   `DialogoRival` → cuelga del medallón. Lo que dice él y lo que dice la mesa.
 *   `DialogoMio`   → arriba de tus cartas. Lo que decís vos.
 *
 * Lo del sistema —"gana el rival la baza"— va arriba y no abajo a propósito: no
 * lo dice nadie, es la mesa narrando, y arriba es donde está el hueco grande.
 *
 * ── Y LOS TANTOS TAMPOCO ESTÁN ACÁ, DESDE EL 10/9/2026 ────────────────────
 *
 * Hubo un tercer inquilino en este hueco: el papel de "acá está mi envido", que
 * se turnaba con el registro al cerrarse la mano. Se fue con el rediseño: ahora
 * las cartas se apoyan sobre la mesa (`lib/cartas-en-mesa.ts`) y los dos tantos
 * en número cuelgan del medallón, arriba de esta franja
 * (`components/mesa/Tantos.tsx`).
 *
 * Cada zona muestra UNA sola cosa: el registro de lo que pasó. El alto sigue
 * reservado igual, que es lo que impide que la mesa salte cuando alguien abre
 * la boca.
 */

import type { Evento } from "@/lib/motor/partida";

export function DialogoRival({
  eventos,
  compacto = false,
}: {
  /** Lo último que pasó en la mesa, del más viejo al más nuevo. */
  eventos: readonly Evento[];
  /**
   * Sólo la última línea, sin el registro apagado de atrás.
   *
   * Se prende cuando hay cartas enseñadas sobre la mesa. No es estética: en una
   * pantalla baja las tres líneas de esta franja bajan hasta la altura de las
   * bazas y se pisan con el rótulo "FLOR EN MESA". Se vio en la captura de
   * 320x568, no leyendo el código.
   *
   * Y no se pierde nada: cuando la mano se cerró, las líneas viejas ya las
   * leíste, y el cartel de fin de mano vuelve a decir el resultado dos segundos
   * después.
   */
  compacto?: boolean;
}) {
  /* Los tuyos no: ésos los muestra `DialogoMio`. Lo del sistema sí, que es la
     mesa narrando y no tiene silla. */
  const suyos = eventos.filter((e) => e.quien !== "vos");
  const ultimos = suyos.slice(compacto ? -1 : -3);
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
        <div className="text-right">
          {/* lo de antes, apagado: queda como registro sin robar atención */}
          {previos.map((e, i) => (
            <p
              key={`${suyos.length}-${i}`}
              className="truncate font-[family-name:var(--font-ui)] text-[10px] uppercase leading-snug tracking-wide text-crema/40 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]"
            >
              {e.quien === "sistema" ? "" : "Él: "}
              {e.texto}
            </p>
          ))}
          {ultimo && (
            <p
              key={suyos.length}
              className={`anim-pop mt-0.5 inline-block max-w-full truncate rounded-full px-3 py-1 font-[family-name:var(--font-ui)] text-[13px] uppercase tracking-wide sm:text-sm ${
                ultimo.quien === "sistema"
                  ? "text-crema/80 [text-shadow:0_2px_3px_rgba(0,0,0,0.95)]"
                  : "bg-crema text-tinta shadow-lg shadow-black/60"
              }`}
            >
              {ultimo.texto}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Lo que decís vos, de tu lado de la mesa.
 *
 * ── Por qué es más chica que la de él ─────────────────────────────────────
 *
 * Porque el hueco de arriba es aire —arriba del rival no hay nada que mirar— y
 * el de acá se lo saca a tus cartas. Así que reserva UN renglón, que es lo que
 * ocupa un canto ("¡Quiero!", "33", "Me voy al mazo"), y nada más.
 *
 * Y no lleva verso: el verso lo canta el rival, nunca vos. Si algún día versea
 * el jugador, va acá y este comentario se borra.
 */
export function DialogoMio({ eventos }: { eventos: readonly Evento[] }) {
  const mios = eventos.filter((e) => e.quien === "vos");
  const ultimo = mios[mios.length - 1];

  return (
    <div
      /* El agarre con el que las herramientas miden que esto no se le monte a
         tu mano ni se salga de la escena. Mismo papel que los `data-mesa`. */
      data-dialogo="mio"
      className="relative flex min-h-[26px] items-end justify-start px-1.5 sm:min-h-[30px]"
      role="status"
      aria-live="polite"
    >
      {ultimo && (
        <p
          key={mios.length}
          className="anim-pop inline-block max-w-full truncate rounded-full bg-crema px-3 py-1 font-[family-name:var(--font-ui)] text-[13px] uppercase tracking-wide text-tinta shadow-lg shadow-black/60 sm:text-sm"
        >
          {ultimo.texto}
        </p>
      )}
    </div>
  );
}
