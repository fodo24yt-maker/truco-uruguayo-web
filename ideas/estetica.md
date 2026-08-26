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

De atrás para adelante, así se construye la pantalla de juego:

1. **La penumbra** — el fondo, casi negro cálido. Se insinúa el boliche:
   estantes, botellas, una radio vieja, chapas de publicidad esmaltadas en la
   pared, un ventilador de techo. Todo desenfocado y oscuro: no compite.
2. **El cono de luz** — un halo cálido que cae desde arriba sobre la mesa.
   Es lo que define la composición: el centro está iluminado, los bordes se
   apagan. Se hace con un `radial-gradient`, no con una imagen.
3. **La mesa** — madera oscura con el paño de fieltro verde gastado en el
   centro, con marcas de uso: el verde no es parejo, está más claro donde se
   apoyaron los codos mil veces.
4. **Los props** — un mate apoyado en un rincón, un vaso, un cenicero, la
   libreta del marcador. No se tocan, son atmósfera. Poquitos y chicos.
5. **Las cartas** — lo único con contraste alto y bordes nítidos. Mandan.

> **Regla de oro de la composición:** si algo compite con las cartas por la
> atención, se apaga. La carta es siempre lo más brillante de la pantalla.

## Paleta

Colores exactos. Los nombres son los que van a ser las variables CSS.

### Ambiente
| Variable | Hex | Dónde |
|---|---|---|
| `--noche` | `#14100E` | Fondo general, fuera del cono de luz |
| `--madera-oscura` | `#2A1C14` | Paredes, muebles del fondo |
| `--madera` | `#4A3121` | El borde de la mesa |
| `--madera-clara` | `#6B4A31` | Cantos de la mesa donde pega la luz |

### El paño
| Variable | Hex | Dónde |
|---|---|---|
| `--fieltro` | `#1E3A2B` | El verde base de la mesa |
| `--fieltro-luz` | `#2F5741` | Donde cae la luz de la lámpara |
| `--fieltro-sombra` | `#142720` | Bordes y sombra bajo las cartas |

### Luz y acentos
| Variable | Hex | Dónde |
|---|---|---|
| `--luz-calida` | `#F5C97A` | El halo de la lámpara |
| `--dorado` | `#C9922E` | Carta seleccionada, piezas, detalles |
| `--bordo` | `#7B2231` | Botones de canto, acentos fuertes |
| `--bordo-claro` | `#A8323F` | Hover de esos botones |
| `--crema` | `#F2E6D0` | Texto sobre oscuro, cara de las cartas |
| `--tiza` | `#E8E4DA` | El marcador, escrito como con tiza |

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
| Marca y títulos grandes | **Alfa Slab One** | Cartel pintado a mano, robusta, con peso de chapa esmaltada |
| Etiquetas, botones, cantos | **Oswald** | Condensada, como los carteles de precios de un almacén. Entra mucho en poco espacio |
| Texto corrido (Aprender) | **Source Sans 3** | Se lee cómoda en párrafos largos y en celular |
| El marcador | **Caveat** | Escrito a mano, como la libreta del boliche |
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
│ marcador (pizarra)   ⚙ 🔊    │  el marcador siempre visible
├──────────────────────────────┤
│      rival: avatar + 3 🂠     │  cartas boca abajo, avatar chico
│         [globo de canto]     │
├──────────────────────────────┤
│                              │
│   MUESTRA        cartas      │  el paño. La muestra a la izquierda,
│   (de costado)   jugadas     │  siempre visible, apenas girada
│                              │
├──────────────────────────────┤
│      tus 3 cartas en abanico │  bien grandes, se tocan con el pulgar
├──────────────────────────────┤
│  [ENVIDO] [TRUCO] [AL MAZO]  │  barra de cantos, al alcance del pulgar
└──────────────────────────────┘
```

**Escritorio:** la misma mesa, centrada y más ancha, con el boliche visible
alrededor. No se agrega información: se agrega aire.

**No negociables del layout:**
- La **muestra** está siempre a la vista, sin tener que abrir nada. Es el error
  número uno de los principiantes: hay que hacerlo imposible de olvidar.
- El **marcador** está siempre a la vista, con malas y buenas separadas.
- Los **botones de canto** miden 44px de alto como mínimo.

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

Cortito y con peso. Nada flota.

| Momento | Duración | Cómo |
|---|---|---|
| Repartir | 180ms por carta, escalonadas 60ms | Salen del mazo en arco |
| Dar vuelta la muestra | 300ms | Giro sobre su eje, con un brillo al final |
| Tirar una carta | 220ms | Cae con rotación aleatoria de -6° a 6° y sombra |
| Canto | 120ms | Pop del globo |
| Quiero | 80ms | Sacudida de la mesa |
| Ganar una baza | 400ms | Las cartas se arrastran hacia el ganador |

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
- ❌ Verde plano tipo solitario de Windows.
- ❌ Gradientes violeta/celeste de app cripto.
- ❌ Fotos realistas mezcladas con ilustración: o una cosa, o la otra.
- ❌ Mesa recargada de íconos, banners y chiches. La carta manda.
- ❌ Fuego, calaveras, "épica gamer". Esto es un boliche, no un torneo.

## Pendiente de definir juntos

1. **La foto de referencia de Truco Blitz** (no llegó al chat). Cuando esté en
   [`imagenes/`](imagenes/) revisamos qué tomamos y qué no.
2. **Estilo de los personajes:** ¿ilustración cartoon con contorno grueso, o
   siluetas/retratos más sobrios? Cambia mucho el tono.
3. **Cuánta ilustración de fondo:** ¿un boliche dibujado con detalle, o casi
   todo penumbra con dos o tres objetos que se insinúan? (Lo segundo es más
   barato y suele quedar mejor.)
4. **La baraja:** ¿cuánto nos acercamos a la baraja española clásica y cuánto
   la estilizamos?
