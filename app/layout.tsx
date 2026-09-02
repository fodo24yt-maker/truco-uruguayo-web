import type { Metadata, Viewport } from "next";
import { Oswald, Source_Sans_3, Yeseva_One } from "next/font/google";
import Link from "next/link";
import { BarraApp } from "@/components/BarraApp";
import { BotonAtrasAndroid } from "@/components/BotonAtrasAndroid";
import { NOMBRE_SITIO, URL_SITIO } from "@/lib/sitio";
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
/* LA MANUSCRITA NO ESTÁ ACÁ, y es a propósito: vive en `app/jugar/layout.tsx`.
   Es la más pesada de las cuatro y se usa sólo en la mesa y en la gira;
   declarada acá, Next la precargaba también en la portada, en las lecciones y
   en las legales, que no la usan. El porqué completo está allá. */

export const metadata: Metadata = {
  // Sin esto, la imagen para compartir apuntaría a localhost y no se vería
  // nada al pegar el enlace en WhatsApp o en Twitter.
  metadataBase: new URL(URL_SITIO),
  title: {
    default: "Truco Uruguayo — aprender y practicar, gratis",
    template: "%s · Truco Uruguayo",
  },
  description:
    "Aprendé a jugar al truco uruguayo desde cero: la muestra, las piezas, el envido y la flor. Después practicá contra un bot. Gratis y sin registro.",
  keywords: [
    "truco uruguayo",
    "cómo jugar al truco uruguayo",
    "reglas del truco uruguayo",
    "muestra",
    "piezas",
    "envido",
    "flor",
    "jugar al truco",
  ],
  openGraph: {
    type: "website",
    locale: "es_UY",
    siteName: NOMBRE_SITIO,
    url: URL_SITIO,
  },
  // EL CANONICAL NO VA ACÁ, y es a propósito. Todo lo que declara el layout
  // raíz lo heredan TODAS las páginas: con `canonical: "/"` puesto acá, las
  // ocho lecciones y la gira le decían a Google que eran duplicados de la
  // portada (verificado sobre `out/`: los tres .html emitían la misma etiqueta).
  // Lo declara cada página. Las que no son contenido indexable —la mesa y la
  // gira— no llevan ninguno, que es mejor que llevar uno equivocado.
};

/**
 * La ventana.
 *
 * `viewportFit: "cover"` es lo que hace que `env(safe-area-inset-*)` valga algo:
 * sin él, el navegador da 0 y no hay forma de saber cuánto mide la franja del
 * reloj. En una web común no cambia nada —no hay franja—; en la app es la mitad
 * del arreglo, y la otra mitad son las reglas de `globals.css`.
 *
 * El zoom se bloquea SÓLO en la app. En la web poder agrandar el texto es
 * accesibilidad y sacarlo sería una regresión; adentro de una app, en cambio,
 * el pellizco no agranda nada útil y lo único que hace es descolocar la mesa,
 * que está medida para entrar exacta. `viewport` se evalúa al compilar, así que
 * alcanza con mirar la variable del build.
 */
const PARA_LA_APP = process.env.DESTINO === "app";

export const viewport: Viewport = {
  themeColor: "#14100e",
  viewportFit: "cover",
  ...(PARA_LA_APP ? { userScalable: false, maximumScale: 1, initialScale: 1 } : {}),
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
      className={`${display.variable} ${ui.variable} ${texto.variable}`}
    >
      <head>
        {process.env.NODE_ENV === "production" && (
          <meta httpEquiv="Content-Security-Policy" content={POLITICA_DE_SEGURIDAD} />
        )}
        <meta name="referrer" content="no-referrer" />
      </head>
      <body className="flex min-h-dvh flex-col">
        {/* La barra de la app. Es un componente de cliente porque tiene que
            saber en qué pantalla estás para decidir adónde vuelve la flecha y
            cuál de los dos atajos está encendido. Su `<header>` sigue siendo
            hijo directo del `<body>`, que es de lo que depende que la mesa lo
            pueda esconder: está explicado en el propio componente. */}
        <BarraApp />
        {/* No dibuja nada: ata el botón físico de atrás de Android a la misma
            función que la flecha de la barra. En la web no hace absolutamente
            nada y no descarga un solo byte de Capacitor. */}
        <BotonAtrasAndroid />

        <main className="flex min-h-0 flex-1 flex-col">{children}</main>

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
