/**
 * Mira la mesa de verdad y verifica LA regla: no scrollea nunca, la barra de
 * cantos nunca tapa tu mano, y en la escena no hay ni un filtro.
 *
 *     npm run dev                       (en otra terminal)
 *     node herramientas/mirar-mesa.mjs
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────
 *
 * Los tres bugs de distribución más caros que tuvo el proyecto NO SE VEÍAN
 * LEYENDO EL CÓDIGO: la mano cortada por la barra, las cartas jugadas
 * superponiéndose con la mano, y el mazo y el mate recortados. Los tres
 * aparecieron recién al abrir la página en una ventana baja.
 *
 * El problema real nunca es la pantalla angosta sino la BAJA, y encima la barra
 * de cantos CRECE: tiene la fila de siempre, más la de la flor cuando se puede
 * cantar, más el menú de envido cuando está abierto. Cada fila le come alto a la
 * escena, justo cuando hay que poder ver las cartas para decidir.
 *
 * Así que esto reparte muchas manos hasta juntar esos estados y los revisa en
 * siete tamaños. Sale con código 1 si algo falla, y deja la captura del momento
 * exacto en la carpeta de salida.
 */
import { mkdir } from "node:fs/promises";

import { chromium } from "playwright";

const TAMANOS = [
  [390, 844], [360, 640], [360, 600], [320, 568],
  [1100, 800], [1280, 620], [1440, 900],
];
/** Dónde caen las capturas de las fallas. `capturas/` está en .gitignore. */
const SALIDA = "capturas";

await mkdir(SALIDA, { recursive: true });
const nav = await chromium.launch();
let fallos = 0;

for (const [w, h] of TAMANOS) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h } });
  const pag = await ctx.newPage();
  const visto = new Set();

  // Repartir muchas veces hasta juntar los estados raros (flor, aviso).
  for (let intento = 0; intento < 30 && visto.size < 3; intento++) {
    await pag.goto("http://localhost:3000/jugar/mesa?depto=montevideo", { waitUntil: "domcontentloaded" });
    await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await pag.waitForTimeout(1700);

    const revisar = async (etiqueta) => {
      const m = await pag.evaluate(() => ({
        doc: document.documentElement.scrollHeight,
        vis: document.documentElement.clientHeight,
        body: document.body.scrollHeight,
        // ¿La mano quedó tapada por la barra?
        mano: (() => {
          const f = document.querySelector(".mano-abanico");
          if (!f) return null;
          const r = f.getBoundingClientRect();
          return { abajo: r.bottom, arriba: r.top };
        })(),
        barra: (() => {
          const b = [...document.querySelectorAll("div")].find((d) =>
            d.className.includes?.("filo-dorado") && d.className.includes?.("shrink-0"));
          return b ? b.getBoundingClientRect().top : null;
        })(),
        /* ── NINGÚN FILTRO EN LA ESCENA ────────────────────────────────────
           Cuando no es tu turno la mano se apaga con `opacity`, y eso obliga al
           navegador a componer todo ese subárbol en una superficie aparte. Un
           `filter` adentro es una segunda superficie anidada, y ahí es donde
           las GPU de teléfono devuelven basura: el bug del 1/9/2026 era una
           banda de rayas del tamaño exacto de la mano, siempre con una sola
           carta —que es cuando el dibujo queda destapado y se ve—.

           ── ESTO MIRABA SÓLO LA MANO, Y POR ESO EL BUG VOLVIÓ ────────────
           El 4/9/2026 Santiago fotografió píxeles blancos alrededor del mate,
           del vaso y del mazo. Era el mismo defecto una zona más afuera: el
           guard cuidaba la mano y en el resto de la escena habían quedado NUEVE
           filtros, incluido un `@keyframes` que animaba `filter: blur()` cuadro
           a cuadro. Ahora se mira la escena entera —lo apoyado en la mesa, el
           medallón con su diálogo y la mano—, que es lo que se ve moverse.

           `backdrop-filter` cuenta igual, y de hecho es peor: obliga a leer de
           vuelta todo lo que ya está dibujado detrás.

           Esto NO reproduce el glitch: Chromium acá usa SwiftShader y dibuja
           todo bien. Lo que hace es cuidar la condición que lo causaba, que es
           lo único comprobable desde una computadora. Un `drop-shadow` o un
           `feGaussianBlur` que vuelva a colarse falla acá y no en el teléfono de
           alguien.

           ── EL ÚNICO QUE QUEDA EN TODA LA MESA, Y POR QUÉ ────────────────
           `rival-foco`: un `feGaussianBlur` de σ=1,5 sobre el cuerpo del rival,
           que es lo que lo pone a un metro y fuera de foco. Ése no se puede
           cambiar por un degradé —un degradé sabe dibujar una elipse borrosa,
           no un cuerpo entero borroso— y no está en esta lista: cuelga del
           cajón del rival, debajo de la tabla, fuera de todo lo que se apaga o
           se anima, así que se rasteriza una vez y no se vuelve a tocar.

           Su hermano `rival-sombra-sola` (σ=9, con región al 180%, o sea que
           se metía 80px DENTRO de la mesa) SÍ se fue el 4/9/2026: eran dos
           elipses, y desenfocar una elipse da un degradé radial. La cuenta está
           en `Sombra.tsx` y la comparte `Escenario.tsx`.

           Si algún día sale basura ARRIBA, `rival-foco` es lo siguiente a
           mirar, y la salida sería hornear al rival como se hornea la mesa. */
        filtros: (() => {
          const ZONAS = ['[data-mesa="tabla"]', "[data-encima]", '[data-mano="apagable"]'];
          const con = [];
          let alguna = false;
          for (const sel of ZONAS) {
            const zona = document.querySelector(sel);
            if (!zona) continue;
            alguna = true;
            for (const el of [zona, ...zona.querySelectorAll("*")]) {
              const cs = getComputedStyle(el);
              if (cs.filter && cs.filter !== "none")
                con.push(`${sel} ${el.tagName.toLowerCase()}: ${cs.filter}`);
              if (cs.backdropFilter && cs.backdropFilter !== "none")
                con.push(`${sel} ${el.tagName.toLowerCase()}: backdrop ${cs.backdropFilter}`);
            }
            if (zona.querySelector("filter")) con.push(`${sel}: hay un <filter> declarado`);
          }
          return alguna ? con : null;
        })(),
      }));
      const scroll = m.doc > m.vis || m.body > m.vis;
      const tapada = m.mano && m.barra !== null && m.mano.abajo > m.barra + 1;
      const conFiltro = m.filtros !== null && m.filtros.length > 0;
      if (scroll || tapada || conFiltro) {
        fallos++;
        console.log(`FALLA ${w}x${h} [${etiqueta}] scroll=${scroll} manoTapada=${tapada} ` +
          `filtroEnLaEscena=${conFiltro} ` +
          `doc=${m.doc} vis=${m.vis} manoAbajo=${m.mano?.abajo?.toFixed(0)} barraArriba=${m.barra?.toFixed(0)}`);
        if (conFiltro) console.log(`  filtros: ${m.filtros.join(" | ")}`);
        await pag.screenshot({ path: `${SALIDA}/falla-${w}x${h}-${etiqueta}.png` });
      }
      return !scroll && !tapada && !conFiltro;
    };

    await revisar("normal");

    // ¿Salió flor? Es la fila extra más común.
    if (await pag.getByRole("button", { name: /^¡Flor!$/ }).count()) {
      if (!visto.has("flor")) { visto.add("flor"); await revisar("flor"); }
    }
    // Abrir el menú de envido: otra fila más.
    const envido = pag.getByRole("button", { name: /^Envido$/ });
    if (await envido.count()) {
      await envido.click().catch(() => {});
      await pag.waitForTimeout(250);
      if (!visto.has("menu")) { visto.add("menu"); await revisar("menu-envido"); }
      // Flor + menú abierto a la vez: el caso más alto posible.
      if (await pag.getByRole("button", { name: /^¡Flor!$/ }).count()) {
        if (!visto.has("ambas")) { visto.add("ambas"); await revisar("flor+menu"); }
      }
    }
    visto.add("normal");
  }
  console.log(`${w}x${h}: estados vistos = ${[...visto].join(", ")}`);
  await ctx.close();
}
await nav.close();
console.log(
  fallos === 0
    ? "\nTODO OK: la mesa no scrollea, la barra nunca tapa la mano y no hay ni un filtro en la escena."
    : `\n${fallos} FALLAS`,
);
process.exit(fallos === 0 ? 0 : 1);
