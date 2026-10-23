"""Los 14 cantos de UN rival, clonados de su referencia con Chatterbox, y el control.

Corre con el entorno de Chatterbox, fuera del repo (lo lanza generar-voces.mjs):

    venv-chatterbox/bin/python -I cantar.py <reparto.json> <cantos.json> <salida> <id>

Por cada canto prueba tomas hasta tener DOS que pasen el control (o se le acaben
los intentos), y las deja en <salida>/<id>/<canto>-1.m4a y -2.m4a: la 1 es la que
más se parece a la referencia. Si no llega a dos, completa con DUDOSAS
(<canto>-duda-1.m4a): rechazadas sólo porque Whisper oyó algo a 1 o 2 letras.
Todo lo medido queda en <salida>/<id>/informe.json.

**Un canto que ya está en el informe no se vuelve a hacer**, aunque se haya borrado
su archivo: si Santiago borró una toma es porque no le gustó, y volver a hacerla
sola sería pisar esa decisión. Para rehacer un canto, se lo saca del informe.

── Por qué Chatterbox ──────────────────────────────────────────────────────────
En la cata del 19/10/2026 se probaron tres formas. Santiago eligió esta de oído
("son más consistentes, no cambian tanto de la referencia"), y lo medido le da
la razón: la similitud con la referencia es 0,72 acá y 0,60 diseñando la voz en
cada frase.

── El control (Claude no puede escuchar, pero puede medir) ─────────────────────
Se rechaza una toma si Whisper no oye el canto, si dura de más o de menos, si
tiene un silencio adentro de más de 0,35 s o si satura. Entre las que pasan, se
ordenan por similitud con la referencia (el codificador de voz de Chatterbox).
"""
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
from huggingface_hub import snapshot_download
from transformers import pipeline

CHATTERBOX = ("ResembleAI/chatterbox", "5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18")
WHISPER = ("openai/whisper-large-v3-turbo", "41f01f3fe87f28c78e2fbf8b568835947dd65ed9")
ARCHIVOS_CHATTERBOX = ["ve.pt", "t3_mtl23ls_v2.safetensors", "s3gen.pt", "grapheme_mtl_merged_expanded_v1.json", "conds.pt", "Cangjie5_TC.json"]

TOMAS = 2  # cuántas buenas se guardan por canto
INTENTOS_POR_TEXTO = 5
CFG = 0.4  # el de la cata, que gustó
EXAGERA_CALMO = 0.4  # tope para el mazo, el no quiero, el son buenas
HUECO_MAXIMO = 0.35
CORTE_COLA = 0.3  # un silencio así de largo termina el canto: lo que sigue es cola
LARGO_CON_GRACIA = 15  # 'conflormeachico' y 'contrafloralresto' sí; 'conflorenvido' no
DUDA_MAXIMA = 2  # letras de diferencia para que una rechazada vaya como dudosa
NUMEROS = {"4": "cuatro"}


def compacto(t: str) -> str:
    """Sin tildes, mayúsculas, signos ni espacios: 'Contra flor, al resto!' → 'contrafloralresto'."""
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    for n, palabra in NUMEROS.items():
        t = t.replace(n, palabra)
    return re.sub(r"[^a-z]", "", t)


def recortar(x: np.ndarray, sr: int, cortar_cola: bool = True) -> tuple[np.ndarray, float, float]:
    """Saca el aire de las puntas y la COLA. Devuelve (audio, silencio interno más largo, cola cortada), en s.

    La cola: muchas veces Chatterbox dice bien el canto, se calla, y después
    agrega algo que no se le pidió ("Me voy al mazo. Trantarse liproc", lo oyó
    Whisper en la tanda del 19/10). Se corta en el primer silencio de
    CORTE_COLA y se controla lo que queda: si el canto venía partido por esa
    pausa, Whisper no lo va a entender y la toma se rechaza igual.
    """
    paso, marco = int(sr * 0.01), int(sr * 0.02)
    n = max(1, (len(x) - marco) // paso)
    rms = np.array([np.sqrt(np.mean(x[i * paso : i * paso + marco] ** 2) + 1e-12) for i in range(n)])
    db = 20 * np.log10(rms)
    umbral = max(db.max() - 35, -55)
    voz = np.where(db > umbral)[0]
    if len(voz) == 0:
        return x[:0], 0.0, 0.0
    # Los tramos con voz, separados por silencios de CORTE_COLA o más.
    tramos = [[voz[0], voz[0]]]
    for f in voz[1:]:
        if f - tramos[-1][1] > CORTE_COLA * 100:
            tramos.append([f, f])
        else:
            tramos[-1][1] = f
    # Un chasquido suelto antes de hablar no es el canto.
    while len(tramos) > 1 and tramos[0][1] - tramos[0][0] < 8:
        tramos.pop(0)
    primero, ultimo = (tramos[0][0], tramos[0][1]) if cortar_cola else (tramos[0][0], tramos[-1][1])
    ini = max(0, primero * paso - int(sr * 0.06))
    fin = min(len(x), ultimo * paso + marco + int(sr * 0.12))
    cola = max(0.0, (voz[-1] - ultimo) * 0.01)
    hueco = mayor = 0
    for callado in db[primero : ultimo + 1] <= umbral:
        hueco = hueco + 1 if callado else 0
        mayor = max(mayor, hueco)
    y = x[ini:fin].copy()
    fi, fo = int(sr * 0.01), int(sr * 0.04)
    if len(y) > fi + fo:
        y[:fi] *= np.linspace(0, 1, fi)
        y[-fo:] *= np.linspace(1, 0, fo)
    return y, mayor * 0.01, cola


def distancia(a: str, b: str) -> int:
    """Levenshtein, para no rechazar 'contrafloraalresto' por una vocal de enlace."""
    fila = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        previa, fila[0] = fila[0], i
        for j, cb in enumerate(b, 1):
            previa, fila[j] = fila[j], min(fila[j] + 1, fila[j - 1] + 1, previa + (ca != cb))
    return fila[-1]


def se_entiende(oye: str, espera: list[str]) -> bool:
    """Exacto en las palabras cortas ('troco' no es 'truco'); una letra de gracia en las frases largas."""
    o = compacto(oye)
    return any(o == e or (len(e) >= LARGO_CON_GRACIA and distancia(o, e) <= 1) for e in espera)


def nivelar(y: np.ndarray) -> np.ndarray:
    """RMS de la parte con voz a -18 dBFS, con el pico tope en -1 dBFS."""
    activo = y[np.abs(y) > 0.02 * np.abs(y).max()]
    y = y * (10 ** (-18 / 20) / max(float(np.sqrt(np.mean(activo**2))), 1e-6))
    tope = 10 ** (-1 / 20)
    pico = float(np.abs(y).max())
    return y * (tope / pico) if pico > tope else y


def codificar(y: np.ndarray, sr: int, destino: Path) -> None:
    """AAC mono de 64 kbps: el formato final de ideas/sonido.md."""
    with tempfile.NamedTemporaryFile(suffix=".wav") as t:
        sf.write(t.name, y, sr, subtype="PCM_16")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", t.name, "-map_metadata", "-1", "-c:a", "aac", "-b:a", "64k", "-ac", "1", str(destino)],
            check=True,
        )


def main() -> None:
    reparto = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    cantos = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))["cantos"]
    salida = Path(sys.argv[3])
    voz = next(v for v in reparto["voces"] if v["id"] == sys.argv[4])
    d = salida / voz["id"]
    crudo = d / "crudo"
    crudo.mkdir(parents=True, exist_ok=True)
    ruta_informe = d / "informe.json"
    informe = json.loads(ruta_informe.read_text(encoding="utf-8")) if ruta_informe.exists() else {"cantos": {}}

    pendientes = [c for c in cantos if c["clave"] not in informe["cantos"]]
    if not pendientes:
        print("ya estaba:", voz["id"], flush=True)
        return

    m = ChatterboxMultilingualTTS.from_local(
        snapshot_download(repo_id=CHATTERBOX[0], revision=CHATTERBOX[1], allow_patterns=ARCHIVOS_CHATTERBOX), device="cuda"
    )
    asr = pipeline("automatic-speech-recognition", model=WHISPER[0], revision=WHISPER[1], dtype=torch.float16, device="cuda:0")

    def oir(y: np.ndarray, sr: int) -> str:
        r = asr({"raw": y.astype(np.float32), "sampling_rate": sr}, generate_kwargs={"language": "spanish", "task": "transcribe"})
        return r["text"].strip()

    def huella(y: np.ndarray, sr: int) -> np.ndarray:
        y16 = librosa.resample(y.astype(np.float32), orig_sr=sr, target_sr=m.ve.hp.sample_rate)
        return m.ve.embeds_from_wavs([y16], sample_rate=m.ve.hp.sample_rate, as_spk=True, min_coverage=0.5)

    ref_wav = d / "referencia.wav"
    x, sr_ref = sf.read(ref_wav)
    x = x if x.ndim == 1 else x.mean(1)
    huella_ref = huella(x, sr_ref)
    if not (d / "referencia.m4a").exists():
        y, _, _ = recortar(x, sr_ref, cortar_cola=False)  # la frase larga tiene pausas: no se corta
        codificar(nivelar(y), sr_ref, d / "referencia.m4a")
        informe["referencia_oye"] = oir(y, sr_ref)

    m.prepare_conditionals(str(ref_wav), exaggeration=voz["exagera"])
    for i, canto in enumerate(cantos):
        if canto["clave"] not in {c["clave"] for c in pendientes}:
            continue
        exagera = min(voz["exagera"], EXAGERA_CALMO) if canto.get("calmo") else voz["exagera"]
        lo, hi = canto["dura"]
        intentos, buenas, casi = [], [], []
        for k, texto in enumerate(canto["textos"]):
            for n in range(INTENTOS_POR_TEXTO):
                if len(buenas) >= TOMAS:
                    break
                nombre = f'{canto["clave"]}-{k}-{n}.wav'
                if (crudo / nombre).exists():
                    # Ya se generó en una pasada anterior: se vuelve a controlar, no a generar.
                    cruda, _ = sf.read(crudo / nombre)
                else:
                    torch.manual_seed(7000 + 100 * i + 10 * k + n)
                    wav = m.generate(texto, language_id="es", exaggeration=exagera, cfg_weight=CFG)
                    cruda = wav.squeeze(0).cpu().numpy()
                    sf.write(crudo / nombre, cruda, m.sr)
                y, hueco, cola = recortar(cruda, m.sr)
                dura = len(y) / m.sr
                oye = oir(y, m.sr) if dura > 0 else ""
                motivos = []
                if not se_entiende(oye, canto["espera"]):
                    motivos.append("no se entiende")
                if not lo <= dura <= hi:
                    motivos.append(f"dura {dura:.2f}s")
                if hueco > HUECO_MAXIMO:
                    motivos.append(f"silencio de {hueco:.2f}s")
                if len(y) and float(np.abs(y).max()) >= 0.999:
                    motivos.append("satura")
                parecido = float(huella_ref @ huella(y, m.sr)) if dura > 0.2 else 0.0
                intentos.append({"crudo": nombre, "texto": texto, "oye": oye, "dura": round(dura, 2), "hueco": round(hueco, 2), "cola": round(cola, 2), "parecido": round(parecido, 3), "rechazo": motivos})
                if not motivos:
                    buenas.append((parecido, y, nombre))
                elif motivos == ["no se entiende"]:
                    lejos = min(distancia(compacto(oye), e) for e in canto["espera"])
                    if lejos <= DUDA_MAXIMA:
                        casi.append((lejos, -parecido, y, nombre, oye))
        buenas.sort(key=lambda b: -b[0])
        elegidas = []
        for j, (parecido, y, nombre) in enumerate(buenas, 1):
            destino = d / f'{canto["clave"]}-{j}.m4a'
            codificar(nivelar(y), m.sr, destino)
            elegidas.append({"archivo": destino.name, "de": nombre, "parecido": round(parecido, 3)})
        # Si faltan tomas, las rechazadas que más se acercan van como DUDOSAS: que
        # decida el oído. Don Aparicio dice "falta envi'o", sin la d, como se habla en
        # el campo, y Whisper oye "envío": eso no lo puede decidir un número.
        casi.sort(key=lambda c: (c[0], c[1]))
        dudosas = []
        for j, (_, menos_parecido, y, nombre, oye) in enumerate(casi[: TOMAS - len(buenas)], 1):
            destino = d / f'{canto["clave"]}-duda-{j}.m4a'
            codificar(nivelar(y), m.sr, destino)
            dudosas.append({"archivo": destino.name, "de": nombre, "oye": oye, "parecido": round(-menos_parecido, 3)})
        informe["cantos"][canto["clave"]] = {"intentos": intentos, "elegidas": elegidas, "dudosas": dudosas}
        ruta_informe.write_text(json.dumps(informe, ensure_ascii=False, indent=1), encoding="utf-8")
        extra = f" + {len(dudosas)} dudosa" if dudosas else ""
        print(f'  {voz["id"]:<14} {canto["clave"]:<20} {len(elegidas)}{extra} de {len(intentos)} intentos', flush=True)


if __name__ == "__main__":
    main()
