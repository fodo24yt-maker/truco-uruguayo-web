/**
 * Dónde cae cada cosa sobre la mesa.
 *
 * ── El problema que resuelve ──────────────────────────────────────────────
 *
 * Antes la mesa era un `<div>` con `rotateX(34deg)` y la interfaz iba PLANA
 * encima, así que todo se veía del mismo tamaño: el mazo del fondo medía lo
 * mismo que tus cartas. En las referencias no: lo que está lejos es más chico,
 * y eso es la mitad de por qué se leen como una foto y no como una pantalla.
 *
 * Ahora la perspectiva viene HORNEADA en la textura de la mesa
 * (`herramientas/generar-escena.mjs`), pero los objetos siguen siendo elementos
 * de verdad y hay que meterlos dentro de ese plano. Esta es la cuenta que los
 * mete.
 *
 * ── Cómo se usa ───────────────────────────────────────────────────────────
 *
 *   u = 0 es el borde izquierdo de la mesa, u = 1 el derecho
 *   v = 0 es el borde LEJANO (el del rival), v = 1 el CERCANO (el tuyo)
 *
 *   const { izquierda, arriba, escala } = posicionEnMesa(0.5, 0.25);
 *
 * y la escala sale sola: no hay que acordarse de achicar las cartas del rival.
 *
 * ── De dónde salen los números ────────────────────────────────────────────
 *
 * Son los MISMOS con los que se hornea la textura, y por eso están escritos
 * como constantes con nombre y no metidos en la fórmula: si un día se cambia la
 * inclinación de la cámara en el generador, hay que cambiarlos acá también o la
 * libreta va a flotar por encima de la madera.
 *
 * La proyección en perspectiva de un plano inclinado es
 *
 *     escala(v) = P / (P + DESVIO · (1 − v))
 *
 * donde P es la distancia del ojo al plano de proyección y DESVIO es cuánto se
 * aleja el borde lejano. Con estos dos, el borde de allá mide el 62% del de acá.
 */

/** Distancia del ojo. Igual que la `perspective` del generador. */
const P = 4700;
/** Cuánto se hunde el borde lejano: alto del plano × sen(inclinación). */
const DESVIO = 2881;
/**
 * El ancho del plano comparado con el del cuadro.
 *
 * Es mayor que 1 porque la mesa se SALE del cuadro por los costados, como en
 * las referencias: no se le ven los bordes laterales en ningún lado.
 *
 * SUBIÓ DE 3600 A 4700 el 31/8/2026. Con 3600 la mesa se salía del cuadro
 * abajo pero NO allá al fondo: el borde lejano mide el 62% del plano, o sea
 * 2232 de un cuadro de 2800, y quedaba un 10% transparente en cada esquina de
 * arriba. En el celular ese pedazo cae fuera del recorte de `object-cover`; en
 * PC se ve, con un color plano detrás. Con 4700 el lejano mide 2914 y la
 * madera llega al borde en las dos.
 *
 * Este número es el ancho del plano del generador sobre el ancho del cuadro:
 * si se toca `PLANO.ancho` en `herramientas/generar-escena.mjs`, se toca acá,
 * o los objetos dejan de caer donde está dibujada la madera.
 */
const ANCHO_RELATIVO = 4700 / 2800;

export interface PuntoDeMesa {
  /** Porcentaje desde el borde izquierdo de la zona de mesa. */
  izquierda: number;
  /** Porcentaje desde el borde de arriba de la zona de mesa. */
  arriba: number;
  /** 1 en el borde cercano, 0,62 en el lejano. */
  escala: number;
}

/** Cuánto mide algo apoyado a esa profundidad, comparado con el borde cercano. */
export const escalaEnMesa = (v: number): number => P / (P + DESVIO * (1 - v));

export function posicionEnMesa(u: number, v: number): PuntoDeMesa {
  const escala = escalaEnMesa(v);
  return {
    izquierda: 50 + (u - 0.5) * ANCHO_RELATIVO * escala * 100,
    arriba: v * escala * 100,
    escala,
  };
}

/**
 * El estilo listo para pegarle a un elemento apoyado en la mesa.
 *
 * `translate(-50%, -100%)` deja el punto (u, v) en la BASE del objeto y no en su
 * centro: un mate se apoya por abajo, no por el medio. Eso es lo que hace que la
 * sombra de contacto caiga donde tiene que caer sin cuentas extra.
 */
export function estiloEnMesa(u: number, v: number, escalaExtra = 1): React.CSSProperties {
  const { izquierda, arriba, escala } = posicionEnMesa(u, v);
  return {
    position: "absolute",
    left: `${izquierda}%`,
    top: `${arriba}%`,
    transform: `translate(-50%, -100%) scale(${(escala * escalaExtra).toFixed(4)})`,
    transformOrigin: "50% 100%",
  };
}
