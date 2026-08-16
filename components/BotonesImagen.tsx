"use client";

import { useRef, useState } from "react";
import { descargarSVGPNG, descargarTablasPNG, nombrePNG } from "@/lib/imagen";
import type { Trabajo } from "@/lib/tipos";
import DiagramaER from "./DiagramaER";
import DiagramaEntidades from "./DiagramaEntidades";

/**
 * Botones para llevarse el resultado de un paso como imagen y pegarlo en el
 * informe.
 *
 * Los diagramas se rasterizan desde un SVG, asi que se renderiza una copia
 * fuera de pantalla: la del visor lleva aplicado el zoom del estudiante y
 * puede no estar montada en ese momento.
 */

type Props = {
  trabajo: Trabajo;
  /** Titulo que va impreso en la imagen: "2FN · Segunda forma normal". */
  paso: string;
  /** Parte del nombre del archivo: "2fn". */
  clave: string;
  /** `entidades` exporta el diagrama conceptual; `modelo`, las tablas y el E-R. */
  variante: "entidades" | "modelo";
};

export default function BotonesImagen({ trabajo, paso, clave, variante }: Props) {
  const oculto = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  const subtitulo = [
    trabajo.ejercicio.titulo,
    trabajo.estudiante.nombre || "sin nombre",
    new Date().toLocaleDateString("es"),
  ]
    .filter(Boolean)
    .join("  ·  ");

  const base = [clave, trabajo.ejercicio.titulo, trabajo.estudiante.codigo];

  function exportarTablas() {
    setError("");
    descargarTablasPNG({
      modelo: trabajo.modelo,
      titulo: paso,
      subtitulo,
      nombreArchivo: nombrePNG([...base, "tablas"]),
    });
  }

  async function exportarDiagrama() {
    setError("");
    const svg = oculto.current?.querySelector("svg");
    if (!svg) {
      setError("No se pudo preparar el diagrama.");
      return;
    }
    try {
      await descargarSVGPNG(svg as SVGSVGElement, {
        titulo: paso,
        subtitulo,
        nombreArchivo: nombrePNG([...base, "diagrama"]),
      });
    } catch {
      setError("No se pudo generar la imagen del diagrama en este navegador.");
    }
  }

  const hayQueExportar =
    variante === "entidades" ? trabajo.entidades.length > 0 : trabajo.modelo.length > 0;

  return (
    <div className="no-imprimir">
      <div className="flex flex-wrap items-center gap-2">
        {variante === "modelo" ? (
          <button
            type="button"
            className="btn btn-mini"
            onClick={exportarTablas}
            disabled={!hayQueExportar}
            title="Las tablas con sus registros, tal como están en este paso"
          >
            ↓ Tablas (PNG)
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-mini"
          onClick={exportarDiagrama}
          disabled={!hayQueExportar}
          title={
            variante === "entidades"
              ? "Diagrama entidad-relación conceptual"
              : "Diagrama de tablas y claves foráneas"
          }
        >
          ↓ Diagrama (PNG)
        </button>
        {error ? (
          <span className="text-xs" style={{ color: "var(--error)" }}>
            {error}
          </span>
        ) : null}
      </div>

      {/* Copia fuera de pantalla, solo para rasterizar. */}
      <div
        ref={oculto}
        aria-hidden
        style={{
          position: "absolute",
          left: "-100000px",
          top: 0,
          width: 1200,
          pointerEvents: "none",
        }}
      >
        {variante === "entidades" ? (
          <DiagramaEntidades entidades={trabajo.entidades} relaciones={trabajo.relaciones} />
        ) : (
          <DiagramaER modelo={trabajo.modelo} posiciones={trabajo.posiciones} />
        )}
      </div>
    </div>
  );
}
