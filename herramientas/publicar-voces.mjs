/**
 * Pasa las voces de los rivales al juego: public/audio/voces/<id>/<canto>-<n>.m4a y lib/voces.ts
 *
 *     node herramientas/publicar-voces.mjs
 *
 * Lo que publica sale de `audio-fuente/voces/` (no sube), que es lo que generó
 * `generar-voces.mjs` y lo que Santiago fue escuchando en su página:
 *
 *   - de cada canto, las tomas buenas (`<canto>-1.m4a`, `-2.m4a`) **que sigan
 *     en la carpeta**. Si Santiago borró una porque no le gustó, no se publica;
 *   - si a un canto no le queda ninguna buena, va su DUDOSA (la que el control
 *     rechazó por una letra; ver `voces/cantar.py`), y se avisa. Así ningún
 *     canto queda mudo mientras se termina de elegir. Las que se usaron quedan
 *     listadas en el encabezado de `lib/voces.ts`.
 *
 * El juego elige al azar entre las tomas de un canto, para que el mismo rival
 * no diga "¡Truco!" siempre igual (lo permitió Santiago, "que varíen pero que
 * mantengan una estructura bastante similar": por eso son dos tomas de la misma
 * voz y no dos voces).
 *
 * Los archivos se copian sin volver a codificar (`-c copy`), sólo sin metadatos
 * (`+bitexact`). La carpeta `public/audio/voces/` se rehace entera cada vez:
 * es generada, como `public/escenas/`.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CLAVES_VOZ } from "../lib/motor/partida.ts";
import { PERSONALIDADES } from "../lib/motor/personalidades.ts";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");
const FUENTES = path.join(RAIZ, "audio-fuente", "voces");
const SALIDA = path.join(RAIZ, "public", "audio", "voces");
const INDICE = path.join(RAIZ, "lib", "voces.ts");
const AUDIO = process.env.HERRAMIENTAS_AUDIO || path.join(os.homedir(), "herramientas-audio");
const FFMPEG = path.join(AUDIO, "bin", "ffmpeg");

if (!existsSync(FFMPEG)) {
  console.error(`Falta ${FFMPEG}. Las herramientas de audio se arman como dice el Historial del 19/10/2026.`);
  process.exit(1);
}
// Sólo ids y cantos de las listas cerradas: los dos terminan siendo rutas.
const SEGURO = /^[a-z0-9-]+$/;

rmSync(SALIDA, { recursive: true, force: true });
const indice = {};
const dudosasUsadas = [];
const mudos = [];
let archivos = 0;

for (const { id, nombre } of PERSONALIDADES) {
  if (!SEGURO.test(id)) throw new Error(`id raro: ${id}`);
  const informe = path.join(FUENTES, id, "informe.json");
  if (!existsSync(informe)) {
    mudos.push(`${nombre} (no tiene voces generadas)`);
    continue;
  }
  const cantos = JSON.parse(readFileSync(informe, "utf8")).cantos;
  indice[id] = {};
  for (const clave of CLAVES_VOZ) {
    const datos = cantos[clave];
    const existe = (t) => existsSync(path.join(FUENTES, id, t.archivo));
    let tomas = (datos?.elegidas ?? []).filter(existe);
    if (tomas.length === 0) {
      tomas = (datos?.dudosas ?? []).filter(existe);
      if (tomas.length) dudosasUsadas.push(`${nombre}: ${clave} (Whisper oyó «${tomas[0].oye}»)`);
    }
    if (tomas.length === 0) {
      mudos.push(`${nombre}: ${clave}`);
      continue;
    }
    mkdirSync(path.join(SALIDA, id), { recursive: true });
    indice[id][clave] = tomas.map((t, i) => {
      const destino = path.join(SALIDA, id, `${clave}-${i + 1}.m4a`);
      const r = spawnSync(FFMPEG, [
        "-hide_banner", "-loglevel", "error", "-y", "-i", path.join(FUENTES, id, t.archivo),
        "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", "-c", "copy", destino,
      ]);
      if (r.status !== 0) throw new Error(`ffmpeg con ${id}/${t.archivo}: ${r.stderr}`);
      archivos++;
      return `/audio/voces/${id}/${clave}-${i + 1}.m4a`;
    });
  }
}

const filas = Object.entries(indice).map(([id, cantos]) => {
  const dentro = Object.entries(cantos)
    .map(([clave, rutas]) => `    "${clave}": [${rutas.map((r) => `"${r}"`).join(", ")}],`)
    .join("\n");
  return `  "${id}": {\n${dentro}\n  },`;
});

writeFileSync(
  INDICE,
  `/**
 * Las voces de los rivales. GENERADO: no se edita a mano.
 *
 *     node herramientas/publicar-voces.mjs
 *
 * Por rival (el \`id\` de \`lib/motor/personalidades.ts\`) y por canto, las tomas
 * que hay. El juego elige una al azar cada vez. Un rival o un canto que no
 * está acá queda callado: no rompe nada.
 *
 * Las rutas están escritas enteras, igual que en \`lib/escenas.ts\` y
 * \`lib/musica.ts\`: el reproductor sólo puede pedir uno de estos archivos.
 *
 * Dudosas en uso (no tenían ninguna toma buena; ver publicar-voces.mjs):
${dudosasUsadas.length ? dudosasUsadas.map((d) => ` *   - ${d}`).join("\n") : " *   ninguna"}
 */

import type { ClaveVoz } from "./motor/partida.ts";

export const VOCES: Readonly<Record<string, Partial<Record<ClaveVoz, readonly string[]>>>> = {
${filas.join("\n")}
};
`,
);

console.log(`${archivos} archivos de ${Object.keys(indice).length} rivales en ${path.relative(RAIZ, SALIDA)}`);
if (dudosasUsadas.length) console.log(`dudosas en uso:\n  ${dudosasUsadas.join("\n  ")}`);
if (mudos.length) console.log(`sin voz:\n  ${mudos.join("\n  ")}`);
