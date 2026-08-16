"use client";

import { useState } from "react";
import { aSnake } from "@/lib/ids";
import {
  resolverGrupoRepeticion,
  sugerirGruposRepeticion,
  type DestinoGrupo,
} from "@/lib/modelo";
import type { Tabla } from "@/lib/tipos";
import EditorTabla from "../EditorTabla";
import type { PropsPaso } from "../Taller";
import { Aviso, Interruptor, Seccion } from "../ui";

/** A dónde van a parar los valores del grupo, por tabla de origen. */
type Destino = { modo: "crear" | "existente"; tablaId: string; columnaValorId: string };

export default function PasoSegundaFN({ trabajo, actualizar }: PropsPaso) {
  const { modelo } = trabajo;
  const [grupoPorTabla, setGrupoPorTabla] = useState<Record<string, string>>({});
  const [nombresPorTabla, setNombresPorTabla] = useState<
    Record<string, { derivada: string; puente: string }>
  >({});
  const [destinoPorTabla, setDestinoPorTabla] = useState<Record<string, Destino>>({});
  const [avisoPorTabla, setAvisoPorTabla] = useState<Record<string, string>>({});

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

  function destinoDe(tabla: Tabla): Destino {
    return destinoPorTabla[tabla.id] ?? { modo: "crear", tablaId: "", columnaValorId: "" };
  }

  /** Tablas contra las que tiene sentido enlazar: entidades, no transiciones. */
  // (las tablas de transición no representan una entidad del enunciado)
  function candidatas(tabla: Tabla): Tabla[] {
    return modelo.filter((t) => t.id !== tabla.id && t.tipo !== "puente");
  }

  /** Columnas de la tabla destino que pueden contener el valor repetido. */
  function columnasValor(destinoId: string) {
    const t = modelo.find((x) => x.id === destinoId);
    if (!t) return [];
    const utiles = t.columnas.filter((c) => !c.esPK && !c.esFK);
    return utiles.length > 0 ? utiles : t.columnas.filter((c) => !c.esPK);
  }

  function fijarDestino(tabla: Tabla, parche: Partial<Destino>) {
    const actual = destinoDe(tabla);
    const siguiente = { ...actual, ...parche };

    // Al elegir la tabla destino se propone el nombre habitual de la transición
    // y la primera columna de valor, que casi siempre es la correcta.
    if (parche.tablaId && parche.tablaId !== actual.tablaId) {
      const destino = modelo.find((t) => t.id === parche.tablaId);
      siguiente.columnaValorId = columnasValor(parche.tablaId)[0]?.id ?? "";
      if (destino) {
        setNombresPorTabla((prev) => ({
          ...prev,
          [tabla.id]: {
            derivada: prev[tabla.id]?.derivada ?? "",
            puente: `${aSnake(tabla.nombre)}_${aSnake(destino.nombre)}`,
          },
        }));
      }
    }

    setDestinoPorTabla((prev) => ({ ...prev, [tabla.id]: siguiente }));
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
    const eleccion = destinoDe(tabla);

    const destino: DestinoGrupo =
      eleccion.modo === "existente"
        ? {
            modo: "existente",
            tablaId: eleccion.tablaId,
            columnaValorId: eleccion.columnaValorId,
          }
        : { modo: "crear", nombre: aSnake(nombres.derivada) || grupo };

    const resultado = resolverGrupoRepeticion(
      modelo,
      tabla.id,
      grupo,
      columnasIds,
      aSnake(nombres.puente) || `${aSnake(tabla.nombre)}_${grupo}`,
      destino,
    );
    if (!resultado) return;

    actualizar((t) => ({
      ...t,
      modelo: resultado.modelo,
      bitacora: {
        ...t.bitacora,
        gruposResueltos: [...t.bitacora.gruposResueltos, resultado.registro],
      },
    }));

    setGrupoPorTabla((prev) => ({ ...prev, [tabla.id]: "" }));
    setDestinoPorTabla((prev) => ({ ...prev, [tabla.id]: { modo: "crear", tablaId: "", columnaValorId: "" } }));
    setAvisoPorTabla((prev) => ({
      ...prev,
      [tabla.id]:
        resultado.valoresAgregados.length > 0
          ? `Se creó la transición ${resultado.registro.tablaPuente}. Estos valores no estaban en ${resultado.registro.tablaCreada} y se agregaron como registros nuevos: ${resultado.valoresAgregados.join(", ")}.`
          : `Listo: ${resultado.registro.tablaPuente} enlaza ${resultado.registro.tablaOrigen} con ${resultado.registro.tablaCreada}.`,
    }));
  }

  return (
    <>
      <Seccion
        titulo="Paso 4 · Segunda forma normal"
        descripcion="Busca grupos de repetición: columnas como telefono1, telefono2, telefono3 que guardan varias veces el mismo tipo de dato. Cada grupo se convierte en una tabla con el nombre del atributo y una tabla de transición que la asocia con la tabla original."
        acciones={
          <Interruptor
            activo={trabajo.declaraciones.sinGruposRepeticion}
            onCambio={(v) =>
              actualizar((t) => ({
                ...t,
                declaraciones: { ...t.declaraciones, sinGruposRepeticion: v },
              }))
            }
            etiqueta="Revisé todo y no hay grupos de repetición"
          />
        }
      >
        <Aviso tono="info" titulo="Cómo se hace">
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
            <li>Escribe el nombre del atributo repetido (por ejemplo “teléfono”).</li>
            <li>Marca las columnas que forman ese grupo.</li>
            <li>
              Decide a dónde van esos valores: a una tabla nueva, o a una tabla que ya tengas. Si ya
              modelaste <code>materia</code> aparte, no la crees otra vez: enlaza contra ella y la
              app solo genera la transición <code>estudiante_materia</code>.
            </li>
            <li>Pulsa generar: se traslada la información y la tabla original queda limpia.</li>
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
          const destino = destinoDe(tabla);
          const opciones = candidatas(tabla);
          const usaExistente = destino.modo === "existente";
          const listo =
            marcadas.length > 0 &&
            grupo.trim().length > 0 &&
            (!usaExistente || (destino.tablaId !== "" && destino.columnaValorId !== ""));

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
                      <span className="suave text-xs font-semibold">
                        Posibles grupos detectados:
                      </span>
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
                        placeholder="teléfono"
                        onChange={(e) => {
                          fijarGrupo(tabla.id, e.target.value);
                          setNombresPorTabla((prev) => ({
                            ...prev,
                            [tabla.id]: {
                              derivada: aSnake(e.target.value),
                              puente:
                                destino.modo === "existente"
                                  ? (prev[tabla.id]?.puente ?? "")
                                  : `${aSnake(tabla.nombre)}_${aSnake(e.target.value)}`,
                            },
                          }));
                        }}
                      />
                    </label>
                  </div>

                  {/* Donde viven los valores del grupo */}
                  <div className="tarjeta-plana space-y-3 p-3">
                    <div className="flex flex-wrap gap-4">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                        <input
                          type="radio"
                          name={`destino-${tabla.id}`}
                          className="h-3.5 w-3.5 cursor-pointer accent-[var(--acento)]"
                          checked={!usaExistente}
                          onChange={() => fijarDestino(tabla, { modo: "crear" })}
                        />
                        Crear la tabla del atributo
                      </label>
                      <label
                        className="flex items-center gap-1.5 text-xs font-semibold"
                        style={{
                          cursor: opciones.length === 0 ? "not-allowed" : "pointer",
                          opacity: opciones.length === 0 ? 0.5 : 1,
                        }}
                      >
                        <input
                          type="radio"
                          name={`destino-${tabla.id}`}
                          className="h-3.5 w-3.5 accent-[var(--acento)]"
                          checked={usaExistente}
                          disabled={opciones.length === 0}
                          onChange={() =>
                            fijarDestino(tabla, {
                              modo: "existente",
                              tablaId: destino.tablaId || opciones[0]?.id || "",
                            })
                          }
                        />
                        Ya tengo esa tabla, solo crear la transición
                      </label>
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                      {usaExistente ? (
                        <>
                          <label className="block">
                            <span className="etiqueta">Tabla que ya existe</span>
                            <select
                              className="campo w-44"
                              value={destino.tablaId}
                              onChange={(e) => fijarDestino(tabla, { tablaId: e.target.value })}
                            >
                              <option value="">Elige una…</option>
                              {opciones.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nombre}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="etiqueta">Columna con el valor</span>
                            <select
                              className="campo w-44"
                              value={destino.columnaValorId}
                              disabled={!destino.tablaId}
                              onChange={(e) =>
                                fijarDestino(tabla, { columnaValorId: e.target.value })
                              }
                            >
                              <option value="">Elige una…</option>
                              {columnasValor(destino.tablaId).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nombre}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      ) : (
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
                      )}

                      <label className="block">
                        <span className="etiqueta">Tabla de transición</span>
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
                        disabled={!listo}
                      >
                        {usaExistente ? "Generar solo la transición" : "Generar tabla + transición"}
                      </button>
                    </div>

                    {usaExistente ? (
                      <p className="suave text-xs leading-relaxed">
                        La tabla que elijas no se modifica, salvo que algún valor del grupo no esté
                        entre sus registros: en ese caso se agrega para que la transición no quede
                        apuntando a la nada, y te avisamos cuáles fueron.
                      </p>
                    ) : null}
                  </div>

                  {marcadas.length > 0 ? (
                    <p className="suave text-xs">
                      Columnas marcadas: {marcadas.map((c) => c.nombre).join(", ")}
                    </p>
                  ) : null}

                  {avisoPorTabla[tabla.id] ? (
                    <Aviso tono="ok">{avisoPorTabla[tabla.id]}</Aviso>
                  ) : null}
                </div>
              }
            />
          );
        })}
      </div>

      {trabajo.bitacora.gruposResueltos.length > 0 ? (
        <Seccion titulo="Grupos de repetición resueltos">
          <ul className="space-y-2">
            {trabajo.bitacora.gruposResueltos.map((g) => (
              <li key={g.id} className="tarjeta-plana p-3 text-sm">
                <span className="font-semibold">
                  {g.tablaOrigen}: {g.columnasOriginales.join(", ")}
                </span>
                <span className="suave">
                  {" "}
                  → {g.creoTabla === false ? "tabla existente" : "tabla"} <b>{g.tablaCreada}</b> +
                  transición <b>{g.tablaPuente}</b>
                </span>
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}
    </>
  );
}
