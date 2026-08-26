# Truco Uruguayo — aprender y practicar, gratis

Una web para **aprender a jugar al truco uruguayo desde cero** y después
**practicar contra bots**, sin pagar nada y sin instalar nada.

> ⚠️ **Estado: en desarrollo temprano.** Por ahora el repositorio tiene la
> documentación del proyecto (reglas, concepto y estética). Todavía no hay una
> web que se pueda visitar.

## Por qué este proyecto

Si querés aprender truco uruguayo hoy, te chocás con dos problemas:

1. **Casi todo lo que hay en internet es truco argentino.** Las guías, los
   videos, los tutoriales: casi todos se saltean la muestra y las piezas, que
   son justamente el corazón del truco uruguayo. Aprendés otro juego.
2. **Lo bueno se paga.** Las pocas apps que enseñan bien el truco uruguayo son
   pagas o te dejan probar un rato y después te cobran.

Y sobre todo: falta un lugar donde **aprender y practicar sean la misma cosa**.
Leer las reglas no te enseña a jugar al truco; jugar sin saber contar el tanto
tampoco. Hace falta poder leer cómo se cuenta una flor, y a los treinta
segundos estar contando una flor de verdad contra alguien.

Eso es lo que quiere ser esto, y **es gratis**.

## Qué va a tener

**Aprender**
- Las reglas explicadas desde cero, en criollo, sin dar por sabido nada.
- La muestra y las piezas explicadas como lo que son: lo que hace único al
  truco uruguayo.
- Práctica de situaciones: te toca esta mano y esta muestra, ¿qué tirás?
- Ayudas que se van apagando: primero te mostramos la fuerza de cada carta y
  tu tanto calculado; después te los sacamos.

**Jugar**
- Mano a mano contra bots con personalidad propia, de distintas partes del
  país: el que canta todo de mentira, el que sólo canta con cartas, el que te
  lee las señas.
- Ambientado en un boliche: mesa de madera, fieltro gastado y luz de lámpara.
- El bot se va a construir sobre un modelo de IA open source, entrenado para
  jugar (esa es la parte difícil y viene más adelante).

## Cómo está organizado el repo

```
reglas.txt            Las reglas completas del truco uruguayo. Es la fuente de
                      verdad del proyecto: de acá salen los textos de la
                      sección Aprender y la lógica del motor del juego.
ideas/
  concepto.md         Qué juego queremos hacer: modos, bots, progresión.
  estetica.md         Cómo se tiene que ver: paleta, tipografías, ambiente.
  imagenes/           Referencias visuales.
```

## Las reglas

[`reglas.txt`](reglas.txt) es un documento completo y verificado: jerarquía de
las 40 cartas, la muestra y las piezas, cómo se cuentan el envido y la flor con
ejemplos, la tabla de puntos de cada canto, las pardas, echar los perros y las
señas.

Donde las fuentes consultadas se contradecían, el apéndice A deja asentado qué
versión toma el proyecto y por qué, más las preguntas que quedan abiertas para
confirmar con jugadores uruguayos.

## Stack previsto

- **Frontend:** Next.js + TypeScript + Tailwind, exportado como sitio estático.
- **Motor del juego:** TypeScript puro, sin dependencias, con tests.
- **Bot:** modelo open source detrás de una API aparte.

## Aportar

Si jugás al truco uruguayo y ves algo mal en `reglas.txt` —sobre todo en las
preguntas abiertas del apéndice A—, abrí un issue. Que las reglas estén bien es
lo más importante del proyecto: todo lo demás se construye arriba de eso.
