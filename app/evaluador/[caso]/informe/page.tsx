"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { IconoDescarga } from "@/components/evaluador/Iconos";
import { cargarAvanceCaso, cargarPrueba } from "@/lib/almacenamiento";
import { buscarCaso, type Avance } from "@/lib/evaluador";
import {
  calificar,
  formatearNota,
  normalizarConfig,
  sellar,
  type Prueba,
} from "@/lib/evaluador/prueba";
import type { ConfigPrueba } from "@/lib/tipos";

/**
 * Informe del caso, pensado para imprimirse: el boton llama a window.print()
 * y el estudiante lo guarda como PDF desde el dialogo del navegador. Todo lo
 * que se muestra sale del localStorage de este navegador.
 */
export default function Informe() {
  const params = useParams<{ caso: string }>();
  const caso = buscarCaso(String(params?.caso ?? ""));
  const [avance, setAvance] = useState<Avance | null | undefined>(undefined);
  const [prueba, setPrueba] = useState<Prueba | null>(null);

  useEffect(() => {
    if (!caso) return;
    setAvance(cargarAvanceCaso(caso.id));
    setPrueba(cargarPrueba());
  }, [caso]);

  const config: ConfigPrueba = useMemo(() => normalizarConfig(prueba?.config), [prueba]);
  const calificacion = useMemo(
    () => (caso && avance ? calificar(avance, caso.pistas.length, config) : null),
    [caso, avance, config],
  );

  // Huella del contenido, para que el docente detecte informes editados a mano.
  const sello = useMemo(() => {
    if (!caso || !avance || !calificacion) return "";
    return sellar(
      JSON.stringify({
        caso: caso.id,
        prueba: avance.pruebaCodigo,
        integrantes: avance.integrantes,
        inicio: avance.inicio,
        cerrado: avance.cerrado,
        resueltas: avance.resueltas,
        fallidos: avance.intentosFallidos,
        culpable: avance.intentosCulpable,
        reinicios: avance.reinicios,
        nota: calificacion.nota,
      }),
    );
  }, [caso, avance, calificacion]);

  if (!caso) {
    return <p className="p-8 text-center text-sm">Ese caso no existe.</p>;
  }
  if (avance === undefined) return null;
  if (!avance || !avance.inicio || !calificacion) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Todavía no hay nada que informar</h1>
        <p className="suave mt-2 text-sm">Este navegador no tiene un avance del caso «{caso.titulo}».</p>
        <Link href={"/evaluador/" + caso.id} className="btn btn-primario mt-6">
          Ir al caso
        </Link>
      </div>
    );
  }

  const inicio = new Date(avance.inicio);
  const fin = avance.cerrado ? new Date(avance.cerrado) : null;
  const vence = new Date(inicio.getTime() + config.minutos * 60_000);
  // En la practica no hay reloj: solo cierra la acusacion acertada.
  const cierreEfectivo = fin ?? (!caso.libre && Date.now() >= vence.getTime() ? vence : null);
  const minutosUsados = cierreEfectivo
    ? Math.round((cierreEfectivo.getTime() - inicio.getTime()) / 60_000)
    : null;
  const estadoCaso = avance.cerrado
    ? "Caso resuelto"
    : cierreEfectivo
      ? "Tiempo agotado"
      : "En curso (informe parcial)";
  const integrantes = avance.integrantes.filter((i) => i.nombre.trim());
  const fallidos = avance.intentosFallidos + avance.intentosCulpable;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="no-imprimir mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={"/evaluador/" + caso.id} className="titulo-seccion hover:underline">
          ← Volver al caso
        </Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primario" onClick={() => window.print()}>
            <IconoDescarga />
            Guardar como PDF
          </button>
        </div>
      </div>
      <p className="no-imprimir suave mb-6 text-xs leading-relaxed">
        En el diálogo de impresión elige <strong>Guardar como PDF</strong> como destino. El
        archivo es lo que entregas a tu docente.
      </p>

      <article className="tarjeta p-8">
        <header className="flex items-start justify-between gap-6 border-b pb-5">
          <div>
            <p className="titulo-seccion">Taller de Bases de Datos · Evaluador final</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">{caso.titulo}</h1>
            <p className="suave mt-1 text-sm">{caso.subtitulo}</p>
          </div>
          <div className="text-right">
            {caso.libre ? (
              <>
                <p className="titulo-seccion">Práctica</p>
                <p className="text-2xl font-black tracking-tight">Sin nota</p>
              </>
            ) : (
              <>
                <p className="titulo-seccion">Nota</p>
                <p className="text-5xl font-black tracking-tight">
                  {formatearNota(calificacion.nota)}
                </p>
                <p className="suave text-xs">sobre 5,0</p>
              </>
            )}
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="titulo-seccion">Integrantes</p>
            <table className="mt-1 w-full text-sm">
              <tbody>
                {integrantes.map((i, k) => (
                  <tr key={k}>
                    <td className="py-0.5 pr-3 font-semibold">{i.nombre}</td>
                    <td className="suave py-0.5 font-mono">{i.documento}</td>
                  </tr>
                ))}
                {integrantes.length === 0 ? (
                  <tr>
                    <td className="suave py-0.5">Sin nombres</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div>
            <p className="titulo-seccion">Prueba</p>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
              <dt className="suave">Código</dt>
              <dd className="font-mono font-semibold">
                {caso.libre ? "práctica libre" : avance.pruebaCodigo || "—"}
              </dd>
              <dt className="suave">Estado</dt>
              <dd className="font-semibold">{estadoCaso}</dd>
              <dt className="suave">Inicio</dt>
              <dd>{inicio.toLocaleString("es")}</dd>
              <dt className="suave">Cierre</dt>
              <dd>{cierreEfectivo ? cierreEfectivo.toLocaleString("es") : "—"}</dd>
              <dt className="suave">Tiempo</dt>
              <dd>
                {minutosUsados !== null ? minutosUsados + " min" : "—"}
                {caso.libre ? "" : " de " + config.minutos}
              </dd>
              <dt className="suave">Reinicios</dt>
              <dd>{avance.reinicios}</dd>
            </dl>
          </div>
        </section>

        <section className="mt-5 rounded-xl px-4 py-3" style={{ background: "var(--superficie-2)" }}>
          <p className="titulo-seccion">
            {caso.libre ? "Cómo se habría calculado la nota en el examen" : "Cómo se calculó la nota"}
          </p>
          <p className="mt-1 text-sm leading-relaxed">
            {calificacion.resueltas} de {calificacion.total} pistas resueltas → base{" "}
            <strong>{formatearNota(calificacion.base)}</strong>. {fallidos} intento
            {fallidos === 1 ? "" : "s"} fallido{fallidos === 1 ? "" : "s"} (
            {avance.intentosFallidos} ejecuciones sin resolver la pista + {avance.intentosCulpable}{" "}
            acusación{avance.intentosCulpable === 1 ? "" : "es"} equivocada
            {avance.intentosCulpable === 1 ? "" : "s"}), {config.intentosLibres} libres, −
            {config.descuento.toFixed(1).replace(".", ",")} por cada uno de los demás → descuento{" "}
            <strong>−{formatearNota(calificacion.penalizacion)}</strong>. Nota:{" "}
            <strong>{formatearNota(calificacion.nota)}</strong>.
          </p>
        </section>

        <section className="mt-6">
          <p className="titulo-seccion">Pistas y consultas</p>
          <ol className="mt-2 space-y-3">
            {caso.pistas.map((p, i) => {
              const r = avance.resueltas.find((x) => x.id === p.id);
              return (
                <li key={p.id} className="break-inside-avoid">
                  <p className="text-sm font-semibold">
                    {i + 1}. {p.titulo}{" "}
                    <span className="suave font-normal">
                      · {p.herramientas.join(", ") || "acusación"} ·{" "}
                      {r ? new Date(r.cuando).toLocaleTimeString("es") : "sin resolver"}
                    </span>
                  </p>
                  {r ? (
                    <pre
                      className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-lg px-3 py-2 font-mono text-[0.72rem] leading-relaxed"
                      style={{ background: "var(--superficie-2)" }}
                    >
                      {r.sql}
                    </pre>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>

        <footer className="suave mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[0.68rem]">
          <span>Generado el {new Date().toLocaleString("es")} desde el navegador del estudiante.</span>
          <span className="font-mono">Sello {sello}</span>
        </footer>
      </article>
    </div>
  );
}
