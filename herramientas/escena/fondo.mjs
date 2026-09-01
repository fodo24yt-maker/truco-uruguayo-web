/**
 * El fondo del ambiente: lo que se ve por detrás de la mesa.
 *
 * TRES CAPAS A TRES DISTANCIAS, y cada una con SU desenfoque. Eso es lo único
 * que hace que un fondo se lea como profundidad y no como un dibujo pegado
 * atrás: la cámara está enfocada en la mesa, así que lo de lejos va muy borroso,
 * lo del medio menos y lo de cerca casi nítido pero oscuro, porque está fuera
 * del charco de luz.
 *
 * Las siluetas venían de `components/mesa/Escenario.tsx`, donde se dibujaban en
 * vivo. Se mudaron acá: ahora son arte de horneado y NO viajan al navegador.
 */

import { azarCon, entre, semillaDe } from "./azar.mjs";

export const ANCHO = 2400;
export const ALTO = 900;

/** Las siete siluetas. Escala: el viewBox de abajo es 400×84, como el original. */
function recorte(clave, tinta) {
  switch (clave) {
    case "botellas":
      return `<g fill="${tinta}">
        <rect x="0" y="60" width="400" height="4" opacity="0.9"/>
        ${[40, 74, 108, 142, 176, 210, 244, 278, 312, 346]
          .map((x, i) => {
            const h = i % 3 === 0 ? 30 : i % 3 === 1 ? 38 : 24;
            return `<rect x="${x}" y="${60 - h}" width="11" height="${h}" rx="2"/>
                    <rect x="${x + 3.5}" y="${60 - h - 10}" width="4" height="11"/>`;
          })
          .join("")}
      </g>`;
    case "toldos":
      return `<g fill="${tinta}">
        ${[0, 130, 260]
          .map(
            (x) => `<path d="M${x} 46 H${x + 128} L${x + 118} 60 H${x + 10} Z"/>
                    <rect x="${x + 12}" y="58" width="5" height="26"/>
                    <rect x="${x + 111}" y="58" width="5" height="26"/>`,
          )
          .join("")}
      </g>`;
    case "ombu":
      return `<g fill="${tinta}">
        <path d="M0 84 H400 V64 C340 58 300 66 250 62 C200 58 150 66 90 60 C50 56 20 62 0 58 Z" opacity="0.75"/>
        <path d="M296 84 L300 44 L312 44 L316 84 Z"/>
        <ellipse cx="306" cy="34" rx="52" ry="22"/>
        <ellipse cx="272" cy="42" rx="30" ry="14"/>
        <ellipse cx="342" cy="42" rx="28" ry="13"/>
        ${[30, 70, 110, 150, 190].map((x) => `<rect x="${x}" y="52" width="3" height="32" opacity="0.6"/>`).join("")}
        <rect x="28" y="58" width="166" height="2.5" opacity="0.6"/>
        <rect x="28" y="68" width="166" height="2.5" opacity="0.6"/>
      </g>`;
    case "cerros":
      return `<g fill="${tinta}">
        <path d="M0 84 L64 32 L118 62 L176 20 L248 66 L310 40 L400 84 Z" opacity="0.85"/>
        <path d="M0 84 L90 52 L160 74 L240 46 L320 76 L400 60 L400 84 Z" opacity="0.55"/>
      </g>`;
    case "palmeras":
      return `<g fill="${tinta}">
        <path d="M0 78 H400 V84 H0 Z" opacity="0.8"/>
        ${[54, 330]
          .map(
            (x) => `<path d="M${x - 3} 78 C${x - 1} 56 ${x + 1} 40 ${x + 3} 24 L${x + 8} 25 C${x + 5} 41 ${x + 3} 57 ${x + 3} 78 Z"/>
                    <ellipse cx="${x + 5}" cy="20" rx="26" ry="7"/>
                    <ellipse cx="${x - 10}" cy="26" rx="18" ry="6" transform="rotate(-24 ${x - 10} 26)"/>
                    <ellipse cx="${x + 20}" cy="26" rx="18" ry="6" transform="rotate(24 ${x + 20} 26)"/>`,
          )
          .join("")}
        <path d="M186 78 L190 34 L202 34 L206 78 Z" opacity="0.9"/>
        <rect x="188" y="24" width="16" height="11" rx="2"/>
      </g>`;
    case "muelle":
      return `<g fill="${tinta}">
        <path d="M0 70 H400 V84 H0 Z" opacity="0.55"/>
        ${[24, 60, 96, 132, 168].map((x) => `<rect x="${x}" y="60" width="6" height="24"/>`).join("")}
        <rect x="16" y="56" width="164" height="6"/>
        <path d="M244 62 C244 70 254 74 282 74 C310 74 320 70 320 62 Z"/>
        <rect x="262" y="44" width="34" height="18" rx="2"/>
        <rect x="276" y="30" width="5" height="16"/>
      </g>`;
    case "cuchillas":
      return `<g fill="${tinta}">
        <path d="M0 84 L70 54 L140 72 L210 44 L290 70 L400 50 L400 84 Z" opacity="0.7"/>
        <path d="M0 84 L110 68 L190 80 L280 62 L400 78 L400 84 Z" opacity="0.5"/>
        <rect x="342" y="40" width="4" height="30"/>
        <path d="M346 40 L372 46 L346 52 Z"/>
      </g>`;
    default:
      return "";
  }
}

/**
 * La capa de CERCA: lo que enmarca la escena por los costados.
 *
 * Es la capa que más rinde y la que el croquis no tenía. En las referencias hay
 * SIEMPRE algo a los lados —el respaldo de un banco, el marco de una puerta— y
 * es lo que te mete adentro del lugar en vez de dejarte mirándolo de afuera.
 */
function marco(ambiente, azar) {
  /* EL COLOR Y LA OPACIDAD YA NO CUELGAN DE `deNoche`, Y ESE ERA EL BUG.
     `deNoche` decidía dos cosas a la vez: la LUZ del lugar —que sí depende de
     si es un boliche o una plaza— y CUÁNTO CIERRA EL MARCO, que no depende de
     nada de eso. Como `bar-ciudad` es el único de los siete con `deNoche`, a
     los otros seis les quedaba el cielo pálido llegando hasta el borde mismo,
     y contra el negro de la pantalla eso se leía como un panel gris pegado al
     costado: "parece que no se terminó el diseño de la mesa".
     Medido a 1266x841: el borde del fondo de `sierra` daba luma 14 y 23 y el
     marco de la pantalla, 10. El de `bar-ciudad`, 8: por eso ése se fundía.
     La FORMA sigue dependiendo del lugar —un boliche tiene sillas y una plaza
     bancos, eso está bien—; lo que se igualó es cuánto tapan. */
  const oscuro = "#120b06";
  const op = 0.82;
  if (ambiente.deNoche) {
    // El boliche: el respaldo de una silla de cada lado, entrando en diagonal.
    // Van con un filo de luz arriba: sin eso son dos bloques negros y se leen
    // como que a la imagen le faltan las esquinas.
    return `<g>
      ${[
        { x: 0, s: 1 },
        { x: ANCHO, s: -1 },
      ]
        .map(
          ({ x, s }) => `<g transform="translate(${x} 0) scale(${s} 1)" fill="${oscuro}" opacity="${op}">
            <path d="M0 ${ALTO} L0 ${ALTO * 0.40} C${ANCHO * 0.03} ${ALTO * 0.30} ${ANCHO * 0.09} ${ALTO * 0.30} ${ANCHO * 0.115} ${ALTO * 0.40}
                     L${ANCHO * 0.115} ${ALTO} Z"/>
            <path d="M0 ${ALTO * 0.40} C${ANCHO * 0.03} ${ALTO * 0.30} ${ANCHO * 0.09} ${ALTO * 0.30} ${ANCHO * 0.115} ${ALTO * 0.40}"
                  fill="none" stroke="#c9a868" stroke-opacity="0.16" stroke-width="7"/>
          </g>`,
        )
        .join("")}
    </g>`;
  }
  // Al aire libre: los respaldos de dos bancos de plaza, entrando en diagonal
  return `<g fill="${oscuro}" opacity="${op}">
    ${[
      { x: 0, s: 1 },
      { x: ANCHO, s: -1 },
    ]
      .map(
        ({ x, s }) => `<g transform="translate(${x} 0) scale(${s} 1)">
          ${[0, 1, 2]
            .map(
              (k) => `<path d="M0 ${ALTO * (0.30 + k * 0.13)} L${ANCHO * 0.20} ${ALTO * (0.40 + k * 0.15)}
                               L${ANCHO * 0.20} ${ALTO * (0.46 + k * 0.15)} L0 ${ALTO * (0.35 + k * 0.13)} Z"/>`,
            )
            .join("")}
          <path d="M${ANCHO * 0.17} ${ALTO * 0.38} L${ANCHO * 0.21} ${ALTO * 0.40} L${ANCHO * 0.21} ${ALTO} L${ANCHO * 0.17} ${ALTO} Z"/>
        </g>`,
      )
      .join("")}
  </g>`;
}

/* ── El detalle del lugar ─────────────────────────────────────────────────────
   La repisa de botellas sola no alcanzaba para que atrás se leyera un boliche:
   quedaba una franja marrón con unos palitos.

   OJO CON DÓNDE SE DIBUJA. El fondo se muestra con `object-cover` en una franja
   que es el 27% de la escena, y el recorte NO es el mismo en las dos pantallas:
   en el celular entra el alto completo y se cortan los costados, y en la
   computadora entra el ancho completo y se ve sólo la MITAD DE ABAJO. Así que
   todo lo que tenga que verse siempre va en la franja y ≈ 430..760; lo que se
   dibuja más arriba lo ve el celular y no la computadora. */
function detalleDelBoliche(ambiente) {
  if (!ambiente.deNoche) return "";
  const tinta = "#0d0805";
  const madera = "#1d1109";

  // Las copas colgadas boca abajo de su riel. Es el detalle que más rápido
  // dice "esto es un mostrador" y no "esto es una pared con estantes".
  const copas = [340, 430, 520, 610, 700, 790]
    .map(
      (x) => `<g>
        <g fill="${tinta}" opacity="0.72">
          <path d="M${x - 26} 486 L${x + 26} 486 L${x + 12} 536 C${x + 8} 546 ${x - 8} 546 ${x - 12} 536 Z"/>
          <rect x="${x - 3}" y="536" width="6" height="34"/>
          <rect x="${x - 15}" y="568" width="30" height="7" rx="3"/>
        </g>
        <!-- el filo de la copa: es lo único que se ve del vidrio a esta luz -->
        <path d="M${x - 26} 488 L${x + 26} 488" stroke="${ambiente.luz}" stroke-opacity="0.4" stroke-width="4"/>
        <path d="M${x - 22} 492 L${x - 10} 532" stroke="${ambiente.luz}" stroke-opacity="0.22" stroke-width="3"/>
      </g>`,
    )
    .join("");

  // Los parroquianos del fondo: hombros y cabeza, nada más. Van MUY oscuros y
  // muy desenfocados a propósito: si se les mira la forma, le pelean la
  // atención al rival, que es el que importa.
  const gente = [
    { x: 250, r: 46 },
    { x: 2090, r: 52 },
    { x: 1960, r: 40 },
  ]
    .map(
      ({ x, r }) => `<g>
        <g fill="${tinta}" opacity="0.66">
          <ellipse cx="${x}" cy="${560 - r}" rx="${r}" ry="${r * 1.1}"/>
          <path d="M${x - r * 2.1} 760 C${x - r * 1.9} 640 ${x - r} 600 ${x} 600
                   C${x + r} 600 ${x + r * 1.9} 640 ${x + r * 2.1} 760 Z"/>
        </g>
        <path d="M${x - r * 1.5} 660 C${x - r} 608 ${x + r} 608 ${x + r * 1.5} 660"
              fill="none" stroke="${ambiente.luz}" stroke-opacity="0.2" stroke-width="7"/>
      </g>`,
    )
    .join("");

  return `<g>
    <!-- el riel de donde cuelgan las copas -->
    <rect x="290" y="478" width="550" height="12" fill="${tinta}" opacity="0.8"/>
    ${copas}

    <!-- el espejo con marco de atrás de la barra -->
    <g>
      <rect x="1500" y="404" width="560" height="300" fill="#2a1a10" opacity="0.5"/>
      <rect x="1500" y="404" width="560" height="300" fill="none" stroke="#c9a868"
            stroke-opacity="0.5" stroke-width="16"/>
      <!-- el reflejo de la lámpara en el vidrio, corrido: es lo que lo hace espejo -->
      <ellipse cx="1690" cy="500" rx="86" ry="30" fill="${ambiente.luz}" opacity="0.16"/>
    </g>

    ${gente}

    <!-- el mostrador: la tapa BARNIZADA, que es lo que más luz devuelve de todo
         el boliche, y el frente, que cierra abajo -->
    <rect x="0" y="698" width="${ANCHO}" height="22" fill="${ambiente.luz}" opacity="0.3"/>
    <rect x="0" y="712" width="${ANCHO}" height="188" fill="${madera}" opacity="0.9"/>
  </g>`;
}

/** La lámpara que cuelga. Sólo de noche: de día la luz viene del cielo. */
function lampara(ambiente) {
  if (!ambiente.deNoche) return "";
  const cx = ANCHO / 2;
  return `<g>
    <rect x="${cx - 3}" y="0" width="6" height="${ALTO * 0.17}" fill="#0a0603"/>
    <path d="M${cx - 96} ${ALTO * 0.32} C${cx - 96} ${ALTO * 0.18} ${cx - 52} ${ALTO * 0.16} ${cx} ${ALTO * 0.16}
             C${cx + 52} ${ALTO * 0.16} ${cx + 96} ${ALTO * 0.18} ${cx + 96} ${ALTO * 0.32} Z"
          fill="#20150c"/>
    <ellipse cx="${cx}" cy="${ALTO * 0.32}" rx="96" ry="15" fill="${ambiente.luz}" opacity="0.85"/>
    <ellipse cx="${cx}" cy="${ALTO * 0.36}" rx="150" ry="60" fill="${ambiente.luz}" opacity="0.30" filter="url(#halo)"/>
  </g>`;
}

/**
 * HASTA DÓNDE ENTRA EL CIERRE DE LOS COSTADOS, y por qué no es un número fijo.
 *
 * Lo que tiene que quedar igual en los siete ambientes no es cuánta pintura
 * negra se les pone: es el VALOR al que terminan. El borde del encuadre tiene
 * que quedar tan oscuro como el marco de la pantalla, o el corte se ve. Y para
 * llegar al mismo valor, un cielo claro necesita más cierre que uno oscuro.
 *
 * Se probó con un alcance fijo y quedó a medias, que es la prueba de que hacía
 * falta esto: con el mismo 15% los seis pasaron de golpe salvo `feria`, que es
 * el más claro de todos —cielo celeste sobre crema— y se quedó en luma 14
 * contra un marco de 10. Los otros habían caído a 7-10.
 *
 * La claridad sale del propio `cielo` del ambiente, así que un ambiente nuevo
 * trae su alcance puesto y nadie tiene que acordarse de calibrarlo:
 *
 *   bar-ciudad (casi negro) 0,06 → 16%      sierra 0,35 → 23%
 *   feria (celeste/crema)   0,72 → 31%
 */
function alcanceDelCierre(ambiente) {
  const luma = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (0.2 * ((n >> 16) & 255) + 0.7 * ((n >> 8) & 255) + 0.1 * (n & 255)) / 255;
  };
  const claridad = (luma(ambiente.cielo[0]) + luma(ambiente.cielo[1])) / 2;
  /* EL TECHO NO ES DECORACIÓN: SIN ÉL LAS DOS RAMPAS SE CRUZAN.
     El cierre se dibuja espejado en un solo gradiente, así que la cola de la
     izquierda no puede pasar del medio o queda por delante del primer `stop`
     de la derecha. Y los `stop` de un gradiente SVG tienen que ir en orden
     creciente: cuando no van, el navegador no avisa, aplasta el que sobra
     contra el anterior y la franja transparente del medio DESAPARECE. Con
     `feria` pasó exactamente eso —cola en 0,558 contra un espejo que arrancaba
     en 0,442— y el fondo se oscureció entero en vez de sólo por los costados.
     Con la cola en `COLA` veces el alcance, el tope es medio ancho entre COLA,
     menos un pelo para que nunca se toquen. */
  return Math.min(0.15 + 0.22 * claridad, 0.48 / COLA);
}

/** Dónde termina la rampa, en múltiplos del alcance. Ver `alcanceDelCierre`. */
const COLA = 1.45;

/**
 * Los ocho `stop` del cierre, espejados, a partir de un alcance.
 *
 * `alcance` es dónde el cierre baja al 36%; los otros dos van proporcionales,
 * a 0,4 y `COLA` de eso. Se arma por código y no a mano para que la mitad
 * derecha no se pueda desincronizar de la izquierda al tocar un número.
 */
function cierreLateral(alcance) {
  const pasos = [
    [0, 1],
    [0.4 * alcance, 0.86],
    [alcance, 0.36],
    [COLA * alcance, 0],
  ];
  const stop = (x, o) =>
    `<stop offset="${(x * 100).toFixed(2)}%" stop-color="#0d0906" stop-opacity="${o}"/>`;
  return [
    ...pasos.map(([x, o]) => stop(x, o)),
    ...[...pasos].reverse().map(([x, o]) => stop(1 - x, o)),
  ].join("\n        ");
}

export function fondoPlano(ambiente) {
  const azar = azarCon(semillaDe(ambiente.clave + "-fondo"));
  const escalaRecorte = ANCHO / 400;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}"
               viewBox="0 0 ${ANCHO} ${ALTO}">
    <defs>
      <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${ambiente.cielo[0]}"/>
        <stop offset="100%" stop-color="${ambiente.cielo[1]}"/>
      </linearGradient>
      <radialGradient id="resplandor" cx="50%" cy="46%" r="58%">
        <stop offset="0%"   stop-color="${ambiente.luz}" stop-opacity="0.55"/>
        <stop offset="45%"  stop-color="${ambiente.luz}" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="${ambiente.luz}" stop-opacity="0"/>
      </radialGradient>
      <filter id="halo"><feGaussianBlur stdDeviation="46"/></filter>
      <filter id="lejos"><feGaussianBlur stdDeviation="17"/></filter>
      <filter id="medio"><feGaussianBlur stdDeviation="8"/></filter>
      <filter id="cerca"><feGaussianBlur stdDeviation="3.5"/></filter>
      <filter id="ruido-pared">
        <feTurbulence type="fractalNoise" baseFrequency="0.5 0.01" numOctaves="3" seed="5"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.06  0 0 0 0 0.03  0 0 0 0 0.015  0 0 0 0.5 0"/>
      </filter>
    </defs>

    <!-- LEJOS -->
    <g filter="url(#lejos)">
      <rect width="${ANCHO}" height="${ALTO}" fill="url(#cielo)"/>
      ${ambiente.deNoche ? `<rect width="${ANCHO}" height="${ALTO}" filter="url(#ruido-pared)" opacity="0.75"/>` : ""}
      <g transform="scale(${escalaRecorte} ${ALTO / 84})">
        ${recorte(ambiente.recorte, "rgba(0,0,0,0.62)")}
      </g>
    </g>

    <!-- MEDIO: la luz y lo que cuelga -->
    <g filter="url(#medio)">
      <rect width="${ANCHO}" height="${ALTO}" fill="url(#resplandor)"/>
      ${detalleDelBoliche(ambiente)}
      ${lampara(ambiente)}
    </g>

    <!-- CERCA: lo que enmarca -->
    <g filter="url(#cerca)">
      ${marco(ambiente, azar)}
    </g>

    <!-- la penumbra de los costados, que cierra el encuadre -->
    <rect width="${ANCHO}" height="${ALTO}" fill="none"/>
    <rect width="${ANCHO}" height="${ALTO}" style="mix-blend-mode:multiply"
          fill="url(#viñeta)"/>

    <!-- ── EL CIERRE DE LOS COSTADOS ────────────────────────────────────────
         Va en un gradiente HORIZONTAL y aparte de la viñeta, y no es lo mismo.
         De esta imagen sólo se ve la franja de abajo: son 2000x750 metidos con
         object-cover / object-bottom en una franja de ~1180x181, o sea el 41%
         inferior, y cuánto se ve depende de la forma de la ventana. Una viñeta
         radial se recorta distinto en cada pantalla y su parte más oscura
         —arriba y abajo del todo— es justo la que se cae del recorte. Un
         cierre vertical cae siempre en el mismo lugar, mire quien mire.

         El color es el mismo #0d0906 con el que la mesa pinta lo que hay
         fuera de la escena, así que el borde de la imagen y el marco de la
         pantalla son literalmente el mismo negro y no hay dónde ver el corte. -->
    <rect width="${ANCHO}" height="${ALTO}" fill="url(#cierre-costados)"/>
    <defs>
      <radialGradient id="viñeta" cx="50%" cy="55%" r="72%">
        <stop offset="0%" stop-color="#fff"/>
        <stop offset="62%" stop-color="#cfcfcf"/>
        <stop offset="100%" stop-color="#1e1e1e"/>
      </radialGradient>
      <linearGradient id="cierre-costados" x1="0" y1="0" x2="1" y2="0">
        ${cierreLateral(alcanceDelCierre(ambiente))}
      </linearGradient>
    </defs>
  </svg>`;
}
