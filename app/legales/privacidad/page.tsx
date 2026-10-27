import type { Metadata } from "next";
import Link from "next/link";

import { PanelPapel } from "@/components/PanelPapel";
import { CORREO_CONTACTO, DESARROLLADOR, ID_APP_ANDROID, NOMBRE_SITIO } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos recoge Truco Uruguayo: en la web, ninguno. En la app de Android, los anuncios de Google AdMob recogen el identificador de publicidad, la ubicación aproximada, la actividad con los anuncios y diagnósticos, y se los envían a Google. Sin cuentas ni analítica.",
  alternates: { canonical: "/legales/privacidad" },
};

// Se actualiza cada vez que una función nueva toque datos del usuario.
const ULTIMA_ACTUALIZACION = "27 de octubre de 2026";

const enlace = "text-bordo underline underline-offset-2";

/**
 * La política de la app de Android Y de la web: es la URL que va en la ficha
 * de Play, y la misma página viaja adentro de la app (Ajustes → Privacidad).
 *
 * Lo que dice de AdMob tiene que coincidir con el formulario "Seguridad de los
 * datos" de Play Console, categoría por categoría: si uno cambia, cambia el
 * otro. Las respuestas del formulario están en `ideas/publicar-play.md`.
 */
export default function Privacidad() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-5 font-[family-name:var(--font-ui)] text-sm">
        <Link href="/" className="text-crema/60 hover:text-crema">
          ← Inicio
        </Link>
      </div>

      <PanelPapel>
        <article className="prosa mx-auto max-w-[62ch]">
          <h1 className="mb-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-tinta sm:text-4xl">
            Política de privacidad
          </h1>
          <p className="mb-8 border-b border-tinta/15 pb-5 text-base text-tinta/70">
            Última actualización: {ULTIMA_ACTUALIZACION}
          </p>

          <h2>La versión corta</h2>
          <p>
            <strong>A nosotros no nos llega ningún dato tuyo.</strong> No hay
            registro, no hay cuentas, no hay analítica, y no hay ningún servidor
            nuestro al que el juego le mande nada.
          </p>
          <p>
            <strong>En la web no hay publicidad</strong>, ni cookies, ni
            rastreadores: el código de los anuncios ni siquiera está en la web.
          </p>
          <p>
            <strong>En la app de Android sí hay anuncios, de Google AdMob</strong>,
            y para mostrarlos <strong>la app recoge algunos datos del teléfono
            y se los envía a Google</strong>: el identificador de publicidad, la
            ubicación aproximada, cómo interactuás con los anuncios y
            diagnósticos. Lo hace el kit de anuncios de Google que va adentro de
            la app, no la parte del juego, y nada de eso pasa por nosotros. El
            detalle, y cómo apagar la publicidad personalizada, está más abajo,
            en <em>Publicidad</em>.
          </p>
          <p>
            Lo que el juego guarda —<strong>tu progreso en la gira</strong>,{" "}
            <strong>la cuenta del anotador</strong>,{" "}
            <strong>cómo jugás</strong>, <strong>el volumen</strong>,{" "}
            <strong>lo que desbloqueaste</strong> y{" "}
            <strong>los ejercicios que acertaste</strong>— se guarda{" "}
            <em>en tu propio dispositivo</em> y nunca nos llega.
          </p>

          <h2>Quién es responsable</h2>
          <p>
            Esta política es de <strong>{NOMBRE_SITIO}</strong>: la app de
            Android (<span className="whitespace-nowrap">{ID_APP_ANDROID}</span>) y este sitio. Es un proyecto
            personal{" "}
            {DESARROLLADOR ? (
              <>
                de <strong>{DESARROLLADOR}</strong>, desarrollador independiente
                de Uruguay, que es el responsable de esta política y el que
                figura como desarrollador en Google Play.
              </>
            ) : (
              <>de un desarrollador independiente de Uruguay, que es el responsable de esta política.</>
            )}{" "}
            Cómo escribirle está al final, en <em>Contacto</em>.
          </p>

          <h2>Qué NO hacemos</h2>
          <ul>
            <li>No te pedimos nombre, correo, ni ningún dato personal.</li>
            <li>
              En la web no usamos cookies, ni propias ni de terceros. (En la app
              no hay cookies: los anuncios usan el identificador de publicidad
              del teléfono, ver más abajo.)
            </li>
            <li>
              No usamos Google Analytics ni ninguna otra herramienta de
              medición.
            </li>
            <li>
              No cargamos tipografías desde Google: están alojadas en este
              mismo sitio, así que tu navegador no le avisa a nadie que
              entraste.
            </li>
            <li>
              No vendemos información tuya, porque no la tenemos. Lo único que
              sale de tu teléfono es lo que recogen los anuncios de AdMob en la
              app, y va a Google, bajo su propia política.
            </li>
          </ul>

          <h2>Lo que se guarda en tu dispositivo</h2>
          <p>
            <strong>Tu progreso</strong>: contra qué rivales jugaste, a cuáles
            les ganaste y con qué marcador, qué lecciones marcaste como leídas,
            y dos preferencias (si las ayudas están prendidas y contra quién
            jugaste la última vez).
          </p>
          <p>
            <strong>La cuenta del anotador</strong>: dos números, los puntos de
            cada lado de la tablita. Se guarda para que no se te pierda la
            cuenta si se apaga la pantalla en medio de una partida, y se borra
            sola cuando apretás empezar de nuevo.
          </p>
          <p>
            <strong>Cómo jugás</strong>: los rivales de las últimas estrellas te
            van armando una ficha para jugarte mejor, y se acuerdan de las tres
            últimas partidas: contra quién fue, cuándo, si ganaste, y{" "}
            <em>números contados</em>, no jugadas guardadas: cuántas veces
            cantaste, cuántas te achicaste, cuántas veces cantaste sin tener.
            Nada de las cartas que te tocaron, porque el rival no te mira las
            cartas nunca: sólo lo que hiciste sobre la mesa, que es lo que
            vería cualquiera sentado ahí.
          </p>
          <p>
            <strong>El volumen</strong>: si está silenciado y dónde dejaste las
            cuatro barras de sonido.
          </p>
          <p>
            <strong>Lo que desbloqueaste</strong>, en la app: si ya abriste el
            anotador o la Gira nacional. Si borrás los datos de la app, se
            pierde, y hay que volver a desbloquearlo.
          </p>
          <p>
            <strong>Los ejercicios de Aprender que acertaste</strong>: cuáles,
            nada más. Sirve para abrir la Gira nacional cuando los acertás
            todos.
          </p>
          <p>
            Eso se guarda en el almacenamiento local de tu navegador o de la
            app (<em>localStorage</em>) y{" "}
            <strong>se queda en tu dispositivo</strong>: no viaja a ningún lado
            porque no hay ningún lado adonde viajar —no hay servidor—.
          </p>
          <p>
            En la app de Android, la copia de seguridad de Android puede
            incluirlo, para que la gira no se pierda al cambiar de teléfono. Esa
            copia la hace Google en tu cuenta, no nosotros. Es progreso de un
            juego, unos números y cuántas veces mentiste en el envido: no hay un
            dato personal adentro.
          </p>

          <h2>Publicidad</h2>
          <p>
            <strong>En la web no hay publicidad.</strong> No se carga ningún
            script de terceros, no se pone ninguna cookie de rastreo y no se
            manda un solo dato a una red de anuncios. Se puede comprobar: abrí
            las herramientas del navegador y mirá la pestaña de red mientras
            jugás.
          </p>
          <p>
            <strong>En la app de Android hay anuncios de Google AdMob</strong>{" "}
            (Google LLC; en Europa, Google Ireland Limited). Son de dos tipos, y
            no hay banners:
          </p>
          <ul>
            <li>
              <strong>Un anuncio de pantalla completa</strong> al terminar una
              partida, cuando dejás el cartel del resultado y antes de lo que
              sigue, como mucho uno cada tres minutos. Nunca al empezar a jugar,
              nunca en medio de una partida y nunca en Aprender.
            </li>
            <li>
              <strong>Un video que vos elegís mirar</strong> para desbloquear el
              anotador o la Gira nacional, una sola vez.
            </li>
          </ul>
          <p>
            Para mostrarlos, el kit de anuncios de Google que va adentro de la
            app (el SDK de Google Mobile Ads) <strong>recoge estos datos y se
            los envía a Google</strong>:
          </p>
          <ul>
            <li>
              <strong>Ubicación aproximada</strong>, deducida de la dirección IP
              del teléfono. No la ubicación exacta: la app no pide permiso de
              ubicación.
            </li>
            <li>
              <strong>Identificadores del dispositivo</strong>: el identificador
              de publicidad de Android y el identificador del conjunto de apps
              (<em>App set ID</em>).
            </li>
            <li>
              <strong>Actividad en la app</strong>: cómo interactuás con los
              anuncios, por ejemplo si un anuncio se mostró o lo tocaste.
            </li>
            <li>
              <strong>Información y rendimiento de la app</strong>: registros de
              fallas y diagnósticos del kit de anuncios (por ejemplo, cuánto
              tardó en cargar un anuncio), y datos del aparato como el modelo,
              la versión de Android y el idioma.
            </li>
          </ul>
          <p>
            Google los usa para <strong>mostrar los anuncios</strong> (y, si lo
            permitiste, elegirlos según tus intereses),{" "}
            <strong>medirlos</strong> y <strong>prevenir el fraude y el
            abuso</strong>. La parte del juego no ve ninguno de esos datos, y a
            nosotros no nos llega ninguno.
          </p>
          <p>
            Los anuncios se piden con un tope de contenido &ldquo;apto con guía
            de los padres&rdquo;, para que no aparezca nada para adultos.
          </p>
          <p>
            <strong>Si estás en Europa, el Reino Unido o Suiza</strong>, antes
            de pedir el primer anuncio la app te muestra el formulario de
            consentimiento de Google, y después podés cambiar lo que elegiste
            desde Ajustes → <em>Privacidad de los anuncios</em>.
          </p>
          <p>
            <strong>Para apagar la publicidad personalizada</strong> en
            cualquier lado: en Android, Ajustes → Google → Anuncios →{" "}
            <em>Borrar ID de publicidad</em>. Los anuncios siguen, pero dejan
            de estar basados en vos.
          </p>
          <p>
            Cómo usa Google estos datos:{" "}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              className={enlace}
              target="_blank"
              rel="noopener noreferrer"
            >
              cómo usa Google la información de las apps que usan sus servicios
            </a>{" "}
            y{" "}
            <a
              href="https://policies.google.com/privacy"
              className={enlace}
              target="_blank"
              rel="noopener noreferrer"
            >
              la política de privacidad de Google
            </a>
            .
          </p>

          <h2>La web</h2>
          <p>
            El sitio lo sirve <strong>Cloudflare</strong>. Como cualquier
            servidor web, recibe la dirección IP de quien entra para poder
            mandarle las páginas, puede guardar registros técnicos por un
            tiempo corto, y le muestra al dueño del sitio cuántos pedidos hubo
            en total, sin decir quién es quién. Nosotros no usamos nada de eso
            para identificar a nadie.
          </p>
          <p>
            La app de Android no pasa por Cloudflare: el juego viene entero
            adentro de la app, y lo único que sale a internet son los anuncios.
          </p>

          <h2>Seguridad</h2>
          <p>
            Como no recibimos datos personales, no hay ninguna base de datos
            nuestra que se pueda filtrar. Lo que guarda el juego queda en el
            almacenamiento privado de la app, al que otras apps no pueden
            entrar. Lo que el kit de anuncios le manda a Google viaja{" "}
            <strong>cifrado</strong> (HTTPS), y la app no permite conexiones
            sin cifrar.
          </p>

          <h2>Cuánto se guarda y cómo se borra</h2>
          <p>
            <strong>Lo que guarda el juego</strong> se queda en tu dispositivo
            hasta que lo borres: en la app, desde Ajustes de Android → Apps →
            Truco Uruguayo → Almacenamiento → <em>Borrar datos</em>, o
            desinstalándola; en la
            web, limpiando los datos del sitio en tu navegador.
          </p>
          <p>
            <strong>Lo que recoge AdMob</strong> lo guarda Google el tiempo que
            dice su{" "}
            <a
              href="https://policies.google.com/technologies/retention"
              className={enlace}
              target="_blank"
              rel="noopener noreferrer"
            >
              política de conservación de datos
            </a>
            . Desde el teléfono podés borrar el identificador de publicidad (ver{" "}
            <em>Publicidad</em>, arriba), y a partir de ahí lo que se recoja ya
            no queda atado al anterior.
          </p>

          <h2>Enlaces a otros sitios</h2>
          <p>
            Hay enlaces al repositorio del proyecto en GitHub y a las políticas
            de Google. Cuando hacés clic, entrás a un sitio de otra empresa,
            con sus propias reglas de privacidad. Este sitio no controla eso.
          </p>

          <h2>Menores de edad</h2>
          <p>
            El truco no es un juego de azar por dinero y la app no tiene
            apuestas, ni fichas que se compren, ni nada que se le parezca: los
            &ldquo;tantos&rdquo; que se apuestan son los puntos del juego y no
            valen nada fuera de él. Nosotros no recogemos datos de nadie,
            tampoco de menores.
          </p>
          <p>
            La app <strong>no está dirigida a menores de 13 años</strong>, y
            los anuncios se piden con el tope de contenido de arriba.
          </p>

          <h2>Tus derechos</h2>
          <p>
            Si vivís en un país con leyes de protección de datos (la ley 18.331
            en Uruguay, el RGPD en Europa), tenés derecho a acceder, corregir y
            borrar tus datos personales. De nuestro lado el ejercicio es
            simple: <strong>no tenemos ningún dato tuyo que acceder, corregir
            ni borrar</strong>.
          </p>
          <p>
            Los datos que recoge AdMob en la app los maneja Google. Podés borrar
            el identificador de publicidad del teléfono (ver{" "}
            <em>Publicidad</em>, arriba) y ejercer tus derechos ante Google
            desde su política de privacidad.
          </p>

          <h2>Cambios</h2>
          <p>
            Esta política se actualiza cada vez que se agregue algo que afecte
            tus datos, con la fecha de arriba cambiada, y siempre antes de que
            llegue a la app. El historial completo de cambios está público en
            el repositorio del proyecto.
          </p>

          <h2>Contacto</h2>
          {CORREO_CONTACTO ? (
            <p>
              Para cualquier consulta sobre privacidad, escribí a{" "}
              <a href={`mailto:${CORREO_CONTACTO}`} className={enlace}>
                {CORREO_CONTACTO}
              </a>
              . También podés abrir un issue en{" "}
              <a
                href="https://github.com/fodo24yt-maker/truco-uruguayo-web/issues"
                className={enlace}
                target="_blank"
                rel="noopener noreferrer"
              >
                el repositorio del proyecto
              </a>
              , pero ojo: lo que escribas ahí lo ve cualquiera.
            </p>
          ) : (
            <p>
              Para cualquier consulta sobre privacidad, abrí un issue en{" "}
              <a
                href="https://github.com/fodo24yt-maker/truco-uruguayo-web/issues"
                className={enlace}
                target="_blank"
                rel="noopener noreferrer"
              >
                el repositorio del proyecto
              </a>
              .
            </p>
          )}
        </article>
      </PanelPapel>
    </div>
  );
}
