/**
 * El banco de pruebas del balance.
 *
 * Enfrenta a cada rival de la gira contra una referencia y saca la tabla de
 * winrates. Nació porque la escala de dificultad estaba dada vuelta —Luki, el
 * primero, le ganaba a El Melo, el último, el 61% de las veces— y a ojo eso no
 * se ve: hay que jugarlo miles de veces.
 *
 * Correr con:   node herramientas/medir-bots.mjs
 *               node herramientas/medir-bots.mjs 800        (más partidas)
 *
 * Ojo con lo que mide y lo que no: esto es bot contra bot. Un bot que miente
 * pierde contra otro bot, porque el otro no le lee la mentira, pero contra una
 * persona funciona. Sirve para ORDENAR la escala, no para decir cuán difícil se
 * siente. Eso último se prueba jugando.
 */

import { nuevaPartida, aplicar, siguienteMano } from "../lib/motor/partida.ts";
import { decidirJugada } from "../lib/motor/bot.ts";
import { PERSONALIDADES } from "../lib/motor/personalidades.ts";

/**
 * El sparring: un rival de fuerza media que NO es ninguno de los 19.
 *
 * Medir contra uno de la gira comprimía justo la punta que interesa —contra El
 * Melo, los niveles 4 y 5 daban los dos ~50% y no se distinguían—. Con un
 * sparring parado en el medio, los 19 se despliegan a los dos lados.
 *
 * No te lee (`lectura: 0`) a propósito: así el ajuste de lectura de los niveles
 * altos se mide contra un blanco quieto, sin que la lectura del otro lo tape.
 */
export const SPARRING = {
  id: "sparring", nombre: "Sparring", departamento: "-", lugar: "-",
  dificultad: 3, paso: 0, descripcion: "referencia de medición",
  cantaEnvidoCon: 27, quiereEnvidoCon: 26, subeEnvidoCon: 32,
  cantaTrucoCon: 0.72, quiereTrucoCon: 0.42, subeTrucoCon: 0.75,
  mentira: 0.2, silencio: 0.2, sentidoComun: 0.6,
  criterio: 0.75, lectura: 0, verso: 0,
  contraflorCon: 41, conFlorEnvidoCon: 36, quiereFlorCon: 35,
};
import { fichaVacia, observarMano } from "../lib/motor/lectura.ts";

/** Juega una partida entera entre dos personalidades. Devuelve quién ganó. */
export function jugarPartida(personaVos, personaRival, azar = Math.random) {
  let p = nuevaPartida(azar);
  // Cada uno lleva su propia ficha del otro, igual que en la mesa de verdad.
  let fichas = { vos: fichaVacia(), rival: fichaVacia() };

  for (let vuelta = 0; vuelta < 20000; vuelta++) {
    if (p.fase === "partida-terminada") break;
    if (p.fase === "mano-terminada") {
      // Al cerrar la mano, cada uno repasa lo que vio del otro
      fichas = {
        vos: observarMano(fichas.vos, p, "rival"),
        rival: observarMano(fichas.rival, p, "vos"),
      };
      p = siguienteMano(p, azar);
      continue;
    }
    const quien = p.turno;
    const persona = quien === "vos" ? personaVos : personaRival;
    const accion = decidirJugada(p, quien, azar, persona, fichas[quien]);
    if (!accion) break;
    const antes = p;
    p = aplicar(p, accion, quien);
    if (p === antes) throw new Error(`jugada inválida: ${accion.tipo} de ${persona.nombre}`);
  }
  if (p.ganadorPartida === null) {
    // Una partida sin ganador es SIEMPRE un bug del motor: alguien se quedó sin
    // jugadas posibles o la mano no cerró. Callarlo acá ensuciaría todas las
    // mediciones sin que nadie se entere, que es justo lo que pasó una vez.
    throw new Error("la partida terminó sin ganador: el motor se trabó");
  }
  return p.ganadorPartida;
}

/** Winrate de A contra B, alternando lados para que la posición no pese. */
export function duelo(a, b, partidas = 400) {
  let ganaA = 0;
  for (let i = 0; i < partidas; i++) {
    // La mitad de las partidas A juega de mano y la otra mitad de pie
    const ganador = i % 2 === 0 ? jugarPartida(a, b) : jugarPartida(b, a);
    const gano = i % 2 === 0 ? ganador === "vos" : ganador === "rival";
    if (gano) ganaA++;
  }
  return (100 * ganaA) / partidas;
}

// Sólo informa cuando se lo corre a mano; importarlo no tiene que hacer nada.
if (import.meta.url === `file://${process.argv[1]}`) informe();

function informe() {
const partidas = Number(process.argv[2] ?? 400);

console.log(`\nWinrate contra el sparring, ${partidas} partidas cada uno.`);
console.log("La columna tiene que SUBIR a medida que sube el nivel.\n");
console.log("  ★  rival                gana%");
console.log("  ─  ───────────────────  ─────");

const porNivel = new Map();
for (const persona of PERSONALIDADES) {
  const w = duelo(persona, SPARRING, partidas);
  console.log(`  ${persona.dificultad}  ${persona.nombre.padEnd(21)} ${w.toFixed(1)}%`);
  if (!porNivel.has(persona.dificultad)) porNivel.set(persona.dificultad, []);
  porNivel.get(persona.dificultad).push(w);
}

console.log("\n  Promedio por nivel:");
const promedios = [...porNivel.entries()].sort((a, b) => a[0] - b[0]);
let ordenado = true;
for (const [nivel, ws] of promedios) {
  const prom = ws.reduce((t, w) => t + w, 0) / ws.length;
  console.log(`    ★${nivel}: ${prom.toFixed(1)}%`);
}
for (let i = 1; i < promedios.length; i++) {
  const prev = promedios[i - 1][1].reduce((t, w) => t + w, 0) / promedios[i - 1][1].length;
  const act = promedios[i][1].reduce((t, w) => t + w, 0) / promedios[i][1].length;
  if (act < prev - 1.5) ordenado = false; // 1,5 de tolerancia: hay ruido
}
console.log(ordenado ? "\n  ✔ La escala sube bien.\n" : "\n  ✖ LA ESCALA ESTÁ DESORDENADA.\n");
}
