"use client";

import { nuevoId } from "@/lib/ids";
import type { Cardinalidad } from "@/lib/tipos";
import DiagramaEntidades from "../DiagramaEntidades";
import type { PropsPaso } from "../Taller";
import { Aviso, Seccion } from "../ui";

const CARDINALIDADES: Cardinalidad[] = ["1:1", "1:N", "N:1", "N:M"];

export default function PasoEntidades({ trabajo, actualizar }: PropsPaso) {
  const { entidades, relaciones } = trabajo;

  function agregarEntidad() {
    actualizar((t) => ({
      ...t,
      entidades: [...t.entidades, { id: nuevoId("ent"), nombre: "", descripcion: "" }],
    }));
  }

  function editarEntidad(id: string, campo: "nombre" | "descripcion", valor: string) {
    actualizar((t) => ({
      ...t,
      entidades: t.entidades.map((e) => (e.id === id ? { ...e, [campo]: valor } : e)),
    }));
  }

  function quitarEntidad(id: string) {
    actualizar((t) => ({
      ...t,
      entidades: t.entidades.filter((e) => e.id !== id),
      relaciones: t.relaciones.filter((r) => r.origenId !== id && r.destinoId !== id),
    }));
  }

  function agregarRelacion() {
    actualizar((t) => ({
      ...t,
      relaciones: [
        ...t.relaciones,
        {
          id: nuevoId("rel"),
          origenId: t.entidades[0]?.id ?? "",
          destinoId: t.entidades[1]?.id ?? t.entidades[0]?.id ?? "",
          cardinalidad: "1:N",
          descripcion: "",
        },
      ],
    }));
  }

  function editarRelacion(id: string, parche: Partial<(typeof relaciones)[number]>) {
    actualizar((t) => ({
      ...t,
      relaciones: t.relaciones.map((r) => (r.id === id ? { ...r, ...parche } : r)),
    }));
  }

  function quitarRelacion(id: string) {
    actualizar((t) => ({ ...t, relaciones: t.relaciones.filter((r) => r.id !== id) }));
  }

  return (
    <>
      <Seccion
        titulo="Paso 1 · Entidades"
        descripcion="Lee el enunciado y anota los objetos del mundo real que necesitan guardarse. Normalmente son los sustantivos: usuario, libro, préstamo, programa."
        acciones={
          <button type="button" className="btn btn-primario" onClick={agregarEntidad}>
            + Entidad
          </button>
        }
      >
        {entidades.length === 0 ? (
          <Aviso tono="info">
            Aún no has identificado entidades. Empieza con las más evidentes del enunciado; después
            puedes agregar o quitar.
          </Aviso>
        ) : (
          <div className="space-y-2">
            {entidades.map((e, i) => (
              <div key={e.id} className="tarjeta-plana flex flex-wrap items-start gap-2 p-3">
                <span className="suave w-5 pt-2 text-xs font-bold">{i + 1}</span>
                <input
                  className="campo w-full sm:w-56"
                  placeholder="Nombre de la entidad"
                  value={e.nombre}
                  onChange={(ev) => editarEntidad(e.id, "nombre", ev.target.value)}
                  aria-label="Nombre de la entidad"
                />
                <input
                  className="campo min-w-0 flex-1"
                  placeholder="Qué representa y por qué la separaste (opcional)"
                  value={e.descripcion}
                  onChange={(ev) => editarEntidad(e.id, "descripcion", ev.target.value)}
                  aria-label="Descripción de la entidad"
                />
                <button
                  type="button"
                  className="btn btn-mini btn-peligro"
                  onClick={() => quitarEntidad(e.id)}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </Seccion>

      <Seccion
        titulo="Paso 1 · Relaciones"
        descripcion="Di cómo se conectan las entidades. La cardinalidad N:M te anticipa que más adelante necesitarás una tabla de transición."
        acciones={
          <button
            type="button"
            className="btn btn-primario"
            onClick={agregarRelacion}
            disabled={entidades.length < 2}
          >
            + Relacion
          </button>
        }
      >
        {entidades.length < 2 ? (
          <Aviso tono="info">Necesitas al menos dos entidades para relacionarlas.</Aviso>
        ) : relaciones.length === 0 ? (
          <Aviso tono="info">Agrega las relaciones que describe el enunciado.</Aviso>
        ) : (
          <div className="space-y-2">
            {relaciones.map((r) => (
              <div key={r.id} className="tarjeta-plana flex flex-wrap items-center gap-2 p-3">
                <select
                  className="campo w-full sm:w-44"
                  value={r.origenId}
                  onChange={(ev) => editarRelacion(r.id, { origenId: ev.target.value })}
                  aria-label="Entidad origen"
                >
                  {entidades.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre || "(sin nombre)"}
                    </option>
                  ))}
                </select>
                <select
                  className="campo w-24"
                  value={r.cardinalidad}
                  onChange={(ev) =>
                    editarRelacion(r.id, { cardinalidad: ev.target.value as Cardinalidad })
                  }
                  aria-label="Cardinalidad"
                >
                  {CARDINALIDADES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  className="campo w-full sm:w-44"
                  value={r.destinoId}
                  onChange={(ev) => editarRelacion(r.id, { destinoId: ev.target.value })}
                  aria-label="Entidad destino"
                >
                  {entidades.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre || "(sin nombre)"}
                    </option>
                  ))}
                </select>
                <input
                  className="campo min-w-0 flex-1"
                  placeholder="Frase que la describe: “un usuario toma prestados varios libros”"
                  value={r.descripcion}
                  onChange={(ev) => editarRelacion(r.id, { descripcion: ev.target.value })}
                  aria-label="Descripción de la relación"
                />
                <button
                  type="button"
                  className="btn btn-mini btn-peligro"
                  onClick={() => quitarRelacion(r.id)}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {entidades.length > 0 ? (
        <Seccion
          titulo="Diagrama conceptual"
          descripcion="Así se ve tu modelo antes de convertirlo en tablas: rectángulos para las entidades, rombos para las relaciones y la cardinalidad a cada lado."
        >
          <DiagramaEntidades entidades={entidades} relaciones={relaciones} />
        </Seccion>
      ) : null}
    </>
  );
}
