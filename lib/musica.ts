/**
 * La música de fondo. GENERADO: no se edita a mano.
 *
 *     node herramientas/publicar-musica.mjs
 *
 * Todos a -23 LUFS, así ninguno arranca más fuerte que otro. Lo que suena
 * y cómo se cruzan los temas está en `lib/audio.ts`.
 *
 * Las rutas están escritas enteras, no armadas con plantillas, igual que en
 * `lib/escenas.ts`: el reproductor sólo puede pedir uno de estos archivos.
 */

export interface Tema {
  /** El nombre con el que lo agrupa `AMBIENTES_MUSICALES` en `lib/audio.ts`. */
  clave: string;
  archivo: string;
  /** Lo que dura, para saber cuándo cruzar al siguiente sin esperar a que cargue. */
  segundos: number;
}

export const TEMAS: readonly Tema[] = [
  { clave: "por-codigo", archivo: "/audio/musica/por-codigo.m4a", segundos: 36.9 },
  { clave: "milonga-1910", archivo: "/audio/musica/milonga-1910.m4a", segundos: 60 },
  { clave: "milonga-2110", archivo: "/audio/musica/milonga-2110.m4a", segundos: 60 },
  { clave: "candombe-1910", archivo: "/audio/musica/candombe-1910.m4a", segundos: 60 },
  { clave: "candombe-2110", archivo: "/audio/musica/candombe-2110.m4a", segundos: 60 },
  { clave: "tango-1910", archivo: "/audio/musica/tango-1910.m4a", segundos: 60 },
  { clave: "tango-2110", archivo: "/audio/musica/tango-2110.m4a", segundos: 60 },
];
