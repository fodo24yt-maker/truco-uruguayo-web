/**
 * LA PANTALLA DE VERDAD: video del teléfono, contado cuadro por cuadro.
 *
 *     node herramientas/pantalla-real.mjs --grabar CARPETA MIN       graba la pantalla adentro de CARPETA/pantalla/
 *     FFMPEG=ruta node herramientas/pantalla-real.mjs --contar CARPETA [--guardar N]
 *
 * CARPETA es una sesión de `medir-celular.mjs` grabándose a la vez: de ahí
 * salen dónde está la escena en cada momento (`muestras.jsonl`), lo que pasó
 * en la mesa (`pagina.jsonl`) y los cuadros de Chromium para comparar.
 *
 * ── Por qué existe (11/10/2026) ───────────────────────────────────────────
 *
 * Con el jugador automático, la captura de Chromium (`Page.startScreencast`)
 * no encontró basura en el APK del día (0 bloques en 1763 cuadros), y
 * Santiago la sigue viendo sobre las cartas de su mano, "un ratito". Esa
 * captura es lo que Chromium dibuja ADENTRO del WebView; lo que llega a los
 * ojos pasa además por la composición de Android. Esto graba lo segundo:
 * `screenrecord` es la salida de la pantalla, hasta 60 cuadros por segundo
 * (graba sólo cuando algo cambia; en la mesa sale ~12 de promedio).
 *
 * ── Qué cuida ─────────────────────────────────────────────────────────────
 *
 *  · El video vive en `/data/local/tmp` del teléfono (el lugar de adb, no las
 *    fotos ni los archivos de la persona) sólo mientras se graba un tramo: se
 *    baja y se borra enseguida.
 *  · El video comprime de a bloques de 4×4 alineados al (0,0) de la imagen, y
 *    eso podría fabricar "cuadraditos". La basura del bug cae en la grilla de
 *    la capa de la mesa, que arranca en el borde de arriba de la escena. Por
 *    eso hay DOS controles: la grilla corrida 2 px en x e y (el de siempre), y
 *    la del códec (sólo corrida en y). Si alguno sube, se está contando
 *    compresión y no basura.
 *  · `ffmpeg` NO es dependencia del proyecto (pesa 70 MB y el CI no lo
 *    necesita): se le pasa la ruta en `FFMPEG`. El 11/10 se sacó del paquete
 *    `imageio-ffmpeg` de PyPI, a una carpeta del temporal.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

import { bloquesPlanosDe } from "./bloques.mjs";
import { adb, ADB } from "./celular-usb.mjs";
import { ZONAS_MESA } from "./medir-celular.mjs";

const morir = (...m) => { console.error("\n✗", ...m, "\n"); process.exit(1); };
const args = process.argv.slice(2);
const leerJsonl = (f) => existsSync(f)
  ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
  : [];
const horaTel = () => Number((adb("shell", "date", "+%s%3N").stdout || "").trim());

// ── Grabar ──────────────────────────────────────────────────────────────────

/* Tramos de 170 s: `screenrecord` no deja más de 180. Entre tramo y tramo se
   pierden los segundos de bajar el video; se anota todo para saberlo. */
const TRAMO_S = 170;
const EN_TELEFONO = "/data/local/tmp/truco-pantalla.mp4";

function grabar(carpeta, minutos) {
  if (!existsSync(carpeta)) morir(`No existe ${carpeta}`);
  const destino = path.join(carpeta, "pantalla");
  mkdirSync(destino, { recursive: true });
  const fin = Date.now() + minutos * 60000;
  for (let k = 1; Date.now() < fin; k++) {
    if (existsSync(path.join(carpeta, "control.txt")) && /^parar$/m.test(readFileSync(path.join(carpeta, "control.txt"), "utf8"))) break;
    const segundos = Math.max(5, Math.min(TRAMO_S, Math.round((fin - Date.now()) / 1000)));
    const t0 = horaTel();
    const r = adb("shell", "screenrecord", "--bit-rate", "24000000", "--time-limit", String(segundos), EN_TELEFONO);
    const t1 = horaTel();
    const video = spawnSync(ADB, ["exec-out", "cat", EN_TELEFONO], { maxBuffer: 2 * 1024 * 1024 * 1024 });
    adb("shell", "rm", "-f", EN_TELEFONO);
    const nombre = String(k).padStart(2, "0");
    if (!video.stdout?.length) { console.log(`   ✗ tramo ${k}: el teléfono no devolvió video (${(r.stderr || "").trim().slice(0, 120)})`); continue; }
    writeFileSync(path.join(destino, `${nombre}.mp4`), video.stdout);
    writeFileSync(path.join(destino, `${nombre}.json`), JSON.stringify({ t0, t1, segundos }));
    console.log(`   ▸ pantalla ${nombre}: ${segundos} s, ${(video.stdout.length / 1e6).toFixed(1)} MB`);
  }
}

// ── Contar ──────────────────────────────────────────────────────────────────

/** Decodifica un video y llama a `cada(rgb, pts)` con cada cuadro, en orden.
    De a uno y esperando: `for await` frena a ffmpeg mientras se analiza, así
    que no se juntan en memoria cuadros de 3,4 MB sin mirar. */
async function cuadrosDe(ffmpeg, video, W, H, cada) {
  const p = spawn(ffmpeg, ["-hide_banner", "-loglevel", "info", "-i", video, "-vf", "showinfo", "-vsync", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"]);
  const pts = [];
  let resto = "";
  let cerrado = false;
  p.stderr.on("data", (d) => {
    resto += d.toString();
    const lineas = resto.split("\n");
    resto = lineas.pop();
    for (const l of lineas) { const m = /pts_time:([\d.]+)/.exec(l); if (m) pts.push(Number(m[1])); }
  });
  p.stderr.on("close", () => { cerrado = true; });
  // La línea de showinfo suele llegar antes que el cuadro, pero no está garantizado.
  const ptsDe = async (i) => {
    for (let k = 0; k < 200 && pts[i] === undefined && !cerrado; k++) await new Promise((r) => setTimeout(r, 10));
    return pts[i] ?? (i > 0 ? pts[i - 1] : 0);
  };
  const tam = W * H * 3;
  let buf = Buffer.alloc(0);
  let n = 0;
  for await (const d of p.stdout) {
    buf = buf.length ? Buffer.concat([buf, d]) : d;
    while (buf.length >= tam) {
      const cuadro = Buffer.from(buf.subarray(0, tam));
      buf = buf.subarray(tam);
      const i = n++;
      await cada(cuadro, await ptsDe(i));
    }
  }
  return n;
}

/** Gris a 1/8, para comparar cuadros entre la pantalla y Chromium. */
const chico = (rgb, W, H) => {
  const w = W >> 3, h = H >> 3, out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((y << 3) * W + (x << 3)) * 3;
    out[y * w + x] = (rgb[i] + rgb[i + 1] + rgb[i + 2]) / 3;
  }
  return out;
};
const distancia = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };

async function contar(carpeta) {
  const ffmpeg = process.env.FFMPEG;
  if (!ffmpeg || !existsSync(ffmpeg)) morir("Falta FFMPEG=ruta-al-ffmpeg (no es dependencia del proyecto; ver el encabezado).");
  const dir = path.join(carpeta, "pantalla");
  const videos = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".mp4")).sort() : [];
  if (!videos.length) morir(`${dir} no tiene videos.`);
  const muestras = leerJsonl(path.join(carpeta, "muestras.jsonl")).sort((a, b) => a.ahora - b.ahora);
  const cuadrosChromium = leerJsonl(path.join(carpeta, "cuadros.jsonl")).sort((a, b) => a.t - b.t);
  const pagina = leerJsonl(path.join(carpeta, "pagina.jsonl"));
  let bloquesChromium = [];
  const bj = path.join(carpeta, "pixeles", "bloques.jsonl");
  if (existsSync(bj)) bloquesChromium = leerJsonl(bj).filter((x) => x.bloques.length);
  const guardar = Number(args[args.indexOf("--guardar") + 1]) || 0;
  const salida = path.join(carpeta, "pantalla", "conteo");
  mkdirSync(salida, { recursive: true });

  const muestraEn = (t) => { let m = null; for (const x of muestras) { if (x.ahora > t) break; m = x; } return m; };
  const zonaDe = (m, cx, cy) => {
    for (const margen of [0, 16]) for (const [nombre] of ZONAS_MESA)
      for (const [x, y, w, h] of m.zonas?.[nombre] ?? [])
        if (cx >= x - margen && cx <= x + w + margen && cy >= y - margen && cy <= y + h + margen) return margen ? `cerca de ${nombre}` : nombre;
    return "otro";
  };

  const total = { cuadros: 0, sucios: 0, nacen: 0, ctl: 0, ctlCodec: 0, zonas: new Map() };
  const nacimientos = [];
  for (const v of videos) {
    const meta = JSON.parse(readFileSync(path.join(dir, v.replace(".mp4", ".json")), "utf8"));
    const info = spawnSync(ffmpeg, ["-hide_banner", "-i", path.join(dir, v)], { encoding: "utf8" }).stderr;
    const [, W, H] = /Video:.*?(\d{3,4})x(\d{3,4})/.exec(info).map(Number);

    /* EL RELOJ. `t0` se anota justo antes de arrancar `screenrecord`, pero el
       primer cuadro sale un rato después. Se alinea comparando cuadros del
       video contra los de Chromium (que traen la hora del teléfono): para unos
       cuantos cuadros, el corrimiento que mejor coincide, y la mediana. */
    const muestrasReloj = [];
    let iReloj = 0;
    await cuadrosDe(ffmpeg, path.join(dir, v), W, H, async (rgb, pts) => {
      if (iReloj++ % 40 !== 0) return;
      const t = meta.t0 + pts * 1000;
      const a = chico(rgb, W, H);
      let mejor = [Infinity, 0];
      for (const c of cuadrosChromium) {
        if (c.t < t - 1000 || c.t > t + 6000) continue;
        const k = await sharp(path.join(carpeta, "cuadros", c.f)).removeAlpha().raw().toBuffer();
        const d = distancia(a, chico(k, W, H));
        if (d < mejor[0]) mejor = [d, c.t - t];
      }
      if (mejor[0] < 6) muestrasReloj.push(mejor[1]);
    });
    muestrasReloj.sort((a, b) => a - b);
    const corrimiento = muestrasReloj.length ? muestrasReloj[Math.floor(muestrasReloj.length / 2)] : 0;
    console.log(`   ${v}: ${W}x${H} · reloj corrido ${corrimiento} ms (de ${muestrasReloj.length} coincidencias)`);

    const vistos = new Map();
    await cuadrosDe(ffmpeg, path.join(dir, v), W, H, async (rgb, pts) => {
      const t = meta.t0 + pts * 1000 + corrimiento;
      const m = muestraEn(t);
      if (!m || !m.ruta?.startsWith("/jugar/mesa") || m.carga || !m.escena) return;
      const esc = W / 360;
      const y0 = Math.round(m.escena[1] * esc), y1 = Math.round((m.escena[1] + m.escena[3]) * esc);
      const bs = bloquesPlanosDe(rgb, W, H, 0, y0 % 4, y0, y1);
      const ctl = bloquesPlanosDe(rgb, W, H, 2, (y0 + 2) % 4, y0, y1).length;
      const ctlCodec = bloquesPlanosDe(rgb, W, H, 0, (y0 + 2) % 4, y0, y1).length;
      total.cuadros++;
      total.ctl += ctl;
      total.ctlCodec += ctlCodec;
      if (bs.length) total.sucios++;
      for (const b of bs) {
        const k = `${b.x},${b.y}`;
        const zona = zonaDe(m, (b.x + 2) / esc, (b.y + 2) / esc);
        if (!(t - (vistos.get(k) ?? -Infinity) < 1000)) {
          total.nacen++;
          total.zonas.set(zona, (total.zonas.get(zona) ?? 0) + 1);
          // ¿Lo vio Chromium? Un bloque en el mismo lugar (±4 px) a ±600 ms.
          const visto = bloquesChromium.some((f) => Math.abs(f.t - t) < 600 && f.bloques.some((x) => Math.abs(x.x - b.x) <= 4 && Math.abs(x.y - b.y) <= 4));
          nacimientos.push({ t: Math.round(t), video: v, pts, x: b.x, y: b.y, rgb: b.rgb, zona, chromium: visto });
          if (nacimientos.length <= guardar) {
            const x0 = Math.max(0, b.x - 60), yy0 = Math.max(0, b.y - 60);
            await sharp(rgb, { raw: { width: W, height: H, channels: 3 } })
              .extract({ left: x0, top: yy0, width: Math.min(124, W - x0), height: Math.min(124, H - yy0) })
              .resize(496, 496, { kernel: "nearest" }).png()
              .toFile(path.join(salida, `${String(nacimientos.length).padStart(3, "0")}-${zona.replace(/\W+/g, "_")}.png`));
          }
        }
        vistos.set(k, t);
      }
    });
  }

  /* Después de qué nace, con los mismos sucesos que `medir-celular --pixeles`:
     el último suceso de la mesa o toque antes de cada nacimiento. */
  const sucesos = pagina.filter((e) => (e.tipo === "mesa" || e.tipo === "toque") && typeof e.origen === "number")
    .map((e) => ({ t: e.origen + e.t, que: e.tipo === "mesa" ? e.que : `toque ${e.quien || ""}`.slice(0, 40) }))
    .sort((a, b) => a.t - b.t);
  for (const n of nacimientos) {
    const antes = sucesos.filter((s) => s.t <= n.t).pop();
    n.despuesDe = antes ? `${antes.que} (${((n.t - antes.t) / 1000).toFixed(1)} s)` : "—";
  }
  writeFileSync(path.join(salida, "nacimientos.json"), JSON.stringify(nacimientos, null, 1));

  const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) : "—");
  console.log(`\n── La pantalla de verdad (screenrecord) · ${carpeta}`);
  console.log(`   ${total.cuadros} cuadros en la mesa · ${total.sucios} sucios (${pct(total.sucios, total.cuadros)}%) · nacen ${total.nacen} (${pct(total.nacen, total.cuadros)} c/100)`);
  console.log(`   controles por cuadro: grilla corrida ${(total.ctl / (total.cuadros || 1)).toFixed(3)} · grilla del códec ${(total.ctlCodec / (total.cuadros || 1)).toFixed(3)}`);
  console.log(`   dónde nacen: ${[...total.zonas].sort((a, b) => b[1] - a[1]).map(([z, n]) => `${z} ${n}`).join(" · ") || "—"}`);
  const vistos = nacimientos.filter((n) => n.chromium).length;
  console.log(`   de esos, los vio también Chromium: ${vistos} de ${nacimientos.length}`);
  for (const n of nacimientos.slice(0, 30)) console.log(`     ${n.video} ${n.pts.toFixed(2)} s · ${n.x},${n.y} ${n.zona} rgb(${n.rgb}) · después de ${n.despuesDe}${n.chromium ? " · Chromium también" : ""}`);
  console.log(`\n   todo en ${salida}\n`);
}

// ── Andar ───────────────────────────────────────────────────────────────────

if (args.includes("--grabar")) {
  const i = args.indexOf("--grabar");
  grabar(args[i + 1], Math.min(60, Number(args[i + 2]) || 5));
} else if (args.includes("--contar")) {
  await contar(args[args.indexOf("--contar") + 1]);
} else {
  console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(0, 6).join("\n"));
}
