"use client";

import { useState } from "react";
import { aSnake } from "@/lib/ids";
import { resolverGrupoRepeticion, sugerirGruposRepeticion } from "@/lib/modelo";
import type { Tabla } from "@/lib/tipos";
import EditorTabla from "../EditorTabla";
import type { PropsPaso } from "../Taller";
import { Aviso, Interruptor, Seccion } from "../ui";

export default function PasoSegundaFN({ trabajo, actualizar }: PropsPaso) {
  const { modelo } = trabajo;
  const [grupoPorTabla, setGrupoPorTabla] = useState<Record<string, string>>({});
  const [nombresPorTabla, setNombresPorTabla] = useState<
    Record<string, { derivada: string; puente: string }>
  >({});

  function cambiarTabla(tabla: Tabla) {
    actualizar((t) => ({ ...t, modelo: t.modelo.map((x) => (x.id === tabla.id ? tabla : x)) }));
  }

  function nombreGrupo(tabla: Tabla): string {
    if (grupoPorTabla[tabla.id] !== undefined) return grupoPorTabla[tabla.id];
    const marcada = tabla.columnas.find((c) => c.grupoRepeticion);
    return marcada?.grupoRepeticion ?? "";
  }

  function fijarGrupo(tablaId: string, valor: string) {
    setGrupoPorTabla((prev) => ({ ...prev, [tablaId]: valor }));
  }

  function alternarColumna(tabla: Tabla, columnaId: string, incluir: boolean) {
    const grupo = aSnake(nombreGrupo(tabla));
    actualizar((t) => ({
      ...t,
      modelo: t.modelo.map((tb) =>
        tb.id !== tabla.id
          ? tb
          : {
              ...tb,
              columnas: tb.columnas.map((c) =>
                c.id === columnaId ? { ...c, grupoRepeticion: incluir ? grupo || "grupo" : null } : c,
              ),
            },
      ),
    }));
  }

  function aplicarSugerencia(tabla: Tabla, grupo: string, columnasIds: string[]) {
    fijarGrupo(tabla.id, grupo);
    actualizar((t) => ({
      ...t,
      modelo: t.modelo.map((tb) =>
        tb.id !== tabla.id
          ? tb
          : {
              ...tb,
              columnas: tb.columnas.map((c) =>
                columnasIds.includes(c.id) ? { ...c, grupoRepeticion: grupo } : c,
              ),
            },
      ),
    }));
  }

  function generar(tabla: Tabla) {
    const grupo = aSnake(nombreGrupo(tabla)) || "grupo";
    const columnasIds = tabla.columnas.filter((c) => c.grupoRepeticion).map((c) => c.id);
    if (columnasIds.length === 0) return;

    const nombres = nombresPorTabla[tabla.id] ?? {
      derivada: grupo,
      puente: `${aSnake(tabla.nombre)}_${grupo}`,
    };

    actualizar((t) => {
      const resultado = resolverGrupoRepeticion(
        t.modelo,
        tabla.id,
        grupo,
        columnasIds,
        aSnake(nombres.derivada) || grupo,
        aSnake(nombres.puente) || `${aSnake(tabla.nombre)}_${grupo}`,
      );
      if (!resultado) return t;
      return {
        ...t,
        modelo: resultado.modelo,
        bitacora: {
          ...t.bitacora,
          gruposResueltos: [...t.bitacora.gruposResueltos, resultado.registro],
        },
      };
    });
    setGrupoPorTabla((prev) => ({ ...prev, [tabla.id]: "" }));
  }

  return (
    <>
      <Seccion
        titulo="Paso 4 · Segunda forma normal"
        descripcion="Busca grupos de repeticion: columnas como telefono1, telefono2, telefono3 que guardan varias veces el mismo tipo de dato. Cada grupo se convierte en una tabla con el nombre del atributo y una tabla de transicion que la asocia con la tabla original."
        acciones={
          <Interruptor
            activo={trabajo.declaraciones.sinGruposRepeticion}
            onCambio={(v) =>
              actualizar((t) => ({
                ...t,
                declaraciones: { ...t.declaraciones, sinGruposRepeticion: v },
              }))
            }
            etiqueta="Revise todo y no hay grupos de repeticion"
          />
        }
      >
        <Aviso tono="info" titulo="Como se hace">
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
            <li>Escribe el nombre del atributo repetido (por ejemplo “telefono”).</li>
            <li>Marca las columnas que forman ese grupo.</li>
            <li>
              Pulsa generar: la app crea la tabla <code>telefono</code>, la tabla puente{" "}
              <code>usuario_telefono</code> y traslada los datos.
            </li>
          </ol>
        </Aviso>
      </Seccion>

      <div className="space-y-4">
        {modelo.map((tabla) => {
          const sugerencias = sugerirGruposRepeticion(tabla);
          const grupo = nombreGrupo(tabla);
          const marcadas = tabla.columnas.filter((c) => c.grupoRepeticion);
          const nombres = nombresPorTabla[tabla.id] ?? {
            derivada: aSnake(grupo),
            puente: `${aSnake(tabla.nombre)}_${aSnake(grupo)}`,
          };

          return (
            <EditorTabla
              key={tabla.id}
              tabla={tabla}
              modelo={modelo}
              onCambio={cambiarTabla}
              colorEncabezado={(col) => (col.grupoRepeticion ? "var(--acento-suave)" : undefined)}
              encabezadoExtra={(col) =>
                col.esPK || col.esFK ? null : (
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 cursor-pointer accent-[var(--acento)]"
                      checked={Boolean(col.grupoRepeticion)}
                      onChange={(e) => alternarColumna(tabla, col.id, e.target.checked)}
                    />
                    parte del grupo
                  </label>
                )
              }
              pie={
                <div className="space-y-3">
                  {sugerencias.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="suave text-xs font-semibold">Posibles grupos detectados:</span>
                      {sugerencias.map((s) => (
                        <button
                          key={s.grupo}
                          type="button"
                          className="btn btn-mini"
                          onClick={() =>
                            aplicarSugerencia(
                              tabla,
                              s.grupo,
                              s.columnas.map((c) => c.id),
                            )
                          }
                        >
                          {s.grupo} ({s.columnas.length} columnas)
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-end gap-2">
                    <label className="block">
                      <span className="etiqueta">Nombre del atributo repetido</span>
                      <input
                        className="campo w-44"
                        value={grupo}
                        placeholder="telefono"
                        onChange={(e) => {
                          fijarGrupo(tabla.id, e.target.value);
                          setNombresPorTabla((prev) => ({
                            ...prev,
                            [tabla.id]: {
                              derivada: aSnake(e.target.value),
                              puente: `${aSnake(tabla.nombre)}_${aSnake(e.target.value)}`,
                            },
                          }));
                        }}
                      />
                    </label>
                    <label className="block">
                      <span className="etiqueta">Tabla a crear</span>
                      <input
                        className="campo w-44"
                        value={nombres.derivada}
                        onChange={(e) =>
                          setNombresPorTabla((prev) => ({
                            ...prev,
                            [tabla.id]: { ...nombres, derivada: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="etiqueta">Tabla de transicion</span>
                      <input
                        className="campo w-52"
                        value={nombres.puente}
                        onChange={(e) =>
                          setNombresPorTabla((prev) => ({
                            ...prev,
                            [tabla.id]: { ...nombres, puente: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-primario"
                      onClick={() => generar(tabla)}
                      disabled={marcadas.length === 0 || !grupo.trim()}
                    >
                      Generar tabla + tabla puente
                    </button>
                  </div>

                  {marcadas.length > 0 ? (
                    <p className="suave text-xs">
                      Columnas marcadas: {marcadas.map((c) => c.nombre).join(", ")}
                    </p>
                  ) : null}
                </div>
              }
            />
          );
        })}
      </div>

      {trabajo.bitacora.gruposResueltos.length > 0 ? (
        <Seccion titulo="Grupos de repeticion resueltos">
          <ul className="space-y-2">
            {trabajo.bitacora.gruposResueltos.map((g) => (
              <li key={g.id} className="tarjeta-plana p-3 text-sm">
                <span className="font-semibold">
                  {g.tablaOrigen}: {g.columnasOriginales.join(", ")}
                </span>
                <span className="suave">
                  {" "}
                  → tabla <b>{g.tablaCreada}</b> + transicion <b>{g.tablaPuente}</b>
                </span>
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}
    </>
  );
}
