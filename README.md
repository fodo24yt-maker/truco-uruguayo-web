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
al resto), truco/retruco/vale cuatro y pardas. Ambientada en un bar de noche:
mesa de madera en perspectiva, la lámpara colgando y el rival sentado enfrente.
Con las ayudas prendidas te muestra tu tanto ya calculado y te marca cuáles de
tus cartas son piezas; se apagan cuando querés.

**El motor** — las reglas en TypeScript, con 29 tests que las verifican contra
`reglas.txt`, incluida una pasada por fuerza bruta sobre las 40 cartas y todas
las muestras posibles, y 40 partidas de bot contra bot que terminan sin una
sola jugada inválida.

**El bot** — no juega al azar. Evalúa la fuerza de su mano, decide qué cantar
según su tanto y el marcador, y elige la carta más baja que le gane a la tuya
(o la más baja de todas si no te puede ganar). Nunca mira tus cartas: hay un
test que lo verifica.

## Qué falta

- La gira por el país y los 9 rivales con personalidad (está diseñada en
  `ideas/concepto.md`).
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
  jugar/                  la mesa
components/             Las piezas visuales, incluida la baraja en SVG
lib/
  motor/                Las reglas en código, con sus tests
  lecciones/            El contenido de la sección Aprender
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
están explicadas en el apéndice A del documento. Además hay 29 pruebas
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
