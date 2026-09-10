/**
 * Analisis sintactico del subconjunto de SQL del curso.
 *
 * Cubre: CREATE/DROP DATABASE, USE, SHOW, DESCRIBE, CREATE/DROP TABLE con
 * llaves primarias y foraneas, INSERT, SELECT de una tabla, UPDATE y DELETE.
 *
 * Lo que queda fuera (JOIN, GROUP BY, subconsultas) no falla con un error
 * seco: se avisa que todavia no entra en el curso.
 */

import type {
  Alteracion,
  DefColumna,
  Expr,
  ItemSelect,
  Orden,
  RestriccionTabla,
  Sentencia,
  SentenciaUbicada,
} from "./ast";
import { tokenizar, type Token } from "./lexer";
import { ErrorSQL, type FamiliaTipo, type ValorSQL } from "./tipos";

/** Palabras que nunca pueden hacer de nombre de tabla, columna o alias. */
const RESERVADAS = new Set([
  "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
  "DELETE", "CREATE", "DROP", "TABLE", "DATABASE", "SCHEMA", "USE", "SHOW",
  "DESCRIBE", "DESC", "ASC", "ORDER", "BY", "GROUP", "HAVING", "LIMIT",
  "PRIMARY", "FOREIGN", "KEY", "REFERENCES", "CONSTRAINT", "UNIQUE", "NOT",
  "NULL", "AND", "OR", "IS", "LIKE", "BETWEEN", "IN", "AS", "JOIN", "INNER",
  "LEFT", "RIGHT", "ON", "DEFAULT", "AUTO_INCREMENT", "DISTINCT", "EXISTS",
  "IF", "ALTER", "TRUNCATE", "UNION",
]);

/** Tipos de dato admitidos, con la familia a la que pertenecen. */
export const TIPOS_ADMITIDOS: Record<string, FamiliaTipo> = {
  INT: "entero",
  INTEGER: "entero",
  SMALLINT: "entero",
  BIGINT: "entero",
  TINYINT: "entero",
  DECIMAL: "decimal",
  NUMERIC: "decimal",
  FLOAT: "decimal",
  DOUBLE: "decimal",
  REAL: "decimal",
  VARCHAR: "texto",
  CHAR: "texto",
  TEXT: "texto",
  LONGTEXT: "texto",
  DATE: "fecha",
  DATETIME: "fecha",
  TIMESTAMP: "fecha",
  TIME: "fecha",
  YEAR: "entero",
  BOOLEAN: "booleano",
  BOOL: "booleano",
};

const AGREGADOS = new Set(["COUNT", "SUM", "AVG", "MIN", "MAX"]);

class Lector {
  private tokens: Token[];
  private i = 0;

  constructor(texto: string) {
    this.tokens = tokenizar(texto);
  }

  actual(): Token {
    return this.tokens[this.i];
  }

  siguiente(salto = 1): Token {
    return this.tokens[Math.min(this.i + salto, this.tokens.length - 1)];
  }

  enFin(): boolean {
    return this.actual().tipo === "fin";
  }

  avanzar(): Token {
    const t = this.tokens[this.i];
    if (t.tipo !== "fin") this.i += 1;
    return t;
  }

  /** Consume el token si coincide con la palabra clave o simbolo dado. */
  aceptar(clave: string): boolean {
    const t = this.actual();
    if (t.tipo === "fin") return false;
    if (t.tipo === "palabra" && t.citado) return false;
    if (t.clave === clave) {
      this.i += 1;
      return true;
    }
    return false;
  }

  /** Consume una secuencia de palabras solo si estan todas. */
  aceptarSecuencia(...claves: string[]): boolean {
    const guardado = this.i;
    for (const clave of claves) {
      if (!this.aceptar(clave)) {
        this.i = guardado;
        return false;
      }
    }
    return true;
  }

  ver(clave: string): boolean {
    const t = this.actual();
    return t.tipo !== "fin" && !(t.tipo === "palabra" && t.citado) && t.clave === clave;
  }

  /** Cierto si lo que viene puede leerse como nombre propio (alias, tabla). */
  verIdentificador(): boolean {
    const t = this.actual();
    return t.tipo === "palabra" && (t.citado || !RESERVADAS.has(t.clave));
  }

  exigir(clave: string, que: string, pista = ""): Token {
    if (this.aceptar(clave)) return this.tokens[this.i - 1];
    const t = this.actual();
    const visto = t.tipo === "fin" ? "se acabó la sentencia" : "apareció «" + t.texto + "»";
    throw new ErrorSQL("Falta " + que + ": " + visto + ".", t.linea, pista);
  }

  /** Nombre de tabla, columna o alias. */
  identificador(que: string, pista = ""): string {
    const t = this.actual();
    if (this.verIdentificador()) {
      this.i += 1;
      return t.texto;
    }
    const visto = t.tipo === "fin" ? "se acabó la sentencia" : "apareció «" + t.texto + "»";
    const pistaFinal =
      pista ||
      (t.tipo === "palabra"
        ? "«" + t.texto + "» es una palabra reservada de SQL, no sirve como nombre."
        : "");
    throw new ErrorSQL("Falta " + que + ": " + visto + ".", t.linea, pistaFinal);
  }
}

/* --------------------------------------------------------------------------
 * Expresiones (la parte del WHERE)
 * ----------------------------------------------------------------------- */

function parsearExpr(l: Lector): Expr {
  return parsearO(l);
}

function parsearO(l: Lector): Expr {
  let izq = parsearY(l);
  while (l.aceptar("OR")) {
    izq = { e: "bin", op: "OR", izq, der: parsearY(l) };
  }
  return izq;
}

function parsearY(l: Lector): Expr {
  let izq = parsearNo(l);
  while (l.aceptar("AND")) {
    izq = { e: "bin", op: "AND", izq, der: parsearNo(l) };
  }
  return izq;
}

function parsearNo(l: Lector): Expr {
  if (l.aceptar("NOT")) return { e: "no", sub: parsearNo(l) };
  return parsearComparacion(l);
}

const COMPARADORES = ["=", "<>", "!=", "<", ">", "<=", ">="];

function parsearComparacion(l: Lector): Expr {
  const izq = parsearSuma(l);

  for (const op of COMPARADORES) {
    if (l.ver(op)) {
      l.avanzar();
      return { e: "bin", op: op === "!=" ? "<>" : op, izq, der: parsearSuma(l) };
    }
  }

  if (l.aceptar("IS")) {
    const negado = l.aceptar("NOT");
    l.exigir("NULL", "la palabra NULL después de IS", "Se escribe: WHERE telefono IS NULL");
    return { e: "esNulo", sub: izq, negado };
  }

  const negado = l.aceptar("NOT");

  if (l.aceptar("LIKE")) {
    return { e: "como", sub: izq, patron: parsearSuma(l), negado };
  }

  if (l.aceptar("BETWEEN")) {
    const desde = parsearSuma(l);
    l.exigir("AND", "la palabra AND del BETWEEN", "Se escribe: WHERE edad BETWEEN 18 AND 30");
    return { e: "entre", sub: izq, desde, hasta: parsearSuma(l), negado };
  }

  if (l.aceptar("IN")) {
    l.exigir(
      "(",
      "el paréntesis que abre la lista del IN",
      "Se escribe: WHERE ciudad IN ('Cali', 'Medellín')",
    );
    const lista: Expr[] = [];
    if (!l.ver(")")) {
      do {
        lista.push(parsearSuma(l));
      } while (l.aceptar(","));
    }
    l.exigir(")", "el paréntesis que cierra la lista del IN");
    return { e: "en", sub: izq, lista, negado };
  }

  if (negado) {
    const t = l.actual();
    throw new ErrorSQL(
      "Después de NOT esperaba LIKE, IN o BETWEEN, y apareció «" + t.texto + "».",
      t.linea,
    );
  }

  return izq;
}

function parsearSuma(l: Lector): Expr {
  let izq = parsearProducto(l);
  while (l.ver("+") || l.ver("-")) {
    const op = l.avanzar().texto;
    izq = { e: "bin", op, izq, der: parsearProducto(l) };
  }
  return izq;
}

function parsearProducto(l: Lector): Expr {
  let izq = parsearUnario(l);
  while (l.ver("*") || l.ver("/") || l.ver("%")) {
    const op = l.avanzar().texto;
    izq = { e: "bin", op, izq, der: parsearUnario(l) };
  }
  return izq;
}

function parsearUnario(l: Lector): Expr {
  if (l.ver("-")) {
    l.avanzar();
    return { e: "neg", sub: parsearUnario(l) };
  }
  if (l.ver("+")) {
    l.avanzar();
    return parsearUnario(l);
  }
  return parsearPrimario(l);
}

function parsearPrimario(l: Lector): Expr {
  const t = l.actual();

  if (t.tipo === "numero") {
    l.avanzar();
    return { e: "lit", valor: t.valor as number };
  }

  if (t.tipo === "cadena") {
    l.avanzar();
    return { e: "lit", valor: t.valor as string };
  }

  if (l.ver("(")) {
    l.avanzar();
    const dentro = parsearExpr(l);
    l.exigir(")", "el paréntesis de cierre");
    return dentro;
  }

  if (l.aceptar("NULL")) return { e: "lit", valor: null };
  if (l.aceptar("TRUE")) return { e: "lit", valor: 1 };
  if (l.aceptar("FALSE")) return { e: "lit", valor: 0 };

  if (t.tipo === "palabra") {
    // tabla.columna: el motor trabaja con una sola tabla, se ignora el prefijo.
    let nombre = l.identificador("un nombre de columna");
    if (l.ver(".")) {
      l.avanzar();
      nombre = l.identificador("el nombre de la columna después del punto");
    }
    if (l.ver("(")) {
      throw new ErrorSQL(
        "La función " + nombre.toUpperCase() + "() todavía no está disponible en esta práctica.",
        t.linea,
        "Por ahora el WHERE compara columnas con valores: WHERE nombre = 'Ana'",
      );
    }
    return { e: "col", nombre };
  }

  throw new ErrorSQL(
    "No esperaba «" + (t.texto || "el final") + "» aquí.",
    t.linea,
    "Revisa que la condición tenga la forma: columna = valor",
  );
}

/* --------------------------------------------------------------------------
 * Sentencias
 * ----------------------------------------------------------------------- */

function valorLiteral(l: Lector, que: string): ValorSQL {
  const t = l.actual();
  if (t.tipo === "numero") {
    l.avanzar();
    return t.valor as number;
  }
  if (t.tipo === "cadena") {
    l.avanzar();
    return t.valor as string;
  }
  if (l.ver("-") && l.siguiente().tipo === "numero") {
    l.avanzar();
    const n = l.avanzar();
    return -(n.valor as number);
  }
  if (l.aceptar("NULL")) return null;
  if (l.aceptar("TRUE")) return 1;
  if (l.aceptar("FALSE")) return 0;
  if (l.aceptar("CURRENT_TIMESTAMP") || l.aceptar("CURRENT_DATE")) return null;
  throw new ErrorSQL("Esperaba " + que + " y apareció «" + t.texto + "».", t.linea);
}

function parsearTipo(l: Lector): { tipo: string; longitud: number | null } {
  const t = l.actual();
  if (t.tipo !== "palabra") {
    throw new ErrorSQL(
      "Falta el tipo de dato de la columna: apareció «" + t.texto + "».",
      t.linea,
      "Después del nombre va el tipo, por ejemplo: nombre VARCHAR(60)",
    );
  }
  const clave = t.clave;
  if (!(clave in TIPOS_ADMITIDOS)) {
    throw new ErrorSQL(
      "«" + t.texto + "» no es un tipo de dato conocido.",
      t.linea,
      "En esta práctica puedes usar: INT, DECIMAL, VARCHAR(n), CHAR(n), TEXT, DATE, DATETIME y BOOLEAN.",
    );
  }
  l.avanzar();

  let longitud: number | null = null;
  let escala: number | null = null;
  if (l.ver("(")) {
    l.avanzar();
    const n = l.actual();
    if (n.tipo !== "numero") {
      throw new ErrorSQL("Esperaba un número dentro del paréntesis del tipo.", n.linea);
    }
    l.avanzar();
    longitud = n.valor as number;
    // DECIMAL(10,2): la escala se conserva para mostrarla, no se usa al validar.
    if (l.aceptar(",")) {
      const d = l.actual();
      if (d.tipo !== "numero") {
        throw new ErrorSQL("Esperaba el número de decimales.", d.linea);
      }
      l.avanzar();
      escala = d.valor as number;
    }
    l.exigir(")", "el paréntesis que cierra el tipo de dato");
  }

  l.aceptar("UNSIGNED");
  l.aceptar("ZEROFILL");

  const medida =
    longitud === null ? "" : "(" + longitud + (escala === null ? "" : "," + escala) + ")";
  return { tipo: clave + medida, longitud };
}

function parsearDefColumna(l: Lector): DefColumna {
  const linea = l.actual().linea;
  const nombre = l.identificador("el nombre de la columna");
  const { tipo, longitud } = parsearTipo(l);

  const def: DefColumna = {
    nombre,
    tipo,
    longitud,
    noNula: false,
    autoIncrement: false,
    unica: false,
    esPKInline: false,
    porDefecto: undefined,
    refInline: null,
    linea,
  };

  for (;;) {
    if (l.aceptarSecuencia("NOT", "NULL")) {
      def.noNula = true;
      continue;
    }
    if (l.aceptar("NULL")) continue;
    if (l.aceptar("AUTO_INCREMENT")) {
      def.autoIncrement = true;
      continue;
    }
    if (l.aceptarSecuencia("PRIMARY", "KEY")) {
      def.esPKInline = true;
      continue;
    }
    if (l.aceptar("UNIQUE")) {
      l.aceptar("KEY");
      def.unica = true;
      continue;
    }
    if (l.aceptar("DEFAULT")) {
      def.porDefecto = valorLiteral(l, "el valor por defecto");
      continue;
    }
    if (l.aceptar("COMMENT")) {
      valorLiteral(l, "el texto del comentario");
      continue;
    }
    if (l.aceptar("REFERENCES")) {
      const tablaRef = l.identificador("el nombre de la tabla a la que apunta la llave foránea");
      l.exigir(
        "(",
        "el paréntesis con la columna referenciada",
        "Se escribe: REFERENCES cliente(id_cliente)",
      );
      const columnaRef = l.identificador("el nombre de la columna referenciada");
      l.exigir(")", "el paréntesis de cierre de REFERENCES");
      def.refInline = { tabla: tablaRef, columna: columnaRef };
      continue;
    }
    break;
  }

  return def;
}

function listaColumnasEntreParentesis(l: Lector, que: string): string[] {
  l.exigir("(", "el paréntesis que abre " + que);
  const cols: string[] = [];
  do {
    cols.push(l.identificador("el nombre de una columna"));
  } while (l.aceptar(","));
  l.exigir(")", "el paréntesis que cierra " + que);
  return cols;
}

/** ON DELETE / ON UPDATE: se aceptan y se ignoran, el motor siempre restringe. */
function saltarAcciones(l: Lector): void {
  while (l.aceptar("ON")) {
    if (!l.aceptar("DELETE")) l.aceptar("UPDATE");
    if (l.aceptar("CASCADE")) continue;
    if (l.aceptarSecuencia("SET", "NULL")) continue;
    if (l.aceptar("RESTRICT")) continue;
    l.aceptarSecuencia("NO", "ACTION");
  }
}

function parsearCrearTabla(l: Lector): Sentencia {
  const siNoExiste = l.aceptarSecuencia("IF", "NOT", "EXISTS");
  const nombre = l.identificador("el nombre de la tabla");
  l.exigir(
    "(",
    "el paréntesis que abre la lista de columnas",
    "Se escribe: CREATE TABLE cliente ( id_cliente INT, ... );",
  );

  const columnas: DefColumna[] = [];
  const restricciones: RestriccionTabla[] = [];

  if (l.ver(")")) {
    throw new ErrorSQL(
      "La tabla no puede quedar sin columnas.",
      l.actual().linea,
      "Dentro del paréntesis van las columnas, separadas por comas.",
    );
  }

  do {
    const linea = l.actual().linea;
    let nombreRestriccion = "";
    if (l.aceptar("CONSTRAINT")) {
      nombreRestriccion = l.identificador("el nombre de la restricción");
    }

    if (l.aceptarSecuencia("PRIMARY", "KEY")) {
      restricciones.push({
        r: "pk",
        columnas: listaColumnasEntreParentesis(l, "las columnas de la llave primaria"),
        linea,
      });
      continue;
    }

    if (l.aceptarSecuencia("FOREIGN", "KEY")) {
      const propias = listaColumnasEntreParentesis(l, "la columna de la llave foránea");
      l.exigir(
        "REFERENCES",
        "la palabra REFERENCES",
        "Se escribe: FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)",
      );
      const tablaRef = l.identificador("el nombre de la tabla referenciada");
      const ajenas = listaColumnasEntreParentesis(l, "la columna referenciada");
      saltarAcciones(l);
      if (propias.length !== 1 || ajenas.length !== 1) {
        throw new ErrorSQL(
          "Por ahora cada llave foránea apunta con una sola columna.",
          linea,
          "FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)",
        );
      }
      restricciones.push({
        r: "fk",
        nombre: nombreRestriccion,
        columna: propias[0],
        tablaRef,
        columnaRef: ajenas[0],
        linea,
      });
      continue;
    }

    if (l.aceptar("UNIQUE")) {
      l.aceptar("KEY");
      l.aceptar("INDEX");
      if (!l.ver("(")) l.identificador("el nombre del índice");
      restricciones.push({
        r: "unica",
        columnas: listaColumnasEntreParentesis(l, "las columnas únicas"),
        linea,
      });
      continue;
    }

    if (l.ver("KEY") || l.ver("INDEX")) {
      // Indices sueltos: se aceptan por compatibilidad y no cambian nada.
      l.avanzar();
      if (!l.ver("(")) l.identificador("el nombre del índice");
      listaColumnasEntreParentesis(l, "las columnas del índice");
      continue;
    }

    columnas.push(parsearDefColumna(l));
  } while (l.aceptar(","));

  l.exigir(
    ")",
    "el paréntesis que cierra la lista de columnas",
    "Revisa si falta una coma entre dos columnas.",
  );

  // Opciones de tabla de MySQL: ENGINE=..., DEFAULT CHARSET=...
  while (!l.ver(";") && !l.enFin()) l.avanzar();

  return { c: "crearTabla", nombre, siNoExiste, columnas, restricciones };
}

/**
 * ALTER TABLE. Por ahora solo la familia ADD: agregar una columna, una llave
 * primaria, una llave foránea (el caso típico de "se me olvidó") o UNIQUE. No
 * se acepta MODIFY / DROP / CHANGE todavía.
 */
function parsearAlterar(l: Lector): Sentencia {
  l.exigir("TABLE", "la palabra TABLE", "Se escribe: ALTER TABLE pedido ADD ...;");
  const tabla = l.identificador("el nombre de la tabla que vas a modificar");
  const alteraciones: Alteracion[] = [];

  do {
    const linea = l.actual().linea;
    if (!l.aceptar("ADD")) {
      const tk = l.actual();
      throw new ErrorSQL(
        "Después de ALTER TABLE, esta práctica solo permite AÑADIR con ADD.",
        tk.linea,
        "Ejemplos:  ALTER TABLE pedido ADD FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente);" +
          "   ·   ALTER TABLE cliente ADD correo VARCHAR(80);",
      );
    }

    // CONSTRAINT nombre: opcional, para nombrar una FK/UNIQUE/PK.
    let nombreRestriccion = "";
    if (l.aceptar("CONSTRAINT")) {
      nombreRestriccion = l.identificador("el nombre de la restricción");
    }

    if (l.aceptarSecuencia("PRIMARY", "KEY")) {
      alteraciones.push({
        a: "addPK",
        columnas: listaColumnasEntreParentesis(l, "las columnas de la llave primaria"),
        linea,
      });
      continue;
    }

    if (l.aceptarSecuencia("FOREIGN", "KEY")) {
      const propias = listaColumnasEntreParentesis(l, "la columna de la llave foránea");
      l.exigir(
        "REFERENCES",
        "la palabra REFERENCES",
        "Se escribe: FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)",
      );
      const tablaRef = l.identificador("el nombre de la tabla referenciada");
      const ajenas = listaColumnasEntreParentesis(l, "la columna referenciada");
      saltarAcciones(l);
      if (propias.length !== 1 || ajenas.length !== 1) {
        throw new ErrorSQL(
          "Por ahora cada llave foránea apunta con una sola columna.",
          linea,
          "FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)",
        );
      }
      alteraciones.push({
        a: "addFK",
        nombre: nombreRestriccion,
        columna: propias[0],
        tablaRef,
        columnaRef: ajenas[0],
        linea,
      });
      continue;
    }

    if (l.aceptar("UNIQUE")) {
      l.aceptar("KEY");
      l.aceptar("INDEX");
      if (!l.ver("(")) l.identificador("el nombre del índice");
      alteraciones.push({
        a: "addUnica",
        columnas: listaColumnasEntreParentesis(l, "las columnas únicas"),
        linea,
      });
      continue;
    }

    // ADD [COLUMN] <definición de columna>
    l.aceptar("COLUMN");
    alteraciones.push({ a: "addColumna", def: parsearDefColumna(l) });
  } while (l.aceptar(","));

  return { c: "alterar", tabla, alteraciones };
}

function parsearInsertar(l: Lector): Sentencia {
  l.exigir("INTO", "la palabra INTO", "Se escribe: INSERT INTO cliente (nombre) VALUES ('Ana');");
  const tabla = l.identificador("el nombre de la tabla");

  let columnas: string[] | null = null;
  if (l.ver("(")) columnas = listaColumnasEntreParentesis(l, "la lista de columnas");

  l.exigir(
    "VALUES",
    "la palabra VALUES",
    "Se escribe: INSERT INTO cliente (nombre) VALUES ('Ana');",
  );

  const filas: Expr[][] = [];
  do {
    l.exigir("(", "el paréntesis que abre los valores");
    const fila: Expr[] = [];
    if (!l.ver(")")) {
      do {
        fila.push(parsearExpr(l));
      } while (l.aceptar(","));
    }
    l.exigir(")", "el paréntesis que cierra los valores");
    filas.push(fila);
  } while (l.aceptar(","));

  return { c: "insertar", tabla, columnas, filas };
}

/** Alias opcional después de una columna o de la tabla. */
function aliasOpcional(l: Lector): string | null {
  if (l.aceptar("AS")) return l.identificador("el alias después de AS");
  if (l.verIdentificador()) return l.identificador("el alias");
  return null;
}

function parsearSeleccionar(l: Lector): Sentencia {
  const distinto = l.aceptar("DISTINCT");
  l.aceptar("ALL");

  const items: ItemSelect[] = [];
  do {
    if (l.ver("*")) {
      l.avanzar();
      items.push({ s: "todo" });
      continue;
    }

    const t = l.actual();
    if (t.tipo === "palabra" && AGREGADOS.has(t.clave) && l.siguiente().clave === "(") {
      const fn = t.clave;
      l.avanzar();
      l.avanzar();
      let arg = "*";
      if (l.ver("*")) {
        l.avanzar();
      } else {
        l.aceptar("DISTINCT");
        arg = l.identificador("el nombre de la columna dentro de la función");
      }
      l.exigir(")", "el paréntesis que cierra " + fn + "()");
      items.push({ s: "agregado", fn, arg, alias: aliasOpcional(l) });
      continue;
    }

    if (t.tipo === "numero" || t.tipo === "cadena") {
      throw new ErrorSQL(
        "En esta práctica el SELECT lista columnas de una tabla, no valores sueltos.",
        t.linea,
        "Por ejemplo: SELECT nombre, ciudad FROM cliente;",
      );
    }

    let nombre = l.identificador("el nombre de una columna después de SELECT");
    if (l.ver(".")) {
      l.avanzar();
      if (l.ver("*")) {
        l.avanzar();
        items.push({ s: "todo" });
        continue;
      }
      nombre = l.identificador("el nombre de la columna después del punto");
    }
    items.push({ s: "col", nombre, alias: aliasOpcional(l) });
  } while (l.aceptar(","));

  l.exigir("FROM", "la palabra FROM", "Se escribe: SELECT nombre FROM cliente;");
  const tabla = l.identificador("el nombre de la tabla");
  aliasOpcional(l);

  if (l.ver(",") || l.ver("JOIN") || l.ver("INNER") || l.ver("LEFT") || l.ver("RIGHT")) {
    throw new ErrorSQL(
      "Consultar dos tablas a la vez (JOIN) todavía no entra en esta práctica.",
      l.actual().linea,
      "Por ahora consulta una tabla a la vez: SELECT * FROM pedido;",
    );
  }

  let donde: Expr | null = null;
  if (l.aceptar("WHERE")) donde = parsearExpr(l);

  if (l.aceptarSecuencia("GROUP", "BY")) {
    throw new ErrorSQL(
      "GROUP BY todavía no entra en esta práctica.",
      l.actual().linea,
      "COUNT(*), SUM() y AVG() sí funcionan sobre toda la tabla o sobre lo que filtre el WHERE.",
    );
  }

  const orden: Orden[] = [];
  if (l.aceptarSecuencia("ORDER", "BY")) {
    do {
      const columna = l.identificador("el nombre de la columna por la que ordenar");
      let descendente = false;
      if (l.aceptar("DESC")) descendente = true;
      else l.aceptar("ASC");
      orden.push({ columna, descendente });
    } while (l.aceptar(","));
  }

  let limite: number | null = null;
  if (l.aceptar("LIMIT")) {
    const n = l.actual();
    if (n.tipo !== "numero") {
      throw new ErrorSQL("Después de LIMIT va un número.", n.linea, "Por ejemplo: LIMIT 10");
    }
    l.avanzar();
    limite = n.valor as number;
  }

  return { c: "seleccionar", items, distinto, tabla, donde, orden, limite };
}

function parsearActualizar(l: Lector): Sentencia {
  const tabla = l.identificador("el nombre de la tabla");
  l.exigir(
    "SET",
    "la palabra SET",
    "Se escribe: UPDATE cliente SET ciudad = 'Cali' WHERE id_cliente = 1;",
  );

  const asignaciones: { columna: string; valor: Expr }[] = [];
  do {
    const columna = l.identificador("el nombre de la columna que vas a cambiar");
    l.exigir("=", "el signo igual", "Se escribe: SET ciudad = 'Cali'");
    asignaciones.push({ columna, valor: parsearExpr(l) });
  } while (l.aceptar(","));

  let donde: Expr | null = null;
  if (l.aceptar("WHERE")) donde = parsearExpr(l);

  return { c: "actualizar", tabla, asignaciones, donde };
}

function parsearSentencia(l: Lector): Sentencia {
  const t = l.actual();

  if (l.aceptar("CREATE")) {
    if (l.aceptar("DATABASE") || l.aceptar("SCHEMA")) {
      const siNoExiste = l.aceptarSecuencia("IF", "NOT", "EXISTS");
      return {
        c: "crearBase",
        nombre: l.identificador("el nombre de la base de datos"),
        siNoExiste,
      };
    }
    if (l.aceptar("TABLE")) return parsearCrearTabla(l);
    throw new ErrorSQL(
      "Después de CREATE esperaba DATABASE o TABLE.",
      t.linea,
      "CREATE DATABASE tienda;   ·   CREATE TABLE cliente ( ... );",
    );
  }

  if (l.aceptar("DROP")) {
    if (l.aceptar("DATABASE") || l.aceptar("SCHEMA")) {
      const siExiste = l.aceptarSecuencia("IF", "EXISTS");
      return { c: "borrarBase", nombre: l.identificador("el nombre de la base de datos"), siExiste };
    }
    if (l.aceptar("TABLE")) {
      const siExiste = l.aceptarSecuencia("IF", "EXISTS");
      const tablas: string[] = [];
      do {
        tablas.push(l.identificador("el nombre de la tabla"));
      } while (l.aceptar(","));
      return { c: "borrarTabla", tablas, siExiste };
    }
    throw new ErrorSQL(
      "Después de DROP esperaba DATABASE o TABLE.",
      t.linea,
      "DROP TABLE pedido;   ·   DROP DATABASE tienda;",
    );
  }

  if (l.aceptar("USE")) {
    return { c: "usar", nombre: l.identificador("el nombre de la base de datos") };
  }

  if (l.aceptar("SHOW")) {
    if (l.aceptar("DATABASES") || l.aceptar("SCHEMAS")) return { c: "mostrarBases" };
    if (l.aceptar("TABLES")) return { c: "mostrarTablas" };
    throw new ErrorSQL(
      "Después de SHOW esperaba DATABASES o TABLES.",
      t.linea,
      "SHOW TABLES; muestra las tablas de la base que estás usando.",
    );
  }

  if (l.aceptar("DESCRIBE") || l.aceptar("DESC")) {
    return { c: "describir", tabla: l.identificador("el nombre de la tabla") };
  }

  if (l.aceptar("INSERT")) return parsearInsertar(l);
  if (l.aceptar("SELECT")) return parsearSeleccionar(l);
  if (l.aceptar("UPDATE")) return parsearActualizar(l);

  if (l.aceptar("DELETE")) {
    l.exigir("FROM", "la palabra FROM", "Se escribe: DELETE FROM cliente WHERE id_cliente = 3;");
    const tabla = l.identificador("el nombre de la tabla");
    let donde: Expr | null = null;
    if (l.aceptar("WHERE")) donde = parsearExpr(l);
    return { c: "eliminar", tabla, donde };
  }

  if (l.aceptar("ALTER")) return parsearAlterar(l);

  if (l.ver("TRUNCATE")) {
    throw new ErrorSQL(
      t.clave + " todavía no entra en esta práctica.",
      t.linea,
      "Para vaciar una tabla, bórrala con DROP TABLE y créala de nuevo, o borra sus filas con DELETE.",
    );
  }

  throw new ErrorSQL(
    "No reconozco la instrucción «" + (t.texto || "(vacía)") + "».",
    t.linea,
    "Las instrucciones empiezan con CREATE, USE, INSERT, SELECT, UPDATE, DELETE, DROP, SHOW o DESCRIBE.",
  );
}

/**
 * Parte el script en sentencias y las analiza una por una.
 *
 * Si alguna esta mal escrita el error sube entero y no se ejecuta nada: mejor
 * corregir antes que dejar la base a medio hacer.
 */
export function parsearScript(texto: string): SentenciaUbicada[] {
  const l = new Lector(texto);
  const sentencias: SentenciaUbicada[] = [];

  while (!l.enFin()) {
    if (l.aceptar(";")) continue;

    const primerToken = l.actual();
    const desde = primerToken.inicio;
    const sentencia = parsearSentencia(l);

    // Todo lo que sobre antes del punto y coma es un descuido del estudiante.
    if (!l.enFin() && !l.ver(";")) {
      const sobra = l.actual();
      throw new ErrorSQL(
        "Sobra «" + sobra.texto + "» al final de la instrucción.",
        sobra.linea,
        "¿Falta un punto y coma (;) para cerrar la instrucción anterior?",
      );
    }

    const hasta = l.actual().tipo === "fin" ? texto.length : l.actual().inicio;
    l.aceptar(";");

    sentencias.push({
      sentencia,
      sql: texto.slice(desde, hasta).trim(),
      linea: primerToken.linea,
    });
  }

  return sentencias;
}
