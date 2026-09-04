import type { Metadata } from "next";
import Link from "next/link";

import { PanelPapel } from "@/components/PanelPapel";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos recoge Truco Uruguayo: ninguno que salga de tu dispositivo. Sin cuentas, sin cookies, sin analítica y sin rastreadores.",
  alternates: { canonical: "/legales/privacidad" },
};

// Se actualiza cada vez que una función nueva toque datos del usuario.
const ULTIMA_ACTUALIZACION = "4 de septiembre de 2026";

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
            <strong>No recogemos ningún dato tuyo.</strong> No hay registro, no
            hay cuentas, no hay cookies, no hay analítica y no hay rastreadores.
            No sabemos quién entró, ni cuántos entraron, ni desde dónde.
          </p>
          <p>
            Lo único que se guarda es <strong>tu progreso en la gira</strong>, y
            se guarda <em>en tu propio dispositivo</em>: nunca nos llega. Está
            explicado más abajo.
          </p>
          <p>
            No es una promesa de buena voluntad: es una consecuencia técnica. La
            app son archivos estáticos y el juego corre entero adentro de tu
            teléfono o de tu navegador. No hay ningún servidor nuestro al que
            mandarle nada.
          </p>

          <h2>Qué NO hacemos</h2>
          <ul>
            <li>No te pedimos nombre, correo, ni ningún dato personal.</li>
            <li>No usamos cookies, ni propias ni de terceros.</li>
            <li>
              No usamos Google Analytics ni ninguna otra herramienta de
              medición.
            </li>
            <li>
              No cargamos tipografías desde Google: están alojadas en este
              mismo sitio, así que tu navegador no le avisa a nadie que
              entraste.
            </li>
            <li>No vendemos ni compartimos información, porque no tenemos.</li>
          </ul>

          <h2>Lo que se guarda en tu dispositivo</h2>
          <p>
            <strong>Tu progreso en la gira</strong>: contra qué rivales jugaste,
            a cuáles les ganaste y con qué marcador, más dos preferencias (si
            las ayudas están prendidas y contra quién jugaste la última vez).
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
            progreso de un juego: no hay un dato personal adentro.
          </p>

          <h2>Publicidad</h2>
          <p>
            <strong>Hoy no hay publicidad.</strong> No se carga ningún script de
            terceros, no se pone ninguna cookie de rastreo y no se manda un solo
            dato a una red de anuncios. Se puede comprobar: abrí las
            herramientas del navegador y mirá la pestaña de red mientras jugás.
          </p>
          <p>
            <strong>Y avisamos antes, que es lo que esta página prometió.</strong>{" "}
            La idea es que la app lleve un banner de anuncios abajo, y por eso
            vas a ver un rectángulo vacío ahí: es el lugar reservado, sin nada
            adentro todavía. Se reservó desde ahora para que el día que se
            encienda no haya que rehacer la pantalla.
          </p>
          <p>
            Cuando ese banner se encienda de verdad,{" "}
            <strong>esta página se actualiza primero</strong> y va a decir con
            nombre y apellido qué red de anuncios es, qué recoge y cómo
            desactivar la publicidad personalizada. Nada de eso pasa todavía.
          </p>

          <h2>Enlaces a otros sitios</h2>
          <p>
            Hay enlaces al repositorio del proyecto en GitHub. Cuando hacés
            clic, entrás a un sitio de otra empresa, con sus propias reglas de
            privacidad. Este sitio no controla eso.
          </p>

          <h2>Menores de edad</h2>
          <p>
            El truco no es un juego de azar por dinero y este sitio no tiene
            apuestas, ni fichas que se compren, ni nada que se le parezca. Como
            no recogemos datos de nadie, tampoco recogemos datos de menores.
          </p>

          <h2>Tus derechos</h2>
          <p>
            Si vivís en un país con leyes de protección de datos (la ley 18.331
            en Uruguay, el RGPD en Europa), tenés derecho a acceder, corregir y
            borrar tus datos personales. En este caso el ejercicio es simple:{" "}
            <strong>no hay ningún dato tuyo que acceder, corregir ni
            borrar</strong>.
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
