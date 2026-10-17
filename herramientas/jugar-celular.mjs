/**
 * El jugador automático: juega partidas en el celular mientras otra
 * herramienta mide.
 *
 *     node herramientas/medir-celular.mjs --sesion 25 --jpeg 90   (en una terminal)
 *     node herramientas/jugar-celular.mjs 25 [ARCHIVO-DE-LOG]       (en otra)
 *     node herramientas/jugar-celular.mjs 25 LOG --variado --control CARPETA/control.txt
 *
 * `--variado` además, cada 40–80 s de mesa, hace UNA de estas cosas: cambia
 * de rival, o sale de la mesa y vuelve a entrar por Partida rápida. Con
 * `--salir-app` también sale de la app (Inicio) y vuelve a abrirla, PERO
 * OJO: el 8/10/2026, de 6 salidas de 8 a 25 s, en UNA MIUI mató la app en
 * segundo plano, y al volver era otro proceso (un arranque en frío). El inspector queda colgado
 * del proceso muerto y la sesión de `medir-celular` deja de recibir nada. Los
 * arranques en frío se miden con una sesión por arranque. Lo pidió Santiago el 8/10/2026:
 * la basura suele salir AL PRINCIPIO, y jugando de corrido mucho rato se mide
 * el momento en que ya se ve bien. Con `--control`, cada una queda anotada en
 * la línea de tiempo de la sesión (`nota …`), para separar después la basura
 * por "segundos desde que se entró".
 *
 * No abre su propio puente: le habla al que levantó `medir-celular.mjs` (el
 * puerto 9223 en la IP de Windows). Así hay UN inspector abierto, y se cierra
 * con la sesión.
 *
 * ── Por qué existe, si el 9/9 se midió que los toques automáticos no sirven ──
 *
 * El 9/9 el rig tocó solo el MENÚ de jugar con `input tap` y de 16 vueltas
 * volvió UNA sucia, contra 14 de 15 con Santiago. Eso sigue siendo cierto
 * para el menú. **En la mesa no**: la noche del 7 al 8/10/2026 este jugador
 * reprodujo la basura en ~10% de los cuadros muestreados de la rama de
 * control (105 de 1073), del mismo orden que con Santiago jugando. Lo que la
 * dispara en la mesa es dibujar (cartas que caen, sombras, cantos), no el
 * ritmo de una mano.
 *
 * Vivía en el temporal de la sesión y se borró con él (es la segunda vez que
 * pasa: el 8/9 se perdió el rig). Por eso ahora está en el repositorio.
 *
 * ── Lo que no se negocia: sólo adentro de la app ─────────────────────────
 *
 * Santiago dio permiso para tocar SU teléfono sólo dentro de la app. Eso se
 * cumple con código, no con cuidado:
 *
 * 1. **El cerrojo antes de CADA toque**: la actividad de arriba tiene que ser
 *    `uy.trucouruguayo.app/.MainActivity` (no la de un anuncio, no otra app) y
 *    la pantalla tiene que estar prendida (`mWakefulness=Awake`). Si no, no
 *    toca.
 * 2. **Un anuncio no se toca**: un toque mal puesto abre el navegador, afuera
 *    de la app. Se cierra con Atrás, que no sale de nuestra app.
 * 3. **Nunca desbloquea el teléfono.** Si se bloqueó, espera.
 * 4. **No toca nada que saque de la mesa** (`NUNCA`): ni salir, ni cambiar de
 *    rival, ni el mapa, ni los videos, ni los legales.
 *
 * Los toques son `input tap` de verdad: necesitan "Depuración USB (ajustes de
 * seguridad)" prendida en el Xiaomi (el permiso `INJECT_EVENTS`). Y como son
 * toques de verdad, mantienen la pantalla despierta; los clics por CDP no
 * cuentan como actividad, y la madrugada del 8/10 el teléfono se bloqueó solo
 * entre dos experimentos. **No apagar el jugador entre ramas.**
 */
import { appendFileSync } from "node:fs";

import { adb, PAQUETE } from "./celular-usb.mjs";
import { ipDeWindows } from "./puente-devtools.mjs";

const posicionales = process.argv.slice(2).filter((a, i, xs) => !a.startsWith("--") && xs[i - 1] !== "--control");
const minutos = Number(posicionales[0] || 10);
const LOG = posicionales[1] || null;
const VARIADO = process.argv.includes("--variado");
const SALIR_APP = process.argv.includes("--salir-app");
const CONTROL = process.argv.includes("--control") ? process.argv[process.argv.indexOf("--control") + 1] : null;
/* `--dedo` (11/10/2026): toca como una persona y no como una máquina. `input
   tap` baja y sube el dedo en el mismo instante; una persona lo deja apoyado
   70–220 ms y no cae siempre en el mismo píxel. Con el toque instantáneo el
   jugador no reprodujo los cuadraditos que Santiago ve jugando, y apoyar el
   dedo cambia lo que se dibuja (el `:active`/`:hover` de la carta tocada). */
const DEDO = process.argv.includes("--dedo");
/* `--rapido` (11/10/2026): juega como Santiago cuando vio los cuadraditos con
   el arreglo puesto: "cuando cantaba truco o tiraba cartas rápido". Toca cada
   0,25–0,7 s en vez de 1,1–2,4 (las animaciones de la mano se pisan unas con
   otras) y canta truco la mitad de las veces que puede, en vez de una de cada
   cuatro. */
const RAPIDO = process.argv.includes("--rapido");
/** Un toque en (X, Y) de pantalla: instantáneo, o con el dedo apoyado. */
const toqueEn = (X, Y) => {
  if (!DEDO) return adb("shell", "input", "tap", String(X), String(Y));
  const x = Math.round(X + azar(-3, 3)), y = Math.round(Y + azar(-3, 3));
  return adb("shell", "input", "swipe", String(x), String(y), String(x), String(y), String(Math.round(azar(70, 220))));
};
/** Una marca en la línea de tiempo de la sesión de `medir-celular.mjs`. */
const nota = (texto) => {
  // Una línea sola: el texto sale de la página, y un salto de línea sería otra orden.
  if (CONTROL) appendFileSync(CONTROL, `nota ${String(texto).replace(/[\r\n]+/g, " ").slice(0, 120)}\n`);
};
const log = (...a) => {
  const linea = `${new Date().toTimeString().slice(0, 8)} ${a.join(" ")}\n`;
  if (LOG) appendFileSync(LOG, linea);
  else process.stdout.write(linea);
};
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const azar = (a, b) => a + Math.random() * (b - a);

const ip = ipDeWindows();
if (!ip) {
  console.error("No encuentro la IP de Windows (ip route show default).");
  process.exit(1);
}
const url = `http://${ip}:9223`;

// ── CDP a mano, contra el puente de la sesión ────────────────────────────

let ws;
let id = 0;
const pendientes = new Map();
async function conectar() {
  const lista = await (await fetch(`${url}/json/list`)).json();
  const pag = lista.find((t) => t.type === "page" && t.url.startsWith("https://localhost"));
  if (!pag) throw new Error("no está la página de la app");
  ws = new WebSocket(pag.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, url.replace("http", "ws")));
  await new Promise((ok, mal) => {
    ws.addEventListener("open", ok);
    ws.addEventListener("error", mal);
  });
  ws.addEventListener("message", (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pendientes.has(d.id)) {
      pendientes.get(d.id)(d);
      pendientes.delete(d.id);
    }
  });
}
const evaluar = (expr) =>
  new Promise((ok) => {
    const i = ++id;
    pendientes.set(i, (d) => ok(d.result?.result?.value));
    ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true } }));
    setTimeout(() => {
      if (pendientes.has(i)) {
        pendientes.delete(i);
        ok(null);
      }
    }, 4000);
  });

/* Lo que se puede tocar: los botones y enlaces visibles y habilitados, con su
   etiqueta (hasta 90 letras: con 40, "Jugando contra <rival>" se cortaba
   antes de la palabra que lo excluye) y si están adentro de la mano. */
const ESTADO = `(() => {
  const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 4 && b.height > 4 && b.bottom > 0 && b.top < innerHeight; };
  const adentro = (e) => { const c = e.closest(".overflow-y-auto"); if (!c) return true; const b = e.getBoundingClientRect(), r = c.getBoundingClientRect(); const y = b.y + b.height / 2; return y > r.top + 8 && y < r.bottom - 8; };
  /* Arriba de todo en su centro: si un cartel lo tapa, tocarlo es tocar el
     cartel (8/10/2026: el de la Gira bloqueada dejó al jugador tocando
     "Partida rápida" debajo de él, sin entrar nunca). */
  const arriba = (e) => { const b = e.getBoundingClientRect(); const h = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return !!h && (h === e || e.contains(h)); };
  const bs = [...document.querySelectorAll("button, a")].filter((e) => vis(e) && adentro(e) && arriba(e) && !e.disabled && getComputedStyle(e).pointerEvents !== "none")
    .map((e) => { const b = e.getBoundingClientRect(); return { t: (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 90), mano: !!e.closest("[data-mano]"), lista: !!e.closest("ul"), x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  return { ruta: location.pathname, dpr: devicePixelRatio, carga: !!document.querySelector("[data-pantalla-carga]"), bs };
})()`;

// ── El cerrojo ───────────────────────────────────────────────────────────

const NUESTRA = `${PAQUETE}/.MainActivity`;
const ANUNCIO = `${PAQUETE}/com.google.android.gms.ads.AdActivity`;

function cerrojo() {
  /* UNA sola llamada al teléfono, con las dos preguntas filtradas allá
     (11/10/2026). Por separado tardaban ~310 ms y, sumado al toque, el
     jugador no bajaba de ~2 s entre toques ni con `--rapido`. Juntas, ~140 ms.
     Es texto fijo: no entra nada de la página en esta línea. */
  const s = adb("shell", "dumpsys activity activities | grep -m1 topResumedActivity; dumpsys power | grep -m1 mWakefulness=").stdout || "";
  const arriba = /topResumedActivity=\S+\s+\S+\s+(\S+)/.exec(s)?.[1] || "";
  const despierta = /mWakefulness=Awake/.test(s);
  return { ok: arriba === NUESTRA && despierta, arriba, despierta };
}

// ── Cómo juega ───────────────────────────────────────────────────────────

/* Lo que no se toca nunca: saca de la mesa, cambia de rival, abre un video o
   sale de la app. "mazo" es "Me voy al mazo": cortaría la mano antes de que
   se dibuje. */
const NUNCA = /salir|ayudas|rival|jugando contra|mazo|video|anuncio|mapa|gira|anotador|aprender|privacidad|t[ée]rminos|legales|desbloque/i;

/** Qué tocar, o `null` si no hay nada. Al azar, pero como juega una persona. */
function elegir(e) {
  const bs = e.bs.filter((b) => !NUNCA.test(b.t));
  const busca = (re) => bs.find((b) => re.test(b.t));
  const ruta = e.ruta.replace(/(.)\/$/, "$1");
  const cerrar = e.bs.find((b) => /^(ahora no|cerrar|cancelar)$/i.test(b.t));
  if (cerrar) return cerrar;
  if (ruta === "/") return busca(/^jugar$/i);
  /* Sin el filtro: la tarjeta dice "…contra el rival que elijas", y "rival"
     está en `NUNCA` (8/10/2026: el jugador se quedaba parado en el menú). */
  if (ruta === "/jugar") return e.bs.find((b) => /partida r[áa]pida/i.test(b.t)) ?? null;
  /* En una pantalla que no es de las suyas (la Gira, una lección), vuelve por
     el enlace de arriba. El 11/10/2026 se quedó 3 minutos en la Gira tocando
     nada, y esa vuelta de la medición se perdió. */
  if (ruta !== "/jugar/mesa") return e.bs.find((b) => /^(jugar|volver|atr[áa]s)$/i.test(b.t)) ?? null;

  const quiero = busca(/^quiero$/i);
  const noQuiero = busca(/^no quiero$/i);
  const cartas = bs.filter((b) => b.mano && /^tirar/i.test(b.t));
  let elegido = null;
  // Responder: tres de cada cuatro veces "Quiero", que es lo que alarga la mano.
  if (quiero || noQuiero) elegido = Math.random() < 0.75 ? quiero || noQuiero : noQuiero || quiero;
  else if (cartas.length) {
    // Una de cada cuatro, cantar si se puede; si no, una carta cualquiera.
    const canto = (RAPIDO && busca(/^(truco|retruco|vale cuatro)$/i)) || busca(/^(envido|truco|retruco|flor)$/i);
    elegido = canto && Math.random() < (RAPIDO ? 0.5 : 0.25) ? canto : cartas[Math.floor(Math.random() * cartas.length)];
  } else elegido = busca(/revancha|otra|de nuevo|seguir|nueva|volver a jugar|siguiente/i);
  // Una respuesta que no conoce (la flor: "Yo también", "Me achico"…): cualquiera de las que hay.
  if (!elegido && bs.length) elegido = bs[Math.floor(Math.random() * bs.length)];
  return elegido;
}

// ── Lo variado: salir y volver a entrar ──────────────────────────────────

/** Tocar con el cerrojo puesto. Devuelve si tocó. */
async function tocar(b, dpr, porque) {
  const c = cerrojo();
  if (!c.ok) return false;
  const X = Math.round(b.x * dpr), Y = Math.round(b.y * dpr);
  toqueEn(X, Y);
  log(`toque (${porque}): "${b.t}" @${X},${Y}`);
  return true;
}

let proximaVariacion = Date.now() + azar(40000, 80000);
async function variar(e) {
  proximaVariacion = Date.now() + azar(40000, 80000);
  const dado = Math.random() * (SALIR_APP ? 1 : 0.7);
  if (dado < 0.35) {
    // Cambiar de rival: el medallón abre la lista, y se elige otro al azar.
    const medallon = e.bs.find((b) => /para cambiar de rival/i.test(b.t));
    if (!medallon || !(await tocar(medallon, e.dpr, "variar"))) return;
    await dormir(1300);
    const e2 = await evaluar(ESTADO);
    const rivales = (e2?.bs ?? []).filter((b) => b.lista && !/desbloque|video/i.test(b.t));
    if (!rivales.length) return;
    const elegido = rivales[Math.floor(Math.random() * rivales.length)];
    if (await tocar(elegido, e2.dpr, "rival nuevo")) nota(`cambia-rival ${elegido.t.split(" ").slice(0, 2).join(" ")}`);
  } else if (dado < 0.7) {
    // Salir de la mesa: el resto del bucle vuelve a entrar por Partida rápida.
    const salir = e.bs.find((b) => /^salir$/i.test(b.t));
    if (salir && (await tocar(salir, e.dpr, "variar"))) {
      nota("sale-de-la-mesa");
      /* Que cambie la pantalla antes de mirar de nuevo. Sin esto (11/10/2026)
         el bucle volvía a leer la MESA, elegía una carta y el toque caía ya en
         el menú, justo sobre la tarjeta de la Gira. */
      await dormir(1800);
    }
  } else {
    // Salir de la app y volver: Inicio y después abrirla de nuevo (sigue viva).
    if (!cerrojo().ok) return;
    adb("shell", "input", "keyevent", "KEYCODE_HOME");
    nota("sale-de-la-app");
    log("Inicio: afuera de la app");
    await dormir(azar(8000, 25000));
    adb("shell", "am", "start", "-n", NUESTRA);
    nota("vuelve-a-la-app");
    log("de vuelta en la app");
    await dormir(1500);
  }
}

// ── El bucle ─────────────────────────────────────────────────────────────

await conectar();
const fin = Date.now() + minutos * 60000;
let sinNada = 0;
let toques = 0;
let ultimaRuta = "";
log(`jugador: ${minutos} min`);
while (Date.now() < fin) {
  let e = null;
  try {
    e = await evaluar(ESTADO);
  } catch {
    /* la página se está recargando */
  }
  if (!e) {
    await dormir(1000);
    try {
      await conectar();
    } catch {
      /* todavía no volvió */
    }
    continue;
  }
  if (e.carga) {
    await dormir(1000);
    continue;
  }
  if (e.ruta !== ultimaRuta) {
    log(`ruta ${e.ruta}`);
    ultimaRuta = e.ruta;
  }
  if (VARIADO && e.ruta.startsWith("/jugar/mesa") && Date.now() > proximaVariacion) {
    await variar(e);
    continue;
  }
  const elegido = elegir(e);
  if (!elegido) {
    if (++sinNada % 15 === 0) log(`nada para tocar en ${e.ruta}: ${e.bs.map((b) => b.t).join(" | ")}`);
    await dormir(700);
    continue;
  }
  sinNada = 0;

  const c = cerrojo();
  if (!c.ok) {
    if (c.arriba === ANUNCIO && c.despierta) {
      adb("shell", "input", "keyevent", "KEYCODE_BACK");
      log("anuncio arriba: Atrás");
      await dormir(4000);
      continue;
    }
    log(`CERROJO: no toco (arriba: ${c.arriba || "?"}, despierta: ${c.despierta})`);
    await dormir(3000);
    continue;
  }
  const X = Math.round(elegido.x * e.dpr);
  const Y = Math.round(elegido.y * e.dpr);
  const r = toqueEn(X, Y);
  const err = ((r.stderr || "") + (r.stdout || "")).trim();
  toques++;
  log(`toque ${toques}: "${elegido.t}" @${X},${Y}${err ? " ✗ " + err.slice(0, 160) : ""}`);
  if (err && /INJECT_EVENTS|SecurityException/.test(err)) {
    log("Android no deja inyectar toques (falta \"Depuración USB (ajustes de seguridad)\"): corto.");
    break;
  }
  // Entre 1,1 y 2,4 s: el ritmo de alguien que mira la mesa antes de tocar.
  await dormir(RAPIDO ? azar(250, 700) : azar(1100, 2400));
}
log(`fin: ${toques} toques`);
ws.close();
process.exit(0);
