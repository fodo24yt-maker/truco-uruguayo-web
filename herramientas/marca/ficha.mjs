/**
 * El armado de la ficha de Play: las seis slides, el gráfico destacado y los
 * logos con letras. Lo usa `herramientas/branding.mjs`; acá no se saca ninguna
 * captura ni se escribe ningún archivo: sólo se arma HTML.
 *
 * ── El diseño: "Departamento" ─────────────────────────────────────────────
 *
 * Elegido el 18/10/2026 entre veintiséis propuestas (ver `Historial.md`). Cada
 * slide es una FIGURITA: el borde blanco, la banda de arriba con el número y
 * el escudo, la foto en el medio y el pie abajo. En las slides de los rivales,
 * al lado de su cara está el Uruguay con SU departamento pintado y un alfiler.
 *
 * Y la historia va en este orden, porque la app es primero para aprender:
 *
 *   1. Aprendé de cero: la guía y un ejercicio ya respondido.
 *   2. Dos formas de jugar: Partida rápida o la Gira Nacional.
 *   3. Vencelos uno a uno: la Gira, con la historia del rival abierta.
 *   4. Cada rival juega distinto.
 *   5. La mesa te ayuda: la ayuda avisa la flor.
 *   6. ¡Ganaste la partida!
 *
 * ── Lo que dicen los textos sale de la app ────────────────────────────────
 *
 *   - "8 lecciones · 12 ejercicios": `lib/lecciones`, `EJERCICIOS` en `lib/aprendido.ts`;
 *   - "te dice si acertaste y por qué": `components/Ejercicio.tsx`;
 *   - "el rival que elijas": el menú "¿Cómo querés jugar?" de la propia captura;
 *   - nombre, departamento, parada y estrellas: `lib/gira.ts`, leídos al armar;
 *   - "Tenés flor: 36" y "31 a 1": `branding.mjs` comprueba que la captura lo
 *     muestre antes de usarla.
 *
 * Las tipografías (Big Shoulders Display y Archivo) salen de Google Fonts al
 * armar. Tienen licencia OFL. La app no las usa: son de la ficha.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { C, escudo } from "./escudo.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(AQUI, "..", "..");

const { DEPARTAMENTOS, LIENZO, SILUETA } = await import(path.join(REPO, "lib", "mapa-uruguay.ts"));
const { porSlugDeDepartamento } = await import(path.join(REPO, "lib", "gira.ts"));

export { C };

/* ── Las tipografías ────────────────────────────────────────────────────── */

const FUENTES = ["Big Shoulders Display:wght@800;900", "Archivo:wght@600;700;800"];
const fuentesLink = () =>
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${FUENTES.map((f) => "family=" + f.replace(/ /g, "+")).join("&")}&display=block">`;

/**
 * Una tipografía metida ADENTRO de un SVG, para que el archivo del logo se vea
 * igual en cualquier compu y sin internet. Se guarda la primera vez en
 * `cache` (que tiene que estar adentro de una carpeta ignorada). El nombre del
 * archivo sale de la familia y el peso, limpiados: nunca de algo de afuera.
 */
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
export async function fuenteEmbebida(familia, peso, cache) {
  const archivo = path.join(cache, `${familia.replace(/[^A-Za-z0-9]/g, "-")}-${Number(peso)}.css`);
  try { return await readFile(archivo, "utf8"); } catch {}
  const traer = async (url, opciones = {}) => {
    const r = await fetch(url, { ...opciones, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`No pude bajar ${url}: HTTP ${r.status}`);
    return r;
  };
  const css = await (await traer(`https://fonts.googleapis.com/css2?family=${familia.replace(/ /g, "+")}:wght@${peso}&display=block`, { headers: { "User-Agent": UA } })).text();
  const bloques = css.split("@font-face").slice(1);
  const latino = bloques.find((b) => /U\+0000-00FF/.test(b)) ?? bloques.at(-1);
  /* Sólo se acepta una dirección de fonts.gstatic.com: lo que se baja va a
     parar adentro de un archivo. */
  const m = latino && latino.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
  if (!m) throw new Error(`No encontré la tipografía ${familia} ${peso}`);
  const b64 = Buffer.from(await (await traer(m[1])).arrayBuffer()).toString("base64");
  const regla = `@font-face{font-family:'${familia}';font-weight:${peso};src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  await mkdir(cache, { recursive: true });
  await writeFile(archivo, regla);
  return regla;
}

/* ── Piezas sueltas ─────────────────────────────────────────────────────── */

export function pagina({ ancho, alto, css = "", cuerpo = "", fondo = "#000" }) {
  return `<!doctype html><html><head><meta charset="utf-8">${fuentesLink()}
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${ancho}px;height:${alto}px;overflow:hidden;background:${fondo}}
body{position:relative;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.abs{position:absolute}
${css}
</style></head><body>${cuerpo}</body></html>`;
}

/** Un teléfono alrededor de una captura 9:16. `ancho` es el del aparato entero. */
function telefono({ src, ancho, x, y, giro = 0, bisel = 14, radio = 52 }) {
  const alto = Math.round(((ancho - bisel * 2) * 16) / 9) + bisel * 2;
  return `<div class="abs" style="left:${x}px;top:${y}px;width:${ancho}px;height:${alto}px;border-radius:${radio}px;padding:${bisel}px;background:${C.marino};box-shadow:0 30px 60px rgba(13,35,64,.4),0 0 0 6px ${C.blanco};transform:rotate(${giro}deg)">
  <div style="position:relative;width:100%;height:100%;border-radius:${radio - bisel}px;overflow:hidden;background:#000">
    <img src="${src}" style="display:block;width:100%;height:100%;object-fit:cover"></div></div>`;
}

/** El escudo como `<svg>` suelto, de `ancho` píxeles. */
const escudoSVG = (ancho, opciones = {}) =>
  `<svg viewBox="-12 -12 430 500" style="width:${ancho}px;height:auto;display:block;overflow:visible">${escudo(1, { sombra: false, ...opciones })}</svg>`;

/** La cinta de abajo del escudo, con el nombre. Lleva letras: no va en `lib/escudo.ts`. */
const cinta = (W, H, k = 1) => `<g transform="translate(${W / 2} ${H * 0.98})">
  <path d="M${-W * 0.62} ${-28 * k} L${W * 0.62} ${-28 * k} L${W * 0.56} ${30 * k} L${-W * 0.56} ${30 * k}Z" fill="${C.marino}"/>
  <text y="${16 * k}" text-anchor="middle" font-family="Big Shoulders Display" font-weight="900" font-size="${52 * k}" letter-spacing="${6 * k}" fill="${C.blanco}">TRUCO URUGUAYO</text></g>`;

/**
 * Los logos con letras. `estilo` es el `<style>` con las tipografías metidas
 * (para los archivos sueltos); en las páginas no hace falta, ya las cargan.
 */
export function logo({ horizontal = false, estilo = "", tinta = C.marino, segunda = C.celesteHondo } = {}) {
  if (horizontal) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 560">${estilo}
      <g transform="translate(60 30)">${escudo(1, { id: "logo-h" })}</g>
      <text x="520" y="280" font-family="Big Shoulders Display" font-weight="900" font-size="250" fill="${tinta}">TRUCO</text>
      <text x="526" y="390" font-family="Big Shoulders Display" font-weight="800" font-size="110" letter-spacing="14" fill="${segunda}">URUGUAYO</text></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 720">${estilo}
    <g transform="translate(250 60) scale(1.25)">${escudo(1, { id: "logo-v" })}${cinta(400, 470)}</g></svg>`;
}

/** El escudo solo, sin letras: el que se usa como marca chica. */
export const escudoSuelto = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 440 510">${escudo(1, { id: "escudo-suelto" })}</svg>`;

/* ── Los rivales ────────────────────────────────────────────────────────── */

/** Lo que la ficha muestra de un rival, leído del juego. */
export function rival(slug) {
  const p = porSlugDeDepartamento(slug);
  if (!p) throw new Error(`No hay rival en el departamento "${slug}"`);
  return { depto: slug, paso: p.paso, nombre: p.nombre, lugar: p.departamento, estrellas: p.dificultad };
}

/* ── El mapa ────────────────────────────────────────────────────────────── */

/** El Uruguay con un departamento pintado y un alfiler en su centro. Del mismo mapa de la Gira. */
function mapaConAlfiler(nombre, ancho) {
  const d = DEPARTAMENTOS.find((x) => x.nombre === nombre);
  if (!d) throw new Error(`No hay departamento "${nombre}" en el mapa`);
  const k = ancho / LIENZO.ancho;
  const [cx, cy] = d.centro;
  const deps = DEPARTAMENTOS.map((x) => `<path d="${x.forma}" fill="${x.nombre === nombre ? C.sol : "rgba(255,255,255,.22)"}" stroke="rgba(255,255,255,.75)" stroke-width="3" stroke-linejoin="round"/>`).join("");
  return `<div style="position:relative;width:${ancho}px">
    <svg viewBox="0 0 ${LIENZO.ancho} ${LIENZO.alto}" style="width:${ancho}px;height:auto;display:block;overflow:visible">
      <path d="${SILUETA}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="10" stroke-linejoin="round"/>${deps}</svg>
    <svg class="abs" style="left:${cx * k - 22}px;top:${cy * k - 58}px;overflow:visible" width="44" height="60" viewBox="0 0 44 60">
      <path d="M22 58 C22 58 4 34 4 22 A18 18 0 0 1 40 22 C40 34 22 58 22 58Z" fill="${C.marino}" stroke="#fff" stroke-width="4"/>
      <circle cx="22" cy="22" r="7" fill="${C.sol}"/></svg></div>`;
}

/* ── Las slides ─────────────────────────────────────────────────────────── */

/**
 * La historia. `cap` son las capturas ya leídas (data: URIs) y `caras` las
 * caras de los rivales en SVG, por departamento.
 */
export function historia(cap) {
  return [
    { nombre: "aprende", titular: "Aprendé<br>de cero", telefonos: [cap.aprender, cap["ejercicio-resuelto"]],
      pie: { b: "8 lecciones · 12 ejercicios", span: "Te dice si acertaste y por qué" } },
    { nombre: "como-jugar", titular: "Dos formas<br>de jugar", telefonos: [cap.jugar],
      pie: { b: "Partida rápida o Gira", span: "Contra la compu: el rival que elijas, o los 19 en orden" } },
    { nombre: "uno-a-uno", titular: "Vencelos<br>uno a uno", rival: "rocha", telefonos: [cap["gira-historia"]],
      pie: { rival: true, span: "cada uno con su historia" } },
    { nombre: "cada-rival", titular: "Cada rival<br>juega distinto", rival: "cerro-largo", telefonos: [cap["mesa-cerro-largo"]],
      pie: { rival: true, span: "el último" } },
    { nombre: "la-mesa-te-ayuda", titular: "La mesa<br>te ayuda", rival: "salto", telefonos: [cap["mesa-salto"]],
      pie: { b: "“Tenés flor: 36”", span: "La ayuda te avisa qué cantar. Se apaga cuando quieras." } },
    { nombre: "ganaste", titular: "¡Ganaste<br>la partida!", rival: "montevideo", telefonos: [cap.victoria],
      pie: { b: "31 a 1", span: "Y te llevás el premio de Montevideo" } },
  ];
}

/* Las medidas del panel de la figurita (la foto), en píxeles de la slide de 1080 x 1920. */
const PANEL = { w: 968, h: 1808, banda: 380, pie: 270 };

const BRILLANTE = "conic-gradient(from 140deg,#f4c430,#fff3b0,#5aa6e0,#c9e6ff,#f4c430,#ffe27a,#5aa6e0,#f4c430)";

const CSS_SLIDE = `
  .hoja{position:absolute;left:30px;top:30px;right:30px;bottom:30px;border-radius:52px;background:${C.blanco};padding:26px;box-shadow:0 20px 40px rgba(13,35,64,.35)}
  .hoja.brillante{background:${BRILLANTE}}
  .panel{position:relative;width:100%;height:100%;border-radius:30px;overflow:hidden;background:radial-gradient(circle at 50% 45%,#9fd0f5,${C.celesteHondo} 78%)}
  .panel::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(180deg,transparent 0 96px,rgba(255,255,255,.13) 96px 192px)}
  .banda{position:absolute;left:0;right:0;top:0;height:${PANEL.banda}px;background:${C.marino};z-index:2}
  .numero{position:absolute;left:44px;top:34px;font:900 110px/1 'Big Shoulders Display';color:${C.sol}}
  .titular{position:absolute;left:44px;right:44px;top:156px;font:900 112px/.88 'Big Shoulders Display';color:${C.blanco};text-transform:uppercase}
  .pie{position:absolute;left:0;right:0;bottom:0;height:${PANEL.pie}px;background:${C.blanco};border-top:10px solid ${C.sol};z-index:2;padding:34px 44px 0}
  .pie b{display:block;font:900 84px/1 'Big Shoulders Display';color:${C.marino};text-transform:uppercase;white-space:nowrap}
  .pie span{display:flex;justify-content:space-between;gap:20px;font:800 32px/1.25 Archivo;color:${C.celesteHondo};margin-top:16px}
  .pie span i{font-style:normal} .pie .estrellas{color:${C.solHondo};white-space:nowrap}
  .chip{position:absolute;z-index:2;background:${C.marino};color:${C.blanco};font:800 26px Archivo;letter-spacing:.06em;text-transform:uppercase;padding:10px 18px;border-radius:999px;white-space:nowrap}
  .chip em{font-style:normal;color:${C.sol};margin-left:8px}
`;

/** El medio de la figurita: los teléfonos, y con rival, el mapa y su cara. */
function medio(s, r, caras) {
  if (s.telefonos.length === 2) {
    return telefono({ src: s.telefonos[0], x: 24, y: 500, ancho: 470, giro: -6 }) + telefono({ src: s.telefonos[1], x: 476, y: 524, ancho: 470, giro: 5 });
  }
  if (!r) return telefono({ src: s.telefonos[0], x: 206, y: 420, ancho: 520 });
  const t = 560;
  const lado = PANEL.h - PANEL.pie - t + 6;
  return `${telefono({ src: s.telefonos[0], x: 16, y: 420, ancho: 500, giro: -4 })}
    <div class="abs" style="left:540px;top:420px">${mapaConAlfiler(r.lugar, 400)}</div>
    <div class="abs" style="left:450px;top:${lado}px;width:${t}px;height:${t}px;z-index:1">${caras[r.depto].replace("<svg ", '<svg style="width:100%;height:100%;display:block" ')}</div>
    ${s.pie.rival ? "" : `<div class="chip" style="right:30px;top:${lado + 420}px">${r.nombre}<em>${"★".repeat(r.estrellas)}</em></div>`}`;
}

export function slide(s, n, caras) {
  const r = s.rival ? rival(s.rival) : null;
  const pie = s.pie.rival
    ? `<b>${r.nombre}</b><span><i>${r.lugar} · parada ${r.paso} de 19 · ${s.pie.span}</i><i class="estrellas">${"★".repeat(r.estrellas)}</i></span>`
    : `<b>${s.pie.b}</b><span><i>${s.pie.span}</i></span>`;
  return pagina({
    ancho: 1080, alto: 1920, fondo: C.celesteHondo, css: CSS_SLIDE,
    cuerpo: `<div class="abs" style="inset:0;background:linear-gradient(160deg,${C.celeste},${C.celesteHondo})"></div>
      <div class="hoja${r?.estrellas === 5 ? " brillante" : ""}"><div class="panel">
        <div class="banda"><div class="numero">${String(n).padStart(2, "0")}</div>
          <div class="abs" style="right:40px;top:30px">${escudoSVG(118, { id: `banda${n}` })}</div>
          <div class="titular">${s.titular}</div></div>
        ${medio(s, r, caras)}
        <div class="pie">${pie}</div>
      </div></div>`,
  });
}

/* ── El gráfico destacado ───────────────────────────────────────────────── */

const CSS_FIGU = `
  .figu{position:absolute;width:380px;height:540px;border-radius:24px;background:${C.blanco};padding:14px;box-shadow:0 30px 50px rgba(13,35,64,.38)}
  .figu.brillante{background:${BRILLANTE}}
  .figu .marco{position:relative;width:100%;height:100%;border-radius:14px;overflow:hidden;background:radial-gradient(circle at 50% 38%,#9fd0f5,${C.celesteHondo} 75%)}
  .figu .marco::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(180deg,transparent 0 46px,rgba(255,255,255,.14) 46px 92px)}
  .figu .arriba{position:absolute;left:0;right:0;top:0;height:74px;background:${C.marino};display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 16px;z-index:2}
  .figu .num{font:900 60px/1 'Big Shoulders Display';color:${C.sol}}
  .figu .cara{position:absolute;left:7%;right:7%;top:84px;bottom:118px}
  .figu .pie{position:absolute;left:0;right:0;bottom:0;height:118px;background:${C.blanco};padding:10px 16px 0;z-index:2;border-top:6px solid ${C.sol}}
  .figu .pie b{display:block;font:900 50px/1 'Big Shoulders Display';color:${C.marino};text-transform:uppercase;white-space:nowrap}
  .figu .pie span{display:flex;justify-content:space-between;font:800 21px Archivo;letter-spacing:.05em;color:${C.celesteHondo};text-transform:uppercase;margin-top:8px}
  .figu .pie span i{font-style:normal} .figu .estrellas{color:${C.solHondo}}
  .figu .etiqueta{position:absolute;right:10px;top:84px;z-index:4;font:800 16px Archivo;letter-spacing:.14em;color:${C.marino};background:${C.sol};padding:5px 10px;border-radius:999px}
`;

/** Una figurita de rival: número de parada, escudito, cara, nombre, departamento y estrellas. */
function figurita(slug, caras, { x, y, giro = 0, escala = 1 }) {
  const r = rival(slug);
  const brilla = r.estrellas === 5;
  return `<div class="figu${brilla ? " brillante" : ""}" style="left:${x}px;top:${y}px;transform:rotate(${giro}deg) scale(${escala});transform-origin:center">
    <div class="marco">
      <div class="arriba"><span class="num">${String(r.paso).padStart(2, "0")}</span>${escudoSVG(50, { id: `figu-${slug}` })}</div>
      ${brilla ? `<div class="etiqueta">BRILLANTE</div>` : ""}
      <div class="cara">${caras[slug].replace("<svg ", '<svg style="width:100%;height:100%;display:block" ')}</div>
      <div class="pie"><b>${r.nombre}</b><span><i>${r.lugar}</i><i class="estrellas">${"★".repeat(r.estrellas)}</i></span></div>
    </div></div>`;
}

export function destacado(caras) {
  return pagina({
    ancho: 1024, alto: 500, fondo: C.celesteHondo, css: CSS_FIGU,
    cuerpo: `<div class="abs" style="inset:0;background:linear-gradient(160deg,${C.celeste},${C.celesteHondo})"></div>
      <div class="abs" style="left:26px;top:40px;width:500px;height:420px;border-radius:30px;background:${C.blanco};padding:12px;box-shadow:0 16px 30px rgba(13,35,64,.3)">
        <div style="width:100%;height:100%;border-radius:20px;background:${C.blanco};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px">
          ${logo({ horizontal: true }).replace("<svg ", '<svg style="width:420px;height:auto" ')}
          <div style="font:800 25px/1.25 Archivo;color:${C.celesteHondo};text-align:center">Aprendé de cero y jugá<br>contra los 19 rivales de la Gira</div></div></div>
      <div class="abs" style="left:540px;top:118px">${mapaConAlfiler("Cerro Largo", 236)}</div>
      ${figurita("cerro-largo", caras, { x: 690, y: -20, giro: 6, escala: 0.64 })}`,
  });
}

/** Los rivales que aparecen en la ficha: son las caras que hay que sacar. */
export const CARAS_NECESARIAS = ["montevideo", "rocha", "salto", "cerro-largo"];

