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
