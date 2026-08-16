"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { guardarTrabajo } from "@/lib/almacenamiento";
import { clonar } from "@/lib/modelo";
import { PASOS, type FormaNormal, type Trabajo } from "@/lib/tipos";
import { progresoGlobal, validarPaso } from "@/lib/validaciones";
import BotonesImagen from "./BotonesImagen";
import DiagramaER from "./DiagramaER";
import { Dialogo, ListaChequeos } from "./ui";
import PasoEnunciado from "./pasos/PasoEnunciado";
import PasoEntidades from "./pasos/PasoEntidades";
import PasoTablas from "./pasos/PasoTablas";
import PasoPrimeraFN from "./pasos/PasoPrimeraFN";
import PasoSegundaFN from "./pasos/PasoSegundaFN";
import PasoTerceraFN from "./pasos/PasoTerceraFN";
import PasoEntrega from "./pasos/PasoEntrega";

/** Al cerrar un paso se guarda una foto del modelo para el informe final. */
const SNAPSHOT_POR_PASO: Record<number, FormaNormal> = {
  2: "unf",
  3: "1fn",
  4: "2fn",
  5: "3fn",
};

/** Que se puede descargar como imagen en cada paso, para el informe escrito. */
const IMAGEN_POR_PASO: Record<
  number,
  { paso: string; clave: string; variante: "entidades" | "modelo" }
> = {
  1: { paso: "Entidades y relaciones", clave: "entidades", variante: "entidades" },
  2: { paso: "Tablas y registros · sin normalizar", clave: "unf", variante: "modelo" },
  3: { paso: "1FN · Primera forma normal", clave: "1fn", variante: "modelo" },
  4: { paso: "2FN · Segunda forma normal", clave: "2fn", variante: "modelo" },
  5: { paso: "3FN · Tercera forma normal", clave: "3fn", variante: "modelo" },
};

export type PropsPaso = {
  trabajo: Trabajo;
  actualizar: (mutador: (t: Trabajo) => Trabajo) => void;
};

export default function Taller({ inicial }: { inicial: Trabajo }) {
  const [trabajo, setTrabajo] = useState<Trabajo>(inicial);
  const [guardado, setGuardado] = useState<"listo" | "guardando">("listo");
  const [enunciadoAbierto, setEnunciadoAbierto] = useState(true);
  const [diagramaAbierto, setDiagramaAbierto] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const actualizar = useCallback((mutador: (t: Trabajo) => Trabajo) => {
    setTrabajo((previo) => mutador(previo));
    setGuardado("guardando");
  }, []);

  // Autoguardado con rebote: escribe a localStorage 400 ms despues del ultimo cambio.
  useEffect(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      guardarTrabajo(trabajo);
      setGuardado("listo");
    }, 400);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [trabajo]);

  const chequeos = useMemo(() => validarPaso(trabajo.pasoActual, trabajo), [trabajo]);
  const aprobado = chequeos.every((c) => c.ok);
  const progreso = useMemo(() => progresoGlobal(trabajo), [trabajo]);
  const porcentaje = progreso.total === 0 ? 0 : Math.round((progreso.hechos / progreso.total) * 100);

  function irAPaso(destino: number) {
    if (destino < 0 || destino >= PASOS.length) return;
    actualizar((t) => ({ ...t, pasoActual: destino }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function avanzar() {
    const paso = trabajo.pasoActual;
    actualizar((t) => {
      const completados = t.pasosCompletados.includes(paso)
        ? t.pasosCompletados
        : [...t.pasosCompletados, paso];
      const forma = SNAPSHOT_POR_PASO[paso];
      const snapshots = forma ? { ...t.snapshots, [forma]: clonar(t.modelo) } : t.snapshots;
      return {
        ...t,
        pasosCompletados: completados,
        snapshots,
        pasoActual: Math.min(paso + 1, PASOS.length - 1),
      };
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const props: PropsPaso = { trabajo, actualizar };
  const imagen = IMAGEN_POR_PASO[trabajo.pasoActual];

  const contenido = [
    <PasoEnunciado key="0" {...props} />,
    <PasoEntidades key="1" {...props} />,
    <PasoTablas key="2" {...props} />,
    <PasoPrimeraFN key="3" {...props} />,
    <PasoSegundaFN key="4" {...props} />,
    <PasoTerceraFN key="5" {...props} />,
    <PasoEntrega key="6" {...props} />,
  ][trabajo.pasoActual];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5">
      <header className="no-imprimir mb-5">
        <div className="tarjeta flex flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm font-bold" style={{ color: "var(--acento)" }}>
            ← Inicio
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold">{trabajo.ejercicio.titulo}</h1>
            <p className="suave truncate text-xs">
              {trabajo.estudiante.nombre || "Sin nombre"}
              {trabajo.estudiante.codigo ? ` · ${trabajo.estudiante.codigo}` : ""}
              {trabajo.ejercicio.curso ? ` · ${trabajo.ejercicio.curso}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-mini"
              onClick={() => setDiagramaAbierto(true)}
              disabled={trabajo.modelo.length === 0}
              title="Ver el diagrama entidad-relacion de tu modelo actual"
            >
              Ver diagrama
            </button>
            <div className="hidden sm:block">
              <div className="suave mb-1 text-right text-[11px] font-semibold">
                {progreso.hechos}/{progreso.total} verificaciones
              </div>
              <div
                className="h-1.5 w-32 overflow-hidden rounded-full"
                style={{ background: "var(--superficie-3)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${porcentaje}%`, background: "var(--ok)" }}
                />
              </div>
            </div>
            <span className="chip" title="Tu trabajo se guarda en este navegador">
              {guardado === "listo" ? "Guardado" : "Guardando…"}
            </span>
          </div>
        </div>

        <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Pasos del taller">
          {PASOS.map((nombre, i) => {
            const actual = i === trabajo.pasoActual;
            const hecho = trabajo.pasosCompletados.includes(i);
            return (
              <button
                key={nombre}
                type="button"
                onClick={() => irAPaso(i)}
                className="btn btn-mini"
                style={
                  actual
                    ? { background: "var(--acento)", borderColor: "var(--acento)", color: "var(--acento-texto)" }
                    : hecho
                      ? { background: "var(--ok-suave)", color: "var(--ok)", borderColor: "transparent" }
                      : undefined
                }
                aria-current={actual ? "step" : undefined}
              >
                <span className="opacity-70">{i}</span> {nombre} {hecho && !actual ? "✓" : ""}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-5">
          {contenido}

          {imagen ? (
            <section className="tarjeta no-imprimir flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <div>
                <p className="titulo-seccion">Para tu informe</p>
                <p className="suave mt-0.5 text-xs">
                  Descarga como imagen lo que llevas en este paso y pégalo en tu documento.
                </p>
              </div>
              <div className="ml-auto">
                <BotonesImagen
                  trabajo={trabajo}
                  paso={imagen.paso}
                  clave={imagen.clave}
                  variante={imagen.variante}
                />
              </div>
            </section>
          ) : null}
        </main>

        <aside className="no-imprimir space-y-4 lg:sticky lg:top-5 lg:self-start">
          <div className="tarjeta overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setEnunciadoAbierto((v) => !v)}
              aria-expanded={enunciadoAbierto}
            >
              <span className="titulo-seccion">Enunciado</span>
              <span className="suave text-xs">{enunciadoAbierto ? "Ocultar" : "Ver"}</span>
            </button>
            {enunciadoAbierto ? (
              <div className="max-h-[45vh] overflow-y-auto border-t px-4 py-3">
                <p className="prosa text-[0.82rem]">{trabajo.ejercicio.enunciado}</p>
                {trabajo.ejercicio.contextoAtomicidad ? (
                  <>
                    <p className="titulo-seccion mt-4 mb-1">Reglas de atomicidad</p>
                    <p className="prosa text-[0.82rem]">{trabajo.ejercicio.contextoAtomicidad}</p>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          {trabajo.pasoActual < 6 ? (
            <div className="tarjeta p-4">
              <p className="titulo-seccion mb-3">Para avanzar</p>
              <ListaChequeos chequeos={chequeos} />
            </div>
          ) : null}

          {trabajo.ejercicio.pistas.length > 0 ? (
            <details className="tarjeta p-4">
              <summary className="titulo-seccion cursor-pointer">
                Pistas ({trabajo.ejercicio.pistas.length})
              </summary>
              <ul className="mt-3 space-y-2">
                {trabajo.ejercicio.pistas.map((p, i) => (
                  <li key={i} className="suave text-sm">
                    • {p}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </aside>
      </div>

      <div className="no-imprimir mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="btn"
          onClick={() => irAPaso(trabajo.pasoActual - 1)}
          disabled={trabajo.pasoActual === 0}
        >
          ← Anterior
        </button>
        <div className="flex items-center gap-3">
          {!aprobado && trabajo.pasoActual < 6 ? (
            <span className="suave text-xs">Completa las verificaciones para continuar</span>
          ) : null}
          {trabajo.pasoActual < PASOS.length - 1 ? (
            <button type="button" className="btn btn-primario" onClick={avanzar} disabled={!aprobado}>
              Continuar a {PASOS[trabajo.pasoActual + 1]} →
            </button>
          ) : null}
        </div>
      </div>

      <Dialogo
        abierto={diagramaAbierto}
        titulo="Diagrama entidad-relación"
        onCerrar={() => setDiagramaAbierto(false)}
        ancho="max-w-6xl"
      >
        <DiagramaER
          modelo={trabajo.modelo}
          posiciones={trabajo.posiciones}
          onMover={(id, posicion) =>
            actualizar((t) => ({ ...t, posiciones: { ...t.posiciones, [id]: posicion } }))
          }
          onReorganizar={(posiciones) => actualizar((t) => ({ ...t, posiciones }))}
          altoMaximo="65vh"
        />
      </Dialogo>
    </div>
  );
}
