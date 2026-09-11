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
      /* ── LOS CONTROLES DE SONIDO ────────────────────────────────────
         Desde el 10/9/2026 el panel tiene las cuatro barras y el interruptor
         de silenciar. Se cuentan acá porque son el tipo de cosa que
         desaparece sin que nadie se entere: no rompen ninguna otra pantalla,
         no rompen el build y no rompen ningún test del motor.

         Y se mide el ALTO de la barra, que no es un detalle estético: un
         `<input type=range>` por defecto mide unos 16px y con el dedo en un
         celular eso no se agarra. Es lo mismo que se le exige a cualquier
         botón de la mesa. */
      const barras = panel.locator('input[type="range"]');
      const cuantas = await barras.count();
      if (cuantas !== 4) falla(etiqueta, `hay ${cuantas} barras de sonido y tienen que ser 4`);
      for (const cual of ["general", "musica", "voces", "efectos"]) {
        if (!(await panel.locator(`#volumen-${cual}`).count())) {
          falla(etiqueta, `falta la barra de ${cual}`);
        }
      }
      if (!(await panel.locator('[role="switch"]').count())) {
        falla(etiqueta, "falta el interruptor de silenciar todo");
      }
      if (cuantas > 0) {
        const alto = await barras
          .first()
          .evaluate((el) => Math.round(el.getBoundingClientRect().height));
        if (alto < 32) falla(etiqueta, `la barra de sonido mide ${alto}px: no se agarra con el dedo`);
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

/* ══ 1ter. QUE EL VOLUMEN SOBREVIVA A CERRAR LA APP ════════════════════════
   Las cuatro barras se mueven aunque no estén guardando nada: lo único que
   distingue un control de un adorno es que lo que elegiste siga ahí mañana.

   Se prueba como lo vive una persona —mover, cerrar la app, volver a abrirla—
   y no leyendo `localStorage`, porque leer la clave probaría que ALGO se
   escribió y no que el panel lo vuelve a mostrar. Igual se imprime lo que
   quedó guardado, que es lo que sirve cuando esto falla.

   Y de paso queda verificado que silenciar NO pisa los volúmenes: la música
   tiene que seguir en 25 con el silencio puesto. */
console.log("\nel volumen se guarda:");
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const pag = await ctx.newPage();
  const antes = fallos;

  const abrirPanel = async () => {
    const panel = pag.locator('[role="dialog"][aria-modal="true"]');
    if (!(await panel.count())) {
      await pag.locator('header.barra-app button[aria-label="Ajustes"]').click();
      await panel.waitFor({ timeout: 3000 }).catch(() => {});
    }
    return panel;
  };

  await abrir(pag, "/");
  const panel = await abrirPanel();
  if (!(await panel.count())) {
    falla("guardado", "no se pudo abrir el panel para probar el guardado");
  } else {
    const musica = panel.locator("#volumen-musica");
    const arranca = await musica.inputValue();
    await musica.fill("25");
    await musica.dispatchEvent("change");
    await panel.locator('[role="switch"]').click();
    await pag.waitForTimeout(60);

    await pag.reload({ waitUntil: "domcontentloaded" });
    await pag.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const devuelta = await abrirPanel();

    /* SE LEE APENAS APARECE EL PANEL, A PROPÓSITO Y SIN ESPERAR.
       Es lo que destapó el bug del 10/9/2026: los volúmenes se leían en un
       `useEffect`, o sea que el panel se dibujaba un cuadro con los valores de
       fábrica y recién después se corregía. Esperar acá lo habría tapado.

       Y si sale mal se vuelve a mirar despacio, porque son DOS fallas
       distintas con arreglos distintos, y una que diga sólo "no se guardó"
       manda a buscar al lugar equivocado:
         · mal ya y mal después  → no se guardó nada;
         · mal ya y bien después → se guardó, pero el panel lo muestra tarde. */
    const quedo = await devuelta.locator("#volumen-musica").inputValue();
    const callado = await devuelta.locator('[role="switch"]').getAttribute("aria-checked");
    const guardado = await pag.evaluate(() => localStorage.getItem("truco-uy:sonido"));

    if (quedo !== "25" || callado !== "true") {
      await pag.waitForTimeout(400);
      const luego = await devuelta.locator("#volumen-musica").inputValue();
      const calladoLuego = await devuelta.locator('[role="switch"]').getAttribute("aria-checked");

      if (luego === "25" && calladoLuego === "true") {
        falla(
          "guardado",
          `el panel abre con los valores de fábrica y se corrige después ` +
            `(música ${quedo} y a los 400ms ${luego}): leelos AL ABRIR, no en un useEffect`,
        );
      } else {
        if (luego !== "25") {
          falla("guardado", `la música arrancaba en ${arranca}, se movió a 25 y volvió a ${luego}`);
        }
        if (calladoLuego !== "true") falla("guardado", "el silencio no sobrevivió a recargar");
      }
    }
    console.log(`  en localStorage quedó: ${guardado}`);
  }

  if (fallos === antes) console.log("  390x844   OK");
  await ctx.close();
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

/* ══ 4. LO QUE SE ENSEÑA AL CERRAR LA MANO ════════════════════════════════
   Al cerrarse la mano, si quedaron cartas sin ver y hubo envido ganado o flor
   cantada, el juego DA VUELTA lo que le quedaba a quien tiene que mostrar y lo
   apoya sobre la mesa, con un rótulo que dice "ENVIDO EN MESA" o "FLOR EN
   MESA". Los dos tantos en número cuelgan del medallón.

   Hasta el 10/9/2026 esto fue un papelito con los números, y un rato ese mismo
   día fueron dos recuadros con las cartas dibujadas adentro. Los dos se
   descartaron: llenaban la pantalla.

   Lo que se verifica NO es que aparezca —eso lo prueban sin navegador
   `lib/cartas-en-mesa.test.ts` y `lib/tantos-al-cierre.test.ts`— sino las seis
   cosas que sólo se ven en la pantalla de verdad:

     · que las cartas enseñadas EXISTAN cuando corresponde;
     · que no se salgan de la escena por el costado ni por abajo — es el riesgo
       propio de este diseño, porque caen al costado de lo jugado y a `paso`
       fijo, sin recentrar el grupo;
     · que no se le monten a tu mano;
     · que el rótulo no se pise con el registro de lo que dijo el rival, que en
       una pantalla baja ocupa toda la franja de arriba;
     · que la línea de tantos del medallón no empuje al globo del diálogo;
     · y que la mesa no scrollee por nada de esto.

   El camino para llegar al caso: cantar el envido o la flor, que se juegue, y
   después cortar la mano con truco. Se reintenta porque nada de eso depende de
   nosotros. */
console.log("\nlo que se enseña al cerrar la mano:");
/* SI NO SALIÓ EN NINGÚN TAMAÑO, ESO ES UNA FALLA.
   Sin esto, el día que las cartas enseñadas dejaran de dibujarse el bloque
   imprimiría tres veces "(no se llegó a cerrar una mano)" y la herramienta
   seguiría diciendo TODO OK: un guardián que pasa en verde con la función
   borrada. Es el error del 7/9/2026 con `atajos === "Aprender·Jugar"`, que
   quedó mirando cero elementos.
   Puede no salir en UN tamaño por azar del reparto —son 30 intentos y el caso
   depende de que te toque flor o envido— pero que no salga en los tres es otra
   cosa. */
let seEnseñoAlguna = false;
for (const [ancho, alto] of [
  [320, 568],
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

  for (let intento = 0; intento < 30 && !visto; intento++) {
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

    // si me contestaron subiendo, se quiere: lo que importa es que se JUEGUE
    if ((await cantos()).includes("quiero")) await apretar("quiero");

    /* Y ahora a cortar la mano con cartas todavía en la mano, que es cuando hay
       algo que enseñar: truco hasta que no lo quieran. */
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

    // las cartas se apoyan a los 450ms de cerrarse la mano
    await pag.waitForTimeout(900);

    const m = await pag.evaluate(() => {
      const caja = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { arriba: r.top, abajo: r.bottom, izq: r.left, der: r.right };
      };
      const unir = (cajas) =>
        cajas.length === 0
          ? null
          : {
              arriba: Math.min(...cajas.map((c) => c.arriba)),
              abajo: Math.max(...cajas.map((c) => c.abajo)),
              izq: Math.min(...cajas.map((c) => c.izq)),
              der: Math.max(...cajas.map((c) => c.der)),
            };

      const enseñadas = [...document.querySelectorAll('[data-mesa="baza-enseñada"]')].map(caja);
      const rotulo = document.querySelector('[data-mesa="cartel-tantos"]');
      if (enseñadas.length === 0) return null;

      /* El registro de lo que dijo el rival, medido por lo que REALMENTE pinta
         y no por su contenedor: la columna del medallón es `w-[min(78%,340px)]`
         con todo alineado a la derecha, así que su caja ocupa casi toda la
         franja de arriba con la mitad izquierda vacía. Medir el contenedor daba
         falsos positivos, que es el error que `mirar-rivales.mjs` ya cometió
         tres veces. */
      const col = document.querySelector('[data-encima="medallon"]');
      const pinta = [...(col?.querySelectorAll("*") ?? [])].filter(
        (el) =>
          (el.children.length === 0 && el.textContent.trim() !== "") ||
          el.tagName === "IMG" ||
          el.tagName === "svg",
      );

      return {
        cuantas: enseñadas.length,
        cartas: unir(enseñadas),
        rotulo: caja(rotulo),
        textoRotulo: rotulo?.textContent.trim() ?? "",
        dialogo: unir(pinta.map((el) => caja(el)).filter((c) => c && c.der - c.izq > 0)),
        mano: caja(document.querySelector(".mano-abanico")),
        escena: caja(document.querySelector('[data-mesa="tabla"]')?.closest(".penumbra")),
        tantos: document.querySelector("[data-tantos]")?.textContent.trim() ?? "",
        // la franja de los tantos NO puede cambiar de alto: si crece, empuja el globo
        altoTantos: (() => {
          const t = document.querySelector("[data-tantos]");
          return t ? Math.round(t.getBoundingClientRect().height) : 0;
        })(),
        scroll:
          document.documentElement.scrollHeight - document.documentElement.clientHeight,
      };
    });

    if (!m) continue;
    visto = true;
    seEnseñoAlguna = true;

    const solapan = (a, b) =>
      a && b && a.izq < b.der && a.der > b.izq && a.arriba < b.abajo && a.abajo > b.arriba;

    if (m.escena && (m.cartas.der > m.escena.der + 1 || m.cartas.izq < m.escena.izq - 1)) {
      falla(etiqueta, `las cartas enseñadas se salen de la escena de costado`);
    }
    if (m.escena && m.cartas.abajo > m.escena.abajo + 1) {
      falla(etiqueta, `las cartas enseñadas se salen de la escena por abajo`);
    }
    if (solapan(m.cartas, m.mano)) {
      falla(etiqueta, `las cartas enseñadas se le montan a tu mano`);
    }
    if (!m.rotulo) falla(etiqueta, `hay cartas enseñadas pero no salió el rótulo`);
    else if (solapan(m.rotulo, m.dialogo)) {
      falla(etiqueta, `el rótulo "${m.textoRotulo}" se pisa con lo que dijo el rival`);
    }
    /* El alto de la franja de tantos está fijado en el CSS (18px, 20 en `sm`).
       Si alguna vez crece con el contenido, empuja el globo del diálogo hacia
       abajo cada vez que aparece y la mesa salta. */
    if (m.altoTantos > 22) {
      falla(etiqueta, `la línea de tantos creció a ${m.altoTantos}px y va a empujar el globo`);
    }
    if (m.scroll > 1) falla(etiqueta, `la mesa scrollea ${m.scroll}px al enseñar`);

    await pag.screenshot({ path: path.join(SALIDA, `tantos-${etiqueta}.png`) });
    console.log(
      `  ${etiqueta.padEnd(9)} ${String(m.cuantas).padStart(2)} cartas enseñadas · ` +
        `"${m.textoRotulo}" · medallón dice "${m.tantos}" (${m.altoTantos}px)`,
    );
  }
  if (!visto) console.log(`  ${etiqueta.padEnd(9)} (no se llegó a cerrar una mano con tanto cantado)`);
  await ctx.close();
}
if (!seEnseñoAlguna) {
  falla("los tres tamaños", "NUNCA se enseñaron cartas al cerrar la mano");
}

await nav.close();
console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} PROBLEMAS`);
process.exit(fallos === 0 ? 0 : 1);
