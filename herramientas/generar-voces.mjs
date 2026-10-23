/**
 * Genera las voces de los rivales: los 14 cantos de cada uno, para escuchar y elegir.
 *
 *     node herramientas/generar-voces.mjs               # los 19, en el orden de la gira
 *     node herramientas/generar-voces.mjs luki beto     # sólo esos
 *     node herramientas/generar-voces.mjs --pagina      # sólo rehace la página
 *     node herramientas/generar-voces.mjs --referencias # sólo inventa las voces y las compara
 *     node herramientas/generar-voces.mjs --candidatas 4 la-nelly   # 4 versiones de esa voz, para elegir
 *
 * Deja todo en `audio-fuente/voces/` (en .gitignore: NO sube) y la página para
 * escuchar en `audio-fuente/voces/index.html`. Para verla:
 *
 *     python3 -I -m http.server 8765 --bind 127.0.0.1 --directory audio-fuente/voces
 *
 * Todavía no escribe en `public/`: lo que va a la app sale de lo que Santiago
 * apruebe escuchando, no de lo que pase el control automático.
 *
 * ── De dónde salen las voces ─────────────────────────────────────────────
 *
 * 1. `voces/referencias.py`: Qwen3-TTS VoiceDesign INVENTA la voz de cada rival a
 *    partir de la descripción de `voces/reparto.json`, diciendo una frase larga.
 *    No es la voz de nadie. Se hace UNA vez: si ya existe, no se toca.
 * 2. `voces/parecidos.py`: avisa si dos rivales salieron con la misma voz.
 * 3. `voces/cantar.py`: Chatterbox clona esa frase larga para los 14 cantos de
 *    `voces/cantos.json`, y Whisper controla que se entienda cada toma.
 * 4. `voces/pagina.py`: la página, rehecha después de cada rival.
 *
 * ── Lo que vive fuera del repo ───────────────────────────────────────────
 *
 * Los modelos y los dos entornos de Python están en `~/herramientas-audio/`
 * (o donde diga HERRAMIENTAS_AUDIO), igual que el JDK y el SDK de Android en
 * `~/herramientas-android/`. Son ~20 GB y no se versionan. Cómo se arman está
 * en el Historial del 19/10/2026. Son dos entornos porque qwen-tts y
 * chatterbox-tts fijan versiones distintas de `transformers`.
 */

import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");
const VOCES = path.join(AQUI, "voces");
const SALIDA = path.join(RAIZ, "audio-fuente", "voces");
const REPARTO = path.join(VOCES, "reparto.json");
const CANTOS = path.join(VOCES, "cantos.json");

const AUDIO = process.env.HERRAMIENTAS_AUDIO || path.join(os.homedir(), "herramientas-audio");
const PY_QWEN = path.join(AUDIO, "venv-qwen", "bin", "python");
const PY_CHATTERBOX = path.join(AUDIO, "venv-chatterbox", "bin", "python");

const ENTORNO = {
  ...process.env,
  HF_HOME: path.join(AUDIO, "hf"),
  HF_HUB_DISABLE_TELEMETRY: "1",
  PATH: `${path.join(AUDIO, "bin")}:${process.env.PATH}`, // el ffmpeg de ahí
};

function correr(python, script, args) {
  const r = spawnSync(python, ["-I", path.join(VOCES, script), ...args], { stdio: "inherit", env: ENTORNO });
  if (r.status !== 0) {
    console.error(`\n${script} terminó mal (código ${r.status}).`);
    process.exit(1);
  }
}

const reparto = JSON.parse(readFileSync(REPARTO, "utf8"));
const ids = reparto.voces.map((v) => v.id);
const args = process.argv.slice(2);
const soloPagina = args.includes("--pagina");
// --candidatas N: N versiones de cada voz pedida, sin tocar su referencia.
const iCandidatas = args.indexOf("--candidatas");
const candidatas = iCandidatas >= 0 ? Number(args[iCandidatas + 1]) : 0;
if (iCandidatas >= 0 && !(Number.isInteger(candidatas) && candidatas >= 1 && candidatas <= 12)) {
  console.error("--candidatas va con un número del 1 al 12.");
  process.exit(1);
}
const pedidos = args.filter((a, i) => !a.startsWith("--") && !(iCandidatas >= 0 && i === iCandidatas + 1));

// El id termina siendo una carpeta: sólo se aceptan los del reparto, tal cual.
const desconocidos = pedidos.filter((p) => !ids.includes(p));
if (desconocidos.length) {
  console.error(`No conozco: ${desconocidos.join(", ")}\nLos que hay: ${ids.join(", ")}`);
  process.exit(1);
}

const pagina = () => correr(PY_CHATTERBOX, "pagina.py", [REPARTO, CANTOS, SALIDA]);

if (soloPagina) {
  pagina();
  process.exit(0);
}

for (const py of [PY_QWEN, PY_CHATTERBOX]) {
  if (!existsSync(py)) {
    console.error(`Falta ${py}.\nLas herramientas de audio se arman como dice el Historial del 19/10/2026.`);
    process.exit(1);
  }
}

const tanda = pedidos.length ? ids.filter((id) => pedidos.includes(id)) : ids;
const inicio = Date.now();
if (candidatas) {
  if (!pedidos.length) {
    console.error("--candidatas necesita decir de quién: node herramientas/generar-voces.mjs --candidatas 4 la-nelly");
    process.exit(1);
  }
  correr(PY_QWEN, "referencias.py", [REPARTO, SALIDA, "--candidatas", String(candidatas), ...tanda]);
  correr(PY_CHATTERBOX, "parecidos.py", [REPARTO, SALIDA, "--candidatas"]);
  pagina();
  process.exit(0);
}
correr(PY_QWEN, "referencias.py", [REPARTO, SALIDA, ...tanda]);
correr(PY_CHATTERBOX, "parecidos.py", [REPARTO, SALIDA]);
if (args.includes("--referencias")) process.exit(0);
for (const id of tanda) {
  console.log(`\n── ${id} (${Math.round((Date.now() - inicio) / 60000)} min)`);
  correr(PY_CHATTERBOX, "cantar.py", [REPARTO, CANTOS, SALIDA, id]);
  pagina();
}
console.log(`\nListo en ${Math.round((Date.now() - inicio) / 60000)} min: ${path.relative(RAIZ, path.join(SALIDA, "index.html"))}`);
