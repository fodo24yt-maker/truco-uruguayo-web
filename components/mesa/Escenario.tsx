/**
 * El escenario: un bar de madera de noche, en penumbra, con una lámpara que
 * cae sobre la mesa. Todo se genera con SVG y CSS, sin una sola imagen.
 *
 * La regla de la iluminación: hay una sola fuente de luz, la lámpara colgante.
 * Todo lo que está lejos de ella se apaga. Eso es lo que da la profundidad.
 */

/** Vetas de la madera: ruido estirado en un eje, como la veta de verdad. */
export function TexturaMadera({
  id = "madera",
  intensidad = 0.4,
  vertical = false,
}: {
  id?: string;
  intensidad?: number;
  /** Vetas corriendo hacia el fondo. En un plano inclinado convergen solas y
   *  es lo que hace que la mesa se lea en perspectiva. */
  vertical?: boolean;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 400 600"
      aria-hidden="true"
    >
      <defs>
        <filter id={`${id}-vetas`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={vertical ? "0.55 0.007" : "0.007 0.55"}
            numOctaves="4"
            seed="7"
          />
          <feColorMatrix
            type="matrix"
            values={`0 0 0 0 0.10
                     0 0 0 0 0.05
                     0 0 0 0 0.02
                     0 0 0 ${intensidad} 0`}
          />
        </filter>
      </defs>
      <rect width="400" height="600" filter={`url(#${id}-vetas)`} />
    </svg>
  );
}

/**
 * El rival. Tiene que leerse como una persona sentada enfrente, no como un
 * personaje de dibujitos ni como una mancha.
 *
 * Se dibuja con colores planos, sin texturas ni degradados: es una ilustración,
 * no un retrato. La luz viene de arriba (la lámpara), así que la parte de
 * arriba de cada forma es más clara que la de abajo.
 */
export function Rival({ nombre }: { nombre: string }) {
  return (
    <svg
      viewBox="0 0 320 190"
      className="h-full w-full"
      role="img"
      aria-label={`${nombre}, tu rival, sentado del otro lado de la mesa`}
    >
      {/* hombros y torso, cortados por el borde de abajo */}
      <path
        d="M26 190 C30 152 66 132 108 124 L212 124 C254 132 290 152 294 190 Z"
        fill="#2f3a42"
      />
      {/* la luz de la lámpara pegando en los hombros */}
      <path
        d="M108 124 L212 124 C232 128 250 135 264 144 L56 144 C70 135 88 128 108 124 Z"
        fill="#3e4c56"
      />
      {/* el cuello */}
      <path d="M136 128 L136 96 L184 96 L184 128 Z" fill="#a87748" />
      <path d="M136 96 L184 96 L184 108 L136 108 Z" fill="#8d6039" />

      {/* la cara */}
      <ellipse cx="160" cy="74" rx="38" ry="42" fill="#c2925f" />
      {/* la sombra del ala del sombrero sobre la frente */}
      <path
        d="M122 66 C122 46 138 32 160 32 C182 32 198 46 198 66 L198 72 L122 72 Z"
        fill="#a87748"
      />
      {/* orejas */}
      <ellipse cx="122" cy="78" rx="7" ry="10" fill="#b0834f" />
      <ellipse cx="198" cy="78" rx="7" ry="10" fill="#b0834f" />

      {/* ojos: dos óvalos oscuros, sin pupila. Alcanza para que mire */}
      <ellipse cx="145" cy="76" rx="5.5" ry="4" fill="#241a12" />
      <ellipse cx="175" cy="76" rx="5.5" ry="4" fill="#241a12" />
      {/* cejas */}
      <path d="M137 66 L153 68" stroke="#3a2a1a" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M167 68 L183 66" stroke="#3a2a1a" strokeWidth="3.4" strokeLinecap="round" />
      {/* nariz */}
      <path
        d="M160 80 L156 92 L164 92 Z"
        fill="#a87748"
      />
      {/* bigote: es lo que le da la cara de tipo de bar */}
      <path
        d="M140 98 C148 94 154 96 160 96 C166 96 172 94 180 98 C176 104 168 106 160 106 C152 106 144 104 140 98 Z"
        fill="#3a2a1a"
      />

      {/* el sombrero, que es lo que va a cambiar de rival en rival */}
      <path
        d="M100 36 C100 34 108 32 160 32 C212 32 220 34 220 36 C220 42 200 46 160 46 C120 46 100 42 100 36 Z"
        fill="#241811"
      />
      <path
        d="M124 34 C124 14 138 4 160 4 C182 4 196 14 196 34 C196 37 182 39 160 39 C138 39 124 37 124 34 Z"
        fill="#2f2016"
      />
      {/* la cinta del sombrero */}
      <path
        d="M124 30 C136 33 148 34 160 34 C172 34 184 33 196 30 L196 36 C184 39 172 40 160 40 C148 40 136 39 124 36 Z"
        fill="#1a1109"
      />
      {/* el brillo de la lámpara en la copa del sombrero */}
      <path
        d="M136 16 C142 8 150 5 160 5 C170 5 178 8 184 16 C176 12 168 10 160 10 C152 10 144 12 136 16 Z"
        fill="#43301f"
      />
    </svg>
  );
}

/**
 * El fondo del bar: pared de madera oscura, un estante con botellas
 * retroiluminadas y la lámpara colgante que ilumina toda la escena.
 */
export function FondoBar() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#150e09]">
      {/* pared de tablas, muy oscura y apenas insinuada */}
      <div className="absolute inset-0 opacity-70">
        <TexturaMadera id="pared" intensidad={0.55} />
      </div>

      {/* el estante del fondo con las botellas, iluminado por detrás */}
      <div className="absolute inset-x-0 top-[16px] flex justify-center gap-[6px] opacity-70 blur-[3px]">
        {[
          { h: 40, w: 9, c: "#4a6b45" },
          { h: 52, w: 10, c: "#7a4a22" },
          { h: 34, w: 8, c: "#2f4450" },
          { h: 46, w: 11, c: "#6b5a24" },
          { h: 38, w: 9, c: "#5a2b2b" },
          { h: 50, w: 10, c: "#3f5a3a" },
          { h: 36, w: 8, c: "#7a5a2a" },
        ].map((b, i) => (
          <span
            key={i}
            style={{
              height: b.h,
              width: b.w,
              background: `linear-gradient(180deg, ${b.c} 0%, rgba(0,0,0,0.85) 100%)`,
              borderRadius: "3px 3px 1px 1px",
              boxShadow: `0 0 10px 1px ${b.c}55`,
            }}
          />
        ))}
      </div>
      {/* la repisa donde se apoyan */}
      <div className="absolute inset-x-0 top-[68px] h-[5px] bg-[#2a1b10] opacity-80 blur-[1px]" />

      {/* la lámpara colgante */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <div className="mx-auto h-[14px] w-[2px] bg-[#3a2a1c]" />
        <div
          className="h-[16px] w-[54px] rounded-b-[26px] rounded-t-sm"
          style={{
            background: "linear-gradient(180deg, #2a1c12 0%, #4a3520 70%, #f0b45c 100%)",
          }}
        />
      </div>

      {/* el cono de luz que baja de la lámpara */}
      <div
        className="absolute left-1/2 top-[26px] h-[190px] w-[300px] -translate-x-1/2 opacity-45"
        style={{
          background:
            "linear-gradient(180deg, rgba(240,180,92,0.5) 0%, rgba(240,180,92,0.12) 55%, transparent 100%)",
          clipPath: "polygon(42% 0%, 58% 0%, 100% 100%, 0% 100%)",
          filter: "blur(12px)",
        }}
      />
      {/* el halo alrededor de la lámpara */}
      <div
        className="absolute left-1/2 top-[-40px] h-[190px] w-[330px] -translate-x-1/2 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(240,180,92,0.55) 0%, rgba(240,180,92,0.14) 42%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
    </div>
  );
}
