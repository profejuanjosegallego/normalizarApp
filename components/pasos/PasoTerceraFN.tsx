"use client";

import { retirarAtributo } from "@/lib/modelo";
import type { Dependencia, Tabla } from "@/lib/tipos";
import EditorTabla from "../EditorTabla";
import type { PropsPaso } from "../Taller";
import { Aviso, Interruptor, Seccion } from "../ui";

export default function PasoTerceraFN({ trabajo, actualizar }: PropsPaso) {
  const { modelo } = trabajo;

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
                c.id === columnaId ? { ...c, dependencia: valor } : c,
              ),
            },
      ),
    }));
  }

  function retirar(tablaId: string, columnaId: string) {
    actualizar((t) => {
      const resultado = retirarAtributo(t.modelo, tablaId, columnaId);
      if (!resultado) return t;
      return {
        ...t,
        modelo: resultado.modelo,
        bitacora: {
          ...t.bitacora,
          transitivasResueltas: [...t.bitacora.transitivasResueltas, resultado.registro],
        },
      };
    });
  }

  return (
    <>
      <Seccion
        titulo="Paso 5 · Tercera forma normal"
        descripcion="Para cada atributo pregunta: ¿esto depende única y directamente del id de esta tabla? Si no depende, esa columna no pertenece aquí: retírala y agrégala en la tabla donde sí corresponde, o crea esa tabla si todavía no existe."
        acciones={
          <Interruptor
            activo={trabajo.declaraciones.sinTransitivas}
            onCambio={(v) =>
              actualizar((t) => ({
                ...t,
                declaraciones: { ...t.declaraciones, sinTransitivas: v },
              }))
            }
            etiqueta="Revisé todo y todos dependen del id"
          />
        }
      >
        <div className="space-y-3">
          <Aviso tono="info" titulo="La pregunta clave">
            Si conociendo el valor de otro atributo ya puedes deducir este, entonces este atributo
            no depende del id: depende de aquel. Ejemplo típico: el país de la editorial no depende
            del libro, depende de la editorial.
          </Aviso>
          <Aviso tono="alerta" titulo="Qué hace “Retirar atributo”">
            Borra esa columna de la tabla, con los valores que tenía. Tú decides después dónde va:
            usa “+ Columna” en la tabla que corresponda y marca la clave foránea que las une.
          </Aviso>
        </div>
      </Seccion>

      <div className="space-y-4">
        {modelo.map((tabla) => (
          <EditorTabla
            key={tabla.id}
            tabla={tabla}
            modelo={modelo}
            onCambio={cambiarTabla}
            editableEstructura
            permiteFK
            // Lo que se agrega aquí viene de un atributo ya clasificado en 1FN.
            columnaNueva={{ atomicidad: "atomico" }}
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
                    <option value="">¿de qué depende?</option>
                    <option value="pk">del id de esta tabla</option>
                    <option value="otro">no depende del id</option>
                  </select>
                  {col.dependencia === "otro" ? (
                    <button
                      type="button"
                      className="btn btn-mini btn-peligro"
                      onClick={() => retirar(tabla.id, col.id)}
                    >
                      Retirar atributo
                    </button>
                  ) : null}
                </div>
              );
            }}
          />
        ))}
      </div>

      {trabajo.bitacora.transitivasResueltas.length > 0 ? (
        <Seccion titulo="Atributos retirados" descripcion="Queda registrado en tu entrega.">
          <ul className="space-y-2">
            {trabajo.bitacora.transitivasResueltas.map((r) => (
              <li key={r.id} className="tarjeta-plana p-3 text-sm">
                <b>{r.atributosMovidos.join(", ")}</b>{" "}
                <span className="suave">
                  {r.tablaDestino
                    ? `salieron de ${r.tablaOrigen} hacia ${r.tablaDestino}${
                        r.creoTabla ? " (tabla nueva)" : " (tabla existente)"
                      }`
                    : `salieron de ${r.tablaOrigen}: no dependían de su id`}
                </span>
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}
    </>
  );
}
