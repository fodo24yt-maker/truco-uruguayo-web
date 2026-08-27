/**
 * La geometría del mapa del Uruguay: los 19 departamentos dibujados en SVG.
 *
 * Las formas son una silueta simplificada, hecha a mano sobre un lienzo de
 * 1000x1000. No es un mapa cartográfico exacto —para eso haría falta un archivo
 * de datos geográficos de varios megas— sino una interpretación reconocible,
 * como la de los mapas de tablero: cada departamento queda en su lugar, con su
 * vecino correcto al lado, y se distingue de un vistazo.
 *
 * El punto `centro` es donde va la chapita con el nombre.
 */

export interface Departamento {
  nombre: string;
  /** El contorno en coordenadas del lienzo de 1000x1000. */
  forma: string;
  /** Dónde se ancla la etiqueta. */
  centro: [number, number];
}

export const DEPARTAMENTOS: Departamento[] = [
  // ── Norte ──────────────────────────────────────────────────────────
  {
    nombre: "Artigas",
    forma: "M 250 108 L 300 78 L 372 70 L 447 96 L 470 140 L 452 176 L 372 190 L 292 178 L 250 148 Z",
    centro: [360, 132],
  },
  {
    nombre: "Salto",
    forma: "M 250 148 L 292 178 L 372 190 L 452 176 L 468 268 L 452 330 L 350 344 L 272 322 L 240 250 Z",
    centro: [356, 258],
  },
  {
    nombre: "Rivera",
    forma: "M 452 176 L 540 168 L 610 196 L 628 262 L 596 316 L 508 322 L 452 330 L 468 268 Z",
    centro: [538, 250],
  },
  {
    nombre: "Cerro Largo",
    forma: "M 610 196 L 686 232 L 728 306 L 736 396 L 690 434 L 616 424 L 588 366 L 596 316 L 628 262 Z",
    centro: [660, 330],
  },
  // ── Centro ─────────────────────────────────────────────────────────
  {
    nombre: "Paysandú",
    forma: "M 272 322 L 350 344 L 452 330 L 470 424 L 450 470 L 340 480 L 268 452 L 252 384 Z",
    centro: [360, 404],
  },
  {
    nombre: "Tacuarembó",
    forma: "M 452 330 L 508 322 L 596 316 L 588 366 L 616 424 L 592 486 L 500 500 L 450 470 L 470 424 Z",
    centro: [530, 412],
  },
  {
    nombre: "Río Negro",
    forma: "M 268 452 L 340 480 L 450 470 L 470 542 L 434 586 L 340 592 L 282 560 L 262 500 Z",
    centro: [366, 524],
  },
  {
    nombre: "Durazno",
    forma: "M 450 470 L 500 500 L 592 486 L 606 556 L 570 612 L 486 616 L 434 586 L 470 542 Z",
    centro: [520, 546],
  },
  {
    nombre: "Treinta y Tres",
    forma: "M 616 424 L 690 434 L 730 492 L 736 566 L 690 606 L 620 596 L 606 556 L 592 486 Z",
    centro: [668, 512],
  },
  // ── Sur ────────────────────────────────────────────────────────────
  {
    nombre: "Soriano",
    forma: "M 282 560 L 340 592 L 434 586 L 452 646 L 400 692 L 316 682 L 274 630 Z",
    centro: [364, 626],
  },
  {
    nombre: "Flores",
    forma: "M 434 586 L 486 616 L 528 654 L 500 700 L 442 704 L 400 692 L 452 646 Z",
    centro: [462, 654],
  },
  {
    nombre: "Florida",
    forma: "M 486 616 L 570 612 L 620 596 L 634 660 L 596 716 L 528 720 L 500 700 L 528 654 Z",
    centro: [566, 660],
  },
  {
    nombre: "Lavalleja",
    forma: "M 620 596 L 690 606 L 736 640 L 742 700 L 700 746 L 640 740 L 596 716 L 634 660 Z",
    centro: [676, 672],
  },
  {
    nombre: "Rocha",
    forma: "M 736 640 L 800 668 L 838 730 L 826 800 L 764 818 L 712 790 L 700 746 L 742 700 Z",
    centro: [772, 736],
  },
  {
    nombre: "Colonia",
    forma: "M 316 682 L 400 692 L 442 704 L 456 754 L 400 792 L 330 782 L 292 736 Z",
    centro: [378, 738],
  },
  {
    nombre: "San José",
    forma: "M 442 704 L 500 700 L 528 720 L 546 768 L 500 800 L 456 754 Z",
    centro: [494, 752],
  },
  {
    nombre: "Canelones",
    forma: "M 528 720 L 596 716 L 640 740 L 636 792 L 570 816 L 512 806 L 500 800 L 546 768 Z",
    centro: [572, 766],
  },
  {
    nombre: "Maldonado",
    forma: "M 640 740 L 700 746 L 712 790 L 764 818 L 706 848 L 648 826 L 636 792 Z",
    centro: [686, 792],
  },
  {
    nombre: "Montevideo",
    forma: "M 570 816 L 636 792 L 648 826 L 616 848 L 570 840 Z",
    centro: [606, 822],
  },
];

/** El Río de la Plata y el océano, para que el país no flote en el vacío. */
export const AGUA = {
  /** El Río de la Plata y el Atlántico, abajo y a la derecha. */
  rioDeLaPlata:
    "M 240 800 L 330 782 L 400 792 L 500 800 L 570 840 L 616 848 L 706 848 L 764 818 L 826 800 L 900 830 L 900 990 L 200 990 Z",
  /** El río Uruguay, todo el borde oeste. */
  rioUruguay:
    "M 240 250 L 252 384 L 262 500 L 274 630 L 292 736 L 240 800 L 150 780 L 150 120 L 250 108 Z",
};
