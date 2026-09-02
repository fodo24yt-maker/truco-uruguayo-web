/**
 * El ambiente de cada departamento.
 *
 * La gira pasa por 19 departamentos y hasta ahora todos se jugaban en el mismo
 * bar de noche. Ahora cada parada tiene su lugar: no es lo mismo el fondo de un
 * boliche de La Blanqueada que el mediodía de la feria de Las Piedras.
 *
 * SIETE AMBIENTES Y NO DIECINUEVE. Cada uno se comparte entre departamentos
 * vecinos y después cada departamento le pone su acento de color. Diecinueve
 * escenas dibujadas aparte serían diecinueve cosas que mantener, y con seis o
 * siete de ellas flojas la gira se sentiría peor, no mejor.
 *
 * EL ACENTO SALE DEL MAPA. `lib/mapa-colores.ts` ya le puso un color a cada
 * departamento para el pergamino de la gira. Se reusa acá para que el mapa y la
 * mesa hablen del mismo lugar con el mismo color, en vez de tener dos paletas
 * que se contradicen.
 *
 * TODO SE DIBUJA POR CÓDIGO, como el resto del juego: no hay una sola imagen.
 */

import type { ClaveObjeto } from "./objetos.ts";
import { COLOR_DEPARTAMENTO } from "./mapa-colores.ts";

export type ClaveAmbiente =
  | "bar-ciudad"
  | "feria"
  | "campo"
  | "sierra"
  | "costa"
  | "litoral"
  | "norte";

/** Qué se recorta contra el fondo, en silueta. */
export type Recorte =
  | "botellas"
  | "toldos"
  | "ombu"
  | "cerros"
  | "palmeras"
  | "muelle"
  | "cuchillas";

export interface Ambiente {
  clave: ClaveAmbiente;
  /** Para el lector de pantalla y para el cartel de la parada. */
  nombre: string;
  /** El fondo, de arriba a abajo. */
  cielo: readonly [string, string];
  /** El color de la luz que cae sobre la mesa. Es lo que más se nota. */
  luz: string;
  /** La madera de la mesa: del centro iluminado al borde apagado. */
  mesa: readonly [string, string, string, string];
  recorte: Recorte;
  /** De noche la penumbra cierra fuerte; de día, apenas. */
  deNoche: boolean;
}

export const AMBIENTES: Record<ClaveAmbiente, Ambiente> = {
  "bar-ciudad": {
    clave: "bar-ciudad",
    nombre: "un boliche de barrio, de noche",
    cielo: ["#1c120b", "#0e0906"],
    luz: "#f0b45c",
    mesa: ["#a97341", "#7d5330", "#4a2d16", "#1d1108"],
    recorte: "botellas",
    deNoche: true,
  },
  feria: {
    clave: "feria",
    nombre: "la feria, al mediodía",
    cielo: ["#8fb6cf", "#c9c0a2"],
    luz: "#ffe6b0",
    mesa: ["#c69457", "#a2743f", "#6d4a24", "#3a2611"],
    recorte: "toldos",
    deNoche: false,
  },
  campo: {
    clave: "campo",
    nombre: "el galpón, a la tarde",
    cielo: ["#7d8a63", "#3f3a24"],
    luz: "#f3c67e",
    mesa: ["#b98449", "#8f6335", "#5b3a1c", "#28180b"],
    recorte: "ombu",
    deNoche: false,
  },
  sierra: {
    clave: "sierra",
    nombre: "las sierras, al caer el sol",
    cielo: ["#6f7c96", "#3a3242"],
    luz: "#e8bd86",
    mesa: ["#ad7c4a", "#855c34", "#54371c", "#241609"],
    recorte: "cerros",
    deNoche: false,
  },
  costa: {
    clave: "costa",
    nombre: "la rambla, a la tardecita",
    cielo: ["#e0a15e", "#5b4a55"],
    luz: "#ffd39a",
    mesa: ["#c08e58", "#96683a", "#5e3d1e", "#2a1a0c"],
    recorte: "palmeras",
    deNoche: false,
  },
  litoral: {
    clave: "litoral",
    nombre: "el río, contra la luz",
    cielo: ["#c9a86a", "#43413b"],
    luz: "#ffcf8e",
    mesa: ["#b6884f", "#8b6132", "#57391b", "#26170a"],
    recorte: "muelle",
    deNoche: false,
  },
  norte: {
    clave: "norte",
    nombre: "el norte, con el sol alto",
    cielo: ["#a89a72", "#4a3d29"],
    luz: "#ffdfa0",
    mesa: ["#c3915a", "#996b3c", "#5f3e1f", "#2b1a0c"],
    recorte: "cuchillas",
    deNoche: false,
  },
};

/**
 * Qué ambiente le toca a cada departamento.
 *
 * Los 19 están acá y no en `personalidades.ts` a propósito: el rival es una
 * forma de jugar y el ambiente es el lugar donde se juega. Si un día se agrega
 * un segundo rival por departamento, comparten el lugar sin tocar nada.
 */
const POR_DEPARTAMENTO: Record<string, ClaveAmbiente> = {
  Montevideo: "bar-ciudad",
  Canelones: "feria",
  "San José": "campo",
  Florida: "campo",
  Durazno: "campo",
  Flores: "campo",
  "Treinta y Tres": "campo",
  "Cerro Largo": "campo",
  Lavalleja: "sierra",
  Maldonado: "costa",
  Rocha: "costa",
  Colonia: "litoral",
  Soriano: "litoral",
  "Río Negro": "litoral",
  Paysandú: "litoral",
  Salto: "litoral",
  Rivera: "norte",
  Artigas: "norte",
  Tacuarembó: "norte",
};

/**
 * EL OBJETO PROPIO DE CADA DEPARTAMENTO.
 *
 * Va aparte de `POR_DEPARTAMENTO` y no adentro del ambiente porque es
 * justamente lo que los distingue CUANDO COMPARTEN AMBIENTE: Salto y Paysandú
 * juegan los dos en el litoral y hoy la pantalla es la misma salvo por el tono.
 *
 * Por eso la única regla al llenar esta tabla es que **dos departamentos del
 * mismo ambiente no pueden llevar el mismo objeto**. Entre ambientes distintos
 * sí se puede repetir: nunca se ven uno al lado del otro y encima toda la
 * escena es otra.
 *
 * Están los diecinueve. `objetoDe` igual sabe devolver `null`, y eso se deja a
 * propósito: si un día se agrega un departamento y alguien se olvida de darle
 * el suyo, la mesa queda sin objeto en vez de reventar.
 */
const OBJETO_DEPARTAMENTO: Record<string, ClaveObjeto> = {
  // bar-ciudad
  Montevideo: "vaso", //          un vaso de caña en la barra
  // feria
  Canelones: "cajon", //          el cajón de fruta de la feria de Las Piedras
  // campo — son SEIS y comparten la misma escena: acá es donde más falta hace
  "San José": "tarro", //         el tarro de la cuenca lechera
  Florida: "boina", //            la boina apoyada del que se sentó a jugar
  Durazno: "durazno", //          se llama así
  Flores: "flor", //              se llama así, y además es un canto del truco
  "Treinta y Tres": "espuela", // la rodaja de los Treinta y Tres Orientales
  "Cerro Largo": "guampa", //     el cuerno de la frontera de Melo
  // sierra
  Lavalleja: "farol", //          las sierras al caer el sol
  // costa
  Maldonado: "caracol", //        Punta del Este
  Rocha: "estrella", //           Cabo Polonio, La Paloma
  // litoral — son CINCO
  Colonia: "llave", //            el barrio histórico
  Soriano: "espiga", //           el trigo de Mercedes
  "Río Negro": "lata", //         Fray Bentos: la carne en lata que se comió medio mundo
  Paysandú: "botella", //         la ciudad de la cerveza
  Salto: "naranja", //            la citricultura
  // norte
  Rivera: "cafecito", //          la frontera que se cruza caminando
  Artigas: "amatista", //         de acá salen las amatistas más grandes del mundo
  Tacuarembó: "sombrero", //      el norte gaucho, y el rival de ahí no tiene cabeza
};

/**
 * El objeto de ese departamento, o `null` si todavía no está dibujado.
 *
 * `Object.hasOwn` y no `?? null` a secas: indexar un objeto plano con un string
 * te devuelve también lo que hay en la cadena de prototipos, así que
 * `objetoDe("toString")` daría una función en vez de `null` y `PROPORCION[…]`
 * reventaría. Hoy no llega nadie de afuera —el departamento sale siempre de
 * `PERSONALIDADES`— pero es el agujero que ya mordió a este proyecto una vez y
 * no cuesta nada cerrarlo acá.
 */
export const objetoDe = (departamento: string): ClaveObjeto | null =>
  Object.hasOwn(OBJETO_DEPARTAMENTO, departamento)
    ? OBJETO_DEPARTAMENTO[departamento]
    : null;

/** El acento del departamento, el mismo tono con el que se pinta en el mapa. */
export const acentoDe = (departamento: string): string =>
  COLOR_DEPARTAMENTO[departamento] ?? "#c9a868";

/**
 * El ambiente de un departamento. Un nombre que no está en la lista cae en el
 * boliche de siempre: la mesa nunca se queda sin fondo.
 */
export const ambienteDe = (departamento: string): Ambiente =>
  AMBIENTES[POR_DEPARTAMENTO[departamento] ?? "bar-ciudad"];
