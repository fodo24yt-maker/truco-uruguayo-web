/**
 * La milonga hecha por código: uno de los temas de la música de fondo.
 *
 *     node herramientas/musica/sintetizada.mjs audio-fuente/musica/cata/por-codigo.wav
 *
 * Salió de la cata de música del 21/10/2026 y Santiago la aprobó junto con las
 * de IA. El WAV que escribe lo toma `herramientas/publicar-musica.mjs`.
 *
 * Todo sale de este archivo: no hay una sola muestra de sonido de nadie. Es el
 * mismo criterio que la mesa, que la dibuja nuestro código.
 *
 * - La guitarra criolla: Karplus-Strong (una línea de retardo que se realimenta
 *   promediando, que es como suena una cuerda pulsada). Nylon = excitación
 *   filtrada, sin brillo.
 * - El bordoneo: el bajo en 3-3-2 sobre las semicorcheas del 2/4 de la milonga.
 * - El bandoneón: dos lengüetas desafinadas apenas, más la octava de abajo,
 *   con vibrato y fuelle (ataque lento).
 * - Bombo y chasquido, despacito.
 * - Reverb tipo Freeverb (peines + pasatodos), y la cola se suma al principio
 *   para que al repetir no haya salto.
 */
import { writeFileSync } from "node:fs";
import { azarCon, entre } from "../escena/azar.mjs";

const SR = 44100;
const BPM = 104;
const NEGRA = 60 / BPM;
const SEMI = NEGRA / 4; // semicorchea
const COMPAS = NEGRA * 2; // 2/4
const COMPASES = 32;
const LARGO = COMPAS * COMPASES; // ~36,9 s
const COLA = 4;
const N = Math.ceil((LARGO + COLA) * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const azar = azarCon(19102026);

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
// La menor armónica. Los acordes, como notas MIDI (bajo, quinta, y las de arriba).
const ACORDES = {
  Am: { bajo: 45, quinta: 52, arriba: [57, 60, 64] },
  Dm: { bajo: 50, quinta: 45, arriba: [57, 62, 65] },
  E7: { bajo: 40, quinta: 47, arriba: [56, 62, 64] },
  F: { bajo: 41, quinta: 48, arriba: [57, 60, 65] },
};
const FORMA = [
  ..."Am Am E7 E7 E7 E7 Am Am Am Am Dm Dm E7 E7 Am Am".split(" "),
  ..."Dm Dm Am Am E7 E7 Am Am F F E7 E7 Dm E7 Am Am".split(" "),
];

function poner(desde, muestras, ganancia, paneo) {
  const i0 = Math.floor(desde * SR);
  const gl = ganancia * Math.cos((paneo + 1) * Math.PI / 4);
  const gr = ganancia * Math.sin((paneo + 1) * Math.PI / 4);
  for (let i = 0; i < muestras.length && i0 + i < N; i++) {
    L[i0 + i] += muestras[i] * gl;
    R[i0 + i] += muestras[i] * gr;
  }
}

/** Una cuerda de nylon pulsada. */
function cuerda(f, segundos, brillo = 0.5) {
  const largo = Math.round(SR / f);
  const linea = new Float32Array(largo);
  let previo = 0;
  for (let i = 0; i < largo; i++) {
    // ruido filtrado: cuanto menos brillo, más pasa-bajos (el nylon no chilla)
    const r = azar() * 2 - 1;
    previo = previo + (1 - brillo) * 0.9 * (r - previo) + brillo * 0.1 * r;
    linea[i] = previo;
  }
  const out = new Float32Array(Math.floor(segundos * SR));
  const perdida = 0.4985 * (1 - 0.0009 * (f / 110));
  let j = 0;
  for (let i = 0; i < out.length; i++) {
    const a = linea[j];
    const b = linea[(j + 1) % largo];
    linea[j] = (a + b) * perdida;
    out[i] = a;
    j = (j + 1) % largo;
  }
  // ataque de uña muy corto y que se apague al final
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] *= Math.min(1, t / 0.002) * Math.min(1, (segundos - t) / 0.08);
  }
  return out;
}

/** Bandoneón: lengüetas (diente de sierra suavizado) con fuelle y vibrato. */
function bandoneon(f, segundos) {
  const out = new Float32Array(Math.floor(segundos * SR));
  const fases = [0, 0, 0];
  const voces = [f * 1.003, f * 0.997, f / 2];
  const pesos = [0.45, 0.45, 0.35];
  let filtro = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const vibrato = 1 + 0.004 * Math.sin(2 * Math.PI * 5.2 * t) * Math.min(1, t / 0.4);
    let s = 0;
    for (let k = 0; k < 3; k++) {
      fases[k] = (fases[k] + (voces[k] * vibrato) / SR) % 1;
      const p = fases[k];
      // un pulso con poco brillo: más "lengüeta" que sierra
      s += pesos[k] * (p < 0.42 ? 1 : -1) * 0.6 + pesos[k] * (2 * p - 1) * 0.4;
    }
    filtro += 0.11 * (s - filtro); // pasa-bajos: el fuelle no es una radio
    const fuelle = Math.min(1, t / 0.09) * Math.min(1, (segundos - t) / 0.12);
    out[i] = filtro * fuelle;
  }
  return out;
}

function bombo(segundos = 0.45) {
  const out = new Float32Array(Math.floor(segundos * SR));
  let fase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 48 + 40 * Math.exp(-t * 30);
    fase += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(fase) * Math.exp(-t * 7) + (azar() * 2 - 1) * 0.05 * Math.exp(-t * 200);
  }
  return out;
}

function chasquido(segundos = 0.05) {
  const out = new Float32Array(Math.floor(segundos * SR));
  let a = 0;
  let b = 0;
  for (let i = 0; i < out.length; i++) {
    const r = azar() * 2 - 1;
    a += 0.5 * (r - a);
    b = r - a; // pasa-altos rústico
    out[i] = b * Math.exp(-(i / SR) * 90);
  }
  return out;
}

// ── la partitura ───────────────────────────────────────────────────────────
// Melodía: notas del acorde y de la escala, en el ritmo 3-3-2, con frases de
// dos compases que terminan en la fundamental. Entra en el compás 9.
const ESCALA = [57, 59, 60, 62, 64, 65, 68, 69, 71, 72, 74, 76];
let nota = 64;
FORMA.forEach((nombre, c) => {
  const a = ACORDES[nombre];
  const t0 = c * COMPAS;
  // bordoneo 3-3-2: fundamental, quinta, fundamental (la tercera más suave)
  const bajos = [a.bajo, a.quinta, a.bajo + (c % 2 ? 12 : 0)];
  [0, 3, 6].forEach((s, k) =>
    poner(t0 + s * SEMI + entre(azar, 0, 0.008), cuerda(hz(bajos[k]), 1.2, 0.35), [0.55, 0.42, 0.38][k], -0.05),
  );
  // rasgueo suave en el tiempo 2 (y un rasguido chico a contratiempo)
  [4, 7].forEach((s, k) =>
    a.arriba.forEach((m, i) =>
      poner(t0 + s * SEMI + i * 0.014 + entre(azar, 0, 0.006), cuerda(hz(m), 0.9, 0.45), k ? 0.1 : 0.16, -0.35),
    ),
  );
  poner(t0, bombo(), 0.32, 0);
  poner(t0 + 4 * SEMI, chasquido(), 0.1, 0.25);

  if (c >= 8) {
    const final = c % 2 === 1;
    const lugares = final ? [0, 3] : [0, 3, 6];
    lugares.forEach((s, k) => {
      if (!final && azar() < 0.18) return; // un silencio de vez en cuando
      if (final && k === lugares.length - 1) {
        nota = a.arriba[0]; // cierra en la nota del acorde
      } else {
        const cerca = ESCALA.filter((m) => Math.abs(m - nota) <= 4 && m !== nota);
        const delAcorde = cerca.filter((m) => a.arriba.some((x) => (x - m) % 12 === 0));
        const pool = delAcorde.length && azar() < 0.6 ? delAcorde : cerca;
        nota = pool[Math.floor(azar() * pool.length)];
      }
      const dura = final && k === lugares.length - 1 ? 5 * SEMI + 0.25 : (s === 6 ? 2 : 3) * SEMI * 0.95;
      poner(t0 + s * SEMI, bandoneon(hz(nota), dura + 0.1), 0.2, 0.3);
    });
  }
});

// ── reverb (Freeverb chico) ───────────────────────────────────────────────
function reverb(x, corrimiento) {
  const peines = [1116, 1188, 1277, 1356].map((n) => ({ b: new Float32Array(n + corrimiento), i: 0, f: 0 }));
  const pasatodos = [556, 441].map((n) => ({ b: new Float32Array(n + corrimiento), i: 0 }));
  const y = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let s = 0;
    for (const p of peines) {
      const v = p.b[p.i];
      p.f = v * 0.7 + p.f * 0.3; // amortiguado
      p.b[p.i] = x[n] * 0.015 + p.f * 0.8;
      p.i = (p.i + 1) % p.b.length;
      s += v;
    }
    for (const a of pasatodos) {
      const v = a.b[a.i];
      a.b[a.i] = s + v * 0.5;
      a.i = (a.i + 1) % a.b.length;
      s = v - s;
    }
    y[n] = s;
  }
  return y;
}
const rl = reverb(L, 0);
const rr = reverb(R, 23);
for (let n = 0; n < N; n++) {
  L[n] += rl[n] * 0.9;
  R[n] += rr[n] * 0.9;
}

// ── que cierre sobre sí misma: la cola se suma al principio ───────────────
const M = Math.round(LARGO * SR);
const sal = [new Float32Array(M), new Float32Array(M)];
[L, R].forEach((c, k) => {
  for (let n = 0; n < M; n++) sal[k][n] = c[n] + (n + M < N ? c[n + M] : 0);
});

// nivel: RMS a -20 dBFS (es música de fondo), pico tope en -1 dBFS
let suma = 0;
let pico = 0;
for (const c of sal) for (const v of c) { suma += v * v; pico = Math.max(pico, Math.abs(v)); }
let g = 10 ** (-20 / 20) / Math.sqrt(suma / (2 * M));
if (pico * g > 10 ** (-1 / 20)) g = 10 ** (-1 / 20) / pico;

// WAV de 16 bits estéreo
const datos = Buffer.alloc(M * 4);
for (let n = 0; n < M; n++) {
  datos.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sal[0][n] * g)) * 32767), n * 4);
  datos.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sal[1][n] * g)) * 32767), n * 4 + 2);
}
const cab = Buffer.alloc(44);
cab.write("RIFF", 0); cab.writeUInt32LE(36 + datos.length, 4); cab.write("WAVE", 8);
cab.write("fmt ", 12); cab.writeUInt32LE(16, 16); cab.writeUInt16LE(1, 20); cab.writeUInt16LE(2, 22);
cab.writeUInt32LE(SR, 24); cab.writeUInt32LE(SR * 4, 28); cab.writeUInt16LE(4, 32); cab.writeUInt16LE(16, 34);
cab.write("data", 36); cab.writeUInt32LE(datos.length, 40);
writeFileSync(process.argv[2], Buffer.concat([cab, datos]));
console.log(`milonga: ${LARGO.toFixed(1)} s, ${COMPASES} compases a ${BPM}`);
