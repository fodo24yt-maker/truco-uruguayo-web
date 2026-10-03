package uy.trucouruguayo.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Le pasa a la web los IDs de las unidades de anuncio.
 *
 * Existe porque el JavaScript es el mismo en debug y en release (se compila una
 * vez, antes que Gradle) y los IDs NO: en debug son los de prueba y en release
 * los de verdad. Los dos los decide `android/app/admob.gradle`, que los deja en
 * BuildConfig, y esto sólo los lee.
 *
 * No recibe nada de la web ni hace nada más que devolver constantes, así que no
 * hay entrada que validar ni nada que se pueda abusar desde la página.
 */
@CapacitorPlugin(name = "ConfigAnuncios")
public class ConfigAnunciosPlugin extends Plugin {

    @PluginMethod
    public void leer(PluginCall call) {
        JSObject respuesta = new JSObject();
        respuesta.put("intersticial", BuildConfig.ADMOB_INTERSTICIAL);
        respuesta.put("recompensa", BuildConfig.ADMOB_RECOMPENSA);
        respuesta.put("prueba", BuildConfig.DEBUG);
        // El dispositivo de prueba de UMP sólo existe en debug
        respuesta.put("dispositivoPruebaUmp", BuildConfig.DEBUG ? BuildConfig.ADMOB_DISPOSITIVO_PRUEBA_UMP : "");
        call.resolve(respuesta);
    }
}
