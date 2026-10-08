/**
 * El puente al inspector del WebView del celular.
 *
 *     import { abrirDevtools, cerrarDevtools } from "./puente-devtools.mjs";
 *     const url = await abrirDevtools();   // http://<ip>:9223
 *     const nav = await chromium.connectOverCDP(url);
 *
 * Vivía adentro de `rig-celular.mjs`. Desde el 7/10/2026 está acá porque
 * también lo usa `medir-celular.mjs`, y un puente escrito dos veces termina
 * cerrándose bien en una y mal en la otra (es la misma razón por la que
 * `enPrimerPlano()` pasó a `celular-usb.mjs`).
 *
 * ── Para qué hace falta ───────────────────────────────────────────────────
 *
 * `adb.exe` es un programa de Windows, así que el `adb forward` deja el puerto
 * de DevTools atado al `127.0.0.1` de WINDOWS, que WSL no ve. El puente es un
 * reenviador de una línea que corre con el `node.exe` de Windows.
 *
 * Anda con el APK de DEPURACIÓN de siempre (`celular-usb.mjs --apk`): ahí el
 * WebView publica el inspector aunque `capacitor.config.ts` diga `false`
 * (medido el 7/10/2026). Con el de release no anda, y está bien que no ande.
 *
 * ── Lo que no se negocia ──────────────────────────────────────────────────
 *
 * 1. **Se ata a UNA dirección**, la de la placa de WSL, y no a `0.0.0.0`. El
 *    inspector puede ejecutar JavaScript adentro de la app y leerle el
 *    `localStorage`, donde vive la gira: en todas las interfaces quedaba
 *    abierto a cualquiera en el mismo wifi (arreglado el 8/9).
 * 2. **Se apaga solo a los 30 minutos**, para el `kill -9`, que no hay
 *    manejador que atrape.
 * 3. **Se cierra al salir el proceso, también por `process.exit`**, que no
 *    ejecuta los `finally` (lo encontró la revisión de seguridad del 10/9).
 *    Importar este archivo ya deja puesto ese gancho.
 * 4. **Se conecta al WebView DE LA APP y a ningún otro.** El socket lleva el
 *    PID del proceso (`webview_devtools_remote_<pid>`), y se elige el del PID
 *    de `uy.trucouruguayo.app`. Antes se tomaba el primero que apareciera: con
 *    otra app depurable abierta, el rig se podía meter en ella (7/10/2026).
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { adb, PAQUETE } from "./celular-usb.mjs";

const morir = (...m) => { console.error("\n✗", ...m, "\n"); process.exit(1); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const variableDeWindows = (n) => {
  const r = spawnSync("/mnt/c/Windows/System32/cmd.exe", ["/c", `echo %${n}%`], { encoding: "utf8" });
  const v = (r.stdout || "").trim();
  return v && v !== `%${n}%` ? v : null;
};
const aLinux = (p) => spawnSync("wslpath", ["-u", p], { encoding: "utf8" }).stdout.trim();
const aWindows = (p) => spawnSync("wslpath", ["-w", p], { encoding: "utf8" }).stdout.trim();

/** La IP con la que WSL ve a Windows. Sale de la ruta por omisión. */
function ipDeWindows() {
  const r = spawnSync("ip", ["route", "show", "default"], { encoding: "utf8" });
  return /default via (\S+)/.exec(r.stdout || "")?.[1] ?? null;
}

/** El PID del proceso de la app, o `null` si no está corriendo. */
export function pidDeLaApp() {
  const pid = (adb("shell", "pidof", PAQUETE).stdout || "").trim().split(/\s+/)[0];
  return /^\d+$/.test(pid) ? pid : null;
}

let puente = null;
let guionDelPuente = null;
let reenviado = false;

/** Levanta el puente y devuelve la URL para `connectOverCDP`. */
export async function abrirDevtools() {
  const pid = pidDeLaApp();
  if (!pid) morir("La app no está abierta en el celular: abrila y volvé a correr esto.");

  /* El socket lo publica el WebView, y su nombre lleva el PID del proceso.
     Sale de /proc/net/unix, que es lo que hace `chrome://inspect`. */
  const unix = adb("shell", "cat", "/proc/net/unix").stdout || "";
  const socket = `webview_devtools_remote_${pid}`;
  if (!new RegExp(`@${socket}\\b`).test(unix)) {
    morir(
      "El WebView de la app no publica DevTools.\n",
      " ¿Es un APK de release? Sólo el de depuración lo publica:\n",
      "   node herramientas/celular-usb.mjs --apk",
    );
  }
  adb("forward", "tcp:9222", `localabstract:${socket}`);
  reenviado = true;

  const nodeWin = "/mnt/c/Program Files/nodejs/node.exe";
  if (!existsSync(nodeWin)) morir("No encuentro el node.exe de Windows, que es el que hace de puente.");

  const ip = ipDeWindows();
  if (!ip) morir("No pude averiguar con qué IP ve WSL a Windows.");

  const tmp = aLinux(variableDeWindows("TEMP"));
  const guion = path.join(tmp, "puente-cdp-truco.js");
  writeFileSync(guion, `const net=require("net");net.createServer(a=>{const b=net.connect(9222,"127.0.0.1");a.pipe(b);b.pipe(a);a.on("error",()=>b.destroy());b.on("error",()=>a.destroy());}).listen(9223,${JSON.stringify(ip)});setTimeout(()=>process.exit(0),30*60000);\n`);
  guionDelPuente = guion;
  puente = spawn(nodeWin, [aWindows(guion)], { stdio: "ignore", detached: false });

  const url = `http://${ip}:9223`;
  for (let i = 0; i < 20; i++) {
    await dormir(300);
    try {
      const r = await fetch(`${url}/json/version`, { signal: AbortSignal.timeout(1500) });
      if (r.ok) return url;
    } catch { /* todavía no levantó */ }
  }
  morir("El puente a DevTools no levantó.");
}

/** Cierra el puente. Es síncrono e idempotente: se puede llamar de más. */
export function cerrarDevtools() {
  if (puente) { puente.kill(); puente = null; }
  if (guionDelPuente) { rmSync(guionDelPuente, { force: true }); guionDelPuente = null; }
  if (reenviado) { adb("forward", "--remove", "tcp:9222"); reenviado = false; }
}

/* `exit` corre también después de `process.exit()`, que no ejecuta los
   `finally`. Las señales (Ctrl-C, `pkill`) las maneja cada herramienta,
   porque cada una tiene algo propio que guardar antes de irse; las dos que
   existen terminan en `process.exit`, que pasa por acá. */
process.on("exit", cerrarDevtools);
