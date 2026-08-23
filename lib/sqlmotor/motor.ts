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
  return tabla.filas.filter((f) => esVerdad(evaluar(donde, f, tabla, linea) ?? 0));
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

function seleccionar(s: Sentencia & { c: "seleccionar" }, ctx: Contexto): Resultado {
  const base = baseActiva(ctx.estado.servidor, ctx.linea);
  const tabla = exigirTabla(base, s.tabla, ctx.linea);

  let filas = filtrar(tabla, s.donde, ctx.linea);

  const agregados = s.items.filter((i) => i.s === "agregado");
  if (agregados.length > 0 && agregados.length !== s.items.length) {
    throw new ErrorSQL(
      "No puedes mezclar columnas sueltas con COUNT/SUM/AVG en el mismo SELECT.",
      ctx.linea,
      "Haz dos consultas: una con las columnas y otra con el total.",
    );
  }

  if (agregados.length > 0) {
    const columnas: string[] = [];
    const valores: ValorSQL[] = [];
    for (const item of agregados) {
      if (item.s !== "agregado") continue;
      columnas.push(item.alias ?? item.fn + "(" + item.arg + ")");
      valores.push(calcularAgregado(item, tabla, filas, ctx.linea));
    }
    ctx.anotar("select_agregado");
    return { clase: "rejilla", columnas, filas: [valores], resumen: "1 fila" };
  }

  if (s.orden.length > 0) {
    const criterios = s.orden.map((o) => ({
      col: exigirColumna(tabla, o.columna, ctx.linea).nombre,
      desc: o.descendente,
    }));
    filas = [...filas].sort((a, b) => {
      for (const c of criterios) {
        const va = a[c.col] ?? null;
        const vb = b[c.col] ?? null;
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

  const salida: { titulo: string; columna: string }[] = [];
  for (const item of s.items) {
    if (item.s === "todo") {
      for (const col of tabla.columnas) salida.push({ titulo: col.nombre, columna: col.nombre });
    } else if (item.s === "col") {
      const col = exigirColumna(tabla, item.nombre, ctx.linea);
      salida.push({ titulo: item.alias ?? col.nombre, columna: col.nombre });
    }
  }

  let matriz = filas.map((f) => salida.map((c) => f[c.columna] ?? null));

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
  if (s.donde) ctx.anotar("select_where");
  if (s.items.some((i) => i.s === "todo")) ctx.anotar("select_todo");
  if (s.items.some((i) => i.s === "col")) ctx.anotar("select_columnas");

  const resumen =
    total === 0
      ? "Ninguna fila cumple la condición"
      : total === 1
        ? "1 fila"
        : total + " filas" + (s.limite !== null && total > matriz.length ? " (se muestran " + matriz.length + ")" : "");

  return { clase: "rejilla", columnas: salida.map((c) => c.titulo), filas: matriz, resumen };
}

function calcularAgregado(
  item: Extract<ItemSelect, { s: "agregado" }>,
  tabla: TablaBD,
  filas: FilaBD[],
  linea: number,
): ValorSQL {
  if (item.fn === "COUNT" && item.arg === "*") return filas.length;

  if (item.arg === "*") {
    throw new ErrorSQL(
      item.fn + "(*) no tiene sentido: hay que decirle sobre qué columna.",
      linea,
      "Por ejemplo: SELECT " + item.fn + "(precio) FROM producto;",
    );
  }

  const col = exigirColumna(tabla, item.arg, linea);
  const valores = filas.map((f) => f[col.nombre] ?? null).filter((v) => v !== null);

  if (item.fn === "COUNT") return valores.length;
  if (valores.length === 0) return null;

  if (item.fn === "MIN" || item.fn === "MAX") {
    return valores.reduce((mejor, v) => {
      const cmp = comparar(v, mejor) ?? 0;
      return (item.fn === "MIN" ? cmp < 0 : cmp > 0) ? v : mejor;
    });
  }

  const numeros = valores.map((v) => comoNumero(v));
  if (numeros.some((n) => n === null)) {
    throw new ErrorSQL(
      item.fn + "() solo funciona con números, y «" + col.nombre + "» es " + col.tipo + ".",
      linea,
    );
  }
  const suma = (numeros as number[]).reduce((a, b) => a + b, 0);
  if (item.fn === "SUM") return suma;
  return Math.round((suma / numeros.length) * 10000) / 10000;
}

function actualizar(s: Sentencia & { c: "actualizar" }, ctx: Contexto): Resultado {
  const base = baseActiva(ctx.estado.servidor, ctx.linea);
  const tabla = exigirTabla(base, s.tabla, ctx.linea);

  const asignaciones = s.asignaciones.map((a) => ({
    col: exigirColumna(tabla, a.columna, ctx.linea),
    valor: a.valor,
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
