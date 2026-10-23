"""Inventa la voz de cada rival: la frase larga de la que después se clonan los cantos.

Corre con el entorno de Qwen, que vive fuera del repo (lo lanza generar-voces.mjs):

    venv-qwen/bin/python -I referencias.py <reparto.json> <salida> [id ...]
    venv-qwen/bin/python -I referencias.py <reparto.json> <salida> --candidatas 4 la-nelly

Escribe <salida>/<id>/referencia.wav. **Si ya existe, no la toca**: la referencia
ES la voz del personaje, y rehacerla le cambia la voz a todo lo ya escuchado.
Para rehacer una a propósito, se borra el archivo.

Qwen3-TTS VoiceDesign (Apache 2.0) la inventa a partir de una descripción: no es
la voz de nadie. El modelo va fijado por commit, para que la próxima tanda salga
del mismo modelo que la anterior.
"""
import json
import sys
from pathlib import Path

import soundfile as sf
import torch

# torch 2.14 manda algunas operaciones a kernels de Triton, y Triton necesita un
# compilador de C que esta máquina no tiene (ni sudo para instalarlo). Se apagan
# y vuelven a la versión de siempre de PyTorch, que no compila nada.
from torch._native import registry as _nativos

_nativos.deregister_op_overrides(disable_dsl_names="triton")

from huggingface_hub import snapshot_download  # noqa: E402
from qwen_tts import Qwen3TTSModel  # noqa: E402

DISENO = ("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", "5ecdb67327fd37bb2e042aab12ff7391903235d3")
SEMILLA = 1000  # la misma de la cata del 19/10/2026
COMO = "Speaking naturally, conversational."
SEMILLAS_CANDIDATAS = 2001  # de acá para arriba, para no repetir las de antes


def instruccion(v: dict) -> str:
    return f'{v["voz"]} {v.get("como", COMO)}'


def main() -> None:
    reparto = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    salida = Path(sys.argv[2])
    resto = sys.argv[3:]
    # --candidatas N: N versiones de cada voz pedida, en <salida>/_candidatas/<id>-<semilla>.wav,
    # SIN tocar su referencia. Para rehacer una voz que no gustó: se escuchan, se elige
    # una, se copia a <id>/referencia.wav y su semilla se anota en el reparto.
    candidatas = 0
    if "--candidatas" in resto:
        i = resto.index("--candidatas")
        candidatas = int(resto[i + 1])
        resto = resto[:i] + resto[i + 2 :]
    pedidos = set(resto)
    elegidas = [v for v in reparto["voces"] if not pedidos or v["id"] in pedidos]
    if candidatas:
        trabajo = [(v, s, salida / "_candidatas" / f'{v["id"]}-{s}.wav')
                   for v in elegidas for s in range(SEMILLAS_CANDIDATAS, SEMILLAS_CANDIDATAS + candidatas)]
    else:
        # Una voz que salió igual a otra se rehace con otra `semilla` en el reparto.
        trabajo = [(v, v.get("semilla", SEMILLA), salida / v["id"] / "referencia.wav") for v in elegidas]
    trabajo = [t for t in trabajo if not t[2].exists()]
    if not trabajo:
        print("referencias: están todas", flush=True)
        return
    carpeta = snapshot_download(repo_id=DISENO[0], revision=DISENO[1])
    m = Qwen3TTSModel.from_pretrained(carpeta, device_map="cuda:0", dtype=torch.bfloat16, attn_implementation="sdpa")
    for v, semilla, destino in trabajo:
        destino.parent.mkdir(parents=True, exist_ok=True)
        torch.manual_seed(semilla)
        wavs, sr = m.generate_voice_design(text=reparto["referencia"], language="Spanish", instruct=instruccion(v))
        sf.write(destino, wavs[0], sr)
        print("voz nueva:", destino.relative_to(salida), flush=True)


if __name__ == "__main__":
    main()
