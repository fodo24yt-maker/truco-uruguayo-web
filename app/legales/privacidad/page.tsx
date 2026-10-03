import type { Metadata } from "next";
import Link from "next/link";

import { PanelPapel } from "@/components/PanelPapel";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos recoge Truco Uruguayo: en la web, ninguno. En la app de Android, los anuncios de Google AdMob usan el identificador de publicidad y datos del aparato. Sin cuentas ni analítica.",
  alternates: { canonical: "/legales/privacidad" },
};

// Se actualiza cada vez que una función nueva toque datos del usuario.
const ULTIMA_ACTUALIZACION = "2 de octubre de 2026";

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
            <strong>Nosotros no recogemos ningún dato tuyo.</strong> No hay
            registro, no hay cuentas, no hay analítica. No sabemos quién entró,
            ni cuántos entraron, ni desde dónde.
          </p>
          <p>
            <strong>En la web no hay publicidad</strong>, ni cookies, ni
            rastreadores: el código de los anuncios ni siquiera está en la web.
          </p>
          <p>
            <strong>En la app de Android sí hay anuncios, de Google AdMob</strong>,
            y AdMob recoge algunos datos del teléfono para poder mostrarlos. Esos
            datos los recoge Google directamente: a nosotros no nos llega
            ninguno. Qué recoge y cómo apagar la publicidad personalizada está
            más abajo, en <em>Publicidad</em>.
          </p>
          <p>
            Lo que el juego guarda —<strong>tu progreso en la gira</strong>,{" "}
            <strong>la cuenta del anotador</strong>,{" "}
            <strong>cómo jugás</strong>, <strong>el volumen</strong>,{" "}
            <strong>lo que desbloqueaste</strong> y{" "}
            <strong>los ejercicios que acertaste</strong>— se guarda{" "}
            <em>en tu propio dispositivo</em> y nunca nos llega. Está explicado
            más abajo.
          </p>
          <p>
            No es una promesa de buena voluntad: es una consecuencia técnica. El
            juego son archivos estáticos y corre entero adentro de tu teléfono o
            de tu navegador. No hay ningún servidor nuestro al que mandarle
            nada.
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
              No vendemos ni compartimos información tuya, porque no la
              tenemos. Lo que recoge AdMob en la app lo recoge Google, bajo su
              propia política.
            </li>
          </ul>

          <h2>Lo que se guarda en tu dispositivo</h2>
          <p>
            <strong>Tu progreso en la gira</strong>: contra qué rivales jugaste,
            a cuáles les ganaste y con qué marcador, más dos preferencias (si
            las ayudas están prendidas y contra quién jugaste la última vez).
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
            últimas partidas. Son <em>números contados</em>, no jugadas
            guardadas: cuántas veces cantaste, cuántas te achicaste, cuántas
            veces cantaste sin tener. Nada de las cartas que te tocaron, porque
            el rival no te mira las cartas nunca: sólo lo que hiciste sobre la
            mesa, que es lo que vería cualquiera sentado ahí.
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
            Eso se guarda en el almacenamiento local de tu navegador
            (<em>localStorage</em>) y{" "}
            <strong>se queda en tu dispositivo</strong>: no viaja a ningún lado
            porque no hay ningún lado adonde viajar —no hay servidor—. Lo podés
            borrar limpiando los datos del sitio desde tu navegador, o
            desinstalando la app.
          </p>
          <p>
            En la app de Android, la copia de seguridad de Android puede
            incluirlo, para que la gira no se pierda al cambiar de teléfono. Es
            progreso de un juego, unos números y cuántas veces mentiste en el
            envido: no hay un dato personal adentro.
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
              <strong>Un anuncio de pantalla completa</strong> justo antes de
              empezar una partida, como mucho uno cada tres minutos. Nunca en
              medio de una partida y nunca en Aprender.
            </li>
            <li>
              <strong>Un video que vos elegís mirar</strong> para desbloquear el
              anotador o la Gira nacional, una sola vez.
            </li>
          </ul>
          <p>
            Para mostrarlos, <strong>AdMob recoge</strong>: el identificador de
            publicidad del teléfono, la dirección IP (de la que se deduce una
            ubicación aproximada), datos del aparato (modelo, versión de
            Android, idioma) y cómo interactuás con los anuncios (si se
            mostraron, si los tocaste). Los usa para mostrar anuncios,
            medirlos y prevenir fraude. Los anuncios los pide el sistema de
            Android, no la parte del juego: el juego no ve ninguno de esos
            datos.
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
              className="text-bordo underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              cómo usa Google la información de las apps que usan sus servicios
            </a>{" "}
            y{" "}
            <a
              href="https://policies.google.com/privacy"
              className="text-bordo underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              la política de privacidad de Google
            </a>
            .
          </p>

          <h2>Enlaces a otros sitios</h2>
          <p>
            Hay enlaces al repositorio del proyecto en GitHub y a las políticas
            de Google. Cuando hacés clic, entrás a un sitio de otra empresa,
            con sus propias reglas de privacidad. Este sitio no controla eso.
          </p>

          <h2>Menores de edad</h2>
          <p>
            El truco no es un juego de azar por dinero y este sitio no tiene
            apuestas, ni fichas que se compren, ni nada que se le parezca.
            Nosotros no recogemos datos de nadie, tampoco de menores.
          </p>
          <p>
            La app <strong>no está dirigida a menores de 13 años</strong>. Los
            anuncios se piden con un tope de contenido "apto con guía de los
            padres", para que no aparezca nada para adultos.
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
            tus datos, con la fecha de arriba cambiada. El historial completo
            de cambios está público en el repositorio del proyecto.
          </p>

          <h2>Contacto</h2>
          <p>
            Para cualquier consulta sobre privacidad, abrí un issue en{" "}
            <a
              href="https://github.com/fodo24yt-maker/truco-uruguayo-web/issues"
              className="text-bordo underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              el repositorio del proyecto
            </a>
            .
          </p>
        </article>
      </PanelPapel>
    </div>
  );
}
