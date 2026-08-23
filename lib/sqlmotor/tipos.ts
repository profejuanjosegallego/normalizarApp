/**
 * Motor de SQL didactico: tipos compartidos.
 *
 * Todo corre en el navegador. El "servidor" es un objeto plano que se guarda
 * en localStorage, asi que solo puede contener datos serializables.
 *
 * El dialecto imitado es MySQL / MariaDB, que es el que se usa en clase y el
 * que genera `lib/sql.ts` en el paso de entrega del taller.
 */

export type ValorSQL = string | number | null;

/** Familia a la que pertenece un tipo de dato, para validar los valores. */
export type FamiliaTipo = "entero" | "decimal" | "texto" | "fecha" | "booleano";

/** Referencia de una llave foranea ya resuelta contra el catalogo. */
export type ReferenciaFK = {
  tabla: string;
  columna: string;
  /** Nombre de la restriccion, para nombrarla en los mensajes de error. */
  nombre: string;
};

export type ColumnaBD = {
  nombre: string;
  /** Tipo tal como lo escribio el estudiante: "VARCHAR(60)", "INT". */
  tipo: string;
  familia: FamiliaTipo;
  /** Longitud declarada en VARCHAR(n) / CHAR(n). */
  longitud: number | null;
  noNula: boolean;
  autoIncrement: boolean;
  unica: boolean;
  porDefecto: ValorSQL | undefined;
  fk: ReferenciaFK | null;
};

export type FilaBD = Record<string, ValorSQL>;

export type TablaBD = {
  nombre: string;
  columnas: ColumnaBD[];
  /** Nombres de columna que forman la llave primaria. Vacio = sin PK. */
  pk: string[];
  filas: FilaBD[];
  /** Proximo valor que entregara la columna AUTO_INCREMENT. */
  siguienteAuto: number;
};

export type BaseBD = {
  nombre: string;
  tablas: TablaBD[];
};

export type Servidor = {
  bases: BaseBD[];
  /** Nombre de la base elegida con USE. */
  activa: string | null;
};

/**
 * Estado completo de la seccion: el servidor mas los logros.
 *
 * Los logros son cosas que el estudiante *hizo* y que no quedan escritas en el
 * servidor (ejecutar un SELECT con WHERE, chocar contra una llave foranea).
 * Sin ellos los retos solo podrian mirar la estructura.
 */
export type Estado = {
  servidor: Servidor;
  logros: string[];
};

export function servidorVacio(): Servidor {
  return { bases: [], activa: null };
}

export function estadoVacio(): Estado {
  return { servidor: servidorVacio(), logros: [] };
}

/** Error de SQL con la linea del script y una pista para el estudiante. */
export class ErrorSQL extends Error {
  linea: number;
  pista: string;

  constructor(mensaje: string, linea = 0, pista = "") {
    super(mensaje);
    this.name = "ErrorSQL";
    this.linea = linea;
    this.pista = pista;
  }
}

/* --------------------------------------------------------------------------
 * Resultados
 * ----------------------------------------------------------------------- */

/** Lo que devuelve una sentencia: un aviso o una rejilla de filas. */
export type Resultado =
  | { clase: "mensaje"; texto: string }
  | { clase: "rejilla"; columnas: string[]; filas: ValorSQL[][]; resumen: string };

export type Ejecucion = {
  /** Texto de la sentencia, tal como la escribio el estudiante. */
  sql: string;
  linea: number;
  ok: boolean;
  resultado?: Resultado;
  error?: { mensaje: string; pista: string; linea: number };
};
