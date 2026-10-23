/**
 * El escudo: el logo de Truco Uruguayo desde el 18/10/2026.
 *
 * Un escudo de club con la bandera adentro —nueve franjas, cuatro celestes, y
 * el Sol de Mayo en el cantón— y una carta de oro cruzada adelante. Se eligió
 * entre veintiséis propuestas (ver `Historial.md`).
 *
 * ── POR QUÉ SON DATOS Y NO UN DIBUJO ──────────────────────────────────────
 *
 * El escudo se dibuja en tres lugares:
 *
 *   - `components/Marca.tsx`, en React: la portada y la pantalla de carga;
 *   - `herramientas/marca/escudo.mjs`, como texto SVG: el ícono de Android y
 *     el de Play (los hornea `sharp`);
 *   - `herramientas/marca/ficha.mjs`, que arma la ficha de Play.
 *
 * Si cada uno tuviera su copia, serían tres logos que se van separando. Por
 * eso acá no se dibuja nada: se arma un ÁRBOL de piezas (`Pieza`) y cada lugar
 * lo convierte a lo suyo —JSX o texto— sin decidir una sola forma.
 *
 * ── LO QUE NO PUEDE TENER ─────────────────────────────────────────────────
 *
 * Ni letras ni filtros, y lo verifica `escudo.test.ts`:
 *
 *   - `sharp` no carga tipografías de la web, y no dibuja todos los filtros
 *     igual;
 *   - la portada es una `.pantalla-fija`, y un desenfoque ahí es el terreno de
 *     las manchitas (ver `app/globals.css`).
 *
 * El nombre, cuando va, lo pone cada uno con su tipografía.
 *
 * ── LAS MEDIDAS ───────────────────────────────────────────────────────────
 *
 * Con `k = 1`, el escudo mide 400 x 470, con el origen arriba a la izquierda.
 * El contorno sobresale 9 para cada lado y la sombra, 10 a la derecha y 14
 * abajo: entero entra en el recuadro `VIEWBOX`.
 */

export const COLORES = {
  celeste: "#5aa6e0",
  celesteHondo: "#2f7fc0",
  marino: "#0d2340",
  blanco: "#ffffff",
  sol: "#f4c430",
  solHondo: "#c8901a",
} as const;

/** El recuadro donde entra el escudo entero con `k = 1`, contorno y sombra incluidos. */
export const VIEWBOX = "-12 -12 432 500";

/**
 * Una pieza del dibujo. Los atributos van como los escribe React (`strokeWidth`,
 * `clipPath`); el que lo pasa a texto SVG los convierte a guiones.
 */
export interface Pieza {
  el: "g" | "defs" | "clipPath" | "path" | "rect" | "circle";
  a: Record<string, string | number>;
  hijos?: Pieza[];
}

const n = (x: number) => Math.round(x * 10) / 10;

/* ── El Sol de Mayo: dieciséis rayos, rectos y ondulados alternados ─────── */

function rayoRecto(cx: number, cy: number, ang: number, r1: number, r2: number, ancho: number) {
  const a = (ang * Math.PI) / 180;
  const p = (r: number, d: number) => [cx + Math.cos(a) * r - Math.sin(a) * d, cy + Math.sin(a) * r + Math.cos(a) * d];
  const [x1, y1] = p(r1, -ancho);
  const [x2, y2] = p(r1, ancho);
  const [x3, y3] = p(r2, 0);
  return `M${n(x1)} ${n(y1)}L${n(x3)} ${n(y3)}L${n(x2)} ${n(y2)}Z`;
}

/** Un rayo que ondula. 24 puntos por lado: más no se nota ni en el ícono de 512. */
function rayoOndulado(cx: number, cy: number, ang: number, r1: number, r2: number, ancho: number) {
  const a = (ang * Math.PI) / 180;
  const izq: number[][] = [];
  const der: number[][] = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const r = r1 + (r2 - r1) * t;
    const off = Math.sin(t * Math.PI * 3) * (r2 - r1) * 0.055 * (0.4 + t * 0.6);
    const w = ancho * (1 - t) ** 0.9;
    const pt = (d: number) => [cx + Math.cos(a) * r - Math.sin(a) * d, cy + Math.sin(a) * r + Math.cos(a) * d];
    izq.push(pt(off - w));
    der.push(pt(off + w));
  }
  return "M" + [...izq, ...der.reverse()].map(([x, y]) => `${n(x)} ${n(y)}`).join("L") + "Z";
}

/** Los rayos del sol alrededor de (cx, cy), entre los radios r1 y r2. */
export function rayosDelSol(cx: number, cy: number, r1: number, r2: number, color: string = COLORES.sol): Pieza[] {
  let rectos = "";
  let ondulados = "";
  for (let i = 0; i < 16; i++) {
    const ang = (360 / 16) * i - 90;
    if (i % 2 === 0) rectos += rayoRecto(cx, cy, ang, r1, r2, r1 * 0.209);
    else ondulados += rayoOndulado(cx, cy, ang, r1, r2 * 0.94, r1 * 0.19);
  }
  return [
    { el: "path", a: { d: rectos, fill: color } },
    { el: "path", a: { d: ondulados, fill: color } },
  ];
}

/* ── El escudo ──────────────────────────────────────────────────────────── */

/**
 * El escudo entero, como un `<g>`.
 *
 *   id        el `id` del recorte. TIENE que ser único en la página: si el
 *             escudo está dos veces —la pantalla de carga encima de la
 *             portada—, dos recortes con el mismo id hacen que uno apunte al
 *             del otro.
 *   k         la escala (1 = 400 x 470)
 *   contorno  el color del borde
 *   sombra    la sombra corrida abajo a la derecha
 */
export function escudo(id: string, { k = 1, contorno = COLORES.marino, sombra = true }: { k?: number; contorno?: string; sombra?: boolean } = {}): Pieza {
  const W = 400 * k;
  const H = 470 * k;
  const forma = `M0 0 H${n(W)} V${n(H * 0.55)} Q${n(W)} ${n(H * 0.86)} ${n(W / 2)} ${n(H)} Q0 ${n(H * 0.86)} 0 ${n(H * 0.55)} Z`;
  const franjas: Pieza[] = [0, 1, 2, 3].map((i) => ({
    el: "rect",
    a: { x: 0, y: n(H * 0.1 + i * H * 0.2), width: n(W), height: n(H * 0.1), fill: COLORES.celeste },
  }));
  const rSol = W * 0.17;
  const cw = W * 0.34;
  const ch = cw * 1.5;

  return {
    el: "g",
    a: {},
    hijos: [
      { el: "defs", a: {}, hijos: [{ el: "clipPath", a: { id }, hijos: [{ el: "path", a: { d: forma } }] }] },
      ...(sombra ? [{ el: "path" as const, a: { d: forma, transform: `translate(${n(10 * k)} ${n(14 * k)})`, fill: COLORES.marino, opacity: 0.35 } }] : []),
      {
        el: "g",
        a: { clipPath: `url(#${id})` },
        hijos: [
          { el: "rect", a: { width: n(W), height: n(H), fill: COLORES.blanco } },
          ...franjas,
          // el cantón: el cuadro blanco de arriba a la izquierda, donde va el sol
          { el: "rect", a: { width: n(W * 0.46), height: n(H * 0.5), fill: COLORES.blanco } },
          {
            el: "g",
            a: { transform: `translate(${n(W * 0.23)} ${n(H * 0.25)})` },
            hijos: [
              ...rayosDelSol(0, 0, rSol * 0.52, rSol),
              { el: "circle", a: { r: n(rSol * 0.5), fill: COLORES.sol, stroke: COLORES.solHondo, strokeWidth: n(rSol * 0.05) } },
            ],
          },
        ],
      },
      // la carta de oro, cruzada adelante
      {
        el: "g",
        a: { transform: `translate(${n(W * 0.66)} ${n(H * 0.56)}) rotate(10)` },
        hijos: [
          { el: "rect", a: { x: n(-cw / 2), y: n(-ch / 2), width: n(cw), height: n(ch), rx: n(cw * 0.1), fill: COLORES.blanco, stroke: COLORES.marino, strokeWidth: n(7 * k) } },
          { el: "circle", a: { r: n(cw * 0.28), fill: COLORES.sol, stroke: COLORES.solHondo, strokeWidth: n(5 * k) } },
          { el: "circle", a: { r: n(cw * 0.1), fill: COLORES.solHondo } },
        ],
      },
      { el: "path", a: { d: forma, fill: "none", stroke: contorno, strokeWidth: n(18 * k), strokeLinejoin: "round" } },
    ],
  };
}
