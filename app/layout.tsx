import type { Metadata, Viewport } from "next";
import { Caveat, Oswald, Source_Sans_3, Yeseva_One } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// Las fuentes se sirven desde nuestro propio dominio: ni una sola llamada a
// Google desde el navegador del que entra.
const display = Yeseva_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--fuente-display",
  display: "swap",
});
const ui = Oswald({
  subsets: ["latin"],
  variable: "--fuente-ui",
  display: "swap",
});
const texto = Source_Sans_3({
  subsets: ["latin"],
  variable: "--fuente-texto",
  display: "swap",
});
const manuscrita = Caveat({
  subsets: ["latin"],
  variable: "--fuente-mano",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Truco Uruguayo — aprender y practicar, gratis",
    template: "%s · Truco Uruguayo",
  },
  description:
    "Aprendé a jugar al truco uruguayo desde cero: la muestra, las piezas, el envido y la flor. Después practicá contra un bot. Gratis y sin registro.",
  keywords: [
    "truco uruguayo",
    "cómo jugar al truco uruguayo",
    "muestra",
    "piezas",
    "envido",
    "flor",
  ],
};

export const viewport: Viewport = {
  themeColor: "#14100e",
};

/**
 * Política de seguridad de contenido.
 *
 * El sitio es estático y no se conecta con nadie: todo —código, tipografías,
 * imágenes— sale de nuestro propio dominio. Esta política lo deja escrito y
 * hace que el navegador lo haga cumplir: si algún día alguien lograra colar un
 * script de otro lado, el navegador se niega a ejecutarlo.
 *
 * Va como <meta> porque un sitio estático no controla las cabeceras HTTP; el
 * día que se publique conviene además configurarlas en el hosting.
 *
 * 'unsafe-inline' en estilos es necesario para los estilos que React calcula en
 * línea (la rotación de cada carta, por ejemplo).
 *
 * Sólo se aplica en producción: en desarrollo, Next usa eval para recargar la
 * página al vuelo y la política lo bloquearía.
 */
const POLITICA_DE_SEGURIDAD = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-UY"
      className={`${display.variable} ${ui.variable} ${texto.variable} ${manuscrita.variable}`}
    >
      <head>
        {process.env.NODE_ENV === "production" && (
          <meta httpEquiv="Content-Security-Policy" content={POLITICA_DE_SEGURIDAD} />
        )}
        <meta name="referrer" content="no-referrer" />
      </head>
      <body className="min-h-dvh">
        <header className="madera border-b-2 filo-dorado">
          <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-lg leading-none text-dorado sm:text-xl"
            >
              Truco Uruguayo
            </Link>
            <div className="flex gap-1 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide">
              <Link
                href="/aprender"
                className="rounded px-3 py-2 text-crema/85 transition-colors hover:bg-black/25 hover:text-crema"
              >
                Aprender
              </Link>
              <Link
                href="/jugar"
                className="rounded bg-bordo px-3 py-2 text-crema transition-colors hover:bg-bordo-claro"
              >
                Jugar
              </Link>
            </div>
          </nav>
        </header>

        <main>{children}</main>

        <footer className="madera mt-16 border-t-2 filo-dorado px-4 py-8 text-center text-sm text-crema/60">
          <p className="mx-auto max-w-lg">
            El único lugar donde aprendés truco uruguayo y lo practicás al mismo
            tiempo. Gratis.
          </p>
          <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-[family-name:var(--font-ui)] text-xs uppercase tracking-wide">
            <Link href="/aprender" className="hover:text-crema">
              Aprender
            </Link>
            <span aria-hidden="true" className="text-crema/25">
              ·
            </span>
            <Link href="/legales/privacidad" className="hover:text-crema">
              Privacidad
            </Link>
            <span aria-hidden="true" className="text-crema/25">
              ·
            </span>
            <Link href="/legales/terminos" className="hover:text-crema">
              Términos
            </Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
