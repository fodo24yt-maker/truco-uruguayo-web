# El sonido: qué hay que grabar

> **Estado al 10/9/2026: no hay un solo archivo de audio en el proyecto.**
> Lo que sí hay son los ajustes (`lib/sonido.ts` y el panel del engranaje): las
> cuatro barras andan y lo que se elige queda guardado. Este documento es la
> lista de lo que falta para que suene algo.

Se escribe en este orden a propósito. Las voces las van a poner Santiago y unos
amigos, o sea que grabar es juntar gente un rato: lo peor que puede pasar es
llegar a esa tarde sin saber cuántas tomas son ni cómo se llama cada archivo, y
tener que volver a juntarla porque faltaban dos.

**El total son 292 archivos**: 266 voces, 9 músicas y 17 efectos.

---

## 1. Los cuatro canales

| canal | qué manda | arranca en |
|---|---|---|
| **General** | multiplica a los otros tres | 100 |
| **Música** | el fondo del ambiente | 60 |
| **Voces** | los cantos de los rivales | 100 |
| **Efectos** | las cartas, la mesa, los botones | 80 |

Más un interruptor de **silenciar todo**, que no baja ningún volumen: los deja
donde estaban para que al desprenderlo vuelva todo como estaba.

No arrancan los cuatro en 100 a propósito: **las voces son las que traen la
información** —"¡Truco!" es lo que acaba de pasar— y la música es fondo. Están
separados porque se quieren cosas distintas de cada uno: en el ómnibus se baja
la música y se dejan las voces.

Todo eso ya está hecho y probado en `lib/sonido.test.ts`.

---

## 2. Las voces: 14 cantos por personaje

Salen uno por uno de `lib/motor/partida.ts`, que es el único lugar donde se arma
una línea hablada. **La lista está cerrada**: no hay ninguna otra frase que un
rival pueda decir.

| archivo | lo que se dice | cuándo |
|---|---|---|
| `envido.m4a` | ¡Envido! | |
| `real-envido.m4a` | ¡Real envido! | |
| `falta-envido.m4a` | ¡Falta envido! | el número de la falta sale en pantalla, no se dice |
| `truco.m4a` | ¡Truco! | |
| `retruco.m4a` | ¡Retruco! | |
| `vale-cuatro.m4a` | ¡Vale cuatro! | |
| `flor.m4a` | ¡Flor! | también cuando contesta *"yo también tengo"* |
| `con-flor-envido.m4a` | ¡Con flor envido! | |
| `contraflor-al-resto.m4a` | ¡Contraflor al resto! | |
| `quiero.m4a` | ¡Quiero! | sirve para envido, truco **y** flor |
| `no-quiero.m4a` | No quiero | envido y truco |
| `con-flor-me-achico.m4a` | Con flor me achico | **el "no quiero" de la flor**, que no es "no quiero" |
| `mazo.m4a` | Me voy al mazo | |
| `son-buenas.m4a` | Son buenas | el pie, cuando su tanto no le gana al del mano |

### Tres cosas que no estaban en la lista original

- **`son-buenas` faltaba**, y se dice en casi todas las manos con envido querido.
- **El "no quiero" de la flor faltaba**, y no es el mismo audio: en la mesa se
  dice **"con flor me achico"**. Son dos grabaciones.
- **"Flor en mesa" y "envido en mesa" NO son cantos.** Son los rótulos que el
  juego escribe sobre la mesa al cerrarse la mano (el rediseño del 10/9/2026):
  nadie los dice. Si tienen que sonar, el que suena es el efecto
  `enseñar-cartas`.

### Los números NO se graban, y por qué

El envido va de **0 a 37** y la flor de **20 a 47**: son 48 números distintos
que se pueden llegar a cantar. Grabarlos por personaje serían **912 archivos de
más** —62 tomas por persona en vez de 14— y grabarlos una sola vez en una voz
neutra suena peor que no tenerlos: el canto lo dice el personaje y el número,
otra persona.

El número ya se lee en pantalla, que es donde está desde siempre.

Es la misma decisión que se tomó el 10/9/2026 al borrar `lib/motor/versos.ts`
con sus 17 coplas, y ahí quedó escrito el motivo: *"el día que haya voces,
diecisiete coplas son diecisiete grabaciones por rival"*.

---

## 3. Los 19 rivales

> ### ⚠ La carpeta se llama como el `id`, y en 9 de los 19 el `id` NO se parece al nombre
>
> La Porota es `la-coca`, El Gallego es `el-rulo`, La Pocha es `la-nelly`, El
> Rengo es `el-trinitario`, La China es `la-rosa`, Cacho es `el-fray`, Pájaro es
> `el-piedra`, El Chicharra es `joao` y El Turco es `el-melo`.
>
> **Y no se pueden renombrar.** Esos `id` son la clave con la que
> `lib/progreso.ts` guarda las victorias de la gira: cambiar uno le borra el
> progreso a quien ya jugó. Está avisado en `CLAUDE.md`. **Copiar la columna de
> la izquierda tal cual.**

| # | carpeta (`id`) | nombre | departamento | ★ | voz | quién graba | estado |
|---|---|---|---|---|---|---|---|
| 1 | `luki` | Luquita | Montevideo | ★ | varón, adolescente | | ☐ |
| 2 | `la-coca` | **La Porota** | Canelones | ★ | **mujer** | | ☐ |
| 3 | `el-rulo` | **El Gallego** | San José | ★ | varón | | ☐ |
| 4 | `tito` | Tito | Florida | ★★ | varón | | ☐ |
| 5 | `la-nelly` | **La Pocha** | Lavalleja | ★★ | **mujer** | | ☐ |
| 6 | `marito` | Marito | Maldonado | ★★ | varón, joven | | ☐ |
| 7 | `el-pescador` | El Pescador | Rocha | ★★ | varón | | ☐ |
| 8 | `don-aparicio` | Don Aparicio | Treinta y Tres | ★★★ | varón mayor | | ☐ |
| 9 | `cachila` | Cachila | Durazno | ★★★ | varón | | ☐ |
| 10 | `el-trinitario` | **El Rengo** | Flores | ★★★ | varón | | ☐ |
| 11 | `la-rosa` | **La China** | Soriano | ★★★ | **mujer** | | ☐ |
| 12 | `el-tucho` | El Tucho | Colonia | ★★★★ | varón | | ☐ |
| 13 | `el-fray` | **Cacho** | Río Negro | ★★★★ | varón | | ☐ |
| 14 | `beto` | Beto | Paysandú | ★★★★ | varón | | ☐ |
| 15 | `don-ramon` | Don Ramón | Salto | ★★★★ | varón mayor | | ☐ |
| 16 | `el-piedra` | **Pájaro** | Artigas | ★★★★ | varón | | ☐ |
| 17 | `joao` | **El Chicharra** | Rivera | ★★★★ | varón, con portuñol | | ☐ |
| 18 | `peralta` | El Gaucho Peralta | Tacuarembó | ★★★★★ | varón mayor | | ☐ |
| 19 | `el-melo` | **El Turco** | Cerro Largo | ★★★★★ | varón | | ☐ |

**Tres son mujeres**: La Porota, La Pocha y La China.

**Por dónde conviene empezar: por `luki`.** Es el primero de la gira, o sea el
que escucha todo el mundo, y es contra el que se prueba que el sistema anda
antes de grabar 252 tomas más.

**14 × 19 = 266 archivos.**

### Cómo decirlos

Las estrellas no son sólo dificultad, son carácter, y eso se escucha:

- **★1-2 canta lo que tiene.** Luquita no sabe mentir; si canta truco, tiene
  truco. Se dice derecho, sin doblez.
- **★3-4 ya te está midiendo.** Más lento, más tranquilo, con la pausa antes del
  canto.
- **★5 te canta truco con un cuatro mirándote a los ojos.** El Turco tiene que
  sonar exactamente igual cuando miente que cuando no. Si se le nota, deja de
  ser ★5.

Y hay una sola regla técnica: **que las 14 de un mismo personaje suenen a la
misma tarde** —el mismo micrófono, la misma distancia, el mismo cuarto—. Catorce
tomas de la misma persona grabadas en dos lugares distintos suenan a dos
personas.

---

## 4. La música: 9 pistas

Van atadas a los **7 ambientes que ya existen** en `lib/ambientes.ts`, más la
portada y el mapa. La música cambia al cambiar de departamento, igual que
cambia la escena.

| archivo | el lugar | departamentos |
|---|---|---|
| `musica/bar-ciudad.m4a` | un boliche de barrio, de noche | Montevideo |
| `musica/feria.m4a` | la feria, al mediodía | Canelones |
| `musica/campo.m4a` | el galpón, a la tarde | San José, Florida, Durazno, Flores, Treinta y Tres, Cerro Largo |
| `musica/sierra.m4a` | las sierras, al caer el sol | Lavalleja |
| `musica/costa.m4a` | la rambla, a la tardecita | Maldonado, Rocha |
| `musica/litoral.m4a` | el río, contra la luz | Colonia, Soriano, Río Negro, Paysandú, Salto |
| `musica/norte.m4a` | el norte, con el sol alto | Rivera, Artigas, Tacuarembó |
| `musica/portada.m4a` | la pantalla de inicio | — |
| `musica/gira.m4a` | el mapa del tesoro | — |

Tienen que **cerrar sobre sí mismas**: se repiten mientras dure la partida, que
pueden ser diez minutos. Una pista que al volver al principio da un salto se
escucha el salto veinte veces.

**Se puede arrancar con tres** —`portada`, `campo` y `gira`— y crecer después:
`lib/ambientes.ts` ya sabe qué ambiente le toca a cada departamento, así que
agregar la cuarta no toca código.

---

## 5. Los efectos: 17

La prioridad es para poder empezar por ocho y no por diecisiete.

| archivo | cuándo suena | prioridad |
|---|---|---|
| `efectos/repartir.m4a` | cada carta que cae en el reparto | ★★★ |
| `efectos/tirar-carta.m4a` | apoyás una carta en la baza | ★★★ |
| `efectos/boton.m4a` | cualquier botón de la interfaz | ★★★ |
| `efectos/gana-partida.m4a` | llegaste a 30 | ★★★ |
| `efectos/mezclar.m4a` | arranca una mano nueva | ★★ |
| `efectos/voltear.m4a` | se dan vuelta tus tres cartas | ★★ |
| `efectos/gana-baza.m4a` | te llevás la baza | ★★ |
| `efectos/pierde-baza.m4a` | se la lleva él | ★★ |
| `efectos/gana-mano.m4a` | se cierra la mano a tu favor | ★★ |
| `efectos/pierde-mano.m4a` | se cierra en contra | ★★ |
| `efectos/pierde-partida.m4a` | te ganaron | ★★ |
| `efectos/premio.m4a` | ganás el objeto de un departamento | ★★ |
| `efectos/desbloqueo.m4a` | se abre una parada nueva en el mapa | ★★ |
| `efectos/muestra.m4a` | la muestra se mete abajo del mazo | ★ |
| `efectos/parda.m4a` | empardaron la baza | ★ |
| `efectos/enseñar-cartas.m4a` | se apoyan las cartas del envido o la flor | ★ |
| `efectos/palito.m4a` | un punto en el anotador | ★ |

**`repartir` y `tirar-carta` conviene grabarlos tres veces cada uno** y que el
juego elija al azar. Son los dos que más suenan —seis cartas por mano— y un
mismo golpe repetido seis veces seguidas se nota enseguida. Se numeran
`tirar-carta-1.m4a`, `-2`, `-3`.

---

## 6. Cómo se entregan

```
public/audio/
  voces/<id>/<canto>.m4a       voces/luki/truco.m4a
  musica/<ambiente>.m4a        musica/bar-ciudad.m4a
  efectos/<clave>.m4a          efectos/tirar-carta.m4a
```

- **Un solo formato: `.m4a` (AAC).** Suena en el WebView de Android, en los
  cuatro navegadores y en un iPhone. Dos formatos serían el doble de archivos
  que grabar por una compatibilidad que no falta. El día que el peso apriete se
  pasa a Opus, y como la extensión sale de un solo lugar, es un cambio de una
  línea.
- **Mono, 64 kbps para las voces y los efectos.** Es una voz hablada en un
  celular: estéreo no aporta nada y duplica el peso. La música sí en estéreo.
- **Nombres en minúscula, sin tildes ni espacios**, tal cual la tabla.
- **Las tomas crudas no van al repositorio.** Los WAV, los descartes y el
  proyecto del editor van a `audio-fuente/`, que está en `.gitignore`. Al repo
  van sólo los `.m4a` finales, porque este repo es público y de acá sale la web.
- **Un silencio corto al principio y al final de cada toma**, y cortado parejo:
  medio segundo de aire antes de "¡Truco!" se siente como que el juego se
  colgó.

### El peso, que es la decisión escondida

**El APK hoy pesa 6,8 MB.**

| | peso |
|---|---|
| 266 voces (1,5 s, mono 64 kbps) | ~3,5 MB |
| 17 efectos | ~0,2 MB |
| **9 músicas de 2 minutos** | **~13 MB** |
| **9 músicas de 40 segundos** | ~4,5 MB |

O sea que **la música sola puede más que duplicar el tamaño de la app**. Las
voces y los efectos, los 283 archivos juntos, suman menos de 4 MB y no son el
problema.

Las tres salidas, para cuando llegue el momento:

1. **Loops cortos y bien cerrados** (30-40 s). Es la buena: una música de fondo
   que se repite no necesita dos minutos.
2. **Menos bitrate en la música.** 80 kbps alcanza para algo que suena atrás.
3. **Que la música no viaje en el APK** y se baje la primera vez. Es la que más
   complica: hoy la app no le pide nada a nadie y eso está escrito en la
   política de privacidad.

### La CSP no hay que tocarla

`app/layout.tsx` y `public/_headers` declaran `default-src 'self'` y **no**
declaran `media-src`. La regla de CSP es que lo que no está declarado cae en
`default-src`, así que el audio del propio sitio **ya está permitido** y el de
cualquier otro lado **ya está bloqueado**. No hay nada que aflojar.

Lo que sí va a haber que agregar el día que existan los archivos es su
`Cache-Control` en `public/_headers`, al lado del bloque que ya tiene
`/escenas/*`. Una semana y **sin `immutable`**, por lo mismo que las texturas:
el nombre no lleva huella digital y si se regraba una voz hay que poder
reemplazarla.

---

## 7. Lo que falta del lado del código

Nada de esto existe todavía, y ninguna de las tres cosas se puede escribir bien
sin tener el primer archivo en la mano:

1. **El que reproduce.** Un solo `AudioContext` para todo el sitio, con
   `volumenReal()` de `lib/sonido.ts` ya escrito y probado. Ojo con una cosa:
   los navegadores no dejan sonar nada hasta que la persona tocó la pantalla, o
   sea que la música no puede arrancar sola al cargar la portada.
2. **De qué evento sale cada voz.** Hoy `Evento` en `lib/motor/partida.ts` es
   `{ quien, texto }` y el texto es castellano —"¡Truco!"—. Mirar el texto para
   decidir qué audio suena es frágil: la forma buena es agregarle un campo
   `voz?: ClaveVoz` al lado, donde ya se arma la frase. Es un campo opcional en
   una interfaz: no cambia ninguna regla ni ningún test.
3. **Qué pasa con un rival sin voz grabada.** Tiene que poder faltar: se sube
   `luki`, suena `luki`, y los otros dieciocho siguen mudos sin romper nada.
   Eso es lo que permite ir grabando de a uno en vez de esperar a tener los 266.
