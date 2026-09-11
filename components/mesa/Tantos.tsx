/**
 * Lo que se dice al cerrarse la mano: el cartel y los dos tantos.
 *
 * Las CARTAS no se dibujan acá: las apoya la mesa con la misma
 * `<CartaApoyada>` con la que dibuja una carta jugada, y qué carta va en qué
 * lugar lo decide `lib/cartas-en-mesa.ts`. Acá viven las dos cosas escritas que
 * las acompañan.
 *
 * ── QUÉ HABÍA ACÁ ANTES, Y POR QUÉ SE FUE ─────────────────────────────────
 *
 * El 10/9/2026 esto fueron dos recuadros —uno arriba a la izquierda con los dos
 * lados adentro, y otro que colgaba de cada jugador— que dibujaban las cartas
 * del envido y de la flor dentro de un papel. Santiago los descartó los dos:
 * llenaban la pantalla y repetían, en un cartel, algo que la mesa podía mostrar
 * sola. Lo que quedó es más chico y más parecido a la mesa de verdad.
 *
 * ── LAS TRES COSAS QUE NO SE PUEDEN HACER ACÁ ─────────────────────────────
 *
 * Están medidas en `globals.css` y en `app/jugar/mesa/page.tsx`:
 *
 *   1. **Ni un `filter`.** Ni `drop-shadow`, ni `blur`, ni `backdrop-filter`:
 *      `mirar-mesa.mjs` falla si aparece uno adentro de la escena. Las sombras
 *      del texto van con `text-shadow`, que además es lo que evita la basura
 *      con forma de letras del 4/9/2026.
 *   2. **Alto reservado en la línea de tantos.** Cuelga del medallón, arriba
 *      del globo del diálogo: si creciera y se achicara, empujaría el globo y
 *      la mesa saltaría. Es la misma razón por la que `Dialogo.tsx` reserva el
 *      suyo.
 *   3. **Ningún reloj propio.** Esto aparece y desaparece con el estado que ya
 *      maneja el cierre de mano. Un `setTimeout` acá sería un segundo reloj
 *      compitiendo con ése.
 */

import type { TantoMostrado } from "@/lib/tantos-al-cierre";

/**
 * "ENVIDO EN MESA": lo que se está enseñando, mientras las cartas caen.
 *
 * Va sobre la madera y sin papel detrás, a propósito: es la mesa narrando, no
 * alguien hablando. Lo que habla lleva papel o chapa; esto es un rótulo.
 */
export function CartelEnMesa({
  clase,
  posicion,
}: {
  clase: "envido" | "flor";
  /**
   * Dónde apoyarlo sobre la madera, calculado con `estiloEnMesa`.
   *
   * ── POR QUÉ SE LE ANULA LA ESCALA, Y NO ES UN DESCUIDO ──────────────────
   *
   * `estiloEnMesa` devuelve un `scale()` con la perspectiva: lo que está lejos
   * sale más chico. Para un objeto apoyado eso es exactamente lo que se quiere,
   * pero para TEXTO no: escalar letras chicas por un factor fraccionario deja
   * basura con forma de letras. Está medido y escrito dos veces en este
   * proyecto —en `Mazo.tsx` y en la marca "tuya/suya" de las bazas—.
   *
   * Así que de `estiloEnMesa` se usa DÓNDE (el `left`/`top`) y se le pisa el
   * `transform` con un `translate` pelado.
   */
  posicion: React.CSSProperties;
}) {
  return (
    <p
      /* El agarre con el que las herramientas comprueban que aparece cuando
         tiene que aparecer, y sólo entonces. */
      data-mesa="cartel-tantos"
      style={{ ...posicion, transform: "translate(-50%, -100%)" }}
      className="anim-pop pointer-events-none z-10 whitespace-nowrap font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-[0.22em] text-dorado [text-shadow:0_1px_4px_rgba(0,0,0,1),0_0_10px_rgba(0,0,0,0.9)] sm:text-[13px]"
    >
      {clase === "flor" ? "Flor en mesa" : "Envido en mesa"}
    </p>
  );
}

/**
 * Los dos tantos en número, colgando del medallón.
 *
 * ── POR QUÉ EXISTE ────────────────────────────────────────────────────────
 *
 * Porque las cartas se apoyan y se levantan en dos segundos, y contar un envido
 * en dos segundos es justo lo que el que está aprendiendo todavía no sabe
 * hacer. El número es la respuesta; las cartas son el porqué.
 *
 * ── LO QUE NO SE PUEDE ESCRIBIR ACÁ ───────────────────────────────────────
 *
 * El tanto del que dijo "son buenas". Llega con `revelado: false` y `valor` en
 * `null` desde `lib/tantos-al-cierre.ts`, o sea que ni siquiera hay número para
 * poner: en su lugar dice "son buenas", que es exactamente lo que dijo él.
 */
export function TantosBajoMedallon({
  tantos,
}: {
  tantos: readonly TantoMostrado[];
}) {
  return (
    <div
      data-tantos={tantos.length > 0 ? tantos[0].clase : "nada"}
      /* Alto reservado SIEMPRE, aunque no haya nada que decir. Es lo que
         impide que el globo de abajo salte cuando esto aparece. */
      className="flex h-[18px] shrink-0 items-center justify-end gap-2 sm:h-[20px]"
      role="status"
      aria-live="polite"
    >
      {tantos.length > 0 && (
        <>
          <span className="font-[family-name:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-crema/45 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
            {tantos[0].clase}
          </span>
          {/* El rival primero, como está sentada la mesa. */}
          {[...tantos]
            .sort((a, b) =>
              a.quien === "rival" ? -1 : b.quien === "rival" ? 1 : 0,
            )
            .map((t) => (
              <span
                key={`${t.clase}-${t.quien}`}
                className="flex items-baseline gap-1"
              >
                <span className="font-[family-name:var(--font-ui)] text-[9px] uppercase tracking-wide text-crema/45 [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]">
                  {t.quien === "vos" ? "Vos" : "Él"}
                </span>
                <span
                  className={`font-[family-name:var(--font-mano)] leading-none [text-shadow:0_1px_3px_rgba(0,0,0,0.95)] ${
                    t.gano
                      ? "text-[17px] text-dorado sm:text-[19px]"
                      : "text-[15px] text-crema/55"
                  }`}
                >
                  {t.revelado ? t.valor : "son buenas"}
                </span>
              </span>
            ))}
        </>
      )}
    </div>
  );
}
