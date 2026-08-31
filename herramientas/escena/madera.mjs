/**
 * La tabla de la mesa, dibujada PLANA (como si la miraras desde arriba).
 *
 * La perspectiva NO se dibuja acá: se la pone Chromium después, inclinando esta
 * imagen con `rotateX`. Dibujar la madera ya torcida obligaría a deformar a mano
 * cada nudo y cada rayón; así se dibuja derecho, que es como se piensa, y la
 * cámara hace su trabajo aparte.
 *
 * POR QUÉ ESTO SE HORNEA Y NO CORRE EN VIVO
 * Son cinco pasadas de `feTurbulence`, dos `feDisplacementMap` y unas ochenta
 * formas. Eso, sobre la mesa entera y en cada cuadro, arrastra cualquier celular.
 * Horneado a WebP, el navegador decodifica una imagen y se acabó.
 *
 * El sistema de coordenadas: y=0 es el borde LEJANO (el del rival), y=ALTO es el
 * borde CERCANO (el tuyo, donde apoyás los codos).
 */

import { azarCon, entre, semillaDe } from "./azar.mjs";

export const ANCHO = 2400;
export const ALTO = 2900;

/** Dónde cae el charco de luz de la lámpara, medido desde el borde lejano.
 *  El 0,57 no es al azar: con la inclinación que le pone `generar-escena.mjs`,
 *  es el punto de la mesa que termina cayendo en el medio de la pantalla. */
const LUZ_Y = 0.57;

/* ── Las vetas ────────────────────────────────────────────────────────────────
   Dos pasadas a frecuencias distintas y una deformación encima.

   Una sola pasada de ruido estirado da pana, no madera: sale un rayado parejo.
   Lo que hace que se lea como madera son tres cosas juntas: una veta fina
   (el poro), una veta gruesa (el anillo de crecimiento) y que las dos ONDULEN
   en vez de ir derechas. Lo tercero lo hace el `feDisplacementMap`. */
function filtros(ambiente, semilla) {
  return `
    <filter id="veta-fina" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.62 0.006" numOctaves="4"
                    seed="${semilla % 9973}" result="ruido"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.0016 0.0055" numOctaves="2"
                    seed="${(semilla + 41) % 9973}" result="onda"/>
      <feDisplacementMap in="ruido" in2="onda" scale="24"
                         xChannelSelector="R" yChannelSelector="G" result="ondulada"/>
      <feColorMatrix in="ondulada" type="matrix"
        values="0 0 0 0 0.09
                0 0 0 0 0.05
                0 0 0 0 0.025
                0 0 0 0.62 0"/>
    </filter>

    <filter id="veta-gruesa" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.11 0.0022" numOctaves="3"
                    seed="${(semilla + 7) % 9973}" result="ruido"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.0012 0.0035" numOctaves="2"
                    seed="${(semilla + 83) % 9973}" result="onda"/>
      <feDisplacementMap in="ruido" in2="onda" scale="42"
                         xChannelSelector="R" yChannelSelector="G" result="ondulada"/>
      <feColorMatrix in="ondulada" type="matrix"
        values="0 0 0 0 0.11
                0 0 0 0 0.06
                0 0 0 0 0.03
                0 0 0 0.40 0"/>
    </filter>

    <!-- El grano fino de la superficie: es lo que le saca el brillo de plástico -->
    <filter id="grano" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"
                    seed="${(semilla + 19) % 9973}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.13"/></feComponentTransfer>
    </filter>

    <!-- Los nudos y los cercos de vaso pasan por acá: un círculo perfecto se ve
         dibujado, uno abollado se ve de madera. -->
    <filter id="abolla" x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="3"
                    seed="${(semilla + 53) % 9973}" result="r"/>
      <feDisplacementMap in="SourceGraphic" in2="r" scale="8"
                         xChannelSelector="R" yChannelSelector="G"/>
    </filter>

    <!-- Para las manchas. el desenfoque grande les borraba la forma: quedaban
         nubarrones sin borde, que es exactamente lo que se leía como "algo
         raro en la mesa" y no como una mancha de algo. -->
    <filter id="mancha-suave" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="11"/>
    </filter>

    <filter id="difuso" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="34"/>
    </filter>

    <filter id="apenas" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3"/>
    </filter>

    <radialGradient id="charco" cx="50%" cy="${LUZ_Y * 100}%" r="62%">
      <stop offset="0%"   stop-color="${ambiente.luz}" stop-opacity="0.50"/>
      <stop offset="38%"  stop-color="${ambiente.luz}" stop-opacity="0.22"/>
      <stop offset="70%"  stop-color="${ambiente.luz}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${ambiente.luz}" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="borde" cx="50%" cy="${LUZ_Y * 100}%" r="68%">
      <stop offset="0%"   stop-color="#000" stop-opacity="0"/>
      <stop offset="48%"  stop-color="#000" stop-opacity="${ambiente.deNoche ? 0.14 : 0.08}"/>
      <stop offset="100%" stop-color="#000" stop-opacity="${ambiente.deNoche ? 0.88 : 0.62}"/>
    </radialGradient>

    <linearGradient id="hondo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${ambiente.mesa[2]}" stop-opacity="${ambiente.deNoche ? 0.50 : 0.34}"/>
      <stop offset="14%"  stop-color="${ambiente.mesa[2]}" stop-opacity="0.22"/>
      <stop offset="58%"  stop-color="${ambiente.mesa[1]}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${ambiente.mesa[2]}" stop-opacity="0.30"/>
    </linearGradient>
  `;
}

/* ── Las tablas ───────────────────────────────────────────────────────────────
   Una mesa es varias tablas, no una plancha, y eso se nota en DOS cosas:

   · la junta, que no es sólo una línea oscura: al lado tiene un BISEL claro, del
     lado que le pega la luz. Sin el bisel la línea se ve dibujada; con el bisel
     se ve que hay un canto;
   · que cada tabla tiene SU tono. Salieron de troncos distintos y envejecieron
     distinto. Todas del mismo color es lo que delata que es una textura y no
     una mesa, y es lo que le pasaba al croquis. */
function tablas(azar) {
  const cuantas = 5;
  const paso = ANCHO / cuantas;
  const cortes = [0];
  for (let i = 1; i < cuantas; i++) cortes.push(i * paso + entre(azar, -30, 30));
  cortes.push(ANCHO);

  let tonos = "";
  for (let i = 0; i < cuantas; i++) {
    const x = cortes[i];
    const w = cortes[i + 1] - x;
    const claro = azar() < 0.5;
    tonos += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${ALTO}"
      fill="${claro ? "#ffffff" : "#000000"}" opacity="${entre(azar, 0.012, 0.055).toFixed(3)}"/>`;
  }

  let juntas = "";
  let juntasNitidas = "";
  for (let i = 1; i < cuantas; i++) {
    const x = cortes[i];
    juntas += `
      <rect x="${(x - 3).toFixed(1)}" y="0" width="6" height="${ALTO}" fill="#000" opacity="0.34"/>
      <rect x="${(x + 2.5).toFixed(1)}" y="0" width="4" height="${ALTO}" fill="#fff" opacity="0.07"/>`;
    juntasNitidas += `
      <rect x="${(x - 0.9).toFixed(1)}" y="0" width="1.9" height="${ALTO}" fill="#140a03" opacity="0.72"/>`;
  }

  // El bisel y la sombra ancha van desenfocados —son luz, no borde—, pero la
  // línea de la junta va NÍTIDA. Es un corte entre dos tablas: si se desenfoca,
  // la mesa deja de tener tablas y pasa a tener manchas alargadas.
  return `${tonos}<g filter="url(#apenas)">${juntas}</g>${juntasNitidas}`;
}

/* ── Los nudos ────────────────────────────────────────────────────────────────
   Anillos concéntricos cada vez más juntos hacia el centro, estirados en el
   sentido de la veta.

   ESTABAN DEMASIADO GRANDES Y DEMASIADO BLANDOS. Con `r` hasta 82 y un estirado
   de hasta 2,9 el nudo medía 238px de alto —en una mesa de 2400 de ancho, es una
   mancha— y el abollado de 15 le terminaba de borrar los anillos. El resultado
   no se leía como un nudo sino como una quemadura, y era una de "las cosas
   raras en la mesa".

   Ahora son CHICOS y DIBUJADOS. Lo que hace que algo se lea como un nudo es que
   se le vean los anillos; en cuanto se desenfocan, deja de ser un nudo y pasa a
   ser una mancha oscura. Por eso el trazo va nítido y con contorno. */
function nudos(azar, cuantos = 6) {
  let salida = "";
  for (let i = 0; i < cuantos; i++) {
    const cx = entre(azar, ANCHO * 0.08, ANCHO * 0.92);
    const cy = entre(azar, ALTO * 0.05, ALTO * 0.97);
    const r = entre(azar, 24, 50);
    const estira = entre(azar, 1.25, 1.75); // los nudos se alargan con la veta
    const giro = entre(azar, -14, 14);
    let anillos = "";
    for (let k = 8; k >= 1; k--) {
      const t = k / 8;
      anillos += `<ellipse cx="0" cy="0" rx="${(r * t).toFixed(1)}" ry="${(r * estira * t).toFixed(1)}"
        fill="none" stroke="#1c0f05" stroke-opacity="${(0.26 + 0.34 * (1 - t)).toFixed(3)}"
        stroke-width="${(1.6 + 2.6 * (1 - t)).toFixed(1)}"/>`;
    }
    salida += `
      <g transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)}) rotate(${giro.toFixed(1)})">
        <!-- el halo, que es la madera más densa alrededor del nudo -->
        <ellipse cx="0" cy="0" rx="${(r * 1.28).toFixed(1)}" ry="${(r * estira * 1.2).toFixed(1)}"
                 fill="#2a1608" opacity="0.16"/>
        ${anillos}
        <!-- el contorno del anillo de afuera: es la línea que lo dibuja -->
        <ellipse cx="0" cy="0" rx="${r.toFixed(1)}" ry="${(r * estira).toFixed(1)}"
                 fill="none" stroke="#170c04" stroke-opacity="0.5" stroke-width="2.4"/>
        <!-- el corazón, por donde salía la rama -->
        <ellipse cx="0" cy="0" rx="${(r * 0.2).toFixed(1)}" ry="${(r * 0.42).toFixed(1)}"
                 fill="#150b04" opacity="0.74"/>
        <ellipse cx="${(-r * 0.07).toFixed(1)}" cy="${(-r * 0.14).toFixed(1)}"
                 rx="${(r * 0.1).toFixed(1)}" ry="${(r * 0.22).toFixed(1)}"
                 fill="#fff" opacity="0.07"/>
      </g>`;
  }
  return `<g filter="url(#abolla)">${salida}</g>`;
}

/* ── Los rayones ──────────────────────────────────────────────────────────────
   Cortos, finos y en ángulos distintos entre sí. Un rayón es un surco: tiene el
   lado oscuro y, corrido un pelo, el lado que refleja. Van muy tenues; se ven
   cuando les pega la luz y no antes, que es como se ven de verdad. */
function rayones(azar, cuantos = 30) {
  let salida = "";
  for (let i = 0; i < cuantos; i++) {
    const x = entre(azar, 40, ANCHO - 40);
    const y = entre(azar, 40, ALTO - 40);
    const largo = entre(azar, 55, 320);
    const ang = entre(azar, -Math.PI, Math.PI);
    const x2 = x + Math.cos(ang) * largo;
    const y2 = y + Math.sin(ang) * largo;
    const curva = entre(azar, -18, 18);
    const mx = (x + x2) / 2 + curva;
    const my = (y + y2) / 2 + curva;
    const d = `M${x.toFixed(0)} ${y.toFixed(0)} Q${mx.toFixed(0)} ${my.toFixed(0)} ${x2.toFixed(0)} ${y2.toFixed(0)}`;
    salida += `
      <path d="${d}" stroke="#000" stroke-opacity="${entre(azar, 0.10, 0.26).toFixed(3)}"
            stroke-width="${entre(azar, 0.9, 2.2).toFixed(1)}" fill="none" stroke-linecap="round"/>
      <path d="${d}" transform="translate(1.4 1.4)" stroke="#fff"
            stroke-opacity="${entre(azar, 0.03, 0.09).toFixed(3)}"
            stroke-width="${entre(azar, 0.8, 1.6).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
  }
  return salida;
}

/* ── Manchas y cercos de vaso ─────────────────────────────────────────────────
   El cerco lo deja el vaso frío: un anillo mojado que se secó. Es el detalle que
   más rápido dice "acá hay gente tomando algo hace rato". */
function manchas(azar, cuantas = 7, cercos = 2) {
  let salida = "";
  // ESTO ERA EL PROBLEMA. Iban de 90 a 300 de radio con un desenfoque de 34: un
  // borrón de 600px de ancho sobre una mesa de 2400, sin borde y sin forma. No
  // se leía como una mancha de nada, se leía como que la imagen está sucia. Una
  // mancha de verdad es CHICA y tiene borde.
  for (let i = 0; i < cuantas; i++) {
    const cx = entre(azar, ANCHO * 0.05, ANCHO * 0.95);
    const cy = entre(azar, ALTO * 0.05, ALTO * 0.95);
    salida += `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}"
      rx="${entre(azar, 40, 110).toFixed(0)}" ry="${entre(azar, 34, 90).toFixed(0)}"
      fill="#2a1608" opacity="${entre(azar, 0.08, 0.17).toFixed(3)}" filter="url(#mancha-suave)"/>`;
  }
  // El cerco lo deja el vaso frío. Un vaso mide ocho centímetros en una mesa de
  // ochenta: acá son 50-70px y no 116. Y el trazo va FINO Y OSCURO —antes era
  // gordo y tenue— porque lo que lo hace leer como un anillo es el filo.
  for (let i = 0; i < cercos; i++) {
    const cx = entre(azar, ANCHO * 0.12, ANCHO * 0.88);
    const cy = entre(azar, ALTO * 0.10, ALTO * 0.9);
    const r = entre(azar, 50, 70);
    salida += `
      <g filter="url(#abolla)" opacity="${entre(azar, 0.42, 0.62).toFixed(2)}">
        <ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${r.toFixed(0)}" ry="${(r * 0.93).toFixed(0)}"
                 fill="none" stroke="#1f1002" stroke-width="4.5" stroke-opacity="0.72"/>
        <ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(r - 4).toFixed(0)}" ry="${((r - 4) * 0.93).toFixed(0)}"
                 fill="#3a2410" opacity="0.13"/>
      </g>`;
  }
  return salida;
}

/* ── El garabato de marcador ──────────────────────────────────────────────────
   Está en la referencia y es lo más de barrio que tiene la mesa.

   ANTES ERAN BUCLES AL AZAR y se leían como un resorte, no como algo escrito
   por alguien. Un garabato de marcador tiene dos cosas que un bucle no tiene:
   ÁNGULOS —la mano cambia de dirección de golpe, no en curva— y ANCHO PAREJO,
   porque un marcador no aprieta más ni menos.

   SIGUE SIN DELETREAR NADA, a propósito: son trazos sueltos, para no publicar
   en la mesa una palabra que nadie decidió. */
function garabatos(azar, cuantos, tintas) {
  let salida = "";
  for (let i = 0; i < cuantos; i++) {
    const x = entre(azar, ANCHO * 0.06, ANCHO * 0.86);
    const y = entre(azar, ALTO * 0.06, ALTO * 0.94);
    const escala = entre(azar, 0.75, 1.6);
    const giro = entre(azar, -22, 22);
    const tinta = tintas[Math.floor(azar() * tintas.length)];
    const grosor = entre(azar, 6, 10);

    // El trazo: sube y baja en ángulo, avanzando hacia la derecha.
    const tramos = Math.floor(entre(azar, 4, 8));
    const alto = entre(azar, 46, 82);
    let d = `M0 ${alto.toFixed(0)}`;
    let px = 0;
    for (let k = 0; k < tramos; k++) {
      // Los picos NO llegan todos a la misma altura: una sierra pareja se lee
      // como una montaña dibujada, no como una firma.
      const arriba = k % 2 === 0;
      const nx = px + entre(azar, 22, 58);
      const y2 = arriba
        ? entre(azar, -4, alto * 0.42)
        : entre(azar, alto * 0.62, alto + 10);
      d += ` L${nx.toFixed(0)} ${y2.toFixed(0)}`;
      px = nx;
    }
    // La firma remata en una barra larga por abajo: es el gesto con el que se
    // termina de firmar una pared, y es lo que lo hace leer como una firma.
    const cola = px + entre(azar, 30, 90);
    d += ` M${(-entre(azar, 4, 20)).toFixed(0)} ${(alto + entre(azar, 8, 20)).toFixed(0)} L${cola.toFixed(0)} ${(alto + entre(azar, 2, 16)).toFixed(0)}`;

    salida += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${giro.toFixed(0)}) scale(${escala.toFixed(2)})"
                  opacity="${entre(azar, 0.26, 0.46).toFixed(3)}">
      <path d="${d}" fill="none" stroke="${tinta}" stroke-width="${grosor.toFixed(1)}"
            stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
  }
  return salida;
}

/**
 * La tabla entera, plana.
 *
 * `desgaste` es lo que distingue un boliche de una mesa de feria: el boliche
 * tiene garabatos de marcador y cercos de vaso, el mediodía al aire libre tiene
 * más sol comido y menos tinta.
 */
export function maderaPlana(ambiente) {
  const semilla = semillaDe(ambiente.clave);
  const azar = azarCon(semilla);
  const deBoliche = ambiente.deNoche;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}"
               viewBox="0 0 ${ANCHO} ${ALTO}">
    <defs>${filtros(ambiente, semilla)}</defs>

    <!-- el color de fondo, del centro iluminado al borde apagado -->
    <rect width="${ANCHO}" height="${ALTO}" fill="${ambiente.mesa[1]}"/>
    <rect width="${ANCHO}" height="${ALTO}" fill="url(#charco)"/>

    <!-- las vetas -->
    <rect width="${ANCHO}" height="${ALTO}" filter="url(#veta-gruesa)" style="mix-blend-mode:multiply"/>
    <rect width="${ANCHO}" height="${ALTO}" filter="url(#veta-fina)" style="mix-blend-mode:multiply"/>

    ${manchas(azar, deBoliche ? 8 : 5, deBoliche ? 3 : 1)}
    ${tablas(azar)}
    ${nudos(azar, 6)}
    ${garabatos(azar, deBoliche ? 5 : 2, ["#2c4f8a", "#8a2c2c", "#1d1d1d"])}
    ${rayones(azar, deBoliche ? 34 : 26)}

    <!-- el borde gastado donde apoya la gente: la madera ahí está más clara -->
    <rect x="0" y="${ALTO - 380}" width="${ANCHO}" height="380"
          fill="${ambiente.mesa[0]}" opacity="0.16" filter="url(#difuso)"/>

    <!-- la penumbra: primero la de arriba y abajo, después la del charco -->
    <rect width="${ANCHO}" height="${ALTO}" fill="url(#hondo)"/>
    <rect width="${ANCHO}" height="${ALTO}" fill="url(#borde)"/>

    <!-- El canto lejano, DIBUJADO. Es el borde por donde la mesa se termina, y
         si se disuelve contra el fondo la mesa deja de tener forma. Van tres
         líneas: el filo que refleja la lámpara, la línea de tinta que lo corta,
         y la sombra que cae del otro lado. -->
    <rect x="0" y="0" width="${ANCHO}" height="8" fill="#fff" opacity="0.2"/>
    <rect x="0" y="8" width="${ANCHO}" height="2.5" fill="#170c03" opacity="0.8"/>
    <rect x="0" y="10.5" width="${ANCHO}" height="18" fill="#000" opacity="0.22"/>

    <!-- el grano, arriba de todo: le saca el brillo de plástico -->
    <rect width="${ANCHO}" height="${ALTO}" filter="url(#grano)" style="mix-blend-mode:overlay"/>
  </svg>`;
}
