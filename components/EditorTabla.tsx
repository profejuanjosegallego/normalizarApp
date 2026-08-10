"use client";

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
  encabezadoExtra,
  colorEncabezado,
  pie,
}: Props) {
  function actualizarColumna(id: string, parche: Partial<Columna>) {
    onCambio({
      ...tabla,
      columnas: tabla.columnas.map((c) => (c.id === id ? { ...c, ...parche } : c)),
    });
  }

  function agregarColumna() {
    const col = nuevaColumna(`atributo_${tabla.columnas.length + 1}`);
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

  const nombreDestino = (col: Columna) =>
    col.refTablaId ? (modelo.find((t) => t.id === col.refTablaId)?.nombre ?? "?") : "?";

  const etiquetaTipo: Record<Tabla["tipo"], string> = {
    principal: "principal",
    derivada: "derivada",
    puente: "tabla puente",
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
          <p className="text-sm font-semibold">Esta tabla todavia no tiene atributos</p>
          <p className="suave mx-auto mt-1 max-w-md text-xs leading-relaxed">
            Decide tu que columnas necesita, incluido el identificador. Usa “+ Columna”, escribe el
            nombre y marca cual sera la clave primaria.
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
              {tabla.columnas.map((col) => (
                <th
                  key={col.id}
                  className="p-2 align-top"
                  style={colorEncabezado ? { background: colorEncabezado(col) } : undefined}
                >
                  <div className="flex min-w-[9rem] flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-1">
                      {col.esPK ? <span className="chip chip-pk">PK</span> : null}
                      {col.esFK ? (
                        <span className="chip chip-fk" title={`Referencia a ${nombreDestino(col)}`}>
                          FK → {nombreDestino(col)}
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
                          <button
                            type="button"
                            className="btn btn-mini"
                            onClick={() => alternarPK(col.id)}
                          >
                            {col.esPK ? "Quitar PK" : "Marcar PK"}
                          </button>
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
