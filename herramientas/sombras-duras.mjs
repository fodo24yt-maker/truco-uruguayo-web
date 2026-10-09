/**
 * Una sombra desenfocada, rehecha SIN desenfoque: capas de `box-shadow` con
 * radio 0 que siguen el mismo perfil.
 *
 *     node herramientas/sombras-duras.mjs              imprime las sombras de la mesa
 *     node herramientas/sombras-duras.mjs --escribir   las que usa la app, a `app/globals.css`
 *
 * ── Por qué (8/10/2026) ───────────────────────────────────────────────────
 *
 * En el Redmi 13C (Mali-G52, Vulkan) la basura de 4×4 de la mesa baja ~15
 * veces si se sacan los desenfoques de la escena (rama B0, `Historial.md`
 * 8/10). Un `box-shadow` con radio de desenfoque mayor que 0 no es "gratis",
 * como se creía desde el 2/9. Skia lo dibuja con una máscara desenfocada, en
 * texturas auxiliares, igual que un `filter`, y eso es lo que el driver
 * maneja mal.
 *
 * Una capa con radio 0 es un rectángulo redondeado relleno: no pide ninguna
 * textura auxiliar.
 *
 * ── La cuenta ─────────────────────────────────────────────────────────────
 *
 * El borde de una sombra desenfocada cae como `A·Φ(-d/σ)`:
 *
 *   · `d` es la distancia hacia afuera desde el borde que tendría sin
 *     desenfoque;
 *   · `σ` es la mitad del radio CSS;
 *   · `Φ` es la normal acumulada.
 *
 * Se ponen capas cada `paso` px de spread, desde 2σ afuera hasta 1,6σ
 * adentro. Un punto a distancia `d` lo tapan todas las capas que llegan hasta
 * él, así que su opacidad es `1 − Π(1 − aₖ)` sobre esas capas. Se resuelve de
 * afuera hacia adentro para que cada franja tenga la opacidad del perfil en
 * su centro.
 *
 * Medido contra el original en la mesa, en la compu a DPR 2: la diferencia
 * media es ~0,5 sobre 255 en la mano y en el mazo (ver la calibración abajo).
 */

/** La normal acumulada (Abramowitz–Stegun 7.1.26, error < 1,5e-7). */
function phi(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + (z >= 0 ? erf : -erf));
}

const redondo = (n) => +n.toFixed(2);

/* Medido en Chromium a DPR 2, dibujando la sombra corrida 300 px para que el
   elemento no la tape y leyendo el borde píxel por píxel (8/10/2026): el
   perfil es gaussiano con σ = radio × 0,485, no × 0,5 como dice la norma
   (error < 2/255 con radios de 6 a 18). */
const FACTOR_SIGMA = 0.485;
/* Cada cuánto va una capa (px CSS) y cuánto se corre el perfil. Calibrado
   en la MESA DE VERDAD (8/10/2026), contra la sombra original y barriendo
   σ × {0,47 · 0,485 · 0,5}, paso {0,75 · 1 · 1,5} y corrimiento {−0,25 · 0 ·
   0,25}: todas quedan en ~0,5/255 de diferencia media, y gana paso 1,5.
   **Más fino es PEOR**, aunque parezca lo contrario: cada capa suma su
   borde con antialias, y con 70 capas se acumula un filo oscuro.

   Lo que NO se puede igualar: con spread negativo, las capas de adentro
   tienen el radio en 0 (la norma lo calcula como radio + spread, con piso
   en 0), y en las esquinas queda un pliegue en diagonal (hasta ~30/255, en
   pocos píxeles). Un pseudo-elemento con degradés no tiene ese problema, pero
   no acompaña a la carta cuando se da vuelta (el giro lo hace el `<svg>`, que
   no admite `::before`). */
const PASO = 1.5;
const CORRIMIENTO = 0.25;

/**
 * Las capas de una sombra `x y radio spread rgba(r,g,b,A)`.
 * @returns una lista de sombras CSS, la de más afuera primero
 */
export function sinDesenfoque({ x = 0, y = 0, radio, spread = 0, r = 0, g = 0, b = 0, a: A, inset = false, paso = PASO, corrimiento = CORRIMIENTO, factor = FACTOR_SIGMA }) {
  const pre = inset ? "inset " : "";
  const sigma = radio * factor;
  if (!sigma) return [`${pre}${x}px ${y}px 0 ${spread}px rgba(${r},${g},${b},${A})`];
  const capas = [];
  let resto = 1; // Π(1 − a) de las capas ya puestas, que son las de más afuera
  for (let d = 2 * sigma; d > -1.6 * sigma; d -= paso) {
    const objetivo = A * phi(-(d - paso / 2 + corrimiento) / sigma);
    const a = Math.max(0, 1 - (1 - objetivo) / resto);
    resto *= 1 - a;
    if (a > 0.004) capas.push(`${pre}${x}px ${y}px 0 ${redondo(spread + d)}px rgba(${r},${g},${b},${a.toFixed(3)})`);
  }
  return capas;
}

/* Las sombras desenfocadas que había en la mesa el 8/10/2026, con su origen.
   Cada una se rehace con las mismas cifras. */
const NEGRO = { r: 0, g: 0, b: 0 };
export const SOMBRAS_MESA = {
  /* `shadow-lg shadow-black/50` de `Carta.tsx` (Tailwind 4: 0 10px 15px -3px
     y 0 4px 6px -4px, con el color de la sombra al 50%). */
  carta: [
    ...sinDesenfoque({ y: 10, radio: 15, spread: -3, ...NEGRO, a: 0.5 }),
    ...sinDesenfoque({ y: 4, radio: 6, spread: -4, ...NEGRO, a: 0.5 }),
  ],
  /* `SOMBRA_EN_MANO` de `app/jugar/mesa/page.tsx`. */
  mano: [
    ...sinDesenfoque({ y: 10, radio: 12, spread: -3, ...NEGRO, a: 0.75 }),
    ...sinDesenfoque({ y: 4, radio: 8, spread: -4, ...NEGRO, a: 0.6 }),
  ],
  /* `.halo-pieza` de `globals.css`: el filo dorado (ya era duro) y el brillo. */
  halo: [
    "0 0 0 2px var(--color-dorado)",
    ...sinDesenfoque({ radio: 18, spread: -2, r: 201, g: 146, b: 46, a: 0.85 }),
  ],
  /* La sombra de la baza (`.anim-sombra`, `page.tsx`). */
  baza: sinDesenfoque({ radio: 7, spread: 2, ...NEGRO, a: 0.55 }),
  /* El aro del medallón del rival (`Medallon.tsx`): dos filos duros y la sombra. */
  medallon: [
    "0 0 0 2px var(--color-dorado)",
    "0 0 0 3.5px rgba(0,0,0,0.65)",
    ...sinDesenfoque({ y: 6, radio: 14, spread: -3, ...NEGRO, a: 0.9 }),
  ],
  /* Los globos del diálogo (`shadow-lg shadow-black/60`, `Dialogo.tsx`). */
  globo: [
    ...sinDesenfoque({ y: 10, radio: 15, spread: -3, ...NEGRO, a: 0.6 }),
    ...sinDesenfoque({ y: 4, radio: 6, spread: -4, ...NEGRO, a: 0.6 }),
  ],
  /* Los botones de canto sueltos sobre la madera (`page.tsx`), con su filo claro. */
  canto: [
    ...sinDesenfoque({ y: 3, radio: 10, spread: -1, ...NEGRO, a: 0.85 }),
    "inset 0 1px 0 rgba(255,255,255,0.28)",
  ],
};

// ── Escribirlas en `app/globals.css` ──────────────────────────────────────

/* Las que ya usa la app, como variables de CSS. Se escriben entre dos marcas
   de `globals.css` y no se editan a mano: igual que las texturas de la mesa,
   si hay que cambiar una sombra se cambia acá y se vuelve a correr. */
export const EN_USO = ["mano", "carta", "halo", "baza", "medallon", "globo", "canto"];
const DESDE = "/* ── generado por `node herramientas/sombras-duras.mjs --escribir`: no editar a mano ── */";
const HASTA = "/* ── fin de lo generado por sombras-duras.mjs ── */";

export function bloqueCss() {
  const vars = EN_USO.map((n) => `  --sombra-${n}:\n    ${SOMBRAS_MESA[n].join(",\n    ")};`);
  return `${DESDE}\n:root {\n${vars.join("\n")}\n}\n${HASTA}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--escribir")) {
    const { readFileSync, writeFileSync } = await import("node:fs");
    const ruta = new URL("../app/globals.css", import.meta.url);
    const css = readFileSync(ruta, "utf8");
    const i = css.indexOf(DESDE), j = css.indexOf(HASTA);
    if (i === -1 || j === -1) {
      console.error(`No encuentro las marcas en app/globals.css. Tienen que estar las dos:\n  ${DESDE}\n  ${HASTA}`);
      process.exit(1);
    }
    writeFileSync(ruta, css.slice(0, i) + bloqueCss() + css.slice(j + HASTA.length));
    console.log(`✓ app/globals.css: ${EN_USO.map((n) => `--sombra-${n} (${SOMBRAS_MESA[n].length} capas)`).join(", ")}`);
  } else {
    for (const [nombre, capas] of Object.entries(SOMBRAS_MESA)) {
      console.log(`/* ${nombre}: ${capas.length} capas */\n${capas.join(",\n")};\n`);
    }
  }
}
