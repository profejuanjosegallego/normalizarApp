"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Taller from "@/components/Taller";
import { cargarTrabajo } from "@/lib/almacenamiento";
import { decodificarEjercicio } from "@/lib/codec";
import { EJERCICIO_DEMO } from "@/lib/ejemplo";
import type { Trabajo } from "@/lib/tipos";
import { crearTrabajo } from "@/lib/trabajo";

type Estado = { fase: "cargando" } | { fase: "listo"; trabajo: Trabajo } | { fase: "error" };

export default function PaginaEjercicio() {
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });

  useEffect(() => {
    // El enunciado viaja en el fragmento (#e=...) o se usa el ejercicio demo.
    const hash = window.location.hash;
    const ejercicio = hash.startsWith("#e=")
      ? decodificarEjercicio(hash.slice(3))
      : hash === "#demo"
        ? EJERCICIO_DEMO
        : null;

    if (!ejercicio) {
      setEstado({ fase: "error" });
      return;
    }

    const guardado = cargarTrabajo(ejercicio.id);
    // Si el docente reedito el enunciado, se conserva el avance y se refresca el texto.
    // La base de `crearTrabajo` rellena campos que falten de versiones anteriores.
    const trabajo: Trabajo = guardado
      ? { ...crearTrabajo(ejercicio), ...guardado, ejercicio, posiciones: guardado.posiciones ?? {} }
      : crearTrabajo(ejercicio);
    setEstado({ fase: "listo", trabajo });
  }, []);

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
          <h1 className="text-lg font-bold">No se encontro el ejercicio</h1>
          <p className="suave mt-2 text-sm">
            El enlace que abriste no trae un enunciado valido. Pide a tu docente el enlace completo
            (debe incluir la parte que empieza con <code>#e=</code>) o pega el codigo en la pagina de
            inicio.
          </p>
          <Link href="/" className="btn btn-primario mt-4 inline-flex">
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  return <Taller inicial={estado.trabajo} />;
}
