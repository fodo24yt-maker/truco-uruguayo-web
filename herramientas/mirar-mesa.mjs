/**
 * Mira la mesa de verdad y verifica LA regla: no scrollea nunca, la barra de
 * cantos nunca tapa tu mano, y adentro de la mano no hay ni un filtro.
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
        /* ── NINGÚN FILTRO ADENTRO DE LA MANO ──────────────────────────────
           Cuando no es tu turno la mano se apaga con `opacity`, y eso obliga al
           navegador a componer todo ese subárbol en una superficie aparte. Un
           `filter` adentro es una segunda superficie anidada, y ahí es donde
           las GPU de teléfono devuelven basura: el bug del 1/9/2026 era una
           banda de rayas del tamaño exacto de la mano, siempre con una sola
           carta —que es cuando el dibujo queda destapado y se ve—.

           Esto NO reproduce el glitch: Chromium acá usa SwiftShader y dibuja
           todo bien. Lo que hace es cuidar la condición que lo causaba, que es
           lo único comprobable desde una computadora. Un `drop-shadow` o un
           `feGaussianBlur` que vuelva a colarse en la mano falla acá y no en el
           teléfono de alguien. */
        filtros: (() => {
          const zona = document.querySelector('[data-mano="apagable"]');
          if (!zona) return null;
          const con = [];
          for (const el of [zona, ...zona.querySelectorAll("*")]) {
            const f = getComputedStyle(el).filter;
            if (f && f !== "none") con.push(`${el.tagName.toLowerCase()}: ${f}`);
          }
          if (zona.querySelector("filter")) con.push("hay un <filter> declarado");
          return con;
        })(),
      }));
      const scroll = m.doc > m.vis || m.body > m.vis;
      const tapada = m.mano && m.barra !== null && m.mano.abajo > m.barra + 1;
      const conFiltro = m.filtros !== null && m.filtros.length > 0;
      if (scroll || tapada || conFiltro) {
        fallos++;
        console.log(`FALLA ${w}x${h} [${etiqueta}] scroll=${scroll} manoTapada=${tapada} ` +
          `filtroEnLaMano=${conFiltro} ` +
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
    ? "\nTODO OK: la mesa no scrollea, la barra nunca tapa la mano y no hay filtros adentro de la mano."
    : `\n${fallos} FALLAS`,
);
process.exit(fallos === 0 ? 0 : 1);
