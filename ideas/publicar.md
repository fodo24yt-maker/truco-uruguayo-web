# Publicar el sitio: plan y pasos

> Cómo poner esto en internet, con qué dominio, y qué hacer antes y después.
> Escrito para seguirlo paso a paso.

## Dónde alojarlo: Cloudflare Pages

Para un sitio estático como éste, la recomendación es **Cloudflare Pages**.

| | Cloudflare Pages | GitHub Pages | Vercel |
|---|---|---|---|
| Precio | Gratis | Gratis | Gratis (con límites) |
| Visitas incluidas | **Sin límite** | ~100 GB/mes | 100 GB/mes |
| Cabeceras HTTP propias | **Sí, con `_headers`** | ❌ No | Sí |
| HTTPS y certificado | Automático | Automático | Automático |
| Dominio propio gratis | Sí | Sí | Sí |

**El motivo real de elegir Cloudflare no es el precio: es que GitHub Pages no
deja poner cabeceras HTTP.** Sin ellas, el sitio se puede meter dentro de un
iframe ajeno (clickjacking) y ninguna `<meta>` lo arregla, porque la directiva
`frame-ancestors` sólo funciona como cabecera de verdad. Nuestro archivo
`public/_headers` resuelve eso, pero **sólo si el hosting lo lee**, y GitHub
Pages lo ignora.

## El dominio

**Al principio, ninguno.** Cloudflare te da `truco-uruguayo.pages.dev` gratis y
para siempre, con HTTPS. Es perfecto para probar y compartir con amigos.

Cuando quieras uno propio:

- **`.com.uy` o `.uy`** — es el dominio uruguayo, lo maneja ANTEL. Es el que más
  sentido tiene para este proyecto, pero se paga (unos 30-40 dólares al año) y
  pide trámite con cédula.
- **`.com` genérico** — entre 10 y 15 dólares al año en Cloudflare Registrar,
  que lo vende **al precio de costo, sin recargo ni renovación inflada**. Si
  comprás un dominio, compralo ahí.
- **Gratis de verdad**: existen `.tk`, `.ml`, `.ga` (Freenom) y subdominios como
  `js.org`. **No los recomiendo**: los gratuitos se caen, se los quedan sin
  aviso, y varios están en listas negras de spam, así que Google los posiciona
  peor. Para un proyecto que vive de que la gente lo encuentre buscando "cómo
  jugar al truco uruguayo", eso es tirarse un tiro en el pie.

**Mi consejo:** arrancá con el `.pages.dev` gratis. Si el proyecto camina y
recibe visitas, ahí comprás un `.uy`, que es el que le va.

## Los pasos, uno por uno

### 1. Antes de publicar (5 minutos)

Sacá tu correo personal de los commits futuros. Si commiteaste con tu correo
real, queda visible para cualquiera en la historia del repositorio, y los bots
de spam rastrean GitHub buscando justamente eso:

```
git config user.email "TU_ID+fodo24yt-maker@users.noreply.github.com"
```

El `TU_ID` lo sacás de github.com/settings/emails, donde dice "Keep my email
address private". En esa misma página activá **"Block command line pushes that
expose my email"**, que te avisa si alguna vez se te escapa.

> Los 5 commits que ya subiste seguirán teniendo el correo viejo. Reescribir la
> historia es posible pero rompe el repositorio para cualquiera que lo haya
> clonado; con un proyecto recién empezado se puede hacer, pero no es urgente:
> el daño (que te llegue spam) ya está hecho y no crece.

### 2. Conectar el repositorio a Cloudflare

1. Entrá a **dash.cloudflare.com** y creá una cuenta (gratis).
2. En el menú, **Workers & Pages → Create → Pages → Connect to Git**.
3. Autorizá GitHub y elegí el repositorio `truco-uruguayo-web`.
4. En la configuración de compilación, poné exactamente esto:
   - Framework preset: **Next.js (Static HTML Export)**
   - Build command: **`npm run build`**
   - Build output directory: **`out`**
5. **Save and Deploy**.

En dos o tres minutos tenés el sitio en `https://algo.pages.dev`.

A partir de ahí, **cada vez que hagas `git push` se publica solo**. No hay que
volver a tocar nada.

### 3. Comprobar que quedó bien

Con el sitio arriba, verificá tres cosas:

- Abrí **securityheaders.com** y pegá tu dirección. Tiene que dar **A o A+**.
  Si da menos, es que el `_headers` no se aplicó.
- Probá en el celular, que es por donde va a entrar la mayoría.
- Entrá a `/jugar`, jugá una mano y recargá: el rival elegido tiene que
  seguir ahí (eso confirma que el progreso guardado funciona).

### 4. Que Google lo encuentre

El objetivo del proyecto es que alguien que busca "cómo jugar al truco
uruguayo" lo encuentre. Para eso falta:

- Un **`sitemap.xml`** y un **`robots.txt`** (Next los genera, hay que
  agregarlos).
- **Datos estructurados** en las lecciones, para que Google las muestre como
  guías.
- Registrar el sitio en **Google Search Console** y pedir la indexación.

Sin esto, el sitio existe pero nadie llega.

## Qué falta antes de mostrarlo en serio

Ordenado por lo que más se nota:

| # | Qué | Por qué importa | Tamaño |
|---|---|---|---|
| 1 | ~~`sitemap.xml` y `robots.txt`~~ | ✅ hecho: 13 URLs indexables | — |
| 2 | ~~Pulir la mesa en celular~~ | ✅ hecho (27/08): la mesa entra entera en pantalla, sin scroll, y las cartas ya no quedan tapadas por la barra | — |
| 3 | Marcar lecciones como leídas | Ya está el `localStorage`; falta el botón y la tilde | Chico |
| 4 | Página de error 404 propia | Hoy es la genérica de Next | Chico |
| 5 | ~~Imagen de vista previa~~ | ✅ hecho | — |
| 6 | Sonido de la mesa | Cambia mucho la sensación de estar jugando | Mediano |
| 7 | ~~Ejercicios en las lecciones~~ | ✅ hecho (27/08): 12 ejercicios jugables, uno o dos por lección, con la explicación de por qué | — |
| 8 | ~~El mapa de la gira~~ | ✅ hecho (27/08): los 19 departamentos, jugables todos | — |
| 9 | ~~Desbloqueo en cadena de la gira~~ | ✅ hecho (28/08): se abre de a uno, derivado del progreso que ya había —sin campo nuevo en el `localStorage`—, con el mapa hecho mapa del tesoro y el modo historia en la mesa | — |
| 10 | Que el bot lea las señas | Para cuando haya 2 contra 2 | Grande |

## Fallas encontradas jugando

Las que aparecen usándolo de verdad, que son las que más valen.

| Fecha | Qué pasó | Estado |
|---|---|---|
| 27/08 | **El bot cantaba truco con la mano ya perdida.** Le tiré el 2 de la muestra —la carta más fuerte del juego, a la que no le gana nada— y cantó truco igual, cuando era imposible que ganara esa baza | ✅ arreglado: el bot ahora mira la carta que hay sobre la mesa antes de cantar. Los rivales de nivel 5 no cometen el error nunca; los de nivel 1 sí, a propósito, porque son principiantes |
| 27/08 | La mesa no entraba en pantalla de celular: había que scrollear para ver las propias cartas | ✅ arreglado |

El sitio ya está publicado en **truquito.smmqo08.workers.dev**. Lo que queda de
esta lista se hace con el sitio ya arriba, porque cada `push` publica solo — no
hace falta volver a tocar Cloudflare para nada de esto.

**El próximo paso acordado es el #2**, la mesa en celular. Se deja anotado acá
para no perderlo, sin tocarlo todavía.

## Sobre la publicidad: decidido que no

Se evaluó poner AdSense y **se descartó**. Los números no daban: en un sitio
chico paga del orden de centavos de dólar por cada mil visitas, y a cambio
había que abrir la política de seguridad para dejar entrar scripts de Google,
poner cookies de rastreo, agregar un cartel de consentimiento obligatorio para
las visitas europeas y reescribir la política de privacidad.

Mucho costo, para el que entra y para el proyecto, por muy poca plata.

En su lugar hay un bloque discreto al pie de la portada y de cada lección que
invita a seguir el proyecto en GitHub. No pide dinero, no pone cookies y no
manda ni un dato a ningún lado: es un enlace y nada más.

**Dentro de la mesa no va nada.** Mientras se juega, se juega.

## Lo que NO hay que hacer todavía

- **No agregues analítica sin pensarlo.** Hoy la política de privacidad dice
  "no recogemos nada" y es cierto. Si querés saber cuánta gente entra, usá algo
  sin cookies (Cloudflare Web Analytics viene incluido y no rastrea personas), y
  actualizá la política **antes** de prenderlo.
- **No compres el dominio todavía.** Esperá a ver si el proyecto camina.
