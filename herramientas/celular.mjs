/**
 * Mirar la app como si fuera un celular, desde la computadora.
 *
 *     npm run dev                              (en otra terminal)
 *     node herramientas/celular.mjs            → abre una ventana con forma de celular
 *     node herramientas/celular.mjs --fotos    → saca las capturas de todas las pantallas
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * La app se compila para Android, pero esperar a que exista el APK para ver si
 * una pantalla quedó bien es carísimo: son minutos por vuelta. Esto abre un
 * Chromium DE VERDAD, con el tamaño, el `devicePixelRatio` y el modo táctil de
 * un celular, apuntado al servidor de desarrollo. Se toca, se juega y se ve
 * igual que en el teléfono.
 *
 * No reemplaza probarlo en el celular —la franja del reloj y el botón físico de
 * atrás no existen acá—, pero atrapa todo lo demás antes.
 *
 * Sin `--fotos` la ventana queda abierta hasta que la cerrás. Necesita un
 * escritorio: en WSL eso lo da WSLg, y se comprueba mirando `DISPLAY`.
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const RAIZ = "http://localhost:3000";
const SALIDA = path.join("capturas", "celular");

/** Un celular normal y uno apretado. El apretado es el que encuentra las fallas. */
const CELULARES = {
  normal: { width: 390, height: 844 },
  apretado: { width: 360, height: 640 },
};

/**
 * Las pantallas de la app, en el orden en que se recorren.
 *
 * `espera` es cuánto hay que darle a la pantalla antes de la foto: la mesa
 * reparte de a una carta y la gira dibuja el mapa entero.
 */
const PANTALLAS = [
  { nombre: "inicio", ruta: "/", espera: 500 },
  { nombre: "aprender", ruta: "/aprender", espera: 500 },
  { nombre: "leccion", ruta: "/aprender/la-muestra", espera: 700 },
  { nombre: "jugar", ruta: "/jugar", espera: 500 },
  { nombre: "gira", ruta: "/jugar/gira", espera: 1200 },
  { nombre: "mesa", ruta: "/jugar/mesa?depto=montevideo", espera: 4000 },
];

const sacarFotos = process.argv.includes("--fotos");

if (!sacarFotos && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
  console.error(
    "No hay escritorio (ni DISPLAY ni WAYLAND_DISPLAY).\n" +
      "En WSL eso lo da WSLg. Con --fotos anda igual, porque no abre ventana.",
  );
  process.exit(1);
}

const { width, height } = CELULARES.normal;

const nav = await chromium.launch({
  headless: sacarFotos,
  // La ventana un poco más alta que el celular: lo de más es la barra del
  // navegador, que no es parte de la app.
  args: sacarFotos ? [] : [`--window-size=${width},${height + 120}`],
});

async function contexto(tamano) {
  return nav.newContext({
    viewport: tamano,
    // Lo que hace que sea un celular y no una ventana angosta: el táctil, el
    // `devicePixelRatio` y que se anuncie como móvil. Sin esto, las reglas de
    // `@media (hover: hover)` del mapa se activan y no se ve lo que se ve allá.
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
}

if (!sacarFotos) {
  const ctx = await contexto(CELULARES.normal);
  const pag = await ctx.newPage();
  await pag.goto(RAIZ, { waitUntil: "domcontentloaded" });
  console.log(`Ventana de celular abierta en ${width}×${height}, sobre ${RAIZ}.`);
  console.log("Cerrala cuando termines.");
  await pag.waitForEvent("close", { timeout: 0 });
  await nav.close();
  process.exit(0);
}

await mkdir(SALIDA, { recursive: true });

for (const [nombreTamano, tamano] of Object.entries(CELULARES)) {
  const ctx = await contexto(tamano);
  const pag = await ctx.newPage();
  for (const p of PANTALLAS) {
    await pag.goto(`${RAIZ}${p.ruta}`, { waitUntil: "domcontentloaded" });
    // El aviso de errores de Next tapa media pantalla en desarrollo.
    await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await pag.waitForTimeout(p.espera);
    const archivo = path.join(SALIDA, `${p.nombre}-${nombreTamano}.png`);
    await pag.screenshot({ path: archivo });
    const scroll = await pag.evaluate(() => ({
      alto: document.documentElement.scrollHeight,
      visible: document.documentElement.clientHeight,
    }));
    const sobra = scroll.alto - scroll.visible;
    console.log(
      `${archivo}${sobra > 1 ? `   (scrollea ${sobra}px)` : "   (entra entera)"}`,
    );
  }
  await ctx.close();
}

await nav.close();
