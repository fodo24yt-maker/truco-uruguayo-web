/**
 * El color de cada departamento en el mapa de la gira.
 *
 * Va aparte de `mapa-uruguay.ts` porque ese archivo se genera: la geometría
 * sale de datos cartográficos, pero esto es una decisión de diseño y se elige
 * a mano.
 *
 * Un tono por departamento, para que se distingan de un vistazo. Todos salen
 * del mismo family que el resto del sitio —del papel al cuero quemado, entre
 * los tokens `papel` y `madera-clara`— y ningún vecino repite. Ninguno llega a
 * ser casi blanco: sobre el fondo de noche, un tono muy claro se lee como un
 * agujero en el mapa.
 *
 * La dificultad NO se codifica acá. Esa la cuentan las estrellitas.
 */
export const COLOR_DEPARTAMENTO: Record<string, string> = {
  Artigas: "#a2703f",
  Salto: "#c09660",
  Rivera: "#8f6440",
  Paysandú: "#9a6b4a",
  Tacuarembó: "#cdad78",
  "Cerro Largo": "#b98a52",
  "Río Negro": "#b8925c",
  Durazno: "#a87c46",
  "Treinta y Tres": "#94674a",
  Soriano: "#c8a86e",
  Flores: "#8d6b47",
  Lavalleja: "#a37850",
  Florida: "#bd9257",
  Rocha: "#c2a06a",
  Colonia: "#9e7550",
  "San José": "#c4a473",
  Canelones: "#ab7c4e",
  Maldonado: "#bf9a62",
  Montevideo: "#8a5c3d",
};
