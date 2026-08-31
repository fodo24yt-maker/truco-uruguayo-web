/**
 * El escenario de la mesa.
 *
 * ── Qué cambió y por qué ──────────────────────────────────────────────────
 *
 * Antes esto dibujaba TODO en vivo: la veta con `feTurbulence`, el fondo con
 * siluetas, y la mesa era un `<div>` con `rotateX(34deg)`. Andaba, pero tenía
 * un techo: cada nudo, cada rayón y cada capa de profundidad que se le agregara
 * era trabajo que el celular repetía en cada cuadro. El croquis se quedó corto
 * justamente ahí.
 *
 * Ahora la madera y el ambiente vienen HORNEADOS por
 * `herramientas/generar-escena.mjs`: el mismo dibujo por código, pero hecho una
 * sola vez, a 2800px y con filtros que en vivo no se pueden pagar. El navegador
 * recibe dos WebP de ~40 KB y se ahorra todo lo demás.
 *
 * Lo que SIGUE en vivo es lo que cambia mientras jugás: el rival, el mate, las
 * cartas. Eso es React; el decorado es una imagen.
 *
 * La regla de la iluminación no cambió: hay una sola fuente de luz, arriba y al
 * centro, y todo lo que está lejos de ella se apaga. Eso es lo que da la
 * profundidad, y ahora además viene horneado en la propia madera.
 */

import type { Ambiente } from "@/lib/ambientes";
import type { Cara, Contextura, Detalle, Prenda } from "@/lib/caras";
import { ESCENAS } from "@/lib/escenas";

/**
 * El ambiente detrás de la mesa: el boliche, la feria, la rambla.
 *
 * La imagen trae las tres capas de profundidad ya compuestas, cada una con su
 * desenfoque. El color de atrás es el color medio de esa misma imagen: es lo
 * que se ve el instante que tarda en decodificarse, así nunca aparece un
 * rectángulo negro.
 */
export function FondoAmbiente({ ambiente, acento }: { ambiente: Ambiente; acento: string }) {
  const escena = ESCENAS[ambiente.clave];
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ backgroundColor: escena.colorFondo }}
    >
      <img
        src={escena.fondo}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover object-bottom"
        // Es lo primero que se ve de la pantalla: no puede llegar tarde.
        fetchPriority="high"
        decoding="async"
      />
      <CapaDeAcento color={acento} fuerza={0.22} />
    </div>
  );
}

/**
 * El color del departamento, encima de la textura horneada.
 *
 * ── Por qué hace falta ────────────────────────────────────────────────────
 *
 * Hay 7 ambientes para 19 departamentos, y eso es a propósito: diecinueve
 * escenas dibujadas aparte serían diecinueve cosas que mantener. Pero el precio
 * es que SEIS departamentos comparten "el galpón" y CINCO "el litoral", y
 * dentro de un grupo la pantalla queda idéntica. Salto y Paysandú eran la misma
 * imagen.
 *
 * El color ya estaba resuelto: `acentoDe()` en `lib/ambientes.ts` devuelve el
 * mismo tono con el que el departamento se pinta en el mapa de la gira, para
 * que el mapa y la mesa hablen del mismo lugar. Estaba escrito y NO LO LLAMABA
 * NADIE.
 *
 * ── Por qué `color` y no `overlay` ────────────────────────────────────────
 *
 * `color` cambia el tono y deja la LUMINANCIA intacta: la madera sigue teniendo
 * sus nudos, sus rayones y su charco de luz, y sólo vira de tono. Con `overlay`
 * o `multiply` se aplasta el contraste y la textura horneada —que es lo caro de
 * toda la escena— se pierde justo donde se la quiere ver.
 *
 * Y va SUAVE. No es pintar la mesa de verde: es que dos paradas seguidas no
 * sean la misma foto.
 */
function CapaDeAcento({ color, fuerza }: { color: string; fuerza: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ backgroundColor: color, opacity: fuerza, mixBlendMode: "color" }}
    />
  );
}

/**
 * La tabla de la mesa, ya en perspectiva.
 *
 * `object-top` y no `object-bottom`: cuando la ventana es baja y ancha hay que
 * recortar algo, y lo que se recorta tiene que ser el borde CERCANO —que de
 * todas formas queda tapado por tu mano y tus cartas— y nunca el lejano, que es
 * donde apoya los brazos el rival y donde está la libreta.
 *
 * La imagen tiene transparencia arriba a los costados, donde la mesa ya se
 * terminó: por ahí se ve el ambiente, y eso es lo que la convierte en una mesa
 * con esquinas en vez de un rectángulo de madera pegado al fondo.
 */
export function TablaMesa({ ambiente, acento }: { ambiente: Ambiente; acento: string }) {
  const escena = ESCENAS[ambiente.clave];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        src={escena.mesa}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover object-top"
        fetchPriority="high"
        decoding="async"
      />
      {/* La madera lleva MENOS acento que el fondo: es lo que uno mira todo el
          rato y tiene que seguir siendo madera. El fondo puede virar más porque
          está lejos y desenfocado. */}
      <CapaDeAcento color={acento} fuerza={0.1} />
    </div>
  );
}

/**
 * El rival, sentado del otro lado de la mesa.
 *
 * ── LA CABEZA NO ENTRA EN EL CUADRO ───────────────────────────────────────
 *
 * Se le ve el torso y los brazos apoyados en la madera, y de los hombros para
 * arriba está fuera del encuadre. Eso cierra una discusión que se dio cuatro
 * veces: se probó con silueta, con volumen, con desenfoque y con la cara del
 * medallón, y la cabeza SIEMPRE terminaba leyéndose como un fantasma. Recortada
 * por el marco deja de haber dónde ponerla, y el problema desaparece en vez de
 * mitigarse. Los rasgos viven en el medallón, que es donde se mira para saber
 * contra quién jugás.
 *
 * ── Y por eso la ropa pasó a ser lo importante ────────────────────────────
 *
 * El sombrero era lo que más distinguía a un rival de otro de lejos. Al
 * recortarlo, ese peso pasa entero a la PRENDA. Un buzo con capucha, un poncho
 * con fleco y un chaleco de señor se distinguen a cualquier tamaño, incluso
 * desenfocados, porque son siluetas distintas y no colores distintos.
 *
 * El eje que ordena el reparto es el mismo viaje que hace la gira: **de la city
 * para adentro**. Luquita es un liceal de Montevideo con buzo; el Gaucho Peralta,
 * en Tacuarembó, lleva poncho.
 *
 * ── La proporción, que es la trampa de todo esto ──────────────────────────
 *
 * El canto de la mesa está al 27% del alto de la escena, así que el torso que se
 * ve mide `0,27 × alto` y su ANCHO sale de multiplicar eso por la proporción del
 * dibujo. Con una proporción de 1,66 el rival ocupaba el 85% del ancho de un
 * celular y tapaba el fondo entero. Acá el cuadro es 400×300 con el canto en
 * y=200, o sea 1,30 de ancho por alto visible: el ambiente se ve por los
 * costados. **Si se toca `RIVAL_VB`, se toca esa cuenta.**
 *
 * Sigue DESENFOCADO: la cámara enfoca la mesa y él está un metro más atrás.
 */

/** El medio del cuadro. Todo se dibuja alrededor de este eje. */
const EJE = 200;

/**
 * Las medidas del dibujo, para que `page.tsx` no las adivine.
 *
 * `borde` es dónde cae el canto lejano de la mesa: la figura se ancla POR AHÍ y
 * se sale por arriba del cuadro, en vez de colgar de un `bottom` a ojo.
 */
export const RIVAL_VB = { ancho: 400, alto: 300, borde: 200 };

/** Media espalda. Es lo único que cambia entre un pibe de liceo y un gaucho. */
const MEDIA_ESPALDA: Record<Contextura, number> = {
  menudo: 106,
  medio: 122,
  recio: 140,
};

/* NO existe un "ancho relativo" que escale la figura entera, y es a propósito:
   escalarla movería la línea del canto de la mesa y el rival se despegaría del
   borde o se hundiría abajo de él. El cuadro mide 400×300 para los diecinueve;
   lo que cambia con la contextura es cuánto de ese ancho ocupa el cuerpo:
   el menudo llena el 56%, el medio el 65% y el recio el 75%. */

export function RivalSentado({
  ficha,
  nombre,
  luz,
}: {
  ficha: Cara;
  nombre: string;
  /** El color de la luz del lugar: es la que le dibuja el filo de arriba. */
  luz: string;
}) {
  const H = MEDIA_ESPALDA[ficha.contextura];

  const tela = ficha.ropa;
  const telaLuz = mezclar(tela, "#ffffff", 0.22);
  const telaSombra = mezclar(tela, "#0e0904", 0.36);
  const telaHonda = mezclar(tela, "#0e0904", 0.6);
  const piel = mezclar(ficha.piel, "#4a2c18", 0.22);
  const pielHonda = mezclar(ficha.piel, "#2a170a", 0.55);

  /* La línea con la que se dibuja todo. Une la figura con la mesa, que también
     está dibujada con tinta. Y es lo único que sobrevive al desenfoque: una
     línea borroneada sigue siendo una banda oscura que separa dos formas, y una
     diferencia de valor borroneada no separa nada. */
  const tinta = {
    stroke: "#150c04",
    strokeOpacity: 0.62,
    strokeWidth: 3,
    strokeLinejoin: "round",
  } as const;

  /* El torso: cae del hombro y se abre apenas hacia abajo. Termina justo en el
     canto de la mesa —206 contra 200, seis de más para que no quede una raya de
     fondo entre la ropa y la madera—. Está sentado DETRÁS: de ahí para abajo lo
     único suyo que se ve son los antebrazos apoyados. */
  const torso =
    `M${EJE - 0.44 * H} 0` +
    ` C${EJE - 0.5 * H} 20 ${EJE - 0.74 * H} 38 ${EJE - H} 58` +
    ` C${EJE - H - 8} 100 ${EJE - 1.04 * H} 150 ${EJE - 1.08 * H} 206` +
    ` L${EJE + 1.08 * H} 206` +
    ` C${EJE + 1.04 * H} 150 ${EJE + H + 8} 100 ${EJE + H} 58` +
    ` C${EJE + 0.74 * H} 38 ${EJE + 0.5 * H} 20 ${EJE + 0.44 * H} 0 Z`;

  /* EL ANTEBRAZO, apoyado sobre la madera.
     Del codo —contra el canto de la mesa, afuera— a la muñeca, adentro y más
     cerca. Es una cuña que se ANGOSTA: del mismo ancho de punta a punta se lee
     un tubo.

     El brazo de arriba no se dibuja, a propósito: está detrás de la ropa, que
     es donde está en cualquier persona sentada. Dibujarlo era una tira fina
     pegada al costado del torso que no se veía y encima ensanchaba la silueta. */
  const antebrazo =
    `M${EJE - 1.02 * H} 190` +
    ` C${EJE - 1.0 * H} 218 ${EJE - 0.88 * H} 240 ${EJE - 0.6 * H} 252` +
    ` L${EJE - 0.44 * H} 234` +
    ` C${EJE - 0.68 * H} 226 ${EJE - 0.8 * H} 208 ${EJE - 0.84 * H} 188 Z`;

  /** El puño y la mano, apoyados en la madera. */
  const mano = (lado: 1 | -1) => {
    const x = EJE + lado * 0.52 * H;
    const y = 250;
    return (
      <g key={lado}>
        <path
          d={`M${x - 26} ${y} C${x - 30} ${y - 14} ${x - 17} ${y - 23} ${x} ${y - 23}
              C${x + 17} ${y - 23} ${x + 30} ${y - 14} ${x + 26} ${y}
              C${x + 22} ${y + 13} ${x - 22} ${y + 13} ${x - 26} ${y} Z`}
          fill="url(#rival-mano)"
          {...tinta}
        />
        {/* tres surcos y ya se lee mano en vez de manopla */}
        <g stroke="#120a05" strokeOpacity="0.5" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d={`M${x - 10} ${y - 16} L${x - 11} ${y + 5} M${x} ${y - 18} L${x} ${y + 5} M${x + 10} ${y - 16} L${x + 11} ${y + 5}`} />
        </g>
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${RIVAL_VB.ancho} ${RIVAL_VB.alto}`}
      className="h-full w-full"
      role="img"
      aria-label={`${nombre}, tu rival, sentado del otro lado de la mesa`}
    >
      <defs>
        <linearGradient id="rival-tela" x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stopColor={telaLuz} />
          <stop offset="34%" stopColor={tela} />
          <stop offset="100%" stopColor={telaSombra} />
        </linearGradient>
        {/* La manga va más oscura que el pecho: el brazo está por delante del
            cuerpo y se tapa la luz a sí mismo. */}
        <linearGradient id="rival-manga" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={mezclar(tela, "#0e0904", 0.24)} />
          <stop offset="100%" stopColor={mezclar(tela, "#0e0904", 0.54)} />
        </linearGradient>
        <linearGradient id="rival-mano" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={piel} />
          <stop offset="100%" stopColor={pielHonda} />
        </linearGradient>
        {/* Está a un metro y la cámara enfoca la mesa. Con más desenfoque se le
            van los hombros y vuelve a ser un bulto; con menos, se le empieza a
            pedir un detalle que no tiene. */}
        <filter id="rival-foco" x="-14%" y="-14%" width="128%" height="128%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <filter id="rival-sombra" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* ── Su sombra sobre la madera ───────────────────────────────────
          Va primero, debajo de todo: es lo que lo APOYA. Sin esto los brazos
          quedan pegados encima de la mesa, como una calcomanía. */}
      <g fill="rgba(0,0,0,0.5)" filter="url(#rival-sombra)">
        <ellipse cx={EJE} cy={216} rx={1.1 * H} ry={13} opacity="0.5" />
        <ellipse cx={EJE - 0.52 * H} cy={262} rx={38} ry={12} />
        <ellipse cx={EJE + 0.52 * H} cy={262} rx={38} ry={12} />
      </g>

      <g filter="url(#rival-foco)">
        <path d={torso} fill="url(#rival-tela)" {...tinta} />

        {/* Lo que cuenta quién es. Va sobre el torso y DEBAJO de los
            antebrazos, que es el orden real: la ropa le tapa el brazo hasta el
            codo y del codo para adelante se ve el antebrazo sobre la madera. */}
        <VestidoDe
          prenda={ficha.prenda}
          H={H}
          tela={tela}
          telaLuz={telaLuz}
          telaSombra={telaSombra}
          telaHonda={telaHonda}
          piel={ficha.piel}
          tinta={tinta}
        />

        {/* ── Los antebrazos, sobre la madera ─────────────────────────── */}
        <g fill="url(#rival-manga)" {...tinta}>
          <path d={antebrazo} />
          <path d={antebrazo} transform={`translate(${2 * EJE} 0) scale(-1 1)`} />
        </g>

        {[-1, 1].map((lado) => mano(lado as 1 | -1))}

        <DetalleDe
          detalle={ficha.detalle}
          prenda={ficha.prenda}
          H={H}
          telaHonda={telaHonda}
          tinta={tinta}
        />

        {/* ── El filo de la luz del lugar ──────────────────────────────────
            SÓLO en lo que mira para arriba. Cuando el filo envolvía también los
            costados quedaba un halo alrededor, y un halo es justo lo que hace
            que alguien se lea como un fantasma. */}
        <g fill="none" stroke={luz} strokeLinecap="round">
          <path
            d={`M${EJE - H} 58 C${EJE - 0.74 * H} 38 ${EJE - 0.5 * H} 20 ${EJE - 0.44 * H} 0`}
            strokeWidth="3.4"
            strokeOpacity="0.4"
          />
          <path
            d={`M${EJE + H} 58 C${EJE + 0.74 * H} 38 ${EJE + 0.5 * H} 20 ${EJE + 0.44 * H} 0`}
            strokeWidth="3.4"
            strokeOpacity="0.4"
          />
          <path d={`M${EJE - 1.0 * H} 196 C${EJE - 0.96 * H} 218 ${EJE - 0.86 * H} 236 ${EJE - 0.64 * H} 248`} strokeWidth="2.6" strokeOpacity="0.3" />
          <path d={`M${EJE + 1.0 * H} 196 C${EJE + 0.96 * H} 218 ${EJE + 0.86 * H} 236 ${EJE + 0.64 * H} 248`} strokeWidth="2.6" strokeOpacity="0.3" />
          <path d={`M${EJE - 0.52 * H - 21} 236 C${EJE - 0.52 * H - 8} 228 ${EJE - 0.52 * H + 9} 228 ${EJE - 0.52 * H + 21} 236`} strokeWidth="2.2" strokeOpacity="0.32" />
          <path d={`M${EJE + 0.52 * H - 21} 236 C${EJE + 0.52 * H - 8} 228 ${EJE + 0.52 * H + 9} 228 ${EJE + 0.52 * H + 21} 236`} strokeWidth="2.2" strokeOpacity="0.32" />
        </g>
      </g>
    </svg>
  );
}

/** Lo que se dibuja sobre el pecho, que es lo único que queda para contar quién es. */
function VestidoDe({
  prenda,
  H,
  tela,
  telaLuz,
  telaSombra,
  telaHonda,
  piel,
  tinta,
}: {
  prenda: Prenda;
  H: number;
  tela: string;
  telaLuz: string;
  telaSombra: string;
  telaHonda: string;
  piel: string;
  tinta: Record<string, string | number>;
}) {
  /* La camisa que asoma por el cuello. La usan varias prendas, así que se arma
     una vez.

     VA CHICA Y APAGADA. La primera versión abría 0,6·H y usaba una piel casi
     blanca: en la tira de los diecinueve, la mitad de los rivales tenían una
     cuña pálida enorme en el pecho que se llevaba toda la atención y encima los
     hacía parecidos entre sí. El cuello es un detalle, no la prenda. */
  const camisaClara = mezclar(piel, "#ffffff", 0.4);
  const cuelloAbierto = (ancho: number) => (
    <>
      <path
        d={`M${EJE - ancho} 0 L${EJE} ${ancho * 1.35} L${EJE + ancho} 0 Z`}
        fill={camisaClara}
        opacity="0.85"
      />
      {/* las dos puntas del cuello, que es lo que lo hace cuello y no un escote */}
      <path
        d={`M${EJE - ancho} 0 L${EJE} ${ancho * 1.35} L${EJE - ancho * 0.42} ${ancho * 1.5} L${EJE - ancho * 1.3} ${ancho * 0.3} Z`}
        fill={camisaClara}
        {...tinta}
      />
      <path
        d={`M${EJE + ancho} 0 L${EJE} ${ancho * 1.35} L${EJE + ancho * 0.42} ${ancho * 1.5} L${EJE + ancho * 1.3} ${ancho * 0.3} Z`}
        fill={camisaClara}
        {...tinta}
      />
    </>
  );

  switch (prenda) {
    /* EL PIBE DE CITY. La capucha caída atrás es una silueta que ninguna otra
       prenda tiene, y se lee incluso desenfocada. */
    case "buzo":
      return (
        <>
          <path
            d={`M${EJE - 0.68 * H} 34 C${EJE - 0.62 * H} -14 ${EJE + 0.62 * H} -14 ${EJE + 0.68 * H} 34
                C${EJE + 0.42 * H} 52 ${EJE - 0.42 * H} 52 ${EJE - 0.68 * H} 34 Z`}
            fill={telaSombra}
            {...tinta}
          />
          <path
            d={`M${EJE - 0.36 * H} 30 C${EJE - 0.3 * H} 54 ${EJE + 0.3 * H} 54 ${EJE + 0.36 * H} 30`}
            fill="none"
            stroke={telaHonda}
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* los cordones, que cuelgan uno más que el otro */}
          <g fill="none" stroke="#efe6d4" strokeOpacity="0.75" strokeWidth="3.4" strokeLinecap="round">
            <path d={`M${EJE - 15} 48 C${EJE - 19} 74 ${EJE - 21} 96 ${EJE - 17} 116`} />
            <path d={`M${EJE + 15} 48 C${EJE + 19} 72 ${EJE + 20} 90 ${EJE + 16} 106`} />
          </g>
          {/* el bolsillo canguro */}
          <path
            d={`M${EJE - 0.64 * H} 150 L${EJE + 0.64 * H} 150 L${EJE + 0.58 * H} 200 L${EJE - 0.58 * H} 200 Z`}
            fill={telaSombra}
            opacity="0.45"
            stroke={telaHonda}
            strokeOpacity="0.6"
            strokeWidth="2.4"
          />
        </>
      );

    case "camisa":
      return (
        <>
          {cuelloAbierto(0.22 * H)}
          {/* la tira de botones */}
          <path d={`M${EJE} ${0.45 * H} L${EJE} 202`} fill="none" stroke={telaHonda} strokeOpacity="0.6" strokeWidth="3" />
          <g fill={telaLuz} opacity="0.8">
            {[0.62, 0.95, 1.28].map((k) => (
              <circle key={k} cx={EJE - 1} cy={k * H + 20} r="3.4" />
            ))}
          </g>
        </>
      );

    /* La camisa a cuadros del interior. El cuadrillé va CLIPEADO al torso: si
       se dibuja suelto se le sale por los hombros y deja de ser una prenda. */
    case "cuadros":
      return (
        <>
          <defs>
            {/* El cuadrillé se dibuja con DOS trazos, uno oscuro y uno claro, y
                no con el color de la ropa: con `telaHonda` los rivales de ropa
                marrón no mostraban ningún cuadro, porque la línea y la tela
                eran el mismo valor. */}
            <pattern id="rival-cuadros" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M0 0 H30 M0 0 V30" stroke="#1a1008" strokeOpacity="0.42" strokeWidth="6" fill="none" />
              <path d="M0 15 H30 M15 0 V30" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="4" fill="none" />
            </pattern>
            <clipPath id="rival-recorte-torso">
              <path
                d={`M${EJE - 0.44 * H} 0 C${EJE - 0.5 * H} 20 ${EJE - 0.74 * H} 38 ${EJE - H} 58
                    C${EJE - H - 8} 100 ${EJE - 1.04 * H} 150 ${EJE - 1.08 * H} 206
                    L${EJE + 1.08 * H} 206
                    C${EJE + 1.04 * H} 150 ${EJE + H + 8} 100 ${EJE + H} 58
                    C${EJE + 0.74 * H} 38 ${EJE + 0.5 * H} 20 ${EJE + 0.44 * H} 0 Z`}
              />
            </clipPath>
          </defs>
          <rect
            x="0"
            y="0"
            width={2 * EJE}
            height="260"
            fill="url(#rival-cuadros)"
            clipPath="url(#rival-recorte-torso)"
          />
          {cuelloAbierto(0.2 * H)}
          <path d={`M${EJE} ${0.42 * H} L${EJE} 202`} fill="none" stroke={telaHonda} strokeOpacity="0.6" strokeWidth="3" />
        </>
      );

    case "campera":
      return (
        <>
          {/* el cuello parado, que es lo que la distingue de una camisa */}
          <path
            d={`M${EJE - 0.42 * H} 0 C${EJE - 0.4 * H} 26 ${EJE - 0.16 * H} 40 ${EJE} 40
                C${EJE + 0.16 * H} 40 ${EJE + 0.4 * H} 26 ${EJE + 0.42 * H} 0 Z`}
            fill={telaSombra}
            {...tinta}
          />
          {/* el cierre y su carrito */}
          <path d={`M${EJE} 40 L${EJE} 202`} fill="none" stroke={telaHonda} strokeOpacity="0.85" strokeWidth="4.5" />
          <rect x={EJE - 4} y="126" width="8" height="16" rx="2" fill={telaLuz} opacity="0.85" />
          <g fill="none" stroke={telaHonda} strokeOpacity="0.45" strokeWidth="2.6">
            <path d={`M${EJE - 0.56 * H} 128 L${EJE - 0.18 * H} 128`} />
            <path d={`M${EJE + 0.56 * H} 128 L${EJE + 0.18 * H} 128`} />
          </g>
        </>
      );

    case "saco":
      return (
        <>
          {cuelloAbierto(0.19 * H)}
          {/* LAS SOLAPAS, que son lo único que dice "saco" y no "buzo". Van
              anchas, hasta media altura del pecho y con su contorno: chicas y
              del mismo tono que el resto no se veían, y el saco terminaba
              siendo una mancha de color con un cuello. */}
          <g fill={telaSombra}>
            <path d={`M${EJE - 0.24 * H} 0 L${EJE} ${0.62 * H} L${EJE - 0.2 * H} ${0.66 * H} L${EJE - 0.66 * H} 26 Z`} {...tinta} />
            <path d={`M${EJE + 0.24 * H} 0 L${EJE} ${0.62 * H} L${EJE + 0.2 * H} ${0.66 * H} L${EJE + 0.66 * H} 26 Z`} {...tinta} />
          </g>
          {/* el cruce del saco y su botón */}
          <path d={`M${EJE} ${0.62 * H} L${EJE} 202`} fill="none" stroke={telaHonda} strokeOpacity="0.7" strokeWidth="3.4" />
          <circle cx={EJE} cy={0.62 * H + 44} r="4" fill={telaLuz} opacity="0.7" />
        </>
      );

    /* LA ROPA DE SEÑOR. El chaleco sobre la camisa es de las siluetas que más
       edad dan: no es un abrigo, es alguien que se vistió para sentarse. */
    case "chaleco":
      return (
        <>
          {cuelloAbierto(0.18 * H)}
          <path
            d={`M${EJE - 0.34 * H} 0 C${EJE - 0.5 * H} 26 ${EJE - 0.86 * H} 46 ${EJE - 0.94 * H} 62
                C${EJE - 1} 130 ${EJE - 1.02 * H} 172 ${EJE - 1.04 * H} 206
                L${EJE - 0.16 * H} 206 L${EJE} ${0.52 * H} Z`}
            fill={telaSombra}
            {...tinta}
          />
          <path
            d={`M${EJE + 0.34 * H} 0 C${EJE + 0.5 * H} 26 ${EJE + 0.86 * H} 46 ${EJE + 0.94 * H} 62
                C${EJE + 1} 130 ${EJE + 1.02 * H} 172 ${EJE + 1.04 * H} 206
                L${EJE + 0.16 * H} 206 L${EJE} ${0.52 * H} Z`}
            fill={telaSombra}
            {...tinta}
          />
          <g fill={telaLuz} opacity="0.75">
            {[0.78, 1.06, 1.34].map((k) => (
              <circle key={k} cx={EJE} cy={k * H + 14} r="3.6" />
            ))}
          </g>
        </>
      );

    /* EL PESCADOR. Tejido grueso: puño y cuello con elástico, y el bolsillo
       parche donde después va el anzuelo. */
    case "sueter":
      return (
        <>
          <defs>
            <pattern id="rival-tejido" width="12" height="9" patternUnits="userSpaceOnUse">
              <path d="M0 9 L6 0 L12 9" fill="none" stroke={telaHonda} strokeOpacity="0.32" strokeWidth="2.2" />
            </pattern>
            <clipPath id="rival-recorte-tejido">
              <path
                d={`M${EJE - 0.44 * H} 0 C${EJE - 0.5 * H} 20 ${EJE - 0.74 * H} 38 ${EJE - H} 58
                    C${EJE - H - 8} 100 ${EJE - 1.04 * H} 150 ${EJE - 1.08 * H} 206
                    L${EJE + 1.08 * H} 206
                    C${EJE + 1.04 * H} 150 ${EJE + H + 8} 100 ${EJE + H} 58
                    C${EJE + 0.74 * H} 38 ${EJE + 0.5 * H} 20 ${EJE + 0.44 * H} 0 Z`}
              />
            </clipPath>
          </defs>
          <rect x="0" y="0" width={2 * EJE} height="260" fill="url(#rival-tejido)" clipPath="url(#rival-recorte-tejido)" />
          {/* el cuello de elástico */}
          <path
            d={`M${EJE - 0.4 * H} 0 C${EJE - 0.38 * H} 30 ${EJE - 0.16 * H} 44 ${EJE} 44
                C${EJE + 0.16 * H} 44 ${EJE + 0.38 * H} 30 ${EJE + 0.4 * H} 0 Z`}
            fill={telaSombra}
            {...tinta}
          />
          {/* el bolsillo parche del pecho */}
          <rect
            x={EJE + 0.16 * H}
            y="118"
            width={0.42 * H}
            height="52"
            rx="4"
            fill={telaSombra}
            opacity="0.6"
            stroke={telaHonda}
            strokeOpacity="0.8"
            strokeWidth="2.6"
          />
        </>
      );

    /* EL NORTE. La manta cae de los hombros y le tapa los brazos hasta el codo:
       por eso el fleco cruza el pecho y no hay costura de hombro visible. */
    case "poncho":
      return (
        <>
          <path
            d={`M${EJE - 0.44 * H} 0 C${EJE - 0.5 * H} 20 ${EJE - 0.78 * H} 40 ${EJE - 1.06 * H} 62
                C${EJE - 1.1 * H} 110 ${EJE - 1.1 * H} 150 ${EJE - 1.08 * H} 176
                L${EJE + 1.08 * H} 176
                C${EJE + 1.1 * H} 150 ${EJE + 1.1 * H} 110 ${EJE + 1.06 * H} 62
                C${EJE + 0.78 * H} 40 ${EJE + 0.5 * H} 20 ${EJE + 0.44 * H} 0 Z`}
            fill={telaSombra}
            {...tinta}
          />
          {/* la cenefa: el mismo motivo repetido, que es lo que le sale bien al
              código y lo que hace que se lea tejido y no una capa */}
          <g fill={telaLuz} opacity="0.85">
            {Array.from({ length: 11 }, (_, i) => {
              const x = EJE - 1.02 * H + (i * (2.04 * H)) / 10;
              return <path key={i} d={`M${x} 150 L${x + 9} 162 L${x} 174 L${x - 9} 162 Z`} />;
            })}
          </g>
          <path d={`M${EJE - 1.06 * H} 146 L${EJE + 1.06 * H} 146`} fill="none" stroke={telaLuz} strokeOpacity="0.6" strokeWidth="3" />
          {/* el fleco */}
          <g stroke={telaLuz} strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round">
            {Array.from({ length: 25 }, (_, i) => {
              const x = EJE - 1.05 * H + (i * (2.1 * H)) / 24;
              return <path key={i} d={`M${x} 176 L${x + (i % 2 ? 2 : -2)} 192`} />;
            })}
          </g>
          {/* el tajo del cuello */}
          <path
            d={`M${EJE - 0.24 * H} 0 C${EJE - 0.2 * H} 26 ${EJE - 0.1 * H} 38 ${EJE} 38
                C${EJE + 0.1 * H} 38 ${EJE + 0.2 * H} 26 ${EJE + 0.24 * H} 0 Z`}
            fill={telaHonda}
            {...tinta}
          />
        </>
      );

    /* El chal cruzado: dos bandas que bajan del hombro y se cruzan en el pecho.
       Es la silueta más distinta de todas, y de lejos se lee al toque. */
    case "chal":
      return (
        <>
          {cuelloAbierto(0.24 * H)}
          <path
            d={`M${EJE - 0.46 * H} 0 C${EJE - 0.62 * H} 30 ${EJE - 0.96 * H} 54 ${EJE - 1.04 * H} 76
                L${EJE - 0.86 * H} 206 L${EJE - 0.5 * H} 206 L${EJE + 0.1 * H} 96 L${EJE - 0.18 * H} 0 Z`}
            fill={telaSombra}
            {...tinta}
          />
          <path
            d={`M${EJE + 0.46 * H} 0 C${EJE + 0.62 * H} 30 ${EJE + 0.96 * H} 54 ${EJE + 1.04 * H} 76
                L${EJE + 0.86 * H} 206 L${EJE + 0.5 * H} 206 L${EJE - 0.1 * H} 96 L${EJE + 0.18 * H} 0 Z`}
            fill={mezclar(tela, "#0e0904", 0.34)}
            {...tinta}
          />
          {/* el fleco de la punta que cuelga */}
          <g stroke={telaLuz} strokeOpacity="0.5" strokeWidth="2.2" strokeLinecap="round">
            {Array.from({ length: 9 }, (_, i) => {
              const x = EJE - 0.5 * H + (i * (0.36 * H)) / 8;
              return <path key={i} d={`M${x} 210 L${x + (i % 2 ? 2 : -2)} 226`} />;
            })}
          </g>
        </>
      );

    /* LA FERIANTE. El peto con los tirantes cruzando el hombro es una forma que
       ninguna otra prenda tiene: se lee de lejos y dice "está trabajando". */
    case "delantal":
      return (
        <>
          {cuelloAbierto(0.3 * H)}
          <path
            d={`M${EJE - 0.5 * H} 62 L${EJE + 0.5 * H} 62 L${EJE + 0.68 * H} 206 L${EJE - 0.68 * H} 206 Z`}
            fill={mezclar(tela, "#ffffff", 0.38)}
            {...tinta}
          />
          {/* los tirantes, que salen del peto y se van por arriba del hombro */}
          <g fill="none" stroke={mezclar(tela, "#ffffff", 0.3)} strokeWidth="11" strokeLinecap="round">
            <path d={`M${EJE - 0.4 * H} 62 C${EJE - 0.5 * H} 30 ${EJE - 0.62 * H} 8 ${EJE - 0.72 * H} 0`} />
            <path d={`M${EJE + 0.4 * H} 62 C${EJE + 0.5 * H} 30 ${EJE + 0.62 * H} 8 ${EJE + 0.72 * H} 0`} />
          </g>
          {/* el bolsillón de adelante, donde va la plata de la feria */}
          <path
            d={`M${EJE - 0.44 * H} 146 L${EJE + 0.44 * H} 146 L${EJE + 0.44 * H} 200 L${EJE - 0.44 * H} 200 Z`}
            fill="none"
            stroke={telaSombra}
            strokeOpacity="0.7"
            strokeWidth="3"
          />
          <path d={`M${EJE} 146 L${EJE} 200`} fill="none" stroke={telaSombra} strokeOpacity="0.5" strokeWidth="2.4" />
        </>
      );
  }
}

/**
 * La pieza chica que lo termina de contar.
 *
 * Va UNA sola y va chica, a propósito: es lo que se mira dos veces. El anzuelo
 * en el bolsillo del pescador dice más de él que cualquier cosa que se le
 * pudiera poner en una cara que no está.
 */
function DetalleDe({
  detalle,
  prenda,
  H,
  telaHonda,
  tinta,
}: {
  detalle: Detalle;
  prenda: Prenda;
  H: number;
  telaHonda: string;
  tinta: Record<string, string | number>;
}) {
  switch (detalle) {
    /* Asomando del bolsillo parche del suéter, no flotando sobre el pecho. */
    case "anzuelo":
      return (
        <g transform={`translate(${EJE + 0.37 * H} 104)`}>
          <path
            d="M0 0 L0 22 C0 32 -9 36 -14 30 C-17 26 -16 21 -12 20"
            fill="none"
            stroke="#cfd4d8"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <path d="M0 0 L0 22 C0 32 -9 36 -14 30" fill="none" stroke="#4a4f55" strokeWidth="1.4" strokeLinecap="round" />
          {/* la lengüeta, que es lo que lo hace anzuelo y no un gancho */}
          <path d="M-12 20 L-6 15" fill="none" stroke="#cfd4d8" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="0" cy="-2" r="3.4" fill="none" stroke="#cfd4d8" strokeWidth="2.6" />
        </g>
      );

    /* El pañuelo al cuello: gaucho y señor de campo. Va anudado al costado. */
    case "panuelo": {
      const color = prenda === "poncho" ? "#b23a2e" : "#7d2f2a";
      return (
        <g>
          <path
            d={`M${EJE - 0.3 * H} 0 C${EJE - 0.26 * H} 24 ${EJE - 0.1 * H} 36 ${EJE} 36
                C${EJE + 0.1 * H} 36 ${EJE + 0.26 * H} 24 ${EJE + 0.3 * H} 0
                L${EJE + 0.36 * H} 0 C${EJE + 0.32 * H} 30 ${EJE + 0.12 * H} 46 ${EJE} 46
                C${EJE - 0.12 * H} 46 ${EJE - 0.32 * H} 30 ${EJE - 0.36 * H} 0 Z`}
            fill={color}
            {...tinta}
          />
          {/* el nudo y las dos puntas */}
          <ellipse cx={EJE + 0.1 * H} cy={40} rx="9" ry="7" fill={color} {...tinta} />
          <path
            d={`M${EJE + 0.1 * H} 46 L${EJE + 0.2 * H} 74 L${EJE + 0.06 * H} 68 Z`}
            fill={color}
            {...tinta}
          />
        </g>
      );
    }

    /* La cadenita de los lentes: cuelga del cuello y se le pierde atrás. Dice
       "señora que lee" sin ponerle una cara. */
    case "cadenita":
      return (
        <path
          d={`M${EJE - 0.3 * H} 6 C${EJE - 0.26 * H} 54 ${EJE - 0.1 * H} 76 ${EJE} 76
              C${EJE + 0.1 * H} 76 ${EJE + 0.26 * H} 54 ${EJE + 0.3 * H} 6`}
          fill="none"
          stroke="#d8c98a"
          strokeOpacity="0.85"
          strokeWidth="2.4"
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
      );

    /* La lapicera en el bolsillo del pecho. */
    case "lapicera":
      return (
        <g transform={`translate(${EJE + 0.34 * H} 104)`}>
          <rect x="-4" y="-4" width="8" height="34" rx="3" fill="#2c4f8a" stroke={telaHonda} strokeWidth="2" />
          <rect x="-2" y="-10" width="4" height="12" rx="2" fill="#c9b06a" />
        </g>
      );

    case "ninguno":
      return null;
  }
}
/** Mezcla dos colores hex. Sin librerías: es una interpolación y nada más. */
function mezclar(hex: string, hacia: string, cuanto: number): string {
  const leer = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = leer(hex);
  const [r2, g2, b2] = leer(hacia);
  const m = (a: number, b: number) => Math.round(a + (b - a) * cuanto);
  return `rgb(${m(r1, r2)} ${m(g1, g2)} ${m(b1, b2)})`;
}

/**
 * El mate, apoyado en la mesa.
 *
 * Va del lado contrario al mazo para no chocarlo nunca —el mazo cambia de lado
 * según de quién es el reparto—. Está porque en las mesas de las que salió este
 * juego siempre hay uno, y porque un plano de madera vacío se lee como un fondo
 * y no como una mesa.
 *
 * DIBUJADO CON LÍNEA, no con degradados solos. La silueta lleva su contorno de
 * tinta, que es lo que lo despega de la madera —los dos son marrones— y lo que
 * lo hace leerse a tamaño chico. Antes era una manchita marrón sobre una mesa
 * marrón; ahora se ve que es un mate aunque mida dos centímetros.
 */
export function Mate() {
  const tinta = "#2a1608";
  return (
    <svg viewBox="0 0 60 84" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="mate-cuero" x1="0.12" y1="0" x2="0.95" y2="1">
          <stop offset="0%" stopColor="#b0723a" />
          <stop offset="40%" stopColor="#7d4520" />
          <stop offset="100%" stopColor="#3b1e0c" />
        </linearGradient>
        {/* El metal no es un gris: es claro donde refleja la lámpara y oscuro
            un milímetro después. Ese salto es lo que lo hace metal. */}
        <linearGradient id="mate-metal" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#7d735f" />
          <stop offset="26%" stopColor="#eae2cf" />
          <stop offset="58%" stopColor="#a3957a" />
          <stop offset="100%" stopColor="#635944" />
        </linearGradient>
      </defs>

      {/* la bombilla, que sale desde adentro y hacia atrás */}
      <g stroke={tinta} strokeWidth="1.6" strokeLinejoin="round">
        <path d="M35 30 L52 5" stroke={tinta} strokeWidth="6.4" strokeLinecap="round" fill="none" />
        <path d="M35 30 L52 5" stroke="url(#mate-metal)" strokeWidth="4.4" strokeLinecap="round" fill="none" />
        {/* la boquilla, más ancha */}
        <path d="M48.5 9 L57 3.5 L59 7 L50.5 12.5 Z" fill="url(#mate-metal)" />
      </g>

      {/* la calabaza */}
      <path
        d="M11 45 C11 34 19 27 30 27 C41 27 49 34 49 45 C49 63 42 77 30 77 C18 77 11 63 11 45 Z"
        fill="url(#mate-cuero)"
        stroke={tinta}
        strokeWidth="2.2"
      />
      {/* la panza en sombra del lado contrario a la luz */}
      <path
        d="M30 27 C36 27 41 29 44 32 C37 35 33 41 33 50 C33 62 36 71 40 76 C37 77 34 77 30 77 C39 77 44 63 44 50 C44 38 38 30 30 27 Z"
        fill="#2c1408"
        opacity="0.4"
      />
      {/* el brillo largo, que es lo que dice que la calabaza es curva */}
      <path d="M17 40 C16 52 18 64 23 72" stroke="#f0c98a" strokeOpacity="0.3" strokeWidth="3.4" fill="none" strokeLinecap="round" />

      {/* la virola de metal */}
      <path
        d="M12 30 C12 26 20 23 30 23 C40 23 48 26 48 30 C48 34 40 37 30 37 C20 37 12 34 12 30 Z"
        fill="url(#mate-metal)"
        stroke={tinta}
        strokeWidth="2"
      />
      {/* la yerba, asomando por el borde */}
      <path d="M17 28 C22 25 38 25 43 28 C38 30.5 22 30.5 17 28 Z" fill="#55702f" stroke={tinta} strokeWidth="1.2" />
      <path d="M21 27.5 C26 26 34 26 39 27.5" stroke="#7e9b48" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
