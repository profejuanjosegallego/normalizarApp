"use client";

import { useState } from "react";
import { nuevaColumna, nuevaFila } from "@/lib/modelo";
import type { Columna, Tabla } from "@/lib/tipos";

type Props = {
  tabla: Tabla;
  modelo: Tabla[];
  onCambio: (tabla: Tabla) => void;
  onEliminar?: () => void;
  /** Permite renombrar/agregar/quitar columnas y editar el nombre de la tabla. */
  editableEstructura?: boolean;
  soloLectura?: boolean;
  /** Permite marcar columnas como clave foranea y elegir la tabla referenciada. */
  permiteFK?: boolean;
  /** Valores iniciales de las columnas que se creen desde este editor. */
  columnaNueva?: Partial<Columna>;
  /** Controles propios del paso, debajo del nombre de cada columna. */
  encabezadoExtra?: (col: Columna) => React.ReactNode;
  /** Color de fondo del encabezado para resaltar columnas segun el paso. */
  colorEncabezado?: (col: Columna) => string | undefined;
  /** Contenido opcional bajo el nombre de la tabla. */
  pie?: React.ReactNode;
};

const TIPOS_SUGERIDOS = [
  "INT",
  "VARCHAR(50)",
  "VARCHAR(100)",
  "VARCHAR(255)",
  "DATE",
  "DATETIME",
  "DECIMAL(10,2)",
  "BOOLEAN",
  "TEXT",
];

export default function EditorTabla({
  tabla,
  modelo,
  onCambio,
  onEliminar,
  editableEstructura = false,
  soloLectura = false,
  permiteFK = false,
  columnaNueva,
  encabezadoExtra,
  colorEncabezado,
  pie,
}: Props) {
  // Reordenar columnas arrastrando el asa del encabezado. `sobre` marca la
  // columna donde se soltaria, para pintar la guia.
  const [arrastrada, setArrastrada] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  const reordenable = editableEstructura && !soloLectura && tabla.columnas.length > 1;

  function moverColumna(desde: number, hasta: number) {
    if (desde === hasta || desde < 0 || hasta < 0) return;
    if (desde >= tabla.columnas.length || hasta >= tabla.columnas.length) return;
    const columnas = [...tabla.columnas];
    const [movida] = columnas.splice(desde, 1);
    columnas.splice(hasta, 0, movida);
    onCambio({ ...tabla, columnas });
  }

  function soltar(destino: number) {
    if (arrastrada !== null) moverColumna(arrastrada, destino);
    setArrastrada(null);
    setSobre(null);
  }

  function actualizarColumna(id: string, parche: Partial<Columna>) {
    onCambio({
      ...tabla,
      columnas: tabla.columnas.map((c) => (c.id === id ? { ...c, ...parche } : c)),
    });
  }

  function agregarColumna() {
    const col = nuevaColumna(`atributo_${tabla.columnas.length + 1}`, columnaNueva);
    onCambio({
      ...tabla,
      columnas: [...tabla.columnas, col],
      filas: tabla.filas.map((f) => ({ ...f, valores: { ...f.valores, [col.id]: "" } })),
    });
  }

  function eliminarColumna(id: string) {
    onCambio({
      ...tabla,
      columnas: tabla.columnas.filter((c) => c.id !== id),
      filas: tabla.filas.map((f) => {
        const valores = { ...f.valores };
        delete valores[id];
        return { ...f, valores };
      }),
    });
  }

  function agregarFila() {
    onCambio({ ...tabla, filas: [...tabla.filas, nuevaFila(tabla.columnas)] });
  }

  function eliminarFila(id: string) {
    onCambio({ ...tabla, filas: tabla.filas.filter((f) => f.id !== id) });
  }

  function fijarValor(filaId: string, colId: string, valor: string) {
    onCambio({
      ...tabla,
      filas: tabla.filas.map((f) =>
        f.id === filaId ? { ...f, valores: { ...f.valores, [colId]: valor } } : f,
      ),
    });
  }

  function alternarPK(id: string) {
    onCambio({
      ...tabla,
      columnas: tabla.columnas.map((c) =>
        c.id === id
          ? { ...c, esPK: !c.esPK, dependencia: !c.esPK ? "pk" : c.dependencia }
          : c,
      ),
    });
  }

  function alternarFK(id: string) {
    onCambio({
      ...tabla,
      columnas: tabla.columnas.map((c) =>
        c.id === id ? { ...c, esFK: !c.esFK, refTablaId: c.esFK ? null : c.refTablaId } : c,
      ),
    });
  }

  const nombreDestino = (col: Columna) =>
    col.refTablaId ? (modelo.find((t) => t.id === col.refTablaId)?.nombre ?? "?") : "?";

  const etiquetaTipo: Record<Tabla["tipo"], string> = {
    principal: "principal",
    derivada: "derivada",
    puente: "tabla de transición",
  };

  return (
    <div className="tarjeta overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="chip">{etiquetaTipo[tabla.tipo]}</span>
        {editableEstructura && !soloLectura ? (
          <input
            className="campo max-w-xs font-bold"
            value={tabla.nombre}
            onChange={(e) => onCambio({ ...tabla, nombre: e.target.value })}
            aria-label="Nombre de la tabla"
          />
        ) : (
          <h3 className="text-base font-bold">{tabla.nombre}</h3>
        )}
        <span className="suave text-xs">
          {tabla.columnas.length} columnas · {tabla.filas.length} registros
        </span>
        <div className="ml-auto flex gap-2">
          {editableEstructura && !soloLectura ? (
            <button type="button" className="btn btn-mini" onClick={agregarColumna}>
              + Columna
            </button>
          ) : null}
          {!soloLectura ? (
            <button
              type="button"
              className="btn btn-mini"
              onClick={agregarFila}
              disabled={tabla.columnas.length === 0}
              title={tabla.columnas.length === 0 ? "Primero crea al menos una columna" : undefined}
            >
              + Registro
            </button>
          ) : null}
          {onEliminar && !soloLectura ? (
            <button type="button" className="btn btn-mini btn-peligro" onClick={onEliminar}>
              Eliminar tabla
            </button>
          ) : null}
        </div>
      </div>

      {tabla.nota ? (
        <p className="suave border-b px-4 py-2 text-xs italic">{tabla.nota}</p>
      ) : null}

      {tabla.columnas.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-semibold">Esta tabla todavía no tiene atributos</p>
          <p className="suave mx-auto mt-1 max-w-md text-xs leading-relaxed">
            Decide tú qué columnas necesita, incluido el identificador. Usa “+ Columna”, escribe el
            nombre y marca cuál será la clave primaria.
          </p>
          {editableEstructura && !soloLectura ? (
            <button type="button" className="btn btn-primario mt-3" onClick={agregarColumna}>
              + Columna
            </button>
          ) : null}
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="rejilla w-full border-collapse">
          <thead>
            <tr>
              {tabla.columnas.map((col, indice) => (
                <th
                  key={col.id}
                  className="p-2 align-top"
                  style={{
                    ...(colorEncabezado ? { background: colorEncabezado(col) } : {}),
                    ...(sobre === indice && arrastrada !== null && arrastrada !== indice
                      ? { boxShadow: "inset 3px 0 0 var(--acento)" }
                      : {}),
                    ...(arrastrada === indice ? { opacity: 0.45 } : {}),
                  }}
                  onDragOver={
                    reordenable
                      ? (e) => {
                          e.preventDefault();
                          setSobre(indice);
                        }
                      : undefined
                  }
                  onDrop={
                    reordenable
                      ? (e) => {
                          e.preventDefault();
                          soltar(indice);
                        }
                      : undefined
                  }
                >
                  <div className="flex min-w-[9rem] flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {reordenable ? (
                        <span
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", String(indice));
                            setArrastrada(indice);
                          }}
                          onDragEnd={() => {
                            setArrastrada(null);
                            setSobre(null);
                          }}
                          className="cursor-grab select-none px-0.5 text-xs leading-none active:cursor-grabbing"
                          style={{ color: "var(--texto-suave)" }}
                          title="Arrastra para cambiar el orden de la columna"
                          aria-hidden
                        >
                          ⠿
                        </span>
                      ) : null}
                      {col.esPK ? <span className="chip chip-pk">PK</span> : null}
                      {col.esFK ? (
                        <span
                          className="chip chip-fk"
                          title={
                            col.refTablaId
                              ? `Referencia a ${nombreDestino(col)}`
                              : "Falta elegir a qué tabla apunta"
                          }
                        >
                          {col.refTablaId ? `FK → ${nombreDestino(col)}` : "FK"}
                        </span>
                      ) : null}
                    </div>

                    {editableEstructura && !soloLectura ? (
                      <input
                        className="campo text-xs font-semibold"
                        value={col.nombre}
                        onChange={(e) => actualizarColumna(col.id, { nombre: e.target.value })}
                        aria-label="Nombre de la columna"
                      />
                    ) : (
                      <span className="text-xs font-bold">{col.nombre}</span>
                    )}

                    {editableEstructura && !soloLectura ? (
                      <>
                        <input
                          className="campo text-[11px]"
                          list="tipos-sql"
                          placeholder="tipo (opcional)"
                          value={col.tipo}
                          onChange={(e) => actualizarColumna(col.id, { tipo: e.target.value })}
                          aria-label="Tipo de dato"
                        />
                        <div className="flex flex-wrap gap-1">
                          {reordenable ? (
                            <>
                              {/* Alternativa al arrastre: teclado y pantallas tactiles. */}
                              <button
                                type="button"
                                className="btn btn-mini"
                                onClick={() => moverColumna(indice, indice - 1)}
                                disabled={indice === 0}
                                aria-label={`Mover ${col.nombre} a la izquierda`}
                                title="Mover a la izquierda"
                              >
                                ‹
                              </button>
                              <button
                                type="button"
                                className="btn btn-mini"
                                onClick={() => moverColumna(indice, indice + 1)}
                                disabled={indice === tabla.columnas.length - 1}
                                aria-label={`Mover ${col.nombre} a la derecha`}
                                title="Mover a la derecha"
                              >
                                ›
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            className="btn btn-mini"
                            onClick={() => alternarPK(col.id)}
                          >
                            {col.esPK ? "Quitar PK" : "Marcar PK"}
                          </button>
                          {permiteFK ? (
                            <button
                              type="button"
                              className="btn btn-mini"
                              onClick={() => alternarFK(col.id)}
                              title="Marca la columna que guarda el id de otra tabla"
                            >
                              {col.esFK ? "Quitar FK" : "Marcar FK"}
                            </button>
                          ) : null}
                          {tabla.columnas.length > 1 ? (
                            <button
                              type="button"
                              className="btn btn-mini btn-peligro"
                              onClick={() => eliminarColumna(col.id)}
                              aria-label={`Eliminar columna ${col.nombre}`}
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                        {permiteFK && col.esFK ? (
                          <select
                            className="campo text-[11px]"
                            value={col.refTablaId ?? ""}
                            onChange={(e) =>
                              actualizarColumna(col.id, { refTablaId: e.target.value || null })
                            }
                            aria-label={`Tabla a la que apunta ${col.nombre}`}
                          >
                            <option value="">¿a qué tabla apunta?</option>
                            {modelo.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.nombre}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </>
                    ) : col.tipo ? (
                      <span className="suave text-[11px]">{col.tipo}</span>
                    ) : null}

                    {col.derivadaDe ? (
                      <span className="suave text-[10px] italic">de {col.derivadaDe}</span>
                    ) : null}

                    {encabezadoExtra ? encabezadoExtra(col) : null}
                  </div>
                </th>
              ))}
              {!soloLectura ? <th className="w-8 p-1" aria-label="Acciones" /> : null}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((fila) => (
              <tr key={fila.id}>
                {tabla.columnas.map((col) => (
                  <td key={col.id} className="p-0">
                    {soloLectura ? (
                      <span className="block px-2 py-1.5 text-[0.82rem]">
                        {fila.valores[col.id] || <span className="suave">—</span>}
                      </span>
                    ) : (
                      <input
                        className="celda"
                        value={fila.valores[col.id] ?? ""}
                        onChange={(e) => fijarValor(fila.id, col.id, e.target.value)}
                        placeholder={col.autogenerada && col.esPK ? "auto" : ""}
                        aria-label={`${col.nombre}, registro`}
                      />
                    )}
                  </td>
                ))}
                {!soloLectura ? (
                  <td className="p-0 text-center">
                    <button
                      type="button"
                      className="btn btn-mini btn-peligro border-0 bg-transparent"
                      onClick={() => eliminarFila(fila.id)}
                      aria-label="Eliminar registro"
                    >
                      ×
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {tabla.filas.length === 0 ? (
              <tr>
                <td colSpan={tabla.columnas.length + 1} className="suave p-3 text-center text-xs">
                  Sin registros. Usa “+ Registro”.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      )}

      {pie ? <div className="border-t px-4 py-3">{pie}</div> : null}

      <datalist id="tipos-sql">
        {TIPOS_SUGERIDOS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}
