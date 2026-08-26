/** El panel de papel viejo: todo lo que se lee, se lee acá. */
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
          "polygon(0% 1.2%, 2% 0%, 35% 0.7%, 68% 0%, 99% 1%, 100% 30%, 99.4% 70%, 100% 99%, 62% 100%, 30% 99.3%, 1% 100%, 0.4% 60%)",
      }}
    >
      {children}
    </div>
  );
}
