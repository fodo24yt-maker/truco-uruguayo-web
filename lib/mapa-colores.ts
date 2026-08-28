/**
 * El color de cada departamento en el mapa de la gira.
 *
 * Va aparte de `mapa-uruguay.ts` porque ese archivo se genera: la geometría
 * sale de datos cartográficos, pero esto es una decisión de diseño y se elige
 * a mano.
 *
 * Son AGUADAS SOBRE PAPEL: cada tono es el pergamino (`--color-pergamino`) con
 * un poco de pigmento encima, como una acuarela de mapa viejo. Ninguno tapa el
 * papel ni compite con la tinta: arriba van el camino colorado y los nombres, y
 * si los departamentos gritan, el camino se pierde.
 *
 * La regla del archivo sigue siendo la misma: ningún VECINO repite tono. No que
 * los 19 sean distintos entre sí —dos departamentos lejanos pueden compartir
 * aguada, como en cualquier mapa impreso—, sino que dos que se tocan se
 * distingan. Está verificado contra la adyacencia real del mapa (los vecinos se
 * detectan por vértices compartidos): el contraste mínimo entre vecinos es 44.7
 * en una distancia RGB ponderada, y de ahí salió esta asignación.
 *
 * La dificultad NO se codifica acá. Esa la cuentan las estrellitas.
 */
export const COLOR_DEPARTAMENTO: Record<string, string> = {
  Artigas: "#cfb075",
  Salto: "#a88f7b",
  Rivera: "#a89c66",
  Paysandú: "#c09c6a",
  Tacuarembó: "#ceaf7c",
  "Cerro Largo": "#c6a362",
  "Río Negro": "#999e78",
  Durazno: "#b68468",
  "Treinta y Tres": "#a4a37a",
  Soriano: "#c2b282",
  Flores: "#c89a6b",
  Lavalleja: "#c59366",
  Florida: "#d2b47b",
  Rocha: "#d1ae7c",
  Colonia: "#bb9564",
  "San José": "#9c937a",
  Canelones: "#aea87d",
  Maldonado: "#a88f7b",
  Montevideo: "#c9a868",
};
