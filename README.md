# Truco Uruguayo — aprender y practicar, gratis

Una web para **aprender a jugar al truco uruguayo desde cero** y después
**practicar contra un bot**, sin pagar nada y sin registrarse.

### 🎴 [Jugar ahora → truquito.smmqo08.workers.dev](https://truquito.smmqo08.workers.dev)

> **Estado: en desarrollo.** Ya andan la sección Aprender (8 lecciones) y la
> mesa mano a mano contra el bot. Entrás desde el navegador, sin instalar ni
> descargar nada. Todavía se ve un poco justo en celular; se está puliendo.

## Por qué este proyecto

Si querés aprender truco uruguayo hoy, te chocás con dos problemas:

1. **Casi todo lo que hay en internet es truco argentino.** Las guías, los
   videos, los tutoriales: casi todos se saltean la muestra y las piezas, que
   son justamente el corazón del truco uruguayo. Aprendés otro juego.
2. **Lo bueno se paga.** Las pocas apps que enseñan bien el truco uruguayo son
   pagas o te dejan probar un rato y después te cobran.

Y sobre todo: falta un lugar donde **aprender y practicar sean la misma cosa**.
Leer las reglas no te enseña a jugar al truco; jugar sin saber contar el tanto
tampoco. Hace falta poder leer cómo se cuenta una flor, y a los treinta
segundos estar contando una flor de verdad contra alguien.

Eso es lo que quiere ser esto, y **es gratis**.

## Qué hay hecho

**Aprender** — 8 lecciones en orden, de la baraja hasta la tabla de puntos, con
las cartas dibujadas para cada ejemplo. La lección de la muestra y las piezas es
la que ninguna guía argentina te da.

**Jugar** — mesa mano a mano contra un bot, con las reglas completas: muestra,
piezas, envido encadenado, flor con sus apuestas (con flor envido, contraflor
al resto), truco/retruco/vale cuatro y pardas. La flor la cantás vos, con su
botón, y el envido va primero: si te cantan truco antes de que hayas hablado,
podés contestarle envido y se resuelve eso primero. Ambientada en un bar de noche:
mesa de madera en perspectiva, la lámpara colgando y el rival sentado enfrente.
Cada mano arranca repartiendo de a una carta —mano, pie, mano, pie— y recién
cuando terminó se dan vuelta. El mazo tiene la muestra metida abajo, atravesada
y asomando lo justo para verle el número y el palo, y cambia de lado según de
quién sea el reparto: si sos mano te queda a la izquierda, si sos pie a la
derecha.
Con las ayudas prendidas te muestra tu tanto ya calculado y te marca cuáles de
tus cartas son piezas; se apagan cuando querés.

**El motor** — las reglas en TypeScript, con 128 tests que las verifican contra
`reglas.txt`: una pasada por fuerza bruta sobre las 40 cartas y todas las
muestras posibles, 40 partidas de bot contra bot que terminan sin una sola
jugada inválida, y una enumeración de las 365.560 manos posibles que confirma
que la flor sale el 15,5% de las veces. Ese último salió de una sospecha
jugando —"me tocan demasiadas flores"— y la respuesta fue que el reparto está
bien: el truco uruguayo hace la flor 3,2 veces más frecuente que el argentino,
porque una pieza más dos cartas del mismo palo ya es flor.

**La gira** — un mapa del tesoro del Uruguay con un rival por departamento,
cada uno con su forma de jugar. Se desbloquea de a uno: arrancás en Montevideo
y cada parada se abre cuando le ganaste a la anterior, subiendo por estrellas
hasta el norte gaucho, que es donde está el truco bravo. El camino punteado, la
✕ de los departamentos ganados y el sombrero parado en el que te toca salen de
la geometría real de los 19 departamentos, sacada de
[Natural Earth](https://www.naturalearthdata.com/) —que es de dominio público—
y simplificada por
[`herramientas/generar-mapa.mjs`](herramientas/generar-mapa.mjs). El pergamino,
la rosa de los vientos, el mate y el sombrero también están dibujados por
código: sigue sin haber una sola imagen, son coordenadas.

**El bot** — no juega al azar, y de a poco te va conociendo. Evalúa la fuerza
de su mano, decide qué cantar según su tanto y el marcador, y elige la carta
más baja que le gane a la tuya. Además te arma una ficha mientras juegan: si
cantás envido y después mostrás un 21, lo anota; si te callás con 33 esperando
que cante él para subirle, también. Con eso te quiere el envido con menos tanto
si sos mentiroso, y te cree si sos de los que sólo cantan con algo. Los rivales
de una y dos estrellas no hacen nada de esto —juegan sus cartas y ya—, y los de
cinco te tienen fichado.

Nunca mira tus cartas: la ficha se arma sólo con lo que dejaste sobre la mesa y
los tantos que se cantaron en voz alta. Hay tests que lo verifican, incluido uno
que juega la misma mano con distinta carta guardada sin tirar y exige que la
ficha salga idéntica.

**Los versos.** De tres estrellas para arriba, los rivales no cantan pelado: te
tiran una copla. Son versos de payada de dominio público, de los que se dicen
hace más de un siglo en las mesas de acá y del litoral. Cuanto más arriba en la
gira, más versean. No cambian una sola regla —el canto es el mismo y va escrito
abajo de la copla—, y están archivados por canto en
[`lib/motor/versos.ts`](lib/motor/versos.ts), con dos marcados aparte porque no
se sostienen solos: "no se ponga tan contento por el envite que ha echao" le
contesta a un envido ajeno, y "le digo quiero y retruco" acepta y sube en el
mismo aire, así que sólo van cuando en la mesa está pasando eso.

**La dificultad, medida.** Los 19 rivales corren el mismo código con distintos
números, así que la única forma de saber si la gira sube de verdad es hacerlos
jugar entre ellos. `herramientas/medir-bots.mjs` los enfrenta y saca la tabla.
La primera vez que se corrió apareció que la escala estaba **dada vuelta**: Luki,
el primero de la gira, le ganaba a El Melo, el último, el 61% de las veces. La
tabla se había armado suponiendo que "más difícil = canta más, quiere más,
miente más", y resulta que querer con el umbral bajo es pagar apuestas perdidas.
Recalibrada, cada nivel le gana al anterior y el ★5 le gana al ★1 por 63%. Hay
un test que no la deja volver a darse vuelta sin que nadie se entere.

## Qué falta

- El modo situaciones y la práctica de tanto contrarreloj.
- 2 contra 2, con compañero y señas.
- Un bot de verdad, con un modelo de IA open source detrás.

## Correrlo por tu cuenta

Para jugar **no hace falta nada de esto**: la idea es que entres a la página y
listo. Esta sección es sólo para quien quiera abrir el código, curiosear o
aportar algo.

Con [Node.js](https://nodejs.org) instalado, `npm install` y `npm run dev`
levantan el proyecto. Los comandos disponibles:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el sitio para desarrollar |
| `npm run build` | Genera el sitio estático en `out/` |
| `npm test` | Corre las pruebas del motor del juego |
| `npm run typecheck` | Revisa los tipos sin compilar |

## Cómo está organizado

```
reglas.txt              Las reglas completas del truco uruguayo. Es la fuente de
                        verdad: de acá salen las lecciones y el motor.
app/                    Las páginas (Next.js)
  page.tsx                inicio
  aprender/               índice y lecciones
  jugar/                  la mesa y la gira
components/             Las piezas visuales, incluida la baraja en SVG
lib/
  motor/                Las reglas en código, con sus tests
    lectura.ts            La ficha que el bot te arma de cómo jugás
    versos.ts             Las coplas con las que cantan los rivales duros
  lecciones/            El contenido de la sección Aprender
  mapa-uruguay.ts       La geometría del mapa. GENERADO: no se edita a mano.
  mapa-colores.ts       El color de cada departamento. Eso sí se elige a mano.
  gira.ts               El desbloqueo en cadena, derivado del progreso
  gira-camino.ts        La geometría del camino punteado, con sus pruebas
herramientas/
  generar-mapa.mjs      Rehace mapa-uruguay.ts desde datos cartográficos
  medir-bots.mjs        Enfrenta a los 19 rivales y mide si la gira sube
ideas/
  concepto.md           Qué juego queremos hacer
  estetica.md           Cómo se tiene que ver
  diseno-frontend.md    Pantallas, componentes y decisiones de diseño
```

## Decisiones que vale la pena saber

- **Sitio estático.** Se publica en cualquier lado sin servidor, y el juego
  corre entero en el navegador.
- **No hace una sola petición de red.** Sin cuentas, sin analítica, sin
  rastreadores, sin cookies. Las tipografías se sirven desde el propio sitio.
- **La baraja está dibujada por código,** en SVG propio. No usamos imágenes de
  barajas comerciales. Tampoco hay una sola imagen en todo el sitio: la madera,
  la luz del bar y el rival son SVG y CSS.
- **Sin librerías de interfaz.** Next, React y Tailwind, y nada más.
- **La partida corre entera en tu navegador.** Eso significa que las cartas del
  bot están en la memoria del cliente: no salen en el HTML, pero alguien
  decidido puede espiarlas con las herramientas de desarrollo. Hoy da igual —no
  hay ranking ni premios—, pero el día que haya partidas entre personas, el
  estado se muda al servidor.

## Aportar

Si jugás al truco uruguayo y ves algo mal en [`reglas.txt`](reglas.txt) —sobre
todo en las preguntas abiertas del apéndice A—, abrí un issue. Que las reglas
estén bien es lo más importante del proyecto: todo lo demás se construye arriba
de eso.

## Sobre el uso de IA

Este proyecto se programó con ayuda de inteligencia artificial, y me parece
justo decirlo.

La usé para acelerar la parte de escribir código: levantar la estructura,
traducir las reglas a TypeScript, armar los componentes visuales. **Todos los
cambios los fui revisando y decidiendo yo**: qué se hace, cómo se ve, qué
reglas del truco valen y cuáles no, y qué se deja afuera por no hacer falta.

Las reglas de [`reglas.txt`](reglas.txt) se contrastaron entre varias fuentes
—que se contradecían bastante— y las decisiones sobre cuál tomar en cada caso
están explicadas en el apéndice A del documento. Además hay 128 pruebas
automáticas que verifican que el juego se comporte exactamente como dice ese
archivo.

## Licencia

Este proyecto es **de código visible, no de código libre**. La diferencia
importa:

- ✔ **Podés** leer todo el código, estudiarlo, aprender de él, inspirarte,
  correrlo en tu máquina, jugar cuanto quieras y reusar fragmentos chicos.
- ✘ **No podés** publicar este juego como propio, reusar partes sustanciales
  para armar tu propio juego de truco, ni lucrar con esto.

Está todo en [`LICENSE`](LICENSE), escrito para entenderse sin abogado.

**Las reglas del truco son la excepción, y a propósito.** El truco uruguayo es
patrimonio cultural: nadie es dueño de sus reglas. Por eso
[`reglas.txt`](reglas.txt) se libera bajo
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es): usalo para lo
que quieras, incluso comercialmente, sólo citando de dónde salió.

¿Querés hacer algo que la licencia no permite? Abrí un issue y se conversa. Los
usos educativos y sin fines de lucro se ven con muy buenos ojos.

## Legales

- [Política de privacidad](app/legales/privacidad/page.tsx) — hoy el sitio no
  recoge ningún dato: sin cuentas, sin cookies, sin analítica.
- [Términos de uso](app/legales/terminos/page.tsx)

Las dos se actualizan **antes** de agregar cualquier función que toque datos
del usuario.

**El sitio no lleva publicidad**, y no es sólo una promesa: no carga ningún
script de terceros, no pone cookies y no hace una sola petición de red.
