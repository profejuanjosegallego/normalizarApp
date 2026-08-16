"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Taller from "@/components/Taller";
import { borrarTrabajo, cargarTrabajo } from "@/lib/almacenamiento";
import { decodificarEjercicio, normalizarCodigoCorto } from "@/lib/codec";
import { EJERCICIO_DEMO } from "@/lib/ejemplo";
import { ErrorBackend, obtenerEjercicio } from "@/lib/supabase";
import { PASOS, type Ejercicio, type Trabajo } from "@/lib/tipos";
import { crearTrabajo } from "@/lib/trabajo";

/**
 * Marca de "ya estoy trabajando en este ejercicio en esta pestaña".
 *
 * Vive en `sessionStorage`, que se borra al cerrar el navegador. Sirve para
 * distinguir dos situaciones que en `localStorage` se ven iguales: recargar la
 * página en mitad del taller (hay que continuar sin preguntar) y llegar de
 * nuevo a un ejercicio que ya tiene trabajo guardado, típico de las salas de
 * cómputo donde el siguiente estudiante hereda el navegador del anterior (ahí
 * hay que preguntar).
 */
function claveSesion(ejercicioId: string): string {
  return `bdnorm:sesion:${ejercicioId}`;
}

function sesionAbierta(ejercicioId: string): boolean {
  try {
    return sessionStorage.getItem(claveSesion(ejercicioId)) === "1";
  } catch {
    return false;
  }
}

function abrirSesion(ejercicioId: string): void {
  try {
    sessionStorage.setItem(claveSesion(ejercicioId), "1");
  } catch {
    // modo privado: se preguntara de nuevo, que es el lado seguro
  }
}

type Estado =
  | { fase: "cargando" }
  | { fase: "error"; mensaje: string }
  | { fase: "elegir"; ejercicio: Ejercicio; guardado: Trabajo }
  | { fase: "listo"; trabajo: Trabajo };

/** Reconstruye el trabajo rellenando campos que falten de versiones anteriores. */
function fusionar(ejercicio: Ejercicio, guardado: Trabajo): Trabajo {
  return {
    ...crearTrabajo(ejercicio),
    ...guardado,
    // El enunciado siempre gana el del servidor: si el docente lo reeditó, el
    // estudiante debe ver el texto nuevo sin perder lo que llevaba hecho.
    ejercicio,
    posiciones: guardado.posiciones ?? {},
  };
}

export default function PaginaEjercicio() {
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });

  const preparar = useCallback((ejercicio: Ejercicio) => {
    const guardado = cargarTrabajo(ejercicio.id);
    if (guardado && !sesionAbierta(ejercicio.id)) {
      setEstado({ fase: "elegir", ejercicio, guardado });
      return;
    }
    abrirSesion(ejercicio.id);
    setEstado({
      fase: "listo",
      trabajo: guardado ? fusionar(ejercicio, guardado) : crearTrabajo(ejercicio),
    });
  }, []);

  useEffect(() => {
    let vigente = true;
    const hash = window.location.hash;

    // Código corto: el enunciado está publicado en el servidor.
    if (hash.startsWith("#c=")) {
      const codigo = normalizarCodigoCorto(hash.slice(3));
      obtenerEjercicio(codigo)
        .then((ejercicio) => {
          if (!vigente) return;
          if (!ejercicio) {
            setEstado({
              fase: "error",
              mensaje: `No existe ningún ejercicio con el código ${codigo}. Revisa que lo hayas escrito completo.`,
            });
            return;
          }
          preparar(ejercicio);
        })
        .catch((e: unknown) => {
          if (!vigente) return;
          setEstado({
            fase: "error",
            mensaje:
              e instanceof ErrorBackend
                ? e.message
                : "No se pudo consultar el ejercicio. Intenta de nuevo.",
          });
        });
      return () => {
        vigente = false;
      };
    }

    // Enlace largo con el enunciado adentro, o ejercicio de ejemplo.
    const ejercicio = hash.startsWith("#e=")
      ? decodificarEjercicio(hash.slice(3))
      : hash === "#demo"
        ? EJERCICIO_DEMO
        : null;

    if (!ejercicio) {
      setEstado({
        fase: "error",
        mensaje:
          "El enlace que abriste no trae un enunciado válido. Pide a tu docente el código del ejercicio y escríbelo en la página de inicio.",
      });
      return;
    }

    preparar(ejercicio);
    return () => {
      vigente = false;
    };
  }, [preparar]);

  if (estado.fase === "cargando") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="suave text-sm">Cargando ejercicio…</p>
      </div>
    );
  }

  if (estado.fase === "error") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <div className="tarjeta p-6">
          <h1 className="text-lg font-bold">No se encontró el ejercicio</h1>
          <p className="suave mt-2 text-sm">{estado.mensaje}</p>
          <Link href="/" className="btn btn-primario mt-4 inline-flex">
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (estado.fase === "elegir") {
    const { ejercicio, guardado } = estado;
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="tarjeta p-6">
          <p className="titulo-seccion">{ejercicio.titulo}</p>
          <h1 className="mt-1 text-xl font-black tracking-tight">
            Este navegador ya tiene un trabajo empezado
          </h1>
          <p className="suave mt-2 text-sm leading-relaxed">
            Si eres tú quien lo dejó a medias, continúa. Si acabas de sentarte en este computador y
            el trabajo es de otra persona, empieza de cero: el suyo seguirá guardado en el archivo
            .json que haya descargado, pero desaparecerá de aquí.
          </p>

          <div className="tarjeta-plana mt-4 p-4">
            <p className="text-sm font-semibold">
              {guardado.estudiante.nombre || "Sin nombre"}
              {guardado.estudiante.codigo ? ` · ${guardado.estudiante.codigo}` : ""}
            </p>
            <p className="suave mt-1 text-xs">
              Paso {guardado.pasoActual}: {PASOS[guardado.pasoActual] ?? "—"} ·{" "}
              {guardado.modelo.length} tablas ·{" "}
              {guardado.actualizado
                ? `última vez ${new Date(guardado.actualizado).toLocaleString("es")}`
                : "sin fecha"}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primario"
              onClick={() => {
                abrirSesion(ejercicio.id);
                setEstado({ fase: "listo", trabajo: fusionar(ejercicio, guardado) });
              }}
            >
              Continuar este trabajo
            </button>
            <button
              type="button"
              className="btn btn-peligro"
              onClick={() => {
                borrarTrabajo(ejercicio.id);
                abrirSesion(ejercicio.id);
                setEstado({ fase: "listo", trabajo: crearTrabajo(ejercicio) });
              }}
            >
              Empezar de cero
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Taller inicial={estado.trabajo} />;
}
