"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Area, Aviso, BotonCopiar, Campo, Seccion } from "@/components/ui";
import { cargarBorradorDocente, descargarJSON, guardarBorradorDocente } from "@/lib/almacenamiento";
import { codificarEjercicio } from "@/lib/codec";
import { EJERCICIO_DEMO } from "@/lib/ejemplo";
import { aSnake, nuevoId } from "@/lib/ids";
import type { Ejercicio } from "@/lib/tipos";

function ejercicioVacio(): Ejercicio {
  return {
    id: nuevoId("ej"),
    titulo: "",
    curso: "",
    docente: "",
    enunciado: "",
    contextoAtomicidad: "",
    minRegistros: 2,
    pistas: [],
    fechaEntrega: "",
    creado: new Date().toISOString(),
  };
}

export default function PaginaProfesor() {
  const [ejercicio, setEjercicio] = useState<Ejercicio>(ejercicioVacio);
  const [origen, setOrigen] = useState("");
  const [cargado, setCargado] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOrigen(window.location.origin);
    const borrador = cargarBorradorDocente();
    if (borrador) setEjercicio(borrador);
    setCargado(true);
  }, []);

  useEffect(() => {
    if (cargado) guardarBorradorDocente(ejercicio);
  }, [ejercicio, cargado]);

  const codigo = useMemo(() => codificarEjercicio(ejercicio), [ejercicio]);
  const enlace = `${origen}/ejercicio#e=${codigo}`;
  const listo = ejercicio.titulo.trim().length > 2 && ejercicio.enunciado.trim().length > 20;

  function fijar<K extends keyof Ejercicio>(campo: K, valor: Ejercicio[K]) {
    setEjercicio((prev) => ({ ...prev, [campo]: valor }));
  }

  function editarPista(i: number, valor: string) {
    setEjercicio((prev) => ({
      ...prev,
      pistas: prev.pistas.map((p, j) => (j === i ? valor : p)),
    }));
  }

  async function importar(archivos: FileList | null) {
    const f = archivos?.[0];
    if (!f) return;
    try {
      const dato = JSON.parse(await f.text()) as Ejercicio;
      if (dato && typeof dato.enunciado === "string") {
        setEjercicio({ ...ejercicioVacio(), ...dato });
      }
    } catch {
      // archivo invalido: se ignora
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm font-bold" style={{ color: "var(--acento)" }}>
            ← Inicio
          </Link>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Crear ejercicio</h1>
          <p className="suave mt-1 text-sm">
            El enunciado se guarda dentro del propio enlace. Comparte el enlace y tus estudiantes
            empiezan a trabajar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => archivo.current?.click()}>
            Cargar .json
          </button>
          <input
            ref={archivo}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => importar(e.target.files)}
          />
          <button
            type="button"
            className="btn"
            onClick={() => setEjercicio({ ...EJERCICIO_DEMO, id: nuevoId("ej") })}
          >
            Usar ejemplo
          </button>
          <button
            type="button"
            className="btn btn-peligro"
            onClick={() => setEjercicio(ejercicioVacio())}
          >
            Nuevo
          </button>
        </div>
      </header>

      <div className="space-y-5">
        <Seccion titulo="Identificacion">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              etiqueta="Titulo del ejercicio"
              value={ejercicio.titulo}
              onChange={(e) => fijar("titulo", e.target.value)}
              placeholder="Sistema de prestamos de la biblioteca"
            />
            <Campo
              etiqueta="Curso o asignatura"
              value={ejercicio.curso}
              onChange={(e) => fijar("curso", e.target.value)}
              placeholder="Bases de Datos I"
            />
            <Campo
              etiqueta="Docente"
              value={ejercicio.docente}
              onChange={(e) => fijar("docente", e.target.value)}
            />
            <Campo
              etiqueta="Fecha de entrega (opcional)"
              type="date"
              value={ejercicio.fechaEntrega}
              onChange={(e) => fijar("fechaEntrega", e.target.value)}
            />
          </div>
        </Seccion>

        <Seccion
          titulo="Enunciado"
          descripcion="El caso completo. Se muestra siempre visible al estudiante mientras trabaja."
        >
          <Area
            etiqueta="Texto del caso"
            rows={12}
            value={ejercicio.enunciado}
            onChange={(e) => fijar("enunciado", e.target.value)}
            placeholder="La biblioteca necesita controlar los prestamos. De cada usuario se registra…"
            ayuda={`${ejercicio.enunciado.length} caracteres`}
          />
        </Seccion>

        <Seccion
          titulo="Reglas de atomicidad"
          descripcion="Aqui defines que se descompone y que no en este ejercicio. Es la referencia que el estudiante consulta en el paso de 1FN."
        >
          <Area
            etiqueta="Que es atomico en este contexto"
            rows={6}
            value={ejercicio.contextoAtomicidad}
            onChange={(e) => fijar("contextoAtomicidad", e.target.value)}
            placeholder={"- El nombre completo SI se descompone.\n- La direccion SI se descompone.\n- Las fechas NO se descomponen."}
          />
          <div className="mt-3 max-w-xs">
            <Campo
              etiqueta="Registros minimos por tabla"
              type="number"
              min={1}
              max={10}
              value={ejercicio.minRegistros}
              onChange={(e) => fijar("minRegistros", Math.max(1, Number(e.target.value) || 1))}
              ayuda="Cantidad de filas de ejemplo que debe llenar el estudiante."
            />
          </div>
        </Seccion>

        <Seccion
          titulo="Pistas"
          descripcion="Opcionales. El estudiante las ve plegadas y decide si las abre."
          acciones={
            <button
              type="button"
              className="btn"
              onClick={() => fijar("pistas", [...ejercicio.pistas, ""])}
            >
              + Pista
            </button>
          }
        >
          {ejercicio.pistas.length === 0 ? (
            <p className="suave text-sm">Sin pistas.</p>
          ) : (
            <div className="space-y-2">
              {ejercicio.pistas.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="campo"
                    value={p}
                    onChange={(e) => editarPista(i, e.target.value)}
                    placeholder="El pais de la editorial no depende del libro."
                    aria-label={`Pista ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="btn btn-mini btn-peligro"
                    onClick={() =>
                      fijar(
                        "pistas",
                        ejercicio.pistas.filter((_, j) => j !== i),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Seccion>

        <Seccion
          titulo="Compartir"
          descripcion="El enlace contiene el enunciado completo. Si lo editas y vuelves a compartirlo, tus estudiantes conservan el avance que ya tenian."
        >
          {!listo ? (
            <Aviso tono="alerta">
              Completa al menos el titulo y un enunciado de mas de 20 caracteres para generar el
              enlace.
            </Aviso>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="etiqueta">Enlace para el curso</span>
                <textarea className="campo resize-y font-mono text-xs" rows={3} readOnly value={enlace} />
              </label>
              <div className="flex flex-wrap gap-2">
                <BotonCopiar texto={enlace} etiqueta="Copiar enlace" className="btn btn-primario" />
                <BotonCopiar texto={codigo} etiqueta="Copiar solo el codigo" />
                <a className="btn" href={`/ejercicio#e=${codigo}`} target="_blank" rel="noreferrer">
                  Probar como estudiante
                </a>
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    descargarJSON(`${aSnake(ejercicio.titulo) || "ejercicio"}.json`, ejercicio)
                  }
                >
                  Descargar .json
                </button>
              </div>
              <p className="suave text-xs">
                Longitud del enlace: {enlace.length} caracteres.
                {enlace.length > 6000
                  ? " Es largo: comparte el archivo .json o acorta el enunciado si tu plataforma corta enlaces."
                  : ""}
              </p>
            </div>
          )}
        </Seccion>
      </div>
    </div>
  );
}
