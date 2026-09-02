/**
 * Que el volver lleve siempre a una pantalla que existe, y que dé lo mismo con
 * la barra final o sin ella.
 *
 * Las dos cosas que esto tiene que atajar son errores que YA se cometieron en
 * proyectos así:
 *
 *   · resolver el padre cortando la ruta por la última barra. Con eso
 *     `/legales/privacidad` vuelve a `/legales`, que no es ninguna página: la
 *     flecha te deja en un 404. Por eso hay una prueba que exige que el destino
 *     sea una de las pantallas del sitio y no cualquier texto que empiece con
 *     barra.
 *   · comparar la ruta cruda. Con `trailingSlash` prendido —que es como se
 *     compila la app— `usePathname()` devuelve `/aprender/`, y todo lo que
 *     compare contra `"/aprender"` deja de andar adentro del teléfono sin que
 *     se note en desarrollo.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { normalizarRuta, seccionDe, volverDesde } from "./navegacion.ts";

/**
 * Las pantallas del sitio, escritas a mano.
 *
 * No se importan de `lib/lecciones`, y no es por vagancia: ese archivo es un
 * `.tsx` y `node --test` sabe sacarle los tipos a un `.ts` pero no transformar
 * el JSX. Es la misma razón por la que los datos de los objetos viven en
 * `lib/objetos.ts` y no en `components/mesa/Objetos.tsx`.
 */
const PANTALLAS = [
  "/",
  "/aprender",
  "/aprender/la-baraja",
  "/aprender/puntos-y-partida",
  "/jugar",
  "/jugar/gira",
  "/jugar/mesa",
  "/legales/privacidad",
  "/legales/terminos",
];

/** Los destinos que el volver puede devolver: pantallas de verdad. */
const DESTINOS_VALIDOS = new Set(PANTALLAS);

test("normalizarRuta saca la barra del final y deja la raíz en paz", () => {
  assert.equal(normalizarRuta("/"), "/");
  assert.equal(normalizarRuta("/aprender"), "/aprender");
  assert.equal(normalizarRuta("/aprender/"), "/aprender");
  assert.equal(normalizarRuta("/jugar/gira/"), "/jugar/gira");
  assert.equal(normalizarRuta(""), "/");
});

test("desde el inicio no se vuelve a ningún lado", () => {
  assert.equal(volverDesde("/"), null);
  assert.equal(volverDesde("/", "?lo=que=sea"), null);
});

test("cada pantalla vuelve a la que la contiene", () => {
  assert.equal(volverDesde("/aprender"), "/");
  assert.equal(volverDesde("/jugar"), "/");
  assert.equal(volverDesde("/aprender/la-muestra"), "/aprender");
  assert.equal(volverDesde("/jugar/gira"), "/jugar");
});

test("las legales vuelven al inicio, no a /legales, que no existe", () => {
  assert.equal(volverDesde("/legales/privacidad"), "/");
  assert.equal(volverDesde("/legales/terminos"), "/");
});

test("la mesa vuelve a donde la abriste", () => {
  assert.equal(volverDesde("/jugar/mesa"), "/jugar");
  assert.equal(volverDesde("/jugar/mesa", ""), "/jugar");
  assert.equal(volverDesde("/jugar/mesa", "?rival=luki"), "/jugar");
  assert.equal(volverDesde("/jugar/mesa", "?depto=rocha"), "/jugar/gira");
  assert.equal(volverDesde("/jugar/mesa", "depto=cerro-largo"), "/jugar/gira");
});

test("el destino es SIEMPRE una pantalla que existe", () => {
  for (const pantalla of PANTALLAS) {
    for (const busqueda of ["", "?depto=rocha", "?rival=luki"]) {
      const destino = volverDesde(pantalla, busqueda);
      if (destino === null) {
        assert.equal(pantalla, "/", `sólo el inicio puede no tener volver (${pantalla})`);
        continue;
      }
      assert.ok(
        DESTINOS_VALIDOS.has(destino),
        `desde ${pantalla}${busqueda} se vuelve a "${destino}", que no es ninguna pantalla`,
      );
      assert.notEqual(destino, normalizarRuta(pantalla), `${pantalla} vuelve a sí misma`);
    }
  }
});

test("la barra del final no cambia ninguna respuesta", () => {
  for (const pantalla of PANTALLAS) {
    if (pantalla === "/") continue;
    assert.equal(
      volverDesde(`${pantalla}/`, "?depto=rocha"),
      volverDesde(pantalla, "?depto=rocha"),
      `${pantalla} contesta distinto con barra final`,
    );
    assert.equal(seccionDe(`${pantalla}/`), seccionDe(pantalla), `sección de ${pantalla}`);
  }
});

test("la sección marcada es la que estás mirando", () => {
  assert.equal(seccionDe("/"), null);
  assert.equal(seccionDe("/legales/terminos"), null);
  assert.equal(seccionDe("/aprender"), "aprender");
  assert.equal(seccionDe("/aprender/la-flor"), "aprender");
  assert.equal(seccionDe("/jugar"), "jugar");
  assert.equal(seccionDe("/jugar/gira"), "jugar");
  assert.equal(seccionDe("/jugar/mesa"), "jugar");
});

/*
 * Esta parece de más y no lo es. Sin ella, las anteriores pasarían igual si
 * `volverDesde` devolviera SIEMPRE "/": todas las pantallas volverían a una que
 * existe, ninguna volvería a sí misma, y la barra final no cambiaría nada.
 * O sea que el conjunto entero se puede satisfacer sin resolver el problema.
 */
test("y sin embargo distingue de verdad: no todo vuelve al inicio", () => {
  const destinos = new Set(
    PANTALLAS.map((p) => volverDesde(p, "?depto=rocha")).filter((d) => d !== null),
  );
  assert.ok(
    destinos.size >= 3,
    `sólo devuelve ${[...destinos].join(", ")}: no está resolviendo la jerarquía`,
  );
});
