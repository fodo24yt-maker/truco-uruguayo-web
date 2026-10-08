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

## 2026-10-07 — Medir primero: los píxeles son del camino Vulkan, y lo lento es rasterizar

**Sesión cortada por límite de uso, sin cierre completo (ver Pendiente).**

Método pedido por Santiago: medir → hipótesis → arreglo → medir → informe.
Santiago toca, Claude mide.

### Instrumentos nuevos
- `capacitor.config.ts`: el inspector se prende SÓLO con `INSPECCIONAR_WEBVIEW=1`
  (`celular-usb.mjs --apk --inspeccionable`); el archivo dice `false` siempre.
- `herramientas/puente-devtools.mjs`: el puente sacado de `rig-celular.mjs`; elige
  el socket por el PID de la app (no se mete en el WebView de los anuncios).
- `herramientas/medir-celular.mjs`: `--sesion` (cuadros por screencast, Event
  Timing, LoAF, gfxinfo por tramo, memoria del renderer, logcat; se maneja con
  `control.txt`: tramo / rama / traza / nota / parar), `--analizar`, `--pixeles`.
  **Usar `--jpeg 90`**: en PNG los cuadros llegan en ráfagas con ~1 s vacío.

### Lo medido
- **Arranque**: la app está lista a los ~2,4 s; la pantalla de carga espera
  4–6,5 s MÁS a AdMob (anuncios listos a 6,6–8,9 s). Decisión pendiente.
- **Primera vez en cada pantalla**: un cuadro de 1,1–1,3 s (Davey en RenderThread),
  sólo la primera visita; después 0,1–0,3 s. Hipótesis L9 (shaders/pipelines de
  la GPU). El "ensayo general" del 3/10 se descartó midiendo en la COMPU: re-probar
  en el teléfono.
- **Lentitud general**: 55–65% de cuadros tarde, p50 ~45 ms. El toque se atiende
  rápido; lo lento es **rasterizar en la GPU** (hasta 74 ms) y la espera del
  RenderThread (hasta 124 ms). El JS no es.
- **Sospecha de Santiago ("es una web adaptada")**: 0 recargas en 20 navegaciones.
  El agente encontró `Cache-Control: no-cache` de Capacitor, precarga que vence a
  los 5 min (staleTime 300) y sin caché de V8: chicos, pendientes de medir.
- **L2 (sacar `.escena > * {opacity:.999}`) REFUTADA**: no acelera (p90 peor) y la
  basura se va a toda la mesa. El arreglo del 8/9 se queda.
- **P4 CONFIRMADA**: con `debug.hwui.renderer=skiagl` (OpenGL) Santiago no vio
  píxeles; al volver a Vulkan volvieron. OpenGL es algo más lento (72% tarde).
- **P5 REFUTADA**: `debug.hwui.use_partial_updates=false` no cambia nada.
- Las dos propiedades se volvieron a vacío y se comprobó `Pipeline=Skia (Vulkan)`.
- La basura: pedazos color madera/violeta DEBAJO de capas animadas (palma, mesa,
  mate); las cartas salen limpias; también cuando juega el bot.

### Arreglado
- `app/jugar/mesa/page.tsx`: la carta enseñada volvía al abanico durante el
  barrido (`enseñadas && !barrida`). Sin probar en el teléfono todavía.

### Pendiente (en orden)
1. **Reinstalar el APK normal** (el instalado tiene el inspector): `node
   herramientas/celular-usb.mjs --apk`, aceptar el cartel de MIUI.
2. Revisión de seguridad (`security-review`, `17-mobile-security`, `09-web-security`),
   `npm test`, `tsc`, guardianes de Playwright: NO se corrieron.
3. Próximo experimento: rama **M0** (animaciones de 1 ms) para ver si la basura sale
   de las capas animadas; después P6: WebView en `LAYER_TYPE_HARDWARE` (otro camino
   de dibujo) y C1/S0/R0 para la velocidad.
4. Pendiente de Santiago: con envido/flor del rival y "me voy", las cartas
   enseñadas caen corridas, sobre el mazo.
5. Decidir si la pantalla de carga sigue esperando a AdMob.
6. Bug menor visto: el `setInterval` de 250 ms de `PantallaCarga` no se apaga.

## 2026-10-03 — La pantalla de carga, y la mesa que entra entera

**El pedido.** Santiago notó que al tocar Partida rápida la mesa tardaba unos
segundos y se veía mal mientras tanto, **sobre todo en la primera partida**.
Propuso una pantalla de carga al abrir la app que precargue la mesa. Eligió:
pantalla nueva dibujada por código, con una barrita animada; arreglar esto
primero y ver los píxeles después; y aprobó el diseño con captura antes del
resto.

### Lo que se encontró leyendo el código (antes de tocar nada)

- **La pantalla del logo que ya existía es el splash de Android** (tema
  `Theme.SplashScreen` + `@capacitor/splash-screen`): 400 ms fijos y 200 ms de
  fundido. No carga nada ni espera a nadie.
- **En la primera partida, la app le pedía a AdMob el intersticial en el mismo
  toque que entraba a la mesa**, y el plugin carga en el HILO PRINCIPAL de
  Android (`AdInterstitialExecutor.java`), el que también dibuja. La primera
  carga del proceso además arma el navegador interno de los anuncios. Encaja
  con "sobre todo la primera".
- **Las texturas de la mesa recién se pedían con la escena ya montada**: color
  liso y la textura "saltando" encima. Un segundo redibujado de toda la escena
  justo después del cambio de pantalla, que es el terreno del bug de los píxeles.

### Lo que se hizo

- **`components/PantallaCarga.tsx`**: sólo en la app. La marca, el nombre y una
  barrita que mueve el CSS (anda antes del JavaScript). Mínimo 800 ms, máximo
  4 s, y la red del CSS la esconde a los 6 s aunque no corra el JavaScript. Se
  va de golpe, sin fundido: una capa de pantalla completa que se funde no está
  medida contra el bug de los píxeles. `capacitor.config.ts` gana
  `android.backgroundColor` oscuro: si el splash se iba antes de que la página
  pintara, asomaba blanco.
- **`lib/precarga.ts`**: qué precargar (el rival de la Partida rápida y la
  próxima parada de la Gira, como mucho 2: cada departamento son ~10,5 MB
  decodificado y los 19 serían ~200 MB), bajarlo y decodificarlo, y esperar el
  código de Next. Como mucho 3 departamentos en memoria.
- **La mesa entra entera**: antes del primer reparto, y al cambiar de rival,
  espera a que sus imágenes estén decodificadas (tope 1,2 s). El mapa de la
  Gira precarga la escena al abrir la ficha de una parada, y el menú de jugar
  las probables (en la web es lo único que se agrega).
- **Los anuncios**: el intersticial se carga al arrancar (durante la pantalla
  de carga) y no en la primera partida. Nueva perilla
  `SEGUNDOS_SIN_CARGAR_AL_ENTRAR = 8`: nada se carga en los 8 s siguientes a
  entrar a una partida, **contados desde que se cierra el anuncio si hubo uno**
  (si no, un anuncio de 15 s agotaba la ventana y la carga caía al entrar). El
  video que la persona pidió en el diálogo no espera.

### Lo que se midió (y lo que engañó)

**La herramienta mintió dos veces y las dos se agarraron mirando, no
creyendo.**

1. `mirar-carga.mjs` decía que al entrar a la mesa se bajaban cuatro .js. Un
   diagnóstico por CDP mostró que el prefetch termina a los **~125 ms** de abrir
   (en frío y en caliente) y que al entrar no se baja nada: el evento `request`
   de Playwright también avisa de pedidos que el navegador resuelve con su
   caché. La herramienta ahora mide por CDP y separa caché de descarga.
2. "No se pudo cambiar de rival": la herramienta elegía rival menos de 1 s
   después de entrar y el portero lo tomaba por doble toque. Era el portero
   haciendo su trabajo.

Y una que sí era real: **`router.prefetch` de Next no devuelve promesa**, así
que la pantalla no sabía cuándo terminaba. `esperarCodigo` mira las descargas
(`PerformanceObserver`) hasta ver la PÁGINA de la mesa y de la Gira
(`…__PAGE__.txt`) y la ráfaga que sigue. Esperar "a la red quieta" no
alcanzaba (al principio está quieta) ni esperar cualquier archivo de la ruta
(el primero es el índice `__next._tree.txt`). Si Next cambia ese nombre, la
espera se va al tope de 2,5 s y `mirar-carga` lo avisa.

**El código de la pantalla viajaba en la web** dentro del paquete que la web
baja en cada página, aunque nunca se montara. Ahora `PantallaCarga` devuelve
`null` si no es la app, con la condición fijada al compilar: el minificador la
tira. Verificado con `grep` sobre `out/`.

`mirar-carga.mjs`, TODO OK en frío y en caliente:

    la pantalla viene en el HTML y se va a los ~1000 ms
    ir a la mesa no baja nada nuevo
    Partida rápida: las 4 imágenes listas en su primer cuadro
    cambio de rival a OTRO departamento (no precargado): las 2 listas
    Gira, desde la ficha (Gira entera ganada, sin precarga de arranque): listas
    sin JavaScript: a los 6 s se esconde sola

**Sabotajes que se agarraron:** sacarle la espera de la escena al cambio de
rival (`mirar-carga`: "2 de 2 imágenes NO estaban listas"); sacarle la ventana
al gestor (5 tests); contar la ventana desde el toque y no desde el cierre (2
tests).

### Estado

`npm test` **313/313** · `tsc` limpio · `mirar-carga`, `mirar-app-compilada`,
`mirar-web`, `mirar-mesa`, `mirar-mesa-nueva` y `mirar-anuncios` (21/21)
**TODO OK** · la web no trae ni la pantalla ni código de anuncios.

Las herramientas que miran la app (`mirar-app-compilada`, `mirar-anuncios`,
`rig-celular`) esperan a que se vaya `[data-pantalla-carga]` antes de medir.

Seguridad: `security-review` sin hallazgos (una nota menor, arreglada: un
`new URL` fuera del `try` en `esperarCodigo`); `09-web-security` limpio (CSP
igual, sin sumideros, las 38 rutas de imagen son fijas, el progreso se lee
saneado); `17-mobile-security` limpio (sólo cambió el color del WebView; ni
origen, ni depuración, ni permisos, ni nada nativo). Barrido de datos
sensibles limpio; el índice de Git, vacío.

### Pendiente

1. **Probarlo en el teléfono**: `node herramientas/celular-usb.mjs --apk`. La
   primera partida tiene que entrar sin demora ni texturas que salten.
2. **Después, los píxeles**: si siguen, sesión con el cable y `rig-celular.mjs
   --a-mano` (Santiago toca, Claude mide). Lo de hoy saca del cambio de escena
   dos cosas que coincidían con él; no está probado que sean la causa.
3. Si un día la pantalla de carga empieza a tardar siempre 2,5 s, es que Next
   cambió el nombre `__PAGE__` (`mirar-carga.mjs` lo dice).

## 2026-10-02 (segunda pasada) — Tiempos de anuncios a 3 y 7, y el bug de los píxeles que volvió

**Tiempos.** Santiago lo probó en el teléfono: seis minutos era mucho.
`MINUTOS_ENTRE_ANUNCIOS` 6→3 y `MINUTOS_SIN_INTERSTICIAL_TRAS_VIDEO` 15→7. La
primera partida sigue sin anuncio. Los tests y `mirar-anuncios.mjs` ahora se
escriben EN FUNCIÓN de las constantes (la herramienta las importa de
`lib/anuncios.ts`), así un ajuste futuro no rompe nada; un test nuevo exige que
la ventana del video sea mayor que el tope. Legales y README dicen "tres
minutos". `npm test` 299/299, `tsc` limpio, `mirar-anuncios` 21/21.

**El bug de los píxeles (color de la pantalla anterior) volvió, dice Santiago.**
Revisado, sin teléfono:

- Las cuatro reglas del arreglo (`.mapa-gira > *`, `.escena > *`,
  `.pantalla-fija .carta` y `.marca`) **siguen aplicadas**: medido con
  `getComputedStyle` en el build de la app, simulando el teléfono, entrando
  directo y navegando. Todas en 0.999. Nada de hoy tocó `Carta`, `Marca`, el
  mapa ni la escena.
- **Desde el arreglo del 10/9 a la mañana, nadie volvió a medir en el teléfono.**
  El 10/9 a la tarde cambió la portada (la marca, "no medida") y la mesa, y lo
  dejó como pendiente número uno. Eso está commiteado.
- Lo de hoy que cambia pantallas medidas: en la mesa se fue la franja del
  banner (la escena quedó más alta) y en la app los candados cambian textos de
  la portada y del menú de jugar después de cargar.
- **Sospechoso nuevo y fuerte: el SDK de AdMob.** Carga los anuncios en WebViews
  propios dentro del mismo proceso, que comparten GPU y memoria de mosaicos con
  el juego. El modelo del bug es "un mosaico viejo que se reusa": más presión de
  memoria encaja.

**Pendiente:** medir con `rig-celular.mjs --a-mano` (Santiago toca, Claude
mide). Primero, que Santiago diga en qué pantalla lo vio y si fue después de un
anuncio; una prueba barata sin cable es jugar en modo avión (sin anuncios
cargados) y ver si aparece.

## 2026-10-02 — Los anuncios: sin banners, intersticial con tope y videos que desbloquean

Cambio de planes en la monetización, y la primera vez que la app tiene AdMob de
verdad. **Hasta hoy no había una sola línea de AdMob**: sólo los tres huecos de
`EspacioAnuncio.tsx`. El pedido de Santiago venía con todas las reglas escritas;
lo que sigue es lo que hubo que decidir encima.

### LO QUE QUEDÓ

- **Banners: ninguno.** Se borró `EspacioAnuncio.tsx` con sus tres huecos.
  `mirar-web.mjs` dio vuelta el guardián: ahora falla si ENCUENTRA un
  `[data-anuncio]`. El pie pasó adentro de `PieLegales` (sin el hueco, en el 404
  quedaba una franja de madera vacía).
- **Intersticial sólo al ENTRAR a una partida**, con tope de 6 minutos desde el
  último anuncio mostrado, 15 sin intersticial después de un video, y la primera
  partida de cada sesión nunca.
- **Video con recompensa** para desbloquear para siempre el anotador, y la Gira
  nacional (que también se abre acertando los 12 ejercicios de Aprender).
- **La web, libre**: sin anuncios ni candados. No es que los esconda: el build
  de la web no los TIENE (`NEXT_PUBLIC_DESTINO`, verificado con `grep` sobre
  `out/`: cero archivos).
- **Un único punto de entrada**, `lib/entrada.ts`, y un gestor único,
  `lib/anuncios.ts`, con las perillas arriba. El README → *Publicidad* tiene la
  tabla de archivos y de perillas, y la checklist de Play Console y de AdMob.

### LAS DECISIONES DE SANTIAGO (preguntadas, no supuestas)

1. Web libre, candados sólo en la app (en la web no hay video posible).
2. **La Gira se bloquea para todos**, también para quien ya la jugó. Sin migración.
3. Un ejercicio cuenta cuando se **acierta** al menos una vez.
4. En la Gira el intersticial sale al tocar "Jugar" en la parada, no al entrar al mapa.
5. El pedido decía "la primera partida no lleva anuncio" Y "el reloj arranca al
   abrir la app": se aplican las dos. Diez minutos en Aprender y después la
   primera partida: sin anuncio.
6. **Cambiar de rival a mitad de partida (medallón) SÍ pasa por el tope**: la
   partida a medias se da por terminada al ELEGIR rival, y si toca, el anuncio
   sale entre las dos. Con "Volver" no pasa nada.
7. **Sin internet: no se toca.** Ver pendientes.
8. Los IDs reales estaban en un `IDS ADS.md` suelto en la raíz que **Git no
   ignoraba**. Se pasaron a `android/admob.properties` (ignorado, verificado con
   `git check-ignore`) y el `.md` se borró. `app-ads.txt` NO se creó: lleva el
   `pub-…` y es público; queda en la checklist para cuando publique.

### TRES COSAS DEL PLUGIN QUE MANDAN CÓMO ESTÁ ESCRITO

Leídas en el Java de `@capacitor-community/admob@8.1.0`, no supuestas:

1. **`showRewardVideoAd()` sólo resuelve si se gana la recompensa.** Si el
   usuario cierra antes, la promesa queda colgada para siempre. Por eso el gestor
   va por EVENTOS, y la recompensa se da sólo en `onRewardedVideoAdReward`.
2. **Precargar "apenas se muestra" el anterior rompía el plugin**: guarda los
   anuncios en un mapa por ID de unidad y al cerrar BORRA la entrada, o sea el
   nuevo. Se precarga al cerrarse o fallar. No cambia nada: el próximo no puede
   salir antes de 6 minutos. Se le dijo a Santiago antes de decidirlo.
3. Sin anuncio cargado, `show` rechaza y emite "falló la carga", no "falló al
   mostrar". El vigilante de 3 s cubre el resto, y volver a la app con un anuncio
   "abierto" sin aviso de cierre (`singleTask` + reabrir desde el ícono) lo da por
   cerrado a los 1,5 s.

### LOS IDs: UN ARCHIVO DE GRADLE Y UN PLUGIN DE DIEZ LÍNEAS

El JavaScript es el mismo en debug y en release (se compila antes que Gradle), y
los IDs no. Así que los decide `android/app/admob.gradle` (`buildConfigField` +
`manifestPlaceholders`) y `ConfigAnunciosPlugin.java` se los pasa a la web. El
JS no lleva ningún ID: verificado sobre `out-app/` y dentro del APK.

**El release no compila con IDs equivocados.** Se probó en cuatro casos —la
plantilla, los de prueba, sin archivo, y comillas metidas para inyectar Java—:
los cuatro frenan con un mensaje que dice qué hacer. Con los reales pasa, y el
`BuildConfig` de release los lleva.

`play-services-ads` quedó anclado en **25.4.0** en `variables.gradle`: el plugin
pide `25.4.+`, o sea un build que no se puede reproducir.

### LO QUE SE MIDIÓ

- `npm test` **298/298** (eran 237). Saboteados a propósito: sin la regla de la
  primera partida, sin la ventana de 15, dando la recompensa al cerrar, un enlace
  suelto a `/anotador`, un reparto sin portero y un ejercicio sin id. **Los seis
  se agarran.**
- **`herramientas/mirar-anuncios.mjs`** (nueva): recorre cada regla en un
  navegador con una red de anuncios de mentira y `page.clock`. **21/21.**
  Saboteado (enlaces que se saltean el portero): falla en "a los 7 minutos".
  La red de mentira existe sólo en `next dev`: cero rastros en los builds.
- `mirar-web`, `mirar-mesa`, `mirar-mesa-nueva` y `mirar-app-compilada`: TODO OK.
  Con los candados a la vista, ninguna pantalla fija scrollea en cinco tamaños.
- APK de debug compilado (14 MB). `out-app` pasó de 6,0 a 6,1 MB.

### DOS TROPIEZOS DE LA SESIÓN

1. **Se me coló un `git rm --cached`** al borrar `EspacioAnuncio.tsx`: dejó el
   borrado preparado en el índice. Se deshizo en el acto con `git restore
   --staged` y se le contó a Santiago. Quedó en la memoria: borrar es `rm`.
2. **El `grep` de esta terminal saltea los archivos ignorados por Git.** Una
   búsqueda de fugas con él da "limpio" sin haber mirado `admob.properties`. Para
   eso, `/usr/bin/grep`. Anotado en `CLAUDE.md`.

Y uno de la prueba, no de la app: con el reloj de Playwright el tiempo NO corre
solo, así que la traba de 1 s contra el doble toque no se vencía nunca y el
toque siguiente se tomaba como doble. Se arregló en la herramienta.

### LA REVISIÓN DE SEGURIDAD

- **`security-review`**: cero hallazgos HIGH o MEDIUM. Revisado: inyección en el
  Java generado y en el manifest (cerrada por las regex), fuga de IDs (cero en
  todo lo que Git ve y en toda la historia), que el motor simulado no viaje,
  sumideros de HTML (ninguno), URLs armadas con `?depto=` (validadas dos veces),
  el `sanear` de las dos claves nuevas, y las dependencias (sin scripts de
  instalación).
- **`09-web-security`**: nada. La CSP y `_headers` no cambiaron un byte.
- **`17-mobile-security`**: nada explotable. El SDK agrega los permisos `AD_ID`,
  `ACCESS_ADSERVICES_*` (3), `FOREGROUND_SERVICE` y `WAKE_LOCK`, y componentes
  exportados que van protegidos por permisos del sistema (`BIND_JOB_SERVICE`,
  `DUMP`). Los anuncios corren en su propia actividad, sin acceso al puente de
  Capacitor. Dentro del APK: el editor real en 0 archivos, rutas de la máquina en 0.
- **Aparte, no de esta sesión:** `npm audit` marca una vulnerabilidad CRÍTICA en
  `next` 16.3.3 (RCE en `next/og`). Probablemente no aplica a un export
  estático, pero no está verificado. Se le avisó a Santiago.

### ESTADO AL CERRAR

`npm test` **298/298** · `tsc` limpio · los dos builds OK · los cinco guardianes
de Playwright TODO OK · APK de debug compila · `git diff --cached` vacío.

**Sin commitear.**

### PENDIENTE

1. **Probar en el teléfono**, que no estaba enchufado: `node herramientas/celular-usb.mjs --apk`
   y la checklist manual (anuncios de prueba de Google reales, sin internet,
   atrás con el diálogo abierto, mandar la app al fondo con un anuncio, matar la
   app después de desbloquear).
2. **Publicar la web con la política nueva ANTES de repartir un APK con
   anuncios**: la página prometía actualizarse primero.
3. Lo de las consolas (README → *Publicidad*): mensaje GDPR en AdMob, dispositivo
   de prueba, declaraciones de Play, `app-ads.txt` cuando se publique.
4. **Sin internet = sin intersticiales.** Decidido no tocarlo: el tope se cuenta
   desde el último anuncio MOSTRADO, así que al volver la conexión la próxima
   partida ya lleva el suyo. Revisar con números cuando la app esté publicada.
5. La vulnerabilidad de `next` 16.3.3, que es aparte de esto.
6. Las historias de los 19, que siguen donde quedaron el 13/9.

---

## 2026-09-13 — El material de tienda, en una carpeta que no sube

Sesión que empezó en un lado y terminó en otro. El pedido original era **sacar
los espacios de publicidad**; se investigó entero y a mitad de camino Santiago
lo frenó: *"deja todo lo de ads, despues decidire que hago"*. Así que el
inventario quedó levantado y **sin tocar una línea**, y la sesión se fue a lo
otro: el material por si la app va a Play Store, y arrancar las historias de
los 19.

### LA CARPETA, Y POR QUÉ LO PRIMERO FUE EL `.gitignore`

`app branding/` en la raíz, con `ficha-play/` y `capturas/{limpias,compuestas}/`
por aparato. **La regla del `.gitignore` se escribió ANTES de generar el primer
PNG**, y no se dio por buena leyéndola: se le preguntó a Git con
`git check-ignore -v` sobre rutas que todavía no existían, que es el método que
este archivo ya registró el 10/9 para `key.properties`.

Son 59 MB de PNG. No suben por lo de siempre: son salida y se rehacen solos.

### `herramientas/branding.mjs`, Y EL NÚMERO QUE DECIDIÓ TODO

**El perfil de celular es 360x640 y no el 390x844 de `celular.mjs`.** Play
rechaza una captura cuyo lado mayor pase del DOBLE del menor: 390x844 a DPR 3 da
1170x2532, o sea 2,16 veces, y rebota. 360x640 a DPR 3 da 1080x1920, que es 9:16
clavado. Las 48 capturas se verificaron contra esa norma al generarlas: **0
fuera de norma**.

Tres decisiones que costaron una vuelta cada una, las tres porque **la captura
salía correcta y aun así no servía**:

1. **El marco salía cortado abajo.** Faltaba `box-sizing: border-box`: el
   `padding` del marco se sumaba al `height: 100%`.
2. **El mapa de la gira era medio pantallazo negro.** Sin nada elegido, la
   franja de la ficha se reserva vacía —correcto en la app, que por eso el mapa
   no se mueve al elegir— pero en una captura no enseña nada. Se agregó `accion`:
   un toque antes de la foto. Se toca por `aria-label`, que es un agarre que
   existe para ser leído, y no por una clase de Tailwind, que cambia sola.
3. **El anotador salía 0 a 0**, o sea una hoja en blanco. Ahora se le dan 8 y 5
   toques: pasan las malas de un lado y no del otro, así se ve el corte, que es
   lo único que esa pantalla tiene para mostrar.

**Las compuestas se arman sobre la propia página**: se abre el sitio, se le
reemplaza el `<body>` y se fotografía eso. La alternativa era un HTML suelto con
los colores y las tipografías copiados, o sea una segunda paleta que se separa
de la primera. Las variables de fuente viven en el `<html>` (`layout.tsx:124`),
así que vaciar el `<body>` no las pierde.

### LA DECISIÓN INCÓMODA: EL HUECO DEL ANUNCIO NO SALE EN LAS CAPTURAS

`branding.mjs` esconde `[data-anuncio]`. O sea que **la captura no muestra
exactamente lo que hay en la app**, y eso es una decisión y no un descuido: hoy
ese hueco es un rectángulo punteado que dice "espacio para anuncio" y en una
ficha de tienda se lee como una pantalla a medio hacer. Está escrito adentro del
archivo, en la constante `OCULTAR`. Si el hueco se saca de la app, la regla
sobra y se borra sin romper nada.

### EL ÍCONO: UN FLAG, NO UN ARCHIVO NUEVO

`generar-icono.mjs --tienda` saca el ícono de 512 y el gráfico destacado de
1024x500. Va ahí y no en `branding.mjs` porque **el logo tiene que estar
dibujado una sola vez**: duplicarlo es tener dos que se separan. Es el mismo
argumento con el que `Marca.tsx` explica no haber inventado un segundo logo.

Es aditivo y se verificó como tal: después de correrlo, **`git diff android/`
sale vacío**.

Dos detalles que sólo aparecen mirando el PNG: el ícono **no lleva las esquinas
redondeadas** de `legado` —el redondeo lo aplica Play, y redondear acá es
redondear dos veces—, y el destacado va **sin canal alfa**, que la consola lo
rechaza. La primera versión del destacado tenía "URUGUAYO" **cortado por el
borde derecho**: el bloque de texto ahora se centra, así que si la palabra
cambia de largo sobra lo mismo de cada lado.

### UNA MANCHA QUE NO ERA

Revisando la captura de la mesa apareció algo rojizo sobre la madera. En este
proyecto eso no se deja pasar, así que **se midió en vez de mirarlo**: máscara
de píxeles rojizos sobre toda la imagen. Eran el mazo, el 6 de copas y **el
brillo del mate**. Las capturas están limpias.

### LA REVISIÓN DE SEGURIDAD

`security-review` con un pase adversarial sobre lo nuevo. **Cero hallazgos
explotables.** Se verificó corriendo comandos y no leyendo: inyección en
`page.evaluate` (el titular sale de una constante del archivo; ni `--solo` ni
`SITIO` la alcanzan, y el `data:` es base64, que no puede cerrar el atributo),
path traversal (la ruta se arma con claves propias, no con el argumento),
ejecución de comandos (sin `exec`/`spawn`/`eval`), y **metadatos en los PNG**
—que importa porque ésos sí serían públicos—: sólo `IHDR`, `pHYs` e `IEND`, sin
un `tEXt` ni un `eXIf`.

**Dos cosas se arreglaron igual, ninguna explotable:**

1. **`SALIDA` colgaba del directorio desde el que se corría.** Parado en
   `herramientas/`, escribía en `herramientas/app branding/`, o sea FUERA de lo
   que protege `/app branding/`. No se filtraba porque la regla vieja
   `capturas/` lo tapaba de rebote — pero eso es que la protección real no era
   la que el comentario dice que es, y una que anda de casualidad se cae el día
   que alguien renombre algo. Ahora se ancla en `import.meta.url`, como
   `generar-icono.mjs`.
2. **`!APARATOS[x]` validaba por la cadena de prototipos**: `--solo constructor`
   pasaba y después no hacía nada, en silencio. Es **el mismo agujero que
   `progreso.ts` y `sonido.ts` ya taparon dos veces**, y ahí está escrito que el
   patrón se copia. Ahora es `Object.hasOwn`.

`09-web-security` acotada al cambio: **nada**. La CSP no se tocó, no cambió una
línea servida al navegador, y el sumidero de HTML sólo recibe constantes del
propio archivo. **`17-mobile-security` no corresponde**: no se tocó Capacitor ni
el manifest, y que el flag no escriba en `android/` está verificado con el
`git diff`. Se dice en vez de correrla por costumbre.

### LAS HISTORIAS DE LOS 19: SE ENTREGÓ EL PUNTO DE PARTIDA

Santiago las quiere **escritas por él**: pidió ver las actuales para ir tirando
ideas. Se le pasaron las 19 transcritas, y de leerlas juntas salieron tres cosas
que valen para cuando arranque:

- **Siete ya tienen gancho de lugar** (el feriante, el pescador, el citricultor,
  las amatistas de Bella Unión, la frontera, la Patria Gaucha, el liceo).
- **Cinco no tienen nada de dónde agarrarse** —Tito, Marito, Cacho, Beto y Don
  Ramón son sólo una forma de jugar—: ésos son los que más hay que inventar.
- **Hay material sin usar que no se puede contradecir**: `lib/caras.ts` ya les
  puso ropa y rasgos, `lib/ambientes.ts` le dio un objeto a cada departamento, e
  `ideas/sonido.md` el tipo de voz.

Sigue en pie lo decidido el 10/9: **son dos campos y no uno** —`descripcion` se
queda, `historia` se agrega— y falta decidir dónde se despliega, que se resuelve
con el texto real en la mano y no antes.

### ADSENSE, QUE ERA UNA PREGUNTA Y NO UNA TAREA

Se explicó el trámite. Lo que hay que recordar de eso son dos cosas, porque
cambian la decisión entera:

1. **AdSense es para webs y AdMob para apps, y Google prohíbe AdSense adentro de
   un WebView.** O sea que AdSense no cubre el APK ni aunque la app sea la misma
   web: para eso está AdMob, que es lo que el README ya documenta.
2. **El dominio es el obstáculo.** AdSense pide que el dominio sea tuyo, y
   `workers.dev` es de Cloudflare. Habría que comprar uno antes de intentarlo.

`ideas/publicar.md` ya había descartado AdSense con la cuenta hecha. Nada de lo
de hoy cambia esa conclusión; lo del dominio la refuerza.

### ESTADO AL CERRAR

`npm test` **237/237** · `tsc` limpio · 48 capturas, **0 fuera de la norma de
Play** · `git diff android/` vacío · `git status` no ve **ni un archivo** de
`app branding/`.

Archivos tocados: `.gitignore`, `herramientas/generar-icono.mjs`.
Nuevo: `herramientas/branding.mjs`.
`next-env.d.ts` lo reescribió `next dev` solo (Next 16 movió los tipos a
`.next/dev/`): no es de esta sesión, pero está en el árbol.

**Sin commitear.**

### PENDIENTE

1. **Las historias**, que es lo que sigue: Santiago tira las ideas y se escriben.
2. **Decidir qué pasa con los espacios de publicidad.** El inventario está
   levantado: el componente es `components/EspacioAnuncio.tsx`, se usa en tres
   lugares (mesa, pie y anotador), no hay una sola línea de AdMob en `android/`
   ni en la CSP, y el día que se saque hay que **dar vuelta** el guardián de
   `mirar-web.mjs:354-406`, que hoy falla si NO encuentra el hueco.
3. **Hay una contradicción a la vista del usuario que existe igual**, se saque o
   no: Términos dice *"no hay, y no está previsto que la haya"* y Privacidad
   promete un banner.

## 2026-09-11 — Los bots: que las estrellas signifiquen algo

Santiago lo reportó así: *"hay veces que Luquita puede ser más difícil que el
mayor nivel de todo"*. **Tenía razón, y el problema era más grande de lo que se
veía.** Al terminar, El Turco le gana a Luquita el **75,0%** de las veces; al
empezar era el 64,0%, y había un ★4 que le ganaba al ★5.

### EL DIAGNÓSTICO, QUE ES LA MITAD DEL TRABAJO

Medido antes de tocar nada, con un round robin de **68.400 partidas**:

| Qué | Estaba |
|---|---|
| El Chicharra (★4) contra El Turco (★5) | **52,5%** — el ★4 le ganaba al ★5 |
| Rango entero de la gira | ★1 44,0% → ★5 55,7%: once puntos para cinco niveles |
| La ficha que te lee | anotaba algo en **el 34% de las manos** |
| El dial `lectura`, que separa un ★5 de un ★3 | **+1,1 / −0,3 / +2,2 / −2,3** puntos. Contra un rival que paga todo, leerlo lo hacía jugar PEOR |

Y una tercera cosa que definió el tamaño de la sesión: **tocar números ya no
alcanzaba**. Llevando el ★1 al extremo blando y barriendo los umbrales del ★5,
el techo daba 72,6% contra un objetivo de 75-80%.

### LAS DOS COSAS QUE DE VERDAD LO ARREGLARON

**1. La columna `subeEnvidoCon` estaba dada vuelta.** Iba 34 para el ★1 y 30
para el ★5, y el óptimo medido —con validación cruzada, optimizando contra los
perfiles y validando contra el sparring y la gira— es **35**. O sea que el ★1
jugaba más cerca del punto bueno que el ★5. Invertida (31·32·33·34·35), el ★5
vs ★1 saltó de 63,6% a 72,0% de una.

Es **el mismo error que ya se había cometido una vez** en este mismo archivo, y
por el mismo motivo: suponer que "más difícil = canta y sube más".

**2. La ficha estaba ciega, y el dial que dependía de ella no hacía nada.**
`observarMano` exigía o envido querido (13,8% de las manos) o las tres cartas
sobre la mesa (23,3%). Se tiraba el 41% de manos donde el jugador cantaba truco
y el 31% donde mostraba dos cartas.

El arreglo no fue exprimir más ese eje: fue **partirlo en tres, cada uno con su
denominador**.

    VERACIDAD   ¿cantó sin tener?    pide evidencia   ~33% de las manos
    FRECUENCIA  ¿cada cuánto abre?   gratis           100%
    AGUANTE     ¿se achica?          gratis           100%

Frecuencia y aguante no necesitan ver una sola carta. Y el aguante era la mitad
que faltaba entera: el bot podía decidir si te CREÍA, pero no si te convenía
cantarle. Cobertura medida: de **33,4% a prácticamente todas las manos, 3×**.

### LOS DIALES NUEVOS

- **`aguante`** (0·0,2·0,5·0,8·1) — cuánto sube el umbral de querer por cada
  escalón de truco. Es el *"si le cantás el vale cuatro se achican aunque
  tengan"* que pidió Santiago, y es lo que hace que **mentirle a los primeros
  rinda**, que es el objetivo pedagógico de la gira.
- **`memoria`** (0·0·0·0,6·1) — cuántas partidas anteriores mira. Hasta el ★3
  en cero: contra ellos alcanza con cambiar de estrategia para despistarlos.
- **`plan`** — está en CERO para los 19, y es la decisión más incómoda de la
  sesión. Ver abajo.

Y un arreglo que no estaba planeado: **el `silencio` se diluye con lo que sobra
sobre el umbral**. Se tiraba a la moneda sin mirar cuánto se tenía, y costaba
nueve puntos de winrate: entre dos ★2, la callada sacaba 36,6% y el hablador
45,6%. Callarse con el tanto justo es oficio; callarse un 33 es distracción.
Con eso, la brecha entre esos dos ★2 pasó de 9 puntos a 1,7.

### `lib/legajo.ts`: lo que se acuerdan de vos

Clave propia `truco-uy:legajo`, **nunca adentro de `truco-uy:progreso`**, igual
que hizo `sonido.ts`. Las últimas 3 partidas, del JUGADOR y no de cada rival
—decisión de Santiago— así El Turco ya te conoce la primera vez.

`sanear()` copiado de `progreso.ts` y encima una tabla de **15 coherencias**: no
se puede haber mentido más veces de las que se cantó. Sin eso, editando el
`localStorage` a mano se le fabrica al bot una lectura que ninguna partida
produjo.

**El tope es la decisión que más importa**: el legajo entra como seis manos y ni
una más. Con eso el rival se sienta sabiendo, pero a las pocas manos lo nuevo ya
pesa más que lo viejo. Sin tope, tres partidas largas lo dejaban clavado en la
idea que se había hecho de vos, y eso no es un rival difícil: es un rival sordo.

### LO QUE SE DESCARTÓ, Y POR QUÉ

**`plan.ts` quedó apagado.** Santiago pidió con mucho detalle que los ★4 y ★5
administren la mentira: *"mentir solamente cuando anteriormente te dijeron la
verdad y te ganaron mostrándote cartas buenas"*. Se escribió entero, se arregló
**tres veces** y se midió **de cinco formas**. No se pudo demostrar que sirva:

    plan = 0 .................. 61,9%   ← la referencia
    plan = 1, primera versión . 57,9%
    …con el marcador arreglado  60,0%
    …con el crédito calibrado   60,5%

Y contra un rival con **memoria corta** —el que más debería premiarlo, porque es
lo que se parece a una persona— sale **peor todavía: −2,6**, que es más que el
margen de error. No es que falte el instrumento: se midió con el correcto.

El módulo queda con sus tests y el dial listo; encenderlo es una columna de
`OFICIO_POR_NIVEL`. **Esa decisión es de Santiago, no mía**: él lo pidió, yo
sólo puedo decir que no lo pude demostrar.

Lo que SÍ quedó de ahí, medido: `FALTA_EXIGE`. El umbral para querer una falta
envido era `quiereEnvidoCon + 4` y el bueno es **+5**. Y que **la lectura entre
siempre en la falta**, que da +3,5 puntos y produce exactamente el número que
pidió Santiago: la falta se quiere con **33**, y con **30** si el otro miente.

### DOS ERRORES MÍOS QUE ENCONTRÓ LA MEDICIÓN, Y UNO QUE ENCONTRÓ LA REVISIÓN

1. **El marcador estaba al revés.** `ajustePorMarcador` ponía prudente al que va
   perdiendo. Costaba 2 puntos. No jugar es la forma más segura de seguir
   perdiendo: el que va abajo arriesga.
2. **`mentiraEfectiva` sólo podía restar.** Iba de `base×0,15` a `base×1`, o sea
   que administrar la mentira sólo sacaba mentiras en vez de moverlas de lugar.
   Con el techo por encima de 1 la idea recién tiene sentido.
3. **El legajo no guardaba nada contra los ★4 y ★5** después de la primera
   partida. `fichaSembrada` devuelve fraccionarios, el saneador exige enteros, y
   `anotarEnLegajo` fallaba **en silencio**. Justo los dos rivales para los que
   el legajo existe. Lo encontró la revisión de seguridad, no yo. Arreglado
   separando lo sembrado de lo observado, con su test de viaje redondo.

### EL SOBREAJUSTE, QUE MORDIÓ DOS VECES

Barriendo 48 combinaciones con 900 partidas, la "mejor" dio 76,1%. Verificada
con 4.000: **72,6%**. Era ruido, y el barrido la había elegido por ruidosa. Y
ese ★5 "optimizado" **perdía contra el ★5 de entonces (47,2%)**, porque estaba
ajustado a un solo rival.

De ahí salieron dos reglas que ahora están en el banco: **nada se calibra contra
un solo oponente**, y **ningún número se informa sin su margen de error**. El
medidor viejo había dicho "escala desordenada" con una diferencia de 1,9 puntos
que era azar.

Y volvió a aparecer al final, al revés: un test decía que contra el pescador el
★5 no se distinguía del ★3 (1,9 puntos, con 900 partidas). Con 4.000 la
diferencia real era **3,4**. No exigía de más: **medía mal**, y eso se arregla
subiendo las partidas, no bajando el umbral.

### EL BANCO NUEVO

`lib/motor/banco.ts` (nuevo, tipado) + `herramientas/medir-bots.mjs` reescrito.
Estaba duplicado entre la herramienta y el test, y ya había divergido: el
`SPARRING` del `.mjs` todavía declaraba `verso: 0`, un dial borrado el 10/9. En
`.ts` eso no compila, y de hecho el compilador cazó tres campos faltantes apenas
se agregaron los diales nuevos.

Lo que agrega: **el panel de cinco perfiles humanos** (mentiroso, honesto,
miedoso, pagador, pescador), que es la diferencia entre medir si un bot es
fuerte y medir si es DIFÍCIL; el round robin 19×19; y el margen de error.

### CÓMO QUEDÓ

    ★1: 37,0%   ★2: 41,9%   ★3: 46,7%   ★4: 54,2%   ★5: 57,8%
    ✔ Las cinco bandas están separadas

Contra cada forma de jugar de una persona, del ★1 al ★5:

    Mentiroso  39,2 → 65,7        Miedoso   40,7 → 77,3
    Honesto    42,8 → 61,1        Pagador   45,5 → 62,9
    Pescador   55,5 → 65,4

### LA REVISIÓN DE SEGURIDAD

`security-review` sobre todo el diff. **Ningún hallazgo HIGH.** Un MEDIUM y un
LOW, los dos arreglados:

- **MEDIUM — el bot se soplaba el tanto que vos nunca dijiste.** `observarMano`
  usaba `manoInicial` con sólo comprobar que el envido se hubiera querido. Pero
  por `reglas.txt` 9.4 el pie que no supera dice **"son buenas"** y no revela
  nada: el motor lo sabe (`envidoJugado.dicho`) y `tantos-al-cierre.ts` ya lo
  respetaba para la pantalla. Era una fuga vieja que duraba una partida; con el
  legajo iba a quedar **guardada**. Arreglado, y de paso se aprovechó la
  información pública de verdad que hay ahí: decir "son buenas" prueba que tu
  tanto es **menor o igual** al que cantó el otro, que es una cota superior y
  alcanza para probar una mentira.
- **LOW** — la fecha de la política de privacidad, que la propia página pide
  mover cuando cambia lo que se guarda.

Lo que se revisó y salió limpio: **contaminación de prototipo** en el saneador
del legajo (se probaron seis ataques; el saneador construye un objeto nuevo
desde una allowlist, que es la forma correcta), `NaN`/`Infinity`/negativos/
gigantes (no se cuelan, y lo peor que se consigue editando a mano es el mismo
ajuste que ya se consigue jugando), **XSS** (cero sumideros de HTML en todo el
repo) y que **el legajo no guarde ni una carta**, con test que lo blinda.

Verificación web aparte: la CSP no hubo que tocarla —el cambio no agrega un solo
pedido de red, ni un script, ni un asset—, no hay dependencias nuevas y el
legajo es la cuarta clave de `localStorage`, separada de las otras tres.

**No se corrió `17-mobile-security`**: no se tocó Capacitor, ni el manifest, ni
nada del APK. Se dice en vez de correrla por costumbre.

### LOS SABOTAJES

A los tests nuevos, para ver si sirven. Tres de cuatro se agarran: volver
`subeEnvidoCon` a la tabla vieja (4 tests en rojo), darle al ★1 el aguante de un
★5, y dejar al ★5 sin lectura. **El cuarto no rompe nada y está bien que así
sea**: si el ★4 juega las cartas como un ★5, el ★5 conserva lectura, aguante y
memoria, así que el escalón sigue existiendo. El test mide el resultado, no los
ingredientes.

### ESTADO AL CERRAR

`npm test` **237/237** · `tsc` limpio · `mirar-web` TODO OK en los tres tamaños ·
`mirar-mesa` TODO OK en las siete pantallas · los dos builds OK · `out-app`
sigue en **6,0 MB**.

Archivos tocados: `lib/motor/lectura.ts`, `bot.ts`, `personalidades.ts`,
`partida.ts` (un campo, `Registro.sobre`), `baraja.ts`,
`app/jugar/mesa/page.tsx`, `app/legales/privacidad/page.tsx`,
`herramientas/medir-bots.mjs` y los tests.
Nuevos: `lib/legajo.ts`, `lib/motor/banco.ts`, `lib/motor/plan.ts` y sus tests.

**Sin commitear.**

## 2026-09-10 (noche) — El sonido: primero la lista de lo que hay que grabar, después las barras

Sesión corta y de las que no se ven: **el juego sigue mudo al terminarla**. Lo
que se hizo fue lo de antes de grabar —decidir cuántos archivos son, cómo se
llama cada uno y dónde va— más los ajustes, que ahora guardan de verdad.

El orden lo pidió Santiago y es el correcto: las voces las van a poner él y unos
amigos, o sea que grabar es juntar gente una tarde. Lo peor que puede pasar es
llegar a esa tarde sin la lista y tener que volver a juntarla porque faltaban
dos.

### LO QUE QUEDÓ

- **`ideas/sonido.md`**, que es el entregable de verdad: las cuatro tablas de
  qué grabar, con la de los 19 rivales pensada para ir tachando.
- **`lib/sonido.ts` + su test**: los volúmenes, en `localStorage`.
- **El panel del engranaje** ya no dice "Próximamente": tiene el interruptor de
  silenciar y cuatro barras (General, Música, Voces, Efectos).
- **`mirar-web.mjs`** los vigila, y `.gitignore` tiene su sección de audio.

### LAS CUENTAS: 292 ARCHIVOS

**266 voces** (14 cantos × 19 rivales), **9 músicas** y **17 efectos**.

Los 14 cantos salen uno por uno de `partida.ts`, que es el único lugar donde se
arma una línea hablada, así que **la lista está cerrada**: no hay ninguna otra
frase que un rival pueda decir. Se verificó a máquina que los 19 `id` del
documento son los mismos de `personalidades.ts` y en el mismo orden.

**Tres cosas que faltaban en la lista que trajo Santiago**, y por eso se
escriben acá:

1. **`son buenas`**, que lo dice el pie cuando su tanto no le gana al del mano.
   Se dice en casi todas las manos con envido querido.
2. **El "no quiero" de la flor no es "no quiero"**: es **"con flor me achico"**.
   Son dos grabaciones distintas.
3. **"Flor en mesa" y "envido en mesa" NO son cantos.** Son los rótulos que
   escribe el juego al cerrarse la mano (el rediseño de esta misma tarde):
   nadie los dice. Si tienen que sonar, es un efecto.

### LAS TRES DECISIONES

- **Los números del tanto no se graban.** El envido va de 0 a 37 y la flor de 20
  a 47: son 48 números, o sea **912 archivos de más** si van por personaje. Y en
  una voz neutra compartida suena peor que no tenerlos —el canto lo dice el
  personaje y el número, otro—. El número ya se lee en pantalla. Es la misma
  decisión que se tomó esta tarde al borrar `versos.ts`, con el mismo motivo
  escrito ahí: *"el día que haya voces, diecisiete coplas son diecisiete
  grabaciones por rival"*.
- **La música va por ambiente**: los 7 que ya existen en `lib/ambientes.ts` más
  portada y gira. Se puede arrancar con tres sin tocar código, porque el mapa de
  departamento a ambiente ya existe.
- **Hoy no se escribió el motor que reproduce.** Era la otra opción y se
  descartó a propósito: no se puede escribir bien sin el primer archivo en la
  mano —el respaldo cuando a un rival le falta la voz, y el arranque de la
  música, que los navegadores no dejan hasta que hubo un toque—.

### DÓNDE VIVE EL VOLUMEN, QUE ES LA DECISIÓN QUE MÁS DURA

**Clave propia, `truco-uy:sonido`, y NO un campo de `Progreso`.** Dos razones:

1. `borrarProgreso()` es el botón de "empezar de nuevo", y que empezar la gira
   de cero te deje además la música al 60% es un efecto que nadie pidió ni
   relaciona con el botón que tocó;
2. `CLAUDE.md` avisa dos veces que tocar dónde vive el progreso es de lo más caro
   que hay acá. Una clave nueva es puramente aditiva y no puede romper una gira
   que ya existe.

`sanear()` se copió de `lib/progreso.ts` con una sola regla —entero de 0 a 100 o
el valor de fábrica— y **se valida también al escribir, no sólo al leer**.

`volumenReal()` es el único renglón de reglas que tiene el archivo: el maestro
multiplica, el silencio manda. Se escribió hoy, con el motor sin existir,
justamente para que el día que lleguen los tres reproductores lo consuman en vez
de deducirlo cada uno por su lado y contradecirse.

Y **silenciar no baja ningún volumen**: los deja donde estaban para que al
desprenderlo vuelva todo como estaba. Tiene test.

### EL BUG QUE ENCONTRÓ EL GUARDIÁN NUEVO, Y QUE NO SE VEÍA LEYENDO EL CÓDIGO

Vale aparte porque es la razón por la que se escribe un guardián y no un
comentario.

Los volúmenes se leían en un `useEffect`, o sea que el panel **se dibujaba un
cuadro con los valores de fábrica y recién después se corregía**. Quien tenía la
música en 25 veía 60 al abrir, por un instante.

`mirar-web.mjs` lee la barra apenas aparece el panel, sin esperar, y la encontró
en 60 con 25 guardado. **Y la corrida anterior había pasado.** Pasó por suerte:
el efecto le había ganado de mano. O sea que el bug estuvo dando verde una vez.

El arreglo saca la carrera entera en vez de acomodarla: la lectura pasa al toque
que abre el panel (`setSonido(leerSonido()); setAbierto(true);`). React agrupa
las dos, así que **cuando el panel existe el estado ya es el bueno** y no hay
nada que corregir después. Sigue sin leerse al montar, que era el motivo de
ponerlo en un efecto: esto vive adentro de la barra, que no se desmonta nunca.

Y el guardián se partió en dos, porque son dos fallas con arreglos distintos y
un mensaje que diga sólo "no se guardó" manda a buscar al lugar equivocado:

    mal ya y mal después   → no se guardó nada
    mal ya y bien después  → se guardó, pero el panel lo muestra tarde

Saboteado a propósito, ahora dice: *"el panel abre con los valores de fábrica y
se corrige después (música 60 y a los 400ms 25): leelos AL ABRIR, no en un
useEffect"*.

### DOS VECES QUE UNA MEDICIÓN DIO "OK" SIN MEDIR NADA

Es el tema recurrente de este proyecto y volvió a pasar dos veces, las dos
agarradas antes de creerles:

1. **El extractor de resultados del sabotaje no matcheaba nada.** Buscaba
   `^# pass` y `node --test` imprime `ℹ pass`. Las seis corridas informaron una
   línea vacía y quedaba leerlo como "ninguna falló". Ahora, si no puede leer el
   número, dice **"NO SE PUDO MEDIR"** en vez de callarse.
2. **El test del `Object.hasOwn` pasaba con el arreglo sacado.** Miraba lo que
   después devolvía `leerSonido()`, y `JSON.stringify` descarta las funciones al
   guardar: la ida y vuelta por `localStorage` tapaba el agujero y el test daba
   verde sobre código roto. Ahora mira **lo que devuelve `guardarVolumen`**, que
   además es el camino real —el panel hace `setSonido(guardarVolumen(...))`, así
   que ese objeto entra derecho al estado de React—. Con el arreglo sacado ahora
   falla con "se devolvió una función bajo constructor".

### LOS SABOTAJES

`lib/sonido.ts`, **seis**, y los seis se agarraron: el validador sin validar
(3 fallas), `volumenReal` ignorando el silencio (2), silenciar pisando los
volúmenes (1), guardar sin escribir (3), un valor de fábrica que la barra no
puede alcanzar (1) y el maestro sin multiplicar (2).

`mirar-web.mjs`, **tres a la vez** sobre el panel, y salieron once fallas: tres
barras en vez de cuatro, la barra de 16px que no se agarra con el dedo, y el
volumen que no sobrevive a recargar. Y una cuarta aparte, para la rama nueva:
volver a leer los volúmenes en un efecto, que da el mensaje del "se muestra
tarde". El guardián nuevo sirve, y además ya encontró un bug de verdad.

### EL REPASO DE SEGURIDAD

`security-review` sobre lo nuevo. **Ningún hallazgo HIGH ni MEDIUM**, y el
informe vino con lo que se descartó y por qué, que es lo que lo hace auditable:
el escape de validación (imposible, `sanear` construye un objeto nuevo con seis
claves conocidas), XSS (no hay `dangerouslySetInnerHTML` en todo el repo) y
terceros (el cambio no agrega un solo pedido de red).

**Un retoque, y se aplicó**: `SONIDO_POR_DEFECTO[barra]` era un acceso indexado
sin `Object.hasOwn`, o sea que con `barra = "constructor"` el "valor por
defecto" salía siendo una **función** de la cadena de prototipos. No era
explotable —`barra` sale siempre de `BARRAS` y TypeScript no deja otra cosa—
pero es exactamente el agujero que `anotarPartida` ya tapó en `progreso.ts`, y
ahí el comentario dice que *"ya mordió a este proyecto una vez"*. El patrón se
copia, no se reinventa.

**No se corrió `17-mobile-security`**: no se tocó Capacitor, ni el manifest, ni
nada del APK. Se dice en vez de correrla por costumbre.

**La CSP no hubo que tocarla, y queda escrito por qué** en `ideas/sonido.md`:
`media-src` no está declarada y por la regla de CSP cae en `default-src 'self'`,
así que el audio propio ya está permitido y el de terceros ya está bloqueado.

### EL PESO, QUE ES LA DECISIÓN ESCONDIDA

Medido contra el APK de hoy, que pesa **6,8 MB**:

    266 voces (1,5 s, mono 64 kbps)   ~3,5 MB
    17 efectos                        ~0,2 MB
    9 músicas de 2 minutos           ~13 MB   ← el 80% del total
    9 músicas de 40 segundos          ~4,5 MB

O sea que **la música sola puede más que duplicar la app** y las voces no son el
problema. Las tres salidas están anotadas en el documento; la buena es loops
cortos y bien cerrados.

### ESTADO AL CERRAR

`npm test` **195/195** (180 + 15 de `sonido`) · `tsc` limpio ·
`mirar-web` TODO OK en los tres tamaños, con el bloque nuevo
"el volumen se guarda" · los dos builds OK · `out-app` sigue pesando 6,0 MB, o
sea que las barras no le agregaron peso al sitio.

Archivos tocados: `components/MenuAjustes.tsx`, `herramientas/mirar-web.mjs`,
`.gitignore` y este archivo.
Nuevos: `ideas/sonido.md`, `lib/sonido.ts`, `lib/sonido.test.ts`.

**Sin commitear.**

### PENDIENTE

1. **Las historias de los 19.** Era la otra mitad del pedido de Santiago y
   arranca después de esto: hoy `Personalidad.descripcion` es un renglón sobre
   cómo juega y sale en `app/jugar/gira/page.tsx:198` y en
   `app/jugar/mesa/page.tsx:2106`. Lo que se quiere es que al tocar el
   departamento haya algo del lugar donde vive y una historia propia. **Son dos
   campos y no uno**: `descripcion` se queda —es información de juego, "a qué
   atenerte"— y se agrega `historia`. Mezclarlos hace que no sirva para ninguna
   de las dos cosas. Falta decidir dónde se despliega: la ficha de la gira es
   una franja de alto reservado y tres renglones más empujan el mapa.
2. **Grabar `luki` primero** y probar con eso que el sistema anda, antes de
   grabar las otras 252.
3. Sigue lo de la tarde: mirar el cierre de mano en el Redmi, el APK con
   `.pantalla-fija .carta`, `ALTURA`/`APOYO` de `objetos.ts` sin consumidor, las
   cromáticas del mapa y prender AdMob.

## 2026-09-10 (tarde) — Se aligera la mesa: sin versos, sin objetos, y el tanto se enseña EN LA MESA

Primera sesión desde que se cerraron las manchitas que no es de bugs sino de
diseño. El hilo de todo es uno solo y lo puso Santiago: **la pantalla se llena**.
Se sacaron tres cosas y se cambió una cuarta por algo más chico.

Es también una sesión con **dos rediseños tirados a la basura después de
implementarlos**, y eso salió bien: se implementaron, se fotografiaron, se
miraron y se descartaron. Costó menos que discutirlos en el aire.

### 1. LOS VERSOS SE FUERON, TODOS

`lib/motor/versos.ts` (306 líneas, 17 coplas) y su test (11 casos) están
borrados. También el campo `verso` de `personalidades.ts` y su test.

El archivo estaba escrito para poder sacarse —*"si sacás este archivo entero, la
partida sigue funcionando igual"*, decía su encabezado— y era cierto: los cantos
pelados los arma `textoCanto()` en `partida.ts` y salen por `p.eventos` a la
chapa del diálogo. **Ahora todos los rivales cantan igual, "¡Truco!",
"¡Envido!"**, y el globo de la copla en `Dialogo.tsx` se fue con ellos.

La razón no es sólo minimalismo: el día que haya voces, diecisiete coplas son
diecisiete grabaciones por rival.

### 2. LA FLOR YA NO CANTA SU NÚMERO SI NADIE SE LA DISCUTIÓ

`revelarFlores()` se llamaba en los cuatro caminos por los que se resuelve una
flor. Ahora sólo en los dos donde **hubo que comparar dos flores**
(`resolverFlorASecas` y el "quiero" de una contraflor o un con flor envido).

Si la flor se cobró sola, o si el otro se achicó, no hay nada que contar en voz
alta: decir "Flor: 39" era repetir en la mesa algo que nadie preguntó. El número
se ve igual, pero al cerrarse la mano.

El envido no cambia: se siguen cantando los tantos y el "Son buenas".

### 3. EL TANTO SE ENSEÑA EN LA MESA. Y ANTES DE ESO, DOS RECUADROS QUE SE CAYERON

Lo que se pidió primero fue reemplazar el cartel *"Acá está mi envido · 31"* por
algo que mostrara **las cartas**. Se hicieron **dos diseños completos**, se
eligieron por `?variante=` y se fotografiaron:

- **A, el cuadro**: un recuadro arriba a la izquierda con los dos lados adentro.
- **B, los dos papeles**: uno colgando del medallón y otro sobre tus cartas.

**Santiago descartó los dos**, y con el mismo argumento: llenaban la pantalla. En
su lugar pidió lo que se hace en la mesa de verdad — que el que tiene que
mostrar **dé vuelta lo que le quedaba y lo apoye**.

Eso es lo que quedó:

    t = 0     se cierra la mano
    t = 450   caen las cartas del que tiene que enseñar, escalonadas 90ms
              + el rótulo "ENVIDO EN MESA" / "FLOR EN MESA"
              + los dos tantos en número, bajo el medallón
    t = 2000  todo al mazo
    t = 2760  el cartel de fin de mano

**No hay ningún reloj nuevo suelto**: el `setTimeout` de las cartas va en el
MISMO `useEffect` que los otros dos, con las mismas dependencias `[p, manoNro]`
y su `clearTimeout` en el mismo `return`. Abrir un efecto aparte es lo que haría
que una mano rápida herede el reloj de la anterior, que es el bug que el
comentario de `manoNro` ya evitó una vez.

#### La decisión que más protege el juego: esto NO pasa por el motor

`aplicar()` no se llama, `p.bazas` no se toca, los puntos no se mueven. La mano
YA TERMINÓ y lo que se agrega es **pintura sobre una partida cerrada**.

Hacerlo al revés —"tirar de verdad" las cartas que faltan— habría sido meter
jugadas falsas en el historial de una mano ya resuelta. Acá es imposible por
construcción: `lib/cartas-en-mesa.ts` devuelve una lista y no puede hacer nada
más.

#### Quién muestra, y las tres reglas

- **La flor la enseña quien la cantó**, y si los dos la cantaron, los dos.
- **El envido lo enseña SÓLO EL QUE LO GANÓ.** Lo eligió Santiago. El que dijo
  "son buenas" no reveló su número, así que tampoco sus cartas; y el que perdió
  habiendo cantado su tanto tampoco las da vuelta.
- **Con la mano jugada entera no se apoya nada** —están las seis a la vista—
  pero los dos tantos en número salen igual bajo el medallón.

`lib/tantos-al-cierre.ts` se reescribió antes de todo esto: ahora devuelve
`revelado`, `valor`, `cartas` y `cuentan`, y **el que no reveló llega con todo en
`null`**, o sea que la puerta está cerrada aguas arriba y `cartas-en-mesa.ts` no
tiene de dónde sacarlas.

#### Dónde cae cada carta, que fue lo delicado

`p.bazas` **no tiene siempre tres entradas**: arranca con una y se le hace `push`
cuando la anterior se completa. Si la mano se cortó, las bazas que faltan **no
existen**. Así que los lugares se sintetizan: primero los huecos que ya están en
el array, después posiciones nuevas a la derecha.

**Y el centro del grupo NO se recalcula.** `lugarDeBaza` centra sobre
`bazasJugadas`: si estas cartas entraran en esa cuenta, todas las ya apoyadas se
correrían de golpe en el mismo cuadro. "La mesa no se mueve" es exactamente lo
que vigila `mirar-mesa-nueva.mjs` desde el 4/9. Caen al costado, que además es
donde se apoyan de verdad.

#### `cartasDelEnvido()`, que salió de deshacer una repetición

Para resaltar las cartas que suman hacía falta saber cuáles son. Esa decisión
estaba escrita **tres veces** en `lib/motor/tantos.ts`: en `valorEnvido`, en
`explicarEnvido` y en la cabeza de quien lo leyera. Ahora se decide una sola vez
y las otras dos se apoyan en ella, así que un número y las cartas que lo
explican no pueden decir cosas distintas.

Tiene test propio que **recorre la baraja y rehace la cuenta desde reglas 9.2**,
sin preguntarle a la función que está probando.

#### Un rótulo que se pisaba, y se vio en la captura

La primera versión ponía "ENVIDO EN MESA" arriba del todo. A 320×568 se
superponía con el registro de lo que dijo el rival, que en una pantalla baja
ocupa toda la franja. **No se veía leyendo el código.** Dos arreglos: el rótulo
bajó a la altura de las bazas, y `DialogoRival` gana un modo `compacto` —una sola
línea en vez de tres— mientras hay cartas enseñadas.

Y al rótulo **se le anula la escala** de `estiloEnMesa`: escalar texto chico por
un factor fraccionario deja basura con forma de letras, que es una lección que
este proyecto ya tenía escrita dos veces.

### 4. LOS OBJETOS SE FUERON DE LA MESA, Y AHORA SON EL PREMIO

Los diecinueve objetos del departamento —el vaso de Montevideo, el cajón de
Canelones— salieron de la mesa. Santiago: ocupan espacio que la mesa necesita.

**No desaparecieron**: los diecinueve siguen dibujados en
`components/mesa/Objetos.tsx`, siguen siendo el trofeo de cada rival, y desde hoy
**el cartel de fin de partida los entrega**: al ganarle a un rival de la gira por
primera vez dice *"Ganaste el premio de {departamento}"* con el objeto dibujado.

La primera victoria **se deduce, no se guarda**: `anotarPartida` devuelve el
progreso ya actualizado, así que `ganadas === 1` es exactamente eso. No hace
falta ningún campo nuevo en `localStorage`, y eso importa: tocar dónde vive el
progreso es de lo más caro que hay en este proyecto.

Va **adentro** del cartel que ya existe y no en uno propio: son dos noticias del
mismo momento, y dos carteles seguidos son dos cosas montándose y desmontándose
encima de la mesa.

De paso se borró de `mirar-mesa-nueva.mjs` el bloque "objetos extremos de la
gira" (63 líneas), que si no daba ocho fallas duras por "no se dibujó el objeto".

### 5. LA PORTADA: TRES VARIANTES, GANÓ EL ESCUDO

Santiago la describió como *"muy meh"*. Se hicieron tres con `?portada=`:

1. **el escudo** — la marca arriba del nombre, sobre madera con vetas;
2. **el cartucho** — el nombre en un marco con filete, como un cartel pintado;
3. **el boliche** — con la textura horneada de la mesa de fondo.

**Ganó la 1.** Las otras dos se borraron con el parámetro, y `app/page.tsx` volvió
a ser un Server Component **sin un byte de JavaScript**.

Dos cosas la sacaron del "meh":

- **La marca** (`components/Marca.tsx`): dos cartas con el halo dorado. No es un
  logo nuevo — es el mismo motivo que `generar-icono.mjs` hornea para el ícono de
  Android desde el 2/9, con el aire que a 48px no había. Inventar otro habría
  sido tener dos marcas.
- **Las vetas** (`.vetas-madera`): `.tabla-mesa` sola es un `radial-gradient` y se
  veía como un degradé. Tres `repeating-linear-gradient` con períodos primos
  entre sí (37 y 91 px) en **una sola capa de pintura**.

Y sigue **sin descargar una sola imagen**, que en la primera pantalla de la app
importa más que en ninguna otra.

Texto nuevo: *"Aprendé a jugar al truco uruguayo y recorré el país enfrentando a
los mejores."* El "gratis" no se perdió: sigue en el `<title>` y en la
`description`, que es donde lo lee Google.

#### Lo que se probó y se cayó, para no reintentarlo

**El fondo del boliche con `-fondo.webp` no sirve en vertical.** Mide 2000×750,
o sea muy apaisado, y en un celular `object-cover` se queda con una franja del
medio ampliada —justo la zona oscura—. Salía una pantalla marrón lisa. Con
`-mesa.webp` (1400×900) sí se ve la madera. Igual perdió.

### LO QUE SE MIDIÓ, Y LO QUE NO

**Las capas compuestas, con control.** `capas.mjs` gana el estado del cierre de
mano, y **el control `cierre-sin-tanto` no sobra**: al cerrarse la mano pasan
varias cosas a la vez y sin él cualquier número se le atribuye al cambio.

    cierre-sin-tanto   21 capas · 23 en total   ← el control
    cierre-cuadro      21 capas · 23 en total   (el recuadro descartado)
    cierre-papeles     21 capas · 23 en total   (el otro descartado)
    cierre-con-tanto   25 capas · 27 en total   ← lo que quedó

Los recuadros no promovían **nada**: listas idénticas elemento por elemento. Lo
que quedó **sube 4, y se sabe cuáles**: cada `<CartaApoyada>` trae `anim-caer` y
`anim-sombra`, o sea dos `ActiveTransformAnimation`. Dos cartas, cuatro capas.
**Son las mismas que promueve cualquier carta que se tira.**

Y subir no es malo por sí solo: el arreglo que APAGÓ las manchitas el 8/9 subió
este número de 21 a 28.

**Lo que NO se midió, dicho para que nadie lo lea de más: las manchitas en el
teléfono.** Eso sólo lo contesta `rig-celular.mjs` con el Redmi enchufado, y esta
sesión no lo tuvo. Queda como pendiente número uno.

### CUATRO VECES QUE UNA MEDICIÓN DIO "OK" SIN MEDIR NADA

Es el tema de la sesión, y las cuatro se descubrieron mirando en vez de creyendo:

1. **El autoataque corría contra `out/`, que no existía.** `build:app` hace
   `rm -rf out`, así que las 32 URLs daban 404 — y el guión informó **"ok"
   dieciséis veces sobre la página de error de Python**. Ahora aborta si la
   respuesta no viene 200.
2. **El mismo ataque daba FALLA por coincidencia.** Buscaba el payload crudo en
   todo el `innerHTML`, y "constructor", "prototype", "toString" y "escudo" son
   palabras que aparecen solas en el JS de React. Ahora mira el texto visible y
   los atributos.
3. **`capas.mjs` midió el cierre sin `refrescar()`** y dio **0 capas nuestras y 0
   EN TOTAL**. Cero en total es imposible: era el árbol de capas vacío, no una
   medición. El propio archivo ya lo avisaba treinta líneas más arriba.
4. **La prueba del premio se iba al mazo** para que la partida avanzara rápido.
   Perdió las dos partidas, el premio no salió —lógico— y reportó "ok" las dos
   veces. Ahora canta falta envido para ganar en una mano, y **si no se gana
   ninguna partida, FALLA**.

Y una quinta, al revés: la prueba del premio reportó **"ganó y no salió el
premio"** sobre algo que funcionaba. `innerText` devuelve el texto ya
transformado por el CSS, y la línea del premio va en `uppercase`. Se descubrió
mirando la captura, donde el premio estaba en pantalla.

### LOS SABOTAJES, QUE ES COMO SE LE CREE A UN GUARDIÁN

Se rompió a propósito, y todos se agarraron:

- **`tantos-al-cierre.ts`**, tres: filtrar las cartas del callado, volver a no
  mostrar con la mano entera, y resaltar las tres cartas del envido. **El tercero
  no se agarraba** —resaltar todo pasaba las 174 pruebas— y por eso se agregó la
  aserción que cuenta cuántas se resaltan.
- **`cartas-en-mesa.ts`**, cuatro: mostrar a cualquiera, mostrar al perdedor,
  apoyar todo en el mismo lugar, y no mostrar nunca nada.
- **`mirar-web.mjs`**: se le borró la función entera y el guardián **seguía en
  verde**, imprimiendo "no se llegó a cerrar una mano" tres veces. Ahora falla si
  no se enseñó en ninguno de los tres tamaños. Es el error del 7/9 con
  `atajos === "Aprender·Jugar"`, otra vez.
- **`mirar-web.mjs`** de nuevo: la comprobación nueva de "no se monta al
  medallón" **medía el contenedor** de `w-[min(78%,340px)]`, que ocupa casi toda
  la franja con la mitad izquierda vacía, y fallaba con el cuadro a 40px del
  texto más cercano. Es el error que `mirar-rivales.mjs` ya cometió tres veces.
  Ahora mide lo que realmente pinta.

### EL REPASO DE SEGURIDAD

`security-review` **dos veces** (una por mitad de la sesión) y `09-web-security`
sobre la web. **No** `17-mobile-security`: no se tocó Capacitor, ni el manifest,
ni nada del APK, y eso se dice en vez de correrla por costumbre.

**Ningún hallazgo, y la invariante que importa se verificó empíricamente**, no
leyendo: **181.380 estados** sobre 33.458 manos, llamando a `cartasEnMesa()` en
CADA estado incluido a media mano. Se enseñaron cartas 9.876 veces, o sea que el
camino positivo se ejercitó de verdad y no fue un pase vacío.

Lo que se comprobó:

- con `fase === "jugando"`, cero cartas, siempre;
- toda carta enseñada es de alguien con `revelado === true`, está en su
  `manoInicial` de ESA mano y en sus cartas sin jugar;
- el que dijo "son buenas" y el que perdió el envido no enseñan nada;
- **ninguna carta sobrevive a la mano siguiente**: `enMesa` se calcula fresco en
  cada dibujado desde el `p` actual, nunca se guarda en estado.

Un caso raro que apareció y se cerró: `sumar()` puede llevar a alguien a 30 **a
media mano** (cobrando la flor), y ahí quedan cartas sin jugar con la partida
terminada. Se verificó que no es explotable: `accionesPosibles()` devuelve `[]`
para los dos y `aplicar()` es identidad.

**El autoataque a los parámetros de URL**: 32 payloads —cadena de prototipos, XSS
en cuatro contextos, path traversal, doble codificación— contra el build de
producción. **Ninguno pasó**, y se comprobó saboteando la portada que el ataque
sirve. Los dos parámetros ya no existen igual.

#### Y el `.gitignore` tenía dos puertas abiertas

Salió de una pregunta de Santiago sobre qué hay en el repo público. Los archivos
de la raíz están todos bien —`next-env.d.ts` son cuatro líneas de tipos y no un
archivo de secretos; `wrangler.jsonc` sólo tiene el nombre y la carpeta— pero
preguntándole a `git check-ignore` por los archivos peligrosos que **todavía no
existen** aparecieron dos que no estaban cubiertos:

- **`key.properties`**, que es el nombre que usa la documentación oficial de
  Android para el archivo con la contraseña del keystore. Estaba
  `keystore.properties`, el de la plantilla de Capacitor, pero no el otro — y el
  otro es el que va a existir el día que se firme para Play Store.
- **`*.apk` y `*.aab` en la raíz.** `android/.gitignore` los cubre, pero sólo
  dentro de esa carpeta: un `app-release.apk` copiado a la raíz para probarlo
  entraba al repo, con la firma adentro.

Ninguno de los dos existe hoy. Es cerrar la puerta antes, no después.

### ESTADO AL CERRAR

`npm test` **180/180** (174 antes, +6 de `cartas-en-mesa`) · `tsc` limpio ·
`mirar-mesa` los siete tamaños · `mirar-mesa-nueva` los seis, con "la mesa no se
mueve" en 0 · `mirar-web` TODO OK · `mirar-app-compilada` OK · los dos builds OK.

Archivos tocados: `app/page.tsx`, `app/globals.css`, `app/jugar/mesa/page.tsx`,
`components/mesa/Dialogo.tsx`, `lib/motor/{partida,tantos,personalidades}.ts` y
sus tests, `lib/tantos-al-cierre.ts` y su test, `herramientas/{capas,mirar-web,
mirar-mesa-nueva}.mjs`, `.gitignore` y este archivo.
Nuevos: `components/Marca.tsx`, `components/mesa/Tantos.tsx`,
`lib/cartas-en-mesa.ts` y su test.
Borrados: `lib/motor/versos.ts` y `lib/motor/versos.test.ts`.

**Sin commitear.**

### PENDIENTE

1. **Mirar todo esto en el Redmi.** Es lo único que no se pudo medir: las cuatro
   capas nuevas del cierre de mano son las de cualquier carta que se tira, pero
   eso es un argumento, no una medición. `rig-celular.mjs`, con el teléfono.
2. **El pendiente del 10/9 a la mañana sigue abierto**: confirmar en el APK
   compilado el arreglo de `.pantalla-fija .carta`.
3. **`ALTURA` y `APOYO` de `lib/objetos.ts` quedaron sin consumidor de
   producción** (sólo los usa su test). No se borran: son el dato de cómo se
   apoya cada objeto el día que vuelva a haber uno sobre la mesa.
4. Las cromáticas del mapa, el servidor de Capacitor y las carpetas, y
   `bloques.mjs` con la causa mal escrita: los tres siguen de la lista anterior.
5. Prender AdMob. Antes van los legales.

## 2026-09-10 — El menú de jugar: ARREGLADO. Y el modelo del bug era equivocado.

Octava sesión con las manchitas y la que cierra el tema: **era el último bug de
dibujo que quedaba**. Salió el arreglo, con número, y de paso se cayó el modelo
físico con el que el proyecto venía trabajando desde el 5/9. Lo tiró abajo
Santiago mirando colores, no yo midiendo.

Además esta entrada recupera **la sesión del 9/9, que nunca se escribió acá**.
Lo que se sabía de ella estaba sólo en los comentarios de `rig-celular.mjs`.

### LO QUE CAMBIÓ DE VERDAD: EL REPARTO DE TAREAS

**Santiago toca el teléfono. Claude sólo mide.** No es una comodidad: es la
única forma que hay de que el bug aparezca.

El 9/9 el rig tocó 16 veces solo, con `adb shell input tap`, por el recorrido
correcto, y de esas 16 vueltas volvió **UNA sucia**. Con eso no se distingue
ninguna rama de ninguna. El bug pide el ritmo de una persona —los tiempos entre
toques, el dedo tapando media pantalla, la vuelta saliendo antes de que la
pantalla termine de asentarse— y `input tap` no lo tiene.

Con Santiago tocando, la misma rama de control dio **14 de 15 sucias**.

Reglas del reparto, que quedan escritas porque valen para la próxima:

- Claude **no toca la pantalla, no navega, no escribe el `localStorage`, no
  instala ni desinstala**. Sólo lee: `screencap`, screencast, `dumpsys`,
  `/proc`, y consultas a la página que no la modifican.
- La única excepción autorizada es **inyectar el CSS de cada rama** con
  `addStyleTag`. Eso es lo que hace que cambiar de candidato cueste
  milisegundos, y de ahí sale lo mejor del diseño experimental: **las ramas se
  alternan por debajo mientras la persona juega de corrido**. Santiago hizo 32
  idas y vueltas seguidas sin saber cuál estaba puesta. El cansancio de la
  mano, la deriva de memoria del teléfono y el cambio de ritmo le pegaron
  **igual a las dos ramas**, que es algo que las corridas del 8/9 —una rama
  entera y después la otra— no podían decir.

### EL DEFECTO DEL MÉTODO, QUE HACÍA DAR CERO CON LA PANTALLA ROTA

Esto es lo primero que hubo que arreglar, y es la razón por la que el 9/9 no
llegó a ninguna parte.

El recorrido `--menu` del 9/9 no usaba `bloques.mjs` —bien: en esta pantalla el
papel es casi neutro y da 0 con la pantalla rota—. Usaba otra cosa: agrupaba
las fotos por hash y **llamaba «limpia» a la que más se repetía**.

**Esa basura es DETERMINISTA.** Ya estaba medido el 8/9 en el mapa (20 tandas,
los bloques cayendo en exactamente los mismos dos píxeles) y se confirmó hoy en
el menú. La rama de control dio, vuelta tras vuelta:

    855 · 855 · 823 · 855 · 855 · 854 · 855 · 823 · 855 · 855 · 855 · 855 · 855

O sea que **todas las fotos salen idénticas entre sí Y SUCIAS**, el método las
corona referencia limpia, y reporta **0 sucias con la pantalla rota**. Da cero
justo cuando el bug está.

Se descubrió porque Claude dijo «salieron limpias» y Santiago contestó **«no
salió limpio, yo los vi»**. Sin esa corrección, la sesión entera habría medido
ruido.

**El arreglo: la referencia limpia se PIDE, no se adivina.** Santiago miró la
pantalla, dijo «ahora está limpia», y esa foto quedó como patrón de toda la
sesión (`capturas/celular/REFERENCIA-menu-limpio.png`, que no se sube porque
`capturas/` está en `.gitignore`).

Que eso sea válido se comprobó antes de usarlo, contra la única foto sucia que
sobrevivió del 9/9:

    zona 720x1410  ·  32 px distintos  ·  1 mancha de 8x4 en (280,1012)

Todo el menú —720x1410 píxeles— **idéntico byte a byte** entre una foto de
ayer y una de hoy, salvo esa mancha. **El dibujo es estable al píxel entre
corridas y entre días**, así que comparar contra una referencia fija es
correcto y no hay corrimiento de distribución que la ensucie.

### EL SEGUNDO DEFECTO: LA ZONA QUE SE MIRABA ERA DEMASIADO CHICA

El 9/9 se medía la caja de las CARTAS más 16px (262x204). Santiago venía
diciendo desde el principio **«las cartas Y LAS LETRAS»**. Si la basura caía
sobre «GIRA NACIONAL» o sobre el texto de abajo, la medición no la veía.

Ahora se mira `.pantalla-fija` entera. Deja afuera el reloj del sistema —que
cambia cada minuto y ensuciaría toda comparación— y la barra del sitio.

### LAS MEDICIONES

Tres corridas, todas con Santiago tocando y las ramas alternándose por debajo.
Contra la referencia limpia, y **separando las dos zonas de la pantalla**, que
es lo que destapó el caso:

**Corrida 1 · A contra H · 29 vueltas · sólo el camino de la gira**

                                     zona GIRA        zona PARTIDA RÁPIDA
    A  como estaba (15 fotos)     14/15 · media 791     14/15 · media 43
    H  opacity .999 en .halo-pieza  8/8 · media   1      8/8 · media 32

**Corrida 2 · A contra F contra E · 12 vueltas · caminos variados**

    A  como estaba      690 px (max 855)      23 px
    E  opacity en los 3 bloques de la pantalla   598 px (max 615)   47 px
    F  opacity en las CUATRO cartas                1 px             9 px

**Corrida 3 · A contra F · 9 vueltas · SÓLO el camino de partida rápida**

    A  4/4 sucias · zona gira media 835 · zona partida rápida 45
    F  4/4 en exactamente 10 px (1 + 9), las cuatro veces iguales

**F gana: de 879 píxeles a 10.**

Y esos 10 no son basura. Son diferencias de **4 a 8 sobre 255** en el contorno
de las cartas —el antialias de la propia opacidad—, constantes en todas las
fotos. La basura de verdad tiene saltos de **65 a 129** y cambia de vuelta en
vuelta. Son dos poblaciones y no se confunden.

**H se descarta aunque limpie la zona de la gira igual de bien** (1 px): como
`.halo-pieza` sólo existe en las cartas de la gira, deja intacta la basura de
la zona de Partida rápida. Las cuatro cartas es lo que cubre las dos.

**E queda descartada de plano**: la regla gruesa —una `opacity` por bloque de
la pantalla— casi no mueve el número, y en la zona de partida rápida lo empeora.
Confirma otra vez lo del 8/9: no es «más pasadas, mejor»; es **dónde** se corta.

### QUÉ ES ESTE BUG DE VERDAD. EL MODELO VIEJO ERA EQUIVOCADO.

Hasta hoy esto estaba escrito, en `bloques.mjs` y en `globals.css`, como
**«compresión de bloques de la GPU»**: un mosaico cuyo dato vuelve corrupto.

**Lo tiró abajo Santiago, mirando los colores**, y textualmente: *«esos píxeles
no son randoms, se rompe al hacer el cambio de escena, los píxeles son del
color de la escena anterior»*.

Se midió, y tiene razón. Donde el menú tendría que tener madera oscura:

    (272,1044)  debía ser rgb( 85, 59, 23)  →  es rgb(201,166,105)
    (284,1060)  debía ser rgb( 63, 42, 18)  →  es rgb(199,168,114)
    (228,1016)  debía ser rgb(102, 71, 26)  →  es rgb(201,164, 96)

Ese `rgb(~200,166,105)` es **el pergamino del mapa de la gira** (el 8/9 quedó
medido el papel del mapa en `rgb(181,147,99)`: la misma familia). Viniendo de la
portada la basura sale **marrón**, que es la madera de la portada. Viniendo de
la mesa, del color de la mesa. **El color delata de dónde venís.**

O sea: no es un mosaico que vuelve corrupto. Es un **mosaico VIEJO que se reusa
y no se termina de tapar** cuando se cambia de escena rápido.

Ese modelo explica de una vez cuatro cosas que el viejo no explicaba:

1. **Por qué depende del camino** que hiciste antes.
2. **Por qué «moverlo rápido» lo dispara**, que es como lo reproduce Santiago.
3. **Por qué se limpia solo un rato después**: cuando algo obliga a redibujar
   ese mosaico, la basura desaparece. No es un refresh de la página.
4. **Por qué `opacity` cura y `isolation` no**, que quedó medido el 8/9 sin
   entenderse: una opacidad menor que 1 obliga a Chromium a dibujar ese subárbol
   en un **búfer propio y nuevo**, en vez de reusar el mosaico donde ya había
   dibujado la escena anterior. `isolation` crea el contexto de apilado pero
   sigue pintando sobre lo mismo.

**Este modelo reemplaza al anterior. Los comentarios de `bloques.mjs` que
hablan de AFBC describen bien la FORMA de la basura (cuadraditos de 4x4 planos,
alineados a la grilla de 4) pero se equivocan en la CAUSA.**

### EL ARREGLO

    .pantalla-fija .carta { opacity: 0.999; }

En `app/globals.css`, con la tabla de mediciones al lado, que es como están las
otras dos de la familia. Y en `components/Carta.tsx`, la clase `carta` en las dos
variantes del `<svg>`.

**La clase es a propósito y no es cosmética.** Para medir por el cable alcanzaba
`svg[role="img"]`, pero como regla permanente eso cuelga de un atributo de
accesibilidad: si alguien lo toca, vuelve el bug sin que nadie entienda por qué.

Va atado a `.pantalla-fija` y no a todas las cartas del sitio porque **acá es
donde está medido**. La mesa ya tiene lo suyo (`.escena > *`) y las cartas de
las lecciones no dieron problema nunca.

### LO QUE SE PROBÓ Y SE CAYÓ

- **E, `opacity` en los tres bloques de la pantalla.** Ver arriba: inerte.
- **La hipótesis del cambio de tamaño.** Era la apuesta grande del plan del día
  y **no era la causa**, aunque el mecanismo existe y quedó medido: con un
  `ResizeObserver` puesto en la página se ve que **cada ida y vuelta cambia el
  alto del `body` de 800 a 766 y vuelve** —son los 34px del
  `padding-top: env(safe-area-inset-top)` que `.mesa-pantalla-completa` agrega y
  `.pantalla-fija` no—, más el `.pantalla-fija` entero yendo a `0x0` y volviendo.
  Entre 8 y 53 eventos de cambio de tamaño por vuelta. Pero pasa en TODAS las
  vueltas, también en las limpias, así que no separa nada. **No se tocó el CSS
  de las pantallas completas**: aplicar un cambio a algo que se midió inerte es
  el error que este proyecto ya cometió dos veces.
- **Un detector intrínseco de basura, sin referencia.** Se pensó y se descartó
  leyendo `bloques.mjs`: en esta pantalla el dibujo está lleno de detalle chico
  (letras, palos de las cartas) con la misma firma física que un bloque roto, y
  el propio archivo cuenta que ya se equivocó así una vez. **Acá no se puede
  distinguir basura de dibujo sin una referencia limpia.**

### LA HERRAMIENTA

`herramientas/rig-celular.mjs` gana el modo `--a-mano`:

    node herramientas/rig-celular.mjs --menu --a-mano --ramas A,F \
         --vueltas 16 --bloque 4 --referencia capturas/celular/REFERENCIA-menu-limpio.png

No es un recorrido nuevo: reusa entera la maquinaria del 9/9 y sólo reemplaza
`unaVuelta()` —que toca la pantalla— por esperar a que llegue una persona.

- **Detecta el regreso solo**, sondeando `location.pathname` cada 200ms, sin
  tocar nada. Cuenta el regreso desde CUALQUIER pantalla y no sólo desde la
  gira: Santiago midió a mano que el bug sale por tres caminos (gira, partida
  rápida y portada), y exigir la gira dejaba dos tercios sin medir.
- **El cerrojo acá ESPERA en vez de matar.** Cortar sería tirar media hora de
  trabajo de manos porque entró una llamada. La regla que importa —no
  fotografiar nada que no sea la app— se cumple igual.
- **La comprobación de que sigue en el menú va PEGADA al disparo de la foto.**
  Estaba unos décimos de segundo antes, y en la primera corrida **dos fotos de
  dieciséis salieron siendo el MAPA**.
- **Verifica que la rama aplicó**, preguntando `getComputedStyle` de la carta
  **y del bloque padre**. Con sólo la carta, una rama que le pone la regla al
  padre se ve idéntica al control y se mide un control disfrazado de arreglo.
  Es el error del 8/9 (`@media (hover:hover)`) repetido de otra forma.

### EL REPASO DE SEGURIDAD

`security-review` sobre el diff completo, `09-web-security` sobre la web y
`17-mobile-security` sobre el APK y el manifest.

**Un hallazgo, y era real.** `morir()` es `process.exit(1)`, y **`process.exit`
no ejecuta los bloques `finally`**: el `finally` que cierra el puente a DevTools
no corría nunca por ese camino. No es un camino raro, es **el del cerrojo**: si
el teléfono se bloquea a mitad de una corrida, el rig aborta bien y deja el
inspector del WebView —con permiso para ejecutar JavaScript adentro de la app y
leerle el `localStorage` donde vive la gira— escuchando sin que nadie se entere.
Pasó de verdad hoy al cortar una corrida con `pkill`.

Arreglado con `process.on("exit", cerrarDevtools)`, verificado con una prueba
que lo reproduce. Se agregaron además dos cinturones: el guión del puente ahora
**se apaga solo a los 30 minutos** (para el `kill -9`, que no hay manejador que
atrape) y se **borra del temporal de Windows** al cerrar.

Y un cuarto arreglo que salió de la misma revisión: el encabezado del rig
imprimía el **número de serie del teléfono** cuando `adb devices -l` no traía
`model:`. Las tablas de medición de este proyecto se pegan tal cual en este
archivo y en los comentarios del CSS, o sea que un serial tenía camino directo
al repositorio público. Ahora dice `"celular"`.

Lo que se revisó y salió limpio:

- **El puente sigue atado a UNA sola dirección** (la placa de WSL), no a
  `0.0.0.0`. Ése fue el arreglo del 8/9 y sigue en pie.
- **Sin inyección de comandos**: todos los `spawn`/`spawnSync` usan la forma de
  arreglo y ninguno lleva `shell: true`. Nada de lo que sale del teléfono llega
  a un intérprete.
- **Sin path traversal**: las rutas se arman con la fecha, índices numéricos y
  claves de rama validadas contra `RAMAS_MENU`.
- **El CSS y `Carta.tsx` no abren superficie**: la regla nueva son tres líneas
  de `opacity`, sin `url()`, sin `@import`, sin peticiones de red; el cambio del
  componente agrega texto a un `className` literal.
- **Cabeceras y CSP intactas**: `default-src 'self'`, `frame-ancestors 'none'`,
  `form-action 'none'`, `object-src 'none'`. El build no pide **nada** a la red:
  las tipografías son `.woff2` propias, cero CDN, cero `url(data:)`.
- **El APK**: `webContentsDebuggingEnabled` en `false` —verificado en
  `capacitor.config.ts` **y** en el `capacitor.config.json` ya copiado a
  `android/app/src/main/assets/`—, `usesCleartextTraffic="false"`, sin
  `debuggable`, un solo permiso (`INTERNET`), el único componente exportado es
  la actividad del lanzador y el `FileProvider` está en `exported="false"`.
  `allowBackup="true"` es una decisión tomada y acotada por `backup_rules.xml`
  (se copia `app_webview`, que es donde vive el progreso, y se excluyen los
  cachés). **Sin claves de firma, sin keystores, sin credenciales**: se firma
  con la clave de depuración del SDK. El `app-debug.apk` está ignorado por
  `android/.gitignore`.
- **Barrido de datos personales** sobre el diff y sobre el rig entero (1.963
  líneas): sin rutas `/home/…`, sin `C:\Users`, sin `\\wsl.localhost`, sin
  correos, sin IPs privadas, sin credenciales, sin el serial ni el modelo del
  teléfono.

### ESTADO AL CERRAR

`npm test` **183/183** · `tsc` limpio · `mirar-web`, `mirar-mesa`,
`mirar-mesa-nueva` y `mirar-app-compilada` **TODO OK** · los dos builds OK, y
verificado que la regla llegó al CSS horneado y que las cuatro cartas llevan la
clase en el HTML exportado.

Archivos tocados: `app/globals.css`, `components/Carta.tsx`,
`herramientas/rig-celular.mjs` (nuevo) y este archivo.

**Sin commitear.**

### PENDIENTE

Lo del día, primero:

1. **Confirmar el arreglo en el APK compilado.** Todo lo de hoy se midió con el
   CSS inyectado por el cable, que es lo que permitió alternar ramas. La regla
   que se escribió (`.pantalla-fija .carta`) apunta a las mismas cuatro cartas
   que la que se midió (`svg[role="img"]`), y está verificado en el build, pero
   **falta compilar el APK y que Santiago lo mire**.
2. **Las cromáticas del mapa** siguen sin atacarse de frente: 3 de 20, media
   0,1. **No son el mismo bug** que los bloques.
3. **El servidor de Capacitor no resuelve `/carpeta/` a su `index.html`**, y
   `mirar-app-compilada.mjs` pasa en verde porque prueba otro servidor
   (`python3 -m http.server`, que sí resuelve carpetas).
4. **`bloques.mjs` tiene la causa escrita mal** en sus comentarios (ver arriba).
   Describe bien la forma, se equivoca en el porqué. Vale corregirlo el día que
   se lo toque.
5. **`recorridoMenu` (el automático) quedó como peso muerto**: está medido que
   no reproduce el bug. Duplica además el análisis que ahora vive en
   `informeMenu`. Si nadie lo usa en dos sesiones, se borra.

Y lo que viene después del bug, con cómo se haría y cuánto llevaría. **Nada de
esto está empezado.**

| | Qué es | Cómo se haría | Cuánto |
|---|---|---|---|
| 1 | **Aligerar la mesa.** Santiago la ve muy cargada; el ejemplo que dio es el cartel de «Acá está mi envido / mi flor», que repite algo que ya se dijo | Es texto en `app/jugar/mesa/page.tsx`. Sacarlo es fácil; el riesgo es que **la mesa está medida al píxel** y hay que re-correr `mirar-mesa.mjs` y `mirar-mesa-nueva.mjs` en los siete tamaños | media sesión |
| 2 | **Sonido** | Sonidos cortos propios (no bajados: mismo criterio que el dibujo), un `<audio>` precargado por evento, y un interruptor en Ajustes guardado con el patrón de `lib/progreso.ts` | 1 sesión, más lo que lleve elegir los sonidos |
| 3 | **Legales y privacidad** | `app/legales/privacidad` existe y **hoy promete por escrito que no se recoge nada**: hay que ponerla al día ANTES de los ads, no después. Play pide además la ficha «Seguridad de los datos» | media sesión · **va antes del 4** |
| 4 | **Ads (AdMob)** | La parte difícil ya está hecha: el hueco está reservado y medido (`components/EspacioAnuncio.tsx`), así que encender el banner no le come alto a las cartas. Falta la cuenta de AdMob, el plugin de Capacitor, el consentimiento UMP/GDPR, y decidir si la app se declara dirigida a menores —eso cambia qué anuncios se pueden servir— | 1–2 sesiones + la espera de aprobación de AdMob |
| 5 | **Branding de Play Store** | El icono ya lo hornea `generar-icono.mjs`. Faltan el gráfico de cabecera 1024x500, las capturas y los textos de la ficha. Se lo puede encargar Santiago | 1 sesión |
| 6 | **Mejorar el bot** | `lib/motor/` y `medir-bots.mjs`, que ya mide fuerza jugando torneos entre personalidades. Es afinar y medir, no reescribir | 1–2 sesiones |
| 7 | **Darles historia a los rivales**, que se sienta una persona y no un bot | Hoy cada rival tiene UNA línea de descripción y **los versos son de todos**: `VERSOS` en `lib/motor/versos.ts` es una tabla por tipo de canto, no por rival, así que los 19 dicen las mismas coplas. Tres capas: **(a)** coplas propias por rival o por departamento —la que más se nota y la más barata—; **(b)** que te reconozca: el progreso ya guarda ganadas/jugadas por `id`, así que puede decirte «la última vez me ganaste con la flor» sin guardar nada nuevo; **(c)** trasfondo de verdad. **Los `id` NO se tocan**: son la clave del progreso | 1 sesión por capa |

## 2026-09-08 (noche) — Las manchitas: ENCONTRADAS Y APAGADAS, con número

Séptima sesión, y la primera que las lleva a cero **en el APK de verdad**, en
las dos pantallas. El arreglo es una regla de CSS de tres líneas, y todo lo
demás de esta sesión es cómo se llegó a saber cuál.

### Lo que cambió todo: CDP contra el WebView del teléfono

Seis sesiones midieron la CAUSA en la computadora y el EFECTO en el celular.
`herramientas/capas.mjs` lo dice en su propio encabezado: *"no ve las
promociones que decide la GPU del teléfono. No hay atajo."* Había uno.

Se prendió **temporalmente** `webContentsDebuggingEnabled` en
`capacitor.config.ts`, y con eso el WebView publica su socket de DevTools. Como
`adb.exe` es un programa de Windows, el `adb forward` deja el puerto atado al
`127.0.0.1` de Windows, que WSL no ve: el puente es un reenviador de catorce
líneas corriendo con el `node.exe` de Windows. Desde ahí, **Playwright maneja el
WebView del celular como si fuera un navegador local**: `goto`, `click`,
`evaluate`, `LayerTree`, `Page.startScreencast`.

**`webContentsDebuggingEnabled` quedó de vuelta en `false`.** Verificado: el
`git diff` de `capacitor.config.ts` está vacío.

### Las cuatro mediciones que ubicaron el bug

**1. No lo dibuja nuestro código.** La misma pantalla en la computadora, mismo
viewport (360×800) y mismo DPR (2), con el click verificado (912.677 bytes de
diferencia entre antes y después): **0 bloques**. En el celular, 1,8 de media.

**2. No lo mete la pantalla.** Se capturó el mismo instante por dos caminos: la
foto del framebuffer (`adb exec-out screencap`) y una captura tomada **por dentro
de Chromium** (`Page.startScreencast`). La interna trae los bloques **igual o
más** que la del framebuffer (2 contra 1). O sea que no son SurfaceFlinger, ni
el compositor del sistema, ni la compresión de la pantalla: **ya vienen mal del
rasterizador de Chromium**.

**3. Son deterministas.** En 20 tandas con recarga de página entre medio, los
bloques caen en **exactamente los mismos dos píxeles**: (156,836) y (44,1044).
Mirado al detalle, (44,1044) es un cuadrado de **4×4 de `rgb(53,52,51)`
perfectamente plano rodeado de pergamino `rgb(181,147,99)`** — un agujero gris
en el papel, en zona vacía del dibujo.

**4. Caen donde se redibuja.** Comparando la foto limpia con la tocada, las
franjas que cambian son y 836-839, 868-875, 888-891, 932-939, 1008-1047 (y la
ficha, en 1200-1599). Las manchas están **adentro de esas franjas**.

### EL ARREGLO, y por qué es ése

    .mapa-gira > *:not(defs) { opacity: 0.999; }
    .escena > *              { opacity: 0.999; }

Una `opacity` menor que 1 obliga a Chromium a dibujar ese subárbol en un búfer
aparte y después componerlo. O sea: **parte el rasterizado en pasadas más
chicas**. Medido en el celular, 12 tandas por rama, `--banda 0.15,0.68`:

    A  como estaba                        media 1.8 · 11 de 12 sucias
    B  opacity 0.999 en los hijos del svg media 0.0 ·  0 de 12 sucias
    C  isolation: isolate en los hijos    media 2.3
    D  contain: paint en los hijos        media 1.7

**Es `opacity`, no "crear un contexto de apilado".** `isolation` crea el
contexto igual y no arregla nada. `contain` tampoco. Lo que arregla es el búfer
aparte.

**Y no es "más pasadas siempre mejor":**

    cada uno de los 8 hijos del svg en su pasada     media 0.0
    cada uno de los 19 departamentos en su pasada    media 6.7  ← PEOR

### Verificado en el APK real, no sólo en vivo

Primer intento: **la regla no aplicó**, porque la puse sin querer adentro del
`@media (hover: hover)`, que en un celular no existe. Se detectó preguntándole a
la página `getComputedStyle` — daba `opacity: 1`. Movida afuera:

    mapa, después de tocar   antes 12/20 sucias (media 1,1)  →  0/20 (media 0,0)
    cromáticas               antes  7/20 (media 0,3)         →  3/20 (media 0,1)

**La mesa, jugando SIN salir de la partida** y grabando todos los cuadros por
screencast (que es como se caza un fallo que dura un frame):

    A  control                        9 de 21 cuadros sucios · max 9 bloques
    B  opacity 0.999 en `.escena > *`  0 de 26 cuadros sucios · max 0
    C  sólo el svg de la escena       65 de 80 cuadros sucios

La C importa: el svg tiene UN solo hijo, así que ponerle la opacidad ahí es casi
lo mismo que no partir nada, y sale **siete veces peor que el control**. Confirma
que lo que cuenta es en cuántas pasadas se reparte el dibujo.

### ESTO EXPLICA, POR FIN, LAS DOS MEDICIONES RARAS DEL 8/9 A LA TARDE

Quedaba escrito que aplanar los 37 grupos con `opacity` del mapa salía **doce
veces peor** y que *"partir el dibujo en muchas pasadas chicas estaba
ayudando"*, sin saber por qué. Esta sesión, bisecando el SVG hijo por hijo,
apagar el camino —que son 18 grupos con `opacity` más— salta de 1,8 a **39,2**.

**Los grupos con `opacity` del dibujo no son decoración: están sosteniendo el
rasterizado.** Si alguna vez se aplanan "para simplificar", vuelve el bug.

### LO QUE SE PROBÓ Y SE CAYÓ (para no reintentarlo)

- **Promover el mapa a su propia capa de GPU.** Era la apuesta principal del
  plan de esta sesión. `will-change: transform` dio **7,9** y `translateZ(0)`
  dio **8,5**, contra 1,8 sin tocar nada. **Cinco veces PEOR.** La hipótesis de
  "hacer las superficies estables" está muerta.
- **`android:hardwareAccelerated="false"`** en el `AndroidManifest`. Se compiló,
  se instaló y se midió: **1,5 contra 1,2**. No cambia nada. Revertido.
- **Las banderas de Chromium por `/data/local/tmp/webview-command-line`.** No
  sirve en este teléfono: el WebView sólo lee ese archivo si el WebView MISMO es
  depurable, y acá `ro.debuggable=0`. Verificado con `--force-device-scale-factor=3`,
  que no movió el DPR. Esa vía está cerrada, no perder tiempo.
- **`isolation: isolate` y `contain: paint`.** Ver la tabla de arriba.

### `capas.mjs` decía algo que ahora sabemos que es falso

Decía: *"Si un cambio no baja este número, no hay motivo para creer que arregle
nada"*. El arreglo que apagó las manchitas **SUBE** el total de 21 a 28. Más
superficies compuestas puede ser MEJOR. El archivo quedó corregido: sigue
sirviendo para ver **qué** se promueve y **por qué** (`compositingReasons`), que
es para lo que se usó de verdad, pero **no para predecir manchitas**.

### El rig, que esta vez SÍ queda en el repositorio

`herramientas/rig-celular.mjs`. El del 8/9 a la tarde quedó en el temporal de la
sesión y se perdió. Este tiene:

- el **cerrojo obligatorio**: antes de cada toque y de cada foto pregunta
  `dumpsys activity activities` y corta si el primer plano no es
  `uy.trucouruguayo.app`;
- **cada tanda con su propio control**: recarga, fotografía LIMPIA, toca, y
  fotografía SUCIA. El del 8/9 sacaba 40 fotos seguidas sin recargar, y como la
  basura del mapa QUEDA, esas 40 no eran 40 medidas independientes;
- anota la **memoria libre**, que era la variable que nunca se controló;
- cuenta **las dos poblaciones por separado**, nunca sumadas;
- levanta y baja el puente a DevTools solo.

Para que se lo pueda importar, `celular-usb.mjs` ahora exporta `elCelular()`,
`sacarFoto()`, `adb()` y las constantes, y su línea de comandos quedó detrás del
mismo cerrojo `import.meta.url` que ya usan `motas.mjs` y `medir-bots.mjs`:
**importarlo no compila, no instala y no saca ninguna foto**.

### Un bug NUEVO que apareció de paso, y no es de píxeles

**El servidor local de Capacitor no resuelve `/carpeta/` a
`/carpeta/index.html`: devuelve la PORTADA.** Medido contra el WebView de verdad
en las seis rutas del sitio:

    /aprender/  /anotador/  /jugar/  /jugar/mesa/  /legales/terminos/
    → todas devuelven "Truco Uruguayo — aprender y practicar, gratis"
    /jugar/gira/index.html  → sí devuelve la página correcta (90 KB contra 18)

O sea que el `trailingSlash` que se puso el 1/9 **no arregla lo que dice que
arregla** en el servidor real. `mirar-app-compilada.mjs` no lo ve porque prueba
contra `python3 -m http.server`, **que sí resuelve las carpetas**: el guardián
está probando un servidor distinto del que corre en el teléfono.

Se nota cuando Android mata el proceso del WebView y lo restaura en una ruta
profunda. **No se tocó nada de esto**, porque es otro tema y la sesión se cortó.

### El repaso de seguridad

`security-review` sobre el diff. Lo único que salió es de la herramienta nueva:
**el puente escuchaba en `0.0.0.0`**, o sea en todas las interfaces de Windows,
incluida la del wifi. Eso deja el inspector del WebView —con permiso para
ejecutar JavaScript adentro de la app y leerle el `localStorage`, donde vive la
gira— abierto a cualquiera en la misma red mientras corre el rig. **Corregido**:
ahora se ata sólo a la dirección de la placa de WSL. El CSS y la `className` no
abren superficie de ataque.

El barrido de datos personales sobre el diff dio limpio: sin rutas, sin el
número de serie del teléfono, sin el usuario de Windows, sin credenciales.

### Estado al cerrar

`npm test` **183/183** · `tsc` limpio · `mirar-web`, `mirar-mesa`,
`mirar-mesa-nueva` y `mirar-app-compilada` **TODO OK** · los dos builds OK.

El cambio visual está medido: 0,15% de los píxeles en la gira y 0,35% en la
mesa, todo en bordes horizontales, media de 1,5 y 3,5 sobre 255. A ojo, en la
comparación recortada, son indistinguibles.

**Sin commitear.**

### Pendiente

1. **Terminar de validar la mesa con partidas variadas.** El A/B que la midió
   (9/21 → 0/26) fue con una partida sola por rama. Quedó a medias un guión que
   juega al azar entre envido, real, falta, truco, flor y mazo con semilla fija
   para que las dos ramas jueguen la misma partida de decisiones: se cortó
   cuando se desenchufó el celular. Está en el temporal de la sesión.
2. **Las cromáticas del mapa no llegaron a cero**: 3 de 20 tandas, media 0,1
   (venían de 0,3). Son la otra población, la de 1 píxel CSS y color saturado, y
   **no son el mismo bug que los bloques**. Nunca se las atacó de frente.
3. **El servidor de Capacitor y las carpetas** (arriba). Incluye arreglar
   `mirar-app-compilada.mjs`, que hoy pasa en verde probando otro servidor.
4. **El screencast entrega ~1 cuadro por segundo**, poco para un fallo de un
   frame. Si hace falta más densidad, la salida es ráfagas de `screencap`.
5. Prender AdMob.

## 2026-09-08 (tarde) — Las manchitas del mapa: era el CAMBIO DE TAMAÑO

Sexta sesión con las manchitas, y la primera que las mide con estadística en vez
de con una foto. Salió el arreglo del mapa, con número, y se cayeron dos modelos
que el proyecto daba por buenos.

### Lo que cambió todo: se pudo automatizar

Santiago prendió **«Depuración USB (ajustes de seguridad)»** en el Xiaomi, que
da el permiso `INJECT_EVENTS`. Desde ahí `adb shell input tap` funciona y las
mediciones dejaron de necesitar sus manos: **40 toques por rama en tres
minutos**, en vez de una hora de ida y vuelta por chat.

Los guiones quedaron en el temporal de la sesión, pero la receta es corta:
`adb shell input tap x y` para tocar, `adb exec-out screencap -p` para la foto,
y `bloques.mjs` para contar.

**El cerrojo, que es obligatorio.** Santiago dio permiso para trabajar EN LA APP
y en nada más de su teléfono. Eso se cumple con código, no con cuidado: antes de
cada toque y de cada foto se pregunta `dumpsys activity activities` +
`dumpsys window` y, si el paquete en primer plano no es `uy.trucouruguayo.app`,
el guión corta. Saltó de verdad dos veces y evitó fotografiar el escritorio.

### El disparador, y cómo se encontró

Con el celular enchufado apareció enseguida:

    mapa recién abierto                    0 manchitas
    después de tocar un departamento       aparecen — y QUEDAN

«Quedan» es literal: **80 fotos idénticas byte a byte a lo largo de 76 segundos**,
y lo único que cambiaba entre dos capturas separadas dos minutos eran los 451
píxeles del reloj del sistema. No es la GPU fallando cuadro a cuadro: es una
rasterización que volvió mal y se está reusando de la caché.

### El instrumento estaba bien; lo usé mal

`bloques.mjs` daba 4 donde el ojo contaba 15. **No era el detector: era la
banda.** Analiza una franja vertical y la de por omisión (0,27–0,72) es la de la
mesa; la basura del mapa cae en y=376, arriba de eso. El propio archivo lo
avisa en un comentario y hay una opción `--banda`. Con `--banda 0.17,0.72` el
número pasó a 15, que es exactamente lo que se veía.

**Para el mapa se mide con `--banda 0.15,0.68`.** Con la de la mesa da 0 en
pantallas sucias.

### Las cinco ramas, 40 toques automáticos cada una

    A  original                                40/40 sucias · media  6,3 · max  11
    B  sin el feTurbulence                     40/40 sucias · media  6,1 · max   8
    C  sin los 37 grupos con `opacity`         40/40 sucias · media 77,2 · max 146
    D  mapa con alto fijo 58dvh                 3/40 sucias · media  0,1 · max   4
    D2 mapa con alto fijo 55dvh (control)       4/40 sucias · media  0,3 · max   7
    ★  alto fijo + hueco reservado              0/40 sucias · media  0,0 · max   0

**D y D2 son el control que cierra el caso.** 55dvh es EL MISMO tamaño que tenía
el mapa en la rama A con la ficha puesta. Al mismo tamaño: limpio si se llega
sin resize, sucio si se llega achicándose. **No es la escala, es el cambio.**

### Qué pasaba, en una línea

El mapa era `flex-1`. Al abrirse la ficha del rival, el mapa se achicaba, y
achicarse obliga a rasterizar de nuevo los ~2.000 comandos de dibujo del SVG a
otra escala. Esa rasterización es la que vuelve mal.

El arreglo: **alto fijo** (`calc(100dvh - 18rem)`) y el hueco de la ficha
reservado siempre, para que abrir la ficha no le toque un píxel al mapa. Está
en `app/jugar/gira/page.tsx` con el detalle escrito al lado.

### DOS MODELOS QUE SE CAYERON, y hay que dejar de usarlos

**1. El `feTurbulence` no tenía nada que ver.** Era el sospechoso número uno del
plan, el que venía señalado desde el 7/9. 40/40 con y sin él.

**2. «Cuantas menos superficies compuestas, mejor» es FALSO para el mapa.** Ese
es el modelo con el que se viene trabajando desde el 1/9. La rama C lo probó al
derecho: se aplanaron los 37 grupos con `opacity` —18 tramos del camino, 18
paradas cerradas y el marco— y salió **doce veces peor**, con la basura
repartida por todo el mapa en vez de concentrada. Partir el dibujo en muchas
pasadas chicas estaba **ayudando**.

Lo que sí predice los datos es: **cuánta geometría entra en una sola pasada de
rasterización, y cuántas veces se rehace esa pasada.**

### Dos cosas que se midieron inertes y SE REVIRTIERON

Aplicando la regla del 4/9 —tocar lugares para arreglar algo que se midió inerte
es el error que ya se cometió dos veces—:

- **Memoizar las 19 marcas de `ParadasGira`** (separarlas en un componente con
  `memo`): 5/64 contra 2/48. Misma cifra. Revertido entero.
- **Memoizar el camino** (`useMemo` + `memo`): 2/48 contra 3/40. También inerte.
  **Se dejó puesto igual**, porque ahorrar el redibujado de 18 trazos punteados
  en cada toque es cierto por su cuenta, pero el comentario del código dice
  explícitamente que NO arregla las manchitas. No atribuirle méritos que la
  medición no le dio.

### El cartel de la ficha, que rompí y arreglé

El hueco reservado quedó en 16rem y la ficha no entraba. Con `justify-end`, lo
que sobra **se recorta arriba**: justo donde va el nombre. Santiago lo vio en el
celular ("Luquita" partido al medio, sin el renglón del paso). Está en 18rem y
la ficha perdió el `shrink-0`, así que si algún rival tiene descripción larga en
una pantalla baja, se achica y scrollea en vez de cortarse. Verificado en
320×568, 390×844 y 1440×900: paso y nombre enteros, y el mapa sin cambiar de
tamaño en los tres.

### La mesa: limpia, MENOS al abrir el menú de envido

Jugando automáticamente 12 manos —cantando envido, real envido y falta envido,
contestando, y cambiando de rival cada cuatro manos—: **108 de 114 fotos en 0**.

Las 6 sucias son dos episodios, y los dos empiezan **al abrir el menú de
envido** y se mantienen con la misma cifra en las tres fotos siguientes
(`abre-menu` → `canta` → `responde`, 5 y 5 y 5; después 8 y 8 y 8). O sea ~17%
de las manos. **Es el bug que Santiago describió al abrir la sesión**: "cuando
el rival dice quiero, hay como un segundo donde se crean esas motas".

La basura NO cae en los botones: cae en la **madera de la mesa**, alrededor del
mate (x 72-683, y 598-713), con un azul violeta y un verde imposibles.

**Y el mecanismo del mapa no explica éste**: el menú va `absolute` y está
escrito y verificado que no le corre un píxel a la mesa. Es otra cosa. La
sospecha razonable —sin medir todavía, y por eso no se tocó nada— es que un
elemento `z-30` que aparece encima de la escena promueve por solapamiento lo que
tiene debajo, que es exactamente la mesa donde cae la basura.

### Estado al cerrar

`npm test` 183/183 · `tsc` limpio · `mirar-web` y `mirar-mesa` TODO OK · los dos
builds OK · sin commitear.

### Pendiente

1. **El menú de envido de la mesa.** Está reproducido, cuantificado (~17% de las
   manos) y localizado. Es lo próximo, y con el rig automático es media hora.
2. **El resto del mapa.** Queda un piso de 1-2 bloques en un 5-8% de las
   pantallas. Bajó de 6,3 de media a 0,15, pero no es cero.
3. **MIUI bloquea la instalación** cada dos o tres veces
   (`INSTALL_FAILED_USER_RESTRICTED`). La receta que funciona es
   `pm uninstall --user 0` y después instalar, reintentando: suele entrar al
   segundo o tercer intento.
4. **El hueco negro de la ficha** en pantallas altas. Santiago lo dejó pasar por
   ahora; la alternativa es superponer la ficha sobre el mapa en vez de
   reservarle lugar.
5. Prender AdMob. El anotador ya tiene su hueco.

## 2026-09-08 — El anotador, el engranaje, y Git deja de ser mío

Sesión de agregar, no de arreglar. Las manchitas quedaron para la próxima, con
el celular enchufado; lo que se hizo fue lo nuevo.

### La regla más importante del día no es código

**Claude no commitea ni pushea más. Nunca.** Santiago lo pidió en mayúsculas y
quedó escrito en `CLAUDE.md`, que ahora tiene una sección *Git: Claude no
commitea ni pushea. Nunca.* donde antes decía lo contrario. El trabajo se deja
en el árbol, se dice qué archivos se tocaron, y publicar lo decide él.

De paso se escribieron como reglas dos cosas que estaban mencionadas al pasar:
**revisar el diff buscando datos personales antes de dar algo por terminado**
—el repo es público y lo que entra a Git no se va más— y **correr la revisión
de seguridad con las skills, nombrándolas** (`security-review` siempre;
`09-web-security` o `17-mobile-security` según qué se tocó).

Ojo: **`CLAUDE.md` está en `.gitignore`** (línea 136). O sea que esas reglas
viven sólo en la máquina de Santiago y no se suben. Está bien que sea así, pero
conviene saberlo: una sesión que trabaje en un clon limpio no las tiene.

### El anotador: `/anotador`

La tablita de treinta, para cuando se juega con cartas de verdad. Es la primera
pantalla del proyecto que **sirve sin la app**.

Las reglas van en `lib/anotador.ts`, con quince pruebas propias, por lo mismo
que `botonera.ts` y `navegacion.ts`: la pantalla no decide reglas. Ahí está qué
es una mala y qué una buena (primeros 15 y últimos 15), cuántos palitos lleva un
grupo a medio hacer, que "1 buena" no se diga "1 buenas", y el saneo de lo que
sale del `localStorage`.

**Clave propia, `truco-uy:anotador`, separada de `truco-uy:progreso`.** No es
prolijidad: el progreso es la gira y los trofeos, y `CLAUDE.md` avisa dos veces
de lo caro que sale tocar dónde vive eso. Si algún día hay que borrar la cuenta
del anotador, se borra esa clave y la gira ni se entera.

La prueba que más vale de las quince: **que los palitos dibujados sean
exactamente los puntos**, recorriendo los 16 valores posibles de una mitad. Un
error de un punto en el reparto de grupos no lo ve nadie leyendo el código; lo
descubriría Santiago contando cuadraditos en el celular.

### El dibujo: tres capturas y dos bugs de distribución

El diseño salió de una referencia que mandó Santiago —otra app de anotar— y se
replicó **la estructura**: dos columnas con los nombres, a cuánto se juega en el
medio, el renglón de "7 malas / 1 buena" debajo de cada nombre, la raya que
separa malas de buenas y los cuadraditos de cinco palitos. El material es el de
esta casa: papel viejo sobre la mesa del boliche, tinta bordo.

**Primera captura**: los cuadraditos salían de a dos por fila, chicos y
amontonados arriba, con media hoja vacía. Santiago pidió **uno por renglón,
tres y tres, más grandes**, y un hueco de anuncio abajo con lo que sobraba.

Y ahí aparecieron dos bugs de alto que **no se veían leyendo el código**, los
dos de la misma familia —una cadena de alto cortada— y los dos encontrados
midiendo el DOM, no mirando la captura:

1. **La grilla de la tablita no declaraba fila.** `grid-cols-2` sin
   `grid-rows-1`: la única fila era implícita, y las implícitas son `auto`, así
   que crecían con el contenido en vez de repartirse el alto. Medido: una mitad
   en 147px y la otra en 360.
2. **El `<div>` que dibujaba la raya de malas/buenas cortaba el alto.** Era el
   hijo de la grilla y se llevaba los 147px del renglón, pero adentro la mitad
   quedaba en `height: auto`, así que sus tres renglones de `1fr` no tenían
   contra qué resolverse y **cada cuadradito caía en el tamaño de su `viewBox`**:
   124×124 abajo contra 124×45 arriba. Se veía como un cuadrado gigante en las
   buenas. La raya pasó a ir en la propia mitad, sin envoltorio.

**La lección, que ya es la tercera vez**: `min-h-0` y `flex-1` no alcanzan si en
el medio hay un elemento que no propaga el alto. Un `<div>` puesto para colgarle
un borde puede romper seis niveles más abajo.

El pulso de la mano —que los palitos no cierren de escuadra— sale de una cuenta
**fija según la posición del grupo**, calculada una vez al cargar el módulo.
Con `Math.random()` los treinta palitos temblarían en cada dibujo, o sea repintar
la pantalla entera cada vez que se aprieta `+`.

### El engranaje, y por qué la barra ya no lista pantallas

`components/MenuAjustes.tsx`. La barra de arriba tenía dos huecos y ya eran tres
las pantallas —el sonido va a ser la cuarta—: a 320px no entran. Un engranaje
ocupa uno y adentro entran las que sean.

Adentro: Aprender, Jugar, Anotador, Sonido (apagado, con "próximamente": se
reserva el lugar, no la función) y los legales, que hasta hoy sólo se alcanzaban
desde el pie de `/aprender`.

**El panel es `role="dialog" aria-modal="true"`, y eso es lo que lo hace andar
en el teléfono sin tocar una línea de Android.** `BotonAtrasAndroid.tsx` busca
exactamente ese selector y le manda `Escape`: el botón físico de atrás cierra el
panel en vez de sacarte de la pantalla, gratis, por cumplir un contrato que ya
existía para la vitrina de trofeos.

**Fondo opaco (`bg-noche`), sin `/95` ni `backdrop-blur`.** Una hoja translúcida
a pantalla completa obliga a componer todo lo de abajo en una superficie aparte,
que es literalmente el bug de las manchitas. No se ve peor.

### El control nuevo se rompió a propósito antes de creerle

`mirar-web.mjs` comprobaba `atajos === "Aprender·Jugar"`, y con el engranaje eso
quedaba mirando cero elementos: **habría seguido diciendo OK con la navegación
rota**. Es exactamente el error del 7/9.

Ahora hay un bloque nuevo, *el panel de ajustes*, que comprueba tres cosas por
separado —que abra, que ofrezca los tres destinos, y que `Escape` lo cierre (la
misma tecla que simula el atrás de Android)— y **se verificó rompiéndolo**: con
el destino del anotador cambiado, falla en los tres tamaños con el mensaje
correcto y sale con código 1.

El engranaje se busca por `aria-label`, y eso no es accesibilidad decorativa: es
un botón sin texto, así que ése es su único nombre. Si alguien se lo saca, la
prueba falla, que es lo que corresponde.

### El repaso de seguridad encontró una promesa vencida

El diff no abre superficie de ataque: es marcado, CSS y una clave nueva de
`localStorage` que sanea igual de duro que `lib/progreso.ts` —entero, no
negativo, con techo de 30, y devolviendo un objeto literal de dos campos, así
que nada de lo guardado se cuela—. Sin scripts nuevos, sin red, sin cambios en
la CSP.

Lo que sí apareció: **`app/legales/privacidad` decía "lo único que se guarda es
tu progreso en la gira"**, y desde hoy también se guarda la cuenta del anotador.
Esa página promete por escrito y ahora nombra las dos cosas. Es la clase de cosa
que no rompe nada y sin embargo es la que Play Store mira.

El barrido de datos personales sobre el diff dio limpio.

### Estado al cerrar

`npm test` **183/183** · `tsc --noEmit` limpio · `mirar-web`, `mirar-mesa` y
`mirar-app-compilada` **TODO OK** · los dos builds OK · `/anotador/` aguanta la
recarga dura en el export de la app, con `index.html` en su carpeta.

**Sin commitear**, que es la regla nueva.

### Pendiente

1. **Las motas del mapa de la gira, con el celular enchufado.** Santiago las
   sigue viendo, y el 7/9 el mapa midió 0 en ocho fotos: la medición no estaba
   mirando el caso que falla. **No tocar nada antes de tener el número.** Los
   sospechosos, en orden: el `feTurbulence` de `MapaUruguay.tsx:66` (un filtro
   sobre la hoja entera; el A/B que lo absolvió corrió en la compu, y
   `capas.mjs` no ve lo que decide la GPU del teléfono), la marcha de hormigas
   del camino, y el `anim-pop` de la ficha de la parada.
2. **Las motas al cantar envido cuando el rival dice QUIERO**, ~1 s. Santiago
   las describió hoy. Con el teléfono enchufado se fotografían en la misma
   corrida.
3. Si el culpable es el `feTurbulence`: hornearlo, como `generar-escena.mjs`
   hornea la madera.
4. **Medir en el APK**, que es lo que Santiago juega.
5. `deviceScaleFactor: 2` en las herramientas que todavía miran a DPR 1.
6. Prender AdMob. El anotador ya tiene su hueco reservado.

## 2026-09-07 — El instrumento era ciego, y la banda de la mano seguía viva

Quinta sesión con las manchitas. Las cuatro anteriores diagnosticaron mirando un
número; ésta empezó preguntándole al número si servía, y no servía.

### Lo primero que se midió, y cambió todo lo demás

`bloques.mjs` —el detector del 5/9— da **0 en las seis capturas** que Santiago
dejó en `Bugs a arreglar/bugs 0709/`. No estaban limpias: **el detector era
ciego**. Exige que la manchita sea neutra y caiga en la grilla de 4, y las de
hoy no son ni una cosa ni la otra.

Medidas sobre el framebuffer: cuadraditos de **2×2 px**, en colores saturados y
fuera de la paleta —`rgb(33,13,123)`, `rgb(48,171,250)`, `rgb(227,10,10)`—. Y
`adb shell wm density` da 320, o sea **DPR 2**: 2 px de pantalla son **1 px CSS
exacto**. Otro tamaño y otro color que las del 5/9. **Dos poblaciones
distintas**, y por eso ahora se cuentan por separado y no se suman nunca.

### El instrumento nuevo, y las dos calibraciones que se cayeron

La población cromática se busca comparando contra **el vecindario, no contra la
paleta**: decir "el proyecto es cálido, un azul no es nuestro" marcaría media
carta de espadas apoyada en la mesa.

Se probaron dos afinaciones más y **las dos se cayeron con número**, así que
quedan escritas adentro del archivo para que nadie las reintente:

1. **Un piso de tamaño de 2×2** ("a DPR 2 nada del compositor puede medir
   menos"). Suena bien y está mal: el ruido denso se fragmenta, porque sus
   vecinos también son ruido y sólo algunos píxeles se salen del rango. Con el
   piso puesto la banda de la mano pasaba de **319 a 2**.
2. **Apretar el umbral de ángulo** para sacar un falso positivo. Los cosenos
   dicen que no se puede: el dorso bordo del mazo (dibujo) da **0,906** y la
   basura de la banda tiene **mediana 0,955**. La basura se parece MÁS a su
   vecindario que el dibujo. Se solapan, y apretar se lleva la que importa.

Así que **el detector tiene un piso conocido de hasta 9 por cuadro en la mesa**
—el dorso del mazo asomando junto a la muestra— y se lee sabiendo eso. Alcanza
de sobra: la banda daba 213 y 319 sobre la misma pantalla.

Validado en cuatro tandas: **319** en la foto con banda · máximo **9** en 45
fotos de una partida limpia · **0** en las 38 texturas horneadas · **2 a 8** en
las seis capturas de Santiago.

### `herramientas/capas.mjs`: contar la CAUSA, que sí se puede sin el teléfono

El laboratorio ya avisaba que en la compu el glitch no se reproduce (SwiftShader
dibuja limpio), o sea que medir el EFECTO acá es imposible —y sin embargo se
intentó cuatro veces—. Pero la CAUSA sí: la única palanca demostrada es cuántas
superficies compuestas le damos a comprimir a la GPU. Se cuentan por CDP con
`LayerTree.compositingReasons`, que además dice POR QUÉ cada capa es una capa, y
`DOM.describeNode`, que dice cuál.

Tres trampas que costaron una corrida cada una y quedan documentadas adentro:
navegar TIRA el árbol de capas; una pantalla quieta **no confirma ningún
cuadro** y entonces el árbol no llega nunca (hay que forzarlo con una captura de
8×8); y `node.attributes` viene PLANO, así que leerlo con `indexOf` reporta
clases que no existen.

### Lo que se arregló, con el número al lado

    ANTES              menú 3 · mapa 9 · mesa quieta 3 · envido 9 · flor 6
    DESPUÉS            todas 3          (el piso: raíz, scroll y viewport)
    total 45 → 21

**1. `.anim-pop`: `both` → `backwards`.** Medido 1,4 s después de cantar —diez
veces lo que dura la animación de 140 ms— la capa seguía puesta, porque `both`
deja el último fotograma pegado y mantiene la animación activa. Y no costaba una
capa: costaba **tres**, porque todo lo que pisa a una capa se promueve también
(`Overlap`), y esos `Overlap` medían 360×251 y 360×179 —media mesa cada uno—
justo donde Santiago fotografía manchitas al cantar. Cambio de una palabra, y es
el mismo criterio que ya estaba escrito para `.anim-reparte`. **Invisible**: el
fotograma del 100% es `opacity:1` y `scale(1)`, o sea el estado natural;
comprobado que al terminar el elemento queda con `transform: none` y cero
animaciones registradas.

**2. El rebote del sombrero del mapa, `.ficha-gaucho`.** A/B en el navegador,
sin tocar código: sin la marcha de hormigas, 6 capas; sin el `feTurbulence`, 6;
**sin el sombrero, 0**. Las seis las provocaba él solo, y en bucle infinito, o
sea recomponiéndose en cada cuadro mientras el mapa estuviera en pantalla. El
plan de esta sesión apostaba a las hormigas: **la medición dijo que no.** Lo
aprobó Santiago con las dos capturas al lado.

**3. El apagado de la mano.** Es el hallazgo grande, y está fotografiado.

### La banda: el bug del 1/9 nunca se había ido

Mirando el celular en vivo apareció **un rectángulo entero de ruido RGB**, con
las cartas dibujadas limpias encima. No es una manchita: es una superficie que
volvió mal.

    caja de [data-mano]              arranca en y=1109 de pantalla, alto 310
    banda de ruido medida en la foto arranca en y=1105,             alto 295

Es el **mismo bug del 1/9/2026** que el código daba por cerrado —"una banda de
rayas del tamaño exacto de la mano"—. Ese día se le sacó el `filter` de adentro
y bajó siete veces, pero el disparador que quedaba era el **`opacity` del
grupo**: un grupo translúcido obliga a dibujar todo lo de adentro en una textura
aparte para después mezclarla. Se repitió idéntica en doce cuadros a lo largo de
24 s: cuando vuelve mal, queda mal.

Se sacó el apagado, con permiso de Santiago y con la foto delante. Se pierde que
la mano se atenúe cuando no te toca; la señal sigue estando y es más fuerte —la
barra pasa a QUIERO / NO QUIERO y las cartas no responden—. De paso el agarre
`data-mano="apagable"` pasó a llamarse **`data-mano="tuya"`**: ya no apaga nada,
y un nombre que miente cuesta una sesión (`mirar-mesa.mjs` actualizado).

**Después: 45 fotos de Santiago jugando de verdad** —cantando envido, falta
envido y flor, con 165 MB libres y 31 pestañas, o sea en las mismas condiciones
en que apareció— y **ni una banda**: 32 cuadros en 0, 10 en 1 y 3 en 2 dentro de
la caja de la mano, contra 213-319 cuando estaba.

### Lo que NO está probado, dicho para que nadie lo lea de más

**45 cuadros limpios no prueban que la banda se fue**: es intermitente. Con
`am force-stop` de Chrome entre cargas —que libera memoria— tampoco había
aparecido en 8 cargas ANTES del arreglo. Apareció con 86 MB libres y 30
pestañas. Lo que hay es la coincidencia al píxel de la caja, el mecanismo, y una
partida entera limpia; no un A/B controlado.

Y hubo un A/B que **salió inválido y se dice**: el guión no recargaba la página
entre brazos, así que las dos corridas eran la misma pantalla. Se detectó al
mirar la foto en vez de creerle al número.

### Los límites del banco, medidos hoy

- **`capas.mjs` no ve todo.** Con la mano apagada, en la compu no se promueve
  ninguna capa en ninguno de los tres casos probados. Ve las promociones que
  manda la especificación (una animación corriendo promueve en cualquier
  plataforma) pero **no las que decide la GPU del teléfono**. No hay atajo.
- **No se puede tocar la pantalla desde acá.** `adb shell input tap` lo rechaza
  el teléfono: falta `INJECT_EVENTS`, que en Xiaomi se habilita con "Depuración
  USB (ajustes de seguridad)". Santiago prefirió ir tocando él, y así se
  hicieron las 45 fotos.
- **El intent abre una PESTAÑA NUEVA siempre**, incluso con
  `com.android.browser.application_id`. Probado. La salida es `am force-stop`
  entre corridas, o interponer A y B para que la deriva de memoria les pegue
  igual a los dos.
- **El mapa midió LIMPIO en el celular** (0 en ocho fotos, 228 MB libres). Sus
  seis capas eran un costo real, no algo que se estuviera viendo.

### Un cambio que se midió inerte y NO se hizo

La transición de `transform` del hover de la carta se iba a meter en
`@media (hover: hover)` —el `:hover` no puede dispararse en un celular—. Se
midió: la mesa quieta ya estaba en el piso de 3 capas. Se dejó como estaba. Es
la regla del 4/9: tocar lugares para arreglar algo que se midió inerte es el
error que ya se cometió dos veces.

### El pendiente nº 1 del 5/9 estaba vencido

El tanto del rival ya estaba arreglado ese mismo día, en `lib/motor/partida.ts`,
con test propio en `lib/tantos-al-cierre.test.ts` (6/6) y confirmado por
`mirar-web`, que enseña un solo número. Se corrigió la entrada del 5/9.
**Al cerrar una sesión, releer la lista de pendientes.**

### El repaso de seguridad encontró un guard que mentía

El diff no toca ninguna superficie de ataque —es CSS, marcado y herramientas—,
pero renombrar `data-mano` dejó a la vista un hueco viejo en `mirar-mesa.mjs`:
el guard que prohíbe `filter` adentro de la escena busca por `data-*`, y si UNA
de sus tres zonas dejaba de enganchar **la salteaba en silencio** y la prueba
seguía dando OK. O sea que se podía volver a meter un `filter` adentro de la
mano —el bug del 1/9— sin que nadie se enterara.

Ahora, si hay mesa y falta un agarre, eso ES la falla. Probado rompiendo el
selector a propósito: falla y dice cuál. `null` sigue queriendo decir "acá no
hay mesa", que es el caso legítimo de la pantalla de menú.

**Un control que pasa en vacío es peor que no tenerlo.**

### Estado al cerrar

`npm test` **168/168** · `tsc --noEmit` limpio · `mirar-mesa`, `mirar-mesa-nueva`,
`mirar-web` y `mirar-rivales` **TODO OK** · los dos builds OK · diff sin datos
personales ni rutas locales.

### Pendiente

1. **Cazar la banda de nuevo, con el arreglo puesto.** Es intermitente y depende
   de la memoria: hace falta dejar el celular jugando un rato largo con pocas
   pestañas libres y medir. Si no vuelve a aparecer nunca, ahí sí está cerrado.
2. **Medir en el APK**, que es lo que Santiago juega: la vista previa es Chrome
   con 31 pestañas encima y no es la misma máquina.
3. **`deviceScaleFactor: 2`** en las herramientas que todavía miran a DPR 1.
4. Prender AdMob (explicado en el README, sin código).

---

## 2026-09-05 — Las manchitas: medidas de verdad, y son de la GPU del teléfono

Cuarta sesión con el mismo pendiente, y esta vez se hizo lo que faltaba desde
el 1/9: **enchufar el celular y mirar el framebuffer**. Las tres hipótesis
anteriores —los filtros, el trazo sub-píxel y el toque— se habían caído al
medirlas. Esta no se cayó, y trae número.

### Qué son las manchitas

Se sacó la foto con `celular-usb.mjs --vigilar` (`adb exec-out screencap -p`:
el framebuffer crudo, sin WhatsApp, sin espejo, sin reescalado) sobre una mesa
con el envido cantado. De las 29 manchitas:

    29 de 29 terminan en un múltiplo de 4
    28 de 29 empiezan en un múltiplo de 4
    29 de 29 arrancan en y ≡ 2 (mod 4)   ← la misma grilla, corrida por la
                                           barra de estado
    anchos: 4px (25), 8px (3)  ·  altos: 4px (26), 8px (2)
    28 de 29 son de UN SOLO COLOR PLANO

**Un dibujo no cae en una grilla de 4.** Eso es la compresión de bloques de la
GPU —la Mali‑G52 del Redmi comprime las superficies compuestas de a 4×4 px— y
un bloque cuyo dato vuelve mal se dibuja como un rectángulo liso.

O sea: **no lo dibuja nuestro código**. Lo que sí está en nuestras manos es
cuántas superficies compuestas le damos a comprimir, y eso ya se demostró:
sacar los filtros el 1/9 y el 4/9 bajó la densidad de manchitas de 20.064 a
2.870 por Mpx —**7 veces**— sin tocar una sola forma. La regla de "ni un
filtro en la escena" se queda, y ahora se sabe POR QUÉ funciona.

### Las otras cuatro cosas que se descartaron con número

1. **Las texturas horneadas están limpias.** `public/escenas/*-mesa.webp`:
   luminancia máxima 106–129 y cero motas, contra 150–250 de las manchitas. No
   hay nada que arreglar en `generar-escena.mjs`.
2. **No es basura de JPEG.** Las capturas de WhatsApp son 720×1600 —el
   framebuffer real— y sus tablas de cuantización son todo unos (calidad ~100):
   el brillo se preserva entero, y no hay alineación con la grilla de 8 (chi² =
   4,5 en x).
3. **Pero el COLOR de las manchitas no sirve como pista**: el JPEG es 4:2:0, o
   sea que la crominancia va a la mitad de resolución. Los puntitos cian y
   magenta del borde de las cartas los puede haber fabricado el transporte.
   **Sólo el brillo es dato.**
4. **`/aprender` no está sano: es una página plana.** No tiene "una tecnología
   más suave"; tiene una sola superficie, fondo de papel claro y ni un `<text>`
   de SVG. Una manchita clara ahí sería casi invisible.

### El espejo de Windows exagera, y mucho

Los recortes de 337px que se venían mirando dan **157 motas**; el framebuffer
real de la misma pantalla da **27**. Una imagen con 5 veces menos píxeles no
puede tener más detalle real que el original. Ojo con esto, que ya llevó a dos
diagnósticos equivocados el 4/9 y estuvo por llevar a un tercero hoy: **el
achicado por sí solo fabrica 160 motas sobre una imagen limpia**.

**Desde ahora se decide sólo sobre fotos por USB.**

### `herramientas/bloques.mjs`, el detector que sí sirve

`motas.mjs` no distingue basura de un detalle chico del diseño, y él mismo lo
dice; tres sesiones se diagnosticó mirando ese número y las tres se diagnosticó
mal. El nuevo cuenta **bloques de 4×4 de color plano y neutro**, que es la
firma de la GPU: la paleta del proyecto es toda cálida (r > g > b), así que un
neutro no lo puede haber puesto la escena. Lleva las dos polaridades —claro
sobre la madera, gris sobre el pergamino— y una banda configurable.

Medido con él: mesa quieta **1 bloque**, mesa jugando **0,79 por cuadro**,
mapa **7** (todos pegados al `<text>` del cartel y de la rosa).

### Un solo diseño de mesa

Lo pidió Santiago, y al hacerlo apareció que las dos tablas nunca fueron dos
diseños: eran **el mismo objeto medido en dos ejes**. Los objetos median en
`vh` —contra la VENTANA— pero viven adentro de la ESCENA. Ahora la escena es la
unidad (`container-type: size` en `.escena`) y cada medida es `min(A cqw, B cqh)`:
lo que entre por ancho o lo que entre por alto, lo que sea menos. En un celular
manda el ancho, en una compu el alto.

No es un promedio. Se derivó midiendo las dos tablas viejas en los seis tamaños
y queda dentro del 5% de cada una:

    mazo   celular 85,2 px → 86,4    ·  compu 161,2 px → 156,6
    mate   celular 73,8    → 73,6    ·  compu 117,8    → 113,6
    baza   celular 45,4    → 44,8    ·  compu  80,6    →  75,8

Con eso se fueron `lib/pantalla.ts`, `usaPantallaAncha()`, el atributo
`data-diseno` y el render de hidratación en el que la compu dibujaba un cuadro
con el diseño de celular. **La libreta se fue del todo** (lo decidió Santiago):
existía sólo en la compu, y con un solo diseño había que decidir si iba a las
dos o a ninguna. Los puntos los dice `MarcadorBarra`, que ahora va siempre
apilado. De paso se llevó uno de los dos `clip-path` del proyecto.

El único número que hubo que recalibrar fue el objeto del departamento: pasó de
`v = 0,65` a `0,72`, porque a 1280×620 la botella se le montaba al mazo. Lo
agarró `mirar-mesa-nueva.mjs`, no la cuenta: **quinta vez** que un número de la
mesa se calcula en papel y sale mal.

### Un experimento que salió mal, y por qué se cuenta igual

Se probó sacar el `mix-blend-mode: color` y midió PEOR (1,97 contra 0,79
bloques por cuadro). **Ese número no vale**: el banco de pruebas recargaba la
mesa con `am start`, y cada recarga abre una PESTAÑA NUEVA en Chrome. La
corrida "sin blend" midió con más pestañas encima que la línea base, y se nota
en que la propia línea base subía sola: 11 → 17 → 24.

De ahí salió, eso sí, un dato bueno: **el celular tenía 29 pestañas abiertas y
187 MB libres de 3,7 GB**. Bajo presión de memoria Chrome baja la calidad de
sus mosaicos, y eso explica por qué Santiago ve la web PEOR que la app.

### Estado al cerrar

`npm test` 167/167 · `tsc --noEmit` limpio · `mirar-mesa`, `mirar-mesa-nueva` y
`mirar-web` **TODO OK** · los dos builds OK.

### Pendiente

1. ~~**No se puede mostrar el envido ni la flor del rival antes de que cierre
   la mano.**~~ **YA ESTABA ARREGLADO CUANDO SE ESCRIBIÓ ESTO** —lo comprobó la
   sesión del 7/9/2026—. El arreglo entró ese mismo 5/9, en
   `lib/motor/partida.ts` (la regla de `reglas.txt` 9.4: empieza el mano y el
   que no lo supera dice "son buenas" y no revela su tanto), y tiene test propio
   en `lib/tantos-al-cierre.test.ts`. Quedó anotado como pendiente por error, y
   ese error costó que la sesión siguiente lo pusiera de nuevo en el plan.
   **Un pendiente vencido cuesta una sesión: al cerrar, releer la lista.**
2. **Medir la falta envido y el real envido en la APP.** Santiago dice que ahí
   se bugea distinto que con el envido, la flor y el truco normales. Quedó sin
   medir porque el banco de pruebas lo había pasado al navegador.
3. Rehacer el A/B del `mix-blend-mode` con un banco que NO abra pestañas
   nuevas, ahora que hay con qué medirlo (`bloques.mjs`).
4. `deviceScaleFactor: 2` en las herramientas que todavía miran a DPR 1.
5. Prender AdMob (explicado en el README, sin código).

---

## 2026-09-04 (tercera pasada) — Entra C, y la teoría del toque también da negativa

Santiago eligió **C** mirando las capturas del laboratorio: descartó B porque
"no tiene textura la mesa" —que es exactamente lo que se veía— y aprobó los
botones de canto nuevos. Y pidió lo mismo para el menú y el mapa, con una
teoría propia: *"pueden deberse a que se mueva cuando se hace click"*.

### Se le dijo antes de implementarlo, y se repite acá

**C no arregló las manchitas en ninguna medición.** Error contra la referencia
sobremuestreada: A = 2,07 · C = 2,07 sobre 255. Es la misma imagen. Entró porque
una línea más fina que un píxel es un riesgo de dibujo real y cuesta cero, **no
porque se haya visto curar nada.** Si la próxima sesión lee "se arregló con C",
está leyendo mal.

### El piso de tinta, y por qué no es sólo la pantalla del menú

Midiendo dónde se dibuja `<Carta>` apareció que el problema no era de una
pantalla. Para que un `strokeWidth="0.8"` llegue a un píxel real a DPR 2 la
carta tiene que medir **63 px o más**, y se dibuja más chica que eso en casi
todos lados: los iconos del menú 32–44 px, la muestra de los ejercicios 52–62,
las cartas en vuelo del reparto 28–46.

Así que el piso va en el dibujo, una vez, en
[`components/Carta.tsx`](components/Carta.tsx): `TINTA_MINIMA = 1.4` y un helper
`tinta(peso)`. **Se escribe `tinta(0.8)` y no `1.4`** a propósito: el número
original dice qué peso quería tener ese trazo respecto de los otros, y eso es lo
que hay que mirar el día que se toque. Los nueve `strokeWidth="0"` quedan afuera
—quieren decir "sin línea", no "línea finita"—.

Verificado a los dos extremos con las MISMAS cartas: a 48 px los aros de los
oros quedan definidos en vez de deshacerse, y a 148 px la línea no engordó.

### La teoría del toque: medida, y negativa

Se toca de verdad, con puntero táctil, cancelándole la navegación al click para
poder mirar el estado que queda después. En el menú (la tarjeta de la gira) y en
el mapa (seis departamentos): **no se movió ni cambió nada.** Ni caja, ni trazo,
ni `filter`, ni `transform`, ni `opacity`, ni `will-change`.

De paso quedó confirmado que el arreglo de la pasada anterior anda: con
emulación táctil de verdad `(hover: hover)` da **false**, así que los 19
departamentos no declaran ninguna transición. Duración 0s, medida.

> **Ojo con esto al medir:** sin `hasTouch` + `isMobile`, Chromium dice
> `(hover: hover) = true` y aplica reglas que en un celular no existen. La
> primera corrida se hizo así y estaba mirando otra pantalla. El laboratorio ya
> abre todos sus contextos en modo táctil.

Lo que NO se hizo, y a propósito: hay 25 `transition-colors` en el proyecto que
declaran transiciones para un `:hover` que en un celular no puede dispararse.
Es la misma familia que el arreglo de `.depto` del 4/9, **pero `.depto` animaba
`filter`, que fuerza una superficie, y `transition-colors` anima sólo pintura,
que no.** Tocar 25 lugares para arreglar algo que se midió inerte es
exactamente el error que ya se cometió dos veces esta semana. Queda anotado, sin
tocar.

### El laboratorio, tercera versión

- Corre en contexto táctil, para medir la pantalla que es.
- Comprueba qué hace el toque, y lo informa.
- **B ya no "falla" en el menú y el mapa**: declara `soloEn: ["mesa"]`. Esas dos
  pantallas nunca usaron las texturas horneadas, así que no hay herramientas de
  antes a las que volver, y decir "falla" era gritar por nada. Un parche que sí
  corresponde y no agarra nada sigue fallando.

### El contador de motas no sirve en el menú ni en el mapa

Queda escrito porque va a confundir a alguien: el mapa da **534 motas** y el
menú pasó de 25 a 88 al poner el piso de tinta. No es basura que apareció, es el
límite que el propio `motas.mjs` documenta —no distingue basura de un detalle
chiquito del diseño— y esas dos pantallas son casi todas detalles chiquitos. El
número que sirve ahí es el error contra la referencia sobremuestreada, que no
se movió: 2,07.

### Estado al cerrar

`npm test` **167/167** · `tsc --noEmit` limpio · `mirar-mesa`, `mirar-mesa-nueva`,
`mirar-web`, `mirar-rivales` y `mirar-app-compilada` sin fallas · los dos builds
OK · diff sin patrones peligrosos ni datos personales · el laboratorio sólo
habla con `localhost:3000`.

### Pendiente

1. **Correr `celular-usb.mjs --vigilar` con el teléfono enchufado.** Tercera
   sesión que queda pendiente y **tercera hipótesis que se cae al medirla**
   —los `filter`, el trazo sub-píxel, y ahora el toque—. Ya no hay nada
   sensato que adivinar: hace falta la foto del framebuffer.
2. `deviceScaleFactor: 2` en las siete herramientas, para que el punto ciego no
   vuelva. El laboratorio ya lo hace; las demás no.
3. `container-type: size` + `cqh` en vez de `vh` en las dos tablas de la mesa
   (necesita captura y permiso).
4. Prender AdMob (explicado en el README, sin código).

---

## 2026-09-04 (segunda pasada) — Una segunda hipótesis descartada, y los botones sobre las cartas

Santiago pidió tres cosas: buscar en el historial **qué cambio de herramienta**
metió las manchitas, armar un diseño de nivel con las herramientas de antes
**en un lugar aparte y sin tocar el código**, y bajar los botones de canto.

### El cambio de herramienta existe, y está fechado

Es del 30/8, la sesión que se llama **"Dibujar con línea en vez de manchar"**:
ese día se pasó de manchas desenfocadas a dibujo con línea de tinta.

| | Antes (≤29/8) | Hoy |
|---|---|---|
| La mesa | `radial-gradient` de CSS | WebP horneado |
| La perspectiva | `rotateX(34deg)` vivo | horneada + `scale()` por objeto |
| Los dibujos | manchas desenfocadas | líneas de tinta de 0,7 a 1,9 unidades |

### La hipótesis que se armó con eso, y que NO sobrevivió

El razonamiento era bueno y los números daban: una `<Carta>` de `viewBox` 100
dibujada a 41,8 px CSS da 0,836 px reales por unidad, así que en el Redmi
(DPR 2) un `strokeWidth="0.7"` sale a **0,59 píxeles de verdad**. Ninguna línea
de esas cartas llega a un píxel. Y como los objetos se escalan con un `scale(k)`
continuo, cualquier cambio de alto mueve `k` y reparte los píxeles distinto:
explicaba la intermitencia y explicaba por qué justo al cantar.

**Y está mal.** Se probó en el laboratorio y falló dos veces seguidas:

1. Al ampliar los iconos a DPR 2 apareció el marco de la carta **cortado en
   rayitas**, que parecía la prueba. **Era la pinta.** El marco de la baraja
   española se corta un número distinto de veces según el palo, está escrito en
   `components/Carta.tsx:389` y es el diseño andando bien.
2. Con el piso de grosor puesto (87 de 140 trazos subidos), el error contra la
   referencia sobremuestreada quedó **igual**: 2,07 → 2,08 sobre 255.

> Segunda hipótesis en dos sesiones que se cae al medirla. La primera fueron los
> `filter` de CSS. Las dos eran razonables, las dos tenían un mecanismo
> plausible, y ninguna era la causa. **La única medición que falta es la única
> que decide, y es la del teléfono.**

### Lo que sí quedó probado

- **RGB565 descartado.** Si el WebView compusiera a 16 bits, los canales de la
  captura tendrían 32/64/32 valores distintos. Tienen **239/236/230**: 8 bits
  enteros. No hay cuantización.
- **Las texturas horneadas están limpias.** Son WebP con pérdida (q82/q80), así
  que se abrieron con `sharp` y se contaron los píxeles de croma imposible sobre
  madera sepia: **0 de 1.260.000** en `bar-ciudad-mesa.webp`, 0 en
  `campo-mesa.webp`, 0 en el fondo.
- **De dónde viene el APK no cambia nada.** El de Actions y el de casa se
  diferencian sólo en la clave de firma; el que dibuja es el WebView del
  teléfono. Y Cloudflare no toca la app: los archivos viajan adentro del APK.
- **Las capturas siguen sin ser confiables, y ahora hay un número.** El teléfono
  es de 720×1600 y las capturas llegan de **344×725 y 337×716**: el espejo de
  Windows las achicó a **0,478×** y las volvió a comprimir. Todo lo que estamos
  mirando pasó por ese remuestreo.

### El punto ciego de verdad, que sí es nuestro

    grep -rn "deviceScaleFactor" herramientas/*.mjs   →   0 resultados

**Las siete herramientas miraban a DPR 1 y el celular dibuja a DPR 2.** Nunca
miramos la grilla de píxeles donde aparece el bug. Eso no explica las motas por
sí solo, pero explica por qué todo daba limpio acá.

### `herramientas/laboratorio.mjs` (nuevo)

Abre el sitio con Playwright a **360×760 con DPR 2** —el Redmi 13C de verdad— y
**parchea la página en el navegador**: no toca un archivo del proyecto y no crea
ninguna ruta en `app/`. Compara A (hoy), B (herramientas de antes) y C (trazo
con piso), y de cada una saca captura y número.

Dos cosas aprendidas armándolo, las dos por equivocarse primero:

- **Un parche que no agarra nada miente.** La primera corrida dio B idéntica a A
  **hasta el byte**, porque los selectores no existían. Ahora cada variante
  cuenta a cuántos elementos le pegó y la herramienta sale con código 1 si a
  alguna le pegó a cero.
- **B sólo tiene sentido en la mesa.** El menú de "¿Cómo querés jugar?" y el
  mapa **nunca usaron las texturas horneadas**: siempre fueron SVG de tinta. En
  esas dos pantallas "volver a las herramientas de antes" no es una opción que
  exista, porque no hubo herramientas de antes.

Y mirando la comparación, **B se lleva puesto el diseño**: sin veta, sin nudos y
sin los objetos de la gira. Es la interfaz apoyada sobre un fondo que ya se
había descartado el 29/8.

### Los botones de canto, apoyados sobre las cartas

Santiago los quiso más abajo: sobre las cartas, misma fila y misma separación, a
unos píxeles de la barra de Truco / Envido / Mazo.

Va con `absolute inset-x-0 bottom-2 z-30` en
[`app/jugar/mesa/page.tsx`](app/jugar/mesa/page.tsx). Dos decisiones que conviene
no deshacer:

- **`bottom-2` y no un `translate-y`.** "A unos píxeles de la barra" es una
  distancia al pie de la escena, no un corrimiento desde donde caían antes. El
  envoltorio ya termina donde empieza la barra, así que anclando ahí no queda
  ningún número mágico que mantener cuando cambie el alto de la mano.
- **`z-30` y no `z-10`.** El abanico es `z-10` y el pulgar `z-20`, y los dos
  vienen DESPUÉS en el documento: con empate ganaban ellos. La primera captura
  mostró una franja dorada asomando por detrás de las cartas y nada más.

Sigue fuera del flujo, que es lo que importa: **la mesa se queda en 484,36 px
abras el envido o no.**

### El guard nuevo, y su sabotaje

`mirar-mesa.mjs` ahora comprueba que **la tira de cantos deje al menos 44 px de
carta libre** —el mínimo que se puede tocar con el dedo—. Es una falla que no
rompe ninguna otra regla: no scrollea, no se solapa nada, y sin embargo no
podés jugar. El riesgo real es la flor, cuyos botones son largos y en 320 px se
parten en varias filas.

Saboteado con un `py-16` en la tira: falló en todos los tamaños diciendo
`1 fila(s) de 174px y deja 0/0/0px de carta libre`, y con
`scroll=false manoTapada=false` al lado, o sea que **ninguna otra comprobación
lo habría visto**. Sabotaje quitado y verificado en 0.

### Estado al cerrar

`npm test` **167/167** · `tsc --noEmit` limpio · `mirar-mesa`, `mirar-mesa-nueva`,
`mirar-web`, `mirar-rivales` y `mirar-app-compilada` sin fallas · los dos builds
OK · sin patrones peligrosos ni datos personales en el diff · `capturas/` sigue
ignorado.

### Pendiente

1. **Correr `celular-usb.mjs --vigilar` con el teléfono enchufado.** Sigue sin
   correr —no había celular— y sigue siendo lo único que decide si la mota
   existe o la inventó el espejo. **Dos hipótesis ya se cayeron por adivinar en
   vez de medir; no vale la pena una tercera.**
2. Que Santiago elija entre A, B y C sobre las capturas del laboratorio.
3. `deviceScaleFactor: 2` en las siete herramientas, para que el punto ciego no
   vuelva.
4. `container-type: size` + `cqh` en vez de `vh` en las dos tablas de la mesa
   (viene de la pasada anterior; necesita captura y permiso).
5. Prender AdMob (explicado en el README, sin código).

---

## 2026-09-04 — Las manchitas del celular, el hueco del anuncio, y una hipótesis descartada con números

Sesión larga y en dos pasadas. Lo más importante que deja no es un arreglo: es
**una hipótesis descartada**, y el método para no volver a caer.

### El pedido

Santiago mandó capturas nuevas jugando en el celular: manchitas claras sueltas
por toda la mesa, alrededor del mate, del vaso y del mazo; el cartelito de la
muestra encima del mazo; y pidió además lugar para un banner de anuncios,
adaptar *aprender* al celular y sacar su GitHub, "porque ya es una aplicación un
poco más seria".

### Primera pasada: los filtros. Se hizo, y NO era eso

El 1/9 se había encontrado que una banda de basura del tamaño de la mano venía
de un `filter` adentro de un subárbol con `opacity`, que en las GPU de teléfono
devuelve basura. El guard que quedó cuidaba **sólo la mano**, y en el resto de
la escena habían quedado **nueve filtros**, incluido un `@keyframes` que animaba
`filter: blur()` cuadro a cuadro. La explicación cerraba perfecto con la frase
de Santiago ("va variando dependiendo de la animación"), así que se sacaron
todos:

- `Sombra.tsx`: los dos `filter: blur()` pasaron a degradés radiales, con la
  caja crecida 2,5σ y la opacidad corregida por `erf(b/(σ√2))`. Diferencia media
  contra el original: 0,27–1,38 sobre 255. Invisible.
- `@keyframes sombra-aterriza` dejó de animar el desenfoque.
- Seis `drop-shadow` sobre texto pasaron a `text-shadow` (el primero es un
  `filter`, el segundo no crea superficie de composición).
- El `backdrop-blur` del medallón se fue: un `backdrop-filter` obliga a leer de
  vuelta todo lo ya dibujado detrás, y es el más caro de todos.
- Medido: **9 filtros → 0** en la escena, en cuatro tamaños.

**Y no alcanzó.** Santiago compiló el APK a las 19:05 y a las 19:07 sacó
capturas con las manchitas intactas.

### Cómo se descartó, para que no se vuelva a suponer

1. **Se abrió el APK como zip** para ver si de verdad tenía los arreglos
   adentro: `data-anuncio` en 85 archivos, `muestra-cartel` presente,
   `ApoyarProyecto` borrado. Los tenía.
2. **Se contaron las manchitas** —componentes conexas claras de ≤12 px sobre la
   banda de la mesa— en las capturas de antes y de después:

   | | motas |
   |---|---|
   | 15:38, sin el arreglo | 48 y 76 |
   | 19:14, con el arreglo | 105 y 71 |

   Mismo orden de magnitud. El arreglo **ni las causó ni las curó**.
3. **Se midió a qué distancia de un borde cae cada píxel de color imposible.**
   En el recorte del mapa, el 100% estaba pegado a un borde de mucho contraste.
   Ésa es la firma del submuestreo de croma de un compresor de imagen, no la de
   un fallo de dibujo: el color falso del códec sólo aparece al lado de un
   borde, la basura de rasterizado también aparece en el medio de la nada.
4. **El teléfono es un Redmi 13C** (2023, 720x1600, Android 13), no un aparato
   viejo. Un driver de video roto es mucho menos probable de lo que parecía.

**Conclusión: parte de lo que estábamos arreglando lo puede haber inventado el
espejo de pantalla de Windows por el que pasaron las cuatro capturas.** No está
probado que sea todo; está probado que no se puede decidir nada mirándolas.

### Lo que se hizo en vez de seguir adivinando

**`herramientas/motas.mjs`** (nuevo): convierte "se ve sucio" en un número. Con
una foto cuenta motas; con varias de la misma pantalla quieta dice qué se movió,
que es el detector honesto —en una pantalla quieta, todo píxel que cambia es
basura, y eso no necesita saber nada del diseño—.

**`celular-usb.mjs --foto` y `--vigilar N`**: `adb exec-out screencap -p` saca
la imagen del framebuffer del teléfono, sin pérdida y a resolución real. Sin
espejo, sin códec, sin reescalado. **Es la única foto sobre la que vale la pena
decidir algo**, y quedó pendiente correrla porque no había teléfono enchufado.

Las tres salidas posibles quedaron escritas ANTES de mirar, para no acomodar la
conclusión después: cero motas → era el espejo; motas fijas → es nuestro dibujo;
motas que se mueven → es el rasterizador del WebView.

### La mesa deja de saltar cuando cantás

Ésta sí es una falla nuestra, medida y arreglada. Santiago tenía la teoría de
que "cuando cantás, el mapa cambia". Tenía razón:

**Al abrir el envido la barra de cantos pasaba de 48 a 103 px y la mesa entera
saltaba 43 px** —345→302 a 320x568, o sea el 12% de la mesa yéndose y volviendo
en el momento exacto en que estás decidiendo si querés—. La escena es `flex-1`,
así que cede sola cuando la barra crece.

**El primer arreglo se hizo, se midió y se descartó.** Fue reservarle a la barra
el alto de un renglón: el salto pasó de 43 px a 0 en todos los tamaños, y el
guard nuevo lo confirmó. Pero dejaba una franja marrón de 103 px abajo de todo,
casi siempre vacía. Se le mandó la captura a Santiago —como manda `CLAUDE.md`
antes de un cambio visual grande— y la rechazó: *"me parece una atrocidad eso
que sea tan gruesa para evitar el movimiento"*. Tenía razón: la cura era peor.

**Lo que quedó es la idea de él, y es mejor que las dos anteriores.** Los
botones que aparecen y desaparecen —la flor, lo que podés subir— **salieron del
flujo**: flotan sobre tus cartas, sueltos, con el dorado que ya tenían y una
sombra propia que los despega de la madera, sin la franja marrón atrás. Al
abrir el envido salen tres botones separados (Envido · Real envido · Falta) y
**la mesa no se mueve un solo píxel**: 484 px antes y 484 después, con la barra
en sus 48 px de siempre.

De paso se igualó la fila de Quiero/No quiero, que medía 58 px contra los 48 de
la de referencias y hacía un saltito de 10 px cada vez que el rival te cantaba
algo. Ahora los dos botones ocupan el alto entero de la barra.

`mirar-mesa-nueva.mjs` gana la comprobación —el alto de `[data-mesa="tabla"]`
no cambia al abrir el envido— y se probó saboteándola: con la reserva puesta en
cero falla en los cinco tamaños que tenían envido y nombra el salto exacto de
43 px.

**Lección, que es la que vale para la próxima**: el arreglo se midió, dio bien,
y aun así estaba mal. Un número que mejora no alcanza si nadie miró la pantalla.
La captura antes de aplicar no es burocracia.

### El efecto colateral que se fue solo

Mientras la barra reservaba 55 px, fallaron tres cosas en PC a 1280x620: la
botella se le montaba al mazo por 3,4 px, la libreta cruzaba el canto por 4,3 px
y la baza se le montaba a la mano por 3,3 px. Se bajaron tres `clamp` para
compensar, y al volver la barra a su alto natural **se revirtieron los tres**:
`mano` y `libreta` quedaron como estaban y `objeto` quedó en 11,6vh, que es el
valor que ya tenía por el hueco del anuncio.

Quedó escrita la causa de fondo en el código, porque va a volver:

> Los objetos miden en `vh` **del viewport**, y la escena ya no es el viewport:
> es lo que queda después de la barra de arriba, la de cantos y el anuncio. Cada
> vez que algo de eso crece, la escena se achica y los objetos NO.

**Lo correcto es `container-type: size` en el contenedor de la escena y `cqh` en
lugar de `vh` en las dos tablas de diseño.** Chromium lo soporta desde el 105,
que es justo el mínimo que la app ya exige por `:has()`. No se hizo porque
obliga a recalibrar los clamps de las dos tablas, o sea que es un cambio visual
grande, y ésos van con captura y permiso antes. **Es lo primero a hacer la
próxima vez que un `clamp` de la mesa haya que bajarlo.**

### El cartelito de la muestra

Dos cosas rotas que se sumaban: la caja del mazo tenía `height: 0.875em` escrito
a mano y ni la pila ni la muestra girada 78° entraban, y la pila era un `<div>`
sin `height` con todos los hijos `absolute`, o sea de alto 0, así que su
`-translate-y-1/2` no movía nada. Ahora los altos salen de la trigonometría del
giro y el cartel se centra sobre `centroMazo` y no sobre la caja —por eso
"cambiaba de lugar": no seguía al mazo—. Se solapaba en los cuatro tamaños
medidos; ahora no cruza nada.

### El hueco del anuncio, aprender y el GitHub

- **`components/EspacioAnuncio.tsx`** (nuevo): un solo lugar donde vive la
  altura de los tres huecos, con las alturas exactas del banner adaptativo de
  AdMob (32/50/90 según el alto de ventana). **No carga nada de nadie**: es un
  `<div>` con una altura. Va abajo de la mesa y en el pie.
- Se descubrió y se corrigió que **había dos huecos apilados** en `/aprender`
  (cuerpo y pie, sin nada en el medio). Además de quedar feo, AdMob lo prohíbe.
- **`ApoyarProyecto.tsx` borrado**: era el bloque "¿Te sirvió? / Seguir en
  GitHub". `/aprender` bajó 29% de alto a 390x844 y 34% a 320x568 **incluyendo**
  el hueco nuevo.
- **El GitHub queda sólo en Términos y Privacidad** (3 enlaces), que es la vía
  de contacto pública que Play Store exige. Santiago: *"si Play Store me pide un
  lugar para contactar, dejá GitHub sólo en los legales, el resto fuera"*.
- **`components/PieLegales.tsx`** (nuevo): los enlaces a los legales dejaron de
  aparecer en todas las pantallas. Quedan en la parte de aprender y adentro de
  las propias páginas legales, para poder ir de una a otra. También se sacó el
  bloque suelto que la portada tenía abajo: existía porque la portada esconde el
  pie y era el único camino, y ahora el camino es portada → Aprender. Play pide
  que existan y se encuentren, no que estén repetidos en cada pantalla.

### Un error de hecho en la política de privacidad

Decía *"Lo que se guarda en tu navegador: **hoy, nada**"*, y `lib/progreso.ts`
guarda la gira en `localStorage` desde hace semanas. En una app que va a Play
Store eso es una declaración de privacidad inexacta. Se reescribió. Y la promesa
de "si algún día hay publicidad, esta página se actualiza ANTES" se cumplió
ahora, con el hueco reservado y vacío.

### Lo que se decidió NO hacer, y por qué

- **No se horneó el `feTurbulence` del mapa.** Es el filtro más caro del
  proyecto, pero es estático (se rasteriza una vez y no se vuelve a tocar) y la
  medición dice que las manchitas del mapa eran compresión de la foto.
  Rehornearlo arriesga el aspecto de una pantalla que está bien, a cambio de
  nada medido.
- **`rival-foco` se queda.** Es un `feGaussianBlur` de σ=1,5 sobre el cuerpo del
  rival: un degradé sabe dibujar una elipse borrosa, no un cuerpo entero
  borroso. Si algún día sale basura ARRIBA, la salida es hornear al rival.
  Su hermano `rival-sombra-sola` (σ=9, región al 180%, o sea que se metía 80 px
  DENTRO de la mesa) sí se fue: eran dos elipses.
- **No se tocaron las clases fantasma de Tailwind.** El CSS publicado define
  `.blur`, `.drop-shadow`, `.filter`, `.backdrop-filter` y hasta un
  `.drop-shadow-[…]` con puntos suspensivos, todas generadas **a partir de los
  comentarios**, porque Tailwind 4 lee el texto crudo y no sabe qué es un
  comentario. Son 2.511 bytes, el 4,3% del CSS, adentro de un APK que va sin
  conexión. Contorsionar los comentarios para engañar al escáner deja el código
  peor de lo que arregla.

### Publicidad: lo que hay que saber, sin haber tocado nada

Está escrito paso por paso en el README, sección *Publicidad*. Lo esencial:

- Con el plugin nativo de Capacitor **el anuncio no corre adentro del WebView**,
  así que la CSP no se afloja y la parte web sigue sin pedirle nada a nadie.
- Santiago no quiere recolectar datos de nadie, y no los va a recolectar él:
  **los recolecta AdMob** (identificador de publicidad, IP). Por eso hay que
  declararlo en el formulario de Seguridad de los datos.
- **Recomendado: público objetivo 13+, la app NO dirigida a niños.** Marcar
  menores de 13 mete la app en "Diseñado para familias" y obliga a anuncios no
  personalizados, que pagan mucho menos. El truco suele clasificar 12+ por
  "juego de apuestas simulado", y conviene contestarlo con la verdad.

### El `.gitignore`, mirando hacia Play Store

`*.jks` y `*.keystore` ya estaban desde el 2/9. Se sumaron los tres que
aparecen cuando una app entra a la tienda de verdad y que hoy no estaban
cubiertos por el `.gitignore` de `android/`:

- **`keystore.properties`**: Gradle lee de ahí la contraseña de la clave de
  firma, en texto plano. Filtrarlo es filtrar la firma.
- **`google-services.json`**: la configuración de los servicios de Google, con
  el id del proyecto y las claves de las APIs habilitadas. Es el archivo que
  aparece el día que se prenda AdMob.
- **`local.properties`**: dónde está el SDK en esta máquina. No es un secreto,
  pero tiene la ruta de casa adentro y este repo es público.

Van anclados en el `.gitignore` de la raíz y no en el de `android/`, por lo
mismo que ya estaba escrito para la clave: Capacitor puede regenerar el de
`android/` y llevarse la protección puesta.

### Lo que quedó pendiente

1. **Correr `celular-usb.mjs --vigilar` con el teléfono enchufado.** Es el paso
   que decide si las manchitas existen o las inventó el espejo. Todo lo demás de
   este tema es especulación hasta que eso corra.
2. `container-type: size` + `cqh`, ver arriba.
3. Prender AdMob, con todo lo que eso arrastra.

---

## 2026-09-02 (tercera pasada) — El APK se compila acá, y el celular se mira por USB

Santiago pidió poder compilar el APK en la máquina y ver el proyecto en el
celular enchufándolo por USB, sin depender de GitHub Actions. Tenía Android
Studio instalado **en Windows**, no en Ubuntu, y no sabía qué hacía.

### El problema real, que no era el que parecía

Android Studio ya había instalado del lado de Windows todo lo importante: el
SDK (plataforma 37, build-tools 36.0.0), las licencias aceptadas y `adb.exe`.
Lo que faltaba no era eso. **Faltaba que WSL2 viera el USB, y WSL2 no ve el
USB.** Para que lo viera habría que instalar `usbipd-win`, cargar módulos del
kernel y ceder el dispositivo a mano cada vez que se enchufa.

La salida fue no pelearlo: **Linux compila, Windows enchufa.** WSL puede
EJECUTAR programas de Windows (el interop está activo, verificado en
`/proc/sys/fs/binfmt_misc/WSLInterop`), así que se llama al `adb.exe` de
Windows y el USB nunca sale de Windows.

### Por qué no se compila en Windows, si el SDK ya estaba ahí

Se evaluó y se descartó, por tres razones:

1. El código vive en el disco de Linux. Windows lo ve por `\\wsl.localhost\...`,
   que es un sistema de archivos de red, y Gradle sobre rutas UNC da problemas.
2. **El CI compila en Linux.** Compilando igual, el APK de casa y el de Actions
   salen del mismo proceso. Compilando distinto, algún día uno anda y el otro
   no y no se sabe por qué.
3. Hay 946 GB libres en Linux y la descarga es una sola vez.

### Lo que se instaló, y dónde

No hay `sudo` en esta máquina (pide contraseña), así que **nada se instaló en el
sistema**: son dos carpetas sueltas en `~/herramientas-android/`, fuera del
repositorio.

| Qué | Versión | Verificación |
|---|---|---|
| Temurin JDK | 21.0.12.1+1 | SHA-256 de la API de Adoptium |
| Command-line Tools | 23.0 | SHA-1 del índice de Google |
| Plataforma + build-tools | android-36, 36.0.0 | las que pide `variables.gradle` |

Dos detalles que costaron: **no hay `unzip`** y sin sudo no se puede instalar, así
que se descomprimió con `python3 -m zipfile` —que **no conserva el permiso de
ejecución** y hay que devolverlo con `chmod +x`—; y **las herramientas versión 23
jubilaron `sdkmanager`** en favor de un binario `android`. Sigue andando como
puente y el CI usa el SDK de la imagen de Ubuntu, así que por ahora no cambia
nada, pero queda anotado.

### `herramientas/celular-usb.mjs`

Tres modos. El primero es el que más se va a usar:

    node herramientas/celular-usb.mjs             vista previa EN VIVO
    node herramientas/celular-usb.mjs --apk       compila, instala y abre
    node herramientas/celular-usb.mjs --compilar  sólo deja el .apk
    node herramientas/celular-usb.mjs --desinstalar

**En vivo** usa `adb reverse`: el `localhost:3000` del celular sale por el cable
y lo atiende la computadora. Mejor que poner la IP de la red porque no depende
del wifi ni de que WSL sea alcanzable desde afuera. Se verificó la cadena
entera, que era la parte dudosa: `next dev` escucha en `*:3000`, y
`curl.exe` **de Windows** contra `localhost:3000` devuelve **200**. O sea que el
reenvío de WSL2 hacia adentro funciona y el túnel cierra.

Tres cosas que se resolvieron a propósito y no hay que deshacer:

- **La ruta de `adb.exe` no se escribe a mano**: tiene el nombre de usuario de
  Windows adentro y el repo es público. Se deduce de `%LOCALAPPDATA%`
  preguntándole a `cmd.exe`. Comprobado que lo encuentra.
- **El APK se copia al temporal de Windows antes de instalar**, en vez de que
  `adb.exe` lo lea por UNC desde el disco de Linux.
- **Ninguna llamada usa shell.** Todo es `spawnSync` con argumentos sueltos. La
  única que armaba una cadena (`bash -c` para mirar el puerto) se reescribió con
  `ss` y el filtro en JavaScript: el puerto ya pasaba por `Number()` y era
  seguro, pero no vale la pena dejar el patrón escrito.

### Medido, no supuesto

- **Compilación completa: 2 minutos.** Recompilar sin cambios: **1,8 segundos**
  (con demonio de Gradle, al revés que el CI, que va `--no-daemon` porque allá
  el proceso arranca de cero igual).
- El APK pesa **6,4 MB** y se inspeccionó por dentro: `uy.trucouruguayo.app`,
  minSdk 24 / targetSdk 36, `usesCleartextTraffic=false`, vertical, 143 archivos
  de web y 14 escenas `.webp`. **Y `index.html` dentro de cada carpeta profunda**,
  o sea que el arreglo del `trailingSlash` viajó de verdad adentro del paquete.
- `npm test` **167/167** y `tsc --noEmit` limpio.

### Una falla de seguridad que se encontró de paso

`android/.gitignore` viene de la plantilla de Google con **las dos líneas de la
keystore comentadas**, y el `.gitignore` de la raíz cubría `*.pem`, `*.key`,
`*.p12` y `*.pfx` pero **no `*.jks` ni `*.keystore`**.

O sea: el día que se genere la clave de firma para Play Store —un archivo que si
se filtra deja a cualquiera publicar actualizaciones haciéndose pasar por vos, y
que no se puede revocar— este repo público se la llevaba en el primer `git add`.
Se ancló arriba, con los secretos, y se comprobó desde tres ubicaciones.

### Lo que NO se pudo verificar

**La instalación en un teléfono de verdad.** No había ninguno enchufado. Todo lo
demás está medido; el `adb install` y el `adb reverse` contra un aparato real
son lo único que queda pendiente de comprobar, y se comprueba solo la primera
vez que Santiago enchufe el cable.

Sí se probó el camino de error: sin celular, la herramienta explica los cuatro
pasos para habilitar la depuración por USB en vez de tirar un error de `adb`.

### Ojo con esto

Si en el celular ya está instalado el APK que compiló **GitHub Actions**, el de
esta máquina **no lo va a poder reemplazar**: están firmados con claves de
depuración distintas y para Android son dos apps peleando por el mismo nombre.
Hay que desinstalar, y desinstalar **borra el progreso de la gira**. La
herramienta lo detecta, lo explica y ofrece `--desinstalar` en vez de fallar con
el mensaje críptico de `adb`. **Conviene elegir una sola fuente de APK.**
---

## 2026-09-02 (segunda pasada) — Los dos bugs de la lista, y la mesa hecha para el celular

Sesión de bugs. Santiago pasó `Bugs a arreglar/` con una foto de una partida en
el celular y dos reportes escritos, y en el mismo viaje pidió que la mesa se
mirara con ojos de app: **lo que importa ahora es el celular, la compu no.**

Los dos bugs quedaron cerrados y salieron de la lista.

### 1. El glitch bajo la carta: era la mano, y se pudo medir

El reporte del 1/9 decía "un gliche bajo mi carta" y la sesión anterior lo dejó
como REPORTADO, SIN REPRODUCIR. Esta vez salió, y no adivinando: **midiendo la
foto**.

El rectángulo de rayas cremas mide ~490×247 px físicos y arranca en x≈120. Con
una carta en la mano, el `<span>` de la mano mide `2,245 × el ancho de una
carta` ≈ 476 px en esa pantalla, y `DedosAtras` tiene `viewBox="0 0 200 96"`, o
sea 2,08:1. El rectángulo da 1,98:1 y el mismo ancho. **El artefacto ES el SVG
de tu mano**, rasterizado con basura. La línea blanca que cruzaba la mesa
comparte el borde izquierdo: sale del mismo buffer.

Y el dato que lo cerró lo puso Santiago: **"siempre pasa cuando me queda una
sola carta"**. Eso lo explica el propio `Manos.tsx`, que ya lo tenía escrito
desde que se dibujó: con tres cartas el abanico tapa el dibujo casi entero, y
hay exactamente dos momentos en que queda desnudo —mientras se reparte y cuando
te queda una—. O sea que el defecto probablemente estaba ahí siempre; una sola
carta es cuando se lo puede ver.

**La causa.** Cuando no es tu turno la mano se apaga con `opacity-75` —y en la
foto no era tu turno, dice "gana el rival la baza"—. Una opacidad menor a 1
obliga al navegador a componer **todo el subárbol** en una superficie aparte. Y
adentro de esa superficie había tres filtros más:

| dónde | qué era |
|---|---|
| `Manos.tsx` | `feGaussianBlur` para la sombra del pulgar |
| `page.tsx`, cada carta | `filter: drop-shadow(…)` |
| `page.tsx`, dos textos | `drop-shadow-[…]` de Tailwind, que es lo mismo |

Filtros anidados adentro de un grupo de opacidad es lo que revienta en las GPU
de teléfono, y es **la misma lección que dejó el ícono esta misma semana**: los
filtros los resuelve el rasterizador y cada uno hace lo suyo.

**Ahora la mano no tiene ni un filtro.** La sombra del pulgar es un
`radialGradient` (dos elipses giradas siguiendo el dedo, contacto y proyectada,
como `SombraApoyada`); la de las cartas es un `box-shadow` —la carta ya es un
`<svg>` con `rounded-lg` sobre un `rect rx="7"`, así que sigue la misma silueta
que seguía el filtro—; y los dos textos pasaron a `text-shadow`, que sobre texto
hace exactamente lo mismo y no crea superficie.

**Lo que NO se puede afirmar desde acá, y conviene tenerlo claro:** Chromium en
esta máquina usa SwiftShader y no reproduce un defecto de GPU de un teléfono.
Lo que sí se hizo es cuidar la condición que lo causaba, y dejarla cuidada:
`mirar-mesa.mjs` ahora **falla si aparece cualquier `filter` computado adentro
de `[data-mano="apagable"]`**. Comprobado saboteándolo: sin sabotaje da 0
filtros, con un `drop-shadow` inyectado da 5.

Si vuelve a pasar en el teléfono, lo próximo a mirar es el `opacity-75` en sí:
la palanca sería apagar la mano sin componer el subárbol.

### 2. El globo salía del rival aunque hablaras vos

El segundo reporte: cantás la flor, la ganás, te toca cantar los tantos… y el
número sale de la boca del otro. Era literal: `Dialogo` colgaba del medallón del
rival y mostraba TODO, incluidos los eventos `quien: "vos"` —`partida.ts` empuja
tu tanto como evento tuyo— y el papel "Acá está mi envido".

Ahora son dos zonas:

- **`DialogoRival`** cuelga del medallón, como antes. Lo que dice él y lo que
  dice la mesa. Lo del sistema va acá y no abajo a propósito: no lo dice nadie,
  es narración, y arriba es donde está el hueco grande.
- **`DialogoMio`** va arriba de tus cartas, alineado a la izquierda.

Tres cosas que costaron y conviene no deshacer:

1. **Mi zona queda AFUERA del apagado de la mano.** Es todo el punto: justo
   cuando no es tu turno es cuando hay que poder leer lo que cantaste. Por eso
   el bloque de abajo pasó a ser un envoltorio con dos hijos —el diálogo y la
   mano— en vez de un div solo.
2. **El papel de los tantos se partió en dos, uno por dueño**, con la puntita
   dada vuelta en el tuyo (apunta hacia abajo, a tus cartas). El título no
   cambia: los dos dicen "Acá está mi flor", porque cada papel está en la voz de
   su dueño.
3. **La línea de ayudas se calla cuando la mano terminó.** No es sólo que el
   tanto de una mano cerrada ya no sirva: es que el papel sale de ese mismo lado
   y quedaban uno encima del otro. Se vio en la captura, no leyendo.

De paso salió un tercer bug de texto, chico y viejo: `sumar()` armaba los
eventos como `"Vos" + motivo`, con el motivo en tercera persona, así que la mesa
decía **"Vos gana la mano: +1"** en toda partida ganada. Ahora el motivo lleva
las dos conjugaciones (`{ vos: "Ganás la mano", el: "gana la mano" }`), que es
el mismo par que el evento de la baza ya usaba bien desde el principio.

### 3. La mesa, mirada como app de celular

| | antes | ahora |
|---|---|---|
| casillero del marcador | 9 px (palitos de 1 px) | 14-18 px, en dos filas, con el número al lado |
| barra de arriba | 30 px clavados | 44-48 en el celular, **30 exactos en la compu** |
| ancho de una carta en la mano | 126 px (89% de la pantalla) | 96 px |
| cartas de las bazas | `clamp(44px, 8.8vh, 72px)` | `clamp(40px, 8vh, 64px)` |
| al lado de los puntos | "La Blanqueada · Tugurio" | nada: sólo los puntos |

- **El marcador es la libreta mudada a la barra**: palitos de a cinco Y el
  número al final en la manuscrita, que es lo que ya hacía `Fila` en el papel.
  Los palitos dicen cómo viene la cosa de un vistazo; "¿cuánto voy?" se contesta
  con un número. En la compu no lleva número porque allá la libreta está sobre
  la mesa y ya lo dice.
- **`DisenoDeMesa` ganó `mano: { ancho }`.** El ancho de la carta era una
  constante suelta, la misma para los dos, y en el celular estaba mal. Los dos
  diseños siguen teniendo los mismos campos, que es lo que obliga a decidir cada
  tamaño DOS veces en vez de una.
- **96 y no 104**, que fue el primer intento: a 390×844 el `clamp` llegaba al
  techo y las tres cartas seguían de lado a lado. **El giro del abanico las
  ensancha además de lo que miden**, así que el 72% calculado se ve como un 80%.
  Se cerró mirando la captura.
- **Ojo con la cuenta del alto, que en el plan estaba mal**: la mano es
  `absolute`, así que achicarla NO le devuelve alto a la escena, le devuelve
  mesa a la vista. Los 14-18 px que se lleva el marcador salen de la escena y de
  ningún otro lado. Se paga igual —un marcador que no se lee no sirve— y
  `mirar-mesa.mjs` confirma que sigue sin scrollear en los siete tamaños.
- **El botón de Ayudas no declaraba tamaño de letra propio** —lo declaraban los
  spans de adentro—, así que heredaba los 16 px del cuerpo y su renglón medía 24
  de alto vacío. Eso solo le agregaba 5 px a la barra de la compu. Con
  `text-[10px]` en el botón volvió a 30 exactos, medido.
- **El mate se queda** (lo eligió Santiago) y la libreta ya no estaba en el
  celular desde la pasada anterior.

### Estado al cerrar

`npm test` **167/167** · `tsc --noEmit` limpio · `npm run build` y
`npm run build:app` OK · `mirar-mesa.mjs` en 0 (con la comprobación nueva de
filtros) · `mirar-mesa-nueva.mjs` en 0 · `mirar-web.mjs` en 0 ·
`mirar-rivales.mjs` 14 comprobaciones · `mirar-app-compilada.mjs` en 0 sobre el
build de la app.

### El repaso de seguridad

**Sin hallazgos.** El cambio es todo dibujo y distribución: no agrega ni una
entrada de usuario, ni almacenamiento, ni llamada de red.

- Cero `dangerouslySetInnerHTML`, `innerHTML`, `eval` o `javascript:` en lo
  tocado. Todo lo que se muestra son hijos JSX, que React escapa.
- **Las dos zonas de diálogo no muestran nada que antes no se mostrara**: son la
  misma lista repartida por `quien`. `tantos-al-cierre.ts` —que es donde vive la
  regla de qué se puede enseñar sin soplar— no se tocó, y `p.cartas.rival` sigue
  llegando al DOM sin la carta (`.map((_, i) => …)`).
- La CSP llega entera al HTML compilado de la app (verificado sobre
  `out-app/jugar/mesa/index.html`).
- **`Bugs a arreglar/` y `capturas/` siguen ignoradas** (`.gitignore` 179 y 141),
  comprobado con `git check-ignore`: ni la foto de WhatsApp ni las capturas de
  esta sesión se suben. Cero rutas locales, correos o datos personales en el
  diff.

### Pendiente

0. **El glitch hay que confirmarlo en el teléfono.** Es lo único de esta sesión
   que no se pudo verificar desde acá. Lo que hay que mirar: jugar hasta quedar
   con una sola carta, esperar el turno del rival y ver si aparece la banda.
1. ~~BUG REPORTADO, SIN REPRODUCIR~~ **cerrado acá** (pendiente 1 de la pasada
   anterior).
2. **El APK todavía no se compiló.** Sale de Actions con el push.
3. **Subir a Play Store** pide cuenta de desarrollador (25 USD, una vez), ficha,
   capturas y la política de privacidad publicada. Y ahí sí, la keystore.
4. Una **copla nueva** en `versos.ts` para "primero va el envido".
5. `deNoche` todavía controla luz y desgaste a la vez en `madera.mjs`.
6. Las **constantes de la cámara siguen copiadas a mano** en `mesa-perspectiva.ts`.
7. `acentoDe` y `ambienteDe` siguen sin `Object.hasOwn`.

---

## 2026-09-02 — La web se vuelve app de Android, y los trofeos de la gira

Sesión grande. Se convirtió el sitio en una app de celular empaquetable para
Play Store, con el **mismo código** —no hay dos versiones—, y la gira ganó
trofeos.

### Las cuatro decisiones que tomó Santiago antes de empezar

| | |
|---|---|
| Dónde se compila el APK | **GitHub Actions.** Esta máquina no tiene `java`, ni Android SDK, ni `gradle`, y no hace falta que los tenga |
| `appId` (permanente) | **`uy.trucouruguayo.app`** |
| La web pública | **Se convierte también.** Un solo código |
| La barra dentro de la mesa | **No va.** La mesa mantiene su `.barra-juego` de 30px |

### 1. Un bug que ya existía: el `canonical` estaba mal en TODO el sitio

Antes de mover nada de la portada hubo que arreglar esto, y salió midiendo el
`out/` de verdad:

    out/index.html          canonical → truquito.smmqo08.workers.dev
    out/aprender.html       canonical → truquito.smmqo08.workers.dev   ← mal
    out/jugar/gira.html     canonical → truquito.smmqo08.workers.dev   ← mal

Salía de `alternates: { canonical: "/" }` en `app/layout.tsx`. **Todo lo que
declara el layout raíz lo heredan todas las páginas**, así que las ocho
lecciones le estaban diciendo a Google que eran duplicados de la portada. Ahora
lo declara cada página; la mesa y la gira no llevan ninguno, que es mejor que
llevar uno equivocado.

Era precondición de lo demás: vaciar la portada con el canonical así habría
dejado el sitio entero apuntando a una página sin texto.

### 2. El armazón de app

- **`lib/navegacion.ts`** (nuevo, con test). Dos funciones puras, y van primero
  porque de ellas cuelgan **los dos botones de atrás**: el de la barra y el
  físico de Android. Decidir una sola vez es lo que hace que no puedan
  contradecirse.
  - `volverDesde(ruta, busqueda)` devuelve el PADRE de la ruta, no el historial.
    Ojo con `/legales/*`: resolver el padre cortando por la última barra deja
    `/legales`, que **no existe**. Hay un test que lo exige.
  - `normalizarRuta()` saca la barra final. No es cosmético: con `trailingSlash`
    —que es como se compila la app— `usePathname()` devuelve `/aprender/`, y
    todo lo que compare contra `/aprender` anda en `next dev` y falla adentro
    del APK.
- **`components/BarraApp.tsx`** reemplaza al `<header>` del layout. **Su
  `<header>` tiene que ser el elemento raíz del componente**: la regla
  `body:has(.mesa-pantalla-completa) > header` de `globals.css` sólo lo
  encuentra si sigue siendo hijo directo del `<body>`. Envolverlo en un `<div>`
  hace reaparecer la barra encima de la mesa, y `mirar-web.mjs` lo verifica
  (comprobado saboteándolo: da 30 fallas).
- **La portada pasa a ser una pantalla.** El "por qué existe esto" se mudó a
  `/aprender`; el `<ol>` del camino ERA UN DUPLICADO del que `/aprender` ya
  dibujaba, así que no se perdió nada indexable.
- **`.pantalla-fija`**, hermana de `.mesa-pantalla-completa` pero sin esconder
  el encabezado. Esconde el pie, que con su `mt-16` hacía scrollear la portada
  igual aunque el contenido entrara.
- **`/jugar` también es pantalla.** Scrolleaba 205 px a 360×640 y había que
  arrastrar para ver la gira. Los espacios pasaron a `clamp(…vh…)`: la regla de
  siempre, el problema es la pantalla BAJA.

### 3. La zona segura: UNA línea de CSS toca la mesa

Con `targetSdk 36` Android dibuja la app abajo del reloj y **no se puede pedir
lo contrario**: desde Android 16 la pantalla completa es obligatoria.

Lo que se creía —y estaba desactualizado— es que `env(safe-area-inset-*)` no
reporta las barras del sistema en Android. **Sí las reporta desde Chromium
140.** Abajo de eso da 0, y ahí el relleno lo pone `@capacitor-community/safe-area`
sobre el propio WebView. O sea que **el CSS se escribe una sola vez y sirve en
los dos casos**, que es lo que evitó tener que parchear la Activity a mano.

La mesa cambió esto y nada más:

    body:has(.mesa-pantalla-completa) {
      height: 100dvh; overflow: hidden;
      padding-top: env(safe-area-inset-top, 0px);       ← nuevo
      padding-bottom: env(safe-area-inset-bottom, 0px); ← nuevo
    }

Con `border-box`, los dos rellenos corren el contenido para abajo del reloj Y le
descuentan lo mismo al alto. **En la web valen 0 y queda idéntico a antes**: por
eso no hubo que re-medir los siete tamaños, y `mirar-mesa.mjs` lo confirma.

### 4. Los trofeos

Cada departamento ya tenía su objeto dibujado. Ahora ganarle al rival te lo
deja, con el marcador de la mejor victoria.

- **`lib/progreso.ts`** gana `mejor?: { vos, rival }` por rival. Tres cosas que
  costaron y conviene no deshacer:
  1. **`sanear()` reconstruye cada entrada** como `{ ganadas, jugadas }` y borra
     lo que sobre. Guardar el marcador sin tocar esa función no habría andado:
     se perdía en la primera relectura.
  2. **El techo es 40, no 30.** `sumar()` en `partida.ts` suma y DESPUÉS
     compara: estando 29 le ganás un vale cuatro y quedás en **33**. Con el techo
     en 30 se descartaban las victorias más grandes.
  3. **Si `mejor` no valida se descarta SÓLO `mejor`**, no la entrada. Es lo
     contrario de lo que hace con `ganadas`/`jugadas`, y a propósito: un trofeo
     roto no puede costar una victoria.
- **`VERSION` no subió.** Un guardado viejo no trae `mejor` y el trofeo se
  muestra sin número. Subirla sólo serviría para tirar progreso ajeno.
- **`lib/trofeos.ts`** (puro, con test) devuelve **los diecinueve**, no sólo los
  ganados: una vitrina donde faltan los que no conseguiste no dice cuántos
  faltan.
- **`components/Trofeos.tsx`** reusa `<ObjetoDeMesa>` tal cual —no sabe nada de
  la perspectiva, sólo necesita una caja con alto y `PROPORCION`—. **`ALTURA` NO
  se usa acá**: allá una botella tiene que medir más que una llave porque están
  apoyadas en el mismo lugar; en una lista eso deja la llave del tamaño de una
  uña.
- **La hoja se abre desde la gira y no desde la mesa**, porque los `<defs>` de
  los objetos usan ids fijos y la mesa ya dibuja el de su ambiente.
- En el mapa, **el contador `n/19` PASÓ A SER el botón**. No se agregó un cuarto
  hijo a esa fila: es un `justify-between` de tres que a 320px ya va justo. Va
  con la copa dibujada y no con la palabra "Trofeos", que suma ~60px que no hay.
- **El trofeo se gana también en Partida Rápida**, y es a propósito: el
  desbloqueo de la gira YA funciona así.

### 5. Capacitor, en dos etapas — y la primera no necesita Android

- **`trailingSlash` en la app no es un gusto: sin él la app no anda.** Medido:
  `out/jugar/mesa/` existe pero **sólo tiene los `.txt`**; el HTML está en
  `out/jugar/mesa.html`. El servidor local de Capacitor pide
  `jugar/mesa/index.html`, no lo encuentra y cae a la raíz: **la app hidrataría
  la portada con la dirección de la mesa**.
- `npm run build` → `out/` (la web, **idéntica**). `npm run build:app` →
  `out-app/`, con la barra final y el zoom bloqueado. Sale de
  `process.env.DESTINO` en `next.config.ts`.
- **`herramientas/mirar-app-compilada.mjs`** prueba ESE build servido como
  estático, que es donde aparecen los bugs que `next dev` no puede mostrar: la
  CSP de producción (en desarrollo no se inyecta), las rutas con barra final y
  la recarga dura en ruta profunda. Las ocho rutas hidratan **su** página.
- `capacitor.config.ts` con `minWebViewVersion: 105`: de `:has()` cuelga toda la
  familia de reglas de pantalla completa, y en un WebView más viejo el navegador
  **descarta la regla entera sin avisar** —la mesa scrollearía y la barra
  taparía las cartas—.
- **El origen `https://localhost` quedó anotado en `CLAUDE.md` como intocable**,
  al lado de los `id` de personalidades: de él cuelga el `localStorage`.
- El botón físico de atrás usa la MISMA `volverDesde()`. Si hay un
  `[role="dialog"]` abierto manda Escape en vez de navegar, así el que agregue
  una hoja nueva no tiene que acordarse de avisarle a ese archivo. Y **no
  importa Capacitor arriba del archivo**: mira el global que el WebView inyecta
  y recién ahí pide el módulo, para no meterle peso a la descarga de la web.

### 6. El ícono, dibujado por código

`herramientas/generar-icono.mjs` (playwright no, sólo `sharp`) hornea los 33
archivos y **borra el robot verde de Android Studio y el splash de Capacitor**,
que no son nuestros.

Es una carta con un oro, sobre la madera, con el halo. Dos cosas que salieron
mal primero:

- **el halo en rectángulos apilados se veía a escalones.** Pasó a
  `radialGradient`. La lección es la misma que ya tenía la mesa: **`feGaussianBlur`
  lo resuelve el rasterizador y no todos lo hacen igual.** Lo mismo vale para
  el navegador, y hay que tenerlo presente (ver el bug de abajo);
- **la pinta era una franja de lado a lado y partía la carta al medio.** La
  pinta es una muesca en el filo, no un tajo.

### 7. Un problema que ya existía y mordió: `playwright` no estaba declarado

`npm install` se llevó puesto playwright, del que dependen las **seis**
herramientas: estaba instalado pero no en `package.json`, así que npm lo trató
como sobrante. `playwright` y `sharp` ahora son devDependencies de verdad.

### Estado al cerrar
`npm test` **167/167** (26 nuevos) · `tsc --noEmit` limpio · `npm run build` OK ·
`npm run build:app` OK · `mirar-mesa.mjs` sin scroll en los siete ·
`mirar-mesa-nueva.mjs` en 0 · `mirar-rivales.mjs` 14 comprobaciones ·
`mirar-web.mjs` en 0 (armazón de app en 3 tamaños + vitrina en 3) ·
`mirar-app-compilada.mjs` en 0 sobre el build de la app.

### El repaso de seguridad

**No se encontró ninguna vulnerabilidad explotable.** Lo que se miró y con qué:

- **MASVS sobre `android/`**: un solo permiso (`INTERNET`), **cero código Java
  propio** (`MainActivity` es un `BridgeActivity` vacío), cero llamadas a
  `addJavascriptInterface` / `setAllowFileAccess`, `webContentsDebuggingEnabled`
  en false, `usesCleartextTraffic="false"`, `debuggable` fuera del release, y
  los únicos dos componentes son la Activity del lanzador y un `FileProvider`
  con `exported="false"`. Sin deep links: no hay superficie de secuestro de
  enlaces.
- **`allowBackup="true"` es una decisión, no un descuido**, y ahora va con
  `backup_rules.xml` + `data_extraction_rules.xml`: no hay servidor, así que la
  copia de Android es lo ÚNICO que hace que la gira sobreviva a cambiar de
  teléfono. Lo que se copia es progreso de un juego: ni un dato personal.
- **Cadena de suministro, medida con el colector** (17 dependencias directas,
  201 transitivas):
  - **0 avisos en producción.** `npm audit --omit=dev`: 0.
  - **1 aviso transitivo, sólo de desarrollo**: `uuid@7.0.3` por
    `@capacitor/cli → xcode`. `xcode` es la librería de proyectos de iOS y en un
    proyecto sólo-Android **no se ejecuta nunca**; el "arreglo" que propone npm
    es bajar el CLI a 8.4.3 y desalinearlo del runtime 8.5.1. **Se deja como
    está, anotado.**
  - El eslabón más flaco de producción es `@capacitor-community/safe-area`
    (89.010 descargas/semana, sin provenance ni política de seguridad
    publicada). Es el único paquete no oficial y vale tenerlo mirado.
- **Gradle, que el colector NO cubre, se miró a mano** y salieron dos cosas
  reales, las dos cerradas:
  1. **`gradle-wrapper.jar` es un binario de 43 KB versionado que el CI
     ejecuta.** Nadie lee un `.jar` en una revisión. El workflow ahora lo
     valida con `gradle/actions/wrapper-validation`.
  2. **La distribución de Gradle se bajaba sin verificar nada más que el
     certificado.** Se ancló `distributionSha256Sum` con la huella oficial
     (`ed1a8d68…`), traída y comprobada byte a byte.
- **El CI no tiene ningún secreto, y es a propósito**: compila un APK de
  depuración, que Android firma con su clave de mentira. La clave de verdad —la
  que si se pierde, se pierde la app para siempre— se agrega recién cuando se
  vaya a publicar. `permissions: contents: read` y `persist-credentials: false`.
- **La capa web**: cero `dangerouslySetInnerHTML`, `innerHTML`, `eval` o
  `javascript:` en `app/`, `components/` y `lib/`. La CSP llega entera adentro
  del APK (se verificó sobre el HTML compilado). `?depto=` y `?rival=` siguen
  pasando por las mismas dos funciones.
- **Los trofeos no soplan nada.** `mejor` son los puntos finales, que ya se ven
  en la barra durante toda la partida y en el cartel del final. Las cartas del
  rival siguen sin llegar al DOM (`p.cartas.rival.map((_, i) => …)`).
- **`Object.hasOwn` en tres lugares nuevos** (`anotarPartida`, `trofeosDe`, la
  tabla de nombres de la barra), con test de que un id `__proto__` no ensucia
  `Object.prototype` ni regala trofeos.
- **La carpeta `Bugs a arreglar/` se agregó al `.gitignore`** y se verificó:
  adentro hay una foto de WhatsApp y este repo es público.

Dos cosas anotadas que NO son vulnerabilidades pero conviene saber:
- **`'unsafe-inline'` en `script-src` es lo que deja pasar el puente que
  Capacitor inyecta.** El día que se endurezca a nonces, se rompe la app y no la
  web.
- `frame-ancestors` en un `<meta>` lo ignora el navegador (ya pasaba, está en
  `ideas/publicar.md`). Adentro del APK da igual: no hay iframe donde meterla.
  `public/_headers` viaja al APK como archivo muerto.

### Pendiente

1. **BUG REPORTADO, SIN REPRODUCIR** — `Bugs a arreglar/`, 1/9 a las 23:09.
   Jugando en el celular apareció **una banda de rayas cremas horizontales a los
   costados de la última carta de la mano**, más una línea blanca cruzando la
   mesa. Partida normal. Lo que se sabe:
   - son **dos artefactos horizontales en el mismo cuadro**, lo que apunta a
     rasterizado y no a distribución;
   - el sospechoso es `feGaussianBlur` en `components/mesa/Manos.tsx:74-75`, con
     una región de filtro de 180%×180% sobre un SVG que va al 100% del ancho;
   - **es exactamente la trampa que mordió al ícono esta misma sesión**: los
     filtros SVG los resuelve el rasterizador y cada uno hace lo suyo;
   - **no se intentó arreglar a ciegas**, que es lo que el proyecto tiene
     prohibido. Chromium en modo headless usa SwiftShader y no reproduce un
     defecto de GPU de un teléfono.
   Lo que hace falta para cerrarlo: saber **si se va al scrollear o al girar el
   teléfono** (si se va, es compositing y la palanca es cambiar el blur por una
   forma estática, como se hizo con el halo del ícono).
2. **El APK todavía no se compiló.** Sale de Actions con el primer push. Ahí se
   mide **la zona segura de verdad**, que es lo único de esta sesión que no se
   pudo verificar sin un teléfono.
3. **Subir a Play Store** pide cuenta de desarrollador (25 USD, una vez), ficha,
   capturas y la política de privacidad publicada. Y ahí sí, la keystore.
4. Una **copla nueva** en `versos.ts` para "primero va el envido".
5. `deNoche` todavía controla luz y desgaste a la vez en `madera.mjs`.
6. Las **constantes de la cámara siguen copiadas a mano** en `mesa-perspectiva.ts`.
7. `acentoDe` y `ambienteDe` siguen sin `Object.hasOwn`.

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
