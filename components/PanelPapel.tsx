/**
 * El panel de papel viejo: todo lo que se lee, se lee acá.
 *
 * ── NO LLEVA SOMBRA, DESDE EL 28/10/2026 ─────────────────────────────────
 * Tenía `shadow-xl shadow-black/40`: dos `box-shadow` con desenfoque (25 y
 * 10 px). Es lo mismo que el 8/10 resultó ser la causa principal de los
 * cuadraditos de la mesa en el Redmi: Skia dibuja el desenfoque con máscaras
 * en texturas auxiliares, y el Vulkan de la Mali lo hace mal (`globals.css`,
 * "LAS SOMBRAS DE LA MESA, SIN DESENFOQUE"). Santiago vio píxeles negros en los
 * ejercicios de Aprender, que viven adentro de este panel.
 *
 * Y no se veía: el `clip-path` recorta TODO lo que cae fuera del polígono,
 * sombra incluida, y el polígono está adentro de la caja. Era una sombra
 * invisible que igual se rasterizaba. Comparada la lección entera píxel a
 * píxel con y sin ella, da igual. No volver a ponerla: no se vería.
 */
export function PanelPapel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`papel px-5 py-7 sm:px-8 sm:py-10 ${className}`}
      style={{
        clipPath:
          "polygon(0% 1.2%, 2% 0%, 35% 0.7%, 68% 0%, 99% 1%, 100% 30%, 99.4% 70%, 100% 99%, 62% 100%, 30% 99.3%, 1% 100%, 0.4% 60%)",
      }}
    >
      {children}
    </div>
  );
}
