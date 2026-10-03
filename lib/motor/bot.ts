/**
 * El bot.
 *
 * Hay uno solo: lo que cambia de rival en rival es la personalidad que se le
 * pasa (ver personalidades.ts). El mentiroso de Rocha y el mozo de Ciudad
 * Vieja corren exactamente este código; lo único distinto son los umbrales con
 * los que canta, quiere y miente, cuántos errores comete con las cartas, y
 * cuánto te lee.
 *
 * Sólo mira SUS cartas y lo que está sobre la mesa. Nunca lee la mano del
 * jugador: eso sería hacer trampa, y además arruinaría el aprendizaje. Lo que
 * sabe de vos sale de la ficha (lectura.ts), que se arma con lo que jugaste a
 * la vista de todos.
 */

import { type Carta, calidadDeMano, fuerza } from "./baraja.ts";
import { valorEnvido } from "./tantos.ts";
import {
  type Accion,
  type Jugador,
  type Partida,
  accionesPosibles,
} from "./partida.ts";
import { LUKI, type Personalidad } from "./personalidades.ts";
import { type Ficha, ajustePorLectura, fichaVacia } from "./lectura.ts";
import {
  ajustePorMarcador,
  convieneLaFalta,
  creditoDe,
  mentiraEfectiva,
  situacion,
  umbralDeLaFalta,
} from "./plan.ts";

/**
 * ¿Esta baza ya está perdida?
 *
 * Si el rival tiró una carta y ninguna de las que me quedan le gana, esa baza
 * es suya y no hay nada que hacer. Cantar truco ahí es tirar puntos: es
 * exactamente el error que cometía el bot cuando le tiraban el 2 de la muestra
 * —la carta más fuerte del juego, que no le gana nadie— y él cantaba igual.
 *
 * Ojo con lo que NO hace esta función: no mira las cartas del rival ni adivina
 * lo que le queda en la mano. Sólo mira lo que está sobre la mesa, que es
 * información que cualquiera que esté sentado ahí puede ver.
 */
function bazaPerdida(p: Partida, quien: Jugador): boolean {
  const baza = p.bazas[p.bazas.length - 1];
  const cartaDelRival = quien === "rival" ? baza.vos : baza.rival;
  if (!cartaDelRival) return false; // todavía no tiró: no hay nada perdido

  const suFuerza = fuerza(cartaDelRival, p.muestra);
  return !p.cartas[quien].some((c) => fuerza(c, p.muestra) > suFuerza);
}

/**
 * ¿Conviene cantar truco en este momento?
 *
 * Un jugador con sentido común no canta cuando la mano ya se le fue. Cuánto
 * caso le hace a esto depende de la personalidad: los rivales duros nunca
 * cometen ese error, los principiantes se entusiasman igual.
 */
function trucoTieneSentido(
  p: Partida,
  quien: Jugador,
  personalidad: Personalidad,
  azar: () => number,
): boolean {
  if (!bazaPerdida(p, quien)) return true;

  // La baza en curso está perdida. Si además ya perdió una anterior, la mano
  // entera está liquidada: cantar es regalar puntos.
  const perdidas = p.bazas.filter(
    (b) => b.ganador !== null && b.ganador !== quien && b.ganador !== "parda",
  ).length;
  if (perdidas >= 1) return azar() > personalidad.sentidoComun;

  // Todavía puede dar vuelta la mano ganando las dos que siguen, pero es un
  // mal momento para cantar: sólo se manda si le queda algo muy fuerte.
  const leQuedaAlgoBravo = p.cartas[quien].some((c) => fuerza(c, p.muestra) >= 95);
  if (leQuedaAlgoBravo) return true;
  return azar() > personalidad.sentidoComun;
}

/**
 * Cuánto excedente sobre el umbral ya es "tengo muchísimo", en cada escala.
 *
 * El envido se mide en puntos de tanto y el truco en calidad de 0 a 1, así que
 * no hay un número que sirva para los dos y hay que decírselo.
 */
export const MUCHO_DE_MAS = { envido: 8, truco: 0.25 } as const;

/**
 * Decide si canta aunque no tenga con qué.
 *
 * Es toda la mentira del bot: si le falta poco para el umbral, con cierta
 * probabilidad canta igual. Cuanto peor es su mano, menos probable es que se
 * anime, así que un mentiroso no canta vale cuatro con un cuatro cada vez,
 * sino de a ratos, que es lo que lo hace creíble.
 *
 * ─── Y EL SILENCIO, QUE NO ES UNA MONEDA ────────────────────────────────────
 *
 * Guardarse un canto que se podía hacer sirve para no ser transparente: si
 * cantaran siempre que pueden, les leerías el tanto exacto. Pero hasta el
 * 11/9/2026 el silencio se tiraba a la moneda sin mirar CUÁNTO se tenía, y eso
 * salía carísimo: entre dos ★2, la callada (silencio 0,35) sacaba 36,6% y el
 * hablador (0,15) 45,6%. Nueve puntos de winrate por un rasgo de carácter, y
 * encima los personajes "callados" son de los lindos.
 *
 * Ahora el silencio se diluye con lo que sobra sobre el umbral. Callarse con el
 * tanto justo es oficio —es lo que hace el que espera para subir—; callarse un
 * 33 no es misterioso, es distraído. El carácter se conserva y el precio se va.
 */
function seAnima(
  tiene: number,
  necesita: number,
  personalidad: Personalidad,
  azar: () => number,
  mentira: number,
  muchoDeMas: number = MUCHO_DE_MAS.envido,
): boolean {
  if (tiene >= necesita) {
    const deMas = Math.max(0, tiene - necesita);
    return azar() > personalidad.silencio / (1 + deMas / muchoDeMas);
  }
  if (mentira <= 0) return false;

  const leFalta = necesita - tiene;
  // Cuanto más lejos está del umbral, más difícil que se mande
  const ganas = mentira / (1 + leFalta * 0.5);
  return azar() < ganas;
}

/**
 * Cuánto más exigente se pone por el solo hecho de que le subieron la apuesta.
 *
 * Un jugador con oficio mira sus cartas y decide: si el truco lo quería con
 * esta mano, el vale cuatro también, porque hay MÁS para ganar, no menos. Un
 * principiante no: ve el vale cuatro y se achica aunque tenga.
 *
 * `p.truco.nivel` vale 1 en el truco, 2 en el retruco y 3 en el vale cuatro, y
 * el miedo cuenta escalones por encima del primero: al truco pelado nadie le
 * tiene miedo.
 */
function miedoALaSubida(p: Partida, personalidad: Personalidad): number {
  const escalones = Math.max(0, p.truco.nivel - 1);
  return (1 - personalidad.aguante) * MIEDO_POR_ESCALON * escalones;
}

/** Cuánto sube el umbral de querer, por escalón, el que no aguanta nada. */
const MIEDO_POR_ESCALON = 0.12;

/**
 * Qué haría el bot en el lugar de `quien`. Por defecto juega de rival, pero
 * puede razonar por cualquiera de los dos lados: eso es lo que después permite
 * ofrecer una sugerencia al jugador en modo aprendizaje.
 *
 * `ficha` es lo que tiene anotado del rival. Si no se le pasa nada, juega sin
 * prejuicios: es lo que hacen los primeros de la gira, que no leen a nadie.
 *
 * `espejo` es lo contrario: lo que el RIVAL pudo anotar de él. Es la misma
 * ficha corrida al revés, y de ahí sale si le van a creer la próxima mentira
 * (ver plan.ts). Sin ella juega como si recién se sentara, que es lo correcto.
 */
export function decidirJugada(
  p: Partida,
  quien: Jugador = "rival",
  azar: () => number = Math.random,
  personalidad: Personalidad = LUKI,
  ficha: Ficha = fichaVacia(),
  espejo: Ficha = fichaVacia(),
): Accion | null {
  const posibles = accionesPosibles(p, quien);
  if (posibles.length === 0) return null;

  const misCartas = p.cartas[quien];
  const calidad = calidadDeMano(misCartas, p.muestra);
  // El tanto se cuenta con las tres cartas del reparto, no con las que quedan
  const tanto = valorEnvido(p.manoInicial[quien], p.muestra);
  const puede = (tipo: Accion["tipo"]) => posibles.some((a) => a.tipo === tipo);

  // Lo que tiene anotado del rival corre los umbrales. Con `lectura` en 0 —los
  // niveles 1 y 2— el ajuste es exactamente cero y juega como jugó siempre.
  const lectura = ajustePorLectura(ficha, personalidad.lectura);
  // Y cómo va la partida, que hasta el 11/9/2026 no se miraba nunca.
  const mesa = situacion(p.puntos, quien);
  const marcador = ajustePorMarcador(mesa, personalidad.plan);

  const cantaEnvidoCon = personalidad.cantaEnvidoCon + lectura.cantaEnvido;
  const quiereEnvidoCon =
    personalidad.quiereEnvidoCon + lectura.quiereEnvido + marcador.quiereEnvido;
  const quiereTrucoCon =
    personalidad.quiereTrucoCon + lectura.quiereTruco + marcador.quiereTruco;
  const cantaTrucoCon = personalidad.cantaTrucoCon + lectura.cantaTruco + marcador.cantaTruco;
  // La mentira no es una moneda que se tira en cada mano: se administra según
  // la cara que uno viene poniendo. Con `plan` en 0 es la de siempre.
  const mentira = mentiraEfectiva(
    personalidad.mentira,
    creditoDe(espejo),
    mesa,
    personalidad.plan,
  );
  /* La subida se corre con el MISMO ajuste que el canto, y es acá donde se
     cobra de verdad al que se achica: el que le tiene miedo al vale cuatro no
     se delata cuando le cantan truco, se delata cuando le suben. Subirle a un
     cobarde con mano mediana es la jugada que su miedo paga. */
  const subeTrucoCon = personalidad.subeTrucoCon + lectura.cantaTruco + marcador.cantaTruco;

  // ── Tiene flor: la canta ─────────────────────────────────────────────────
  // Son 3 puntos seguros; guardársela es regalarlos. Lo único que decide es si
  // la sube. El bot sólo mira su propio tanto de flor, nunca el del rival.
  if (puede("flor") || puede("flor-canto")) {
    const miFlor = p.flor[quien].valor;
    const meSubieron = p.pendiente?.tipo === "flor" && p.pendiente.cadena.length > 0;

    if (meSubieron) {
      if (miFlor >= personalidad.contraflorCon && puede("flor-canto")) {
        return { tipo: "flor-canto", canto: "contraflor-al-resto" };
      }
      return miFlor >= personalidad.quiereFlorCon
        ? { tipo: "quiero" }
        : { tipo: "no-quiero" };
    }

    if (miFlor >= personalidad.contraflorCon && puede("flor-canto")) {
      return { tipo: "flor-canto", canto: "contraflor-al-resto" };
    }
    if (
      puede("flor-canto") &&
      seAnima(miFlor, personalidad.conFlorEnvidoCon, personalidad, azar, mentira)
    ) {
      return { tipo: "flor-canto", canto: "con-flor-envido" };
    }
    return { tipo: "flor" };
  }

  // ── Le cantaron algo: hay que responder ──────────────────────────────────
  if (p.pendiente) {
    if (p.pendiente.tipo === "envido") {
      // Con la falta en juego se pone exigente: se juega la partida
      const enJuegoLaFalta = p.pendiente.cadena.includes("falta-envido");
      const umbral = enJuegoLaFalta
        ? umbralDeLaFalta(personalidad.quiereEnvidoCon, lectura.quiereEnvido, mesa, personalidad.plan)
        : quiereEnvidoCon;

      if (
        tanto >= personalidad.subeEnvidoCon &&
        !enJuegoLaFalta &&
        convieneLaFalta(mesa, personalidad.plan)
      ) {
        return { tipo: "envido", canto: "falta-envido" };
      }
      if (
        tanto >= personalidad.subeEnvidoCon - 3 &&
        puedeCantar(posibles, "real-envido")
      ) {
        return { tipo: "envido", canto: "real-envido" };
      }
      return tanto >= umbral ? { tipo: "quiero" } : { tipo: "no-quiero" };
    }

    // EL ENVIDO VA PRIMERO. Si le cantaron truco y todavía no habló, el envido
    // se juega antes: es la jugada, no una picardía (reglas.txt 14.1).
    if (
      p.pendiente.tipo === "truco" &&
      puedeCantar(posibles, "envido") &&
      seAnima(tanto, cantaEnvidoCon, personalidad, azar, mentira)
    ) {
      return tanto >= personalidad.subeEnvidoCon
        ? { tipo: "envido", canto: "real-envido" }
        : { tipo: "envido", canto: "envido" };
    }

    // Truco: quiere con cartas, sube sólo con cartas muy buenas. Y no sube
    // nunca si la baza que está sobre la mesa ya la perdió.
    if (
      calidad > subeTrucoCon &&
      puede("truco") &&
      trucoTieneSentido(p, quien, personalidad, azar)
    ) {
      return { tipo: "truco" };
    }
    return calidad > quiereTrucoCon + miedoALaSubida(p, personalidad)
      ? { tipo: "quiero" }
      : { tipo: "no-quiero" };
  }

  // ── Turno libre ──────────────────────────────────────────────────────────

  // Canta el envido cuando tiene con qué. El "silencio" hace que a veces se lo
  // guarde: si cantara siempre que puede, le leerías el tanto exacto.
  if (
    puedeCantar(posibles, "envido") &&
    seAnima(tanto, cantaEnvidoCon, personalidad, azar, mentira)
  ) {
    if (tanto >= personalidad.subeEnvidoCon) {
      return { tipo: "envido", canto: "real-envido" };
    }
    return { tipo: "envido", canto: "envido" };
  }

  // Canta truco con mano fuerte, o con mano mediana si ya ganó la primera
  const ganoLaPrimera = p.bazas[0]?.ganador === quien;
  const umbralTruco = ganoLaPrimera ? cantaTrucoCon - 0.23 : cantaTrucoCon;
  if (
    puede("truco") &&
    trucoTieneSentido(p, quien, personalidad, azar) &&
    seAnima(calidad, umbralTruco, personalidad, azar, mentira, MUCHO_DE_MAS.truco)
  ) {
    return { tipo: "truco" };
  }

  return { tipo: "jugar", carta: elegirCarta(p, quien, personalidad, azar) };
}

const puedeCantar = (posibles: Accion[], canto: string) =>
  posibles.some((a) => a.tipo === "envido" && a.canto === canto);

/**
 * Qué carta tirar. La regla de oro: si el rival ya tiró, la más baja que le
 * gane; si no le puede ganar, la más baja de todas (no se regalan cartas).
 * Si abre la baza, tira la más alta: guardar la mata para la tercera es el
 * error clásico (reglas.txt 16.3).
 *
 * Eso es lo que hace un jugador con criterio. Los que recién empiezan se
 * equivocan, y ahí está `criterio`: cuanto más bajo, más seguido cometen
 * justamente los dos errores que las reglas nombran. Es lo que más se nota
 * jugando contra ellos —mucho más que con qué tanto cantan—, porque las manos
 * de truco se ganan y se pierden acá.
 */
function elegirCarta(
  p: Partida,
  quien: Jugador,
  personalidad: Personalidad,
  azar: () => number,
): Carta {
  const misCartas = [...p.cartas[quien]].sort(
    (a, b) => fuerza(a, p.muestra) - fuerza(b, p.muestra),
  );
  const baza = p.bazas[p.bazas.length - 1];
  const cartaRival = quien === "rival" ? baza.vos : baza.rival;
  const seEquivoca = azar() > personalidad.criterio;

  if (!cartaRival) {
    // Abre la baza. Lo correcto es salir con la más alta.
    // El error de manual es el contrario: guardarse la mata para la tercera,
    // que muchas veces no llega, y abrir con la más chica (reglas.txt 16.3).
    return seEquivoca ? misCartas[0] : misCartas[misCartas.length - 1];
  }

  const fuerzaRival = fuerza(cartaRival, p.muestra);
  const ganadora = misCartas.find((c) => fuerza(c, p.muestra) > fuerzaRival);
  if (!ganadora) return misCartas[0];

  // El otro error del que recién empieza: podía ganar la baza y no la gana,
  // por miedo a gastar la carta buena. Regalar bazas es la forma más cara de
  // perder una mano.
  return seEquivoca ? misCartas[0] : ganadora;
}
