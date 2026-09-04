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
 *
 * ── ACÁ HABÍA DOS `filter: blur()`, Y SE FUERON EL 4/9/2026 ───────────────
 *
 * Es el mismo bug del 1/9, una zona más afuera. Allá una `opacity` sobre la
 * mano obligaba al navegador a componer todo ese subárbol en una superficie
 * aparte, y un filtro adentro era una segunda superficie anidada: las GPU de
 * teléfono devolvían basura. Se arregló la mano y se dejó un guard que vigila
 * LA MANO. En el resto de la escena quedaron nueve filtros, y estos dos eran
 * los que rodeaban al mate, al vaso y a cada objeto del departamento —que es
 * justo donde Santiago fotografió los píxeles blancos—.
 *
 * Cada objeto apoyado tenía DOS elementos con filtro; ahora tiene UNO sin
 * ninguno. Un `radial-gradient` lo pinta el mismo paso que el resto del
 * elemento; un `blur()` es una pasada aparte sobre un buffer intermedio que se
 * rehace cada vez que algo de arriba cambia.
 *
 * ── Cómo se reemplaza un desenfoque por un degradé, sin que se note ───────
 *
 * Una elipse rellena y desenfocada ES un degradé radial: lo único que hay que
 * hacer es escribirlo en vez de calcularlo en cada cuadro. Dos cuentas:
 *
 *   · CUÁNTO SE AGRANDA. Una gaussiana de radio σ se apaga a los 2,5σ, así que
 *     la mancha mide lo que medía la elipse MÁS 2,5σ por cada lado. Sin eso el
 *     objeto queda con una sombra más chica y se despega de la madera.
 *   · CUÁNTO SE ACLARA. Desenfocar reparte la tinta, así que el centro pierde
 *     opacidad: queda en `erf(b / (σ·√2))` de la que tenía, donde `b` es el
 *     semieje corto. Sin esto la sombra sale demasiado oscura y se lee como
 *     una mancha de pintura.
 *
 * Los dos números salieron de la fórmula y se ajustaron MIRANDO el recorte del
 * mate y del vaso al lado del de antes, no de la cuenta sola.
 */

/** El perfil de una elipse desenfocada. Un degradé de dos paradas se lee duro
 *  en el borde; con estas cuatro la caída se parece a la de la gaussiana.
 *
 *  Se exporta —igual que `erf` y `ALCANCE`— porque `Escenario.tsx` hace lo
 *  mismo con la sombra del rival, y dos copias de una cuenta como ésta se
 *  desincronizan a la primera. Acá van como fracción de la opacidad del
 *  centro; quien las use decide si las escribe en CSS o en SVG. */
export const PARADAS_CAIDA = [
  [0, 1],
  [0.44, 0.82],
  [0.74, 0.34],
  [1, 0],
] as const;

const CAIDA = (alfa: number) =>
  PARADAS_CAIDA.map(([donde, cuanto]) => `rgba(0,0,0,${(alfa * cuanto).toFixed(3)}) ${donde * 100}%`).join(", ");

/* Lo que eran los dos `blur()`. Se guardan con nombre porque de ellos salen las
   dos correcciones de arriba, y si un día se cambia el tamaño de una sombra hay
   que volver a pasar por acá. */
const SIGMA_PROYECTADA = 9;
const SIGMA_CONTACTO = 2.5;
/** Hasta dónde llega una gaussiana antes de apagarse del todo. */
export const ALCANCE = 2.5;
/** Cuánta opacidad conserva el centro al desenfocarse: erf(b / (σ·√2)). */
export const erf = (x: number) => {
  // Abramowitz–Stegun 7.1.26. Alcanza y sobra: esto decide una opacidad.
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return y;
};

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
  /* LA PROYECTADA. Medía `ancho·168%` × `18·peso` px al 0,34·peso, con 9px de
     desenfoque. El semieje corto era 9·peso. */
  const bProyectada = 9 * peso;
  const crecePro = ALCANCE * SIGMA_PROYECTADA;
  const altoPro = 2 * (bProyectada + crecePro);
  const alfaPro = 0.34 * peso * erf(bProyectada / (SIGMA_PROYECTADA * Math.SQRT2));
  /* El centro de la mancha caía 1,44·peso px POR ENCIMA del borde de abajo del
     objeto (era `bottom-0` con `translateY(42%)` de un alto de 18·peso). Se
     conserva tal cual: es lo que apoya el objeto en la madera. */
  const centroPro = -1.44 * peso;

  /* LA DE CONTACTO. Medía `ancho·88%` × `7·peso` px al 0,66·peso, con 2,5px. */
  const bContacto = 3.5 * peso;
  const creceCon = ALCANCE * SIGMA_CONTACTO;
  const altoCon = 2 * (bContacto + creceCon);
  const alfaCon = 0.66 * peso * erf(bContacto / (SIGMA_CONTACTO * Math.SQRT2));
  const centroCon = -1.12 * peso;

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 block">
      {/* la proyectada */}
      <span
        className="absolute left-1/2 block"
        style={{
          width: `calc(${(ancho * 168).toFixed(1)}% + ${(2 * crecePro).toFixed(1)}px)`,
          height: `${altoPro.toFixed(1)}px`,
          bottom: `${(centroPro - altoPro / 2).toFixed(1)}px`,
          /* El desvío era `46%` del ancho de ESTA mancha, y esa mancha creció:
             se guarda el corrimiento en la medida vieja para que la sombra siga
             cayendo donde caía. */
          transform: `translateX(calc(-50% + ${(desvio * 46 * ancho * 1.68).toFixed(2)}%))`,
          background: `radial-gradient(closest-side, ${CAIDA(alfaPro)})`,
        }}
      />
      {/* la de contacto */}
      <span
        className="absolute left-1/2 block -translate-x-1/2"
        style={{
          width: `calc(${(ancho * 88).toFixed(1)}% + ${(2 * creceCon).toFixed(1)}px)`,
          height: `${altoCon.toFixed(1)}px`,
          bottom: `${(centroCon - altoCon / 2).toFixed(1)}px`,
          background: `radial-gradient(closest-side, ${CAIDA(alfaCon)})`,
        }}
      />
    </span>
  );
}
