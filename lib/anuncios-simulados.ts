/**
 * Una red de anuncios DE MENTIRA. Sólo para desarrollo.
 *
 * La usa `herramientas/mirar-anuncios.mjs` para recorrer en un navegador cada
 * regla de los anuncios —el tope entre anuncios, la ventana después de un video, el
 * anuncio que falla, el video cerrado antes de tiempo— sin teléfono y sin
 * esperar minutos de verdad (Playwright adelanta el reloj).
 *
 * NO VIAJA EN NINGÚN BUILD: `components/Anuncios.tsx` sólo la importa si
 * `NODE_ENV` no es "production", y los dos builds (web y app) lo son. Se
 * verifica buscando `__trucoAnunciosSimulados` en `out/` y `out-app/`.
 *
 * El "anuncio" es una capa negra con botones, armada con `textContent` y no
 * con HTML en texto: no hay ningún sumidero de HTML ni acá.
 *
 * Se controla con `window.__trucoAnunciosSimulados`:
 *   carga:   "ok" | "falla"              (default "ok")
 *   mostrar: "aparece" | "falla" | "nunca" (default "aparece")
 *   pidePrivacidad: boolean
 *   registro: string[]   ← acá se anota lo que pasó, para que la herramienta lo lea
 */

import type { EventoMotor, Formato, MotorAnuncios } from "./anuncios.ts";

interface Control {
  carga?: "ok" | "falla";
  mostrar?: "aparece" | "falla" | "nunca";
  pidePrivacidad?: boolean;
  registro?: string[];
}

export function crearMotorSimulado(): MotorAnuncios {
  const control = (): Control =>
    (window as unknown as { __trucoAnunciosSimulados?: Control }).__trucoAnunciosSimulados ?? {};
  const anotar = (que: string) => {
    const c = control();
    (c.registro ??= []).push(que);
  };
  let oyente: (e: EventoMotor) => void = () => {};

  function boton(texto: string, alTocar: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = texto;
    b.dataset.simulado = texto;
    b.style.cssText =
      "padding:12px 20px;margin:6px;font:600 16px system-ui;border-radius:6px;border:0;background:#e9c46a;color:#111;";
    b.addEventListener("click", alTocar);
    return b;
  }

  function dibujar(f: Formato): void {
    const capa = document.createElement("div");
    capa.dataset.simulado = f;
    capa.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font:16px system-ui;text-align:center;";
    const titulo = document.createElement("p");
    titulo.textContent = f === "video" ? "VIDEO DE PRUEBA (simulado)" : "ANUNCIO DE PRUEBA (simulado)";
    titulo.style.cssText = "font-size:20px;margin:0 0 16px;";
    capa.append(titulo);

    const cerrar = () => {
      capa.remove();
      anotar(`cerrado:${f}`);
      oyente({ tipo: "cerrado", formato: f });
    };
    if (f === "video") {
      capa.append(
        boton("Mirar hasta el final", () => {
          anotar("recompensa");
          oyente({ tipo: "recompensa" });
          cerrar();
        }),
        boton("Cerrar antes", cerrar),
      );
    } else {
      capa.append(boton("Cerrar anuncio", cerrar));
    }
    document.body.append(capa);
    anotar(`mostrado:${f}`);
    oyente({ tipo: "mostrado", formato: f });
  }

  return {
    async iniciar() {
      anotar("iniciar");
      return { puedePedir: true, pidePrivacidad: control().pidePrivacidad === true };
    },
    async cargar(f) {
      anotar(`cargar:${f}`);
      if (control().carga === "falla") throw new Error("sin fill (simulado)");
    },
    mostrar(f) {
      anotar(`mostrar:${f}`);
      const modo = control().mostrar ?? "aparece";
      if (modo === "falla") return Promise.reject(new Error("no había (simulado)"));
      if (modo === "aparece") queueMicrotask(() => dibujar(f));
      return new Promise(() => {});
    },
    alEvento(fn) {
      oyente = fn;
    },
    async abrirPrivacidad() {
      anotar("privacidad");
      return { puedePedir: true, pidePrivacidad: control().pidePrivacidad === true };
    },
  };
}
