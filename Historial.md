# Historial

> Qué se hizo en cada sesión, con fecha. Es para que la próxima sesión arranque
> sabiendo dónde quedó todo, sin tener que reconstruirlo leyendo el código.
>
> **Se escribe al final de cada sesión.** Lo más nuevo va arriba.
>
> Ojo con una cosa al leer entradas viejas: la carpeta de referencias se llamaba
> **`New folder/`** y desde el 31/8/2026 se llama **`DISENO-NIVEL/`**. Las
> entradas anteriores la nombran con el nombre de entonces y se dejan así: esto
> es un registro, no documentación.

---

## 2026-09-01 — El gris de las esquinas era el mismo bug, y los tantos al cerrar la mano

Sesión de pendientes. Santiago eligió tres de la lista (6, 4 y 1) y en el medio
apareció un reporte nuevo en `DISENO-NIVEL/`, que terminó siendo lo más
importante de la pasada.

### 1. "Bug gris en las esquinas" — y el archivo se llamaba SEGUNDAVEZQUEPASA

Y tenía razón: **era el mismo bug de la octava pasada, una capa más abajo.**

Allá se cerró el marco del **fondo** y los siete quedaron en luma 7-10. Pero
abajo del fondo empieza la **madera**, que tiene su propio borde, y ése nunca se
tocó. Medido en el navegador a 1266×841, en la costura donde la madera arranca:

| | antes izq/der | ahora | marco |
|---|---|---|---|
| bar-ciudad | 8 / 7 | 7 / 6 | 10 |
| **sierra** | **20 / 18** | 6 / 6 | 10 |
| **feria** | **21 / 24** | 6 / 7 | 10 |

La causa, en `herramientas/escena/madera.mjs`:

    <stop offset="100%" stop-color="#000" stop-opacity="${deNoche ? 0.88 : 0.62}"/>

`deNoche` otra vez decidiendo DOS cosas: la luz del lugar —que sí depende de si
es un boliche o una feria— y **cuánto cierra el encuadre**, que no depende de
eso. Como `bar-ciudad` es el único `deNoche: true`, a los otros seis la viñeta
les cerraba 0,62 y la madera llegaba clara hasta el borde de la pantalla.

Ahora sale de `cierraElBorde(ambiente)`, derivado de lo clara que es la madera,
con la misma lección que ya estaba escrita para el fondo: **lo que tiene que
quedar igual no es cuánta pintura negra se pone, es el VALOR al que se termina**,
y una mesa clara necesita cerrar más. Con un número plano pasaron seis y `feria`
—la más clara— se quedó en 11; con la pendiente, los siete.

#### Dos horas perdidas por un comentario viejo, y por eso se corrigió

`TablaMesa` decía *"la imagen tiene transparencia arriba a los costados"*. **Es
mentira desde el 31/8**: la quinta pasada horneó el plano a 4700 justamente para
que el borde lejano (×0,62 = 2914) tapara el cuadro de 2800 entero y no quedaran
esquinas. Se buscó el gris en un canal alfa que no existe. El comentario ahora
dice lo que pasa y por qué.

#### La herramienta medía cualquier cosa, y dos veces

`mirar-rivales.mjs` gana la franja de la madera, y costó tres intentos:

1. **Medía el medallón.** Cuelga sobre la esquina de arriba a la derecha: los
   siete daban 62-75, todos "fallando", tapando el defecto de verdad.
2. **Medía la libreta y el mazo.** Están apoyados justo ahí. Ahora se esconden
   `[data-encima]` y `[data-mesa]` antes de medir: lo que se comprueba es la
   textura HORNEADA, no la interfaz que va encima.
3. **La franja era de 60px y promediaba de más.** La del fondo puede ser gruesa
   porque el fondo es parejo; la madera VIENE HACIA ADELANTE y se aclara sola.
   Esos 60px iban de luma 5 en la costura a 16 abajo, el promedio daba 11 y
   hacía fallar una mesa perfecta. Va de 12px: lo que se ve es **la costura**.

**Se verificó que el chequeo sirve**: con el valor viejo puesto a mano, sierra
da 16/15 y FALLA; con el arreglo, 6/6. Un chequeo que no falla cuando tiene que
fallar no es un chequeo.

### 2. Los tantos al cerrar la mano (pendiente 6)

La regla, como la dijo Santiago: si la mano se jugó entera **no se muestra
nada** —las seis cartas están sobre la mesa y el tanto lo cuenta cualquiera—.
Sólo cuando se cortó antes (dos primeras bazas, truco no querido, mazo) y hubo
envido jugado o flor cantada.

- `partida.ts` gana `envidoJugado`. El cálculo **ya estaba** en `responderQuiero`
  y se tiraba a `eventos` como texto; ahora se guarda estructurado.
- `lib/tantos-al-cierre.ts` decide qué se enseña. Es función pura con test, por
  lo mismo que `botonera.ts`: la pantalla no decide reglas del truco.
- **Lo que NO se puede enseñar**, y está escrito ahí: la flor que nadie cantó, y
  el envido que no se quiso. Los dos porque nadie los dijo en voz alta. Con el
  envido querido los dos cantan su número, así que son públicos.
- Va **abajo del medallón**, como se pidió, y **adentro del hueco que el
  `Dialogo` ya tenía reservado**, como tercera forma suya. Colgado como un
  cuarto hijo empujaba la columna contra la libreta. Dura los 2 s que la mesa ya
  quedaba a la vista y se va con el barrido: no hay reloj nuevo.

El test tiene una prueba que parece de más y no lo es: **"y sin embargo se
enseña de verdad"**. Sin ella, las otras tres pasarían igual si la función
devolviera siempre la lista vacía, que es la forma más fácil de "no mostrar de
más".

### 3. La carga (pendiente 1) — el número anotado estaba mal

El `Historial` decía *"532 KB de tipografías es el bulto más grande"*. Eso es lo
que hay **en el disco**: 21 `.woff2`. El navegador **baja 4**, los del
subconjunto latino; los demás van con `unicode-range` y nunca se piden.

Lo que se transfiere de verdad: **139 KB de fuente** y 208 KB de JS gzip, y de
ese JS ~85% es React y el runtime de Next —nuestro código son 23 KB—. Ahí no hay
nada que ganar sin cambiar de framework.

La palanca real era **Caveat: 74,5 KB, más que las otras tres juntas**, usada en
cuatro lugares y todos abajo de `/jugar`. Estaba declarada en `app/layout.tsx`,
colgada del `<html>`, así que se precargaba en TODAS las páginas. Se mudó a
`app/jugar/layout.tsx`:

| | antes | ahora |
|---|---|---|
| portada, Aprender, legales | 139,4 KB | **66,6 KB** |
| mesa y gira | 139,4 KB | 139,4 KB |

**El riesgo era el envoltorio**: ese layout ahora envuelve a `children` en un
`<div>`, y la mesa depende de la cadena de flex para no scrollear. Lleva
`flex min-h-0 flex-1 flex-col` y `mirar-mesa.mjs` lo verifica en los siete
tamaños.

### 4. Un objeto propio por departamento (pendiente 4) — LOS 19

Se hizo primero **uno solo** (el vaso de Montevideo), se mandó la captura y
recién con el permiso se dibujaron los otros dieciocho, como pide `CLAUDE.md`.

- `objetoDe(departamento)` en `lib/ambientes.ts`, al lado de `acentoDe`. La
  regla, y es la única: **dos departamentos del mismo ambiente no pueden llevar
  el mismo objeto**. Entre ambientes distintos sí —nunca se ven juntos— pero
  adentro de "el galpón" (SEIS) y "el litoral" (CINCO) la pantalla ya es
  idéntica, y ahí el objeto es lo único que los separa. Hay test.
- Salen de lo que el departamento ES, no de un adorno: Fray Bentos la lata de
  carne, Salto la naranja, Artigas la amatista, Durazno y Flores se llaman como
  la fruta y la flor, Tacuarembó el sombrero —y ahí hay un chiste con la escena,
  porque el rival no tiene cabeza—.

#### Los datos se mudaron a `lib/objetos.ts`

Estaban en `components/mesa/Objetos.tsx` con los dibujos, y el test no los podía
leer: `node --test` sabe sacarle los tipos a un `.ts` pero **no transformar el
JSX de un `.tsx`**. Quedó mejor de lo que estaba: los datos en `lib/`, la
pintura en `components/`, y `lib/ambientes.ts` ya no importa nada de
`components/`.

#### Tres números por objeto, y ninguno sobra

`PROPORCION` es la forma, `ALTURA` cuánto del alto de la mesa ocupa y `APOYO`
cuánto de su ancho toca la madera. Sin `ALTURA`, una botella y un sombrero
medirían lo mismo de alto y el sombrero saldría del tamaño de una rueda; `APOYO`
es lo que hace que la sombra de contacto de una botella sea chica y la de un
cajón sea todo el ancho.

#### Cinco se redibujaron antes de mostrarlos

Salieron y no se leían: el caracol era **un pan**, la estrella de mar era la
estrella de puntuar cosas, la espuela una pieza de mecánica, la lata un
escenario y la guampa un vaso cónico. Lo que se aprendió es siempre lo mismo:

- **el caracol acostado es un bulto claro con rayas, o sea un pan.** Parado, la
  silueta pasa a ser la torre de vueltas que todo el mundo tiene en la cabeza.
  La forma dice caracol; la textura no alcanza a este tamaño.
- **un bicho no tiene aristas.** La estrella con cinco puntas rectas es un
  icono; con brazos gordos, curvos y picados es un animal.
- **a la guampa se le sacó la yerba verde de adentro**, porque con ella se leía
  un segundo mate y el mate de verdad ya está apoyado del otro lado.

#### Y dos veces se midió mal el lugar

1. **Cuarta vez que un número de la mesa se calcula en papel y sale mal.** A ojo
   daba `u = 0,14` y el objeto se iba de la pantalla (x −53..−6 en 1100×800):
   la perspectiva ABRE el frente y en el canto cercano sólo se ve de `u` 0,20 a
   0,80.
2. **La herramienta medía con la mano ya jugada.** `mirar-mesa-nueva.mjs` mide
   después de tirar dos cartas, y con una carta la mano es más chica y llega más
   abajo: todo entraba. Con la mano de TRES —o sea al empezar cada mano, que es
   la mitad del tiempo— el objeto se metía adentro. **Hasta el vaso cruzaba, y
   había pasado la prueba.** Ahora hay una comprobación aparte que mide los
   cuatro objetos extremos —los dos más anchos y los dos más altos— sin jugar
   una sola carta, en el celular más chico y en la compu más baja.

Y una trampa que conviene tener escrita: **el alto de la escena en el celular
cambia con la mano que te tocó**, porque la fila de la flor y la línea del tanto
aparecen o no. Ajustado al límite, el farol pasaba o fallaba según el reparto.
Por eso el objeto va con margen y no al ras.

### Estado al cerrar
`npm test` **141/141** (8 nuevos) · `tsc --noEmit` limpio · `npm run build` OK ·
`mirar-mesa.mjs` sin scroll en los siete · `mirar-mesa-nueva.mjs` en 0 en las
seis, más los cuatro objetos extremos medidos con la mano de tres cartas · `mirar-web.mjs` en 0, con el cartel de tantos
verificado en celular y PC · `mirar-rivales.mjs` **14 comprobaciones OK** (7 del
fondo y 7 de la madera).

### El repaso de seguridad
No se encontró ninguna vulnerabilidad. Lo que se miró:

- **`envidoJugado` no expone nada nuevo.** Sólo se llena cuando el envido se
  QUISO, y ahí los dos tantos ya se cantaron en voz alta: es el mismo dato que
  ya estaba en `eventos`, estructurado. Hay tests que lo verifican sobre 80
  partidas.
- **Las cartas del rival siguen sin llegar al DOM**: `p.cartas.rival.map((_, i) => …)`
  descarta la carta y usa sólo la cantidad.
- **`objetoDe` se cerró con `Object.hasOwn`.** Indexar un objeto plano con un
  string devuelve también la cadena de prototipos. Hoy no llega nadie de afuera
  —el departamento sale de `PERSONALIDADES`— pero es el agujero que ya mordió a
  este proyecto una vez. **`acentoDe` y `ambienteDe` tienen la misma forma y
  quedaron como estaban**: no se tocaron por estar fuera del pedido, pero
  conviene cerrarlas igual algún día.
- **Los 19 objetos son SVG estáticos**: no reciben ni un dato de la partida ni
  del jugador, así que no hay por dónde colar nada. Y no entra una sola imagen
  de nadie: siguen siendo coordenadas, como todo el resto del dibujo.
- Sin `dangerouslySetInnerHTML`, `innerHTML`, `eval` ni `javascript:`. La CSP
  llega al HTML generado y el sitio no le pide nada a nadie.

### Pendiente

1. Una **copla nueva** en `versos.ts` para "primero va el envido". El botón está
   desde la sexta pasada; falta el verso, con su marca de "sólo cuando hay un
   truco esperando".
2. `deNoche` **todavía controla luz y desgaste a la vez** en `madera.mjs`
   (`deBoliche`, el graffiti y los cercos). Esta pasada le sacó el ENCUADRE, que
   era la mitad que se veía; la del desgaste sigue.
3. Las **constantes de la cámara siguen copiadas a mano** en
   `mesa-perspectiva.ts`: `generar-escena.mjs` las calcula y no las emite.
4. **La barra negra a los costados en PC** no es un bug y queda como está.
5. ~~`FINAL_MESA` si la madera se ve blanda~~ **CERRADO**: Santiago dijo que la
   mesa está bien.

---

## 2026-08-31 (octava pasada) — El marco gris, el celular sin papelito y los botones que faltaban

Tres cosas reportadas jugando. Las tres se diagnosticaron **mirando la web con
Playwright**, y las tres eran distintas de lo que parecían.

### 1. "A los costados de la mesa hay algo gris, como que no se terminó"

**El primer diagnóstico fue equivocado y conviene dejarlo escrito.** Se miró la
captura, se vio la barra negra a los costados —el tope de ancho de la escena, que
en una ventana de 1440 deja 130px de cada lado— y se dio por hecho que era eso.
No era: *"No me refiero a lo negro, fijate bien en las diferencias"*. **La barra
negra está bien y no se tocó.**

Lo gris era otra cosa. Reproduciendo las DOS capturas al MISMO tamaño
(1266×841), para que la única diferencia fuera el departamento:

| franja del borde del fondo | izq | der |
|---|---|---|
| La Pocha · Lavalleja (`sierra`) | luma **14** | **23** |
| Luquita · Montevideo (`bar-ciudad`) | luma **8** | 17 |
| el marco negro de la pantalla | 10 | 10 |

El de Montevideo queda MÁS OSCURO que el marco, así que se funde. El de
Lavalleja queda por encima y encima neutro (R≈G≈B): contra el marco se ve el
escalón, y eso es lo que se lee como "no está terminado".

**No era un problema de niveles.** Las 7 texturas estaban horneadas en la misma
corrida y las dos capturas usaban el mismo diseño (`data-diseno="pc"`). Se
verificó además que los `.webp` de la mesa **no tienen canal alfa**: la hipótesis
de las esquinas transparentes —que fue el bug de la quinta pasada— estaba
descartada.

**La causa: `ambiente.deNoche` decidía dos cosas a la vez.** La LUZ del lugar,
que sí depende de si es un boliche o una plaza, y CUÁNTO CIERRA EL MARCO, que no
depende de nada de eso. Como `bar-ciudad` es el **único de los siete** con
`deNoche: true`, a los otros seis `marco()` les dibujaba respaldos al 0,72 y les
dejaba el cielo pálido llegando hasta el borde mismo.

Es **exactamente la misma trampa** que ya estaba anotada para `madera.mjs`
("`deNoche` controla luz y desgaste a la vez"). Ahí controla luz y **encuadre**.

#### Lo que se hizo

- `marco()` deja de derivar color y opacidad de `deNoche`. La FORMA sigue
  dependiendo del lugar —un boliche tiene sillas y una plaza bancos—; lo que se
  igualó es cuánto tapan.
- **Un cierre lateral nuevo**, en gradiente HORIZONTAL y aparte de la viñeta. La
  razón de que sea horizontal y no radial: de esa imagen **sólo se ve la franja
  de abajo** (2000×750 metidos con `object-cover object-bottom` en ~1180×181, o
  sea el 41% inferior) y cuánto se ve depende de la forma de la ventana. La
  parte más oscura de una viñeta radial —arriba y abajo del todo— es justo la
  que se cae del recorte. Un cierre vertical cae siempre en el mismo lugar.
- El color es `#0d0906`, que es literalmente el `bg-[#0d0906]` con el que la
  mesa pinta lo de afuera: el borde de la imagen y el marco son el mismo negro.

#### El alcance NO es un número fijo, y eso costó dos horneadas

Con un alcance fijo del 15% seis pasaron y **`feria` (Canelones) no**: bajó de
luma 50 a 14, todavía arriba del marco. Su cielo es el más claro de los siete
—celeste sobre crema— y para llegar al mismo VALOR un cielo claro necesita más
cierre que uno oscuro. Lo que tiene que quedar igual no es cuánta pintura negra
se pone: es el valor al que se termina.

Ahora el alcance sale de la claridad del propio `cielo` del ambiente, así que un
ambiente nuevo trae el suyo puesto:

    bar-ciudad 0,06 → 16%     sierra 0,35 → 23%     feria 0,72 → 31%

#### Y un error propio que vale la pena tener anotado

Con el alcance derivado, `feria` se fue a 0,31 y **las dos rampas del gradiente
se cruzaban en el medio**: la cola de la izquierda caía en 0,558 y el espejo de
la derecha arrancaba en 0,442. Los `stop` de un gradiente SVG tienen que ir en
orden creciente y, **cuando no van, el navegador no avisa**: aplasta el que sobra
contra el anterior y la franja transparente del medio desaparece. Medido, el
daño era chico (el centro del fondo perdió 2 puntos de luma), pero el gradiente
dependía de un comportamiento de recorte que nadie prometió. Ahora la cola va en
`COLA` veces el alcance y el alcance tiene techo `0,48 / COLA`, así que por
construcción no se pueden cruzar.

#### Cómo quedó, medido

`mirar-rivales.mjs` gana una comprobación nueva: para un departamento de cada
ambiente, abre la mesa **a 1266×841 y no en el celular** —el defecto sólo existe
donde hay marco negro; en el celular la escena ocupa el ancho entero— y falla si
la franja del borde queda más clara que el marco.

| | antes | ahora |
|---|---|---|
| bar-ciudad | 7 | 7 |
| **feria** | **50** | **10** |
| campo | 13 | 7 |
| sierra | 14 | 7 |
| costa | 24 | 8 |
| litoral | 18 | 8 |
| norte | 18 | 8 |

Contra un marco de 10, los siete. De paso los `.webp` del fondo bajaron un 27%
(de 96 KB a 70 KB los siete juntos): hay menos detalle que codificar en los
bordes. **Los `-mesa.webp` no cambiaron.**

### 2. En el celular la libreta se comía la mesa

Medida a 390×844: **169 de los 390px de ancho**, con la birome llegando al
borde. Decidido con Santiago: **se va sólo del celular**; en la compu se queda,
que es lo que hacen las referencias —`Nivel.png` tiene los cuadraditos arriba Y
el papelito sobre la madera—.

- `DisenoDeMesa.libreta` pasa a admitir `null`, y es `null` y no un campo
  ausente a propósito: los dos diseños tienen que seguir teniendo la misma
  forma, así que sacarla es DECIR que no va.
- **El mate se mudó al hueco.** Los dos números los fijó la medición: calculados
  a mano daban `u 0,74 · v 0,42` y `mirar-mesa-nueva.mjs` los rechazó, porque a
  390×844 la TERCERA baza llegaba a x=284 y el mate empezaba en 282. Dos
  píxeles. Quedó en `0,78 · 0,34`. **Es la tercera vez en este proyecto que un
  número de la mesa se calcula en papel y sale mal.**
- **Un enganche escondido:** `uLibreta` no se usaba sólo para la libreta.
  Decidía además de qué lado caen las tres cartas del reparto. Pasa a mirar
  `uOtro` —el mate—, que es el mismo costado por construcción y existe en los
  dos diseños.

#### El marcador de arriba

`components/mesa/Marcador.tsx` exporta ahora `Palitos` —los cinco trazos, con
color y tamaño por parámetro— y lo usan las dos cosas: la libreta en tinta sobre
papel y medida en `em`, y el marcador de la barra en claro sobre la franja
oscura y medido en píxeles. Duplicarlos sería tener dos formas de contar hasta
cinco.

Va **en la barra de juego**, en el lugar del nombre del ambiente. La barra ya
existía y mide 30px fijos: metido ahí el marcador no le saca ni un píxel a la
mesa, mientras que flotando sobre la escena taparía el fondo o al rival. El
nombre del lugar vuelve sólo de `md:` para arriba.

Tres cosas que se aprendieron acomodándolo, y las tres se midieron:

1. **A 0 a 0 no se entendía nada.** `Palitos` con cantidad 0 no dibuja nada, así
   que una partida recién empezada mostraba `YO │ · ÉL │`: dos etiquetas y las
   rayitas de las malas. Ahora hay un `fantasma`: el cuadrado vacío detrás, con
   los CUATRO lados y no los cinco —el quinto es el cruzado y un aspa de fondo
   en cada casillero ensucia la fila—. Es el ▢ de las referencias. En la libreta
   va apagado: un papel de verdad no viene con los casilleros impresos.
2. **A 320px no entraba.** La fila necesitaba 185px y había 170. Se ajustó
   midiendo `scrollWidth - clientWidth` y no a ojo: casilleros más justos,
   huecos de 1px y **"Yo" en vez de "Vos"**, que además son las etiquetas que ya
   usa la libreta —con "Vos" arriba y "Yo" en el papel parecían tres jugadores—.
3. **En la compu quedaba chico**, y lo dijo Santiago mirando la captura: con
   9×12 clavados, en una barra de 1440 sobraban 434px de hueco. Mismo problema
   que ya tuvo el mazo, pero al revés. Va en `clamp(9px, 1.1vw, 16px)` y no en un
   punto de corte: acá lo que aprieta ES el ancho, porque la barra reparte tres
   cosas en una línea.

### 3. El mapa de la gira no tenía botón de volver — y era un `>` de CSS

El `<header>` de la gira —la flecha, el título y el `n/19`— **existía en el
código y en el DOM**, midiendo 0×0. Lo escondía esta regla de `globals.css`:

    body:has(.mesa-pantalla-completa) header { display: none; }

Sin combinador de hijo, eso esconde **todos** los `<header>` de la página, no
sólo el del sitio. El del sitio es hijo directo de `<body>` y el de la gira está
adentro de `<main>`: con `> header` se separan. Un carácter.

Se aprovechó para que la flecha se ENCUENTRE: era un `←` suelto en un círculo y
ahora se lee como la de la mesa, chevron y el destino escrito ("Jugar"). Y se
agregó `← Inicio` en `/jugar` y `/aprender`, que eran las dos que quedaban sin
volver (`/aprender/[leccion]` y `/legales/*` ya tenían).

### Una herramienta que estaba mintiendo

`mirar-mesa-nueva.mjs` comprobaba tres cosas contra "la libreta". Sacándola del
celular, **las tres pantallas de celular habrían pasado a no comprobar nada de
ese costado y habrían seguido dando 0**, que es la peor forma de romper una
herramienta: la que no se nota. Ahora el objeto que manda es el más alto de ese
costado —libreta en la compu, mate en el celular— y las tres comprobaciones van
contra ése.

De paso se arregló un bug viejo de la tira de la mano: armaba el lienzo con el
alto del PRIMER cuadro y los tres salen de altos distintos, así que `composite`
se plantaba con *"Image to composite must have same dimensions or smaller"*.

### Estado al cerrar
`npm test` **133/133** · `tsc --noEmit` limpio · `npm run build` OK ·
`mirar-mesa.mjs` sin scroll en los siete tamaños · `mirar-mesa-nueva.mjs` en
**0 en las seis**, con el mate midiéndose en celular y la libreta en PC ·
`mirar-web.mjs` en 0 · `mirar-rivales.mjs` con los 7 ambientes cerrando el
marco.

### El repaso de seguridad
No se encontró ninguna vulnerabilidad. Lo que se miró:

- **No entra ni una entrada de usuario nueva.** El `?depto=` sigue pasando por
  `porSlugDeDepartamento` y `ESCENAS[clave]`, con las 7 rutas escritas enteras
  (0 plantillas). Los únicos `document.querySelector` que se agregaron viven
  adentro de un `page.evaluate` de una herramienta, o sea nunca viajan al sitio.
- **El marcador nuevo no sopla nada.** Recibe `p.puntos`, que son los puntos
  cantados en voz alta. Los dorsos del rival se siguen dibujando con
  `p.cartas.rival.map((_, i) => …)`, descartando la carta.
- **El `>` destapa un `<header>` que estaba escondido**, así que se revisó qué
  muestra: el enlace de volver, el título y `ganadas/total`, que ya está dibujado
  en el propio mapa ("0 de 19"). No hay dato nuevo en pantalla.
- La CSP no se tocó, los enlaces externos siguen con `noopener noreferrer`, y no
  hay `dangerouslySetInnerHTML`, `innerHTML`, `eval` ni `javascript:` en todo el
  proyecto.

### Pendiente

1. **La carga es lenta.** Reportado y anotado a pedido, sin tocar. Lo medido,
   para no arrancar de cero: **532 KB de tipografías**
   (`out/_next/static/media`, cuatro familias de Google auto-hospedadas) es el
   bulto más grande y el más fácil de bajar —`Caveat` se usa sólo en la libreta
   y en el marcador—; **804 KB de JS** sin comprimir, 156 KB gzip los tres
   trozos grandes; y **2 WebP por departamento**, que ya se bajan de a uno.
2. **La barra negra a los costados en PC.** No es un bug: es
   `maxWidth: min(1180px, 158vh)` y está puesto a propósito, porque los objetos
   se miden en `vh` y llenar la ventana los deja del mismo tamaño en una escena
   más ancha. Se probó a 1440 y a 1920: a 1920 el mate y la libreta quedan
   pegados a los bordes y el medio es un desierto de madera. Queda como está
   hasta que alguien lo pida.
3. Una **copla nueva** en `versos.ts` para "primero va el envido". El botón ya
   está; falta el verso.
4. Un **objeto propio por departamento**, en el hueco que dejó el descarte.
5. Si la madera se ve poco definida en PC, la palanca es `FINAL_MESA`.
6. Añadir que cuando se canta envido y se juega al igual que la flor, se muestre los tantos al final de la mesa + un "Aqui esta mi envido" o "Aqui esta mi flor"

---

## 2026-08-31 (séptima pasada) — Se vuelve a una sola rama

**Se terminó la rama `diseno-nivel-alfa`. De acá en adelante se trabaja directo
en `main`.**

La rama no la había pedido nadie. La creó una sesión mía el 31/8 a las 00:20:17,
31 segundos antes del primer commit, aplicando la regla por defecto de Claude
Code de "si estás en la rama principal, creá una rama antes de commitear". En un
repo de una sola persona eso no compra nada y cuesta caro: obligó a abrir PR #1,
después PR #2, y a ir a apretar botones en la web de GitHub para cada push.

El "3 atrás / 4 adelante" que mostraba GitHub asustaba pero era mentira: los 3
commits "atrás" eran las versiones con el hash viejo de commits que la rama ya
tenía, secuela de la reescritura de la pasada anterior. Se verificó con
`git diff main origin/main`: sólo borrados, ningún archivo que estuviera en
`main` y no en la rama.

Qué se hizo:

- `git branch -f main diseno-nivel-alfa` — mueve el puntero de `main` al último
  commit del trabajo sin tocar un solo archivo del disco. Se prefirió esto a
  `reset --hard` justamente porque no toca el árbol de trabajo.
- Se agregó a `CLAUDE.md` la sección **"Git: una sola rama, y es `main`"**, que
  anula explícitamente la regla por defecto. Las instrucciones del proyecto
  pisan el comportamiento de fábrica, así que ninguna sesión futura debería
  volver a ramificar.

Con esto también se cierra lo que quedó pendiente de la quinta pasada: al
pushear `main` por la fuerza, los commits viejos con el trailer
`Co-Authored-By: Claude` quedan inalcanzables y Claude desaparece de
Contributors. Se verificó que en lo que se va a pushear el trailer aparece 0
veces.

**Los tags `respaldo/*` ya no existen** (se borraron en la pasada anterior). El
respaldo real mientras tanto es `origin/main`, que sigue teniendo el estado
viejo hasta el force-push. Después del push, el reflog local.

### Pendiente

Correr desde la terminal, en este orden:

1. `git checkout main`
2. commitear este `Historial.md` y el `CLAUDE.md`
3. `git push --force-with-lease origin main`
4. `git push origin --delete diseno-nivel-alfa` — esto **cierra solo el PR #2**,
   no hace falta entrar a la web
5. `git branch -d diseno-nivel-alfa`

---

## 2026-08-31 (sexta pasada) — Jugadas que no se podían hacer, y portada nueva

### El bug: había cantos SIN BOTÓN

Reportado jugando: *"canto envido, ella canta real envido y no le puedo subir"*.
Era cierto, y no era sólo eso.

La barra de cantos estaba escrita como un `if` de dos ramas: si había algo que
contestar, la fila ENTERA se volvía "Quiero / No quiero"; si no, era la fila
normal con envido, truco y mazo. Pero **cuando te cantan algo, contestar no es
lo único que podés hacer**, y todo lo demás vivía en la otra rama:

- te suben el envido y podés subirlo de nuevo;
- te cantan truco y podés **retrucar**;
- te cantan truco en la primera baza sin haber hablado y podés cantar envido,
  que es "el envido va primero" —y que además estaba en la lista de pendientes
  como si fuera una función a escribir, cuando el motor ya la ofrecía—.

No era un detalle de interfaz: **eran jugadas del truco que no se podían hacer.**

### El arreglo, y por qué hay un archivo nuevo

Los botones ahora salen de `lib/botonera.ts`, una función pura sobre lo que
devuelve `accionesPosibles`, con test propio. `contestando` sigue decidiendo la
FORMA de la barra —dos botones grandes, verde y rojo— pero ya no su contenido:
lo que se puede subir aparece en una fila fina arriba, con un "o subí".

`lib/botonera.test.ts` recorre partidas enteras eligiendo acciones **al azar** y
no con el bot, a propósito: el bot juega bien, y jugar bien es no meterse en las
ramas raras. Verifica la invariante **toda acción que el motor ofrece tiene un
botón**, más los cuatro casos concretos.

El test encontró solo un caso legítimo que la primera aserción no contemplaba:
**arriba de la falta envido no hay nada**, así que ahí contestar ES la jugada.
Quedó escrito en el test en vez de en la cabeza de alguien.

### Se levanta la mesa al terminar la mano

Pedido: que las cartas se vayan al mazo, esperando ~2 segundos. Al implementarlo
apareció que **el cartel de fin de mano se montaba APENAS terminaba la mano**,
tapando la pantalla con un velo negro: la última baza —la que decidió todo— no
se llegaba a ver nunca. Sin arreglar eso, barrer la mesa habría sido barrerla
detrás de un telón.

Así que ahora: se cierra la mano → **2 s con la mesa a la vista** → las seis
cartas se van al mazo escalonadas y para el lado del que reparte → recién ahí el
cartel. El viaje va en `translate`/`rotate`/`scale` sueltos y NO en `transform`,
porque el `transform` lo está usando la perspectiva para ubicar cada carta.

### La portada

Era una lección: dos cartas, "el 4 le puede ganar al 1" y tres párrafos sobre la
muestra. Enseñaba bien, pero enseñaba ANTES de que el que entra decidiera nada.
Ahora es una portada: el nombre, una línea y **dos puertas** —Aprender a jugar,
Jugar contra el bot—, ocupando la pantalla, con la pista de que abajo sigue todo
lo que ya estaba. Lo que se sacó no se perdió: la muestra es la primera lección
del camino.

Va en `100svh` y no `100vh` —en un celular descuenta la barra del navegador— y
con `min-h`, para que en una pantalla muy baja la portada crezca en vez de
recortarse.

### La herramienta nueva

`herramientas/mirar-web.mjs`. Las otras dos miran la mesa QUIETA; ésta **juega**,
que es una cosa distinta. Verifica la portada en tres tamaños, que cuando te
suben un canto haya con qué subir, y la secuencia de fin de mano.

Para eso los botones ganaron `data-canto` y la escena `data-fase` y
`data-pendiente`. No es decoración: buscar por texto no servía —"Envido" es el
botón que abre el menú Y el canto que está adentro— y sin `data-fase` la prueba
confundía "está pensando el rival" con "se terminó la mano". Con `data-pendiente`
distingue un bug de la regla: si el rival cantó falta envido, que no haya nada
para subir es correcto.

### Estado al cerrar
`npm test` **133/133** (5 nuevos) · `tsc --noEmit` limpio · `npm run build` OK ·
`mirar-mesa.mjs` en 0 en las siete · `mirar-mesa-nueva.mjs` en 0 en las seis ·
`mirar-web.mjs` en 0, con el caso reportado verificado tres veces en el navegador
(`envido:real-envido → quedan: falta-envido · quiero · no-quiero`).

### El repaso de seguridad, con lo que se miró
No se encontró ninguna vulnerabilidad explotable. Lo que se revisó de verdad:

- **La integridad del juego con los botones nuevos.** `aplicar()` revalida cada
  acción contra `accionesPosibles` y devuelve el estado sin tocar si no es
  legal, así que agregar botones no puede colar una jugada ilegal. El motor es
  la puerta; la barra es sólo una vista.
- **Fuga de las cartas del rival al DOM.** Sigue sin haberla: sus dorsos se
  dibujan con `p.cartas.rival.map((_, i) => …)`, o sea descartando la carta y
  usando sólo la cantidad.
- **Los `data-*` nuevos.** `canto`, `fase`, `pendiente` y `diseno` no llevan nada
  que no esté ya en la pantalla: la cadena de cantos se cantó en voz alta.
- **Las entradas por URL.** `?depto=` pasa por regex + `Map`, y `?rival=` por
  `.find()`. Ninguna indexa un objeto plano, que es el agujero de cadena de
  prototipos que ya mordió a este proyecto una vez.
- **`localStorage`.** `sanear()` valida campo por campo y la regex de los ids
  bloquea `__proto__`.
- **`lib/pantalla.ts`**, que es lo único con código nuevo de plataforma: una
  consulta de medios escrita a mano, sin entrada de usuario.
- Sin `dangerouslySetInnerHTML`, `innerHTML`, `eval` ni `javascript:` en el
  proyecto. La CSP llega al HTML generado y el enlace externo va con
  `rel="noopener noreferrer"`.

### Pendiente
1. **Que Santiago apruebe el horneado** de los 7 ambientes (pasada anterior).
2. Una **copla nueva** en `versos.ts` para "primero va el envido". El botón ya
   está; lo que falta es el verso.
3. Un **objeto propio por departamento**, en el hueco que dejó el descarte.
4. Si la madera se ve poco definida en PC, la palanca es `FINAL_MESA`.
5. `deNoche` controla luz y desgaste a la vez en `madera.mjs`.

---

## 2026-08-31 (quinta pasada) — Higiene del repo público: qué se sube, quién firma

Sesión sin código de la web. Salió de tres preguntas mirando GitHub y las tres
dieron algo distinto de lo que parecía.

### `next-env.d.ts` NO es un archivo de secretos

Se leyó como "hay algo env subido". Son cuatro líneas de referencias de tipos de
TypeScript que genera Next.js, y la doc oficial dice que **se sube**: sin él
`tsc` no conoce los tipos de Next. No existe ningún `.env` en el proyecto, y el
`.gitignore` ya los frena. Queda anotado para no volver a sospechar de él.

### Al `.gitignore` no le faltaba nada

Se cruzó `git ls-files` (lo que git rastrea de verdad) contra
`git status --ignored`. Los 86 archivos versionados son código, textos y los
`.webp` del generador. `DISENO-NIVEL/`, `capturas/`, `borradores/`, `.next/`,
`out/`, `tsconfig.tsbuildinfo` y `herramientas/.cache/` están afuera y
**verificados como ignorados**, no sólo escritos en la regla.

### Claude figuraba como contribuidor: era UN commit

`92a3efd` terminaba con `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
GitHub lee ese trailer, lo resuelve a la cuenta dueña del mail y la suma a
Contributors. Con un solo commit alcanza.

Se reescribió con `git filter-branch --msg-filter` acotado a `a6a3d50..`, para
no cambiarle el hash a los 14 commits anteriores sin necesidad. El filtro corre
con `LC_ALL=C` a propósito: el mensaje tiene acentos y flechas UTF-8 y así `sed`
pasa los bytes sin interpretarlos. Verificado: el árbol quedó idéntico
(`c9bc5df…` antes y después) y el diff de mensajes borra exactamente una línea.

Como el commit estaba en las dos ramas y mergeado por el PR #1, se reescriben
tres: `92a3efd`, `4015596` y el merge `9dad7da`.

**Para el futuro no se tocó el repo**: va en `~/.claude/settings.json`, fuera del
proyecto, con `attribution: { commit: "", pr: "" }`. Ojo que
`includeCoAuthoredBy` **está deprecado**; `attribution` es lo vigente y además
cubre las descripciones de PR.

### El email: el arreglo anterior era un parche por repo

`git config user.email` acá estaba bien (el noreply de GitHub), pero
`--global` seguía siendo el Gmail. O sea que cualquier repo nuevo volvía a
filtrarlo. Se cambió el global al noreply.

Los 7 commits viejos (`1bf4e96` … `a8ac8dd`) mantienen el Gmail: se decidió
**no** reescribirlos, porque cambiaría todos los hashes y rompería las URLs de
los commits viejos. Eso no lo puede tapar el `.gitignore` —está en los metadatos
del commit, no en un archivo—.

### PENDIENTE: falta el force-push

El trabajo está hecho y verificado **en local**. La sesión no tenía credenciales
de GitHub (el `fetch` anda porque el repo es público, pero escribir no), así que
falta correr a mano:

```
git push --force-with-lease origin diseno-nivel-alfa && git push --force-with-lease origin main
```

`--force-with-lease` y no `--force`: aborta si alguien empujó algo desde el
último `fetch`, en vez de pisarlo.

Hay dos tags locales de respaldo, `respaldo/main-antes-limpiar` y
`respaldo/alfa-antes-limpiar`, apuntando al estado publicado de antes. **Se
borran recién cuando el push haya salido bien y GitHub se vea como corresponde**
(`git tag -d`). Hasta entonces son la única forma de volver atrás.

---

## 2026-08-31 (quinta pasada) — El feedback de PC: dos diseños de verdad

Llegó feedback dibujado sobre una captura de computadora (`DISENO-NIVEL/FEDBACK.png`)
con cuatro marcas. **Tres eran la misma causa** y la cuarta era un bug viejo.

### La causa común: `object-cover` encuadra distinto según la forma de la ventana

Las texturas horneadas se colocan con `object-cover`, y eso las recorta de
maneras completamente distintas:

| | celular 390×844 | PC 1180 |
|---|---|---|
| mesa (1400×900) | el **45% del ancho**, centrado | **todo el ancho** |
| fondo (1200×450) | **todo el alto**, a 0,46× | **la mitad de abajo**, a ~1:1 |

Las imágenes se habían compuesto mirando el celular, así que en PC salían mal
tres cosas a la vez:

1. **"Malas texturas al lado de la mesa".** La mesa horneada tenía **las
   esquinas de arriba transparentes**, y no por error: el plano medía 3600 y
   allá al fondo se angosta al 62%, o sea 2232 de un cuadro de 2800, y sobraba
   un ~10% de cada lado donde la madera ya se terminó. En el celular ese pedazo
   cae fuera del recorte y no se ve nunca. En PC se veía, con un color plano
   detrás.
2. **"Blur raro".** El fondo se hornea para verse a 0,46× y en PC se veía casi
   1:1: el mismo desenfoque dejaba de leerse "está lejos" y pasaba a leerse
   "está borroso".
3. **"El mazo es muy chico".** Todo se medía en `vh`: mide los mismos píxeles en
   las dos, pero la escena de PC es tres veces más ancha. El mazo pasaba del
   **22% del ancho de la escena en celular al 7% en PC**.

### Lo que se hizo con eso

- **El plano se hornea a 4700 en vez de 3600.** La cuenta: para que no queden
  esquinas hace falta `ancho × 0,62 ≥ 2800`, o sea ≥ 4516. Con 4700 el borde
  lejano mide 2914 y la madera llega al borde en cualquier pantalla. **La cámara
  NO se tocó**: `PERSPECTIVA` sale del ALTO del plano y de `RATIO_LEJOS`, así
  que `P` y `DESVIO` siguen igual. Lo único que cambió en
  `mesa-perspectiva.ts` es `ANCHO_RELATIVO`.
- **Las tablas pasaron de 5 a 7** (`madera.mjs`). El dibujo plano se estira al
  ancho del plano, así que con las mismas cinco cada tabla se veía un 30% más
  gruesa y la mesa pasaba de tablas a tablones.
- **`FINAL_FONDO` de 1200×450 a 2000×750**, para que en PC el fondo se vea a
  0,59× y no a 1:1.

### Dos diseños de verdad

Se eligió tener **dos juegos de números** en vez de uno que se adapte. Están en
`app/jugar/mesa/page.tsx` como `CELULAR` y `PC`, con los MISMOS campos y uno al
lado del otro: que tengan la misma forma es lo que obliga a que agregar un
objeto sea decidir dónde va en las dos.

**El corte NO es el ancho: es la proporción.** `lib/pantalla.ts` mira
`(min-aspect-ratio: 1/1)`, así que 1280×620 —baja y ancha, el caso duro— entra
por apaisada y no por ancha. La regla del proyecto sigue en pie: nada está atado
a un punto de corte de ancho.

Va con `useSyncExternalStore` y **la instantánea de servidor devuelve `false`**:
el sitio es estático y el celular es el caso difícil, así que si algo falla gana
ese. En una compu el primer cuadro usa el diseño de celular y cambia al hidratar,
adentro de "REPARTIENDO…".

### El bug de la libreta, que era de todas las pantallas

"Se solapa el y yo con puntos". En `Marcador.tsx`, tres elementos ponían `width`
**y** `fontSize` en `em` en el MISMO elemento. `width` en `em` se mide contra el
font-size **propio**, así que `width: 0.096em` con `fontSize: 0.094em` daba
`0,009` del papel: **once veces menos** de lo escrito. El texto se desbordaba y
se montaba sobre los palitos, y el encabezado "MALAS" arrancaba a la izquierda
del margen rojo.

**Es la tercera vez que aparece la misma trampa** en este proyecto (ya estaba
anotada en `Mazo.tsx`). El arreglo es el que ya usaba el archivo: el ancho en el
envoltorio y el tamaño de letra adentro.

### Y el pendiente que estaba anotado

`ALTO_FONDO` bajó de 27 a **22**, o sea menos torso del rival y más mesa. Se hizo
en la misma pasada a propósito: cualquiera de los cambios de arriba obligaba a
re-medir todos los objetos igual, y hacerlo después era repetir la pasada
entera. El riesgo que estaba anotado —que `object-cover` desfasara la
perspectiva horneada— **se apagó solo**: sin esquinas, lo que se ve de la madera
es madera en cualquier recorte.

### Lo que costó, que fue medir

Con `ANCHO_RELATIVO` un 31% mayor, **cada objeto se va un 31% más lejos del
centro**, así que todos los `u` había que buscarlos de nuevo. Tres vueltas de
medición:

1. La libreta cruzaba el canto en las tres de PC (hasta 24px) y las cartas del
   reparto lo cruzaban en las **seis**.
2. Bajadas, aparecieron las **tres bazas abiertas montándose a la libreta**: con
   el plano más ancho las bazas se abren un 31% más y la tercera llegaba al
   papel. Se bajaron las bazas y se juntó el `paso`.
3. En PC hubo además que correr la libreta hacia afuera (`u` 0,74 → 0,79).

`mirar-mesa-nueva.mjs` pasó de tres pantallas a **seis** y ahora verifica además
**qué diseño quedó activo** (`data-diseno`): sin eso, que las seis den 0 no
prueba nada, porque podrían estar todas usando el mismo.

### Estado al cerrar
`npm test` **128/128** · `tsc --noEmit` limpio · `npm run build` OK ·
`mirar-mesa.mjs` en 0 en las siete · `mirar-mesa-nueva.mjs` en **0 en las seis**,
con el diseño correcto en cada una. Márgenes de la libreta al canto: 10 / 11 /
22 px en celular y 20 / 10 / 28 px en PC.

Repaso de seguridad: entra `lib/pantalla.ts`, que sólo lee una consulta de medios
escrita a mano. **No entra ninguna entrada de usuario nueva.** Las rutas de
`lib/escenas.ts` se siguen escribiendo enteras (0 plantillas). Sin
`dangerouslySetInnerHTML` ni `innerHTML` ni `eval` en todo el proyecto.

### Pendiente
1. **Que Santiago apruebe el horneado nuevo.** Se rehornearon los 7 ambientes de
   una; se le mandó la captura de Montevideo y la tira de cuatro. Si algo no va,
   se corrige el generador y se vuelve a correr: los `.webp` son regenerables.
2. Si la madera se ve poco definida en PC, la palanca es `FINAL_MESA`
   (1400×900): con el plano más ancho hay un 30% menos de resolución por tabla.
   Se dejó como está para no engordar los archivos sin que haga falta.
3. **"¡Primero va el envido!"** en el canto y una copla nueva en `versos.ts`.
4. Un **objeto propio por departamento**, en el hueco que dejó el descarte.
5. `deNoche` controla luz y desgaste a la vez en `madera.mjs`.

---

## 2026-08-31 (cuarta pasada) — Se va el segundo mazo y la mano deja de encogerse

Los dos defectos salieron de MIRAR las capturas de la pasada anterior, no de
leer el código. Vale anotarlo porque se repite: las dos herramientas daban 0
fallos con las dos cosas rotas en pantalla.

### Había dos mazos, y el de más era el descarte

Dos pilas de dorsos rojos en la MISMA columna de la izquierda, una arriba de la
otra. La de abajo era el "descarte", apoyado en `uMazo` aunque el comentario de
dos líneas antes dijera que iba del lado contrario.

**Y encima no decía nada.** `descartadas` contaba las cartas de `p.bazas`, o sea
las mismas que están dibujadas más abajo BOCA ARRIBA: mostraba tapado lo que al
lado ya se ve destapado. Se borró entero.

**La decisión que hay detrás, para no deshacerla sin querer:** en una mesa de
verdad las cartas de la baza se levantan. Acá **se quedan a la vista toda la
mano**, a propósito, porque poder ver qué se jugó vale más que la costumbre. Se
levantan recién cuando apretás "Siguiente mano", que es cuando vos decidís que
ya miraste. Está escrito en el lugar donde estaba la pila.

El lado del mazo **ya estaba bien** y no se tocó: va a la izquierda del que es
mano, o sea a tu derecha si el mano es él.

De paso, las tres que le reparten a él salían pegadas y a escuadra, y mientras
duraba el reparto formaban un segundo montoncito allá arriba. Ahora van
separadas y cada una con su giro (`--giro`, que el keyframe respeta hasta el
final en vez de enderezarlas).

Queda un hueco de madera del lado del mazo. Es el lugar natural para el objeto
propio de cada departamento, que ya estaba en la lista.

### La mano: tres cosas distintas que se notaban juntas

La queja fue "cuando se reparte, y cuando te queda una o pocas, se ve mal la
parte de abajo de la mano". Eran tres:

1. **Se encogía a la mitad.** Medía `anchoAbanico + 0,8·W` y el SVG va en
   `h-auto`, así que el ALTO seguía al ancho: de tres cartas a una pasaba de
   3,8 anchos de carta a 1,8. Una mano no se achica cuando tirás una carta:
   los dedos se CIERRAN. Ahora `anchoMano = 1,5·W + 0,745·anchoAbanico`, que
   con tres da exactamente lo de antes y con una se cierra un 37% en vez de un
   49%.
2. **El pulgar se medía contra una carta**, clavado en `1,7·W`, mientras la
   mano se achicaba: con una sola carta quedaba casi tan ancho como la mano
   entera. Pasó a ser `0,48 · anchoMano`, que es la proporción que YA tenía con
   tres.
3. **Estaba a tamaño completo desde el cuadro cero del reparto**, con las
   cartas todavía volando: casi un segundo de bulto pelado. Ahora entra con la
   primera carta (`anim-entra-mano`). Va en `translate` y no en `transform`,
   porque las dos piezas ya usan `transform` para centrarse y animarlo se lo
   comía.

### Lo que costó tres intentos: que se lea como MANO estando desnuda

Redibujar `DedosAtras` con nudillos y valles **no alcanzó**, y la razón es
geométrica: con una sola carta lo único expuesto son los DOS COSTADOS, y los
tres valles están todos detrás de la carta. Los nudillos del medio no se ven
nunca.

Lo que sí funcionó, en este orden:

- **Romper la simetría.** Dos montículos iguales a los costados de una carta se
  leen como un pan partido. Una mano BAJA del índice al meñique: la cresta
  ahora desciende de y=16 a y=42 y el costado derecho se hunde. Eso solo cambió
  más que todo el detalle interior.
- **Devolverla a la penumbra.** `CLARO` estaba en el 30% del degradé y la mano
  salía color crema, más brillante que la madera. Tu mano está DELANTE de la
  mesa, o sea afuera del charco de luz. Ahora el degradé va `MEDIO → HONDO →
  NOCHE` y `CLARO` es sólo el filo de los nudillos, al 26%. **Esto fue lo que
  más rindió de todo, y no era una cuestión de dibujo sino de valor** —igual
  que con los brazos del rival dos pasadas atrás—.

### La herramienta

`mirar-mesa-nueva.mjs` gana la tira de **la mano con 3, 2 y 1 carta**, recortada
alrededor de `.mano-abanico` y no en un `y` fijo (la mano se mide en `vh` y en
320×568 no cae donde cae en 390×844). Se reintenta entera si la mano se termina
al jugar la segunda carta, porque si no la tira sale con dos cuadros.

**Es lo que faltaba mirar y por eso el defecto duró tanto**: todas las capturas
se sacaban con la mano llena, que es justo el caso en el que se ve bien.

### Estado al cerrar
`npm test` **128/128** · `tsc --noEmit` limpio · `npm run build` OK ·
`mirar-mesa.mjs` en 0 en los siete tamaños · `mirar-mesa-nueva.mjs` en 0 en
320×568, 360×600 y 390×844. La libreta no se movió: sigue con 7px al canto y
5px abajo en 320×568.

Repaso de seguridad: se borra código y no se agrega ninguna entrada. Sin
`dangerouslySetInnerHTML` ni `innerHTML` ni `eval` en el proyecto, y el dorso de
las cartas del rival se sigue dibujando SIN la carta.

### Pendiente
1. **MÁS MESA Y MENOS RIVAL** ← pedido explícito, y no se hizo a propósito: se
   anotó para la próxima. Que se le vea menos torso y más mesa, que las cosas se
   separen y quede más lugar para tirar.
   **La palanca es una sola: `ALTO_FONDO`, hoy 27.** `ALTO_RIVAL` cuelga de ahí
   —está escrito para que el canto de la mesa del DIBUJO caiga sobre el de la
   ESCENA—, así que bajándolo el rival se achica y la mesa crece sin despegarlo
   del borde. A ~22 le devuelve unos 5 puntos de alto a la mesa y achica al
   rival casi un 20%.
   **Ojo con dos cosas, y por eso no es una línea:** (a) `TablaMesa` pinta la
   madera horneada con `object-cover object-top`, así que cambiar la proporción
   de la zona de mesa la recorta distinto y la perspectiva horneada se puede
   desfasar de `posicionEnMesa` —si se corre, hay que volver a correr
   `generar-escena.mjs`—; (b) **todos los `v` se vuelven a medir**, la libreta
   primero, que hoy está en su techo real. Recién ahí tiene sentido achicar un
   poco la libreta, que es la otra palanca que se nombró.
2. **"¡Primero va el envido!"** en el canto y una copla nueva en `versos.ts`.
3. Un **objeto propio por departamento** sobre la mesa. Ahora tiene lugar: el
   hueco que dejó el descarte, del lado del mazo.
4. `deNoche` controla luz y desgaste a la vez en `madera.mjs`, y las constantes
   de la cámara están copiadas a mano en `mesa-perspectiva.ts`.

---

## 2026-08-31 (tercera pasada) — Gana el rival sin brazos, y la mesa se reacomoda

### La decisión

De las tres variantes ganó la **B: sin brazos y sin cartas sobre la mesa**. Tiene
las cartas abajo del canto y las mira ahí. **No volver a ponerle antebrazos ni
manos encima de la madera.** Las otras dos, el `?brazos=` y
`mirar-variantes.mjs` se borraron: quedó un dibujo solo, no una opción.

De lo que se aprendió con las descartadas sobrevive lo que sigue siendo cierto:
`mezclar()` devuelve **hex** —si no, no se la puede anidar— y el comentario de
que un poncho no tiene mangas, para que no se rehaga mal el día que se vuelva.

### "Muy cuadrado": tres cosas y ninguna es un brazo

La devolución fue que el objeto se leía como un bloque. El torso iba del cuello
al canto abriéndose parejo, o sea un trapecio.

1. **El quiebre del hombro.** Un hombro no es una diagonal: el deltoides
   redondea (y≈62), el brazo cae y la silueta **se angosta** (y≈112), y recién
   ahí vuelve a abrirse hacia el codo. Ese ir y venir de dos por ciento es toda
   la diferencia entre una persona y una plancha. **El ancho máximo no cambió**:
   sigue siendo `1,08·H` en el canto, que es la cuenta que hace que el rival
   entre en un celular. Se movió el camino, no el destino.
2. **La costura del brazo al costado**, que es literal lo que se pidió. Va en
   **0,78·H y no en 0,9·H**: pegada al contorno se leía un vivo, una cinta
   cosida al borde. Un brazo mide como un cuarto de la espalda, así que la línea
   tiene que caer ahí para que entre ella y el borde haya un BRAZO.
3. **Sombra en el costado**, recortada al torso, para que ese brazo sea un
   volumen redondo delante del pecho y no una raya sobre una plancha.

### Lo que hay que saber para no romperlo

- **El rival se dibuja ANTES de la tabla y su sombra DESPUÉS.** Sin brazos no
  hay nada suyo delante de la mesa, así que el torso baja hasta y=252 y lo tapa
  la madera: es la MESA la que lo corta, que es lo que pasa de verdad. Pero
  entonces la sombra queda tapada también, y sin sombra vuelve a ser una plancha
  pegada al fondo. Por eso `SombraRival` es un componente aparte: existe sólo
  para poder dibujarse del otro lado de la tabla.
- **La libreta está encajada entre dos cosas que empujan en sentidos
  contrarios.** Si sube se le monta al rival; si baja se le meten las bazas. Y
  **no se puede achicar**: se agrandó a propósito porque los puntos no se leían.
  Subió de `v=0,44` a **`v=0,23`**, y como subir ALEJA y alejar ACHICA, se dibuja
  del tamaño que tendría en `v=0,44` (`V_LIBRETA_TAMANO`). Sí, eso le miente un
  5% a la perspectiva, en el único objeto de la mesa que hay que LEER. Vale.
- **El que aprieta a la libreta era el mate**, no las bazas. Subido a 0,18
  quedaba apoyado sobre la esquina del papel. Bajado a 0,48, el margen de abajo
  pasó de 2px a 25px.
- **Las cartas del reparto van corridas al lado contrario de la libreta.**
  Repartidas al medio le caían encima durante todo el reparto.
- **Los `data-mesa` no son decoración**: son el agarre con el que se mide. Mismo
  papel que ya cumplía `.mano-abanico` para `mirar-mesa.mjs`.

### Las dos animaciones

- **El reparto sigue mostrando las SEIS cartas.** Si sólo salieran las tuyas
  parecería que le reparten a nadie. Las de él llegan contra el canto lejano y
  de ahí **bajan desvaneciéndose**, como si se las llevara. Cada una se va
  apenas llega —no las tres juntas al final—, y eso es lo que hace que se lea
  "la recibe y la baja" en vez de "las cartas desaparecieron".
  `@keyframes reparte-y-baja` va con `forwards` y no con `backwards`: acá SÍ hay
  que dejar pegado el último fotograma, que es la carta invisible.
- **La carta tirada YA se animaba.** Lo que faltaba era decirle DE DÓNDE VIENE:
  `--desde-x` y `--desde-y` se quedaban en el valor por defecto y la tuya y la de
  él caían igual, desde arriba y desde ningún lado. Ahora `CartaApoyada` recibe
  de quién es: la tuya sube desde tu mano y la de él baja desde el canto lejano,
  que es donde tiene las cartas.

### `herramientas/mirar-mesa-nueva.mjs`, que es lo que hizo el trabajo

**Los números de arriba NO se eligieron: los fijó la medición.** Cuánto entra no
se puede saber leyendo el código, porque el `clamp` de cada objeto, el alto de la
ventana y la escala en perspectiva se multiplican y no se ven por separado. Dos
veces calculé a mano cuánto podía subir la libreta y las dos me dio mal.

La herramienta saca el **rectángulo de verdad** de cada objeto en el navegador y
falla si algo cruza el canto, si algo se le monta a la libreta —que es lo único
que hay que LEER— o si algo se sale por el costado. Tres cosas que costaron y
que conviene no volver a aprender:

1. **Medía con el cartel de fin de mano encima.** Jugaba dos cartas y a veces la
   mano se terminaba en la segunda. Ahora, si se termina, reparte de nuevo.
2. **Medía con una sola baza puesta**, y las bazas se abren hacia los costados a
   medida que hay más: con una sola en el medio no se toca nada y la medición
   miente. Ahora insiste hasta juntar dos.
3. **El margen de abajo se calculaba contra objetos que no estaban debajo.** Daba
   2px falsos y hacía parecer que no había lugar.

Y filma las dos animaciones en tiras de diez cuadros, que es lo único que muestra
si las cartas de él se van para abajo de verdad.

### Estado al cerrar
`npm test` **128/128** · `tsc --noEmit` limpio · `npm run build` OK ·
`mirar-mesa.mjs` en 0 en los siete tamaños · `mirar-mesa-nueva.mjs` en 0 en
320×568, 360×600 y 390×844, con dos bazas puestas y midiendo el reparto en
vuelo. La libreta queda con **7px al canto y 5px a lo de abajo** en 320×568: es
apretado y es el límite real, no un número cómodo.

Repaso de seguridad: **la superficie bajó**, porque se borró el `?brazos=`. Sin
`dangerouslySetInnerHTML` ni `innerHTML` ni `eval` en todo el proyecto, y el
dorso de las cartas del rival se dibuja SIN la carta, así que no hay dato suyo
en el DOM.

### Pendiente
1. **"¡Primero va el envido!"** en el canto y una copla nueva en `versos.ts`.
2. Un **objeto propio por departamento** sobre la mesa.
3. `deNoche` controla luz y desgaste a la vez en `madera.mjs`, y las constantes
   de la cámara están copiadas a mano en `mesa-perspectiva.ts`.
4. ~~La libreta se solapa con la tercera baza~~ **RESUELTO**, y ahora hay una
   herramienta que falla si vuelve a pasar.

---

## 2026-08-31 (segunda pasada) — Los brazos del rival: tres variantes sin elegir

### Estado: CERRADA. Ganó la B — ver la pasada siguiente

Se miraron las tres detrás de un `?brazos=a|b|c` temporal. Eligió la **sin
brazos**; el parámetro, las otras dos y `mirar-variantes.mjs` se borraron en la
pasada de arriba. Lo que sigue queda como registro del diagnóstico, que es lo
que sirve.

### El diagnóstico, que era lo que faltaba

La queja fue que los brazos "salen de la nada, no parecen conectados al cuerpo".
Leyendo el código el antebrazo parecía estar bien. **Estaba bien dibujado y mal
pintado**: se rellenaba con `url(#rival-manga)`, que era la ropa oscurecida
entre un 24% y un 54%, y sobre madera oscura eso desaparece.

La prueba está en `alfa diseño de nivel/contraste-torsos.png`: **a La Coca, de
delantal rosa, se le ven los brazos; a Luquita, de buzo azul, no.** No es que a
uno le falte el dibujo, es que tiene el mismo valor que la mesa. Cuatro cosas
más, en orden de lo que rindieron:

1. **La manga va MÁS CLARA que el pecho**, no más oscura. Es lo que
   corresponde además: el pecho está parado y de canto a la lámpara, y el
   antebrazo está acostado sobre la mesa mirándola de frente.
2. **Faltaba el puño.** En la referencia lo que hace leer el brazo es la banda
   clara de la camisa entre la manga y la piel. Sin ese corte, manga oscura y
   mano clara se tocan sin transición y la mano parece pegada.
3. **Las manos eran dos óvalos espejo** con tres rayas rectas: sin pulgar y sin
   nudillos se leían dos panes. Ahora son asimétricas, con el pulgar del lado de
   adentro.
4. **El codo aparecía en `y=190`**, o sea adentro del torso y ya casi en el
   canto: nunca salía de un hombro. Se le agregaron dos arcos de tinta del
   hombro al codo —la costura de la manga— que **no ensanchan la silueta**, que
   es la cuenta que no se puede tocar.

### Lo que se aprendió, que es lo que no hay que volver a descubrir

- **LA MUÑECA NO ESCALA CON LA CONTEXTURA. El codo sí.** Las manos estaban en
  `0,52·H`, así que se separaban cuando el rival era más grande. Pero lo que
  sostienen mide siempre lo mismo —tres cartas atadas al alto de la ventana, no
  a la espalda de nadie—, así que al `recio` le quedaban a treinta unidades del
  abanico y los dorsos flotaban solos. Ahora la muñeca es una constante y el
  codo es el que va con la espalda. Es lo que hace que un tipo grande y uno
  chico junten las manos en el mismo lugar, que es lo que pasa de verdad.
- **UN PONCHO NO TIENE MANGAS.** Pintado del color de la prenda, el antebrazo de
  Peralta parecía un poncho con mangas. Cae de los hombros y tapa el brazo hasta
  el codo: lo que sale de abajo y se apoya en la mesa es la manga de la CAMISA.
  En la referencia se ve clarísimo. Vale para `poncho` y para `chal`.
- **`mezclar()` devolvía `rgb(…)` y sólo sabe LEER hex.** Al querer sacar el
  color de la camisa a partir de uno ya mezclado, `parseInt("gb(214 190 170)")`
  dio `NaN` y los brazos salieron negros. **Ahora devuelve hex**: el resultado
  tiene que poder volver a entrar.
- **Sin brazos, el rival tiene que ir DEBAJO de la tabla, y su sombra ENCIMA.**
  Borrar los brazos no alcanza: cortado justo en el canto se lee un recorte de
  cartón apoyado atrás. Metido abajo del canto es la mesa la que lo tapa, que es
  lo que pasa de verdad. Pero entonces la sombra queda tapada también, y sin
  sombra el torso es una plancha de color: por eso existe `SombraRival`, que es
  un componente aparte sólo para poder dibujarla del otro lado de la tabla.
- **Se autoatacó el parámetro nuevo y apareció algo.** `?brazos=` estaba
  resuelto con `{a,b,c}[clave] ?? porDefecto`, que responde por la CADENA DE
  PROTOTIPOS: `?brazos=constructor` devolvía la función `Object` en vez del
  valor por defecto, y lo mismo `__proto__` y `toString`. El
  `Record<string, Brazos>` de TypeScript afirmaba que salía un `Brazos` y era
  mentira; se comprobó corriéndolo. Va en un `Map`, que sólo contesta por lo que
  se le puso. No era explotable —el valor nunca llega al marcado—, pero era un
  valor sin tipo real entrando a código tipado.

### Lo que cuestan B y C, para tenerlo a la vista al elegir

1. **Se pierde cuántas cartas le quedan.** Era el único lugar donde se veía;
   queda deducirlo de las bazas puestas. **Decidido: se acepta.**
2. **Se tapa la parte de abajo de la prenda**: el bolsillo canguro del buzo, el
   fleco del poncho, el chaleco. La prenda es lo que distingue a los 19 desde
   que se le sacó la cabeza. Si gana B o C hay que subir el recorte.
3. **El reparto pierde la mitad**: se ven volar tres cartas en vez de seis.

### La pregunta del celular, contestada con capturas

`herramientas/mirar-variantes.mjs` hace lo que ninguna de las otras dos hacía:
**juega dos cartas antes de disparar**. `mirar-mesa.mjs` y `mirar-rivales.mjs`
sacan la captura al empezar la mano, con la mesa vacía, y la pregunta de si en
el celular se puede jugar sólo se contesta con la mesa usada.

**Sí se puede, y a 320×568.** Tus cartas están atadas al ALTO de la ventana
(`clamp(72px, 15,6vh, 126px)`), no al ancho, así que en la pantalla más chica
siguen midiendo unos 88px y se leen; las jugadas caen en la franja del medio por
`estiloEnMesa` y se achican solas con la profundidad; y la barra de cantos está
en el flujo, así que cuando le crece una fila la escena se achica sola y la mano
nunca queda tapada. Lo único apretado que se vio es que **la carta jugada se
superpone con la línea de ayuda del tanto** en la pantalla más chica. Es de
antes y no se tocó.

### Estado al cerrar
`npm test` **128/128** · `tsc --noEmit` limpio · `npm run build` OK ·
`mirar-mesa.mjs` en 0 en los siete tamaños · 24 capturas en
`capturas/variantes/`.

### Pendiente
0. **Elegir una variante** y borrar las otras dos, el `?brazos=` y
   `mirar-variantes.mjs`.
1. **"¡Primero va el envido!"** en el canto y una copla nueva en `versos.ts`.
2. Un **objeto propio por departamento** sobre la mesa.
3. `deNoche` controla luz y desgaste a la vez en `madera.mjs`, y las constantes
   de la cámara están copiadas a mano en `mesa-perspectiva.ts`.
4. La libreta puede solaparse con la tercera baza cuando el mazo cae de ese lado.

---

## 2026-08-31 — El rival deja de ser uno solo y el lugar se nota

### Lo primero: se descartó la pasada anterior

El laboratorio del 30 —plaza de día, madera nueva, manos con dedos— **se
descartó**. El veredicto: "hay un error de diseño bastante grande, no está tan
bueno, y por ahí no se llega a algo pulido". La base vuelve a ser el prototipo
de `croquis3008`, o sea lo que ya había.

**Lo único que se rescató fue el recorte**: que al rival la cara no le entre en
el encuadre. Eso el usuario sí lo quiere.

`borradores/nivel/` queda parado donde está, ignorado por git. No se borró:
adentro está el dibujo de la plaza y las manos por si algún día se retoma.

### Lo que se hizo

**1. Al rival se le fue la cabeza.** Se le ve el torso y los brazos apoyados, y
de los hombros para arriba está fuera del cuadro. Se borraron del cuerpo la
cabeza, el pelo, la melena y la función `Sombrero()` entera. `Cara.tsx` —el
medallón— no se tocó: ahí siguen viviendo el sombrero, la melena y los rasgos.

Esto cierra la discusión que se dio cuatro veces. No es que ahora la cabeza esté
mejor dibujada: es que **no hay dónde ponerla**.

**2. La ropa pasó a ser lo que distingue a cada uno.** `lib/caras.ts` gana tres
campos —`contextura`, `prenda` y `detalle`— y `RivalSentado` deriva de ahí la
geometría en vez de tenerla escrita a mano. Diez prendas y el eje que las
ordena es el viaje de la gira, **de la city para adentro**:

| | |
|---|---|
| Luquita (La Blanqueada) | buzo con capucha, cordones y bolsillo canguro; `menudo` |
| La Porota (feria de Las Piedras) | delantal con tirantes y pañuelo |
| El Pescador (La Paloma) | suéter tejido con **el anzuelo en el bolsillo** |
| Don Aparicio y Don Ramón | chaleco sobre camisa y pañuelo al cuello |
| Peralta y El Turco (el norte) | poncho con cenefa de rombos y fleco |

**3. El acento por departamento.** `acentoDe()` estaba escrito en
`lib/ambientes.ts`, documentado, **y no lo llamaba nadie**. Ahora va como capa
sobre el fondo (0,22) y sobre la madera (0,10). Salto y Paysandú comparten el
ambiente del litoral y dejaron de ser la misma pantalla. **No hubo que rehornear
ni una imagen.**

**4. La libreta se lee.** De `clamp(104px, 21vh, 184px)` a
`clamp(122px, 25vh, 204px)`, y las fracciones de adentro subieron un 10-15%.
Agrandar sólo el papel no alcanzaba: los palitos son fracciones del mismo `em`
y crecían en la misma proporción.

**5. Los nombres nuevos, por fin.** La tabla de `ideas/rediseno-nivel.md` venía
decidida desde el 29 y sin aplicar. Cambian diez de los diecinueve: Luki pasa a
**Luquita**, La Coca a **La Porota**, El Rulo a **El Gallego**, La Nelly a **La
Pocha**, El Trinitario a **El Rengo**, La Rosa a **La China**, El Fray a
**Cacho**, El Piedra a **Pájaro**, Joao a **El Chicharra** y El Melo a **El
Turco**.

**Los `id` no se tocaron**, que es lo único que importaba: son la clave con la
que `lib/progreso.ts` guarda las victorias y cambiarlos le borra el progreso a
quien ya jugó. Verificado uno por uno.

De las tres descripciones que el plan marcaba como "chistes con el nombre
viejo", **sólo una lo era**: la de `el-piedra` ("duro como las amatistas de
allá") jugaba con *Piedra*. Reescrita manteniendo Bella Unión. Las otras dos
—`el-fray` y `el-trinitario`— no nombraban nada: el chiste estaba en el nombre y
el texto seguía andando.

Los nombres viejos estaban además en prosa en ocho archivos —README, el
comentario de la calibración, `medir-bots.mjs`, `Territorio.tsx`, `lectura.ts` y
tres tests—. Todos actualizados. **Ningún test compara contra el nombre**: todos
buscan por `id`, así que el cambio no rompió nada (128/128).

**6. `herramientas/mirar-rivales.mjs`.** Abre la mesa con cada `?depto=` y saca
la captura. "Mirar los 19" venía de pendiente hacía tres sesiones y nunca se
hacía porque a mano son diecinueve idas y vueltas.

### Lo que se aprendió, que es lo que no hay que volver a descubrir

- **La proporción del torso es una cuenta, no un gusto.** El canto de la mesa
  está al 27% del alto, así que el torso visible mide 0,27·alto y su ancho sale
  de multiplicarlo por la proporción del dibujo. Con 1,66 tapaba el 85% del
  ancho de un celular. El cuadro quedó en 400×300 con el canto en y=200, o sea
  **1,30**, y el ambiente se ve por los costados.
- **La figura se ancla al canto de la mesa, no a un `bottom`.** Como la cabeza
  queda afuera, tiene que tocar el borde de arriba SIEMPRE: si le queda un hueco
  arriba deja de leerse "cortado por el marco" y pasa a leerse "torso flotando
  sin cabeza", que es peor. Por eso se mide en % del ALTO y el ancho lo pone
  `aspect-ratio`.
- **No hay un "ancho relativo" que escale la figura entera, y es a propósito**:
  escalarla movería la línea del canto y el rival se despegaría del borde. Lo
  que cambia con la contextura es cuánto del cuadro ocupa el cuerpo (56%, 65%,
  75%).
- **La ropa va ENCIMA del brazo.** Dibujada debajo, la manga y la prenda
  quedaban del mismo valor y el brazo desaparecía dentro del torso.
- **El brazo de arriba no se dibuja.** Está detrás de la ropa igual. Lo que hay
  que ver es el ANTEBRAZO sobre la madera, del codo a la muñeca y angostándose.
- **Los cuadros no se pueden dibujar con el color de la ropa.** Con `telaHonda`,
  los rivales de ropa marrón no mostraban un solo cuadro: la línea y la tela
  eran el mismo valor. Van con dos trazos fijos, uno oscuro y uno claro.
- **El cuello abierto era una cuña pálida enorme.** En la tira de los 19, la
  mitad tenía la misma mancha clara en el pecho y eso los hacía parecidos. Ahora
  va chico y con dos puntas de cuello.

### Estado al cerrar
`npm test` **128/128** · `tsc --noEmit` limpio · `npm run build` OK ·
`mirar-mesa.mjs` sin scroll y sin tapar la mano en los siete tamaños ·
los 19 mirados de verdad, por primera vez.

### Pendiente
1. **"¡Primero va el envido!"** en el canto y una copla nueva en `versos.ts`.
2. Un **objeto propio por departamento** sobre la mesa. El acento de color ya
   los separa, pero un objeto lo diría más fuerte.
3. Del laboratorio descartado, dos cosas que siguen siendo ciertas para cuando
   se vuelva a hornear: **`deNoche` controla luz y desgaste a la vez** en
   `madera.mjs` —por eso una mesa de día no puede tener graffiti— y **las
   constantes de la cámara están copiadas a mano** en `mesa-perspectiva.ts`
   (verificado: `0,62 × 3397 × sen 58° / 0,38 = 4700` y `3397 × sen 58° = 2881`).
4. La libreta puede solaparse con la tercera baza cuando el mazo cae de ese
   lado. Viene de antes; agrandarla no lo empeoró pero tampoco lo arregló.

---

## 2026-08-30 (tercera pasada) — Laboratorio: el rival sin cabeza y la plaza

### Lo que se decidió antes de dibujar nada

Se evaluó que el usuario dibujara la lámina a mano y el código sólo pusiera las
cartas encima. **Se descartó**: no va a pasar capas. El dibujo lo hace el
código, y la vara es `DISENO-NIVEL/Screenshot 2026-08-30 222923.png`
(entonces `New folder/`).

Cuatro decisiones tomadas con el usuario:

1. **Montevideo pasa a ser una plaza de día.** La luz de día es la mitad de por
   qué la referencia se lee; la penumbra tapaba trabajo ya hecho. El boliche de
   noche no se tira: se reasigna a Cerro Largo, que es la última parada.
2. **El rival va cortado por el marco, sin cabeza.** Se ve del pecho para abajo.
   Esto **deroga** la nota de `ideas/rediseno-nivel.md` sobre darle volumen a la
   figura entera: ya no hay figura entera.
3. Dos versiones de encuadre, celular y PC.
4. Se prueban las dos formas de marcador y se comparan.

### Todo esto se hizo SIN TOCAR EL PROYECTO

`borradores/nivel/` (ignorado por git) con cuatro módulos: `persona.mjs`,
`plaza.mjs`, `manos.mjs`, `hornear.mjs`, y `mirar.mjs`, que **abre la mesa de
verdad con Playwright y le cambia las capas en el DOM en caliente**. Un HTML
suelto habría mentido en las tres cosas que más importan —las cartas serían
dibujos, la barra de cantos no crecería y el recorte responsive no sería el
real—, que es de donde salieron los tres bugs de distribución más caros.

Al terminar, `git status` quedó idéntico al del arranque.

### Lo que se aprendió dibujando

- **El rival era un cono.** Un poncho se QUIEBRA sobre el hombro y de ahí cae
  casi a plomo. Sin ese quiebre no hay hombro y se lee un vestido.
- **Era demasiado ancho para lo poco que se veía de él.** La cuenta: el canto de
  la mesa está al 27% del alto, así que el torso visible mide 0,27·alto y su
  ancho sale de multiplicarlo por la proporción del dibujo. Con 1,66 daba el 85%
  del ancho de un celular; la referencia está en el 56%. **Se arregla mostrando
  MÁS torso, no achicándolo**: subiendo el corte hasta el cuello de la camisa la
  proporción baja a 1,30 y la plaza vuelve a verse por los costados.
- **El fondo hay que ponerlo donde se ve.** El celular ve el alto completo pero
  sólo el 72% del ancho del medio; la computadora ve todo el ancho pero sólo de
  y≈468 para abajo. Y encima el rival tapa el medio. Los bancos y la fuente van
  en el cruce de esas tres, no repartidos parejo.
- **La junta entre tablas se dibuja bien pero desaparece.** `tablas()` la traza
  nítida de 1,9px sobre un plano de 2400 que después se inclina y se baja a
  1400: queda en menos de un píxel. Subida a 7px, la mesa vuelve a tener tablas.
- **Las manos son lo más difícil, como estaba previsto.** Tres intentos: dos
  manos separadas en las puntas (dos panes en las esquinas), juntas y bajas (un
  pretzel), y recién con **dedos por delante de la carta del costado** se leyeron
  como manos. Es el detalle que tiene la referencia y que no tenía ninguna de
  las versiones anteriores.

### Dos cosas que hay que arreglar EN EL PROYECTO cuando esto se apruebe

1. **`deNoche` controla dos cosas a la vez** en `madera.mjs`: cuánta luz y
   cuánto desgaste. Por eso una mesa de día no puede tener graffiti. Hay que
   separar `deNoche` de `desgaste`; el comentario de `maderaPlana` ya dice que
   debería ser así. En el laboratorio se compensó con la paleta y con reemplazos
   sobre el SVG generado.
2. **Las constantes de la cámara están copiadas a mano.** Se verificó la cuenta:
   `0,62 × 3397 × sen(58°) / 0,38 = 4700` y `3397 × sen(58°) = 2881`, que son
   exactamente el `P` y el `DESVIO` de `mesa-perspectiva.ts`. Coinciden hoy, y
   hay un comentario avisando que si alguien toca la inclinación hay que
   acordarse de cambiarlos. **El generador tiene que emitirlos.**

### Presupuesto de peso
130 KB por departamento (mesa 68 + fondo 15 + rival 47) más 26 KB de manos, que
se comparten entre los 19. Está por encima de los ~110 KB que fijaba el plan:
hay que bajar resolución antes que sacar detalle.

### Estado
**Esperando decisión sobre las variantes.** No se aplicó nada al proyecto.

---

## 2026-08-30 (segunda pasada) — Dibujar con línea en vez de manchar

La primera pasada quedó aprobada a medias: "mejoró un poco, aunque hay que
mejorar algunos detalles", con la advertencia de que era el último intento antes
de pasar a hacerlo todo con imágenes de IA. Se miró la referencia que faltaba
—`nivel2.png`, la generada con IA— y se sacó una captura de la web para ponerlas
al lado.

### El diagnóstico que explica casi todo

> **La referencia es un DIBUJO con línea de tinta. Lo que había imitaba una foto.**

El desenfoque borra justo la información que hace que algo se lea como lo que
es. Un nudo desenfocado no es un nudo, es una quemadura. Una cabeza oscura y
blanda no es una cabeza, es un fantasma. Y la línea es donde el SVG gana; el
fotorrealismo es donde pierde. **Decidido con el usuario: se pasa a dibujo con
tinta.**

### "Las cosas raras en la mesa": qué eran

Tres números, todos en `herramientas/escena/madera.mjs`:

1. **`manchas()` pintaba borrones de hasta 300px de radio** con un desenfoque de
   34, sobre una mesa de 2400 de ancho. Un cuarto de la mesa, sin borde y sin
   forma: no se leía como una mancha de algo, se leía como que la imagen está
   sucia. Ahora van de 40 a 110 y con un desenfoque de 11.
2. **Los nudos se estiraban hasta 238px** (`r` 82 × `estira` 2,9) y el abollado
   de 15 les borraba los anillos. Ahora `r` 24-50, estirado 1,25-1,75, anillos
   de trazo nítido con contorno, y abollado 8.
3. **Los cercos de vaso iban gordos y tenues.** Un vaso mide ocho centímetros:
   ahora son de 50 a 70 de radio, con el trazo fino y oscuro. Lo que hace leer
   un anillo es el filo, no la mancha.

Y los garabatos eran bucles al azar —se leían como un resorte—. Ahora son
trazos angulosos de ancho parejo, con picos de altura distinta para que no
salgan como una sierra regular. **Siguen sin deletrear nada**, a propósito.

### El rival: sin cara, pero con cuerpo

Se probó darle la cara del medallón. **El usuario lo descartó**: quiere que se
le vea el torso y parte del cuerpo, sin mucho detalle y algo desenfocado, pero
que se lea que hay una persona. Así que la cara sigue viviendo en el medallón.

Lo que estaba mal **no era la falta de cara, era la falta de volumen**. Lo que
lo arregló, en orden de cuánto rindió:

1. **El contorno de tinta.** El torso y los brazos eran del mismo azul y se
   fundían en una mancha con una cabeza arriba. Separar por valor no alcanza,
   porque el desenfoque se come justamente las diferencias de valor. La LÍNEA
   sobrevive: desenfocada se vuelve una banda oscura, y una banda oscura sigue
   separando el brazo del pecho.
2. **Había un agujero en el pecho.** El torso terminaba en y=172 y los brazos
   seguían hasta 219, así que entre medio se veía la mesa a través de él. El
   canto de la mesa le cruza el recuadro cerca de y≈184, no en 172.
3. Hombros que **caen** desde el cuello (antes eran horizontales: parecía una
   campana), saco con solapas, y el torso más angosto abajo que los brazos.
4. La cabeza dejó de ser una bola: era un problema de **valor**, no de tamaño.
   El pelo casi negro y la cara terminando en negro la dejaban en un solo tono
   contra un torso claro. Se juntaron los valores, se le agregó cuello, orejas y
   el filo de la lámpara arriba.
5. Las manos se corrieron **hacia afuera**: estaban justo debajo de sus cartas,
   que se dibujan encima, y quedaban tapadas enteras.

### Lo demás

- **El mate**, de `clamp(34px, 7.2vh, 72px)` a `clamp(54px, 11vh, 104px)`, y
  redibujado con contorno: era una manchita marrón sobre una mesa marrón.
- **La libreta** salía chica y en el centro del borde lejano, o sea encima del
  pecho del rival. Ahora va al costado, del lado libre del mazo, y **en `em`**
  para que siga al alto de la ventana (mismo patrón que `Mazo.tsx`; con
  `scale(clamp(…vh…))` no anda: es CSS inválido).
- **El fondo del boliche** tiene copas colgadas, espejo con marco, mostrador
  barnizado y parroquianos. Ojo: el fondo se recorta DISTINTO en cada pantalla
  —el celular ve el alto completo, la computadora sólo la mitad de abajo—, así
  que lo que tiene que verse siempre va en la franja y ≈ 430..760.
- **El encuadre.** El tope de ancho era 920px y en una ventana de 1280 dejaba
  360px en dos barras negras; al lado de la referencia era la diferencia más
  grande que quedaba. Pero llenar la ventana entera es PEOR: los objetos se
  miden en `vh`, así que al crecer sólo el ancho todo se ve más chico. Quedó en
  1180px, y de paso las cartas crecieron de `13.4vh` a `15.6vh`.

### Estado al cerrar
`npm test` **128/128** · `tsc --noEmit` limpio · `npm run build` OK · sin scroll
y sin que la barra tape la mano en los siete tamaños · 45 KB los dos WebP.

### Pendiente
1. **Mirar los otros 6 ambientes.** Sólo se revisó Montevideo, otra vez. El
   detalle del fondo nuevo es sólo del boliche (`deNoche`): a los seis de día
   les falta el equivalente.
2. Los **nombres nuevos** de los rivales (tabla en `ideas/rediseno-nivel.md`).
3. **"¡Primero va el envido!"** en el canto y una copla nueva en `versos.ts`.
4. Mirar los 19 departamentos.

---

## 2026-08-30 — La mesa deja de ser una interfaz y pasa a ser una escena

### El cambio de fondo: las texturas se HORNEAN

Lo que frenaba al croquis no era el dibujo, era el presupuesto. Todo lo que
separa una interfaz de una foto —madera con nudos y rayones, tres capas de
profundidad, perspectiva de verdad— son decenas de filtros SVG sobre la pantalla
entera, y eso en vivo arrastra cualquier celular.

Ahora se dibujan **una sola vez**, con `herramientas/generar-escena.mjs`:

1. `escena/madera.mjs` arma la tabla PLANA en SVG (vetas en dos frecuencias con
   ondulación, juntas entre tablas con bisel, 6 nudos con anillos, 30 rayones,
   manchas, cercos de vaso, garabatos de marcador, tono distinto por tabla).
2. **Chromium la inclina** con `perspective` + `rotateX(58°)`. Es una
   transformación PROYECTIVA de verdad: la veta converge sola. `sharp` no puede
   —su `affine` es afín, no proyectiva— y escribir el SVG ya torcido obligaría a
   deformar a mano cada nudo. Por eso el horneado pasa por un navegador.
3. `sharp` baja de 2800px a 1400px con Lanczos. Ese sobremuestreo 2× es lo que
   da el grano.

Sale a `public/escenas/*.webp` y a `lib/escenas.ts` (generado). **368 KB los 14
archivos**, y el navegador baja sólo los 2 del departamento que jugás (~45 KB).

Sigue siendo arte nuestro: lo dibuja nuestro código, igual que `generar-mapa.mjs`
dibuja el mapa. Se corrigieron `README.md` y `CLAUDE.md`, que decían "no hay ni
una imagen en la web".

### Lo demás que se hizo

- **Tu mano sosteniendo las cartas** (`components/mesa/Manos.tsx`). Va en DOS
  piezas —`DedosAtras` debajo del abanico, `PulgarAdelante` encima— porque las
  cartas van ENTRE los dedos. Es lo que más acerca la pantalla a la referencia.
- **`lib/mesa-perspectiva.ts`**: `posicionEnMesa(u, v)` ubica cada objeto en el
  plano y le da SU escala. Que las cartas del rival salgan más chicas que las
  tuyas dejó de ser un número a mano.
- **El rival dejó de ser una silueta flotando**: tiene hombros con punta, cuello
  de camisa, pelo y los antebrazos apoyados en la madera con su sombra. El torso
  termina en el canto: está sentado DETRÁS de la mesa. **Sigue sin cara.**
- **La libreta** ahora es papel rayado apoyado, con birome y esquina doblada.
- **`components/mesa/Sombra.tsx`**: cada objeto lleva DOS sombras, la de
  contacto y la proyectada. Con una sola, los objetos flotan.
- **Barra de juego fina arriba** (30px) en vez de la del sitio (76px). 46px más
  de cartas en celular.
- **Barra de cantos al estilo de la referencia** (texto con separadores), salvo
  cuando hay que contestar: ahí pasa a dos botones sólidos verde/rojo, porque
  "quiero" y "no quiero" se contestan bajo presión.
- Se agregó el **descarte** y se sacaron las ranuras vacías, que eran medio
  celular de andamiaje visible.

### Tres bugs que sólo se vieron mirando la web

1. **`transform: scale(clamp(0.72, 0.132vh, 1.22))` es CSS INVÁLIDO** y el
   navegador tiraba la regla entera sin avisar: `scale()` quiere un número y
   `clamp()` con un `vh` adentro devuelve un largo. **El mazo nunca escaló con
   el alto de la ventana.** Estaba así desde antes. Arreglado con unidades `em`
   (`Mazo.tsx`), que sí admiten `clamp(…vh…)` en `font-size`.
2. **Las cartas se ponían translúcidas cuando no era tu turno** (`opacity-70`
   por carta) y a través del papel se veía el dorso de tu propia mano. Ahora se
   apaga la mano ENTERA como un objeto solo.
3. **Las bazas se centraban contando la baza vacía** que el motor ya deja
   abierta, así que el par quedaba corrido media posición a la izquierda.

### El alto de la barra ya no se calcula

Antes se estimaba (`filas × 64 + …`) para reservarle un `padding` a la mesa, y
había que mantener el número a mano. Ahora la barra está DENTRO del flujo como
última hermana y la escena es `flex-1 min-h-0`: cuando la barra crece, la escena
se achica sola. La invariante es la misma y ya no depende de acertar un número.

Verificado con `herramientas/mirar-mesa.mjs` (nuevo): **sin scroll y sin que la barra tape la mano** en
390×844, 360×640, 360×600, **320×568**, 1100×800, 1280×620 y 1440×900, en los
estados normal, con flor cantable y con el menú de envido abierto.

### Seguridad

- **La ruta de la imagen nunca se arma pegando texto.** El `?depto=` pasa por la
  lista blanca de `porSlugDeDepartamento`, después por dos `Record` fijos, y
  termina en `ESCENAS[clave]`, cuyos 14 valores están escritos enteros.
- Sus cartas se siguen dibujando con `<Carta oculta />` sin pasarles la carta:
  sólo se usa cuántas son.
- La CSP no se tocó: `img-src 'self' data:` ya cubría el propio dominio.

### Estado al cerrar
`npm test` **128/128** · `tsc --noEmit` limpio · `npm run build` OK · sin scroll
en siete tamaños.

### Pendiente
1. **Mirar los otros 6 ambientes.** Están horneados con la misma receta para que
   ningún departamento se quede sin mesa, pero **sólo se revisó Montevideo**.
2. Los **nombres nuevos** de los rivales (tabla en `ideas/rediseno-nivel.md`).
3. **"¡Primero va el envido!"** en el canto y una copla nueva en `versos.ts`.
4. Mirar los 19 departamentos.

---

## 2026-08-29 — Baraja española, croquis de nivel y el envido sobre el truco

### Lo que quedó andando

**La baraja española de verdad** (`components/Carta.tsx`). Aprobada. Era el
cambio más grande porque hay un solo componente de carta en todo el sitio: se
arregló una vez y se arreglaron las lecciones, la mesa y la portada.
- Espadas y bastos van **cruzadas** (el 2 son dos en X, el 4 son dos pares, el 5
  dos pares más una derecha en el medio). Oros y copas en grilla. Mezclar las dos
  familias era lo que hacía que no se distinguieran los palos.
- Cada palo en tres tonos —contorno, relleno y luz— en vez de uno plano.
- Sota, caballo y rey son gente dibujada, no siluetas.
- **La pinta**: el marco se corta según el palo (oros 0, copas 1, espadas 2,
  bastos 3), que es como se reconoce el palo en el abanico sin abrirlo.
- Se corrigió que **el 6 y el 7 de espada se veían iguales**: la recta del medio
  del 7 ahora se dibuja más grande y por encima del entramado.

**Que la mesa no scrollee nunca.** Se encontraron y arreglaron tres bugs de
distribución mirando la web con Playwright, que no se veían leyendo el código:
1. La mano quedaba **cortada por la barra** cuando aparecía la fila de la flor.
   El alto de la barra ahora **se calcula** según cuántas filas tiene.
2. En pantallas bajas las cartas jugadas **se superponían con tu mano**. Ahora el
   centro cede y se recorta; la mano y la barra son intocables.
3. El mazo y el mate quedaban cortados al recortar el centro.

La lección: **el problema nunca fue la pantalla angosta sino la BAJA.** Las
medidas pasaron a estar atadas al alto de la ventana (`clamp(…vh…)`) y no a
puntos de corte de ancho. Verificado sin scroll en 390×844, 360×640, 1100×800
y 1280×620.

**El aviso de por qué no hay envido** — ver la investigación abajo.

### La investigación del envido sobre el truco

Se reportó que "cuando el bot es mano y canta truco, no puedo cantar envido".
Se investigó de dos formas y **el motor no tiene el bug**:

- **6.000 manos simuladas** con el bot de mano: en **605 casos** el motor sí
  ofrece envido sobre un truco cantado, y en **0 casos** lo niega sin motivo de
  regla. Los 451 restantes son legítimos: el rival cantó flor (384), el envido ya
  se jugó (322) o vos ya cantaste flor (129).
- **Reproducido en el navegador** con Playwright hasta dar con el caso exacto.
  El resumen de esa mano fue:

  ```
  · El rival cobra la flor: +3     ← esto pasó y no se veía
  Él: ¡truco!                       ← esto sí se veía
  ```

**El bot había cantado flor primero, y la flor anula el envido** (`reglas.txt`
14.1). La regla estaba bien aplicada; **lo que fallaba era que el juego no lo
decía**, por dos motivos que se sumaban: la chapa de eventos mostraba sólo el
ÚLTIMO evento, y el globo del verso la tapaba mientras estaba en pantalla.

Arreglado: la zona de diálogo nueva muestra las últimas líneas en vez de una
sola, y cuando el envido no se puede cantar aparece el motivo
("Cantó flor: la flor anula el envido"). Las dos ramas verificadas en la web.

### El croquis del nivel (NO aprobado)

Se rediseñó la mesa entera: encuadre con prioridad a la mesa, ambiente por
departamento (7 arquetipos para los 19), medallón con la cara del rival a la
derecha, silueta sin cara de fondo, zona de diálogo colgada del medallón, y el
mate sobre la mesa.

**No se aprobó**: no se parece lo suficiente a las referencias. Quedó como
croquis y las capturas están en
`New folder/Inspiracion del diseño de nivel/croquis-2026-08-29/`.
El diagnóstico y el plan para cerrar la distancia están en
[`ideas/rediseno-nivel.md`](ideas/rediseno-nivel.md).

En una línea: **lo que se hizo es una interfaz apoyada sobre un fondo de madera,
y las referencias son una foto de una mesa.** Falta la cámara con perspectiva,
las manos sosteniendo las cartas, la madera con nudos y rayones, las sombras de
contacto y el fondo en capas.

### Seguridad

- **`New folder/` no estaba en `.gitignore`** y este repositorio es público. Ahí
  adentro hay capturas de pantalla de **apps de terceros** e imágenes generadas
  con IA: subirlas sería publicar arte con derechos de otro. Agregada al ignore.
- Se borró `app/preview-baraja/`, una ruta temporal que se había creado para
  mirar las 40 cartas juntas. En un repositorio público habría quedado publicada.
- Se revisó que el aviso nuevo no sople información: mira `florCantada`, que es
  lo que se dijo en voz alta, nunca `flor[rival].tiene`, que son sus cartas.
- El rival del modo gira sigue saliendo del `?depto=` y no del estado, y el
  selector no se monta en ese modo.

### Pendiente

1. Rehacer el nivel siguiendo `ideas/rediseno-nivel.md`.
2. Aplicar los **nombres nuevos** (la tabla está en ese mismo archivo). El `id`
   no se toca: es la clave del progreso guardado.
3. **"¡Primero va el envido!"** en el canto y una copla nueva en `versos.ts`.
4. Mirar los 19 departamentos, no sólo los seis que se miraron.

### Estado al cerrar
`npm test` **128/128** · `tsc --noEmit` limpio · sin scroll en cuatro tamaños.
