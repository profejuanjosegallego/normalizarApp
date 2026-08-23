"use client";

import type { Ejecucion } from "@/lib/sqlmotor";

/** Lo que devolvio cada sentencia del ultimo script ejecutado. */
export default function ResultadosSQL({ ejecuciones }: { ejecuciones: Ejecucion[] }) {
  if (ejecuciones.length === 0) {
    return (
      <p className="suave text-sm">
        Escribe una instrucción arriba y pulsa <strong>Ejecutar</strong> (o Ctrl + Enter). Aquí
        aparecerá lo que devuelva.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {ejecuciones.map((e, i) => (
        <div key={i}>
          <p className="suave font-mono text-[0.7rem]">
            <span style={{ color: e.ok ? "var(--ok)" : "var(--error)" }}>
              {e.ok ? "✓" : "✕"}
            </span>{" "}
            línea {e.linea} · {primeraLinea(e.sql)}
          </p>

          {e.error ? (
            <div
              className="mt-1 rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--error-suave)" }}
            >
              <p className="font-semibold" style={{ color: "var(--error)" }}>
                {e.error.mensaje}
              </p>
              {e.error.pista ? (
                <p className="mt-1 text-[0.8rem] leading-relaxed" style={{ color: "var(--texto)" }}>
                  {e.error.pista}
                </p>
              ) : null}
            </div>
          ) : null}

          {e.resultado?.clase === "mensaje" ? (
            <div
              className="mt-1 rounded-xl px-4 py-2 text-sm"
              style={{ background: "var(--ok-suave)", color: "var(--texto)" }}
            >
              {e.resultado.texto}
            </div>
          ) : null}

          {e.resultado?.clase === "rejilla" ? (
            <div className="mt-1">
              {e.resultado.filas.length === 0 ? (
                <div
                  className="rounded-xl px-4 py-2 text-sm"
                  style={{ background: "var(--superficie-2)" }}
                >
                  {e.resultado.resumen}.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="rejilla w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          {e.resultado.columnas.map((c) => (
                            <th key={c} className="px-2.5 py-1.5 font-mono font-semibold">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {e.resultado.filas.map((fila, f) => (
                          <tr key={f}>
                            {fila.map((v, c) => (
                              <td key={c} className="px-2.5 py-1.5 font-mono">
                                {v === null ? (
                                  <span className="suave italic">NULL</span>
                                ) : (
                                  String(v)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="suave mt-1 text-xs">{e.resultado.resumen}</p>
                </>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function primeraLinea(sql: string): string {
  const linea = sql.split("\n")[0]?.trim() ?? "";
  return linea.length > 70 ? linea.slice(0, 70) + "…" : linea;
}
