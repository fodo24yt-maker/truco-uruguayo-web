/**
 * El marcador, anotado como en la mesa de verdad: palitos que arman un cuadrado
 * y el quinto en diagonal, de a cinco puntos. Malas de un lado, buenas del otro.
 */

const TRAZOS = [
  "M3 4 L3 22", // izquierda
  "M3 4 L19 4", // arriba
  "M19 4 L19 22", // derecha
  "M3 22 L19 22", // abajo
  "M3 4 L19 22", // el quinto, cruzado
];

function Grupo({ cantidad }: { cantidad: number }) {
  return (
    <svg viewBox="0 0 22 26" className="h-6 w-5 shrink-0" aria-hidden="true">
      {TRAZOS.slice(0, cantidad).map((d) => (
        <path
          key={d}
          d={d}
          stroke="var(--color-tinta)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
      ))}
    </svg>
  );
}

function Fila({ etiqueta, puntos }: { etiqueta: string; puntos: number }) {
  const malas = Math.min(puntos, 15);
  const buenas = Math.max(puntos - 15, 0);
  const grupos = (n: number) =>
    Array.from({ length: 3 }, (_, i) => Math.max(0, Math.min(5, n - i * 5)));

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-7 shrink-0 font-[family-name:var(--font-mano)] text-base leading-none text-tinta/80">
        {etiqueta}
      </span>
      <span className="flex gap-0.5">
        {grupos(malas).map((n, i) => (
          <Grupo key={`m${i}`} cantidad={n} />
        ))}
      </span>
      <span className="mx-1 h-5 w-px bg-tinta/30" />
      <span className="flex gap-0.5">
        {grupos(buenas).map((n, i) => (
          <Grupo key={`b${i}`} cantidad={n} />
        ))}
      </span>
      <span className="ml-1.5 w-5 shrink-0 text-right font-[family-name:var(--font-mano)] text-lg leading-none text-bordo">
        {puntos}
      </span>
    </div>
  );
}

export function Marcador({ vos, rival }: { vos: number; rival: number }) {
  return (
    <div
      className="papel -rotate-2 inline-block w-fit shrink-0 px-2.5 py-2"
      style={{ boxShadow: "3px 7px 14px -3px rgba(0,0,0,0.8)" }}
    >
      <div className="mb-0.5 flex gap-1.5 pl-8 font-[family-name:var(--font-ui)] text-[8px] uppercase tracking-[0.12em] text-tinta/45">
        <span className="w-[64px]">malas</span>
        <span>buenas</span>
      </div>
      <Fila etiqueta="Él" puntos={rival} />
      <div className="my-1 h-px bg-tinta/15" />
      <Fila etiqueta="Yo" puntos={vos} />
    </div>
  );
}
