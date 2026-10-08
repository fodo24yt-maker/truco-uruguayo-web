import type { CapacitorConfig } from "@capacitor/cli";

/**
 * El envase de la app.
 *
 * Capacitor no dibuja nada: levanta un WebView, le sirve `out-app/` desde un
 * servidor local y le da acceso al botón físico de atrás. Todo lo que se ve
 * sigue siendo el mismo código que la web.
 *
 * ── EL ORIGEN NO SE TOCA NUNCA MÁS ────────────────────────────────────────
 *
 * `androidScheme` + `hostname` forman el origen `https://localhost`, y de ese
 * origen cuelga el `localStorage` donde vive TODO el progreso: las victorias de
 * la gira, los trofeos, las preferencias. Cambiar cualquiera de los dos algún
 * día le borra el progreso a cada persona que ya jugó, exactamente igual que
 * cambiar un `id` de `lib/motor/personalidades.ts`. Están escritos aunque sean
 * los valores por omisión, justamente para que se vea que son una decisión.
 */
const config: CapacitorConfig = {
  appId: "uy.trucouruguayo.app",
  appName: "Truco Uruguayo",
  webDir: "out-app",

  server: {
    androidScheme: "https",
    hostname: "localhost",
    // La app anda sin internet y no le pide nada a nadie, igual que la web.
    // Sin `url`, el WebView carga los archivos que van adentro del APK.
    cleartext: false,
  },

  android: {
    /* El inspector remoto abre la consola del WebView a cualquiera que enchufe
       el teléfono por USB. En desarrollo es cómodo; en lo que se publica, no.

       ESTE `false` MANDA SÓLO EN EL APK DE RELEASE (medido el 7/10/2026). En
       el de depuración el WebView prende el inspector igual, diga lo que diga
       acá: el APK compilado con `false` —el mismo, byte a byte, que estaba
       instalado— publicaba `webview_devtools_remote_<pid>`, y en su código la
       única llamada al interruptor es la de Capacitor con este valor. Por eso
       las herramientas que miden desde adentro (`rig-celular.mjs`,
       `medir-celular.mjs`) andan con el `--apk` de siempre, y no hay que
       tocar esto nunca: no es un riesgo nuevo, porque un APK de depuración ya
       le abre todo al cable (`run-as`), y lo que se reparte es el release. */
    webContentsDebuggingEnabled: false,

    /* 105 y no el 60 de fábrica. De `:has()` cuelga toda la familia de reglas
       de pantalla completa de `app/globals.css` —que la mesa no scrollee, que
       el encabezado se esconda—, y `:has()` existe recién desde Chromium 105.
       En un WebView más viejo el navegador descarta la regla ENTERA sin avisar:
       la mesa scrollearía y la barra taparía las cartas. Es mejor pedirle a esa
       persona que actualice el WebView que darle una app rota. */
    minWebViewVersion: 105,

    /* El fondo del WebView mismo, debajo de la página (3/10/2026). Por omisión
       es BLANCO: si el splash de Android se va antes de que la página pinte su
       primer cuadro —en un teléfono lento pasa—, asomaba un rectángulo blanco
       entre el logo y la pantalla de carga. Del mismo color que los dos. */
    backgroundColor: "#14100E",
  },

  plugins: {
    /* Desde `targetSdk 36` Android dibuja la app abajo del reloj y de los
       botones del sistema, y no hay forma de pedir lo contrario. Quién se
       ocupa de eso hay que decidirlo, porque hay dos candidatos y si trabajan
       los dos se pisan: se apaga el de Capacitor y queda el de la comunidad,
       que es el que además arregla los WebViews viejos. */
    SystemBars: { insetsHandling: "disable" },

    /* Contenido claro sobre fondo oscuro, que es todo el sitio (`#14100e`).
       El relleno lo pone el plugin cuando el WebView es viejo, y cuando es
       nuevo deja que `env(safe-area-inset-*)` funcione: de un lado y del otro,
       el CSS de `app/globals.css` es el mismo. */
    SafeArea: { statusBarStyle: "DARK", navigationBarStyle: "DARK" },

    /* Por omisión el splash es BLANCO, y sobre un sitio que es todo penumbra
       eso es un flashazo en cada arranque: lo primero que ve el que abre la
       app. Va del color del fondo, que es el mismo `themeColor` del sitio.

       `launchShowDuration: 0` DESDE EL 3/10/2026 (eran 400). Con 0 el plugin
       no instala su splash: el que se ve es el del sistema, sin logo
       (`res/values/styles.xml`), y se va solo con el primer cuadro de la app.
       Con 400, además de mostrar el logo, el plugin frenaba el dibujo del
       WebView esos 400 ms (`SplashScreen.java`, el `OnPreDrawListener`
       devuelve `false`): escondía la pantalla de carga aunque ya estuviera
       lista. El tema de la app lo pone `BridgeActivity` igual, sin el plugin. */
    SplashScreen: {
      backgroundColor: "#14100E",
      launchAutoHide: true,
      launchShowDuration: 0,
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
