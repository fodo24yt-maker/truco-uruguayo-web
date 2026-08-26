# ¿Qué backend necesita esto?

> Análisis previo a construir nada. Conclusión corta: **para el bot, ninguno**,
> y conviene que siga siendo así el mayor tiempo posible.

## El dato que ordena la discusión

El motor que ya está hecho simula **6.472 partidas completas por segundo** en
un solo núcleo de esta máquina. Son 23 millones de partidas por hora sin usar
GPU, sin alquilar nada y sin salir de tu computadora.

Entrenar un bot de truco no es un problema de infraestructura. Es un problema de
elegir bien el algoritmo.

## La confusión que conviene sacarse de encima

"Usar un modelo de IA open source y entrenarlo para jugar" suele entenderse como
tomar un LLM (Llama, Mistral, Qwen) y enseñarle truco. **Para este problema es
la herramienta equivocada**, por tres razones:

1. Un LLM razona con texto. El truco es un juego de decisiones con información
   oculta, y hay algoritmos hechos para exactamente eso que funcionan
   muchísimo mejor.
2. Un LLM de 7.000 millones de parámetros no entra en un navegador. Te obliga a
   tener un servidor con GPU: entre 50 y 300 dólares por mes.
3. Jugaría peor. Los bots que ganan al póker no son LLMs.

Lo que sí sirve: **CFR** (*Counterfactual Regret Minimization*), que es el
algoritmo estándar para juegos de información imperfecta —es con lo que se
resolvió el póker heads-up—, o aprendizaje por refuerzo con self-play. Ambos
producen algo chico: una tabla de decisiones o una red neuronal de unos pocos
cientos de KB.

Herramientas open source que sirven: **OpenSpiel** (de DeepMind, ya trae CFR
implementado), **RLCard** (pensado justo para juegos de cartas) y PyTorch si
hace falta red propia.

## El plan que no necesita servidor

```
1. Entrenar en tu máquina           →  self-play contra el motor que ya existe
2. Exportar la política             →  un archivo de pocos cientos de KB
3. Publicarlo como archivo estático →  el navegador lo descarga una vez
4. El bot piensa en el navegador    →  cero latencia, cero costo
```

Lo que se gana con esto: el sitio sigue costando **cero pesos**, sigue sin
recoger datos, sigue publicable en GitHub Pages, y el bot responde al instante
aunque el jugador esté con mala señal.

Lo que hace falta construir:

| Pieza | Qué es | Dónde vive |
|---|---|---|
| Arnés de entrenamiento | Corre millones de partidas y guarda lo aprendido | Tu máquina, no se publica |
| Representación del estado | Traducir una mano a números que el algoritmo entienda | Se comparte con el motor |
| Política exportada | El resultado del entrenamiento | Archivo estático del sitio |
| Intérprete en el cliente | Lee la política y elige la jugada | TypeScript, junto al bot actual |

El bot heurístico de hoy no se tira: pasa a ser el rival fácil de la ruta, y
además es la vara contra la que se mide si el bot entrenado mejoró de verdad.

## Qué SÍ pide un servidor, y cuándo

Tres cosas, ninguna en el MVP:

**1. Jugar contra otras personas.** Necesita un servidor autoritativo con
WebSockets: el estado de la partida vive en el servidor y los navegadores sólo
muestran lo que les toca ver. Sin eso, cualquiera lee las cartas del rival en
la memoria de su navegador.

**2. Guardar el progreso entre dispositivos.** Empezar la ruta en el celular y
seguirla en la computadora. Necesita cuentas y base de datos. Mientras el
progreso viva en `localStorage`, no hace falta nada.

**3. Ranking global.** Base de datos, y con eso llegan los tramposos: cualquier
puntaje que venga del cliente hay que asumirlo mentiroso.

Fijate el patrón: **las tres traen datos personales**, que es justo lo que hoy
no tenemos y lo que hace que la política de privacidad quepa en una pantalla.
Cada una es una decisión de producto antes que técnica.

## Si igual hay backend, lo mínimo innegociable

- **Servidor autoritativo.** Nunca confiar en lo que dice el navegador: ni el
  puntaje, ni las cartas, ni de quién es el turno. El cliente pide, el servidor
  decide.
- **Límite de peticiones por IP.** Sin esto, una sola persona con un script te
  tumba el servidor o te agota la cuota gratuita en una tarde.
- **Sin datos personales.** Si se agregan cuentas, que sea con un identificador
  anónimo o con OAuth, sin guardar correos si se puede evitar.
- **Secretos sólo en variables de entorno.** Nunca en el repositorio, que es
  público. Ya está el `.gitignore` cubriendo `.env`.
- **CORS cerrado** al dominio del sitio, y nada más.
- **Registros sin IPs.** Guardar la IP de quien juega al truco no sirve para
  nada y sí crea una obligación legal.
- **Validar todo lo que entra**, aunque venga de nuestro propio frontend.

## Lo que yo haría, en este orden

1. **Guardar el progreso en `localStorage`.** Sin servidor. Resuelve el 90% de
   lo que la gente espera de "que se guarde".
2. **Entrenar el bot y correrlo en el navegador.** Es el objetivo original del
   proyecto y no necesita infraestructura.
3. **La ruta por el país y las situaciones.** Todo estático.
4. **Recién ahí**, si el proyecto tiene gente usándolo, evaluar multijugador.

Poner un backend antes del punto 4 es pagar todos los meses por algo que no
resuelve ningún problema que tengamos hoy.
