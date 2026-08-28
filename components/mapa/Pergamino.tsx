/**
 * El papel: la hoja de pergamino sobre la que está dibujado todo lo demás.
 *
 * No recibe props y no cambia nunca, así que se declara UNA vez como elemento
 * constante de módulo y React saltea su re-render por identidad referencial.
 * Sale más barato que `React.memo` y sin ceremonia.
 *
 * Toda la textura que no es el grano va con formas y degradados planos: se
 * rasterizan una vez y después cuestan cero. El único filtro caro de la
 * pantalla —el ruido del papel— se aplica una sola vez, arriba de todo, y lo
 * pone `MapaUruguay`.
 */

import { GRADUACION, HOJA, MARCO_EXTERNO, MARCO_INTERNO } from "./lienzo";

/**
 * Las manchas del papel. A mano, pocas y grandes: cinco elipses gastadas se
 * leen como papel viejo, y veinte manchitas se leen como suciedad de pantalla.
 * Van en unidades del lienzo, así que se mueven con el mapa.
 */
const MANCHAS: { cx: number; cy: number; rx: number; ry: number; giro: number; o: number }[] = [
  { cx: 120, cy: 180, rx: 78, ry: 52, giro: -18, o: 0.09 },
  { cx: 880, cy: 640, rx: 96, ry: 60, giro: 24, o: 0.07 },
  { cx: 300, cy: 1020, rx: 70, ry: 44, giro: 8, o: 0.08 },
  { cx: 700, cy: 120, rx: 54, ry: 40, giro: -6, o: 0.06 },
  { cx: 40, cy: 700, rx: 46, ry: 74, giro: 12, o: 0.07 },
];

export function Pergamino() {
  return (
    <g className="pointer-events-none">
      {/* La sombra sobre la mesa: la misma hoja, corrida abajo y a la derecha,
          porque la luz del boliche cae de arriba a la izquierda. Es lo que hace
          que el papel se lea APOYADO y no pintado sobre el fondo. */}
      <path d={HOJA} fill="#050302" opacity={0.55} transform="translate(4, 5)" />

      {/* La hoja */}
      <path d={HOJA} fill="var(--color-pergamino)" />

      {/* Envejecido de los bordes: el centro queda limpio y las orillas se van
          quemando. Un degradado, no un filtro. */}
      <path d={HOJA} fill="url(#envejecido)" />

      {/* Manchas de años de boliche */}
      {MANCHAS.map((m, i) => (
        <ellipse
          key={i}
          cx={m.cx}
          cy={m.cy}
          rx={m.rx}
          ry={m.ry}
          fill="var(--color-pergamino-sombra)"
          opacity={m.o}
          transform={`rotate(${m.giro} ${m.cx} ${m.cy})`}
        />
      ))}

      {/* El cerco que deja el mate apoyado. Es un anillo, no un disco: el mate
          moja el borde de la base y el centro queda seco. */}
      <circle
        cx={906}
        cy={996}
        r={44}
        fill="none"
        stroke="var(--color-quemado)"
        strokeWidth={7}
        opacity={0.22}
      />
      <circle cx={906} cy={996} r={44} fill="var(--color-quemado)" opacity={0.05} />

      {/* El marco graduado, en el anillo que ya estaba vacío entre el papel y
          el agua. Filete doble con la graduación adentro. */}
      <g fill="none" stroke="var(--color-tinta-mapa)" opacity={0.7}>
        <rect {...MARCO_EXTERNO} strokeWidth={2.6} />
        <rect {...MARCO_INTERNO} strokeWidth={1.4} />
        <path d={GRADUACION} strokeWidth={1.4} />
      </g>
    </g>
  );
}
