/**
 * El desbloqueo en cadena de la gira.
 *
 * La regla es una sola: la primera parada siempre está abierta, y cada una de
 * las otras se abre cuando le ganaste a la anterior. De ahí sale todo lo que
 * el mapa necesita saber para dibujarse.
 *
 * NO se guarda nada nuevo en el navegador. El estado de las 19 paradas se
 * DERIVA de las victorias que `lib/progreso.ts` ya anota. Un campo
 * `desbloqueados` guardado aparte sería un campo más que sanear, una migración
 * de versión, y —lo peor— una segunda fuente de verdad que puede contradecir a
 * la primera. Derivarlo no se puede desincronizar nunca.
 *
 * Este módulo no importa `progreso.ts` a propósito: recibe las marcas por
 * estructura. Así se prueba sin ningún `localStorage` de mentira, y la capa de
 * storage sigue sin saber nada del juego.
 */

import { PERSONALIDADES, type Personalidad } from "./motor/personalidades.ts";

/** Lo que guarda `progreso.rivales`, pedido por forma y no por import. */
export type Marcas = Record<string, { ganadas: number; jugadas: number }>;

export type EstadoParada = "ganada" | "abierta" | "cerrada";

export interface Parada {
  personalidad: Personalidad;
  /** 1 a 19: el mismo `paso` de la personalidad, a mano para ordenar. */
  paso: number;
  estado: EstadoParada;
  /** La primera abierta sin ganar: adonde te toca ir ahora. */
  esElProximo: boolean;
  /** A quién hay que ganarle para abrirla. `null` sólo en la primera. */
  abreCon: Personalidad | null;
}

/** El estado de un salto del camino. Sólo el "proximo" se anima. */
export type EstadoTramo = "recorrido" | "proximo" | "cerrado";

/**
 * Las 19 personalidades en el orden del recorrido. `paso` sale del orden del
 * array `SEMILLAS`, pero ordenar acá también deja al resto del código sin
 * depender de ese detalle.
 */
export const EN_ORDEN: readonly Personalidad[] = [...PERSONALIDADES].sort(
  (a, b) => a.paso - b.paso,
);

/** Los ids salen de PERSONALIDADES, nunca de la URL: la clave es siempre nuestra. */
const ganó = (marcas: Marcas, id: string) => (marcas[id]?.ganadas ?? 0) > 0;

/**
 * Arma las 19 paradas con su estado.
 *
 * Ojo, que rompe las interfaces ingenuas: `estado` NO es monótono. La Partida
 * Rápida anota contra el mismo `rival.id`, así que se puede tener el paso 10
 * ganado y el 9 no. No hay un único índice "hasta acá llegué": cada parada se
 * mira por separado. Como la regla sólo mira hacia atrás un paso, ganar uno
 * fuera de orden abre el siguiente y el sistema queda consistente solo.
 */
export function armarGira(marcas: Marcas): Parada[] {
  let yaHayProximo = false;

  return EN_ORDEN.map((personalidad, i) => {
    const abreCon = i === 0 ? null : EN_ORDEN[i - 1];
    const abierta = abreCon === null || ganó(marcas, abreCon.id);
    const estado: EstadoParada = ganó(marcas, personalidad.id)
      ? "ganada"
      : abierta
        ? "abierta"
        : "cerrada";

    const esElProximo = estado === "abierta" && !yaHayProximo;
    if (esElProximo) yaHayProximo = true;

    return { personalidad, paso: personalidad.paso, estado, esElProximo, abreCon };
  });
}

/** Adónde te toca ir ahora. `null` sólo cuando ya ganaste las 19. */
export const proximaParada = (paradas: readonly Parada[]): Parada | null =>
  paradas.find((p) => p.esElProximo) ?? null;

/**
 * El estado de los 18 saltos. El tramo k va de la parada k a la k+1, y se pinta
 * según adónde LLEGA: si esa parada ya está ganada, el salto está hecho.
 */
export function estadosDeTramos(paradas: readonly Parada[]): EstadoTramo[] {
  const estados: EstadoTramo[] = [];
  for (let i = 0; i + 1 < paradas.length; i++) {
    const llegada = paradas[i + 1];
    estados.push(
      llegada.estado === "ganada" ? "recorrido" : llegada.esElProximo ? "proximo" : "cerrado",
    );
  }
  return estados;
}

/**
 * El slug de un departamento para la URL: "Treinta y Tres" → "treinta-y-tres",
 * "Río Negro" → "rio-negro". Sale de normalizar el nombre, sin tabla a mano:
 * una tabla es una lista más para mantener sincronizada.
 */
export const slugDepartamento = (nombre: string): string =>
  nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // los acentos, ya separados por NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Un Map y no un objeto: así una clave rara no puede caer en el prototipo. */
const POR_SLUG = new Map<string, Personalidad>(
  EN_ORDEN.map((p) => [slugDepartamento(p.departamento), p]),
);

/**
 * Quién te toca según el `?depto=` de la dirección, o `null` si ese slug no
 * existe. Se valida primero con la MISMA regla que `progreso.ts` le aplica a
 * todo lo que viene de afuera: cualquier cosa rara ni siquiera se busca, y la
 * mesa se queda en modo libre.
 */
export function porSlugDeDepartamento(slug: string | null | undefined): Personalidad | null {
  if (!slug || !/^[a-z0-9-]{1,40}$/.test(slug)) return null;
  return POR_SLUG.get(slug) ?? null;
}
