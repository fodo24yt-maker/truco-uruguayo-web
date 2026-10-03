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
- **Los anuncios** ya están hechos y andan con los de prueba de Google; falta
  la parte de las consolas (Play y AdMob). La lista exacta está en
  *Publicidad*, más abajo.

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
    node herramientas/mirar-carga.mjs          la pantalla de carga y la mesa entera

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
  mesa-perspectiva.ts   Dónde y de qué tamaño va cada cosa apoyada en la mesa
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
  motas.mjs             Cuenta manchitas claras sueltas en una captura. Su
                        límite está escrito adentro: no distingue basura de un
                        detalle chico del diseño
  bloques.mjs           El que sí distingue. Cuenta bloques de 4x4 de color
                        plano, que es la firma de la compresión de la GPU del
                        teléfono (ver 5/9/2026 en Historial.md)
  laboratorio.mjs       Compara tres formas de dibujar en la grilla de píxeles
                        del celular, a DPR 2, sin tocar un solo archivo
  mirar-web.mjs         El armazón de app: la barra, el volver y las pantallas
  mirar-rivales.mjs     Los bordes de las siete escenas horneadas
  mirar-app-compilada.mjs  Prueba el build de la app, no el de desarrollo
  mirar-carga.mjs       La pantalla de carga de la app, y que la mesa entre
                        con sus imágenes ya listas en el primer cuadro
  celular.mjs           Una ventana con forma de celular
  celular-usb.mjs       Compila, instala y abre la app en un teléfono por USB.
                        `--foto` y `--vigilar` sacan la imagen del framebuffer
                        SIN PÉRDIDA: es la única captura sobre la que vale la
                        pena decidir algo, porque el espejo de pantalla de
                        Windows inventa manchitas que no existen
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
  es el bug más caro que tuvo el proyecto: las manchitas del celular. Las
  sombras se dibujan con degradés y `box-shadow`, que hacen lo mismo sin crear
  una superficie de composición aparte. `mirar-mesa.mjs` falla si vuelve a
  aparecer un filtro en la escena.

  **Qué son esas manchitas, medido el 5/9/2026.** Con la primera foto del
  framebuffer sin pérdida —por USB, no por el espejo de Windows— se midieron y
  tienen una firma que no deja lugar a dudas: 29 de 29 caen en una grilla de
  4×4 píxeles y 28 de 29 son de un color plano. Eso es la **compresión de
  bloques de la GPU del teléfono**, no nuestro dibujo. No se puede arreglar
  desde acá; lo que sí controlamos es **cuántas superficies compuestas le damos
  a comprimir**, y por eso sacar los filtros bajó el bug 7 veces sin tocar una
  sola forma. Se mide con
  [`herramientas/bloques.mjs`](herramientas/bloques.mjs).

- **Un solo diseño de mesa, y se adapta.** Hasta el 5/9/2026 había dos tablas
  de medidas, una para el celular y otra para la compu, y un `matchMedia`
  elegía. Eran el mismo objeto medido en dos ejes: los objetos median en `vh`
  —contra la VENTANA— pero viven adentro de la ESCENA. Ahora la escena es la
  unidad (`container-type: size`) y cada medida es `min(A cqw, B cqh)`: en un
  celular manda el ancho y en una compu el alto. Una sola regla da los dos
  tamaños que antes había que escribir por separado.
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

Desde el 2/10/2026. **La web no tiene publicidad, ni candados**: el código de
los anuncios ni siquiera viaja en el build de la web (`NEXT_PUBLIC_DESTINO`, ver
`lib/plataforma.ts`). Todo esto es sólo la app de Android.

### Qué hay, y qué no

- **Sin banners.** Se sacaron todos: en un juego de cartas molestan y casi no
  pagan. Tampoco hay anuncios al abrir ni al salir de la app.
- **Intersticial** (pantalla completa, unos 5 s, saltable): sólo al ENTRAR a
  una partida —Partida rápida, el "Jugar" de cada parada de la Gira, la
  revancha y el cambio de rival—. Nunca en medio de una partida, nunca en
  Aprender. Con tope: ver las perillas.
- **Video con recompensa** (unos 30 s, lo elige el usuario): desbloquea PARA
  SIEMPRE el anotador, o la Gira nacional (que también se abre acertando los
  doce ejercicios de Aprender). La recompensa se da sólo en el evento de
  recompensa ganada, nunca al cerrar el video.

Cuánto dura cada anuncio y si se puede saltar a los 5 s lo decide AdMob, no la
app.

### Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `lib/anuncios.ts` | **El gestor**: todas las reglas de tiempo y las perillas, arriba del archivo |
| `lib/entrada.ts` | **El único punto de entrada**: `pedirPartida` y `pedirAnotador`. Candado → anuncio → entrar |
| `lib/anuncios-admob.ts` | El único archivo que conoce el plugin de AdMob, y el consentimiento (UMP) |
| `lib/desbloqueos.ts`, `lib/aprendido.ts` | Lo desbloqueado y los ejercicios acertados, en `localStorage`, validados como `progreso.ts` |
| `components/EntradaJuego.tsx` | Los enlaces de jugar y del anotador, que preguntan al portero antes de navegar |
| `components/DialogoDesbloqueo.tsx` | El diálogo "Ver video / Ir a Aprender / Ahora no" |
| `android/app/admob.gradle` | Los IDs: de prueba en debug, de verdad en release, y el chequeo que frena el release |
| `ConfigAnunciosPlugin.java` | Le pasa a la web los IDs que eligió Gradle |

`lib/entradas-unicas.test.ts` lee el código y falla si aparece un camino a la
mesa o al anotador que no pase por `lib/entrada.ts`.

### Las perillas (arriba de `lib/anuncios.ts`)

| Constante | Valor | Qué es |
|---|---|---|
| `MINUTOS_ENTRE_ANUNCIOS` | 3 | Tope entre un anuncio mostrado y el próximo intersticial. Era 6; se bajó a 3 después de probarlo en el teléfono |
| `MINUTOS_SIN_INTERSTICIAL_TRAS_VIDEO` | 7 | Después de un video, ningún intersticial. Tiene que ser mayor que el tope de arriba (un test lo exige) |
| `SEGUNDOS_ESPERA_QUE_APAREZCA` | 3 | Si el anuncio no aparece, el usuario pasa igual |
| `SEGUNDOS_MAXIMOS_CARGA_VIDEO` | 15 | Cuánto dice "Cargando video…" antes de "no disponible" |
| `SEGUNDOS_GRACIA_RECOMPENSA` | 1 | Margen para una recompensa que llegue después del cierre |
| `SEGUNDOS_VOLVER_SIN_CIERRE` | 1,5 | Al volver a la app con un anuncio "abierto" sin aviso de cierre |
| `MINUTOS_VIDA_ANUNCIO` | 55 | Un anuncio cargado hace más se recarga (Google los vence a la hora) |
| `REINTENTOS_CARGA_SEGUNDOS` | 30, 60, 120, 300 | Reintentos cuando una carga falla |
| `MS_TRABA_DOBLE_TOQUE` | 1000 | Dos toques seguidos cuentan como uno |
| `SEGUNDOS_SIN_CARGAR_AL_ENTRAR` | 8 | Después de entrar a una partida (o de cerrarse el anuncio que iba antes), no se carga ningún anuncio: el plugin carga en el hilo principal de Android y hacía tardar la mesa |
| `CLASIFICACION_MAXIMA` | `ParentalGuidance` | Tope de contenido de los anuncios |
| `DIRIGIDA_A_MENORES` | `false` | La app no está dirigida a menores de 13 |

Además: **la primera partida de cada sesión nunca lleva anuncio**, y el reloj
arranca al abrir la app. Los tiempos viven en memoria: al cerrar la app se
reinician.

**El intersticial se carga al abrir la app**, durante la pantalla de carga, y
no al entrar a la primera partida (desde el 3/10/2026; ver abajo *La pantalla
de carga*).

### Los IDs

- **Debug: siempre los de prueba de Google**, escritos en `android/app/admob.gradle`.
- **Release: los de verdad**, en `android/admob.properties`, que **está en el
  `.gitignore` y no sube**. La plantilla es `android/admob.properties.ejemplo`.
- **El release no compila** si los IDs faltan, siguen en `REEMPLAZAR_…`, son los
  de prueba o tienen mal la forma. Se prueba sin tocar el archivo de verdad:
  `./gradlew preReleaseBuild -Padmob.archivo=otro.properties`.
- Para cambiarlos se tocan **tres líneas** de `android/admob.properties`:
  `ADMOB_APP_ID`, `ADMOB_INTERSTICIAL` y `ADMOB_RECOMPENSA`.

Ojo: `./gradlew build` arma también el release, así que en una máquina sin
`admob.properties` falla. El CI y `celular-usb.mjs` hacen sólo `assembleDebug`.

### Cómo se prueba

- `npm test`: las reglas con un reloj de mentira (`lib/anuncios.test.ts`), el
  portero, los desbloqueos y el guardián de las entradas.
- `DESTINO=app npx next dev -p 3100` y `node herramientas/mirar-anuncios.mjs`:
  recorre cada regla en un navegador, con una red de anuncios de mentira y el
  reloj adelantado (`--fotos` saca las capturas). Lo de mentira existe sólo en
  `next dev`: no viaja en ningún build.
- En el teléfono: `node herramientas/celular-usb.mjs --apk`, con los anuncios
  de prueba de Google. **Nunca tocar los anuncios reales propios**: es baneo
  definitivo de la cuenta.

### La pantalla de carga (sólo en la app)

Desde el 3/10/2026. Al abrir la app, después del logo de Android, se ve una
pantalla dibujada por código (`components/PantallaCarga.tsx`): la marca, el
nombre y una barrita. Mientras tanto se precarga lo que la mesa necesita, para
que al tocar "Partida rápida" sólo falte repartir:

- **el código** de la mesa y de la Gira (`router.prefetch`, y se espera a que
  Next lo baje de verdad: `esperarCodigo` en `lib/precarga.ts`);
- **las imágenes** de las mesas probables, bajadas y decodificadas: la del
  rival de la Partida rápida y la de la próxima parada de la Gira. Como mucho
  2 departamentos (~10,5 MB cada uno una vez decodificado; los 19 serían
  ~200 MB);
- **el arranque de AdMob** con la carga del primer intersticial.

Lo que NO se precarga: la mesa, el rival y la mano. Son dibujos de código, no
hay nada que bajar.

| Constante | Dónde | Valor |
|---|---|---|
| `MS_MINIMO_PANTALLA_CARGA` | `components/PantallaCarga.tsx` | 800 |
| `MS_MAXIMO_PANTALLA_CARGA` | `components/PantallaCarga.tsx` | 4000 (y el CSS la esconde a los 6 s aunque no haya JavaScript) |
| `MAX_DEPARTAMENTOS_A_PRECARGAR` | `lib/precarga.ts` | 2 |
| `MAX_DEPARTAMENTOS_EN_MEMORIA` | `lib/precarga.ts` | 3 |
| `MS_TOPE_ESPERA_ESCENA` | `lib/precarga.ts` | 1200 |

Y **la mesa entra entera**: antes de repartir espera a que sus dos imágenes
estén decodificadas (como mucho `MS_TOPE_ESPERA_ESCENA`), también al cambiar de
rival. El mapa de la Gira precarga la escena de una parada apenas abrís su
ficha, y el menú de jugar precarga las probables (en la web es lo único que se
agrega: la web no tiene pantalla de carga).

Se prueba con `npm run build:app`, `npm run servir:app` y
`node herramientas/mirar-carga.mjs`, que mira, entre otras cosas, que el primer
cuadro en que existe la escena ya tenga sus imágenes listas.

### Lo que hay que completar a mano

**En AdMob** (`admob.google.com`):

1. Agregar la app, vincularla a Play cuando esté publicada → **App ID**. ✔ hecho.
2. Dos unidades de anuncio, **Intersticial** y **Recompensado** → sus IDs. ✔ hecho.
   (Los tres ya están en `android/admob.properties`.)
3. **Privacidad y mensajes → Reglamentaciones europeas**: crear y publicar el
   mensaje de consentimiento (GDPR) para la app. Sin eso, en Europa no hay
   formulario y no se pueden pedir anuncios.
4. **Configuración → Dispositivos de prueba**: agregar tu teléfono, así el
   release con IDs reales te muestra anuncios de prueba y no tráfico inválido.
5. **`app-ads.txt`**: AdMob lo pide para verificar la app. Es un archivo en la
   raíz del sitio que figure como "sitio web del desarrollador" en la ficha de
   Play, con una línea: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`
   (el `pub-…` es el número del medio de tus IDs). Se pondría en
   `public/app-ads.txt`. **Es público por diseño**: decidir antes de subirlo.
6. Pagos: datos de pago y el formulario de impuestos de Estados Unidos
   (W-8BEN). AdMob paga recién al pasar los US$100.
7. Opcional: **Controles de bloqueo** → categorías sensibles (por ejemplo,
   apuestas), si no querés esos anuncios en una app de truco.

**En Play Console**:

1. **Contenido de la app → Anuncios**: "Sí, mi app contiene anuncios".
2. **Contenido de la app → ID de publicidad**: declarar que se usa, para
   *publicidad o marketing*. Hace falta porque el SDK agrega el permiso
   `AD_ID`.
3. **Seguridad de los datos**: declarar lo que recoge el SDK de AdMob —verificar
   contra la guía oficial de Google, que es la que manda:
   `developers.google.com/admob/android/privacy/play-data-disclosure`—.
   En resumen: *Ubicación aproximada*, *Identificadores del dispositivo u
   otros*, *Actividad en la app (interacciones)* y *Información y rendimiento
   de la app (registros de fallas, diagnóstico)*; recopilados y compartidos,
   para *publicidad*, *estadísticas* y *prevención de fraude*; cifrados en
   tránsito.
4. **Público objetivo**: 13 años o más, la app **no** dirigida a niños
   (coincide con `DIRIGIDA_A_MENORES = false`).
5. **Clasificación de contenido** (IARC): contestar con la verdad; el truco
   suele salir 12+ por "juego de apuestas simulado".
6. **Política de privacidad**: la URL pública de `/legales/privacidad`, que ya
   nombra a AdMob. **Publicar la web con la política nueva ANTES de repartir
   un APK con anuncios**: la página prometía actualizarse primero.

## Legales

- [Política de privacidad](app/legales/privacidad/page.tsx) — nosotros no
  recogemos ningún dato; en la app de Android, los anuncios de AdMob sí (está
  explicado ahí, con nombre y apellido).
- [Términos de uso](app/legales/terminos/page.tsx)

Las dos se actualizan **antes** de agregar cualquier función que toque datos
del usuario.
