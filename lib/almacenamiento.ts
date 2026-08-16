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

/* --------------------------------------------------------------------------
 * Codigos publicados por el docente
 *
 * Al publicar un ejercicio, Supabase devuelve una `clave_edicion` que es lo
 * unico que permite reeditarlo despues. Se guarda aqui, en el navegador del
 * docente: si la pierde puede volver a publicar, pero saldra un codigo nuevo.
 * ----------------------------------------------------------------------- */

const PUBLICADOS = "bdnorm:docente:publicados";

export type Publicacion = {
  codigo: string;
  claveEdicion: string;
  publicadoEn: string;
  /** Codificacion del enunciado tal como se publico, para avisar si cambio. */
  firma: string;
  /** Para poder listarlos sin consultar el servidor. */
  titulo?: string;
};

export type PublicacionListada = Publicacion & { ejercicioId: string };

function leerPublicados(): Record<string, Publicacion> {
  if (!disponible()) return {};
  try {
    const crudo = localStorage.getItem(PUBLICADOS);
    return crudo ? (JSON.parse(crudo) as Record<string, Publicacion>) : {};
  } catch {
    return {};
  }
}

/** Todos los ejercicios publicados desde este navegador, del mas nuevo al mas viejo. */
export function listarPublicaciones(): PublicacionListada[] {
  return Object.entries(leerPublicados())
    .map(([ejercicioId, p]) => ({ ...p, ejercicioId }))
    .sort((a, b) => (a.publicadoEn < b.publicadoEn ? 1 : -1));
}

/** Olvida la publicacion en este navegador (no toca el servidor). */
export function olvidarPublicacion(ejercicioId: string): void {
  if (!disponible()) return;
  const todas = leerPublicados();
  delete todas[ejercicioId];
  try {
    localStorage.setItem(PUBLICADOS, JSON.stringify(todas));
  } catch {
    // sin efecto
  }
}

export function guardarPublicacion(ejercicioId: string, publicacion: Publicacion): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(
      PUBLICADOS,
      JSON.stringify({ ...leerPublicados(), [ejercicioId]: publicacion }),
    );
  } catch {
    // sin efecto: el docente igual ve el codigo en pantalla
  }
}

export function cargarPublicacion(ejercicioId: string): Publicacion | null {
  return leerPublicados()[ejercicioId] ?? null;
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
