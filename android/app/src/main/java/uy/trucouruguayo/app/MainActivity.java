package uy.trucouruguayo.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Los plugins propios se registran ANTES de super.onCreate: ahí es
        // cuando Capacitor arma el puente con la lista de plugins.
        registerPlugin(ConfigAnunciosPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
