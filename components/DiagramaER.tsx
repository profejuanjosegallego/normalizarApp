"use client";

import { useId, useMemo, useRef, useState } from "react";
import { columnasPK } from "@/lib/modelo";
import type { Posicion, Tabla } from "@/lib/tipos";

const ANCHO = 208;
const ALTO_TITULO = 30;
const ALTO_FILA = 19;
const RELLENO = 6;
const MARGEN = 40;
const SEPARACION_X = 268;
const SEPARACION_Y = 60;

function altoDe(tabla: Tabla): number {
  return ALTO_TITULO + tabla.columnas.length * ALTO_FILA + RELLENO;
}

function recortar(texto: string, max: number): string {
  return texto.length <= max ? texto : `${texto.slice(0, max - 1)}…`;
}

const COLOR_TITULO: Record<Tabla["tipo"], string> = {
  principal: "var(--dg-principal)",
  derivada: "var(--dg-derivada)",
  puente: "var(--dg-puente)",
};

/**
 * Distribucion automatica por capas: primero las tablas que nadie referencia
 * hacia la izquierda, y a la derecha las que dependen de ellas.
 */
function distribuir(modelo: Tabla[]): Record<string, Posicion> {
  const nivel = new Map<string, number>();

  // Un par de pasadas bastan para modelos de taller y evitan ciclos infinitos.
  for (const t of modelo) nivel.set(t.id, 0);
  for (let pasada = 0; pasada < modelo.length; pasada += 1) {
    let cambio = false;
    for (const t of modelo) {
      const referencias = t.columnas
        .filter((c) => c.esFK && c.refTablaId && c.refTablaId !== t.id)
        .map((c) => nivel.get(c.refTablaId as string) ?? 0);
      const propuesto = referencias.length ? Math.max(...referencias) + 1 : 0;
      if (propuesto > (nivel.get(t.id) ?? 0) && propuesto < modelo.length) {
        nivel.set(t.id, propuesto);
        cambio = true;
      }
    }
    if (!cambio) break;
  }

  const porNivel = new Map<number, Tabla[]>();
  for (const t of modelo) {
    const n = nivel.get(t.id) ?? 0;
    porNivel.set(n, [...(porNivel.get(n) ?? []), t]);
  }

  const posiciones: Record<string, Posicion> = {};
  for (const [n, tablas] of porNivel) {
    let y = MARGEN;
    for (const t of tablas) {
      posiciones[t.id] = { x: MARGEN + n * SEPARACION_X, y };
      y += altoDe(t) + SEPARACION_Y;
    }
  }
  return posiciones;
}

type Props = {
  modelo: Tabla[];
  posiciones: Record<string, Posicion>;
  /** Ausente = diagrama de solo lectura (no se puede arrastrar). */
  onMover?: (tablaId: string, posicion: Posicion) => void;
  onReorganizar?: (posiciones: Record<string, Posicion>) => void;
  altoMaximo?: string;
};

export default function DiagramaER({
  modelo,
  posiciones,
  onMover,
  onReorganizar,
  altoMaximo = "70vh",
}: Props) {
  const svg = useRef<SVGSVGElement>(null);
  // El diagrama puede estar en pantalla dos veces (pagina y modal): el patron
  // necesita un id propio en cada instancia.
  const idCuadricula = `cuadricula-${useId().replace(/:/g, "")}`;
  const [zoom, setZoom] = useState(1);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  // La posicion en curso vive local para que arrastrar no reescriba el trabajo
  // en cada movimiento del puntero; solo se confirma al soltar.
  const [enCurso, setEnCurso] = useState<Posicion | null>(null);
  const desfase = useRef<Posicion>({ x: 0, y: 0 });

  const automaticas = useMemo(() => distribuir(modelo), [modelo]);
  const posicionDe = (t: Tabla): Posicion => {
    if (arrastrando === t.id && enCurso) return enCurso;
    return posiciones[t.id] ?? automaticas[t.id] ?? { x: MARGEN, y: MARGEN };
  };

  // Barato de recalcular en cada render y asi el lienzo crece mientras arrastras.
  let maxX = 0;
  let maxY = 0;
  for (const t of modelo) {
    const p = posicionDe(t);
    maxX = Math.max(maxX, p.x + ANCHO);
    maxY = Math.max(maxY, p.y + altoDe(t));
  }
  const ancho = Math.max(maxX + MARGEN, 480);
  const alto = Math.max(maxY + MARGEN, 320);

  /** Convierte coordenadas de pantalla a coordenadas internas del SVG. */
  function aCoordenadasSVG(e: React.PointerEvent): Posicion {
    const matriz = svg.current?.getScreenCTM();
    if (!matriz) return { x: 0, y: 0 };
    const punto = svg.current!.createSVGPoint();
    punto.x = e.clientX;
    punto.y = e.clientY;
    const convertido = punto.matrixTransform(matriz.inverse());
    return { x: convertido.x, y: convertido.y };
  }

  function iniciarArrastre(e: React.PointerEvent, tabla: Tabla) {
    if (!onMover) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const cursor = aCoordenadasSVG(e);
    const actual = posicionDe(tabla);
    desfase.current = { x: cursor.x - actual.x, y: cursor.y - actual.y };
    setArrastrando(tabla.id);
    setEnCurso(actual);
  }

  function moverArrastre(e: React.PointerEvent) {
    if (!arrastrando || !onMover) return;
    const cursor = aCoordenadasSVG(e);
    setEnCurso({
      x: Math.max(0, Math.round(cursor.x - desfase.current.x)),
      y: Math.max(0, Math.round(cursor.y - desfase.current.y)),
    });
  }

  function terminarArrastre(e: React.PointerEvent) {
    if (arrastrando) {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      if (enCurso && onMover) onMover(arrastrando, enCurso);
    }
    setArrastrando(null);
    setEnCurso(null);
  }

  // Una linea por cada clave foranea: del lado "muchos" (FK) al lado "uno" (PK).
  const conexiones = modelo.flatMap((origen) =>
    origen.columnas
      .map((col, indice) => {
        if (!col.esFK || !col.refTablaId) return null;
        const destino = modelo.find((t) => t.id === col.refTablaId);
        if (!destino || destino.id === origen.id) return null;
        const pk = columnasPK(destino)[0];
        const filaPK = pk ? destino.columnas.findIndex((c) => c.id === pk.id) : 0;
        return { origen, destino, indice, filaPK, clave: `${origen.id}-${col.id}` };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  );

  if (modelo.length === 0) {
    return (
      <p className="suave py-10 text-center text-sm">
        Todavia no hay tablas que diagramar.
      </p>
    );
  }

  return (
    <div>
      <div className="no-imprimir mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-mini"
          onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
        >
          −
        </button>
        <span className="suave w-12 text-center text-xs font-semibold">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="btn btn-mini"
          onClick={() => setZoom((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
        >
          +
        </button>
        <button type="button" className="btn btn-mini" onClick={() => setZoom(1)}>
          100%
        </button>
        {onReorganizar ? (
          <button
            type="button"
            className="btn btn-mini"
            onClick={() => onReorganizar(distribuir(modelo))}
          >
            Reorganizar
          </button>
        ) : null}
        {onMover ? (
          <span className="suave ml-auto text-xs">Arrastra las tablas para acomodarlas</span>
        ) : null}
      </div>

      <div
        className="tarjeta-plana lienzo-diagrama overflow-auto"
        style={{ maxHeight: altoMaximo, background: "var(--superficie)" }}
      >
        <svg
          ref={svg}
          width={ancho * zoom}
          height={alto * zoom}
          viewBox={`0 0 ${ancho} ${alto}`}
          onPointerMove={moverArrastre}
          onPointerUp={terminarArrastre}
          onPointerCancel={terminarArrastre}
          role="img"
          aria-label="Diagrama entidad-relacion del modelo"
        >
          <defs>
            <pattern id={idCuadricula} width="24" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="var(--borde)"
                strokeWidth="0.5"
                opacity="0.5"
              />
            </pattern>
          </defs>
          <rect width={ancho} height={alto} fill={`url(#${idCuadricula})`} />

          {conexiones.map(({ origen, destino, indice, filaPK, clave }) => {
            const po = posicionDe(origen);
            const pd = posicionDe(destino);
            const yo = po.y + ALTO_TITULO + indice * ALTO_FILA + ALTO_FILA / 2;
            const yd = pd.y + ALTO_TITULO + filaPK * ALTO_FILA + ALTO_FILA / 2;
            const destinoALaDerecha = pd.x + ANCHO / 2 > po.x + ANCHO / 2;
            const xo = destinoALaDerecha ? po.x + ANCHO : po.x;
            const xd = destinoALaDerecha ? pd.x : pd.x + ANCHO;
            const salida = destinoALaDerecha ? 1 : -1;
            const medio = (xo + xd) / 2;

            return (
              <g key={clave} style={{ pointerEvents: "none" }}>
                <path
                  d={`M ${xo} ${yo} H ${medio} V ${yd} H ${xd}`}
                  fill="none"
                  stroke="var(--borde-fuerte)"
                  strokeWidth="1.5"
                />
                {/* Pata de gallo en el lado "muchos" (la tabla con la FK) */}
                <path
                  d={`M ${xo + salida * 10} ${yo - 5} L ${xo} ${yo} L ${xo + salida * 10} ${yo + 5} M ${xo} ${yo} L ${xo + salida * 10} ${yo}`}
                  fill="none"
                  stroke="var(--borde-fuerte)"
                  strokeWidth="1.5"
                />
                {/* Barra del lado "uno" (la tabla referenciada) */}
                <line
                  x1={xd - salida * 8}
                  y1={yd - 5}
                  x2={xd - salida * 8}
                  y2={yd + 5}
                  stroke="var(--borde-fuerte)"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}

          {modelo.map((tabla) => {
            const p = posicionDe(tabla);
            const h = altoDe(tabla);
            const activa = arrastrando === tabla.id;
            return (
              <g
                key={tabla.id}
                transform={`translate(${p.x}, ${p.y})`}
                style={{ cursor: onMover ? (activa ? "grabbing" : "grab") : "default" }}
              >
                <rect
                  width={ANCHO}
                  height={h}
                  rx="8"
                  fill="var(--superficie)"
                  stroke={activa ? "var(--acento)" : "var(--borde-fuerte)"}
                  strokeWidth={activa ? 2 : 1}
                />
                <path
                  d={`M 0 8 A 8 8 0 0 1 8 0 H ${ANCHO - 8} A 8 8 0 0 1 ${ANCHO} 8 V ${ALTO_TITULO} H 0 Z`}
                  fill={COLOR_TITULO[tabla.tipo]}
                  onPointerDown={(e) => iniciarArrastre(e, tabla)}
                />
                <text
                  x={10}
                  y={ALTO_TITULO / 2 + 4}
                  fill="#fff"
                  fontSize="12"
                  fontWeight="700"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {recortar(tabla.nombre, 22)}
                </text>
                {tabla.tipo !== "principal" ? (
                  <text
                    x={ANCHO - 8}
                    y={ALTO_TITULO / 2 + 3}
                    fill="#fff"
                    fontSize="8"
                    fontWeight="700"
                    textAnchor="end"
                    opacity="0.85"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {tabla.tipo === "puente" ? "PUENTE" : "DERIVADA"}
                  </text>
                ) : null}

                {tabla.columnas.map((col, i) => {
                  const y = ALTO_TITULO + i * ALTO_FILA;
                  return (
                    <g key={col.id} style={{ pointerEvents: "none" }}>
                      {i % 2 === 1 ? (
                        <rect
                          x="1"
                          y={y}
                          width={ANCHO - 2}
                          height={ALTO_FILA}
                          fill="var(--superficie-2)"
                        />
                      ) : null}
                      <text
                        x={10}
                        y={y + ALTO_FILA - 6}
                        fontSize="10.5"
                        fill="var(--texto)"
                        fontWeight={col.esPK ? 700 : 400}
                        style={{ userSelect: "none" }}
                      >
                        {recortar(col.nombre, 24)}
                      </text>
                      {col.esPK || col.esFK ? (
                        <text
                          x={ANCHO - 8}
                          y={y + ALTO_FILA - 6}
                          fontSize="8.5"
                          fontWeight="700"
                          textAnchor="end"
                          fill={col.esPK ? "var(--alerta)" : "var(--acento)"}
                          style={{ userSelect: "none" }}
                        >
                          {col.esPK ? "PK" : "FK"}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="suave mt-2 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: COLOR_TITULO.principal }}
          />
          tabla principal
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: COLOR_TITULO.derivada }}
          />
          derivada de la normalizacion
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: COLOR_TITULO.puente }}
          />
          tabla de transicion
        </span>
        <span>La pata de gallo marca el lado “muchos”.</span>
      </div>
    </div>
  );
}
