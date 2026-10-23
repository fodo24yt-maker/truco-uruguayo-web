"""Los temas de IA de la música de fondo: ACE-Step 1.5 (MIT), corriendo en la placa de video.

    cd ~/herramientas-audio/ace-step
    HF_HUB_OFFLINE=1 .venv/bin/python -I <ruta del repo>/herramientas/musica/con-ia.py <ruta del repo>/audio-fuente/musica/cata

Escribe <salida>/crudo/<estilo>-<semilla>.wav, de 60 s cada uno, y los toma
`herramientas/publicar-musica.mjs`. Instrumental siempre: ningún tema lleva voz
(las voces son de los rivales). Se comprobó con Whisper el 21/10/2026.

ACE-Step vive FUERA del repo, en ~/herramientas-audio/ace-step (versión v0.1.8,
modelo `ACE-Step/Ace-Step1.5` fijado en el commit 19671f4). Carga sus modelos con
`trust_remote_code=True`: antes de correrlo se reemplazaron los dos .py del DiT
por los del repo de GitHub y se corre con HF_HUB_OFFLINE=1. Está en el Historial
del 21/10/2026.
"""
import json
import sys
from pathlib import Path

from acestep.handler import AceStepHandler
from acestep.inference import GenerationConfig, GenerationParams, generate_music
from acestep.llm_inference import LLMHandler

RAIZ = Path.cwd()  # ~/herramientas-audio/ace-step
SALIDA = Path(sys.argv[1])
ESTILOS = {
    "milonga": dict(
        caption="Uruguayan milonga, instrumental, nylon-string Spanish guitar playing a milonga bass rhythm, "
        "bandoneon melody, warm and relaxed, acoustic, small neighborhood bar at night, background music",
        bpm=100, keyscale="A minor", timesignature="2",
    ),
    "candombe": dict(
        caption="Uruguayan candombe, instrumental, candombe hand drums (chico, repique and piano drums) with a "
        "relaxed acoustic guitar, warm, laid-back, background music for a card game",
        bpm=108, keyscale="D minor", timesignature="4",
    ),
    "tango": dict(
        caption="Rioplatense tango milonga, instrumental, bandoneon, piano and double bass, laid-back café "
        "atmosphere, warm vintage acoustic sound, background music",
        bpm=96, keyscale="E minor", timesignature="4",
    ),
}
SEMILLAS = [1910, 2110]


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    dit = AceStepHandler()
    estado, ok = dit.initialize_service(project_root=str(RAIZ), config_path="acestep-v15-turbo", device="cuda")
    print("DiT:", ok, estado, flush=True)
    lm = LLMHandler()
    estado, ok = lm.initialize(checkpoint_dir=str(RAIZ / "checkpoints"), lm_model_path="acestep-5Hz-lm-1.7B", backend="pt", device="cuda")
    print("LM:", ok, estado, flush=True)
    informe = {}
    for nombre, e in ESTILOS.items():
        for semilla in SEMILLAS:
            params = GenerationParams(
                caption=e["caption"], lyrics="[Instrumental]", instrumental=True, vocal_language="unknown",
                bpm=e["bpm"], keyscale=e["keyscale"], timesignature=e["timesignature"], duration=60, seed=semilla,
                inference_steps=8, shift=3.0,
            )
            config = GenerationConfig(batch_size=1, use_random_seed=False, seeds=[semilla], audio_format="wav")
            r = generate_music(dit, lm, params, config, save_dir=str(SALIDA / "crudo"))
            if not r.success:
                print("falló", nombre, semilla, r.error, flush=True)
                continue
            a = r.audios[0]
            destino = SALIDA / "crudo" / f"{nombre}-{semilla}.wav"
            Path(a["path"]).rename(destino)
            informe[destino.stem] = {"caption": e["caption"], "bpm": e["bpm"], "tono": e["keyscale"], "compas": e["timesignature"]}
            print("tema:", destino.name, flush=True)
    (SALIDA / "crudo" / "temas.json").write_text(json.dumps(informe, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
