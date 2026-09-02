"use client";

/**
 * La gira: el mapa del tesoro del Uruguay, con un rival por departamento.
 *
 * Se desbloquea en cadena: arrancás en Montevideo y cada parada se abre cuando
 * le ganaste a la anterior. Eso NO se guarda en ningún lado nuevo: se deriva de
 * las victorias que el progreso ya anotaba, con `lib/gira.ts`. Un campo
 * `desbloqueados` en el `localStorage` sería una segunda fuente de verdad que
 * puede contradecir a la primera.
 *
 * El `<Link>` a la mesa se renderiza SÓLO para las paradas abiertas o ganadas,
 * así que por el camino normal nunca se llega a un rival cerrado. Lo que no se
 * hace es bloquear `?rival=`: esto es un sitio estático, el chequeo correría en
 * el navegador —en el mismo lugar donde vive el `localStorage` que querría
 * proteger— y de paso rompería los enlaces directos. La Partida Rápida sigue
 * libre, y el README ya dice que el progreso es local.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MapaUruguay } from "@/components/mapa/MapaUruguay";
import { Trofeos } from "@/components/Trofeos";
import { armarGira, proximaParada, slugDepartamento } from "@/lib/gira";
import { type Progreso, leerProgreso } from "@/lib/progreso";
import { trofeosDe } from "@/lib/trofeos";

/** La copa del botón de trofeos. Dibujada, como todo acá: ni un icono ajeno. */
function Copa() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-dorado" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* La copa: boca ancha arriba y panza que se cierra, que es lo que la
            distingue de un vaso a este tamaño. */}
        <path d="M7.5 3.5h9v4a4.5 4.5 0 0 1-9 0z" />
        {/* Las dos asas, que son lo que la hace copa y no maceta */}
        <path d="M7.5 4.8H5.6a1.9 1.9 0 0 0 1.9 3.6" />
        <path d="M16.5 4.8h1.9a1.9 1.9 0 0 1-1.9 3.6" />
        {/* Pie */}
        <path d="M12 12v3.4" />
        <path d="M8.8 19.5h6.4" />
        <path d="M10.2 15.4h3.6l1.4 4.1H8.8z" />
      </g>
    </svg>
  );
}

export default function Gira() {
  const [elegido, setElegido] = useState<string | null>(null);
  const [verTrofeos, setVerTrofeos] = useState(false);
  /* El tipo es el del progreso y no el `Marcas` de `lib/gira.ts`, que declara
     sólo `ganadas`/`jugadas`. Los dos sirven para armar la gira —`Marcas` se
     pide por forma—, pero la vitrina necesita además el marcador de cada
     victoria, y con el tipo chico TypeScript creería que nunca está. */
  const [marcas, setMarcas] = useState<Progreso["rivales"]>({});

  // El progreso vive en el navegador, así que se lee recién del lado del cliente
  useEffect(() => {
    setMarcas(leerProgreso().rivales);
  }, []);

  const paradas = useMemo(() => armarGira(marcas), [marcas]);
  const parada = paradas.find((p) => p.personalidad.departamento === elegido) ?? null;
  const proximo = proximaParada(paradas);
  const ganadas = paradas.filter((p) => p.estado === "ganada").length;
  const trofeos = useMemo(() => trofeosDe(marcas), [marcas]);
  const rival = parada?.personalidad;

  // Pantalla completa, igual que la mesa: la gira es una pantalla de juego, no
  // una página para leer. Sin esto el mapa queda encajonado entre el pie de
  // página y la barra, y en escritorio los nombres no se leen. La clase
  // `mesa-pantalla-completa` ya existe y esconde el pie.
  return (
    <div className="mesa-pantalla-completa relative flex min-h-0 flex-1 flex-col bg-noche">
      {/* Barra de arriba, como la del mapa de la referencia */}
      <header className="madera flex shrink-0 items-center justify-between border-b-2 filo-dorado px-3 py-2.5">
        {/* CON EL DESTINO ESCRITO, no una flecha suelta. Era un `←` en un
            círculo y no se encontraba; ahora se lee igual que el de la mesa,
            que es el que funciona: chevron y adónde va. */}
        <Link
          href="/jugar"
          className="flex items-center gap-1.5 rounded px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-dorado transition-colors hover:bg-black/30"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M15 5 L8 12 L15 19"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Jugar
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-xl text-dorado sm:text-2xl">
          Gira Nacional
        </h1>
        {/* El contador de victorias PASA A SER el botón de la vitrina: es el
            mismo número que ya mostraba, ahora clicable. No se agrega un cuarto
            hijo a la fila —es un `justify-between` de tres y a 320px ya va
            justo—, y va con la copa dibujada en vez de la palabra "Trofeos",
            que suma unos 60px que no hay. */}
        <button
          type="button"
          onClick={() => setVerTrofeos(true)}
          aria-label={`Trofeos: ${ganadas} de ${paradas.length}`}
          className="flex items-center gap-1.5 rounded px-2 py-1.5 font-[family-name:var(--font-ui)] text-xs text-crema/70 transition-colors hover:bg-black/30 hover:text-crema"
        >
          <Copa />
          {ganadas}/{paradas.length}
        </button>
      </header>

      {verTrofeos && <Trofeos trofeos={trofeos} onCerrar={() => setVerTrofeos(false)} />}

      {/* El mapa. El papel está apoyado sobre la mesa oscura del boliche, así
          que va sobre el fondo de noche del sitio y no sobre una caja crema.
          El tope de ancho evita que en pantalla ancha se estire y quede una
          franja de mapa perdida en el medio; va en `dvh` y no en `vh` porque
          la mesa ya usa `dvh` y en iOS Safari eso son unos 90 px de diferencia
          que hacían saltar el encuadre entre una pantalla y la otra. */}
      <div className="relative mx-auto min-h-0 w-full max-w-[min(100%,calc(100dvh-13rem))] flex-1">
        <MapaUruguay paradas={paradas} elegido={elegido} onElegir={setElegido} />
      </div>

      {/* Sin nada elegido, una franja discreta dice adónde hay que ir. Antes
          iba superpuesta y tapaba justo Montevideo, que es donde se arranca. */}
      {!parada && (
        <p className="shrink-0 border-t-2 border-madera bg-[#181008] py-3 text-center font-[family-name:var(--font-ui)] text-xs uppercase tracking-widest text-crema/55">
          {proximo
            ? `Te toca ${proximo.personalidad.departamento} · tocá el mapa`
            : "Ganaste la gira entera"}
        </p>
      )}

      {/* La ficha de la parada elegida */}
      {parada && rival && (
        <div className="papel anim-pop shrink-0 border-t-4 border-madera px-4 py-4">
          <div className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-widest text-tinta/50">
                Paso {parada.paso} · {rival.departamento} · {rival.lugar}
              </p>
              <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-tinta">
                {parada.estado === "cerrada" ? "Todavía no" : rival.nombre}
              </p>
              <p className="mt-1 text-sm leading-snug text-tinta/75">
                {parada.estado === "cerrada"
                  ? `Primero ganale a ${parada.abreCon?.nombre ?? "el anterior"}.`
                  : rival.descripcion}
              </p>
              <p
                className="mt-1.5 font-[family-name:var(--font-ui)] text-sm text-dorado"
                aria-label={`Dificultad ${rival.dificultad} de 5`}
              >
                {"★".repeat(rival.dificultad)}
                <span className="text-tinta/20">{"★".repeat(5 - rival.dificultad)}</span>
                {parada.estado === "ganada" && <span className="ml-2 text-quiero">✓ ganado</span>}
              </p>
            </div>

            {/* El enlace existe sólo si la parada está abierta o ganada */}
            {parada.estado === "cerrada" ? (
              <p className="shrink-0 rounded border border-tinta/25 px-6 py-3 text-center font-[family-name:var(--font-ui)] text-sm uppercase tracking-wide text-tinta/50">
                Cerrado
              </p>
            ) : (
              <Link
                href={`/jugar/mesa?depto=${slugDepartamento(rival.departamento)}`}
                className="shrink-0 rounded bg-bordo px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base uppercase tracking-wide text-crema transition-colors hover:bg-bordo-claro"
              >
                {parada.estado === "ganada" ? "Jugar de nuevo" : "Jugar"}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
