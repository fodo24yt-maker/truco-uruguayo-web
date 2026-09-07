/**
 * El contador de SUPERFICIES COMPUESTAS, que es la causa de las manchitas.
 *
 *     npm run dev                     (en otra terminal)
 *     node herramientas/capas.mjs
 *     node herramientas/capas.mjs --detalle     (dice el motivo de cada capa)
 *
 * ── Por qué existe, y por qué no alcanzaba con lo que había ───────────────
 *
 * `herramientas/laboratorio.mjs` lo dice sin vueltas: **en la compu el glitch
 * no se puede reproducir**, porque Chromium acá dibuja con SwiftShader y sale
 * siempre limpio. O sea que medir el EFECTO sin el teléfono es imposible, y
 * durante cuatro sesiones se intentó igual, mirando números de motas sobre
 * capturas de escritorio que no podían tener el bug adentro.
 *
 * Pero la CAUSA sí se puede medir acá, y encima es la única palanca que se
 * demostró que funciona:
 *
 *     sacar los filtros el 1/9 y el 4/9 bajó las manchitas de 20.064 a 2.870
 *     por Mpx —7 veces— sin tocar una sola forma
 *
 * Eso pasó porque bajó la cantidad de superficies que la GPU tiene que
 * componer y comprimir. La GPU del Redmi comprime cada superficie de a bloques
 * de 4×4, y un bloque cuyo dato vuelve mal se dibuja como una manchita. Menos
 * superficies, menos manchitas. Entonces: **se cuentan las superficies.**
 *
 * ── Cómo las cuenta ──────────────────────────────────────────────────────
 *
 * Por CDP, el protocolo con el que se habla con las tripas de Chromium:
 * `LayerTree.enable` avisa cada vez que el árbol de capas cambia, y
 * `LayerTree.compositingReasons` dice POR QUÉ cada capa es una capa. Eso
 * último es lo que lo hace útil: no dice "hay 14", dice "hay 14 y ésta es por
 * una animación de transform que no termina nunca".
 *
 * Está calibrado: sobre una página de prueba promovió lo que tenía
 * `will-change: transform` y la animación corriendo, y NO promovió un
 * `opacity: .75` quieto, que es exactamente lo que hace el navegador de verdad.
 *
 * ── Para qué sirve el número ─────────────────────────────────────────────
 *
 * Para comparar un antes con un después, y para nada más. No dice cuántas
 * manchitas vas a ver: dice cuántas oportunidades le estamos dando a la GPU de
 * equivocarse. Si un cambio no baja este número, no hay motivo para creer que
 * arregle nada, y eso se puede saber en segundos en vez de en una sesión.
 *
 * Corre en modo TÁCTIL y a DPR 2, como el laboratorio. Sin eso `(hover: hover)`
 * da true y el navegador aplica reglas que en un celular no existen: se estaría
 * contando las capas de otra pantalla.
 */

import { chromium } from "playwright";

/** El Redmi 13C: 720x1600 físicos, que el WebView reporta como 360x760 a DPR 2. */
const CELULAR = { ancho: 360, alto: 760 };
const SITIO = "http://localhost:3000";
const detalle = process.argv.includes("--detalle");

/* Las capas que tiene CUALQUIER página por existir: la raíz del documento, el
   viewport y el scroll. No son nuestras y no se pueden sacar, así que se
   cuentan aparte para que el número que miramos sea el que depende de lo que
   escribimos. */
const DE_LA_CASA = new Set(["Root", "Viewport", "Scroll", "IsForScrollingContents"]);

const nav = await chromium.launch();

/**
 * Abre una pestaña con el árbol de capas prendido.
 *
 * El árbol llega por evento y no se puede pedir: se guarda el último que llegó
 * y se lee cuando hace falta.
 */
async function abrirConCapas() {
  const ctx = await nav.newContext({
    viewport: { width: CELULAR.ancho, height: CELULAR.alto },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const pag = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pag);
  await cdp.send("DOM.enable");
  await cdp.send("LayerTree.enable");
  let ultimo = [];
  cdp.on("LayerTree.layerTreeDidChange", (e) => {
    if (e.layers) ultimo = e.layers;
  });

  /* NAVEGAR TIRA EL ÁRBOL, y por eso esto existe.
     `LayerTree` manda el árbol por evento y sólo cuando cambia. Al hacer un
     `goto` el dominio se resetea con el documento viejo y el árbol que queda
     guardado es el de la página anterior —o ninguno, que fue lo que pasó la
     primera vez: las siete pantallas dieron 0 capas, que es imposible—.
     Apagarlo y volverlo a prender obliga a que mande el árbol de AHORA. */
  const refrescar = async () => {
    ultimo = [];
    await cdp.send("LayerTree.disable");
    await cdp.send("LayerTree.enable");
    /* Y HAY QUE FORZAR UN CUADRO. El árbol llega cuando el compositor
       CONFIRMA uno, y una pantalla quieta no confirma ninguno: prenderlo y
       quedarse esperando da cero para siempre. Pasó en la segunda corrida —el
       menú y la mesa quieta daban 0 capas y el mapa 11, que es imposible— y
       la diferencia entre las dos era justamente si algo se estaba moviendo.
       Una captura de 8×8 obliga a confirmar y no cuesta nada. */
    for (let i = 0; i < 30 && !ultimo.length; i++) {
      await pag.screenshot({ clip: { x: 0, y: 0, width: 8, height: 8 } }).catch(() => {});
      await pag.waitForTimeout(60);
    }
  };

  return { ctx, pag, cdp, capas: () => ultimo, refrescar };
}

/** Cuántas superficies hay, cuánto miden y por qué son superficies. */
async function medir(cdp, capas) {
  const filas = [];
  for (const c of capas) {
    let motivos = [];
    try {
      const r = await cdp.send("LayerTree.compositingReasons", { layerId: c.layerId });
      motivos = r.compositingReasonIds ?? [];
    } catch {
      /* La capa puede haber dejado de existir entre que llegó el árbol y que
         se le pregunta. No es un error: es una capa menos. */
      continue;
    }
    /* QUIÉN es la capa, no sólo cuánta. Sin esto el informe dice "hay seis
       capas por Overlap" y no hay por dónde agarrarlo: `Overlap` quiere decir
       "esto pisa a una capa", así que lo que hay que encontrar es la de abajo.
       `backendNodeId` es el nodo del DOM y `DOM.describeNode` lo traduce. */
    let quien = "";
    if (c.backendNodeId) {
      try {
        const { node } = await cdp.send("DOM.describeNode", { backendNodeId: c.backendNodeId });
        /* `attributes` viene PLANO —nombre, valor, nombre, valor…— así que hay
           que leerlo de a pares. Con `indexOf` a secas un VALOR que se llame
           igual que un atributo hace match: la primera versión reportó
           `g.transform` y `ellipse.cx`, que no son clases de nadie. */
        const attrs = node.attributes ?? [];
        const de = {};
        for (let k = 0; k + 1 < attrs.length; k += 2) de[attrs[k]] = attrs[k + 1];
        const clase = (de.class ?? "").split(/\s+/).filter(Boolean).slice(0, 3).join(".");
        quien = `${node.localName ?? node.nodeName}${clase ? "." + clase : ""}`;
        const agarre = ["data-mesa", "data-mano", "data-encima", "data-dialogo", "id"].find((k) => k in de);
        if (agarre) quien += `[${agarre}=${de[agarre]}]`;
      } catch { /* el nodo puede haberse ido: la capa igual se cuenta */ }
    }
    filas.push({
      id: c.layerId,
      ancho: Math.round(c.width),
      alto: Math.round(c.height),
      dibuja: !!c.drawsContent,
      motivos,
      quien,
      nuestra: motivos.length > 0 && !motivos.every((m) => DE_LA_CASA.has(m)),
    });
  }
  const nuestras = filas.filter((f) => f.nuestra);
  /* El área va en píxeles del DISPOSITIVO, que es donde la GPU comprime: son
     los bloques de 4×4 de verdad y no los CSS. */
  const area = nuestras.reduce((s, f) => s + f.ancho * f.alto * 4, 0);
  return { total: filas.length, nuestras: nuestras.length, area, filas };
}

/** Los cantos que se pueden apretar ahora mismo. Igual que en `mirar-web.mjs`. */
const cantos = (pag) =>
  pag.evaluate(() =>
    [...document.querySelectorAll("[data-canto]")]
      .filter((b) => !b.disabled && b.offsetParent !== null)
      .map((b) => b.dataset.canto),
  );

const resultados = [];
async function anotar(clave, cdp, obtener) {
  const m = await medir(cdp, obtener());
  resultados.push({ clave, ...m });
  const mpx = (m.area / 1e6).toFixed(2);
  console.log(`  ${clave.padEnd(22)} ${String(m.nuestras).padStart(3)} capas nuestras · ${mpx} Mpx · ${m.total} en total`);
  if (detalle) {
    for (const f of m.filas.filter((x) => x.nuestra)) {
      console.log(`      ${String(f.ancho).padStart(5)}x${String(f.alto).padEnd(5)} ${f.motivos.join(", ").padEnd(46)} ${f.quien}`);
    }
  }
}

console.log(`\nLas superficies compuestas, a ${CELULAR.ancho}x${CELULAR.alto} y DPR 2 (tu Redmi).`);
console.log(`Cada una es una oportunidad más de que la GPU devuelva un bloque mal.\n`);

/* ── Las dos pantallas quietas ────────────────────────────────────────────
   Van primero porque no dependen del azar del reparto: si algo cambia acá,
   cambió de verdad. */
console.log("quietas:");
{
  const { ctx, pag, cdp, capas, refrescar } = await abrirConCapas();
  for (const [clave, url] of [["menu", "/jugar"], ["mapa", "/jugar/gira"]]) {
    await pag.goto(SITIO + url, { waitUntil: "domcontentloaded" });
    await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await pag.waitForTimeout(2200);
    await refrescar();
    await anotar(clave, cdp, capas);
  }
  await ctx.close();
}

/* ── La mesa, estado por estado ───────────────────────────────────────────
   El reparto es al azar, así que no se puede pedir "una mano con flor": se
   insiste hasta que salga. Cada estado se anota la PRIMERA vez que se alcanza,
   y la corrida termina cuando están todos o cuando se acabaron los intentos.

   Los estados son los que Santiago reportó el 7/9: el envido, la falta envido
   y la flor. Más los dos que pasan en toda mano —la mesa quieta y la mano
   apagada porque no es tu turno— para tener contra qué comparar. */
console.log("\nla mesa:");
{
  const { ctx, pag, cdp, capas, refrescar } = await abrirConCapas();
  const faltan = new Set(["mesa-quieta", "mesa-apagada", "mesa-envido", "mesa-falta-envido", "mesa-flor"]);

  for (let intento = 0; intento < 30 && faltan.size; intento++) {
    await pag.goto(`${SITIO}/jugar/mesa?depto=montevideo`, { waitUntil: "domcontentloaded" });
    await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await pag.waitForTimeout(3000);

    if (faltan.has("mesa-quieta")) {
      faltan.delete("mesa-quieta");
      await refrescar();
      await anotar("mesa-quieta", cdp, capas);
    }

    const hay = await cantos(pag);

    if (hay.includes("flor") && faltan.has("mesa-flor")) {
      await pag.locator('[data-canto="flor"]').click().catch(() => {});
      await pag.waitForTimeout(700);
      faltan.delete("mesa-flor");
      await refrescar();
      await anotar("mesa-flor", cdp, capas);
      continue;
    }

    if (hay.includes("abrir-envido")) {
      await pag.locator('[data-canto="abrir-envido"]').click().catch(() => {});
      await pag.waitForTimeout(400);
      const dentro = await cantos(pag);

      /* La falta envido primero, que es la que Santiago dijo que se bugea
         distinto y que quedó sin medir el 5/9. */
      if (faltan.has("mesa-falta-envido") && dentro.includes("falta-envido")) {
        await pag.locator('[data-canto="falta-envido"]').click().catch(() => {});
        await pag.waitForTimeout(700);
        faltan.delete("mesa-falta-envido");
        await refrescar();
      await anotar("mesa-falta-envido", cdp, capas);
        continue;
      }
      if (faltan.has("mesa-envido") && dentro.includes("envido")) {
        await pag.locator('[data-canto="envido"]').click().catch(() => {});
        /* Corto, para agarrar la mano APAGADA: es el rato en que no es tu
           turno y el grupo entero se está atenuando. Ahí es donde vive el
           `transition-opacity`. */
        await pag.waitForTimeout(300);
        if (faltan.delete("mesa-apagada")) await refrescar();
      await anotar("mesa-apagada", cdp, capas);
        await pag.waitForTimeout(1400);
        faltan.delete("mesa-envido");
        await refrescar();
      await anotar("mesa-envido", cdp, capas);
        continue;
      }
    }
  }

  if (faltan.size) console.log(`  (no salieron en 30 manos: ${[...faltan].join(", ")})`);
  await ctx.close();
}

await nav.close();

const suma = resultados.reduce((s, r) => s + r.nuestras, 0);
console.log(`\nTotal de capas nuestras en las ${resultados.length} pantallas medidas: ${suma}`);
console.log("El número sirve para comparar un ANTES con un DESPUÉS. Si un cambio no");
console.log("lo baja, no hay motivo para creer que arregle una manchita.\n");
