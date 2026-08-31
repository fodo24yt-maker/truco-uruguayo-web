# Rediseño del nivel

> **HECHO el 30 de agosto de 2026**, en dos pasadas. Los seis puntos del plan de
> abajo se aplicaron; el detalle está en [`Historial.md`](../Historial.md). Lo
> que queda vivo de este documento es **"¡Primero va el envido!"**. Los nombres
> nuevos se aplicaron el 31/8/2026 y la tabla queda de registro.
>
> **De la segunda pasada, lo que hay que no volver a discutir:** el rival va
> SIN CARA pero **no en silueta**. La silueta se probó cuatro veces y siempre
> quedó un fantasma. Lo que lo arregló fue darle volumen —hombros que caen,
> saco con solapas, brazos despegados del torso, contorno de tinta— y
> desenfocarlo, no ponerle rasgos.
>
> Y la regla de estilo que salió de comparar con la referencia de IA:
> **se dibuja con LÍNEA, no con manchas desenfocadas.** El desenfoque se come
> justamente la información que hace que algo se lea como lo que es: un nudo
> desenfocado es una quemadura, una cabeza oscura es un fantasma.
>
> Lo que se hizo distinto de lo planeado: la madera, el ambiente y la
> perspectiva **no se dibujan en vivo**, se hornean con
> `herramientas/generar-escena.mjs`. En vivo no se podían pagar.
>
> ---
>
> Estado al 29 de agosto de 2026. Lo que hay hecho es un **croquis**: funciona,
> no scrollea y las cartas quedaron bien, pero **no se parece lo suficiente a las
> referencias**. Este documento dice por qué y cómo cerrar esa distancia.
>
> Las referencias están en `DISENO-NIVEL/Inspiracion del diseño de nivel/`
> (la carpeta está en `.gitignore`: son capturas de apps de terceros).
> El croquis está en la subcarpeta `croquis-2026-08-29/`.

## Qué quedó hecho y se conserva

- **La baraja española** (`components/Carta.tsx`). **Aprobada, no tocar.**
  Espadas y bastos cruzadas, oros y copas en grilla, figuras de gente, y la
  pinta —los cortes del marco: oros 0, copas 1, espadas 2, bastos 3—.
- **Que no scrollee nunca.** Verificado en 390×844, 360×640, 1100×800 y
  1280×620. Las medidas están atadas al ALTO de la ventana (`clamp(…vh…)`),
  no a puntos de corte de ancho: el problema real era la pantalla baja.
- **La zona de diálogo** con alto reservado, colgada del medallón.
- **El aviso de por qué no hay envido** (ver más abajo).
- `lib/ambientes.ts`, `lib/caras.ts`, `components/mesa/{Cara,Medallon,Dialogo}.tsx`.

## Por qué el croquis no se parece a las referencias

No es que esté mal dibujado. Es que **son dos cosas distintas**:

> El croquis es **una interfaz apoyada sobre un fondo de madera**.
> Las referencias son **una foto de una mesa con alguien sentado enfrente**.

Cinco cosas que tienen las referencias y el croquis no:

1. **Hay una cámara.** La mesa se angosta hacia el fondo, las cartas de allá se
   ven más chicas que las de acá, y el canto de la tabla cruza la pantalla en
   primer plano. En el croquis todo está plano y del mismo tamaño.
2. **Se ven tus manos.** En las cuatro referencias hay dedos sosteniendo las
   cartas, recortados por el borde de abajo. Es lo que te sienta en la silla.
3. **La madera tiene historia**: nudos, rayones, manchas, cercos de vaso,
   graffiti. La del croquis es una textura pareja.
4. **Cada objeto está apoyado**, con su sombra de contacto pegada abajo y su
   sombra proyectada. En el croquis flotan.
5. **El fondo tiene profundidad**: capas a distintas distancias y desenfoques
   distintos. En el croquis es una franja plana.

## El plan, por orden de cuánto rinde

### 1. Tus manos sosteniendo las cartas ← lo que más cambia
Es UN elemento y es el que más acerca todo el resto.
- Un SVG de mano: el pulgar cruzando por delante del abanico, los otros dedos
  asomando por detrás y por arriba.
- Recortada por el borde de abajo, grande, en primer plano.
- Las cartas van **entre** los dedos: el pulgar se dibuja encima del abanico y
  los dedos de atrás, debajo. Eso obliga a partir el abanico en dos capas.
- El abanico se cierra un poco más que ahora y sube desde el borde.

### 2. Perspectiva de verdad
- Hoy es un `rotateX(34deg)` sobre un div y las cartas planas encima.
- Las cartas jugadas tienen que escalar según la fila: las del rival más chicas
  (~0,86) que las tuyas (~1,0), y con su propio `rotateX`.
- El canto de la tabla, curvo, cruzando toda la pantalla adelante, con el grosor
  visible. Es lo que separa el "adentro" del "afuera" de la mesa.
- Las juntas entre tablas convergen al punto de fuga.

### 3. La madera con historia
Todo en capas SVG/CSS sobre lo que ya existe en `TexturaMadera`:
- juntas entre tablas (3-4 líneas oscuras que convergen, con bisel claro de un lado)
- una segunda pasada de `feTurbulence` a otra frecuencia
- 5-6 nudos con anillos concéntricos deformados, puestos a mano
- 20-30 rayones finos, cortos, en ángulos distintos, muy tenues
- manchas difusas y dos cercos de vaso
- el borde más gastado y claro, donde apoya la gente

### 4. Luz y sombras de contacto
Un `drop-shadow` no alcanza. Cada objeto necesita **dos** sombras:
- la de contacto: elipse chica y muy oscura, pegada a la base
- la proyectada: elipse difusa, corrida en dirección contraria a la luz

Más viñeta, y una capa cálida en `mix-blend-mode: overlay` sobre todo.

### 5. El ambiente en tres capas
- lejos: cielo y edificios, muy desenfocado
- medio: árboles, fuente, banco
- cerca: respaldos de banco a los costados, enmarcando la escena
- luz moteada entre las hojas

### 6. La libreta y el rival
- Libreta: papel rayado, esquina doblada, birome apoyada en diagonal, números
  manuscritos, sombra abajo.
- Rival: hombros y **brazos apoyados en la mesa**, con las manos sosteniendo sus
  cartas. **Sin cara** —eso ya está decidido—: la cara vive en el medallón.
  Pero **tampoco una silueta**: ver la nota de la segunda pasada abajo.

## Cuidado con el rendimiento

Todo esto es mucho SVG. Para que no se arrastre en un celular viejo:
**la escena estática —madera, ambiente, objetos apoyados— tiene que ser UN solo
SVG que se dibuja una vez**, y solamente las cartas y la interfaz siguen siendo
elementos de React que cambian. Si cada nudo y cada rayón es un elemento que
React vuelve a evaluar en cada jugada, se nota.

## Lo que quedó pendiente de la sesión anterior

### Los nombres nuevos — APLICADOS el 31 de agosto de 2026
Se cambió SOLO el campo `nombre` de `SEMILLAS` en `lib/motor/personalidades.ts`.
**El `id` no se tocó** —es la clave con la que `lib/progreso.ts` guarda las
victorias, y cambiarlo le borra el progreso a quien ya jugó—: verificado, los
diecinueve siguen siendo `luki`, `la-coca`, `el-rulo`… La tabla queda de
registro de qué se llamaba cómo.

| Departamento | `id` | Antes | Ahora |
|---|---|---|---|
| Montevideo | `luki` | Luki | **Luquita** |
| Canelones | `la-coca` | La Coca | **La Porota** |
| San José | `el-rulo` | El Rulo | **El Gallego** |
| Florida | `tito` | Tito | Tito |
| Lavalleja | `la-nelly` | La Nelly | **La Pocha** |
| Maldonado | `marito` | Marito | Marito |
| Rocha | `el-pescador` | El Pescador | El Pescador |
| Treinta y Tres | `don-aparicio` | Don Aparicio | Don Aparicio |
| Durazno | `cachila` | Cachila | Cachila |
| Flores | `el-trinitario` | El Trinitario | **El Rengo** |
| Soriano | `la-rosa` | La Rosa | **La China** |
| Colonia | `el-tucho` | El Tucho | El Tucho |
| Río Negro | `el-fray` | El Fray | **Cacho** |
| Paysandú | `beto` | Beto | Beto |
| Salto | `don-ramon` | Don Ramón | Don Ramón |
| Artigas | `el-piedra` | El Piedra | **Pájaro** |
| Rivera | `joao` | Joao | **El Chicharra** |
| Tacuarembó | `peralta` | El Gaucho Peralta | El Gaucho Peralta |
| Cerro Largo | `el-melo` | El Melo | **El Turco** |

Al aplicarlos se revisaron además las tres descripciones que se sospechaba que
eran chistes con el nombre viejo, y **sólo una lo era de verdad**:
- `el-piedra`, "duro como las amatistas de allá", jugaba con *Piedra* y con
  *Pájaro* no dice nada. Reescrita manteniendo el lugar, que es de donde sale el
  color: "De Bella Unión, tierra de amatistas. Se te escapa justo cuando creías
  tenerlo." —que además le queda al nombre nuevo—.
- `el-fray` ("Sabe esperar…") y `el-trinitario` ("De pueblo chico y mesa
  grande…") **no nombran nada del nombre viejo**: el chiste estaba en el nombre,
  no en el texto. Se dejaron como estaban.
- Los nombres viejos también están en prosa: `README.md`,
  `herramientas/medir-bots.mjs`, `components/mapa/Territorio.tsx` y comentarios
  de `dificultad.test.ts`, `sentido-comun.test.ts`, `lectura.ts` y
  `personalidades.ts`. **Ningún test compara contra el nombre** —todos buscan
  por `id`—, así que el cambio no rompe nada.
- Ojo: **"Cacho" (Río Negro) y "Cachila" (Durazno)** quedan parecidos y son dos
  paradas seguidas de la gira. Está decidido así; si se confunden, avisar.

### "¡Primero va el envido!"
Cuando se canta envido con un truco sin contestar, el canto tiene que decirlo:
- `lib/motor/partida.ts`, caso `"envido"`: si `p.pendiente?.tipo === "truco"`, el
  texto del evento pasa a `"¡Primero va el envido! ¡Envido!"` (y su variante para
  real y falta). Es la misma condición que ya guarda `trucoEnEspera`.
- `lib/motor/versos.ts`: familia nueva marcada `soloSobreTruco`, con una copla
  que cierre en "primero va el envido". El filtro ya existe (`soloSubiendo` /
  `soloRespondiendo` en `versoDelCanto`): se suma un flag más al mismo `filter`.
- Vale para los dos lados: lo cantes vos o lo cante el bot.
- Tests en `partida.test.ts` (el texto) y `versos.test.ts` (que no salga sin
  truco pendiente). Ojo que `versos.test.ts` exige que cada verso nombre su
  canto: la copla nueva tiene que decir "envido".

### Repasar los 19
Las 7 escenas y las 19 caras están escritas pero sólo se miraron cuatro
departamentos (Montevideo, Rocha, Cerro Largo, Tacuarembó, Salto, Canelones).
Hay que mirar los 19 antes de darlos por buenos.
