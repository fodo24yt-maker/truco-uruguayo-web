/**
 * Las lecciones de la sección Aprender.
 * Todo el contenido sale de reglas.txt: si algo no está allá, no se enseña acá.
 */

import { Dato, FilaCartas, ManoConMuestra, Tabla, c } from "@/components/Ejemplos";
import { explicarEnvido } from "@/lib/motor/tantos";

export interface Leccion {
  slug: string;
  titulo: string;
  resumen: string;
  minutos: number;
  Contenido: () => React.ReactElement;
}

// ─── 1. La baraja ────────────────────────────────────────────────────────────

function LaBaraja() {
  return (
    <>
      <p>
        El truco se juega con la <strong>baraja española de 40 cartas</strong>.
        Cuatro palos: espada, basto, oro y copa. De cada palo hay diez cartas:
        del 1 al 7, más las tres figuras (sota, caballo y rey).
      </p>
      <p>
        No se usan los ochos ni los nueves. Si tenés un mazo de 48, sacá esas
        ocho cartas y ya está.
      </p>

      <FilaCartas
        cartas={["1E", "1B", "1O", "1C"]}
        pie="Los cuatro palos: espada, basto, oro y copa."
      />

      <h2>Las figuras</h2>
      <p>
        La sota es el 10, el caballo es el 11 y el rey es el 12. Guardá este
        dato, que después vuelve: <strong>para contar puntos, las figuras
        valen cero</strong>.
      </p>

      <FilaCartas
        cartas={["10O", "11O", "12O"]}
        pie="Sota, caballo y rey de oro: el 10, el 11 y el 12."
      />

      <Dato titulo="Lo que hay que llevarse">
        40 cartas, cuatro palos, del 1 al 7 más sota (10), caballo (11) y rey
        (12). Sin ochos ni nueves.
      </Dato>
    </>
  );
}

// ─── 2. La jerarquía ─────────────────────────────────────────────────────────

function Jerarquia() {
  return (
    <>
      <p>
        Acá va la primera sorpresa: <strong>en el truco no gana la carta con el
        número más alto</strong>. Hay un orden propio que hay que aprender. Un
        3 le gana a un rey. Un 1 de espada le gana a todo.
      </p>

      <h2>Las cuatro matas</h2>
      <p>
        Arriba de todo están las que se llaman <em>matas</em>: las cuatro cartas
        bravas. En este orden, de mayor a menor:
      </p>

      <FilaCartas
        cartas={["1E", "1B", "7E", "7O"]}
        pie="Ancho de espada, ancho de basto, siete de espada y siete de oro."
      />

      <p>
        Ojo con esto: el <strong>1 de oro y el 1 de copa no son matas</strong>.
        Se les dice anchos falsos y son cartas del montón. Lo mismo pasa con el
        7 de copa y el 7 de basto: sietes falsos.
      </p>

      <h2>El orden completo</h2>
      <Tabla
        cabeceras={["", "Carta", "Cómo se le dice"]}
        filas={[
          ["1", "1 de espada", "mata"],
          ["2", "1 de basto", "mata"],
          ["3", "7 de espada", "mata"],
          ["4", "7 de oro", "mata"],
          ["5", "Los tres", "los cuatro valen igual"],
          ["6", "Los dos", "los cuatro valen igual"],
          ["7", "1 de oro y 1 de copa", "anchos falsos"],
          ["8", "Los reyes (12)", ""],
          ["9", "Los caballos (11)", ""],
          ["10", "Las sotas (10)", ""],
          ["11", "7 de copa y 7 de basto", "sietes falsos"],
          ["12", "Los seis", ""],
          ["13", "Los cinco", ""],
          ["14", "Los cuatro", "las más flojas"],
        ]}
      />

      <Dato titulo="Cuando dos cartas valen igual">
        Si se cruzan dos cartas del mismo escalón —dos treses, por ejemplo— la
        baza queda empatada. A eso se le dice <strong>parda</strong>, y pasa
        seguido. Lo vemos en la lección de la mano.
      </Dato>

      <p>
        Ahora bien: todo este orden es <strong>la base</strong>, y en el truco
        uruguayo se reordena en cada mano. De eso se trata la lección que sigue,
        que es la más importante de todas.
      </p>
    </>
  );
}

// ─── 3. La muestra y las piezas ──────────────────────────────────────────────

function LaMuestra() {
  return (
    <>
      <p>
        Ésta es la lección que hace al truco uruguayo distinto de todos los
        demás. Si venís de mirar videos argentinos, esto no lo viste nunca:
        allá <strong>la muestra no existe</strong>.
      </p>

      <h2>Qué es la muestra</h2>
      <p>
        Después de repartir las tres cartas a cada uno, se da vuelta una carta
        más: <strong>ésa es la muestra</strong>. Queda a la vista de todos toda
        la mano y no se juega. Su palo pasa a mandar.
      </p>

      <h2>Las piezas</h2>
      <p>
        Las cartas del palo de la muestra que sean{" "}
        <strong>2, 4, 5, 11 o 10</strong> se convierten en{" "}
        <strong>piezas</strong>: las cartas más fuertes del juego, por encima
        incluso del ancho de espada.
      </p>

      <FilaCartas
        cartas={["2O", "4O", "5O", "11O", "10O"]}
        muestra="3O"
        ancho={64}
        pie="Con muestra de oro, éstas son las cinco piezas, de la más fuerte a la más floja."
      />

      <p>
        Mirá lo que significa eso. El 4 es la carta más floja de la baraja. Pero
        si la muestra es de basto, el 4 de basto le gana al ancho de espada:
      </p>

      <ManoConMuestra
        mano={["4B", "1E", "7O"]}
        muestra="3B"
        pie="Muestra de basto. Tu 4 de basto es pieza y le gana a las dos matas que tenés al lado."
      />

      <Dato titulo="El error más caro del principiante">
        Tirar una carta sin mirar la muestra. Creés que tu ancho de espada es
        invencible y el rival te lo tapa con un 5. <strong>Antes de cada mano,
        mirá qué palo manda.</strong>
      </Dato>

      <h2>¿Y si la muestra es justo una pieza?</h2>
      <p>
        Puede pasar que la carta que se da vuelta sea justo un 2, un 4, un 5, un
        11 o un 10. Esa pieza está sobre la mesa y no la puede jugar nadie.
        Entonces:
      </p>
      <p>
        <strong>El rey (12) de ese mismo palo ocupa su lugar como pieza.</strong>{" "}
        Toma su posición exacta en el orden y su valor para contar puntos.
      </p>

      <ManoConMuestra
        mano={["12O", "1E", "3C"]}
        muestra="5O"
        pie="La muestra es el 5 de oro, así que el rey de oro pasa a hacer de 5: es pieza y le gana al ancho de espada."
      />

      <Dato titulo="Lo que hay que llevarse">
        La muestra define el palo que manda. El 2, 4, 5, 11 y 10 de ese palo son
        piezas y van arriba de todo, en ese orden. Si la muestra es una de
        ellas, el rey de ese palo la reemplaza.
      </Dato>
    </>
  );
}

// ─── 4. La mano ──────────────────────────────────────────────────────────────

function LaMano() {
  return (
    <>
      <p>
        Cada reparto se juega en <strong>tres vueltas</strong>, que se llaman
        bazas. En cada una, cada jugador tira una carta y la más alta gana.
      </p>
      <p>
        <strong>El que gana dos de las tres bazas gana la mano.</strong> Por eso
        la tercera muchas veces no se juega: si alguien ya ganó las dos
        primeras, no hace falta.
      </p>

      <h2>Quién tira primero</h2>
      <p>
        El primero en tirar es <strong>el mano</strong>, que es el jugador a la
        derecha del que repartió. Después, cada baza la abre el que ganó la
        anterior.
      </p>
      <p>
        Ser mano no es un detalle: <strong>en caso de empate, gana el mano</strong>.
        Si empatan los tantos del envido, se los lleva el mano. Si se pardan las
        tres bazas, la mano es del mano. La misma mano de cartas se juega
        distinto según dónde estés sentado.
      </p>

      <h2>Las pardas</h2>
      <p>
        Cuando las dos cartas valen igual, la baza queda empatada: es una{" "}
        <strong>parda</strong>. No es raro, pasa todo el tiempo con los treses y
        los doses, que valen igual en los cuatro palos.
      </p>

      <FilaCartas
        cartas={["3E", "3C"]}
        pie="Dos treses: parda. Ninguno gana la baza."
      />

      <p>La regla para resolverlas es una sola:</p>

      <Dato titulo="La regla de las pardas">
        Cuando hay pardas, gana la mano <strong>el que se llevó una baza
        primero</strong>. Si las tres son pardas, gana el mano.
      </Dato>

      <Tabla
        cabeceras={["Primera", "Segunda", "Tercera", "Gana"]}
        filas={[
          ["ganás vos", "ganás vos", "no se juega", "vos"],
          ["ganás vos", "gana él", "ganás vos", "vos"],
          ["ganás vos", "gana él", "parda", "vos (ganaste la primera)"],
          ["ganás vos", "parda", "no se juega", "vos (ganaste la primera)"],
          ["parda", "ganás vos", "no se juega", "vos (ganaste la segunda)"],
          ["parda", "parda", "ganás vos", "vos"],
          ["parda", "parda", "parda", "el mano"],
        ]}
      />

      <h2>Irse al mazo</h2>
      <p>
        Si te tocaron tres cartas malas, podés tirarlas y renunciar a la mano:
        eso es irse al mazo. El rival cobra lo que estuviera en juego en ese
        momento. Lo que ya cobraste por envido o flor no se devuelve.
      </p>
    </>
  );
}

// ─── 5. El envido ────────────────────────────────────────────────────────────

/**
 * Muestra una mano con su tanto ya calculado.
 * La cuenta la hace el motor del juego, no está escrita a mano: así la lección
 * y la mesa nunca se pueden contradecir.
 */
function Cuenta({ mano, muestra, nota }: { mano: string[]; muestra: string; nota?: string }) {
  const cartas = mano.map(c);
  const laMuestra = c(muestra);

  return (
    <ManoConMuestra
      mano={mano}
      muestra={muestra}
      ancho={60}
      pie={
        <>
          <strong className="text-bordo">{explicarEnvido(cartas, laMuestra)}</strong>
          {nota && <> — {nota}</>}
        </>
      }
    />
  );
}

function ElEnvido() {
  return (
    <>
      <p>
        El envido es una apuesta aparte del truco: no importa quién gana la
        mano, sino <strong>quién tiene el mejor tanto</strong>. Se canta al
        principio, antes de que se jueguen las cartas.
      </p>

      <h2>Cómo se cuenta tu tanto</h2>
      <p>Hay tres casos y se miran en este orden:</p>

      <h3>1. Si tenés una pieza</h3>
      <p>
        La pieza vale muchísimo, y le sumás el número de la más alta de tus
        otras dos cartas. No hace falta que sea del mismo palo:{" "}
        <strong>la pieza liga con cualquier carta</strong>.
      </p>

      <Tabla
        cabeceras={["Pieza", "Vale"]}
        filas={[
          ["2 de la muestra", "30"],
          ["4 de la muestra", "29"],
          ["5 de la muestra", "28"],
          ["11 de la muestra (caballo)", "27"],
          ["10 de la muestra (sota)", "27"],
        ]}
      />

      <Cuenta mano={["2B", "7O", "12C"]} muestra="3B" nota="el tanto más alto posible" />

      <h3>2. Si tenés dos cartas del mismo palo</h3>
      <p>Sumás sus números y le agregás 20. Las figuras valen cero.</p>

      <Cuenta mano={["7C", "6C", "12E"]} muestra="3B" nota="lo máximo sin piezas" />
      <Cuenta mano={["12O", "7O", "3E"]} muestra="3B" nota="el rey suma cero, pero el palo sirve" />

      <h3>3. Si tus tres cartas son de palos distintos</h3>
      <p>Tu tanto es el número de tu carta más alta, sin sumar nada.</p>

      <Cuenta mano={["1E", "7O", "4C"]} muestra="3B" nota="tres palos distintos" />

      <Dato titulo="Los números que conviene tener en la cabeza">
        El tanto va de 0 a 37. El máximo es 37 (el 2 de la muestra más un 7). Sin
        piezas, lo máximo es 33 (el 7 y el 6 del mismo palo). Con 27 o más ya
        tenés con qué cantar.
      </Dato>

      <h2>Cómo se canta</h2>
      <p>
        El envido se puede ir subiendo, y ahí está la picardía. Cada canto
        acumula lo que está en juego. <strong>Rechazar nunca sale gratis</strong>:
        el que cantó cobra igual lo que había antes.
      </p>

      <Tabla
        cabeceras={["Canto", "Quiero", "No quiero"]}
        filas={[
          ["Envido", "2", "1"],
          ["Envido + envido", "4", "2"],
          ["Real envido", "3", "1"],
          ["Envido + real envido", "5", "2"],
          ["Falta envido", "lo que le falta al que va ganando", "1"],
        ]}
      />

      <p>
        <strong>La falta envido</strong> es el canto que define partidas: vale
        todos los puntos que le faltan al que va ganando para llegar a 30. Si va
        22 a 15, la falta vale 8. Antes de cantarla, mirá el marcador.
      </p>

      <Dato titulo="Cuándo se canta">
        Sólo en la primera vuelta, antes de que se tiren las dos primeras
        cartas. Si nadie lo cantó para entonces, el envido no se juega en esa
        mano. Y si alguien tiene flor, tampoco: la flor lo anula.
      </Dato>
    </>
  );
}

// ─── 6. La flor ──────────────────────────────────────────────────────────────

function LaFlor() {
  return (
    <>
      <p>
        Tener flor es tener suerte: son tres cartas que ligan entre sí. Vale{" "}
        <strong>3 puntos</strong> y, en el truco uruguayo,{" "}
        <strong>se juega siempre</strong>. No se acuerda antes como en otras
        variantes: está siempre.
      </p>

      <h2>Cuándo tenés flor</h2>
      <p>Con que se cumpla una sola de estas tres cosas, tenés flor:</p>

      <h3>a) Tus tres cartas son del mismo palo</h3>
      <FilaCartas cartas={["7C", "6C", "3C"]} muestra="3O" ancho={64} />

      <h3>b) Tenés dos piezas o más</h3>
      <FilaCartas cartas={["2O", "4O", "7E"]} muestra="3O" ancho={64} />

      <h3>c) Tenés una pieza y las otras dos son del mismo palo</h3>
      <FilaCartas cartas={["2O", "6C", "12C"]} muestra="3O" ancho={64} />

      <Dato titulo="Ojo con este caso">
        Que tengas una pieza y otra carta del palo de la muestra{" "}
        <em>no</em> es flor. Lo que importa es que las otras dos sean del mismo
        palo <strong>entre ellas</strong>.
      </Dato>

      <h2>Cuánto vale tu flor</h2>
      <p>Se arranca de 20 y se suma lo que aporta cada carta:</p>

      <Tabla
        cabeceras={["Carta", "Aporta"]}
        filas={[
          ["2 de la muestra", "10"],
          ["4 de la muestra", "9"],
          ["5 de la muestra", "8"],
          ["11 o 10 de la muestra", "7"],
          ["Cartas del 1 al 7", "su número"],
          ["Figuras (10, 11, 12)", "0"],
        ]}
      />

      <FilaCartas
        cartas={["7C", "6C", "3C"]}
        muestra="3O"
        ancho={60}
        pie="20 + 7 + 6 + 3 = 36"
      />
      <FilaCartas
        cartas={["2O", "4O", "5O"]}
        muestra="3O"
        ancho={60}
        pie="20 + 10 + 9 + 8 = 47, la flor más alta que existe"
      />

      <Dato titulo="Lo que hay que llevarse">
        Tres cartas que ligan, 3 puntos, y se juega siempre. Si los dos tienen
        flor gana la más alta, y en caso de empate, el mano. La flor{" "}
        <strong>anula el envido</strong>: si hay flor, el envido no se juega.
      </Dato>

      <h2>Cuando los dos tienen flor</h2>
      <p>
        Ahí se puede subir la apuesta, en dos escalones. Cada uno se puede
        rechazar, y rechazar nunca sale gratis:
      </p>

      <Tabla
        cabeceras={["Canto", "Si se quiere y se gana", "Si NO se quiere"]}
        filas={[
          ["Flor", "3", "—"],
          ["Con flor envido", "6 (3 de flor + 3 de envido)", "3 para el que cantó"],
          [
            "Contraflor al resto",
            "se gana la partida entera",
            "3 ó 6, según lo que se había cantado antes",
          ],
        ]}
      />

      <p>
        <strong>Contraflor al resto</strong> es la apuesta máxima: si se quiere
        y se gana, ese equipo se lleva el chico entero, sin importar cuántos
        puntos tuviera cada uno.
      </p>

      <Dato titulo="Ojo, esto puede variar de mesa en mesa">
        Éstos son los valores que usa este juego. En otras mesas y grupos el
        "con flor envido" a veces se cuenta distinto. Si jugás con gente que
        tiene otra costumbre, puede que difiera un poco de lo que ves acá.
      </Dato>
    </>
  );
}

// ─── 7. El truco ─────────────────────────────────────────────────────────────

function ElTruco() {
  return (
    <>
      <p>
        Cantar truco es apostar a que te llevás la mano. Si nadie canta nada, la
        mano vale <strong>1 punto</strong>. Cantando, sube.
      </p>

      <Tabla
        cabeceras={["Canto", "Quiero", "No quiero"]}
        filas={[
          ["Truco", "2", "1"],
          ["Retruco", "3", "2"],
          ["Vale cuatro", "4", "3"],
        ]}
      />

      <h2>Los cantos se alternan</h2>
      <p>
        Ésta es la regla que más se olvida:{" "}
        <strong>el que canta truco no puede cantar retruco</strong>. El retruco
        lo canta el rival, y el vale cuatro vuelve al primero. Cada canto es
        siempre una respuesta al otro.
      </p>

      <Dato titulo="Cómo suena en la mesa">
        Vos: ¡Truco! — Él: ¡Retruco! — Vos: ¡Vale cuatro! — Él: ¡Quiero!
        <br />
        La mano pasa a valer 4 puntos.
      </Dato>

      <h2>Cuándo se canta</h2>
      <p>
        En tu turno, antes de tirar tu carta, en cualquiera de las tres bazas.
        También podés cantarlo respondiendo a un canto del rival.
      </p>

      <h2>Las tres respuestas</h2>
      <ul>
        <li>
          <strong>Quiero:</strong> se acepta y se sigue jugando por más puntos.
        </li>
        <li>
          <strong>No quiero:</strong> se corta la mano ahí y el que cantó cobra.
          Nadie ve las cartas del otro.
        </li>
        <li>
          <strong>Subir:</strong> cantar el escalón siguiente, que ya implica
          aceptar el anterior.
        </li>
      </ul>

      <Dato titulo="El que nunca canta, pierde">
        El truco se gana cantando. El que sólo canta con cartas buenas es
        previsible, y contra alguien que lee eso no gana ni con las mejores
        cartas. Cantar de mentira es parte del juego.
      </Dato>
    </>
  );
}

// ─── 8. Puntos y partida ─────────────────────────────────────────────────────

function PuntosYPartida() {
  return (
    <>
      <p>
        Gana el primero que llega a <strong>30 puntos</strong>. La partida se
        anota en dos mitades: los primeros 15 son las{" "}
        <strong>malas</strong> y los 15 siguientes las{" "}
        <strong>buenas</strong>. No cambia ninguna regla al pasar de una a otra:
        es la forma tradicional de anotar.
      </p>

      <h2>La tabla completa</h2>
      <Tabla
        cabeceras={["Canto", "Quiero", "No quiero"]}
        filas={[
          ["Mano sin cantos", "1", "—"],
          ["Truco", "2", "1"],
          ["Retruco", "3", "2"],
          ["Vale cuatro", "4", "3"],
          ["Envido", "2", "1"],
          ["Real envido", "3", "1"],
          ["Falta envido", "lo que le falta al que va ganando", "1"],
          ["Flor", "3 (no se acepta ni se rechaza)", "—"],
        ]}
      />

      <h2>El orden de las cosas</h2>
      <p>Cuando hay varios cantos dando vueltas, siempre mandan en este orden:</p>

      <Dato titulo="Flor, envido, truco">
        La <strong>flor</strong> mata al envido: si alguien canta flor, el envido
        no se juega.
        <br />
        El <strong>envido</strong> se resuelve antes que el truco: si sobre un
        truco alguien canta envido, primero se cuenta el envido.
      </Dato>

      <h2>Los cinco errores que más caros salen</h2>
      <ol>
        <li>
          <strong>No mirar la muestra.</strong> Tirás una carta creyéndola
          fuerte y el rival tenía una pieza.
        </li>
        <li>
          <strong>Cantar envido por costumbre.</strong> Se canta cuando tenés
          con qué, o cuando mentís a propósito. Por inercia, no.
        </li>
        <li>
          <strong>Guardar la carta más alta para la tercera.</strong> Si perdés
          las dos primeras, la tercera no se juega nunca.
        </li>
        <li>
          <strong>Quedarse mudo.</strong> El que nunca canta es previsible.
        </li>
        <li>
          <strong>Cantar la falta sin mirar el marcador.</strong> Puede valer 2
          puntos o la partida entera.
        </li>
      </ol>

      <p>
        Con esto ya sabés jugar. Lo que falta es sentarse a la mesa:{" "}
        <strong>andá a la sección Jugar</strong> y practicá contra el bot, que
        para eso está.
      </p>
    </>
  );
}

// ─── El índice ───────────────────────────────────────────────────────────────

export const LECCIONES: Leccion[] = [
  {
    slug: "la-baraja",
    titulo: "La baraja española",
    resumen: "40 cartas, cuatro palos y ninguna sorpresa todavía.",
    minutos: 2,
    Contenido: LaBaraja,
  },
  {
    slug: "jerarquia",
    titulo: "Qué carta le gana a cuál",
    resumen: "No gana el número más alto: manda una jerarquía propia.",
    minutos: 4,
    Contenido: Jerarquia,
  },
  {
    slug: "la-muestra",
    titulo: "La muestra y las piezas",
    resumen: "Lo que hace único al truco uruguayo. La lección más importante.",
    minutos: 5,
    Contenido: LaMuestra,
  },
  {
    slug: "la-mano",
    titulo: "Cómo se juega una mano",
    resumen: "Tres bazas, quién abre, y cómo se resuelven las pardas.",
    minutos: 4,
    Contenido: LaMano,
  },
  {
    slug: "el-envido",
    titulo: "El envido",
    resumen: "Contar el tanto y aprender cuándo conviene cantarlo.",
    minutos: 6,
    Contenido: ElEnvido,
  },
  {
    slug: "la-flor",
    titulo: "La flor",
    resumen: "Cuándo la tenés, cuánto vale y por qué anula el envido.",
    minutos: 4,
    Contenido: LaFlor,
  },
  {
    slug: "el-truco",
    titulo: "El truco, el retruco y el vale cuatro",
    resumen: "La apuesta por la mano y por qué los cantos se alternan.",
    minutos: 3,
    Contenido: ElTruco,
  },
  {
    slug: "puntos-y-partida",
    titulo: "Los puntos y la partida",
    resumen: "Malas, buenas, la tabla completa y los errores que salen caros.",
    minutos: 4,
    Contenido: PuntosYPartida,
  },
];

export const buscarLeccion = (slug: string) =>
  LECCIONES.find((l) => l.slug === slug);
