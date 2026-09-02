/**
 * Los trofeos: qué te quedaste de cada rival al que le ganaste.
 *
 * ── La idea ───────────────────────────────────────────────────────────────
 *
 * Cada departamento ya tenía su objeto sobre la mesa —el vaso de Montevideo, la
 * naranja de Salto, el sombrero de Tacuarembó—, dibujado para que dos escenas
 * iguales no se confundan. Acá ese objeto pasa a ser además **la recompensa**:
 * le ganaste a ese rival, te quedaste con su objeto.
 *
 * No hace falta guardar nada nuevo para saber cuáles ganaste: sale de las
 * mismas `ganadas` con las que la gira decide qué parada abrir. Lo único que se
 * agregó al progreso es el marcador de la mejor victoria, para poder decir "30
 * a 4" en vez de sólo "ganado".
 *
 * ── Por qué devuelve LOS DIECINUEVE ───────────────────────────────────────
 *
 * Y no sólo los ganados. Una lista donde faltan los que no conseguiste no dice
 * cuántos faltan, y eso es la mitad de para qué sirve una vitrina. Los que
 * faltan van con `ganado: false` y la pantalla los dibuja apagados.
 *
 * Es una función pura y sin JSX para que `node --test` la pueda leer: la misma
 * razón por la que los datos de los objetos viven en `lib/objetos.ts` y no en
 * `components/mesa/Objetos.tsx`.
 */

import { objetoDe } from "./ambientes.ts";
import { PERSONALIDADES } from "./motor/personalidades.ts";
import type { ClaveObjeto } from "./objetos.ts";
import type { Marcador, Progreso } from "./progreso.ts";

export interface Trofeo {
  /** El id de la personalidad. NO se toca: es la clave del progreso guardado. */
  id: string;
  nombre: string;
  departamento: string;
  /** Lugar en la gira, 1 a 19. Es el orden en que se muestran. */
  paso: number;
  /**
   * El objeto que lo identifica, o `null` si ese departamento no tiene ninguno.
   * Hoy los diecinueve tienen —hay un test que lo exige— pero `objetoDe` puede
   * devolver `null` y taparlo acá sería mentirle a quien lea el tipo.
   */
  objeto: ClaveObjeto | null;
  /** Si le ganaste alguna vez. */
  ganado: boolean;
  /**
   * El marcador de la mejor victoria, cuando se conoce.
   *
   * Puede faltar aun estando ganado: los progresos guardados antes de que esto
   * existiera tienen las victorias pero no los marcadores. Ahí el trofeo se
   * muestra igual, sin el número.
   */
  mejor?: Marcador;
}

/**
 * Los diecinueve trofeos, en el orden de la gira.
 *
 * Recibe el `rivales` del progreso tal cual: pide sólo la forma y no importa
 * `progreso.ts` en tiempo de ejecución, igual que `Marcas` en `lib/gira.ts`.
 */
export function trofeosDe(marcas: Progreso["rivales"]): Trofeo[] {
  return [...PERSONALIDADES]
    .sort((a, b) => a.paso - b.paso)
    .map((p) => {
      /* `Object.hasOwn` y no `marcas[p.id]`: indexar un objeto plano con un
         texto devuelve también lo que hay en la cadena de prototipos. Es el
         mismo cuidado que ya tienen `objetoDe` y `anotarPartida`. */
      const marca = Object.hasOwn(marcas, p.id) ? marcas[p.id] : undefined;
      const ganado = (marca?.ganadas ?? 0) > 0;
      return {
        id: p.id,
        nombre: p.nombre,
        departamento: p.departamento,
        paso: p.paso,
        objeto: objetoDe(p.departamento),
        ganado,
        // El marcador sólo acompaña a un trofeo ganado. Si no lo está, no hay
        // victoria que contar aunque el guardado traiga un número.
        ...(ganado && marca?.mejor ? { mejor: marca.mejor } : {}),
      };
    });
}

/** Cuántos conseguiste. Es el número que va en el botón que abre la vitrina. */
export const cuantosGanados = (trofeos: Trofeo[]): number =>
  trofeos.filter((t) => t.ganado).length;
