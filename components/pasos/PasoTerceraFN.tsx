"use client";

import { useMemo, useState } from "react";
import { aSnake } from "@/lib/ids";
import { columnasEvaluables, crearTablaDesdeDeterminante, moverAtributo } from "@/lib/modelo";
import type { Dependencia, Tabla } from "@/lib/tipos";
import EditorTabla from "../EditorTabla";
import type { PropsPaso } from "../Taller";
import { Aviso, Dialogo, Interruptor, Seccion } from "../ui";

type Resolviendo = { tablaId: string; determinanteId: string };

export default function PasoTerceraFN({ trabajo, actualizar }: PropsPaso) {
  const { modelo } = trabajo;
  const [resolviendo, setResolviendo] = useState<Resolviendo | null>(null);
  const [modo, setModo] = useState<"nueva" | "existente">("nueva");
  const [nombreNueva, setNombreNueva] = useState("");
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [destinoId, setDestinoId] = useState("");

  const tablaResolviendo = resolviendo ? modelo.find((t) => t.id === resolviendo.tablaId) : undefined;
  const determinante = tablaResolviendo?.columnas.find((c) => c.id === resolviendo?.determinanteId);

  const dependientes = useMemo(() => {
    if (!tablaResolviendo || !resolviendo) return [];
    return tablaResolviendo.columnas.filter(
      (c) => c.dependencia === "otro" && c.determinanteId === resolviendo.determinanteId,
    );
  }, [tablaResolviendo, resolviendo]);

  function cambiarTabla(tabla: Tabla) {
    actualizar((t) => ({ ...t, modelo: t.modelo.map((x) => (x.id === tabla.id ? tabla : x)) }));
  }

  function fijarDependencia(tablaId: string, columnaId: string, valor: Dependencia | null) {
    actualizar((t) => ({
      ...t,
      modelo: t.modelo.map((tb) =>
        tb.id !== tablaId
          ? tb
          : {
              ...tb,
              columnas: tb.columnas.map((c) =>
                c.id === columnaId
                  ? {
                      ...c,
                      dependencia: valor,
                      determinanteId: valor === "otro" ? c.determinanteId : null,
                    }
                  : c,
              ),
            },
      ),
    }));
  }

  function fijarDeterminante(tablaId: string, columnaId: string, determinanteId: string) {
    actualizar((t) => ({
      ...t,
      modelo: t.modelo.map((tb) =>
        tb.id !== tablaId
          ? tb
          : {
              ...tb,
              columnas: tb.columnas.map((c) =>
                c.id === columnaId ? { ...c, determinanteId: determinanteId || null } : c,
              ),
            },
      ),
    }));
  }

  function abrirResolucion(tabla: Tabla, determinanteId: string) {
    const deps = tabla.columnas.filter(
      (c) => c.dependencia === "otro" && c.determinanteId === determinanteId,
    );
    const det = tabla.columnas.find((c) => c.id === determinanteId);
    setResolviendo({ tablaId: tabla.id, determinanteId });
    setModo("nueva");
    setNombreNueva(aSnake(det?.nombre ?? "nueva_tabla"));
    setSeleccion(deps.map((c) => c.id));
    setDestinoId(modelo.find((t) => t.id !== tabla.id)?.id ?? "");
  }

  function aplicar() {
    if (!resolviendo || !tablaResolviendo || !determinante) return;

    actualizar((t) => {
      if (modo === "nueva") {
        const resultado = crearTablaDesdeDeterminante(
          t.modelo,
          resolviendo.tablaId,
          resolviendo.determinanteId,
          seleccion,
          aSnake(nombreNueva) || "nueva_tabla",
        );
        if (!resultado) return t;
        return {
          ...t,
          modelo: resultado.modelo,
          bitacora: {
            ...t.bitacora,
            transitivasResueltas: [...t.bitacora.transitivasResueltas, resultado.registro],
          },
        };
      }

      // Traslado a una tabla existente, atributo por atributo.
      let modeloActual = t.modelo;
      const registros = [];
      for (const colId of seleccion) {
        const resultado = moverAtributo(modeloActual, resolviendo.tablaId, colId, destinoId);
        if (!resultado) continue;
        modeloActual = resultado.modelo;
        registros.push(resultado.registro);
      }
      // El determinante deja de estar en conflicto una vez movidos sus dependientes.
      modeloActual = modeloActual.map((tb) =>
        tb.id !== resolviendo.tablaId
          ? tb
          : {
              ...tb,
              columnas: tb.columnas.map((c) =>
                c.id === resolviendo.determinanteId ? { ...c, dependencia: "pk" as const } : c,
              ),
            },
      );
      return {
        ...t,
        modelo: modeloActual,
        bitacora: {
          ...t.bitacora,
          transitivasResueltas: [...t.bitacora.transitivasResueltas, ...registros],
        },
      };
    });

    setResolviendo(null);
  }

  return (
    <>
      <Seccion
        titulo="Paso 5 · Tercera forma normal"
        descripcion="Para cada atributo pregunta: ¿esto depende del id de esta tabla, o depende de otro atributo? Si depende de otro atributo, se crea una tabla nueva o se traslada a la tabla donde ya corresponde."
        acciones={
          <Interruptor
            activo={trabajo.declaraciones.sinTransitivas}
            onCambio={(v) =>
              actualizar((t) => ({
                ...t,
                declaraciones: { ...t.declaraciones, sinTransitivas: v },
              }))
            }
            etiqueta="Revise todo y todos dependen del id"
          />
        }
      >
        <Aviso tono="info" titulo="La pregunta clave">
          Si conociendo el valor de otro atributo ya puedes deducir este, entonces este atributo no
          depende del id: depende de aquel. Ejemplo tipico: el pais de la editorial no depende del
          libro, depende de la editorial.
        </Aviso>
      </Seccion>

      <div className="space-y-4">
        {modelo.map((tabla) => {
          const evaluables = columnasEvaluables(tabla);
          const determinantes = [
            ...new Set(
              tabla.columnas
                .filter((c) => c.dependencia === "otro" && c.determinanteId)
                .map((c) => c.determinanteId as string),
            ),
          ];

          return (
            <EditorTabla
              key={tabla.id}
              tabla={tabla}
              modelo={modelo}
              onCambio={cambiarTabla}
              colorEncabezado={(col) => {
                if (col.esPK || col.esFK) return undefined;
                if (col.dependencia === "pk") return "var(--ok-suave)";
                if (col.dependencia === "otro") return "var(--error-suave)";
                return undefined;
              }}
              encabezadoExtra={(col) => {
                if (col.esPK || col.esFK) return null;
                return (
                  <div className="flex flex-col gap-1">
                    <select
                      className="campo text-[11px]"
                      value={col.dependencia ?? ""}
                      onChange={(e) =>
                        fijarDependencia(
                          tabla.id,
                          col.id,
                          e.target.value ? (e.target.value as Dependencia) : null,
                        )
                      }
                      aria-label={`Dependencia de ${col.nombre}`}
                    >
                      <option value="">¿de que depende?</option>
                      <option value="pk">del id de la tabla</option>
                      <option value="otro">de otro atributo</option>
                    </select>
                    {col.dependencia === "otro" ? (
                      <select
                        className="campo text-[11px]"
                        value={col.determinanteId ?? ""}
                        onChange={(e) => fijarDeterminante(tabla.id, col.id, e.target.value)}
                        aria-label={`Atributo del que depende ${col.nombre}`}
                      >
                        <option value="">elige el atributo…</option>
                        {evaluables
                          .filter((c) => c.id !== col.id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                      </select>
                    ) : null}
                  </div>
                );
              }}
              pie={
                determinantes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="titulo-seccion">Dependencias transitivas por resolver</p>
                    {determinantes.map((detId) => {
                      const det = tabla.columnas.find((c) => c.id === detId);
                      const deps = tabla.columnas.filter(
                        (c) => c.dependencia === "otro" && c.determinanteId === detId,
                      );
                      return (
                        <div
                          key={detId}
                          className="tarjeta-plana flex flex-wrap items-center gap-2 p-3 text-sm"
                        >
                          <span>
                            <b>{deps.map((d) => d.nombre).join(", ")}</b>{" "}
                            <span className="suave">depende(n) de</span> <b>{det?.nombre}</b>
                          </span>
                          <button
                            type="button"
                            className="btn btn-mini btn-primario ml-auto"
                            onClick={() => abrirResolucion(tabla, detId)}
                          >
                            Resolver →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null
              }
            />
          );
        })}
      </div>

      {trabajo.bitacora.transitivasResueltas.length > 0 ? (
        <Seccion titulo="Dependencias transitivas resueltas">
          <ul className="space-y-2">
            {trabajo.bitacora.transitivasResueltas.map((r) => (
              <li key={r.id} className="tarjeta-plana p-3 text-sm">
                <b>{r.atributosMovidos.join(", ")}</b>{" "}
                <span className="suave">
                  salieron de {r.tablaOrigen} hacia {r.tablaDestino}
                  {r.creoTabla ? " (tabla nueva)" : " (tabla existente)"}
                  {r.determinante !== "-" ? ` porque dependian de ${r.determinante}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}

      <Dialogo
        abierto={resolviendo !== null}
        titulo={`Resolver dependencia de ${determinante?.nombre ?? ""}`}
        onCerrar={() => setResolviendo(null)}
        pie={
          <>
            <button type="button" className="btn" onClick={() => setResolviendo(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primario"
              onClick={aplicar}
              disabled={
                seleccion.length === 0 ||
                (modo === "nueva" ? !nombreNueva.trim() : !destinoId)
              }
            >
              Aplicar
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              className="btn flex-1"
              style={
                modo === "nueva"
                  ? { background: "var(--acento)", borderColor: "var(--acento)", color: "var(--acento-texto)" }
                  : undefined
              }
              onClick={() => setModo("nueva")}
            >
              Crear tabla nueva
            </button>
            <button
              type="button"
              className="btn flex-1"
              style={
                modo === "existente"
                  ? { background: "var(--acento)", borderColor: "var(--acento)", color: "var(--acento-texto)" }
                  : undefined
              }
              onClick={() => setModo("existente")}
              disabled={modelo.length < 2}
            >
              Trasladar a tabla existente
            </button>
          </div>

          <div>
            <span className="etiqueta">Atributos que se mueven</span>
            <div className="space-y-1">
              {dependientes.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[var(--acento)]"
                    checked={seleccion.includes(c.id)}
                    onChange={(e) =>
                      setSeleccion((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                      )
                    }
                  />
                  {c.nombre}
                </label>
              ))}
            </div>
          </div>

          {modo === "nueva" ? (
            <>
              <label className="block">
                <span className="etiqueta">Nombre de la tabla nueva</span>
                <input
                  className="campo"
                  value={nombreNueva}
                  onChange={(e) => setNombreNueva(e.target.value)}
                />
              </label>
              <Aviso tono="info">
                Se creara <b>{aSnake(nombreNueva) || "nueva_tabla"}</b> con su id autogenerado,{" "}
                <b>{determinante?.nombre}</b> y los atributos seleccionados. En{" "}
                <b>{tablaResolviendo?.nombre}</b> esas columnas se reemplazan por la clave foranea{" "}
                <b>id_{aSnake(nombreNueva) || "nueva_tabla"}</b>, y los datos se trasladan
                automaticamente.
              </Aviso>
            </>
          ) : (
            <>
              <label className="block">
                <span className="etiqueta">Tabla destino</span>
                <select
                  className="campo"
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                >
                  {modelo
                    .filter((t) => t.id !== resolviendo?.tablaId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                </select>
              </label>
              <Aviso tono="alerta">
                Los atributos se agregan a la tabla destino y se deja la clave foranea en la tabla
                de origen, pero los valores llegan vacios: revisa y completa los registros de la
                tabla destino.
              </Aviso>
            </>
          )}
        </div>
      </Dialogo>
    </>
  );
}
