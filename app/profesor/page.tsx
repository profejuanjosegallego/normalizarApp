"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Area, Aviso, BotonCopiar, Campo, Dialogo, Seccion } from "@/components/ui";
import {
  cargarBorradorDocente,
  cargarPublicacion,
  descargarJSON,
  guardarBorradorDocente,
  guardarPublicacion,
  listarPublicaciones,
  olvidarPublicacion,
  type Publicacion,
  type PublicacionListada,
} from "@/lib/almacenamiento";
import { codificarEjercicio } from "@/lib/codec";
import { EJERCICIO_DEMO } from "@/lib/ejemplo";
import { aSnake, nuevoId } from "@/lib/ids";
import {
  actualizarEjercicio,
  eliminarEjercicio,
  ErrorBackend,
  hayBackend,
  publicarEjercicio,
} from "@/lib/supabase";
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
  const [publicacion, setPublicacion] = useState<Publicacion | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState("");
  const [publicados, setPublicados] = useState<PublicacionListada[]>([]);
  const [borrando, setBorrando] = useState("");
  const [porBorrar, setPorBorrar] = useState<PublicacionListada | null>(null);
  const [errorBorrar, setErrorBorrar] = useState("");
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

  // Cada ejercicio recuerda si ya fue publicado y con que codigo.
  useEffect(() => {
    setPublicacion(cargarPublicacion(ejercicio.id));
    setErrorPublicar("");
  }, [ejercicio.id]);

  useEffect(() => {
    if (cargado) setPublicados(listarPublicaciones());
  }, [cargado, publicacion]);

  const codigo = useMemo(() => codificarEjercicio(ejercicio), [ejercicio]);
  const enlace = `${origen}/ejercicio#e=${codigo}`;
  const listo = ejercicio.titulo.trim().length > 2 && ejercicio.enunciado.trim().length > 20;

  const enlaceCorto = publicacion ? `${origen}/ejercicio#c=${publicacion.codigo}` : "";
  /** El docente edito el enunciado despues de publicarlo. */
  const desactualizado = !!publicacion && publicacion.firma !== codigo;

  async function publicar() {
    setPublicando(true);
    setErrorPublicar("");
    try {
      if (publicacion) {
        // Mismo codigo y mismo id: los estudiantes conservan su avance.
        await actualizarEjercicio(publicacion.codigo, publicacion.claveEdicion, ejercicio);
        const actualizada: Publicacion = {
          ...publicacion,
          firma: codigo,
          titulo: ejercicio.titulo,
        };
        guardarPublicacion(ejercicio.id, actualizada);
        setPublicacion(actualizada);
      } else {
        const { codigo: corto, claveEdicion } = await publicarEjercicio(ejercicio);
        const nueva: Publicacion = {
          codigo: corto,
          claveEdicion,
          publicadoEn: new Date().toISOString(),
          firma: codigo,
          titulo: ejercicio.titulo,
        };
        guardarPublicacion(ejercicio.id, nueva);
        setPublicacion(nueva);
      }
    } catch (e) {
      setErrorPublicar(
        e instanceof ErrorBackend ? e.message : "No se pudo publicar el ejercicio.",
      );
    } finally {
      setPublicando(false);
    }
  }

  async function borrar(p: PublicacionListada) {
    setBorrando(p.codigo);
    setErrorBorrar("");
    try {
      await eliminarEjercicio(p.codigo, p.claveEdicion);
      olvidarPublicacion(p.ejercicioId);
      setPublicados(listarPublicaciones());
      if (publicacion?.codigo === p.codigo) setPublicacion(null);
      setPorBorrar(null);
    } catch (e) {
      setErrorBorrar(e instanceof ErrorBackend ? e.message : "No se pudo borrar el ejercicio.");
    } finally {
      setBorrando("");
    }
  }

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
            Escribe el caso, publícalo y dicta el código de 6 caracteres. Tus estudiantes lo
            escriben en la página de inicio y empiezan a trabajar.
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
        <Seccion titulo="Identificación">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              etiqueta="Título del ejercicio"
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
            etiqueta="Qué es atómico en este contexto"
            rows={6}
            value={ejercicio.contextoAtomicidad}
            onChange={(e) => fijar("contextoAtomicidad", e.target.value)}
            placeholder={"- El nombre completo SÍ se descompone.\n- La dirección SÍ se descompone.\n- Las fechas NO se descomponen."}
          />
          <div className="mt-3 max-w-xs">
            <Campo
              etiqueta="Registros mínimos por tabla"
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
          descripcion="Publica el ejercicio y dicta el código en clase. Si después corriges el enunciado, vuelve a publicar: el código no cambia y tus estudiantes conservan el avance que ya tenían."
        >
          {!listo ? (
            <Aviso tono="alerta">
              Completa al menos el título y un enunciado de más de 20 caracteres para poder
              publicarlo.
            </Aviso>
          ) : (
            <div className="space-y-5">
              {hayBackend() ? (
                <div>
                  {publicacion ? (
                    <div className="space-y-3">
                      <div className="tarjeta-plana flex flex-wrap items-center gap-4 p-4">
                        <div>
                          <span className="etiqueta">Código del ejercicio</span>
                          <p className="font-mono text-3xl font-black tracking-[0.3em]">
                            {publicacion.codigo}
                          </p>
                        </div>
                        <div className="ml-auto flex flex-wrap gap-2">
                          <BotonCopiar texto={publicacion.codigo} etiqueta="Copiar código" />
                          <BotonCopiar texto={enlaceCorto} etiqueta="Copiar enlace" />
                          <a
                            className="btn"
                            href={`/ejercicio#c=${publicacion.codigo}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Probar como estudiante
                          </a>
                        </div>
                      </div>

                      {desactualizado ? (
                        <Aviso tono="alerta" titulo="Hay cambios sin publicar">
                          Editaste el enunciado después de publicarlo. Tus estudiantes siguen viendo
                          la versión anterior hasta que vuelvas a publicar.
                        </Aviso>
                      ) : (
                        <Aviso tono="ok">
                          Publicado y al día. Los estudiantes ya pueden abrirlo con este código.
                        </Aviso>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className={desactualizado ? "btn btn-primario" : "btn"}
                          onClick={publicar}
                          disabled={publicando}
                        >
                          {publicando ? "Publicando…" : "Publicar los cambios"}
                        </button>
                        <span className="suave text-xs">
                          Publicado el {new Date(publicacion.publicadoEn).toLocaleString("es")}
                        </span>
                      </div>

                      <p className="suave text-xs leading-relaxed">
                        La clave que permite reeditar este código quedó guardada en este navegador.
                        Si cambias de computador o borras los datos del sitio podrás seguir usando
                        el código, pero para modificar el enunciado tendrás que publicarlo de nuevo
                        y saldrá otro código.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="btn btn-primario"
                        onClick={publicar}
                        disabled={publicando}
                      >
                        {publicando ? "Publicando…" : "Publicar y obtener código"}
                      </button>
                      <span className="suave text-xs">
                        Genera un código de 6 caracteres para dictar en clase.
                      </span>
                    </div>
                  )}

                  {errorPublicar ? (
                    <div className="mt-3">
                      <Aviso tono="error">{errorPublicar}</Aviso>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Aviso tono="alerta" titulo="Sin servidor configurado">
                  Esta copia de la app no tiene las variables de Supabase, así que no puede generar
                  códigos. Comparte el enlace largo de abajo.
                </Aviso>
              )}

              <details className="tarjeta-plana p-4">
                <summary className="titulo-seccion cursor-pointer">
                  Otras formas de compartir
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="suave text-xs leading-relaxed">
                    El enlace largo lleva el enunciado adentro y funciona aunque el servidor esté
                    caído, pero cada vez que lo edites tendrás que volver a repartirlo.
                  </p>
                  <label className="block">
                    <span className="etiqueta">Enlace con el enunciado incluido</span>
                    <textarea
                      className="campo resize-y font-mono text-xs"
                      rows={3}
                      readOnly
                      value={enlace}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <BotonCopiar texto={enlace} etiqueta="Copiar enlace largo" />
                    <a
                      className="btn"
                      href={`/ejercicio#e=${codigo}`}
                      target="_blank"
                      rel="noreferrer"
                    >
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
              </details>
            </div>
          )}
        </Seccion>

        {hayBackend() && publicados.length > 0 ? (
          <Seccion
            titulo="Ejercicios publicados"
            descripcion="Los que has publicado desde este navegador. Borra los de semestres pasados para no dejar basura en la base de datos."
          >
            <ul className="space-y-2">
              {publicados.map((p) => (
                <li
                  key={p.codigo}
                  className="tarjeta-plana flex flex-wrap items-center gap-3 p-3"
                >
                  <span className="font-mono text-lg font-black tracking-[0.2em]">{p.codigo}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {p.titulo || "(sin título)"}
                      {p.ejercicioId === ejercicio.id ? (
                        <span className="chip chip-ok ml-2">en edición</span>
                      ) : null}
                    </p>
                    <p className="suave text-xs">
                      Publicado el {new Date(p.publicadoEn).toLocaleDateString("es")}
                    </p>
                  </div>
                  <a
                    className="btn btn-mini"
                    href={`/ejercicio#c=${p.codigo}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir
                  </a>
                  <button
                    type="button"
                    className="btn btn-mini btn-peligro"
                    onClick={() => {
                      setErrorBorrar("");
                      setPorBorrar(p);
                    }}
                    disabled={borrando === p.codigo}
                  >
                    {borrando === p.codigo ? "Borrando…" : "Borrar"}
                  </button>
                </li>
              ))}
            </ul>

            <p className="suave mt-3 text-xs leading-relaxed">
              Esta lista vive en este navegador, no en el servidor. Si publicaste desde otro
              computador, esos ejercicios no aparecen aquí y tampoco podrás borrarlos desde aquí.
            </p>

            {errorBorrar ? (
              <div className="mt-3">
                <Aviso tono="error">{errorBorrar}</Aviso>
              </div>
            ) : null}
          </Seccion>
        ) : null}
      </div>

      <Dialogo
        abierto={porBorrar !== null}
        titulo="Borrar ejercicio del servidor"
        onCerrar={() => setPorBorrar(null)}
        pie={
          <>
            <button type="button" className="btn" onClick={() => setPorBorrar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-peligro"
              onClick={() => porBorrar && borrar(porBorrar)}
              disabled={borrando !== ""}
            >
              {borrando !== "" ? "Borrando…" : "Sí, borrar"}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed">
          Vas a borrar <b>{porBorrar?.titulo || porBorrar?.codigo}</b> de la base de datos. El
          código <b className="font-mono">{porBorrar?.codigo}</b> dejará de funcionar: quien lo
          escriba verá que el ejercicio no existe.
        </p>
        <p className="suave mt-3 text-sm leading-relaxed">
          El trabajo que tus estudiantes ya hicieron no se pierde —vive en el navegador de cada uno
          y en el .json que hayan descargado—, pero no podrán volver a abrir el enunciado con este
          código. Esto no se puede deshacer.
        </p>
      </Dialogo>
    </div>
  );
}
