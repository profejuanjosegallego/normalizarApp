/**
 * Evaluador final: tipos.
 *
 * Un caso es una historia de detectives con una base de datos precargada. El
 * estudiante avanza pista por pista: cada una le pide una consulta (o un
 * arreglo de estructura) y se da por resuelta cuando lo que devuelve el motor
 * coincide con lo que la pista esperaba. Al final tiene que nombrar al
 * culpable.
 */

import type { Estado, ValorSQL } from "@/lib/sqlmotor";

/**
 * Como se comprueba una pista.
 *
 * - consulta: se ejecuta la consulta de referencia sobre la base del caso y se
 *   compara con la rejilla que obtuvo el estudiante (ver `verificar.ts`).
 * - estado: se mira la estructura o los datos del servidor (llave primaria
 *   puesta, columnas nuevas llenas).
 * - culpable: el estudiante escribe un nombre y se coteja con los aceptados.
 */
export type Comprobacion =
  | { tipo: "consulta"; referencia: string; ordenado?: boolean }
  | {
      tipo: "estado";
      cumple: (estado: Estado) => boolean;
      /** Aviso cuando hizo algo, pero no lo que la pista esperaba. */
      consejo?: (estado: Estado) => string | null;
    }
  | { tipo: "culpable"; aceptados: string[] };

export type Pista = {
  id: string;
  titulo: string;
  /** Lo que cuenta el detective: la escena, el testigo, el dato nuevo. */
  relato: string;
  /** Lo que hay que hacer en SQL, dicho sin la instruccion. */
  tarea: string;
  /** Palabras de SQL que la pista quiere ver usadas; se muestran como chips. */
  herramientas: string[];
  /**
   * Palabras que tienen que aparecer en la sentencia que resolvio la pista.
   * Si el resultado es correcto pero falta alguna, la pista no se da por
   * resuelta: el objetivo es que practiquen justo esa herramienta.
   */
  exige?: string[];
  comprobar: Comprobacion;
  /** Lo que se revela al resolverla: el dato que empuja la historia. */
  hallazgo: string;
};

export type Caso = {
  /** Identificador corto; tambien es el tramo de la URL. */
  id: string;
  titulo: string;
  subtitulo: string;
  /**
   * Caso de practica: se abre sin codigo de prueba, sin reloj y sin nota.
   * Sirve para repasar antes del examen.
   */
  libre?: boolean;
  /** Nombre de la base de datos precargada. */
  base: string;
  /** Presentacion del caso: la escena del crimen, antes de la primera pista. */
  apertura: string;
  /** Script que arma la base: se ejecuta con el motor al abrir el caso. */
  script: string;
  pistas: Pista[];
  /** Nombre del culpable tal como se muestra al cerrar el caso. */
  culpable: string;
  /** Explicacion final: como encajan todas las pistas. */
  resolucion: string;
};

/** Registro de una pista resuelta, para el informe que se entrega al docente. */
export type PistaResuelta = {
  id: string;
  /** SQL (o respuesta) con que se resolvio. */
  sql: string;
  cuando: string;
};

/** Quien resuelve el caso: uno o dos estudiantes. */
export type Integrante = { nombre: string; documento: string };

export type Avance = {
  version: 2;
  casoId: string;
  /** Codigo de la prueba con la que se abrio el caso. */
  pruebaCodigo: string;
  /** Pareja (o estudiante solo). El primero es obligatorio. */
  integrantes: Integrante[];
  /** Cuando pulsaron "Empezar": desde ahi corre el reloj. Null = sin empezar. */
  inicio: string | null;
  resueltas: PistaResuelta[];
  /** Ejecuciones que no resolvieron la pista en curso (errores incluidos). */
  intentosFallidos: number;
  /** Acusaciones equivocadas. */
  intentosCulpable: number;
  /** Veces que usaron "Empezar de cero": queda en el informe. */
  reinicios: number;
  cerrado: string | null;
};

export function avanceVacio(casoId: string, pruebaCodigo = ""): Avance {
  return {
    version: 2,
    casoId,
    pruebaCodigo,
    integrantes: [
      { nombre: "", documento: "" },
      { nombre: "", documento: "" },
    ],
    inicio: null,
    resueltas: [],
    intentosFallidos: 0,
    intentosCulpable: 0,
    reinicios: 0,
    cerrado: null,
  };
}

/** Rejilla tal como la devuelve el motor, para comparar. */
export type Rejilla = { columnas: string[]; filas: ValorSQL[][] };
