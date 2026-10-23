"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Candado } from "@/components/Candado";
import { EntradaAnotador, useCandados } from "@/components/EntradaJuego";
import { gestor } from "@/lib/anuncios";
import { RUTA_ANOTADOR, portero } from "@/lib/entrada";
import { seccionDe, type Seccion } from "@/lib/navegacion";
import {
  BARRAS,
  PASO,
  SONIDO_POR_DEFECTO,
  type Barra,
  type Sonido,
  guardarSilencio,
  guardarVolumen,
  leerSonido,
} from "@/lib/sonido";

/**
 * El engranaje de la barra de arriba, y el panel que abre.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * Hasta el 8/9/2026 la barra tenía dos atajos escritos, "Aprender" y "Jugar", y
 * ésos eran TODOS los huecos que hay: a 320px de ancho, con el volver a la
 * izquierda, no entra un tercero. El día que apareció el anotador ya eran tres,
 * y el sonido va a ser el cuarto.
 *
 * Un engranaje ocupa un hueco y adentro entran los que sean. Se paga con un
 * toque de más para ir a Jugar; se cobra en que la barra deja de ser el techo
 * de lo que la app puede ofrecer.
 *
 * ── Tres cosas que el panel hace gratis por ser un `dialog` ───────────────
 *
 * 1. **El botón físico de atrás de Android lo cierra sin saber que existe.**
 *    `components/BotonAtrasAndroid.tsx` busca `[role="dialog"][aria-modal="true"]`
 *    y le manda `Escape` en vez de navegar. Ese contrato ya lo cumple la vitrina
 *    de trofeos; con las mismas dos propiedades puestas acá, el atrás cierra el
 *    panel en vez de sacarte de la pantalla, y no hubo que tocar ese archivo.
 * 2. **`Escape` y el foco**, con el mismo patrón de `components/Trofeos.tsx`:
 *    al abrir, el foco va al botón de cerrar. Sin eso, abrirlo con el teclado
 *    te deja el foco atrás, sobre una pantalla que ya no ves.
 * 3. **El lector de pantalla anuncia que se abrió algo encima**, que es lo que
 *    de verdad está pasando.
 *
 * ── Por qué el fondo es OPACO y no translúcido ────────────────────────────
 *
 * `bg-noche` a secas, sin `/95` ni `backdrop-blur`. Una hoja translúcida que
 * tapa la pantalla entera obliga al navegador a dibujar todo lo de abajo en una
 * superficie aparte para poder mezclarla, y superficies compuestas de más es
 * EXACTAMENTE el bug de las manchitas que este proyecto viene peleando desde el
 * 1/9/2026 (está contado en `README.md` y en `Historial.md`). No se ve peor: se
 * ve como una pantalla, que es lo que es.
 */

/**
 * Los ocho dientes del engranaje, calculados UNA vez al cargar el módulo.
 *
 * Se calculan en vez de escribirse a mano porque son ocho pares de coordenadas
 * con senos y cosenos adentro, y una tabla de dieciséis números copiada a mano
 * es un lugar donde nadie va a ver un error. Al ser una constante de módulo, el
 * costo en cada dibujo es cero.
 *
 * Van de r=5,4 a r=8,6 sobre un lienzo de 24: arrancan ADENTRO del círculo para
 * que no quede una ranura entre el diente y la rueda. Empezaron llegando a 9,2
 * y con el trazo fino, y en la captura no era un engranaje: era un sol. Un
 * diente corto y gordo se lee como diente; uno largo y flaco, como rayo.
 */
const DIENTES = Array.from({ length: 8 }, (_, i) => {
  const angulo = (i * Math.PI) / 4;
  const [cx, cy] = [Math.cos(angulo), Math.sin(angulo)];
  return {
    x1: 12 + cx * 5.4,
    y1: 12 + cy * 5.4,
    x2: 12 + cx * 8.6,
    y2: 12 + cy * 8.6,
  };
});

/**
 * Adónde se puede ir desde el panel.
 *
 * `seccion` es contra qué se compara para marcar dónde estás parado, y sale de
 * `seccionDe()` en `lib/navegacion.ts`: la misma función que ya usaba la barra
 * para encender un atajo. Marcar la pantalla en la que ya estás evita el toque
 * al pedo de ir a donde ya estabas.
 */
const DESTINOS: { href: string; texto: string; detalle: string; seccion: Seccion }[] = [
  {
    href: "/aprender",
    texto: "Aprender a jugar",
    detalle: "Las lecciones, de cero",
    seccion: "aprender",
  },
  {
    href: "/jugar",
    texto: "Jugar",
    detalle: "Partida suelta o la gira nacional",
    seccion: "jugar",
  },
  {
    href: RUTA_ANOTADOR,
    texto: "Anotador",
    detalle: "La tablita, para cuando jugás con cartas de verdad",
    seccion: "anotador",
  },
];

/**
 * Cómo se llama cada barra en pantalla.
 *
 * El orden lo pone `BARRAS` en `lib/sonido.ts` y no esta tabla: el general va
 * primero porque manda sobre los otros tres, y se lee como un título de los que
 * vienen abajo.
 */
const ETIQUETA: Record<Barra, string> = {
  general: "General",
  musica: "Música",
  voces: "Voces",
  efectos: "Efectos",
};

export function MenuAjustes() {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname() ?? "/";
  const seccion = seccionDe(ruta);
  const cerrar = useRef<HTMLButtonElement>(null);
  const [sonido, setSonido] = useState<Sonido>(SONIDO_POR_DEFECTO);
  const candados = useCandados();
  /* "Privacidad de los anuncios" existe sólo si Google lo exige: en Europa y
     el Reino Unido, el formulario de consentimiento (UMP) obliga a dejar una
     forma de cambiar lo que se eligió. En Uruguay y en la web, no aparece. */
  const [pidePrivacidad, setPidePrivacidad] = useState(false);

  /**
   * Abrir el panel: primero los volúmenes, después el panel.
   *
   * ── POR QUÉ ACÁ Y NO EN UN `useEffect` ────────────────────────────────
   *
   * Con la lectura en un efecto, el panel se dibujaba UN CUADRO con los valores
   * de fábrica y recién después se corregía. O sea que quien tenía la música en
   * 25 veía 60 por un instante al abrir.
   *
   * Se descubrió el 10/9/2026 con `mirar-web.mjs`, que leyó la barra apenas
   * apareció el panel y la encontró en 60 con 25 guardado. **La corrida
   * anterior había pasado**, y pasó por suerte: el efecto le había ganado de
   * mano. No se veía leyendo el código.
   *
   * Acá no hay nada que corregir después: cuando el panel existe, el estado ya
   * es el bueno. Y sigue sin leerse al montar —esto vive adentro de la barra,
   * que no se desmonta nunca—, así que no hay un `JSON.parse` en cada carga de
   * cada pantalla del sitio. Tampoco hay nada que hidratar: esto corre desde un
   * toque, o sea mucho después.
   */
  const abrirPanel = () => {
    setSonido(leerSonido());
    setPidePrivacidad(gestor.pidePrivacidad());
    setAbierto(true);
  };

  /* Al cambiar de pantalla, el panel se cierra solo. Hace falta porque la barra
     —y con ella esto— no se desmonta al navegar: sin esto, tocar "Jugar" te
     dejaba en el menú de jugar con el panel todavía puesto encima. */
  useEffect(() => {
    setAbierto(false);
  }, [ruta]);

  /* Si desde acá se toca algo bloqueado (el anotador, en la app), se abre el
     diálogo de desbloqueo y este panel se cierra. Sin esto quedarían DOS
     diálogos apilados, y un solo "atrás" de Android cerraría los dos. */
  useEffect(
    () =>
      portero.suscribir(() => {
        if (portero.leerDialogo()) setAbierto(false);
      }),
    [],
  );

  useEffect(() => {
    if (!abierto) return;
    cerrar.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={abrirPanel}
        aria-label="Ajustes"
        aria-expanded={abierto}
        className="rounded p-2 text-crema/85 transition-colors hover:bg-black/25 hover:text-dorado"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {DIENTES.map((d, i) => (
              <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} />
            ))}
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2.3" />
          </g>
        </svg>
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-ajustes"
          className="hoja-completa fixed inset-0 z-50 flex flex-col bg-noche"
        >
          <header className="madera flex shrink-0 items-center justify-between border-b-2 filo-dorado px-3 py-2.5">
            <h2
              id="titulo-ajustes"
              className="font-[family-name:var(--font-display)] text-xl text-dorado"
            >
              Ajustes
            </h2>
            <button
              ref={cerrar}
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar ajustes"
              className="rounded px-2 py-1.5 text-crema/80 transition-colors hover:bg-black/30 hover:text-crema"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M6 6 L18 18 M18 6 L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <div className="mx-auto flex w-full max-w-md flex-col gap-2">
              {DESTINOS.map((d) => {
                const acá = seccion === d.seccion;
                const clase = `rounded border-2 px-4 py-3 transition-colors ${
                  acá
                    ? "border-dorado bg-black/40"
                    : "border-crema/15 bg-black/25 hover:border-dorado/60 hover:bg-black/40"
                }`;
                const contenido = (
                  <>
                    <span className="block font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-crema">
                      {d.texto}
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug text-crema/60">
                      {d.detalle}
                    </span>
                  </>
                );
                /* El anotador entra por la puerta de todos (`lib/entrada.ts`):
                   en la app tiene candado hasta mirar un video, una vez. */
                if (d.seccion === "anotador") {
                  return (
                    <EntradaAnotador
                      key={d.href}
                      etiquetaBloqueado="Anotador, bloqueado: se desbloquea una sola vez mirando un video corto"
                      className={clase}
                    >
                      {candados.anotador ? (
                        <>
                          <span className="flex items-center gap-2 font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-crema">
                            {d.texto}
                            <Candado className="h-4 w-4 text-dorado" />
                          </span>
                          <span className="mt-0.5 block text-sm leading-snug text-dorado/80">
                            Se desbloquea una vez, con un video corto
                          </span>
                        </>
                      ) : (
                        contenido
                      )}
                    </EntradaAnotador>
                  );
                }
                return (
                  <Link
                    key={d.href}
                    href={d.href}
                    aria-current={acá ? "page" : undefined}
                    className={clase}
                  >
                    {contenido}
                  </Link>
                );
              })}

              {/* ── EL SONIDO ──────────────────────────────────────────────
                  Hasta el 10/9/2026 acá había un botón apagado que decía
                  "Próximamente". Desde entonces las barras andan y lo que
                  mueven se guarda, y desde el 21/10/2026 SUENA LA MÚSICA
                  (`lib/audio.ts`): mover la barra de Música o la general la
                  cambia en el momento. Las voces y los efectos todavía no
                  están en el juego: las voces están hechas, pero Santiago las
                  está escuchando una por una antes de que entren.

                  Y POR ESO SE DICE EN PANTALLA QUÉ SUENA Y QUÉ NO. Sin esa
                  línea, mover la barra de Voces y no escuchar nada no se lee
                  como "todavía no están": se lee como que está roto. */}
              <section aria-labelledby="titulo-sonido" className="mt-5 border-t-2 border-crema/10 pt-4">
                <h3
                  id="titulo-sonido"
                  className="font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-crema"
                >
                  Sonido
                </h3>
                <p className="mt-0.5 text-sm leading-snug text-crema/55">
                  Por ahora suena la música; las voces y los efectos vienen después.
                  Lo que elijas acá queda guardado.
                </p>

                {/* El interruptor general existe ADEMÁS del maestro porque bajar
                    el maestro a cero te hace perder el nivel que tenías: al
                    volver a prender no hay a qué volver. Silenciar no toca un
                    solo volumen, y eso está probado en `lib/sonido.test.ts`.

                    `role="switch"` y no un checkbox: es lo que hace que el
                    lector de pantalla diga "activado/desactivado" en vez de
                    "casilla marcada", que es lo que esto es. */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={sonido.silencio}
                  onClick={() => setSonido(guardarSilencio(!sonido.silencio))}
                  className="mt-3 flex w-full items-center justify-between rounded border-2 border-crema/15 bg-black/25 px-4 py-3 text-left transition-colors hover:border-dorado/60 hover:bg-black/40"
                >
                  <span className="font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-crema">
                    Silenciar todo
                  </span>
                  {/* La perilla se mueve con `left` y no con `translate`: una
                      transformación le pide al navegador una superficie
                      compuesta propia, que es la moneda con la que se paga el
                      bug de las manchitas. `left` mueve y no promueve nada. */}
                  <span
                    aria-hidden="true"
                    className={`relative h-6 w-11 shrink-0 rounded-full border-2 transition-colors ${
                      sonido.silencio
                        ? "border-dorado bg-dorado/25"
                        : "border-crema/25 bg-black/40"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full transition-[left,background-color] duration-150 ${
                        sonido.silencio ? "left-[1.375rem] bg-dorado" : "left-0.5 bg-crema/45"
                      }`}
                    />
                  </span>
                </button>

                {/* Las cuatro barras. Siguen tocándose con el silencio puesto
                    —apagadas serían cuatro controles muertos justo cuando
                    alguien quiere dejar la mezcla pronta para después—, pero se
                    atenúan para que se vea que ahora mismo no hacen ruido. */}
                <div
                  className={`mt-3 flex flex-col gap-1 transition-opacity ${
                    sonido.silencio ? "opacity-40" : ""
                  }`}
                >
                  {BARRAS.map((barra) => (
                    <div key={barra} className="rounded px-1">
                      <label
                        htmlFor={`volumen-${barra}`}
                        className="flex items-baseline justify-between font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-crema/80"
                      >
                        <span>{ETIQUETA[barra]}</span>
                        <span className="tabular-nums text-crema/50">{sonido[barra]}</span>
                      </label>
                      {/* `accent-dorado` en vez de una pila de
                          ::-webkit-slider-thumb con prefijos: una clase, y la
                          barra sale con el color de la casa en los cuatro
                          motores. `h-9` no es estética: un range por defecto
                          mide unos 16px de alto y con el dedo en un celular eso
                          no se agarra. */}
                      <input
                        id={`volumen-${barra}`}
                        type="range"
                        min={0}
                        max={100}
                        step={PASO}
                        value={sonido[barra]}
                        onChange={(e) =>
                          setSonido(guardarVolumen(barra, e.currentTarget.valueAsNumber))
                        }
                        className="h-9 w-full cursor-pointer accent-dorado"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Los legales. Hasta hoy sólo se llegaba desde el pie de
                  `/aprender` (ver `components/PieLegales.tsx`): adentro de
                  ajustes es donde los busca cualquiera que use una app, y Play
                  Store pide que se encuentren. */}
              {pidePrivacidad && (
                <button
                  type="button"
                  onClick={() => {
                    void gestor.abrirPrivacidad().then(() => setPidePrivacidad(gestor.pidePrivacidad()));
                  }}
                  className="mt-4 rounded border-2 border-crema/15 bg-black/25 px-4 py-3 text-left transition-colors hover:border-dorado/60 hover:bg-black/40"
                >
                  <span className="block font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-crema">
                    Privacidad de los anuncios
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-crema/60">
                    Cambiá lo que elegiste sobre los anuncios personalizados
                  </span>
                </button>
              )}

              <nav className="mt-4 flex items-center justify-center gap-x-4 font-[family-name:var(--font-ui)] text-xs uppercase tracking-wide text-crema/45">
                <Link href="/legales/privacidad" className="hover:text-crema">
                  Privacidad
                </Link>
                <span aria-hidden="true" className="text-crema/20">
                  ·
                </span>
                <Link href="/legales/terminos" className="hover:text-crema">
                  Términos
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
