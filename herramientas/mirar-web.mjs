/**
 * Mira la web de verdad y busca fallas de diseño.
 *
 *     npm run dev                        (en otra terminal)
 *     node herramientas/mirar-web.mjs
 *
 * `mirar-mesa.mjs` verifica que la mesa no scrollee y `mirar-mesa-nueva.mjs`
 * mide dónde cae cada objeto. Lo de acá son las dos cosas que ninguna de esas
 * ve: **que la navegación de la app sea la que tiene que ser** —la barra, el
 * volver, las pantallas que no scrollean— y **que las jugadas se puedan
 * hacer**, que es distinto de que se vean bien.
 *
 * El bug que lo motivó: cantabas envido, el rival te subía a real envido y no
 * había ningún botón para subirle. La barra se convertía entera en "Quiero /
 * No quiero". Ninguna de las otras dos herramientas lo podía ver, porque
 * miraban la mesa quieta y esto sólo aparece jugando.
 *
 * Sale con código 1 si algo falla y deja la captura del momento exacto.
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { volverDesde } from "../lib/navegacion.ts";

const SALIDA = path.join("capturas", "web");
const RAIZ = "http://localhost:3000";
/** Celular apretado, celular normal, y compu. */
const TAMANOS = [
  [320, 568],
  [390, 844],
  [1440, 900],
];

await mkdir(SALIDA, { recursive: true });
const nav = await chromium.launch();
let fallos = 0;

function falla(donde, que) {
  fallos++;
  console.log(`FALLA ${donde}  ${que}`);
}

async function abrir(pag, ruta) {
  await pag.goto(`${RAIZ}${ruta}`, { waitUntil: "domcontentloaded" });
  await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

/* ══ 1. EL ARMAZÓN DE APP ══════════════════════════════════════════════════
   Desde que esto se empaqueta para Android, la navegación es de app y no de
   web: una barra fija arriba con el volver y los dos atajos, y pantallas que
   no scrollean.

   Se verifican tres cosas, y las tres son fallas que ya se pagaron antes:

   1. **Las pantallas fijas entran enteras.** El inicio y el menú de jugar son
      pantallas: si hay que arrastrar para ver a qué viniste, están rotas. El
      menú de jugar scrolleaba 205 px a 360×640 y no se veía en un celular
      normal.
   2. **La barra está donde tiene que estar Y FALTA donde tiene que faltar.**
      Lo segundo importa más: en la mesa se esconde con
      `body:has(.mesa-pantalla-completa) > header`, y si alguien envuelve la
      barra en un `<div>` esa regla deja de encontrarla y la barra reaparece
      encima de la mesa, robándole el alto que necesita para no scrollear.
   3. **El volver lleva a donde dice `volverDesde()`.** La misma función la usan
      la barra y el botón físico de Android, así que si acá coinciden, allá
      también. */
console.log("el armazón de app:");
{
  /** Las pantallas que no pueden scrollear nunca. */
  const FIJAS = ["/", "/jugar", "/anotador"];
  /** Dónde tiene que haber barra, y dónde no. */
  const CON_BARRA = ["/", "/aprender", "/aprender/la-flor", "/jugar", "/anotador", "/legales/terminos"];
  const SIN_BARRA = ["/jugar/gira", "/jugar/mesa?depto=montevideo"];

  const medir = (pag) =>
    pag.evaluate(() => {
      const doc = document.documentElement;
      /* Se busca al hijo DIRECTO del body a propósito: es la forma del DOM de la
         que depende que la mesa pueda esconder la barra. */
      const barra = document.querySelector("body > header.barra-app");
      const visible = barra ? barra.getBoundingClientRect().height > 0 : false;
      /* EL ENGRANAJE, y no los dos atajos que había hasta el 8/9/2026.
         Se busca por `aria-label` a propósito: es un botón sin texto, así que
         ese atributo no es un adorno de accesibilidad, es su ÚNICO nombre. Si
         alguien se lo saca, el botón deja de tener nombre para un lector de
         pantalla y esto falla, que es exactamente lo que tiene que pasar. */
      const ajustes = barra?.querySelector('button[aria-label="Ajustes"]') ?? null;
      const volver = [...(barra?.querySelectorAll("nav > a") ?? [])][0] ?? null;
      const caja = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { arriba: r.top, abajo: r.bottom, izq: r.left, der: r.right };
      };
      return {
        hayBarra: visible,
        altoBarra: barra ? Math.round(barra.getBoundingClientRect().height) : 0,
        volver: visible && volver ? volver.getAttribute("href") : null,
        hayAjustes: Boolean(ajustes),
        activo: barra?.querySelector('[aria-current="page"]')?.textContent?.trim() ?? null,
        sobraAlto: doc.scrollHeight - doc.clientHeight,
        sobraAncho: doc.scrollWidth - doc.clientWidth,
        aprender: caja(
          [...document.querySelectorAll("main a")].find((a) =>
            a.textContent.trim().toLowerCase().startsWith("aprender a jugar"),
          ),
        ),
        jugar: caja(
          [...document.querySelectorAll("main a")].find(
            (a) => a.textContent.trim().toLowerCase() === "jugar",
          ),
        ),
        anotador: caja(
          [...document.querySelectorAll("main a")].find((a) =>
            a.textContent.trim().toLowerCase().startsWith("anotador"),
          ),
        ),
      };
    });

  for (const [ancho, alto] of TAMANOS) {
    const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
    const pag = await ctx.newPage();
    const etiqueta = `${ancho}x${alto}`;
    const antes = fallos;

    for (const ruta of [...CON_BARRA, ...SIN_BARRA]) {
      await abrir(pag, ruta);
      await pag.waitForTimeout(ruta.includes("mesa") ? 3200 : 500);
      const m = await medir(pag);
      const donde = `${etiqueta} ${ruta}`;

      // 1. la barra, presente o ausente
      const deberia = !SIN_BARRA.includes(ruta);
      if (m.hayBarra !== deberia) {
        falla(donde, deberia ? "no está la barra de la app" : "la barra tapa la pantalla de juego");
      }
      if (deberia && !m.hayAjustes) {
        falla(donde, "no está el botón de ajustes en la barra");
      }

      // 2. el volver, contra la función que también usa el botón de Android
      if (deberia) {
        const busqueda = ruta.includes("?") ? ruta.slice(ruta.indexOf("?")) : "";
        const camino = ruta.split("?")[0];
        const esperado = volverDesde(camino, busqueda);
        if (m.volver !== esperado) {
          falla(donde, `el volver apunta a ${m.volver ?? "ningún lado"} y volverDesde() dice ${esperado ?? "ninguno"}`);
        }
      }

      // 3. nada se sale de ancho, en ninguna pantalla
      if (m.sobraAncho > 1) falla(donde, `se sale de ancho ${m.sobraAncho}px`);

      // 4. las pantallas fijas entran enteras
      if (FIJAS.includes(ruta) && m.sobraAlto > 1) {
        falla(donde, `es una pantalla y scrollea ${m.sobraAlto}px`);
      }

      // 5. en el inicio, las dos puertas se ven sin arrastrar nada
      if (ruta === "/") {
        for (const [nombre, caja] of [
          ["Aprender a jugar", m.aprender],
          ["Jugar", m.jugar],
          ["Anotador", m.anotador],
        ]) {
          if (!caja) falla(donde, `no está el botón "${nombre}"`);
          else if (caja.abajo > alto) falla(donde, `"${nombre}" queda fuera de la pantalla`);
        }
        await pag.screenshot({ path: path.join(SALIDA, `inicio-${etiqueta}.png`) });
      }
    }

    if (fallos === antes) console.log(`  ${etiqueta.padEnd(9)} OK`);
    await ctx.close();
  }
}

/* ══ 1ter. EL PANEL DE AJUSTES ═════════════════════════════════════════════
   La comprobación de arriba mira que el ENGRANAJE esté. Esto mira que sirva,
   que no es lo mismo, y nace de un error que ya se pagó el 7/9/2026: un guard
   que buscaba por atributo y, cuando el atributo cambiaba de nombre, salteaba
   la prueba en silencio y seguía diciendo OK. **Un control que pasa en vacío es
   peor que no tenerlo.**

   Acá eso se traduce en que no alcanza con que exista el botón: hasta el
   8/9/2026 los dos destinos estaban ESCRITOS en la barra y se veían de una;
   ahora están detrás de un toque, y si el panel no abre, o abre sin alguno de
   los destinos, la app se queda literalmente sin navegación y la barra sigue
   pareciendo correcta.

   Se prueban las tres cosas que pueden romperse por separado: que abra, que
   estén los tres destinos, y que cierre con Escape —que es la misma tecla que
   el botón físico de atrás de Android simula, así que probar Escape acá está
   probando el atrás del teléfono—. */
console.log("\nel panel de ajustes:");
{
  const DESTINOS = ["/aprender", "/jugar", "/anotador"];
  for (const [ancho, alto] of TAMANOS) {
    const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
    const pag = await ctx.newPage();
    const etiqueta = `${ancho}x${alto}`;
    const antes = fallos;

    await abrir(pag, "/");
    const engranaje = pag.locator('header.barra-app button[aria-label="Ajustes"]');
    const panel = pag.locator('[role="dialog"][aria-modal="true"]');

    if (await panel.count()) falla(etiqueta, "el panel de ajustes ya estaba abierto sin tocarlo");

    await engranaje.click();
    await pag.waitForTimeout(120);

    if (!(await panel.count())) {
      falla(etiqueta, "el engranaje no abre el panel de ajustes");
    } else {
      for (const destino of DESTINOS) {
        if (!(await panel.locator(`a[href="${destino}"]`).count())) {
          falla(etiqueta, `el panel de ajustes no ofrece ${destino}`);
        }
      }
      // Que se vea entero: un panel cuyo último botón queda abajo del borde es
      // un panel al que le falta una opción, y en un celular bajo pasa solo.
      const seSale = await pag.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      if (seSale > 1) falla(etiqueta, `el panel de ajustes se sale de ancho ${seSale}px`);

      await pag.screenshot({ path: path.join(SALIDA, `ajustes-${etiqueta}.png`) });

      await pag.keyboard.press("Escape");
      await pag.waitForTimeout(120);
      if (await panel.count()) {
        falla(etiqueta, "Escape no cierra el panel (y es la tecla del atrás de Android)");
      }
    }

    if (fallos === antes) console.log(`  ${etiqueta.padEnd(9)} OK`);
    await ctx.close();
  }
}

/* ══ 1bis. APRENDER EN UN CELULAR, Y EL HUECO DEL ANUNCIO ══════════════════
   Aprender es la mitad de lo que la app promete, y estaba medida para una
   computadora: títulos de 30px, párrafos de 17 y 48px de aire arriba y abajo.
   A 320 de ancho eso hacía renglones de siete palabras y una lección de casi
   nueve pantallas.

   Lo que se comprueba acá NO es que sea corta —una lección larga está bien, es
   texto— sino las dos cosas que sí son bugs:

   · **QUE NO DESBORDE A LO ANCHO.** Es el defecto que hace que una página se
     sienta rota en un teléfono y el que menos se ve leyendo el código: alcanza
     una palabra larga o una tabla para que aparezca la barra horizontal.
   · **QUE EL HUECO DEL ANUNCIO ESTÉ Y MIDA LO QUE DICE.** El día que se
     encienda el banner tiene que caber exactamente ahí. Si alguien le saca el
     alto al componente, o lo saca de una pantalla, esto falla ahora y no
     cuando ya haya un anuncio de por medio.
   · **Y QUE HAYA UNO SOLO.** Dos banners pegados, sin contenido en el medio,
     además de verse mal están prohibidos por las políticas de AdMob. Ya pasó
     una vez el 4/9/2026: quedaron el del cuerpo y el del pie uno arriba del
     otro. */
console.log("\naprender, en un celular:");
{
  const RUTAS = ["/aprender", "/aprender/la-flor", "/legales/privacidad"];
  for (const [ancho, alto] of TAMANOS) {
    const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
    const pag = await ctx.newPage();
    for (const ruta of RUTAS) {
      await abrir(pag, ruta);
      await pag.waitForTimeout(500);
      const m = await pag.evaluate(() => {
        const d = document.documentElement;
        const huecos = [...document.querySelectorAll("[data-anuncio]")].map((el) => {
          const r = el.getBoundingClientRect();
          return { alto: Math.round(r.height), ancho: Math.round(r.width) };
        });
        return { anchoDoc: d.scrollWidth, anchoVis: d.clientWidth, alto: d.scrollHeight, huecos };
      });
      const donde = `${ancho}x${alto} ${ruta}`;
      if (m.anchoDoc > m.anchoVis + 1) {
        falla(donde, `desborda a lo ancho: el documento mide ${m.anchoDoc} y la ventana ${m.anchoVis}`);
      }
      if (m.huecos.length === 0) {
        falla(donde, "no hay hueco de anuncio: ¿se le sacó el <EspacioAnuncio> al pie?");
      } else if (m.huecos.length > 1) {
        falla(donde, `hay ${m.huecos.length} huecos de anuncio en la misma pantalla, y va uno solo`);
      } else if (m.huecos[0].alto < 32) {
        falla(donde, `el hueco del anuncio mide ${m.huecos[0].alto}px y el banner más chico son 32`);
      } else {
        console.log(`  ${donde.padEnd(34)} OK  ${m.alto}px de largo, hueco de ${m.huecos[0].alto}px`);
      }
    }
    await ctx.close();
  }
}

/* ══ 2. LA VITRINA DE TROFEOS ══════════════════════════════════════════════
   Se abre desde el mapa de la gira y muestra los diecinueve objetos: los
   ganados con su marcador, los que faltan apagados.

   Lo que puede salir mal y no se ve leyendo el código:

   · **que no entre.** Diecinueve filas no caben en ningún celular, así que la
     lista scrollea por dentro. Lo que NO puede pasar es que scrollee la página:
     ahí el encabezado se va para arriba y te quedás sin botón de cerrar.
   · **que el objeto no se dibuje.** `ObjetoDeMesa` necesita que el contenedor
     tenga alto; en una caja sin medidas el SVG se colapsa a 0 y la fila queda
     con el nombre y un hueco.
   · **que se regalen trofeos**: uno que no ganaste no puede mostrar marcador.

   El progreso se siembra a mano en el `localStorage`, que es de donde sale. */
console.log("\nla vitrina de trofeos:");
for (const [ancho, alto] of TAMANOS) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
  const pag = await ctx.newPage();
  const etiqueta = `${ancho}x${alto}`;

  for (const cuantos of [3, 19]) {
    await abrir(pag, "/jugar/gira");
    await pag.evaluate((n) => {
      const ids = ["luki","la-coca","el-rulo","tito","la-nelly","marito","el-pescador",
        "don-aparicio","cachila","el-trinitario","la-rosa","el-tucho","el-fray","beto",
        "don-ramon","el-piedra","joao","peralta","el-melo"];
      const rivales = {};
      for (const id of ids.slice(0, n)) {
        rivales[id] = { ganadas: 1, jugadas: 2, mejor: { vos: 30, rival: 4 } };
      }
      localStorage.setItem("truco-uy:progreso", JSON.stringify({ version: 1, rivales }));
    }, cuantos);
    await abrir(pag, "/jugar/gira");
    await pag.waitForTimeout(900);

    const boton = pag.locator('button[aria-label^="Trofeos"]');
    if ((await boton.count()) === 0) {
      falla(`${etiqueta} ${cuantos}`, "no está el botón de trofeos en el mapa");
      continue;
    }
    await boton.click();
    await pag.waitForTimeout(400);

    const m = await pag.evaluate(() => {
      const hoja = document.querySelector('[role="dialog"][aria-labelledby="titulo-trofeos"]');
      if (!hoja) return null;
      const lista = hoja.querySelector("ul");
      const filas = [...(lista?.querySelectorAll("li") ?? [])];
      const cerrar = [...hoja.querySelectorAll("button")].find(
        (b) => b.textContent.trim().toLowerCase() === "cerrar",
      );
      const dibujos = [...hoja.querySelectorAll("svg")].filter((sv) => {
        const r = sv.getBoundingClientRect();
        return r.width > 4 && r.height > 4;
      });
      const doc = document.documentElement;
      const rc = cerrar?.getBoundingClientRect();
      return {
        filas: filas.length,
        conMarcador: filas.filter((li) => /\d+\s*a\s*\d+/.test(li.textContent)).length,
        dibujos: dibujos.length,
        listaScrollea: lista ? lista.scrollHeight > lista.clientHeight : false,
        paginaScrollea: doc.scrollHeight - doc.clientHeight,
        cerrarVisible: !!rc && rc.top >= 0 && rc.bottom <= window.innerHeight,
        seSaleDeAncho: hoja.scrollWidth - hoja.clientWidth,
      };
    });

    const donde = `${etiqueta} con ${cuantos}`;
    if (!m) { falla(donde, "no se abrió la vitrina"); continue; }
    if (m.filas !== 19) falla(donde, `hay ${m.filas} filas y tienen que ser los 19`);
    if (m.conMarcador !== cuantos) {
      falla(donde, `${m.conMarcador} filas muestran marcador y se ganaron ${cuantos}`);
    }
    // un dibujo por trofeo ganado, más la copa del encabezado si estuviera
    if (m.dibujos < cuantos) {
      falla(donde, `sólo se dibujaron ${m.dibujos} objetos de ${cuantos}: se colapsó el SVG`);
    }
    if (m.paginaScrollea > 1) falla(donde, `la página scrollea ${m.paginaScrollea}px`);
    if (m.seSaleDeAncho > 1) falla(donde, `la vitrina se sale de ancho ${m.seSaleDeAncho}px`);
    if (!m.cerrarVisible) falla(donde, "el botón de cerrar quedó fuera de la pantalla");
    if (cuantos === 19 && !m.listaScrollea) {
      falla(donde, "con los 19 la lista tendría que scrollear por dentro");
    }

    await pag.screenshot({ path: path.join(SALIDA, `trofeos-${cuantos}-${etiqueta}.png`) });
  }
  console.log(`  ${etiqueta.padEnd(9)} OK`);
  await ctx.close();
}

/* ══ 2. QUE SE PUEDA SUBIR UN CANTO ════════════════════════════════════════
   Este es el bug reportado. Se canta envido y se espera a que el rival suba;
   cuando sube, tiene que haber un botón para subirle de vuelta, además de
   querer y no querer.

   Se reintenta porque el rival no siempre sube: a veces quiere, a veces no
   quiere, y a veces no tiene con qué. */
console.log("\nsubir un canto que te subieron:");
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const pag = await ctx.newPage();
  let visto = 0;

  /** Los cantos que se pueden apretar ahora mismo, por su `data-canto`. */
  const cantos = (pag) =>
    pag.evaluate(() =>
      [...document.querySelectorAll("[data-canto]")]
        .filter((b) => !b.disabled && b.offsetParent !== null)
        .map((b) => b.dataset.canto),
    );

  for (let intento = 0; intento < 30 && visto < 3; intento++) {
    await abrir(pag, "/jugar/mesa?depto=montevideo");
    await pag.waitForTimeout(3000);

    // abrir el menú y cantar el envido más chico
    if (!(await cantos(pag)).includes("abrir-envido")) continue;
    await pag.locator('[data-canto="abrir-envido"]').click().catch(() => {});
    await pag.waitForTimeout(300);
    if (!(await cantos(pag)).includes("envido")) continue;
    await pag.locator('[data-canto="envido"]').click().catch(() => {});
    await pag.waitForTimeout(2600);

    // ¿me subió? entonces hay algo que contestar
    const ahora = await cantos(pag);
    if (!ahora.includes("quiero")) continue;

    /* Lo que se verifica: contestar NO puede ser lo único. Si te subieron el
       envido tiene que quedar algo para subirle —o la flor, que lo anula—.
       Arriba de la falta envido no hay nada, y ése es el único caso legítimo
       en que sólo se puede querer o no querer. */
    const puedeSubir = ahora.some((c) =>
      ["envido", "real-envido", "falta-envido", "truco", "flor", "con-flor-envido", "contraflor-al-resto"].includes(c),
    );
    /* EL ÚNICO CASO EN QUE NO HAY NADA PARA SUBIR Y ESTÁ BIEN: arriba de la
       falta envido y de la contraflor al resto no existe canto mayor, así que
       ahí contestar ES la jugada. La primera versión de esta prueba no lo
       distinguía y marcaba como bug lo que era la regla. */
    const pendiente = (await pag.getAttribute("[data-pendiente]", "data-pendiente")) ?? "";
    const topeDeLaCadena = /falta-envido|contraflor-al-resto/.test(pendiente);

    visto++;
    if (!puedeSubir && !topeDeLaCadena) {
      falla("mesa", `te subieron y no hay con qué subir. Cantos: ${ahora.join(" · ")}`);
      await pag.screenshot({ path: path.join(SALIDA, "falla-no-se-puede-subir.png") });
    } else {
      console.log(`  OK  ${pendiente} → quedan: ${ahora.join(" · ")}`);
      await pag.screenshot({ path: path.join(SALIDA, `subir-${visto}.png`) });
    }
  }
  if (visto === 0) console.log("  (no se llegó a que el rival suba un canto)");
  await ctx.close();
}

/* ══ 3. QUE LA MESA SE LEVANTE AL TERMINAR LA MANO ═════════════════════════
   Se juega hasta que se cierre una mano y se mira qué pasa: a los 2 segundos
   las cartas se van al mazo, y recién después aparece el cartel. Lo que se
   verifica es que el cartel NO tape la mesa antes de tiempo, que era lo que
   hacía invisible a la última baza. */
console.log("\nlevantar la mesa al terminar la mano:");
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const pag = await ctx.newPage();
  let listo = false;

  for (let intento = 0; intento < 12 && !listo; intento++) {
    await abrir(pag, "/jugar/mesa?depto=montevideo");
    await pag.waitForTimeout(2600);

    for (let i = 0; i < 3; i++) {
      const cartas = pag.locator(".mano-abanico button:not([disabled])");
      if ((await cartas.count()) === 0) break;
      await cartas.first().click().catch(() => {});
      await pag.waitForTimeout(1400);
      const cartel = await pag.getByRole("button", { name: /Siguiente mano|Otra contra/ }).count();
      if (cartel) break;
      /* SE CERRÓ LA MANO DE VERDAD, que no es lo mismo que "no puedo jugar":
         mientras piensa el rival tampoco podés, y la primera versión de esta
         prueba confundía las dos cosas y esperaba un cartel que no iba a venir. */
      const fase = await pag.getAttribute("[data-fase]", "data-fase").catch(() => null);
      if (fase && fase !== "jugando") {
        listo = true;
        await pag.screenshot({ path: path.join(SALIDA, "fin-1-se-ve-la-mesa.png") });
        await pag.waitForTimeout(2300); // ya barrió
        await pag.screenshot({ path: path.join(SALIDA, "fin-2-barriendo.png") });
        await pag.waitForTimeout(900);
        const cartelDespues = await pag
          .getByRole("button", { name: /Siguiente mano|Otra contra/ })
          .count();
        await pag.screenshot({ path: path.join(SALIDA, "fin-3-cartel.png") });
        if (!cartelDespues) falla("fin de mano", "el cartel no llegó a aparecer");
        else console.log("  OK  se ve la mesa, se barre y después viene el cartel");
        break;
      }
    }
  }
  if (!listo) console.log("  (no se llegó a cerrar una mano sin cartel de por medio)");
  await ctx.close();
}

/* ══ 4. LOS TANTOS QUE SE ENSEÑAN AL CERRAR LA MANO ════════════════════════
   Cuando la mano se corta antes de jugarse las seis cartas y hubo un tanto
   cantado, se enseña "Acá está mi envido" con los números, abajo del medallón.

   Lo que se verifica no es que aparezca —eso ya lo prueba
   `lib/tantos-al-cierre.test.ts`, y sin navegador— sino las TRES cosas que sólo
   se ven en la pantalla de verdad:

     · que no se le monte a la libreta, que en la compu cae de ese mismo lado;
     · que no se salga de la escena por el costado ni por abajo;
     · que el texto no quede cortado adentro del cartel.

   El camino para llegar al caso: cantar el envido, que se quiera, y después
   cantar truco hasta que el rival no lo quiera. Ahí la mano se cierra con las
   cartas todavía en la mano, que es exactamente cuando hay algo que enseñar.
   Se reintenta porque nada de eso depende de nosotros. */
console.log("\nlos tantos al cerrar la mano:");
for (const [ancho, alto] of [
  [390, 844],
  [1440, 900],
]) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto } });
  const pag = await ctx.newPage();
  const etiqueta = `${ancho}x${alto}`;
  let visto = false;

  const cantos = () =>
    pag.evaluate(() =>
      [...document.querySelectorAll("[data-canto]")]
        .filter((b) => !b.disabled && b.offsetParent !== null)
        .map((b) => b.dataset.canto),
    );
  const apretar = async (canto) => {
    await pag.locator(`[data-canto="${canto}"]`).first().click().catch(() => {});
    await pag.waitForTimeout(1500);
  };

  for (let intento = 0; intento < 25 && !visto; intento++) {
    await abrir(pag, "/jugar/mesa?depto=montevideo");
    await pag.waitForTimeout(2800);

    // el tanto: la flor si la hay, y si no el envido
    let hay = await cantos();
    if (hay.includes("flor")) await apretar("flor");
    else if (hay.includes("abrir-envido")) {
      await pag.locator('[data-canto="abrir-envido"]').click().catch(() => {});
      await pag.waitForTimeout(300);
      await apretar("envido");
    } else continue;

    // si me contestaron subiendo, se quiere y listo: lo que importa es que se juegue
    if ((await cantos()).includes("quiero")) await apretar("quiero");

    /* Y ahora a cortar la mano: truco hasta que no lo quieran. Si lo quieren se
       sigue tirando cartas, que también puede cerrarla con cartas en la mano
       cuando alguien gana las dos primeras bazas. */
    for (let paso = 0; paso < 6; paso++) {
      const fase = await pag.getAttribute("[data-fase]", "data-fase").catch(() => null);
      if (fase && fase !== "jugando") break;
      hay = await cantos();
      if (hay.includes("quiero")) await apretar("quiero");
      else if (hay.includes("truco")) await apretar("truco");
      else {
        const cartas = pag.locator(".mano-abanico button:not([disabled])");
        if ((await cartas.count()) === 0) break;
        await cartas.first().click().catch(() => {});
        await pag.waitForTimeout(1500);
      }
    }

    const m = await pag.evaluate(() => {
      const cartel = document.querySelector("[data-tantos]");
      if (!cartel) return null;
      const caja = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { arriba: r.top, abajo: r.bottom, izq: r.left, der: r.right };
      };
      const escena = document.querySelector('[data-mesa="tabla"]')?.closest(".penumbra");
      return {
        clase: cartel.dataset.tantos,
        cartel: caja(cartel),
        libreta: caja(document.querySelector('[data-mesa="libreta"]')),
        escena: caja(escena),
        /* ¿El TEXTO entra en el papel?
           ── OJO: NO SE MIDE CON `scrollHeight`, Y ESO COSTÓ UNA FALLA ─────
           Así estaba, y daba positivo siempre que la puntita del papel miraba
           hacia ABAJO —o sea en TU cartel y no en el de él—. La puntita es un
           `<span>` `absolute` girado 45° que SALE de la caja a propósito: es la
           punta que apunta a quien está enseñando. Medido: se pasa 7,3px, que
           son exactamente los que separaban `scroll=66` de `client=59`.

           Un adorno que se sale por diseño no es un texto cortado. Es la misma
           lección que ya dejó `mirar-rivales.mjs` tres veces —medía el
           medallón, medía la libreta, medía una franja demasiado gruesa—: una
           herramienta que mide de más da falsos positivos, y un falso positivo
           tapa el defecto de verdad.

           Ahora se miran LOS HIJOS EN FLUJO, que son el título y la fila de
           números: si alguno se pasa del borde interior del papel, ahí sí el
           texto está cortado. */
        cortadoAncho: (() => {
          const r = cartel.getBoundingClientRect();
          return [...cartel.children]
            .filter((el) => getComputedStyle(el).position !== "absolute")
            .some((el) => {
              const h = el.getBoundingClientRect();
              return h.right > r.right + 1 || h.left < r.left - 1;
            });
        })(),
        cortadoAlto: (() => {
          const r = cartel.getBoundingClientRect();
          return [...cartel.children]
            .filter((el) => getComputedStyle(el).position !== "absolute")
            .some((el) => {
              const h = el.getBoundingClientRect();
              return h.bottom > r.bottom + 1 || h.top < r.top - 1;
            });
        })(),
        texto: cartel.textContent.trim().replace(/\s+/g, " "),
      };
    });

    if (!m) continue;
    visto = true;

    const solapan = (a, b) =>
      a && b && a.izq < b.der && a.der > b.izq && a.arriba < b.abajo && a.abajo > b.arriba;

    if (solapan(m.cartel, m.libreta)) {
      falla(etiqueta, `el cartel de tantos se le monta a la libreta`);
    }
    if (m.escena && (m.cartel.der > m.escena.der + 1 || m.cartel.izq < m.escena.izq - 1)) {
      falla(etiqueta, `el cartel de tantos se sale de la escena de costado`);
    }
    if (m.escena && m.cartel.abajo > m.escena.abajo + 1) {
      falla(etiqueta, `el cartel de tantos se sale de la escena por abajo`);
    }
    if (m.cortadoAncho) falla(etiqueta, `el texto del cartel queda cortado de ancho`);
    if (m.cortadoAlto) falla(etiqueta, `el texto del cartel queda cortado de alto`);

    await pag.screenshot({ path: path.join(SALIDA, `tantos-${etiqueta}.png`) });
    console.log(
      `  ${etiqueta.padEnd(9)} ${m.clase.padEnd(6)} "${m.texto}"  ` +
        `${Math.round(m.cartel.der - m.cartel.izq)}x${Math.round(m.cartel.abajo - m.cartel.arriba)}px` +
        `${m.libreta ? " · con libreta en pantalla" : ""}`,
    );
  }
  if (!visto) console.log(`  ${etiqueta.padEnd(9)} (no se llegó a cerrar una mano con tanto cantado)`);
  await ctx.close();
}

await nav.close();
console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} PROBLEMAS`);
process.exit(fallos === 0 ? 0 : 1);
