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

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { portero } from "@/lib/entrada";

import {
  CUENTA_VACIA,
  type Cuenta,
  type Lado,
  MAX_GRUPOS_POR_MITAD,
  META,
  type Meta,
  avisoMetaVisto,
  buenasDe,
  comoSeDice,
  ganador,
  gruposPorMitad,
  guardarAnotador,
  leerAnotador,
  malasDe,
  marcarAvisoMeta,
  otraMeta,
  palitosDelGrupo,
  puedeCambiarA,
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

   Se calcula UNA vez al cargar el módulo —dieciséis grupos, cuatro esquinas
   cada uno— así que dibujar no cuesta ni una multiplicación. */

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
 * Las esquinas ya torcidas de los grupos que puede haber en pantalla: a 40 son
 * ocho por lado, dos lados. El índice es la semilla, así que el mismo grupo
 * sale siempre igual, y como cada grupo sale de su propio índice los doce de
 * la partida a 30 quedaron idénticos a cuando sólo se jugaba a 30.
 */
const ESQUINAS = Array.from({ length: 2 * 2 * MAX_GRUPOS_POR_MITAD }, (_, g) =>
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
  grupos,
  desdeSemilla,
  className = "",
}: {
  puntos: number;
  /** Tres a 30, cuatro a 40. */
  grupos: number;
  desdeSemilla: number;
  className?: string;
}) {
  return (
    <div
      /* Márgenes finos a propósito: con seis renglones apilados, cada píxel
         de relleno que se saca es un píxel más de cuadradito. En un celular de
         568 de alto el renglón entero mide 49px. */
      className={`grid min-h-0 place-items-center gap-y-0.5 px-2 py-1 ${className}`}
      /* Los renglones se reparten el alto en partes iguales. Sale de la meta y
         no de un 3 escrito a mano: a 40 son cuatro y esto se acomoda solo. */
      style={{ gridTemplateRows: `repeat(${grupos}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: grupos }, (_, i) => (
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
function Columna({
  lado,
  puntos,
  meta,
  onSumar,
}: {
  lado: Lado;
  puntos: number;
  meta: Meta;
  onSumar: () => void;
}) {
  const grupos = gruposPorMitad(meta);
  // Ellos arranca después de los de Nosotros: a 30 es el 6 de siempre
  const semilla = lado === "nosotros" ? 0 : 2 * grupos;

  return (
    <button
      type="button"
      onClick={onSumar}
      // Con la columna llena ya no suma: un palito que no se dibuja no suena.
      data-sonido={puntos < meta ? "palito" : "no"}
      aria-label={`${NOMBRE[lado]}: ${comoSeDice(puntos, meta)}. Tocá para sumar un punto`}
      className="grid min-h-0 grid-rows-2 text-left text-bordo transition-colors hover:bg-tinta/5"
    >
      <Mitad puntos={malasDe(puntos, meta)} grupos={grupos} desdeSemilla={semilla} />
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
        puntos={buenasDe(puntos, meta)}
        grupos={grupos}
        desdeSemilla={semilla + grupos}
        className="border-t-2 border-tinta/25"
      />
    </button>
  );
}

/** El `+` y el `−` de un lado. */
function Controles({
  lado,
  puntos,
  meta,
  espejado,
  onCambiar,
}: {
  lado: Lado;
  puntos: number;
  meta: Meta;
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
      data-sonido="borrar"
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
      disabled={puntos === meta}
      data-sonido="palito"
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

/**
 * El cartelito de la primera vez: "tocá el número". Cuelga debajo del número,
 * con la flechita apuntándole, y se va tocándolo a él o al número.
 *
 * Bordo y crema, como el botón de "Borrar": es lo único que habla desde fuera
 * del papel. La sombra va en `box-shadow`, por las prohibiciones de arriba, y
 * no se anima: aparece y se queda quieto hasta que lo tocás.
 */
function AvisoMeta({ onCerrar }: { onCerrar: () => void }) {
  return (
    <button
      type="button"
      data-aviso-meta
      data-sonido="volver"
      onClick={onCerrar}
      className="absolute left-1/2 top-full z-10 mt-1 flex w-52 -translate-x-1/2 flex-col items-center text-crema"
    >
      {/* La flecha: un piquito pegado al globo, apuntando para arriba. Mismo
          bordo, así se lee como una sola pieza. */}
      <svg viewBox="0 0 20 10" className="-mb-px h-2.5 w-5 shrink-0 text-bordo" aria-hidden="true">
        <path d="M0 10 L10 0 L20 10 Z" fill="currentColor" />
      </svg>
      <span className="block w-full rounded-lg bg-bordo px-3 py-2 text-center font-[family-name:var(--font-ui)] text-sm leading-snug shadow-lg shadow-black/40">
        {/* "a 30 o a 40" no se corta: un 40 solo en el renglón de abajo se lee
            como otra cosa */}
        Tocá el número para jugar <span className="whitespace-nowrap">a 30 o a 40</span>
        <span className="mt-1 block text-xs uppercase tracking-wide text-crema/70">Entendido</span>
      </span>
    </button>
  );
}

export default function Anotador() {
  const [cuenta, setCuenta] = useState<Cuenta>(CUENTA_VACIA);
  const [meta, setMeta] = useState<Meta>(META);
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState(false);

  /* `cargado` existe para que el primer guardado no le pise la cuenta al que
     vuelve. Sin él, el efecto de guardar corre en el primer dibujo —cuando el
     estado todavía es CUENTA_VACIA, porque eso es lo que se dibuja en el
     servidor— y escribe 0 a 0 encima de la partida que estaba guardada. */
  const [cargado, setCargado] = useState(false);

  /* En la app el anotador tiene candado hasta mirar un video, una vez. Los
     botones ya lo respetan (pasan por `lib/entrada.ts`); esto es para cuando
     se llega sin botón —una dirección escrita a mano—: si está cerrado, se
     vuelve a la portada con el diálogo abierto. En la web no hace nada. */
  const router = useRouter();
  useEffect(() => {
    if (portero.rebotar("anotador")) router.replace("/");
  }, [router]);

  // El `localStorage` sólo existe del lado del navegador, igual que en la gira
  useEffect(() => {
    const guardado = leerAnotador();
    setCuenta(guardado.cuenta);
    setMeta(guardado.meta);
    setAviso(!avisoMetaVisto());
    setCargado(true);
  }, []);

  useEffect(() => {
    if (cargado) guardarAnotador(cuenta, meta);
  }, [cuenta, meta, cargado]);

  const cambiar = (lado: Lado, cuánto: number) => {
    setConfirmando(false);
    setCuenta((c) => sumar(c, lado, cuánto, meta));
  };

  const cerrarAviso = () => {
    setAviso(false);
    marcarAvisoMeta();
  };

  // De 40 a 30 no se pasa con alguien arriba de 30: se le borrarían puntos
  const siguienteMeta = otraMeta(meta);
  const puedeCambiar = puedeCambiarA(cuenta, siguienteMeta);

  const ganó = ganador(cuenta, meta);
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
          {/* Los dos nombres y, en el medio, a cuánto se juega. El número se
              toca: va y viene entre 30 y 40. */}
          <div className="grid shrink-0 grid-cols-3 items-center gap-1 border-b-2 border-tinta/25 px-1 pb-1.5">
            <p className="truncate text-center font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-tinta">
              {NOMBRE.nosotros}
            </p>
            <div className="relative flex justify-center">
              <button
                type="button"
                data-meta
                onClick={() => {
                  if (aviso) cerrarAviso();
                  if (puedeCambiar) {
                    setConfirmando(false);
                    setMeta(siguienteMeta);
                  }
                }}
                /* `aria-disabled` y no `disabled`: trabado igual tiene que poder
                   cerrar el cartelito. Lo que no hace es sonar, porque no cambia
                   nada. */
                aria-disabled={!puedeCambiar}
                data-sonido={puedeCambiar ? undefined : "no"}
                aria-label={
                  puedeCambiar
                    ? `Se juega a ${meta} puntos. Tocá para jugar a ${siguienteMeta}`
                    : `Se juega a ${meta} puntos. No se puede pasar a ${siguienteMeta}: hay más de ${siguienteMeta} anotados`
                }
                /* Subrayado de puntitos: lo justo para que se note que se toca,
                   como lo que se marca con lápiz en un papel. */
                className={`rounded px-1.5 text-center font-[family-name:var(--font-display)] text-2xl leading-none text-tinta/70 underline decoration-tinta/30 decoration-dotted decoration-2 underline-offset-4 transition-colors ${
                  puedeCambiar ? "hover:bg-tinta/5 hover:text-tinta" : "cursor-default"
                }`}
              >
                {meta}
              </button>
              {aviso && <AvisoMeta onCerrar={cerrarAviso} />}
            </div>
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
                {comoSeDice(cuenta[lado], meta)}
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
              meta={meta}
              onSumar={() => cambiar("nosotros", 1)}
            />
            <div className="grid min-h-0 grid-rows-1 border-l-2 border-tinta/25">
              <Columna
                lado="ellos"
                puntos={cuenta.ellos}
                meta={meta}
                onSumar={() => cambiar("ellos", 1)}
              />
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
            meta={meta}
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
            // El primer toque sólo pregunta; el segundo borra, y suena a goma.
            data-sonido={confirmando ? "borrar" : undefined}
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
            meta={meta}
            espejado
            onCambiar={(c) => cambiar("ellos", c)}
          />
        </div>

      </div>
    </section>
  );
}
