/**
 * Qué ejercicios de Aprender ya acertaste.
 *
 * Existe para una sola cosa: **terminar Aprender desbloquea la Gira nacional**
 * en la app. "Terminar" quiere decir acertar los doce ejercicios, cada uno por
 * lo menos una vez —decisión de Santiago, 2/10/2026—. Errar no resta: con
 * "Probar de nuevo" se intenta hasta acertar, que es justo cuando se aprende.
 *
 * Clave propia, `truco-uy:aprendido`, por lo mismo que `desbloqueos.ts`.
 *
 * La lista de ids vive ACÁ y no en `lib/lecciones/index.tsx` porque los tests
 * corren en Node sin JSX: un test que quiera saber cuántos ejercicios hay no
 * puede importar el archivo de las lecciones. A cambio, `entradas-unicas.test.ts`
 * lee ese archivo como texto y verifica que cada id de acá aparezca exactamente
 * una vez allá, y que no haya un `<Ejercicio>` sin id.
 */

import { desbloquear, leerDesbloqueos } from "./desbloqueos.ts";

const CLAVE = "truco-uy:aprendido";
const VERSION = 1;

/** Los doce ejercicios, en el orden en que aparecen en las lecciones. */
export const EJERCICIOS = [
  "la-baraja",
  "jerarquia",
  "la-muestra-1",
  "la-muestra-2",
  "la-mano",
  "el-envido-1",
  "el-envido-2",
  "la-flor",
  "el-truco-1",
  "el-truco-2",
  "puntos-y-partida-1",
  "puntos-y-partida-2",
] as const;

export type IdEjercicio = (typeof EJERCICIOS)[number];

export interface Aprendido {
  version: number;
  ejercicios: IdEjercicio[];
}

export const APRENDIDO_VACIO: Aprendido = { version: VERSION, ejercicios: [] };

const IDS: ReadonlySet<string> = new Set(EJERCICIOS);

export const esIdEjercicio = (v: unknown): v is IdEjercicio =>
  typeof v === "string" && IDS.has(v);

/**
 * Nunca lanza. Se queda sólo con ids que existen (una allowlist, no una
 * expresión regular: un id inventado no puede completar nada) y sin repetir.
 */
export function sanear(crudo: unknown): Aprendido {
  if (typeof crudo !== "object" || crudo === null) return { ...APRENDIDO_VACIO, ejercicios: [] };
  const d = crudo as Record<string, unknown>;
  const vistos = new Set<IdEjercicio>();
  if (Array.isArray(d.ejercicios)) {
    for (const id of d.ejercicios.slice(0, 100)) {
      if (esIdEjercicio(id)) vistos.add(id);
    }
  }
  // En el orden de EJERCICIOS, así dos listas con lo mismo guardan lo mismo
  return { version: VERSION, ejercicios: EJERCICIOS.filter((id) => vistos.has(id)) };
}

export function leerAprendido(): Aprendido {
  if (typeof window === "undefined") return { ...APRENDIDO_VACIO, ejercicios: [] };
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return { ...APRENDIDO_VACIO, ejercicios: [] };
    return sanear(JSON.parse(crudo));
  } catch {
    return { ...APRENDIDO_VACIO, ejercicios: [] };
  }
}

function guardar(a: Aprendido): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(a));
  } catch {
    // Que no se pueda guardar no puede romper la lección
  }
}

export const cuantosAcertados = (a: Aprendido = leerAprendido()): number => a.ejercicios.length;

export const aprendioTodo = (a: Aprendido = leerAprendido()): boolean =>
  EJERCICIOS.every((id) => a.ejercicios.includes(id));

const oyentes = new Set<() => void>();

export function suscribirAprendido(fn: () => void): () => void {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/**
 * Anota un acierto.
 *
 * `giraRecienAbierta` es `true` sólo la vez que ESTE acierto completa Aprender
 * y la Gira estaba cerrada: es la que merece el cartel de "quedó desbloqueada".
 * Acertar de nuevo un ejercicio ya acertado no cambia nada ni avisa nada.
 */
export function anotarAcierto(id: IdEjercicio): { acertados: number; giraRecienAbierta: boolean } {
  const antes = leerAprendido();
  if (!esIdEjercicio(id) || antes.ejercicios.includes(id)) {
    return { acertados: antes.ejercicios.length, giraRecienAbierta: false };
  }
  const nuevo = sanear({ ejercicios: [...antes.ejercicios, id] });
  guardar(nuevo);

  let giraRecienAbierta = false;
  if (aprendioTodo(nuevo)) {
    // Queda abierta PARA SIEMPRE: si mañana se agrega una lección con un
    // ejercicio nuevo, al que ya terminó no se le vuelve a cerrar.
    giraRecienAbierta = !leerDesbloqueos().gira;
    desbloquear("gira");
  }
  for (const fn of oyentes) fn();
  return { acertados: nuevo.ejercicios.length, giraRecienAbierta };
}
