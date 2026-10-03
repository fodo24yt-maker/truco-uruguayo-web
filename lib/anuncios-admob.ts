/**
 * La red de anuncios de verdad: AdMob, por `@capacitor-community/admob`.
 *
 * Es el ÚNICO archivo que conoce el plugin. Se importa en forma dinámica y sólo
 * en la app (`components/Anuncios.tsx`), así que el build de la web no lo trae.
 *
 * Tres cosas del plugin que mandan cómo está escrito esto, verificadas leyendo
 * su código Java (v8.1.0):
 *
 *  1. `showRewardVideoAd()` resuelve SÓLO si se gana la recompensa. Si el
 *     usuario cierra antes, o falla, la promesa no termina nunca. Por eso acá
 *     no se espera esa promesa: lo que pasa llega por los eventos.
 *  2. Si no hay anuncio cargado, `show…()` rechaza y emite "falló la CARGA",
 *     no "falló al mostrar". Por eso `mostrar` devuelve el rechazo tal cual y
 *     el gestor lo toma como "no se pudo, que pase".
 *  3. Los anuncios cargados se guardan en un mapa por ID de unidad y se borran
 *     al cerrarse. El gestor nunca carga un formato mientras está en pantalla.
 */

import {
  AdMob,
  AdmobConsentDebugGeography,
  AdmobConsentStatus,
  InterstitialAdPluginEvents,
  MaxAdContentRating,
  RewardAdPluginEvents,
  type AdmobConsentInfo,
  type AdmobConsentRequestOptions,
} from "@capacitor-community/admob";
import { App } from "@capacitor/app";
import { registerPlugin } from "@capacitor/core";

import {
  CLASIFICACION_MAXIMA,
  DIRIGIDA_A_MENORES,
  type EventoMotor,
  type Formato,
  type InicioMotor,
  type MotorAnuncios,
} from "./anuncios.ts";

/** El plugin propio de `android/app/src/main/java/.../ConfigAnunciosPlugin.java`. */
interface ConfigAnuncios {
  leer(): Promise<{
    intersticial: string;
    recompensa: string;
    prueba: boolean;
    dispositivoPruebaUmp: string;
  }>;
}
const ConfigAnuncios = registerPlugin<ConfigAnuncios>("ConfigAnuncios");

const FORMATO_UNIDAD = /^ca-app-pub-\d{16}\/\d{10}$/;
const FORMATO_DISPOSITIVO = /^[0-9A-Fa-f]{32}$/;

/**
 * Arma el motor. Devuelve `null` si no se puede (sin el plugin propio, con
 * IDs que no tienen forma de ID): en ese caso no hay anuncios y todo pasa.
 */
export async function crearMotorAdmob(): Promise<MotorAnuncios | null> {
  let cfg: Awaited<ReturnType<ConfigAnuncios["leer"]>>;
  try {
    cfg = await ConfigAnuncios.leer();
  } catch {
    return null;
  }
  if (!FORMATO_UNIDAD.test(cfg.intersticial) || !FORMATO_UNIDAD.test(cfg.recompensa)) return null;

  const unidad: Record<Formato, string> = {
    intersticial: cfg.intersticial,
    video: cfg.recompensa,
  };
  const prueba = cfg.prueba === true;

  /* Para ver el formulario de consentimiento desde Uruguay hay que decirle a
     UMP que haga de cuenta que el teléfono está en Europa. Sólo en debug, y
     sólo si se cargó el id del teléfono en `admob.properties`. */
  const opcionesConsentimiento: AdmobConsentRequestOptions =
    prueba && FORMATO_DISPOSITIVO.test(cfg.dispositivoPruebaUmp)
      ? {
          debugGeography: AdmobConsentDebugGeography.EEA,
          testDeviceIdentifiers: [cfg.dispositivoPruebaUmp],
        }
      : {};

  const oyentes = new Set<(e: EventoMotor) => void>();
  const emitir = (e: EventoMotor) => {
    for (const fn of oyentes) fn(e);
  };

  // Los oyentes se registran UNA vez, acá, aunque React monte dos veces.
  await Promise.all([
    AdMob.addListener(InterstitialAdPluginEvents.Showed, () =>
      emitir({ tipo: "mostrado", formato: "intersticial" }),
    ),
    AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () =>
      emitir({ tipo: "fallo-mostrar", formato: "intersticial" }),
    ),
    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () =>
      emitir({ tipo: "cerrado", formato: "intersticial" }),
    ),
    AdMob.addListener(RewardAdPluginEvents.Showed, () => emitir({ tipo: "mostrado", formato: "video" })),
    AdMob.addListener(RewardAdPluginEvents.FailedToShow, () =>
      emitir({ tipo: "fallo-mostrar", formato: "video" }),
    ),
    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => emitir({ tipo: "cerrado", formato: "video" })),
    // El ÚNICO evento que da la recompensa: sale de OnUserEarnedRewardListener
    AdMob.addListener(RewardAdPluginEvents.Rewarded, () => emitir({ tipo: "recompensa" })),
    App.addListener("resume", () => emitir({ tipo: "volvio" })),
  ]);

  const leerInicio = (info: AdmobConsentInfo): InicioMotor => ({
    puedePedir: info.canRequestAds === true,
    // Texto y no el enum: el plugin lo declara pero no lo exporta. Es el
    // `.name()` del enum de Java (AdConsentExecutor.java).
    pidePrivacidad: info.privacyOptionsRequirementStatus === "REQUIRED",
  });

  let sdkIniciado = false;

  return {
    async iniciar() {
      // 1. El consentimiento, SIEMPRE antes de pedir un anuncio
      let info = await AdMob.requestConsentInfo(opcionesConsentimiento);
      if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
        info = { ...info, ...(await AdMob.showConsentForm()) };
      }
      const inicio = leerInicio(info);
      // 2. El SDK, sólo si se puede pedir
      if (inicio.puedePedir && !sdkIniciado) {
        await AdMob.initialize({
          tagForChildDirectedTreatment: DIRIGIDA_A_MENORES,
          tagForUnderAgeOfConsent: false,
          maxAdContentRating: MaxAdContentRating[CLASIFICACION_MAXIMA],
        });
        sdkIniciado = true;
      }
      return inicio;
    },

    async cargar(f) {
      const opciones = { adId: unidad[f], isTesting: prueba };
      if (f === "intersticial") await AdMob.prepareInterstitial(opciones);
      else await AdMob.prepareRewardVideoAd(opciones);
    },

    mostrar(f) {
      // No se espera el "resolvió": en el video sólo resuelve al ganar.
      // Sí se devuelve el rechazo: quiere decir "no había nada para mostrar".
      return f === "intersticial" ? AdMob.showInterstitial() : AdMob.showRewardVideoAd();
    },

    alEvento(fn) {
      oyentes.add(fn);
    },

    async abrirPrivacidad() {
      await AdMob.showPrivacyOptionsForm();
      // El formulario no devuelve nada: se vuelve a preguntar cómo quedó
      return leerInicio(await AdMob.requestConsentInfo(opcionesConsentimiento));
    },
  };
}
