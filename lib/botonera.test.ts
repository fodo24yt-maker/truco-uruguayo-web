/**
 * Que no haya jugadas sin botón.
 *
 * Bug reportado jugando (31/08/2026): "cuando yo canto envido y ella canta real
 * envido, no le puedo subir". Era cierto, y no era sólo eso.
 *
 * La barra de cantos estaba escrita como un `if` de dos ramas: si había algo que
 * contestar, la fila entera se volvía "Quiero / No quiero"; si no, era la fila
 * normal. Pero el motor, cuando te cantan algo, ofrece MÁS que contestar —subir
 * el envido, retrucar, cantar envido sobre un truco— y todo eso vivía en la otra
 * rama. Eran jugadas del truco que no se podían hacer.
 *
 * Estas pruebas recorren partidas de verdad y verifican la invariante: **toda
 * acción que el motor ofrece tiene que caer en algún botón**.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { accionesSinBoton, botonera } from "./botonera.ts";
import {
  type Accion,
  type Jugador,
  type Partida,
  accionesPosibles,
  aplicar,
  nuevaPartida,
  siguienteMano,
} from "./motor/partida.ts";

/** Azar reproducible: si una partida rompe, rompe siempre igual. */
function azarCon(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Juega partidas enteras eligiendo acciones al azar entre las legales.
 *
 * Al azar y no con el bot a propósito: el bot juega BIEN, y jugar bien quiere
 * decir no meterse en las ramas raras. Lo que hay que recorrer acá son
 * justamente las raras —cadenas largas de envido, contraflor sobre flor, envido
 * arriba de un truco—, que es donde estaba el agujero.
 */
function recorrer(semilla: number, revisar: (p: Partida, quien: Jugador) => void) {
  const azar = azarCon(semilla);
  let p = nuevaPartida(azar);

  for (let paso = 0; paso < 4000; paso++) {
    if (p.fase === "partida-terminada") return;
    if (p.fase !== "jugando") {
      p = siguienteMano(p, azar);
      continue;
    }
    const quien = p.turno;
    const posibles = accionesPosibles(p, quien);
    if (posibles.length === 0) return;
    revisar(p, quien);
    const elegida: Accion = posibles[Math.floor(azar() * posibles.length)];
    p = aplicar(p, elegida, quien);
  }
}

test("toda acción que ofrece el motor tiene un botón", () => {
  for (let semilla = 1; semilla <= 60; semilla++) {
    recorrer(semilla, (p, quien) => {
      const posibles = accionesPosibles(p, quien);
      const faltan = accionesSinBoton(posibles);
      assert.deepEqual(
        faltan,
        [],
        `semilla ${semilla}: sin botón ${faltan.join(", ")} (pendiente: ${p.pendiente?.tipo ?? "nada"})`,
      );
    });
  }
});

test("contestando un envido se puede SUBIR, no sólo querer o no querer", () => {
  let visto = 0;
  for (let semilla = 1; semilla <= 60 && visto < 8; semilla++) {
    recorrer(semilla, (p, quien) => {
      if (p.pendiente?.tipo !== "envido") return;
      /* Arriba de la falta envido no hay nada, y eso está bien: ahí contestar
         ES la única jugada. Lo encontró este mismo test la primera vez que
         corrió, así que queda escrito en vez de quedar en la cabeza. */
      if (p.pendiente.cadena.at(-1) === "falta-envido") return;
      const b = botonera(accionesPosibles(p, quien));
      if (!b.contestando) return;
      visto++;
      /* O podés subir el envido, o tenés flor y lo que corresponde es cantarla:
         la flor anula el envido, así que ahí no hay envido para subir. Lo que
         NO puede pasar es que no haya NINGUNA de las dos. */
      assert.ok(
        b.envidos.length > 0 || b.florCantos.length > 0 || b.flor,
        `contestando un envido no quedó nada para subir (semilla ${semilla})`,
      );
    });
  }
  assert.ok(visto >= 3, `casi no se llegó a contestar un envido (${visto} veces)`);
});

test("contestando un truco se puede retrucar", () => {
  let visto = 0;
  for (let semilla = 1; semilla <= 60 && visto < 8; semilla++) {
    recorrer(semilla, (p, quien) => {
      if (p.pendiente?.tipo !== "truco" || p.truco.nivel >= 3) return;
      const b = botonera(accionesPosibles(p, quien));
      if (!b.contestando) return;
      visto++;
      assert.ok(b.truco, `contestando un truco no había con qué retrucar (semilla ${semilla})`);
    });
  }
  assert.ok(visto >= 3, `casi no se llegó a contestar un truco (${visto} veces)`);
});

test("el envido va primero: sobre un truco sin contestar hay envido", () => {
  let visto = 0;
  for (let semilla = 1; semilla <= 120 && visto < 5; semilla++) {
    recorrer(semilla, (p, quien) => {
      if (p.pendiente?.tipo !== "truco") return;
      if (p.bazas.length !== 1 || p.yaHablo[quien] || p.envidoCerrado) return;
      if (p.flor[quien].tiene) return; // con flor no se canta envido: lo anula
      const b = botonera(accionesPosibles(p, quien));
      if (!b.contestando) return;
      visto++;
      assert.ok(
        b.envidos.length > 0,
        `se perdió "el envido va primero" (semilla ${semilla})`,
      );
    });
  }
  assert.ok(visto >= 1, "nunca se dio el caso de envido sobre truco");
});

test("una flor a secas se contesta con flor o achicándose, nunca sin nada", () => {
  let visto = 0;
  for (let semilla = 1; semilla <= 120 && visto < 6; semilla++) {
    recorrer(semilla, (p, quien) => {
      if (p.pendiente?.tipo !== "flor" || p.pendiente.cadena.length !== 0) return;
      if (p.turno !== quien) return;
      const b = botonera(accionesPosibles(p, quien));
      visto++;
      assert.ok(
        b.noQuiero,
        `sin "me achico" contra una flor a secas (semilla ${semilla})`,
      );
    });
  }
  assert.ok(visto >= 1, "nunca se cantó flor a secas");
});
