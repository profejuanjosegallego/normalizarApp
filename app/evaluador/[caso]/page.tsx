"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Chuleta from "@/components/sql/Chuleta";
import EditorSQL, { construirIdentificadores } from "@/components/sql/EditorSQL";
import ExploradorBD from "@/components/sql/ExploradorBD";
import ResultadosSQL from "@/components/sql/ResultadosSQL";
import Expediente from "@/components/evaluador/Expediente";
import {
  IconoCandado,
  IconoCheck,
  IconoDescarga,
  IconoExpediente,
  IconoHuella,
  IconoLupa,
  IconoReiniciar,
  IconoReloj,
} from "@/components/evaluador/Iconos";
import Musica from "@/components/evaluador/Musica";
import { Aviso, Campo, Dialogo } from "@/components/ui";
import {
  cargarAvanceCaso,
  cargarEditorCaso,
  cargarEstadoCaso,
  cargarPrueba,
  descargarJSON,
  guardarAvanceCaso,
  guardarEditorCaso,
  guardarEstadoCaso,
  guardarPrueba,
  olvidarCaso,
} from "@/lib/almacenamiento";
import {
  avanceVacio,
  buscarCaso,
  esCulpable,
  evaluarPista,
  prepararCaso,
  rejillaDeReferencia,
  type Avance,
  type Caso,
  type Integrante,
  type Rejilla,
} from "@/lib/evaluador";
import {
  calificar,
  CONFIG_POR_DEFECTO,
  formatearNota,
  formatearRestante,
  normalizarConfig,
  restanteMs,
  type Prueba,
} from "@/lib/evaluador/prueba";
import { ejecutarScript, type Ejecucion, type Estado } from "@/lib/sqlmotor";
import { obtenerPrueba } from "@/lib/supabase";

type Pestana = "expediente" | "base" | "chuleta";

/** "Prueba" ficticia de los casos de practica: no hay codigo, reloj ni nota. */
const PRUEBA_LIBRE: Prueba = {
  codigo: "PRACTICA",
  config: { ...CONFIG_POR_DEFECTO, minutos: 0, grupo: "Práctica libre" },
  verificada: "",
};

export default function PaginaCaso() {
  const params = useParams<{ caso: string }>();
  const caso = buscarCaso(String(params?.caso ?? ""));
  const [prueba, setPrueba] = useState<Prueba | null | undefined>(undefined);

  useEffect(() => {
    setPrueba(cargarPrueba());
  }, []);

  if (!caso) {
    return (
      <Vacio titulo="Ese caso no existe">
        Vuelve al evaluador y elige uno de los casos disponibles.
      </Vacio>
    );
  }
  if (caso.libre) {
    return <Investigacion caso={caso} pruebaInicial={PRUEBA_LIBRE} />;
  }
  if (prueba === undefined) return null;
  if (prueba === null) {
    return (
      <Vacio titulo="El detective duerme">
        Este caso solo se abre con el código de la prueba que dicta tu docente. Escríbelo en la
        portada del evaluador.
      </Vacio>
    );
  }

  return <Investigacion caso={caso} pruebaInicial={prueba} />;
}

function Vacio({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div aria-hidden className="mx-auto flex h-44 w-44 items-end justify-center overflow-hidden">
        <img src="/evaluador/kogoro-dormido.webp" alt="" className="h-52 w-auto max-w-none" />
      </div>
      <p className="titulo-seccion mt-4">Evaluador final</p>
      <h1 className="mt-2 text-2xl font-black">{titulo}</h1>
      <p className="suave mt-3 text-sm leading-relaxed">{children}</p>
      <Link href="/evaluador" className="btn btn-primario mt-6">
        Ir al evaluador
      </Link>
    </div>
  );
}

function Investigacion({ caso, pruebaInicial }: { caso: Caso; pruebaInicial: Prueba }) {
  /** La base tal como viene en el expediente: sirve de punto de partida y de referencia. */
  const intacto = useMemo(() => prepararCaso(caso), [caso]);

  const libre = !!caso.libre;
  const [prueba, setPrueba] = useState<Prueba>(pruebaInicial);
  const [pruebaCerrada, setPruebaCerrada] = useState(false);
  const [estado, setEstado] = useState<Estado>(intacto);
  const [texto, setTexto] = useState("");
  const [ejecuciones, setEjecuciones] = useState<Ejecucion[]>([]);
  const [avance, setAvance] = useState<Avance>(() => avanceVacio(caso.id, pruebaInicial.codigo));
  const [pestana, setPestana] = useState<Pestana>("expediente");
  const [hallazgo, setHallazgo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [acusado, setAcusado] = useState("");
  const [errorAcusacion, setErrorAcusacion] = useState("");
  const [errorInicio, setErrorInicio] = useState("");
  const [editandoPareja, setEditandoPareja] = useState(false);
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(false);
  const [confirmarReiniciar, setConfirmarReiniciar] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const [listo, setListo] = useState(false);

  const area = useRef<HTMLTextAreaElement>(null);

  // Recuperar la sesion anterior de este caso.
  useEffect(() => {
    setEstado(cargarEstadoCaso(caso.id) ?? intacto);
    setTexto(cargarEditorCaso(caso.id));
    setAvance(cargarAvanceCaso(caso.id) ?? avanceVacio(caso.id, pruebaInicial.codigo));
    setListo(true);
  }, [caso.id, intacto, pruebaInicial.codigo]);

  // Volver a preguntar al servidor si la prueba sigue abierta. Si no hay red,
  // vale la ultima confirmacion que se tenga guardada.
  useEffect(() => {
    if (libre) return;
    let vigente = true;
    obtenerPrueba(pruebaInicial.codigo)
      .then((config) => {
        if (!vigente) return;
        if (!config) {
          setPruebaCerrada(true);
          return;
        }
        const normal = normalizarConfig(config);
        const nueva = { ...pruebaInicial, config: normal, verificada: new Date().toISOString() };
        guardarPrueba(nueva);
        setPrueba(nueva);
        setPruebaCerrada(!normal.abierta);
      })
      .catch(() => {
        // sin red: se sigue con lo guardado
      });
    return () => {
      vigente = false;
    };
  }, [pruebaInicial, libre]);

  useEffect(() => {
    if (listo) guardarEstadoCaso(caso.id, estado);
  }, [estado, listo, caso.id]);

  useEffect(() => {
    if (listo) guardarEditorCaso(caso.id, texto);
  }, [texto, listo, caso.id]);

  useEffect(() => {
    if (listo) guardarAvanceCaso(avance);
  }, [avance, listo]);

  const config = prueba.config;
  const hechas = useMemo(() => new Set(avance.resueltas.map((r) => r.id)), [avance]);
  const indiceActual = caso.pistas.findIndex((p) => !hechas.has(p.id));
  const pistaActual = indiceActual === -1 ? null : caso.pistas[indiceActual];
  const cerrado = avance.cerrado !== null;
  const empezado = avance.inicio !== null;
  const esFinal = !!pistaActual && pistaActual.comprobar.tipo === "culpable";

  // El reloj: se recalcula cada segundo mientras el caso este corriendo.
  const restante = libre ? null : restanteMs(avance, config, ahora);
  const vencido = !libre && empezado && !cerrado && restante === 0;
  const corriendo = empezado && !cerrado && !vencido;
  useEffect(() => {
    if (!corriendo || libre) return;
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [corriendo, libre]);

  const terminado = cerrado || vencido;
  const calificacion = useMemo(
    () => calificar(avance, caso.pistas.length, config),
    [avance, caso.pistas.length, config],
  );

  // Referencia de la pista en curso, calculada sobre la base intacta.
  const referencia = useMemo<Rejilla | null>(() => {
    if (!pistaActual || pistaActual.comprobar.tipo !== "consulta") return null;
    return rejillaDeReferencia(caso, intacto, pistaActual.comprobar.referencia);
  }, [caso, intacto, pistaActual]);

  const identificadores = useMemo(() => construirIdentificadores(estado), [estado]);
  const primerFallo = ejecuciones.find((e) => !e.ok);
  const lineaError = primerFallo?.error?.linea ?? null;

  function parejaValida(integrantes: Integrante[]): string {
    const [a, b] = integrantes;
    if (libre) return "";
    if (!a.nombre.trim() || !a.documento.trim()) {
      return "Escribe el nombre y el documento de quien va primero.";
    }
    if ((b.nombre.trim() && !b.documento.trim()) || (!b.nombre.trim() && b.documento.trim())) {
      return "Al segundo integrante le falta el nombre o el documento.";
    }
    return "";
  }

  function empezar() {
    const falta = parejaValida(avance.integrantes);
    if (falta) {
      setErrorInicio(falta);
      return;
    }
    if (pruebaCerrada) {
      setErrorInicio("La prueba está cerrada: ya no se pueden empezar casos con este código.");
      return;
    }
    setErrorInicio("");
    setAhora(Date.now());
    setAvance((av) => ({ ...av, inicio: new Date().toISOString(), pruebaCodigo: prueba.codigo }));
  }

  /** Ejecuta lo seleccionado (o todo) y comprueba la pista en curso. */
  function ejecutar() {
    if (!corriendo) return;
    const a = area.current;
    const haySeleccion = !!a && a.selectionStart !== a.selectionEnd;
    const seleccion = haySeleccion ? texto.slice(a.selectionStart, a.selectionEnd) : "";
    const usaSeleccion = seleccion.trim().length > 0;
    const script = usaSeleccion ? seleccion : texto;
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
            pista: "Lee la pista en curso y escribe la instrucción que pide.",
            linea: 0,
          },
        },
      ]);
      return;
    }

    const corrida = ejecutarScript(estado, script);
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

    if (!pistaActual || esFinal) return;
    const veredicto = evaluarPista(pistaActual, corrida.estado, corrida.ejecuciones, referencia);
    if (veredicto.resuelta) {
      setAvance((av) => ({
        ...av,
        resueltas: [
          ...av.resueltas,
          { id: pistaActual.id, sql: veredicto.sql, cuando: new Date().toISOString() },
        ],
      }));
      setHallazgo(pistaActual.hallazgo);
      setAviso(null);
      setPestana("expediente");
    } else {
      setAvance((av) => ({ ...av, intentosFallidos: av.intentosFallidos + 1 }));
      setAviso(veredicto.aviso);
    }
  }

  function acusar() {
    if (!pistaActual || !esFinal || !corriendo) return;
    if (esCulpable(pistaActual, acusado)) {
      setAvance((av) => ({
        ...av,
        resueltas: [
          ...av.resueltas,
          { id: pistaActual.id, sql: acusado.trim(), cuando: new Date().toISOString() },
        ],
        cerrado: new Date().toISOString(),
      }));
      setErrorAcusacion("");
      setHallazgo(null);
      return;
    }
    setAvance((av) => ({ ...av, intentosCulpable: av.intentosCulpable + 1 }));
    setErrorAcusacion(
      "El detective Mouri suelta una carcajada: las pruebas no señalan a esa persona. Vuelve a leer los hallazgos del expediente. Cada acusación equivocada cuenta como intento fallido.",
    );
  }

  function restaurarBase() {
    setEstado(intacto);
    setEjecuciones([]);
    setAviso(null);
    setConfirmarRestaurar(false);
  }

  function reiniciarCaso() {
    olvidarCaso(caso.id);
    const nuevo = avanceVacio(caso.id, prueba.codigo);
    nuevo.integrantes = avance.integrantes;
    nuevo.reinicios = avance.reinicios + 1;
    setEstado(intacto);
    setTexto("");
    setEjecuciones([]);
    setAvance(nuevo);
    setHallazgo(null);
    setAviso(null);
    setAcusado("");
    setErrorAcusacion("");
    setConfirmarReiniciar(false);
  }

  function descargarDatos() {
    descargarJSON("evaluador_" + caso.id + ".json", {
      version: 2,
      seccion: "Evaluador final",
      caso: { id: caso.id, titulo: caso.titulo },
      prueba: { codigo: prueba.codigo, ...config },
      integrantes: avance.integrantes.filter((i) => i.nombre.trim()),
      inicio: avance.inicio,
      cerrado: avance.cerrado,
      reinicios: avance.reinicios,
      calificacion,
      generado: new Date().toISOString(),
      pistas: caso.pistas.map((p, i) => {
        const r = avance.resueltas.find((x) => x.id === p.id);
        return {
          numero: i + 1,
          id: p.id,
          titulo: p.titulo,
          herramientas: p.herramientas,
          resuelta: !!r,
          sql: r?.sql ?? null,
          cuando: r?.cuando ?? null,
        };
      }),
    });
  }

  const totalPistas = caso.pistas.length;
  const fallidos = avance.intentosFallidos + avance.intentosCulpable;
  const urgente = restante !== null && restante < 5 * 60_000;
  const nombres = avance.integrantes
    .map((i) => i.nombre.trim())
    .filter(Boolean)
    .join(" y ");

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href="/evaluador" className="titulo-seccion hover:underline">
            ← Evaluador final
          </Link>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{caso.titulo}</h1>
          <p className="suave mt-1 max-w-2xl text-sm leading-relaxed">{caso.subtitulo}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {empezado ? (
            <>
              {libre ? (
                <span className="chip chip-ok">práctica · sin reloj ni nota</span>
              ) : (
                <span
                  className="chip"
                  style={{
                    color: vencido || urgente ? "var(--error)" : "var(--texto)",
                    background: vencido || urgente ? "var(--error-suave)" : undefined,
                    fontSize: "0.85rem",
                  }}
                  title="Tiempo restante"
                >
                  <IconoReloj />
                  {cerrado ? "cerrado" : vencido ? "tiempo agotado" : formatearRestante(restante ?? 0)}
                </span>
              )}
              <span className="chip" title="Intentos fallidos (los primeros no descuentan)">
                {fallidos} intento{fallidos === 1 ? "" : "s"} fallido{fallidos === 1 ? "" : "s"}
                {libre ? "" : " · " + config.intentosLibres + " libres"}
              </span>
              <button
                type="button"
                className="btn btn-mini"
                onClick={() => setEditandoPareja(true)}
                title="Nombres y documentos"
              >
                {nombres || "Sin nombres"}
              </button>
            </>
          ) : null}
          <Musica />
          {corriendo ? (
            <button
              type="button"
              className="btn btn-mini"
              onClick={() => setConfirmarRestaurar(true)}
              title="Vuelve a cargar las tablas originales del caso sin perder las pistas resueltas"
            >
              <IconoReiniciar />
              Restaurar la base
            </button>
          ) : null}
          {empezado ? (
            <button
              type="button"
              className="btn btn-mini btn-peligro"
              onClick={() => setConfirmarReiniciar(true)}
            >
              Empezar de cero
            </button>
          ) : null}
        </div>
      </header>

      {!empezado ? (
        <Arranque
          caso={caso}
          prueba={prueba}
          libre={libre}
          cerrada={pruebaCerrada}
          integrantes={avance.integrantes}
          onCambiar={(integrantes) => setAvance((av) => ({ ...av, integrantes }))}
          onEmpezar={empezar}
          error={errorInicio}
        />
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          {/* ------------------------------------------- Pista, editor y salida */}
          <div className="space-y-4">
            {hallazgo && !terminado ? (
              <section
                className="aparece rounded-xl px-4 py-3"
                style={{ background: "var(--ok-suave)" }}
                role="status"
              >
                <p className="flex items-center gap-2 font-bold" style={{ color: "var(--ok)" }}>
                  <IconoHuella />
                  Hallazgo
                </p>
                <p className="mt-1 text-sm leading-relaxed">{hallazgo}</p>
              </section>
            ) : null}

            {terminado ? (
              <Cierre
                caso={caso}
                avance={avance}
                libre={libre}
                vencido={vencido && !cerrado}
                nota={formatearNota(calificacion.nota)}
                resumen={
                  calificacion.resueltas +
                  " de " +
                  calificacion.total +
                  " pistas · base " +
                  formatearNota(calificacion.base) +
                  " · " +
                  fallidos +
                  " intento" +
                  (fallidos === 1 ? "" : "s") +
                  " fallido" +
                  (fallidos === 1 ? "" : "s") +
                  " (" +
                  config.intentosLibres +
                  " libres) · descuento −" +
                  formatearNota(calificacion.penalizacion) +
                  (avance.reinicios > 0 ? " · " + avance.reinicios + " reinicio(s)" : "")
                }
                onDatos={descargarDatos}
              />
            ) : pistaActual ? (
              <section className="tarjeta flex gap-4 p-5" key={pistaActual.id}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="titulo-seccion flex items-center gap-2">
                      <IconoLupa />
                      Pista {indiceActual + 1} de {totalPistas}
                    </p>
                    {pistaActual.herramientas.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {pistaActual.herramientas.map((h) => (
                          <span key={h} className="chip font-mono">
                            {h}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <h2 className="mt-2 text-xl font-bold">{pistaActual.titulo}</h2>
                  {indiceActual === 0 ? (
                    <p className="prosa suave mt-3 text-[0.9rem]">{caso.apertura}</p>
                  ) : null}
                  <p className="prosa mt-3">{pistaActual.relato}</p>
                  <div
                    className="mt-4 rounded-xl border-l-4 px-4 py-3"
                    style={{ background: "var(--acento-suave)", borderColor: "var(--acento)" }}
                  >
                    <p className="titulo-seccion" style={{ color: "var(--acento)" }}>
                      Tu tarea
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed">{pistaActual.tarea}</p>
                  </div>

                  {aviso ? (
                    <p
                      className="mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed"
                      style={{ background: "var(--alerta-suave)", color: "var(--alerta)" }}
                      role="status"
                    >
                      {aviso}
                    </p>
                  ) : null}

                  {esFinal ? (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        <input
                          className="campo max-w-sm flex-1"
                          value={acusado}
                          onChange={(e) => {
                            setAcusado(e.target.value);
                            setErrorAcusacion("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") acusar();
                          }}
                          placeholder="Nombre del culpable"
                          aria-label="Nombre del culpable"
                        />
                        <button
                          type="button"
                          className="btn btn-primario"
                          onClick={acusar}
                          disabled={!acusado.trim()}
                        >
                          Acusar
                        </button>
                      </div>
                      {errorAcusacion ? (
                        <div
                          className="mt-3 flex items-center gap-3 rounded-xl px-4 py-3 text-sm leading-relaxed"
                          style={{ background: "var(--error-suave)", color: "var(--error)" }}
                          role="alert"
                        >
                          <img
                            src="/evaluador/kogoro.png"
                            alt=""
                            aria-hidden
                            className="h-16 w-auto shrink-0"
                          />
                          <span>{errorAcusacion}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <Detective alto={esFinal ? "16rem" : "13rem"} />
              </section>
            ) : null}

            <section className="tarjeta p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold">Editor de SQL</h2>
                <p className="suave text-xs">
                  {estado.servidor.activa ? (
                    <>
                      Estás en{" "}
                      <span className="font-mono font-semibold">{estado.servidor.activa}</span>
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
                identificadores={identificadores}
                alto="18rem"
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn btn-primario"
                  onClick={() => ejecutar()}
                  disabled={!corriendo}
                >
                  Ejecutar
                </button>
                <span className="suave text-xs">
                  {corriendo ? "Ctrl + Enter" : "El caso está cerrado: ya no se ejecuta nada."}
                </span>
                <span className="flex-1" />
                <button
                  type="button"
                  className="btn btn-mini"
                  onClick={() => {
                    setTexto("");
                    setEjecuciones([]);
                    area.current?.focus();
                  }}
                  disabled={!texto.trim() || !corriendo}
                >
                  Limpiar el editor
                </button>
              </div>

              <p className="suave mt-2 text-xs leading-relaxed">
                Cada vez que ejecutas, el detective revisa si lo que devolvió el motor resuelve la
                pista en curso; si no la resuelve, cuenta como intento fallido. Puedes escribir
                varias instrucciones y ejecutar solo el trozo que selecciones.
              </p>
            </section>

            <section className="tarjeta p-4">
              <h2 className="mb-3 text-base font-bold">Resultado</h2>
              <ResultadosSQL ejecuciones={ejecuciones} />
            </section>
          </div>

          {/* -------------------------------------------- Panel de la derecha */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <section className="tarjeta p-4">
              <div
                className="flex gap-1 rounded-xl p-1"
                style={{ background: "var(--superficie-2)" }}
                role="tablist"
              >
                {(
                  [
                    ["expediente", "Expediente"],
                    ["base", "Tablas"],
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
                {pestana === "expediente" ? (
                  <Expediente caso={caso} resueltas={avance.resueltas} cerrado={cerrado} />
                ) : null}
                {pestana === "base" ? <ExploradorBD estado={estado} /> : null}
                {pestana === "chuleta" ? <Chuleta /> : null}
              </div>
            </section>
          </div>
        </div>
      )}

      <footer className="mt-10 text-center">
        <p className="suave mx-auto max-w-lg text-[0.7rem] leading-relaxed">
          La base del caso vive solo en tu navegador. Al terminar, el informe en PDF es lo que
          entregas a tu docente: lleva la nota y cada consulta con la que resolviste una pista.
        </p>
      </footer>

      <Dialogo
        abierto={editandoPareja}
        titulo="Quiénes resuelven el caso"
        onCerrar={() => setEditandoPareja(false)}
        pie={
          <button type="button" className="btn btn-primario" onClick={() => setEditandoPareja(false)}>
            Listo
          </button>
        }
      >
        <FormularioPareja
          integrantes={avance.integrantes}
          onCambiar={(integrantes) => setAvance((av) => ({ ...av, integrantes }))}
        />
      </Dialogo>

      <Dialogo
        abierto={confirmarRestaurar}
        titulo="Restaurar la base del caso"
        onCerrar={() => setConfirmarRestaurar(false)}
        pie={
          <>
            <button type="button" className="btn" onClick={() => setConfirmarRestaurar(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primario" onClick={restaurarBase}>
              Sí, restaurar
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed">
          Las tablas vuelven a quedar como llegaron en el expediente: se pierde cualquier cambio de
          estructura o de datos que hayas hecho, y hay que volver a entrar a la base con{" "}
          <span className="font-mono">USE</span>. Las pistas ya resueltas, los intentos y el reloj
          siguen igual.
        </p>
      </Dialogo>

      <Dialogo
        abierto={confirmarReiniciar}
        titulo="Empezar el caso de cero"
        onCerrar={() => setConfirmarReiniciar(false)}
        pie={
          <>
            <button type="button" className="btn" onClick={() => setConfirmarReiniciar(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primario" onClick={reiniciarCaso}>
              Sí, empezar de cero
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed">
          Se borran las pistas resueltas, el editor, la base y los intentos, y el reloj vuelve a
          arrancar. El informe registra cuántas veces se reinició el caso: tu docente lo verá.
        </p>
      </Dialogo>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Pantalla previa: la pareja y el boton de empezar
 * ----------------------------------------------------------------------- */

function Arranque({
  caso,
  prueba,
  libre,
  cerrada,
  integrantes,
  onCambiar,
  onEmpezar,
  error,
}: {
  caso: Caso;
  prueba: Prueba;
  libre: boolean;
  cerrada: boolean;
  integrantes: Integrante[];
  onCambiar: (integrantes: Integrante[]) => void;
  onEmpezar: () => void;
  error: string;
}) {
  const c = prueba.config;
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <section className="tarjeta flex gap-4 p-5">
        <div className="min-w-0 flex-1">
          <p className="titulo-seccion flex items-center gap-2">
            <IconoExpediente />
            Antes de empezar
          </p>
          <h2 className="mt-2 text-xl font-bold">Quiénes resuelven el caso</h2>
          <p className="suave mt-2 text-sm leading-relaxed">
            {libre
              ? "Es un caso de práctica: los nombres son opcionales y nada de esto se califica."
              : "Se puede en pareja. Escriban nombre y documento; el segundo integrante es opcional. Estos datos van en el informe que entregan."}
          </p>
          <div className="mt-4">
            <FormularioPareja integrantes={integrantes} onCambiar={onCambiar} />
          </div>

          <div
            className="mt-5 rounded-xl border-l-4 px-4 py-3"
            style={{ background: "var(--acento-suave)", borderColor: "var(--acento)" }}
          >
            <p className="titulo-seccion" style={{ color: "var(--acento)" }}>
              {libre ? "Práctica libre" : "Reglas de la prueba " + prueba.codigo}
            </p>
            {libre ? (
              <ul className="mt-1 space-y-1 text-sm leading-relaxed">
                <li>
                  <strong>Sin reloj y sin nota.</strong> Es para repasar: las {caso.pistas.length}{" "}
                  pistas usan las mismas herramientas que los casos del examen.
                </li>
                <li>
                  Los intentos fallidos se cuentan solo para que veas cómo funcionará el examen:
                  cada ejecución que no resuelve la pista en curso y cada acusación equivocada.
                </li>
                <li>Puedes empezar de cero las veces que quieras.</li>
              </ul>
            ) : (
            <ul className="mt-1 space-y-1 text-sm leading-relaxed">
              <li>
                <strong>{c.minutos} minutos</strong> desde que pulsen Empezar. El reloj no se
                detiene aunque cierren el navegador.
              </li>
              <li>
                Nota de <strong>5,0</strong> por resolver las {caso.pistas.length} pistas y acusar
                bien. Se descuentan <strong>{c.descuento.toFixed(1).replace(".", ",")}</strong> por
                cada intento fallido después de los <strong>{c.intentosLibres}</strong> primeros.
              </li>
              <li>
                Cuenta como intento fallido cada ejecución que no resuelve la pista en curso
                (errores incluidos) y cada acusación equivocada. Explorar las tablas no cuesta:
                están en la pestaña <strong>Tablas</strong>.
              </li>
            </ul>
            )}
          </div>

          {cerrada ? (
            <div className="mt-4">
              <Aviso tono="alerta" titulo="La prueba está cerrada">
                Tu docente cerró la prueba {prueba.codigo}: ya no se pueden empezar casos con ese
                código.
              </Aviso>
            </div>
          ) : null}
          {error ? (
            <div className="mt-4">
              <Aviso tono="error">{error}</Aviso>
            </div>
          ) : null}

          <button
            type="button"
            className="btn btn-primario mt-5 px-6 py-3"
            onClick={onEmpezar}
            disabled={cerrada}
          >
            {libre ? <IconoLupa /> : <IconoReloj />}
            {libre ? "Empezar la práctica" : "Empezar el caso: arranca el reloj"}
          </button>
        </div>
        <Detective alto="20rem" />
      </section>

      <section className="tarjeta overflow-hidden lg:self-start">
        {/* Portada: los sospechosos de siempre, con un degradado para que el titulo se lea. */}
        <div aria-hidden className="relative h-40">
          <img
            src="/evaluador/malos.jpg"
            alt=""
            className="h-full w-full object-cover object-top"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(16, 20, 40, 0.05) 30%, var(--superficie) 100%)",
            }}
          />
        </div>
        <div className="p-5 pt-0">
        <p className="titulo-seccion">La escena</p>
        <h2 className="mt-2 text-lg font-bold">{caso.titulo}</h2>
        <p className="prosa suave mt-3 text-[0.9rem]">{caso.apertura}</p>
        <p className="suave mt-3 text-xs">
          {caso.pistas.length} pistas. Los títulos se revelan a medida que avanzan.
        </p>
        </div>
      </section>
    </div>
  );
}

function FormularioPareja({
  integrantes,
  onCambiar,
}: {
  integrantes: Integrante[];
  onCambiar: (integrantes: Integrante[]) => void;
}) {
  function fijar(i: number, campo: keyof Integrante, valor: string) {
    onCambiar(integrantes.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
  }
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <Campo
            etiqueta={i === 0 ? "Integrante 1 · nombre completo" : "Integrante 2 · nombre completo (opcional)"}
            value={integrantes[i]?.nombre ?? ""}
            onChange={(e) => fijar(i, "nombre", e.target.value)}
            placeholder="Nombre y apellidos"
            autoComplete="off"
          />
          <Campo
            etiqueta="Documento"
            value={integrantes[i]?.documento ?? ""}
            onChange={(e) => fijar(i, "documento", e.target.value)}
            placeholder="Número de documento"
            autoComplete="off"
            inputMode="numeric"
          />
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Cierre: caso resuelto o tiempo agotado
 * ----------------------------------------------------------------------- */

function Cierre({
  caso,
  avance,
  libre,
  vencido,
  nota,
  resumen,
  onDatos,
}: {
  caso: Caso;
  avance: Avance;
  libre: boolean;
  vencido: boolean;
  nota: string;
  resumen: string;
  onDatos: () => void;
}) {
  return (
    <section className="tarjeta aparece flex gap-4 p-5">
      <div className="min-w-0 flex-1">
        {vencido ? (
          <>
            <p className="titulo-seccion flex items-center gap-2" style={{ color: "var(--error)" }}>
              <IconoCandado />
              Se acabó el tiempo
            </p>
            <h2 className="mt-2 text-xl font-bold">El detective se quedó dormido</h2>
            <p className="prosa mt-3">
              El reloj llegó a cero con {avance.resueltas.length} de {caso.pistas.length} pistas
              resueltas. El caso queda cerrado tal como está: la nota se calcula con lo que
              alcanzaron a resolver.
            </p>
          </>
        ) : (
          <>
            <p className="titulo-seccion flex items-center gap-2" style={{ color: "var(--ok)" }}>
              <IconoCheck />
              Caso resuelto
            </p>
            <h2 className="mt-2 text-xl font-bold">{caso.culpable}</h2>
            <p className="prosa mt-3">{caso.resolucion}</p>
          </>
        )}

        <div
          className="mt-4 flex flex-wrap items-center gap-4 rounded-xl px-4 py-3"
          style={{ background: "var(--superficie-2)" }}
        >
          {libre ? (
            <p className="suave text-xs leading-relaxed">
              Práctica libre, sin nota. En el examen este mismo recorrido habría dado{" "}
              <strong>{nota}</strong> con las reglas por defecto: {resumen}
            </p>
          ) : (
            <>
              <div>
                <p className="titulo-seccion">Nota</p>
                <p className="text-4xl font-black tracking-tight">{nota}</p>
              </div>
              <p className="suave min-w-[12rem] flex-1 text-xs leading-relaxed">{resumen}</p>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a
            className="btn btn-primario"
            href={"/evaluador/" + caso.id + "/informe"}
            target="_blank"
            rel="noreferrer"
          >
            <IconoDescarga />
            Descargar informe (PDF)
          </a>
          <button type="button" className="btn" onClick={onDatos}>
            Datos (.json)
          </button>
          <Link href="/evaluador" className="btn">
            Volver a los casos
          </Link>
        </div>
        <p className="suave mt-2 text-xs leading-relaxed">
          El informe se abre en otra pestaña listo para guardarlo como PDF. Lleva los nombres, la
          nota, el tiempo y cada consulta con la que resolvieron las pistas.
        </p>
      </div>
      {vencido ? (
        <div
          aria-hidden
          className="hidden shrink-0 items-end justify-center self-end overflow-hidden sm:flex"
          style={{ height: "14rem", width: "12rem" }}
        >
          <img src="/evaluador/kogoro-dormido.webp" alt="" className="h-56 w-auto max-w-none" />
        </div>
      ) : (
        <Detective alto="18rem" />
      )}
    </section>
  );
}

/**
 * La figura del detective. La imagen trae mucho aire por encima del personaje,
 * asi que se muestra en una caja mas baja que la imagen, alineada por abajo,
 * y el sobrante se recorta.
 */
function Detective({ alto = "14rem" }: { alto?: string }) {
  return (
    <div
      aria-hidden
      className="hidden shrink-0 items-end justify-center self-end overflow-hidden sm:flex"
      style={{ height: alto, width: "8.5rem" }}
    >
      <img
        src="/evaluador/conan.webp"
        alt=""
        className="w-auto max-w-none"
        style={{ height: "30rem", filter: "drop-shadow(0 10px 14px rgba(16, 20, 40, 0.22))" }}
      />
    </div>
  );
}
