/**
 * El contador de motas: cuánta basura de dibujo hay en una pantalla.
 *
 *     node herramientas/motas.mjs foto.png [otra.png ...]
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * El 4/9/2026 Santiago mandó capturas del celular con manchitas claras sueltas
 * por toda la mesa. Mirándolas se sacaron dos conclusiones seguidas y las dos
 * estaban mal, porque "se ve sucio" no es un dato: es una impresión. Este
 * archivo convierte la impresión en un número, y por eso se puede comparar un
 * antes con un después en vez de discutir sobre dos fotos.
 *
 * ── Las dos formas de contar, y por qué hacen falta las dos ───────────────
 *
 * **Motas** (una sola foto). Una mota es una manchita clara SUELTA: una
 * componente conexa de píxeles claros de 12 píxeles o menos. El texto, las
 * cartas y los objetos son componentes grandes; la basura de rasterizado son
 * puntitos. Sirve para cualquier imagen suelta, incluso una que ya nos pasaron.
 *
 * Su límite: **no distingue basura de un detalle chiquito del diseño.** Una
 * estrellita de 4 píxeles cuenta como mota. Por eso el número sirve para
 * COMPARAR dos fotos de la misma pantalla, no como verdad absoluta.
 *
 * **Movimiento** (dos o más fotos de la MISMA pantalla quieta). Acá no hace
 * falta saber nada del diseño: en una pantalla quieta, todo píxel que cambia
 * entre dos fotos es basura, y punto. Es el detector honesto, el que no se
 * puede engañar solo, y es el que decide.
 *
 * Como la mesa igual tiene animaciones vivas —el rival respira, las hormigas
 * marchan—, lo que cambia se agrupa en componentes: una animación de verdad da
 * UNA mancha grande y continua; la basura da muchos puntitos desparramados.
 * Por eso se informan las dos cosas por separado.
 */

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

/* Claro = por encima de este brillo. La mesa es madera oscura y el pergamino
   del mapa es sepia: en las dos, la basura sale más clara que el fondo. */
const CLARO = 145;
/* Una componente conexa de hasta este tamaño es una mota. Doce píxeles es una
   manchita de 3x4: más grande que eso ya es algo dibujado a propósito. */
const MOTA = 12;
/* Dos fotos del mismo píxel nunca dan EXACTAMENTE lo mismo (el propio
   compresor del teléfono mueve un poco los valores). Por debajo de esto es
   ruido de captura y no cuenta como cambio. */
const RUIDO = 24;

export async function leer(ruta) {
  const { data, info } = await sharp(ruta).raw().toBuffer({ resolveWithObject: true });
  return { data, ancho: info.width, alto: info.height, canales: info.channels };
}

const brillo = (d, i, c) => 0.299 * d[i * c] + 0.587 * d[i * c + 1] + 0.114 * d[i * c + 2];

/**
 * Agrupa los píxeles marcados en manchas conexas (8 vecinos).
 * Devuelve el tamaño y la caja de cada una.
 */
export function manchas(marca, ancho, alto) {
  const visto = new Uint8Array(ancho * alto);
  const salida = [];
  for (let s = 0; s < ancho * alto; s++) {
    if (!marca[s] || visto[s]) continue;
    visto[s] = 1;
    const pila = [s];
    let n = 0, x0 = ancho, y0 = alto, x1 = 0, y1 = 0;
    while (pila.length) {
      const p = pila.pop();
      const px = p % ancho, py = (p / ancho) | 0;
      n++;
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;
        const q = ny * ancho + nx;
        if (marca[q] && !visto[q]) { visto[q] = 1; pila.push(q); }
      }
    }
    salida.push({ n, x0, y0, x1, y1 });
  }
  return salida;
}

/** Motas de UNA foto, opcionalmente sólo en una banda vertical (0..1). */
export async function motasDe(ruta, banda = [0, 1]) {
  const { data, ancho, alto, canales } = await leer(ruta);
  const marca = new Uint8Array(ancho * alto);
  const y0 = Math.round(alto * banda[0]), y1 = Math.round(alto * banda[1]);
  for (let y = y0; y < y1; y++) for (let x = 0; x < ancho; x++) {
    const s = y * ancho + x;
    if (brillo(data, s, canales) > CLARO) marca[s] = 1;
  }
  const todas = manchas(marca, ancho, alto);
  const motas = todas.filter((m) => m.n <= MOTA);
  return { ancho, alto, motas: motas.length, pxMotas: motas.reduce((s, m) => s + m.n, 0), manchasGrandes: todas.length - motas.length };
}

/**
 * Lo que se MUEVE entre dos fotos de la misma pantalla quieta.
 * Todo lo que cambia es basura o animación; se separan por tamaño.
 */
export async function movimiento(rutaA, rutaB) {
  const a = await leer(rutaA), b = await leer(rutaB);
  if (a.ancho !== b.ancho || a.alto !== b.alto)
    throw new Error(`las dos fotos miden distinto: ${a.ancho}x${a.alto} vs ${b.ancho}x${b.alto}`);
  const { ancho, alto, canales } = a;
  const marca = new Uint8Array(ancho * alto);
  let cambiados = 0;
  for (let s = 0; s < ancho * alto; s++) {
    const d = Math.abs(brillo(a.data, s, canales) - brillo(b.data, s, a.canales));
    if (d > RUIDO) { marca[s] = 1; cambiados++; }
  }
  const todas = manchas(marca, ancho, alto);
  const motas = todas.filter((m) => m.n <= MOTA);
  const grandes = todas.filter((m) => m.n > MOTA).sort((x, y) => y.n - x.n);
  return { ancho, alto, cambiados, motas: motas.length, grandes, marca };
}

/** Deja un PNG con lo que cambió pintado de rojo sobre la foto apagada. */
export async function pintarCambios(rutaBase, marca, destino) {
  const { data, ancho, alto, canales } = await leer(rutaBase);
  const sal = Buffer.alloc(ancho * alto * 3);
  for (let s = 0; s < ancho * alto; s++) {
    if (marca[s]) { sal[s * 3] = 255; sal[s * 3 + 1] = 0; sal[s * 3 + 2] = 0; }
    else for (let c = 0; c < 3; c++) sal[s * 3 + c] = data[s * canales + c] * 0.35;
  }
  mkdirSync(path.dirname(destino), { recursive: true });
  await sharp(sal, { raw: { width: ancho, height: alto, channels: 3 } }).png().toFile(destino);
}

// ── Como programa suelto ────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const fotos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!fotos.length) {
    console.log("\n  node herramientas/motas.mjs foto.png [otra.png ...]\n");
    console.log("  Con una foto cuenta motas. Con varias de la MISMA pantalla");
    console.log("  quieta, además dice qué se movió, que es el dato que vale.\n");
    process.exit(0);
  }
  for (const f of fotos) {
    if (!existsSync(f)) { console.error(`✗ no está: ${f}`); process.exit(1); }
    const m = await motasDe(f);
    console.log(`${path.basename(f).padEnd(38)} ${m.ancho}x${m.alto}  ${String(m.motas).padStart(4)} motas (${m.pxMotas} px)`);
  }
  if (fotos.length > 1) {
    console.log("\n── lo que se movió entre foto y foto ──────────────────────");
    for (let i = 1; i < fotos.length; i++) {
      let r;
      try {
        r = await movimiento(fotos[i - 1], fotos[i]);
      } catch (e) {
        /* Comparar dos pantallas distintas no da un error de programa: da un
           resultado que no significa nada. Se dice y se sigue. */
        console.log(`  ${i}→${i + 1}: no se pueden comparar — ${e.message}`);
        continue;
      }
      const destino = path.join("capturas/motas", `cambios-${i}.png`);
      await pintarCambios(fotos[i], r.marca, destino);
      console.log(`  ${i}→${i + 1}: ${r.cambiados} px cambiados · ${r.motas} motas sueltas · ${r.grandes.length} manchas grandes`);
      for (const g of r.grandes.slice(0, 3))
        console.log(`      mancha de ${g.n} px en (${g.x0},${g.y0})-(${g.x1},${g.y1})  ← animación, casi seguro`);
      console.log(`      mapa: ${destino}`);
    }
    console.log("\n  Las MOTAS SUELTAS que se mueven son basura de dibujo: en una");
    console.log("  pantalla quieta nada chiquito tiene por qué cambiar de lugar.\n");
  }
}
