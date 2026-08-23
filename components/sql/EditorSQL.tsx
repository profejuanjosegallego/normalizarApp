"use client";

import { useEffect, useRef } from "react";

/**
 * Editor de SQL con regleta de lineas y coloreado.
 *
 * El coloreado se pinta en un <pre> y encima va un <textarea> con el texto
 * transparente, de modo que lo que el estudiante escribe queda alineado con lo
 * que ve. Las dos capas comparten la clase `.sql-codigo` de globals.css.
 */

const PALABRAS = new Set([
  "CREATE", "DATABASE", "SCHEMA", "TABLE", "DROP", "USE", "SHOW", "DATABASES",
  "TABLES", "DESCRIBE", "DESC", "ASC", "SELECT", "FROM", "WHERE", "INSERT",
  "INTO", "VALUES", "UPDATE", "SET", "DELETE", "ORDER", "BY", "GROUP", "LIMIT",
  "PRIMARY", "FOREIGN", "KEY", "REFERENCES", "CONSTRAINT", "UNIQUE", "NOT",
  "NULL", "AND", "OR", "IS", "LIKE", "BETWEEN", "IN", "AS", "DEFAULT",
  "AUTO_INCREMENT", "DISTINCT", "EXISTS", "IF", "INT", "INTEGER", "SMALLINT",
  "BIGINT", "TINYINT", "DECIMAL", "NUMERIC", "FLOAT", "DOUBLE", "VARCHAR",
  "CHAR", "TEXT", "LONGTEXT", "DATE", "DATETIME", "TIMESTAMP", "TIME",
  "BOOLEAN", "BOOL", "COUNT", "SUM", "AVG", "MIN", "MAX", "TRUE", "FALSE",
  "ON", "CASCADE", "RESTRICT", "UNSIGNED",
]);

type Trozo = { texto: string; clase: string };

/**
 * Corta el texto en trozos coloreados.
 *
 * Es tolerante a medias tintas a proposito: se pinta mientras el estudiante
 * escribe, cuando el SQL todavia no esta bien formado.
 */
function colorear(texto: string): Trozo[] {
  const trozos: Trozo[] = [];
  const patron =
    /(--[^\n]*|#[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:[^'\\]|\\.|'')*'?|"(?:[^"\\]|\\.|"")*"?|`[^`]*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_À-ɏ][A-Za-z0-9_À-ɏ]*)|([(),;.*=<>+\-/%]+)/g;

  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = patron.exec(texto)) !== null) {
    if (m.index > ultimo) trozos.push({ texto: texto.slice(ultimo, m.index), clase: "" });
    if (m[1]) trozos.push({ texto: m[1], clase: "sql-comentario" });
    else if (m[2]) trozos.push({ texto: m[2], clase: "sql-texto" });
    else if (m[3]) trozos.push({ texto: m[3], clase: "sql-numero" });
    else if (m[4]) {
      trozos.push({
        texto: m[4],
        clase: PALABRAS.has(m[4].toUpperCase()) ? "sql-clave" : "",
      });
    } else if (m[5]) trozos.push({ texto: m[5], clase: "sql-signo" });
    ultimo = patron.lastIndex;
  }
  if (ultimo < texto.length) trozos.push({ texto: texto.slice(ultimo), clase: "" });
  return trozos;
}

export default function EditorSQL({
  valor,
  onCambio,
  onEjecutar,
  areaRef,
  lineaError,
  alto = "20rem",
}: {
  valor: string;
  onCambio: (texto: string) => void;
  onEjecutar: () => void;
  /** La pagina necesita el textarea para saber que trozo esta seleccionado. */
  areaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Linea que fallo, para resaltarla en la regleta. */
  lineaError: number | null;
  alto?: string;
}) {
  const area = areaRef;
  const pintado = useRef<HTMLPreElement>(null);
  const regleta = useRef<HTMLDivElement>(null);

  const lineas = valor.split("\n");

  function sincronizar() {
    const a = area.current;
    if (!a) return;
    if (pintado.current) {
      pintado.current.scrollTop = a.scrollTop;
      pintado.current.scrollLeft = a.scrollLeft;
    }
    if (regleta.current) regleta.current.scrollTop = a.scrollTop;
  }

  // Al cargar un script desde fuera (el modelo del taller) hay que reajustar.
  useEffect(sincronizar, [valor]);

  function alTeclear(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onEjecutar();
      return;
    }

    // Tab escribe dos espacios en vez de saltar al siguiente control.
    if (e.key === "Tab") {
      e.preventDefault();
      const a = e.currentTarget;
      const { selectionStart: ini, selectionEnd: fin } = a;
      const nuevo = valor.slice(0, ini) + "  " + valor.slice(fin);
      onCambio(nuevo);
      requestAnimationFrame(() => {
        a.selectionStart = ini + 2;
        a.selectionEnd = ini + 2;
      });
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{ height: alto, background: "var(--superficie-2)", border: "1px solid var(--borde)" }}
    >
      {/* Regleta de numeros */}
      <div
        ref={regleta}
        aria-hidden
        className="sql-regleta absolute inset-y-0 left-0 w-12 overflow-hidden"
        style={{ background: "var(--superficie-3)" }}
      >
        {lineas.map((_, i) => (
          <div
            key={i}
            style={
              lineaError === i + 1
                ? { color: "var(--error)", fontWeight: 700 }
                : undefined
            }
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div className="absolute inset-y-0 right-0 left-12">
        {/* El salto final sobra a proposito: deja sitio al cursor en la ultima linea. */}
        <pre ref={pintado} aria-hidden className="sql-codigo absolute inset-0 overflow-hidden">
          {colorear(valor + "\n").map((t, i) => (
            <span key={i} className={t.clase}>
              {t.texto}
            </span>
          ))}
        </pre>

        <textarea
          ref={area}
          className="sql-codigo sql-cursor absolute inset-0 h-full w-full overflow-auto"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          onScroll={sincronizar}
          onKeyDown={alTeclear}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Editor de SQL"
          placeholder={"-- Escribe aquí tus instrucciones de SQL.\n-- Ctrl + Enter para ejecutar."}
        />
      </div>
    </div>
  );
}
