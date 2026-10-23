"""La página para escuchar las voces y elegir: <salida>/index.html.

    python3 -I pagina.py <reparto.json> <cantos.json> <salida>

Sólo biblioteca estándar, y todo lo que entra al HTML pasa por html.escape.
Se rehace después de cada rival, así se puede ir escuchando mientras se genera
el resto. Si se borra una toma de la carpeta, al recargar la página desaparece
sola: cada audio se pide con HEAD al cargar y el que da 404 se esconde.
"""
import html
import json
import sys
from pathlib import Path

e = html.escape


def main() -> None:
    reparto = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    cantos = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))["cantos"]
    salida = Path(sys.argv[3])

    indice, bloques = [], []
    for numero, v in enumerate(reparto["voces"], 1):
        d = salida / v["id"]
        informe_ruta = d / "informe.json"
        informe = json.loads(informe_ruta.read_text(encoding="utf-8")) if informe_ruta.exists() else {"cantos": {}}
        hechos = len(informe["cantos"])
        estado = "lista" if hechos == len(cantos) else ("a medias" if hechos else "falta")
        indice.append(f'<a href="#{e(v["id"])}" class="{"lista" if estado == "lista" else "falta"}">{numero}. {e(v["nombre"])}</a>')
        if not hechos:
            continue
        filas = []
        for c in cantos:
            datos = informe["cantos"].get(c["clave"])
            if datos is None:
                filas.append(f'<div class="canto"><b>{e(c["dice"])}</b><span class="nada">todavía no</span></div>')
                continue
            tomas = "".join(
                f'<label class="toma">toma {j}<audio controls preload="none" src="{e(v["id"])}/{e(t["archivo"])}"></audio></label>'
                for j, t in enumerate(datos["elegidas"], 1)
            )
            # Las dudosas: rechazadas que casi pasan. Lo que oyó Whisper es texto de un
            # modelo, así que entra escapado como todo lo demás.
            tomas += "".join(
                f'<label class="toma duda">dudosa<audio controls preload="none" src="{e(v["id"])}/{e(t["archivo"])}"></audio>'
                f'<small>Whisper oyó «{e(t["oye"])}»</small></label>'
                for t in datos.get("dudosas", [])
            )
            if not datos["elegidas"] and not datos.get("dudosas"):
                tomas = f'<span class="nada">ninguna de las {len(datos["intentos"])} tomas pasó el control</span>'
            filas.append(f'<div class="canto"><b>{e(c["dice"])}</b>{tomas}</div>')
        ref = (
            f'<div class="ref"><span>Su voz, en la frase larga:</span>'
            f'<audio controls preload="none" src="{e(v["id"])}/referencia.m4a"></audio></div>'
        )
        # Las otras voces que se probaron para este personaje (generar-voces.mjs --candidatas).
        otras = sorted((salida / "_candidatas").glob(f'{v["id"]}-*.m4a'))
        puntaje = {}
        if (salida / "_candidatas" / "puntaje.json").exists():
            puntaje = json.loads((salida / "_candidatas" / "puntaje.json").read_text(encoding="utf-8"))
        if otras:
            ref += (
                '<details class="otras"><summary>Otras voces que se probaron para este personaje</summary>'
                + "".join(
                    f'<label class="toma">{e(c.stem.rsplit("-", 1)[1])}'
                    f'<audio controls preload="none" src="_candidatas/{e(c.name)}"></audio>'
                    f'<small>tono {e(str(puntaje.get(c.stem, {}).get("tono", "?")))} Hz'
                    f'{" · <b>la que se usa</b>" if str(v.get("semilla")) == c.stem.rsplit("-", 1)[1] else ""}</small></label>'
                    for c in otras
                )
                + "<p>Si te gusta más otra, decime el número: se rehacen sus cantos con esa.</p></details>"
            )
        bloques.append(
            f'<section id="{e(v["id"])}"><h2>{numero}. {e(v["nombre"])}</h2>'
            f'<p class="desc">{e(v["es"])}</p>{ref}<div class="cantos">{"".join(filas)}</div></section>'
        )

    pagina = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Voces de los rivales</title>
<style>
  :root {{ --fondo:#14201a; --carta:#1d2c24; --borde:#2f4538; --texto:#efe6d2; --tenue:#a9b3a6; --dorado:#e2b65a; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--fondo); color:var(--texto); font:16px/1.45 system-ui, sans-serif; padding:24px 16px 64px; }}
  main {{ max-width:1100px; margin:0 auto; }}
  h1 {{ margin:0 0 6px; font-size:1.6rem; }}
  .intro {{ color:var(--tenue); max-width:72ch; }} .intro b {{ color:var(--texto); }}
  nav {{ display:flex; flex-wrap:wrap; gap:6px; margin:14px 0 4px; }}
  nav a {{ padding:4px 10px; border-radius:999px; border:1px solid var(--borde); color:var(--texto); text-decoration:none; font-size:.9rem; }}
  nav a.lista {{ border-color:var(--dorado); }} nav a.falta {{ color:var(--tenue); opacity:.6; }}
  section {{ background:var(--carta); border:1px solid var(--borde); border-radius:14px; padding:18px; margin-top:22px; scroll-margin-top:12px; }}
  h2 {{ margin:0; font-size:1.25rem; }} .desc {{ margin:4px 0 12px; color:var(--tenue); }}
  .ref {{ display:grid; gap:6px; padding:12px; border-radius:10px; background:#0f1813; margin-bottom:14px; }}
  .ref span {{ font-size:.9rem; color:var(--dorado); }}
  .cantos {{ display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:12px; }}
  .canto {{ display:grid; gap:4px; padding:10px; border-radius:10px; border:1px solid var(--borde); }}
  .toma {{ display:grid; grid-template-columns:3.6em 1fr; align-items:center; font-size:.85rem; color:var(--tenue); }}
  .nada {{ color:#d98b74; font-size:.9rem; }}
  .duda {{ color:var(--dorado); }} .duda small, .otras small {{ grid-column:2; color:var(--tenue); font-size:.8rem; }}
  .otras {{ margin:-6px 0 14px; padding:8px 12px; border:1px dashed var(--borde); border-radius:10px; }}
  .otras summary {{ cursor:pointer; color:var(--dorado); font-size:.9rem; }} .otras p {{ color:var(--tenue); font-size:.85rem; margin:6px 0 0; }}
  .otras .toma {{ margin-top:6px; }}
  audio {{ width:100%; height:34px; }}
</style>
</head>
<body><main>
<h1>Voces de los rivales</h1>
<p class="intro">Los 14 cantos de cada rival, clonados con Chatterbox de su frase larga. Cada canto trae
<b>hasta dos tomas</b> que pasaron el control (que se entienda, que no sature, sin silencios de más);
la <b>toma 1</b> es la que más se parece a su voz. Una <b>dudosa</b> es una que el control rechazó por
poco (abajo dice qué entendió Whisper): puede ser un error o puede ser acento, y eso lo decide tu oído.
Si una no te gusta, borrala de la carpeta, o decime
"Beto, truco, la 2 no", y al recargar desaparece. Los que están apagados arriba todavía se están haciendo.</p>
<nav>{"".join(indice)}</nav>
{"".join(bloques)}
</main>
<script>
  // Lo que se borró de la carpeta no se muestra.
  for (const a of document.querySelectorAll("audio")) {{
    fetch(a.getAttribute("src"), {{ method: "HEAD" }}).then((r) => {{
      if (!r.ok) (a.closest(".toma") || a.closest(".ref")).remove();
    }}).catch(() => {{}});
  }}
</script>
</body></html>
"""
    (salida / "index.html").write_text(pagina, encoding="utf-8")


if __name__ == "__main__":
    main()
