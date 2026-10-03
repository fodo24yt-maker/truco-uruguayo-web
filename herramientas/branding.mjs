/**
 * Las capturas para la ficha de Play Store, en dos tandas y tres aparatos.
 *
 *     npm run dev                        (en otra terminal)
 *     node herramientas/branding.mjs
 *     node herramientas/branding.mjs --solo celular
 *
 * Deja todo en `app branding/capturas/`, que NO sube a GitHub. El ícono de 512
 * y el gráfico destacado NO salen de acá: los hornea
 * `generar-icono.mjs --tienda`, para que el logo esté dibujado en un solo lugar.
 *
 * ── Por qué 360x640 y no 390x844, que es el celular de `celular.mjs` ──────
 *
 * Porque Play rechaza una captura cuyo lado mayor pase del DOBLE del menor.
 * 390x844 a DPR 3 da 1170x2532, o sea 2,16 veces: rebotada. 360x640 a DPR 3 da
 * 1080x1920, que es 9:16 clavado y la medida con la que están hechas casi todas
 * las fichas de la tienda. Es el mismo tamaño que `celular.mjs` llama
 * `apretado`, o sea el más exigente de los dos: si la app entra ahí, entra.
 *
 * ── Por qué `isMobile` y `hasTouch` ──────────────────────────────────────
 *
 * Copiado de `celular.mjs`, y por el mismo motivo: sin eso se activan las
 * reglas `@media (hover: hover)` del mapa de la gira y la captura no muestra lo
 * que se ve en un teléfono de verdad.
 *
 * ── Por qué las compuestas se arman SOBRE LA PROPIA PÁGINA ───────────────
 *
 * Se abre el sitio, se le reemplaza el `<body>` por el armado de la slide y se
 * fotografía eso. La alternativa era un HTML suelto con los colores y las
 * tipografías copiados a mano, y eso es tener una segunda paleta que se va
 * separando de la primera. Así el titular sale con la `--font-display` de
 * verdad y los `--color-*` de verdad, porque son los que esa página ya cargó.
 *
 * Las variables de fuente viven en el `<html>` (`app/layout.tsx:124`), no en el
 * `<body>`: por eso se puede vaciar el body entero sin perderlas.
 *
 * ── Las dos tandas ───────────────────────────────────────────────────────
 *
 * `limpias/` es la pantalla tal cual, y `compuestas/` es esa misma captura
 * adentro de un aparato dibujado, sobre la madera y con un titular. Se generan
 * las dos porque son decisiones distintas: la limpia es más honesta, la
 * compuesta es la que compite en la tienda. Se elige mirándolas, no acá.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const RAIZ = process.env.SITIO ?? "http://localhost:3000";

/* La salida se ancla AL ARCHIVO y no al directorio desde el que se corre.

   Con una ruta relativa, correr esto parado en `herramientas/` escribía las 48
   capturas en `herramientas/app branding/`, o sea FUERA de la carpeta que el
   `.gitignore` protege con `/app branding/`. Hoy no se filtraban igual porque
   la regla vieja `capturas/` —sin barra inicial, o sea a cualquier nivel— las
   tapaba de rebote; pero eso es que la protección real no era la que el
   comentario del `.gitignore` dice que es, y una protección que funciona por
   casualidad se cae el día que alguien renombre la carpeta.

   `generar-icono.mjs` ya lo hace así para `android/` y para `app branding/`.
   El patrón se copia, no se reinventa. */
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SALIDA = path.join(AQUI, "..", "app branding", "capturas");

/**
 * Los tres aparatos de la ficha, con el DPR elegido para que el PNG salga con
 * la medida final sin reescalar después. Reescalar una captura de interfaz la
 * ensucia, que es justo lo que este proyecto pasó meses midiendo.
 */
const APARATOS = {
  celular: { ancho: 360, alto: 640, dpr: 3, radio: 34, marco: 11 },
  "tablet-7": { ancho: 600, alto: 960, dpr: 2, radio: 26, marco: 10 },
  "tablet-10": { ancho: 800, alto: 1280, dpr: 2, radio: 22, marco: 9 },
};

/**
 * Las ocho slides, en orden. Ocho es el máximo que acepta Play, y el orden
 * importa: en la ficha se ven las dos primeras sin deslizar, así que adelante
 * va jugar y no aprender.
 *
 * `espera` sale de `celular.mjs`: la mesa reparte de a una carta y la gira
 * dibuja los 19 departamentos. La mesa lleva más que allá a propósito, para
 * que la foto caiga con la mano ya repartida y no a mitad del reparto.
 *
 * `accion` son los toques que se dan ANTES de la foto, cuando la pantalla
 * quieta no se muestra sola. Son dos casos y los dos por lo mismo: la pantalla
 * recién estrenada está VACÍA, y una captura de tienda de una pantalla vacía no
 * enseña la función que la slide promete.
 *
 * El mapa de la gira: sin nada elegido reserva
 * la franja de la ficha y la deja vacía —correcto en la app, porque así el
 * mapa no se mueve al elegir— pero en una captura es medio pantallazo negro.
 * Tocando Montevideo aparece la ficha del rival, que es justo lo que la slide
 * promete. Se toca por `aria-label`, que es el agarre que el mapa ya expone
 * (`components/mapa/Territorio.tsx:74`), y no por una clase de estilo.
 *
 * El anotador: recién abierto está 0 a 0, o sea una hoja en blanco. Con unos
 * toques aparecen los palitos de a cinco y el corte de las malas a las buenas,
 * que es lo único que esa pantalla tiene para mostrar.
 *
 * Se toca SIEMPRE por `aria-label` y nunca por una clase de Tailwind: la clase
 * cambia cuando alguien reacomoda el estilo y el agarre se rompe en silencio;
 * el `aria-label` es texto que existe para ser leído y no se toca por gusto.
 */
const SLIDES = [
  { nombre: "mesa-montevideo", ruta: "/jugar/mesa?depto=montevideo", espera: 5200,
    titular: "Jugá al truco uruguayo de verdad" },
  { nombre: "gira", ruta: "/jugar/gira", espera: 1600,
    titular: "19 rivales, uno por departamento",
    accion: { toques: [{ sel: '[aria-label^="Paso 1:"]', veces: 1 }], despues: 900 } },
  { nombre: "leccion-muestra", ruta: "/aprender/la-muestra", espera: 900,
    titular: "La muestra y las piezas, que ninguna guía argentina te enseña" },
  { nombre: "mesa-rocha", ruta: "/jugar/mesa?depto=rocha", espera: 5200,
    titular: "Cada departamento, su lugar" },
  { nombre: "aprender", ruta: "/aprender", espera: 700,
    titular: "8 lecciones, de la baraja a la tabla de puntos" },
  { nombre: "anotador", ruta: "/anotador", espera: 700,
    titular: "El anotador a palitos, para cuando jugás con cartas de verdad",
    /* 8 y 5: pasan las malas —que son los primeros 15— en un lado y no en el
       otro, así se ve el corte, que es lo que distingue este anotador de una
       tablita cualquiera. */
    accion: { toques: [
      { sel: '[aria-label="Sumarle un punto a Nosotros"]', veces: 8 },
      { sel: '[aria-label="Sumarle un punto a Ellos"]', veces: 5 },
    ], despues: 600 } },
  { nombre: "jugar", ruta: "/jugar", espera: 700,
    titular: "Elegí contra quién" },
  { nombre: "portada", ruta: "/", espera: 700,
    titular: "Gratis, sin registro y sin conexión" },
];

/** El armado de la slide compuesta, tal como se le inyecta a la página. */
function slideHTML({ titular, imagen, radio, marco }) {
  return `
<div style="position:fixed;inset:0;display:flex;flex-direction:column;
            align-items:center;justify-content:flex-start;overflow:hidden"
     class="madera vetas-madera">
  <!-- El resplandor de arriba: es el mismo recurso con el que la portada
       despega la marca del fondo. Un degradé, NO un filtro. -->
  <div style="position:absolute;inset:0;background:
       radial-gradient(ellipse 90% 42% at 50% 4%, rgba(201,146,46,0.20), transparent 70%)"></div>

  <h2 style="position:relative;margin:0;padding:5.2% 7% 0;text-align:center;
             font-family:var(--font-display);color:var(--color-crema);
             font-size:5.6vw;line-height:1.18;
             text-shadow:0 2px 10px rgba(0,0,0,0.75)">${titular}</h2>

  <!-- La franja dorada corta el titular del aparato. Es el mismo filete que
       el pie del sitio y la barra de la mesa. -->
  <div style="position:relative;width:22%;height:3px;margin:3.4% 0 0;
              background:linear-gradient(90deg,transparent,var(--color-dorado),transparent)"></div>

  <!-- El aparato: un marco oscuro con la captura adentro. -->
  <div style="position:relative;margin-top:4.6%;flex:1;min-height:0;padding-bottom:5%;
              display:flex;align-items:flex-start;justify-content:center;width:100%">
    <div style="height:100%;box-sizing:border-box;padding:${marco}px;border-radius:${radio}px;
                background:linear-gradient(160deg,#2a2018,#120d09 60%,#241a12);
                box-shadow:0 ${marco}px ${marco * 3}px rgba(0,0,0,0.6),
                           inset 0 0 0 1px rgba(242,230,208,0.10)">
      <img src="${imagen}" alt=""
           style="display:block;height:100%;width:auto;border-radius:${radio - marco}px"/>
    </div>
  </div>
</div>`;
}

const soloIndice = process.argv.indexOf("--solo");
const soloAparato = soloIndice > -1 ? process.argv[soloIndice + 1] : null;
/* `Object.hasOwn` y NO `!APARATOS[x]`: con el acceso pelado, `--solo
   constructor` encuentra una función en la cadena de prototipos, pasa la
   validación y después no hace nada, en silencio. Es el mismo agujero que
   `lib/progreso.ts` y `lib/sonido.ts` ya taparon, y ahí está escrito que el
   patrón se copia. Acá no era explotable —el argumento nunca arma una ruta—
   pero un validador que da verde a lo que no conoce no es un validador. */
if (soloAparato && !Object.hasOwn(APARATOS, soloAparato)) {
  console.error(`No conozco el aparato "${soloAparato}". Van: ${Object.keys(APARATOS).join(", ")}`);
  process.exit(1);
}

/**
 * Lo que NO se fotografía, y por qué cada uno.
 *
 * · `nextjs-portal` es el aviso de errores de Next, que en desarrollo tapa
 *   media pantalla. Sale de `celular.mjs`.
 *
 * Hasta el 2/10/2026 se escondía también `[data-anuncio]`, el hueco reservado
 * del banner. Ese día los banners se sacaron de la app y la regla se borró,
 * como decía este mismo comentario: las capturas vuelven a mostrar
 * exactamente lo que hay en la app.
 */
const OCULTAR = `
  nextjs-portal { display: none !important; }
`;

const nav = await chromium.launch();
let hechas = 0;
const avisos = [];

for (const [nombreAparato, a] of Object.entries(APARATOS)) {
  if (soloAparato && nombreAparato !== soloAparato) continue;

  const ctx = await nav.newContext({
    viewport: { width: a.ancho, height: a.alto },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: a.dpr,
  });
  const pag = await ctx.newPage();

  const dirLimpias = path.join(SALIDA, "limpias", nombreAparato);
  const dirCompuestas = path.join(SALIDA, "compuestas", nombreAparato);
  await mkdir(dirLimpias, { recursive: true });
  await mkdir(dirCompuestas, { recursive: true });

  console.log(`\n${nombreAparato}  (${a.ancho * a.dpr}x${a.alto * a.dpr})`);

  for (const [i, s] of SLIDES.entries()) {
    const numero = String(i + 1).padStart(2, "0");

    /* ── 1. La limpia ──────────────────────────────────────────────────── */
    await pag.goto(`${RAIZ}${s.ruta}`, { waitUntil: "domcontentloaded" });
    // El aviso de errores de Next tapa media pantalla en desarrollo, y en una
    // captura de tienda eso es fatal: se publica sin que nadie lo mire.
    await pag.addStyleTag({ content: OCULTAR });
    await pag.waitForTimeout(s.espera);

    if (s.accion) {
      for (const t of s.accion.toques) {
        for (let n = 0; n < t.veces; n++) {
          await pag.click(t.sel);
          await pag.waitForTimeout(90);
        }
      }
      await pag.waitForTimeout(s.accion.despues);
    }

    const limpia = await pag.screenshot();
    const archivoLimpia = path.join(dirLimpias, `${numero}-${s.nombre}.png`);
    await writeFile(archivoLimpia, limpia);

    /* Si la pantalla scrollea, la captura muestra sólo la primera pantallada y
       eso en la tienda se ve como una página cortada. Se avisa, no se falla:
       en `/aprender` y en las lecciones es correcto que scrollee. */
    const sobra = await pag.evaluate(() => {
      const d = document.documentElement;
      return d.scrollHeight - d.clientHeight;
    });

    /* ── 2. La compuesta, sobre esta misma página ──────────────────────── */
    const imagen = `data:image/png;base64,${limpia.toString("base64")}`;
    await pag.evaluate(
      ({ html }) => {
        document.body.className = "";
        document.body.setAttribute("style", "margin:0;padding:0;overflow:hidden");
        document.body.innerHTML = html;
      },
      { html: slideHTML({ titular: s.titular, imagen, radio: a.radio, marco: a.marco }) },
    );
    // Sin esto la foto puede salir con el hueco de la imagen todavía vacío.
    await pag.waitForFunction(() => [...document.images].every((im) => im.complete));
    await pag.waitForTimeout(150);

    const archivoCompuesta = path.join(dirCompuestas, `${numero}-${s.nombre}.png`);
    await pag.screenshot({ path: archivoCompuesta });

    hechas += 2;
    const nota = sobra > 1 ? `  (scrollea ${sobra}px)` : "";
    if (sobra > 1) avisos.push(`${nombreAparato}/${numero}-${s.nombre}: scrollea ${sobra}px`);
    console.log(`  ${numero}-${s.nombre}`.padEnd(26) + `limpia + compuesta${nota}`);
  }

  await ctx.close();
}

await nav.close();

console.log(`\n${hechas} capturas en "${SALIDA}"`);
if (avisos.length) {
  console.log("\nPantallas que scrollean (la captura muestra sólo lo de arriba):");
  for (const a of avisos) console.log(`  · ${a}`);
  console.log("En aprender y en las lecciones eso es normal: son texto.");
}
console.log("\nNada de esto sube a GitHub: 'app branding/' está en el .gitignore.");
