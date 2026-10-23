"""¿Hay dos rivales con la misma voz? Compara las referencias entre sí.

    venv-chatterbox/bin/python -I parecidos.py <reparto.json> <salida>
    venv-chatterbox/bin/python -I parecidos.py <reparto.json> <salida> --candidatas

Con --candidatas, además puntúa las voces de <salida>/_candidatas/ (las que hace
`referencias.py --candidatas`): su tono (F0, para ver que el género cuadre) y a
qué rival se parece más. Las pasa a .m4a para la página y deja el puntaje en
_candidatas/puntaje.json.

Escribe <salida>/parecidos.json y avisa de los pares que se parecen de más. Usa
el codificador de voz de Chatterbox, que es con lo que se clona: si para él dos
referencias son casi la misma, los cantos van a salir casi iguales.

Calibrado el 19/10/2026 con las 19 referencias: la MISMA voz, mitad de su frase
contra la otra mitad, da entre 0,887 y 0,939; dos voces distintas, mitad contra
mitad, 0,68 de media y nunca más de 0,861. Por eso se avisa desde 0,88: ahí dos
rivales ya podrían ser la misma persona. Entre 0,85 y 0,88 son parecidas (dos
viejos de campo con la voz gastada), y eso lo decide el oído, no este número.
"""
import json
import subprocess
import sys
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch
from chatterbox.models.voice_encoder import VoiceEncoder
from huggingface_hub import snapshot_download

CHATTERBOX = ("ResembleAI/chatterbox", "5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18")
AVISO = 0.88


def tono(x: np.ndarray, sr: int) -> tuple[float, float]:
    """(F0 mediana en Hz, cuánto se mueve en semitonos).

    La mediana: mujeres ~165-260, varones ~85-160 (Luquita, de 16, da 213).
    El movimiento es el desvío del tono en semitonos: una voz que casi no sube
    ni baja suena a robot (lo dijo Santiago de una La Pocha del 21/10).
    """
    f0, sonora, _ = librosa.pyin(x, fmin=60, fmax=450, sr=sr)
    if not sonora.any():
        return 0.0, 0.0
    f = f0[sonora]
    return float(np.nanmedian(f)), float(np.nanstd(12 * np.log2(f / np.nanmedian(f))))


def main() -> None:
    reparto = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    salida = Path(sys.argv[2])
    ve = VoiceEncoder()
    pesos = Path(snapshot_download(repo_id=CHATTERBOX[0], revision=CHATTERBOX[1], allow_patterns=["ve.pt"])) / "ve.pt"
    ve.load_state_dict(torch.load(pesos, weights_only=True))
    ve.to("cuda").eval()
    huellas = {}
    for v in reparto["voces"]:
        ruta = salida / v["id"] / "referencia.wav"
        if not ruta.exists():
            continue
        x, sr = sf.read(ruta)
        x = librosa.resample((x if x.ndim == 1 else x.mean(1)).astype(np.float32), orig_sr=sr, target_sr=ve.hp.sample_rate)
        huellas[v["id"]] = ve.embeds_from_wavs([x], sample_rate=ve.hp.sample_rate, as_spk=True)
    ids = list(huellas)
    pares = sorted(
        ((float(huellas[a] @ huellas[b]), a, b) for i, a in enumerate(ids) for b in ids[i + 1 :]), reverse=True
    )
    (salida / "parecidos.json").write_text(
        json.dumps([{"a": a, "b": b, "parecido": round(s, 3)} for s, a, b in pares], indent=1), encoding="utf-8"
    )
    print("los diez pares más parecidos:")
    for s, a, b in pares[:10]:
        print(f"  {s:.3f}  {a} ~ {b}{'   <-- de más' if s >= AVISO else ''}", flush=True)

    if "--candidatas" not in sys.argv:
        return
    carpeta = salida / "_candidatas"
    puntaje = {}
    for c in sorted(carpeta.glob("*.wav")):
        dueno = c.stem.rsplit("-", 1)[0]
        x, sr = sf.read(c)
        x = librosa.resample((x if x.ndim == 1 else x.mean(1)).astype(np.float32), orig_sr=sr, target_sr=ve.hp.sample_rate)
        h = ve.embeds_from_wavs([x], sample_rate=ve.hp.sample_rate, as_spk=True)
        otros = {k: float(h @ v) for k, v in huellas.items() if k != dueno}
        cerca = max(otros, key=otros.get)
        mediana, movimiento = tono(x, ve.hp.sample_rate)
        puntaje[c.stem] = {"tono": round(mediana, 1), "movimiento": round(movimiento, 2), "mas_parecida": cerca, "parecido": round(otros[cerca], 3)}
        if not c.with_suffix(".m4a").exists():
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(c), "-map_metadata", "-1", "-af", "loudnorm=I=-18:TP=-1",
                            "-c:a", "aac", "-b:a", "64k", "-ac", "1", str(c.with_suffix(".m4a"))], check=True)
        p = puntaje[c.stem]
        print(f"  {c.stem:<20} tono {p['tono']:6.1f} Hz  se mueve {p['movimiento']:4.1f} st   más parecida: {cerca:<14} {p['parecido']:.3f}"
              f"{'   <-- de más' if p['parecido'] >= AVISO else ''}", flush=True)
    (carpeta / "puntaje.json").write_text(json.dumps(puntaje, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
