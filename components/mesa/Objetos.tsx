/**
 * El objeto propio de cada departamento, apoyado en la mesa.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * Hay 7 ambientes para 19 departamentos, y eso es a propósito: diecinueve
 * escenas dibujadas aparte serían diecinueve cosas que mantener. El precio es
 * que SEIS departamentos comparten "el galpón" y CINCO "el litoral", y dentro
 * de un grupo la pantalla queda casi idéntica. El acento de color
 * (`CapaDeAcento`) ya los separa un poco, pero es un tono: no dice nada.
 *
 * Un objeto sí. Un vaso de caña en un boliche de Montevideo, un tarro de leche
 * en San José y una piedra de amatista en Artigas cuentan dónde estás sin una
 * sola palabra, y se leen de una ojeada porque son siluetas distintas.
 *
 * ── De dónde sale cada uno ────────────────────────────────────────────────
 *
 * De lo que el departamento ES, no de un adorno cualquiera. Fray Bentos hizo
 * la carne en lata que se comió medio mundo, Salto es la naranja, Artigas es la
 * amatista, Durazno y Flores se llaman como la fruta y la flor. Un objeto
 * elegido al azar sería decoración; éstos son el lugar.
 *
 * ── Dónde va ──────────────────────────────────────────────────────────────
 *
 * En el hueco que dejó el descarte cuando se sacó: del lado del mazo y hacia el
 * borde cercano. Ese costado quedó con el mazo solo y el otro tiene el mate y
 * —en la compu— la libreta, así que es donde había lugar de verdad.
 *
 * ── Cómo se dibujan ───────────────────────────────────────────────────────
 *
 * Con LÍNEA, no con manchas: contorno de tinta y dos o tres tonos adentro. Es
 * la misma regla que le sirvió al mate —los dos son marrones sobre una mesa
 * marrón— y es lo único que hace que un objeto de dos centímetros se lea como
 * un objeto y no como una manchita.
 *
 * ── TRES NÚMEROS POR OBJETO, Y NINGUNO SOBRA ──────────────────────────────
 *
 * `PROPORCION` es la forma del dibujo. `ALTURA` es cuánto del alto de la mesa
 * ocupa: sin eso, una botella y un sombrero medirían lo mismo de alto y el
 * sombrero saldría del tamaño de una rueda. `APOYO` es cuánto de su ancho toca
 * la madera, que es lo que decide el ancho de la sombra de contacto —una
 * botella apoya un círculo chico y un cajón apoya todo—.
 */

import { type ClaveObjeto } from "@/lib/objetos";

export { ALTURA, APOYO, PROPORCION } from "@/lib/objetos";
export type { ClaveObjeto } from "@/lib/objetos";

/** El contorno con el que se dibuja todo: es lo que los despega de la madera. */
const TINTA = "#2a1608";

export function ObjetoDeMesa({ objeto }: { objeto: ClaveObjeto }) {
  switch (objeto) {
    case "vaso": return <Vaso />;
    case "cajon": return <Cajon />;
    case "tarro": return <Tarro />;
    case "boina": return <Boina />;
    case "durazno": return <Durazno />;
    case "flor": return <Flor />;
    case "espuela": return <Espuela />;
    case "guampa": return <Guampa />;
    case "farol": return <Farol />;
    case "caracol": return <Caracol />;
    case "estrella": return <Estrella />;
    case "llave": return <Llave />;
    case "espiga": return <Espiga />;
    case "lata": return <Lata />;
    case "botella": return <Botella />;
    case "naranja": return <Naranja />;
    case "cafecito": return <Cafecito />;
    case "amatista": return <Amatista />;
    case "sombrero": return <Sombrero />;
  }
}

/** El cajón de todos: viewBox propio y el trazo de tinta ya puesto. */
function Lienzo({ vb, children }: { vb: string; children: React.ReactNode }) {
  return (
    <svg viewBox={vb} className="h-full w-full" aria-hidden="true">
      <g stroke={TINTA} strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
    </svg>
  );
}

/* ── MONTEVIDEO · el vaso de caña del boliche ────────────────────────────────
   No va lleno: un vaso lleno es una bebida, uno con el fondo cubierto es
   alguien que está jugando hace rato. El vidrio se lee por dos cosas —el
   reflejo vertical de la lámpara y el borde de atrás más oscuro que el de
   adelante, porque se lo mira a través de dos paredes—. Sin eso es un tubo. */
function Vaso() {
  return (
    <Lienzo vb="0 0 44 62">
      <defs>
        <linearGradient id="ob-vaso" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cbd6cf" stopOpacity="0.30" />
          <stop offset="26%" stopColor="#eef4ee" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#5d6b62" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id="ob-cana" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7a3d12" />
          <stop offset="34%" stopColor="#b9691f" />
          <stop offset="100%" stopColor="#5e2c0c" />
        </linearGradient>
      </defs>
      <path d="M9 14 L35 14 L32.5 57 C32.5 59.4 30.6 60.6 22 60.6 C13.4 60.6 11.5 59.4 11.5 57 Z" fill="url(#ob-vaso)" />
      <path d="M12.6 41 L31.4 41 L32.5 57 C32.5 59.4 30.6 60.6 22 60.6 C13.4 60.6 11.5 59.4 11.5 57 Z" fill="url(#ob-cana)" stroke="none" />
      <ellipse cx="22" cy="41" rx="9.4" ry="2.6" fill="#d98b33" strokeOpacity="0.5" strokeWidth="1" />
      <ellipse cx="22" cy="14" rx="13" ry="3.6" fill="#e7eee8" fillOpacity="0.22" />
      <path d="M14.6 19 C13.7 30 13.9 42 15 53" stroke="#f6faf5" strokeOpacity="0.42" strokeWidth="2.6" fill="none" />
    </Lienzo>
  );
}

/* ── CANELONES · el cajón de la feria ────────────────────────────────────────
   Las Piedras al mediodía. Va con la fruta asomando: un cajón vacío es una
   caja, uno con fruta es un puesto. Los listones de abajo van separados, que es
   lo que hace que se lea cajón de feria y no cajón de mudanza. */
function Cajon() {
  return (
    <Lienzo vb="0 0 92 58">
      <defs>
        <linearGradient id="ob-cajon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c99a5e" />
          <stop offset="100%" stopColor="#7c5527" />
        </linearGradient>
      </defs>
      {/* la fruta, atrás del borde de adelante */}
      <g strokeWidth="1.6">
        <circle cx="30" cy="21" r="10" fill="#c9622a" />
        <circle cx="50" cy="17" r="11" fill="#d9822f" />
        <circle cx="66" cy="22" r="9" fill="#b8541f" />
        <path d="M50 6 C55 2 61 3 62 7" fill="none" stroke="#5d7a35" strokeWidth="2.4" />
      </g>
      {/* el cajón */}
      <path d="M6 26 L86 26 L81 54 L11 54 Z" fill="url(#ob-cajon)" />
      <g strokeWidth="1.5" strokeOpacity="0.55" fill="none">
        <path d="M8.4 39 L83.6 39" />
        <path d="M25 26.5 L23 53.5" />
        <path d="M67 26.5 L69 53.5" />
      </g>
      <path d="M6 26 L86 26 L85 31 L7 31 Z" fill="#e0b478" fillOpacity="0.5" strokeOpacity="0" />
    </Lienzo>
  );
}

/* ── SAN JOSÉ · el tarro de leche ────────────────────────────────────────────
   Es la cuenca lechera del país. El tarro de aluminio con el hombro cónico y la
   tapa con manija es una silueta que no se parece a nada más de la mesa. */
function Tarro() {
  return (
    <Lienzo vb="0 0 52 78">
      <defs>
        <linearGradient id="ob-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6f7a80" />
          <stop offset="26%" stopColor="#d7dee2" />
          <stop offset="62%" stopColor="#93a0a7" />
          <stop offset="100%" stopColor="#4e585e" />
        </linearGradient>
      </defs>
      <path d="M8 74 L8 40 C8 32 15 27 18 24 L34 24 C37 27 44 32 44 40 L44 74 C44 76 41 76.5 26 76.5 C11 76.5 8 76 8 74 Z" fill="url(#ob-metal)" />
      <path d="M17 24 L17 12 L35 12 L35 24 Z" fill="url(#ob-metal)" />
      <path d="M15 12 L37 12 L37 7 L15 7 Z" fill="#b7c2c8" />
      <path d="M20 7 C20 2 32 2 32 7" fill="none" strokeWidth="2.4" />
      <g strokeWidth="1.5" strokeOpacity="0.45" fill="none">
        <path d="M9 52 L43 52" />
        <path d="M9 63 L43 63" />
      </g>
      <path d="M13 42 C12 54 12 64 13 72" stroke="#f2f7f9" strokeOpacity="0.5" strokeWidth="2.6" fill="none" />
    </Lienzo>
  );
}

/* ── FLORIDA · la boina ──────────────────────────────────────────────────────
   Apoyada boca abajo, como queda cuando alguien se sienta a jugar y se la saca.
   El rabito de arriba es lo único que la distingue de una piedra. */
function Boina() {
  return (
    <Lienzo vb="0 0 72 38">
      <defs>
        <radialGradient id="ob-boina" cx="38%" cy="26%" r="78%">
          <stop offset="0%" stopColor="#4f5c6b" />
          <stop offset="100%" stopColor="#222b36" />
        </radialGradient>
      </defs>
      <ellipse cx="36" cy="28" rx="34" ry="8.5" fill="#2a3440" />
      <path d="M2 28 C2 12 14 4 36 4 C58 4 70 12 70 28 C70 33 58 36 36 36 C14 36 2 33 2 28 Z" fill="url(#ob-boina)" />
      <path d="M36 4 C38 1.5 41 1.5 42 4" fill="none" strokeWidth="2.6" />
      <path d="M12 22 C18 12 28 8 40 8" stroke="#8b98a8" strokeOpacity="0.4" strokeWidth="2.6" fill="none" />
      <ellipse cx="36" cy="28.5" rx="30" ry="6" fill="none" strokeOpacity="0.4" strokeWidth="1.5" />
    </Lienzo>
  );
}

/* ── DURAZNO · el durazno ────────────────────────────────────────────────────
   Se llama así. No hace falta buscarle otra cosa, y encima es de las siluetas
   que se leen a cualquier tamaño: el surco del medio y la hojita. */
function Durazno() {
  return (
    <Lienzo vb="0 0 54 56">
      <defs>
        <radialGradient id="ob-durazno" cx="34%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#f4b45c" />
          <stop offset="52%" stopColor="#e07f33" />
          <stop offset="100%" stopColor="#9c3f16" />
        </radialGradient>
      </defs>
      <path d="M27 8 C42 8 51 19 51 32 C51 45 41 53 27 53 C13 53 3 45 3 32 C3 19 12 8 27 8 Z" fill="url(#ob-durazno)" />
      <path d="M27 9 C23 20 23 42 27 52" fill="none" strokeOpacity="0.42" strokeWidth="2" />
      <path d="M28 9 C31 4 38 1 44 3 C42 9 35 11 28 9 Z" fill="#5d7a35" />
      <path d="M11 22 C14 16 19 13 24 12" stroke="#ffe0a8" strokeOpacity="0.45" strokeWidth="3" fill="none" />
    </Lienzo>
  );
}

/* ── FLORES · la flor en el frasco ───────────────────────────────────────────
   Se llama así, y de paso es el único objeto de la mesa que también es un canto
   del truco. Va en un frasco de vidrio y no en un florero: en una mesa de
   campo lo que hay es un frasco. */
function Flor() {
  return (
    <Lienzo vb="0 0 46 74">
      <defs>
        <linearGradient id="ob-frasco" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c6d3cb" stopOpacity="0.34" />
          <stop offset="30%" stopColor="#eef4ee" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#5d6b62" stopOpacity="0.36" />
        </linearGradient>
      </defs>
      <path d="M23 44 C22 34 21 26 23 18" fill="none" stroke="#5d7a35" strokeWidth="2.6" />
      <path d="M22 30 C16 27 13 22 14 17 C19 18 22 23 22 30 Z" fill="#5d7a35" strokeWidth="1.5" />
      <g strokeWidth="1.6">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="23" cy="8" rx="5.4" ry="8.4" fill="#d0536b" transform={`rotate(${a} 23 15)`} />
        ))}
        <circle cx="23" cy="15" r="4" fill="#f0c24a" />
      </g>
      <path d="M12 44 L34 44 L32 68 C32 70.6 30 71.6 23 71.6 C16 71.6 14 70.6 14 68 Z" fill="url(#ob-frasco)" />
      <ellipse cx="23" cy="44" rx="11" ry="3" fill="#9fb4a6" fillOpacity="0.25" />
      <path d="M17 49 C16 57 16 63 17 68" stroke="#f6faf5" strokeOpacity="0.4" strokeWidth="2.4" fill="none" />
    </Lienzo>
  );
}

/* ── TREINTA Y TRES · la espuela ─────────────────────────────────────────────
   La primera versión era un arco fino, un palito y una rueda dentada: se leía
   una PIEZA DE MECÁNICA. Una espuela son tres cosas y la más importante es la
   que faltaba: la HORQUILLA en U que abraza el talón, gorda y abierta, con sus
   dos puntas hacia el frente. Recién con eso la rodaja del final se entiende. */
function Espuela() {
  return (
    <Lienzo vb="0 0 68 48">
      <defs>
        <linearGradient id="ob-hierro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c3cace" />
          <stop offset="42%" stopColor="#7c868c" />
          <stop offset="100%" stopColor="#3a4247" />
        </linearGradient>
      </defs>
      {/* la horquilla del talón: gorda, abierta hacia la izquierda */}
      <path
        d="M20 6 C7 10 3 18 3 24 C3 30 7 38 20 42 L20 35 C12 32 10 28 10 24 C10 20 12 16 20 13 Z"
        fill="url(#ob-hierro)"
      />
      {/* los dos botones donde se ata la correa */}
      <g strokeWidth="1.5">
        <circle cx="21" cy="9" r="3.4" fill="url(#ob-hierro)" />
        <circle cx="21" cy="39" r="3.4" fill="url(#ob-hierro)" />
      </g>
      {/* el cuello, del talón a la rodaja */}
      <path d="M9 21 L40 21 L40 27 L9 27 Z" fill="url(#ob-hierro)" />
      {/* la rodaja, con sus púas */}
      <g>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4 + Math.PI / 8;
          return (
            <path
              key={i}
              d={`M${52 + 6 * Math.cos(a)} ${24 + 6 * Math.sin(a)} L${52 + 15 * Math.cos(a)} ${24 + 15 * Math.sin(a)} L${52 + 6 * Math.cos(a + 0.5)} ${24 + 6 * Math.sin(a + 0.5)} Z`}
              fill="url(#ob-hierro)"
              strokeWidth="1.4"
            />
          );
        })}
        <circle cx="52" cy="24" r="7" fill="url(#ob-hierro)" />
        <circle cx="52" cy="24" r="2.6" fill="#2a3035" />
      </g>
      <path d="M11 22.5 L38 22.5" stroke="#e3e9ec" strokeOpacity="0.45" strokeWidth="1.6" fill="none" />
    </Lienzo>
  );
}

/* ── CERRO LARGO · la guampa ─────────────────────────────────────────────────
   Melo, la frontera, el campo. La primera versión era un cono recto con una
   virola: eso es un VASO, no un cuerno. Un cuerno se CURVA y las dos paredes se
   curvan distinto —la de afuera se abre y la de adentro cae casi derecha—, y
   además tiene los anillos de crecimiento cruzándolo. Va parado sobre la punta
   apoyada, un poco inclinado, que es como queda uno de verdad. */
function Guampa() {
  return (
    <Lienzo vb="0 0 58 66">
      <defs>
        <linearGradient id="ob-cuerno" x1="0" y1="0" x2="1" y2="0.25">
          <stop offset="0%" stopColor="#3a2c1a" />
          <stop offset="30%" stopColor="#9c7f52" />
          <stop offset="62%" stopColor="#54401f" />
          <stop offset="100%" stopColor="#241a0f" />
        </linearGradient>
      </defs>
      {/* el cuerno: la pared de afuera se abre y la de adentro cae derecha */}
      <path
        d="M11 15 C10 32 14 48 22 58 C26 63 32 63 34 58 C40 44 45 28 47 15 Z"
        fill="url(#ob-cuerno)"
      />
      {/* los anillos de crecimiento, que cruzan la curva */}
      <g fill="none" stroke={TINTA} strokeOpacity="0.3" strokeWidth="1.4">
        <path d="M11.8 25 C22 28 36 26 45 23" />
        <path d="M14 36 C22 39 33 37 40.5 34" />
        <path d="M17.5 47 C23 49 30 48 35.5 45.5" />
      </g>
      {/* la virola de plata de la boca */}
      <path d="M9 15 C9 10 49 10 49 15 C49 20 9 20 9 15 Z" fill="#c3ccd2" />
      <ellipse cx="29" cy="14.6" rx="20" ry="4.4" fill="#2a2318" />
      {/* SIN YERBA ADENTRO, a propósito: con el verde se leía un segundo
          mate, y el mate de verdad ya está apoyado del otro lado de la mesa.
          Vacía es un cuerno. */}
      <ellipse cx="29" cy="14.6" rx="16" ry="3.2" fill="#3c3223" stroke="none" />
      {/* el brillo largo del cuerno */}
      <path d="M17 22 C17 36 20 48 25 56" stroke="#d9bd86" strokeOpacity="0.42" strokeWidth="3" fill="none" />
    </Lienzo>
  );
}

/* ── LAVALLEJA · el farol ────────────────────────────────────────────────────
   Las sierras al caer el sol. Un farol a querosén con la llama adentro: es el
   único objeto de la mesa que da luz propia, y por eso lleva su halo. */
function Farol() {
  return (
    <Lienzo vb="0 0 52 80">
      <defs>
        <radialGradient id="ob-llama" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#ffd88a" />
          <stop offset="60%" stopColor="#f0a83c" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#e07a20" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M18 10 C18 3 34 3 34 10" fill="none" strokeWidth="2.4" />
      <path d="M12 10 L40 10 L40 17 L12 17 Z" fill="#8b959b" />
      <path d="M14 17 L38 17 L36 58 L16 58 Z" fill="#3a2a18" fillOpacity="0.5" />
      <ellipse cx="26" cy="38" rx="13" ry="17" fill="url(#ob-llama)" stroke="none" />
      <path d="M26 30 C30 34 30 41 26 46 C22 41 22 34 26 30 Z" fill="#ffe6a8" stroke="none" />
      <g strokeWidth="1.6" fill="none">
        <path d="M14 17 L38 17 L36 58 L16 58 Z" />
        <path d="M20 18 L19 57" strokeOpacity="0.5" />
        <path d="M32 18 L33 57" strokeOpacity="0.5" />
      </g>
      <path d="M10 58 L42 58 L44 70 C44 74 40 76 26 76 C12 76 8 74 8 70 Z" fill="#6f7a80" />
      <path d="M12 66 L40 66" strokeOpacity="0.4" strokeWidth="1.5" fill="none" />
    </Lienzo>
  );
}

/* ── MALDONADO · el caracol ──────────────────────────────────────────────────
   Punta del Este. Dos intentos costó, y los dos fallaron por lo mismo: dibujado
   ACOSTADO, un bulto claro con rayas curvas sobre madera es un PAN. Nadie ve un
   caracol ahí.

   Parado se resuelve solo, porque la silueta pasa a ser la que todo el mundo
   tiene en la cabeza: la TORRE de vueltas que se van achicando hasta la punta,
   y abajo la boca ancha. Es la forma la que dice caracol; las rayas eran un
   intento de decirlo con textura, y la textura no alcanza a este tamaño. */
function Caracol() {
  return (
    <Lienzo vb="0 0 46 62">
      <defs>
        <linearGradient id="ob-caracol" x1="0.1" y1="0" x2="0.95" y2="0.9">
          <stop offset="0%" stopColor="#fdf3e0" />
          <stop offset="40%" stopColor="#e6cba0" />
          <stop offset="78%" stopColor="#bf9a6a" />
          <stop offset="100%" stopColor="#8d6a42" />
        </linearGradient>
      </defs>
      {/* la vuelta grande de abajo, con la boca */}
      <path d="M8 40 C8 27 15 20 24 20 C34 20 40 28 40 39 C40 50 33 58 24 58 C14 58 8 51 8 40 Z" fill="url(#ob-caracol)" />
      {/* LA TORRE: cuatro vueltas que se achican. Es toda la lectura. */}
      <g fill="url(#ob-caracol)" strokeWidth="1.7">
        <ellipse cx="24" cy="22" rx="15" ry="7.5" />
        <ellipse cx="25" cy="14" rx="11" ry="6" />
        <ellipse cx="26" cy="8" rx="7" ry="4.2" />
        <ellipse cx="27" cy="4" rx="3.4" ry="2.4" />
      </g>
      {/* la boca, abajo a la derecha: oscura adentro y con el labio claro */}
      <path d="M22 58 C15 57 12 51 13 45 C20 44 26 48 28 54 C28.6 56.4 26 58.4 22 58 Z" fill="#5c4630" />
      <path d="M13.6 45.6 C19 45 24 48 26 52" stroke="#fff8ea" strokeOpacity="0.75" strokeWidth="2.6" fill="none" />
      {/* dos costillas nomás, para que no quede liso */}
      <g fill="none" stroke={TINTA} strokeOpacity="0.22" strokeWidth="1.3">
        <path d="M11 34 C18 30 30 31 38 36" />
        <path d="M9.6 44 C17 41 30 42 39.4 47" />
      </g>
      <path d="M13 30 C15 25 20 23 25 23" stroke="#fff8ea" strokeOpacity="0.6" strokeWidth="2.6" fill="none" />
    </Lienzo>
  );
}

/* ── ROCHA · la estrella de mar ──────────────────────────────────────────────
   Cabo Polonio, La Paloma. La primera versión era una estrella de cinco puntas
   rectas, o sea la estrella de puntuar cosas. Un bicho no tiene aristas: los
   brazos salen GORDOS del centro, se afinan y terminan redondeados, y la piel
   va picada. Eso es lo que la vuelve un animal y no un icono. */
function Estrella() {
  const R = 27;
  const brazos = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const sig = ((i + 1) * 2 * Math.PI) / 5 - Math.PI / 2;
    const px = 30 + R * Math.cos(a);
    const py = 30 + R * Math.sin(a);
    const qx = 30 + R * Math.cos(sig);
    const qy = 30 + R * Math.sin(sig);
    // el valle entre dos brazos: cerca del centro y redondeado
    const vx = 30 + 9 * Math.cos(a + Math.PI / 5);
    const vy = 30 + 9 * Math.sin(a + Math.PI / 5);
    return `${i === 0 ? `M${px} ${py}` : ""} Q${vx + (px - vx) * 0.1} ${vy + (py - vy) * 0.1} ${vx} ${vy} Q${vx + (qx - vx) * 0.1} ${vy + (qy - vy) * 0.1} ${qx} ${qy}`;
  }).join(" ");
  return (
    <Lienzo vb="0 0 60 58">
      <defs>
        <radialGradient id="ob-estrella" cx="40%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#f2b06a" />
          <stop offset="62%" stopColor="#d07a35" />
          <stop offset="100%" stopColor="#9c4a24" />
        </radialGradient>
      </defs>
      <path d={`${brazos} Z`} fill="url(#ob-estrella)" strokeLinejoin="round" />
      {/* el surco que baja por cada brazo: es lo que le da volumen */}
      <g fill="none" stroke="#8c3d18" strokeOpacity="0.45" strokeWidth="1.6">
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          return <path key={i} d={`M${30 + 5 * Math.cos(a)} ${30 + 5 * Math.sin(a)} L${30 + 21 * Math.cos(a)} ${30 + 21 * Math.sin(a)}`} />;
        })}
      </g>
      {/* la piel picada */}
      <g fill="#ffdcae" fillOpacity="0.55" stroke="none">
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          return (
            <g key={i}>
              {[10, 15, 20].map((d, k) => (
                <circle key={d} cx={30 + d * Math.cos(a) + (k % 2 ? 2.4 : -2.4) * Math.sin(a)} cy={30 + d * Math.sin(a) - (k % 2 ? 2.4 : -2.4) * Math.cos(a)} r="1.5" />
              ))}
            </g>
          );
        })}
        <circle cx="30" cy="30" r="2.4" />
      </g>
    </Lienzo>
  );
}

/* ── COLONIA · la llave antigua ──────────────────────────────────────────────
   El barrio histórico. Una llave de hierro forjado, de las de portón: es lo más
   chato de la mesa y por eso va casi al ras de la madera. */
function Llave() {
  return (
    <Lienzo vb="0 0 80 32">
      <defs>
        <linearGradient id="ob-llave" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9aa2a7" />
          <stop offset="48%" stopColor="#5f696f" />
          <stop offset="100%" stopColor="#333b40" />
        </linearGradient>
      </defs>
      <g fill="url(#ob-llave)">
        <path d="M22 12 L70 12 L70 20 L22 20 Z" />
        <path d="M58 20 L64 20 L64 28 L58 28 Z" />
        <path d="M48 20 L53 20 L53 26 L48 26 Z" />
        <circle cx="14" cy="16" r="12" />
      </g>
      <circle cx="14" cy="16" r="5.6" fill="#2a1608" />
      <path d="M24 14 L68 14" stroke="#cdd4d8" strokeOpacity="0.5" strokeWidth="1.8" fill="none" />
    </Lienzo>
  );
}

/* ── SORIANO · la espiga de trigo ────────────────────────────────────────────
   Mercedes y el trigo del litoral. Es lo más alto y angosto de las diecinueve,
   así que se distingue de lejos por la silueta sola. */
function Espiga() {
  return (
    <Lienzo vb="0 0 38 82">
      <path d="M19 78 C19 60 19 44 19 30" fill="none" stroke="#a8863f" strokeWidth="2.6" />
      <g fill="#d9b455" strokeWidth="1.3">
        {Array.from({ length: 7 }, (_, i) => {
          const y = 10 + i * 8;
          return (
            <g key={i}>
              <ellipse cx="12.5" cy={y + 3} rx="5.4" ry="4.2" transform={`rotate(-28 12.5 ${y + 3})`} />
              <ellipse cx="25.5" cy={y + 3} rx="5.4" ry="4.2" transform={`rotate(28 25.5 ${y + 3})`} />
            </g>
          );
        })}
        <ellipse cx="19" cy="7" rx="5" ry="6.4" />
      </g>
      <g stroke="#c9a54a" strokeWidth="1.5" fill="none" strokeOpacity="0.8">
        <path d="M19 8 L15 1" />
        <path d="M19 8 L23 1" />
      </g>
      <path d="M19 56 C25 54 30 56 32 60 C26 62 21 60 19 56 Z" fill="#7f9142" strokeWidth="1.4" />
    </Lienzo>
  );
}

/* ── RÍO NEGRO · la lata de carne ────────────────────────────────────────────
   Fray Bentos: de acá salió la carne en lata que se comió medio mundo y las dos
   guerras mundiales. La primera versión era un trapecio con una banda roja y se
   leía un ESCENARIO. Lo que la hace lata de corned beef es la forma: ancha
   abajo, angosta arriba, con el reborde metálico marcado en las dos tapas y la
   llavecita de enrollar soldada arriba. */
function Lata() {
  return (
    <Lienzo vb="0 0 64 42">
      <defs>
        <linearGradient id="ob-lata" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#5d666b" />
          <stop offset="24%" stopColor="#cfd6da" />
          <stop offset="58%" stopColor="#8e979c" />
          <stop offset="100%" stopColor="#454d52" />
        </linearGradient>
      </defs>
      {/* el cuerpo: trapecio bien marcado, con las esquinas redondeadas */}
      <path d="M4 38 C4 39 5 39.6 8 39.6 L56 39.6 C59 39.6 60 39 60 38 L50 14 C49.4 12.6 48.4 12 46 12 L18 12 C15.6 12 14.6 12.6 14 14 Z" fill="url(#ob-lata)" />
      {/* la tapa de arriba, en perspectiva: es lo que la hace una lata y no una placa */}
      <path d="M14 14 C14 12.6 15.6 12 18 12 L46 12 C48.4 12 49.4 12.6 50 14 C48 15.4 16 15.4 14 14 Z" fill="#eef3f5" fillOpacity="0.55" />
      {/* los dos rebordes prensados */}
      <g fill="none" stroke={TINTA} strokeOpacity="0.45" strokeWidth="1.5">
        <path d="M15.4 17.4 L48.6 17.4" />
        <path d="M5.6 34.6 L58.4 34.6" />
      </g>
      {/* la etiqueta, con la franja del nombre */}
      <path d="M11.4 22 L52.6 22 L54.6 32 L9.4 32 Z" fill="#9c3226" />
      <path d="M15 26.6 L49 26.6" stroke="#f0d9a8" strokeOpacity="0.85" strokeWidth="3.2" fill="none" />
      {/* la llavecita de enrollar, soldada a la tapa */}
      <g strokeWidth="1.5">
        <path d="M30 12 L30 7" stroke="#aab2b7" strokeWidth="2.4" fill="none" />
        <ellipse cx="34" cy="6" rx="4.6" ry="3.2" fill="none" stroke="#b9c1c6" strokeWidth="2.4" />
      </g>
      <path d="M17 16 C16 21 15 26 13 31" stroke="#f2f7f9" strokeOpacity="0.4" strokeWidth="2.2" fill="none" />
    </Lienzo>
  );
}

/* ── PAYSANDÚ · la botella de cerveza ────────────────────────────────────────
   La ciudad de la cerveza. Es lo más alto de las diecinueve y por eso lleva la
   altura más grande: al lado de un vaso, una botella se ve botella. */
function Botella() {
  return (
    <Lienzo vb="0 0 38 94">
      <defs>
        <linearGradient id="ob-vidrio" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2f4a1e" />
          <stop offset="26%" stopColor="#6f9c46" />
          <stop offset="62%" stopColor="#38541f" />
          <stop offset="100%" stopColor="#16250d" />
        </linearGradient>
      </defs>
      <path d="M14 12 L24 12 L24 30 C24 36 31 40 31 50 L31 86 C31 89.4 29 90.6 19 90.6 C9 90.6 7 89.4 7 86 L7 50 C7 40 14 36 14 30 Z" fill="url(#ob-vidrio)" />
      <path d="M13 8 L25 8 L25 13 L13 13 Z" fill="#c9a02c" />
      <path d="M9 58 L29 58 L29 76 L9 76 Z" fill="#e8dcc0" />
      <g stroke="#8c2b22" strokeWidth="2" fill="none" strokeOpacity="0.9">
        <path d="M12 64 L26 64" />
        <path d="M12 70 L23 70" />
      </g>
      <path d="M11 44 C10 56 10 72 11 84" stroke="#cfe7a8" strokeOpacity="0.35" strokeWidth="2.4" fill="none" />
    </Lienzo>
  );
}

/* ── SALTO · la naranja ──────────────────────────────────────────────────────
   La citricultura del norte del litoral. Con la hoja: sin hoja, una naranja y
   un durazno son dos círculos naranjas. Con hoja y sin surco es naranja. */
function Naranja() {
  return (
    <Lienzo vb="0 0 54 54">
      <defs>
        <radialGradient id="ob-naranja" cx="34%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#ffc456" />
          <stop offset="55%" stopColor="#ef8a1c" />
          <stop offset="100%" stopColor="#a84e0a" />
        </radialGradient>
      </defs>
      <circle cx="27" cy="31" r="21" fill="url(#ob-naranja)" />
      <g fill="#8a3c06" fillOpacity="0.3" stroke="none">
        {[[18, 22], [34, 26], [24, 38], [37, 40], [15, 34]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />
        ))}
      </g>
      <circle cx="27" cy="10.5" r="2.6" fill="#5d4a24" strokeWidth="1.4" />
      <path d="M29 9 C34 3 43 2 49 5 C45 11 36 13 29 9 Z" fill="#4e7031" />
      <path d="M31 8 C37 6 43 6 47 6" stroke="#8db357" strokeOpacity="0.7" strokeWidth="1.4" fill="none" />
      <path d="M13 24 C16 18 21 15 26 14" stroke="#ffe1a0" strokeOpacity="0.5" strokeWidth="3" fill="none" />
    </Lienzo>
  );
}

/* ── RIVERA · el pocillo de café ─────────────────────────────────────────────
   La frontera con Brasil, que se cruza caminando. Lo que cambia de este lado no
   es el mate: es que además hay cafecito. La tacita con el plato es de las
   siluetas más chatas y anchas, y no se confunde con nada. */
function Cafecito() {
  return (
    <Lienzo vb="0 0 64 44">
      <defs>
        <linearGradient id="ob-loza" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f3ece0" />
          <stop offset="60%" stopColor="#dfd5c4" />
          <stop offset="100%" stopColor="#a99d89" />
        </linearGradient>
      </defs>
      <ellipse cx="30" cy="37" rx="27" ry="5.6" fill="url(#ob-loza)" />
      <path d="M50 18 C58 18 58 28 50 28" fill="none" strokeWidth="3.4" stroke="#cfc4b0" />
      <path d="M50 18 C58 18 58 28 50 28" fill="none" strokeWidth="1.6" />
      <path d="M12 14 L48 14 L45 33 C45 35.4 41 36.4 30 36.4 C19 36.4 15 35.4 15 33 Z" fill="url(#ob-loza)" />
      <ellipse cx="30" cy="14" rx="18" ry="4.4" fill="#3a2412" />
      <ellipse cx="30" cy="14" rx="14" ry="3" fill="#7a4a1e" stroke="none" />
      <path d="M17 20 C16 26 16 30 17 33" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2.4" fill="none" />
    </Lienzo>
  );
}

/* ── ARTIGAS · la amatista ───────────────────────────────────────────────────
   De acá sale una de las amatistas más grandes del mundo. Va como sale de la
   tierra: la cáscara de piedra gris y adentro los cristales violeta. Es el
   único objeto con color frío de las diecinueve y se ve desde lejos. */
function Amatista() {
  return (
    <Lienzo vb="0 0 68 52">
      <defs>
        <linearGradient id="ob-piedra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8d857a" />
          <stop offset="100%" stopColor="#4a443c" />
        </linearGradient>
        <linearGradient id="ob-cristal" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#c9a6e8" />
          <stop offset="55%" stopColor="#8b5fbf" />
          <stop offset="100%" stopColor="#4a2a72" />
        </linearGradient>
      </defs>
      <path d="M5 46 C2 30 10 12 26 8 C46 3 64 14 64 30 C64 42 58 48 48 48 L12 48 C8 48 6 47 5 46 Z" fill="url(#ob-piedra)" />
      <path d="M14 44 C10 30 16 17 29 14 C44 11 55 20 55 31 C55 39 50 44 43 44 Z" fill="#2c1d3d" />
      <g fill="url(#ob-cristal)" strokeWidth="1.2" strokeOpacity="0.6">
        <path d="M18 44 L22 26 L27 44 Z" />
        <path d="M26 44 L31 20 L37 44 Z" />
        <path d="M35 44 L41 24 L46 44 Z" />
        <path d="M43 44 L48 30 L52 44 Z" />
      </g>
      <path d="M31 20 L33 30 L29 30 Z" fill="#e4d0f5" fillOpacity="0.7" stroke="none" />
      <path d="M12 22 C16 15 22 11 29 10" stroke="#b8b0a2" strokeOpacity="0.5" strokeWidth="2.6" fill="none" />
    </Lienzo>
  );
}

/* ── TACUAREMBÓ · el sombrero ────────────────────────────────────────────────
   El norte gaucho, que es donde está el truco bravo. Apoyado boca abajo sobre
   la mesa: es lo más ancho de las diecinueve y lo primero que se ve.

   Y hace algo más: el rival de la mesa NO TIENE CABEZA —está fuera del
   encuadre— así que un sombrero sobre la madera es lo más cerca que va a estar
   de vérsela. */
function Sombrero() {
  return (
    <Lienzo vb="0 0 94 48">
      <defs>
        <linearGradient id="ob-fieltro" x1="0.2" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#5c4732" />
          <stop offset="46%" stopColor="#3d2d1d" />
          <stop offset="100%" stopColor="#1f1710" />
        </linearGradient>
      </defs>
      <ellipse cx="47" cy="36" rx="45" ry="10.5" fill="url(#ob-fieltro)" />
      <path d="M22 34 C22 14 30 5 47 5 C64 5 72 14 72 34 C72 39 64 41 47 41 C30 41 22 39 22 34 Z" fill="url(#ob-fieltro)" />
      {/* el pliegue de la copa, que es lo que lo hace sombrero y no una campana */}
      <path d="M34 12 C40 8 54 8 60 12" fill="none" strokeOpacity="0.55" strokeWidth="2" />
      {/* la cinta */}
      <path d="M23 30 C30 34 64 34 71 30 L71 36 C64 40 30 40 23 36 Z" fill="#7c1f2a" />
      <ellipse cx="47" cy="36" rx="45" ry="10.5" fill="none" strokeWidth="1.9" />
      <path d="M28 24 C30 14 38 9 47 8" stroke="#9c8163" strokeOpacity="0.4" strokeWidth="2.6" fill="none" />
    </Lienzo>
  );
}
