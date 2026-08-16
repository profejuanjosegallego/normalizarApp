"use client";

import { useMemo } from "react";
import type { Cardinalidad, Entidad, Relacion } from "@/lib/tipos";

/**
 * Diagrama conceptual de entidades y relaciones, en notacion Chen: las
 * entidades son rectangulos y las relaciones rombos, con la cardinalidad
 * anotada a cada lado.
 *
 * Es el diagrama del paso 1, anterior a las tablas. El de tablas y claves
 * foraneas es `DiagramaER`.
 */

const ALTO_CAJA = 48;
const ALTO_ROMBO = 50;
const MARGEN = 60;
/** Aire minimo entre figuras al separarlas. */
const HOLGURA = 14;

/** Ancho aproximado del texto para dimensionar las figuras sin medir el DOM. */
function anchoCaja(nombre: string): number {
  return Math.max(124, Math.min(230, Math.round(nombre.length * 8.2) + 32));
}

function anchoRombo(texto: string): number {
  return Math.max(96, Math.min(210, Math.round(texto.length * 6.4) + 44));
}

/** Marcas de cada extremo: "1:N" pone 1 en el origen y N en el destino. */
const EXTREMOS: Record<Cardinalidad, [string, string]> = {
  "1:1": ["1", "1"],
  "1:N": ["1", "N"],
  "N:1": ["N", "1"],
  "N:M": ["N", "M"],
};

type Punto = { x: number; y: number };
type Figura = Punto & { ancho: number; alto: number };

/** Punto donde el segmento hacia `destino` sale del rectangulo centrado en `centro`. */
function borde(centro: Figura, destino: Punto): Punto {
  const dx = destino.x - centro.x;
  const dy = destino.y - centro.y;
  if (dx === 0 && dy === 0) return centro;
  const escalaX = dx === 0 ? Infinity : centro.ancho / 2 / Math.abs(dx);
  const escalaY = dy === 0 ? Infinity : centro.alto / 2 / Math.abs(dy);
  const escala = Math.min(escalaX, escalaY);
  return { x: centro.x + dx * escala, y: centro.y + dy * escala };
}

/** Punto a `distancia` del inicio, sobre el segmento inicio→fin. */
function sobreSegmento(inicio: Punto, fin: Punto, fraccion: number): Punto {
  return {
    x: inicio.x + (fin.x - inicio.x) * fraccion,
    y: inicio.y + (fin.y - inicio.y) * fraccion,
  };
}

/**
 * Aparta los rombos que quedaron encimados.
 *
 * Con las entidades repartidas en un circulo, dos relaciones entre pares
 * opuestos cruzan por el centro y sus rombos caen en el mismo punto. Se empujan
 * unos con otros (y lejos de las cajas) hasta que dejan de solaparse; como cada
 * relacion se dibuja en dos tramos, entidad→rombo→entidad, mover el rombo no
 * desconecta nada.
 */
function separar(rombos: Figura[], cajas: Figura[]): void {
  const solape = (a: Figura, b: Figura) => {
    const anchoMin = (a.ancho + b.ancho) / 2 + HOLGURA;
    const altoMin = (a.alto + b.alto) / 2 + HOLGURA;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const nx = dx / anchoMin;
    const ny = dy / altoMin;
    const distancia = Math.hypot(nx, ny);
    if (distancia >= 1) return null;
    // Direccion de escape; si coinciden exactamente, se separan en horizontal.
    const dir = distancia < 0.001 ? { x: 1, y: 0 } : { x: nx / distancia, y: ny / distancia };
    const empuje = (1 - distancia) / 2;
    return { x: dir.x * empuje * anchoMin, y: dir.y * empuje * altoMin };
  };

  for (let pasada = 0; pasada < 40; pasada += 1) {
    let movio = false;

    for (let i = 0; i < rombos.length; i += 1) {
      for (let j = i + 1; j < rombos.length; j += 1) {
        const ajuste = solape(rombos[i], rombos[j]);
        if (!ajuste) continue;
        rombos[i].x -= ajuste.x;
        rombos[i].y -= ajuste.y;
        rombos[j].x += ajuste.x;
        rombos[j].y += ajuste.y;
        movio = true;
      }
    }

    // Las cajas no se mueven: solo apartan al rombo.
    for (const rombo of rombos) {
      for (const caja of cajas) {
        const ajuste = solape(rombo, caja);
        if (!ajuste) continue;
        rombo.x -= ajuste.x * 2;
        rombo.y -= ajuste.y * 2;
        movio = true;
      }
    }

    if (!movio) break;
  }
}

function recortar(texto: string, max: number): string {
  return texto.length <= max ? texto : `${texto.slice(0, max - 1)}…`;
}

type Props = {
  entidades: Entidad[];
  relaciones: Relacion[];
  /** Se usa para exportar el diagrama a PNG. */
  ref?: React.Ref<SVGSVGElement>;
};

export default function DiagramaEntidades({ entidades, relaciones, ref }: Props) {
  const disposicion = useMemo(() => {
    const cajas = new Map<string, Figura & { nombre: string }>();

    const nombres = entidades.map((e) => e.nombre.trim() || "(sin nombre)");
    const anchoMayor = nombres.reduce((m, n) => Math.max(m, anchoCaja(n)), 140);
    // Las entidades se reparten en un circulo: es la forma que menos cruces
    // produce cuando cada una se relaciona con varias.
    const radio = Math.max(215, Math.round((entidades.length * (anchoMayor + 110)) / (2 * Math.PI)));
    const centro = radio + anchoMayor / 2 + MARGEN;

    entidades.forEach((e, i) => {
      const nombre = nombres[i];
      // Se arranca arriba (-90°) para que la primera quede en la cabecera.
      const angulo = (i / Math.max(1, entidades.length)) * Math.PI * 2 - Math.PI / 2;
      cajas.set(e.id, {
        nombre,
        ancho: anchoCaja(nombre),
        alto: ALTO_CAJA,
        x: entidades.length === 1 ? centro : centro + Math.cos(angulo) * radio,
        y: entidades.length === 1 ? centro : centro + Math.sin(angulo) * radio,
      });
    });

    const validas = relaciones.filter((r) => cajas.has(r.origenId) && cajas.has(r.destinoId));

    const rombos: Figura[] = validas.map((r, i) => {
      const a = cajas.get(r.origenId)!;
      const b = cajas.get(r.destinoId)!;
      const etiqueta = recortar(r.descripcion.trim() || "se relaciona con", 26);
      const ancho = anchoRombo(etiqueta);

      if (r.origenId === r.destinoId) {
        return { x: a.x, y: a.y - ALTO_CAJA / 2 - 72, ancho, alto: ALTO_ROMBO };
      }

      // Las relaciones entre entidades opuestas del circulo tienen su punto
      // medio justo en el centro, todas encima. Se abren en abanico segun el
      // orden en que el estudiante las creo, perpendicular a su propia linea,
      // para que la separacion posterior tenga por donde empezar.
      const largo = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const perpX = -(b.y - a.y) / largo;
      const perpY = (b.x - a.x) / largo;
      const abanico = (i - (validas.length - 1) / 2) * 46;

      return {
        x: (a.x + b.x) / 2 + perpX * abanico,
        y: (a.y + b.y) / 2 + perpY * abanico,
        ancho,
        alto: ALTO_ROMBO,
      };
    });

    separar(rombos, [...cajas.values()]);

    // El lienzo se ajusta a lo que haya quedado dibujado.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const f of [...cajas.values(), ...rombos]) {
      minX = Math.min(minX, f.x - f.ancho / 2);
      minY = Math.min(minY, f.y - f.alto / 2);
      maxX = Math.max(maxX, f.x + f.ancho / 2);
      maxY = Math.max(maxY, f.y + f.alto / 2);
    }
    const desplazarX = MARGEN - minX;
    const desplazarY = MARGEN - minY;
    for (const f of [...cajas.values(), ...rombos]) {
      f.x += desplazarX;
      f.y += desplazarY;
    }

    return {
      cajas,
      rombos,
      validas,
      ancho: Math.max(420, Math.round(maxX - minX + MARGEN * 2)),
      alto: Math.max(300, Math.round(maxY - minY + MARGEN * 2)),
    };
  }, [entidades, relaciones]);

  if (entidades.length === 0) {
    return (
      <p className="suave py-10 text-center text-sm">Todavia no hay entidades que diagramar.</p>
    );
  }

  const { cajas, rombos, validas, ancho, alto } = disposicion;

  return (
    <div
      className="tarjeta-plana lienzo-diagrama overflow-auto"
      style={{ background: "var(--superficie)" }}
    >
      <svg
        ref={ref}
        width="100%"
        viewBox={`0 0 ${ancho} ${alto}`}
        style={{ maxHeight: "70vh", display: "block" }}
        role="img"
        aria-label="Diagrama conceptual de entidades y relaciones"
      >
        {validas.map((r, i) => {
          const origen = cajas.get(r.origenId)!;
          const destino = cajas.get(r.destinoId)!;
          const rombo = rombos[i];
          const [marcaOrigen, marcaDestino] = EXTREMOS[r.cardinalidad];

          // Cada relacion se traza en dos tramos que se encuentran en el rombo.
          const puntaOrigen = borde(origen, rombo);
          const puntaDestino = borde(destino, rombo);
          const propia = r.origenId === r.destinoId;

          return (
            <g key={r.id}>
              <line
                x1={puntaOrigen.x}
                y1={puntaOrigen.y}
                x2={rombo.x}
                y2={rombo.y}
                stroke="var(--borde-fuerte)"
                strokeWidth="1.5"
              />
              {!propia ? (
                <line
                  x1={puntaDestino.x}
                  y1={puntaDestino.y}
                  x2={rombo.x}
                  y2={rombo.y}
                  stroke="var(--borde-fuerte)"
                  strokeWidth="1.5"
                />
              ) : null}
              <Marca punto={sobreSegmento(puntaOrigen, rombo, 0.42)} texto={marcaOrigen} />
              {!propia ? (
                <Marca punto={sobreSegmento(puntaDestino, rombo, 0.42)} texto={marcaDestino} />
              ) : null}
            </g>
          );
        })}

        {/* Los rombos van sobre las lineas para tapar los extremos. */}
        {validas.map((r, i) => (
          <Rombo
            key={r.id}
            figura={rombos[i]}
            texto={recortar(r.descripcion.trim() || "se relaciona con", 26)}
          />
        ))}

        {[...cajas.entries()].map(([id, caja]) => (
          <g key={id}>
            <rect
              x={caja.x - caja.ancho / 2}
              y={caja.y - caja.alto / 2}
              width={caja.ancho}
              height={caja.alto}
              rx="8"
              fill="var(--dg-principal)"
              stroke="var(--dg-principal)"
              strokeWidth="1.5"
            />
            <text
              x={caja.x}
              y={caja.y + 5}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="#ffffff"
              style={{ userSelect: "none" }}
            >
              {recortar(caja.nombre, 24)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Rombo({ figura, texto }: { figura: Figura; texto: string }) {
  const { x, y } = figura;
  const mitadX = figura.ancho / 2;
  const mitadY = figura.alto / 2;
  return (
    <g>
      <polygon
        points={`${x},${y - mitadY} ${x + mitadX},${y} ${x},${y + mitadY} ${x - mitadX},${y}`}
        fill="var(--superficie)"
        stroke="var(--borde-fuerte)"
        strokeWidth="1.5"
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize="10.5"
        fill="var(--texto)"
        style={{ userSelect: "none" }}
      >
        {texto}
      </text>
    </g>
  );
}

/** Cardinalidad sobre la linea, con un disco detras para que se lea. */
function Marca({ punto, texto }: { punto: Punto; texto: string }) {
  return (
    <g>
      <circle
        cx={punto.x}
        cy={punto.y}
        r="11"
        fill="var(--superficie)"
        stroke="var(--borde)"
        strokeWidth="1"
      />
      <text
        x={punto.x}
        y={punto.y + 4}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="var(--acento)"
        style={{ userSelect: "none" }}
      >
        {texto}
      </text>
    </g>
  );
}
