/**
 * La geometría del camino de la gira: los 18 saltos, de una parada a la que le
 * sigue, dibujados como el camino punteado de un mapa del tesoro.
 *
 * Los 18 `d` se calculan UNA vez, como constante de módulo. No es por
 * velocidad —armarlos cuesta microsegundos—: es que así el string nunca cambia
 * de identidad, React no reescribe el atributo y no le pelea a la animación
 * CSS; que una constante de módulo se puede probar geométricamente con
 * `node --test`, y algo calculado adentro de un componente no; y que
 * `useMemo(..., [])` sobre entradas constantes es esto mismo, disfrazado.
 *
 * Son 18 paths y no uno solo a propósito: cada salto tiene su estado
 * —recorrido, el que toca, cerrado— y sólo uno se anima.
 *
 * Tampoco se precalcula en `herramientas/generar-mapa.mjs`: el orden de la
 * gira vive en `personalidades.ts`, y meterlo en el generador cartográfico lo
 * duplicaría y obligaría a re-correr el generador cada vez que se reordenan
 * los rivales.
 */

import { EN_ORDEN } from "./gira.ts";
import { DEPARTAMENTOS } from "./mapa-uruguay.ts";

export type Punto = readonly [number, number];

export interface Tramo {
  /** El `d` del path, listo para el atributo. */
  d: string;
  /** De dónde sale. */
  desde: string;
  /** Adónde llega. */
  hasta: string;
}

const CENTRO = new Map<string, Punto>(DEPARTAMENTOS.map((d) => [d.nombre, d.centro]));

/**
 * Los 19 centros, en el orden de la gira. Los nodos del mapa salen de acá
 * mismo, así que el camino y las paradas no se pueden ir cada uno por su lado.
 */
export const PARADAS_XY: readonly Punto[] = EN_ORDEN.map((p) => {
  const centro = CENTRO.get(p.departamento);
  // Hay un test que garantiza que cada rival tenga su departamento en el mapa.
  // Si igual se rompe, que se rompa en el build y no en la pantalla del jugador.
  if (!centro) throw new Error(`gira-camino: ${p.departamento} no está en el mapa`);
  return centro;
});

/**
 * El único retoque a mano de todo el camino, y con motivo.
 *
 * Entre Artigas y Rivera el país se angosta tanto que ni la recta entre los dos
 * centros pasa cómoda —queda a 10.9 unidades del borde—, y la curva, que va más
 * suelta que la recta, se salía directamente del mapa. Esta escala intermedia
 * (cae en Tacuarembó) la mete para adentro: con ella, la holgura mínima de todo
 * el camino sube a 17.4, que es exactamente la holgura del centro de
 * Montevideo. O sea: ningún punto del camino queda más cerca del borde que la
 * más apretada de las 19 paradas. No se puede pedir mucho más.
 *
 * Es el mismo espíritu que el DESVIO de la chapita de Montevideo: un ajuste a
 * mano, uno solo, con el porqué escrito al lado.
 */
const ESCALAS = new Map<string, Punto>([["Artigas|Rivera", [455, 262]]]);

/**
 * Tensión de la Catmull-Rom. Uniforme (no centrípeta) y en 0.5, medido contra
 * la silueta real: la centrípeta reparametriza según el largo de cada tramo y
 * acá los tramos van de 88 a 383 unidades, así que le da panza justo donde no
 * hay lugar (se sale 15 unidades). Con 0.5 uniforme y la escala de arriba, el
 * camino entero queda adentro con holgura de sobra.
 */
const TENSION = 0.5;

/** Dos decimales alcanzan y sobran a esta escala, y acortan el path. */
const r = (v: number) => Math.round(v * 100) / 100;

/**
 * Catmull-Rom uniforme pasada a bézier cúbica. En cada nodo la tangente es la
 * dirección de la cuerda anterior→siguiente, así que los dos tramos que se
 * tocan salen con la MISMA dirección y no queda ni un codo:
 *
 *   C1 = P1 + (P2 − P0)·t/3
 *   C2 = P2 − (P3 − P1)·t/3
 *
 * En las puntas el vecino que falta se reemplaza por el propio extremo, que es
 * lo que deja el camino entrando y saliendo derecho de Montevideo y de Melo.
 */
function controlesDe(puntos: readonly Punto[], i: number): [Punto, Punto] {
  const p0 = puntos[i - 1] ?? puntos[i];
  const p1 = puntos[i];
  const p2 = puntos[i + 1];
  const p3 = puntos[i + 2] ?? puntos[i + 1];

  return [
    [p1[0] + ((p2[0] - p0[0]) * TENSION) / 3, p1[1] + ((p2[1] - p0[1]) * TENSION) / 3],
    [p2[0] - ((p3[0] - p1[0]) * TENSION) / 3, p2[1] - ((p3[1] - p1[1]) * TENSION) / 3],
  ];
}

function construirCamino(): Tramo[] {
  // La polilínea que se suaviza incluye las escalas; los tramos, en cambio, se
  // cortan en las paradas de verdad. Por eso se anota dónde cae cada una.
  const puntos: Punto[] = [];
  const dondeCaeLaParada: number[] = [];

  PARADAS_XY.forEach((centro, i) => {
    dondeCaeLaParada.push(puntos.length);
    puntos.push(centro);
    const escala = ESCALAS.get(`${EN_ORDEN[i].departamento}|${EN_ORDEN[i + 1]?.departamento}`);
    if (escala) puntos.push(escala);
  });

  const tramos: Tramo[] = [];
  for (let salto = 0; salto + 1 < PARADAS_XY.length; salto++) {
    const desde = dondeCaeLaParada[salto];
    const hasta = dondeCaeLaParada[salto + 1];
    const [x, y] = puntos[desde];
    let d = `M ${r(x)} ${r(y)}`;

    // Un tramo con escala son dos cúbicas en el mismo path: sigue siendo UN
    // salto, con un estado y una animación.
    for (let i = desde; i < hasta; i++) {
      const [c1, c2] = controlesDe(puntos, i);
      const fin = puntos[i + 1];
      d += ` C ${r(c1[0])} ${r(c1[1])}, ${r(c2[0])} ${r(c2[1])}, ${r(fin[0])} ${r(fin[1])}`;
    }

    tramos.push({
      d,
      desde: EN_ORDEN[salto].departamento,
      hasta: EN_ORDEN[salto + 1].departamento,
    });
  }
  return tramos;
}

/** Los 18 saltos, en orden de gira. El tramo k va de la parada k a la k+1. */
export const CAMINO: readonly Tramo[] = construirCamino();
