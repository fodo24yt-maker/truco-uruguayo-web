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
       el teléfono por USB. En desarrollo es cómodo; en lo que se publica, no. */
    webContentsDebuggingEnabled: false,

    /* 105 y no el 60 de fábrica. De `:has()` cuelga toda la familia de reglas
       de pantalla completa de `app/globals.css` —que la mesa no scrollee, que
       el encabezado se esconda—, y `:has()` existe recién desde Chromium 105.
       En un WebView más viejo el navegador descarta la regla ENTERA sin avisar:
       la mesa scrollearía y la barra taparía las cartas. Es mejor pedirle a esa
       persona que actualice el WebView que darle una app rota. */
    minWebViewVersion: 105,
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
       app. Va del color del fondo, que es el mismo `themeColor` del sitio. */
    SplashScreen: {
      backgroundColor: "#14100E",
      launchAutoHide: true,
      launchShowDuration: 400,
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
