# Publicar en Google Play: qué pide Google y cómo presentarlo

> Lo que hay que hacer para que la app de Android llegue a Play Store, en orden.
> Escrito para seguirlo paso a paso, el 27/10/2026. Las reglas de Google
> cambian seguido: lo que diga Play Console ese día manda sobre esto.

## Lo que pide Google hoy

| Requisito | Cómo estamos |
|---|---|
| **Cuenta de desarrollador** personal: 25 USD una vez, documento de identidad, correo y teléfono verificados, y acceso a un Android de verdad (se verifica con la app Play Console) | A hacer (paso 1) |
| **Prueba cerrada con 12 testers durante 14 días seguidos** antes de poder publicar. Vale para las cuentas personales creadas después del 13/11/2023 | A organizar (paso 6) |
| **Target API 36** (Android 16) para apps nuevas, desde el 31/8/2026 | ✔ `android/variables.gradle` |
| Subir un **AAB** (no un APK), con **Play App Signing** | ✔ `npm run build:aab` y `android/app/firma.gradle`; falta crear la clave (paso 2) |
| **Páginas de memoria de 16 KB** | Casi seguro ✔: Capacitor no trae código nativo propio y el SDK de anuncios 25.4 ya cumple. Se confirma en el explorador de bundles al subir |
| **Política de privacidad** en una URL pública (no un PDF) que nombre al responsable, tenga un contacto, diga qué datos se recogen, con quién se comparten, cómo se protegen y cuánto se guardan, y que coincida con el formulario de seguridad de los datos | ✔ `/legales/privacidad`, salvo el nombre y el correo, que están vacíos en `lib/sitio.ts` (paso 1) |
| La política **también adentro de la app** | ✔ Ajustes → Privacidad, y el pie de Aprender |
| **Declaraciones** de Play Console: anuncios, ID de publicidad, seguridad de los datos, público objetivo, clasificación, acceso a la app y las de noticias, gobierno, finanzas y salud | Las respuestas están en el paso 5 |
| **Consentimiento en Europa**: AdMob exige un formulario certificado (el UMP de Google) para el EEE, el Reino Unido y Suiza | ✔ en el código; falta publicar el mensaje en AdMob (paso 3) |
| **`app-ads.txt`** en la raíz del sitio del desarrollador | A hacer (paso 3) |
| **Anuncios que no molestan**: nada de intersticiales "al comienzo de un nivel"; lo permitido es "después de la pantalla de puntaje" | ✔ desde el 27/10/2026 sale sólo al dejar el cartel de fin de partida |
| **Ficha**: nombre de hasta 30 caracteres, descripción corta de hasta 80, completa de hasta 4000, ícono de 512, gráfico de 1024×500 y de 2 a 8 capturas | Textos en el paso 4; las imágenes las arman `herramientas/` |

## Paso 1. La cuenta de desarrollador

1. Entrá a **play.google.com/console** con la cuenta de Google que va a ser la
   dueña de la app, y elegí **cuenta personal**. Se paga una vez (25 USD).
2. Google pide el documento, verifica un correo y un teléfono privados, y
   después pide verificar desde un Android real con la app **Play Console**.
3. **El nombre de desarrollador** es el que aparece abajo del nombre de la app
   en la ficha. Puede ser una marca inventada, pero:
   - tiene que estar libre: Play no deja que dos cuentas activas usen el mismo,
     y te lo dice al crear la cuenta;
   - no puede parecerse a una marca ajena (por eso "Stashy" no convence: está
     muy cerca de STASH, que es marca registrada para apps);
   - se puede cambiar después, en Configuración.
4. **El correo público** de la ficha. Mejor uno nuevo sólo para la app, así el
   personal no queda en internet.
5. **Sitio web**: `https://truquito.smmqo08.workers.dev`. Hace falta para el
   `app-ads.txt` (paso 3).
6. Con el nombre y el correo elegidos, se completan **dos líneas** de
   `lib/sitio.ts`:

   ```ts
   export const DESARROLLADOR: string | null = "el nombre de la ficha";
   export const CORREO_CONTACTO: string | null = "el correo de la ficha";
   ```

   La política de privacidad y los términos los muestran solos. **Hay que
   publicar la web con eso (push a `main`) antes de subir el primer AAB**: la
   URL de la política va en la ficha, y Google la mira.

## Paso 2. La clave de subida y el AAB

Con Play App Signing, la clave que firma la app que llega a los teléfonos la
crea y la guarda Google. Vos tenés una **clave de subida**, que sirve para que
Google sepa que el AAB es tuyo. Si se pierde, se pide un reinicio desde Play
Console y no se pierde la app, pero mientras tanto no se puede publicar nada.

1. Crear la clave (una sola vez), desde la raíz del repo:

   ```
   keytool -genkeypair -v -keystore android/upload-keystore.jks -alias subida -keyalg RSA -keysize 2048 -validity 10000
   ```

   Pide dos contraseñas y unos datos (nombre, país). `*.jks` está en el
   `.gitignore`: no sube.
2. Copiar `android/key.properties.ejemplo` a `android/key.properties` y
   completarlo:

   ```
   storeFile=upload-keystore.jks
   storePassword=…
   keyAlias=subida
   keyPassword=…
   ```

3. **Dos copias** del `.jks` y de las contraseñas, fuera de la compu: un
   pendrive y un gestor de contraseñas o una nube cifrada.
4. Armar el AAB, con `android/admob.properties` en su lugar:

   ```
   npm run build:aab
   ```

   Queda en `android/app/build/outputs/bundle/release/app-release.aab`. Si
   falta la clave o los IDs de AdMob, el build lo dice y no arma nada.
5. **Cada AAB que se sube lleva un `versionCode` más alto** que el anterior
   (`android/app/build.gradle`). El primero es el 1.
6. Al subir el primero, Play pregunta por la firma: dejá la opción de siempre,
   **"Google genera y protege la clave de firma de la app"**.

## Paso 3. AdMob

En **admob.google.com** (el App ID y las dos unidades ya están hechos):

1. **Privacidad y mensajes → Reglamentaciones europeas**: crear el mensaje de
   consentimiento para la app, con la URL de la política
   (`https://truquito.smmqo08.workers.dev/legales/privacidad`), y
   **publicarlo**. Sin eso, en Europa no hay formulario y AdMob sólo sirve
   anuncios limitados.
2. Opcional: el mensaje de **Reglamentaciones estatales de EE. UU.**, si la
   app se va a distribuir allá.
3. **Configuración → Dispositivos de prueba**: agregar tu teléfono, así el
   release con los IDs de verdad te muestra anuncios de prueba. **Nunca tocar
   los anuncios reales propios**: es baneo de la cuenta.
4. **`app-ads.txt`**: es una línea con tu número de editor,
   `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`. El número son
   los 16 dígitos de `ADMOB_APP_ID` en `android/admob.properties`, entre
   `ca-app-pub-` y `~`. No es secreto: va adentro de cada APK.
   - Va en `public/app-ads.txt`, se publica la web, y tiene que verse en
     `https://truquito.smmqo08.workers.dev/app-ads.txt`.
   - AdMob lo busca en el sitio web de la ficha de Play, así que se verifica
     **después** de publicar la ficha, y tarda hasta 24 horas.
   - Si AdMob no lo encuentra en el subdominio de workers.dev, la salida es un
     dominio propio (se cambia en `lib/sitio.ts` y en la ficha).
5. **Controles de bloqueo → Categorías sensibles**: bloquear **Juegos de azar y
   apuestas**. Una app de truco para mayores de 13 no tiene por qué mostrar
   casinos. El tope de contenido "con guía de los padres" ya va en el código.
6. **Pagos**: los datos de cobro y el formulario de impuestos de EE. UU.
   (W-8BEN). AdMob paga recién al pasar los 100 USD.
7. Con la app ya publicada: **Apps → la app → Configuración → Vincular a una
   tienda**. AdMob revisa la app, y hasta que la aprueba los anuncios salen
   limitados.

## Paso 4. La ficha de la tienda

**Nombre de la app** (máximo 30): `Truco Uruguayo`

Nada de "gratis", "el mejor" ni "#1" en el nombre: Play no lo permite.

**Descripción corta** (máximo 80; tiene 72):

```
Aprendé a jugar al truco uruguayo desde cero y practicá contra la compu.
```

**Descripción completa** (máximo 4000):

```
Truco Uruguayo es para aprender a jugar al truco uruguayo desde cero y practicarlo contra la compu, en el mismo lugar.

Casi todo lo que hay para aprender truco es truco argentino, y se saltea justo lo que hace distinto al nuestro: la muestra y las piezas. Acá está todo, con las reglas que se juegan en Uruguay.

APRENDER
• 8 lecciones en orden, de la baraja a la tabla de puntos, con las cartas dibujadas en cada ejemplo.
• La muestra y las piezas, explicadas paso a paso.
• 12 ejercicios que te dicen si acertaste y por qué.

JUGAR
• Mano a mano contra la compu, con las reglas completas: muestra, piezas, envido, flor (con flor envido y contraflor al resto), truco, retruco, vale cuatro y pardas.
• Partida rápida contra el rival que elijas, o la Gira nacional: 19 rivales, uno por departamento, cada uno con su manera de jugar y su historia. Ganale a cada uno y llevate el premio de su departamento.
• Los rivales más difíciles se acuerdan de cómo jugás.
• Ayudas que te avisan qué podés cantar y cuánto tenés. Se apagan cuando quieras.

ANOTADOR
• La tablita para anotar las partidas de verdad, con malas y buenas.

Hecho en Uruguay. Sin registro y sin cuentas: tu progreso queda en tu teléfono. Se juega sin conexión.

La app es gratis y tiene anuncios: uno de pantalla completa al terminar una partida, como mucho cada tres minutos, y videos opcionales para desbloquear el anotador o la Gira nacional (la Gira también se abre terminando Aprender).

En el truco de esta app se apuestan puntos y nada más: no hay dinero, fichas ni compras.
```

**Categoría**: Juego → **Cartas**. Etiquetas (hasta 5, de la lista de Play):
cartas, un jugador, sin conexión.

**Datos de contacto**: el correo del paso 1, y el sitio
`https://truquito.smmqo08.workers.dev`.

**Política de privacidad**: `https://truquito.smmqo08.workers.dev/legales/privacidad`

**Las imágenes** salen de la app compilada, con los scripts que ya existen:

```
npm run build:app && npm run servir:app        (en otra terminal)
node herramientas/branding.mjs                 las 6 capturas (1080×1920) y el gráfico destacado (1024×500)
node herramientas/generar-icono.mjs --tienda   el ícono de 512
```

Quedan en `app branding/` (no sube a GitHub). `branding.mjs` ya comprueba los
tamaños que acepta Play. Las capturas tienen que mostrar la app de verdad, y la
muestran: son fotos de la mesa, del mapa y de Aprender.

## Paso 5. El contenido de la app, respuesta por respuesta

En Play Console → **Política → Contenido de la app**:

| Sección | Qué contestar |
|---|---|
| Política de privacidad | `https://truquito.smmqo08.workers.dev/legales/privacidad` |
| Anuncios | **Sí, la app contiene anuncios** |
| Acceso a la app | **Toda la funcionalidad está disponible sin acceso especial**. No hay cuentas ni contraseñas; el anotador y la Gira se desbloquean con un video o terminando Aprender, y eso no es un acceso restringido |
| ID de publicidad | **Sí, la usa**. Para qué: **Publicidad o marketing**, **Estadísticas** y **Prevención de fraude, seguridad y cumplimiento** (lo que hace AdMob con ella) |
| Público objetivo | **13 a 15, 16 a 17 y 18 o más**. "¿Puede atraer a niños?": **No**. Si algún día se marca menos de 13, entra la política de Familias y hay que cambiar `DIRIGIDA_A_MENORES` en `lib/anuncios.ts` a la vez |
| Apps de noticias | No |
| Apps de gobierno | No |
| Funciones financieras | La app no ofrece funciones financieras |
| Salud | Ninguna |

**Clasificación del contenido (IARC)**. Categoría: **Juego**. Contestar con la
verdad, y ante la duda, de más y no de menos (si Google después encuentra algo
no declarado, puede sacar la app):

- Violencia, miedo, sexualidad, lenguaje fuerte: **No**.
- Drogas, alcohol y tabaco: **Sí, referencias al alcohol**. Hay bares, un vaso
  de caña y una botella de cerveza como objetos de la mesa; nadie toma.
- **Apuestas simuladas: Sí.** El truco se juega "apostando" puntos (envido,
  truco), y las lecciones lo dicen así. No hay dinero, fichas ni nada que se
  compre, y conviene aclararlo donde el formulario deje.
- Los usuarios interactúan o comparten contenido: **No** (no hay chat ni nada
  en línea). Comparte la ubicación con otros usuarios: **No**. Compras
  digitales: **No**.

Lo esperable es **PEGI 12 / Teen**, que coincide con el público de 13 o más.

**Seguridad de los datos**. Lo que recoge la app lo recoge el SDK de AdMob, y
eso cuenta como recogido por la app. Antes de llenarlo, mirar la guía oficial
del día, que es la que manda:
`developers.google.com/admob/android/privacy/play-data-disclosure`. **Si algo
cambia, se cambia también la política** (`app/legales/privacidad/page.tsx`),
porque las dos tienen que decir lo mismo.

- ¿Recoge o comparte datos? **Sí.**
- ¿Están cifrados en tránsito? **Sí.**
- ¿Hay forma de pedir que se borren? **No**: no hay cuentas y no guardamos
  nada; lo de AdMob lo maneja Google, y la política explica cómo borrar el ID
  de publicidad.
- Los tipos, todos **recogidos y compartidos**, **no efímeros** y
  **obligatorios** (el usuario no los puede apagar desde la app):

| Categoría | Tipo | Para qué |
|---|---|---|
| Ubicación | Ubicación aproximada | Publicidad o marketing · Estadísticas · Prevención de fraude, seguridad y cumplimiento |
| Información y rendimiento de la app | Registros de fallas · Diagnóstico · Otros datos de rendimiento | Estadísticas · Prevención de fraude, seguridad y cumplimiento |
| Identificadores del dispositivo u otros | Identificadores del dispositivo u otros | Publicidad o marketing · Estadísticas · Prevención de fraude, seguridad y cumplimiento |
| Actividad en la app | Interacciones con la app | Publicidad o marketing · Estadísticas · Prevención de fraude, seguridad y cumplimiento |

## Paso 6. Prueba interna, y después la prueba cerrada

1. **Prueba interna** (hasta 100 personas, sin revisión): subir el primer AAB y
   probarlo en tu teléfono, que tiene que estar en la lista de dispositivos de
   prueba de AdMob (paso 3). Es el AAB de verdad, con los anuncios de verdad.
2. **Prueba cerrada**, que es la que destraba la producción:
   - Crear el canal de prueba cerrada y una lista de testers por correo (o un
     Grupo de Google). Cada uno tiene que tener cuenta de Google.
   - Necesitás **al menos 12 testers inscriptos durante 14 días seguidos**. Si
     uno se borra antes, el conteo puede volver a cero: **conviene juntar 15
     o 20**.
   - Cada tester entra al enlace de inscripción, instala la app desde Play y la
     deja instalada. Google mira que la usen: pediles que jueguen unas partidas
     en esos días y que te cuenten qué encontraron.
   - **Anotá lo que te dicen y lo que arreglás** (en el `Historial.md`): el
     cuestionario del paso 7 lo pregunta.
   - Play corre solo el **informe previo al lanzamiento** (robots que tocan la
     app en teléfonos de prueba). Mirar si marca cierres o problemas.
3. **Países**: todos, o al menos América Latina, España y Europa. El
   consentimiento para Europa ya está en la app.

## Paso 7. Pedir la producción y publicar

1. Pasados los 14 días, en el Panel aparece **Solicitar acceso a producción**:
   es un cuestionario sobre la prueba (cómo juntaste los testers, qué te
   dijeron, qué cambiaste). Se contesta con lo anotado.
2. Google revisa la solicitud (unos días) y después cada versión que se manda
   a producción (también unos días; la primera puede tardar más).
3. Con la app publicada: vincularla en AdMob (paso 3.7) y verificar el
   `app-ads.txt`.

## La lista, en orden

- [ ] Crear la cuenta de Play Console y verificarla (paso 1).
- [ ] Elegir nombre de desarrollador y correo, ponerlos en `lib/sitio.ts`.
- [ ] Publicar la web con la política actualizada (push a `main`) y mirarla en
      `https://truquito.smmqo08.workers.dev/legales/privacidad`.
- [ ] Crear la clave de subida, `android/key.properties` y las dos copias.
- [ ] AdMob: mensaje de Europa publicado, teléfono de prueba, bloqueo de
      apuestas, pagos.
- [ ] `public/app-ads.txt` con el número de editor, y publicar la web.
- [ ] Generar el ícono, el gráfico destacado y las capturas.
- [ ] Crear la app en Play Console: ficha, contenido de la app (paso 5).
- [ ] `npm run build:aab` y subirlo a la prueba interna. Probarlo.
- [ ] Prueba cerrada con 15–20 testers, 14 días, anotando lo que pase.
- [ ] Solicitar acceso a producción.
- [ ] Publicar, vincular en AdMob y verificar `app-ads.txt`.

## Fuentes

Consultadas el 27/10/2026. Son las que conviene volver a mirar si algo no
coincide:

- Nivel de API: [developer.android.com/google/play/requirements/target-sdk](https://developer.android.com/google/play/requirements/target-sdk)
- Requisitos de la cuenta personal: [support.google.com/googleplay/android-developer/answer/10840893](https://support.google.com/googleplay/android-developer/answer/10840893)
- Prueba cerrada de 12 testers por 14 días (guía no oficial; lo oficial está en Play Console): [testerscommunity.com/guides/how-many-testers-do-you-need-google-play](https://www.testerscommunity.com/guides/how-many-testers-do-you-need-google-play)
- Política de datos del usuario y de privacidad: [support.google.com/googleplay/android-developer/answer/10144311](https://support.google.com/googleplay/android-developer/answer/10144311)
- Lo que recoge el SDK de AdMob, para el formulario: [support.google.com/admob/answer/11402075](https://support.google.com/admob/answer/11402075) y `developers.google.com/admob/android/privacy/play-data-disclosure`
- Anuncios que molestan: [support.google.com/googleplay/android-developer/answer/9857753](https://support.google.com/googleplay/android-developer/answer/9857753)
- Consentimiento en Europa (CMP certificado): [support.google.com/admob/answer/13554020](https://support.google.com/admob/answer/13554020)
- Familias y anuncios para menores: [support.google.com/admob/answer/6223431](https://support.google.com/admob/answer/6223431)
- `app-ads.txt`: [support.google.com/admob/answer/9363762](https://support.google.com/admob/answer/9363762)
- Imágenes de la ficha: [support.google.com/googleplay/android-developer/answer/9866151](https://support.google.com/googleplay/android-developer/answer/9866151)
- Juegos de azar y apuestas simuladas: [support.google.com/googleplay/android-developer/answer/9877032](https://support.google.com/googleplay/android-developer/answer/9877032)
