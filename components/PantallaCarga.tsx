"use client";

/**
 * La pantalla de carga de la app. SÓLO en la app: la web no la tiene.
 *
 * ── POR QUÉ EXISTE (2/10/2026) ────────────────────────────────────────────
 * La primera partida tardaba en aparecer y se veía mal mientras tanto. Lo que
 * se puede adelantar se adelanta acá, al abrir la app, para que al tocar
 * "Partida rápida" sólo falte repartir.
 *
 * Desde el 3/10/2026 carga TODO lo de jugar, aunque tarde (hasta 12 s): el
 * código, las mesas probables y las primeras cargas de los anuncios. Lo que
 * NO hace es dejar la mesa montada y escondida para después: eso sería
 * gastar memoria de la GPU todo el tiempo, que es justo el terreno del bug de
 * los píxeles.
 *
 * ── EL ENSAYO (7/10/2026): LA PRIMERA VEZ DE CADA PANTALLA ─────────────────
 * En el teléfono, la PRIMERA visita a "Jugar" y a la mesa congelaba la
 * pantalla 0,9 y 1,1–1,5 s; la segunda, 60 y 200 ms. Medido con una traza de
 * Chromium: casi todo es la GPU (Mali, Vulkan) COMPILANDO sus programas
 * (`VulkanCreateGraphicsPipelines`: 74 para el menú, ~185 para la mesa, hasta
 * 258 ms cada uno). Cada combinación de dibujo nueva —un degradé, una sombra,
 * un texto— se compila la primera vez que se pinta, y queda hecha mientras
 * viva el proceso.
 *
 * Así que acá se PINTAN de verdad, tapadas por esta pantalla, las dos
 * pantallas: se navega a `/jugar`, después a la mesa (que reparte, con sus
 * animaciones), y se vuelve al inicio. Todo con `replace`, que no deja nada
 * en el historial del botón de atrás. Medido en A/B, dos vueltas, alternando
 * arranques en frío: la primera visita al menú pasó de 887–1043 ms a 60–69, y
 * la de la mesa de 1127–1144 a 220–256 (como la segunda visita). Lo paga esta
 * pantalla: ~2 s más, pero es el lugar donde esperar ya se espera.
 *
 * Lo que se probó el 3/10/2026 y no anduvo ("el ensayo general") dibujaba las
 * piezas con `visibility: hidden`: lo escondido NO se pinta, así que la GPU no
 * compilaba nada. Y se midió en la compu, que no tiene este costo. Una copia
 * del HTML pegada debajo tampoco alcanza si no ocupa su lugar: la de la mesa
 * medía 0 px de alto (su alto sale del `flex` del `body`) y no calentó nada.
 * Por eso se navega a la pantalla real y no se fabrica una aparte, que
 * además se desactualizaría sola.
 *
 * ── CÓMO SE VE ────────────────────────────────────────────────────────────
 * El fondo es `noche`, el mismo color con el que Android abre la app (sin
 * logo desde el 3/10/2026: lo pidió Santiago) y el del WebView por debajo:
 * el pase de uno a otro no se nota. Al medio, la marca (el mismo motivo del
 * ícono), abajo una barrita que se llena y un renglón que dice qué se está
 * cargando: "Llamando a Luquita…", "Barajando…", "Casi listo…".
 *
 * La barra la mueve primero el CSS (`.barra-carga-relleno`, en `globals.css`),
 * así que se mueve desde el primer cuadro, antes de que cargue el JavaScript.
 * Después la toma este componente, desde donde iba, y la mueve por los pasos
 * que terminaron de verdad.
 *
 * ── SE VA DE GOLPE ────────────────────────────────────────────────────────
 * Sin fundido. Una capa de pantalla completa que se funde es una capa
 * compuesta animándose justo en un cambio de escena, y este proyecto no midió
 * eso contra el bug de los píxeles. Por las dudas, no.
 *
 * ── NUNCA SE TRABA ────────────────────────────────────────────────────────
 * Dos redes. La de acá: a los `MS_MAXIMO_PANTALLA_CARGA` se va aunque la carga
 * no haya terminado. La del CSS: a los 14 s se esconde sola aunque el
 * JavaScript no haya llegado a correr nunca.
 */

import { useRouter } from "next/navigation";
import { type Ref, useEffect, useRef, useState } from "react";

import { arrancarAnuncios } from "@/components/Anuncios";
import { Marca } from "@/components/Marca";
import { gestor } from "@/lib/anuncios";
import { portero } from "@/lib/entrada";
import { leerProgreso } from "@/lib/progreso";

/** Lo mínimo que se ve, para que no sea un parpadeo. Desde que abre la página. */
export const MS_MINIMO_PANTALLA_CARGA = 800;

/**
 * Lo máximo: si la carga tarda más, la pantalla se va igual. Eran 4 s; el
 * 3/10/2026 Santiago pidió que cargue TODO aunque tarde, con 12 s de tope
 * "para que en los celulares muy malos tarde como mucho eso pero ande bien".
 */
export const MS_MAXIMO_PANTALLA_CARGA = 12000;

/** Lo que tarda la barra en llenarse del todo antes de que la pantalla se vaya. */
const MS_COMPLETAR_BARRA = 200;

/** Cada cuánto avanza la barra mientras un paso todavía no terminó. */
const MS_PASO_BARRA = 250;

/** Espera hasta que hayan pasado `ms` desde que se abrió la página. */
const hasta = (ms: number) =>
  new Promise<void>((listo) => setTimeout(listo, Math.max(0, ms - performance.now())));

type Fase = "cargando" | "completa" | "fuera";

/** Espera `n` cuadros, sin pasar de `tope` ms. */
const cuadros = (n: number, tope: number) =>
  new Promise<void>((listo) => {
    const corte = setTimeout(listo, tope);
    let quedan = n;
    const uno = () => {
      if (--quedan > 0) requestAnimationFrame(uno);
      else {
        clearTimeout(corte);
        listo();
      }
    };
    requestAnimationFrame(uno);
  });

const pausa = (ms: number) => new Promise<void>((listo) => setTimeout(listo, ms));

/** La ruta sin la barra final que agrega el build de la app (`trailingSlash`). */
const rutaActual = () => location.pathname.replace(/(.)\/$/, "$1");

/**
 * Las pantallas que se ensayan, en orden. `lista` dice cuándo ya está
 * dibujada (la mesa primero muestra "Cargando" hasta armar la partida), y
 * después se esperan `cuadros` pintados y al menos `ms`: con la GPU
 * compilando, cada cuadro tarda en salir, así que contar cuadros espera lo
 * que haga falta en un teléfono lento y poco en uno rápido. En la mesa, 1600
 * ms cubren el reparto entero (1370), que es lo que estrena las animaciones.
 */
const ETAPAS: readonly { href: string; lista: () => boolean; cuadros: number; ms: number }[] = [
  { href: "/jugar", lista: () => true, cuadros: 6, ms: 300 },
  { href: "/jugar/mesa", lista: () => !!document.querySelector(".escena"), cuadros: 12, ms: 1600 },
];

/** Lo máximo que se espera a que una navegación del ensayo llegue. */
const MS_TOPE_ETAPA = 4000;

/**
 * EL ENSAYO: pinta el menú y la mesa debajo de la pantalla de carga y vuelve
 * al inicio (ver el comentario de arriba del archivo).
 *
 * Sólo si la app abrió en el inicio, que es lo normal: si Android la restauró
 * en otra pantalla, no se la arrastra a ningún lado. `volver` es lo que
 * garantiza que la pantalla de carga nunca se vaya mostrando la mesa del
 * ensayo: se llama antes de irse, también cuando se llegó al tope.
 */
function crearEnsayo(router: { replace: (href: string) => void }) {
  const enInicio = rutaActual() === "/";
  let afuera = false;
  let cortado = false;
  const llegar = async (cumple: () => boolean) => {
    const fin = performance.now() + MS_TOPE_ETAPA;
    while (!cumple() && performance.now() < fin) await pausa(50);
  };
  const volver = async () => {
    cortado = true;
    if (!afuera) return;
    afuera = false;
    router.replace("/");
    await llegar(() => rutaActual() === "/");
    // Que el inicio ya esté pintado cuando esta pantalla se vaya.
    await cuadros(2, 500);
  };
  return {
    async correr() {
      if (!enInicio) return;
      for (const etapa of ETAPAS) {
        if (cortado) return;
        afuera = true;
        router.replace(etapa.href);
        await llegar(() => rutaActual() === etapa.href && etapa.lista());
        await Promise.all([pausa(etapa.ms), cuadros(etapa.cuadros, MS_TOPE_ETAPA)]);
      }
      await volver();
    },
    volver,
  };
}

/**
 * Los pasos de la carga, en el orden en que se nombran abajo de la barra.
 * Corren los tres en paralelo. El peso es cuánto de la barra ocupa cada uno:
 * los anuncios son los que más tardan, porque dependen de la red.
 */
const PASOS = ["mesas", "codigo", "ensayo", "anuncios"] as const;
type Paso = (typeof PASOS)[number];
const PESO: Record<Paso, number> = { mesas: 2, codigo: 3, ensayo: 2, anuncios: 4 };
const PESO_TOTAL = PASOS.reduce((t, p) => t + PESO[p], 0);

/** Lo que dice abajo de la barra: el primer paso que falta. */
function textoDe(pendiente: Paso | undefined, rival: string | null): string {
  switch (pendiente) {
    case "mesas":
      // El nombre sale de la tabla de rivales del código, no del almacenamiento
      return rival ? `Llamando a ${rival}…` : "Armando la mesa…";
    case "codigo":
      return "Barajando…";
    case "ensayo":
      return "Acomodando la mesa…";
    default:
      return "Casi listo…";
  }
}

/**
 * En la web devuelve `null` y nada más. `NEXT_PUBLIC_DESTINO` se fija al
 * compilar: en el build de la web la condición es constante, el minificador
 * tira `PantallaDeLaApp` entera, y con ella la precarga y sus imports. Sin esto el código viajaba igual en el paquete que la web baja en
 * cada página (medido el 3/10/2026), aunque el layout no la monte nunca.
 */
export function PantallaCarga() {
  if (process.env.NEXT_PUBLIC_DESTINO !== "app") return null;
  return <PantallaDeLaApp />;
}

/**
 * Lo que se carga mientras se ve la pantalla, en cuatro pasos:
 *
 *  · **mesas**: las imágenes de las mesas probables, decodificadas: la del
 *    rival de la Partida rápida (el de la última vez, o Luquita) y la de la
 *    próxima parada de la Gira;
 *  · **código**: el de las pantallas de jugar (`lib/precarga.ts`, importado
 *    acá adentro para no sumarle peso al primer paquete);
 *  · **ensayo**: con los dos anteriores ya listos, pintar el menú y la mesa
 *    debajo de esta pantalla, para que la GPU compile sus programas acá y no
 *    al tocar "Jugar" (ver arriba y `crearEnsayo`);
 *  · **anuncios**: el arranque de AdMob Y sus primeras cargas, hasta que
 *    terminan (`gestor.cargasQuietas`). Hasta el 3/10/2026 se esperaba sólo el
 *    arranque, y las cargas seguían cuando ya estabas tocando "Jugar".
 *
 * Si la Gira tiene candado, su próxima parada no se precarga: no se va a jugar.
 */
function PantallaDeLaApp() {
  const [fase, setFase] = useState<Fase>("cargando");
  const [hechos, setHechos] = useState<ReadonlySet<Paso>>(() => new Set());
  const [rival, setRival] = useState<string | null>(null);
  /** El JavaScript ya maneja la barra (antes la movía el CSS solo). */
  const [barraConJs, setBarraConJs] = useState(false);
  const relleno = useRef<HTMLDivElement>(null);
  /** Lo mismo que `hechos`, para el reloj de la barra (que no se rearma). */
  const hechosRef = useRef(hechos);
  useEffect(() => {
    hechosRef.current = hechos;
  }, [hechos]);
  const router = useRouter();

  useEffect(() => {
    let viva = true;
    const tiempos: Partial<Record<Paso, number>> = {};
    const marcar = (paso: Paso) => {
      tiempos[paso] = Math.round(performance.now());
      // Para las herramientas: `mirar-carga.mjs` lee estas marcas.
      performance.mark(`carga:${paso}`);
      if (viva) setHechos((h) => new Set(h).add(paso));
    };
    // Ningún paso rechaza hacia acá: si algo falla, el paso se da por hecho.
    const paso = (nombre: Paso, p: Promise<unknown>) =>
      p.catch(() => {}).then(() => marcar(nombre));

    portero.refrescar();
    const conGira = !portero.leerCandados().gira;
    const precarga = import("@/lib/precarga").then((m) => {
      const datos = leerProgreso();
      if (viva) setRival(m.rivalDeLaRapida(datos).nombre);
      return m.precargarJuego({ prefetch: (href) => router.prefetch(href), datos, conGira });
    });
    const mesas = paso("mesas", precarga.then((c) => c.mesas));
    const codigo = paso("codigo", precarga.then((c) => c.codigo));
    const anuncios = paso(
      "anuncios",
      arrancarAnuncios().then(() => gestor.cargasQuietas()),
    );

    // Con la mesa y su código ya cargados, así cada navegación es inmediata.
    const ensayo = crearEnsayo(router);
    const ensayado = paso(
      "ensayo",
      Promise.all([mesas, codigo]).then(() => (viva ? ensayo.correr() : undefined)),
    );

    const todo = Promise.all([mesas, codigo, ensayado, anuncios]);
    let alTope = false;
    Promise.race([
      Promise.all([todo, hasta(MS_MINIMO_PANTALLA_CARGA)]),
      hasta(MS_MAXIMO_PANTALLA_CARGA).then(() => {
        alTope = true;
      }),
    ])
      // Al tope, el ensayo puede haber quedado en la mesa: primero se vuelve.
      .then(() => ensayo.volver())
      .then(() => {
        /* Los tiempos de cada paso, en ms desde que se abrió la app. En el APK
           de depuración Capacitor los manda a `logcat`, que es lo que lee
           `celular-usb.mjs --tiempos`; en el de release no se registra nada.
           Son sólo números. */
        const ms = (p: Paso) => (tiempos[p] === undefined ? "—" : `${tiempos[p]} ms`);
        console.info(
          `[carga] mesas ${ms("mesas")} · código ${ms("codigo")} · ensayo ${ms("ensayo")} · ` +
            `anuncios ${ms("anuncios")} · se fue a los ${Math.round(performance.now())} ms` +
            (alTope ? " (TOPE)" : ""),
        );
        if (!viva) return;
        setFase("completa");
        setTimeout(() => viva && setFase("fuera"), MS_COMPLETAR_BARRA);
      });
    return () => {
      viva = false;
    };
    // Una sola vez por carga de página: es la pantalla del arranque. El router
    // de Next es el mismo objeto toda la vida de la página.
  }, [router]);

  /* LA BARRA. Antes del JavaScript la mueve el CSS solo; acá la toma el
     JavaScript, desde donde iba, y la mueve por los pasos que terminaron.
     Mientras falta algo sigue avanzando, cada vez más despacio y sin llegar
     nunca al final: una barra quieta parece una app trabada. Con "menos
     movimiento" pedido, sólo salta cuando termina un paso. */
  useEffect(() => {
    const el = relleno.current;
    if (!el) return;
    const quieta = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Dónde la dejó el CSS: `matrix(a, b, c, d, e, f)`, y `a` es la escala.
    const m = /matrix\(([^,]+)/.exec(getComputedStyle(el).transform);
    let mostrado = m ? Number(m[1]) || 0.04 : 0.04;
    const poner = () => el.style.setProperty("--avance", mostrado.toFixed(3));
    poner();
    setBarraConJs(true);
    const id = setInterval(() => {
      /* Cuando la pantalla se va, el componente sigue montado y devuelve
         `null`: este efecto no se desarma nunca, y el reloj seguía
         despertando al JavaScript cada 250 ms toda la sesión (7/10/2026). */
      if (!el.isConnected) {
        clearInterval(id);
        return;
      }
      const real =
        [...hechosRef.current].reduce((t, p) => t + PESO[p], 0) / PESO_TOTAL;
      // Lo que falta, se va acercando al 60% de eso sin llegar nunca.
      const techo = quieta ? real : real + (1 - real) * 0.6;
      mostrado = Math.max(mostrado, real, mostrado + (techo - mostrado) * 0.08);
      poner();
    }, MS_PASO_BARRA);
    return () => clearInterval(id);
  }, []);

  if (fase === "fuera") return null;

  const pendiente = PASOS.find((p) => !hechos.has(p));

  return (
    <div
      data-pantalla-carga
      data-completa={fase === "completa" ? "true" : undefined}
      data-avance-js={barraConJs ? "true" : undefined}
      className="pantalla-carga fixed inset-0 z-[70] flex flex-col items-center justify-center bg-noche px-6"
    >
      <Marca alto="clamp(6.5rem, 21vh, 10.5rem)" idHalo="halo-marca-carga" />
      <p className="mt-[clamp(0.5rem,2vh,1rem)] font-[family-name:var(--font-display)] text-[clamp(1.6rem,4.6vh,2.25rem)] leading-none text-dorado">
        Truco Uruguayo
      </p>

      <div
        role="status"
        aria-label="Cargando"
        className="mt-[clamp(1.75rem,6vh,3rem)] flex flex-col items-center gap-[clamp(0.6rem,1.6vh,0.9rem)]"
      >
        <BarraCarga refRelleno={relleno} />
        <p
          aria-hidden="true"
          className="font-[family-name:var(--font-ui)] text-[0.7rem] uppercase tracking-[0.3em] text-crema/55"
        >
          {textoDe(pendiente, rival)}
        </p>
      </div>
    </div>
  );
}

/**
 * La barrita, sola: la usa esta pantalla y el "Repartiendo…" de la mesa. Se
 * mueve por CSS (`.barra-carga-relleno`, en `globals.css`), así que anda
 * desde el primer cuadro, antes del JavaScript.
 */
export function BarraCarga({
  className = "",
  refRelleno,
}: {
  className?: string;
  /** Para la pantalla de carga, que la mueve con JavaScript por pasos. */
  refRelleno?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={`h-2 w-[min(62vw,15rem)] overflow-hidden rounded-full border border-dorado/45 bg-black/45 ${className}`}
    >
      <div ref={refRelleno} className="barra-carga-relleno h-full w-full rounded-full bg-dorado" />
    </div>
  );
}
