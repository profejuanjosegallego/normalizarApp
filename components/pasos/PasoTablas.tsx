"use client";

import { aSnake } from "@/lib/ids";
import { eliminarTabla, nuevaFila, nuevaTabla } from "@/lib/modelo";
import type { Tabla } from "@/lib/tipos";
import EditorTabla from "../EditorTabla";
import type { PropsPaso } from "../Taller";
import { Aviso, Seccion } from "../ui";

export default function PasoTablas({ trabajo, actualizar }: PropsPaso) {
  const { modelo, entidades, ejercicio } = trabajo;

  const faltantes = entidades.filter(
    (e) => e.nombre.trim() && !modelo.some((t) => aSnake(t.nombre) === aSnake(e.nombre)),
  );

  function generarDesdeEntidades() {
    actualizar((t) => {
      const nuevas = t.entidades
        .filter(
          (e) => e.nombre.trim() && !t.modelo.some((tb) => aSnake(tb.nombre) === aSnake(e.nombre)),
        )
        .map((e) => {
          const tabla = nuevaTabla(aSnake(e.nombre), "unf");
          // Dos registros vacios listos para llenar, como en la hoja de calculo.
          for (let i = 0; i < ejercicio.minRegistros; i += 1) {
            tabla.filas.push(nuevaFila(tabla.columnas));
          }
          return tabla;
        });
      return { ...t, modelo: [...t.modelo, ...nuevas] };
    });
  }

  function agregarTablaVacia() {
    actualizar((t) => {
      const tabla = nuevaTabla(`tabla_${t.modelo.length + 1}`, "unf");
      for (let i = 0; i < ejercicio.minRegistros; i += 1) {
        tabla.filas.push(nuevaFila(tabla.columnas));
      }
      return { ...t, modelo: [...t.modelo, tabla] };
    });
  }

  function cambiarTabla(tabla: Tabla) {
    actualizar((t) => ({ ...t, modelo: t.modelo.map((x) => (x.id === tabla.id ? tabla : x)) }));
  }

  function quitarTabla(id: string) {
    actualizar((t) => ({ ...t, modelo: eliminarTabla(t.modelo, id) }));
  }

  return (
    <>
      <Seccion
        titulo="Paso 2 · Tablas y registros iniciales"
        descripcion={`Las tablas nacen vacias: tu decides que columnas lleva cada una, incluido el identificador. Agrega los atributos tal como aparecen en el enunciado (todavia sin normalizar) y llena al menos ${ejercicio.minRegistros} registros. Los datos de ejemplo son los que despues te permiten ver los grupos de repeticion y las dependencias.`}
        acciones={
          <>
            {faltantes.length > 0 ? (
              <button type="button" className="btn btn-primario" onClick={generarDesdeEntidades}>
                Crear {faltantes.length} tabla(s) desde mis entidades
              </button>
            ) : null}
            <button type="button" className="btn" onClick={agregarTablaVacia}>
              + Tabla vacia
            </button>
          </>
        }
      >
        <Aviso tono="info">
          Escribe los atributos como salen del enunciado, aunque sepas que estan mal: si el enunciado
          dice “nombre completo” o “telefonos”, ponlo asi. Normalizar es justamente corregir eso en
          los pasos siguientes. Piensa tambien como vas a identificar cada registro: en el paso de
          1FN tendras que justificar que ese identificador es unico y autogenerado.
        </Aviso>
      </Seccion>

      {modelo.length === 0 ? (
        <Seccion titulo="Sin tablas todavia">
          <p className="suave text-sm">
            Usa los botones de arriba para crear tus tablas a partir de las entidades que
            identificaste.
          </p>
        </Seccion>
      ) : (
        <div className="space-y-4">
          {modelo.map((tabla) => (
            <EditorTabla
              key={tabla.id}
              tabla={tabla}
              modelo={modelo}
              onCambio={cambiarTabla}
              onEliminar={() => quitarTabla(tabla.id)}
              editableEstructura
            />
          ))}
        </div>
      )}
    </>
  );
}
