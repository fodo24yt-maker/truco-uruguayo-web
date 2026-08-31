/**
 * El mazo, con la muestra metida abajo.
 *
 * En la mesa de verdad son UNA sola cosa: se reparte, se da vuelta la carta de
 * arriba y se la deja abajo del mazo, atravesada y saliendo lo justo para que
 * todos le vean el número y el palo sin tener que agacharse.
 *
 * DE QUÉ LADO VA
 * Del lado del que reparte. En mano a mano reparte el pie, así que si SOS MANO
 * el mazo te queda a la izquierda, y si sos pie te queda a la derecha. Que
 * cambie de lugar no es adorno: es la única señal en la mesa que te dice de
 * quién es el reparto sin leer un cartel.
 *
 * LA MUESTRA NO VA A 90 GRADOS
 * Va a 78, y sale corrida hacia el centro de la mesa. Una carta puesta exacta a
 * escuadra se ve armada; torcida se ve apoyada por una mano. Esa imperfección
 * es a propósito, y es fija —no al azar— para que no baile en cada dibujado.
 *
 * ── Por qué todo está en `em` ─────────────────────────────────────────────
 *
 * Porque el mazo tiene que achicarse cuando la ventana es baja, y la forma
 * obvia —`transform: scale(clamp(0.72, 0.132vh, 1.22))`— es CSS INVÁLIDO:
 * `scale()` quiere un número y `clamp()` con un `vh` adentro devuelve un largo.
 * El navegador tira la regla entera sin avisar, y el mazo se quedaba siempre del
 * mismo tamaño. (Estuvo así y no se veía.)
 *
 * Con `em` no hay truco: el `ancho` que entra por arriba se pone como
 * `font-size` del contenedor, y todas las medidas de adentro son fracciones de
 * eso. Un `clamp()` con `vh` es perfectamente válido en `font-size`.
 */

import { Carta } from "@/components/Carta";
import type { Carta as CartaType } from "@/lib/motor/baraja";

/** Todas las medidas son fracciones del ancho que entra: 1em = ese ancho. */
const CARTA = 0.4375; // el ancho de una carta del mazo
const ASOMA = 0.3125; // cuánto sale la muestra hacia el centro de la mesa
const INCLINACION = 78; // grados: perpendicular, pero no de escuadra

export function Mazo({
  muestra,
  lado,
  revelada,
  ancho,
}: {
  muestra: CartaType;
  /** De qué lado de la mesa está apoyado el mazo. */
  lado: "izquierda" | "derecha";
  /** Mientras se reparte, la muestra todavía está boca abajo. */
  revelada: boolean;
  /** Largo CSS: puede ser un `clamp(…vh…)`, que es de lo que se trata. */
  ancho: string;
}) {
  // Hacia dónde asoma la muestra: siempre hacia adentro de la mesa, o se saldría
  // del borde. Con el mazo a la izquierda asoma a la derecha, y al revés.
  const haciaLaMesa = lado === "izquierda" ? 1 : -1;
  // El mazo no va centrado en la caja: se corre hacia su borde para dejarle
  // lugar a la muestra del lado que asoma.
  const centroMazo = lado === "izquierda" ? 0.271 : 0.729;

  return (
    <div className="text-center" style={{ fontSize: ancho }}>
      <div className="relative" style={{ width: "1em", height: "0.875em" }} aria-hidden="true">
        {/* La muestra, abajo de todo. Se dibuja primero para que el mazo la tape. */}
        <div
          className="perspectiva-carta absolute top-1/2"
          style={{
            left: `${centroMazo + ASOMA * haciaLaMesa}em`,
            transform: `translate(-50%, -50%) rotate(${INCLINACION * haciaLaMesa}deg)`,
          }}
        >
          <Carta
            carta={revelada ? muestra : undefined}
            oculta={!revelada}
            style={{ width: `${CARTA}em` }}
            className={revelada ? "halo-pieza anim-voltea" : ""}
          />
        </div>

        {/* El mazo: tres cartas apenas corridas, cada una con su sombra. */}
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: `${centroMazo - CARTA / 2}em`, width: `${CARTA}em` }}
        >
          <div
            className="absolute rounded-full bg-black/75"
            style={{ inset: "auto -0.02em -0.05em", height: "0.12em", filter: "blur(0.05em)" }}
          />
          <Carta oculta style={{ width: `${CARTA}em` }} className="absolute left-[0.03em] top-[0.03em] opacity-70" />
          <Carta oculta style={{ width: `${CARTA}em` }} className="absolute left-[0.015em] top-[0.015em] opacity-85" />
          <Carta oculta style={{ width: `${CARTA}em` }} className="absolute inset-0" />
        </div>
      </div>

      {/* El cartelito. La carta ya dice el número y el palo, pero escrito se lee
          de un vistazo y sobre todo lo puede leer un lector de pantalla, que de
          una carta torcida en SVG no saca nada. */}
      {/* El margen va en el envoltorio y no en el <p>: `em` se mide contra el
          font-size del PROPIO elemento, y el del cartelito es 0.1em, así que un
          "0.6em" ahí adentro es diez veces más chico de lo que parece. */}
      <div style={{ paddingTop: "0.09em" }}>
        <p
          className="font-[family-name:var(--font-ui)] uppercase leading-tight tracking-[0.1em] text-dorado drop-shadow-[0_1px_3px_rgba(0,0,0,1)]"
          style={{ fontSize: "0.1em" }}
        >
          muestra
          <br />
          <span className="text-crema/85">
          {revelada ? `${muestra.numero} de ${muestra.palo}` : "—"}
        </span>
        </p>
      </div>
    </div>
  );
}
