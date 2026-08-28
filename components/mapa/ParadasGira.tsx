/**
 * Las paradas: los 19 nodos del camino, los dos nombres que se muestran y el
 * sombrero de gaucho parado en el departamento que toca.
 *
 * Acá está el hallazgo que condiciona todo el diseño del mapa: los nombres
 * salían a 6.3 px en un celular de 360 px (4.4 px el de Montevideo). Ya eran
 * ilegibles, y las 19 chapitas prendidas a la vez eran además el mayor
 * desorden de la pantalla. La estética de mapa del tesoro da la salida
 * natural: cada parada es un nodo compacto —una ✕ para las ganadas, un número
 * para las abiertas, un candado para las cerradas— y el NOMBRE se muestra sólo
 * para dos: la que estás mirando y la que te toca. Un dígito a este tamaño
 * sale a 8 px y se reconoce; una palabra de doce letras a 4.4 px, no.
 *
 * Toda la capa es `pointer-events-none` a propósito: el blanco táctil es el
 * polígono del departamento, que es enorme. Si los nodos comieran el click,
 * tocar justo la ✕ no haría nada.
 */

import { type Parada, proximaParada } from "@/lib/gira";
import { PARADAS_XY } from "@/lib/gira-camino";
import { LIENZO } from "@/lib/mapa-uruguay";
import { HUECO_SUROESTE, MARCO_INTERNO } from "./lienzo";

const RADIO = 17;

/**
 * El sombrero de gaucho, en tres cuartos: el ala en perspectiva, la copa con
 * su hendidura, la cinta de cuero y la sombra que lo apoya en el papel.
 *
 * OJO con animarlo: si se posicionara con `transform="translate(x,y)"` y se
 * animara con `transform` de CSS, el CSS pisa el atributo entero y la ficha
 * salta a (0,0). Por eso van dos `<g>` anidados: uno posiciona, el de adentro
 * se mueve.
 */
function Sombrero() {
  return (
    <g transform="rotate(-8)">
      <ellipse cx={2} cy={9} rx={33} ry={9} fill="#241609" opacity={0.4} />
      {/* la copa, atrás del ala */}
      <path
        d="M -17 0 C -19 -21, -13 -33, 0 -33 C 13 -33, 19 -21, 17 0 Z"
        fill="var(--color-quemado)"
        stroke="var(--color-tinta-mapa)"
        strokeWidth={2.2}
      />
      <path
        d="M -8 -30 C -3 -24, 3 -24, 8 -30"
        fill="none"
        stroke="var(--color-tinta-mapa)"
        strokeWidth={2}
        opacity={0.7}
      />
      {/* la cinta de cuero */}
      <path
        d="M -18 -4 C -9 3, 9 3, 18 -4 L 17 -11 C 8 -5, -8 -5, -17 -11 Z"
        fill="var(--color-tinta-mapa)"
        opacity={0.85}
      />
      {/* el ala, adelante */}
      <ellipse
        cx={0}
        cy={0}
        rx={35}
        ry={13}
        fill="var(--color-quemado)"
        stroke="var(--color-tinta-mapa)"
        strokeWidth={2.2}
      />
      <ellipse cx={0} cy={-1} rx={22} ry={7} fill="var(--color-tinta-mapa)" opacity={0.25} />
    </g>
  );
}

/** El nombre de un departamento, con halo de papel en vez de chapita opaca. */
function Toponimo({ x, y, texto, estrellas }: { x: number; y: number; texto: string; estrellas: number }) {
  // El halo es la técnica de los mapas impresos: el texto se despega del fondo
  // sin taparlo, que es lo que hacía la chapita negra de antes.
  const halo = {
    paintOrder: "stroke" as const,
    stroke: "var(--color-pergamino)",
    strokeWidth: 7,
    strokeLinejoin: "round" as const,
  };
  // El nombre no puede salirse del marco: se estima el ancho por la cantidad de
  // letras y se lo corre para adentro si hace falta.
  const medio = Math.max(60, texto.length * 9.5);
  const cx = Math.min(
    Math.max(x, MARCO_INTERNO.x + medio + 10),
    MARCO_INTERNO.x + MARCO_INTERNO.ancho - medio - 10,
  );
  // Arriba del nodo, salvo cerca del borde de arriba, donde se iría del papel.
  // Las estrellas van del lado de AFUERA del nombre, nunca entre el nombre y el
  // nodo: ahí es donde está parado el sombrero y se pisaban.
  const arriba = y > LIENZO.alto * 0.15;
  const cy = arriba ? y - 32 : y + 54;
  const cyEstrellas = arriba ? cy - 26 : cy + 25;

  return (
    <g>
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        fill="var(--color-tinta-mapa)"
        fontSize={30}
        letterSpacing={1.5}
        fontFamily="var(--font-display), Georgia, serif"
        {...halo}
      >
        {texto.toUpperCase()}
      </text>
      <text
        x={cx}
        y={cyEstrellas}
        textAnchor="middle"
        fill="var(--color-sangre)"
        fontSize={22}
        fontFamily="var(--font-ui), sans-serif"
        {...halo}
      >
        {"★".repeat(estrellas)}
      </text>
    </g>
  );
}

export interface PropsParadas {
  paradas: readonly Parada[];
  elegido: string | null;
}

export function ParadasGira({ paradas, elegido }: PropsParadas) {
  const proximo = proximaParada(paradas);
  const ganadas = paradas.filter((p) => p.estado === "ganada").length;

  // Dos nombres y no diecinueve: el que estás mirando y el que te toca. Si son
  // el mismo, uno.
  const conNombre = paradas.filter(
    (p) => p.personalidad.departamento === elegido || p.esElProximo,
  );

  return (
    <g className="pointer-events-none">
      {paradas.map((parada, i) => {
        const [x, y] = PARADAS_XY[i];

        if (parada.esElProximo) {
          return (
            <g key={parada.paso} transform={`translate(${x}, ${y})`}>
              <g className="ficha-gaucho">
                <Sombrero />
              </g>
            </g>
          );
        }

        if (parada.estado === "ganada") {
          // X marks the spot: la cruz de los mapas del tesoro.
          return (
            <g key={parada.paso} transform={`translate(${x}, ${y})`}>
              <path
                d="M -13 -13 L 13 13 M 13 -13 L -13 13"
                stroke="var(--color-pergamino)"
                strokeWidth={11}
                strokeLinecap="round"
                opacity={0.75}
              />
              <path
                d="M -13 -13 L 13 13 M 13 -13 L -13 13"
                stroke="var(--color-sangre)"
                strokeWidth={6}
                strokeLinecap="round"
              />
            </g>
          );
        }

        if (parada.estado === "abierta") {
          return (
            <g key={parada.paso} transform={`translate(${x}, ${y})`}>
              <circle
                r={RADIO}
                fill="var(--color-pergamino-luz)"
                stroke="var(--color-sangre)"
                strokeWidth={3.4}
              />
              <text
                y={9}
                textAnchor="middle"
                fill="var(--color-tinta-mapa)"
                fontSize={25}
                fontFamily="var(--font-ui), sans-serif"
              >
                {parada.paso}
              </text>
            </g>
          );
        }

        // Cerrada: un candado tenue. Se ve que hay algo, y que todavía no.
        return (
          <g key={parada.paso} transform={`translate(${x}, ${y})`} opacity={0.4}>
            <path
              d="M -7 -6 A 7 8 0 0 1 7 -6"
              fill="none"
              stroke="var(--color-tinta-mapa)"
              strokeWidth={3}
            />
            <rect
              x={-11}
              y={-6}
              width={22}
              height={17}
              rx={3}
              fill="var(--color-pergamino-luz)"
              stroke="var(--color-tinta-mapa)"
              strokeWidth={2.4}
            />
          </g>
        );
      })}

      {conNombre.map((parada) => {
        const i = paradas.indexOf(parada);
        return (
          <Toponimo
            key={`nombre-${parada.paso}`}
            x={PARADAS_XY[i][0]}
            y={PARADAS_XY[i][1]}
            texto={parada.personalidad.departamento}
            estrellas={parada.personalidad.dificultad}
          />
        );
      })}

      {/* El contador, al lado del mate. Va acá y no en `Adornos` porque cambia
          con el progreso, y `Adornos` es constante justamente por no cambiar. */}
      <text
        x={HUECO_SUROESTE.x + 128}
        y={HUECO_SUROESTE.y + 62}
        fill="var(--color-tinta-mapa)"
        fontSize={34}
        fontFamily="var(--font-mano), cursive"
      >
        {ganadas} de {paradas.length}
      </text>
      <text
        x={HUECO_SUROESTE.x + 128}
        y={HUECO_SUROESTE.y + 88}
        fill="var(--color-tinta-mapa)"
        fontSize={19}
        opacity={0.7}
        fontFamily="var(--font-ui), sans-serif"
      >
        {proximo ? `falta ${proximo.personalidad.departamento}` : "gira completa"}
      </text>
    </g>
  );
}
