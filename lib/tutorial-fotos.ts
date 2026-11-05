/* ── generado por `node herramientas/generar-tutorial.mjs`: no editar a mano ──
   Las fotos de `public/tutorial/` y dónde quedó cada cosa en ellas, en px CSS
   de la pantalla en que se sacaron (`ancho` × `alto`). Si la mesa cambia, se
   vuelve a correr la herramienta; `herramientas/mirar-tutorial.mjs` avisa si
   las fotos quedaron viejas. */

export type ZonaTutorial = { x: number; y: number; w: number; h: number };
export type FotoTutorial = {
  src: string;
  ancho: number;
  alto: number;
  zonas: Partial<Record<string, ZonaTutorial>>;
};
export type FotosTutorial = Record<"celular" | "pc", { semilla: number; a: FotoTutorial; b: FotoTutorial }>;

export const FOTOS_TUTORIAL: FotosTutorial = /* JSON */ {
  "celular": {
    "semilla": 1,
    "a": {
      "src": "/tutorial/celular-a.webp",
      "ancho": 360,
      "alto": 780,
      "zonas": {
        "mano": {
          "x": 70,
          "y": 575,
          "w": 220,
          "h": 149
        },
        "muestra": {
          "x": 23,
          "y": 321,
          "w": 74,
          "h": 81
        },
        "cantos": {
          "x": 0,
          "y": 734,
          "w": 360,
          "h": 46
        },
        "rival": {
          "x": 29,
          "y": 45,
          "w": 325,
          "h": 227
        },
        "medallon": {
          "x": 205,
          "y": 51,
          "w": 149,
          "h": 56
        },
        "responder": {
          "x": 0,
          "y": 734,
          "w": 360,
          "h": 46
        },
        "marcador": {
          "x": 104,
          "y": 2,
          "w": 157,
          "h": 40
        },
        "ayudas": {
          "x": 303,
          "y": 5,
          "w": 49,
          "h": 34
        },
        "salir": {
          "x": 8,
          "y": 10,
          "w": 54,
          "h": 25
        }
      }
    },
    "b": {
      "src": "/tutorial/celular-b.webp",
      "ancho": 360,
      "alto": 780,
      "zonas": {
        "mano": {
          "x": 93,
          "y": 575,
          "w": 173,
          "h": 143
        },
        "muestra": {
          "x": 23,
          "y": 321,
          "w": 74,
          "h": 81
        },
        "cantos": {
          "x": 0,
          "y": 734,
          "w": 360,
          "h": 46
        },
        "rival": {
          "x": 29,
          "y": 45,
          "w": 325,
          "h": 227
        },
        "medallon": {
          "x": 205,
          "y": 51,
          "w": 149,
          "h": 56
        },
        "globo": {
          "x": 287,
          "y": 163,
          "w": 67,
          "h": 28
        },
        "responder": {
          "x": 0,
          "y": 678,
          "w": 360,
          "h": 102
        },
        "historial": {
          "x": 237,
          "y": 132,
          "w": 117,
          "h": 29
        },
        "mio": {
          "x": 6,
          "y": 550,
          "w": 31,
          "h": 28
        },
        "marcador": {
          "x": 104,
          "y": 2,
          "w": 157,
          "h": 40
        },
        "ayudas": {
          "x": 303,
          "y": 5,
          "w": 49,
          "h": 34
        },
        "salir": {
          "x": 8,
          "y": 10,
          "w": 54,
          "h": 25
        }
      }
    }
  },
  "pc": {
    "semilla": 1,
    "a": {
      "src": "/tutorial/pc-a.webp",
      "ancho": 1366,
      "alto": 768,
      "zonas": {
        "mano": {
          "x": 497,
          "y": 484,
          "w": 371,
          "h": 219
        },
        "muestra": {
          "x": 209,
          "y": 225,
          "w": 159,
          "h": 173
        },
        "cantos": {
          "x": 303,
          "y": 722,
          "w": 760,
          "h": 46
        },
        "rival": {
          "x": 536,
          "y": 50,
          "w": 731,
          "h": 221
        },
        "medallon": {
          "x": 1086,
          "y": 56,
          "w": 181,
          "h": 68
        },
        "responder": {
          "x": 303,
          "y": 722,
          "w": 760,
          "h": 46
        },
        "marcador": {
          "x": 601,
          "y": 2,
          "w": 170,
          "h": 45
        },
        "ayudas": {
          "x": 1309,
          "y": 8,
          "w": 49,
          "h": 34
        },
        "salir": {
          "x": 8,
          "y": 12,
          "w": 54,
          "h": 25
        }
      }
    },
    "b": {
      "src": "/tutorial/pc-b.webp",
      "ancho": 1366,
      "alto": 768,
      "zonas": {
        "mano": {
          "x": 560,
          "y": 484,
          "w": 247,
          "h": 212
        },
        "muestra": {
          "x": 209,
          "y": 225,
          "w": 159,
          "h": 173
        },
        "cantos": {
          "x": 303,
          "y": 722,
          "w": 760,
          "h": 46
        },
        "rival": {
          "x": 536,
          "y": 50,
          "w": 731,
          "h": 221
        },
        "medallon": {
          "x": 1086,
          "y": 56,
          "w": 181,
          "h": 68
        },
        "globo": {
          "x": 1197,
          "y": 182,
          "w": 70,
          "h": 28
        },
        "responder": {
          "x": 303,
          "y": 666,
          "w": 760,
          "h": 102
        },
        "historial": {
          "x": 1150,
          "y": 151,
          "w": 117,
          "h": 29
        },
        "mio": {
          "x": 99,
          "y": 457,
          "w": 31,
          "h": 28
        },
        "marcador": {
          "x": 601,
          "y": 2,
          "w": 170,
          "h": 45
        },
        "ayudas": {
          "x": 1309,
          "y": 8,
          "w": 49,
          "h": 34
        },
        "salir": {
          "x": 8,
          "y": 12,
          "w": 54,
          "h": 25
        }
      }
    }
  }
} /* fin */;
