/**
 * Mide la mesa con el rival nuevo, el que no tiene brazos.
 *
 *     npm run dev                             (en otra terminal)
 *     node herramientas/mirar-mesa-nueva.mjs
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────
 *
 * Al sacarle los brazos y las cartas al rival, la franja de allá quedó libre y
 * todo lo que estaba apoyado SUBIÓ para hacerle lugar abajo a las cartas
 * jugadas y a tu mano. El problema es que `estiloEnMesa` ancla los objetos por
 * la BASE y crecen hacia arriba: pasado cierto punto se le montan al rival
 * encima del pecho. **Cuánto entra no se puede saber leyendo el código**,
 * porque depende del alto de la ventana, del `clamp` de cada objeto y de la
 * escala en perspectiva, las tres a la vez.
 *
 * Así que en vez de elegir un número y mirarlo, esto MIDE el rectángulo de
 * verdad en el navegador y falla si algo se pasa. La libreta es el caso que lo
 * motivó: es lo más alto de la mesa y no se puede achicar —si no se leen los
 * puntos no sirve—, así que hay que subirla hasta donde entre y ni un poco más.
 *
 * Y filma las dos animaciones, que es lo otro que no se puede revisar leyendo:
 * que las tres cartas del rival bajen y se vayan, y que la que él tira entre
 * desde su lado.
 *
 * Deja todo en `capturas/mesa-nueva/`, que está en .gitignore.
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const SALIDA = path.join("capturas", "mesa-nueva");
/**
 * Las seis, con el diseño que le TIENE que tocar a cada una.
 *
 * Desde que hay dos diseños, medir sólo los celulares no alcanza: el feedback
 * de la compu —el mazo perdido, las esquinas de la mesa— no se veía en ninguna
 * de las tres pantallas que se probaban. Y el diseño esperado va escrito acá
 * porque si las seis dieran 0 usando todas el mismo, el 0 no probaría nada.
 *
 * 1280×620 es el caso duro de la compu: baja y ancha. Entra por apaisada.
 */
const TAMANOS = [
  [320, 568, "celular"],
  [360, 600, "celular"],
  [390, 844, "celular"],
  [1100, 800, "pc"],
  [1280, 620, "pc"],
  [1440, 900, "pc"],
];
/** "la libreta" / "el mate": el objeto del costado libre cambia con el diseño. */
const conArticulo = (que) => (que === "libreta" ? "la libreta" : `el ${que}`);

/** Cuánto puede asomar un objeto por encima del canto antes de ser un problema. */
const TOLERANCIA = 2;

await mkdir(SALIDA, { recursive: true });
const nav = await chromium.launch();
let fallos = 0;

async function abrir(pag, extra = "", depto = "montevideo") {
  await pag.goto(`http://localhost:3000/jugar/mesa?depto=${depto}${extra}`, {
    waitUntil: "domcontentloaded",
  });
  await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await pag.waitForTimeout(2600);
}

/** ¿Está el cartel de fin de mano tapando todo? */
const manoTerminada = (pag) =>
  pag.getByRole("button", { name: /Siguiente mano|Otra contra/ }).count();

/**
 * Deja la mesa CON CARTAS PUESTAS y sin el cartel de fin de mano encima.
 *
 * Esto no es un detalle. La primera versión jugaba dos cartas y medía, y a veces
 * la mano se terminaba en la segunda: entonces medía con el cartel tapando la
 * pantalla, y la captura de la falla no servía para ver nada. Ahora, si la mano
 * se termina, se reparte de nuevo y se prueba con menos cartas.
 *
 * Devuelve cuántas bazas quedaron puestas, o 0 si no se pudo.
 */
async function prepararMesa(pag) {
  /* Se insiste hasta juntar DOS bazas puestas, que es el caso apretado: las
     bazas se reparten centradas y cuantas más hay, más se abren hacia los
     costados. Con una sola en el medio no se toca nada y la medición miente. */
  for (let intento = 0; intento < 14; intento++) {
    await abrir(pag);
    let puestas = 0;
    for (let i = 0; i < 2; i++) {
      const cartas = pag.locator(".mano-abanico button:not([disabled])");
      if ((await cartas.count()) === 0) break;
      await cartas.first().click().catch(() => {});
      await pag.waitForTimeout(2200);
      if (await manoTerminada(pag)) break;
      puestas++;
    }
    if (puestas >= 2 && !(await manoTerminada(pag))) return puestas;
  }
  return 0;
}

/** Los rectángulos de todo lo que está sobre la mesa, más el canto y tu mano. */
const medir = (pag) =>
  pag.evaluate(() => {
    const caja = (el) => {
      const r = el.getBoundingClientRect();
      return { arriba: r.top, abajo: r.bottom, izq: r.left, der: r.right, alto: r.height };
    };
    const tabla = document.querySelector('[data-mesa="tabla"]');
    const mano = document.querySelector(".mano-abanico");
    return {
      diseno: tabla ? tabla.dataset.diseno : null,
      // el canto lejano: el borde de arriba de la zona de mesa
      canto: tabla ? caja(tabla).arriba : null,
      escena: tabla ? caja(tabla) : null,
      mano: mano ? caja(mano) : null,
      objetos: [...document.querySelectorAll("[data-mesa]")]
        .filter((el) => el.dataset.mesa !== "tabla")
        .map((el) => ({ que: el.dataset.mesa, ...caja(el) })),
    };
  });

const seCruzan = (a, b) =>
  a.izq < b.der && b.izq < a.der && a.arriba < b.abajo && b.arriba < a.abajo;

for (const [ancho, alto, esperado] of TAMANOS) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
  const pag = await ctx.newPage();
  // con la mesa usada, que es cuando hay algo que solapar
  const puestas = await prepararMesa(pag);
  if (puestas === 0) {
    console.log(`  ${ancho}x${alto}: no se pudo dejar la mesa con cartas puestas`);
    await ctx.close();
    continue;
  }

  const m = await medir(pag);
  const problemas = [];

  // 0. que se haya elegido el diseño que corresponde
  if (m.diseno !== esperado) {
    problemas.push(`quedó el diseño "${m.diseno}" y tenía que quedar "${esperado}"`);
  }

  for (const o of m.objetos) {
    // 1. nada se le monta al rival
    if (o.arriba < m.canto - TOLERANCIA) {
      problemas.push(
        `${o.que} cruza el canto por ${(m.canto - o.arriba).toFixed(0)}px ` +
          `(arriba=${o.arriba.toFixed(0)} canto=${m.canto.toFixed(0)})`,
      );
    }
    // 2. nada se sale por los costados
    if (o.izq < -1 || o.der > ancho + 1) {
      problemas.push(`${o.que} se sale por el costado (${o.izq.toFixed(0)}..${o.der.toFixed(0)})`);
    }
    // 3. nada se le monta a tu mano
    if (m.mano && seCruzan(o, m.mano)) {
      problemas.push(`${o.que} se solapa con tu mano`);
    }
  }
  /* 4. NADA SE LE PUEDE MONTAR AL OBJETO DEL COSTADO LIBRE.
     No es "que no se solape nada con nada": el mate delante del mazo o una baza
     encima de otra son profundidad y están bien. Este es distinto porque es el
     que está apretado entre el canto y las bazas, y en el caso de la libreta
     además es lo único de la mesa que hay que LEER.

     CUÁL ES DEPENDE DEL DISEÑO, y por eso no está clavado en "libreta": en la
     compu ese lugar lo ocupa la libreta y en el celular el mate, porque la
     libreta se sacó de ahí. Si esto dijera sólo "libreta", las tres pantallas
     de celular pasarían a no comprobar NADA de ese costado y seguirían dando
     0, que es la peor forma de romper una herramienta: la que no se nota. */
  const mando = m.objetos.find((o) => o.que === "libreta") ?? m.objetos.find((o) => o.que === "mate");
  if (mando) {
    for (const o of m.objetos) {
      if (o !== mando && seCruzan(mando, o)) problemas.push(`${o.que} se le monta a ${conArticulo(mando.que)}`);
    }
  }

  const etiqueta = `${ancho}x${alto}`;
  if (problemas.length) {
    fallos += problemas.length;
    console.log(`FALLA ${etiqueta}  (${puestas} baza(s) puesta(s))`);
    for (const p of problemas) console.log(`   ${p}`);
    // los rectángulos de verdad, que es con lo que se corrigen los números:
    // deducirlos de las fórmulas sale mal, porque el `clamp` de cada objeto y
    // la escala en perspectiva se multiplican y no se ven por separado.
    console.log(`   canto=${m.canto.toFixed(0)}  mano=${m.mano ? m.mano.arriba.toFixed(0) : "?"}`);
    for (const o of m.objetos) {
      console.log(
        `   ${o.que.padEnd(9)} x ${o.izq.toFixed(0)}..${o.der.toFixed(0)}` +
          `   y ${o.arriba.toFixed(0)}..${o.abajo.toFixed(0)}  (alto ${o.alto.toFixed(0)})`,
      );
    }
    await pag.screenshot({ path: path.join(SALIDA, `falla-${etiqueta}.png`) });
  } else {
    console.log(
      `  ${etiqueta.padEnd(9)} OK  diseño ${String(m.diseno).padEnd(7)}` +
        ` (${m.objetos.length} objetos, ${puestas} baza(s) puesta(s))`,
    );
  }
  /* LOS DOS MÁRGENES DEL QUE MANDA, que son los que deciden su altura.
     Está apretado entre dos cosas que se mueven en sentidos opuestos: si sube,
     se acerca al canto y se le monta al rival; si baja, se le meten las bazas.
     Imprimir los dos es lo que permite elegir el número en vez de tantearlo. */
  if (mando) {
    /* Sólo cuentan los que están DEBAJO Y ADEMÁS PISADOS EN HORIZONTAL: un
       objeto que pasa dos píxeles más abajo pero tres columnas a la izquierda
       no le hace nada, y contarlo daba un margen falso de 2px que hacía
       parecer que no había lugar. */
    const cerca = m.objetos
      .filter((o) => o !== mando && o.arriba >= mando.abajo - 1)
      .filter((o) => o.izq < mando.der && mando.izq < o.der)
      .map((o) => o.arriba - mando.abajo);
    const abajo = cerca.length ? Math.min(...cerca) : Infinity;
    console.log(
      `${" ".repeat(13)}${mando.que}: ${(mando.arriba - m.canto).toFixed(0)}px al canto` +
        `, ${abajo === Infinity ? "—" : `${abajo.toFixed(0)}px`} a lo de abajo`,
    );
  }
  await pag.screenshot({ path: path.join(SALIDA, `mesa-${etiqueta}.png`) });
  await ctx.close();
}

/* ── EL REPARTO, MEDIDO EN VUELO ────────────────────────────────────────────
   Las tres cartas que le reparten al rival existen sólo mientras dura el
   reparto, así que la medición de arriba —que espera a que termine— no las ve
   nunca. Y son las que primero se le montan a la libreta, porque caen contra el
   canto lejano que es justo donde ahora está el papel. Se mide a mitad de
   reparto, sin esperar. */
console.log("\nel reparto, medido en vuelo:");
for (const [ancho, alto] of TAMANOS) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
  const pag = await ctx.newPage();
  await pag.goto("http://localhost:3000/jugar/mesa?depto=montevideo", {
    waitUntil: "domcontentloaded",
  });
  await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await pag.waitForTimeout(900);
  const m = await medir(pag);
  // El mismo "el que manda" de arriba: libreta en la compu, mate en el celular.
  const mando = m.objetos.find((o) => o.que === "libreta") ?? m.objetos.find((o) => o.que === "mate");
  const reparto = m.objetos.find((o) => o.que === "reparto");
  const etiqueta = `${ancho}x${alto}`;
  if (!reparto) {
    console.log(`  ${etiqueta.padEnd(9)} no se llegó a ver el reparto`);
  } else if (mando && seCruzan(mando, reparto)) {
    fallos++;
    console.log(`FALLA ${etiqueta}  las cartas del reparto se le montan a ${conArticulo(mando.que)}`);
    console.log(`   reparto x ${reparto.izq.toFixed(0)}..${reparto.der.toFixed(0)}` +
      `   ${mando.que} x ${mando.izq.toFixed(0)}..${mando.der.toFixed(0)}`);
    await pag.screenshot({ path: path.join(SALIDA, `falla-reparto-${etiqueta}.png`) });
  } else if (reparto.arriba < m.canto - TOLERANCIA) {
    fallos++;
    console.log(`FALLA ${etiqueta}  las cartas del reparto cruzan el canto`);
  } else {
    console.log(
      `  ${etiqueta.padEnd(9)} OK  (${mando ? `${(mando.izq - reparto.der).toFixed(0)}px entre el reparto y ${conArticulo(mando.que)}` : "?"})`,
    );
  }
  await ctx.close();
}

/* ── Las animaciones ────────────────────────────────────────────────────────
   Se sacan cuadros cada 120 ms y se pegan en una tira. Es lo único que muestra
   si las tres del rival se van para abajo como tienen que irse y si la que él
   tira entra desde su lado en vez de caer de la nada. */
const { default: sharp } = await import("sharp");
const CUADROS = 10;
const CADA = 120;

async function filmar(pag, nombre, arranque) {
  const cuadros = [];
  await arranque();
  for (let i = 0; i < CUADROS; i++) {
    cuadros.push(await pag.screenshot());
    await pag.waitForTimeout(CADA);
  }
  const { width, height } = await sharp(cuadros[0]).metadata();
  // dos filas de cinco, si no la tira queda impracticable de ancha
  const porFila = Math.ceil(CUADROS / 2);
  await sharp({
    create: { width: width * porFila, height: height * 2, channels: 3, background: "#15100a" },
  })
    .composite(
      cuadros.map((input, i) => ({
        input,
        left: (i % porFila) * width,
        top: Math.floor(i / porFila) * height,
      })),
    )
    .png()
    .toFile(path.join(SALIDA, `${nombre}.png`));
  console.log(`  ${path.join(SALIDA, `${nombre}.png`)}`);
}

console.log("\nanimaciones (cada cuadro es 120ms):");
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const pag = await ctx.newPage();

  // EL REPARTO: se arranca a filmar en cuanto carga, sin esperar a que termine
  await filmar(pag, "ANIM-reparto", async () => {
    await pag.goto("http://localhost:3000/jugar/mesa?depto=montevideo", {
      waitUntil: "domcontentloaded",
    });
    await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await pag.waitForTimeout(150);
  });

  // LA TIRADA DEL BOT: se juega una carta y se filma lo que contesta
  await abrir(pag);
  await filmar(pag, "ANIM-tira-el-bot", async () => {
    const cartas = pag.locator(".mano-abanico button:not([disabled])");
    if (await cartas.count()) await cartas.first().click().catch(() => {});
  });
  await ctx.close();
}

/* ── LA MANO CON 3, 2 Y 1 CARTA ────────────────────────────────────────────
   Esto es lo que faltaba mirar y por eso el defecto duró tanto. Todas las
   capturas se sacaban con la mano llena, que es justo el caso en el que la mano
   se ve bien: las cartas le tapan el medio y de ella sólo se ven los bordes.

   El problema aparece cuando queda DESTAPADA —con una sola carta, y mientras se
   reparte— y ahí ni el tamaño ni la proporción del pulgar daban. Así que ahora
   se juega de a una y se recorta la franja de abajo en cada paso, para poder
   comparar los tres estados uno al lado del otro.

   Se recorta alrededor de `.mano-abanico` y no en un `y` fijo: la mano se mide
   en `vh` y en 320x568 no cae donde cae en 390x844. */
console.log("\nla mano con 3, 2 y 1 carta:");
for (const [ancho, alto] of [[390, 844], [320, 568]]) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
  const pag = await ctx.newPage();
  let tiras = null;

  /* Se reintenta entero: si la mano se termina al jugar la segunda carta, no
     hay estado de "una carta" que mirar y la tira saldría con dos cuadros. */
  for (let intento = 0; intento < 14 && !tiras; intento++) {
    await abrir(pag);
    const pasos = [];
    for (let quedan = 3; quedan >= 1; quedan--) {
      const m = await medir(pag);
      if (!m.mano) break;
      const arriba = Math.max(0, Math.round(m.mano.arriba) - 34);
      pasos.push({
        etiqueta: quedan,
        foto: await pag.screenshot({
          clip: { x: 0, y: arriba, width: ancho, height: Math.min(alto - arriba, 330) },
        }),
      });
      if (quedan === 1) break;
      const cartas = pag.locator(".mano-abanico button:not([disabled])");
      if ((await cartas.count()) === 0) break;
      await cartas.first().click().catch(() => {});
      await pag.waitForTimeout(2200);
      if (await manoTerminada(pag)) break;
    }
    if (pasos.length === 3) tiras = pasos;
  }

  if (!tiras) {
    console.log(`  ${ancho}x${alto}: no se pudo llegar a una sola carta sin que terminara la mano`);
  } else {
    /* EL LIENZO VA CON EL ALTO MÁS GRANDE DE LOS TRES, no con el del primero.
       Cada cuadro se recorta desde donde está la mano, y la mano se mueve al
       jugar cartas: los tres salen de altos distintos. Tomando el del primero,
       `composite` se plantaba con "Image to composite must have same
       dimensions or smaller" y la tira no salía nunca. */
    const medidas = await Promise.all(tiras.map(({ foto }) => sharp(foto).metadata()));
    const width = Math.max(...medidas.map((m) => m.width));
    const height = Math.max(...medidas.map((m) => m.height));
    const archivo = path.join(SALIDA, `TIRA-mano-${ancho}x${alto}.png`);
    await sharp({
      create: { width: width * 3, height, channels: 3, background: "#15100a" },
    })
      .composite(tiras.map(({ foto }, i) => ({ input: foto, left: i * width, top: 0 })))
      .png()
      .toFile(archivo);
    console.log(`  ${archivo}   (3 cartas | 2 | 1)`);
  }
  await ctx.close();
}

/* La tira de los cuatro que más contrastan: sin brazos, la ropa es LO ÚNICO que
   los distingue. Si acá salen todos iguales, el diseño no anda. */
console.log("\nlos cuatro que más contrastan:");
{
  const CONTRASTE = ["montevideo", "canelones", "treinta-y-tres", "tacuarembo"];
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const pag = await ctx.newPage();
  const piezas = [];
  for (const depto of CONTRASTE) {
    await abrir(pag, "");
    await pag.goto(`http://localhost:3000/jugar/mesa?depto=${depto}`, {
      waitUntil: "domcontentloaded",
    });
    await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await pag.waitForTimeout(2600);
    const archivo = path.join(SALIDA, `rival-${depto}.png`);
    await pag.screenshot({ path: archivo });
    piezas.push(archivo);
  }
  await sharp({
    create: { width: 390 * piezas.length, height: 844, channels: 3, background: "#15100a" },
  })
    .composite(piezas.map((input, i) => ({ input, left: i * 390, top: 0 })))
    .png()
    .toFile(path.join(SALIDA, "TIRA-rivales.png"));
  console.log(`  ${path.join(SALIDA, "TIRA-rivales.png")}`);
  await ctx.close();
}

/* ══ LOS OBJETOS EXTREMOS DE LA GIRA ═══════════════════════════════════════
   Todo lo de arriba se mide en Montevideo, o sea con UN solo objeto: el vaso,
   que es angosto y de alto medio. Pero cada departamento trae el suyo y no
   miden todos igual —un sombrero es tres veces más ancho que un vaso y una
   botella un 38% más alta—, así que pasar en Montevideo no prueba nada de los
   otros dieciocho.

   Se miran los CUATRO extremos y no los diecinueve: los dos más anchos, que
   son los que se pueden salir por el costado, y los dos más altos, que son los
   que se le pueden montar al mazo o cruzar el canto. Si entran los extremos,
   entran los del medio. Y va a los dos tamaños más apretados de cada diseño. */
console.log("\nlos objetos extremos de la gira:");
{
  const EXTREMOS = [
    ["canelones", "cajón", "el más ancho"],
    ["tacuarembo", "sombrero", "el segundo más ancho"],
    ["paysandu", "botella", "la más alta"],
    ["lavalleja", "farol", "el segundo más alto"],
  ];
  /* Los dos MÁS APRETADOS de cada diseño y no los seis: el celular más chico y
     la compu más baja. Y con la mano de TRES cartas, o sea sin `prepararMesa`,
     que es donde estaba el agujero: midiendo con dos cartas ya jugadas la mano
     es más chica, llega más abajo y todo entra. */
  for (const [ancho, alto] of [
    [320, 568],
    [1280, 620],
  ]) {
    const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
    const pag = await ctx.newPage();
    for (const [depto, nombre, porque] of EXTREMOS) {
      await abrir(pag, "", depto);
      const m = await medir(pag);
      const o = m.objetos.find((x) => x.que === "objeto");
      const etiqueta = `${ancho}x${alto} ${nombre}`;
      if (!o) {
        fallos++;
        console.log(`FALLA ${etiqueta.padEnd(24)} no se dibujó el objeto de ${depto}`);
        continue;
      }
      const problemas = [];
      if (o.izq < -1 || o.der > ancho + 1) {
        problemas.push(`se sale por el costado (${o.izq.toFixed(0)}..${o.der.toFixed(0)})`);
      }
      if (o.arriba < m.canto - TOLERANCIA) {
        problemas.push(`cruza el canto por ${(m.canto - o.arriba).toFixed(0)}px`);
      }
      if (m.mano && seCruzan(o, m.mano)) problemas.push("se solapa con tu mano");
      const mazo = m.objetos.find((x) => x.que === "mazo");
      if (mazo && seCruzan(o, mazo)) problemas.push("se le monta al mazo");

      if (problemas.length) {
        fallos += problemas.length;
        console.log(`FALLA ${etiqueta.padEnd(24)} ${problemas.join(" · ")}`);
        await pag.screenshot({ path: path.join(SALIDA, `falla-objeto-${depto}-${ancho}x${alto}.png`) });
      } else {
        console.log(
          `  ${etiqueta.padEnd(24)} OK  ${(o.der - o.izq).toFixed(0)}x${(o.abajo - o.arriba).toFixed(0)}px` +
            `  (${porque})`,
        );
      }
    }
    await ctx.close();
  }
}

await nav.close();
console.log(
  fallos === 0
    ? "\nTODO OK: nada se le monta al rival, nada se solapa."
    : `\n${fallos} PROBLEMAS`,
);
process.exit(fallos === 0 ? 0 : 1);
