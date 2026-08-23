"use client";

import type { Estado } from "@/lib/sqlmotor";
import { BLOQUES, retosCumplidos, TOTAL_RETOS } from "@/lib/sqlretos";

/**
 * Lista de retos que se marcan solos.
 *
 * Solo comprueba que la operacion se haya hecho: los nombres de las tablas, las
 * columnas y los datos los decide el estudiante, y si el modelo tiene sentido
 * lo califica el docente.
 */
export default function PanelRetos({ estado }: { estado: Estado }) {
  const cumplidos = retosCumplidos(estado);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="titulo-seccion">Retos</p>
        <span className="chip">
          {cumplidos.size} de {TOTAL_RETOS}
        </span>
      </div>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full"
        style={{ background: "var(--superficie-3)" }}
        role="progressbar"
        aria-valuenow={cumplidos.size}
        aria-valuemin={0}
        aria-valuemax={TOTAL_RETOS}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: (cumplidos.size / TOTAL_RETOS) * 100 + "%",
            background: "var(--ok)",
          }}
        />
      </div>

      <p className="suave mt-3 text-xs leading-relaxed">
        Los nombres de las tablas y de las columnas los eliges tú: aquí solo se comprueba que
        hayas hecho la operación.
      </p>

      <div className="mt-4 space-y-4">
        {BLOQUES.map((bloque) => {
          const listos = bloque.retos.filter((r) => cumplidos.has(r.id)).length;
          const completo = listos === bloque.retos.length;
          return (
            <section key={bloque.titulo}>
              <h3 className="flex items-center gap-2 text-sm font-bold">
                {bloque.titulo}
                {completo ? <span className="chip chip-ok">listo</span> : null}
              </h3>
              <p className="suave mt-1 text-xs leading-relaxed">{bloque.intro}</p>

              <ul className="mt-2 space-y-2">
                {bloque.retos.map((reto) => {
                  const ok = cumplidos.has(reto.id);
                  return (
                    <li key={reto.id} className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className="mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
                        style={{
                          background: ok ? "var(--ok-suave)" : "var(--superficie-3)",
                          color: ok ? "var(--ok)" : "var(--texto-suave)",
                        }}
                      >
                        {ok ? "✓" : "·"}
                      </span>
                      <div className="min-w-0">
                        <p
                          className="text-[0.82rem] leading-snug"
                          style={{ color: ok ? "var(--texto)" : "var(--texto-suave)" }}
                        >
                          {reto.titulo}
                        </p>
                        {!ok ? (
                          <pre
                            className="suave mt-1 overflow-x-auto rounded-lg px-2 py-1 font-mono text-[0.68rem] leading-relaxed"
                            style={{ background: "var(--superficie-2)" }}
                          >
                            {reto.forma}
                          </pre>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {cumplidos.size === TOTAL_RETOS ? (
        <div
          className="mt-5 rounded-xl px-4 py-3 text-sm"
          style={{ background: "var(--ok-suave)", color: "var(--texto)" }}
        >
          <p className="font-bold" style={{ color: "var(--ok)" }}>
            Terminaste los retos
          </p>
          <p className="mt-1 leading-relaxed">
            Ya sabes crear una base, estructurar tablas con sus llaves, llenarlas, consultarlas y
            depurarlas. Ahora prueba con el modelo que normalizaste en el taller.
          </p>
        </div>
      ) : null}
    </div>
  );
}
