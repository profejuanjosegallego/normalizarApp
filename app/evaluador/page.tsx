"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconoCandado,
  IconoCheck,
  IconoExpediente,
  IconoFlecha,
  IconoLupa,
} from "@/components/evaluador/Iconos";
import Musica from "@/components/evaluador/Musica";
import { Aviso } from "@/components/ui";
import {
  cargarAvanceCaso,
  cargarPrueba,
  guardarPrueba,
  olvidarPrueba,
} from "@/lib/almacenamiento";
import { CASOS, CASOS_EXAMEN, CASOS_PRACTICA, type Avance, type Caso } from "@/lib/evaluador";
import { normalizarConfig, type Prueba } from "@/lib/evaluador/prueba";
import { ErrorBackend, obtenerPrueba } from "@/lib/supabase";

/** Todo lo que el estudiante va a necesitar, para que lo vea antes de entrar. */
const HERRAMIENTAS = [
  "SELECT",
  "WHERE",
  "AND / OR",
  "BETWEEN",
  "IN",
  "LIKE",
  "ORDER BY",
  "COUNT",
  "SUM / AVG",
  "MIN / MAX",
  "GROUP BY",
  "HAVING",
  "LIMIT",
  "DISTINCT",
  "INNER JOIN",
  "ALTER TABLE",
  "UPDATE",
];

function limpiarCodigo(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export default function Evaluador() {
  const [avances, setAvances] = useState<Record<string, Avance | null>>({});
  const [prueba, setPrueba] = useState<Prueba | null>(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [validando, setValidando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const leidos: Record<string, Avance | null> = {};
    for (const c of CASOS) leidos[c.id] = cargarAvanceCaso(c.id);
    setAvances(leidos);
    setPrueba(cargarPrueba());
    // El docente puede repartir el enlace con el codigo adentro: /evaluador?c=ABC123
    const c = new URLSearchParams(window.location.search).get("c");
    if (c) setCodigo(limpiarCodigo(c));
    setListo(true);
  }, []);

  async function validar() {
    const limpio = limpiarCodigo(codigo);
    if (limpio.length !== 6) {
      setError("El código tiene 6 caracteres.");
      return;
    }
    setValidando(true);
    setError("");
    try {
      const config = await obtenerPrueba(limpio);
      if (!config) {
        setError("Ese código no corresponde a ninguna prueba. Revisa que lo hayas escrito completo.");
        return;
      }
      const normal = normalizarConfig(config);
      if (!normal.abierta) {
        setError("Esa prueba está cerrada. Pregúntale a tu docente si va a reabrirla.");
        return;
      }
      const nueva: Prueba = { codigo: limpio, config: normal, verificada: new Date().toISOString() };
      guardarPrueba(nueva);
      setPrueba(nueva);
    } catch (e) {
      setError(e instanceof ErrorBackend ? e.message : "No se pudo validar el código. Intenta de nuevo.");
    } finally {
      setValidando(false);
    }
  }

  function cambiarCodigo() {
    olvidarPrueba();
    setPrueba(null);
    setCodigo("");
    setError("");
  }

  const habilitado = !!prueba;

  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px]">
        <div
          className="mancha"
          style={{ width: 420, height: 420, left: "-8%", top: "-12%", background: "var(--acento)" }}
        />
        <div
          className="mancha"
          style={{
            width: 340,
            height: 340,
            right: "-6%",
            top: "-4%",
            background: "var(--error)",
            opacity: 0.22,
            animationDelay: "-7s",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-10">
        <header className="aparece flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-[16rem] flex-1">
            <Link href="/" className="titulo-seccion hover:underline">
              ← Taller de Normalización
            </Link>
            <p className="titulo-seccion mt-4">Bases de datos · cierre del curso</p>
            <h1 className="titulo-animado mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Evaluador final
            </h1>
            <p className="suave mt-4 max-w-xl text-[0.97rem] leading-relaxed">
              Tres asesinatos, tres bases de datos y un detective que no sabe SQL. Uno es de
              práctica y dos son el examen. Cada caso te entrega una base con cerca de cien
              registros y una cadena de pistas: para avanzar tienes que preguntarle a las tablas
              lo que el detective necesita saber. Al final, acusas a alguien. Solo hay una verdad.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {HERRAMIENTAS.map((h) => (
                <span key={h} className="chip font-mono">
                  {h}
                </span>
              ))}
            </div>
            <div className="mt-5">
              <Musica />
            </div>
          </div>

          {/* La figura del detective: la imagen trae aire arriba, se recorta por abajo. */}
          <div
            aria-hidden
            className="flex h-64 w-40 shrink-0 items-end justify-center overflow-hidden"
          >
            <img
              src="/evaluador/conan.webp"
              alt=""
              className="h-[34rem] w-auto max-w-none"
              style={{ filter: "drop-shadow(0 12px 18px rgba(16, 20, 40, 0.25))" }}
            />
          </div>
        </header>

        {/* ------------------------------------------------ Código de la prueba */}
        <section
          className="tarjeta tarjeta-portada aparece mt-10 flex flex-wrap items-center gap-6 p-6"
          style={{ animationDelay: "160ms" }}
        >
          {habilitado ? (
            <>
              <div className="min-w-[14rem] flex-1">
                <p className="titulo-seccion flex items-center gap-2" style={{ color: "var(--ok)" }}>
                  <IconoCheck />
                  Prueba habilitada
                </p>
                <p className="mt-1 font-mono text-2xl font-black tracking-[0.3em]">
                  {prueba?.codigo}
                </p>
                <p className="suave mt-2 text-sm leading-relaxed">
                  {prueba?.config.grupo ? prueba.config.grupo + " · " : ""}
                  <strong>{prueba?.config.minutos} minutos</strong> por caso. La nota parte de
                  5,0 y baja{" "}
                  <strong>{prueba?.config.descuento.toFixed(1).replace(".", ",")}</strong> por
                  cada intento fallido después de los{" "}
                  <strong>{prueba?.config.intentosLibres}</strong> primeros. Cuenta como intento
                  cada ejecución que no resuelve la pista en curso y cada acusación equivocada.
                </p>
                <button type="button" className="btn btn-mini mt-3" onClick={cambiarCodigo}>
                  Usar otro código
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                aria-hidden
                className="hidden h-44 w-44 shrink-0 items-end justify-center overflow-hidden sm:flex"
              >
                <img
                  src="/evaluador/kogoro-dormido.webp"
                  alt=""
                  className="h-52 w-auto max-w-none"
                  style={{ filter: "drop-shadow(0 10px 14px rgba(16, 20, 40, 0.2))" }}
                />
              </div>
              <div className="min-w-[14rem] flex-1">
                <p className="titulo-seccion flex items-center gap-2">
                  <IconoCandado />
                  El detective duerme
                </p>
                <h2 className="mt-1 text-xl font-bold">Escribe el código de la prueba</h2>
                <p className="suave mt-2 text-sm leading-relaxed">
                  Los casos se destraban con el código de 6 caracteres que tu docente dicta al
                  empezar la prueba. Mientras no lo tengas, el detective sigue dormido.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    className="campo max-w-[12rem] text-center font-mono text-xl font-bold uppercase tracking-[0.35em]"
                    value={codigo}
                    onChange={(e) => {
                      setCodigo(limpiarCodigo(e.target.value));
                      setError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") validar();
                    }}
                    placeholder="K7QM3P"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label="Código de la prueba"
                    disabled={!listo}
                  />
                  <button
                    type="button"
                    className="btn btn-primario"
                    onClick={validar}
                    disabled={validando || codigo.length !== 6}
                  >
                    {validando ? "Validando…" : "Despertar al detective"}
                  </button>
                </div>
                {error ? (
                  <div className="mt-3">
                    <Aviso tono="error">{error}</Aviso>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>

        {/* ------------------------------------------- Caso de práctica */}
        <section className="mt-8">
          <p className="titulo-seccion">Antes del examen · acceso libre</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            {CASOS_PRACTICA.map((caso, i) => (
              <TarjetaCaso
                key={caso.id}
                caso={caso}
                numero={i + 1}
                etiqueta="Práctica"
                avance={avances[caso.id] ?? null}
                habilitado
                retraso={240}
              />
            ))}
          </div>
        </section>

        {/* ------------------------------------------------ Casos del examen */}
        <section className="mt-8">
          <p className="titulo-seccion">El examen · con código de tu docente</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            {CASOS_EXAMEN.map((caso, i) => (
              <TarjetaCaso
                key={caso.id}
                caso={caso}
                numero={i + 1}
                etiqueta={"Caso " + (i + 1)}
                avance={avances[caso.id] ?? null}
                habilitado={habilitado}
                retraso={360 + i * 120}
              />
            ))}
          </div>
        </section>

        <section className="tarjeta aparece mt-5 p-6" style={{ animationDelay: "480ms" }}>
          <h2 className="text-base font-bold">Cómo se juega</h2>
          <ol className="suave mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              El caso de práctica está siempre abierto: sin código, sin reloj y sin nota. Los
              dos casos del examen se destraban con el código de tu docente. Se puede resolver en
              pareja: al abrir un caso escriben sus nombres y documentos, y al pulsar{" "}
              <strong>Empezar</strong> arranca el reloj.
            </li>
            <li>
              Al abrir un caso, su base de datos ya está cargada en el servidor, pero nadie ha
              entrado en ella. Ese es tu primer paso.
            </li>
            <li>
              Cada pista cuenta algo y te pide una consulta. Escríbela en el editor y ejecútala:
              si lo que devuelve es lo que el detective buscaba, la pista se marca sola y aparece
              el hallazgo. Cada ejecución que no la resuelve cuenta como intento fallido.
            </li>
            <li>
              Algunas pistas no son consultas: una tabla que llegó sin llave primaria o sin
              llave foránea, una columna con dos datos metidos en una sola celda. Ahí toca
              arreglar la estructura.
            </li>
            <li>
              Cuando tengas todas las pistas, acusa. Al cerrar el caso (o al acabarse el
              tiempo) sale la nota y el informe en PDF, que es lo que entregas a tu docente.
            </li>
          </ol>
          <p className="suave mt-3 text-xs leading-relaxed">
            Todo pasa en tu navegador. Si lo cierras, el caso sigue donde lo dejaste, y el reloj
            también.
          </p>
        </section>
      </div>
    </div>
  );
}

function TarjetaCaso({
  caso,
  etiqueta,
  avance,
  habilitado,
  retraso,
}: {
  caso: Caso;
  numero: number;
  etiqueta: string;
  avance: Avance | null;
  habilitado: boolean;
  retraso: number;
}) {
  const resueltas = avance?.resueltas.length ?? 0;
  const total = caso.pistas.length;
  const cerrado = !!avance?.cerrado;
  const empezado = !!avance?.inicio;
  const contenido = (
    <>
      <p className="titulo-seccion flex items-center gap-2">
        <IconoExpediente />
        {etiqueta}
        {caso.libre ? <span className="chip chip-ok">sin reloj ni nota</span> : null}
      </p>
      <h2 className="mt-2 text-xl font-bold">{caso.titulo}</h2>
      <p className="suave mt-2 text-sm leading-relaxed">{caso.subtitulo}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {cerrado ? (
          <span className="chip chip-ok">
            <IconoCheck />
            resuelto
          </span>
        ) : empezado ? (
          <span className="chip" style={{ color: "var(--acento)" }}>
            <IconoLupa />
            {resueltas} de {total} pistas
          </span>
        ) : (
          <span className="chip">{total} pistas</span>
        )}
        <span className="flex-1" />
        <span className={habilitado ? "btn btn-primario btn-mini" : "btn btn-mini"}>
          {!habilitado ? (
            <>
              <IconoCandado />
              Bloqueado
            </>
          ) : cerrado ? (
            caso.libre ? "Volver a jugar" : "Ver el informe"
          ) : empezado ? (
            "Continuar"
          ) : (
            "Abrir el caso"
          )}
          {habilitado ? <IconoFlecha /> : null}
        </span>
      </div>
    </>
  );
  return habilitado ? (
    <Link
      href={"/evaluador/" + caso.id}
      className="tarjeta tarjeta-portada aparece block p-6"
      style={{ animationDelay: retraso + "ms" }}
    >
      {contenido}
    </Link>
  ) : (
    <div
      className="tarjeta aparece block p-6"
      style={{ animationDelay: retraso + "ms", opacity: 0.7 }}
      aria-disabled
    >
      {contenido}
    </div>
  );
}
