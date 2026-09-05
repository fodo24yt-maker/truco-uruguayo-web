/**
 * El laboratorio de las manchitas: tres diseños al lado, en la grilla de
 * píxeles del celular de verdad.
 *
 *     npm run dev                          (en otra terminal)
 *     node herramientas/laboratorio.mjs
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * El 4/9/2026, buscando en el historial QUÉ cambio de herramienta metió las
 * manchitas, apareció la respuesta y también apareció por qué nunca la vimos:
 *
 *     grep -rn "deviceScaleFactor" herramientas/*.mjs   →   0 resultados
 *
 * **Las siete herramientas miran a DPR 1 y el celular dibuja a DPR 2.** O sea
 * que jamás miramos la grilla de píxeles donde aparece el bug. Todo daba limpio
 * acá y sucio allá, y la explicación era esa.
 *
 * El cambio de herramienta es del 30/8, la sesión que se llama "Dibujar con
 * línea en vez de manchar": ese día pasamos de manchas desenfocadas a dibujo
 * con línea de tinta. Fue lo correcto para que se viera bien, y es donde
 * nacieron las motas, porque los trazos quedaron MÁS FINOS QUE UN PÍXEL:
 * una `<Carta>` de viewBox 100 dibujada a 41,8 px CSS da 0,836 px reales por
 * unidad, así que un `strokeWidth="0.7"` sale a 0,59 píxeles de verdad. Una
 * línea más fina que un píxel no se dibuja como línea: se dibuja como una
 * hilera de puntitos con la cobertura repartida. Eso es la mota.
 *
 * ── Qué hace, y qué NO hace ───────────────────────────────────────────────
 *
 * **No toca un solo archivo del proyecto.** Abre el sitio real con Playwright y
 * parchea la página EN EL NAVEGADOR, en vivo. Por eso tampoco crea una ruta en
 * `app/`: la regla de la casa lo prohíbe y encima quedaría publicada.
 *
 *   A — hoy                  el código tal cual
 *   B — herramientas de antes  gradiente CSS, sin líneas de tinta (pre 30/8)
 *   C — hoy con el trazo arreglado   ninguna línea baja de un píxel real
 *
 * ── Las dos formas de medir ───────────────────────────────────────────────
 *
 * 1. **Motas**, con `motas.mjs`, que es el mismo número que contamos sobre las
 *    fotos del celular. Sirve para comparar A contra B contra C.
 *
 * 2. **Error contra la verdad**, que es la medición honesta y no depende de
 *    ninguna definición de "mota": la misma pantalla se dibuja a DPR 6 y se
 *    achica a DPR 2 con Lanczos. Ese achicado es cómo TENDRÍA que verse el
 *    dibujo si el rasterizador tuviera resolución de sobra. Lo que se aleje de
 *    ahí es error de rasterizado, y se mide sin opinar.
 */
import { mkdir, writeFile } from "node:fs/promises";

import { chromium } from "playwright";
import sharp from "sharp";

import { motasDe } from "./motas.mjs";

/** El Redmi 13C: 720x1600 físicos, que el WebView reporta como 360x760 a DPR 2. */
const CELULAR = { ancho: 360, alto: 760 };
/** A cuánto se sobremuestrea para saber cómo TENDRÍA que verse. */
const VERDAD = 6;
const SALIDA = "capturas/laboratorio";

const PANTALLAS = [
  { clave: "menu", titulo: "¿Cómo querés jugar?", url: "/jugar", tocar: "a[href='/jugar/gira']" },
  { clave: "mapa", titulo: "El mapa de la gira", url: "/jugar/gira", tocar: ".depto" },
  { clave: "mesa", titulo: "La mesa cantando", url: "/jugar/mesa?depto=montevideo", cantar: true },
];

/* ── B: las herramientas de antes ─────────────────────────────────────────
   Reconstruido de `git show a6a3d50:app/globals.css`, que es el último estado
   antes del 30/8: la mesa era un `radial-gradient` y la perspectiva un
   `rotateX(34deg)` vivo sobre un div, con todo plano encima. No había líneas
   de tinta, así que acá se apagan los dibujos que las tienen. */
const ANTES = `
  /* La mesa y el fondo horneados son dos <img src="/escenas/...">. Se apagan
     los dos y abajo queda el gradiente, que es lo que había antes. */
  img[src*="/escenas/"] { display: none !important; }
  [data-mesa="tabla"] {
    background-color: #63401f !important;
    background-image: radial-gradient(ellipse 66% 54% at 50% 34%,
      #a97341 0%, #8a5c33 22%, #63401f 45%, #3a2411 72%, #1d1108 100%) !important;
  }
  /* Los objetos de la gira son dibujo de tinta puro: no existían antes del 30/8. */
  [data-mesa="objeto"] { display: none !important; }
`;

/* ── C: el piso de grosor ─────────────────────────────────────────────────
   Esto es EL ARREGLO que se propone, probado sin escribirlo en el código.

   No sirve `vector-effect: non-scaling-stroke` a todo: haría que un
   `strokeWidth={24}` (el halo del territorio) midiera 24 px CSS y taparía el
   mapa. Lo que hace falta es un PISO, y sólo donde el trazo no llega.

   Para cada SVG se calcula cuántos píxeles reales mide una unidad del viewBox
   —ancho en pantalla / ancho del viewBox, por el DPR— y se sube el grosor de
   los trazos que caen por debajo de MINIMO píxeles reales. El dibujo no cambia:
   cambia solamente la línea que el rasterizador no podía dibujar. */
const PISO = (minimo) => `
  const MINIMO = ${minimo};
  let tocados = 0, total = 0;
  for (const svg of document.querySelectorAll("svg")) {
    const vb = svg.viewBox?.baseVal;
    const caja = svg.getBoundingClientRect();
    if (!vb || !vb.width || !caja.width) continue;
    /* Píxeles REALES del dispositivo por cada unidad del viewBox. */
    const escala = (caja.width / vb.width) * devicePixelRatio;
    for (const el of svg.querySelectorAll("*")) {
      const w = parseFloat(getComputedStyle(el).strokeWidth);
      if (!w || !isFinite(w)) continue;
      total++;
      if (w * escala >= MINIMO) continue;
      el.style.strokeWidth = String(MINIMO / escala);
      tocados++;
    }
  }
  return { tocados, total };
`;

const VARIANTES = [
  { clave: "A", titulo: "hoy", css: null, js: null },
  {
    clave: "B",
    titulo: "herramientas de antes",
    /* ── B SÓLO EXISTE EN LA MESA ──────────────────────────────────────────
       El menú y el mapa NUNCA usaron las texturas horneadas: siempre fueron
       SVG de tinta. En esas dos pantallas no hay "herramientas de antes" a las
       que volver, así que B no se corre y eso no es una falla. Distinto es que
       un parche que SÍ corresponde no agarre nada: eso sigue fallando. */
    soloEn: ["mesa"],
    css: ANTES,
    /* Un parche que no agarra nada es un parche que MIENTE, y ya nos pasó:
       la primera corrida dio B idéntica a A hasta el byte porque los
       selectores no existían. Así que cada variante cuenta a cuántos
       elementos le pegó, y abajo se falla si a alguno le pegó a cero. */
    js: `
      const n = document.querySelectorAll('img[src*="/escenas/"], [data-mesa="objeto"]').length;
      return { tocados: n, total: n };
    `,
  },
  { clave: "C", titulo: "trazo con piso de 1,1 px", css: null, js: PISO(1.1) },
];

await mkdir(SALIDA, { recursive: true });
const nav = await chromium.launch();
let fallos = 0;

/** Deja la pantalla lista: sin el cartel de Next, y con el envido abierto. */
async function preparar(pag, pantalla) {
  await pag.goto(`http://localhost:3000${pantalla.url}`, { waitUntil: "domcontentloaded" });
  await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await pag.waitForTimeout(1800);
  if (!pantalla.cantar) return true;

  const abridor = pag.getByRole("button", { name: /^Envido$|^Subir$/ });
  if (!(await abridor.count())) return false;
  await abridor.first().click().catch(() => {});
  await pag.waitForTimeout(450);
  return true;
}

/**
 * ── LA TEORÍA DEL TOQUE ───────────────────────────────────────────────────
 *
 * El 4/9/2026 Santiago propuso que las manchitas del menú y del mapa "pueden
 * deberse a que se mueva cuando se hace click o algo así". Es una teoría
 * concreta y por lo tanto se puede medir: se toca de verdad, con un puntero
 * táctil, y se compara la geometría y el estilo de antes y de después.
 *
 * Se le cancela la navegación al click para poder mirar el estado que QUEDA
 * después del toque; si no, la página se va y no hay nada que comparar.
 *
 * Igual que el guard de los filtros de `mirar-mesa.mjs`, esto no reproduce el
 * glitch —Chromium acá dibuja con SwiftShader y sale limpio—: cuida la
 * condición. Que algo se mueva o se promueva al tocar es comprobable sin el
 * teléfono; que ensucie, no.
 */
async function queHaceElToque(pag, sel) {
  const leer = () =>
    pag.$$eval(sel, (els) =>
      els.slice(0, 6).map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          caja: [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100).join(","),
          trazo: cs.strokeWidth,
          filtro: cs.filter,
          transform: cs.transform,
          opacidad: cs.opacity,
          voluntad: cs.willChange,
        };
      }));

  const antes = await leer();
  if (!antes.length) return null;
  await pag.evaluate(() =>
    document.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); }, true));
  const caja = await pag.locator(sel).first().boundingBox();
  if (!caja) return null;
  await pag.touchscreen.tap(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await pag.waitForTimeout(600);
  const despues = await leer();

  const movidos = [], cambiados = [];
  for (let i = 0; i < antes.length; i++) {
    if (antes[i].caja !== despues[i].caja) movidos.push(`${antes[i].caja} → ${despues[i].caja}`);
    for (const k of ["trazo", "filtro", "transform", "opacidad", "voluntad"])
      if (antes[i][k] !== despues[i][k]) cambiados.push(`${k}: ${antes[i][k]} → ${despues[i][k]}`);
  }
  return { mirados: antes.length, movidos, cambiados };
}

/** Una captura, a la escala que se le pida. */
async function sacar(pantalla, variante, escala, destino) {
  const ctx = await nav.newContext({
    viewport: { width: CELULAR.ancho, height: CELULAR.alto },
    deviceScaleFactor: escala,
    /* Sin esto `(hover: hover)` da true y el navegador aplica reglas que en un
       celular NO existen: se estaría midiendo otra pantalla. */
    hasTouch: true,
    isMobile: true,
  });
  const pag = await ctx.newPage();
  let listo = false;
  /* La mano se reparte al azar: se insiste hasta que salga una con envido. */
  for (let intento = 0; intento < 25 && !listo; intento++) listo = await preparar(pag, pantalla);
  if (!listo) { await ctx.close(); return null; }

  if (variante.css) await pag.addStyleTag({ content: variante.css });
  let parche = null;
  if (variante.js) parche = await pag.evaluate(`(() => { ${variante.js} })()`);
  await pag.waitForTimeout(250);

  await pag.screenshot({ path: destino });
  await ctx.close();
  return parche ?? {};
}

/**
 * Cuánto se aleja el dibujo de como TENDRÍA que verse.
 * La referencia es la misma pantalla a DPR 6 achicada con Lanczos: ahí el
 * rasterizador tuvo 9 veces más píxeles por unidad y la línea le entró.
 */
async function errorContraLaVerdad(dpr2, dpr6) {
  const meta = await sharp(dpr2).metadata();
  const verdad = await sharp(dpr6)
    .resize(meta.width, meta.height, { kernel: "lanczos3", fit: "fill" })
    .raw().toBuffer();
  const crudo = await sharp(dpr2).raw().toBuffer();
  const canales = (await sharp(dpr2).metadata()).channels;
  let suma = 0, peor = 0, feos = 0;
  const n = meta.width * meta.height;
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(crudo[i * canales + c] - verdad[i * canales + c]));
    suma += d;
    if (d > peor) peor = d;
    if (d > 40) feos++;
  }
  return { medio: suma / n, peor, feos, porcentaje: (100 * feos) / n };
}

console.log(`\nEl laboratorio: ${CELULAR.ancho}x${CELULAR.alto} a DPR 2, que es tu Redmi 13C.`);
console.log(`La verdad se saca a DPR ${VERDAD} y se achica: así tendría que verse.\n`);

const resumen = [];

for (const pantalla of PANTALLAS) {
  console.log(`── ${pantalla.titulo} ${"─".repeat(Math.max(0, 52 - pantalla.titulo.length))}`);

  /* La referencia se saca UNA vez por pantalla, sin parche: la verdad es la
     misma para las tres variantes, porque el dibujo es el mismo. */
  const refA = `${SALIDA}/${pantalla.clave}-verdad.png`;
  const hubo = await sacar(pantalla, VARIANTES[0], VERDAD, refA);
  if (hubo === null) {
    console.log(`  esta mano no tenía envido para abrir; se saltea\n`);
    continue;
  }

  if (pantalla.tocar) {
    const ctxT = await nav.newContext({
      viewport: { width: CELULAR.ancho, height: CELULAR.alto },
      deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    });
    const pagT = await ctxT.newPage();
    await preparar(pagT, pantalla);
    const t = await queHaceElToque(pagT, pantalla.tocar);
    if (!t) console.log(`  al tocar: no se encontró "${pantalla.tocar}"`);
    else if (!t.movidos.length && !t.cambiados.length)
      console.log(`  al tocar: ${t.mirados} elemento(s) mirados, NO se movió ni cambió nada`);
    else {
      console.log(`  al tocar: ${t.movidos.length} se movieron, ${t.cambiados.length} cambiaron de estilo`);
      for (const m of t.movidos.slice(0, 3)) console.log(`     movió  ${m}`);
      for (const c of t.cambiados.slice(0, 5)) console.log(`     cambió ${c}`);
    }
    await ctxT.close();
  }

  for (const v of VARIANTES) {
    if (v.soloEn && !v.soloEn.includes(pantalla.clave)) {
      console.log(`  ${v.clave} ${v.titulo.padEnd(26)} —  no corresponde acá (esta pantalla nunca usó esas herramientas)`);
      continue;
    }
    const foto = `${SALIDA}/${pantalla.clave}-${v.clave}.png`;
    const parche = await sacar(pantalla, v, 2, foto);
    if (parche === null) { console.log(`  ${v.clave} — no se pudo preparar`); continue; }

    const m = await motasDe(foto);
    /* Sólo A y C dibujan lo mismo que la referencia; B es otro diseño y
       compararlo contra la verdad de A no querría decir nada. */
    const err = v.clave === "B" ? null : await errorContraLaVerdad(foto, refA);

    if (parche.tocados === 0) {
      console.log(`  ${v.clave} ${v.titulo.padEnd(26)} EL PARCHE NO AGARRÓ NADA — la medición no vale`);
      fallos++;
      continue;
    }
    const tocados = parche.tocados !== undefined ? `  (${parche.tocados}/${parche.total} tocados)` : "";
    console.log(
      `  ${v.clave} ${v.titulo.padEnd(26)} ${String(m.motas).padStart(4)} motas` +
      (err ? `   error ${err.medio.toFixed(2)}/255, ${err.porcentaje.toFixed(2)}% feo` : "") +
      tocados,
    );
    resumen.push({ pantalla: pantalla.clave, variante: v.clave, motas: m.motas, err, parche });
  }
  console.log();
}

/* Las tres al lado, para mirarlas en vez de leer números. */
for (const pantalla of PANTALLAS) {
  const trozos = [];
  for (const v of VARIANTES) {
    if (v.soloEn && !v.soloEn.includes(pantalla.clave)) continue;
    const f = `${SALIDA}/${pantalla.clave}-${v.clave}.png`;
    try { trozos.push({ input: await sharp(f).toBuffer(), clave: v.clave }); } catch { /* no salió */ }
  }
  if (trozos.length < 2) continue;
  const m = await sharp(trozos[0].input).metadata();
  const juntas = await sharp({
    create: { width: m.width * trozos.length, height: m.height, channels: 3, background: "#000" },
  })
    .composite(trozos.map((t, i) => ({ input: t.input, left: i * m.width, top: 0 })))
    .png().toBuffer();
  const destino = `${SALIDA}/COMPARAR-${pantalla.clave}.png`;
  await writeFile(destino, juntas);
  console.log(`las tres al lado (A · B · C):  ${destino}`);
}

await nav.close();
await writeFile(`${SALIDA}/medidas.json`, JSON.stringify(resumen, null, 2));
console.log(`\nlos números crudos: ${SALIDA}/medidas.json`);
if (fallos) {
  console.log(`\n${fallos} variante(s) no se pudieron aplicar: no compares esos números.`);
  process.exit(1);
}
