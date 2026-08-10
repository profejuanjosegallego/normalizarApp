"use client";

import { useMemo } from "react";
import { descargarJSON, descargarTexto } from "@/lib/almacenamiento";
import { aSnake } from "@/lib/ids";
import { columnasPK } from "@/lib/modelo";
import { generarSQL } from "@/lib/sql";
import { PASOS, type FormaNormal } from "@/lib/tipos";
import { progresoGlobal, validarPaso } from "@/lib/validaciones";
import DiagramaER from "../DiagramaER";
import EditorTabla from "../EditorTabla";
import type { PropsPaso } from "../Taller";
import { Aviso, BotonCopiar, ListaChequeos, Seccion } from "../ui";

const ETAPAS: { forma: FormaNormal; titulo: string }[] = [
  { forma: "unf", titulo: "Sin normalizar" },
  { forma: "1fn", titulo: "1FN" },
  { forma: "2fn", titulo: "2FN" },
  { forma: "3fn", titulo: "3FN" },
];

/** Diagrama entidad-relacion en sintaxis Mermaid, para pegar donde se quiera. */
function generarMermaid(trabajo: PropsPaso["trabajo"]): string {
  const lineas = ["erDiagram"];
  for (const tabla of trabajo.modelo) {
    lineas.push(`  ${aSnake(tabla.nombre).toUpperCase()} {`);
    for (const col of tabla.columnas) {
      const tipo = (col.tipo || (col.esPK || col.esFK ? "int" : "string"))
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toLowerCase();
      const marca = col.esPK ? " PK" : col.esFK ? " FK" : "";
      lineas.push(`    ${tipo} ${aSnake(col.nombre)}${marca}`);
    }
    lineas.push("  }");
  }
  for (const tabla of trabajo.modelo) {
    for (const col of tabla.columnas) {
      if (!col.esFK || !col.refTablaId) continue;
      const destino = trabajo.modelo.find((t) => t.id === col.refTablaId);
      if (!destino) continue;
      lineas.push(
        `  ${aSnake(destino.nombre).toUpperCase()} ||--o{ ${aSnake(tabla.nombre).toUpperCase()} : "${aSnake(col.nombre)}"`,
      );
    }
  }
  return lineas.join("\n");
}

export default function PasoEntrega({ trabajo, actualizar }: PropsPaso) {
  const sql = useMemo(() => generarSQL(trabajo.modelo), [trabajo.modelo]);
  const mermaid = useMemo(() => generarMermaid(trabajo), [trabajo]);
  const progreso = progresoGlobal(trabajo);
  const pendientes = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5]
        .map((p) => ({ paso: p, fallas: validarPaso(p, trabajo).filter((c) => !c.ok) }))
        .filter((x) => x.fallas.length > 0),
    [trabajo],
  );

  const base = `${aSnake(trabajo.estudiante.nombre) || "estudiante"}_${aSnake(trabajo.ejercicio.titulo) || "ejercicio"}`;

  function exportar() {
    descargarJSON(`${base}.json`, trabajo);
  }

  return (
    <>
      <Seccion
        titulo="Paso 6 · Entrega"
        descripcion="Revisa tu modelo final, descarga el archivo y entregalo a tu docente."
        acciones={
          <>
            <button type="button" className="btn btn-primario no-imprimir" onClick={exportar}>
              Descargar entrega (.json)
            </button>
            <button
              type="button"
              className="btn no-imprimir"
              onClick={() => descargarTexto(`${base}.sql`, sql)}
            >
              Descargar SQL
            </button>
            <button type="button" className="btn no-imprimir" onClick={() => window.print()}>
              Imprimir / PDF
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="tarjeta-plana p-3">
            <p className="titulo-seccion">Verificaciones</p>
            <p className="text-2xl font-bold">
              {progreso.hechos}
              <span className="suave text-base">/{progreso.total}</span>
            </p>
          </div>
          <div className="tarjeta-plana p-3">
            <p className="titulo-seccion">Tablas finales</p>
            <p className="text-2xl font-bold">{trabajo.modelo.length}</p>
          </div>
          <div className="tarjeta-plana p-3">
            <p className="titulo-seccion">Grupos resueltos</p>
            <p className="text-2xl font-bold">{trabajo.bitacora.gruposResueltos.length}</p>
          </div>
          <div className="tarjeta-plana p-3">
            <p className="titulo-seccion">Transitivas resueltas</p>
            <p className="text-2xl font-bold">{trabajo.bitacora.transitivasResueltas.length}</p>
          </div>
        </div>

        {pendientes.length > 0 ? (
          <div className="no-imprimir mt-4">
            <Aviso tono="alerta" titulo="Todavia hay verificaciones sin cumplir">
              <div className="mt-2 space-y-3">
                {pendientes.map(({ paso, fallas }) => (
                  <div key={paso}>
                    <button
                      type="button"
                      className="btn btn-mini mb-1"
                      onClick={() => actualizar((t) => ({ ...t, pasoActual: paso }))}
                    >
                      Ir al paso {paso}: {PASOS[paso]}
                    </button>
                    <ListaChequeos chequeos={fallas} />
                  </div>
                ))}
              </div>
            </Aviso>
          </div>
        ) : (
          <div className="mt-4">
            <Aviso tono="ok" titulo="Modelo completo">
              Pasaste todas las verificaciones estructurales del taller. Recuerda que la correccion
              del modelo frente al enunciado la revisa tu docente.
            </Aviso>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Datos de la entrega">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="titulo-seccion">Estudiante</dt>
            <dd>
              {trabajo.estudiante.nombre || "—"}
              {trabajo.estudiante.codigo ? ` · ${trabajo.estudiante.codigo}` : ""}
              {trabajo.estudiante.grupo ? ` · ${trabajo.estudiante.grupo}` : ""}
            </dd>
          </div>
          <div>
            <dt className="titulo-seccion">Ejercicio</dt>
            <dd>
              {trabajo.ejercicio.titulo}
              {trabajo.ejercicio.curso ? ` · ${trabajo.ejercicio.curso}` : ""}
            </dd>
          </div>
        </dl>
      </Seccion>

      <Seccion
        titulo="Evolucion del modelo"
        descripcion="Cuantas tablas tenias al cerrar cada forma normal."
      >
        <div className="grid gap-3 sm:grid-cols-4">
          {ETAPAS.map(({ forma, titulo }) => {
            const foto = trabajo.snapshots[forma];
            return (
              <div key={forma} className="tarjeta-plana p-3">
                <p className="titulo-seccion">{titulo}</p>
                {foto ? (
                  <>
                    <p className="text-xl font-bold">{foto.length} tablas</p>
                    <p className="suave mt-1 text-xs">{foto.map((t) => t.nombre).join(", ")}</p>
                  </>
                ) : (
                  <p className="suave text-xs">Sin registrar</p>
                )}
              </div>
            );
          })}
        </div>
      </Seccion>

      <Seccion
        titulo="Diagrama entidad-relacion"
        descripcion="Tu modelo final. Arrastra las tablas para acomodarlo antes de imprimir o entregar."
      >
        <DiagramaER
          modelo={trabajo.modelo}
          posiciones={trabajo.posiciones}
          onMover={(id, posicion) =>
            actualizar((t) => ({ ...t, posiciones: { ...t.posiciones, [id]: posicion } }))
          }
          onReorganizar={(posiciones) => actualizar((t) => ({ ...t, posiciones }))}
          altoMaximo="80vh"
        />
      </Seccion>

      <Seccion titulo="Modelo final" descripcion="Estructura y registros tal como quedaron.">
        <div className="space-y-4">
          {trabajo.modelo.map((tabla) => (
            <EditorTabla key={tabla.id} tabla={tabla} modelo={trabajo.modelo} onCambio={() => {}} soloLectura />
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Relaciones del modelo final">
        {trabajo.modelo.some((t) => t.columnas.some((c) => c.esFK)) ? (
          <ul className="space-y-1 text-sm">
            {trabajo.modelo.flatMap((tabla) =>
              tabla.columnas
                .filter((c) => c.esFK && c.refTablaId)
                .map((c) => {
                  const destino = trabajo.modelo.find((t) => t.id === c.refTablaId);
                  const pk = destino ? columnasPK(destino)[0] : undefined;
                  return (
                    <li key={`${tabla.id}-${c.id}`}>
                      <code>
                        {aSnake(tabla.nombre)}.{aSnake(c.nombre)}
                      </code>{" "}
                      →{" "}
                      <code>
                        {aSnake(destino?.nombre ?? "?")}.{aSnake(pk?.nombre ?? "id")}
                      </code>
                    </li>
                  );
                }),
            )}
          </ul>
        ) : (
          <p className="suave text-sm">El modelo final no tiene claves foraneas.</p>
        )}
      </Seccion>

      <Seccion
        titulo="Script SQL"
        descripcion="Generado a partir de tu modelo final (MySQL / MariaDB)."
        acciones={<BotonCopiar texto={sql} etiqueta="Copiar SQL" />}
      >
        <pre className="tarjeta-plana max-h-96 overflow-auto p-3 text-xs leading-relaxed">{sql}</pre>
      </Seccion>

      <Seccion
        titulo="Diagrama (Mermaid)"
        descripcion="Pegalo en mermaid.live, Notion o en tu informe para ver el diagrama entidad-relacion."
        acciones={<BotonCopiar texto={mermaid} etiqueta="Copiar diagrama" />}
      >
        <pre className="tarjeta-plana max-h-72 overflow-auto p-3 text-xs leading-relaxed">
          {mermaid}
        </pre>
      </Seccion>
    </>
  );
}
