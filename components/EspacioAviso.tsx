/**
 * El hueco reservado para un aviso.
 *
 * Hoy no carga nada de nadie: sólo aparta el lugar. Reservar la altura desde
 * ahora evita que el día que se prendan los avisos se mueva todo el contenido
 * de lugar. Nunca va dentro de la mesa mientras se juega.
 */
export function EspacioAviso({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`mx-auto flex h-[90px] w-full max-w-3xl items-center justify-center rounded border border-dashed border-crema/15 text-xs uppercase tracking-widest text-crema/25 ${className}`}
      aria-hidden="true"
    >
      espacio reservado
    </aside>
  );
}
