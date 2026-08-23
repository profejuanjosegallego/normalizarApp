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
  | { e: "como"; sub: Expr; patron: Expr; negado: boolean };

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

export type ItemSelect =
  | { s: "todo" }
  | { s: "col"; nombre: string; alias: string | null }
  | { s: "agregado"; fn: string; arg: string; alias: string | null };

export type Orden = { columna: string; descendente: boolean };

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
  | { c: "insertar"; tabla: string; columnas: string[] | null; filas: Expr[][] }
  | {
      c: "seleccionar";
      items: ItemSelect[];
      distinto: boolean;
      tabla: string;
      donde: Expr | null;
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
