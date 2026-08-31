/**
 * La sombra de algo apoyado en la mesa.
 *
 * ── Por qué no alcanza con un `drop-shadow` ───────────────────────────────
 *
 * Un `drop-shadow` dibuja UNA sombra difusa y pareja, y eso es exactamente lo
 * que hace que los objetos del croquis se vieran FLOTANDO. En la realidad hay
 * dos, y hacen dos trabajos distintos:
 *
 *   · la de CONTACTO: chiquita, muy oscura y casi sin desenfoque, pegada
 *     justo donde el objeto toca la madera. Es la que dice "esto está apoyado".
 *     Sin ella, el objeto levita por más sombra grande que le pongas.
 *
 *   · la PROYECTADA: grande, difusa y corrida hacia el lado contrario de la
 *     luz. Es la que dice de dónde viene la lámpara.
 *
 * Van las dos o no va ninguna: con la difusa sola el objeto flota, y con la de
 * contacto sola parece recortado con tijera.
 *
 * Se dibuja DEBAJO del objeto, así que el padre tiene que ser `relative` y el
 * objeto tiene que venir después en el marcado.
 */
export function SombraApoyada({
  /** Cuánto más ancha que el objeto es la mancha. 1 = igual de ancha. */
  ancho = 0.92,
  /** Hacia dónde se estira, en fracción del ancho. La luz está arriba y al
   *  centro, así que un objeto a la izquierda tira sombra a la izquierda. */
  desvio = 0,
  /** Cuánto pesa. Un mate macizo tapa más luz que una carta. */
  peso = 1,
}: {
  ancho?: number;
  desvio?: number;
  peso?: number;
}) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 block">
      {/* la proyectada */}
      <span
        className="absolute bottom-0 left-1/2 block rounded-[50%] bg-black"
        style={{
          width: `${ancho * 168}%`,
          height: `${18 * peso}px`,
          opacity: 0.34 * peso,
          filter: "blur(9px)",
          transform: `translate(calc(-50% + ${desvio * 46}%), 42%)`,
        }}
      />
      {/* la de contacto */}
      <span
        className="absolute bottom-0 left-1/2 block rounded-[50%] bg-black"
        style={{
          width: `${ancho * 88}%`,
          height: `${7 * peso}px`,
          opacity: 0.66 * peso,
          filter: "blur(2.5px)",
          transform: "translate(-50%, 34%)",
        }}
      />
    </span>
  );
}
