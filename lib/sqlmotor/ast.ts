/** Arbol de sentencias que produce el analizador sintactico. */

import type { ValorSQL } from "./tipos";

export type Expr =
  | { e: "lit"; valor: ValorSQL }
  | { e: "col"; nombre: string }
  | { e: "bin"; op: string; izq: Expr; der: Expr }
  | { e: "neg"; sub: Expr }
  | { e: "no"; sub: Expr }
  | { e: "esNulo"; sub: Expr; negado: boolean }
  | { e: "entre"; sub: Expr; desde: Expr; hasta: Expr; negado: boolean }
  | { e: "en"; sub: Expr; lista: Expr[]; negado: boolean }
  | { e: "como"; sub: Expr; patron: Expr; negado: boolean }
  /** COUNT(*), SUM(precio)... Solo tiene sentido en el SELECT y en el HAVING. */
  | { e: "agregado"; fn: string; arg: string; distinto: boolean };

export type DefColumna = {
  nombre: string;
  tipo: string;
  longitud: number | null;
  noNula: boolean;
  autoIncrement: boolean;
  unica: boolean;
  esPKInline: boolean;
  porDefecto: ValorSQL | undefined;
  refInline: { tabla: string; columna: string } | null;
  linea: number;
};

export type RestriccionTabla =
  | { r: "pk"; columnas: string[]; linea: number }
  | { r: "unica"; columnas: string[]; linea: number }
  | {
      r: "fk";
      nombre: string;
      columna: string;
      tablaRef: string;
      columnaRef: string;
      linea: number;
    };

/** Una modificación dentro de un ALTER TABLE (solo la familia ADD, por ahora). */
export type Alteracion =
  | { a: "addColumna"; def: DefColumna }
  | { a: "addPK"; columnas: string[]; linea: number }
  | {
      a: "addFK";
      nombre: string;
      columna: string;
      tablaRef: string;
      columnaRef: string;
      linea: number;
    }
  | { a: "addUnica"; columnas: string[]; linea: number };

/**
 * Un elemento de la lista del SELECT.
 *
 * En `todo`, `tabla` es el prefijo de `tabla.*`; null cuando se escribio `*`
 * a secas. En `col` y en `arg`, el nombre puede venir calificado
 * ("dueno.nombre") cuando la consulta une varias tablas.
 */
export type ItemSelect =
  | { s: "todo"; tabla: string | null }
  | { s: "col"; nombre: string; alias: string | null }
  | { s: "agregado"; fn: string; arg: string; distinto: boolean; alias: string | null };

/** Un criterio del ORDER BY: una columna, un total o el alias de una salida. */
export type Orden = { expr: Expr; descendente: boolean };

/** Una tabla mas que entra al SELECT con INNER JOIN ... ON. */
export type Union = {
  tabla: string;
  alias: string | null;
  on: Expr;
  linea: number;
};

export type Sentencia =
  | { c: "crearBase"; nombre: string; siNoExiste: boolean }
  | { c: "borrarBase"; nombre: string; siExiste: boolean }
  | { c: "usar"; nombre: string }
  | { c: "mostrarBases" }
  | { c: "mostrarTablas" }
  | { c: "describir"; tabla: string }
  | {
      c: "crearTabla";
      nombre: string;
      siNoExiste: boolean;
      columnas: DefColumna[];
      restricciones: RestriccionTabla[];
    }
  | { c: "borrarTabla"; tablas: string[]; siExiste: boolean }
  | { c: "alterar"; tabla: string; alteraciones: Alteracion[] }
  | { c: "insertar"; tabla: string; columnas: string[] | null; filas: Expr[][] }
  | {
      c: "seleccionar";
      items: ItemSelect[];
      distinto: boolean;
      tabla: string;
      alias: string | null;
      uniones: Union[];
      donde: Expr | null;
      grupos: string[];
      teniendo: Expr | null;
      orden: Orden[];
      limite: number | null;
    }
  | {
      c: "actualizar";
      tabla: string;
      asignaciones: { columna: string; valor: Expr }[];
      donde: Expr | null;
    }
  | { c: "eliminar"; tabla: string; donde: Expr | null };

/** Sentencia mas el trozo de texto original, para mostrarla en los resultados. */
export type SentenciaUbicada = {
  sentencia: Sentencia;
  sql: string;
  linea: number;
};
