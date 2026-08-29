/**
 * Que la gira sea de verdad una escalera.
 *
 * Esto nació de un reporte jugando: "no le gané una a Luki". Luki es el PRIMER
 * rival de la gira, el de una estrella. Midiéndolo apareció que la escala
 * estaba dada vuelta: Luki le ganaba a El Melo —el último, el de cinco
 * estrellas— el 61% de las veces.
 *
 * La tabla de niveles se había armado suponiendo que "más difícil = canta más,
 * quiere más, miente más", y resulta que no: querer con el umbral bajo es pagar
 * apuestas perdidas, y mentir sólo rinde si el otro te cree.
 *
 * Hasta acá el único test de dificultad comparaba `sentidoComun`, que es un
 * número de una tabla. Un número puede subir prolijo mientras el rival juega
 * peor. La única forma de saberlo es hacerlos jugar, así que eso hace este
 * archivo: los sienta a la mesa.
 *
 * Para calibrar a mano, con más partidas y más detalle:
 *     node herramientas/medir-bots.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";

import { aplicar, nuevaPartida, siguienteMano } from "./partida.ts";
import { decidirJugada } from "./bot.ts";
import { PERSONALIDADES, type Personalidad } from "./personalidades.ts";
import { fichaVacia, observarMano } from "./lectura.ts";

/** Azar determinista: un test de balance que falla de a ratos no sirve. */
function azarFijo(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * Un rival por nivel, todos con el mismo carácter.
 *
 * Se le fija `mentira` y `silencio` a propósito: son cosas de cada personaje,
 * no del nivel, y si se dejan variar tapan la señal. Acá se mide la TABLA del
 * nivel, que es lo que tiene que estar ordenado.
 */
const porNivel = (n: number): Personalidad => ({
  ...PERSONALIDADES.find((p) => p.dificultad === n)!,
  mentira: 0.2,
  silencio: 0.2,
});

/** Una partida entera entre dos personalidades, con sus fichas. */
function partida(a: Personalidad, b: Personalidad, azar: () => number) {
  let p = nuevaPartida(azar);
  let fichas = { vos: fichaVacia(), rival: fichaVacia() };

  for (let vuelta = 0; vuelta < 20000; vuelta++) {
    if (p.fase === "partida-terminada") break;
    if (p.fase === "mano-terminada") {
      fichas = {
        vos: observarMano(fichas.vos, p, "rival"),
        rival: observarMano(fichas.rival, p, "vos"),
      };
      p = siguienteMano(p, azar);
      continue;
    }
    const quien = p.turno;
    const accion = decidirJugada(p, quien, azar, quien === "vos" ? a : b, fichas[quien]);
    assert.ok(accion, "el bot se quedó sin jugadas posibles");
    const antes = p;
    p = aplicar(p, accion, quien);
    assert.notEqual(p, antes, `jugada inválida: ${accion.tipo}`);
  }
  assert.ok(p.ganadorPartida, "la partida terminó sin ganador: el motor se trabó");
  return p.ganadorPartida;
}

/** Cuánto le gana A a B, alternando quién es mano para que la silla no pese. */
function cuantoLeGana(a: Personalidad, b: Personalidad, cuantas: number, semilla: number) {
  const azar = azarFijo(semilla);
  let ganadas = 0;
  for (let i = 0; i < cuantas; i++) {
    const derecha = i % 2 === 0;
    const ganador = derecha ? partida(a, b, azar) : partida(b, a, azar);
    if (ganador === (derecha ? "vos" : "rival")) ganadas++;
  }
  return (100 * ganadas) / cuantas;
}

const PARTIDAS = 400;

/**
 * TRES SEMILLAS, NO UNA.
 *
 * Entre dos niveles vecinos la diferencia real es de uno o dos puntos de
 * winrate. Con 400 partidas de una sola semilla el error de medición es del
 * mismo tamaño que lo que se quiere medir, así que el test daba 49% ó 54% según
 * la suerte del generador y no según cómo juegan los bots. Promediando tres
 * semillas son 1.800 partidas por escalón y el número deja de bailar.
 *
 * Esto NO afloja la exigencia: el umbral sigue siendo "le tiene que ganar".
 * Lo que cambia es que ahora se mide bien.
 */
const SEMILLAS = [1001, 4242, 90210];

const escalon = (mejor: Personalidad, peor: Personalidad) =>
  SEMILLAS.reduce((t, s) => t + cuantoLeGana(mejor, peor, 600, s), 0) / SEMILLAS.length;

test("cada nivel de la gira le gana al anterior", () => {
  for (let n = 1; n <= 4; n++) {
    const gana = escalon(porNivel(n + 1), porNivel(n));
    assert.ok(
      gana > 50,
      `★${n + 1} le gana a ★${n} sólo el ${gana.toFixed(1)}%: la escala no sube`,
    );
  }
});

test("del primero al último la diferencia se nota", () => {
  const gana = cuantoLeGana(porNivel(5), porNivel(1), PARTIDAS, 77);
  assert.ok(gana > 57, `★5 le gana a ★1 sólo el ${gana.toFixed(1)}%: se parecen demasiado`);
});

test("NO AL REVÉS: el primero de la gira no puede ganarle al último", () => {
  // El caso exacto que se reportó jugando. Con la escala vieja daba 61%.
  const luki = PERSONALIDADES.find((p) => p.id === "luki")!;
  const melo = PERSONALIDADES.find((p) => p.id === "el-melo")!;
  const gana = cuantoLeGana(luki, melo, PARTIDAS, 5);
  assert.ok(gana < 45, `Luki le gana a El Melo el ${gana.toFixed(1)}%: está dado vuelta otra vez`);
});

test("el oficio y la lectura suben con la dificultad", () => {
  const ordenados = [...PERSONALIDADES].sort((a, b) => a.dificultad - b.dificultad);
  for (let i = 1; i < ordenados.length; i++) {
    assert.ok(ordenados[i].criterio >= ordenados[i - 1].criterio, "el criterio bajó");
    assert.ok(ordenados[i].lectura >= ordenados[i - 1].lectura, "la lectura bajó");
  }
  // Los primeros no leen a nadie: es lo que los hace previsibles y enseñables
  for (const p of PERSONALIDADES.filter((x) => x.dificultad <= 2)) {
    assert.equal(p.lectura, 0, `${p.nombre} no debería leer al rival todavía`);
  }
});
