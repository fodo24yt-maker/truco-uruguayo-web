import type { Metadata } from "next";
import Link from "next/link";

import { PanelPapel } from "@/components/PanelPapel";

export const metadata: Metadata = {
  title: "Términos de uso",
  description:
    "Las condiciones de uso de Truco Uruguayo: gratis, sin garantías, y con las reglas del juego liberadas para quien las quiera usar.",
};

const ULTIMA_ACTUALIZACION = "26 de agosto de 2026";

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
            Un sitio gratuito para aprender a jugar al truco uruguayo y
            practicar contra un bot. Es un proyecto personal, hecho porque no
            existía algo así y no porque haya un negocio atrás.
          </p>

          <h2>Es gratis y va a seguir siéndolo</h2>
          <p>
            Aprender y jugar acá no cuesta nada, no requiere cuenta y no tiene
            versión paga. <strong>No hay apuestas con dinero</strong>, ni fichas
            que se compren, ni compras dentro del juego. Nada de lo que pasa en
            esta web tiene valor monetario.
          </p>

          <h2>Sin garantías</h2>
          <p>
            El sitio se ofrece &ldquo;tal cual está&rdquo;. Se hace lo posible
            para que las reglas sean correctas —están documentadas y verificadas
            con pruebas automáticas—, pero{" "}
            <strong>puede haber errores</strong>. Si vas a jugar por algo que te
            importa, la palabra final es la de tu mesa, no la de esta web.
          </p>
          <p>
            Tampoco se garantiza que el sitio esté siempre disponible ni libre
            de fallas. Es un proyecto personal, no un servicio contratado.
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
            No hay, y no está previsto que la haya. Si eso cambiara, se avisa
            antes en la{" "}
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
        </article>
      </PanelPapel>
    </div>
  );
}
