/**
 * Que la gira sea de verdad una escalera.
 *
 * Esto nació de un reporte jugando: "no le gané una a Luquita". Luquita es el
 * PRIMER rival de la gira, el de una estrella. Midiéndolo apareció que la escala
 * estaba dada vuelta: Luquita le ganaba a El Turco —el último, el de cinco
 * estrellas— el 61% de las veces.
 *
 * La tabla de niveles se había armado suponiendo que "más difícil = canta más,
 * quiere más, miente más", y resulta que no.
 *
 * ─── LO QUE SE APRENDIÓ LA SEGUNDA VEZ (11/9/2026) ──────────────────────────
 *
 * Volvió a pasar, en chico: El Chicharra (★4) le ganaba a El Turco (★5) el
 * 52,5%. Los tests de acá no lo vieron porque **comparaban promedios de nivel**,
 * y un promedio puede subir prolijo mientras el mejor de un nivel le gana al
 * peor del siguiente. Para el que juega la gira eso no es un detalle
 * estadístico: es que las estrellas mienten.
 *
 * Por eso ahora hay tres clases de test y no una:
 *
 *   1. el ESCALÓN, que compara las tablas de nivel (el de siempre);
 *   2. las BANDAS, que exige que ningún individuo se pase de su nivel;
 *   3. los PERFILES, que mide contra formas de jugar de una persona y no
 *      contra otro bot. Un ★5 tiene que castigar a un mentiroso MÁS que un ★3;
 *      si no, la estrella de más no se nota jugando aunque gane más partidas.
 *
 * Para calibrar a mano, con más partidas y más detalle:
 *     node herramientas/medir-bots.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";

import { PERFILES, SPARRING, duelo } from "./banco.ts";
import { PERSONALIDADES, type Personalidad } from "./personalidades.ts";

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

/**
 * TRES SEMILLAS, NO UNA.
 *
 * Entre dos niveles vecinos la diferencia real es de unos pocos puntos de
 * winrate. Con 600 partidas de una sola semilla el error de medición es del
 * mismo tamaño que lo que se quiere medir, así que el test daba 49% ó 54% según
 * la suerte del generador y no según cómo juegan los bots.
 *
 * Esto NO afloja la exigencia: el umbral sigue siendo "le tiene que ganar".
 * Lo que cambia es que ahora se mide bien.
 */
const SEMILLAS = [1001, 4242, 90210];
const PARTIDAS = 600;

const promediando = (f: (semilla: number) => number) =>
  SEMILLAS.reduce((t, s) => t + f(s), 0) / SEMILLAS.length;

const escalon = (mejor: Personalidad, peor: Personalidad) =>
  promediando((s) => duelo(mejor, peor, PARTIDAS, s));

// ─── 1. El escalón ──────────────────────────────────────────────────────────

test("cada nivel de la gira le gana al anterior, y se nota", () => {
  // Medido el 11/9/2026: los cuatro escalones dan entre 53% y 55%. El umbral
  // está en 51 y no en 50 para que un escalón que se aplana avise ANTES de
  // haberse dado vuelta, que es cuando todavía es barato arreglarlo.
  for (let n = 1; n <= 4; n++) {
    const gana = escalon(porNivel(n + 1), porNivel(n));
    assert.ok(
      gana > 51,
      `★${n + 1} le gana a ★${n} sólo el ${gana.toFixed(1)}%: la escala se está aplanando`,
    );
  }
});

test("del primero al último la diferencia se nota mucho", () => {
  const gana = escalon(porNivel(5), porNivel(1));
  assert.ok(gana > 65, `★5 le gana a ★1 sólo el ${gana.toFixed(1)}%: se parecen demasiado`);
});

test("NO AL REVÉS: el primero de la gira no puede ganarle al último", () => {
  // El caso exacto que se reportó jugando. Con la escala vieja daba 61%.
  const luki = PERSONALIDADES.find((p) => p.id === "luki")!;
  const melo = PERSONALIDADES.find((p) => p.id === "el-melo")!;
  const gana = promediando((s) => duelo(luki, melo, PARTIDAS, s));
  assert.ok(gana < 40, `Luquita le gana a El Turco el ${gana.toFixed(1)}%: está dado vuelta otra vez`);
});

// ─── 2. Las bandas: nadie fuera de su nivel ─────────────────────────────────

test("NINGÚN RIVAL SE PASA DE SU BANDA: el mejor de un nivel no le gana al peor del siguiente", () => {
  // ÉSTE es el test que faltaba. Sin él, El Chicharra (★4) le ganaba a El Turco
  // (★5) el 52,5% y los otros tests daban verde, porque el promedio del nivel
  // subía igual. Pero el que juega la gira no se enfrenta a un promedio: se
  // enfrenta a un señor, y si el señor de cuatro estrellas es más bravo que el
  // de cinco, las estrellas no significan nada.
  const bandas = new Map<number, { nombre: string; w: number }[]>();
  for (const p of PERSONALIDADES) {
    const w = promediando((s) => duelo(p, SPARRING, PARTIDAS, s));
    if (!bandas.has(p.dificultad)) bandas.set(p.dificultad, []);
    bandas.get(p.dificultad)!.push({ nombre: p.nombre, w });
  }

  for (let n = 2; n <= 5; n++) {
    const mejorDeAbajo = bandas.get(n - 1)!.reduce((a, b) => (b.w > a.w ? b : a));
    const peorDeArriba = bandas.get(n)!.reduce((a, b) => (b.w < a.w ? b : a));
    assert.ok(
      mejorDeAbajo.w < peorDeArriba.w,
      `${mejorDeAbajo.nombre} (★${n - 1}, ${mejorDeAbajo.w.toFixed(1)}%) le pasa a ` +
        `${peorDeArriba.nombre} (★${n}, ${peorDeArriba.w.toFixed(1)}%): las estrellas mienten`,
    );
  }
});

// ─── 3. Los perfiles: que la estrella de más SE NOTE jugando ────────────────

test("cada nivel castiga a una persona más que el anterior, sea como sea que juegue", () => {
  /* Esto es lo que el banco no medía y por eso no veía nada: bot contra bot,
     mentir no rinde, porque el otro no te lee la mentira. Contra una PERSONA
     sí. Así que se mide contra las cuatro formas típicas de jugar de alguien, y
     se exige que el ★5 castigue a cada una más que el ★3, y el ★3 más que el ★1.

     Se comparan de a dos niveles y no de a uno porque entre vecinos la
     diferencia contra un perfil suelto es del tamaño del ruido; de ★1 a ★3 y de
     ★3 a ★5 es grande y no depende de la suerte del generador. */
  /* CUATRO MIL PARTIDAS POR CASILLA, Y NO NOVECIENTAS.
     Con 900 este test decía que contra el pescador el ★5 no se distinguía del
     ★3 (1,9 puntos). Con 4.000 la diferencia real resultó ser 3,4. No estaba
     exigiendo de más: estaba MIDIENDO mal, que es distinto y se arregla al
     revés —subiendo las partidas y no bajando el umbral—. El margen de una
     diferencia con 900 partidas es ±3,3, así que pedía distinguir algo que su
     propia medición no podía resolver. */
  const N = 4000;
  const [DEL_1_AL_3, DEL_3_AL_5] = [3, 2.5];

  for (const [nombre, perfil] of Object.entries(PERFILES)) {
    const uno = duelo(porNivel(1), perfil, N, 4242);
    const tres = duelo(porNivel(3), perfil, N, 4242);
    const cinco = duelo(porNivel(5), perfil, N, 4242);

    assert.ok(
      tres > uno + DEL_1_AL_3,
      `contra el ${nombre}, el ★3 (${tres.toFixed(1)}%) no se distingue del ★1 (${uno.toFixed(1)}%)`,
    );
    assert.ok(
      cinco > tres + DEL_3_AL_5,
      `contra el ${nombre}, el ★5 (${cinco.toFixed(1)}%) no se distingue del ★3 (${tres.toFixed(1)}%)`,
    );
  }
});

test("al que se achica hay que cantarle, y eso lo tiene que saber el ★5 y no el ★1", () => {
  /* El caso más claro de todos y el que más se siente jugando: contra alguien
     que no quiere nada, el oficio es cantarle sin parar. Medido, el ★5 le gana
     al miedoso ~79% y el ★1 ~46%: son dos juegos distintos, que es exactamente
     lo que tienen que ser cinco estrellas y una. */
  const N = 900;
  const uno = duelo(porNivel(1), PERFILES.miedoso, N, 4242);
  const cinco = duelo(porNivel(5), PERFILES.miedoso, N, 4242);
  assert.ok(cinco - uno > 20, `contra un miedoso, del ★1 al ★5 sólo hay ${(cinco - uno).toFixed(1)} puntos`);
});

// ─── 4. Que los diales sigan ordenados ──────────────────────────────────────

test("el oficio, la lectura, el aguante y la memoria suben con la dificultad", () => {
  const ordenados = [...PERSONALIDADES].sort((a, b) => a.dificultad - b.dificultad);
  for (let i = 1; i < ordenados.length; i++) {
    for (const dial of ["criterio", "lectura", "aguante", "memoria"] as const) {
      assert.ok(
        ordenados[i][dial] >= ordenados[i - 1][dial],
        `${dial} bajó entre ${ordenados[i - 1].nombre} y ${ordenados[i].nombre}`,
      );
    }
  }
  // Los primeros no leen a nadie: es lo que los hace previsibles y enseñables
  for (const p of PERSONALIDADES.filter((x) => x.dificultad <= 2)) {
    assert.equal(p.lectura, 0, `${p.nombre} no debería leer al rival todavía`);
  }
  // Y hasta el ★3 nadie se acuerda de partidas anteriores: contra ellos alcanza
  // con cambiar de estrategia para despistarlos, que es la lección del tramo.
  for (const p of PERSONALIDADES.filter((x) => x.dificultad <= 3)) {
    assert.equal(p.memoria, 0, `${p.nombre} no debería acordarse de otras partidas`);
  }
});
