# El juego que queremos hacer

> Documento de concepto. Qué experiencia queremos, quiénes son los rivales y
> cómo se cruzan la parte de aprender y la de jugar.
> La estética está en [`estetica.md`](estetica.md); las reglas, en
> [`../reglas.txt`](../reglas.txt).

## La idea en una frase

**Un truco uruguayo rápido y con onda —tipo Truco Blitz— ambientado en un
boliche, donde vas recorriendo el país ganándole a rivales cada vez más duros,
y que de paso te enseña a jugar.**

No es un simulador serio ni una app de reglas. Es un juego que se disfruta, y
la parte pedagógica va escondida adentro: aprendés porque jugás, no porque
leíste un manual.

## A quién le hablamos

| Perfil | Qué necesita | Cómo se lo damos |
|---|---|---|
| **No sabe nada de truco** | Que no lo abrumen | Ruta guiada: primero sólo cartas, después envido, después flor |
| **Sabe truco argentino** | Entender muestra y piezas | Un módulo específico: "lo que cambia acá" |
| **Sabe jugar, quiere practicar** | Rivales que no sean tontos | Los bots de la mitad para arriba de la ruta |
| **Sabe jugar, quiere afilar el tanto** | Repetición rápida | Modo situaciones: 20 manos en 5 minutos |

## Los dos pilares, y por qué van juntos

**APRENDER** y **JUGAR** no son dos secciones separadas: son la misma cosa a
distinta velocidad.

- Aprendés una regla → la practicás en una situación armada → la usás en una
  partida de verdad contra un bot.
- Perdés una mano por no ver una pieza → el juego te ofrece el mini-repaso de
  piezas ahí mismo, sin sacarte de la partida.

**Las ayudas se apagan solas.** Al principio te mostramos la fuerza de cada
carta, tu tanto ya calculado y qué podés cantar. A medida que ganás, esas
ayudas se van apagando (y siempre las podés volver a prender). El objetivo es
que a las dos horas estés jugando sin ninguna.

## El mundo: el boliche y la ruta

Arrancás en la mesa del fondo de un boliche de Montevideo, jugando por nada
contra el mozo. De ahí salís a la ruta: cada rival que ganás te abre el
siguiente pueblo. Es la excusa —simple, sin cinemáticas ni novela— para que
haya progresión y para que cada bot tenga cara.

```
Ciudad Vieja  ->  Canelones  ->  Colonia  ->  Rocha  ->  Tacuarembó
     ->  Salto  ->  Melo  ->  Rivera  ->  EL CAMPEONATO
```

## Los rivales

Cada bot es un personaje con **una manera de jugar reconocible**, y cada uno te
enseña algo. No son "el bot fácil, el medio y el difícil": son gente distinta,
y la gracia es aprender a leerlos.

> Son personajes de ficción. Nadie está inspirado en personas reales.

| # | Rival | De dónde | Nivel | Cómo juega | Qué te enseña |
|---|---|---|---|---|---|
| 1 | **El Chueco** | Ciudad Vieja | ★☆☆☆☆ | El mozo. Nunca miente: si canta, tiene. Juega lento y te explica | La jerarquía de las cartas y a mirar la muestra |
| 2 | **La Tota** | Canelones | ★☆☆☆☆ | Canta envido en todas las manos, truco casi nunca | A contar el tanto rápido y a no querer todo |
| 3 | **Machado** | Colonia | ★★☆☆☆ | De memoria: siempre juega igual, guarda la mata para el final | A leer patrones y a no guardar la carta alta para la tercera |
| 4 | **Bruno** | Rocha | ★★☆☆☆ | Mentiroso. Canta truco con un cuatro y te lo hace creer | A no creerle a todo el mundo, y a querer |
| 5 | **Doña Elsa** | Tacuarembó | ★★★☆☆ | Paciente. Aguanta, te deja ganar la primera y te liquida en la tercera | A administrar las tres bazas |
| 6 | **El Rusito** | Salto | ★★★☆☆ | Fanático de las piezas y la flor. Cuenta todo, no se le escapa una | Piezas, flor y contraflor |
| 7 | **Cacho** | Melo | ★★★★☆ | Mira el marcador antes que las cartas. Te canta la falta en el peor momento | A jugar el marcador, no la mano |
| 8 | **El Profesor** | Rivera | ★★★★☆ | Se acuerda de cómo jugaste las manos anteriores y se adapta | A variar, a no ser previsible |
| 9 | **El Campeón** | El campeonato | ★★★★★ | Todo lo anterior junto, y bien | Nada: acá se ve si aprendiste |

**Para la implementación**, esos nueve caen en tres escalones técnicos:

- **Rivales 1–3 → bot de reglas.** Heurísticas simples y explícitas, casi sin
  mentira. Sirve para tener el juego andando de punta a punta.
- **Rivales 4–6 → bot heurístico.** Evaluación de la mano, probabilidad de
  ganar cada baza, mentira controlada, memoria dentro de la mano.
- **Rivales 7–9 → bot entrenado.** El modelo de IA open source. Cada uno se
  arma limitando o soltando lo que el modelo puede hacer.

Ventaja de esta división: **la ruta entera es jugable con el bot de reglas**
desde el día uno, y los personajes se van "actualizando" a medida que el bot
mejora, sin rehacer nada.

## Modos

| Modo | Qué es | Cuándo lo hacemos |
|---|---|---|
| **Aprender** | Lecciones cortas con ejemplos interactivos | Etapa 1 |
| **Partida rápida** | Mano a mano contra el rival que elijas | Etapa 1 (maqueta) |
| **La ruta** | La progresión de 9 rivales, con lo que se desbloquea | Etapa 3 |
| **Situaciones** | "Esta es tu mano, ésta la muestra: ¿qué hacés?" | Etapa 3 |
| **Práctica de tanto** | Contrarreloj: contá el envido de esta mano | Etapa 3 |

## Decisiones de producto

- **Gratis y sin cuenta.** No pedimos registro ni mail. El progreso se guarda
  en el navegador. Sin cuentas no hay datos personales que cuidar, y el que
  entra juega en cinco segundos.
- **Mobile-first.** La gente va a entrar del celular. La mesa tiene que
  funcionar en una pantalla chica y con una mano.
- **Sin plata de por medio.** No hay apuestas, ni fichas que se compren, ni
  nada que se parezca a juego por dinero.
- **En español rioplatense.** Vos, no tú. Y el vocabulario del truco de acá.
- **Rápido.** Una mano tiene que durar lo que dura en la mesa. Las animaciones
  se tienen que poder saltear.

## Lo que NO es

Sirve tanto o más que la lista de lo que sí:

- ❌ No es multijugador online (por ahora). Sólo contra bots.
- ❌ No es 2v2 ni 3v3 al principio. Mano a mano primero, bien hecho.
- ❌ No tiene cuentas, ranking global ni chat.
- ❌ No es un simulador de reglas configurables. Un ruleset, el uruguayo.

## Por etapas

1. **Documentación** — reglas, concepto, estética. ✅
2. **Prototipo de frontend** — landing, sección Aprender y la mesa mano a mano
   maquetada. Sin lógica todavía.
3. **Motor del juego** — las reglas en código, con tests. Acá empiezan a andar
   los botones.
4. **Bot** — primero de reglas, después heurístico, después entrenado.
5. **La ruta y las situaciones** — la progresión y la práctica.

## Referencias visuales

Van en [`imagenes/`](imagenes/). Cuando haya referencias las embebemos acá y en
`estetica.md` con una línea de por qué cada una está: qué nos sirve de esa
imagen y qué no.
