"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Chuleta from "@/components/sql/Chuleta";
import EditorSQL from "@/components/sql/EditorSQL";
import ExploradorBD from "@/components/sql/ExploradorBD";
import PanelRetos from "@/components/sql/PanelRetos";
import ResultadosSQL from "@/components/sql/ResultadosSQL";
import { BotonCopiar, Dialogo } from "@/components/ui";
import {
  cargarEditorSQL,
  cargarEstadoSQL,
  cargarTrabajo,
  descargarTexto,
  guardarEditorSQL,
  guardarEstadoSQL,
  leerIndice,
  olvidarSQL,
  type EntradaIndice,
} from "@/lib/almacenamiento";
import { aSnake } from "@/lib/ids";
import { generarSQL } from "@/lib/sql";
import { ejecutarScript, estadoVacio, type Ejecucion, type Estado } from "@/lib/sqlmotor";
import { retosCumplidos, TOTAL_RETOS } from "@/lib/sqlretos";

type Pestana = "base" | "retos" | "chuleta";

/** Nombre de base valido a partir del titulo de un ejercicio del taller. */
function nombreDeBase(titulo: string): string {
  const snake = aSnake(titulo);
  if (!snake) return "mi_base";
  return /^[0-9]/.test(snake) ? "bd_" + snake : snake;
}

export default function PracticaSQL() {
  const [estado, setEstado] = useState<Estado>(estadoVacio());
  const [texto, setTexto] = useState("");
  const [ejecuciones, setEjecuciones] = useState<Ejecucion[]>([]);
  const [pestana, setPestana] = useState<Pestana>("base");
  const [confirmarReinicio, setConfirmarReinicio] = useState(false);
  const [eligiendoTrabajo, setEligiendoTrabajo] = useState(false);
  const [guardados, setGuardados] = useState<EntradaIndice[]>([]);
  const [listo, setListo] = useState(false);

  const area = useRef<HTMLTextAreaElement>(null);

  // Recuperar lo de la sesion anterior.
  useEffect(() => {
    setEstado(cargarEstadoSQL() ?? estadoVacio());
    setTexto(cargarEditorSQL());
    setGuardados(leerIndice());
    setListo(true);
  }, []);

  useEffect(() => {
    if (listo) guardarEstadoSQL(estado);
  }, [estado, listo]);

  useEffect(() => {
    if (listo) guardarEditorSQL(texto);
  }, [texto, listo]);

  const cumplidos = useMemo(() => retosCumplidos(estado), [estado]);

  const primerFallo = ejecuciones.find((e) => !e.ok);
  const lineaError = primerFallo?.error?.linea ?? null;

  /** Ejecuta lo que este seleccionado, o todo el editor si no hay seleccion. */
  function ejecutar(desdeCero = false) {
    const a = area.current;
    const haySeleccion = !!a && a.selectionStart !== a.selectionEnd;
    const seleccion = haySeleccion ? texto.slice(a.selectionStart, a.selectionEnd) : "";
    const usaSeleccion = !desdeCero && seleccion.trim().length > 0;
    const script = usaSeleccion ? seleccion : texto;

    // Al correr solo un trozo, las lineas del motor empiezan en 1: se corrigen
    // para que coincidan con las de la regleta del editor.
    const desfase = usaSeleccion
      ? texto.slice(0, (a as HTMLTextAreaElement).selectionStart).split("\n").length - 1
      : 0;

    if (!script.trim()) {
      setEjecuciones([
        {
          sql: "",
          linea: 0,
          ok: false,
          error: {
            mensaje: "El editor está vacío.",
            pista: "Empieza creando tu base de datos: CREATE DATABASE mi_base;",
            linea: 0,
          },
        },
      ]);
      return;
    }

    const partida = desdeCero ? estadoVacio() : estado;
    const corrida = ejecutarScript(partida, script);
    setEstado(corrida.estado);
    setEjecuciones(
      desfase === 0
        ? corrida.ejecuciones
        : corrida.ejecuciones.map((e) => ({
            ...e,
            linea: e.linea + desfase,
            error: e.error ? { ...e.error, linea: e.error.linea + desfase } : undefined,
          })),
    );
    if (corrida.ejecuciones.some((e) => !e.ok)) setPestana("base");
  }

  function reiniciar() {
    setEstado(estadoVacio());
    setEjecuciones([]);
    setConfirmarReinicio(false);
    olvidarSQL();
    guardarEditorSQL(texto);
  }

  function traerDelTaller(ejercicioId: string) {
    const trabajo = cargarTrabajo(ejercicioId);
    setEligiendoTrabajo(false);
    if (!trabajo) return;

    const base = nombreDeBase(trabajo.ejercicio.titulo);
    const script =
      "-- Modelo normalizado de: " +
      trabajo.ejercicio.titulo +
      "\n" +
      "-- Ejecuta el script y mira cómo se arma tu base tabla por tabla.\n\n" +
      "CREATE DATABASE " +
      base +
      ";\nUSE " +
      base +
      ";\n\n" +
      generarSQL(trabajo.modelo);

    setTexto(script);
    setEjecuciones([]);
  }

  const totalTablas = estado.servidor.bases.reduce((n, b) => n + b.tablas.length, 0);
  const totalFilas = estado.servidor.bases.reduce(
    (n, b) => n + b.tablas.reduce((m, t) => m + t.filas.length, 0),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="titulo-seccion hover:underline">
            ← Taller de Normalización
          </Link>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Ahora vamos a SQL</h1>
          <p className="suave mt-2 max-w-2xl text-sm leading-relaxed">
            El modelo ya está normalizado; ahora toca escribirlo en el lenguaje que entiende el
            motor de base de datos. Aquí escribes SQL de verdad y se ejecuta al instante: crear la
            base, crear tablas con sus llaves primarias y foráneas, llenarlas, consultarlas y
            borrar.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-mini"
            onClick={() => setEligiendoTrabajo(true)}
            disabled={guardados.length === 0}
            title={
              guardados.length === 0
                ? "Aparecerá cuando tengas un ejercicio del taller guardado en este navegador"
                : undefined
            }
          >
            Traer mi modelo del taller
          </button>
          <BotonCopiar texto={texto} etiqueta="Copiar script" className="btn btn-mini" />
          <button
            type="button"
            className="btn btn-mini"
            onClick={() => descargarTexto("mi_practica.sql", texto)}
            disabled={!texto.trim()}
          >
            Descargar .sql
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        {/* ------------------------------------------------ Editor y salida */}
        <div className="space-y-4">
          <section className="tarjeta p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold">Editor de SQL</h2>
              <p className="suave text-xs">
                {estado.servidor.activa ? (
                  <>
                    Estás en <span className="font-mono font-semibold">{estado.servidor.activa}</span>
                  </>
                ) : (
                  "Sin base de datos activa"
                )}
              </p>
            </div>

            <EditorSQL
              valor={texto}
              onCambio={setTexto}
              onEjecutar={() => ejecutar()}
              areaRef={area}
              lineaError={lineaError}
              alto="22rem"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-primario" onClick={() => ejecutar()}>
                Ejecutar
              </button>
              <span className="suave text-xs">Ctrl + Enter</span>
              <span className="flex-1" />
              <button
                type="button"
                className="btn btn-mini"
                onClick={() => ejecutar(true)}
                disabled={!texto.trim()}
                title="Borra la base y vuelve a ejecutar todo el script desde el principio"
              >
                Rehacer desde cero
              </button>
              <button
                type="button"
                className="btn btn-mini btn-peligro"
                onClick={() => setConfirmarReinicio(true)}
              >
                Vaciar el servidor
              </button>
            </div>

            <p className="suave mt-2 text-xs leading-relaxed">
              Si seleccionas un trozo del texto, <strong>Ejecutar</strong> corre solo eso. Cuando
              cambies un <span className="font-mono">CREATE TABLE</span> que ya habías ejecutado,
              usa <strong>Rehacer desde cero</strong>.
            </p>
          </section>

          <section className="tarjeta p-4">
            <h2 className="mb-3 text-base font-bold">Resultado</h2>
            <ResultadosSQL ejecuciones={ejecuciones} />
          </section>
        </div>

        {/* ------------------------------------------- Panel de la derecha */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <section className="tarjeta p-4">
            <div
              className="flex gap-1 rounded-xl p-1"
              style={{ background: "var(--superficie-2)" }}
              role="tablist"
            >
              {(
                [
                  ["base", "Tu base"],
                  ["retos", "Retos " + cumplidos.size + "/" + TOTAL_RETOS],
                  ["chuleta", "Sintaxis"],
                ] as const
              ).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  role="tab"
                  aria-selected={pestana === valor}
                  className="flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors"
                  style={
                    pestana === valor
                      ? { background: "var(--superficie)", color: "var(--acento)" }
                      : { color: "var(--texto-suave)" }
                  }
                  onClick={() => setPestana(valor)}
                >
                  {etiqueta}
                </button>
              ))}
            </div>

            <div className="mt-4 max-h-[calc(100vh-11rem)] overflow-y-auto pr-1">
              {pestana === "base" ? (
                <>
                  <p className="suave mb-3 text-xs">
                    {totalTablas} tabla{totalTablas === 1 ? "" : "s"} · {totalFilas} fila
                    {totalFilas === 1 ? "" : "s"} en total
                  </p>
                  <ExploradorBD estado={estado} />
                </>
              ) : null}
              {pestana === "retos" ? <PanelRetos estado={estado} /> : null}
              {pestana === "chuleta" ? <Chuleta /> : null}
            </div>
          </section>
        </div>
      </div>

      <footer className="mt-10 text-center">
        <p className="suave mx-auto max-w-lg text-[0.7rem] leading-relaxed">
          Esta base de datos vive solo en tu navegador: no hay servidor detrás y nada de lo que
          escribas sale de este computador. El dialecto imitado es MySQL / MariaDB.
        </p>
      </footer>

      <Dialogo
        abierto={confirmarReinicio}
        titulo="Vaciar el servidor"
        onCerrar={() => setConfirmarReinicio(false)}
        pie={
          <>
            <button type="button" className="btn" onClick={() => setConfirmarReinicio(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primario" onClick={reiniciar}>
              Sí, vaciar
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed">
          Se borran todas las bases de datos, sus tablas y sus filas, y se reinician los retos. El
          texto del editor se conserva, así que puedes volver a ejecutarlo.
        </p>
      </Dialogo>

      <Dialogo
        abierto={eligiendoTrabajo}
        titulo="Traer un modelo del taller"
        onCerrar={() => setEligiendoTrabajo(false)}
      >
        <p className="suave text-sm leading-relaxed">
          Se escribe en el editor el script de tu modelo normalizado. Todavía no se ejecuta: léelo
          primero y después dale a Ejecutar.
        </p>
        <ul className="mt-4 space-y-2">
          {guardados.map((g) => (
            <li key={g.ejercicioId} className="tarjeta-plana flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{g.titulo}</p>
                <p className="suave text-xs">
                  {g.estudiante || "Sin nombre"} ·{" "}
                  {g.actualizado ? new Date(g.actualizado).toLocaleString("es") : "sin fecha"}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-mini"
                onClick={() => traerDelTaller(g.ejercicioId)}
              >
                Traer
              </button>
            </li>
          ))}
        </ul>
        <p className="suave mt-3 text-xs leading-relaxed">
          Ojo: si en el taller dejaste celdas vacías, el script traerá NULL en esos sitios y el
          motor va a protestar donde la columna sea obligatoria. Eso también es parte del
          aprendizaje: se corrige en el editor.
        </p>
      </Dialogo>
    </div>
  );
}
