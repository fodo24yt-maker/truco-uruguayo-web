/**
 * El papel: dónde empieza, dónde termina y por dónde está rasgado.
 *
 * Está aparte porque tres capas necesitan las mismas medidas —el `viewBox`, la
 * hoja del pergamino y el grano que va encima de todo—, y tenerlas escritas
 * tres veces es la forma más segura de que un día no coincidan.
 *
 * Todo esto son constantes de módulo, y eso importa: con `output: "export"` el
 * HTML se prerenderiza en el build, así que un valor que cambie entre el
 * servidor y el navegador es un error de hidratación. Por eso el borde rasgado
 * usa un generador con semilla fija y nunca `Math.random()`.
 */

import { LIENZO } from "@/lib/mapa-uruguay";

/**
 * Aire alrededor del país. No se agranda: el mapa es limitado por el ancho en
 * todas las pantallas reales (360, 390, 768, 1366, 1920: en todas manda el
 * ancho y sobra alto), así que cada unidad de margen se paga en todas. El
 * marco y los adornos entran en el aire que ya estaba pago.
 */
export const MARGEN = 42;

export const VISTA_X = -MARGEN;
export const VISTA_Y = -MARGEN;
export const VISTA_ANCHO = LIENZO.ancho + MARGEN * 2;
export const VISTA_ALTO = LIENZO.alto + MARGEN * 2;
export const VISTA = `${VISTA_X} ${VISTA_Y} ${VISTA_ANCHO} ${VISTA_ALTO}`;

/** Dos decimales alcanzan a esta escala y acortan los paths. */
const r = (v: number) => Math.round(v * 100) / 100;

/** El rectángulo nominal de la hoja, antes de rasgarle los bordes. */
const HOJA_BORDE = 5;
/** Cuánto muerde el rasgado hacia adentro, como mucho. */
const RASGADO = 9;
/** Cada cuánto aparece un diente del rasgado. */
const PASO_RASGADO = 21;

/**
 * Generador con semilla fija (LCG). Da siempre la misma secuencia, en el
 * servidor y en el navegador: es lo que hace que el papel se rasgue igual en
 * los dos lados y la hidratación no se queje.
 */
function alAzar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 4294967296;
  };
}

/**
 * El borde rasgado, como geometría y no como filtro: se recorre el perímetro y
 * se mete cada punto un poco para adentro. Un filtro más sería el error que ya
 * se corrigió una vez bajando de 19 texturas a 1.
 */
function bordeRasgado(): string {
  const azar = alAzar(2408);
  const x0 = VISTA_X + HOJA_BORDE;
  const y0 = VISTA_Y + HOJA_BORDE;
  const x1 = VISTA_X + VISTA_ANCHO - HOJA_BORDE;
  const y1 = VISTA_Y + VISTA_ALTO - HOJA_BORDE;

  // Los cuatro lados, con la dirección "hacia adentro" de cada uno. El rasgado
  // muerde SIEMPRE hacia adentro: si mordiera para afuera se saldría del
  // viewBox y el navegador lo cortaría con una línea recta, que es justo lo
  // contrario de lo que se busca.
  const lados: [number, number, number, number, number, number][] = [
    [x0, y0, x1, y0, 0, 1],
    [x1, y0, x1, y1, -1, 0],
    [x1, y1, x0, y1, 0, -1],
    [x0, y1, x0, y0, 1, 0],
  ];

  const puntos: string[] = [];
  for (const [ax, ay, bx, by, hx, hy] of lados) {
    const largo = Math.hypot(bx - ax, by - ay);
    const pasos = Math.max(2, Math.round(largo / PASO_RASGADO));
    for (let i = 0; i < pasos; i++) {
      const t = i / pasos;
      // Una mordida chica casi siempre y una grande de vez en cuando: así se
      // ve papel roto y no una sierra.
      const az = azar();
      const mordida = (az * az * az) * RASGADO;
      puntos.push(`${r(ax + (bx - ax) * t + hx * mordida)} ${r(ay + (by - ay) * t + hy * mordida)}`);
    }
  }
  return `M ${puntos.join(" L ")} Z`;
}

/** La hoja entera, con sus bordes rotos. Se calcula una vez y no cambia más. */
export const HOJA = bordeRasgado();

/**
 * El marco graduado. Va en el anillo que quedaba vacío entre el borde del
 * papel y la orla de agua: no ensancha nada, aprovecha lo que ya estaba.
 *
 * Sin números en la graduación, y no por olvido: la banda mide 7 unidades, que
 * a 360 px de ancho son 2.3 px. Un número ahí no se lee; una rayita sí se ve.
 */
export const MARCO_EXTERNO = {
  x: VISTA_X + 18,
  y: VISTA_Y + 18,
  ancho: VISTA_ANCHO - 36,
  alto: VISTA_ALTO - 36,
};
export const MARCO_INTERNO = {
  x: VISTA_X + 25,
  y: VISTA_Y + 25,
  ancho: VISTA_ANCHO - 50,
  alto: VISTA_ALTO - 50,
};

/** Cada cuánto va una rayita de la graduación. */
const PASO_GRADUACION = 38;

/** Las rayitas del marco, todas en un solo path. */
function graduacion(): string {
  const trazos: string[] = [];
  const { x, y, ancho, alto } = MARCO_EXTERNO;
  const fondo = 7; // el ancho de la banda entre los dos filetes

  for (let d = PASO_GRADUACION; d < ancho; d += PASO_GRADUACION) {
    trazos.push(`M ${r(x + d)} ${y} v ${fondo}`);
    trazos.push(`M ${r(x + d)} ${r(y + alto)} v ${-fondo}`);
  }
  for (let d = PASO_GRADUACION; d < alto; d += PASO_GRADUACION) {
    trazos.push(`M ${x} ${r(y + d)} h ${fondo}`);
    trazos.push(`M ${r(x + ancho)} ${r(y + d)} h ${-fondo}`);
  }
  return trazos.join(" ");
}

export const GRADUACION = graduacion();

/**
 * Los dos huecos donde entran los adornos, medidos sobre la silueta real: son
 * los rectángulos vacíos más grandes que quedan adentro del marco, buscados
 * con una pasada por el mapa y no a ojo.
 *
 * El noreste es el grande (Brasil, arriba a la derecha) y el suroeste es el
 * Río de la Plata. Adornar ahí es gratis: son unidades que el encuadre ya
 * estaba pagando.
 */
export const HUECO_NORESTE = { x: 608, y: -16, ancho: 408, alto: 264 } as const;
export const HUECO_SUROESTE = { x: -16, y: 980, ancho: 264, alto: 120 } as const;
