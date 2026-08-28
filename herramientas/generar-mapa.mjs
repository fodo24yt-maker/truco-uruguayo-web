/**
 * Genera lib/mapa-uruguay.ts: los 19 departamentos dibujados en SVG.
 *
 *     node herramientas/generar-mapa.mjs
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────
 *
 * Las formas del mapa NO se escriben a mano. Antes sí, y se notaba: eran
 * polígonos de siete lados rectos, "cubos raros" que no eran el Uruguay.
 *
 * Salen de Natural Earth (ne_10m_admin_1_states_provinces), que es de DOMINIO
 * PÚBLICO: se puede usar para lo que sea, sin atribución ni condiciones. Trae
 * los 19 departamentos con los nombres escritos igual que en el proyecto.
 *
 * El archivo pesa 40 MB, así que se baja una sola vez a herramientas/.cache/
 * (ignorada por git) y de ahí salen los ~19 KB que sí se versionan.
 *
 * ── El problema difícil: simplificar sin abrir rendijas ──────────────────
 *
 * Los contornos crudos suman 4070 vértices: demasiado para mandarle al
 * navegador. Hay que simplificarlos, pero si se simplifica cada departamento
 * por su cuenta, Salto y Artigas recortan su lado del borde compartido de
 * forma distinta y entre los dos queda una rendija blanca.
 *
 * La salida es que Natural Earth comparte los bordes EXACTOS: 1707 vértices
 * pertenecen a dos departamentos y 19 son esquinas triples. Entonces:
 *
 *   1. se cortan los contornos en ARCOS, allí donde cambia el conjunto de
 *      departamentos que tocan el punto;
 *   2. el borde Salto–Artigas queda como UN arco, que Salto recorre al
 *      derecho y Artigas al revés;
 *   3. se simplifica cada arco UNA sola vez;
 *   4. se rearma cada departamento encadenando sus arcos.
 *
 * Como los dos vecinos usan el mismo objeto, es imposible que se separen.
 */

import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(RAIZ, "herramientas", ".cache");
const FUENTE = path.join(CACHE, "ne_10m_admin_1_states_provinces.geojson");
const URL_FUENTE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";
const DESTINO = path.join(RAIZ, "lib", "mapa-uruguay.ts");

/** Ancho del lienzo. El alto sale de la proyección, no se elige. */
const ANCHO = 1000;
/**
 * Cuánto se puede desviar la línea simplificada de la original, en unidades
 * del lienzo. 1.6 es donde el mapa deja de perder detalle visible a tamaño de
 * pantalla: bajar a 0.45 duplica el peso y se ve exactamente igual.
 */
const TOLERANCIA = 1.6;

// ── 1. La fuente ──────────────────────────────────────────────────────────

if (!fs.existsSync(FUENTE)) {
  console.log("Bajando Natural Earth (40 MB, una sola vez)...");
  fs.mkdirSync(CACHE, { recursive: true });
  const res = await fetch(URL_FUENTE);
  if (!res.ok) throw new Error(`no pude bajar la fuente: HTTP ${res.status}`);
  fs.writeFileSync(FUENTE, Buffer.from(await res.arrayBuffer()));
}

/**
 * Los 19, escritos como los escribe el proyecto. Están acá para VERIFICAR, no
 * para renombrar: si mañana la fuente cambia un nombre, agrega un departamento
 * o le meten cualquier cosa a ese archivo de 40 MB, el generador se planta en
 * vez de escupir un lib/mapa-uruguay.ts raro. Es un archivo que se baja de
 * internet y termina siendo código del sitio: se lo trata como lo que es.
 */
const ESPERADOS = [
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores",
  "Florida", "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro",
  "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó",
  "Treinta y Tres",
];

const geo = JSON.parse(fs.readFileSync(FUENTE, "utf8"));
const rasgos = geo.features.filter((f) => /^uruguay$/i.test(f.properties.admin ?? ""));

const nombres = rasgos.map((f) => f.properties.name).sort((a, b) => String(a).localeCompare(String(b)));
if (JSON.stringify(nombres) !== JSON.stringify([...ESPERADOS].sort((a, b) => a.localeCompare(b))))
  throw new Error(`la fuente no trae los 19 departamentos esperados, trae: ${nombres.join(", ")}`);

for (const f of rasgos) {
  if (f.geometry.type !== "Polygon" || f.geometry.coordinates.length !== 1)
    throw new Error(`${f.properties.name}: esperaba un polígono de un solo anillo`);
  for (const punto of f.geometry.coordinates[0]) {
    // Sin esto, una coordenada que no sea número se propaga como NaN por toda
    // la proyección y termina escrita en el path, con el mapa roto y sin una
    // sola pista de por qué.
    if (!Array.isArray(punto) || punto.length < 2 || !Number.isFinite(punto[0]) || !Number.isFinite(punto[1]))
      throw new Error(`${f.properties.name}: hay una coordenada que no es un par de números`);
    if (punto[0] < -180 || punto[0] > 180 || punto[1] < -90 || punto[1] > 90)
      throw new Error(`${f.properties.name}: hay una coordenada fuera del planeta`);
  }
}

// ── 2. La proyección ──────────────────────────────────────────────────────
//
// Mercator, la misma del mapa de referencia. Para un país chico daría casi
// igual una proyección plana, pero Mercator hace que la silueta salga con la
// relación exacta del mapa que todos conocemos (1 : 1,086).

const mercator = ([lon, lat]) => [
  (lon * Math.PI) / 180,
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
];

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const f of rasgos)
  for (const punto of f.geometry.coordinates[0]) {
    const [x, y] = mercator(punto);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

const escala = ANCHO / (maxX - minX);
const ALTO = (maxY - minY) * escala;
/** De lon/lat a coordenadas del lienzo. La y se invierte: en SVG crece hacia abajo. */
const proyectar = (punto) => {
  const [x, y] = mercator(punto);
  return [(x - minX) * escala, (maxY - y) * escala];
};

// ── 3. Cortar los contornos en arcos compartidos ──────────────────────────

/** Identidad de un punto geográfico. Seis decimales ≈ 10 cm: de sobra. */
const clave = ([lon, lat]) => `${lon.toFixed(6)},${lat.toFixed(6)}`;

/** Para cada punto, qué departamentos lo tocan. */
const dueños = new Map();
rasgos.forEach((f, i) => {
  for (const punto of f.geometry.coordinates[0]) {
    const k = clave(punto);
    if (!dueños.has(k)) dueños.set(k, new Set());
    dueños.get(k).add(i);
  }
});
const firma = (k) => [...dueños.get(k)].sort((a, b) => a - b).join("|");

const arcos = new Map();  // id del arco -> puntos ya proyectados
const rutas = [];         // por departamento: qué arcos recorre y en qué sentido

for (const f of rasgos) {
  const anillo = f.geometry.coordinates[0].slice(0, -1); // sin repetir el cierre
  const n = anillo.length;

  // Un punto es NODO si la firma cambia a cualquiera de sus dos lados. Cortar
  // de los dos lados es lo que hace que un tramo compartido quede como un arco
  // idéntico para los dos vecinos: si se cortara de un lado solo, cada uno se
  // llevaría un punto extra propio y los arcos no encajarían.
  const nodos = [];
  for (let i = 0; i < n; i++) {
    const antes = firma(clave(anillo[(i - 1 + n) % n]));
    const acá = firma(clave(anillo[i]));
    const después = firma(clave(anillo[(i + 1) % n]));
    if (antes !== acá || acá !== después) nodos.push(i);
  }
  if (nodos.length === 0) nodos.push(0); // no toca a nadie: un único arco cerrado

  const ruta = [];
  for (let j = 0; j < nodos.length; j++) {
    const desde = nodos[j];
    const hasta = nodos[(j + 1) % nodos.length];

    const tramo = [];
    for (let i = desde; ; i = (i + 1) % n) {
      tramo.push(anillo[i]);
      if (i === hasta) break;
      if (tramo.length > n) throw new Error("el contorno no cierra");
    }
    if (nodos.length === 1) tramo.push(anillo[desde]);

    const ida = tramo.map(clave).join(";");
    const vuelta = tramo.map(clave).reverse().join(";");
    if (arcos.has(ida)) ruta.push({ id: ida, invertido: false });
    else if (arcos.has(vuelta)) ruta.push({ id: vuelta, invertido: true });
    else {
      arcos.set(ida, tramo.map(proyectar));
      ruta.push({ id: ida, invertido: false });
    }
  }
  rutas.push(ruta);
}

// ── 4. Simplificar cada arco una sola vez ─────────────────────────────────

function distanciaAlSegmento([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const largo = dx * dx + dy * dy;
  const t = largo === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Douglas–Peucker, en versión iterativa: se queda con los puntos que la línea
 * recta no puede reemplazar sin desviarse más que la tolerancia. Las puntas
 * siempre se conservan, que es lo que mantiene pegados a los vecinos.
 */
function simplificar(puntos, tolerancia) {
  const n = puntos.length;
  if (n < 3) return puntos.slice();
  const queda = new Uint8Array(n);
  queda[0] = queda[n - 1] = 1;
  const pendientes = [[0, n - 1]];
  while (pendientes.length) {
    const [a, b] = pendientes.pop();
    let peor = 0;
    let dónde = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distanciaAlSegmento(puntos[i], puntos[a], puntos[b]);
      if (d > peor) { peor = d; dónde = i; }
    }
    if (dónde >= 0 && peor > tolerancia) {
      queda[dónde] = 1;
      pendientes.push([a, dónde], [dónde, b]);
    }
  }
  return puntos.filter((_, i) => queda[i]);
}

const arcosSimples = new Map();
for (const [id, puntos] of arcos) arcosSimples.set(id, simplificar(puntos, TOLERANCIA));

// ── 5. Rearmar cada departamento ──────────────────────────────────────────

const redondear = (n) => Math.round(n * 10) / 10;

const departamentos = rasgos.map((f, i) => {
  const puntos = [];
  for (const { id, invertido } of rutas[i]) {
    const arco = invertido ? [...arcosSimples.get(id)].reverse() : arcosSimples.get(id);
    for (const p of arco) {
      const último = puntos.at(-1);
      if (!último || último[0] !== p[0] || último[1] !== p[1]) puntos.push(p);
    }
  }
  return { nombre: f.properties.name, puntos };
});

// ── 6. Dónde va la chapita con el nombre ──────────────────────────────────

function estáAdentro([px, py], poligono) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/** Distancia al borde: positiva adentro, negativa afuera. */
function holguraEn(punto, poligono) {
  let d = Infinity;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++)
    d = Math.min(d, distanciaAlSegmento(punto, poligono[i], poligono[j]));
  return estáAdentro(punto, poligono) ? d : -d;
}

/**
 * El "polo de inaccesibilidad": el punto más hondo del departamento, el que
 * queda más lejos de cualquier borde. Es donde la etiqueta tiene más aire.
 * Se busca con una rejilla que se va cerrando alrededor del mejor candidato.
 */
function polo(poligono) {
  const xs = poligono.map((p) => p[0]);
  const ys = poligono.map((p) => p[1]);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  let mejor = [(x0 + x1) / 2, (y0 + y1) / 2];
  let mejorHolgura = -Infinity;

  for (let vuelta = 0; vuelta < 7; vuelta++) {
    const N = 24;
    const dx = (x1 - x0) / N;
    const dy = (y1 - y0) / N;
    for (let i = 0; i <= N; i++)
      for (let j = 0; j <= N; j++) {
        const punto = [x0 + i * dx, y0 + j * dy];
        const h = holguraEn(punto, poligono);
        if (h > mejorHolgura) { mejorHolgura = h; mejor = punto; }
      }
    x0 = mejor[0] - dx * 1.5; x1 = mejor[0] + dx * 1.5;
    y0 = mejor[1] - dy * 1.5; y1 = mejor[1] + dy * 1.5;
  }
  return { centro: [redondear(mejor[0]), redondear(mejor[1])], holgura: redondear(mejorHolgura) };
}

// ── 7. La silueta del país ────────────────────────────────────────────────
//
// Los arcos que usa un solo departamento son la costa y la frontera. Encadenados
// dan el contorno del Uruguay. Con él se dibuja el agua (engordando la línea) y
// la textura de papel, sin necesidad de un solo rectángulo.

const usos = new Map();
for (const ruta of rutas) for (const { id } of ruta) usos.set(id, (usos.get(id) ?? 0) + 1);

const sueltos = [...usos]
  .filter(([, veces]) => veces === 1)
  .map(([id]) => arcosSimples.get(id).map(([x, y]) => [redondear(x), redondear(y)]));

const punta = (p) => `${p[0]},${p[1]}`;
const anillos = [];
while (sueltos.length) {
  let cadena = sueltos.shift();
  let seguí = true;
  while (seguí && punta(cadena[0]) !== punta(cadena.at(-1))) {
    seguí = false;
    for (let i = 0; i < sueltos.length; i++) {
      const otro = sueltos[i];
      if (punta(cadena.at(-1)) === punta(otro[0])) cadena = cadena.concat(otro.slice(1));
      else if (punta(cadena.at(-1)) === punta(otro.at(-1))) cadena = cadena.concat([...otro].reverse().slice(1));
      else if (punta(cadena[0]) === punta(otro.at(-1))) cadena = otro.slice(0, -1).concat(cadena);
      else if (punta(cadena[0]) === punta(otro[0])) cadena = [...otro].reverse().slice(0, -1).concat(cadena);
      else continue;
      sueltos.splice(i, 1);
      seguí = true;
      break;
    }
  }
  if (punta(cadena[0]) !== punta(cadena.at(-1))) throw new Error("la silueta no cierra");
  anillos.push(cadena);
}
anillos.sort((a, b) => b.length - a.length);

// ── 8. Escribir el archivo ────────────────────────────────────────────────

const aPath = (puntos) => `M ${puntos.map(([x, y]) => `${redondear(x)} ${redondear(y)}`).join(" L ")} Z`;

const salida = departamentos
  .map((d) => ({ nombre: d.nombre, forma: aPath(d.puntos), ...polo(d.puntos) }))
  .sort((a, b) => a.centro[1] - b.centro[1]); // de norte a sur, como se lee el mapa

const silueta = anillos.map(aPath).join(" ");

const ts = `/**
 * La geometría del mapa del Uruguay: los 19 departamentos dibujados en SVG.
 *
 * ⚠ GENERADO. No lo edites a mano: corré \`node herramientas/generar-mapa.mjs\`.
 *
 * Las formas salen de Natural Earth (ne_10m_admin_1_states_provinces), que es
 * de dominio público. Son el contorno real de cada departamento, simplificado
 * hasta ${TOLERANCIA} unidades de lienzo: a tamaño de pantalla se ve igual que el
 * original y pesa la décima parte.
 *
 * El lienzo es de ${ANCHO} × ${redondear(ALTO)}, en proyección Mercator. Es la misma
 * relación que tiene el Uruguay en cualquier mapa impreso.
 */

export interface Departamento {
  nombre: string;
  /** El contorno, en coordenadas del lienzo. */
  forma: string;
  /**
   * Dónde se ancla la chapita con el nombre: el punto más hondo del
   * departamento, el que queda más lejos de cualquier borde.
   */
  centro: [number, number];
  /**
   * Cuánto espacio libre hay alrededor de \`centro\`. Sirve para que la chapita
   * se achique sola en los departamentos chicos, sin listas a mano.
   */
  holgura: number;
}

/** El tamaño del lienzo sobre el que están dibujadas las formas. */
export const LIENZO = { ancho: ${ANCHO}, alto: ${redondear(ALTO)} } as const;

/**
 * El contorno del país entero: la costa y las fronteras, sin las divisiones de
 * adentro. Con esto se dibuja el agua —engordando la línea— y la textura del
 * papel. Al ser el borde real, el agua nunca puede derramarse en un rectángulo.
 */
export const SILUETA =
  "${silueta}";

/** Los 19, de norte a sur. */
export const DEPARTAMENTOS: Departamento[] = [
${salida
  .map(
    (d) => `  {
    nombre: ${JSON.stringify(d.nombre)},
    centro: [${d.centro[0]}, ${d.centro[1]}],
    holgura: ${d.holgura},
    forma:
      "${d.forma}",
  },`,
  )
  .join("\n")}
];
`;

fs.writeFileSync(DESTINO, ts);

// ── Lo que pasó ───────────────────────────────────────────────────────────
const crudos = rasgos.reduce((a, f) => a + f.geometry.coordinates[0].length, 0);
const finales = salida.reduce((a, d) => a + d.forma.split(" L ").length, 0);
console.log(`lienzo:    ${ANCHO} × ${redondear(ALTO)}`);
console.log(`arcos:     ${arcos.size}, de los cuales ${rutas.flat().filter((a) => a.invertido).length} van compartidos en espejo`);
console.log(`vértices:  ${crudos} → ${finales}`);
console.log(`silueta:   ${anillos.length} anillo(s), ${anillos[0].length} puntos`);
console.log(`escrito:   lib/mapa-uruguay.ts (${(ts.length / 1024).toFixed(1)} KB)`);
