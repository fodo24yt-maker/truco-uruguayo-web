"use client";

/**
 * Los enlaces que entran a jugar o al anotador. TODOS pasan por acá.
 *
 * Son `<Link>` de verdad, con su `href`: se pueden leer, el lector de pantalla
 * los anuncia como enlaces y las herramientas de Playwright los encuentran por
 * la dirección. Lo que cambia es que antes de navegar le preguntan al portero
 * (`lib/entrada.ts`), por `onNavigate`, que en Next 16 se llama sólo en las
 * navegaciones de la app y no cuando se abre en otra pestaña:
 *
 *  · si se puede pasar ya (en la web, siempre), el enlace navega solo;
 *  · si hay un candado o un anuncio, se frena acá y navega el portero cuando
 *    corresponda.
 *
 * El candado se dibuja sólo si se pide (`conCandado`): el aviso visual es una
 * decisión de diseño de cada pantalla; el candado de verdad lo pone el portero
 * igual, se vea o no.
 */

import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { Candado } from "@/components/Candado";
import { type Pedido, RUTA_ANOTADOR, SIN_CANDADOS, hrefDe, portero } from "@/lib/entrada";

const sinCandados = () => SIN_CANDADOS;

/** Qué está bloqueado ahora. En el servidor y en la web: nada. */
export function useCandados() {
  useEffect(() => portero.refrescar(), []);
  return useSyncExternalStore(portero.suscribir, portero.leerCandados, sinCandados);
}

interface Props {
  className?: string;
  children: ReactNode;
  /** Dibujar el candado en la esquina cuando está bloqueado. */
  conCandado?: boolean;
  /** Texto para el lector de pantalla cuando está bloqueado. */
  etiquetaBloqueado?: string;
}

function Esquina() {
  return (
    <span
      aria-hidden="true"
      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-dorado/70 bg-noche text-dorado"
    >
      <Candado className="h-4 w-4" />
    </span>
  );
}

export function EntradaPartida({
  pedido,
  className = "",
  children,
  conCandado = false,
  etiquetaBloqueado,
}: Props & { pedido: Pedido }) {
  const candados = useCandados();
  const bloqueado = pedido.modo === "gira" && candados.gira;
  return (
    <Link
      href={hrefDe(pedido)}
      onNavigate={(e) => {
        if (!portero.pedirPartidaDesdeEnlace(pedido)) e.preventDefault();
      }}
      data-bloqueado={bloqueado ? "true" : undefined}
      aria-label={bloqueado ? etiquetaBloqueado : undefined}
      className={`relative ${className}`}
    >
      {children}
      {conCandado && bloqueado && <Esquina />}
    </Link>
  );
}

export function EntradaAnotador({
  className = "",
  children,
  conCandado = false,
  etiquetaBloqueado,
}: Props) {
  const candados = useCandados();
  const bloqueado = candados.anotador;
  return (
    <Link
      href={RUTA_ANOTADOR}
      onNavigate={(e) => {
        if (!portero.pedirAnotadorDesdeEnlace()) e.preventDefault();
      }}
      data-bloqueado={bloqueado ? "true" : undefined}
      aria-label={bloqueado ? etiquetaBloqueado : undefined}
      className={`relative ${className}`}
    >
      {children}
      {conCandado && bloqueado && <Esquina />}
    </Link>
  );
}
