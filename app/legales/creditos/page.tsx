import type { Metadata } from "next";
import Link from "next/link";

import { PanelPapel } from "@/components/PanelPapel";

export const metadata: Metadata = {
  title: "Créditos y licencias",
  description:
    "Con qué está hecho Truco Uruguayo: las tipografías, el software de código abierto, el mapa y la música, con sus licencias.",
  alternates: { canonical: "/legales/creditos" },
};

const ULTIMA_ACTUALIZACION = "27 de octubre de 2026";

const enlace = "text-bordo underline underline-offset-2";

/** Un enlace que se abre afuera, con las mismas protecciones que los demás. */
function Afuera({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className={enlace} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/**
 * Lo que la app usa de otros, con su licencia. Las tipografías (SIL OFL) y el
 * software MIT viajan adentro del APK, y las dos licencias piden que el aviso
 * vaya con la copia: esto es ese aviso, a la vista y no sólo en un archivo.
 *
 * Si se agrega una dependencia que viaja en la app, o una tipografía, va acá.
 */
export default function Creditos() {
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
            Créditos y licencias
          </h1>
          <p className="mb-8 border-b border-tinta/15 pb-5 text-base text-tinta/70">
            Última actualización: {ULTIMA_ACTUALIZACION}
          </p>

          <h2>Lo que es del proyecto</h2>
          <p>
            El código, las lecciones, la baraja, las mesas, las caras de los
            rivales y la música son del proyecto. Las cartas, las escenas y el
            mapa se dibujan con código; no hay imágenes de nadie más.
          </p>
          <p>
            <strong>La música</strong> es instrumental y se hizo para el juego:
            una milonga sintetizada nota por nota con código, y las demás
            generadas en una computadora propia con{" "}
            <Afuera href="https://huggingface.co/ACE-Step/Ace-Step1.5">ACE-Step 1.5</Afuera>{" "}
            (licencia MIT). No usa grabaciones ni voces de nadie.
          </p>
          <p>
            <strong>Las reglas</strong> (
            <Afuera href="https://github.com/fodo24yt-maker/truco-uruguayo-web/blob/main/reglas.txt">
              reglas.txt
            </Afuera>
            ) están liberadas bajo{" "}
            <Afuera href="https://creativecommons.org/licenses/by/4.0/deed.es">
              Creative Commons Atribución 4.0
            </Afuera>
            . El resto del código tiene{" "}
            <Afuera href="https://github.com/fodo24yt-maker/truco-uruguayo-web/blob/main/LICENSE">
              su propia licencia
            </Afuera>
            .
          </p>

          <h2>Tipografías</h2>
          <p>
            <strong>Yeseva One</strong>, <strong>Oswald</strong>,{" "}
            <strong>Source Sans 3</strong> y <strong>Caveat</strong>, de{" "}
            <Afuera href="https://fonts.google.com">Google Fonts</Afuera>, con
            la{" "}
            <Afuera href="https://openfontlicense.org">SIL Open Font License 1.1</Afuera>
            . Cada una es de sus autores; viajan adentro del sitio y de la app,
            así que no se piden a Google al abrirlos.
          </p>

          <h2>Software de código abierto</h2>
          <p>
            La app está hecha con{" "}
            <Afuera href="https://nextjs.org">Next.js</Afuera>,{" "}
            <Afuera href="https://react.dev">React</Afuera>,{" "}
            <Afuera href="https://tailwindcss.com">Tailwind CSS</Afuera>,{" "}
            <Afuera href="https://capacitorjs.com">Capacitor</Afuera> (y sus
            complementos App y Splash Screen) y los complementos de la
            comunidad de Capacitor{" "}
            <Afuera href="https://github.com/capacitor-community/admob">AdMob</Afuera>{" "}
            y{" "}
            <Afuera href="https://github.com/capacitor-community/safe-area">Safe Area</Afuera>
            . Todos con{" "}
            <Afuera href="https://opensource.org/license/mit">licencia MIT</Afuera>
            , de sus respectivos autores.
          </p>
          <p>
            Los anuncios de la app de Android los pone el SDK de Google Mobile
            Ads, bajo los términos de Google. Qué datos usa está en la{" "}
            <Link href="/legales/privacidad" className={enlace}>
              política de privacidad
            </Link>
            .
          </p>

          <h2>El mapa</h2>
          <p>
            El contorno del Uruguay y sus departamentos sale de{" "}
            <Afuera href="https://www.naturalearthdata.com">Natural Earth</Afuera>
            , que es de dominio público.
          </p>
        </article>
      </PanelPapel>
    </div>
  );
}
