/**
 * Ejecucion de las sentencias contra el "servidor" que vive en el navegador.
 *
 * Reglas que si se hacen respetar, porque son las que ensenan algo:
 * llave primaria unica y no nula, NOT NULL, UNIQUE, tipos de dato y sobre todo
 * la integridad referencial de las llaves foraneas (al insertar y al borrar).
 */

import type { Expr, ItemSelect, Sentencia, SentenciaUbicada } from "./ast";
import { parsearScript, TIPOS_ADMITIDOS } from "./parser";
import {
  ErrorSQL,
  type BaseBD,
  type ColumnaBD,
  type Ejecucion,
  type Estado,
  type FamiliaTipo,
  type FilaBD,
  type Resultado,
  type Servidor,
  type TablaBD,
  type ValorSQL,
} from "./tipos";

/* --------------------------------------------------------------------------
 * Utilidades de catalogo
 * ----------------------------------------------------------------------- */

function igual(a: string, b: string): boolean {
  return a.toLocaleLowerCase("es") === b.toLocaleLowerCase("es");
}

function baseActiva(servidor: Servidor, linea: number): BaseBD {
  if (!servidor.activa) {
    throw new ErrorSQL(
      "Todavía no has elegido una base de datos.",
      linea,
      "Primero créala y actívala:  CREATE DATABASE tienda;  USE tienda;",
    );
  }
  const base = servidor.bases.find((b) => igual(b.nombre, servidor.activa as string));
  if (!base) {
    throw new ErrorSQL(
      "La base de datos «" + servidor.activa + "» ya no existe.",
      linea,
      "Vuelve a crearla con CREATE DATABASE o elige otra con USE.",
    );
  }
  return base;
}

function buscarTabla(base: BaseBD, nombre: string): TablaBD | undefined {
  return base.tablas.find((t) => igual(t.nombre, nombre));
}

function exigirTabla(base: BaseBD, nombre: string, linea: number): TablaBD {
  const tabla = buscarTabla(base, nombre);
  if (!tabla) {
    const cercana = base.tablas.find((t) =>
      igual(t.nombre.replace(/s$/, ""), nombre.replace(/s$/, "")),
    );
    throw new ErrorSQL(
      "No existe la tabla «" + nombre + "» en la base «" + base.nombre + "».",
      linea,
      cercana
        ? "¿Querías decir «" + cercana.nombre + "»?"
        : base.tablas.length === 0
          ? "Esa base todavía no tiene tablas. Créala con CREATE TABLE."
          : "Tablas disponibles: " + base.tablas.map((t) => t.nombre).join(", ") + ".",
    );
  }
  return tabla;
}

function buscarColumna(tabla: TablaBD, nombre: string): ColumnaBD | undefined {
  return tabla.columnas.find((c) => igual(c.nombre, nombre));
}

function exigirColumna(tabla: TablaBD, nombre: string, linea: number): ColumnaBD {
  const col = buscarColumna(tabla, nombre);
  if (!col) {
    throw new ErrorSQL(
      "La tabla «" + tabla.nombre + "» no tiene ninguna columna llamada «" + nombre + "».",
      linea,
      "Sus columnas son: " + tabla.columnas.map((c) => c.nombre).join(", ") + ".",
    );
  }
  return col;
}

/* --------------------------------------------------------------------------
 * Ambito de columnas de un SELECT
 *
 * Con una sola tabla el nombre de una columna basta. Al unir varias con INNER
 * JOIN aparece la ambiguedad ("nombre" existe en dueno y en mascota), asi que
 * dentro de la consulta cada columna pasa a llamarse "alias.columna" y el
 * ambito traduce lo que escribio el estudiante a ese nombre, o le explica por
 * que no puede.
 * ----------------------------------------------------------------------- */

/** Una tabla del FROM con el nombre por el que se la llama en la consulta. */
type Fuente = { alias: string; tabla: TablaBD };

type Salida = { titulo: string; columna: string };

type Ambito = {
  /** Tabla contra la que se evaluan las expresiones ya traducidas. */
  tabla: TablaBD;
  /** Filas de partida, antes del WHERE. */
  filas: FilaBD[];
  /** Traduce el nombre escrito por el estudiante al de `tabla`. */
  resolver: (nombre: string, linea: number) => string;
  /** Columnas que despliega `*` (calificador null) o `alias.*`. */
  expandir: (calificador: string | null, linea: number) => Salida[];
};

/** Parte "alias.columna" en sus dos mitades; calificador null si no viene. */
function partirNombre(nombre: string): { calificador: string | null; columna: string } {
  const punto = nombre.indexOf(".");
  return punto < 0
    ? { calificador: null, columna: nombre }
    : { calificador: nombre.slice(0, punto), columna: nombre.slice(punto + 1) };
}

function exigirFuente(fuentes: Fuente[], calificador: string, linea: number): Fuente {
  const f = fuentes.find((x) => igual(x.alias, calificador));
  if (!f) {
    throw new ErrorSQL(
      "«" + calificador + "» no es ninguna de las tablas de esta consulta.",
      linea,
      "Esta consulta trabaja sobre: " + fuentes.map((x) => x.alias).join(", ") + ".",
    );
  }
  return f;
}

/** Ambito de un SELECT sobre una sola tabla: los nombres van sin prefijo. */
function ambitoSimple(tabla: TablaBD, alias: string | null): Ambito {
  const fuentes: Fuente[] = [{ alias: alias ?? tabla.nombre, tabla }];

  return {
    tabla,
    filas: tabla.filas,
    resolver(nombre, linea) {
      const { calificador, columna } = partirNombre(nombre);
      if (calificador !== null) exigirFuente(fuentes, calificador, linea);
      return exigirColumna(tabla, columna, linea).nombre;
    },
    expandir(calificador, linea) {
      if (calificador !== null) exigirFuente(fuentes, calificador, linea);
      return tabla.columnas.map((c) => ({ titulo: c.nombre, columna: c.nombre }));
    },
  };
}

/**
 * Ambito de un SELECT con INNER JOIN: una tabla de trabajo cuyas columnas se
 * llaman "alias.columna", que es tambien como salen tituladas en pantalla.
 */
function ambitoUnido(fuentes: Fuente[], filas: FilaBD[]): Ambito {
  const columnas: ColumnaBD[] = [];
  for (const f of fuentes) {
    for (const c of f.tabla.columnas) columnas.push({ ...c, nombre: f.alias + "." + c.nombre });
  }

  const tabla: TablaBD = {
    nombre: fuentes.map((f) => f.alias).join(" + "),
    columnas,
    pk: [],
    filas,
    siguienteAuto: 1,
  };

  return {
    tabla,
    filas,
    resolver(nombre, linea) {
      const { calificador, columna } = partirNombre(nombre);

      if (calificador !== null) {
        const f = exigirFuente(fuentes, calificador, linea);
        return f.alias + "." + exigirColumna(f.tabla, columna, linea).nombre;
      }

      const duenas = fuentes.filter((f) => buscarColumna(f.tabla, columna));
      if (duenas.length === 0) {
        throw new ErrorSQL(
          "Ninguna de las tablas de esta consulta tiene una columna llamada «" + columna + "».",
          linea,
          "Columnas disponibles: " + columnas.map((c) => c.nombre).join(", ") + ".",
        );
      }
      if (duenas.length > 1) {
        throw new ErrorSQL(
          "«" + columna + "» está en más de una tabla y no se sabe a cuál te refieres.",
          linea,
          "Ponle delante el nombre de la tabla: " +
            duenas.map((f) => f.alias + "." + columna).join(" o ") +
            ".",
        );
      }
      const f = duenas[0];
      return f.alias + "." + (buscarColumna(f.tabla, columna) as ColumnaBD).nombre;
    },
    expandir(calificador, linea) {
      const elegidas = calificador === null ? fuentes : [exigirFuente(fuentes, calificador, linea)];
      return elegidas.flatMap((f) =>
        f.tabla.columnas.map((c) => ({
          titulo: f.alias + "." + c.nombre,
          columna: f.alias + "." + c.nombre,
        })),
      );
    },
  };
}

/** Copia las filas de una tabla poniendole su alias delante a cada columna. */
function prefijar(fuente: Fuente): FilaBD[] {
  return fuente.tabla.filas.map((fila) => {
    const salida: FilaBD = {};
    for (const c of fuente.tabla.columnas) {
      salida[fuente.alias + "." + c.nombre] = fila[c.nombre] ?? null;
    }
    return salida;
  });
}

/** Tope de comparaciones por union, para que el navegador no se congele. */
const TOPE_COMBINACIONES = 250000;

/**
 * Arma la tabla de trabajo del FROM: la tabla sola, o el resultado de encadenar
 * los INNER JOIN. Cada ON se resuelve contra las tablas que ya entraron, que es
 * lo unico que tiene sentido tener a la mano en ese punto.
 */
function armarOrigen(base: BaseBD, s: Sentencia & { c: "seleccionar" }, linea: number): Ambito {
  const primera = exigirTabla(base, s.tabla, linea);
  if (s.uniones.length === 0) return ambitoSimple(primera, s.alias);

  const fuentes: Fuente[] = [{ alias: s.alias ?? primera.nombre, tabla: primera }];
  let filas = prefijar(fuentes[0]);

  for (const union of s.uniones) {
    const tabla = exigirTabla(base, union.tabla, union.linea);
    const alias = union.alias ?? tabla.nombre;

    if (fuentes.some((f) => igual(f.alias, alias))) {
      throw new ErrorSQL(
        "«" + alias + "» ya está en esta consulta y no se puede repetir.",
        union.linea,
        "Si necesitas la misma tabla dos veces, dale un alias distinto: INNER JOIN " +
          tabla.nombre +
          " otro ON ...",
      );
    }

    if (filas.length * tabla.filas.length > TOPE_COMBINACIONES) {
      throw new ErrorSQL(
        "La unión con «" + tabla.nombre + "» compara demasiadas filas de una vez.",
        union.linea,
        "Esta práctica corre dentro del navegador: trabaja con menos filas para unirlas.",
      );
    }

    const parcial = ambitoUnido([...fuentes, { alias, tabla }], []);
    const on = traducirExpr(union.on, parcial, union.linea);

    const derecha = prefijar({ alias, tabla });
    const combinadas: FilaBD[] = [];
    for (const izq of filas) {
      for (const der of derecha) {
        const fila = { ...izq, ...der };
        if (esVerdad(evaluar(on, fila, parcial.tabla, union.linea) ?? 0)) combinadas.push(fila);
      }
    }

    fuentes.push({ alias, tabla });
    filas = combinadas;
  }

  return ambitoUnido(fuentes, filas);
}

/** Reescribe los nombres de columna de una expresion a los del ambito. */
function traducirExpr(expr: Expr, ambito: Ambito, linea: number): Expr {
  switch (expr.e) {
    case "lit":
    case "agregado":
      return expr;
    case "col":
      return { e: "col", nombre: ambito.resolver(expr.nombre, linea) };
    case "neg":
      return { e: "neg", sub: traducirExpr(expr.sub, ambito, linea) };
    case "no":
      return { e: "no", sub: traducirExpr(expr.sub, ambito, linea) };
    case "esNulo":
      return { ...expr, sub: traducirExpr(expr.sub, ambito, linea) };
    case "entre":
      return {
        ...expr,
        sub: traducirExpr(expr.sub, ambito, linea),
        desde: traducirExpr(expr.desde, ambito, linea),
        hasta: traducirExpr(expr.hasta, ambito, linea),
      };
    case "en":
      return {
        ...expr,
        sub: traducirExpr(expr.sub, ambito, linea),
        lista: expr.lista.map((i) => traducirExpr(i, ambito, linea)),
      };
    case "como":
      return {
        ...expr,
        sub: traducirExpr(expr.sub, ambito, linea),
        patron: traducirExpr(expr.patron, ambito, linea),
      };
    case "bin":
      return {
        e: "bin",
        op: expr.op,
        izq: traducirExpr(expr.izq, ambito, linea),
        der: traducirExpr(expr.der, ambito, linea),
      };
  }
}

function familiaDe(tipo: string): FamiliaTipo {
  const base = tipo.replace(/\(.*/, "").toUpperCase();
  return TIPOS_ADMITIDOS[base] ?? "texto";
}

/* --------------------------------------------------------------------------
 * Valores
 * ----------------------------------------------------------------------- */

function comoNumero(valor: ValorSQL): number | null {
  if (valor === null) return null;
  if (typeof valor === "number") return valor;
  const limpio = valor.trim();
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isNaN(n) ? null : n;
}

function fechaValida(texto: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})([ T]\d{2}:\d{2}(:\d{2})?)?$/.exec(texto.trim());
  if (!m) return false;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

/** Comprueba y convierte un valor al tipo de su columna. */
function ajustarValor(
  col: ColumnaBD,
  valor: ValorSQL,
  tabla: string,
  linea: number,
): ValorSQL {
  if (valor === null) return null;

  switch (col.familia) {
    case "entero": {
      const n = comoNumero(valor);
      if (n === null || !Number.isInteger(n)) {
        throw new ErrorSQL(
          "La columna «" +
            col.nombre +
            "» de «" +
            tabla +
            "» es " +
            col.tipo +
            ", y le estás dando " +
            mostrar(valor) +
            ".",
          linea,
          "Los números enteros van sin comillas: 25, no '25'... y sin decimales.",
        );
      }
      return n;
    }
    case "decimal": {
      const n = comoNumero(valor);
      if (n === null) {
        throw new ErrorSQL(
          "La columna «" + col.nombre + "» es " + col.tipo + " y " + mostrar(valor) + " no es un número.",
          linea,
          "Los decimales se escriben con punto: 15000.50",
        );
      }
      return n;
    }
    case "booleano": {
      const n = comoNumero(valor);
      if (n === null || (n !== 0 && n !== 1)) {
        throw new ErrorSQL(
          "La columna «" + col.nombre + "» es " + col.tipo + " y solo admite TRUE/FALSE (1 o 0).",
          linea,
        );
      }
      return n;
    }
    case "fecha": {
      const texto = String(valor);
      if (!fechaValida(texto)) {
        throw new ErrorSQL(
          "«" + texto + "» no es una fecha válida para la columna «" + col.nombre + "».",
          linea,
          "Las fechas van entre comillas y con el formato 'AAAA-MM-DD', por ejemplo '2026-03-15'.",
        );
      }
      return texto.trim();
    }
    default: {
      const texto = String(valor);
      if (col.longitud !== null && texto.length > col.longitud) {
        throw new ErrorSQL(
          "El texto no cabe en «" +
            col.nombre +
            "»: tiene " +
            texto.length +
            " caracteres y la columna es " +
            col.tipo +
            ".",
          linea,
          "Acorta el texto o declara la columna más larga al crear la tabla.",
        );
      }
      return texto;
    }
  }
}

function mostrar(valor: ValorSQL): string {
  if (valor === null) return "NULL";
  if (typeof valor === "number") return String(valor);
  return "'" + valor + "'";
}

/* --------------------------------------------------------------------------
 * Evaluacion del WHERE
 * ----------------------------------------------------------------------- */

/** Compara dos valores. Devuelve null cuando alguno es NULL (desconocido). */
function comparar(a: ValorSQL, b: ValorSQL): number | null {
  if (a === null || b === null) return null;
  if (typeof a === "number" || typeof b === "number") {
    const na = comoNumero(a);
    const nb = comoNumero(b);
    if (na !== null && nb !== null) return na < nb ? -1 : na > nb ? 1 : 0;
  }
  const sa = String(a).toLocaleLowerCase("es");
  const sb = String(b).toLocaleLowerCase("es");
  return sa.localeCompare(sb, "es");
}

function patronARegExp(patron: string): RegExp {
  let salida = "";
  for (const c of patron) {
    if (c === "%") salida += "[\\s\\S]*";
    else if (c === "_") salida += "[\\s\\S]";
    else salida += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + salida + "$", "i");
}

/** Evalua una expresion sobre una fila. `null` representa "desconocido". */
function evaluar(expr: Expr, fila: FilaBD, tabla: TablaBD, linea: number): ValorSQL {
  switch (expr.e) {
    case "lit":
      return expr.valor;

    case "col": {
      const col = exigirColumna(tabla, expr.nombre, linea);
      return fila[col.nombre] ?? null;
    }

    /* Un total solo se puede calcular sobre un grupo de filas, y aqui se esta
       mirando una sola. Llegar hasta aca significa que se escribio en el sitio
       equivocado, casi siempre en el WHERE. */
    case "agregado":
      throw new ErrorSQL(
        expr.fn + "() no se puede usar aquí: los totales van en el SELECT o en el HAVING.",
        linea,
        "El WHERE filtra fila por fila, antes de agrupar. Para filtrar por un total, " +
          "agrupa con GROUP BY y filtra con HAVING.",
      );

    case "neg": {
      const n = comoNumero(evaluar(expr.sub, fila, tabla, linea));
      return n === null ? null : -n;
    }

    case "no": {
      const v = evaluar(expr.sub, fila, tabla, linea);
      if (v === null) return null;
      return esVerdad(v) ? 0 : 1;
    }

    case "esNulo": {
      const v = evaluar(expr.sub, fila, tabla, linea);
      const nulo = v === null;
      return (expr.negado ? !nulo : nulo) ? 1 : 0;
    }

    case "entre": {
      const v = evaluar(expr.sub, fila, tabla, linea);
      const a = comparar(v, evaluar(expr.desde, fila, tabla, linea));
      const b = comparar(v, evaluar(expr.hasta, fila, tabla, linea));
      if (a === null || b === null) return null;
      const dentro = a >= 0 && b <= 0;
      return (expr.negado ? !dentro : dentro) ? 1 : 0;
    }

    case "en": {
      const v = evaluar(expr.sub, fila, tabla, linea);
      if (v === null) return null;
      const hay = expr.lista.some(
        (item) => comparar(v, evaluar(item, fila, tabla, linea)) === 0,
      );
      return (expr.negado ? !hay : hay) ? 1 : 0;
    }

    case "como": {
      const v = evaluar(expr.sub, fila, tabla, linea);
      const p = evaluar(expr.patron, fila, tabla, linea);
      if (v === null || p === null) return null;
      const coincide = patronARegExp(String(p)).test(String(v));
      return (expr.negado ? !coincide : coincide) ? 1 : 0;
    }

    case "bin": {
      if (expr.op === "AND" || expr.op === "OR") {
        const a = evaluar(expr.izq, fila, tabla, linea);
        const b = evaluar(expr.der, fila, tabla, linea);
        const va = a === null ? null : esVerdad(a);
        const vb = b === null ? null : esVerdad(b);
        if (expr.op === "AND") {
          if (va === false || vb === false) return 0;
          if (va === null || vb === null) return null;
          return 1;
        }
        if (va === true || vb === true) return 1;
        if (va === null || vb === null) return null;
        return 0;
      }

      const a = evaluar(expr.izq, fila, tabla, linea);
      const b = evaluar(expr.der, fila, tabla, linea);

      if ("+-*/%".includes(expr.op) && expr.op.length === 1) {
        const na = comoNumero(a);
        const nb = comoNumero(b);
        if (na === null || nb === null) return null;
        if (expr.op === "+") return na + nb;
        if (expr.op === "-") return na - nb;
        if (expr.op === "*") return na * nb;
        if (expr.op === "/") return nb === 0 ? null : na / nb;
        return nb === 0 ? null : na % nb;
      }

      const cmp = comparar(a, b);
      if (cmp === null) return null;
      switch (expr.op) {
        case "=":
          return cmp === 0 ? 1 : 0;
        case "<>":
          return cmp !== 0 ? 1 : 0;
        case "<":
          return cmp < 0 ? 1 : 0;
        case ">":
          return cmp > 0 ? 1 : 0;
        case "<=":
          return cmp <= 0 ? 1 : 0;
        default:
          return cmp >= 0 ? 1 : 0;
      }
    }
  }
}

function esVerdad(valor: ValorSQL): boolean {
  if (valor === null) return false;
  if (typeof valor === "number") return valor !== 0;
  const n = comoNumero(valor);
  return n === null ? valor !== "" : n !== 0;
}

function filtrar(tabla: TablaBD, donde: Expr | null, linea: number): FilaBD[] {
  if (!donde) return [...tabla.filas];
  // El WHERE puede venir con el nombre de la tabla delante: WHERE dueno.id = 1.
  const condicion = traducirExpr(donde, ambitoSimple(tabla, null), linea);
  return tabla.filas.filter((f) => esVerdad(evaluar(condicion, f, tabla, linea) ?? 0));
}

/** Valor de una expresion suelta, sin fila (los VALUES de un INSERT). */
function evaluarLiteral(expr: Expr, linea: number): ValorSQL {
  const tablaFalsa: TablaBD = { nombre: "", columnas: [], pk: [], filas: [], siguienteAuto: 1 };
  if (expr.e === "col") {
    throw new ErrorSQL(
      "«" + expr.nombre + "» no es un valor: los textos van entre comillas.",
      linea,
      "Por ejemplo: VALUES ('Ana', 'Cali')",
    );
  }
  return evaluar(expr, {}, tablaFalsa, linea);
}

/* --------------------------------------------------------------------------
 * Integridad referencial
 * ----------------------------------------------------------------------- */

/** Tablas que apuntan a `destino` mediante alguna llave foranea. */
function hijasDe(base: BaseBD, destino: string): { tabla: TablaBD; columna: ColumnaBD }[] {
  const salida: { tabla: TablaBD; columna: ColumnaBD }[] = [];
  for (const t of base.tablas) {
    for (const c of t.columnas) {
      if (c.fk && igual(c.fk.tabla, destino)) salida.push({ tabla: t, columna: c });
    }
  }
  return salida;
}

/** Comprueba que el valor de una FK exista en la tabla padre. */
function verificarFK(
  base: BaseBD,
  col: ColumnaBD,
  valor: ValorSQL,
  tablaHija: string,
  linea: number,
): void {
  if (!col.fk || valor === null) return;
  const padre = buscarTabla(base, col.fk.tabla);
  if (!padre) {
    throw new ErrorSQL(
      "La tabla «" + col.fk.tabla + "», a la que apunta «" + col.nombre + "», ya no existe.",
      linea,
    );
  }
  const colPadre = buscarColumna(padre, col.fk.columna);
  if (!colPadre) return;
  const existe = padre.filas.some((f) => comparar(f[colPadre.nombre] ?? null, valor) === 0);
  if (!existe) {
    throw new ErrorSQL(
      "No puedes poner " +
        col.nombre +
        " = " +
        mostrar(valor) +
        " en «" +
        tablaHija +
        "»: en «" +
        padre.nombre +
        "» no hay ninguna fila con ese " +
        colPadre.nombre +
        ".",
      linea,
      "Eso es la llave foránea trabajando: primero crea la fila en «" +
        padre.nombre +
        "» y después la de «" +
        tablaHija +
        "».",
    );
  }
}

/* --------------------------------------------------------------------------
 * Sentencias
 * ----------------------------------------------------------------------- */

type Contexto = { estado: Estado; linea: number; anotar: (logro: string) => void };

function crearBase(s: Sentencia & { c: "crearBase" }, ctx: Contexto): Resultado {
  const { servidor } = ctx.estado;
  if (servidor.bases.some((b) => igual(b.nombre, s.nombre))) {
    if (s.siNoExiste) return { clase: "mensaje", texto: "La base «" + s.nombre + "» ya existía." };
    throw new ErrorSQL(
      "Ya existe una base de datos llamada «" + s.nombre + "».",
      ctx.linea,
      "Si querías usarla, escribe:  USE " + s.nombre + ";",
    );
  }
  servidor.bases.push({ nombre: s.nombre, tablas: [] });
  ctx.anotar("base_creada");
  return {
    clase: "mensaje",
    texto:
      "Base de datos «" + s.nombre + "» creada. Actívala con:  USE " + s.nombre + ";",
  };
}

function borrarBase(s: Sentencia & { c: "borrarBase" }, ctx: Contexto): Resultado {
  const { servidor } = ctx.estado;
  const i = servidor.bases.findIndex((b) => igual(b.nombre, s.nombre));
  if (i === -1) {
    if (s.siExiste) return { clase: "mensaje", texto: "La base «" + s.nombre + "» no existía." };
    throw new ErrorSQL("No existe ninguna base de datos llamada «" + s.nombre + "».", ctx.linea);
  }
  const tablas = servidor.bases[i].tablas.length;
  servidor.bases.splice(i, 1);
  if (servidor.activa && igual(servidor.activa, s.nombre)) servidor.activa = null;
  return {
    clase: "mensaje",
    texto: "Base «" + s.nombre + "» eliminada con sus " + tablas + " tabla(s).",
  };
}

function usar(s: Sentencia & { c: "usar" }, ctx: Contexto): Resultado {
  const { servidor } = ctx.estado;
  const base = servidor.bases.find((b) => igual(b.nombre, s.nombre));
  if (!base) {
    throw new ErrorSQL(
      "No existe la base de datos «" + s.nombre + "».",
      ctx.linea,
      servidor.bases.length === 0
        ? "Todavía no has creado ninguna. Empieza con:  CREATE DATABASE " + s.nombre + ";"
        : "Tienes: " + servidor.bases.map((b) => b.nombre).join(", ") + ".",
    );
  }
  servidor.activa = base.nombre;
  ctx.anotar("base_usada");
  return { clase: "mensaje", texto: "Ahora estás trabajando en «" + base.nombre + "»." };
}

function crearTabla(s: Sentencia & { c: "crearTabla" }, ctx: Contexto): Resultado {
  const base = baseActiva(ctx.estado.servidor, ctx.linea);

  if (buscarTabla(base, s.nombre)) {
    if (s.siNoExiste) return { clase: "mensaje", texto: "La tabla «" + s.nombre + "» ya existía." };
    throw new ErrorSQL(
      "Ya existe una tabla llamada «" + s.nombre + "» en «" + base.nombre + "».",
      ctx.linea,
      "Si quieres rehacerla:  DROP TABLE " + s.nombre + ";  y créala de nuevo.",
    );
  }

  const columnas: ColumnaBD[] = [];
  for (const def of s.columnas) {
    if (columnas.some((c) => igual(c.nombre, def.nombre))) {
      throw new ErrorSQL(
        "La columna «" + def.nombre + "» está repetida en la tabla.",
        def.linea,
        "Cada columna se declara una sola vez.",
      );
    }
    columnas.push({
      nombre: def.nombre,
      tipo: def.tipo,
      familia: familiaDe(def.tipo),
      longitud: def.longitud,
      noNula: def.noNula,
      autoIncrement: def.autoIncrement,
      unica: def.unica,
      porDefecto: def.porDefecto,
      fk: null,
    });
  }

  // Llave primaria: la inline y la declarada al final se juntan.
  let pk: string[] = s.columnas.filter((d) => d.esPKInline).map((d) => d.nombre);
  const pkTabla = s.restricciones.filter((r) => r.r === "pk");
  if (pkTabla.length > 1) {
    throw new ErrorSQL(
      "Declaraste PRIMARY KEY más de una vez.",
      pkTabla[1].linea,
      "Una tabla tiene una sola llave primaria (puede estar formada por varias columnas).",
    );
  }
  for (const r of pkTabla) {
    if (pk.length > 0) {
      throw new ErrorSQL(
        "Declaraste la llave primaria dos veces: al lado de la columna y al final.",
        r.linea,
        "Deja solo una de las dos formas.",
      );
    }
    pk = r.columnas;
  }

  for (const nombre of pk) {
    const col = columnas.find((c) => igual(c.nombre, nombre));
    if (!col) {
      throw new ErrorSQL(
        "La llave primaria menciona la columna «" + nombre + "», que no existe en la tabla.",
        ctx.linea,
        "Columnas declaradas: " + columnas.map((c) => c.nombre).join(", ") + ".",
      );
    }
    col.noNula = true;
  }

  for (const r of s.restricciones) {
    if (r.r !== "unica") continue;
    for (const nombre of r.columnas) {
      const col = columnas.find((c) => igual(c.nombre, nombre));
      if (!col) {
        throw new ErrorSQL(
          "UNIQUE menciona la columna «" + nombre + "», que no existe en la tabla.",
          r.linea,
        );
      }
      col.unica = true;
    }
  }

  // AUTO_INCREMENT: entero y siempre parte de la llave primaria.
  for (const col of columnas) {
    if (!col.autoIncrement) continue;
    if (col.familia !== "entero") {
      throw new ErrorSQL(
        "AUTO_INCREMENT solo va en columnas de tipo entero, y «" + col.nombre + "» es " + col.tipo + ".",
        ctx.linea,
        "El identificador autogenerado se declara así:  " + col.nombre + " INT AUTO_INCREMENT",
      );
    }
    if (!pk.some((p) => igual(p, col.nombre)) && !col.unica) {
      throw new ErrorSQL(
        "La columna «" + col.nombre + "» es AUTO_INCREMENT pero no es llave primaria.",
        ctx.linea,
        "Un valor que se genera solo tiene que identificar la fila:  PRIMARY KEY (" +
          col.nombre +
          ")",
      );
    }
  }

  // Llaves foraneas: la tabla y la columna referenciadas deben existir ya.
  const refs = [
    ...s.columnas
      .filter((d) => d.refInline)
      .map((d) => ({
        nombre: "",
        columna: d.nombre,
        tablaRef: (d.refInline as { tabla: string }).tabla,
        columnaRef: (d.refInline as { columna: string }).columna,
        linea: d.linea,
      })),
    ...s.restricciones
      .filter((r) => r.r === "fk")
      .map((r) => (r.r === "fk" ? r : null))
      .filter((r): r is Extract<typeof s.restricciones[number], { r: "fk" }> => r !== null),
  ];

  for (const ref of refs) {
    const col = columnas.find((c) => igual(c.nombre, ref.columna));
    if (!col) {
      throw new ErrorSQL(
        "La llave foránea usa la columna «" + ref.columna + "», que no está declarada en la tabla.",
        ref.linea,
        "Primero declara la columna y después la restricción:  " +
          ref.columna +
          " INT,  FOREIGN KEY (" +
          ref.columna +
          ") REFERENCES ...",
      );
    }

    const esMismaTabla = igual(ref.tablaRef, s.nombre);
    const padre = esMismaTabla ? null : buscarTabla(base, ref.tablaRef);
    if (!esMismaTabla && !padre) {
      throw new ErrorSQL(
        "No existe la tabla «" + ref.tablaRef + "», así que la llave foránea no puede apuntar ahí.",
        ref.linea,
        "Crea primero la tabla a la que se apunta. El orden importa: primero «" +
          ref.tablaRef +
          "», después «" +
          s.nombre +
          "».",
      );
    }

    const colsPadre = padre ? padre.columnas : columnas;
    const pkPadre = padre ? padre.pk : pk;
    const colPadre = colsPadre.find((c) => igual(c.nombre, ref.columnaRef));
    if (!colPadre) {
      throw new ErrorSQL(
        "«" + ref.tablaRef + "» no tiene ninguna columna llamada «" + ref.columnaRef + "».",
        ref.linea,
        "Sus columnas son: " + colsPadre.map((c) => c.nombre).join(", ") + ".",
      );
    }
    if (!pkPadre.some((p) => igual(p, colPadre.nombre)) && !colPadre.unica) {
      throw new ErrorSQL(
        "Una llave foránea tiene que apuntar a la llave primaria de la otra tabla, y «" +
          colPadre.nombre +
          "» no lo es.",
        ref.linea,
        pkPadre.length > 0
          ? "La llave primaria de «" + ref.tablaRef + "» es: " + pkPadre.join(", ") + "."
          : "La tabla «" + ref.tablaRef + "» no tiene llave primaria: decláresela primero.",
      );
    }
    if (col.familia !== colPadre.familia) {
      throw new ErrorSQL(
        "«" +
          col.nombre +
          "» es " +
          col.tipo +
          " y apunta a «" +
          colPadre.nombre +
          "», que es " +
          colPadre.tipo +
          ".",
        ref.linea,
        "Las dos columnas de una llave foránea llevan el mismo tipo de dato.",
      );
    }

    col.fk = {
      tabla: padre ? padre.nombre : s.nombre,
      columna: colPadre.nombre,
      nombre: ref.nombre || "fk_" + s.nombre + "_" + ref.tablaRef,
    };
  }

  const tabla: TablaBD = {
    nombre: s.nombre,
    columnas,
    pk: pk.map((p) => (columnas.find((c) => igual(c.nombre, p)) as ColumnaBD).nombre),
    filas: [],
    siguienteAuto: 1,
  };
  base.tablas.push(tabla);

  ctx.anotar("tabla_creada");
  if (tabla.pk.length > 0) ctx.anotar("tabla_con_pk");
  if (columnas.some((c) => c.autoIncrement)) ctx.anotar("pk_autogenerada");
  if (columnas.some((c) => c.fk)) ctx.anotar("fk_creada");

  const avisos: string[] = [];
  if (tabla.pk.length === 0) {
    avisos.push("Ojo: quedó sin llave primaria; ninguna fila se podrá identificar.");
  }

  return {
    clase: "mensaje",
    texto:
      "Tabla «" +
      tabla.nombre +
      "» creada con " +
      columnas.length +
      " columna(s)." +
      (avisos.length > 0 ? " " + avisos.join(" ") : ""),
  };
}

function borrarTabla(s: Sentencia & { c: "borrarTabla" }, ctx: Contexto): Resultado {
  const base = baseActiva(ctx.estado.servidor, ctx.linea);
  const borradas: string[] = [];

  for (const nombre of s.tablas) {
    const tabla = buscarTabla(base, nombre);
    if (!tabla) {
      if (s.siExiste) continue;
      exigirTabla(base, nombre, ctx.linea);
      continue;
    }

    const hijas = hijasDe(base, tabla.nombre).filter((h) => !igual(h.tabla.nombre, tabla.nombre));
    if (hijas.length > 0) {
      const nombres = [...new Set(hijas.map((h) => h.tabla.nombre))].join(", ");
      throw new ErrorSQL(
        "No puedes borrar «" + tabla.nombre + "»: la tabla " + nombres + " apunta a ella.",
        ctx.linea,
        "Borra primero la tabla que tiene la llave foránea:  DROP TABLE " +
          hijas[0].tabla.nombre +
          ";",
      );
    }

    base.tablas.splice(base.tablas.indexOf(tabla), 1);
    borradas.push(tabla.nombre);
  }

  return {
    clase: "mensaje",
    texto:
      borradas.length === 0
        ? "No había nada que borrar."
        : "Tabla(s) eliminada(s): " + borradas.join(", ") + ".",
  };
}

function alterar(s: Sentencia & { c: "alterar" }, ctx: Contexto): Resultado {
  const base = baseActiva(ctx.estado.servidor, ctx.linea);
  const tabla = exigirTabla(base, s.tabla, ctx.linea);
  const hechos: string[] = [];

  for (const alt of s.alteraciones) {
    if (alt.a === "addColumna") {
      const def = alt.def;
      if (buscarColumna(tabla, def.nombre)) {
        throw new ErrorSQL(
          "La tabla «" + tabla.nombre + "» ya tiene una columna «" + def.nombre + "».",
          def.linea,
          "Elige otro nombre. (Cambiar una columna existente con MODIFY todavía no entra en la práctica.)",
        );
      }
      const nueva: ColumnaBD = {
        nombre: def.nombre,
        tipo: def.tipo,
        familia: familiaDe(def.tipo),
        longitud: def.longitud,
        noNula: def.noNula,
        autoIncrement: def.autoIncrement,
        unica: def.unica,
        porDefecto: def.porDefecto,
        fk: null,
      };

      if (nueva.autoIncrement) {
        if (nueva.familia !== "entero") {
          throw new ErrorSQL(
            "AUTO_INCREMENT solo va en columnas enteras, y «" + nueva.nombre + "» es " + nueva.tipo + ".",
            def.linea,
          );
        }
        if (!nueva.unica) {
          throw new ErrorSQL(
            "Una columna AUTO_INCREMENT añadida con ALTER tiene que ser UNIQUE.",
            def.linea,
            "Ejemplo:  ALTER TABLE " + tabla.nombre + " ADD folio INT AUTO_INCREMENT UNIQUE;",
          );
        }
      }

      // Si la tabla ya tiene filas, hay que poder rellenar la columna nueva.
      if (tabla.filas.length > 0 && !nueva.autoIncrement) {
        if (nueva.noNula && nueva.porDefecto === undefined) {
          throw new ErrorSQL(
            "No puedo añadir «" + nueva.nombre + "» como NOT NULL: «" + tabla.nombre + "» ya tiene " +
              tabla.filas.length + " fila(s) y no diste un valor por defecto.",
            def.linea,
            "Dale un DEFAULT (por ejemplo … DEFAULT 0), o quítale el NOT NULL y luego llénala con UPDATE.",
          );
        }
        if (nueva.unica && nueva.porDefecto !== undefined && tabla.filas.length > 1) {
          throw new ErrorSQL(
            "No puedo añadir «" + nueva.nombre + "» como UNIQUE con un DEFAULT fijo: se repetiría en las " +
              tabla.filas.length + " filas.",
            def.linea,
          );
        }
      }

      for (const fila of tabla.filas) {
        if (nueva.autoIncrement) {
          fila[nueva.nombre] = tabla.siguienteAuto;
          tabla.siguienteAuto += 1;
        } else {
          fila[nueva.nombre] = nueva.porDefecto === undefined ? null : nueva.porDefecto;
        }
      }

      tabla.columnas.push(nueva);
      hechos.push("columna «" + nueva.nombre + "»");
      continue;
    }

    if (alt.a === "addPK") {
      if (tabla.pk.length > 0) {
        throw new ErrorSQL(
          "«" + tabla.nombre + "» ya tiene llave primaria (" + tabla.pk.join(", ") + ").",
          alt.linea,
          "Una tabla tiene una sola llave primaria.",
        );
      }
      const cols = alt.columnas.map((nombre) => {
        const col = buscarColumna(tabla, nombre);
        if (!col) {
          throw new ErrorSQL(
            "La llave primaria menciona «" + nombre + "», que no existe en «" + tabla.nombre + "».",
            alt.linea,
            "Columnas de «" + tabla.nombre + "»: " + tabla.columnas.map((c) => c.nombre).join(", ") + ".",
          );
        }
        return col;
      });

      const vistas = new Set<string>();
      for (const fila of tabla.filas) {
        const partes = cols.map((c) => fila[c.nombre] ?? null);
        if (partes.some((v) => v === null)) {
          throw new ErrorSQL(
            "No puedo poner esa llave primaria: hay filas con " + alt.columnas.join(", ") + " en NULL.",
            alt.linea,
            "La llave primaria no admite NULL. Corrige esas filas con UPDATE y reintenta.",
          );
        }
        const clave = partes.map((v) => mostrar(v)).join("");
        if (vistas.has(clave)) {
          throw new ErrorSQL(
            "No puedo poner esa llave primaria: el valor (" + partes.map((v) => mostrar(v)).join(", ") +
              ") está repetido.",
            alt.linea,
            "La llave primaria no admite repetidos.",
          );
        }
        vistas.add(clave);
      }

      for (const col of cols) col.noNula = true;
      tabla.pk = cols.map((c) => c.nombre);
      hechos.push("llave primaria (" + tabla.pk.join(", ") + ")");
      ctx.anotar("tabla_con_pk");
      continue;
    }

    if (alt.a === "addUnica") {
      for (const nombre of alt.columnas) {
        const col = buscarColumna(tabla, nombre);
        if (!col) {
          throw new ErrorSQL(
            "UNIQUE menciona «" + nombre + "», que no existe en «" + tabla.nombre + "».",
            alt.linea,
          );
        }
        const vistas = new Set<string>();
        for (const fila of tabla.filas) {
          const v = fila[col.nombre] ?? null;
          if (v === null) continue;
          const k = mostrar(v);
          if (vistas.has(k)) {
            throw new ErrorSQL(
              "No puedo hacer UNIQUE «" + col.nombre + "»: el valor " + mostrar(v) + " está repetido.",
              alt.linea,
              "Quita los repetidos con UPDATE o DELETE y vuelve a intentarlo.",
            );
          }
          vistas.add(k);
        }
        col.unica = true;
        hechos.push("UNIQUE en «" + col.nombre + "»");
      }
      continue;
    }

    // alt.a === "addFK"
    const col = buscarColumna(tabla, alt.columna);
    if (!col) {
      throw new ErrorSQL(
        "La llave foránea usa la columna «" + alt.columna + "», que no existe en «" + tabla.nombre + "».",
        alt.linea,
        "Añádela primero:  ALTER TABLE " + tabla.nombre + " ADD " + alt.columna + " INT;",
      );
    }
    if (col.fk) {
      throw new ErrorSQL(
        "La columna «" + col.nombre + "» ya es llave foránea (apunta a «" + col.fk.tabla + "»).",
        alt.linea,
      );
    }
    const esMismaTabla = igual(alt.tablaRef, tabla.nombre);
    const padre = esMismaTabla ? tabla : buscarTabla(base, alt.tablaRef);
    if (!padre) {
      throw new ErrorSQL(
        "No existe la tabla «" + alt.tablaRef + "», así que la llave foránea no puede apuntar ahí.",
        alt.linea,
        "Tablas de «" + base.nombre + "»: " + base.tablas.map((t) => t.nombre).join(", ") + ".",
      );
    }
    const colPadre = buscarColumna(padre, alt.columnaRef);
    if (!colPadre) {
      throw new ErrorSQL(
        "«" + alt.tablaRef + "» no tiene ninguna columna llamada «" + alt.columnaRef + "».",
        alt.linea,
        "Sus columnas son: " + padre.columnas.map((c) => c.nombre).join(", ") + ".",
      );
    }
    if (!padre.pk.some((p) => igual(p, colPadre.nombre)) && !colPadre.unica) {
      throw new ErrorSQL(
        "Una llave foránea tiene que apuntar a la llave primaria (o a una columna UNIQUE) de la otra tabla, y «" +
          colPadre.nombre + "» no lo es.",
        alt.linea,
        padre.pk.length > 0
          ? "La llave primaria de «" + alt.tablaRef + "» es: " + padre.pk.join(", ") + "."
          : "«" + alt.tablaRef + "» no tiene llave primaria. Dásela con:  ALTER TABLE " + alt.tablaRef +
            " ADD PRIMARY KEY (" + colPadre.nombre + ");",
      );
    }
    if (col.familia !== colPadre.familia) {
      throw new ErrorSQL(
        "«" + col.nombre + "» es " + col.tipo + " y apunta a «" + colPadre.nombre + "», que es " +
          colPadre.tipo + ".",
        alt.linea,
        "Las dos columnas de una llave foránea llevan el mismo tipo de dato.",
      );
    }
    // Las filas que ya existen tienen que cumplir la nueva llave foránea.
    for (const fila of tabla.filas) {
      const v = fila[col.nombre] ?? null;
      if (v === null) continue;
      const existe = padre.filas.some((f) => comparar(f[colPadre.nombre] ?? null, v) === 0);
      if (!existe) {
        throw new ErrorSQL(
          "No puedo crear la llave foránea: la fila con " + col.nombre + " = " + mostrar(v) +
            " no tiene pareja en «" + padre.nombre + "».",
          alt.linea,
          "Crea esa fila en «" + padre.nombre + "» (o corrige la de «" + tabla.nombre + "») y reintenta.",
        );
      }
    }

    col.fk = {
      tabla: padre.nombre,
      columna: colPadre.nombre,
      nombre: alt.nombre || "fk_" + tabla.nombre + "_" + padre.nombre,
    };
    hechos.push("llave foránea " + col.nombre + " → " + padre.nombre + "(" + colPadre.nombre + ")");
    ctx.anotar("fk_creada");
  }

  return {
    clase: "mensaje",
    texto:
      hechos.length === 0
        ? "«" + tabla.nombre + "» no cambió."
        : "«" + tabla.nombre + "» modificada: " + hechos.join("; ") + ".",
  };
}

function insertar(s: Sentencia & { c: "insertar" }, ctx: Contexto): Resultado {
  const base = baseActiva(ctx.estado.servidor, ctx.linea);
  const tabla = exigirTabla(base, s.tabla, ctx.linea);

  const destino: ColumnaBD[] = s.columnas
    ? s.columnas.map((n) => exigirColumna(tabla, n, ctx.linea))
    : tabla.columnas;

  if (s.columnas) {
    const vistas = new Set<string>();
    for (const c of destino) {
      const clave = c.nombre.toLocaleLowerCase("es");
      if (vistas.has(clave)) {
        throw new ErrorSQL(
          "La columna «" + c.nombre + "» aparece dos veces en la lista del INSERT.",
          ctx.linea,
        );
      }
      vistas.add(clave);
    }
  }

  const nuevas: FilaBD[] = [];

  for (const exprs of s.filas) {
    if (exprs.length !== destino.length) {
      throw new ErrorSQL(
        "Pusiste " +
          exprs.length +
          " valor(es) para " +
          destino.length +
          " columna(s).",
        ctx.linea,
        s.columnas
          ? "Las columnas que nombraste son: " + destino.map((c) => c.nombre).join(", ") + "."
          : "Si no nombras las columnas hay que dar todos los valores, en el orden de la tabla: " +
            tabla.columnas.map((c) => c.nombre).join(", ") +
            ".",
      );
    }

    const fila: FilaBD = {};

    // Valores por defecto y nulos para las columnas que no se nombraron.
    for (const col of tabla.columnas) {
      fila[col.nombre] = col.porDefecto === undefined ? null : col.porDefecto;
    }

    destino.forEach((col, i) => {
      const bruto = evaluarLiteral(exprs[i], ctx.linea);
      fila[col.nombre] = ajustarValor(col, bruto, tabla.nombre, ctx.linea);
    });

    // AUTO_INCREMENT: se rellena solo si el estudiante no dio valor.
    for (const col of tabla.columnas) {
      if (!col.autoIncrement) continue;
      const dado = destino.some((d) => igual(d.nombre, col.nombre)) && fila[col.nombre] !== null;
      if (dado) {
        const n = comoNumero(fila[col.nombre]);
        if (n !== null && n >= tabla.siguienteAuto) tabla.siguienteAuto = n + 1;
      } else {
        fila[col.nombre] = tabla.siguienteAuto;
        tabla.siguienteAuto += 1;
      }
    }

    // NOT NULL
    for (const col of tabla.columnas) {
      if (col.noNula && fila[col.nombre] === null) {
        const esPK = tabla.pk.some((p) => igual(p, col.nombre));
        throw new ErrorSQL(
          "La columna «" + col.nombre + "» no admite valores vacíos y la dejaste sin dato.",
          ctx.linea,
          esPK
            ? "Es la llave primaria: toda fila necesita su identificador."
            : "La declaraste NOT NULL al crear la tabla.",
        );
      }
    }

    // Llave primaria: unica dentro de la tabla y de lo que se esta insertando.
    if (tabla.pk.length > 0) {
      const clave = tabla.pk.map((p) => String(fila[p] ?? "")).join("");
      const repetida =
        tabla.filas.some((f) => tabla.pk.map((p) => String(f[p] ?? "")).join("") === clave) ||
        nuevas.some((f) => tabla.pk.map((p) => String(f[p] ?? "")).join("") === clave);
      if (repetida) {
        ctx.anotar("error_pk_repetida");
        throw new ErrorSQL(
          "Ya hay una fila en «" +
            tabla.nombre +
            "» con " +
            tabla.pk.map((p) => p + " = " + mostrar(fila[p])).join(" y ") +
            ".",
          ctx.linea,
          "La llave primaria no se puede repetir: es lo que hace única a cada fila.",
        );
      }
    }

    // UNIQUE
    for (const col of tabla.columnas) {
      if (!col.unica || fila[col.nombre] === null) continue;
      const choca =
        tabla.filas.some((f) => comparar(f[col.nombre] ?? null, fila[col.nombre]) === 0) ||
        nuevas.some((f) => comparar(f[col.nombre] ?? null, fila[col.nombre]) === 0);
      if (choca) {
        throw new ErrorSQL(
          "El valor " + mostrar(fila[col.nombre]) + " ya está en «" + col.nombre + "», que es UNIQUE.",
          ctx.linea,
        );
      }
    }

    // Llaves foraneas
    for (const col of tabla.columnas) {
      if (!col.fk) continue;
      try {
        verificarFK(base, col, fila[col.nombre], tabla.nombre, ctx.linea);
      } catch (e) {
        ctx.anotar("error_fk_insert");
        throw e;
      }
    }

    nuevas.push(fila);
  }

  tabla.filas.push(...nuevas);
  ctx.anotar("insert_hecho");
  if (tabla.filas.length >= 3) ctx.anotar("insert_varias");
  if (tabla.columnas.some((c) => c.fk)) ctx.anotar("insert_con_fk");

  return {
    clase: "mensaje",
    texto:
      nuevas.length === 1
        ? "1 fila insertada en «" + tabla.nombre + "» (ahora tiene " + tabla.filas.length + ")."
        : nuevas.length +
          " filas insertadas en «" +
          tabla.nombre +
          "» (ahora tiene " +
          tabla.filas.length +
          ").",
  };
}

/**
 * Un grupo del GROUP BY: las filas que comparten los mismos valores en las
 * columnas por las que se agrupo, mas una de ellas como representante, que es
 * de donde se leen esas columnas.
 */
type Grupo = { representante: FilaBD; filas: FilaBD[] };

/** Reparte las filas en grupos segun los valores de las columnas indicadas. */
function agrupar(filas: FilaBD[], columnas: string[]): Grupo[] {
  if (columnas.length === 0) return [{ representante: filas[0] ?? {}, filas }];

  const porClave = new Map<string, Grupo>();
  for (const fila of filas) {
    const clave = JSON.stringify(columnas.map((c) => fila[c] ?? null));
    const grupo = porClave.get(clave);
    if (grupo) grupo.filas.push(fila);
    else porClave.set(clave, { representante: fila, filas: [fila] });
  }
  return [...porClave.values()];
}

/**
 * Sustituye cada COUNT/SUM/AVG/MIN/MAX de la expresion por su valor ya
 * calculado sobre las filas del grupo. Lo que queda es una expresion normal,
 * que se evalua contra la fila representante.
 */
function resolverAgregados(expr: Expr, ambito: Ambito, filas: FilaBD[], linea: number): Expr {
  const recorrer = (e: Expr): Expr => {
    switch (e.e) {
      case "agregado": {
        const arg = e.arg === "*" ? "*" : ambito.resolver(e.arg, linea);
        return {
          e: "lit",
          valor: calcularAgregado(e.fn, arg, e.distinto, ambito.tabla, filas, linea),
        };
      }
      case "lit":
      case "col":
        return e;
      case "neg":
        return { e: "neg", sub: recorrer(e.sub) };
      case "no":
        return { e: "no", sub: recorrer(e.sub) };
      case "esNulo":
        return { ...e, sub: recorrer(e.sub) };
      case "entre":
        return { ...e, sub: recorrer(e.sub), desde: recorrer(e.desde), hasta: recorrer(e.hasta) };
      case "en":
        return { ...e, sub: recorrer(e.sub), lista: e.lista.map(recorrer) };
      case "como":
        return { ...e, sub: recorrer(e.sub), patron: recorrer(e.patron) };
      case "bin":
        return { e: "bin", op: e.op, izq: recorrer(e.izq), der: recorrer(e.der) };
    }
  };
  return recorrer(expr);
}

/** Recorre una expresion anotando las columnas que menciona y si trae totales. */
function inspeccionar(expr: Expr): { columnas: string[]; hayAgregado: boolean } {
  const columnas: string[] = [];
  let hayAgregado = false;

  const recorrer = (e: Expr): void => {
    switch (e.e) {
      case "lit":
        return;
      case "col":
        columnas.push(e.nombre);
        return;
      case "agregado":
        hayAgregado = true;
        return;
      case "neg":
      case "no":
      case "esNulo":
        recorrer(e.sub);
        return;
      case "entre":
        recorrer(e.sub);
        recorrer(e.desde);
        recorrer(e.hasta);
        return;
      case "en":
        recorrer(e.sub);
        e.lista.forEach(recorrer);
        return;
      case "como":
        recorrer(e.sub);
        recorrer(e.patron);
        return;
      case "bin":
        recorrer(e.izq);
        recorrer(e.der);
    }
  };

  recorrer(expr);
  return { columnas, hayAgregado };
}

function seleccionar(s: Sentencia & { c: "seleccionar" }, ctx: Contexto): Resultado {
  const base = baseActiva(ctx.estado.servidor, ctx.linea);
  const ambito = armarOrigen(base, s, ctx.linea);
  const tabla = ambito.tabla;

  /* 1. WHERE: filtra fila por fila, antes de agrupar. Si trae un COUNT, el
     error sale de `evaluar`, que es donde vive el mensaje. */
  if (s.donde) exigirQueNoUseAlias(s.donde, s.items, ctx.linea);
  const donde = s.donde ? traducirExpr(s.donde, ambito, ctx.linea) : null;
  const filtradas = donde
    ? ambito.filas.filter((f) => esVerdad(evaluar(donde, f, tabla, ctx.linea) ?? 0))
    : [...ambito.filas];

  const agregados = s.items.filter((i) => i.s === "agregado");
  const agrupa = s.grupos.length > 0 || agregados.length > 0;
  const porColumnas = s.grupos.map((g) => ambito.resolver(g, ctx.linea));

  if (!agrupa && s.teniendo) {
    throw new ErrorSQL(
      "El HAVING filtra grupos, y esta consulta no agrupa nada.",
      ctx.linea,
      "Para filtrar filas se usa WHERE; el HAVING solo tiene sentido con GROUP BY.",
    );
  }

  /* 2. Las columnas de la salida. Con GROUP BY, cada columna suelta tiene que
     estar en el GROUP BY: dentro del grupo hay varios valores y ninguno manda. */
  const salida: Salida[] = [];
  type Extractor = { clase: "col"; columna: string } | { clase: "total"; item: ItemSelect };
  const extractores: Extractor[] = [];

  for (const item of s.items) {
    if (item.s === "todo") {
      if (agrupa) {
        throw new ErrorSQL(
          "Con GROUP BY hay que nombrar las columnas: el asterisco no sirve.",
          ctx.linea,
          "Nombra la columna por la que agrupas y el total: " +
            "SELECT ciudad, COUNT(*) FROM cliente GROUP BY ciudad;",
        );
      }
      for (const c of ambito.expandir(item.tabla, ctx.linea)) {
        salida.push(c);
        extractores.push({ clase: "col", columna: c.columna });
      }
      continue;
    }

    if (item.s === "col") {
      const columna = ambito.resolver(item.nombre, ctx.linea);

      if (agrupa && !porColumnas.some((g) => igual(g, columna))) {
        const corta = partirNombre(columna).columna;
        throw new ErrorSQL(
          porColumnas.length === 0
            ? "«" + corta + "» no puede salir al lado de un total si no agrupas."
            : "«" + corta + "» no está en el GROUP BY.",
          ctx.linea,
          porColumnas.length === 0
            ? "Un total resume muchas filas en una: di por cuál columna se agrupa. " +
              "GROUP BY " + corta + ";"
            : "Dentro de un grupo esa columna tiene varios valores y no se sabe cuál mostrar. " +
              "Agrégala al GROUP BY o sácala del SELECT.",
        );
      }

      // El titulo lleva el prefijo de la tabla solo si el estudiante lo escribio.
      const escribioPrefijo = partirNombre(item.nombre).calificador !== null;
      const titulo = escribioPrefijo ? columna : partirNombre(columna).columna;
      salida.push({ titulo: item.alias ?? titulo, columna });
      extractores.push({ clase: "col", columna });
      continue;
    }

    salida.push({
      titulo: item.alias ?? item.fn + "(" + (item.distinto ? "DISTINCT " : "") + item.arg + ")",
      columna: "",
    });
    extractores.push({ clase: "total", item });
  }

  /* 3. HAVING: filtra grupos ya armados, asi que puede mirar totales, pero de
     columnas solo las agrupadas. */
  const teniendo = s.teniendo ? traducirExpr(s.teniendo, ambito, ctx.linea) : null;
  if (teniendo) {
    for (const columna of inspeccionar(teniendo).columnas) {
      if (!porColumnas.some((g) => igual(g, columna))) {
        throw new ErrorSQL(
          "El HAVING mira «" + partirNombre(columna).columna + "», que no está en el GROUP BY.",
          ctx.linea,
          "El HAVING filtra por la columna agrupada o por un total (COUNT, SUM, AVG...). " +
            "Para filtrar por las demás columnas está el WHERE.",
        );
      }
    }
  }

  type Registro = { valores: ValorSQL[]; grupo: Grupo };
  const grupos = agrupa
    ? agrupar(filtradas, porColumnas)
    : filtradas.map((f) => ({ representante: f, filas: [f] }));

  const registros: Registro[] = [];
  for (const grupo of grupos) {
    if (teniendo) {
      const condicion = resolverAgregados(teniendo, ambito, grupo.filas, ctx.linea);
      if (!esVerdad(evaluar(condicion, grupo.representante, tabla, ctx.linea) ?? 0)) continue;
    }

    registros.push({
      grupo,
      valores: extractores.map((x) =>
        x.clase === "col"
          ? grupo.representante[x.columna] ?? null
          : totalDelItem(x.item, ambito, grupo.filas, ctx.linea),
      ),
    });
  }

  /* 4. ORDER BY: el nombre de una salida (incluido el alias de un total), una
     columna del origen o un total escrito ahí mismo. */
  if (s.orden.length > 0) {
    const criterios = s.orden.map((o) => {
      const escrita = o.expr;
      const indice =
        escrita.e === "col" ? salida.findIndex((c) => igual(c.titulo, escrita.nombre)) : -1;
      if (indice >= 0) return { indice, expr: null, desc: o.descendente };

      const expr = traducirExpr(escrita, ambito, ctx.linea);
      const { columnas, hayAgregado } = inspeccionar(expr);

      if (hayAgregado && !agrupa) {
        throw new ErrorSQL(
          "Para ordenar por un total, la consulta tiene que agrupar.",
          ctx.linea,
          "Agrega el total al SELECT y agrupa: " +
            "SELECT ciudad, COUNT(*) FROM cliente GROUP BY ciudad ORDER BY COUNT(*) DESC;",
        );
      }
      if (agrupa) {
        for (const columna of columnas) {
          if (!porColumnas.some((g) => igual(g, columna))) {
            throw new ErrorSQL(
              "El ORDER BY mira «" +
                partirNombre(columna).columna +
                "», que no está en el GROUP BY.",
              ctx.linea,
              "Ordena por la columna agrupada, por un total, o por el nombre que le pusiste " +
                "con AS en el SELECT.",
            );
          }
        }
      }
      return { indice: -1, expr, desc: o.descendente };
    });

    const valorDe = (r: Registro, c: (typeof criterios)[number]): ValorSQL => {
      if (c.indice >= 0) return r.valores[c.indice] ?? null;
      const expr = resolverAgregados(c.expr as Expr, ambito, r.grupo.filas, ctx.linea);
      return evaluar(expr, r.grupo.representante, tabla, ctx.linea);
    };

    registros.sort((a, b) => {
      for (const c of criterios) {
        const va = valorDe(a, c);
        const vb = valorDe(b, c);
        if (va === null && vb === null) continue;
        if (va === null) return c.desc ? 1 : -1;
        if (vb === null) return c.desc ? -1 : 1;
        const cmp = comparar(va, vb) ?? 0;
        if (cmp !== 0) return c.desc ? -cmp : cmp;
      }
      return 0;
    });
    ctx.anotar("select_orden");
  }

  let matriz = registros.map((r) => r.valores);

  if (s.distinto) {
    const vistas = new Set<string>();
    matriz = matriz.filter((fila) => {
      const clave = JSON.stringify(fila);
      if (vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    });
  }

  const total = matriz.length;
  if (s.limite !== null) matriz = matriz.slice(0, s.limite);

  ctx.anotar("select_hecho");
  if (agregados.length > 0) ctx.anotar("select_agregado");
  if (s.grupos.length > 0) ctx.anotar("select_grupo");
  if (s.teniendo) ctx.anotar("select_teniendo");
  if (s.uniones.length > 0) ctx.anotar("select_join");
  if (s.donde) ctx.anotar("select_where");
  if (s.items.some((i) => i.s === "todo")) ctx.anotar("select_todo");
  if (s.items.some((i) => i.s === "col")) ctx.anotar("select_columnas");

  const resumen =
    total === 0
      ? donde || teniendo
        ? "Ninguna fila cumple la condición"
        : "Ninguna fila"
      : total === 1
        ? s.grupos.length > 0
          ? "1 grupo"
          : "1 fila"
        : total +
          (s.grupos.length > 0 ? " grupos" : " filas") +
          (s.limite !== null && total > matriz.length ? " (se muestran " + matriz.length + ")" : "");

  return { clase: "rejilla", columnas: salida.map((c) => c.titulo), filas: matriz, resumen };
}

/**
 * El WHERE se ejecuta antes que el SELECT, asi que todavia no existen los
 * nombres puestos con AS. Es un tropiezo tan comun que merece su propio aviso.
 */
function exigirQueNoUseAlias(donde: Expr, items: ItemSelect[], linea: number): void {
  const alias = items
    .map((i) => (i.s === "todo" ? null : i.alias))
    .filter((a): a is string => a !== null);
  if (alias.length === 0) return;

  for (const columna of inspeccionar(donde).columnas) {
    if (alias.some((a) => igual(a, columna))) {
      throw new ErrorSQL(
        "«" + columna + "» es el nombre que le pusiste a una columna con AS, y el WHERE " +
          "todavía no lo conoce.",
        linea,
        "El WHERE se ejecuta antes que el SELECT. Repite la expresión completa, o si es un " +
          "total, agrupa y fíltralo con HAVING.",
      );
    }
  }
}

/** El total de un COUNT/SUM/AVG/MIN/MAX de la lista del SELECT. */
function totalDelItem(
  item: ItemSelect,
  ambito: Ambito,
  filas: FilaBD[],
  linea: number,
): ValorSQL {
  if (item.s !== "agregado") return null;
  const arg = item.arg === "*" ? "*" : ambito.resolver(item.arg, linea);
  return calcularAgregado(item.fn, arg, item.distinto, ambito.tabla, filas, linea);
}

/**
 * El valor de un COUNT/SUM/AVG/MIN/MAX sobre un conjunto de filas: la tabla
 * entera, lo que dejo pasar el WHERE, o las filas de un grupo del GROUP BY.
 */
function calcularAgregado(
  fn: string,
  arg: string,
  distinto: boolean,
  tabla: TablaBD,
  filas: FilaBD[],
  linea: number,
): ValorSQL {
  if (fn === "COUNT" && arg === "*") return filas.length;

  if (arg === "*") {
    throw new ErrorSQL(
      fn + "(*) no tiene sentido: hay que decirle sobre qué columna.",
      linea,
      "Por ejemplo: SELECT " + fn + "(precio) FROM producto;",
    );
  }

  const col = exigirColumna(tabla, arg, linea);
  let valores = filas.map((f) => f[col.nombre] ?? null).filter((v) => v !== null);

  // COUNT(DISTINCT ciudad): cada valor cuenta una sola vez.
  if (distinto) {
    const vistos = new Set<string>();
    valores = valores.filter((v) => {
      const clave = typeof v + ":" + String(v);
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
  }

  if (fn === "COUNT") return valores.length;
  if (valores.length === 0) return null;

  if (fn === "MIN" || fn === "MAX") {
    return valores.reduce((mejor, v) => {
      const cmp = comparar(v, mejor) ?? 0;
      return (fn === "MIN" ? cmp < 0 : cmp > 0) ? v : mejor;
    });
  }

  const numeros = valores.map((v) => comoNumero(v));
  if (numeros.some((n) => n === null)) {
    throw new ErrorSQL(
      fn + "() solo funciona con números, y «" + col.nombre + "» es " + col.tipo + ".",
      linea,
    );
  }
  const suma = (numeros as number[]).reduce((a, b) => a + b, 0);
  if (fn === "SUM") return suma;
  return Math.round((suma / numeros.length) * 10000) / 10000;
}

function actualizar(s: Sentencia & { c: "actualizar" }, ctx: Contexto): Resultado {
  const base = baseActiva(ctx.estado.servidor, ctx.linea);
  const tabla = exigirTabla(base, s.tabla, ctx.linea);

  const ambito = ambitoSimple(tabla, null);
  const asignaciones = s.asignaciones.map((a) => ({
    col: exigirColumna(tabla, ambito.resolver(a.columna, ctx.linea), ctx.linea),
    valor: traducirExpr(a.valor, ambito, ctx.linea),
  }));

  const afectadas = filtrar(tabla, s.donde, ctx.linea);

  for (const fila of afectadas) {
    const copia: FilaBD = { ...fila };
    for (const a of asignaciones) {
      const bruto = evaluar(a.valor, fila, tabla, ctx.linea);
      copia[a.col.nombre] = ajustarValor(a.col, bruto, tabla.nombre, ctx.linea);
    }

    for (const a of asignaciones) {
      if (a.col.noNula && copia[a.col.nombre] === null) {
        throw new ErrorSQL(
          "La columna «" + a.col.nombre + "» no admite valores vacíos.",
          ctx.linea,
        );
      }
      if (a.col.fk) verificarFK(base, a.col, copia[a.col.nombre], tabla.nombre, ctx.linea);
    }

    // Si cambia la llave primaria, no puede chocar ni dejar hijas huerfanas.
    if (tabla.pk.some((p) => asignaciones.some((a) => igual(a.col.nombre, p)))) {
      const clave = tabla.pk.map((p) => String(copia[p] ?? "")).join("");
      const choca = tabla.filas.some(
        (f) => f !== fila && tabla.pk.map((p) => String(f[p] ?? "")).join("") === clave,
      );
      if (choca) {
        throw new ErrorSQL(
          "Ese cambio dejaría dos filas con la misma llave primaria en «" + tabla.nombre + "».",
          ctx.linea,
        );
      }
      for (const hija of hijasDe(base, tabla.nombre)) {
        const colPadre = hija.columna.fk as { columna: string };
        const referida = hija.tabla.filas.some(
          (f) => comparar(f[hija.columna.nombre] ?? null, fila[colPadre.columna] ?? null) === 0,
        );
        if (referida) {
          throw new ErrorSQL(
            "No puedes cambiar ese identificador: «" +
              hija.tabla.nombre +
              "» tiene filas que apuntan a él.",
            ctx.linea,
            "Primero cambia o borra las filas de «" + hija.tabla.nombre + "».",
          );
        }
      }
    }

    Object.assign(fila, copia);
  }

  if (afectadas.length > 0) ctx.anotar("update_hecho");

  return {
    clase: "mensaje",
    texto:
      afectadas.length === 0
        ? "Ninguna fila cumplía la condición: no se cambió nada."
        : afectadas.length + " fila(s) actualizada(s) en «" + tabla.nombre + "».",
  };
}

function eliminar(s: Sentencia & { c: "eliminar" }, ctx: Contexto): Resultado {
  const base = baseActiva(ctx.estado.servidor, ctx.linea);
  const tabla = exigirTabla(base, s.tabla, ctx.linea);

  const condenadas = filtrar(tabla, s.donde, ctx.linea);

  for (const fila of condenadas) {
    for (const hija of hijasDe(base, tabla.nombre)) {
      const refCol = hija.columna.fk as { columna: string };
      const valorPadre = fila[refCol.columna] ?? null;
      if (valorPadre === null) continue;
      const cuantas = hija.tabla.filas.filter(
        (f) =>
          !(igual(hija.tabla.nombre, tabla.nombre) && f === fila) &&
          comparar(f[hija.columna.nombre] ?? null, valorPadre) === 0,
      ).length;
      if (cuantas > 0) {
        ctx.anotar("error_fk_delete");
        throw new ErrorSQL(
          "No puedes borrar esa fila de «" +
            tabla.nombre +
            "»: «" +
            hija.tabla.nombre +
            "» tiene " +
            cuantas +
            " fila(s) que la referencian.",
          ctx.linea,
          "Eso es la llave foránea protegiendo los datos. Borra primero en «" +
            hija.tabla.nombre +
            "»:  DELETE FROM " +
            hija.tabla.nombre +
            " WHERE " +
            hija.columna.nombre +
            " = " +
            mostrar(valorPadre) +
            ";",
        );
      }
    }
  }

  const antes = tabla.filas.length;
  tabla.filas = tabla.filas.filter((f) => !condenadas.includes(f));
  const borradas = antes - tabla.filas.length;

  if (borradas > 0) {
    ctx.anotar("delete_hecho");
    if (s.donde) ctx.anotar("delete_where");
  }

  return {
    clase: "mensaje",
    texto:
      borradas === 0
        ? "Ninguna fila cumplía la condición: no se borró nada."
        : borradas +
          " fila(s) eliminada(s) de «" +
          tabla.nombre +
          "» (quedan " +
          tabla.filas.length +
          ").",
  };
}

function describir(s: Sentencia & { c: "describir" }, ctx: Contexto): Resultado {
  const base = baseActiva(ctx.estado.servidor, ctx.linea);
  const tabla = exigirTabla(base, s.tabla, ctx.linea);

  const filas = tabla.columnas.map((c) => [
    c.nombre,
    c.tipo,
    c.noNula ? "NO" : "SÍ",
    tabla.pk.some((p) => igual(p, c.nombre))
      ? "PRI"
      : c.fk
        ? "MUL → " + c.fk.tabla + "." + c.fk.columna
        : c.unica
          ? "UNI"
          : "",
    c.porDefecto === undefined ? "" : mostrar(c.porDefecto),
    c.autoIncrement ? "auto_increment" : "",
  ]);

  return {
    clase: "rejilla",
    columnas: ["Columna", "Tipo", "Admite nulos", "Llave", "Por defecto", "Extra"],
    filas,
    resumen: tabla.columnas.length + " columna(s), " + tabla.filas.length + " fila(s)",
  };
}

/* --------------------------------------------------------------------------
 * Punto de entrada
 * ----------------------------------------------------------------------- */

function ejecutarUna(ubicada: SentenciaUbicada, estado: Estado): Resultado {
  const logros = new Set(estado.logros);
  const ctx: Contexto = {
    estado,
    linea: ubicada.linea,
    anotar: (logro) => logros.add(logro),
  };

  let resultado: Resultado;
  try {
    const s = ubicada.sentencia;
    switch (s.c) {
      case "crearBase":
        resultado = crearBase(s, ctx);
        break;
      case "borrarBase":
        resultado = borrarBase(s, ctx);
        break;
      case "usar":
        resultado = usar(s, ctx);
        break;
      case "mostrarBases":
        resultado = {
          clase: "rejilla",
          columnas: ["Bases de datos"],
          filas: estado.servidor.bases.map((b) => [b.nombre]),
          resumen: estado.servidor.bases.length + " base(s)",
        };
        break;
      case "mostrarTablas": {
        const base = baseActiva(estado.servidor, ubicada.linea);
        resultado = {
          clase: "rejilla",
          columnas: ["Tablas de " + base.nombre],
          filas: base.tablas.map((t) => [t.nombre]),
          resumen: base.tablas.length + " tabla(s)",
        };
        break;
      }
      case "describir":
        resultado = describir(s, ctx);
        break;
      case "crearTabla":
        resultado = crearTabla(s, ctx);
        break;
      case "borrarTabla":
        resultado = borrarTabla(s, ctx);
        break;
      case "alterar":
        resultado = alterar(s, ctx);
        break;
      case "insertar":
        resultado = insertar(s, ctx);
        break;
      case "seleccionar":
        resultado = seleccionar(s, ctx);
        break;
      case "actualizar":
        resultado = actualizar(s, ctx);
        break;
      default:
        resultado = eliminar(s, ctx);
    }
  } finally {
    // Los logros se guardan aunque la sentencia falle: chocar contra una llave
    // foranea tambien es aprendizaje y algun reto lo pide.
    estado.logros = [...logros];
  }

  return resultado;
}

export type Corrida = {
  estado: Estado;
  ejecuciones: Ejecucion[];
};

/**
 * Analiza y ejecuta un script completo.
 *
 * El estado de entrada no se toca: se trabaja sobre una copia. Si una sentencia
 * falla, las anteriores quedan aplicadas (igual que en una consola de MySQL) y
 * las siguientes no se ejecutan.
 */
export function ejecutarScript(entrada: Estado, texto: string): Corrida {
  const estado: Estado = JSON.parse(JSON.stringify(entrada)) as Estado;
  const ejecuciones: Ejecucion[] = [];

  let sentencias: SentenciaUbicada[];
  try {
    sentencias = parsearScript(texto);
  } catch (e) {
    const err = e as ErrorSQL;
    return {
      estado: entrada,
      ejecuciones: [
        {
          sql: texto.trim().split("\n")[0] ?? "",
          linea: err.linea ?? 0,
          ok: false,
          error: {
            mensaje: err.message,
            pista: err.pista ?? "",
            linea: err.linea ?? 0,
          },
        },
      ],
    };
  }

  if (sentencias.length === 0) {
    return {
      estado: entrada,
      ejecuciones: [
        {
          sql: "",
          linea: 0,
          ok: false,
          error: {
            mensaje: "No hay ninguna instrucción para ejecutar.",
            pista: "Escribe una instrucción de SQL y termínala con punto y coma (;).",
            linea: 0,
          },
        },
      ],
    };
  }

  for (const ubicada of sentencias) {
    try {
      const resultado = ejecutarUna(ubicada, estado);
      ejecuciones.push({ sql: ubicada.sql, linea: ubicada.linea, ok: true, resultado });
    } catch (e) {
      const err = e as ErrorSQL;
      ejecuciones.push({
        sql: ubicada.sql,
        linea: ubicada.linea,
        ok: false,
        error: {
          mensaje: err.message ?? String(e),
          pista: err.pista ?? "",
          linea: err.linea || ubicada.linea,
        },
      });
      break;
    }
  }

  return { estado, ejecuciones };
}
