/**
 * El azar del que salen los nudos, los rayones y las manchas.
 *
 * Es un generador CON SEMILLA y no `Math.random`, a propósito: correr el script
 * dos veces tiene que dar el MISMO archivo. Si cambiara en cada corrida, cada
 * vez que alguien regenerase una textura git vería un archivo nuevo de 100 KB
 * sin que nada haya cambiado de verdad.
 *
 * Es mulberry32: cuatro líneas, buena distribución y siempre el mismo resultado
 * en cualquier máquina.
 */
export function azarCon(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un número entre `desde` y `hasta`. */
export const entre = (azar, desde, hasta) => desde + azar() * (hasta - desde);

/** Uno de los de la lista. */
export const alguno = (azar, lista) => lista[Math.floor(azar() * lista.length)];

/** La semilla de un ambiente, derivada de su nombre: fija y distinta para cada uno. */
export function semillaDe(texto) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
