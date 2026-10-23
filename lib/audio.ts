/**
 * Lo que suena. Por ahora, la música de fondo; las voces y los efectos vienen después.
 *
 * ── CÓMO SUENA LA MÚSICA (lo pidió Santiago el 21/10/2026) ────────────────
 *
 *   - **Siempre hay algo sonando**, de fondo, en toda la app: los siete temas
 *     de `lib/musica.ts` en orden al azar, y al terminar la vuelta se barajan
 *     de nuevo sin repetir el último.
 *   - **Entre un tema y otro, un fundido cruzado** de `CRUCE` segundos: el que
 *     termina baja mientras el que empieza sube. Nunca "se termina uno, unos
 *     segundos sueltos, aparece el otro".
 *   - **Al arrancar, un fundido de entrada** de `ENTRADA` segundos: que la
 *     música no salte de golpe.
 *   - **Suena bajito de fábrica**: eso lo deciden `lib/sonido.ts` (la barra
 *     arranca en 30) y `herramientas/publicar-musica.mjs` (todos a -23 LUFS).
 *
 * ── CUÁNDO SE CALLA ──────────────────────────────────────────────────────
 *
 * Se pausa (no se apaga: al volver sigue donde estaba) si pasa cualquiera de
 * estas cosas, y vuelve cuando no queda ninguna:
 *
 *   - la pantalla no se ve (la app pasó a segundo plano, se bloqueó el
 *     teléfono, se cambió de pestaña): nadie quiere música desde el bolsillo;
 *   - hay un anuncio delante, que trae su propio sonido;
 *   - el volumen real de la música es 0 (silencio, o la barra en 0): así no
 *     gasta batería decodificando algo que nadie oye.
 *
 * ── POR QUÉ ASÍ ──────────────────────────────────────────────────────────
 *
 * Dos `<audio>` que se turnan, cada uno enchufado a Web Audio
 * (`MediaElementAudioSourceNode` → una ganancia propia para los fundidos → la
 * ganancia de la música → la salida):
 *
 *   - **`<audio>` y no un `AudioBuffer` decodificado**: un tema de 60 s
 *     decodificado ocupa ~21 MB de memoria, y para cruzar hacen falta dos. Un
 *     `<audio>` lo va leyendo del archivo, y en un celular modesto eso importa.
 *   - **Web Audio para el volumen y no `.volume`**: los fundidos quedan
 *     programados con la hora del audio (`setValueCurveAtTime`) y no con
 *     temporizadores, y en el Safari del iPhone `.volume` no hace nada.
 *   - **Arranca con el primer toque**, porque los navegadores no dejan sonar
 *     nada antes. En la app Capacitor ya les saca esa traba a los `<audio>`
 *     (`setMediaPlaybackRequiresUserGesture(false)` en su `Bridge.java`), pero
 *     el `AudioContext` igual nace suspendido en algunos navegadores.
 *
 * Todo lo que toca el navegador vive acá; lo que se puede probar sin navegador
 * (el orden y la curva) está afuera, en funciones puras, con su test.
 */

import { TEMAS, type Tema } from "./musica.ts";
import { EVENTO_SONIDO, leerSonido, sonidoDelAviso, volumenReal, type Sonido } from "./sonido.ts";

/** Segundos que dura el cruce entre un tema y el siguiente. */
export const CRUCE = 5;
/** Segundos del fundido de entrada al arrancar la música. */
export const ENTRADA = 3;
/** Cada cuánto se mira si ya toca cruzar. */
const VIGIA_MS = 250;
/** Tiempo de un cambio de barra: corto, pero sin el chasquido de un salto en seco. */
const SUAVIZADO = 0.08;

// ─────────────────────────── Lo que se prueba ───────────────────────────────

/**
 * Un orden al azar de `n` temas (Fisher-Yates), que no empieza por `ultimo`.
 *
 * Al dar la vuelta se baraja de nuevo; si el primero de la vuelta nueva fuera
 * el último de la anterior, sonaría dos veces seguidas. Con un solo tema no
 * hay forma de evitarlo, y se devuelve tal cual.
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
 * La curva de un fundido de "igual potencia": sube como un seno y la que baja
 * como un coseno, así que a mitad del cruce la suma de las dos suena igual de
 * fuerte que un tema solo. Un cruce en línea recta tiene un pozo de 3 dB en el
 * medio, y con la música bajita ese pozo se oye como un hueco.
 */
export function curvaCruce(sube: boolean, puntos = 64): Float32Array {
  const c = new Float32Array(puntos);
  for (let i = 0; i < puntos; i++) {
    const t = (i / (puntos - 1)) * (Math.PI / 2);
    c[i] = sube ? Math.sin(t) : Math.cos(t);
  }
  return c;
}

// ─────────────────────────── El reproductor ─────────────────────────────────

interface Pista {
  el: HTMLAudioElement;
  ganancia: GainNode;
  tema: Tema | null;
}

type Motivo = "oculta" | "anuncio" | "muda";

let ctx: AudioContext | null = null;
let salida: GainNode | null = null;
let pistas: [Pista, Pista] | null = null;
/** Cuál de las dos pistas es la que suena (la otra espera o está entrando). */
let actual = 0;
let orden: number[] = [];
let lugar = 0;
let ultimo: number | null = null;
/** Hasta qué hora del audio dura el cruce en curso; null si no hay cruce. */
let finCruce: number | null = null;
let fallos = 0;
let pausada = false;
const motivos = new Set<Motivo>();

const siguienteTema = (): Tema => {
  if (lugar >= orden.length) {
    orden = barajar(TEMAS.length, ultimo);
    lugar = 0;
  }
  ultimo = orden[lugar++];
  return TEMAS[ultimo];
};

function cargar(p: Pista, tema: Tema): void {
  p.tema = tema;
  p.el.src = tema.archivo;
  p.el.load();
}

/** Lo que dura el tema de una pista: el del archivo si ya se sabe, si no el del índice. */
const duracion = (p: Pista) => (Number.isFinite(p.el.duration) ? p.el.duration : (p.tema?.segundos ?? 0));

/**
 * Programa un fundido con la hora del audio.
 *
 * Con tramos de rampa lineal que siguen `curvaCruce`, y no con
 * `setValueCurveAtTime`: ése tira error si se superpone con otra
 * automatización, y un cruce puede empezar con el fundido de entrada todavía
 * andando. La que baja arranca desde donde esté (puede no estar en 1).
 */
function fundir(p: Pista, sube: boolean, desde: number, segundos: number): void {
  const g = p.ganancia.gain;
  const inicial = sube ? 0 : g.value;
  const curva = curvaCruce(sube, 17);
  g.cancelScheduledValues(desde);
  g.setValueAtTime(inicial, desde);
  for (let i = 1; i < curva.length; i++) {
    g.linearRampToValueAtTime(sube ? curva[i] : curva[i] * inicial, desde + (segundos * i) / (curva.length - 1));
  }
}

/** Empieza el cruce: la que espera arranca de cero y sube; la que suena baja. */
function cruzar(): void {
  if (!ctx || !pistas || finCruce !== null) return;
  const sale = pistas[actual];
  const entra = pistas[1 - actual];
  if (!entra.tema) cargar(entra, siguienteTema());
  entra.el.currentTime = 0;
  void entra.el.play().catch(() => {});
  const ahora = ctx.currentTime;
  fundir(entra, true, ahora, CRUCE);
  if (!sale.el.paused) fundir(sale, false, ahora, CRUCE);
  finCruce = ahora + CRUCE;
}

/** Termina el cruce: la que salió se para y queda cargada con el próximo tema. */
function terminarCruce(): void {
  if (!pistas) return;
  const salio = pistas[actual];
  salio.el.pause();
  salio.ganancia.gain.cancelScheduledValues(0);
  salio.ganancia.gain.value = 0;
  cargar(salio, siguienteTema());
  actual = 1 - actual;
  finCruce = null;
  // Si la que entró no arrancó (su archivo falló en pleno cruce), que arranque
  // ahora con su fundido: si no, se quedaría todo callado hasta el próximo toque.
  const ahora = pistas[actual];
  if (ahora.el.paused && !pausada && ctx) {
    void ahora.el.play().catch(() => {});
    fundir(ahora, true, ctx.currentTime, ENTRADA);
  }
}

/** Mira cada VIGIA_MS si ya toca cruzar o terminar el cruce. Con la hora del audio, que se frena si se pausa. */
function vigilar(): void {
  if (!ctx || !pistas || pausada) return;
  if (finCruce !== null) {
    if (ctx.currentTime >= finCruce) terminarCruce();
    return;
  }
  const p = pistas[actual];
  const largo = duracion(p);
  if (largo > 0 && p.el.currentTime >= largo - CRUCE) cruzar();
}

function aplicarVolumen(sonido: Sonido): void {
  if (!ctx || !salida) return;
  const v = volumenReal(sonido, "musica");
  salida.gain.setTargetAtTime(v, ctx.currentTime, SUAVIZADO);
  pausarPor("muda", v === 0);
}

/** Pausa o reanuda todo según los motivos que queden. */
function acomodar(): void {
  if (!ctx || !pistas) return;
  const callar = motivos.size > 0;
  if (callar === pausada) return;
  pausada = callar;
  if (callar) {
    for (const p of pistas) p.el.pause();
    void ctx.suspend().catch(() => {});
  } else {
    void ctx.resume().catch(() => {});
    void pistas[actual].el.play().catch(() => {});
    if (finCruce !== null) void pistas[1 - actual].el.play().catch(() => {});
  }
}

/** Prende o apaga un motivo para callar la música. Sirve antes de arrancar: queda anotado. */
export function pausarPor(motivo: Motivo, si: boolean): void {
  if (si) motivos.add(motivo);
  else motivos.delete(motivo);
  acomodar();
}

function crearPista(c: AudioContext, destino: AudioNode): Pista {
  const el = new Audio();
  el.preload = "auto";
  const ganancia = c.createGain();
  ganancia.gain.value = 0;
  c.createMediaElementSource(el).connect(ganancia).connect(destino);
  const p: Pista = { el, ganancia, tema: null };
  el.addEventListener("error", () => {
    // Un archivo que no carga: se salta al próximo. Con tope, para no quedar
    // dando vueltas si no carga ninguno (sin conexión en la web, por ejemplo).
    if (++fallos > TEMAS.length * 2 || !pistas) return;
    if (p === pistas[actual] && finCruce === null) {
      cargar(p, siguienteTema());
      void p.el.play().catch(() => {});
      fundir(p, true, c.currentTime, ENTRADA);
    } else {
      cargar(p, siguienteTema());
    }
  });
  el.addEventListener("playing", () => {
    fallos = 0;
  });
  // Por si el vigía no llegó a cruzar (un tema más corto que el cruce, un salto):
  el.addEventListener("ended", () => {
    if (pistas && p === pistas[actual] && finCruce === null) cruzar();
  });
  return p;
}

/**
 * Arranca la música. Hay que llamarla adentro de un toque (o una tecla): es
 * la única forma de que el navegador deje sonar. Llamarla otra vez no hace
 * nada más que reintentar despertar el audio. Devuelve si quedó sonando.
 */
export async function arrancarMusica(): Promise<boolean> {
  if (typeof window === "undefined" || TEMAS.length === 0) return false;
  if (!ctx) {
    const Contexto =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return false;
    ctx = new Contexto();
    salida = ctx.createGain();
    salida.gain.value = 0;
    salida.connect(ctx.destination);
    pistas = [crearPista(ctx, salida), crearPista(ctx, salida)];
    // Las dos se "destraban" adentro del toque (Safari lo pide por elemento);
    // la segunda arranca callada y se para enseguida.
    cargar(pistas[0], siguienteTema());
    cargar(pistas[1], siguienteTema());
    void pistas[1].el.play().then(() => pistas?.[1].el.pause(), () => {});
    void pistas[0].el.play().catch(() => {});
    fundir(pistas[0], true, ctx.currentTime, ENTRADA);
    aplicarVolumen(leerSonido());
    window.addEventListener(EVENTO_SONIDO, (e) => aplicarVolumen(sonidoDelAviso(e)));
    window.setInterval(vigilar, VIGIA_MS);
    // Lo que se pidió callar antes del primer toque (un anuncio, la pantalla
    // oculta) se respeta desde el primer cuadro.
    acomodar();
    /* Para mirar el cruce con Playwright sin esperar un minuto. `NODE_ENV` es
       "production" en los dos builds, así que esto no existe en nada que se
       publique: sólo en `next dev` (el mismo criterio que los anuncios
       simulados de `components/Anuncios.tsx`). */
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __trucoMusica?: object }).__trucoMusica = {
        estado: () => ({
          contexto: ctx?.state,
          actual,
          cruzando: finCruce !== null,
          pausada,
          motivos: [...motivos],
          volumen: salida?.gain.value,
          pistas: pistas?.map((p) => ({
            tema: p.tema?.archivo,
            segundo: p.el.currentTime,
            parada: p.el.paused,
            ganancia: p.ganancia.gain.value,
          })),
        }),
        adelantarHasta: (faltan: number) => {
          if (pistas) pistas[actual].el.currentTime = Math.max(0, duracion(pistas[actual]) - faltan);
        },
      };
    }
  }
  if (!pausada) {
    try {
      await ctx.resume();
    } catch {
      /* sigue suspendido: se reintenta con el próximo toque */
    }
  }
  return ctx.state === "running";
}
