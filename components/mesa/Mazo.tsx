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
 *
 * ── EL CARTELITO CAÍA ENCIMA DEL MAZO, Y SE ARREGLÓ EL 4/9/2026 ───────────
 *
 * Santiago lo fotografió tres veces: "MUESTRA / 10 DE ESPADA" pisado por el
 * dorso rojo y sin poder leerse, y encima en distinto lugar según la partida.
 * Eran dos errores encimados, los dos por medir a ojo:
 *
 *   1. LA CAJA TENÍA EL ALTO ESCRITO A MANO (`0.875em`) y adentro va una carta
 *      de `0.65625em` MÁS el escaloncito de la pila. No entraba, y como los
 *      hijos son `absolute` la caja no crece: el mazo colgaba por debajo, justo
 *      sobre el cartelito. Medido en el navegador antes de tocar nada, la pila
 *      se salía **21px en un celular de 390x844 y 35px en una compu de 1100**.
 *   2. LA PILA ERA UN `<div>` SIN `height` con todos los hijos `absolute`, o
 *      sea de alto CERO, así que su `-translate-y-1/2` no movía nada y arrancaba
 *      en el medio de la caja en vez de estar centrada en él.
 *
 * Ahora los dos altos SE DERIVAN de lo que hay adentro (ver `ALTO_*`), que es lo
 * único que hace que no puedan volver a quedar cortos: agregar una carta más a
 * la pila o cambiarle el giro a la muestra recalcula la caja sola.
 *
 * Y el cartelito se centra sobre EL CONJUNTO, no sobre la caja. Con el mazo a la
 * derecha el conjunto va de 0,050 a 0,978 —o sea que su centro está en 0,514 y
 * no en 0,5—, y ese 1,4% es parte de lo que se veía como "el texto se corre".
 */

import { Carta } from "@/components/Carta";
import type { Carta as CartaType } from "@/lib/motor/baraja";

/** Todas las medidas son fracciones del ancho que entra: 1em = ese ancho. */
const CARTA = 0.4375; // el ancho de una carta del mazo
const ASOMA = 0.3125; // cuánto sale la muestra hacia el centro de la mesa
const INCLINACION = 78; // grados: perpendicular, pero no de escuadra

/* ─── De acá salen los dos altos, y ninguno se escribe a mano ───────────────
   La carta guarda proporción 2:3 (`aspectRatio` en `Carta.tsx`), así que su
   alto es el ancho por 1,5. Todo lo demás son consecuencias de eso. */
const ALTO_CARTA = CARTA * 1.5;
/** Cuánto se corren entre sí las tres cartas de la pila. */
const ESCALON = 0.03;
/** Lo que ocupa la pila de tres: la carta más el escaloncito de la de atrás. */
const ALTO_PILA = ALTO_CARTA + ESCALON;
/** Y lo que ocupa la muestra, que está girada: `w·sen θ + h·cos θ`. */
const rad = (INCLINACION * Math.PI) / 180;
const ALTO_MUESTRA = CARTA * Math.sin(rad) + ALTO_CARTA * Math.cos(rad);
const ANCHO_MUESTRA = CARTA * Math.cos(rad) + ALTO_CARTA * Math.sin(rad);
/** Cuánto asoma la sombra por debajo de la pila. */
const MARGEN_SOMBRA = 0.05;
/** El alto de la caja: lo más alto que hay adentro, con lugar para su sombra. */
const ALTO_CAJA = Math.max(ALTO_PILA, ALTO_MUESTRA) + 2 * MARGEN_SOMBRA;

/* ─── La sombra de la pila, que antes era un `filter: blur(0.05em)` ─────────
   Un desenfoque adentro de la escena es lo que en las GPU de teléfono devuelve
   basura, y este quedaba justo debajo del mazo, que es uno de los tres lugares
   donde Santiago fotografió los píxeles blancos. Una elipse desenfocada ES un
   degradé radial: se agranda 2,5σ por lado y se aclara en `erf(b/(σ·√2))`, que
   es lo que el desenfoque le repartía. El detalle está en `Sombra.tsx`. */
const SIGMA = 0.05;
const SOMBRA_ALTO = 0.12 + 2 * 2.5 * SIGMA;
const SOMBRA_ALFA = 0.577; // 0,75 · erf(0,06 / (0,05·√2))

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
  const centroMuestra = centroMazo + ASOMA * haciaLaMesa;

  /* DÓNDE ESTÁ EL MEDIO DE VERDAD. La pila y la muestra no son simétricas entre
     sí, así que el conjunto no queda centrado en la caja: el cartelito puesto
     en el 50% se corre respecto de lo que describe. */
  const izquierda = Math.min(centroMazo - CARTA / 2, centroMuestra - ANCHO_MUESTRA / 2);
  const derecha = Math.max(centroMazo + CARTA / 2 + ESCALON, centroMuestra + ANCHO_MUESTRA / 2);
  const centroConjunto = (izquierda + derecha) / 2;

  return (
    <div style={{ fontSize: ancho }}>
      <div
        className="relative"
        style={{ width: "1em", height: `${ALTO_CAJA}em` }}
        aria-hidden="true"
      >
        {/* La muestra, abajo de todo. Se dibuja primero para que el mazo la tape. */}
        <div
          className="perspectiva-carta absolute top-1/2"
          style={{
            left: `${centroMuestra}em`,
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

        {/* El mazo: tres cartas apenas corridas, con su sombra.
            EL `height` NO ES DECORATIVO: sin él este div mide 0 de alto —todos
            sus hijos son `absolute`— y el `-translate-y-1/2` no mueve nada. */}
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            left: `${centroMazo - CARTA / 2}em`,
            width: `${CARTA}em`,
            height: `${ALTO_PILA}em`,
          }}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              width: `${CARTA + 2 * 2.5 * SIGMA}em`,
              height: `${SOMBRA_ALTO}em`,
              bottom: `${-MARGEN_SOMBRA - SOMBRA_ALTO / 2 + 0.06}em`,
              background:
                `radial-gradient(closest-side, rgba(0,0,0,${SOMBRA_ALFA}) 0%,` +
                ` rgba(0,0,0,${(SOMBRA_ALFA * 0.82).toFixed(3)}) 44%,` +
                ` rgba(0,0,0,${(SOMBRA_ALFA * 0.34).toFixed(3)}) 74%, rgba(0,0,0,0) 100%)`,
            }}
          />
          {/* El corrimiento va en `style` y NO en una clase: Tailwind lee las
              clases del archivo tal como están escritas, así que un
              `left-[${ESCALON}em]` interpolado no genera ninguna regla y la
              carta se quedaría sin correr. */}
          <Carta
            oculta
            style={{ width: `${CARTA}em`, left: `${ESCALON}em`, top: `${ESCALON}em` }}
            className="absolute opacity-70"
          />
          <Carta
            oculta
            style={{ width: `${CARTA}em`, left: `${ESCALON / 2}em`, top: `${ESCALON / 2}em` }}
            className="absolute opacity-85"
          />
          <Carta oculta style={{ width: `${CARTA}em`, left: 0, top: 0 }} className="absolute" />
        </div>
      </div>

      {/* El cartelito. La carta ya dice el número y el palo, pero escrito se lee
          de un vistazo y sobre todo lo puede leer un lector de pantalla, que de
          una carta torcida en SVG no saca nada.

          `text-shadow` y NO `drop-shadow`: el segundo es un `filter`, y sobre un
          texto de 0,1em adentro de un contenedor que la perspectiva escala por
          un factor con decimales es de donde salía la basura con forma de letras
          de la foto del 4/9. Hace lo mismo en pantalla y no crea superficie. */}
      {/* El margen va en el envoltorio y no en el <p>: `em` se mide contra el
          font-size del PROPIO elemento, y el del cartelito es 0.1em, así que un
          "0.6em" ahí adentro es diez veces más chico de lo que parece. */}
      <div style={{ paddingTop: "0.05em" }}>
        <p
          data-mesa="muestra-cartel"
          className="font-[family-name:var(--font-ui)] uppercase leading-tight tracking-[0.1em] text-dorado [text-shadow:0_1px_3px_rgba(0,0,0,1)]"
          style={{
            fontSize: "0.1em",
            /* Centrado sobre el CONJUNTO y no sobre la caja: ver el comentario
               de arriba. Va en `%` del ancho de la caja, que es 10em de este
               elemento porque su font-size es 0,1em. */
            width: "10em",
            textAlign: "center",
            marginLeft: `${(centroConjunto - 0.5) * 10}em`,
          }}
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
