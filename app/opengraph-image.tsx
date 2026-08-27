import { ImageResponse } from "next/og";

/**
 * La imagen que se ve cuando alguien comparte el enlace por WhatsApp, Twitter
 * o donde sea. Se dibuja al compilar y queda como un PNG estático.
 *
 * Muestra justo lo que hace único al juego: un 4 —la carta más floja de la
 * baraja— ganándole al ancho de espada.
 */
export const alt =
  "Truco Uruguayo: aprendé y practicá gratis. Acá el 4 le puede ganar al 1.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

/** Una carta dibujada en el mismo estilo que las del juego. */
function Carta({
  numero,
  color,
  giro,
  resaltada = false,
}: {
  numero: string;
  color: string;
  giro: number;
  resaltada?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: 200,
        height: 300,
        borderRadius: 14,
        background: "#f2e6d0",
        border: `5px solid ${color}`,
        transform: `rotate(${giro}deg)`,
        boxShadow: resaltada
          ? "0 0 0 5px #c9922e, 0 24px 44px rgba(0,0,0,0.6)"
          : "0 24px 44px rgba(0,0,0,0.6)",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        padding: 18,
      }}
    >
      <span style={{ fontSize: 76, fontWeight: 700, color, lineHeight: 1 }}>
        {numero}
      </span>
    </div>
  );
}

export default function Imagen() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse 62% 54% at 50% 38%, #a97341 0%, #63401f 42%, #2a1810 78%, #150e09 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 34,
            marginBottom: 44,
          }}
        >
          <Carta numero="4" color="#4e6b2f" giro={-7} resaltada />
          <span style={{ fontSize: 62, color: "#f2e6d0", opacity: 0.8 }}>&gt;</span>
          <Carta numero="1" color="#2b4a6f" giro={5} />
        </div>

        <div
          style={{
            fontSize: 62,
            fontWeight: 700,
            color: "#f2e6d0",
            letterSpacing: -1,
          }}
        >
          En el truco, el 4 le puede ganar al 1
        </div>
        <div style={{ fontSize: 34, color: "#c9922e", marginTop: 18 }}>
          Aprendé truco uruguayo y practicá. Gratis.
        </div>
      </div>
    ),
    size,
  );
}
