/**
 * Evaluador final: la prueba que habilita el docente, y la nota.
 *
 * Una "prueba" es un codigo de 6 caracteres que el docente publica desde su
 * panel con las reglas (minutos por caso, decimas por intento fallido,
 * intentos libres). Sin un codigo abierto ningun caso arranca. Se apoya en la
 * misma tabla y las mismas funciones RPC de los ejercicios (`norm_publicar`,
 * `norm_obtener`, `norm_actualizar`): la prueba viaja como un `Ejercicio`
 * con el campo `evaluador`, asi no hace falta tocar el esquema de Supabase.
 */

import type { ConfigPrueba, Ejercicio } from "@/lib/tipos";
import type { Avance } from "./tipos";

export const CONFIG_POR_DEFECTO: ConfigPrueba = {
  minutos: 90,
  descuento: 0.1,
  intentosLibres: 5,
  abierta: true,
  grupo: "",
};

/** Lo que el navegador del estudiante guarda al validar el codigo. */
export type Prueba = {
  codigo: string;
  config: ConfigPrueba;
  /** Ultima vez que el servidor confirmo el codigo. */
  verificada: string;
};

/** Lo que el navegador del docente guarda al habilitar una prueba. */
export type Convocatoria = {
  codigo: string;
  claveEdicion: string;
  config: ConfigPrueba;
  creada: string;
};

/** Convierte la config en el `Ejercicio` que entienden las funciones del servidor. */
export function pruebaComoEjercicio(config: ConfigPrueba, id: string): Ejercicio {
  return {
    id,
    titulo: "Evaluador final" + (config.grupo ? " · " + config.grupo : ""),
    curso: config.grupo,
    docente: "",
    enunciado:
      "Este código es de una prueba del evaluador final. Se escribe en la sección Evaluador final, no aquí.",
    contextoAtomicidad: "",
    minRegistros: 2,
    pistas: [],
    fechaEntrega: "",
    creado: new Date().toISOString(),
    evaluador: normalizarConfig(config),
  };
}

export function normalizarConfig(c: Partial<ConfigPrueba> | null | undefined): ConfigPrueba {
  const minutos = Number(c?.minutos);
  const descuento = Number(c?.descuento);
  const libres = Number(c?.intentosLibres);
  return {
    minutos: Number.isFinite(minutos) && minutos > 0 ? Math.round(minutos) : CONFIG_POR_DEFECTO.minutos,
    descuento: Number.isFinite(descuento) && descuento >= 0 ? Math.round(descuento * 100) / 100 : CONFIG_POR_DEFECTO.descuento,
    intentosLibres: Number.isFinite(libres) && libres >= 0 ? Math.round(libres) : CONFIG_POR_DEFECTO.intentosLibres,
    abierta: c?.abierta !== false,
    grupo: typeof c?.grupo === "string" ? c.grupo.trim() : "",
  };
}

/* --------------------------------------------------------------------------
 * Tiempo
 * ----------------------------------------------------------------------- */

/** Milisegundos que le quedan al caso; 0 si ya vencio, null si no ha empezado. */
export function restanteMs(avance: Avance, config: ConfigPrueba, ahora = Date.now()): number | null {
  if (!avance.inicio) return null;
  const vence = new Date(avance.inicio).getTime() + config.minutos * 60_000;
  return Math.max(0, vence - ahora);
}

export function formatearRestante(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? h + ":" + mm + ":" + ss : mm + ":" + ss;
}

/* --------------------------------------------------------------------------
 * Nota
 * ----------------------------------------------------------------------- */

export type Calificacion = {
  /** De 0,0 a 5,0 con una decimal. */
  nota: number;
  resueltas: number;
  total: number;
  /** Base proporcional a las pistas resueltas, antes de descontar. */
  base: number;
  fallidos: number;
  libres: number;
  descuento: number;
  penalizacion: number;
};

/**
 * Regla, en una linea: 5,0 por resolver el caso completo, menos `descuento`
 * por cada intento fallido que pase de los `intentosLibres`. Si el tiempo se
 * acaba a medio camino, la base es proporcional a las pistas resueltas.
 *
 * Cuenta como intento fallido cada ejecucion que no resuelve la pista en
 * curso (incluidos los errores de sintaxis) y cada acusacion equivocada.
 */
export function calificar(avance: Avance, totalPistas: number, config: ConfigPrueba): Calificacion {
  const resueltas = Math.min(avance.resueltas.length, totalPistas);
  const base = totalPistas > 0 ? (5 * resueltas) / totalPistas : 0;
  const fallidos = avance.intentosFallidos + avance.intentosCulpable;
  const penalizacion = Math.max(0, fallidos - config.intentosLibres) * config.descuento;
  const nota = Math.max(0, Math.round((base - penalizacion) * 10) / 10);
  return {
    nota,
    resueltas,
    total: totalPistas,
    base: Math.round(base * 10) / 10,
    fallidos,
    libres: config.intentosLibres,
    descuento: config.descuento,
    penalizacion: Math.round(penalizacion * 10) / 10,
  };
}

/** Nota con coma decimal, como se escribe en la planilla. */
export function formatearNota(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

/* --------------------------------------------------------------------------
 * Sello del informe
 * ----------------------------------------------------------------------- */

/**
 * Huella corta (FNV-1a) del contenido del informe. No es criptografica: sirve
 * para que el docente note si dos informes "iguales" en realidad difieren, o
 * si un archivo fue editado a mano despues de generarse.
 */
export function sellar(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, "0");
}
