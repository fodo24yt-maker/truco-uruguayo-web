/**
 * El contador de BLOQUES: la basura de dibujo del celular, contada sin opinar.
 *
 *     node herramientas/bloques.mjs foto.png [otra.png ...]
 *
 * ── Por qué existe, si ya está `motas.mjs` ────────────────────────────────
 *
 * Porque `motas.mjs` no distingue basura de un detalle chiquito del diseño, y
 * él mismo lo dice. Contando motas, el mapa da 534 y el menú 88, y ninguno de
 * esos números significa nada: esas pantallas son casi todas detalles chicos.
 * Tres sesiones seguidas se diagnosticó mirando ese número y las tres se
 * diagnosticó mal.
 *
 * Este cuenta otra cosa, y por eso sí sirve.
 *
 * ── Qué es un bloque, y cómo lo sabemos ───────────────────────────────────
 *
 * El 5/9/2026, con la primera foto SIN PÉRDIDA del framebuffer (por USB, no
 * por el espejo de Windows), se midieron las 29 manchitas de una mesa con el
 * envido cantado. Salió esto:
 *
 *     29 de 29 terminan en un múltiplo de 4
 *     28 de 29 empiezan en un múltiplo de 4
 *     29 de 29 arrancan en y ≡ 2 (mod 4)   ← la misma grilla, corrida por la
 *                                            barra de estado
 *     anchos 4px (25), 8px (3)  ·  altos 4px (26), 8px (2)
 *     28 de 29 son de UN SOLO COLOR PLANO
 *
 * Una manchita de dibujo no cae en una grilla de 4. Esto sí: es la
 * **compresión de bloques de la GPU** —AFBC en la Mali del teléfono— que
 * comprime las superficies compuestas de a 4×4 píxeles. Un bloque cuyo dato
 * vuelve mal se dibuja como un rectángulo de color plano.
 *
 * O sea: NO LO DIBUJA NUESTRO CÓDIGO. Pero sí depende de cuántas superficies
 * separadas le demos a comprimir, y eso sí lo decidimos nosotros: sacar los
 * filtros el 1/9 y el 4/9 bajó el bug 7 veces sin tocar una sola forma.
 *
 * Por eso este número es el que hay que mirar al cambiar el dibujo.
 *
 * ── Cómo los encuentra ────────────────────────────────────────────────────
 *
 * La paleta del proyecto es CÁLIDA en todos lados: la madera, el pergamino y
 * las cartas tienen r > g > b. Un píxel neutro —gris o blanco parejo— no lo
 * puede haber puesto la escena. Se marcan esos, se agrupan, y se queda con las
 * manchas chicas que además caen en la grilla de 4: las cartas y los carteles
 * son manchas grandes y quedan afuera solas.
 *
 * ── Su límite, dicho acá para que nadie lo descubra tarde ─────────────────
 *
 * La banda por omisión salta la barra de arriba y la mano de abajo, que son
 * las dos zonas donde SÍ hay blanco dibujado a propósito. Si se mide otra
 * pantalla hay que darle otra banda, o va a contar diseño.
 */

import path from "node:path";

import { leer, manchas } from "./motas.mjs";

/** Más claro que esto para que un neutro se note sobre la madera oscura. */
const CLARO = 150;
/** Cuánto puede separarse un canal de otro y seguir siendo "neutro". */
const NEUTRO = 22;
/** Una mancha de más de esto es algo dibujado: una carta, un cartel. */
const BLOQUE = 40;
/** El lado de la grilla de compresión. */
const REJILLA = 4;

/**
 * Más oscuro que esto para que un neutro se note sobre el pergamino claro.
 *
 * Hacen falta LAS DOS polaridades: en la mesa la madera es oscura y el bloque
 * sale claro, y en el mapa el pergamino es claro y el bloque sale gris. La
 * primera versión sólo miraba la clara y daba 0 en el mapa, que era justo la
 * pantalla donde el bug se había visto primero.
 */
const OSCURO = 110;

export async function bloquesDe(ruta, banda = [0.27, 0.72]) {
  const { data, ancho, alto, canales } = await leer(ruta);
  const marca = new Uint8Array(ancho * alto);
  const y0 = Math.round(alto * banda[0]);
  const y1 = Math.round(alto * banda[1]);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = (y * ancho + x) * canales;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const neutro = Math.abs(r - b) <= NEUTRO && Math.abs(g - b) <= NEUTRO;
      if (neutro && (r > CLARO || r < OSCURO)) marca[y * ancho + x] = 1;
    }
  }
  const chicas = manchas(marca, ancho, alto).filter((m) => m.n <= BLOQUE);
  /* En la grilla: el ancho y el alto son múltiplos de 4, que es lo que
     separa un bloque de compresión de un detalle chico del dibujo. */
  const enGrilla = chicas.filter(
    (m) => (m.x1 - m.x0 + 1) % REJILLA === 0 && (m.y1 - m.y0 + 1) % REJILLA === 0,
  );
  const color = (x, y) => {
    const i = (y * ancho + x) * canales;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const bloques = enGrilla.filter((m) => esBloque(m, color, ancho, alto));
  return { ancho, alto, bloques: bloques.length, chicas: chicas.length, cajas: bloques };
}

/**
 * Las dos pruebas físicas que separan un bloque de compresión del antialias.
 *
 * Sin esto el detector agarraba el texto: la crema al 65% sobre el fondo oscuro
 * da un gris casi neutro, y trece pedacitos de letra de la pantalla de elegir
 * modo pasaban por bloques. Se comprobó uno por uno y no lo eran.
 *
 * 1. **Plano.** Un bloque que vuelve mal se dibuja de un solo color. El
 *    antialias, por definición, tiene degradado adentro.
 * 2. **Fuera del rango de lo que lo rodea.** Y ésta es la que de verdad
 *    decide: un píxel de antialias SIEMPRE es un valor intermedio entre la
 *    tinta y el fondo, así que cae adentro del rango del vecindario. La basura
 *    de la GPU es un color cualquiera, y casi siempre cae afuera.
 */
function esBloque(m, color, ancho, alto) {
  const c0 = color(m.x0, m.y0);
  for (let y = m.y0; y <= m.y1; y++) {
    for (let x = m.x0; x <= m.x1; x++) {
      const q = color(x, y);
      if (Math.abs(q[0] - c0[0]) > 10 || Math.abs(q[1] - c0[1]) > 10 || Math.abs(q[2] - c0[2]) > 10) {
        return false;
      }
    }
  }
  /* El anillo de alrededor, a dos píxeles: el rango de lo que hay al lado. */
  const bajo = [255, 255, 255], alt = [0, 0, 0];
  for (let y = m.y0 - 2; y <= m.y1 + 2; y++) {
    for (let x = m.x0 - 2; x <= m.x1 + 2; x++) {
      if (x < 0 || y < 0 || x >= ancho || y >= alto) continue;
      if (x >= m.x0 && x <= m.x1 && y >= m.y0 && y <= m.y1) continue;
      const q = color(x, y);
      for (let k = 0; k < 3; k++) {
        if (q[k] < bajo[k]) bajo[k] = q[k];
        if (q[k] > alt[k]) alt[k] = q[k];
      }
    }
  }
  /* Afuera del rango en algún canal, con margen para el ruido de captura. */
  return [0, 1, 2].some((k) => c0[k] > alt[k] + 8 || c0[k] < bajo[k] - 8);
}

/**
 * ── LA SEGUNDA POBLACIÓN: LAS CROMÁTICAS ──────────────────────────────────
 *
 * El 7/9/2026 Santiago trajo seis capturas con manchitas bien visibles y este
 * detector dio **0 en las seis**. No estaban limpias: el detector era ciego.
 *
 * Lo de arriba busca bloques de 4×4, grises y planos, que es lo que se midió
 * el 5/9. Lo de hoy es otra cosa, y se midió sobre el framebuffer de 720×1600:
 *
 *     cuadraditos de 2×2 px, en colores SATURADOS y fuera de la paleta
 *     rgb(33,13,123) · rgb(48,171,250) · rgb(227,10,10)
 *
 * Y `adb shell wm density` da 320, o sea DPR 2. Entonces **2 px de pantalla es
 * 1 px CSS exacto**: estas manchitas miden UN PÍXEL CSS, no un bloque de
 * compresión. Son dos mecanismos distintos y por eso se cuentan aparte y no se
 * suman nunca. Sumarlos sería volver a tener un número que no dice nada, que
 * es justo el problema que este archivo existe para no repetir.
 *
 * ── Cómo las encuentra, y por qué NO mira la paleta global ────────────────
 *
 * La tentación es decir "el proyecto es cálido, un azul no puede ser nuestro".
 * Es mentira: `--color-espada` es #2f5480 y el basto es verde. Un detector así
 * marcaría media carta de espadas apoyada en la mesa.
 *
 * Se compara contra EL VECINDARIO, no contra la paleta:
 *
 *   1. **Fuera del rango de lo que lo rodea**, en el anillo de 3 px. Es la
 *      misma prueba que ya decide `esBloque`, y por el mismo motivo: un píxel
 *      de antialias SIEMPRE es un valor intermedio entre la tinta y el fondo,
 *      así que cae adentro del rango. Basura, no.
 *   2. **De otro color que lo que lo rodea**: el ángulo entre el color del
 *      píxel y el color medio del vecindario pasa de ~20°. Un puntito cian
 *      sobre la madera lo cumple; un puntito azul adentro de una espada azul
 *      no, y por eso la carta no se cuenta.
 *   3. **Saturado**. Los grises ya los cuenta la otra población.
 *   4. **Chico y plano**: hasta 3 px de lado (1 px CSS a DPR 2, con uno de
 *      sobra) y de un solo color, como el bloque que vuelve mal.
 */

/** Cuánto se tiene que salir del rango del vecindario, en un canal. */
const SALTO = 30;
/**
 * Coseno del ángulo entre el color del píxel y el del vecindario. 0,94 ≈ 20°.
 *
 * ── EL PISO CONOCIDO DE LA MESA, Y POR QUÉ NO SE PUEDE SACAR ──────────────
 *
 * En la mesa este detector cuenta hasta **9 manchitas por cuadro que son
 * DIBUJO**: el dorso bordo del mazo asomando entre el filo dorado y la carta
 * de la muestra, `rgb(100,22,31)`, que es `--color-bordo` en sombra. Aparecen
 * en diagonal alrededor de x 138-182, y 721-790 a 720×1600.
 *
 * Se intentó separarlas apretando este umbral y **no se puede**, y el número
 * dice por qué:
 *
 *     el bordo del mazo (dibujo)          coseno 0,906
 *     la banda de basura de la mano       mediana 0,955  ·  p90 0,986
 *
 * O sea que la basura se parece MÁS a su vecindario que el dibujo, porque sus
 * vecinos también son basura. Las dos poblaciones se solapan en este eje y
 * apretar el umbral se lleva puesta la que importa. También se probó un piso
 * de tamaño; está contado más abajo y tampoco sirve.
 *
 * Así que el piso se queda, y se lee sabiendo que está: en la mesa, **hasta 9
 * es limpio**. La banda de la mano daba 213 y 302 sobre la misma pantalla, o
 * sea treinta veces más. Para eso alcanza de sobra.
 */
const MISMO_COLOR = 0.94;
/** Menos saturado que esto es un gris, y los grises los cuenta la otra prueba. */
const SATURADO = 0.35;
/** El lado máximo: 1 px CSS a DPR 2 son 2, y se deja uno de sobra. */
const LADO = 3;
/* ── SE PROBÓ UN PISO DE TAMAÑO Y NO SIRVE ────────────────────────────────
   La idea era: a DPR 2 la página vive en una grilla de 2×2 px de pantalla, así
   que nada del compositor puede medir menos. Suena bien y está mal: el ruido
   denso de una superficie que volvió mal se FRAGMENTA —sólo algunos de sus
   píxeles se salen del rango de sus vecinos, porque los vecinos también son
   ruido— y queda como manchitas de 1×1. Con el piso puesto, la banda de la
   mano pasaba de 319 a 2. Queda escrito para que no se vuelva a intentar. */

/** El color como dirección, para poder preguntarle el ángulo a otro. */
function rumbo(r, g, b) {
  const n = Math.hypot(r, g, b);
  return n === 0 ? [0, 0, 0] : [r / n, g / n, b / n];
}

export async function cromaticasDe(ruta, banda = [0.27, 0.72]) {
  const { data, ancho, alto, canales } = await leer(ruta);
  const marca = new Uint8Array(ancho * alto);
  const y0 = Math.round(alto * banda[0]);
  const y1 = Math.round(alto * banda[1]);
  const R = 3;

  const color = (x, y) => {
    const i = (y * ancho + x) * canales;
    return [data[i], data[i + 1], data[i + 2]];
  };

  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < ancho; x++) {
      const c = color(x, y);
      const mx = Math.max(...c);
      if (mx === 0 || (mx - Math.min(...c)) / mx < SATURADO) continue;

      /* El anillo: de 2 a 3 px de distancia. El vecino inmediato se saltea
         porque una manchita de 2×2 lo tendría adentro y se taparía sola. */
      let lo = [255, 255, 255];
      let hi = [0, 0, 0];
      const suma = [0, 0, 0];
      let n = 0;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;
          const q = color(nx, ny);
          for (let k = 0; k < 3; k++) {
            if (q[k] < lo[k]) lo[k] = q[k];
            if (q[k] > hi[k]) hi[k] = q[k];
            suma[k] += q[k];
          }
          n++;
        }
      }
      if (!n) continue;

      let fuera = 0;
      for (let k = 0; k < 3; k++) fuera = Math.max(fuera, lo[k] - c[k], c[k] - hi[k]);
      if (fuera < SALTO) continue;

      const a = rumbo(c[0], c[1], c[2]);
      const v = rumbo(suma[0] / n, suma[1] / n, suma[2] / n);
      if (a[0] * v[0] + a[1] * v[1] + a[2] * v[2] > MISMO_COLOR) continue;

      marca[y * ancho + x] = 1;
    }
  }

  const cajas = manchas(marca, ancho, alto).filter(
    (m) => m.x1 - m.x0 + 1 <= LADO && m.y1 - m.y0 + 1 <= LADO && esPlana(m, color),
  );
  return { ancho, alto, cromaticas: cajas.length, cajas };
}

/** De un solo color, como el bloque que vuelve mal. El antialias tiene degradé. */
function esPlana(m, color) {
  const c0 = color(m.x0, m.y0);
  for (let y = m.y0; y <= m.y1; y++) {
    for (let x = m.x0; x <= m.x1; x++) {
      const q = color(x, y);
      if (Math.abs(q[0] - c0[0]) > 14 || Math.abs(q[1] - c0[1]) > 14 || Math.abs(q[2] - c0[2]) > 14) {
        return false;
      }
    }
  }
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  /* La banda importa y no es un detalle: la de la mesa (0,27–0,72) salta la
     barra de arriba y la mano, que son las dos zonas con blanco dibujado a
     propósito. El mapa necesita empezar más arriba —su basura cae en y=376—,
     y con la banda de la mesa daba 0 justo en la pantalla donde el bug se vio
     primero. */
  const i = args.indexOf("--banda");
  const banda = i >= 0 ? args[i + 1].split(",").map(Number) : undefined;
  /* `i + 1` sólo tapa un argumento si `--banda` está: sin él `i` vale −1 y
     `i + 1` es 0, que es el primer archivo. */
  const fotos = args.filter((a, k) => !a.startsWith("--") && !(i >= 0 && k === i + 1));
  if (!fotos.length) {
    console.log("Uso: node herramientas/bloques.mjs foto.png [otra.png ...] [--banda 0.2,0.72]");
    console.log("     la banda va en fracción del alto; sin ella, 0,27–0,72 (la mesa).\n");
    process.exit(1);
  }
  for (const f of fotos) {
    const r = await bloquesDe(f, banda);
    const c = await cromaticasDe(f, banda);
    console.log(
      `${path.basename(f).padEnd(30)} ${r.ancho}x${r.alto}  ` +
        `${String(r.bloques).padStart(4)} bloques · ${String(c.cromaticas).padStart(4)} cromáticas` +
        `  (de ${r.chicas} manchas chicas)`,
    );
  }
  /* LOS DOS NÚMEROS NO SE SUMAN, y por eso se imprimen separados: son dos
     mecanismos distintos —un bloque de compresión que vuelve mal y un píxel
     CSS de color imposible— y un total los taparía a los dos. */
  console.log("\nLas dos son basura de la GPU, no del dibujo, y son DISTINTAS:");
  console.log("  bloques    4×4 grises y planos, en la grilla de compresión (5/9/2026)");
  console.log("  cromáticas 1 px CSS de un color que su vecindario no puede explicar (7/9/2026)");
  console.log("Sirven para comparar un antes con un después de la MISMA pantalla.\n");
}
