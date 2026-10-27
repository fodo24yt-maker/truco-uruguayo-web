import type { Metadata } from "next";
import Link from "next/link";

import { PanelPapel } from "@/components/PanelPapel";
import { CORREO_CONTACTO, DESARROLLADOR } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Términos de uso",
  description:
    "Las condiciones de uso de Truco Uruguayo: gratis, sin garantías, y con las reglas del juego liberadas para quien las quiera usar.",
  alternates: { canonical: "/legales/terminos" },
};

const ULTIMA_ACTUALIZACION = "27 de octubre de 2026";

export default function Terminos() {
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
            Términos de uso
          </h1>
          <p className="mb-8 border-b border-tinta/15 pb-5 text-base text-tinta/70">
            Última actualización: {ULTIMA_ACTUALIZACION}
          </p>

          <h2>Qué es esto</h2>
          <p>
            Truco Uruguayo es una app de Android y un sitio, gratuitos, para
            aprender a jugar al truco uruguayo y practicar contra un bot. Es un
            proyecto personal
            {DESARROLLADOR ? (
              <>
                {" "}de <strong>{DESARROLLADOR}</strong>, desarrollador
                independiente de Uruguay
              </>
            ) : null}
            , hecho porque no existía algo así. Usarlo es aceptar estos
            términos.
          </p>

          <h2>Es gratis y va a seguir siéndolo</h2>
          <p>
            Aprender y jugar acá no cuesta nada, no requiere cuenta y no tiene
            versión paga. <strong>No hay apuestas con dinero</strong>, ni fichas
            que se compren, ni compras dentro del juego. Nada de lo que pasa en
            el juego tiene valor monetario: los tantos que se apuestan son los
            puntos de la partida y nada más.
          </p>
          <p>
            En la app de Android, <strong>el anotador y la Gira nacional se
            desbloquean gratis</strong>: el anotador mirando un video una sola
            vez, y la Gira terminando la sección Aprender o mirando un video.
            Lo desbloqueado se guarda en tu teléfono: si borrás los datos de la
            app o la desinstalás, se pierde y hay que volver a desbloquearlo.
          </p>

          <h2>Sin garantías</h2>
          <p>
            La app y el sitio se ofrecen &ldquo;tal cual están&rdquo;. Se hace lo posible
            para que las reglas sean correctas —están documentadas y verificadas
            con pruebas automáticas—, pero{" "}
            <strong>puede haber errores</strong>. Si vas a jugar por algo que te
            importa, la palabra final es la de tu mesa, no la de esta app.
          </p>
          <p>
            Tampoco se garantiza que la app o el sitio estén siempre disponibles
            ni libres de fallas. Es un proyecto personal, no un servicio
            contratado.
          </p>

          <h2>Las reglas del truco no son de nadie</h2>
          <p>
            El truco uruguayo es patrimonio cultural: nadie es dueño de sus
            reglas y este proyecto no pretende serlo. El documento{" "}
            <a
              href="https://github.com/fodo24yt-maker/truco-uruguayo-web/blob/main/reglas.txt"
              className="text-bordo underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              reglas.txt
            </a>{" "}
            está liberado bajo Creative Commons Atribución 4.0: copialo,
            adaptalo y usalo para lo que quieras, incluso comercialmente, sólo
            decí de dónde salió.
          </p>

          <h2>El código y el diseño sí tienen dueño</h2>
          <p>
            El código, los textos de las lecciones, los dibujos de la baraja y
            el diseño del sitio son obra del autor y están protegidos por
            derecho de autor. Podés leerlos, estudiarlos, aprender de ellos e
            inspirarte libremente. Lo que no podés es publicar este juego como
            propio ni lucrar con él. Los detalles están en{" "}
            <a
              href="https://github.com/fodo24yt-maker/truco-uruguayo-web/blob/main/LICENSE"
              className="text-bordo underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              la licencia
            </a>
            , que está escrita para entenderse sin abogado.
          </p>

          <h2>Publicidad</h2>
          <p>
            <strong>La web no tiene publicidad.</strong> La app de Android sí:
            anuncios de Google AdMob, de pantalla completa al terminar una
            partida (como mucho uno cada tres minutos; nunca al empezar a jugar,
            ni en medio de una partida, ni en Aprender) y videos que vos elegís
            mirar para desbloquear algo. No hay banners. Qué datos usan esos anuncios está
            en la{" "}
            <Link
              href="/legales/privacidad"
              className="text-bordo underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              política de privacidad
            </Link>
            .
          </p>
          <p>
            Cuánto dura cada anuncio y si se puede saltar lo decide la red de
            anuncios, no la app.
          </p>

          <h2>Cambios</h2>
          <p>
            Estos términos se actualizan cuando el proyecto cambia de manera
            relevante, con la fecha de arriba modificada. El historial completo
            está público en el repositorio.
          </p>

          <h2>Ley aplicable</h2>
          <p>
            Estos términos se rigen por las leyes de la República Oriental del
            Uruguay.
          </p>

          <h2>Contacto</h2>
          <p>
            {CORREO_CONTACTO ? (
              <>
                Escribí a <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>, o abrí
                un issue en{" "}
              </>
            ) : (
              <>Abrí un issue en </>
            )}
            <a
              href="https://github.com/fodo24yt-maker/truco-uruguayo-web/issues"
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
