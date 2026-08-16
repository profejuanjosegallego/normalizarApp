"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Area, Aviso, Campo } from "@/components/ui";
import { borrarTrabajo, leerIndice, type EntradaIndice } from "@/lib/almacenamiento";
import { codificarEjercicio, decodificarEjercicio, interpretarEntrada } from "@/lib/codec";
import { nuevoId } from "@/lib/ids";
import { PASOS, type Ejercicio } from "@/lib/tipos";

/** Recorrido que hace el taller, para la tira animada de la portada. */
const RECORRIDO = ["Entidades", "Tablas", "1FN", "2FN", "3FN"];

export default function Inicio() {
  const router = useRouter();
  const [modo, setModo] = useState<"codigo" | "propio">("codigo");
  const [entrada, setEntrada] = useState("");
  const [error, setError] = useState("");
  const [guardados, setGuardados] = useState<EntradaIndice[]>([]);

  // Ejercicio que el estudiante se inventa para practicar por su cuenta.
  const [propio, setPropio] = useState({
    titulo: "",
    enunciado: "",
    contextoAtomicidad: "",
    minRegistros: 2,
  });

  useEffect(() => {
    setGuardados(leerIndice());
  }, []);

  function abrir() {
    const lectura = interpretarEntrada(entrada);
    if (!lectura) {
      setError("Escribe el código que te dio tu docente.");
      return;
    }

    // Código corto: el enunciado se busca en el servidor al abrir la página.
    if (lectura.tipo === "corto") {
      router.push(`/ejercicio#c=${lectura.codigo}`);
      return;
    }

    // Enlace largo: el enunciado viene adentro y se puede validar aqui mismo.
    if (!decodificarEjercicio(lectura.codigo)) {
      setError(
        "Eso no parece un código válido. Son 6 caracteres (por ejemplo K7QM3P) o el enlace completo que compartió tu docente.",
      );
      return;
    }
    router.push(`/ejercicio#e=${lectura.codigo}`);
  }

  /**
   * Practicar con un caso propio.
   *
   * No pasa por el servidor: el enunciado se codifica dentro del enlace, igual
   * que los que reparte el docente, asi que el estudiante puede guardarse el
   * enlace o compartirlo con un compañero sin que exista un codigo.
   */
  function empezarPropio() {
    if (propio.titulo.trim().length < 3) {
      setError("Ponle un título a tu ejercicio.");
      return;
    }
    if (propio.enunciado.trim().length < 20) {
      setError("Escribe el caso con un poco más de detalle (al menos 20 caracteres).");
      return;
    }

    const ejercicio: Ejercicio = {
      id: nuevoId("propio"),
      titulo: propio.titulo.trim(),
      curso: "",
      docente: "Ejercicio propio",
      enunciado: propio.enunciado.trim(),
      contextoAtomicidad: propio.contextoAtomicidad.trim(),
      minRegistros: propio.minRegistros,
      pistas: [],
      fechaEntrega: "",
      creado: new Date().toISOString(),
    };

    router.push(`/ejercicio#e=${codificarEjercicio(ejercicio)}`);
  }

  function eliminar(id: string) {
    borrarTrabajo(id);
    setGuardados(leerIndice());
  }

  return (
    <div className="relative overflow-hidden">
      {/* Fondo: manchas de color que se mueven despacio detras del encabezado. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px]">
        <div
          className="mancha"
          style={{
            width: 460,
            height: 460,
            left: "-6%",
            top: "-14%",
            background: "var(--acento)",
          }}
        />
        <div
          className="mancha"
          style={{
            width: 380,
            height: 380,
            right: "-4%",
            top: "-8%",
            background: "var(--ok)",
            animationDelay: "-6s",
          }}
        />
        <div
          className="mancha"
          style={{
            width: 300,
            height: 300,
            left: "45%",
            top: "22%",
            background: "var(--dg-puente)",
            opacity: 0.25,
            animationDelay: "-11s",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-16">
        <header className="aparece text-center">
          <p className="titulo-seccion">Bases de datos</p>
          <h1 className="titulo-animado mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            Taller de Normalización
          </h1>
          <p className="suave mx-auto mt-4 max-w-xl text-[0.97rem] leading-relaxed">
            Del enunciado al modelo en tercera forma normal, paso a paso: identificar entidades,
            relacionarlas, llenar registros, verificar atomicidad e identificadores, resolver grupos
            de repetición con tablas de transición y eliminar dependencias transitivas.
          </p>
        </header>

        {/* Tira del recorrido: el resaltado va pasando de un paso al siguiente. */}
        <div
          className="aparece mt-8 flex flex-wrap items-center justify-center gap-1.5"
          style={{ animationDelay: "120ms" }}
          aria-hidden
        >
          {RECORRIDO.map((nombre, i) => (
            <span key={nombre} className="flex items-center gap-1.5">
              <span
                className="paso-tira chip"
                style={{ animationDelay: `${i * 1.2}s` }}
              >
                {nombre}
              </span>
              {i < RECORRIDO.length - 1 ? (
                <span className="suave text-xs" aria-hidden>
                  →
                </span>
              ) : null}
            </span>
          ))}
        </div>

        <section
          className="tarjeta tarjeta-portada aparece mt-10 p-7"
          style={{ animationDelay: "220ms" }}
        >
          {/* Dos maneras de entrar: con el código de clase o con un caso propio. */}
          <div
            className="mx-auto flex max-w-md gap-1 rounded-xl p-1"
            style={{ background: "var(--superficie-2)" }}
            role="tablist"
          >
            {(
              [
                ["codigo", "Tengo un código"],
                ["propio", "Practicar por mi cuenta"],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={modo === valor}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                style={
                  modo === valor
                    ? { background: "var(--superficie)", color: "var(--acento)" }
                    : { color: "var(--texto-suave)" }
                }
                onClick={() => {
                  setModo(valor);
                  setError("");
                }}
              >
                {texto}
              </button>
            ))}
          </div>

          {modo === "codigo" ? (
            <>
              <div className="mt-6 text-center">
                <h2 className="text-xl font-bold">Abrir un ejercicio</h2>
                <p className="suave mt-1 text-sm">
                  Escribe el código de 6 caracteres que dictó tu docente.
                </p>
              </div>

              <div className="mx-auto mt-5 max-w-md space-y-4">
                <input
                  className="campo text-center font-mono text-2xl font-bold tracking-[0.4em] uppercase"
                  value={entrada}
                  onChange={(e) => {
                    setEntrada(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") abrir();
                  }}
                  placeholder="K7QM3P"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="Código del ejercicio"
                />

                <button type="button" className="btn btn-primario w-full py-3" onClick={abrir}>
                  Empezar
                </button>

                {error ? <Aviso tono="error">{error}</Aviso> : null}

                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  <Link href="/ejercicio#demo" className="btn btn-mini">
                    Ver ejercicio de ejemplo
                  </Link>
                </div>

                <p className="suave text-center text-xs">
                  También sirve pegar el enlace completo si tu docente compartió uno.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mt-6 text-center">
                <h2 className="text-xl font-bold">Inventa tu propio caso</h2>
                <p className="suave mx-auto mt-1 max-w-md text-sm leading-relaxed">
                  Escribe un enunciado y normalízalo con los mismos pasos. Lo tendrás siempre
                  visible a un lado mientras trabajas.
                </p>
              </div>

              <div className="mx-auto mt-5 max-w-lg space-y-3">
                <Campo
                  etiqueta="Título"
                  value={propio.titulo}
                  onChange={(e) => {
                    setPropio((p) => ({ ...p, titulo: e.target.value }));
                    setError("");
                  }}
                  placeholder="Gimnasio del barrio"
                />

                <Area
                  etiqueta="El caso"
                  rows={8}
                  value={propio.enunciado}
                  onChange={(e) => {
                    setPropio((p) => ({ ...p, enunciado: e.target.value }));
                    setError("");
                  }}
                  placeholder={
                    "El gimnasio necesita controlar las inscripciones. De cada cliente se registra su nombre completo, la cedula, los telefonos de contacto…"
                  }
                  ayuda={`${propio.enunciado.length} caracteres`}
                />

                <details className="tarjeta-plana p-3">
                  <summary className="titulo-seccion cursor-pointer">Opciones (opcional)</summary>
                  <div className="mt-3 space-y-3">
                    <Area
                      etiqueta="Qué es atómico en tu caso"
                      rows={4}
                      value={propio.contextoAtomicidad}
                      onChange={(e) =>
                        setPropio((p) => ({ ...p, contextoAtomicidad: e.target.value }))
                      }
                      placeholder={
                        "- El nombre completo SÍ se descompone.\n- Las fechas NO se descomponen."
                      }
                      ayuda="Lo consultarás en el paso de 1FN."
                    />
                    <div className="max-w-[14rem]">
                      <Campo
                        etiqueta="Registros mínimos por tabla"
                        type="number"
                        min={1}
                        max={10}
                        value={propio.minRegistros}
                        onChange={(e) =>
                          setPropio((p) => ({
                            ...p,
                            minRegistros: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                      />
                    </div>
                  </div>
                </details>

                <button
                  type="button"
                  className="btn btn-primario w-full py-3"
                  onClick={empezarPropio}
                >
                  Empezar mi ejercicio
                </button>

                {error ? <Aviso tono="error">{error}</Aviso> : null}

                <p className="suave text-center text-xs leading-relaxed">
                  Tu caso queda dentro del enlace del ejercicio: guárdalo en favoritos si quieres
                  volver desde otro computador. Aquí en este navegador el avance se recupera solo.
                </p>
              </div>
            </>
          )}
        </section>

        {guardados.length > 0 ? (
          <section
            className="tarjeta aparece mt-5 p-6"
            style={{ animationDelay: "320ms" }}
          >
            <h2 className="text-base font-bold">Tu trabajo guardado en este navegador</h2>
            <ul className="mt-4 space-y-2">
              {guardados.map((g) => (
                <li
                  key={g.ejercicioId}
                  className="tarjeta-plana flex flex-wrap items-center gap-3 p-3"
                >
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
              Para reabrir un trabajo usa el mismo código del ejercicio; el avance se recupera
              automáticamente.
            </p>
          </section>
        ) : null}

        <footer className="mt-12 text-center">
          <p className="text-sm font-semibold">
            Herramienta pedagógica desarrollada por Mg. Juan José Gallego Mesa
          </p>
          <p className="suave mt-1 text-xs">Profesor de Bases de Datos</p>
          <p className="suave mx-auto mt-4 max-w-md text-[0.7rem] leading-relaxed">
            Del servidor solo se descarga el enunciado. Tu trabajo se guarda en este navegador y se
            entrega como archivo: no se envía a ninguna parte.
          </p>
        </footer>
      </div>
    </div>
  );
}
