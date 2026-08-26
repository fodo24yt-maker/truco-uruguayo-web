# Estética del juego

> Cómo se tiene que ver y sentir. Es un documento operativo: los valores de
> acá se copian tal cual a la configuración de Tailwind cuando arranque el
> frontend.
> Concepto del juego: [`concepto.md`](concepto.md).

## La sensación, en una frase

**Estás en la mesa del fondo de un boliche uruguayo, de noche. Hay una lámpara
que cuelga y alumbra sólo la mesa. Todo lo demás está en penumbra. Se juega
por nada, pero se juega en serio.**

Cálido, gastado, con historia. Nada de casino, nada de app fría.

## La escena, por capas

**El objetivo no es "un fondo con estética de bar": es que parezca una mesa de
verdad, vista desde tu silla.** Si alguien mira la pantalla de reojo, tiene que
pensar "están jugando a las cartas en un bar", no "es una app con un fondo".

De atrás para adelante:

1. **El bar, desenfocado** — la pared del fondo, en penumbra: se insinúan un
   estante con botellas, la luz de una lámpara colgante, algún reflejo. Todo
   fuera de foco y muy oscuro. Es profundidad de campo: la cámara está enfocada
   en la mesa, y lo de atrás queda borroso, como en una foto real.
2. **El rival** — se lo ve poco y a propósito (ver más abajo).
3. **El canto de la mesa** — la línea de madera del borde, con su grosor. Es lo
   que hace que se lea como una mesa y no como un fondo plano: hay un antes y
   un después de ese borde.
4. **La tabla de la mesa** — madera de bar de verdad: vetas irregulares, nudos,
   marcas de uso, algún cerco de vaso. **No rayas verticales parejas.** La
   textura se genera con ruido procedural, no con líneas dibujadas a mano.
5. **La luz** — una lámpara arriba que cae sobre el centro de la mesa. El centro
   está iluminado y cálido; los bordes se apagan. Las cartas proyectan sombra
   hacia donde la luz no llega.
6. **Los objetos** — muy pocos y chicos, apoyados en el borde: un vaso, un mate,
   el mazo boca abajo. Nunca compiten con las cartas.
7. **Las cartas** — lo único perfectamente nítido de toda la pantalla.

> **Regla de oro:** si algo compite con las cartas por la atención, se apaga.
> La carta es siempre lo más brillante y lo más nítido.

### La mesa es de madera, no de paño

Decisión corregida: **no hay paño verde de casino.** Un boliche uruguayo tiene
mesas de madera, a veces con fórmica, nunca con tapete de póker. El verde de
casino es justo lo que hace que un juego de cartas se vea genérico.

La madera se construye por capas, toda en CSS y SVG, sin una sola imagen:

- Un color base cálido de fondo.
- **Vetas con ruido procedural** (`feTurbulence` con frecuencia muy asimétrica:
  mucha variación en un eje y poca en el otro, que es exactamente cómo se ve la
  veta de la madera).
- Unos pocos nudos y manchas de uso, colocados a mano.
- El halo de la lámpara encima de todo.

### Cómo se ve el rival

**Se tiene que notar que hay alguien enfrente, sin que se vea más que eso.** Ni
un avatar de cuadradito, ni un personaje de dibujitos animados mirándote fijo.

- Un **busto en silueta**, recortado por el borde superior de la pantalla:
  hombros, cuello, el ala de un sombrero. Vectorial, en tonos oscuros.
- Va **desenfocado y con poca opacidad**, porque está fuera del plano de foco.
- Se lo ve por detrás de sus propias cartas, no al lado.
- El nombre, chico, sobre una plaquita discreta.

La idea es la sensación de tener a alguien enfrente, no un personaje. Cuando
llegue la gira por el país, cada rival cambia la silueta (el sombrero, el porte,
los hombros) y el color de su ropa. Nada más. Con eso alcanza para que se
distingan entre ellos.

### Las cartas se sostienen y se tiran

Dos momentos, dos tratamientos distintos:

**En la mano** — las tres cartas están **en abanico**, con rotaciones de unos
pocos grados y alturas apenas distintas, como cuando las tenés agarradas. No
alineadas en fila como en un solitario. Al pasar por encima o tocarlas, la
carta se levanta y se endereza un poco, como cuando la separás del resto con el
pulgar para tirarla.

**Al tirarla** — la carta **cae sobre la mesa**: recorre la distancia, aterriza
con una rotación al azar de unos grados y da un rebote mínimo, con la sombra
acompañando. Nunca aparece de la nada en su lugar final. Y las cartas que
quedan en la mano **se reacomodan solas** para cerrar el hueco: el abanico se
recompone.

## Paleta

Colores exactos. Los nombres son los que van a ser las variables CSS.

### Ambiente
| Variable | Hex | Dónde |
|---|---|---|
| `--noche` | `#14100E` | Fondo general, fuera del cono de luz |
| `--madera-oscura` | `#2A1C14` | Paredes, muebles del fondo |
| `--madera` | `#4A3121` | El borde de la mesa |
| `--madera-clara` | `#6B4A31` | Cantos de la mesa donde pega la luz |

### La mesa (madera de bar, no paño)
| Variable | Hex | Dónde |
|---|---|---|
| `--mesa` | `#8A5A32` | La tabla de la mesa, tono base |
| `--mesa-luz` | `#B57B45` | Donde cae la luz de la lámpara |
| `--mesa-veta` | `#5C3A1E` | Las vetas oscuras de la madera |
| `--mesa-canto` | `#3D2413` | El canto de la mesa y su sombra |

El tono base es una madera cálida, tipo lapacho gastado. Bajo la lámpara sube a
`#B57B45`; en los bordes, lejos de la luz, baja a `#4A2E17`. Esa diferencia la
hace el degradado de la luz, no colores distintos.

### Luz y acentos
| Variable | Hex | Dónde |
|---|---|---|
| `--luz-calida` | `#F5C97A` | El halo de la lámpara |
| `--dorado` | `#C9922E` | Carta seleccionada, piezas, detalles |
| `--bordo` | `#7B2231` | Botones de canto, acentos fuertes |
| `--bordo-claro` | `#A8323F` | Hover de esos botones |
| `--crema` | `#F2E6D0` | Texto sobre oscuro, cara de las cartas |
| `--papel` | `#EDDFC0` | Panel de lectura y libreta del marcador |
| `--papel-sombra` | `#D6C39A` | Pliegues y bordes irregulares del papel |
| `--tinta` | `#2A1C14` | Texto sobre papel |

### Semánticos
| Variable | Hex | Dónde |
|---|---|---|
| `--quiero` | `#4E8B57` | "Quiero", confirmaciones, acierto |
| `--no-quiero` | `#A8323F` | "No quiero", irse al mazo, error |

### Los palos
En la baraja española cada palo tiene su color. Además del color, cada palo se
distingue por su **forma**: nunca dependemos sólo del color.

| Palo | Hex |
|---|---|
| Espada | `#2B4A6F` |
| Basto | `#4E6B2F` |
| Oro | `#C9922E` |
| Copa | `#A8323F` |

### Modo lectura (sección Aprender)
Los textos largos no se leen bien sobre negro. La sección Aprender usa fondo
**papel**: `--crema` de fondo, `--madera-oscura` de texto, y los acentos
`--bordo` y `--dorado` como títulos. Se siente como el manual que estaba
arriba de la heladera del boliche, y descansa la vista.

## Tipografías

Todas de Google Fonts, así no hay líos de licencia.

| Uso | Fuente | Por qué |
|---|---|---|
| Marca y títulos grandes | **Yeseva One** | Contraste alto y curvas de fileteado rioplatense. Las apps de truco usan una romana tipo Cinzel: épica y genérica. Ésta es de acá |
| Etiquetas, botones, cantos | **Oswald** | Condensada, como los carteles de precios de un almacén. Entra mucho en poco espacio |
| Texto corrido (Aprender) | **Source Sans 3** | Se lee cómoda en párrafos largos y en celular |
| El marcador | **Caveat** | Escrito a mano, como la libreta del boliche |
| Modo lectura | **Source Sans 3** | Las lecciones son texto largo: manda la comodidad |
| Números de las cartas | **Oswald** (bold) | Legible a 12px, que es lo que importa |

Regla: **nunca más de dos tipografías en pantalla al mismo tiempo**.

## Las cartas

Lo más importante del proyecto visual.

- **Dibujo propio en SVG.** No usamos escaneos ni imágenes de barajas
  existentes: el repo es público y las barajas comerciales tienen derechos.
  Hacemos una baraja española estilizada, propia.
- **Proporción 2:3** (por ejemplo 100×150). Esquinas redondeadas 8px.
- **Cara:** fondo `--crema`, marco fino del color del palo, el número grande
  arriba a la izquierda y el símbolo del palo abajo a la derecha, y el motivo
  central simplificado. Las figuras (sota, caballo, rey) son siluetas planas de
  dos colores, no ilustraciones con detalle: tienen que leerse a 60px.
- **Prueba de fuego:** la carta se tiene que reconocer en un celular, de noche,
  con la pantalla al 40% de brillo, a 60px de ancho. Si no pasa esa prueba, se
  simplifica más.
- **Dorso:** patrón geométrico bordó con líneas doradas, sobrio.
- **Carta que es pieza:** halo dorado suave alrededor y una cintita con la
  palabra PIEZA. Sólo con las ayudas prendidas.
- **Carta jugable:** se levanta 8px y se le prende un borde dorado.
- **Carta que no podés jugar:** 60% de opacidad, sin borde.

## La mesa

**Celular (vertical), de arriba a abajo:**

```
┌──────────────────────────────┐
│░░ bar en penumbra, borroso ░░│
│░░   ╭──────╮  silueta del  ░░│  el rival: hombros y sombrero,
│░░   │ ▒▒▒▒ │  rival        ░░│  desenfocado, recortado arriba
│  🂠 🂠 🂠   sus cartas        │
│══════════════════════════════│  ← el canto de la mesa
│                              │
│  ╔═╗                         │  la tabla: madera con vetas
│  ║M║      ┌──┐               │  y el halo de la lámpara
│  ╚═╝      │▩▩│ ← las jugadas │
│  muestra  └──┘               │
│                              │
│      ┌──┐┌──┐┌──┐            │  tu mano, en abanico,
│      │▩▩││▩▩││▩▩│            │  como agarrada
│      └──┘└──┘└──┘            │
├──────────────────────────────┤
│ TRUCO │ ENVIDO │ FLOR │ MAZO │  barra fija, 56px
└──────────────────────────────┘
```

El **marcador** va apoyado en un rincón de la mesa, como la libreta de verdad:
no flotando como un widget.

**Escritorio:** la misma mesa, más ancha pero **no más grande**. Máximo 760px de
zona de juego, centrada verticalmente. Alrededor se ve más del bar. Nunca se
estira a lo ancho de un monitor: un truco a pantalla completa se lee peor, no
mejor.

**No negociables:**
- La muestra siempre visible, sin abrir nada.
- El marcador siempre visible, malas y buenas separadas.
- Botones de canto de 44px de alto mínimo.
- Entra en 360px de ancho sin scroll horizontal.
- **La mesa se ve entera sin hacer scroll**, en celular y en escritorio.

## El marcador

Como en el boliche: **fósforos o porotos sobre la libreta**, o rayas de tiza en
una pizarrita. Malas de un lado, buenas del otro, con una raya al medio.
Se anima cuando suma: el poroto cae y rebota. Es de las cosas que más ayudan a
entender que la partida son 15 + 15 y no un número abstracto.

## Los cantos

Un canto es un momento, no un mensaje de sistema.

- Aparece como **globo de diálogo** sobre el que canta, en Oswald, mayúsculas.
- Con un pop rápido (120ms), se queda 1,2s y se desvanece.
- **"¡TRUCO!"** en bordó, **"¡ENVIDO!"** en dorado, **"¡FLOR!"** en crema con
  borde dorado (la flor es la fiesta, que se note).
- Al "¡QUIERO!" la mesa pega una sacudida corta (80ms). Se tiene que sentir.

## Movimiento

Cortito y con peso. **Nada flota, nada aparece de la nada.**

| Momento | Duración | Cómo |
|---|---|---|
| Repartir | 200ms por carta, escalonadas 70ms | Salen del mazo en arco y se acomodan en el abanico |
| Dar vuelta la muestra | 300ms | Giro sobre su eje, con un brillo al final |
| **Tirar una carta** | 380ms | Recorre el camino de la mano a la mesa, se endereza, aterriza con una rotación al azar de -7° a 7° y da un rebote mínimo. La sombra se agranda mientras viaja y se cierra al aterrizar |
| Reacomodar la mano | 280ms | Las cartas que quedan cierran el hueco y el abanico se recompone |
| Levantar una carta | 140ms | Sube 10px y se endereza, como cuando la separás con el pulgar |
| Canto | 140ms | Pop del globo |
| Quiero | 90ms | Sacudida de la mesa |
| Ganar una baza | 420ms | Las cartas se arrastran hacia el ganador |

**Todo se puede saltear tocando la pantalla**, y todo se apaga si el navegador
pide `prefers-reduced-motion`. Una mano no puede durar más de lo que dura en la
mesa de verdad.

## Sonido

Todo apagable, y **arranca apagado** (nadie quiere que una web le haga ruido de
sorpresa).

- Ambiente de boliche muy bajito: murmullo, un vaso, el ventilador.
- La carta que cae sobre el paño (seco, corto).
- Los porotos del marcador.
- **Idea a futuro:** los cantos con voz uruguaya de verdad. Un "¡truco!" bien
  dicho vale más que cualquier animación.

## Legibilidad y accesibilidad

No es un extra: si no se lee, no se aprende.

- Contraste mínimo 4.5:1 en todo texto (los textos largos van en modo papel).
- El palo se distingue **por forma**, no sólo por color: daltónicos incluidos.
- Área táctil mínima 44×44px.
- Todo lo que se puede hacer con el mouse se puede hacer con el teclado.
- La mesa entra en una pantalla de 360px de ancho sin scroll.

## Lo que NO queremos

- ❌ Neón flúor y estética casino de Las Vegas.
- ❌ **Paño verde de casino.** Un boliche tiene mesas de madera.
- ❌ **Texturas de rayas parejas.** La madera de verdad tiene vetas
  irregulares; unas líneas verticales equidistantes se ven como un patrón de
  fondo, no como madera.
- ❌ Cartas alineadas en fila prolija como un solitario: se sostienen en
  abanico.
- ❌ Gradientes violeta/celeste de app cripto.
- ❌ Fotos realistas mezcladas con ilustración: o una cosa, o la otra.
- ❌ Mesa recargada de íconos, banners y chiches. La carta manda.
- ❌ Fuego, calaveras, "épica gamer". Esto es un boliche, no un torneo.

## Referencias: qué tomamos de Truco Blitz y qué no

Las capturas de Truco Blitz que miramos (mesa 1v1, mesa 2v2, la "Gira Nacional"
y la pantalla de reglas) confirmaron el rumbo y aportaron tres ideas concretas.

**Lo que tomamos:**

| De la referencia | Cómo lo usamos |
|---|---|
| El marcador en una **libreta de papel escrita a mano** con cuadraditos | Nuestro marcador es exactamente eso: papel, lápiz y Caveat. Es mil veces más cálido que un contador digital, y hace entender que la partida son 15 + 15 |
| El **panel de papel viejo** sobre fondo de madera para la pantalla de reglas | Es nuestro "modo lectura" de la sección Aprender. El texto largo sobre negro cansa; sobre papel, no |
| El **mapa de la gira** con el país dividido en regiones | Confirma la ruta por el Uruguay del concepto. Queda para la fase de la historia |
| La **barra fija de cantos** abajo (Truco / Envido / Flor / Mazo) | Misma idea: cuatro botones grandes al alcance del pulgar. Con "Vale cuatro" entrando en el mismo lugar cuando corresponde |
| Madera oscura + ornamentos dorados | Nuestra base, pero más cálida y con el cono de luz de la lámpara |

**Lo que NO copiamos, a propósito:**

- ❌ **El fotorrealismo mezclado.** En las capturas hay una taza de café real y
  un pulgar humano real sosteniendo la carta, arriba de cartas dibujadas. Choca.
  Nosotros vamos 100% ilustración plana: una sola manera de dibujar en todo el
  juego. Además es más liviano y se ve mejor en pantallas chicas.
- ❌ **La serif romana tipo Cinzel.** Es la tipografía por default de cualquier
  juego mobile "épico". Vamos a Yeseva One, que tiene el aire del fileteado.
- ❌ **La mesa negra sin luz.** Su mesa está plana y pareja. La nuestra tiene el
  cono de luz de la lámpara: centro iluminado, bordes en penumbra.
- ❌ **La muestra ausente.** Truco Blitz es argentino: no tiene muestra ni
  piezas. Ahí está toda nuestra diferencia, y por eso la muestra tiene su propio
  lugar de honor en la mesa (el portamuestra, ver
  [`diseno-frontend.md`](diseno-frontend.md)).

**Ojo con las capturas en el repo:** son de una app comercial ajena. Las
miramos como referencia, pero **no se suben al repositorio público**, porque
son material con derechos de otro. Por eso `ideas/imagenes/referencias/` está
ignorado en `.gitignore`: dejá ahí las capturas de otras apps y quedan en tu
máquina nomás. Las imágenes propias van sueltas en `ideas/imagenes/` y ésas sí
se suben.

## Todavía por definir

1. **Estilo de los personajes** (para la fase de la historia): ¿retratos
   ilustrados en marco dorado como los de la referencia, o siluetas más sobrias?
2. **Cuánta ilustración de fondo** en el boliche: por ahora vamos con penumbra
   y dos o tres objetos que se insinúan, que es lo más barato y lo que mejor
   deja lucir las cartas.
