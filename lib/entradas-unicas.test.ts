/**
 * El guardián del punto de entrada único.
 *
 * La regla (2/10/2026): todo lo que empieza una partida o abre el anotador
 * pasa por `lib/entrada.ts`. Si mañana alguien agrega un `<Link href="/jugar/mesa">`
 * suelto, o una revancha que reparte sin preguntar, la app sigue andando, pero
 * se saltea los candados y el tope de anuncios sin que nadie se entere. Esto lo
 * agarra: lee el código como TEXTO (los tests corren en Node y no pueden
 * importar JSX) y falla con el archivo y la razón.
 *
 * Los comentarios se borran antes de buscar: hablar de una ruta en un
 * comentario no es navegar a ella.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { EJERCICIOS } from "./aprendido.ts";

// La raíz del repo sale de dónde está ESTE archivo, no de dónde se corre
const RAIZ = fileURLToPath(new URL("..", import.meta.url));

function archivos(dir: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(join(RAIZ, dir))) {
    const ruta = join(dir, nombre);
    if (statSync(join(RAIZ, ruta)).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(ts|tsx)$/.test(nombre) && !nombre.endsWith(".test.ts")) salida.push(ruta);
  }
  return salida;
}

/** El código sin comentarios (`/* … *\/`, `{/* … *\/}` y `// …`, sin tocar `https://`). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), "utf8");
const CODIGO = ["app", "components", "lib"].flatMap(archivos).map((ruta) => ({
  ruta: relative(RAIZ, join(RAIZ, ruta)).replaceAll("\\", "/"),
  codigo: sinComentarios(leer(ruta)),
}));

/**
 * Dónde PUEDEN aparecer las rutas de entrada, y por qué. Todo lo demás falla.
 * Cada excepción es un lugar que NO entra a nada: vuelve, describe o etiqueta.
 */
const PERMITIDOS: Record<string, { rutas: string[]; porque: string }> = {
  "lib/entrada.ts": {
    rutas: ["/anotador", "/jugar/mesa", "/jugar/gira"],
    porque: "es el portero: el único que entra",
  },
  "lib/navegacion.ts": {
    rutas: ["/anotador", "/jugar/mesa", "/jugar/gira"],
    porque: "dice adónde VUELVE la flecha y el atrás de Android; no entra a nada",
  },
  "app/jugar/mesa/page.tsx": {
    rutas: ["/jugar/gira"],
    porque: "'Mapa' y 'Volver al mapa' salen de una partida de la gira hacia el mapa",
  },
  "components/BarraApp.tsx": {
    rutas: ["/jugar/gira"],
    porque: "es el nombre que lleva la flecha de volver ('Mapa'), no un destino",
  },
  "app/sitemap.ts": { rutas: ["/anotador"], porque: "es para los buscadores" },
  "app/anotador/layout.tsx": { rutas: ["/anotador"], porque: "es la URL canónica" },
};

const RUTA = /["'`](\/anotador|\/jugar\/mesa|\/jugar\/gira)(?=["'`?/$])/g;

test("ningún archivo entra a la mesa, a la gira o al anotador sin pasar por el portero", () => {
  const problemas: string[] = [];
  for (const { ruta, codigo } of CODIGO) {
    for (const m of codigo.matchAll(RUTA)) {
      const destino = m[1];
      if (PERMITIDOS[ruta]?.rutas.includes(destino)) continue;
      problemas.push(`${ruta}: "${destino}" escrito a mano. Usá <EntradaPartida>/<EntradaAnotador> o lib/entrada.ts`);
    }
  }
  assert.deepEqual(problemas, []);
});

test("cada excepción de la lista existe todavía (si no, la lista miente)", () => {
  for (const [ruta, { rutas }] of Object.entries(PERMITIDOS)) {
    const archivo = CODIGO.find((a) => a.ruta === ruta);
    assert.ok(archivo, `${ruta} ya no existe: sacalo de PERMITIDOS`);
    const hay = new Set([...archivo.codigo.matchAll(RUTA)].map((m) => m[1]));
    for (const r of rutas) {
      if (ruta === "lib/navegacion.ts" || ruta === "lib/entrada.ts") continue; // listas generosas a propósito
      assert.ok(hay.has(r), `${ruta} ya no usa ${r}: sacalo de PERMITIDOS`);
    }
  }
});

test("la mesa sólo reparte partidas nuevas al montarse o pasando por el portero", () => {
  const mesa = CODIGO.find((a) => a.ruta === "app/jugar/mesa/page.tsx")!.codigo;
  const repartos = mesa.match(/nuevaPartida\(\)/g)?.length ?? 0;
  const pedidos = mesa.split("portero.pedirPartida(").slice(1);
  // Cada pedido al portero lleva su reparto adentro…
  for (const tramo of pedidos) {
    assert.match(tramo.slice(0, 1200), /nuevaPartida\(\)/, "un pedirPartida sin reparto adentro");
  }
  // …y fuera de ellos queda UNO solo: el de cuando se monta la mesa.
  assert.equal(repartos, pedidos.length + 1, "hay un reparto de partida nueva que no pasa por el portero");
  assert.ok(pedidos.length >= 2, "la revancha y el cambio de rival tienen que pasar por el portero");
});

test("no queda ningún banner ni hueco de banner", () => {
  for (const { ruta, codigo } of CODIGO) {
    assert.doesNotMatch(codigo, /EspacioAnuncio|data-anuncio/, ruta);
  }
});

test("los doce ejercicios de Aprender tienen su id, uno cada uno y en orden", () => {
  const lecciones = sinComentarios(leer("lib/lecciones/index.tsx"));
  const ejercicios = lecciones.split("<Ejercicio").slice(1);
  assert.equal(ejercicios.length, EJERCICIOS.length, "cambió la cantidad de ejercicios: actualizá EJERCICIOS");
  const ids = ejercicios.map((tramo) => tramo.match(/^\s*id="([a-z0-9-]+)"/)?.[1] ?? "(sin id)");
  assert.deepEqual(ids, [...EJERCICIOS]);
});
