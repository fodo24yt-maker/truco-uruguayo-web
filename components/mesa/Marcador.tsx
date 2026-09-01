/**
 * La libreta donde se anota, apoyada en la mesa.
 *
 * Se anota como en la mesa de verdad: palitos que arman un cuadrado y el quinto
 * cruzado, de a cinco puntos. Malas de un lado, buenas del otro.
 *
 * LOS PALITOS SE QUEDAN. Las referencias anotan con números ("Nosotros: 12"),
 * pero acá se cuenta a palitos, que es como se cuenta de este lado del río.
 *
 * ── Por qué todo está en `em` ─────────────────────────────────────────────
 *
 * Porque tiene que crecer y achicarse con el alto de la ventana, y la forma
 * obvia —`transform: scale(clamp(0.9, 0.15vh, 1.4))`— es CSS INVÁLIDO:
 * `scale()` quiere un número y `clamp()` con un `vh` adentro devuelve un largo.
 * El navegador tira la regla entera sin avisar. (Ya pasó con el mazo y no se
 * veía: se quedaba siempre del mismo tamaño.)
 *
 * Con `em` no hay truco: el `ancho` que entra por arriba se pone como
 * `font-size` del contenedor y todo adentro es una fracción de eso. Un
 * `clamp()` con `vh` sí es válido en `font-size`. Es el mismo patrón que
 * `Mazo.tsx`.
 *
 * ── Dónde va ──────────────────────────────────────────────────────────────
 *
 * AL COSTADO Y CERCA. Estaba en el centro del borde lejano —o sea, justo
 * encima del pecho del rival— y encima salía chica, porque allá la perspectiva
 * achica todo. Traerla hacia adelante la agranda sola.
 */

import { SombraApoyada } from "@/components/mesa/Sombra";

/**
 * 1em = el ancho de la libreta. Todo lo de adentro es una fracción de esto.
 *
 * SUBIÓ, porque no se leía. Eran `clamp(104px, 21vh, 184px)` y encima la
 * perspectiva le come otro 25% por estar lejos: quedaba en unos 137px con los
 * palitos adentro, o sea ilegibles. Y no alcanzaba con agrandar el papel: los
 * palitos y las etiquetas son fracciones de este `em`, así que crecían en la
 * misma proporción y el problema volvía. Por eso subieron las dos cosas, el
 * ancho Y las fracciones de adentro.
 *
 * El techo es el ancho de un celular: la libreta va a `u = 0,78`, o sea contra
 * el borde derecho de la mesa, y pasada de 204px la birome se sale del cuadro
 * en 390px. Se verifica mirando, no calculando: la birome sobresale del papel.
 */
const ANCHO = "clamp(122px, 25vh, 204px)";

const TRAZOS = [
  "M3 4 L3 22", // izquierda
  "M3 4 L19 4", // arriba
  "M19 4 L19 22", // derecha
  "M3 22 L19 22", // abajo
  "M3 4 L19 22", // el quinto, cruzado
];

/**
 * Un grupo de cinco: cuatro palitos que arman el cuadrado y el quinto cruzado.
 *
 * Está suelto y con color y tamaño por parámetro porque lo usan DOS cosas: la
 * libreta apoyada en la mesa —tinta sobre papel, medida en `em`— y el marcador
 * de la barra de arriba —claro sobre la franja oscura, medido en píxeles—.
 * Duplicar los cinco trazos sería tener dos formas de contar hasta cinco.
 */
export function Palitos({
  cantidad,
  color,
  alto,
  ancho,
  opacidad = 0.88,
  fantasma = false,
}: {
  cantidad: number;
  color: string;
  alto: string;
  ancho: string;
  opacidad?: number;
  /**
   * El cuadrado vacío dibujado detrás, apenas visible.
   *
   * ES LO QUE HACE QUE EL MARCADOR SE ENTIENDA CUANDO VA 0 A 0. Sin esto, una
   * partida recién empezada mostraba arriba "VOS │ · ÉL │": dos etiquetas y
   * las rayitas de las malas, y nada más. No se leía "cero de treinta", se
   * leía que algo no cargó.
   *
   * Van los CUATRO LADOS y no los cinco: el quinto es el cruzado, y un aspa de
   * fondo en cada casillero ensucia la fila entera. Es el ▢ de las
   * referencias.
   *
   * En la libreta va apagado, y es a propósito: un papel de verdad no viene
   * con los casilleros impresos.
   */
  fantasma?: boolean;
}) {
  return (
    <svg viewBox="0 0 22 26" className="shrink-0" style={{ height: alto, width: ancho }} aria-hidden="true">
      {fantasma &&
        TRAZOS.slice(0, 4).map((d) => (
          <path
            key={`f${d}`}
            d={d}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity={0.2}
          />
        ))}
      {TRAZOS.slice(0, cantidad).map((d) => (
        <path
          key={d}
          d={d}
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
          opacity={opacidad}
        />
      ))}
    </svg>
  );
}

/** Cuántos palitos lleva cada uno de los tres grupos de una mitad. */
const enGrupos = (n: number) =>
  Array.from({ length: 3 }, (_, i) => Math.max(0, Math.min(5, n - i * 5)));

function Grupo({ cantidad }: { cantidad: number }) {
  return (
    <Palitos cantidad={cantidad} color="var(--color-tinta)" alto="0.118em" ancho="0.1em" />
  );
}

function Fila({ etiqueta, puntos }: { etiqueta: string; puntos: number }) {
  const malas = Math.min(puntos, 15);
  const buenas = Math.max(puntos - 15, 0);

  return (
    <div className="flex items-center" style={{ gap: "0.026em" }}>
      {/* EL ANCHO VA EN EL ENVOLTORIO Y EL TAMAÑO DE LETRA ADENTRO, y no los
          dos en el mismo elemento. `width` en `em` se mide contra el font-size
          PROPIO: con `width: 0.096em` y `fontSize: 0.094em` juntos, el ancho
          real era 0,009 del papel, once veces menos de lo escrito. La etiqueta
          se desbordaba de su caja y se montaba sobre los palitos.
          Es la misma trampa que ya está anotada en `Mazo.tsx`, en el cartelito
          de la muestra: acá se había colado en tres lugares. */}
      <span className="shrink-0" style={{ width: "0.096em" }}>
        <span
          className="block font-[family-name:var(--font-mano)] leading-none text-tinta/80"
          style={{ fontSize: "0.094em" }}
        >
          {etiqueta}
        </span>
      </span>
      <span className="flex" style={{ gap: "0.012em" }}>
        {enGrupos(malas).map((n, i) => (
          <Grupo key={`m${i}`} cantidad={n} />
        ))}
      </span>
      <span className="bg-tinta/30" style={{ width: "1px", height: "0.1em", margin: "0 0.016em" }} />
      <span className="flex" style={{ gap: "0.012em" }}>
        {enGrupos(buenas).map((n, i) => (
          <Grupo key={`b${i}`} cantidad={n} />
        ))}
      </span>
      <span className="shrink-0" style={{ width: "0.115em", marginLeft: "0.014em" }}>
        <span
          className="block text-right font-[family-name:var(--font-mano)] leading-none text-bordo"
          style={{ fontSize: "0.11em" }}
        >
          {puntos}
        </span>
      </span>
    </div>
  );
}

/** La birome, apoyada en diagonal sobre la libreta. */
function Birome() {
  return (
    <svg
      viewBox="0 0 120 26"
      className="pointer-events-none absolute rotate-[14deg]"
      style={{ width: "0.62em", bottom: "-0.055em", right: "-0.08em" }}
      aria-hidden="true"
    >
      <ellipse cx="62" cy="21" rx="52" ry="4" fill="rgba(0,0,0,0.42)" />
      <g stroke="#241205" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M8 12 L22 7 L22 17 Z" fill="#3a3a3a" />
        <rect x="20" y="6.5" width="72" height="11" rx="3" fill="#2f4a86" />
        <rect x="90" y="6" width="14" height="12" rx="3" fill="#1e2f57" />
        <rect x="103" y="9" width="9" height="6" rx="2.5" fill="#c9c4bb" />
      </g>
      <rect x="21" y="7.6" width="70" height="3.2" rx="1.6" fill="#fff" opacity="0.24" />
    </svg>
  );
}

export function Marcador({
  vos,
  rival,
  /* En la compu la libreta entra mucho más grande: la escena es tres veces más
     ancha y con el ancho del celular quedaba un papelito perdido en el medio de
     la mesa. El de acá es el del celular, que es el que manda si algo falla. */
  ancho = ANCHO,
}: {
  vos: number;
  rival: number;
  ancho?: string;
}) {
  return (
    <div className="relative inline-block w-fit shrink-0" style={{ fontSize: ancho }}>
      <SombraApoyada ancho={0.86} peso={0.7} />
      <div
        className="papel relative -rotate-[3deg]"
        style={{
          padding: "0.05em 0.055em",
          // La esquina de arriba a la derecha va doblada: es lo que hace que se
          // lea como una hoja y no como un rectángulo.
          clipPath: "polygon(0 0, calc(100% - 0.09em) 0, 100% 0.09em, 100% 100%, 0 100%)",
          boxShadow: "0.015em 0.035em 0.075em -0.02em rgba(0,0,0,0.78)",
          // El contorno de tinta: es lo que la despega de la madera, que es del
          // mismo palo de marrones que el papel viejo.
          outline: "1px solid rgba(40,22,8,0.45)",
          outlineOffset: "-1px",
        }}
      >
        {/* los renglones */}
        <div
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              "repeating-linear-gradient(180deg, transparent 0 0.082em, rgba(60,90,140,0.32) 0.082em 0.09em)",
          }}
        />
        {/* el margen rojo, como el de un cuaderno */}
        <div
          className="pointer-events-none absolute inset-y-0 bg-bordo/25"
          style={{ left: "0.09em", width: "1px" }}
        />

        <div className="relative">
          {/* Lo mismo acá: el `paddingLeft` tenía que dejar pasar el margen
              rojo (que está en 0,09 del papel) y quedaba en 0,007, o sea que
              "MALAS" arrancaba a la IZQUIERDA de la línea roja. Ahora la
              separación y el hueco van afuera, contra el papel, y el tamaño de
              letra adentro. `letterSpacing` sí se mide contra la letra propia,
              que es como se escribe, y por eso queda donde está. */}
          <div
            className="flex font-[family-name:var(--font-ui)] uppercase text-tinta/45"
            style={{ gap: "0.03em", paddingLeft: "0.115em", marginBottom: "0.012em" }}
          >
            <span style={{ fontSize: "0.06em", letterSpacing: "0.12em", width: "4.9em" }}>
              malas
            </span>
            <span style={{ fontSize: "0.06em", letterSpacing: "0.12em" }}>buenas</span>
          </div>
          <Fila etiqueta="Él" puntos={rival} />
          <div className="bg-tinta/15" style={{ height: "1px", margin: "0.016em 0" }} />
          <Fila etiqueta="Yo" puntos={vos} />
        </div>
      </div>
      <Birome />
    </div>
  );
}

/* ═══ EL MARCADOR DE LA BARRA DE ARRIBA ═════════════════════════════════════

   Es lo que hacen las referencias (`DISENO-NIVEL/Inspiracion del diseño de
   nivel/Nivel.png` y `nivel2.png`): arriba de todo, `Tú: ▢▢▢▢▢▢` de un lado y
   el nombre del rival con los suyos del otro. Cuadraditos y no números, que
   además es lo que ya estaba decidido acá ("los palitos se quedan").

   ── Por qué existe, además de la libreta ──────────────────────────────────

   En el celular la libreta se comía el cuarto de arriba de la mesa: 169 de los
   390 px de ancho, con la birome llegando al borde. Ahí se va y este marcador
   queda como el único. En la compu se quedan los dos, igual que en la
   referencia, que tiene los cuadraditos arriba Y el papelito sobre la mesa.

   ── Por qué va en la barra y no flotando sobre la escena ──────────────────

   La barra ya existe y mide 30px fijos. Metido ahí, el marcador no le saca ni
   un píxel a la mesa; puesto encima de la escena taparía el fondo o al rival,
   que es donde ya está el medallón. Ocupa el lugar del texto del ambiente, que
   era decorativo y sigue estando —pegado al marcador— donde hay ancho.

   Los seis grupos son los 30 puntos de la partida, con el corte de las malas
   después del tercero: la misma cuenta que la libreta. */

/* ── EL TAMAÑO DE LOS CASILLEROS, QUE NO ES FIJO ───────────────────────────
   Con 9x12 clavados entraba en un celular de 320 y en la compu quedaba una
   hilera de puntitos: la barra mide 1440 de ancho y le sobraban 434px de
   hueco. O sea el mismo problema que ya tuvo el mazo —medir en píxeles fijos
   una escena que cambia de tamaño— pero al revés.

   Va en `clamp` con `vw` y no en un punto de corte: acá lo que aprieta ES el
   ancho, porque la barra reparte tres cosas en una línea. Del piso al techo
   crece parejo, sin que en ningún ancho salte de golpe.

     320px → 9px (el piso, que es lo que entra al lado de "Mapa" y "Ayudas")
     1266  → 14px
     1440+ → 16px (el techo: más alto que esto no entra en una barra de 30px)

   El alto sigue la proporción del dibujo (22x26), así que va con el mismo
   clamp multiplicado por 1,18. Si se toca uno se toca el otro o los palitos
   salen aplastados. */
const CASILLERO = { ancho: "clamp(9px, 1.1vw, 16px)", alto: "clamp(11px, 1.3vw, 19px)" };

/** Una vez cada jugador: la etiqueta y los seis grupos. */
function TiraDeBarra({
  etiqueta,
  puntos,
  color,
  claseEtiqueta,
}: {
  etiqueta: string;
  puntos: number;
  color: string;
  claseEtiqueta: string;
}) {
  const malas = Math.min(puntos, 15);
  const buenas = Math.max(puntos - 15, 0);
  return (
    <span
      className="flex min-w-0 items-center gap-[2px]"
      aria-label={`${etiqueta}: ${puntos} ${puntos === 1 ? "punto" : "puntos"}`}
    >
      <span className={`mr-[2px] shrink-0 ${claseEtiqueta}`}>{etiqueta}</span>
      <span className="flex gap-px">
        {enGrupos(malas).map((n, i) => (
          <Palitos
            key={`m${i}`}
            cantidad={n}
            color={color}
            alto={CASILLERO.alto}
            ancho={CASILLERO.ancho}
            opacidad={0.95}
            fantasma
          />
        ))}
      </span>
      {/* la raya de las malas a las buenas, la misma que tiene la libreta */}
      <span className="w-px shrink-0 bg-crema/25" style={{ height: CASILLERO.ancho }} />
      <span className="flex gap-px">
        {enGrupos(buenas).map((n, i) => (
          <Palitos
            key={`b${i}`}
            cantidad={n}
            color={color}
            alto={CASILLERO.alto}
            ancho={CASILLERO.ancho}
            opacidad={0.95}
            fantasma
          />
        ))}
      </span>
    </span>
  );
}

export function MarcadorBarra({ vos, rival }: { vos: number; rival: number }) {
  /* Los tuyos en dorado y los de él en crema: es el mismo par que ya usa el
     resto de la mesa —"TU TANTO" va en dorado— así que de un vistazo se sabe
     cuál fila es cuál sin leer la etiqueta. */
  /* "Yo" y "Él" son las MISMAS etiquetas de la libreta, y eso no es prolijidad:
     en la compu las dos cosas están en pantalla a la vez, y con "Vos" arriba y
     "Yo" en el papel parecen tres jugadores. Además "Yo" entra donde "Vos" no:
     a 320px la fila necesitaba 185px y había 170. */
  return (
    <div className="flex min-w-0 items-center gap-[clamp(6px,0.8vw,14px)] font-[family-name:var(--font-ui)] text-[clamp(10px,0.85vw,13px)] uppercase tracking-wide">
      <TiraDeBarra
        etiqueta="Yo"
        puntos={vos}
        color="var(--color-dorado)"
        claseEtiqueta="text-dorado/90"
      />
      <span aria-hidden="true" className="text-crema/20">
        ·
      </span>
      <TiraDeBarra
        etiqueta="Él"
        puntos={rival}
        color="var(--color-crema)"
        claseEtiqueta="text-crema/60"
      />
    </div>
  );
}
