/** Bloques para armar los ejemplos visuales de las lecciones. */

import { Carta } from "@/components/Carta";
import {
  type Carta as CartaType,
  desdeTexto,
  esPieza,
} from "@/lib/motor/baraja";

export const c = desdeTexto;

/** Una fila de cartas con un pie de foto. Las piezas se prenden solas. */
export function FilaCartas({
  cartas,
  muestra,
  ancho = 72,
  pie,
}: {
  cartas: (CartaType | string)[];
  muestra?: CartaType | string;
  ancho?: number;
  pie?: React.ReactNode;
}) {
  const lista = cartas.map((x) => (typeof x === "string" ? c(x) : x));
  const laMuestra = typeof muestra === "string" ? c(muestra) : muestra;

  return (
    <figure className="my-6">
      <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-3">
        {lista.map((carta, i) => (
          <Carta
            key={`${carta.numero}-${carta.palo}-${i}`}
            carta={carta}
            ancho={ancho}
            pieza={laMuestra ? esPieza(carta, laMuestra) : false}
          />
        ))}
      </div>
      {pie && (
        <figcaption className="mt-3 text-center text-sm text-tinta/75">
          {pie}
        </figcaption>
      )}
    </figure>
  );
}

/** Una mano de 3 cartas junto a la muestra, que es como se ve en la mesa. */
export function ManoConMuestra({
  mano,
  muestra,
  ancho = 68,
  pie,
}: {
  mano: string[];
  muestra: string;
  ancho?: number;
  pie?: React.ReactNode;
}) {
  const laMuestra = c(muestra);

  return (
    <figure className="my-6">
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        <div className="text-center">
          <Carta carta={laMuestra} ancho={ancho} className="mx-auto rotate-90" />
          <p className="mt-4 font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-widest text-tinta/60">
            muestra
          </p>
        </div>
        <div className="h-24 w-px bg-tinta/20" aria-hidden="true" />
        <div className="text-center">
          <div className="flex gap-2">
            {mano.map((txt) => {
              const carta = c(txt);
              return (
                <Carta
                  key={txt}
                  carta={carta}
                  ancho={ancho}
                  pieza={esPieza(carta, laMuestra)}
                />
              );
            })}
          </div>
          <p className="mt-4 font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-widest text-tinta/60">
            tu mano
          </p>
        </div>
      </div>
      {pie && (
        <figcaption className="mt-4 text-center text-sm text-tinta/75">{pie}</figcaption>
      )}
    </figure>
  );
}

/** El recuadro con la regla que hay que llevarse de la lección. */
export function Dato({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="my-7 border-l-4 border-bordo bg-tinta/[0.055] py-4 pl-4 pr-3">
      <p className="font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.14em] text-bordo">
        {titulo}
      </p>
      <div className="mt-2 text-[15px] leading-relaxed">{children}</div>
    </aside>
  );
}

/** Tabla de datos, legible en celular. */
export function Tabla({
  cabeceras,
  filas,
}: {
  cabeceras: string[];
  filas: React.ReactNode[][];
}) {
  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-[15px]">
        <thead>
          <tr className="border-b-2 border-tinta/25">
            {cabeceras.map((h) => (
              <th
                key={h}
                className="py-2 pr-4 font-[family-name:var(--font-ui)] text-xs uppercase tracking-wider text-tinta/70"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} className="border-b border-tinta/12">
              {fila.map((celda, j) => (
                <td key={j} className="py-2.5 pr-4 align-top">
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
