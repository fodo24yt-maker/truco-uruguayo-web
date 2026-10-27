/**
 * El panel de papel viejo: todo lo que se lee, se lee acá.
 *
 * Los picos de arriba y de abajo van en % del ALTO, así que en una página muy
 * larga crecían con ella: con la política de privacidad del 27/10/2026 (unos
 * 7000 px en un celular) el borde roto ya se comía el título. Por eso cada uno
 * lleva un tope en px: en los paneles de siempre no cambia nada.
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
      className={`papel px-5 py-7 shadow-xl shadow-black/40 sm:px-8 sm:py-10 ${className}`}
      style={{
        clipPath:
          "polygon(0% min(1.2%, 16px), 2% 0%, 35% min(0.7%, 10px), 68% 0%, 99% min(1%, 14px), 100% 30%, 99.4% 70%, 100% max(99%, calc(100% - 14px)), 62% 100%, 30% max(99.3%, calc(100% - 10px)), 1% 100%, 0.4% 60%)",
      }}
    >
      {children}
    </div>
  );
}
