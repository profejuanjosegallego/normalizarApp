"use client";

import { useState } from "react";
import type { Estado, TablaBD } from "@/lib/sqlmotor";

/**
 * Arbol de la base de datos: bases, tablas, columnas y filas.
 *
 * Es la mitad util de la pantalla para quien empieza: aqui se ve el efecto de
 * cada CREATE y cada INSERT sin tener que escribir un SELECT para comprobarlo.
 */

function Columnas({ tabla }: { tabla: TablaBD }) {
  return (
    <ul className="mt-1 space-y-0.5">
      {tabla.columnas.map((c) => {
        const esPK = tabla.pk.some((p) => p.toLowerCase() === c.nombre.toLowerCase());
        return (
          <li key={c.nombre} className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-mono">{c.nombre}</span>
            <span className="suave font-mono text-[0.68rem]">{c.tipo}</span>
            {esPK ? <span className="chip chip-pk">PK</span> : null}
            {c.autoIncrement ? <span className="chip">auto</span> : null}
            {c.fk ? (
              <span className="chip chip-fk" title={"apunta a " + c.fk.tabla + "." + c.fk.columna}>
                FK → {c.fk.tabla}
              </span>
            ) : null}
            {c.noNula && !esPK ? <span className="chip">obligatorio</span> : null}
            {c.unica && !esPK ? <span className="chip">único</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function Datos({ tabla }: { tabla: TablaBD }) {
  if (tabla.filas.length === 0) {
    return <p className="suave mt-2 text-xs">Todavía sin filas.</p>;
  }
  const muestra = tabla.filas.slice(0, 6);
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="rejilla w-full border-collapse text-[0.7rem]">
        <thead>
          <tr>
            {tabla.columnas.map((c) => (
              <th key={c.nombre} className="px-2 py-1 font-mono font-semibold">
                {c.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {muestra.map((f, i) => (
            <tr key={i}>
              {tabla.columnas.map((c) => {
                const v = f[c.nombre] ?? null;
                return (
                  <td key={c.nombre} className="px-2 py-1 font-mono">
                    {v === null ? <span className="suave italic">NULL</span> : String(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {tabla.filas.length > muestra.length ? (
        <p className="suave mt-1 text-[0.68rem]">
          … y {tabla.filas.length - muestra.length} fila(s) más. Míralas con SELECT * FROM{" "}
          {tabla.nombre};
        </p>
      ) : null}
    </div>
  );
}

export default function ExploradorBD({ estado }: { estado: Estado }) {
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});

  function alternar(clave: string) {
    setAbiertas((a) => ({ ...a, [clave]: !a[clave] }));
  }

  if (estado.servidor.bases.length === 0) {
    return (
      <div className="tarjeta-plana p-4">
        <p className="titulo-seccion">Tu servidor</p>
        <p className="suave mt-2 text-sm leading-relaxed">
          Todavía no hay ninguna base de datos. En cuanto ejecutes tu primer{" "}
          <span className="font-mono">CREATE DATABASE</span> aparecerá aquí, y desde entonces
          verás en vivo cada tabla que crees y cada fila que insertes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {estado.servidor.bases.map((base) => {
        const activa = estado.servidor.activa?.toLowerCase() === base.nombre.toLowerCase();
        return (
          <div key={base.nombre} className="tarjeta-plana p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span aria-hidden>🗄️</span>
              <span className="font-mono text-sm font-bold">{base.nombre}</span>
              {activa ? <span className="chip chip-ok">en uso</span> : null}
              <span className="suave text-xs">
                {base.tablas.length} tabla{base.tablas.length === 1 ? "" : "s"}
              </span>
            </div>

            {!activa && base.tablas.length > 0 ? (
              <p className="suave mt-1 text-[0.68rem]">
                Para trabajar en ella: <span className="font-mono">USE {base.nombre};</span>
              </p>
            ) : null}

            {base.tablas.length === 0 ? (
              <p className="suave mt-2 text-xs">Sin tablas todavía.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {base.tablas.map((tabla) => {
                  const clave = base.nombre + "." + tabla.nombre;
                  const abierta = abiertas[clave] ?? true;
                  return (
                    <li
                      key={tabla.nombre}
                      className="rounded-lg p-2"
                      style={{ background: "var(--superficie)" }}
                    >
                      <button
                        type="button"
                        className="flex w-full flex-wrap items-center gap-2 text-left"
                        onClick={() => alternar(clave)}
                        aria-expanded={abierta}
                      >
                        <span className="suave text-[0.6rem]" aria-hidden>
                          {abierta ? "▼" : "▶"}
                        </span>
                        <span className="font-mono text-sm font-semibold">{tabla.nombre}</span>
                        <span className="suave text-xs">
                          {tabla.columnas.length} col · {tabla.filas.length} fila
                          {tabla.filas.length === 1 ? "" : "s"}
                        </span>
                        {tabla.pk.length === 0 ? (
                          <span className="chip chip-error">sin PK</span>
                        ) : null}
                      </button>

                      {abierta ? (
                        <div className="mt-2 pl-4">
                          <Columnas tabla={tabla} />
                          <Datos tabla={tabla} />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
