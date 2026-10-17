/**
 * ARRANQUES EN FRÍO: cierra la app del todo, la vuelve a abrir, y mide los
 * primeros minutos mientras `jugar-celular.mjs` entra rápido a Partida rápida
 * y juega.
 *
 *     node herramientas/arranques-en-frio.mjs [--vueltas 10] [--minutos 2] [--ramas A,SC1]
 *     node herramientas/arranques-en-frio.mjs --modos ninguno,hw,sw,prerraster [--ramas PC]
 *
 * `--modos` turna cómo dibuja Android el WebView, una forma por vuelta, con un
 * interruptor de laboratorio en `MainActivity.java` que leía `truco_pintado`
 * del Intent, sólo en debug. SE SACÓ el 11/10/2026 después de medir (ningún
 * modo sirvió: ver `Historial.md`), así que hoy `--modos` corta en la primera
 * vuelta con "no se aplicó". Para volver a usarlo, se repone el interruptor:
 * el código está en esa entrada del historial. El tramo pasa a llamarse `<modo>-<n>`, y cada vuelta confirma en
 * el `logcat` que el modo se aplicó: medir un modo creyendo que es otro sería
 * peor que no medir.
 *
 * Cada vuelta es UNA sesión de `medir-celular.mjs` (una sesión no sobrevive a
 * que la app cambie de proceso), con el tramo `<rama>-<n>`. Las ramas de CSS
 * se turnan una por vuelta. Al final imprime el comando de `--pixeles` con
 * todas las carpetas y `--por-tramo`.
 *
 * ── Por qué existe (11/10/2026) ───────────────────────────────────────────
 *
 * Con el arreglo de la mano puesto, el jugador automático no encontró basura
 * jugando con la app ya caliente, y Santiago sí la vio jugando apenas había
 * instalado el APK: la primera vez el teléfono compila todo de cero. Lo pidió
 * él: "haz que salga y entre de la app y vaya rápido a partida rápida".
 *
 * ── Lo que cuida ──────────────────────────────────────────────────────────
 *
 *  · `am force-stop` es sobre NUESTRA app y nada más: no toca otras apps ni
 *    los datos (el progreso de la gira queda).
 *  · Los toques son los de `jugar-celular.mjs`, con su cerrojo: sólo adentro de
 *    la app, y nunca desbloquea.
 *  · Entre vuelta y vuelta pasan ~10 s: el teléfono no llega a dormirse.
 */

import { spawn } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import path from "node:path";

import { adb, ACTIVIDAD, elCelular, enPrimerPlano, PAQUETE } from "./celular-usb.mjs";

const morir = (...m) => { console.error("\n✗", ...m, "\n"); process.exit(1); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const numero = (bandera, porOmision, max) => {
  const i = args.indexOf(bandera);
  const v = i === -1 ? NaN : Number(args[i + 1]);
  return Number.isFinite(v) && v > 0 ? Math.min(max, v) : porOmision;
};
const vueltas = numero("--vueltas", 10, 40);
const minutos = numero("--minutos", 2, 10);
const iRamas = args.indexOf("--ramas");
const ramas = iRamas === -1 ? ["A"] : String(args[iRamas + 1] || "A").split(",").filter((r) => /^[A-Za-z][\w]{0,11}$/.test(r));
if (!ramas.length) morir("Uso:  node herramientas/arranques-en-frio.mjs [--vueltas 10] [--minutos 2] [--ramas A,SC1]");
const MODOS = ["ninguno", "hw", "sw", "prerraster"];
const iModos = args.indexOf("--modos");
const modos = iModos === -1 ? null : String(args[iModos + 1] || "").split(",").filter((m) => MODOS.includes(m));
if (modos && !modos.length) morir(`--modos acepta: ${MODOS.join(", ")}`);

elCelular();

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
    process.exit(130);
  });
}

console.log(`\n── ${vueltas} arranques en frío de ${minutos} min · ramas ${ramas.join(", ")}${modos ? ` · modos ${modos.join(", ")}` : ""}`);
const sesiones = [];
const cuenta = new Map();
for (let i = 0; i < vueltas; i++) {
  const rama = ramas[i % ramas.length];
  const modo = modos ? modos[i % modos.length] : null;
  const clave = modo ?? rama;
  const n = (cuenta.get(clave) ?? 0) + 1;
  cuenta.set(clave, n);
  const tramo = `${clave}-${n}`;
  console.log(`\n══ vuelta ${i + 1}/${vueltas}: ${tramo}`);

  adb("shell", "am", "force-stop", PAQUETE);
  await dormir(1000);
  adb("shell", "am", "start", "-n", ACTIVIDAD, ...(modo && modo !== "ninguno" ? ["--es", "truco_pintado", modo] : []));
  if (!(await esperarApp())) morir("La app no quedó arriba con el inspector en 60 s (¿se bloqueó el teléfono?).");
  if (modo && modo !== "ninguno") {
    // Sólo las líneas del proceso NUEVO de la app (no se borra el logcat del teléfono).
    const pid = (adb("shell", "pidof", PAQUETE).stdout || "").trim().split(/\s+/)[0];
    const log = /^\d+$/.test(pid) ? adb("logcat", "-d", `--pid=${pid}`, "-s", "TrucoPintado:I").stdout || "" : "";
    if (!log.includes(`laboratorio: ${modo}`)) morir(`El modo "${modo}" no se aplicó (¿el APK instalado es el de release, o uno sin el interruptor?).`);
    console.log(`   ▸ modo de pintado: ${modo} (confirmado en el logcat)`);
  }

  const medir = spawn("node", ["herramientas/medir-celular.mjs", "--sesion", String(minutos), "--jpeg", "90", "--tramo", tramo], { stdio: ["ignore", "pipe", "inherit"] });
  let sesion = null;
  await new Promise((ok) => {
    medir.stdout.on("data", (d) => {
      const s = d.toString();
      process.stdout.write(s);
      const m = /GRABANDO en (\S+)/.exec(s);
      if (m && !sesion) { sesion = m[1]; ok(); }
    });
    medir.on("exit", ok);
  });
  if (!sesion || !existsSync(sesion)) morir("La sesión no arrancó.");
  sesiones.push(sesion);
  // La rama va apenas arranca la sesión: la pantalla de carga tapa los primeros segundos.
  if (rama !== "A") appendFileSync(path.join(sesion, "control.txt"), `rama ${rama}\n`);

  const jugador = spawn("node", [
    "herramientas/jugar-celular.mjs", String(minutos), path.join(sesion, "jugador.log"), "--rapido", "--dedo", "--control", path.join(sesion, "control.txt"),
  ], { stdio: "inherit" });
  enCurso = [medir, jugador];
  await Promise.all([new Promise((ok) => medir.on("exit", ok)), new Promise((ok) => jugador.on("exit", ok))]);
  enCurso = null;
}

console.log(`\n✓ ${sesiones.length} arranques. Para contar la basura:\n`);
console.log(`  node herramientas/medir-celular.mjs --pixeles ${sesiones.join(" ")} --por-tramo --cada 1\n`);
