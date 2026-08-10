import type { Ejercicio, Trabajo } from "./tipos";

export function crearTrabajo(ejercicio: Ejercicio): Trabajo {
  return {
    version: 1,
    ejercicio,
    estudiante: { nombre: "", codigo: "", grupo: "" },
    pasoActual: 0,
    pasosCompletados: [],
    entidades: [],
    relaciones: [],
    modelo: [],
    snapshots: {},
    bitacora: { descomposiciones: [], gruposResueltos: [], transitivasResueltas: [] },
    declaraciones: { sinGruposRepeticion: false, sinTransitivas: false },
    posiciones: {},
    actualizado: "",
  };
}

/** Normaliza un archivo .json importado por el estudiante. */
export function validarTrabajoImportado(dato: unknown): Trabajo | null {
  if (!dato || typeof dato !== "object") return null;
  const t = dato as Partial<Trabajo>;
  if (t.version !== 1 || !t.ejercicio || !Array.isArray(t.modelo)) return null;
  return {
    ...crearTrabajo(t.ejercicio),
    ...t,
    version: 1,
    bitacora: {
      descomposiciones: t.bitacora?.descomposiciones ?? [],
      gruposResueltos: t.bitacora?.gruposResueltos ?? [],
      transitivasResueltas: t.bitacora?.transitivasResueltas ?? [],
    },
    declaraciones: {
      sinGruposRepeticion: t.declaraciones?.sinGruposRepeticion ?? false,
      sinTransitivas: t.declaraciones?.sinTransitivas ?? false,
    },
    posiciones: t.posiciones ?? {},
  } as Trabajo;
}
