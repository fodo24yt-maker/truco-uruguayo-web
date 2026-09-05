/**
 * El marcador de puntos de la barra de arriba.
 *
 * Se anota como en la mesa de verdad: palitos que arman un cuadrado y el quinto
 * cruzado, de a cinco puntos. Malas de un lado, buenas del otro.
 *
 * LOS PALITOS SE QUEDAN. Las referencias anotan con números ("Nosotros: 12"),
 * pero acá se cuenta a palitos, que es como se cuenta de este lado del río.
 *
 * ── ACÁ TAMBIÉN VIVÍA LA LIBRETA, Y SE FUE EL 5/9/2026 ───────────────────
 *
 * Era el papelito apoyado sobre la madera, con su birome en diagonal, y existía
 * SÓLO en la compu: en el celular se comía el cuarto de arriba de la mesa. Al
 * pasar a un solo diseño había que decidir si iba a las dos pantallas o a
 * ninguna, y Santiago eligió que se fuera.
 *
 * Con ella se fueron `Marcador`, `Fila`, `Grupo`, `Birome`, la constante
 * `ANCHO` y el `clip-path` del papel —uno de los dos que tenía el proyecto—.
 * Lo que quedó, `Palitos` y `enGrupos`, es lo que las dos compartían.
 */

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

   La barra ya existe y es finita. Metido ahí, el marcador casi no le saca alto
   a la mesa; puesto encima de la escena taparía el fondo o al rival, que es
   donde ya está el medallón. Ocupa el lugar que tenía el texto del ambiente,
   que era decorativo y se sacó el 2/9/2026: el departamento ya está en el
   medallón y ese ancho lo necesitaban los puntos.

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

   El alto sigue la proporción del dibujo (22x26), así que va con el mismo
   clamp multiplicado por 1,18. Si se toca uno se toca el otro o los palitos
   salen aplastados.

   ── SON DOS JUEGOS DE MEDIDAS, uno por forma ──────────────────────────────
   `enFila` es el de siempre, el de la compu:

     320px → 9px (el piso, que es lo que entra al lado de "Mapa" y "Ayudas")
     1266  → 14px
     1440+ → 16px (el techo: más alto que esto no entra en una barra de 30px)

   ── QUEDÓ SÓLO EL APILADO, DESDE EL 5/9/2026 ──────────────────────────────
   Eran dos, `enFila` para la compu y `apilado` para el celular, y cuál se usaba
   lo decidía el diseño que la mesa ya tenía elegido. Con un solo diseño esa
   pregunta dejó de existir, así que quedó el que entra en el caso apretado.

   Y el que entra es el apilado: el piso de `enFila` era 9px de casillero, que
   deja los palitos en 1px. En la foto del 1/9 el marcador era una hilera de
   puntitos grises y no se sabía cómo iba la partida, que es exactamente lo
   único que ese marcador tiene que decir. Puesto en dos filas, cada una tiene
   la barra entera para ella y el casillero casi se duplica. En la compu sobra
   lugar, así que no molesta. */
const CASILLERO = { ancho: "clamp(14px, 4.4vw, 18px)", alto: "clamp(17px, 5.2vw, 21px)" };

/** Una vez cada jugador: la etiqueta, los seis grupos y el número. */
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
  const medida = CASILLERO;
  return (
    <span
      className="flex min-w-0 items-center gap-[2px]"
      aria-label={`${etiqueta}: ${puntos} ${puntos === 1 ? "punto" : "puntos"}`}
    >
      {/* Apilado la etiqueta lleva ancho fijo: es lo que deja "Yo" y "Él" en
          columna, con los casilleros de las dos filas arrancando a la misma
          altura. Sin eso, "Él" es más angosto y la fila de abajo queda corrida
          dos píxeles, que se ven. */}
      <span
        className={`mr-[2px] shrink-0 text-right ${claseEtiqueta}`}
        style={{ width: "1.7em" }}
      >
        {etiqueta}
      </span>
      <span className="flex gap-px">
        {enGrupos(malas).map((n, i) => (
          <Palitos
            key={`m${i}`}
            cantidad={n}
            color={color}
            alto={medida.alto}
            ancho={medida.ancho}
            opacidad={0.95}
            fantasma
          />
        ))}
      </span>
      {/* la raya de las malas a las buenas, la misma que tiene la libreta */}
      <span className="w-px shrink-0 bg-crema/25" style={{ height: medida.ancho }} />
      <span className="flex gap-px">
        {enGrupos(buenas).map((n, i) => (
          <Palitos
            key={`b${i}`}
            cantidad={n}
            color={color}
            alto={medida.alto}
            ancho={medida.ancho}
            opacidad={0.95}
            fantasma
          />
        ))}
      </span>
      {/* EL NÚMERO. Los palitos dicen cómo viene la cosa de un vistazo, pero
          "¿cuánto voy?" se contesta con un número, y desde que la libreta no
          está este marcador es todo lo que hay.

          En la manuscrita, igual que en el papel: un tanto es algo que alguien
          anotó. Y con ancho fijo, para que las dos filas queden en columna. */}
      <span className="ml-[4px] shrink-0 text-right" style={{ width: "1.9em" }}>
        <span
          className="block font-[family-name:var(--font-mano)] text-[15px] leading-none"
          style={{ color }}
        >
          {puntos}
        </span>
      </span>
    </span>
  );
}

export function MarcadorBarra({ vos, rival }: { vos: number; rival: number }) {
  /* Los tuyos en dorado y los de él en crema: es el mismo par que ya usa el
     resto de la mesa —"TU TANTO" va en dorado— así que de un vistazo se sabe
     cuál fila es cuál sin leer la etiqueta. */
  /* "Yo" y "Él", y no "Vos": entra donde "Vos" no —a 320px la fila necesitaba
     185px y había 170—. Eran también las etiquetas de la libreta, para que con
     las dos en pantalla no parecieran tres jugadores; la libreta ya no está,
     pero el motivo del ancho sigue en pie. */
  const tuya = (
    <TiraDeBarra
      etiqueta="Yo"
      puntos={vos}
      color="var(--color-dorado)"
      claseEtiqueta="text-dorado/90"
    />
  );
  const suya = (
    <TiraDeBarra
      etiqueta="Él"
      puntos={rival}
      color="var(--color-crema)"
      claseEtiqueta="text-crema/60"
    />
  );

  /* Va en `grid` y no en dos `flex` sueltos: es lo que hace que las dos filas
     midan lo mismo y queden alineadas por la izquierda aunque una tenga el
     número de dos dígitos y la otra de uno. */
  return (
    <div className="grid gap-[3px] font-[family-name:var(--font-ui)] text-[12px] uppercase tracking-wide">
      {tuya}
      {suya}
    </div>
  );
}
