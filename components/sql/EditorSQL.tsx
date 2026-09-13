"use client";

import { useEffect, useRef, useState } from "react";
import type { Estado } from "@/lib/sqlmotor";

/**
 * Editor de SQL con regleta de lineas, coloreado y autocompletado.
 *
 * El coloreado se pinta en un <pre> y encima va un <textarea> con el texto
 * transparente, de modo que lo que el estudiante escribe queda alineado con lo
 * que ve. Las dos capas comparten la clase `.sql-codigo` de globals.css.
 *
 * El autocompletado sugiere, mientras se teclea, palabras clave de SQL y los
 * nombres reales de las tablas, columnas y bases que el estudiante ya creo (los
 * recibe en `identificadores`). Es una ayuda para no tener que recordar como se
 * escribio cada nombre; el SQL lo sigue escribiendo la persona.
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

/* -------------------------------------------------------------------------- */
/* Autocompletado                                                             */
/* -------------------------------------------------------------------------- */

export type TipoIdent = "tabla" | "columna" | "base";

/** Nombre real que existe en el servidor y que se puede sugerir. */
export type Identificador = { nombre: string; tipo: TipoIdent };

type ClaseSug = TipoIdent | "palabra";
type Sugerencia = { texto: string; clase: ClaseSug };

/** Cuantas sugerencias se muestran a la vez, como mucho. */
const MAX_SUGERENCIAS = 8;
/** Alto aproximado de cada renglon del menu, para decidir si cabe abajo. */
const ALTO_RENGLON = 30;
const ANCHO_MENU = 240;

const ETIQUETA: Record<ClaseSug, string> = {
  palabra: "palabra clave",
  tabla: "tabla",
  columna: "columna",
  base: "base",
};

/**
 * Sugerencias para un prefijo: primero los nombres reales (mas utiles) y
 * despues las palabras clave. Todo por coincidencia de inicio, sin importar
 * mayusculas.
 */
function calcularSugerencias(prefijo: string, identificadores: Identificador[]): Sugerencia[] {
  const p = prefijo.toLowerCase();

  const nombres: Sugerencia[] = identificadores
    .filter((i) => i.nombre.toLowerCase().startsWith(p))
    .map((i) => ({ texto: i.nombre, clase: i.tipo }));

  const claves: Sugerencia[] = [...PALABRAS]
    .filter((k) => k.toLowerCase().startsWith(p))
    .map((k) => ({ texto: k, clase: "palabra" as const }));

  return [...nombres, ...claves].slice(0, MAX_SUGERENCIAS);
}

/**
 * Nombres reales que el editor puede autocompletar: bases, y las tablas y
 * columnas de la base en uso (o de todas si no hay ninguna en uso). Sin
 * repetidos: gana el primero que aparezca (bases, luego tablas, luego columnas).
 */
export function construirIdentificadores(estado: Estado): Identificador[] {
  const vistos = new Map<string, Identificador>();
  const agregar = (nombre: string, tipo: Identificador["tipo"]) => {
    const clave = nombre.toLowerCase();
    if (!vistos.has(clave)) vistos.set(clave, { nombre, tipo });
  };

  for (const base of estado.servidor.bases) agregar(base.nombre, "base");

  const enUso = estado.servidor.bases.find(
    (b) => b.nombre.toLowerCase() === estado.servidor.activa?.toLowerCase(),
  );
  const bases = enUso ? [enUso] : estado.servidor.bases;

  for (const base of bases) for (const tabla of base.tablas) agregar(tabla.nombre, "tabla");
  for (const base of bases)
    for (const tabla of base.tablas)
      for (const col of tabla.columnas) agregar(col.nombre, "columna");

  return [...vistos.values()];
}

export default function EditorSQL({
  valor,
  onCambio,
  onEjecutar,
  areaRef,
  lineaError,
  identificadores = [],
  alto = "20rem",
}: {
  valor: string;
  onCambio: (texto: string) => void;
  onEjecutar: () => void;
  /** La pagina necesita el textarea para saber que trozo esta seleccionado. */
  areaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Linea que fallo, para resaltarla en la regleta. */
  lineaError: number | null;
  /** Nombres reales del servidor para el autocompletado. */
  identificadores?: Identificador[];
  alto?: string;
}) {
  const area = areaRef;
  const pintado = useRef<HTMLPreElement>(null);
  const regleta = useRef<HTMLDivElement>(null);
  const medidor = useRef<CanvasRenderingContext2D | null>(null);

  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [activo, setActivo] = useState(0);
  const [inicioPrefijo, setInicioPrefijo] = useState(0);
  const [caja, setCaja] = useState<{ left: number; top: number } | null>(null);

  const abierto = sugerencias.length > 0;
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

  function cerrarMenu() {
    if (sugerencias.length > 0) setSugerencias([]);
    setCaja(null);
  }

  /** Ancho de un caracter y alto de linea, leidos del textarea ya montado. */
  function medidas() {
    const a = area.current!;
    const cs = getComputedStyle(a);
    if (!medidor.current) {
      medidor.current = document.createElement("canvas").getContext("2d");
    }
    let anchoCar = 8;
    if (medidor.current) {
      medidor.current.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      anchoCar = medidor.current.measureText("0").width;
    }
    return {
      anchoCar,
      altoLinea: parseFloat(cs.lineHeight),
      padIzq: parseFloat(cs.paddingLeft),
      padArr: parseFloat(cs.paddingTop),
    };
  }

  /** Posicion en pixeles del cursor dentro del textarea (ya restado el scroll). */
  function posicionCaret(indice: number) {
    const a = area.current!;
    const antes = valor.slice(0, indice);
    const inicioLinea = antes.lastIndexOf("\n") + 1;
    const columna = indice - inicioLinea;
    const linea = antes.split("\n").length - 1;
    const { anchoCar, altoLinea, padIzq, padArr } = medidas();
    return {
      x: padIzq + columna * anchoCar - a.scrollLeft,
      y: padArr + linea * altoLinea - a.scrollTop,
      altoLinea,
    };
  }

  /**
   * Recalcula que sugerir segun donde este el cursor. Se llama despues de cada
   * cambio o movimiento del cursor. Lee del DOM (`a.value`) para no depender del
   * `valor` que aun no re-renderiza.
   */
  function refrescar() {
    const a = area.current;
    if (!a) return cerrarMenu();
    // Con una seleccion activa no tiene sentido sugerir.
    if (a.selectionStart !== a.selectionEnd) return cerrarMenu();

    const car = a.selectionStart;
    const texto = a.value;
    const antes = texto.slice(0, car);
    const lineaTexto = antes.slice(antes.lastIndexOf("\n") + 1);

    // Dentro de un comentario de linea no se sugiere.
    if (lineaTexto.includes("--") || lineaTexto.includes("#")) return cerrarMenu();
    // Dentro de un texto entre comillas (comillas impares en la linea) tampoco.
    if ((lineaTexto.match(/'/g) || []).length % 2 === 1) return cerrarMenu();
    if ((lineaTexto.match(/"/g) || []).length % 2 === 1) return cerrarMenu();

    const m = antes.match(/[A-Za-z_][A-Za-z0-9_]*$/);
    if (!m) return cerrarMenu();

    const prefijo = m[0];
    const lista = calcularSugerencias(prefijo, identificadores);
    // Si no hay nada, o lo unico que hay es la palabra ya escrita tal cual, se cierra.
    if (lista.length === 0) return cerrarMenu();
    if (lista.length === 1 && lista[0].texto === prefijo) return cerrarMenu();

    const { x, y, altoLinea } = posicionCaret(car);
    const altoMenu = Math.min(lista.length, MAX_SUGERENCIAS) * ALTO_RENGLON + 8;
    const cabeAbajo = y + altoLinea + altoMenu <= a.clientHeight;
    const top = cabeAbajo ? y + altoLinea : Math.max(0, y - altoMenu);
    const left = Math.max(0, Math.min(x, a.clientWidth - ANCHO_MENU - 4));

    setSugerencias(lista);
    setActivo(0);
    setInicioPrefijo(car - prefijo.length);
    setCaja({ left, top });
  }

  /** Mete la sugerencia elegida en lugar del prefijo que se venia escribiendo. */
  function aceptar(s: Sugerencia) {
    const a = area.current;
    if (!a) return;
    const fin = a.selectionStart;
    const nuevo = valor.slice(0, inicioPrefijo) + s.texto + valor.slice(fin);
    const cursor = inicioPrefijo + s.texto.length;
    onCambio(nuevo);
    cerrarMenu();
    requestAnimationFrame(() => {
      a.focus();
      a.selectionStart = cursor;
      a.selectionEnd = cursor;
    });
  }

  function alTeclear(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Con el menu abierto, las flechas y Enter/Tab lo manejan a el.
    if (abierto) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActivo((i) => (i + 1) % sugerencias.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActivo((i) => (i - 1 + sugerencias.length) % sugerencias.length);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        cerrarMenu();
        return;
      }
      // Ctrl+Enter siempre ejecuta, aunque el menu este abierto.
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        cerrarMenu();
        onEjecutar();
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        aceptar(sugerencias[activo]);
        return;
      }
    }

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

  /**
   * Tras soltar la tecla, el DOM ya tiene el texto y el cursor nuevos: es el
   * momento de recalcular. Las teclas que maneja el propio menu se saltan.
   */
  function alSoltar(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (abierto && ["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)) {
      return;
    }
    refrescar();
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{ height: alto, background: "var(--ed-fondo)", border: "1px solid var(--ed-borde)" }}
    >
      {/* Regleta de numeros */}
      <div
        ref={regleta}
        aria-hidden
        className="sql-regleta absolute inset-y-0 left-0 w-12 overflow-hidden"
        style={{ background: "var(--ed-fondo-2)" }}
      >
        {lineas.map((_, i) => (
          <div
            key={i}
            style={
              lineaError === i + 1
                ? { color: "var(--ed-error)", fontWeight: 700 }
                : undefined
            }
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div className="absolute inset-y-0 right-0 left-12">
        {/*
          El textarea va DEBAJO y su texto es transparente; encima se pinta el
          <pre> con los colores. Asi el codigo coloreado queda SIEMPRE por
          encima del resaltado de seleccion y nunca se tapa. El <pre> lleva
          pointer-events:none para que el raton (clic, arrastre de seleccion,
          rueda) siga llegando al textarea que esta detras.
        */}
        <textarea
          ref={area}
          className="sql-codigo sql-cursor absolute inset-0 h-full w-full overflow-auto"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          onScroll={() => {
            sincronizar();
            if (abierto) refrescar();
          }}
          onKeyDown={alTeclear}
          onKeyUp={alSoltar}
          onClick={refrescar}
          onBlur={cerrarMenu}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Editor de SQL"
          placeholder={"-- Escribe aquí tus instrucciones de SQL.\n-- Ctrl + Enter para ejecutar."}
        />

        {/* El salto final sobra a proposito: deja sitio al cursor en la ultima linea. */}
        <pre
          ref={pintado}
          aria-hidden
          className="sql-codigo pointer-events-none absolute inset-0 overflow-hidden"
        >
          {colorear(valor + "\n").map((t, i) => (
            <span key={i} className={t.clase}>
              {t.texto}
            </span>
          ))}
        </pre>

        {abierto && caja ? (
          <ul
            className="absolute z-20 overflow-y-auto rounded-lg py-1 shadow-lg"
            style={{
              left: caja.left,
              top: caja.top,
              width: ANCHO_MENU,
              maxHeight: MAX_SUGERENCIAS * ALTO_RENGLON,
              background: "var(--ed-menu)",
              border: "1px solid var(--ed-borde)",
              color: "var(--ed-texto)",
            }}
            role="listbox"
          >
            {sugerencias.map((s, i) => (
              <li key={s.clase + s.texto}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activo}
                  className="flex w-full items-center justify-between gap-2 px-2.5 py-1 text-left text-[0.8125rem]"
                  style={i === activo ? { background: "var(--ed-menu-activo)" } : undefined}
                  // onMouseDown, no onClick: asi no se pierde el foco del textarea.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    aceptar(s);
                  }}
                  onMouseEnter={() => setActivo(i)}
                >
                  <span className="truncate font-mono">{s.texto}</span>
                  <span className="shrink-0 text-[0.62rem]" style={{ color: "var(--ed-texto-suave)" }}>
                    {ETIQUETA[s.clase]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
