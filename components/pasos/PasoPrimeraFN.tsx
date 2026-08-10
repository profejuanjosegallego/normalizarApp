"use client";

import { useMemo, useState } from "react";
import { nuevoId } from "@/lib/ids";
import { chequearUnicidad, columnasPK, descomponerColumna } from "@/lib/modelo";
import type { Atomicidad, Columna, Tabla } from "@/lib/tipos";
import EditorTabla from "../EditorTabla";
import type { PropsPaso } from "../Taller";
import { Aviso, Dialogo, Seccion } from "../ui";

const SEPARADORES = [
  { valor: " ", texto: "Espacio ( )" },
  { valor: ",", texto: "Coma (,)" },
  { valor: "-", texto: "Guion (-)" },
  { valor: "/", texto: "Barra (/)" },
  { valor: "", texto: "No repartir valores" },
];

type EnDescomposicion = { tablaId: string; columnaId: string };

export default function PasoPrimeraFN({ trabajo, actualizar }: PropsPaso) {
  const { modelo, ejercicio } = trabajo;
  const [objetivo, setObjetivo] = useState<EnDescomposicion | null>(null);
  const [separador, setSeparador] = useState(" ");
  const [nombres, setNombres] = useState<string[]>([]);
  const [justificacion, setJustificacion] = useState("");

  const tablaObjetivo = objetivo ? modelo.find((t) => t.id === objetivo.tablaId) : undefined;
  const columnaObjetivo = tablaObjetivo?.columnas.find((c) => c.id === objetivo?.columnaId);

  const ejemplos = useMemo(() => {
    if (!tablaObjetivo || !columnaObjetivo) return [];
    return tablaObjetivo.filas
      .map((f) => (f.valores[columnaObjetivo.id] ?? "").trim())
      .filter(Boolean)
      .slice(0, 3);
  }, [tablaObjetivo, columnaObjetivo]);

  function cambiarTabla(tabla: Tabla) {
    actualizar((t) => ({ ...t, modelo: t.modelo.map((x) => (x.id === tabla.id ? tabla : x)) }));
  }

  function marcarAtomicidad(tablaId: string, columnaId: string, valor: Atomicidad) {
    actualizar((t) => ({
      ...t,
      modelo: t.modelo.map((tb) =>
        tb.id !== tablaId
          ? tb
          : {
              ...tb,
              columnas: tb.columnas.map((c) =>
                c.id === columnaId ? { ...c, atomicidad: valor } : c,
              ),
            },
      ),
    }));
  }

  function fijarAutogenerada(tablaId: string, columnaId: string, valor: boolean) {
    actualizar((t) => ({
      ...t,
      modelo: t.modelo.map((tb) =>
        tb.id !== tablaId
          ? tb
          : {
              ...tb,
              columnas: tb.columnas.map((c) =>
                c.id === columnaId ? { ...c, autogenerada: valor } : c,
              ),
            },
      ),
    }));
  }

  function abrirDescomposicion(tablaId: string, columna: Columna) {
    setObjetivo({ tablaId, columnaId: columna.id });
    setSeparador(" ");
    setNombres([`${columna.nombre}_1`, `${columna.nombre}_2`]);
    setJustificacion(columna.notaAtomicidad);
  }

  function aplicarDescomposicion() {
    if (!objetivo || !tablaObjetivo || !columnaObjetivo) return;
    const limpios = nombres.map((n) => n.trim()).filter(Boolean);
    if (limpios.length < 2) return;

    const nombreOriginal = columnaObjetivo.nombre;
    const { tabla } = descomponerColumna(tablaObjetivo, objetivo.columnaId, limpios, separador);

    actualizar((t) => ({
      ...t,
      modelo: t.modelo.map((x) => (x.id === tabla.id ? tabla : x)),
      bitacora: {
        ...t.bitacora,
        descomposiciones: [
          ...t.bitacora.descomposiciones,
          {
            id: nuevoId("dsc"),
            tablaId: tabla.nombre,
            columnaOriginal: nombreOriginal,
            columnasResultantes: limpios,
            justificacion,
          },
        ],
      },
    }));
    setObjetivo(null);
  }

  const previsualizacion =
    ejemplos.length > 0 && separador
      ? ejemplos[0].split(separador).map((p) => p.trim())
      : [];

  return (
    <>
      <Seccion
        titulo="Paso 3 · Primera forma normal"
        descripcion="Dos revisiones: (a) que cada tabla tenga un identificador unico y autogenerado — si no lo creaste antes, agregalo aqui con “+ Columna” y marcalo como PK — y (b) que cada atributo sea atomico segun el contexto de este ejercicio. Marca primero, descompone despues."
      >
        {ejercicio.contextoAtomicidad ? (
          <Aviso tono="alerta" titulo="Recuerda las reglas de atomicidad de este ejercicio">
            <p className="prosa text-sm">{ejercicio.contextoAtomicidad}</p>
          </Aviso>
        ) : (
          <Aviso tono="info">
            Atomico no es absoluto: depende del contexto. Una fecha puede quedar como un solo
            atributo, pero un “nombre completo” casi siempre debe separarse.
          </Aviso>
        )}
      </Seccion>

      <div className="space-y-4">
        {modelo.map((tabla) => {
          const pk = columnasPK(tabla)[0];
          const unicidad = pk ? chequearUnicidad(tabla, pk.id) : null;

          return (
            <EditorTabla
              key={tabla.id}
              tabla={tabla}
              modelo={modelo}
              onCambio={cambiarTabla}
              editableEstructura
              colorEncabezado={(col) => {
                if (col.esPK || col.esFK) return undefined;
                if (col.atomicidad === "atomico") return "var(--ok-suave)";
                if (col.atomicidad === "no-atomico") return "var(--alerta-suave)";
                return undefined;
              }}
              encabezadoExtra={(col) => {
                if (col.esFK) return null;

                if (col.esPK) {
                  return (
                    <div className="flex flex-col gap-1">
                      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 cursor-pointer accent-[var(--acento)]"
                          checked={col.autogenerada}
                          onChange={(e) => fijarAutogenerada(tabla.id, col.id, e.target.checked)}
                        />
                        autogenerada
                      </label>
                      {unicidad ? (
                        <span className={unicidad.ok ? "chip chip-ok" : "chip chip-error"}>
                          {unicidad.ok
                            ? "valores unicos"
                            : unicidad.duplicados.length
                              ? "se repite"
                              : "hay vacios"}
                        </span>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn btn-mini"
                        style={
                          col.atomicidad === "atomico"
                            ? { background: "var(--ok)", borderColor: "var(--ok)", color: "#fff" }
                            : undefined
                        }
                        onClick={() => marcarAtomicidad(tabla.id, col.id, "atomico")}
                      >
                        atomico
                      </button>
                      <button
                        type="button"
                        className="btn btn-mini"
                        style={
                          col.atomicidad === "no-atomico"
                            ? {
                                background: "var(--alerta)",
                                borderColor: "var(--alerta)",
                                color: "#fff",
                              }
                            : undefined
                        }
                        onClick={() => marcarAtomicidad(tabla.id, col.id, "no-atomico")}
                      >
                        no atomico
                      </button>
                    </div>
                    {col.atomicidad === "no-atomico" ? (
                      <button
                        type="button"
                        className="btn btn-mini btn-primario"
                        onClick={() => abrirDescomposicion(tabla.id, col)}
                      >
                        Descomponer →
                      </button>
                    ) : null}
                  </div>
                );
              }}
            />
          );
        })}
      </div>

      {trabajo.bitacora.descomposiciones.length > 0 ? (
        <Seccion titulo="Descomposiciones realizadas" descripcion="Queda registrado en tu entrega.">
          <ul className="space-y-2">
            {trabajo.bitacora.descomposiciones.map((d) => (
              <li key={d.id} className="tarjeta-plana p-3 text-sm">
                <span className="font-semibold">
                  {d.tablaId}.{d.columnaOriginal}
                </span>{" "}
                → {d.columnasResultantes.join(", ")}
                {d.justificacion ? <p className="suave mt-1 text-xs">{d.justificacion}</p> : null}
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}

      <Dialogo
        abierto={objetivo !== null}
        titulo={`Descomponer ${columnaObjetivo?.nombre ?? ""}`}
        onCerrar={() => setObjetivo(null)}
        pie={
          <>
            <button type="button" className="btn" onClick={() => setObjetivo(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primario"
              onClick={aplicarDescomposicion}
              disabled={nombres.filter((n) => n.trim()).length < 2}
            >
              Descomponer en {nombres.filter((n) => n.trim()).length} columnas
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {ejemplos.length > 0 ? (
            <div>
              <p className="titulo-seccion mb-1">Valores actuales</p>
              <ul className="suave space-y-0.5 text-sm">
                {ejemplos.map((e, i) => (
                  <li key={i}>“{e}”</li>
                ))}
              </ul>
            </div>
          ) : null}

          <label className="block">
            <span className="etiqueta">Separador de los valores existentes</span>
            <select
              className="campo"
              value={separador}
              onChange={(e) => setSeparador(e.target.value)}
            >
              {SEPARADORES.map((s) => (
                <option key={s.texto} value={s.valor}>
                  {s.texto}
                </option>
              ))}
            </select>
          </label>

          {previsualizacion.length > 0 ? (
            <p className="suave text-xs">
              Con ese separador, el primer valor quedaria como:{" "}
              {previsualizacion.map((p, i) => (
                <span key={i} className="chip mr-1">
                  {p}
                </span>
              ))}
            </p>
          ) : null}

          <div>
            <span className="etiqueta">Nuevas columnas atomicas</span>
            <div className="space-y-2">
              {nombres.map((n, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="campo"
                    value={n}
                    onChange={(e) =>
                      setNombres((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                    }
                    placeholder={`columna ${i + 1}`}
                    aria-label={`Nombre de la columna ${i + 1}`}
                  />
                  {nombres.length > 2 ? (
                    <button
                      type="button"
                      className="btn btn-mini btn-peligro"
                      onClick={() => setNombres((prev) => prev.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-mini mt-2"
              onClick={() => setNombres((prev) => [...prev, ""])}
            >
              + Otra columna
            </button>
          </div>

          <label className="block">
            <span className="etiqueta">Por que no era atomico (opcional)</span>
            <textarea
              className="campo resize-y"
              rows={2}
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Guardaba nombre y apellido juntos, no se puede buscar por apellido."
            />
          </label>
        </div>
      </Dialogo>
    </>
  );
}
