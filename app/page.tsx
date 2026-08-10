"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Aviso, Campo } from "@/components/ui";
import { borrarTrabajo, guardarTrabajo, leerIndice, type EntradaIndice } from "@/lib/almacenamiento";
import { codificarEjercicio, decodificarEjercicio, extraerCodigo } from "@/lib/codec";
import { PASOS } from "@/lib/tipos";
import { validarTrabajoImportado } from "@/lib/trabajo";

export default function Inicio() {
  const router = useRouter();
  const [entrada, setEntrada] = useState("");
  const [error, setError] = useState("");
  const [guardados, setGuardados] = useState<EntradaIndice[]>([]);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGuardados(leerIndice());
  }, []);

  function abrir() {
    const codigo = extraerCodigo(entrada);
    if (!codigo) {
      setError("Pega el enlace o el codigo que te dio tu docente.");
      return;
    }
    const ejercicio = decodificarEjercicio(codigo);
    if (!ejercicio) {
      setError("El codigo no es valido. Copialo completo, sin espacios ni saltos de linea.");
      return;
    }
    router.push(`/ejercicio#e=${codigo}`);
  }

  async function importar(archivos: FileList | null) {
    const f = archivos?.[0];
    if (!f) return;
    try {
      const trabajo = validarTrabajoImportado(JSON.parse(await f.text()));
      if (!trabajo) {
        setError("Ese archivo no es una entrega valida del taller.");
        return;
      }
      guardarTrabajo(trabajo);
      router.push(`/ejercicio#e=${codificarEjercicio(trabajo.ejercicio)}`);
    } catch {
      setError("No se pudo leer el archivo.");
    }
  }

  function eliminar(id: string) {
    borrarTrabajo(id);
    setGuardados(leerIndice());
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10">
        <p className="titulo-seccion">Bases de datos</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Taller de Normalizacion</h1>
        <p className="suave mt-3 max-w-2xl text-[0.95rem] leading-relaxed">
          Del enunciado al modelo en tercera forma normal, paso a paso: identificar entidades,
          relacionarlas, llenar registros, verificar atomicidad e identificadores, resolver grupos de
          repeticion con tablas de transicion y eliminar dependencias transitivas.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="tarjeta p-6">
          <span className="chip chip-fk">Estudiante</span>
          <h2 className="mt-3 text-lg font-bold">Abrir un ejercicio</h2>
          <p className="suave mt-1 text-sm">
            Pega el enlace o el codigo que compartio tu docente.
          </p>
          <div className="mt-4 space-y-3">
            <Campo
              etiqueta="Enlace o codigo del ejercicio"
              value={entrada}
              onChange={(e) => {
                setEntrada(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") abrir();
              }}
              placeholder="https://…/ejercicio#e=eyJpZCI6…"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primario" onClick={abrir}>
                Empezar
              </button>
              <button type="button" className="btn" onClick={() => archivo.current?.click()}>
                Continuar desde archivo (.json)
              </button>
              <input
                ref={archivo}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => importar(e.target.files)}
              />
            </div>
            {error ? <Aviso tono="error">{error}</Aviso> : null}
          </div>
        </section>

        <section className="tarjeta p-6">
          <span className="chip chip-pk">Docente</span>
          <h2 className="mt-3 text-lg font-bold">Publicar un ejercicio</h2>
          <p className="suave mt-1 text-sm">
            Escribe el enunciado y las reglas de atomicidad; obtienes un enlace listo para compartir
            con el curso. No necesitas base de datos ni cuentas.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/profesor" className="btn btn-primario">
              Crear ejercicio
            </Link>
            <Link href="/ejercicio#demo" className="btn">
              Ver ejercicio de ejemplo
            </Link>
          </div>
        </section>
      </div>

      {guardados.length > 0 ? (
        <section className="tarjeta mt-5 p-6">
          <h2 className="text-lg font-bold">Tu trabajo guardado en este navegador</h2>
          <ul className="mt-4 space-y-2">
            {guardados.map((g) => (
              <li key={g.ejercicioId} className="tarjeta-plana flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{g.titulo}</p>
                  <p className="suave text-xs">
                    {g.estudiante || "Sin nombre"} · paso {g.paso}: {PASOS[g.paso] ?? "—"} ·{" "}
                    {g.actualizado ? new Date(g.actualizado).toLocaleString("es") : "sin fecha"}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-mini btn-peligro"
                  onClick={() => eliminar(g.ejercicioId)}
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
          <p className="suave mt-3 text-xs">
            Para reabrir un trabajo usa el mismo enlace del ejercicio; el avance se recupera
            automaticamente.
          </p>
        </section>
      ) : null}

      <footer className="suave mt-10 text-xs">
        Todo se procesa en tu navegador. Nada se envia a un servidor.
      </footer>
    </div>
  );
}
