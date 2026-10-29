/**
 * Lo que suena: la música de fondo, las voces de los rivales y los toques de
 * los botones.
 *
 * ── LA MÚSICA (lo pidió Santiago el 21 y el 23/10/2026) ───────────────────
 *
 *   - **Cambia según lo que estés haciendo.** Cada sección tiene sus temas
 *     (`AMBIENTES_MUSICALES`): los menús, la mesa, el mapa de la gira y las
 *     lecciones. Al pasar de una sección a otra, el tema se cruza con uno de
 *     la sección nueva en `CAMBIO` segundos. En el anotador no hay música: se
 *     usa jugando con gente de verdad, alrededor de una mesa de verdad.
 *   - **Nunca se corta en seco.** Entre un tema y el siguiente de la misma
 *     sección, un cruce de `CRUCE` segundos; al arrancar, un fundido de
 *     `ENTRADA`. Los cruces son de igual potencia (`curvaCruce`).
 *   - **Es suave, y los cantos le ganan.** La barra arranca en 30
 *     (`lib/sonido.ts`), todos los temas están a -23 LUFS
 *     (`herramientas/publicar-musica.mjs`), en la mesa y en las lecciones
 *     suena todavía más bajo (`nivel`), y **mientras habla un rival la música
 *     se hace a un lado** (`AGACHADA`) y vuelve despacio cuando termina.
 *
 * ── LAS VOCES ────────────────────────────────────────────────────────────
 *
 *   - `cantar(rival, clave)` dice un canto con la voz de ese rival
 *     (`lib/voces.ts`), eligiendo al azar entre sus tomas.
 *   - Si el bot dice varias cosas seguidas ("¡Quiero!" y "Son buenas"), van en
 *     fila, con un respiro entre una y otra (`esperaAntesDe`). El "Son buenas"
 *     espera más: en el medio el otro dijo su tanto. Una fila larga se
 *     recorta: un canto que llega tarde ya no corresponde a lo que se ve.
 *   - `precargarVoces(rival)` las baja y las decodifica al entrar a la mesa,
 *     para que el primer "¡Truco!" no llegue con retraso.
 *
 * ── LOS EFECTOS (desde el 25/10/2026) ────────────────────────────────────
 *
 *   - `tocarEfecto(cual)` hace sonar uno de `lib/efectos.ts`: el clic de un
 *     botón, volver, el palito del anotador, acertar o errar un ejercicio. Qué
 *     botón suena y cómo lo decide `components/Musica.tsx`.
 *   - No son archivos: se arman por código la primera vez que suenan y quedan
 *     guardados (`armarEfecto`). Cada toque mueve el tono apenas
 *     (`VARIACION`), para que diez seguidos no suenen a máquina.
 *
 * ── CUÁNDO SE CALLA ──────────────────────────────────────────────────────
 *
 *   - **Todo** (se suspende el audio y se vacía la fila de voces): con la
 *     pantalla oculta (app en segundo plano, teléfono bloqueado, otra pestaña)
 *     o con un anuncio delante, que trae su propio sonido.
 *   - **Sólo la música**: con su volumen real en 0 (no gasta batería en algo
 *     que nadie oye) o en el anotador. Las voces y los efectos siguen.
 *
 * ── POR QUÉ ASÍ ──────────────────────────────────────────────────────────
 *
 *   - **La música en `<audio>` y no decodificada**: un tema de 60 s
 *     decodificado ocupa ~21 MB, y para cruzar hacen falta dos. Las voces, al
 *     revés, son cortas (~1 s): decodificadas arrancan al instante.
 *   - **Todo pasa por Web Audio** (`MediaElementAudioSourceNode` para la
 *     música): los fundidos se programan con la hora del audio y no con
 *     temporizadores, y en el Safari del iPhone `.volume` no hace nada.
 *   - **Arranca con el primer toque**, porque antes los navegadores no dejan
 *     sonar nada. En la app Capacitor ya les saca esa traba a los `<audio>`
 *     (`setMediaPlaybackRequiresUserGesture(false)` en su `Bridge.java`).
 *
 * La cadena:
 *
 *     música:  <audio> → fundido (por pista) → nivel de la sección → agachada → barra Música  ┐
 *     voces:   AudioBuffer → volumen de ese canto ─────────────────────────→ barra Voces   ├→ salida
 *     efectos: AudioBuffer armado por código ───────────────────────────────→ barra Efectos ┘
 *
 * Lo que se puede probar sin navegador (el orden, la curva, qué suena dónde)
 * está en funciones puras, con su test en `lib/audio.test.ts`.
 */

import { sintetizar, type Efecto } from "./efectos.ts";
import type { ClaveVoz } from "./motor/partida.ts";
import { TEMAS, type Tema } from "./musica.ts";
import { EVENTO_SONIDO, leerSonido, sonidoDelAviso, volumenReal, type Sonido } from "./sonido.ts";
import { VOCES } from "./voces.ts";

/** Segundos del cruce entre un tema y el siguiente de la misma sección. */
export const CRUCE = 5;
/** Segundos del cruce al cambiar de sección (y del fundido al callarse en el anotador). */
export const CAMBIO = 2.5;
/** Segundos del fundido de entrada al arrancar o al volver de un silencio. */
export const ENTRADA = 3;
/** A cuánto baja la música mientras habla un rival: 0,35 son unos 9 dB menos. */
export const AGACHADA = 0.35;
/**
 * Respiro entre dos cantos seguidos del mismo rival. Las tomas ya traen
 * ~0,2 s de silencio entre las dos puntas, así que se oyen ~0,55 s.
 */
export const ENTRE_CANTOS = 0.35;
/**
 * Lo que espera el "Son buenas" antes de sonar, siempre. Entre el "¡Quiero!"
 * y el "Son buenas" el otro dice su tanto —"veintisiete"—, que acá no tiene
 * voz pero tiene que tener su tiempo. Con el respiro de antes (0,12 s) se
 * pisaban: lo oyó Santiago jugando, el 25/10/2026.
 */
export const ANTES_DE_SON_BUENAS = 1;
/** Más de esto en fila y se descartan los viejos. */
const FILA_MAXIMA = 3;
/** Cada cuánto se mira si ya toca cruzar o terminar un cruce. */
const VIGIA_MS = 250;
/** Tiempo de un cambio de barra: corto, pero sin el chasquido de un salto en seco. */
const SUAVIZADO = 0.08;
/** Cuánto se mueve el tono de un efecto al siguiente: ±4 %, menos de un semitono. */
const VARIACION = 0.04;
/** Más de esto sonando a la vez y el nuevo no suena: tocar el `+` como loco no tiene por qué aturdir. */
const EFECTOS_A_LA_VEZ = 4;

// ─────────────────────────── Qué suena dónde ────────────────────────────────

export type AmbienteMusical = "menu" | "mesa" | "gira" | "aprender" | "silencio";

/**
 * Los temas de cada sección, y a cuánto suenan (sobre la barra de Música).
 *
 *   - **Menús**: el tango milonga, aire de café, para la portada y los menús.
 *   - **Mesa**: las milongas, guitarra y bandoneón, que dejan lugar a los
 *     cantos; y más bajo que en los menús, porque ahí lo que importa es lo que
 *     dice el rival.
 *   - **Gira**: el candombe, que es lo festivo del viaje por los departamentos.
 *   - **Aprender**: lo más tranquilo, y bajito, que se está leyendo.
 */
export const AMBIENTES_MUSICALES: Readonly<Record<Exclude<AmbienteMusical, "silencio">, { temas: readonly string[]; nivel: number }>> = {
  menu: { temas: ["tango-1910", "tango-2110"], nivel: 1 },
  mesa: { temas: ["milonga-1910", "milonga-2110", "por-codigo"], nivel: 0.75 },
  gira: { temas: ["candombe-1910", "candombe-2110"], nivel: 1 },
  aprender: { temas: ["por-codigo", "milonga-2110", "tango-2110"], nivel: 0.7 },
};

/** Qué sección musical es una ruta. Con o sin barra al final (la app la lleva). */
export function ambienteDeRuta(ruta: string): AmbienteMusical {
  const r = ruta.replace(/\/+$/, "") || "/";
  if (r === "/jugar/mesa") return "mesa";
  if (r === "/jugar/gira") return "gira";
  if (r === "/aprender" || r.startsWith("/aprender/")) return "aprender";
  if (r === "/anotador") return "silencio";
  return "menu";
}

// ─────────────────────────── Lo que se prueba ───────────────────────────────

/**
 * Un orden al azar de `n` temas (Fisher-Yates), que no empieza por `ultimo`.
 * Al dar la vuelta se baraja de nuevo; si el primero de la vuelta nueva fuera
 * el último de la anterior, sonaría dos veces seguidas. Con un solo tema no
 * hay forma de evitarlo.
 */
export function barajar(n: number, ultimo: number | null, azar: () => number = Math.random): number[] {
  const orden = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  if (n > 1 && orden[0] === ultimo) [orden[0], orden[1]] = [orden[1], orden[0]];
  return orden;
}

/**
 * La curva de un fundido de "igual potencia": la que sube como un seno, la que
 * baja como un coseno. A mitad del cruce la suma suena igual de fuerte que un
 * tema solo; un cruce en línea recta tiene un pozo de 3 dB en el medio.
 */
export function curvaCruce(sube: boolean, puntos = 64): Float32Array {
  const c = new Float32Array(puntos);
  for (let i = 0; i < puntos; i++) {
    const t = (i / (puntos - 1)) * (Math.PI / 2);
    c[i] = sube ? Math.sin(t) : Math.cos(t);
  }
  return c;
}

/**
 * Cuánto silencio va antes de un canto. El "Son buenas" espera siempre, aunque
 * llegue solo: el tanto que se dijo en el medio puede ser el tuyo, que no tiene
 * voz, y que el rival conteste en el mismo instante en que tocaste "Quiero"
 * suena a que no te escuchó. Entre dos seguidos, el respiro; uno suelto sale
 * en el momento.
 */
export function esperaAntesDe(clave: ClaveVoz, trasOtro: boolean): number {
  return Math.max(clave === "son-buenas" ? ANTES_DE_SON_BUENAS : 0, trasOtro ? ENTRE_CANTOS : 0);
}

// ─────────────────────────── El estado ──────────────────────────────────────

interface Pista {
  el: HTMLAudioElement;
  fundido: GainNode;
  tema: Tema | null;
}

type PausaGeneral = "oculta" | "anuncio";

let ctx: AudioContext | null = null;
let nivelSeccion: GainNode | null = null;
let agachada: GainNode | null = null;
let barraMusica: GainNode | null = null;
let barraVoces: GainNode | null = null;
let barraEfectos: GainNode | null = null;
let pistas: [Pista, Pista] | null = null;
/** Cuál de las dos pistas es la que suena (la otra espera o está entrando). */
let actual = 0;

let ambiente: AmbienteMusical | null = null;
let orden: number[] = [];
let lugar = 0;
let ultimo: number | null = null;
/** Si la música está sonando (aunque esté todo suspendido por un anuncio). */
let musicaSuena = false;
/** De qué sección es el tema que está sonando: si no es la pedida, hay que cruzar. */
let seccionSonando: AmbienteMusical | null = null;
let volumenMusica = 0;
let volumenEfectos = 0;
/** Hasta qué hora del audio dura el cruce en curso; null si no hay cruce. */
let finCruce: number | null = null;
/** Hasta qué hora del audio dura el fundido de salida del anotador; null si no hay. */
let finApagado: number | null = null;
let fallos = 0;

const pausas = new Set<PausaGeneral>();
let rivalAPrecargar: string | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const fila: { archivo: string; clave: ClaveVoz }[] = [];
/** Lo que está diciendo el rival, con su propio volumen para poder apagarlo sin chasquido. */
let hablando: { fuente: AudioBufferSourceNode; voz: GainNode } | null = null;
/** Hay un canto esperando, cargándose o sonando: el siguiente espera. Se marca ANTES de esperar. */
let ocupado = false;
/** Sube cada vez que se calla al rival: un canto que esperaba su turno y es de antes, ya no suena. */
let turnoVoces = 0;
let ultimaVoz: { archivo: string; cuando: number } | null = null;

/** Los efectos ya armados, a la frecuencia de muestreo de este teléfono. */
const efectos = new Map<Efecto, AudioBuffer>();
let efectosSonando = 0;
/** Cuántos sonaron y el último: sólo para mirarlo con Playwright (ver abajo). */
let efectosTocados = 0;
let ultimoEfecto: Efecto | null = null;

// ─────────────────────────── La música ──────────────────────────────────────

const temasDe = (a: AmbienteMusical | null): Tema[] =>
  a && a !== "silencio" ? AMBIENTES_MUSICALES[a].temas.map((c) => TEMAS.find((t) => t.clave === c)).filter((t): t is Tema => !!t) : [];

/** El próximo tema de la sección en que se está. */
function siguienteTema(): Tema | null {
  const temas = temasDe(ambiente);
  if (temas.length === 0) return null;
  if (lugar >= orden.length || orden.length !== temas.length) {
    orden = barajar(temas.length, ultimo !== null && ultimo < temas.length ? ultimo : null);
    lugar = 0;
  }
  ultimo = orden[lugar++];
  return temas[ultimo];
}

function cargar(p: Pista, tema: Tema): void {
  p.tema = tema;
  p.el.src = tema.archivo;
  p.el.load();
}

/** Lo que dura el tema de una pista: el del archivo si ya se sabe, si no el del índice. */
const duracion = (p: Pista) => (Number.isFinite(p.el.duration) ? p.el.duration : (p.tema?.segundos ?? 0));

/**
 * Programa un fundido con la hora del audio, en tramos de rampa lineal que
 * siguen `curvaCruce`. No `setValueCurveAtTime`: ése tira error si se pisa con
 * otra automatización, y un cruce puede empezar con un fundido andando. La que
 * baja arranca desde donde esté.
 */
function fundir(g: AudioParam, sube: boolean, desde: number, segundos: number, hasta = 1): void {
  const inicial = sube ? Math.min(g.value, hasta) : g.value;
  const curva = curvaCruce(sube, 17);
  g.cancelScheduledValues(desde);
  g.setValueAtTime(inicial, desde);
  for (let i = 1; i < curva.length; i++) {
    const v = sube ? inicial + (hasta - inicial) * curva[i] : inicial * curva[i];
    g.linearRampToValueAtTime(v, desde + (segundos * i) / (curva.length - 1));
  }
}

const tocar = (p: Pista) => void p.el.play().catch(() => {});

/** Cruza la pista que suena con la otra, que arranca `tema` (o el que le toque) desde cero. */
function cruzar(segundos: number, tema?: Tema | null): void {
  if (!ctx || !pistas) return;
  if (finCruce !== null) terminarCruce(); // un cruce nuevo pisa al que estaba
  const sale = pistas[actual];
  const entra = pistas[1 - actual];
  const elegido = tema ?? entra.tema ?? siguienteTema();
  if (!elegido) return;
  if (entra.tema !== elegido) cargar(entra, elegido);
  entra.el.currentTime = 0;
  entra.fundido.gain.value = 0;
  tocar(entra);
  const ahora = ctx.currentTime;
  fundir(entra.fundido.gain, true, ahora, segundos);
  if (!sale.el.paused) fundir(sale.fundido.gain, false, ahora, segundos);
  finCruce = ahora + segundos;
}

/** Termina el cruce: la que salió se para y queda cargada con el próximo tema. */
function terminarCruce(): void {
  if (!pistas || !ctx) return;
  const salio = pistas[actual];
  salio.el.pause();
  salio.fundido.gain.cancelScheduledValues(0);
  salio.fundido.gain.value = 0;
  const proximo = siguienteTema();
  if (proximo) cargar(salio, proximo);
  actual = 1 - actual;
  finCruce = null;
  // Si la que entró no arrancó (su archivo falló en pleno cruce), que arranque ahora.
  const ahora = pistas[actual];
  if (ahora.el.paused && musicaSuena && pausas.size === 0) {
    tocar(ahora);
    fundir(ahora.fundido.gain, true, ctx.currentTime, ENTRADA);
  }
}

/** Para todo lo de la música, sin fundido (ya está en 0 o se apagó despacio). */
function pararMusica(): void {
  if (!pistas) return;
  if (finCruce !== null) terminarCruce();
  for (const p of pistas) {
    p.el.pause();
    p.fundido.gain.cancelScheduledValues(0);
    p.fundido.gain.value = 0;
  }
  finApagado = null;
  musicaSuena = false;
  seccionSonando = null;
}

/** Arranca la música de la sección actual con su fundido de entrada. */
function arrancarSeccion(): void {
  if (!ctx || !pistas) return;
  const p = pistas[actual];
  const tema = siguienteTema();
  if (!tema) return;
  cargar(p, tema);
  p.fundido.gain.value = 0;
  tocar(p);
  fundir(p.fundido.gain, true, ctx.currentTime, ENTRADA);
  const otra = pistas[1 - actual];
  const proximo = siguienteTema();
  if (proximo) cargar(otra, proximo);
  musicaSuena = true;
  seccionSonando = ambiente;
}

/**
 * Pone la música donde tiene que estar según la sección y el volumen: la
 * prende, la cruza a la sección nueva, la apaga despacio o la vuelve a subir.
 */
function acomodarMusica(): void {
  if (!ctx || !pistas || !nivelSeccion) return;
  const quiere = ambiente !== null && ambiente !== "silencio" && volumenMusica > 0;
  const ahora = ctx.currentTime;
  if (ambiente && ambiente !== "silencio") {
    nivelSeccion.gain.setTargetAtTime(AMBIENTES_MUSICALES[ambiente].nivel, ahora, CAMBIO / 3);
  }
  if (!quiere) {
    if (!musicaSuena) return;
    if (volumenMusica === 0) return pararMusica(); // la barra ya la dejó muda
    // Al anotador: se va apagando en CAMBIO segundos, y después se para.
    if (finApagado === null) {
      if (finCruce !== null) terminarCruce();
      fundir(pistas[actual].fundido.gain, false, ahora, CAMBIO);
      finApagado = ahora + CAMBIO;
    }
    return;
  }
  if (!musicaSuena) return arrancarSeccion();
  const veniaApagandose = finApagado !== null;
  finApagado = null;
  if (seccionSonando !== ambiente) {
    // Sección nueva: se cruza con un tema de la nueva (aunque viniera apagándose).
    const tema = siguienteTema();
    if (tema) cruzar(CAMBIO, tema);
    seccionSonando = ambiente;
  } else if (veniaApagandose) {
    // Se fue al anotador y volvió antes de que se apagara: vuelve a subir.
    fundir(pistas[actual].fundido.gain, true, ahora, ENTRADA);
  }
}

/** Mira cada VIGIA_MS si ya toca cruzar, terminar un cruce o terminar de apagarse. */
function vigilar(): void {
  if (!ctx || !pistas || pausas.size > 0 || !musicaSuena) return;
  if (finApagado !== null) {
    if (ctx.currentTime >= finApagado) pararMusica();
    return;
  }
  if (finCruce !== null) {
    if (ctx.currentTime >= finCruce) terminarCruce();
    return;
  }
  const p = pistas[actual];
  const largo = duracion(p);
  if (largo > 0 && p.el.currentTime >= largo - CRUCE) cruzar(CRUCE);
}

/** Cambia de sección (lo llama `components/Musica.tsx` con cada ruta). Antes de arrancar, queda anotada. */
export function ponerAmbiente(nuevo: AmbienteMusical): void {
  if (nuevo === ambiente) return;
  ambiente = nuevo;
  orden = [];
  ultimo = null;
  lugar = 0;
  if (pausas.size === 0) acomodarMusica();
}

// ─────────────────────────── Las voces ──────────────────────────────────────

function decodificar(archivo: string): Promise<AudioBuffer | null> {
  const c = ctx;
  if (!c) return Promise.resolve(null);
  let b = buffers.get(archivo);
  if (!b) {
    b = fetch(archivo)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((datos) => c.decodeAudioData(datos))
      .catch(() => {
        buffers.delete(archivo); // que se pueda reintentar más tarde
        return null;
      });
    buffers.set(archivo, b);
  }
  return b;
}

/** Baja y decodifica las voces de un rival. Antes del primer toque, queda anotado para después. */
export function precargarVoces(rival: string): void {
  if (!Object.hasOwn(VOCES, rival)) return;
  rivalAPrecargar = rival;
  if (!ctx) return;
  for (const tomas of Object.values(VOCES[rival])) for (const t of tomas ?? []) void decodificar(t);
}

function agachar(sube: boolean): void {
  if (!ctx || !agachada) return;
  const g = agachada.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setValueAtTime(g.value, ctx.currentTime);
  // Baja rápido (que el canto entre limpio) y vuelve despacio (que no se note).
  g.setTargetAtTime(sube ? 1 : AGACHADA, ctx.currentTime, sube ? 0.35 : 0.04);
}

/** Saca el próximo de la fila y lo dice después de su espera. `trasOtro`: si viene pegado a otro canto. */
function hablarSiguiente(trasOtro = false): void {
  if (ocupado || !ctx || !barraVoces) return;
  const dicho = fila.shift();
  if (!dicho) return agachar(true);
  ocupado = true;
  const turno = turnoVoces;
  const listo = decodificar(dicho.archivo); // se termina de bajar mientras espera
  window.setTimeout(() => void decir(dicho.archivo, listo, turno), esperaAntesDe(dicho.clave, trasOtro) * 1000);
}

async function decir(archivo: string, listo: Promise<AudioBuffer | null>, turno: number): Promise<void> {
  const buffer = await listo;
  if (turno !== turnoVoces) return; // lo callaron mientras esperaba: ya no corresponde
  if (!buffer || !ctx || !barraVoces || pausas.size > 0) {
    ocupado = false;
    return hablarSiguiente();
  }
  const fuente = ctx.createBufferSource();
  const voz = ctx.createGain();
  fuente.buffer = buffer;
  fuente.connect(voz).connect(barraVoces);
  hablando = { fuente, voz };
  ultimaVoz = { archivo, cuando: ctx.currentTime };
  agachar(false);
  fuente.onended = () => {
    voz.disconnect();
    if (hablando?.fuente === fuente) hablando = null;
    if (turno !== turnoVoces) return; // lo cortaron, y el que lo cortó ya dejó todo en orden
    ocupado = false;
    if (fila.length) hablarSiguiente(true);
    else agachar(true);
  };
  fuente.start();
}

/**
 * Dice un canto con la voz de un rival. Si ese rival o ese canto no tienen
 * voz, no pasa nada. Antes del primer toque, con todo suspendido o con un
 * anuncio delante, tampoco: un canto viejo que suena después ya no
 * corresponde a lo que se ve.
 */
export function cantar(rival: string, clave: ClaveVoz): void {
  if (!ctx || ctx.state !== "running" || pausas.size > 0) return;
  if (!Object.hasOwn(VOCES, rival)) return;
  const tomas = VOCES[rival][clave];
  if (!tomas || tomas.length === 0) return;
  fila.push({ archivo: tomas[Math.floor(Math.random() * tomas.length)], clave });
  while (fila.length > FILA_MAXIMA) fila.shift();
  void hablarSiguiente();
}

/**
 * Calla al rival: vacía la fila, descarta el que esperaba su turno y corta el
 * que está sonando. Con `fundido`, en vez de cortarlo en seco lo apaga en esos
 * segundos (un corte en medio de una onda chasquea). Sin fundido es para
 * cuando se suspende todo: ahí lo programado no llegaría a sonar.
 */
function callarVoces(fundido = 0): void {
  fila.length = 0;
  turnoVoces++;
  ocupado = false;
  const h = hablando;
  hablando = null;
  if (h && ctx) {
    try {
      if (fundido > 0) {
        h.voz.gain.setTargetAtTime(0, ctx.currentTime, fundido / 4);
        h.fuente.stop(ctx.currentTime + fundido);
      } else h.fuente.stop();
    } catch {
      /* ya había terminado */
    }
  }
  agachar(true);
}

/**
 * Al levantarse de la mesa: lo que el rival tenía para decir ya no va. Sin
 * esto, un "Son buenas" que esperaba su segundo sonaría en el menú.
 */
export function callarRival(): void {
  callarVoces(0.08);
}

// ─────────────────────────── Los efectos ────────────────────────────────────

/** El efecto listo para sonar: la primera vez se arma (unos milisegundos) y queda guardado. */
function armarEfecto(c: AudioContext, cual: Efecto): AudioBuffer {
  let b = efectos.get(cual);
  if (!b) {
    const muestras = sintetizar(cual, c.sampleRate);
    b = c.createBuffer(1, muestras.length, c.sampleRate);
    b.copyToChannel(muestras, 0);
    efectos.set(cual, b);
  }
  return b;
}

/**
 * Hace sonar un efecto de la interfaz. Antes del primer toque, con todo
 * suspendido, con un anuncio delante o con la barra en 0, no hace nada.
 */
export function tocarEfecto(cual: Efecto): void {
  if (!ctx || !barraEfectos || pausas.size > 0 || volumenEfectos === 0) return;
  if (efectosSonando >= EFECTOS_A_LA_VEZ) return;
  // El toque que despierta el audio llega acá antes de que termine de
  // despertar. Un clic es un gesto de la persona: se lo puede apurar.
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  const fuente = ctx.createBufferSource();
  fuente.buffer = armarEfecto(ctx, cual);
  fuente.playbackRate.value = 1 + (Math.random() * 2 - 1) * VARIACION;
  fuente.connect(barraEfectos);
  efectosSonando++;
  fuente.onended = () => {
    efectosSonando--;
    fuente.disconnect();
  };
  fuente.start();
  efectosTocados++;
  ultimoEfecto = cual;
}

// ─────────────────────────── Volumen y pausas ───────────────────────────────

function aplicarVolumen(sonido: Sonido): void {
  if (!ctx || !barraMusica || !barraVoces || !barraEfectos) return;
  const ahora = ctx.currentTime;
  volumenMusica = volumenReal(sonido, "musica");
  volumenEfectos = volumenReal(sonido, "efectos");
  barraMusica.gain.setTargetAtTime(volumenMusica, ahora, SUAVIZADO);
  barraVoces.gain.setTargetAtTime(volumenReal(sonido, "voces"), ahora, SUAVIZADO);
  // Los efectos, en seco: duran menos que el suavizado, y el toque que se oye
  // al mover su barra tiene que sonar ya con el volumen nuevo.
  barraEfectos.gain.setValueAtTime(volumenEfectos, ahora);
  if (pausas.size === 0) acomodarMusica();
}

/** Prende o apaga un motivo para callar TODO (pantalla oculta, anuncio). Antes de arrancar, queda anotado. */
export function pausarPor(motivo: PausaGeneral, si: boolean): void {
  const habia = pausas.size > 0;
  if (si) pausas.add(motivo);
  else pausas.delete(motivo);
  const hay = pausas.size > 0;
  if (!ctx || !pistas || hay === habia) return;
  if (hay) {
    callarVoces();
    for (const p of pistas) p.el.pause();
    void ctx.suspend().catch(() => {});
  } else {
    void ctx.resume().catch(() => {});
    if (musicaSuena) {
      tocar(pistas[actual]);
      if (finCruce !== null) tocar(pistas[1 - actual]);
    }
    acomodarMusica();
  }
}

// ─────────────────────────── El arranque ────────────────────────────────────

function crearPista(c: AudioContext, destino: AudioNode): Pista {
  const el = new Audio();
  el.preload = "auto";
  const fundido = c.createGain();
  fundido.gain.value = 0;
  c.createMediaElementSource(el).connect(fundido).connect(destino);
  const p: Pista = { el, fundido, tema: null };
  el.addEventListener("error", () => {
    // Un archivo que no carga: se salta al próximo. Con tope, para no quedar
    // dando vueltas si no carga ninguno (sin conexión en la web, por ejemplo).
    if (++fallos > TEMAS.length * 2 || !pistas || !musicaSuena) return;
    const proximo = siguienteTema();
    if (!proximo) return;
    cargar(p, proximo);
    if (p === pistas[actual] && finCruce === null) {
      tocar(p);
      fundir(p.fundido.gain, true, c.currentTime, ENTRADA);
    }
  });
  el.addEventListener("playing", () => {
    fallos = 0;
  });
  // Por si el vigía no llegó a cruzar (un salto, un tema más corto que el cruce):
  el.addEventListener("ended", () => {
    if (pistas && p === pistas[actual] && finCruce === null && finApagado === null) cruzar(CRUCE);
  });
  return p;
}

/**
 * Arranca el sonido. Hay que llamarla adentro de un toque (o una tecla): es la
 * única forma de que el navegador deje sonar. Llamarla otra vez sólo reintenta
 * despertar el audio. Devuelve si quedó andando.
 */
export async function arrancarSonido(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!ctx) {
    const Contexto =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return false;
    const c = new Contexto();
    ctx = c;
    barraMusica = c.createGain();
    barraVoces = c.createGain();
    barraEfectos = c.createGain();
    agachada = c.createGain();
    nivelSeccion = c.createGain();
    for (const g of [barraMusica, barraVoces, barraEfectos]) g.gain.value = 0;
    nivelSeccion.connect(agachada).connect(barraMusica).connect(c.destination);
    barraVoces.connect(c.destination);
    barraEfectos.connect(c.destination);
    pistas = [crearPista(c, nivelSeccion), crearPista(c, nivelSeccion)];
    if (ambiente && ambiente !== "silencio") nivelSeccion.gain.value = AMBIENTES_MUSICALES[ambiente].nivel;
    window.addEventListener(EVENTO_SONIDO, (e) => aplicarVolumen(sonidoDelAviso(e)));
    window.setInterval(vigilar, VIGIA_MS);
    aplicarVolumen(leerSonido()); // y esto arranca la música de la sección, si corresponde
    // La otra pista también se "destraba" adentro del toque (Safari lo pide
    // por elemento): arranca callada, con su tema ya cargado, y se para.
    const otra = pistas[1 - actual];
    if (otra.tema) {
      void otra.el.play().then(
        () => {
          if (finCruce === null && pistas && otra !== pistas[actual]) otra.el.pause();
        },
        () => {},
      );
    }
    if (rivalAPrecargar) precargarVoces(rivalAPrecargar);
    // Lo que se pidió callar antes del primer toque se respeta desde ya.
    if (pausas.size > 0) {
      for (const p of pistas) p.el.pause();
      void c.suspend().catch(() => {});
    }
    /* Para mirar todo esto con Playwright. `NODE_ENV` es "production" en los dos
       builds, así que no existe en nada que se publique: sólo en `next dev`
       (el mismo criterio que los anuncios simulados de `components/Anuncios.tsx`). */
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __trucoMusica?: object }).__trucoMusica = {
        estado: () => ({
          contexto: ctx?.state,
          ambiente,
          actual,
          suena: musicaSuena,
          cruzando: finCruce !== null,
          apagandose: finApagado !== null,
          pausas: [...pausas],
          volumen: barraMusica?.gain.value,
          nivel: nivelSeccion?.gain.value,
          agachada: agachada?.gain.value,
          fila: fila.length,
          hablando: hablando !== null,
          ocupado,
          ultimaVoz,
          voces: barraVoces?.gain.value,
          efectos: barraEfectos?.gain.value,
          efectosArmados: [...efectos.keys()],
          efectosTocados,
          ultimoEfecto,
          pistas: pistas?.map((p) => ({
            tema: p.tema?.clave,
            segundo: p.el.currentTime,
            parada: p.el.paused,
            fundido: p.fundido.gain.value,
          })),
        }),
        cantar: (rival: string, clave: ClaveVoz) => cantar(rival, clave),
        adelantarHasta: (faltan: number) => {
          if (pistas) pistas[actual].el.currentTime = Math.max(0, duracion(pistas[actual]) - faltan);
        },
      };
    }
  }
  if (pausas.size === 0) {
    try {
      await ctx.resume();
    } catch {
      /* sigue suspendido: se reintenta con el próximo toque */
    }
  }
  return ctx.state === "running" || pausas.size > 0;
}
