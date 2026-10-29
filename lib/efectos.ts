/**
 * Los sonidos de la interfaz: el toque de un botón, volver, el palito del
 * anotador, acertar y errar en un ejercicio. Los pidió Santiago el 25/10/2026,
 * "tipo clic, tipo pop", para los menús, los ajustes, el anotador y Aprender;
 * no para la partida, donde van a sonar las cartas.
 *
 * ── POR QUÉ NO SON ARCHIVOS ─────────────────────────────────────────────
 *
 * Se hacen acá, por código, cuando arranca el sonido, y nunca se bajan. Cada
 * uno dura entre 0,07 y 0,45 s y se arma en unos pocos milisegundos (medido en
 * Node: de 2 a 12 ms, la primera vez), y así:
 *
 *   - **no hay espera la primera vez**: un clic que llega 100 ms tarde porque
 *     el archivo se estaba bajando suena a botón roto;
 *   - **no hay relleno del códec**: el AAC le pone ~50 ms de silencio al
 *     principio a todo, que en una voz no se nota y en un clic de 70 ms es
 *     casi el doble de lo que dura;
 *   - **salen al ritmo del teléfono** (`sr`: 48 000 en casi todos los Android,
 *     44 100 en la PC), sin que nadie tenga que remuestrear.
 *
 * Es el mismo criterio que el resto del juego: lo dibuja nuestro código, no
 * hay una sola muestra de sonido de nadie.
 *
 * ── CÓMO ESTÁ HECHO CADA UNO ─────────────────────────────────────────────
 *
 *   - `toque`: un "pop". Un seno que cae de tono muy rápido (como una gota),
 *     con un chasquido de ruido de 2 ms adelante que le da el borde.
 *   - `volver`: el mismo pop, más grave y bajando más: suena a "para atrás".
 *     También para cerrar una hoja.
 *   - `palito`: un trazo de lápiz sobre papel. Ruido entre 1,8 y 6,5 kHz con
 *     grano (el papel no es parejo) y el golpecito de la punta al apoyar.
 *   - `borrar`: la goma: dos pasadas cortas de ruido más opaco.
 *   - `acierto`: dos notas que suben una quinta (sol, re), cortas, de campanita.
 *   - `error`: dos notas que bajan una cuarta (la, mi), apagadas. Avisa, no
 *     reta.
 *
 * Nada baja de 300 Hz, salvo la cola del `volver`: el parlante de un celular
 * casi no da graves, y un "tu-tum" en 250 Hz ahí no se oye.
 *
 * Todos quedan bastante por debajo de las voces: medidos con EBU R128, las
 * voces pican en -17 a -20 LUFS momentáneos, los clics en -30 y los de los
 * ejercicios, que duran más, en -27. El pico de cada uno está en `PICO`, y
 * arriba de eso manda la barra de Efectos.
 *
 * El azar del ruido tiene semilla: cada efecto suena igual cada vez que se
 * arma, y el test lo puede comprobar. La variación entre un toque y el
 * siguiente la pone el reproductor (`lib/audio.ts`), moviendo apenas el tono.
 */

export const EFECTOS = ["toque", "volver", "palito", "borrar", "acierto", "error"] as const;
export type Efecto = (typeof EFECTOS)[number];

/** Si un texto (un `data-sonido`, por ejemplo) es uno de los efectos. */
export const esEfecto = (x: unknown): x is Efecto => typeof x === "string" && (EFECTOS as readonly string[]).includes(x);

/**
 * El pico de cada uno, de 0 a 1 (0,28 son -11 dBFS). No son iguales porque el
 * ruido tiene picos más altos para lo que suena: con el mismo pico, la goma
 * se oía 5 dB más bajo que el toque.
 */
export const PICO: Readonly<Record<Efecto, number>> = {
  toque: 0.28,
  volver: 0.26,
  palito: 0.26,
  borrar: 0.24,
  acierto: 0.18,
  error: 0.18,
};

/** Lo que dura cada uno, en segundos. */
export const LARGO: Readonly<Record<Efecto, number>> = {
  toque: 0.07,
  volver: 0.1,
  palito: 0.065,
  borrar: 0.13,
  acierto: 0.42,
  error: 0.38,
};

/** mulberry32: el mismo de `herramientas/escena/azar.mjs`. */
function azarCon(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** El coeficiente de un filtro de un polo que corta en `hz`. */
const polo = (hz: number, sr: number) => 1 - Math.exp((-2 * Math.PI * hz) / sr);

/** Sube en coseno durante `ataque` y después cae exponencial con constante `caida`. */
function golpe(t: number, ataque: number, caida: number): number {
  if (t < 0) return 0;
  if (t < ataque) return 0.5 - 0.5 * Math.cos((Math.PI * t) / ataque);
  return Math.exp(-(t - ataque) / caida);
}

/** Un pop: un seno que cae de `desde` a `hasta` Hz, con un chasquido de ruido adelante. */
function pop(
  out: Float32Array,
  sr: number,
  azar: () => number,
  o: { desde: number; hasta: number; caidaTono: number; caida: number; chasquido: number },
): void {
  const a = polo(2000, sr);
  let fase = 0;
  let bajo = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const f = o.hasta + (o.desde - o.hasta) * Math.exp(-t / o.caidaTono);
    fase += (2 * Math.PI * f) / sr;
    const r = azar() * 2 - 1;
    bajo += a * (r - bajo);
    // Lo que queda del ruido sacándole los graves: el borde del golpe.
    out[i] += Math.sin(fase) * golpe(t, 0.0015, o.caida) + o.chasquido * (r - bajo) * Math.exp(-t / 0.002);
  }
}

/** Una pasada de ruido entre `grave` y `agudo` Hz, con grano, que sube y se apaga en `largo` segundos. */
function pasada(
  out: Float32Array,
  sr: number,
  azar: () => number,
  o: { desde: number; largo: number; grave: number; agudo: number; ataque: number; ganancia: number; punta: number },
): void {
  const ag = polo(o.agudo, sr);
  const gr = polo(o.grave, sr);
  const gn = polo(140, sr);
  let a1 = 0;
  let a2 = 0;
  let g1 = 0;
  let g2 = 0;
  let grano = 0;
  const i0 = Math.round(o.desde * sr);
  const n = Math.min(out.length - i0, Math.round(o.largo * sr));
  for (let k = 0; k < n; k++) {
    const t = k / sr;
    const r = azar() * 2 - 1;
    // Dos polos para arriba y dos para abajo: una banda más definida que con uno.
    a1 += ag * (r - a1);
    a2 += ag * (a1 - a2);
    g1 += gr * (a2 - g1);
    g2 += gr * (g1 - g2);
    const banda = a2 - g2;
    grano += gn * (azar() * 2 - 1 - grano);
    const aspereza = 0.55 + 0.45 * Math.min(1, Math.abs(grano) * 14);
    const forma =
      t < o.ataque
        ? Math.sin((Math.PI / 2) * (t / o.ataque)) ** 2
        : Math.cos((Math.PI / 2) * ((t - o.ataque) / (o.largo - o.ataque))) ** 2;
    // La punta: el golpecito de apoyar el lápiz, agudo y de 1,5 ms.
    const punta = o.punta * (r - a1) * Math.exp(-t / 0.0015);
    out[i0 + k] += o.ganancia * (banda * aspereza * forma + punta);
  }
}

/** Una nota corta: parciales `[múltiplo, nivel]` sobre `hz`, que arranca en `desde`. */
function nota(
  out: Float32Array,
  sr: number,
  o: { desde: number; hz: number; caida: number; parciales: readonly (readonly [number, number])[]; ganancia: number },
): void {
  const i0 = Math.round(o.desde * sr);
  for (let i = i0; i < out.length; i++) {
    const t = (i - i0) / sr;
    let s = 0;
    for (const [m, nivel] of o.parciales) s += nivel * Math.sin(2 * Math.PI * o.hz * m * t);
    out[i] += o.ganancia * golpe(t, 0.003, o.caida) * s;
  }
}

const SEMILLA: Readonly<Record<Efecto, number>> = {
  toque: 2510,
  volver: 2511,
  palito: 2512,
  borrar: 2513,
  acierto: 2514,
  error: 2515,
};

/**
 * Arma un efecto a `sr` muestras por segundo. Siempre da lo mismo para el
 * mismo `sr`; arranca y termina en cero (sin chasquidos en las puntas) y su
 * pico es exactamente `PICO[efecto]`.
 */
export function sintetizar(efecto: Efecto, sr: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(Math.round(LARGO[efecto] * sr));
  const azar = azarCon(SEMILLA[efecto]);
  switch (efecto) {
    case "toque":
      pop(out, sr, azar, { desde: 1150, hasta: 420, caidaTono: 0.01, caida: 0.018, chasquido: 0.22 });
      break;
    case "volver":
      pop(out, sr, azar, { desde: 760, hasta: 300, caidaTono: 0.016, caida: 0.026, chasquido: 0.14 });
      break;
    case "palito":
      pasada(out, sr, azar, { desde: 0, largo: 0.065, grave: 1800, agudo: 6500, ataque: 0.008, ganancia: 1, punta: 0.9 });
      break;
    case "borrar":
      pasada(out, sr, azar, { desde: 0, largo: 0.055, grave: 500, agudo: 2300, ataque: 0.015, ganancia: 1, punta: 0 });
      pasada(out, sr, azar, { desde: 0.07, largo: 0.055, grave: 450, agudo: 2100, ataque: 0.015, ganancia: 0.75, punta: 0 });
      break;
    case "acierto": {
      const campana = [[1, 1], [2, 0.22], [3, 0.06]] as const;
      nota(out, sr, { desde: 0, hz: 784, caida: 0.07, parciales: campana, ganancia: 0.85 });
      nota(out, sr, { desde: 0.085, hz: 1175, caida: 0.1, parciales: campana, ganancia: 1 });
      break;
    }
    case "error": {
      const apagada = [[1, 1], [2, 0.3], [3, 0.1]] as const;
      nota(out, sr, { desde: 0, hz: 440, caida: 0.06, parciales: apagada, ganancia: 1 });
      nota(out, sr, { desde: 0.12, hz: 330, caida: 0.075, parciales: apagada, ganancia: 0.9 });
      break;
    }
  }

  // Las puntas, en cero: 0,3 ms de entrada y 4 ms de salida en coseno.
  const entra = Math.max(1, Math.round(0.0003 * sr));
  const sale = Math.max(1, Math.round(0.004 * sr));
  for (let i = 0; i < entra; i++) out[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / entra);
  for (let i = 0; i < sale; i++) out[out.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / sale);

  let pico = 0;
  for (const v of out) pico = Math.max(pico, Math.abs(v));
  if (pico > 0) for (let i = 0; i < out.length; i++) out[i] *= PICO[efecto] / pico;
  return out;
}
