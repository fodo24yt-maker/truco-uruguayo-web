# Truco Uruguayo — aprender y jugar

Una **app para aprender a jugar al truco uruguayo desde cero y jugarlo**, sin
pagar nada y sin registrarse. La idea es esa y no otra: que aprender y jugar
sean la misma cosa, en el mismo lugar.

Se está preparando para **Google Play**, y **la misma app es también una web**:
no hay dos versiones ni dos códigos, hay un código con dos builds.

### 🎴 [Probarla en el navegador → truquito.smmqo08.workers.dev](https://truquito.smmqo08.workers.dev)

> **Estado: en desarrollo, camino a Play Store.** Andan las 8 lecciones, la mesa
> mano a mano contra el bot y la gira por los 19 departamentos. El APK ya se
> compila —en GitHub Actions y también en casa— y se instala en un teléfono por
> USB. Lo que falta para publicar está más abajo, en *Qué falta*.
>
> **La prioridad es el celular.** Que se vea bien en una computadora está bueno,
> pero cuando las dos cosas no entran, manda el teléfono.

## Por qué este proyecto

Si querés aprender truco uruguayo hoy, te chocás con un gran problema:

1. **Casi todo lo que hay en internet es truco argentino.** Las guías, los
   videos, los tutoriales: casi todos se saltean la muestra y las piezas, que
   son justamente el corazón del truco uruguayo. Aprendés otro juego.

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
podés contestarle envido y se resuelve eso primero. Y cuando NO podés —porque
alguien cantó flor, que la anula, o porque el envido ya se jugó— te lo dice, en
vez de que el botón desaparezca sin explicación. La escena cambia con el
departamento: el boliche de noche de Montevideo, la feria de Las Piedras, la
rambla de Rocha, el galpón del centro, el río del litoral y las cuchillas del
norte. Del rival se ve el cuerpo en penumbra y nada más —la cara está en el
medallón de la derecha, de donde salen también las coplas—. Lo que decís vos
sale de TU lado, arriba de tus cartas: cada uno habla desde su silla, incluido
el "acá está mi flor" del final de la mano. **La mesa está medida para el
celular**: no scrollea nunca, en ningún tamaño, y hay una herramienta que lo
verifica en siete pantallas distintas cada vez que se toca algo.
Cada mano arranca repartiendo de a una carta —mano, pie, mano, pie— y recién
cuando terminó se dan vuelta. El mazo tiene la muestra metida abajo, atravesada
y asomando lo justo para verle el número y el palo, y cambia de lado según de
quién sea el reparto: si sos mano te queda a la izquierda, si sos pie a la
derecha.
Con las ayudas prendidas te muestra tu tanto ya calculado y te marca cuáles de
tus cartas son piezas; se apagan cuando querés.
Cómo va la partida se anota a palitos, como en la mesa de verdad: de a cinco,
con el corte de las malas a las buenas. En la compu eso está en una libreta
apoyada sobre la madera; en el celular no entra, así que va arriba de todo en
dos renglones —uno tuyo y otro suyo— con el número al lado.

**La baraja** — cuarenta cartas españolas dibujadas por código, con lo que hace
que una carta se lea como carta y no como un icono: las espadas y los bastos van
**cruzados** —el dos son dos en aspa, el cuatro son dos pares, el cinco dos pares
y uno derecho en el medio—, mientras los oros y las copas van en grilla. Cada
palo lleva tres tonos en vez de uno plano, la sota, el caballo y el rey son gente
dibujada, y el marco se corta según el palo: ninguna vez los oros, una las copas,
dos las espadas y tres los bastos. Eso último es **la pinta**, que es como se
reconoce el palo asomando la carta en el abanico sin abrirla del todo. Hay un
solo componente de carta en todo el sitio, así que las mismas cuarenta están en
las lecciones, en la mesa y en la portada.

**El motor** — las reglas en TypeScript, con 167 tests que las verifican contra
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
La primera vez que se corrió apareció que la escala estaba **dada vuelta**:
Luquita, el primero de la gira, le ganaba a El Turco, el último, el 61% de las
veces. La tabla se había armado suponiendo que "más difícil = canta más, quiere más,
miente más", y resulta que querer con el umbral bajo es pagar apuestas perdidas.
Recalibrada, cada nivel le gana al anterior y el ★5 le gana al ★1 por 63%. Hay
un test que no la deja volver a darse vuelta sin que nadie se entere.

## Qué falta

Para publicar en Play Store:

- La **cuenta de desarrollador** (25 USD, una sola vez) y la ficha de la tienda.
- La **clave de firma** (keystore). Hoy el APK se firma con la clave de
  depuración, que sirve para instalarlo a mano y no para publicarlo. La de
  verdad no se puede perder ni rotar: si se pierde, se pierde la app.
- El **banner de anuncios**, que hoy es un hueco reservado y nada más. Los
  trámites, el consentimiento y qué edad conviene declarar están explicados paso
  por paso en *Publicidad*, más abajo.

Del juego:

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
| `npm run build` | Genera **la web** en `out/` |
| `npm run build:app` | Genera **la app** en `out-app/` (ver abajo) |
| `npm run servir:app` | Sirve `out-app/` como estático, para probar ese build |
| `npm test` | Corre las 167 pruebas del motor del juego |
| `npm run typecheck` | Revisa los tipos sin compilar |

### Los dos builds, y por qué no son el mismo

| | Sale en | Qué tiene distinto |
|---|---|---|
| `npm run build` | `out/` | nada: es la web de siempre |
| `npm run build:app` | `out-app/` | `trailingSlash`, y el zoom bloqueado |

**`trailingSlash` en la app no es un gusto: sin él la app no arranca bien.** El
export normal deja `out/jugar/mesa.html`, y el servidor local de Capacitor busca
`jugar/mesa/index.html`: no lo encuentra, cae a la raíz y la app termina cargando
la portada con la dirección de la mesa. Está en `next.config.ts`, que elige según
`process.env.DESTINO`.

El zoom se bloquea sólo en la app: en una web poder agrandar el texto es
accesibilidad, y adentro de una app el pellizco no agranda nada útil y descoloca
la mesa, que está medida para entrar exacta.

### Mirarla como app

    node herramientas/celular.mjs              una ventana con forma de celular
    node herramientas/celular.mjs --fotos      + las capturas de cada pantalla

    npm run build:app && npm run servir:app
    node herramientas/mirar-app-compilada.mjs  prueba EL BUILD DE LA APP

Lo segundo es lo que encuentra los bugs que `next dev` no puede mostrar: la CSP
de producción —que en desarrollo no se inyecta—, las rutas con barra final y la
recarga en una ruta profunda.

### El APK

Lo compila [`.github/workflows/apk.yml`](.github/workflows/apk.yml) en GitHub
Actions y se baja de la pestaña Actions. También se compila en una máquina con
un JDK y un SDK de Android instalados:

    node herramientas/celular-usb.mjs             vista previa EN VIVO en el celular
    node herramientas/celular-usb.mjs --apk       compila, instala y abre la app
    node herramientas/celular-usb.mjs --compilar  sólo deja el .apk

El `appId` es `uy.trucouruguayo.app`, minSdk 24 y targetSdk 36. **El `appId` y el
origen de la app (`https://localhost`, en `capacitor.config.ts`) no se tocan
nunca**: de ese origen cuelga el `localStorage` con el progreso de la gira, y
cambiarlo se lo borra a todo el que ya jugó.

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
  generar-escena.mjs    Hornea la madera y el fondo de cada ambiente a WebP
  generar-icono.mjs     Hornea el ícono de Android. GENERADO: no se edita a mano
  escena/               El dibujo de esas texturas, en código
  mirar-mesa.mjs        Verifica que la mesa no scrollee en siete tamaños, que
                        la barra no tape tu mano y que no haya NI UN FILTRO en
                        la escena (ver los glitches del 1/9 y del 4/9 en
                        Historial.md: es el bug más caro que tuvo el proyecto)
  mirar-mesa-nueva.mjs  Mide el rectángulo real de cada objeto de la mesa y
                        falla si algo se solapa o se le monta al rival
  mirar-web.mjs         El armazón de app: la barra, el volver y las pantallas
  mirar-rivales.mjs     Los bordes de las siete escenas horneadas
  mirar-app-compilada.mjs  Prueba el build de la app, no el de desarrollo
  celular.mjs           Una ventana con forma de celular
  celular-usb.mjs       Compila, instala y abre la app en un teléfono por USB
  medir-bots.mjs        Enfrenta a los 19 rivales y mide si la gira sube
android/                El proyecto de Android (Capacitor). Los dibujos de
                        `app/src/main/res` los hornea generar-icono.mjs
capacitor.config.ts     appId, origen y ajustes del WebView. NO SE TOCAN
ideas/
  concepto.md           Qué juego queremos hacer
  estetica.md           Cómo se tiene que ver
  diseno-frontend.md    Pantallas, componentes y decisiones de diseño
```

## Decisiones que vale la pena saber

- **Sitio estático.** Se publica en cualquier lado sin servidor, y el juego
  corre entero en el navegador.
- **No le pide nada a nadie.** Sin cuentas, sin analítica, sin rastreadores, sin
  cookies. Las tipografías y las texturas se sirven desde el propio sitio: el
  navegador no habla con ningún tercero.
- **Todo el dibujo es propio y sale de código.** La baraja, el mapa, el rival y
  cada objeto de la mesa son SVG que se dibujan en el navegador; no hay una sola
  imagen de nadie más. **La madera de la mesa y el fondo del ambiente sí son
  imágenes**, pero las dibuja igual nuestro código: las hornea
  [`herramientas/generar-escena.mjs`](herramientas/generar-escena.mjs) con las
  mismas formas y filtros, una sola vez y a 2800px, en vez de rehacerlas en cada
  cuadro. Son dos WebP de ~45 KB por departamento y es lo que permite que la
  mesa tenga nudos, rayones y perspectiva de verdad sin arrastrar un celular.
- **Sin librerías de interfaz.** Next, React y Tailwind, y nada más.
- **La app y la web son el mismo código.** No hay una versión web y una versión
  app: hay dos builds del mismo proyecto, y las diferencias son dos (la barra
  final en las rutas y el zoom bloqueado). Todo lo que se arregla, se arregla
  para las dos.
- **Nada de la escena de la mesa puede llevar un `filter`.** Suena a detalle y
  es el bug más caro que tuvo el proyecto, dos veces: un desenfoque adentro de
  un subárbol que el navegador compone aparte hace que las GPU de teléfono
  devuelvan basura —píxeles blancos sueltos, bandas de rayas—. Las sombras se
  dibujan con degradés y `box-shadow`, que hacen lo mismo sin crear una
  superficie de composición. `mirar-mesa.mjs` falla si vuelve a aparecer uno.
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
están explicadas en el apéndice A del documento. Además hay 167 pruebas
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

## Publicidad

Vale la pena decirlo con precisión, porque este archivo antes prometía otra cosa.

**Hoy no hay publicidad y no hay nada que la cargue.** Ni un script de terceros,
ni una cookie, ni una sola petición de red: el juego corre entero en tu
navegador. Eso se puede comprobar mirando la pestaña de red.

**Lo que sí hay es el lugar reservado.** `components/EspacioAnuncio.tsx` es un
hueco medido —abajo de la mesa, en el pie y abajo de cada lección— y nada más:
un `<div>` con una altura y, si está prendida, una silueta dibujada con CSS.

Está desde ahora por una razón concreta: **la mesa está medida para entrar
exacta en una pantalla que no scrollea nunca**, y un banner que aparece después
le come 50px a las cartas. Con el hueco puesto, `mirar-mesa.mjs` mide la mesa
CON el banner en los siete tamaños y el día que se encienda no se rompe nada.

### Cómo se enciende, y qué significa cada trámite

Lo primero, porque cambia todo lo demás: **con el plugin nativo de Capacitor el
anuncio NO corre adentro del WebView.** Es una vista de Android puesta abajo del
todo. O sea que la CSP no se afloja, la parte web sigue sin pedirle nada a nadie,
y el hueco que ya está reservado se llena por debajo. Si algún día alguien
propone meter AdSense en un `<iframe>`, es exactamente lo contrario y no va.

**1. AdMob.** Es la red de anuncios de Google para apps. Cuenta en
`admob.google.com`, con la misma cuenta de Google que Play Console, y las dos
vinculadas. Se registra la app —se puede antes de publicarla— y salen un **App
ID** (`ca-app-pub-…~…`) y, creando una unidad de tipo *Banner*, un **Ad unit ID**
(`ca-app-pub-…/…`).

**2. "Yo no quiero recolectar datos de nadie."** Y no los vas a recolectar vos:
los recolecta AdMob. Cuando el SDK pide un anuncio manda el identificador de
publicidad del aparato, la IP (de donde sale la ubicación aproximada) y datos del
dispositivo. Eso es justamente lo que se paga. No hay forma de tener anuncios sin
eso, y por eso hay que declararlo.

**3. El formulario de "Seguridad de los datos"** de Play Console es un
cuestionario donde declarás qué recoge la app. Con AdMob adentro se declara
*Identificadores del dispositivo → se recopilan · se comparten con terceros ·
para publicidad*. Declararlo bien no cuesta nada; declararlo mal es de las
razones más comunes por las que bajan una app.

**4. El consentimiento (UMP).** Para quien abra la app en Europa o el Reino
Unido hay que mostrar un cartel de consentimiento ANTES de pedir el primer
anuncio. Google lo da hecho: el SDK de *User Messaging Platform*, que se
configura desde AdMob (Privacidad y mensajes). En Uruguay no aparece nada.

**5. La edad, que es la decisión que más plata mueve.** Play Console pregunta
por el público objetivo:

- Si incluís **menores de 13**, la app entra en *Diseñado para familias*: Google
  obliga a anuncios **no personalizados**, que pagan bastante menos, y hay
  revisión de contenido más estricta.
- El truco, aunque no haya un peso de por medio, suele clasificar **12+** en el
  cuestionario de IARC por "juego de apuestas simulado". Conviene contestarlo
  con la verdad: mentir ahí es lo que hace que te bajen la app después.

**Lo recomendado: público objetivo 13+ y la app marcada como NO dirigida a
niños** (`tagForChildDirectedTreatment = false`). Es lo honesto —una app de truco
es para gente que juega al truco—, mantiene los anuncios personalizados y no te
achica el público. 18+ no aporta nada: te saca gente sin darte un peso más.

**6. Lo que hay que tener escrito**: la política de privacidad (ya existe, en
`/legales/privacidad`) con AdMob mencionado y cargada en Play Console, el
cuestionario de clasificación, el público objetivo y la casilla "contiene
anuncios". La política **se actualiza ANTES de encender nada, no después**.

**7. Dos avisos que valen la cuenta entera.** Se prueba SIEMPRE con las unidades
de prueba que publica AdMob: tocar tus propios anuncios reales es baneo
definitivo y sin apelación. Y AdMob paga recién cuando pasás los **US$100**,
contra una dirección y un formulario de impuestos de Estados Unidos (W-8BEN),
porque el que paga es Google desde allá.

**Cuánto da, en serio.** Un banner en Uruguay anda entre US$0,20 y US$1 por cada
mil veces que se muestra. Vale la pena ponerlo porque cuesta casi nada, no porque
vaya a financiar algo al principio.

## Legales

- [Política de privacidad](app/legales/privacidad/page.tsx) — hoy la app no
  recoge ningún dato: sin cuentas, sin cookies, sin analítica.
- [Términos de uso](app/legales/terminos/page.tsx)

Las dos se actualizan **antes** de agregar cualquier función que toque datos
del usuario.
