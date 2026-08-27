/**
 * El pie de cada página: una invitación a seguir el proyecto.
 *
 * No hay publicidad ni pedido de plata. Este proyecto es gratis y va a seguir
 * siéndolo; si a alguien le gustó, lo que sirve es que se entere de lo que
 * viene.
 */

export const GITHUB = "https://github.com/fodo24yt-maker";

export function ApoyarProyecto({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`mx-auto flex max-w-2xl flex-col items-center gap-3 rounded border border-crema/12 bg-black/25 px-5 py-6 text-center sm:flex-row sm:justify-between sm:text-left ${className}`}
    >
      <div>
        <p className="font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-crema">
          ¿Te sirvió?
        </p>
        <p className="mt-1 text-sm leading-snug text-crema/65">
          Es gratis y va a seguir siéndolo. Si te gustó, seguime y enterate de lo
          que voy sumando.
        </p>
      </div>

      <a
        href={GITHUB}
        target="_blank"
        rel="noopener noreferrer"
        className="flex shrink-0 items-center gap-2 rounded bg-crema/10 px-4 py-2.5 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-crema transition-colors hover:bg-crema/20"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
        Seguir en GitHub
      </a>
    </aside>
  );
}
