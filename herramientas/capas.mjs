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
 * manchitas vas a ver: dice cuántas superficies compuestas declara la
 * especificación.
 *
 * ── LO QUE ESTE ARCHIVO DECÍA HASTA EL 8/9/2026, Y ERA FALSO ──────────────
 *
 * Decía: «Si un cambio no baja este número, no hay motivo para creer que
 * arregle nada». Se midió en el celular y es al revés.
 *
 * El arreglo que apagó las manchitas —`opacity: 0.999` en los hijos del mapa
 * y de la escena, ver `app/globals.css`— **SUBE** este total de 21 a 28, y en
 * el teléfono lleva el mapa de 1,8 bloques de media a 0,0 en 20 tandas, y la
 * mesa de 9 cuadros sucios de 21 a 0 de 26.
 *
 * O sea: más superficies compuestas puede ser MEJOR. Lo que importa no es
 * cuántas hay, sino cuánta geometría entra en una sola pasada de rasterizado.
 * Este número sigue sirviendo para ver QUÉ se promueve y POR QUÉ
 * (`compositingReasons`), que es para lo que se usó de verdad; **no sirve
 * para decidir si algo va a arreglar una manchita**. Para eso hay que medir
 * en el celular, con `herramientas/rig-celular.mjs`.
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

/* ══ EL CIERRE DE LA MANO ═════════════════════════════════════════════════
   Entró el 10/9/2026, con el recuadro que enseña las cartas del envido y de la
   flor. Hacía falta porque los cinco estados de arriba son todos con la mano EN
   CURSO: ninguno tiene el recuadro puesto, así que el total de 28 no decía nada
   sobre él.

   Y es justo el momento de riesgo: un elemento que aparece encima de la mesa,
   con seis cartas adentro, y que a los dos segundos desaparece. Lo que hay que
   ver acá es si promueve algo que antes no se promovía. Se miden las dos
   variantes; cuando Santiago elija una, se borra la otra de la lista. */
console.log("\nel cierre de la mano (el recuadro de tantos):");
/* `sin-tanto` ES EL CONTROL Y NO SOBRA. Al cerrarse una mano pasan varias cosas
   a la vez: las seis cartas se van al mazo animadas, el cartel de fin de mano
   se prepara, y —si alguien cantó— aparece el recuadro. Midiendo sólo el
   recuadro, cualquier número se le atribuye a él.

   Es la regla que dejó escrita el rig del 8/9/2026: cada tanda con su propio
   control, porque si no no se distingue el efecto del momento. */
for (const variante of ["sin-tanto", "con-tanto"]) {
  const { ctx, pag, cdp, capas, refrescar } = await abrirConCapas();
  let visto = false;

  for (let intento = 0; intento < 22 && !visto; intento++) {
    await pag.goto(`${SITIO}/jugar/mesa?depto=montevideo`, { waitUntil: "domcontentloaded" });
    await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await pag.waitForTimeout(3000);

    // cantar algo, para que haya tanto que enseñar. El control no canta nada.
    const hay = variante === "sin-tanto" ? [] : await cantos(pag);
    if (variante === "sin-tanto") {
      // nada: se juega la mano pelada y se cierra sola
    } else if (hay.includes("flor")) {
      await pag.locator('[data-canto="flor"]').click().catch(() => {});
      await pag.waitForTimeout(1200);
    } else if (hay.includes("abrir-envido")) {
      await pag.locator('[data-canto="abrir-envido"]').click().catch(() => {});
      await pag.waitForTimeout(400);
      await pag.locator('[data-canto="envido"]').first().click().catch(() => {});
      await pag.waitForTimeout(1600);
      if ((await cantos(pag)).includes("quiero")) {
        await pag.locator('[data-canto="quiero"]').click().catch(() => {});
        await pag.waitForTimeout(1400);
      }
    } else continue;

    // y ahora tirar cartas hasta que se cierre
    for (let paso = 0; paso < 8; paso++) {
      const fase = await pag.getAttribute("[data-fase]", "data-fase").catch(() => null);
      if (fase && fase !== "jugando") break;
      const cartas = pag.locator(".mano-abanico button:not([disabled])");
      if ((await cartas.count()) === 0) break;
      await cartas.first().click().catch(() => {});
      await pag.waitForTimeout(1300);
    }

    /* ── HAY QUE `refrescar()`, Y ADEMÁS COMPROBAR QUE LLEGUÉ A TIEMPO ──────
       La primera versión de esto no refrescaba, con el argumento de que el
       recuadro dura dos segundos y no había que perderlo. Dio
       **0 capas nuestras y 0 en total**, en las dos variantes.

       Cero EN TOTAL es imposible: una mesa con cartas tiene capas. Lo que pasa
       es lo que este mismo archivo ya avisa treinta líneas más arriba: `goto`
       tira el árbol, y sin apagar y prender `LayerTree` el árbol que queda es
       el de la página anterior o ninguno. O sea que era un cero del método, no
       una medición — el mismo error que el 9/9 hizo dar "0 sucias" con la
       pantalla rota.

       `refrescar()` no recarga nada: apaga y prende el dominio y fuerza un
       cuadro con capturas de 8x8. Pero puede tardar hasta 1,8 s, y el recuadro
       vive 2. Por eso se comprueba que SIGA EN PANTALLA después, y si no se
       reintenta la mano: un número tomado con el recuadro ya barrido sería el
       de la mesa vacía disfrazado de medición del recuadro. */
    await pag.waitForTimeout(900);

    const sel =
      variante === "sin-tanto"
        ? '[data-fase]:not([data-fase="jugando"])'
        : '[data-mesa="baza-enseñada"]';
    /* Y el control tiene que estar LIMPIO: si en esa mano alguien cantó igual
       —el bot canta solo—, el recuadro está puesto y deja de ser control. */
    if (variante === "sin-tanto") {
      const conTanto = await pag.locator('[data-mesa="baza-enseñada"]').count();
      if (conTanto > 0) continue;
    }
    if ((await pag.locator(sel).count()) === 0) continue;
    await refrescar();
    if ((await pag.locator(sel).count()) === 0) continue; // llegué tarde
    visto = true;
    await anotar(`cierre-${variante}`, cdp, capas);
  }

  if (!visto) console.log(`  cierre-${variante}: (no salió en 22 manos)`);
  await ctx.close();
}

await nav.close();

const suma = resultados.reduce((s, r) => s + r.nuestras, 0);
console.log(`\nTotal de capas nuestras en las ${resultados.length} pantallas medidas: ${suma}`);
console.log("Sirve para ver QUÉ se promueve y por qué, no para predecir manchitas:");
console.log("el arreglo del 8/9/2026 SUBIÓ este número de 21 a 28 y las apagó.");
console.log("OJO CON SUMAR: los dos `cierre-*` valen ~21 cada uno porque ahí las");
console.log("cartas están volando al mazo, y son las MISMAS dos veces. Comparalos");
console.log("entre sí —con-tanto contra sin-tanto—, no contra el resto.");
console.log("Las manchitas se miden con `node herramientas/rig-celular.mjs`.\n");

/* ── LO QUE DIO EL 10/9/2026, PARA NO TENER QUE VOLVER A CORRERLO ──────────

   Con los DOS RECUADROS que se probaron primero (y se descartaron):

       cierre-sin-tanto   21 capas · 5.48 Mpx · 23 en total
       cierre-cuadro      21 capas · 5.48 Mpx · 23 en total
       cierre-papeles     21 capas · 5.48 Mpx · 23 en total

   Las tres listas salieron IDÉNTICAS, elemento por elemento. Un papel con
   cartas dibujadas adentro no promueve nada.

   Con el diseño que quedó —las cartas APOYADAS sobre la mesa—:

       cierre-sin-tanto   21 capas · 5.48 Mpx · 23 en total
       cierre-con-tanto   25 capas · 5.61 Mpx · 27 en total

   **Sube 4, y se sabe exactamente cuáles**: cada `<CartaApoyada>` trae
   `anim-caer` y `anim-sombra`, que son dos `ActiveTransformAnimation`. Dos
   cartas enseñadas, cuatro capas. Son **las mismas que promueve cualquier
   carta que se tira**: si eso fuera un problema, lo sería el juego entero.

   Y subir no es malo por sí solo: el arreglo que APAGÓ las manchitas el 8/9
   subió este número de 21 a 28. Este archivo sirve para ver qué se promueve y
   por qué, no para predecir manchitas.

   Lo que esto NO dice es si en el Redmi aparecen manchitas: eso sólo lo
   contesta `rig-celular.mjs`, con el teléfono enchufado. */
