/**
 * Precargar lo que la mesa necesita ANTES de que la persona toque "Jugar".
 * (Desde el 3/10/2026.)
 *
 * ── QUÉ SE PRECARGA Y QUÉ NO ──────────────────────────────────────────────
 * Lo único que la mesa BAJA son dos imágenes por departamento: la madera y el
 * ambiente de atrás (`/escenas/<depto>-mesa.webp` y `-fondo.webp`). El rival,
 * la mano y las cartas son dibujos de código: no hay nada que bajar.
 *
 * Hasta este día las imágenes recién se pedían con la escena ya montada: se
 * pintaba un color liso y la textura "saltaba" encima un rato después. Eso es
 * un segundo redibujado de toda la escena justo después del cambio de
 * pantalla, que es el terreno del bug de los píxeles.
 *
 * ── POR QUÉ NO SE PRECARGAN LAS 19 ────────────────────────────────────────
 * Cada departamento ocupa ~10,5 MB una vez decodificado (1400×900 de mesa y
 * 2000×750 de fondo, a 4 bytes por píxel). Las 19 serían ~200 MB, y en un
 * teléfono de gama baja eso es presión de memoria de la GPU: justo lo que no
 * hay que darle al bug de los píxeles. Se precargan las probables —el rival de
 * la Partida rápida y la próxima parada de la Gira— y se guardan como mucho
 * `MAX_DEPARTAMENTOS_EN_MEMORIA`.
 *
 * Probable con `node --test`: la parte que decide QUÉ precargar es pura.
 */

import { escenaDe } from "./ambientes.ts";
import { hrefDe } from "./entrada.ts";
import type { Escena } from "./escenas.ts";
import { type Marcas, armarGira, proximaParada } from "./gira.ts";
import { buscarPersonalidad } from "./motor/personalidades.ts";

/** Cuántos departamentos se precargan al arrancar. */
export const MAX_DEPARTAMENTOS_A_PRECARGAR = 2;

/** Cuántos se guardan decodificados a la vez (los más viejos se sueltan). */
export const MAX_DEPARTAMENTOS_EN_MEMORIA = 3;

/** Lo máximo que la mesa espera a su escena antes de repartir igual. */
export const MS_TOPE_ESPERA_ESCENA = 1200;

/**
 * Lo máximo que se espera al código de las pantallas de jugar. Era 2,5 s; con
 * la pantalla de carga de hasta 12 s (3/10/2026) sube a 6, para que un
 * teléfono lento no la deje ir antes de tener el código.
 */
export const MS_TOPE_ESPERA_CODIGO = 6000;

// ───────────────────────────── La parte pura ─────────────────────────────

/**
 * Los departamentos que probablemente se jueguen, sin repetir:
 *
 *  1. el del rival de la Partida rápida: el último elegido, o el de siempre si
 *     no hay (es lo mismo que hace la mesa: `buscarPersonalidad` cae en LUKI);
 *  2. el de la próxima parada de la Gira, si la Gira está abierta.
 *
 * `datos` sale de `leerProgreso()`, que ya viene saneado; igual, un
 * `ultimoRival` que no existe cae en el rival de siempre y no rompe nada.
 */
export function departamentosAPrecargar(
  datos: { ultimoRival: string | null; rivales: Marcas },
  conGira: boolean,
): string[] {
  const lista: string[] = [];
  const sumar = (depto: string) => {
    if (!lista.includes(depto) && lista.length < MAX_DEPARTAMENTOS_A_PRECARGAR) lista.push(depto);
  };
  sumar(rivalDeLaRapida(datos).departamento);
  if (conGira) {
    const proxima = proximaParada(armarGira(datos.rivales));
    if (proxima) sumar(proxima.personalidad.departamento);
  }
  return lista;
}

/**
 * El rival que va a tener enfrente la Partida rápida: el último elegido, o el
 * de siempre (Luquita) si no hay. Es la misma cuenta que hace la mesa.
 */
export const rivalDeLaRapida = (datos: { ultimoRival: string | null }) =>
  buscarPersonalidad(datos.ultimoRival ?? "");

/** Una promesa que se cumple con `p` o a los `ms`, lo que pase primero. Nunca rechaza. */
export function conTope(p: Promise<unknown>, ms: number, esperar = setTimeout): Promise<void> {
  return new Promise<void>((listo) => {
    esperar(listo, ms);
    p.then(
      () => listo(),
      () => listo(),
    );
  });
}

// ─────────────────────────── La parte del navegador ───────────────────────

/** Por departamento: las imágenes vivas y la promesa de su decodificación. */
const enMemoria = new Map<string, { imagenes: HTMLImageElement[]; lista: Promise<void> }>();

function decodificar(url: string): { imagen: HTMLImageElement; lista: Promise<void> } {
  const imagen = new Image();
  imagen.decoding = "async";
  imagen.src = url;
  // Una imagen que no decodifica no es motivo para trabar nada: la mesa la
  // pide igual con su `<img>`, y ahí se ve el color de reserva.
  return { imagen, lista: imagen.decode().catch(() => {}) };
}

/**
 * Baja y decodifica las dos imágenes de una escena. Si ya estaban, no hace
 * nada. Los `Image` se guardan: mientras haya una referencia viva, el
 * navegador no tira lo que ya bajó y decodificó.
 */
export function precargarEscena(escena: Escena): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const clave = escena.mesa;
  const ya = enMemoria.get(clave);
  if (ya) {
    // Se vuelve a poner al final: es el más reciente.
    enMemoria.delete(clave);
    enMemoria.set(clave, ya);
    return ya.lista;
  }
  const fondo = decodificar(escena.fondo);
  const mesa = decodificar(escena.mesa);
  const entrada = {
    imagenes: [fondo.imagen, mesa.imagen],
    lista: Promise.all([fondo.lista, mesa.lista]).then(() => {}),
  };
  enMemoria.set(clave, entrada);
  // El más viejo se suelta. La mesa que se está jugando tiene su propio `<img>`.
  while (enMemoria.size > MAX_DEPARTAMENTOS_EN_MEMORIA) {
    const masViejo = enMemoria.keys().next().value;
    if (masViejo === undefined) break;
    enMemoria.delete(masViejo);
  }
  return entrada.lista;
}

/** Lo mismo, por nombre de departamento. Uno que no existe cae en Montevideo. */
export const precargarDepartamento = (depto: string) => precargarEscena(escenaDe(depto));

/**
 * Lo que espera la mesa antes de repartir: la escena decodificada, o el tope.
 * NUNCA rechaza y nunca tarda más que `tope`: en el peor caso la mesa entra
 * como antes, con el color de reserva mientras llega la imagen.
 */
export const esperarEscena = (escena: Escena, tope = MS_TOPE_ESPERA_ESCENA) =>
  conTope(precargarEscena(escena), tope);

/**
 * Se cumple cuando ya bajó el código de las pantallas pedidas: bajó la
 * PÁGINA de cada una de esas rutas (el `…__PAGE__.txt` de Next) y después el
 * navegador lleva `quieto` ms sin terminar de bajar nada nuevo, que es la
 * ráfaga de código que esa página pide. Nunca tarda más que `tope`.
 *
 * Existe porque `router.prefetch` de Next no devuelve una promesa: anota la
 * pantalla y la baja cuando le parece, en segundo plano. Medido el 3/10/2026
 * con `mirar-carga.mjs`: la pantalla de carga se iba al segundo y Next recién
 * después bajaba los cuatro archivos de la mesa. Esperar "a que la red esté
 * quieta" no alcanzaba, porque al principio está quieta: Next todavía no
 * empezó. Y esperar a ver CUALQUIER archivo de la ruta tampoco: el primero
 * que baja es el índice de rutas (`__next._tree.txt`), antes que la página, y
 * con los archivos fríos (la primera vez que se abre la app) el hueco entre
 * los dos superaba el `quieto`. Por eso se espera a la página misma.
 *
 * Si Next cambiara ese nombre, esto esperaría hasta el `tope` en cada
 * arranque, y `mirar-carga.mjs` avisa si el paso del código empieza a tardar
 * de más (lo mide con la marca `carga:codigo` de la pantalla de carga).
 */
export function esperarCodigo(
  rutas: string[],
  quieto = 300,
  tope = MS_TOPE_ESPERA_CODIGO,
): Promise<void> {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
    return Promise.resolve();
  }
  return new Promise<void>((listo) => {
    const faltan = new Set(rutas);
    let obs: PerformanceObserver | null = null;
    let quietud: ReturnType<typeof setTimeout> | undefined;
    const fin = () => {
      obs?.disconnect();
      clearTimeout(quietud);
      clearTimeout(limite);
      listo();
    };
    const limite = setTimeout(fin, tope);
    try {
      obs = new PerformanceObserver((lista) => {
        for (const e of lista.getEntries()) {
          let camino: string;
          try {
            camino = new URL(e.name, location.href).pathname;
          } catch {
            continue; // un nombre raro no es motivo para cortar: queda el tope
          }
          if (!camino.includes("__PAGE__")) continue;
          for (const r of faltan) if (camino.startsWith(r)) faltan.delete(r);
        }
        if (faltan.size === 0) {
          clearTimeout(quietud);
          quietud = setTimeout(fin, quieto);
        }
      });
      // `buffered`: lo que ya terminó de bajar antes de empezar a mirar, también cuenta
      obs.observe({ type: "resource", buffered: true });
    } catch {
      fin();
    }
  });
}

/**
 * Todo lo del arranque. `prefetch` es el del router de Next (se inyecta para
 * que este archivo no dependa de Next y se pueda probar en Node).
 *
 * Devuelve las dos esperas por separado —el código y las mesas— para que la
 * pantalla de carga mueva la barra por pasos de verdad. Ninguna rechaza.
 */
export function precargarJuego({
  prefetch,
  datos,
  conGira,
}: {
  prefetch: (href: string) => void;
  datos: { ultimoRival: string | null; rivales: Marcas };
  conGira: boolean;
}): { codigo: Promise<void>; mesas: Promise<void> } {
  // El código de las pantallas de jugar. Next lo trae en segundo plano. Las
  // direcciones salen de `lib/entrada.ts`, que es el dueño de esas rutas.
  const mesa = hrefDe({ modo: "rapida" });
  const gira = hrefDe({ modo: "gira" });
  for (const ruta of ["/jugar", mesa, gira]) {
    try {
      prefetch(ruta);
    } catch {
      // Precargar es una ayuda: si falla, la pantalla se baja al entrar, como antes.
    }
  }
  return {
    codigo: esperarCodigo([mesa, gira]),
    mesas: Promise.all(departamentosAPrecargar(datos, conGira).map(precargarDepartamento)).then(
      () => {},
    ),
  };
}
