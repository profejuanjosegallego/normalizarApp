"use client";

import type { Caso, PistaResuelta } from "@/lib/evaluador";
import { IconoCandado, IconoCheck, IconoLupa } from "./Iconos";

/**
 * El expediente: la lista de pistas del caso con su estado.
 *
 * Las resueltas muestran lo que se descubrio, la actual queda señalada y las
 * que faltan solo dicen su numero: el titulo de una pista ya cuenta parte de
 * la historia, asi que no se adelanta.
 */
export default function Expediente({
  caso,
  resueltas,
  cerrado,
}: {
  caso: Caso;
  resueltas: PistaResuelta[];
  cerrado: boolean;
}) {
  const hechas = new Set(resueltas.map((r) => r.id));
  const actual = caso.pistas.findIndex((p) => !hechas.has(p.id));
  const total = caso.pistas.length;
  const avance = cerrado ? total : hechas.size;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="titulo-seccion">Expediente</p>
        <span className="chip">
          {avance} de {total}
        </span>
      </div>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full"
        style={{ background: "var(--superficie-3)" }}
        role="progressbar"
        aria-valuenow={avance}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: (avance / total) * 100 + "%", background: "var(--ok)" }}
        />
      </div>

      <details className="tarjeta-plana mt-4 p-3">
        <summary className="titulo-seccion cursor-pointer">La escena</summary>
        <p className="prosa mt-2 text-[0.85rem]">{caso.apertura}</p>
      </details>

      <ol className="mt-4 space-y-2">
        {caso.pistas.map((pista, i) => {
          const hecha = hechas.has(pista.id) || (cerrado && i === total - 1);
          const enCurso = !cerrado && i === actual;
          const bloqueada = !hecha && !enCurso;
          return (
            <li key={pista.id} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-[2px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]"
                style={{
                  background: hecha
                    ? "var(--ok-suave)"
                    : enCurso
                      ? "var(--acento-suave)"
                      : "var(--superficie-3)",
                  color: hecha ? "var(--ok)" : enCurso ? "var(--acento)" : "var(--texto-suave)",
                }}
              >
                {hecha ? <IconoCheck /> : enCurso ? <IconoLupa /> : <IconoCandado />}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[0.82rem] font-semibold leading-snug"
                  style={{ color: bloqueada ? "var(--texto-suave)" : "var(--texto)" }}
                >
                  {bloqueada ? "Pista " + (i + 1) : i + 1 + ". " + pista.titulo}
                  {enCurso ? (
                    <span className="chip ml-2" style={{ color: "var(--acento)" }}>
                      en curso
                    </span>
                  ) : null}
                </p>
                {hecha && pista.hallazgo ? (
                  <p className="suave mt-0.5 text-[0.76rem] leading-relaxed">{pista.hallazgo}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
