import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jugar contra el bot",
  description:
    "Practicá truco uruguayo mano a mano contra un bot, con la muestra, las piezas, el envido, la flor y el truco. Gratis y sin registro.",
};

export default function LayoutJugar({ children }: { children: React.ReactNode }) {
  return children;
}
