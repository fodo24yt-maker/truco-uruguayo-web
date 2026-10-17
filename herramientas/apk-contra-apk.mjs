/**
 * Un APK contra otro, en el teléfono: los instala por turno y, en cada
 * instalación, graba una sesión de `medir-celular.mjs` mientras juega
 * `jugar-celular.mjs`.
 *
 *     node herramientas/apk-contra-apk.mjs H=viejo.apk A=nuevo.apk --orden H,A,A,H,H,A [--minutos 4]
 *
 * Cada sesión lleva de nombre de tramo la etiqueta y su vuelta (H-1, A-1,
 * A-2…), así que al final alcanza con:
 *
 *     node herramientas/medir-celular.mjs --pixeles CARPETAS… --por-tramo
 *
 * que junta H-1, H-2… en H. El comando exacto lo imprime al terminar.
 *
 * ── Por qué existe (11/10/2026) ───────────────────────────────────────────
 *
 * Santiago volvió a ver los píxeles con el APK que traía el cambio de la mano
 * del 9/10, y había dicho que con el del 8/10 estaban arreglados. Ese cambio
 * es de JSX (la mano se monta y se desmonta), y las ramas de CSS en vivo de
 * `medir-celular` no lo pueden prender y apagar: hay que medir un APK contra
 * el otro, instalando por turno. Además así cada vuelta es un arranque en frío,
 * que es cuando Santiago dice que la basura sale más.
 *
 * ── Lo que cuida ──────────────────────────────────────────────────────────
 *
 *  · Instala con `celular-usb.mjs --instalar`, o sea con `-r`: si los dos APK
 *    los compiló esta máquina tienen la misma clave de depuración y el progreso
 *    de la gira queda. **Nunca desinstala.** Si las firmas no coinciden,
 *    `celular-usb` corta y explica.
 *  · Entre una sesión y la otra nadie toca el teléfono durante ~1 min (instalar
 *    y abrir): hay que tener el apagado de pantalla en 2 min o más, o se
 *    bloquea. No lo desbloquea nunca.
 *  · Los toques son los de `jugar-celular.mjs`, con su cerrojo: sólo adentro de
 *    la app.
 *  · Ctrl-C le pasa la señal a la sesión en curso, que guarda lo que tiene.
 */

import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { adb, elCelular, enPrimerPlano, PAQUETE } from "./celular-usb.mjs";

const morir = (...m) => { console.error("\n✗", ...m, "\n"); process.exit(1); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);

// ── Qué se compara ──────────────────────────────────────────────────────────

const apks = new Map();
for (const a of args) {
  const m = /^([A-Za-z][\w]{0,11})=(.+\.apk)$/.exec(a);
  if (!m) continue;
  if (!existsSync(m[2])) morir(`No existe ${m[2]}`);
  apks.set(m[1], m[2]);
}
const iOrden = args.indexOf("--orden");
const orden = iOrden === -1 ? [] : String(args[iOrden + 1] || "").split(",").filter(Boolean);
const iMin = args.indexOf("--minutos");
const minutos = Math.min(30, Math.max(1, Number(args[iMin + 1]) || 4));
if (apks.size < 2 || !orden.length || orden.some((x) => !apks.has(x))) {
  morir("Uso:  node herramientas/apk-contra-apk.mjs H=viejo.apk A=nuevo.apk --orden H,A,A,H,H,A [--minutos 4]");
}

const celular = elCelular();
const carpeta = path.join("capturas/celular", `apk-contra-apk-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}`);
mkdirSync(carpeta, { recursive: true });
const anotar = (linea) => appendFileSync(path.join(carpeta, "registro.txt"), `${new Date().toISOString()} ${linea}\n`);
console.log(`\n── ${apks.size} APK, ${orden.length} vueltas de ${minutos} min`);
anotar(`orden ${orden.join(",")} · ${minutos} min · ${[...apks.keys()].join(" ")}`);

// ── Una vuelta ──────────────────────────────────────────────────────────────

/** Espera a que la app esté arriba y su WebView publique el inspector. */
async function esperarApp() {
  for (let i = 0; i < 60; i++) {
    await dormir(1000);
    if (enPrimerPlano() !== PAQUETE) continue;
    const pid = (adb("shell", "pidof", PAQUETE).stdout || "").trim().split(/\s+/)[0];
    if (!/^\d+$/.test(pid)) continue;
    if (new RegExp(`@webview_devtools_remote_${pid}\\b`).test(adb("shell", "cat", "/proc/net/unix").stdout || "")) return true;
  }
  return false;
}

let enCurso = null;
for (const s of ["SIGINT", "SIGTERM"]) {
  process.on(s, () => {
    if (enCurso) for (const h of enCurso) h.kill(s);
    anotar(`cortado (${s})`);
    process.exit(130);
  });
}

const sesiones = [];
const vueltas = new Map();
for (const [i, etiqueta] of orden.entries()) {
  const n = (vueltas.get(etiqueta) ?? 0) + 1;
  vueltas.set(etiqueta, n);
  const tramo = `${etiqueta}-${n}`;
  console.log(`\n══ vuelta ${i + 1}/${orden.length}: ${tramo}`);

  const inst = spawnSync("node", ["herramientas/celular-usb.mjs", "--instalar", apks.get(etiqueta)], { stdio: "inherit" });
  if (inst.status !== 0) morir(`No se pudo instalar ${etiqueta}: corto acá para no medir el APK equivocado.`);
  anotar(`${tramo}: instalado`);
  if (!(await esperarApp())) morir("La app no quedó arriba con el inspector en 60 s (¿se bloqueó el teléfono?).");

  // La sesión primero: es la que levanta el puente que usa el jugador.
  const medir = spawn("node", ["herramientas/medir-celular.mjs", "--sesion", String(minutos), "--jpeg", "90", "--tramo", tramo], { stdio: ["ignore", "pipe", "inherit"] });
  let sesion = null;
  const listo = new Promise((ok) => {
    medir.stdout.on("data", (d) => {
      const s = d.toString();
      process.stdout.write(s);
      const m = /GRABANDO en (\S+)/.exec(s);
      if (m && !sesion) { sesion = m[1]; ok(); }
    });
    medir.on("exit", ok);
  });
  await listo;
  if (!sesion) morir("La sesión no arrancó.");
  sesiones.push(sesion);
  anotar(`${tramo}: sesión ${sesion}`);

  const jugador = spawn("node", [
    "herramientas/jugar-celular.mjs", String(minutos), path.join(sesion, "jugador.log"), "--variado", "--control", path.join(sesion, "control.txt"),
  ], { stdio: "inherit" });
  enCurso = [medir, jugador];
  await Promise.all([new Promise((ok) => medir.on("exit", ok)), new Promise((ok) => jugador.on("exit", ok))]);
  enCurso = null;
  anotar(`${tramo}: fin`);
}

console.log(`\n✓ ${sesiones.length} sesiones. Para contar la basura:\n`);
console.log(`  node herramientas/medir-celular.mjs --pixeles ${sesiones.join(" ")} --por-tramo\n`);
anotar(`fin: ${sesiones.join(" ")}`);
