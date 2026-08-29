/**
 * El mazo, con la muestra metida abajo.
 *
 * Antes eran dos objetos separados: la muestra parada a un costado de la mesa y
 * el mazo del otro. En la mesa de verdad son UNA sola cosa: se reparte, se da
 * vuelta la carta de arriba y se la deja abajo del mazo, atravesada y saliendo
 * lo justo para que todos le vean el número y el palo sin tener que agacharse.
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
 */

import { Carta } from "@/components/Carta";
import type { Carta as CartaType } from "@/lib/motor/baraja";

/** Ancho de una carta del mazo. Todo lo demás se calcula desde acá. */
const ANCHO = 42;
const ALTO = Math.round((ANCHO * 150) / 100);

/** Cuánto sale la muestra de abajo del mazo, hacia el centro de la mesa. */
const ASOMA = 30;
const INCLINACION = 78; // grados: perpendicular, pero no de escuadra

export function Mazo({
  muestra,
  lado,
  revelada,
}: {
  muestra: CartaType;
  /** De qué lado de la mesa está apoyado el mazo. */
  lado: "izquierda" | "derecha";
  /** Mientras se reparte, la muestra todavía está boca abajo. */
  revelada: boolean;
}) {
  // Hacia dónde asoma la muestra: siempre hacia adentro de la mesa, o se saldría
  // del borde. Con el mazo a la izquierda asoma a la derecha, y al revés.
  const haciaLaMesa = lado === "izquierda" ? 1 : -1;

  // El mazo no va centrado en la caja: se corre hacia su borde para dejarle
  // lugar a la muestra del lado que asoma.
  const centroMazo = lado === "izquierda" ? 26 : 70;

  return (
    <div className="text-center">
      <div className="relative h-[84px] w-[96px]" aria-hidden="true">
        {/* La muestra, abajo de todo. Se dibuja primero para que el mazo la tape. */}
        <div
          className="absolute top-1/2 perspectiva-carta"
          style={{
            left: centroMazo + ASOMA * haciaLaMesa,
            transform: `translate(-50%, -50%) rotate(${INCLINACION * haciaLaMesa}deg)`,
          }}
        >
          <Carta
            carta={revelada ? muestra : undefined}
            oculta={!revelada}
            ancho={ANCHO}
            className={revelada ? "halo-pieza anim-voltea" : ""}
          />
        </div>

        {/* El mazo: tres cartas apenas corridas y la sombra que lo despega de la mesa. */}
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: centroMazo - ANCHO / 2, width: ANCHO, height: ALTO }}
        >
          <div className="absolute inset-x-[-2px] bottom-[-5px] h-3 rounded-full bg-black/75 blur-[5px]" />
          <Carta oculta ancho={ANCHO} className="absolute left-[3px] top-[3px] opacity-70" />
          <Carta oculta ancho={ANCHO} className="absolute left-[1.5px] top-[1.5px] opacity-85" />
          <Carta oculta ancho={ANCHO} className="absolute inset-0" />
        </div>
      </div>

      {/* El cartelito. La carta ya dice el número y el palo, pero escrito se lee
          de un vistazo y sobre todo lo puede leer un lector de pantalla, que de
          una carta torcida en SVG no saca nada. */}
      <p className="mt-1 font-[family-name:var(--font-ui)] text-[9px] uppercase leading-tight tracking-[0.1em] text-dorado drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
        muestra
        <br />
        <span className="text-crema/85">
          {revelada ? `${muestra.numero} de ${muestra.palo}` : "—"}
        </span>
        <br />
        <span className="text-crema/50">{revelada ? `manda ${muestra.palo}` : ""}</span>
      </p>
    </div>
  );
}
