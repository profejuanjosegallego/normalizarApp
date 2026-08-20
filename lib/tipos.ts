/**
 * Modelo de datos del taller de normalizacion.
 *
 * El trabajo del estudiante se guarda como un unico objeto `Trabajo` que vive en
 * localStorage y se puede exportar/importar como archivo .json.
 */

export type FormaNormal = "unf" | "1fn" | "2fn" | "3fn";

/** Enunciado creado por el docente. Viaja codificado en el enlace que comparte. */
export type Ejercicio = {
  id: string;
  titulo: string;
  curso: string;
  docente: string;
  /** Texto del caso. Se respetan los saltos de linea. */
  enunciado: string;
  /** Reglas de atomicidad propias de este ejercicio (que se descompone y que no). */
  contextoAtomicidad: string;
  /** Registros minimos por tabla para poder avanzar. Por defecto 2. */
  minRegistros: number;
  pistas: string[];
  /** ISO yyyy-mm-dd o cadena vacia. */
  fechaEntrega: string;
  creado: string;
};

export type Atomicidad = "atomico" | "no-atomico";

/**
 * De que depende un atributo (paso 3FN). "otro" significa que no depende del id
 * de su tabla, asi que hay que retirarlo de ahi.
 */
export type Dependencia = "pk" | "otro";

export type Columna = {
  id: string;
  nombre: string;
  tipo: string;
  esPK: boolean;
  autogenerada: boolean;
  esFK: boolean;
  refTablaId: string | null;

  /** 1FN: clasificacion atomica declarada por el estudiante. */
  atomicidad: Atomicidad | null;
  notaAtomicidad: string;
  /** 1FN: nombre de la columna no atomica de la que se derivo esta columna. */
  derivadaDe: string | null;

  /** 2FN: nombre del grupo de repeticion al que pertenece (ej. "telefono"). */
  grupoRepeticion: string | null;

  /** 3FN: dependencia declarada respecto de la PK de su tabla. */
  dependencia: Dependencia | null;
};

export type Fila = {
  id: string;
  /** columnaId -> valor */
  valores: Record<string, string>;
};

export type TipoTabla = "principal" | "derivada" | "puente";

export type Tabla = {
  id: string;
  nombre: string;
  tipo: TipoTabla;
  columnas: Columna[];
  filas: Fila[];
  nota: string;
  /** Paso en el que nacio la tabla, para el informe final. */
  creadaEn: FormaNormal;
};

export type Entidad = {
  id: string;
  nombre: string;
  descripcion: string;
};

export type Cardinalidad = "1:1" | "1:N" | "N:1" | "N:M";

export type Relacion = {
  id: string;
  origenId: string;
  destinoId: string;
  cardinalidad: Cardinalidad;
  descripcion: string;
};

export type Estudiante = {
  nombre: string;
  codigo: string;
  grupo: string;
};

/** Registro de una descomposicion de atributo no atomico (1FN). */
export type Descomposicion = {
  id: string;
  tablaId: string;
  columnaOriginal: string;
  columnasResultantes: string[];
  justificacion: string;
};

/** Registro de un grupo de repeticion resuelto (2FN). */
export type GrupoResuelto = {
  id: string;
  tablaOrigen: string;
  grupo: string;
  columnasOriginales: string[];
  /** Tabla que quedo del lado del atributo: nueva o una que ya existia. */
  tablaCreada: string;
  /** `false` cuando el estudiante enlazo contra una tabla que ya tenia. */
  creoTabla?: boolean;
  tablaPuente: string;
};

/** Registro de un atributo retirado en 3FN por no depender del id de su tabla. */
export type TransitivaResuelta = {
  id: string;
  tablaOrigen: string;
  atributosMovidos: string[];
  /** Solo en trabajos guardados antes, cuando la app movia el atributo ella misma. */
  determinante?: string;
  tablaDestino?: string;
  creoTabla?: boolean;
};

/** Declaraciones explicitas del estudiante cuando "no hay nada que corregir". */
export type Declaraciones = {
  sinGruposRepeticion: boolean;
  sinTransitivas: boolean;
};

export type Bitacora = {
  descomposiciones: Descomposicion[];
  gruposResueltos: GrupoResuelto[];
  transitivasResueltas: TransitivaResuelta[];
};

export const PASOS = [
  "Enunciado",
  "Entidades y relaciones",
  "Tablas y registros",
  "1FN",
  "2FN",
  "3FN",
  "Entrega",
] as const;

/** Posicion de cada tabla en el diagrama, arrastrada por el estudiante. */
export type Posicion = { x: number; y: number };

export type Trabajo = {
  version: 1;
  ejercicio: Ejercicio;
  estudiante: Estudiante;
  pasoActual: number;
  /** Indices de paso que ya pasaron todas sus validaciones. */
  pasosCompletados: number[];
  entidades: Entidad[];
  relaciones: Relacion[];
  /** Modelo vivo: evoluciona paso a paso. */
  modelo: Tabla[];
  /** Fotos del modelo al cerrar cada forma normal, para el informe final. */
  snapshots: Partial<Record<FormaNormal, Tabla[]>>;
  bitacora: Bitacora;
  declaraciones: Declaraciones;
  /** tablaId -> posicion en el diagrama. Vacio = distribucion automatica. */
  posiciones: Record<string, Posicion>;
  actualizado: string;
};
