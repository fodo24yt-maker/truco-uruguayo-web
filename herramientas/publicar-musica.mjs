/**
 * Prepara la música de fondo para el juego: public/audio/musica/*.m4a y lib/musica.ts
 *
 *     node herramientas/publicar-musica.mjs
 *
 * ── De dónde salen los temas ─────────────────────────────────────────────
 *
 * De la cata del 21/10/2026, que Santiago aprobó entera ("la música está bien"):
 *
 *   - una milonga hecha por código: `herramientas/musica/sintetizada.mjs`;
 *   - seis de IA, ACE-Step 1.5: `herramientas/musica/con-ia.py`.
 *
 * Las fuentes (WAV) viven en `audio-fuente/musica/cata/`, que no sube. Al repo
 * van sólo los .m4a que escribe este script, igual que las texturas de la mesa.
 *
 * ── Qué les hace ─────────────────────────────────────────────────────────
 *
 * 1. EL MISMO VOLUMEN PARA TODOS: -23 LUFS integrados (el estándar de la
 *    televisión europea, EBU R128), con picos hasta -1,5 dBTP. Santiago notó
 *    que "algunas arrancan muy fuerte de una": en la cata cada tema venía con
 *    su nivel. Se mide en una pasada y se corrige en otra (`loudnorm` en modo
 *    lineal), así que no se le aplasta la dinámica: sólo sube o baja entero.
 * 2. Un fundido de entrada de 50 ms y uno de salida de 1,5 s, horneados. Los
 *    de IA se cortaron a los 60 s, y aunque el reproductor cruza los temas
 *    (`lib/audio.ts`), un archivo no tiene que terminar en seco si alguien lo
 *    reproduce suelto.
 * 3. AAC de 80 kbps, estéreo, 44,1 kHz, sin metadatos y con el índice al
 *    principio (`faststart`), para que empiece a sonar antes de bajar entero.
 *    80 y no 96: es música que suena atrás, y `ideas/sonido.md` ya lo anotaba.
 *
 * El volumen de fábrica de la barra de Música es otra cosa y vive en
 * `lib/sonido.ts`: acá se emparejan los temas entre sí; allá se decide cuánto
 * suena la música contra las voces.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");
const FUENTES = path.join(RAIZ, "audio-fuente", "musica", "cata");
const SALIDA = path.join(RAIZ, "public", "audio", "musica");
const INDICE = path.join(RAIZ, "lib", "musica.ts");

const AUDIO = process.env.HERRAMIENTAS_AUDIO || path.join(os.homedir(), "herramientas-audio");
const FFMPEG = path.join(AUDIO, "bin", "ffmpeg");
const FFPROBE = path.join(AUDIO, "bin", "ffprobe");

const LUFS = -23;
const PICO = -1.5;
const FUNDIDO_ENTRADA = 0.05;
const FUNDIDO_SALIDA = 1.5;

/** Los temas, en el orden en que se listan (el reproductor los mezcla al azar). */
const TEMAS = [
  { clave: "por-codigo", fuente: "por-codigo.wav", que: "milonga hecha por código" },
  { clave: "milonga-1910", fuente: "crudo/milonga-1910.wav", que: "milonga (IA)" },
  { clave: "milonga-2110", fuente: "crudo/milonga-2110.wav", que: "milonga (IA)" },
  { clave: "candombe-1910", fuente: "crudo/candombe-1910.wav", que: "candombe (IA)" },
  { clave: "candombe-2110", fuente: "crudo/candombe-2110.wav", que: "candombe (IA)" },
  { clave: "tango-1910", fuente: "crudo/tango-1910.wav", que: "tango milonga (IA)" },
  { clave: "tango-2110", fuente: "crudo/tango-2110.wav", que: "tango milonga (IA)" },
];

function correr(programa, args) {
  const r = spawnSync(programa, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    console.error(`${path.basename(programa)} terminó mal:\n${r.stderr}`);
    process.exit(1);
  }
  return r;
}

/** El último bloque JSON que imprime `loudnorm` en la salida de error. */
function jsonDeLoudnorm(texto) {
  const desde = texto.lastIndexOf("{");
  return JSON.parse(texto.slice(desde, texto.indexOf("}", desde) + 1));
}

const duracion = (archivo) =>
  Number(correr(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", archivo]).stdout.trim());

for (const programa of [FFMPEG, FFPROBE]) {
  if (!existsSync(programa)) {
    console.error(`Falta ${programa}. Las herramientas de audio se arman como dice el Historial del 19/10/2026.`);
    process.exit(1);
  }
}
mkdirSync(SALIDA, { recursive: true });

const filas = [];
for (const t of TEMAS) {
  const fuente = path.join(FUENTES, t.fuente);
  if (!existsSync(fuente)) {
    console.error(`Falta la fuente de ${t.clave}: ${path.relative(RAIZ, fuente)}`);
    process.exit(1);
  }
  const normal = `loudnorm=I=${LUFS}:TP=${PICO}:LRA=11`;
  const medido = jsonDeLoudnorm(correr(FFMPEG, ["-hide_banner", "-i", fuente, "-af", `${normal}:print_format=json`, "-f", "null", "-"]).stderr);
  const largo = duracion(fuente);
  const filtro = [
    `${normal}:measured_I=${medido.input_i}:measured_TP=${medido.input_tp}:measured_LRA=${medido.input_lra}` +
      `:measured_thresh=${medido.input_thresh}:offset=${medido.target_offset}:linear=true:print_format=json`,
    `afade=t=in:d=${FUNDIDO_ENTRADA}`,
    `afade=t=out:st=${(largo - FUNDIDO_SALIDA).toFixed(3)}:d=${FUNDIDO_SALIDA}`,
  ].join(",");
  const destino = path.join(SALIDA, `${t.clave}.m4a`);
  const r = correr(FFMPEG, [
    "-hide_banner", "-y", "-i", fuente, "-af", filtro, "-ar", "44100", "-ac", "2",
    "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact",
    "-c:a", "aac", "-b:a", "80k", "-movflags", "+faststart", destino,
  ]);
  const tipo = jsonDeLoudnorm(r.stderr).normalization_type;
  const segundos = Math.round(duracion(destino) * 10) / 10;
  filas.push({ archivo: `/audio/musica/${t.clave}.m4a`, segundos });
  console.log(`${t.clave.padEnd(14)} ${t.que.padEnd(26)} ${String(segundos).padStart(5)} s   antes ${medido.input_i} LUFS → ${LUFS} (${tipo})`);
}

const indice = `/**
 * La música de fondo. GENERADO: no se edita a mano.
 *
 *     node herramientas/publicar-musica.mjs
 *
 * Todos a ${LUFS} LUFS, así ninguno arranca más fuerte que otro. Lo que suena
 * y cómo se cruzan los temas está en \`lib/audio.ts\`.
 *
 * Las rutas están escritas enteras, no armadas con plantillas, igual que en
 * \`lib/escenas.ts\`: el reproductor sólo puede pedir uno de estos archivos.
 */

export interface Tema {
  archivo: string;
  /** Lo que dura, para saber cuándo cruzar al siguiente sin esperar a que cargue. */
  segundos: number;
}

export const TEMAS: readonly Tema[] = [
${filas.map((f) => `  { archivo: "${f.archivo}", segundos: ${f.segundos} },`).join("\n")}
];
`;
writeFileSync(INDICE, indice);
console.log(`\n${filas.length} temas en ${path.relative(RAIZ, SALIDA)} y el índice en ${path.relative(RAIZ, INDICE)}`);
