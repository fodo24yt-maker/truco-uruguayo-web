/**
 * La marca: dos cartas y el halo dorado.
 *
 * ── POR QUÉ ES ÉSTE Y NO OTRO DIBUJO ──────────────────────────────────────
 *
 * Porque ya existe. `herramientas/generar-icono.mjs` hornea desde el 2/9/2026
 * el ícono de Android con este mismo motivo —una carta española con un oro,
 * inclinada, con el halo dorado— y su comentario lo dice así: *"es el mismo
 * motivo con el que arranca todo el sitio: el halo es el que marca la muestra
 * y las piezas, que es lo único que este juego tiene y los otros trucos no"*.
 *
 * Inventar un logo nuevo para la portada sería tener dos marcas: la del cajón
 * de aplicaciones del teléfono y la de adentro. Ésta es la misma, con el aire
 * que a 48 px no había: en el ícono es UNA carta porque a ese tamaño un abanico
 * es una mancha; acá entran dos y se lee el abanico.
 *
 * ── LO QUE NO SE PUEDE HACER ACÁ ──────────────────────────────────────────
 *
 * Ni un `filter`, ni un `feGaussianBlur`. El halo es un `radialGradient`, que
 * es la misma decisión que ya tomó el generador del ícono: un desenfoque lo
 * tiene que resolver el rasterizador, y esta pantalla es `.pantalla-fija`, o
 * sea una de las tres en las que este proyecto midió manchitas.
 */

/** Los colores salen de `globals.css`; acá se los nombra por su variable. */
const C = {
  papel: "var(--color-papel)",
  papelSombra: "var(--color-papel-sombra)",
  dorado: "var(--color-dorado)",
  doradoHondo: "#8a5f18",
  tinta: "var(--color-tinta)",
  noche: "var(--color-noche)",
  copa: "var(--color-copa)",
  copaHondo: "var(--color-copa-hondo)",
};

/** Una carta con su palo grande al medio, del tamaño y el giro que se le pida. */
function CartaDeMarca({
  x,
  giro,
  palo,
}: {
  x: number;
  giro: number;
  palo: "oro" | "copa";
}) {
  const w = 46;
  const h = 68;
  const cx = x;
  const cy = 54;
  const ix = cx - w / 2;
  const iy = cy - h / 2;
  const r = w * 0.3;

  return (
    <g transform={`rotate(${giro} ${cx} ${cy})`}>
      {/* la sombra de contacto: es lo que despega la carta de la madera */}
      <rect x={ix + 2.4} y={iy + 3} width={w} height={h} rx={w * 0.09} fill={C.noche} opacity="0.5" />
      <rect x={ix} y={iy} width={w} height={h} rx={w * 0.09} fill={C.papel} />
      {/* el marco con las dos muescas al filo: es LA PINTA, la que deja
          reconocer el palo asomando la carta sin abrir el abanico */}
      <rect
        x={ix + w * 0.09}
        y={iy + h * 0.06}
        width={w * 0.82}
        height={h * 0.88}
        rx={w * 0.05}
        fill="none"
        stroke={C.dorado}
        strokeWidth={w * 0.055}
      />
      <rect x={ix + w * 0.04} y={iy + h * 0.45} width={w * 0.16} height={h * 0.1} fill={C.papel} />
      <rect x={ix + w * 0.8} y={iy + h * 0.45} width={w * 0.16} height={h * 0.1} fill={C.papel} />

      {palo === "oro" ? (
        <>
          <circle cx={cx} cy={cy} r={r} fill={C.dorado} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.doradoHondo} strokeWidth={r * 0.16} />
          <circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke={C.doradoHondo} strokeWidth={r * 0.13} />
          <circle cx={cx} cy={cy} r={r * 0.26} fill={C.doradoHondo} />
        </>
      ) : (
        <>
          {/* LA COPA: cáliz, tallo y pie.
              El primer intento fue un semicírculo y a este tamaño se leía como
              un cono —o sea, un vaso de papel—. Lo que la hace copa es que la
              boca sea ANCHA y el fondo redondo, y que el pie se vea: sin pie,
              cualquier forma que se afina hacia abajo es un embudo.
              Va corrida hacia arriba porque el dibujo entero es más alto que
              ancho y su centro cae por debajo del centro de la carta. */}
          <g transform={`translate(0 ${-r * 0.26})`}>
            <path
              d={
                `M ${cx - r} ${cy - r * 0.85} L ${cx + r} ${cy - r * 0.85} ` +
                `C ${cx + r} ${cy + r * 0.3}, ${cx + r * 0.55} ${cy + r * 0.6}, ${cx} ${cy + r * 0.6} ` +
                `C ${cx - r * 0.55} ${cy + r * 0.6}, ${cx - r} ${cy + r * 0.3}, ${cx - r} ${cy - r * 0.85} Z`
              }
              fill={C.copa}
            />
            {/* el vino que queda en el fondo, que es lo que le da hondura */}
            <path
              d={
                `M ${cx - r * 0.72} ${cy - r * 0.1} ` +
                `C ${cx - r * 0.66} ${cy + r * 0.36}, ${cx - r * 0.4} ${cy + r * 0.5}, ${cx} ${cy + r * 0.5} ` +
                `C ${cx + r * 0.4} ${cy + r * 0.5}, ${cx + r * 0.66} ${cy + r * 0.36}, ${cx + r * 0.72} ${cy - r * 0.1} Z`
              }
              fill={C.copaHondo}
            />
            <rect x={cx - r * 0.13} y={cy + r * 0.55} width={r * 0.26} height={r * 0.62} fill={C.copa} />
            <ellipse cx={cx} cy={cy + r * 1.2} rx={r * 0.62} ry={r * 0.15} fill={C.copa} />
          </g>
        </>
      )}

      <text
        x={ix + w * 0.2}
        y={iy + h * 0.2}
        fill={C.tinta}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="bold"
        fontSize={h * 0.17}
        textAnchor="middle"
      >
        1
      </text>
      <rect x={ix} y={iy + h * 0.955} width={w} height={h * 0.045} rx={w * 0.04} fill={C.papelSombra} />
    </g>
  );
}

/**
 * La marca entera, para poner arriba del nombre.
 *
 * `alto` va en unidades CSS (lo normal es un `clamp` contra el alto de la
 * ventana). El SVG mantiene la proporción solo.
 *
 * La clase `marca` NO ES DECORACIÓN: es el gancho del que cuelga la regla de
 * `app/globals.css` que parte el rasterizado en esta pantalla, igual que la
 * clase `carta` de `components/Carta.tsx`. Ver el comentario de la regla.
 */
/**
 * `idHalo` existe porque la marca puede estar DOS veces en la página: la
 * pantalla de carga de la app la dibuja encima de la portada, que tiene la
 * suya. Dos `<radialGradient>` con el mismo `id` es HTML inválido, y el
 * `url(#…)` de una terminaría apuntando al de la otra.
 */
export function Marca({
  alto,
  className = "",
  idHalo = "halo-marca",
}: {
  alto: string;
  className?: string;
  idHalo?: string;
}) {
  return (
    <svg
      viewBox="0 0 140 108"
      style={{ height: alto, width: "auto" }}
      className={`marca ${className}`}
      role="img"
      aria-label="Truco Uruguayo"
    >
      <defs>
        <radialGradient id={idHalo}>
          <stop offset="0%" stopColor={C.dorado} stopOpacity="0.5" />
          <stop offset="45%" stopColor={C.dorado} stopOpacity="0.25" />
          <stop offset="75%" stopColor={C.dorado} stopOpacity="0.08" />
          <stop offset="100%" stopColor={C.dorado} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="70" cy="54" r="58" fill={`url(#${idHalo})`} />
      {/* la de atrás primero: el orden del documento es el orden de apilado */}
      <CartaDeMarca x={86} giro={17} palo="copa" />
      <CartaDeMarca x={56} giro={-14} palo="oro" />
    </svg>
  );
}
