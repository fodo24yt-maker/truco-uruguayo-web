/**
 * El banco de pruebas del balance.
 *
 * Nació porque la escala de dificultad estaba dada vuelta —Luquita, el primero,
 * le ganaba a El Turco, el último, el 61% de las veces— y a ojo eso no se ve:
 * hay que jugarlo miles de veces.
 *
 *   node herramientas/medir-bots.mjs              el informe completo
 *   node herramientas/medir-bots.mjs 1200         con más partidas
 *   node herramientas/medir-bots.mjs --matriz     todos contra todos, 19×19
 *   node herramientas/medir-bots.mjs --tasas      cada cuánto canta cada nivel
 *
 * ─── LO QUE MIDE Y LO QUE NO ────────────────────────────────────────────────
 *
 * La tabla contra el SPARRING mide FUERZA: cuál de los dos bots gana.
 * La tabla contra los PERFILES mide DIFICULTAD, que no es lo mismo. Bot contra
 * bot, mentir no rinde —el otro no te lee la mentira—; contra una persona sí. Y
 * al revés: una persona que miente siempre es un regalo para quien la tenga
 * fichada, y eso sólo se ve sentando al bot contra alguien que miente siempre.
 *
 * Ésa es la tabla que dice si las estrellas significan algo.
 *
 * ─── Y LO QUE NO SE HACE MÁS ────────────────────────────────────────────────
 *
 * Ningún número se informa sin su margen de error. El 11/9/2026, barriendo 48
 * combinaciones de umbrales con 900 partidas cada una, la "mejor" dio 76,1%;
 * verificada con 4.000 dio 72,6%. El barrido la había elegido por ruidosa, no
 * por buena. Un banco que no dice cuánto duda invita exactamente a eso.
 */

import { PERSONALIDADES } from "../lib/motor/personalidades.ts";
import {
  NOMBRES_PERFIL,
  PERFILES,
  SPARRING,
  duelo,
  esDiferenciaReal,
  jugarPartida,
  margenDeError,
} from "../lib/motor/banco.ts";

// Se re-exportan para que nada de afuera tenga que saber que se mudaron.
export { jugarPartida, duelo, SPARRING, PERFILES };

const NIVELES = [1, 2, 3, 4, 5];
const pct = (n) => `${n.toFixed(1)}%`;

/** Los rivales de un nivel. */
const delNivel = (n) => PERSONALIDADES.filter((p) => p.dificultad === n);

/**
 * El promedio de winrate de un nivel contra un rival fijo.
 *
 * Devuelve también CUÁNTAS partidas lo respaldan, que no son `partidas` sino
 * `partidas × cuántos rivales tiene el nivel`. Sin eso, comparar dos niveles
 * usa el margen de una casilla suelta y da todo por ruido: ★4 tiene seis
 * rivales y ★5 tiene dos, así que sus promedios no dudan lo mismo.
 */
function promedioNivel(nivel, contra, partidas) {
  const rivales = delNivel(nivel);
  const ws = rivales.map((p) => duelo(p, contra, partidas));
  return { w: ws.reduce((t, x) => t + x, 0) / ws.length, n: partidas * rivales.length };
}

// ─── Los informes ────────────────────────────────────────────────────────────

function contraElSparring(partidas) {
  console.log(`\n━━━ FUERZA: winrate contra el sparring, ${partidas} partidas cada uno`);
  console.log(`    margen de error: ±${margenDeError(partidas).toFixed(1)} puntos\n`);
  console.log("  ★  rival                 gana%");
  console.log("  ─  ────────────────────  ─────");

  const porNivel = new Map();
  for (const persona of PERSONALIDADES) {
    const w = duelo(persona, SPARRING, partidas);
    console.log(`  ${persona.dificultad}  ${persona.nombre.padEnd(21)} ${pct(w).padStart(6)}`);
    if (!porNivel.has(persona.dificultad)) porNivel.set(persona.dificultad, []);
    porNivel.get(persona.dificultad).push({ w, nombre: persona.nombre });
  }
  return porNivel;
}

/**
 * LA TABLA QUE IMPORTA. Cada nivel contra cada forma de jugar de una persona.
 *
 * Se lee por COLUMNAS: de arriba hacia abajo cada número tiene que subir. Una
 * columna que se aplana dice que esos dos niveles, contra ese tipo de jugador,
 * son el mismo bot con distinta cantidad de estrellas.
 */
function contraLosPerfiles(partidas) {
  console.log(`\n━━━ DIFICULTAD: cada nivel contra cada forma de jugar de una persona`);
  console.log(`    ${partidas} partidas por casilla, margen ±${margenDeError(partidas).toFixed(1)}\n`);
  process.stdout.write("     ");
  for (const nombre of NOMBRES_PERFIL) process.stdout.write(PERFILES[nombre].nombre.padStart(11));
  console.log("");

  const tabla = {};
  for (const n of NIVELES) {
    process.stdout.write(`  ★${n} `);
    tabla[n] = {};
    for (const nombre of NOMBRES_PERFIL) {
      tabla[n][nombre] = promedioNivel(n, PERFILES[nombre], partidas);
      process.stdout.write(pct(tabla[n][nombre].w).padStart(11));
    }
    console.log("");
  }

  console.log("\n  Lo que gana cada escalón contra cada perfil (★n − ★n−1):");
  let chatas = [];
  for (const nombre of NOMBRES_PERFIL) {
    const saltos = [];
    for (let n = 2; n <= 5; n++) {
      const arriba = tabla[n][nombre];
      const abajo = tabla[n - 1][nombre];
      saltos.push(arriba.w - abajo.w);
      // El margen de una DIFERENCIA suma las dos varianzas, y cada nivel tiene
      // su propio n. Comparar contra el margen de una sola casilla daba todo
      // por ruido.
      const margen = 1.96 * 50 * Math.sqrt(1 / abajo.n + 1 / arriba.n);
      if (Math.abs(arriba.w - abajo.w) <= margen) {
        chatas.push(`★${n - 1}→★${n} vs ${PERFILES[nombre].nombre} (${(arriba.w - abajo.w).toFixed(1)}, hace falta ±${margen.toFixed(1)})`);
      }
    }
    console.log(
      `    ${PERFILES[nombre].nombre.padEnd(11)} ${saltos.map((d) => (d >= 0 ? "+" : "") + d.toFixed(1)).join("  ")}`,
    );
  }
  if (chatas.length > 0) {
    console.log(`\n  ⚠ Escalones que NO se distinguen del ruido (${chatas.length}):`);
    for (const c of chatas) console.log(`      ${c}`);
  } else {
    console.log("\n  ✔ Todos los escalones se distinguen del ruido.");
  }
  return tabla;
}

/**
 * ¿Hay algún rival fuera de su banda?
 *
 * Ésta es la pregunta que el banco viejo no hacía, y por eso no vio que El
 * Chicharra (★4) le ganaba a El Turco (★5). Que el PROMEDIO de cada nivel suba
 * no alcanza: si el mejor de un nivel le gana al peor del siguiente, las
 * estrellas de esos dos mienten.
 */
function bandas(porNivel, partidas) {
  console.log("\n━━━ ORDEN: ¿hay alguien fuera de su banda?\n");
  let ordenado = true;
  for (const n of NIVELES) {
    const ws = porNivel.get(n);
    const prom = ws.reduce((t, x) => t + x.w, 0) / ws.length;
    const peor = ws.reduce((a, b) => (b.w < a.w ? b : a));
    const mejor = ws.reduce((a, b) => (b.w > a.w ? b : a));
    console.log(
      `  ★${n}: promedio ${pct(prom).padStart(6)}   de ${pct(peor.w)} (${peor.nombre}) a ${pct(mejor.w)} (${mejor.nombre})`,
    );
  }
  console.log("");
  for (let n = 2; n <= 5; n++) {
    const abajo = porNivel.get(n - 1).reduce((a, b) => (b.w > a.w ? b : a));
    const arriba = porNivel.get(n).reduce((a, b) => (b.w < a.w ? b : a));
    if (abajo.w >= arriba.w) {
      ordenado = false;
      console.log(
        `  ✖ ${abajo.nombre} (★${n - 1}, ${pct(abajo.w)}) le pasa a ${arriba.nombre} (★${n}, ${pct(arriba.w)})`,
      );
    }
  }
  console.log(ordenado ? "  ✔ Las cinco bandas están separadas." : "");
  return ordenado;
}

/** Todos contra todos. Lo más caro y lo más completo. */
function matriz(partidas) {
  const n = PERSONALIDADES.length;
  const gana = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const w = duelo(PERSONALIDADES[i], PERSONALIDADES[j], partidas);
      gana[i][j] = w;
      gana[j][i] = 100 - w;
    }
  }
  console.log(`\n━━━ ROUND ROBIN 19×19, ${partidas} partidas por par\n`);
  console.log("  ★  rival                 global   vs★1 vs★2 vs★3 vs★4 vs★5");
  const filas = [];
  for (let i = 0; i < n; i++) {
    let t = 0;
    const porNivel = {};
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      t += gana[i][j];
      const d = PERSONALIDADES[j].dificultad;
      (porNivel[d] ??= []).push(gana[i][j]);
    }
    const w = t / (n - 1);
    const vs = NIVELES.map((d) => {
      const a = porNivel[d];
      return (a.reduce((x, y) => x + y, 0) / a.length).toFixed(0).padStart(4);
    }).join(" ");
    filas.push({ p: PERSONALIDADES[i], w });
    console.log(`  ${PERSONALIDADES[i].dificultad}  ${PERSONALIDADES[i].nombre.padEnd(21)} ${pct(w).padStart(6)}  ${vs}`);
  }
  console.log("\n  De más fuerte a más débil:");
  [...filas]
    .sort((a, b) => b.w - a.w)
    .forEach((f, k) => console.log(`   ${String(k + 1).padStart(2)}. ★${f.p.dificultad}  ${f.p.nombre.padEnd(21)} ${pct(f.w)}`));
}

/**
 * Cada cuánto abre cada nivel.
 *
 * No mide quién gana: mide cómo se SIENTE jugar contra cada uno. Un bot que
 * canta envido una vez cada diez manos es aburrido aunque gane.
 */
function tasas(partidas) {
  console.log(`\n━━━ FRECUENCIAS: cada cuánto canta cada nivel, sobre ${partidas} partidas\n`);
  console.log("  ★  rival                 envido/mano  truco/mano  manos/partida");
  for (const persona of PERSONALIDADES) {
    let manos = 0;
    let envidos = 0;
    let trucos = 0;
    for (let i = 0; i < partidas; i++) {
      const { fichas, manos: m } = jugarPartida(persona, SPARRING);
      manos += m;
      // `fichas.rival` es lo que el SPARRING anotó de la persona medida.
      envidos += fichas.rival.envidosCantados;
      trucos += fichas.rival.trucosCantados;
    }
    console.log(
      `  ${persona.dificultad}  ${persona.nombre.padEnd(21)} ${(envidos / manos).toFixed(2).padStart(10)}  ${(trucos / manos).toFixed(2).padStart(10)}  ${(manos / partidas).toFixed(1).padStart(12)}`,
    );
  }
}

// Sólo informa cuando se lo corre a mano; importarlo no tiene que hacer nada.
if (import.meta.url === `file://${process.argv[1]}`) informe();

function informe() {
  const args = process.argv.slice(2);
  const partidas = Number(args.find((a) => /^\d+$/.test(a)) ?? 600);

  if (args.includes("--matriz")) return matriz(partidas);
  if (args.includes("--tasas")) return tasas(Math.min(partidas, 200));

  const porNivel = contraElSparring(partidas);
  const ordenado = bandas(porNivel, partidas);
  contraLosPerfiles(partidas);
  console.log(
    ordenado
      ? "\n✔ La escala sube y las bandas no se pisan.\n"
      : "\n✖ LA ESCALA ESTÁ DESORDENADA: hay rivales fuera de su banda.\n",
  );
}
