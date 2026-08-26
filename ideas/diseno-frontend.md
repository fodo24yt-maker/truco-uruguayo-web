# Diseño del frontend

> Cómo se construye lo que se ve. Pantallas, componentes, tokens y decisiones.
> Estética general: [`estetica.md`](estetica.md) · Reglas: [`../reglas.txt`](../reglas.txt)

## Qué entra en esta fase (MVP)

1. **Landing** — qué es esto y por dónde empezar.
2. **Aprender** — 8 lecciones con dibujos vectoriales y ejemplos.
3. **Jugar** — mesa mano a mano contra un bot simple, andando de verdad.

Fuera de esta fase: la gira por el país, las situaciones, 2v2, backend, modelo
de IA.

## El elemento que nos hace distintos: el portamuestra

Todas las apps de truco del mercado son argentinas: **no tienen muestra**. Es
nuestra ventaja y tiene que verse apenas entrás a la mesa.

La muestra no va tirada en un rincón: va apoyada en un **portamuestra de
madera** clavado en el borde del paño, girada 90°, con un halo cálido, siempre
visible, imposible de olvidar.

Y encima de eso, la parte pedagógica: **las cartas de tu mano que son piezas se
prenden con el mismo halo dorado que la muestra**. Sin una palabra de texto, la
regla más difícil del juego —"el palo de la muestra manda"— queda explicada por
color compartido. Con las ayudas prendidas se agrega una cintita "PIEZA".

Es el único lugar donde nos ponemos exuberantes. Todo lo demás, quieto.

## Tokens

### Color
| Token | Hex | Dónde |
|---|---|---|
| `noche` | `#14100E` | Fondo, fuera del cono de luz |
| `madera` | `#3A2418` | Tablas verticales del fondo, marcos |
| `madera-clara` | `#6B4A31` | Cantos iluminados, bordes |
| `fieltro` | `#1E3A2B` | El paño de la mesa |
| `fieltro-luz` | `#2F5741` | Donde cae la luz de la lámpara |
| `papel` | `#EDDFC0` | Panel de lectura y libreta del marcador |
| `papel-sombra` | `#D6C39A` | Pliegues y bordes del papel |
| `dorado` | `#C9922E` | Ornamentos, halo de la muestra y las piezas |
| `bordo` | `#7B2231` | Cantos, botones de acción |
| `tinta` | `#2A1C14` | Texto sobre papel |
| `quiero` / `no-quiero` | `#4E8B57` / `#A8323F` | Aceptar / rechazar |

Palos: espada `#2B4A6F` · basto `#4E6B2F` · oro `#C9922E` · copa `#A8323F`.

### Tipografía
| Rol | Fuente | Por qué ésta |
|---|---|---|
| Display | **Yeseva One** | Contraste alto y curvas de fileteado rioplatense. Truco Blitz usa una romana tipo Cinzel: épica y genérica. Ésta es de acá |
| UI y cantos | **Oswald** | Condensada: "VALE CUATRO" tiene que entrar en un botón de celular sin achicar la letra |
| Texto corrido | **Source Sans 3** | Las lecciones son texto largo: manda la comodidad de lectura |
| Marcador | **Caveat** | El marcador va escrito a mano, como en la libreta del boliche |

**Nunca más de dos familias en la misma pantalla.** Mesa: Oswald + Caveat.
Aprender: Yeseva One + Source Sans 3.

### Escala y espaciado
Escala tipográfica 1.25. Espaciado en múltiplos de 4px. Radio: 8px en cartas,
4px en botones, 0 en paneles de papel (los bordes del papel son irregulares,
no redondeados).

## Mapa de pantallas

```
/                        Landing
/aprender                Índice de las 8 lecciones
/aprender/[leccion]      Lección
/jugar                   Mesa mano a mano contra el bot
```

Sitio estático (`output: export`): anda en GitHub Pages sin servidor.

## Wireframes

### Landing — celular

```
┌────────────────────────────┐
│  ☰  TRUCO URUGUAYO         │  barra de madera, logo en Yeseva One
├────────────────────────────┤
│                            │
│    [ 2 de oro ]  ← la      │  HERO: la muestra dada vuelta, sola,
│      muestra girada        │  con el halo. Debajo:
│                            │
│  "Acá el 4 le gana al      │  El titular es la regla que hace
│   ancho de espada."        │  único al truco uruguayo, no un
│                            │  eslogan vacío
│  [ APRENDER ] [ JUGAR ]    │
├────────────────────────────┤
│  Por qué existe (3 líneas) │
├────────────────────────────┤
│  Las 8 lecciones (lista)   │
├────────────────────────────┤
│  [ espacio de aviso ]      │  ← slot de ad, abajo, discreto
└────────────────────────────┘
```

El hero no es un título con degradé: es **una carta girada con su halo**, que
es literalmente el tema del sitio. La primera frase que lee alguien que llega
de Google es una regla concreta que lo descoloca y lo hace seguir leyendo.

### Lección — celular

```
┌────────────────────────────┐
│  ← Aprender      3 de 8    │  progreso, sin barras animadas
├────────────────────────────┤
│ ╭──────────────────────╮   │
│ │ (papel viejo)        │   │  panel de papel: el texto largo
│ │  LA MUESTRA          │   │  se lee sobre papel, no sobre negro
│ │  texto...            │   │
│ │  ┌────────────────┐  │   │
│ │  │ DIBUJO SVG     │  │   │  ejemplo vectorial: cartas de verdad
│ │  │ (cartas reales)│  │   │  dibujadas, no capturas
│ │  └────────────────┘  │   │
│ │  texto...            │   │
│ ╰──────────────────────╯   │
├────────────────────────────┤
│  [ espacio de aviso ]      │
├────────────────────────────┤
│  ← anterior   siguiente →  │
└────────────────────────────┘
```

### Mesa — celular

```
┌────────────────────────────┐
│ ┌─────────┐          ┌───┐ │
│ │ LIBRETA │          │bot│ │  marcador manuscrito + avatar
│ │ Él  ▢▢  │          └───┘ │
│ │ Yo  ▢▢▢ │  [globo canto] │
│ └─────────┘                │
├────────────────────────────┤
│ ╔═╗                        │
│ ║M║      🂠  🂠             │  M = PORTAMUESTRA, fijo en el borde
│ ║U║                        │      izquierdo, girado 90°
│ ║E║   ┌──┐                 │
│ ║S║   │▩▩│  ← jugadas      │  el paño, con el cono de luz
│ ║T║   └──┘                 │
│ ╚═╝                        │
├────────────────────────────┤
│     ┌──┐┌──┐┌──┐           │  tu mano, en abanico.
│     │▩▩││▩▩││▩▩│           │  las piezas con halo dorado
│     └──┘└──┘└──┘           │
├────────────────────────────┤
│ TRUCO │ ENVIDO │ FLOR │MAZO│  barra fija, 56px, al alcance del pulgar
└────────────────────────────┘
```

**Escritorio:** la misma mesa centrada, máximo 720px de ancho, con el boliche
en penumbra alrededor. No se agrega información: se agrega aire. La mesa no se
estira a 1920px, porque un truco a pantalla completa se lee peor, no mejor.

**No negociables:**
- La muestra siempre visible, sin abrir nada.
- El marcador siempre visible, malas y buenas separadas.
- Botones de canto de 44px de alto mínimo.
- Entra en 360px de ancho sin scroll horizontal.

## Componentes

| Componente | Qué hace |
|---|---|
| `Carta` | Dibuja cualquiera de las 40 cartas en SVG, a cualquier tamaño |
| `Portamuestra` | La muestra girada, con halo y el palo que manda |
| `ManoJugador` | Las 3 cartas en abanico, seleccionables |
| `Marcador` | La libreta manuscrita, malas y buenas |
| `BarraCantos` | Los botones, habilitados según lo que permite la regla |
| `GloboCanto` | El canto como globo de diálogo |
| `PanelPapel` | El fondo de papel viejo para leer |
| `EspacioAviso` | El hueco de publicidad (ver abajo) |

### La baraja en SVG
Las 40 cartas se dibujan **por código**, no una por una: cuatro símbolos de
palo, tres siluetas de figura (sota, caballo, rey) y una grilla de pips. Sale
una baraja propia, nítida en cualquier tamaño, sin usar imágenes de barajas
comerciales (que tienen derechos y el repo es público).

Prueba de fuego: la carta se tiene que reconocer a **60px de ancho**, de noche,
con el brillo al 40%.

## Los espacios de publicidad

El proyecto es gratis. Si algún día hay avisos, tienen que tener un lugar
pensado de antemano, no meterse a último momento donde molesten.

- **Dónde sí:** al pie de la landing, al pie de cada lección y en la pantalla
  de fin de partida.
- **Dónde no:** nunca dentro de la mesa mientras se juega. Ni interstitials, ni
  videos, ni nada que tape una carta.
- **Cómo:** un componente `EspacioAviso` que hoy reserva el lugar con un
  recuadro discreto y mañana se reemplaza por el script del proveedor. Reservar
  la altura desde ahora evita que el día que se prendan los avisos se mueva
  todo el contenido de lugar.
- **Hoy no se carga ningún script de terceros.** Cero rastreadores.

## Calidad mínima

- Responsive real desde 360px.
- Foco de teclado visible, navegable sin mouse.
- `prefers-reduced-motion` respetado: se apagan las animaciones.
- Contraste 4.5:1 en todo texto.
- El palo se distingue por forma, no sólo por color.
- Sin dependencias de UI: Next + React + Tailwind y nada más.
