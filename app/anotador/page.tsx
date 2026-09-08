"use client";

/**
 * El anotador: la tablita de treinta, en pantalla.
 *
 * ── Para qué existe ───────────────────────────────────────────────────────
 *
 * Es la primera pantalla del proyecto que sirve SIN la app. El que juega con
 * cartas de verdad no necesita un bot, necesita dónde llevar la cuenta, y hoy
 * eso lo resuelve con un papel o con la app de otro. Acá está.
 *
 * ── Qué NO decide este archivo ────────────────────────────────────────────
 *
 * Nada de las reglas. Cuántos palitos lleva un grupo a medio hacer, dónde
 * termina la mitad de las malas, cómo se dice "1 buena" y qué se hace con un
 * `localStorage` corrupto están todos en `lib/anotador.ts`, con quince pruebas
 * propias. Acá se dibuja lo que ese archivo contesta, y nada más.
 *
 * Es la misma división que ya tienen `lib/botonera.ts` con la mesa y
 * `lib/navegacion.ts` con la barra: **la pantalla no decide reglas**.
 *
 * ── Las tres cosas prohibidas acá adentro ─────────────────────────────────
 *
 * Ni un `filter`, ni un `opacity` sobre un grupo, ni una animación infinita.
 * No es estilo: son los tres bugs más caros que tuvo el proyecto —1/9, 4/9 y
 * 7/9 de 2026— y los tres son la misma cosa, superficies compuestas de más que
 * la GPU del teléfono devuelve mal y se ven como manchitas. Está contado en
 * `README.md` y en `Historial.md`. Las sombras van en `box-shadow`, que hace lo
 * mismo sin crear una superficie aparte.
 */

import { useEffect, useState } from "react";

import { EspacioAnuncio } from "@/components/EspacioAnuncio";

import {
  CUENTA_VACIA,
  type Cuenta,
  GRUPOS_POR_MITAD,
  type Lado,
  META,
  buenasDe,
  comoSeDice,
  ganador,
  guardarCuenta,
  leerCuenta,
  malasDe,
  palitosDelGrupo,
  sumar,
} from "@/lib/anotador";

/** Cómo se llama cada lado en la tablita. Es como se dice en la mesa. */
const NOMBRE: Record<Lado, string> = { nosotros: "Nosotros", ellos: "Ellos" };

/* ══ EL PULSO DE LA MANO ═══════════════════════════════════════════════════
   Un cuadradito dibujado con la escuadra no parece anotado: parece una tabla
   de Excel. Lo que lo hace un anotador es que los palitos no cierren justo.

   El desvío sale de una cuenta FIJA a partir de la posición del grupo, y eso
   importa más de lo que parece: con `Math.random()` cada grupo cambiaría de
   forma en cada dibujo, o sea que sumar un punto haría temblar los treinta
   palitos que ya estaban. Además de verse mal, es repintar la pantalla entera
   cada vez que apretás `+`.

   Se calcula UNA vez al cargar el módulo —doce grupos, cuatro esquinas cada
   uno— así que dibujar no cuesta ni una multiplicación. */

/** Un "azar" que siempre devuelve lo mismo para el mismo número, entre -1 y 1. */
const pulso = (n: number): number => {
  const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

/** El cuadrado perfecto del que se parte, sobre un lienzo de 40×40. */
const ESQUINAS_RECTAS = [
  { x: 7, y: 7 },
  { x: 33, y: 7 },
  { x: 33, y: 33 },
  { x: 7, y: 33 },
];

/**
 * Las esquinas ya torcidas de los doce grupos que puede haber en pantalla:
 * seis por lado, dos lados. El índice es la semilla, así que el mismo grupo
 * sale siempre igual.
 */
const ESQUINAS = Array.from({ length: 12 }, (_, g) =>
  ESQUINAS_RECTAS.map((p, i) => ({
    x: p.x + pulso(g * 8 + i * 2) * 1.15,
    y: p.y + pulso(g * 8 + i * 2 + 1) * 1.15,
  })),
);

/**
 * En qué orden se dibujan los cinco palitos de un grupo: el cuadrado en sentido
 * de las agujas del reloj y la diagonal al final, que es como se anota a mano.
 */
const PALITOS: readonly (readonly [number, number])[] = [
  [0, 1], // arriba
  [1, 2], // derecha
  [2, 3], // abajo
  [3, 0], // izquierda
  [0, 2], // y la quinta cruza
];

/** Un grupo de hasta cinco palitos. */
function Grupo({ semilla, palitos }: { semilla: number; palitos: number }) {
  const esquinas = ESQUINAS[semilla];

  return (
    <svg
      viewBox="0 0 40 40"
      /* `h-full w-full` MÁS el `preserveAspectRatio` de fábrica: el SVG ocupa
         todo el renglón y adentro dibuja el cuadrado del tamaño del lado más
         corto, centrado. O sea que el cuadradito crece hasta donde el renglón
         se lo permite y NUNCA deja de ser cuadrado, sin tener que elegir a mano
         si manda el ancho o el alto. Con seis renglones apilados, el que manda
         siempre es el alto. */
      className="h-full w-full"
      aria-hidden="true"
    >
      {/* SIN `vectorEffect="non-scaling-stroke"`: con él el trazo mide siempre
          lo mismo en píxeles de pantalla, así que al achicarse el cuadradito
          quedaba dibujado con un pelo. Dejándolo escalar, el grosor es una
          fracción del cuadrado y el palito se ve igual de entintado en un
          celular chico que en una compu. */}
      <g fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
        {PALITOS.slice(0, palitos).map(([desde, hasta], i) => (
          <line
            key={i}
            x1={esquinas[desde].x}
            y1={esquinas[desde].y}
            x2={esquinas[hasta].x}
            y2={esquinas[hasta].y}
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * Una de las dos mitades de una columna: las malas o las buenas.
 *
 * ── UNO POR RENGLÓN, DESDE EL 8/9/2026 ────────────────────────────────────
 *
 * Empezó con dos cuadraditos por fila, copiando la referencia, y en la captura
 * quedaba mal: con 15 puntos por mitad son tres grupos, o sea una fila de dos y
 * otra de uno solo —una tablita coja— y encima cada cuadrado salía chico para
 * entrar de a dos, dejando media hoja vacía.
 *
 * En vertical son **tres renglones de un cuadradito**, cada uno el doble de
 * grande, y se lee de un vistazo: tres para llegar a buenas y tres para
 * terminar. Lo pidió Santiago mirando la primera captura.
 */
function Mitad({
  puntos,
  desdeSemilla,
  className = "",
}: {
  puntos: number;
  desdeSemilla: number;
  className?: string;
}) {
  return (
    <div
      /* Márgenes finos a propósito: con seis renglones apilados, cada píxel
         de relleno que se saca es un píxel más de cuadradito. En un celular de
         568 de alto el renglón entero mide 49px. */
      className={`grid min-h-0 place-items-center gap-y-0.5 px-2 py-1 ${className}`}
      /* Los renglones se reparten el alto en partes iguales. Sale de
         GRUPOS_POR_MITAD y no de un 3 escrito a mano: el día que la partida sea
         a 40, esto se acomoda solo. */
      style={{ gridTemplateRows: `repeat(${GRUPOS_POR_MITAD}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: GRUPOS_POR_MITAD }, (_, i) => (
        <Grupo key={i} semilla={desdeSemilla + i} palitos={palitosDelGrupo(puntos, i)} />
      ))}
    </div>
  );
}

/**
 * Una columna entera. Es un `<button>`: tocar la columna suma un punto de ese
 * lado, que es lo primero que intenta cualquiera antes de buscar el `+`.
 *
 * Las dos mitades van en un `grid-rows-2` de filas iguales, y ésa es la razón
 * de que la raya de malas/buenas quede alineada entre las dos columnas sin que
 * nadie mida nada: las dos columnas parten el mismo alto por la mitad.
 */
function Columna({ lado, puntos, onSumar }: { lado: Lado; puntos: number; onSumar: () => void }) {
  const semilla = lado === "nosotros" ? 0 : 6;

  return (
    <button
      type="button"
      onClick={onSumar}
      aria-label={`${NOMBRE[lado]}: ${comoSeDice(puntos)}. Tocá para sumar un punto`}
      className="grid min-h-0 grid-rows-2 text-left text-bordo transition-colors hover:bg-tinta/5"
    >
      <Mitad puntos={malasDe(puntos)} desdeSemilla={semilla} />
      {/* LA RAYA DEL MEDIO VA EN LA PROPIA MITAD, y no en un <div> alrededor.
          Hasta acá las malas, de acá para abajo las buenas.

          Estuvo envuelta en un `<div className="border-t-2">` y ese envoltorio
          CORTABA LA CADENA DE ALTO: el `<div>` era el hijo de la grilla y se
          llevaba los 147px del renglón, pero adentro la mitad quedaba en
          `height: auto`, así que sus tres renglones de `1fr` no tenían contra
          qué resolverse y cada cuadradito caía en el tamaño de su `viewBox`.
          Medido: 124x124 abajo contra 124x45 arriba, con las dos mitades
          midiendo 147 iguales. Se veía como un cuadrado gigante en las buenas.

          Sin el envoltorio, la mitad es el hijo directo de la grilla, hereda el
          alto del renglón y los seis cuadraditos miden lo mismo. */}
      <Mitad
        puntos={buenasDe(puntos)}
        desdeSemilla={semilla + GRUPOS_POR_MITAD}
        className="border-t-2 border-tinta/25"
      />
    </button>
  );
}

/** El `+` y el `−` de un lado. */
function Controles({
  lado,
  puntos,
  espejado,
  onCambiar,
}: {
  lado: Lado;
  puntos: number;
  /** El lado de Ellos va al revés, para que cada `+` quede bajo su columna. */
  espejado?: boolean;
  onCambiar: (cuánto: number) => void;
}) {
  const menos = (
    <button
      key="menos"
      type="button"
      onClick={() => onCambiar(-1)}
      disabled={puntos === 0}
      aria-label={`Restarle un punto a ${NOMBRE[lado]}`}
      className="h-11 w-11 shrink-0 rounded-full border-2 border-crema/25 font-[family-name:var(--font-ui)] text-xl text-crema/80 transition-colors hover:border-crema/50 hover:bg-black/30 disabled:border-crema/10 disabled:text-crema/20"
    >
      −
    </button>
  );
  const mas = (
    <button
      key="mas"
      type="button"
      onClick={() => onCambiar(1)}
      disabled={puntos === META}
      aria-label={`Sumarle un punto a ${NOMBRE[lado]}`}
      className="h-11 min-w-0 flex-1 rounded-full bg-quiero font-[family-name:var(--font-ui)] text-2xl leading-none text-crema transition-colors hover:brightness-110 disabled:bg-quiero/25 disabled:text-crema/40"
    >
      +
    </button>
  );

  return (
    <div className="flex min-w-0 items-center gap-2">{espejado ? [mas, menos] : [menos, mas]}</div>
  );
}

export default function Anotador() {
  const [cuenta, setCuenta] = useState<Cuenta>(CUENTA_VACIA);
  const [confirmando, setConfirmando] = useState(false);

  /* `cargado` existe para que el primer guardado no le pise la cuenta al que
     vuelve. Sin él, el efecto de guardar corre en el primer dibujo —cuando el
     estado todavía es CUENTA_VACIA, porque eso es lo que se dibuja en el
     servidor— y escribe 0 a 0 encima de la partida que estaba guardada. */
  const [cargado, setCargado] = useState(false);

  // El `localStorage` sólo existe del lado del navegador, igual que en la gira
  useEffect(() => {
    setCuenta(leerCuenta());
    setCargado(true);
  }, []);

  useEffect(() => {
    if (cargado) guardarCuenta(cuenta);
  }, [cuenta, cargado]);

  const cambiar = (lado: Lado, cuánto: number) => {
    setConfirmando(false);
    setCuenta((c) => sumar(c, lado, cuánto));
  };

  const ganó = ganador(cuenta);
  const vacía = cuenta.nosotros === 0 && cuenta.ellos === 0;

  return (
    <section className="pantalla-fija tabla-mesa relative flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
      {/* El título está para el lector de pantalla y para los buscadores. En
          pantalla no se dibuja: la tablita ya dice qué es de un vistazo, y en
          un celular bajo cada renglón de más son palitos que no entran. */}
      <h1 className="sr-only">Anotador de truco</h1>

      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-3">
        {/* ── LA HOJA ─────────────────────────────────────────────────────
            Papel apoyado sobre la mesa del boliche. Los botones quedan FUERA:
            en un anotador de verdad no hay botones sobre el papel. */}
        <div className="papel flex min-h-0 flex-1 flex-col rounded-sm px-2 py-2 shadow-xl shadow-black/50">
          {/* Los dos nombres y, en el medio, a cuánto se juega */}
          <div className="grid shrink-0 grid-cols-3 items-center gap-1 border-b-2 border-tinta/25 px-1 pb-1.5">
            <p className="truncate text-center font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-tinta">
              {NOMBRE.nosotros}
            </p>
            <p
              className="text-center font-[family-name:var(--font-display)] text-2xl leading-none text-tinta/70"
              aria-label={`Se juega a ${META} puntos`}
            >
              {META}
            </p>
            <p className="truncate text-center font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-tinta">
              {NOMBRE.ellos}
            </p>
          </div>

          {/* En qué mitad va cada uno: "7 malas", "1 buena". Es el número que
              se canta en la mesa, y de paso ahorra contar cuadraditos. */}
          <div className="grid shrink-0 grid-cols-2 gap-1 border-b-2 border-tinta/15 px-1 py-1">
            {(["nosotros", "ellos"] as const).map((lado) => (
              <p
                key={lado}
                className="truncate text-center font-[family-name:var(--font-ui)] text-xs uppercase tracking-widest text-tinta/55"
              >
                {comoSeDice(cuenta[lado])}
              </p>
            ))}
          </div>

          {/* La tablita. La línea del medio es un borde y no un `<div>` suelto:
              así se estira sola con el alto que sobre. */}
          {/* `grid-rows-1` NO ES DECORACIÓN. Sin él, la única fila de esta
              grilla es implícita y las filas implícitas son `auto`: se estiran
              con el contenido en vez de respetar el alto que les toca. Medido:
              la mitad de las malas quedaba en 147px y la de las buenas en 360,
              o sea cuadraditos de 41px de un lado y de 112 del otro, y la
              tablita entera desbordaba la hoja. Con la fila declarada, el alto
              baja por la cadena y las dos mitades miden igual. */}
          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-1">
            <Columna
              lado="nosotros"
              puntos={cuenta.nosotros}
              onSumar={() => cambiar("nosotros", 1)}
            />
            <div className="grid min-h-0 grid-rows-1 border-l-2 border-tinta/25">
              <Columna lado="ellos" puntos={cuenta.ellos} onSumar={() => cambiar("ellos", 1)} />
            </div>
          </div>

          {ganó && (
            <p className="shrink-0 border-t-2 border-tinta/25 pt-1.5 text-center font-[family-name:var(--font-display)] text-lg leading-none text-bordo">
              {ganó === "nosotros" ? "¡Ganamos!" : "Ganaron ellos"}
              <span className="ml-2 font-[family-name:var(--font-ui)] text-sm text-tinta/60">
                {cuenta.nosotros} a {cuenta.ellos}
              </span>
            </p>
          )}
        </div>

        {/* ── LOS BOTONES ─────────────────────────────────────────────────
            Cada lado con su `+` y su `−` propios, y el de empezar de nuevo en
            el medio. Los de Ellos van espejados para que cada `+` caiga debajo
            de su columna y no haya que pensar cuál es cuál. */}
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Controles
            lado="nosotros"
            puntos={cuenta.nosotros}
            onCambiar={(c) => cambiar("nosotros", c)}
          />

          {/* EMPEZAR DE NUEVO, EN DOS TOQUES.
              Un punto de más lo deshace el `−`; la cuenta entera borrada de un
              toque sin querer no la deshace nada, y esto se usa con el celular
              apoyado en la mesa y manos que van y vienen a las cartas. Se
              apaga cuando no hay nada que borrar. */}
          <button
            type="button"
            onClick={() => (confirmando ? (setCuenta(CUENTA_VACIA), setConfirmando(false)) : setConfirmando(true))}
            disabled={vacía}
            aria-label={confirmando ? "Confirmar: borrar la cuenta" : "Empezar una cuenta nueva"}
            className={`h-11 shrink-0 rounded-full border-2 font-[family-name:var(--font-ui)] text-xs uppercase tracking-wide transition-colors ${
              confirmando
                ? "border-bordo-claro bg-bordo px-3 text-crema hover:bg-bordo-claro"
                : "w-11 border-crema/25 text-crema/70 hover:border-crema/50 hover:bg-black/30 disabled:border-crema/10 disabled:text-crema/20"
            }`}
          >
            {confirmando ? (
              "Borrar"
            ) : (
              <svg viewBox="0 0 24 24" className="mx-auto h-5 w-5" aria-hidden="true">
                {/* La flecha que da la vuelta: círculo abierto arriba y la
                    punta cerrándolo. Dibujada, como todo en este proyecto. */}
                <path
                  d="M20 12a8 8 0 1 1-2.4-5.7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M20 3.5 L20 7.2 L16.3 7.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <Controles
            lado="ellos"
            puntos={cuenta.ellos}
            espejado
            onCambiar={(c) => cambiar("ellos", c)}
          />
        </div>

        {/* ── EL HUECO DEL ANUNCIO ────────────────────────────────────────
            Va acá y no en el pie del sitio porque esta pantalla es
            `pantalla-fija`, y `app/globals.css` esconde el pie en las
            pantallas fijas: sin esto, el anotador sería la única pantalla de
            la app sin ningún lugar donde poner el banner.

            El alto se reserva DESDE AHORA, con el banner todavía apagado, por
            la misma razón que en la mesa: la pantalla está medida para entrar
            exacta y no scrollear, así que el hueco tiene que existir cuando se
            mide. Prenderlo después no puede correr un solo píxel.

            `donde="sitio"` y no `"mesa"`: el tope de 50px de la mesa está para
            que el banner no se coma una carta, y acá lo que sobra es papel en
            blanco. Ver `components/EspacioAnuncio.tsx`. */}
        <EspacioAnuncio donde="sitio" />
      </div>
    </section>
  );
}
