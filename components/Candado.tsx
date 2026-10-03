/**
 * El candado de lo que está bloqueado (el anotador y la Gira, en la app).
 *
 * Dibujado acá, en SVG, como todo en este proyecto. Toma el color del texto
 * (`currentColor`), así el mismo dibujo sirve en dorado sobre la madera y en
 * crema sobre un botón apagado. Sin `filter` ni sombras de SVG: la mesa y sus
 * vecinos tienen prohibidos los filtros por el bug de las manchitas.
 */
export function Candado({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* El arco */}
      <path
        d="M7.5 10.5 V7.5 a4.5 4.5 0 0 1 9 0 V10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* El cuerpo, con la cerradura calada */}
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M5.5 10.5 h13 a1.5 1.5 0 0 1 1.5 1.5 v7.5 a1.5 1.5 0 0 1 -1.5 1.5 h-13 a1.5 1.5 0 0 1 -1.5 -1.5 v-7.5 a1.5 1.5 0 0 1 1.5 -1.5 Z M12 13.6 a1.6 1.6 0 0 0 -0.75 3.01 V18.4 h1.5 V16.61 A1.6 1.6 0 0 0 12 13.6 Z"
      />
    </svg>
  );
}
