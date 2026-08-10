import type { Ejercicio, Trabajo } from "./tipos";

const PREFIJO = "bdnorm:trabajo:";
const INDICE = "bdnorm:indice";
const BORRADOR_DOCENTE = "bdnorm:docente:borrador";

export type EntradaIndice = {
  ejercicioId: string;
  titulo: string;
  estudiante: string;
  paso: number;
  actualizado: string;
};

function disponible(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function claveTrabajo(ejercicioId: string): string {
  return PREFIJO + ejercicioId;
}

export function guardarTrabajo(trabajo: Trabajo): void {
  if (!disponible()) return;
  const conFecha: Trabajo = { ...trabajo, actualizado: new Date().toISOString() };
  try {
    localStorage.setItem(claveTrabajo(trabajo.ejercicio.id), JSON.stringify(conFecha));
    actualizarIndice(conFecha);
  } catch {
    // Cuota llena o modo privado: el estudiante siempre puede exportar el archivo.
  }
}

export function cargarTrabajo(ejercicioId: string): Trabajo | null {
  if (!disponible()) return null;
  const crudo = localStorage.getItem(claveTrabajo(ejercicioId));
  if (!crudo) return null;
  try {
    const dato = JSON.parse(crudo) as Trabajo;
    return dato.version === 1 ? dato : null;
  } catch {
    return null;
  }
}

export function borrarTrabajo(ejercicioId: string): void {
  if (!disponible()) return;
  localStorage.removeItem(claveTrabajo(ejercicioId));
  const indice = leerIndice().filter((e) => e.ejercicioId !== ejercicioId);
  localStorage.setItem(INDICE, JSON.stringify(indice));
}

function actualizarIndice(trabajo: Trabajo): void {
  const indice = leerIndice().filter((e) => e.ejercicioId !== trabajo.ejercicio.id);
  indice.unshift({
    ejercicioId: trabajo.ejercicio.id,
    titulo: trabajo.ejercicio.titulo,
    estudiante: trabajo.estudiante.nombre,
    paso: trabajo.pasoActual,
    actualizado: trabajo.actualizado,
  });
  localStorage.setItem(INDICE, JSON.stringify(indice.slice(0, 20)));
}

export function leerIndice(): EntradaIndice[] {
  if (!disponible()) return [];
  try {
    const crudo = localStorage.getItem(INDICE);
    return crudo ? (JSON.parse(crudo) as EntradaIndice[]) : [];
  } catch {
    return [];
  }
}

export function guardarBorradorDocente(ejercicio: Ejercicio): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(BORRADOR_DOCENTE, JSON.stringify(ejercicio));
  } catch {
    // sin efecto
  }
}

export function cargarBorradorDocente(): Ejercicio | null {
  if (!disponible()) return null;
  try {
    const crudo = localStorage.getItem(BORRADOR_DOCENTE);
    return crudo ? (JSON.parse(crudo) as Ejercicio) : null;
  } catch {
    return null;
  }
}

export function descargarJSON(nombreArchivo: string, dato: unknown): void {
  const blob = new Blob([JSON.stringify(dato, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

export function descargarTexto(nombreArchivo: string, contenido: string): void {
  const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
