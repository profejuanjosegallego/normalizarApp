/**
 * Comprobaciones de estructura que comparten los casos: llave primaria puesta,
 * columnas nuevas llenas a partir de una columna que no era atomica.
 */

import type { Estado, TablaBD } from "@/lib/sqlmotor";

function igual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function tablaDe(estado: Estado, base: string, nombre: string): TablaBD | null {
  const b = estado.servidor.bases.find((x) => igual(x.nombre, base));
  return b?.tablas.find((t) => igual(t.nombre, nombre)) ?? null;
}

/** La llave primaria de la tabla es exactamente la columna esperada (sola). */
export function tienePK(estado: Estado, base: string, tabla: string, columna: string): boolean {
  const t = tablaDe(estado, base, tabla);
  return !!t && t.pk.length === 1 && igual(t.pk[0], columna);
}

/**
 * Consejo cuando se puso la llave primaria en otra columna: el motor la acepto
 * porque hoy no se repite, pero no es lo que identifica la fila.
 */
export function consejoPK(
  estado: Estado,
  base: string,
  tabla: string,
  columna: string,
  porQue: string,
): string | null {
  const t = tablaDe(estado, base, tabla);
  if (!t || t.pk.length === 0 || tienePK(estado, base, tabla, columna)) return null;
  return (
    "Pusiste la llave primaria en (" + t.pk.join(", ") + "). " + porQue +
    " Como el motor no deja quitar una llave primaria, usa «Restaurar la base» (arriba) para volver a las tablas originales e inténtalo de nuevo."
  );
}

/**
 * Cada fila tiene, en las columnas nuevas, justo la parte que le corresponde
 * de la columna original. `partes` recibe el valor original y devuelve lo
 * que se espera en cada columna nueva, en el mismo orden que `nuevas`. Para
 * cada columna nueva se aceptan varios nombres (nombre o nombres, etc.).
 */
export function columnasSeparadas(
  estado: Estado,
  base: string,
  tabla: string,
  original: string,
  nuevas: string[][],
  partes: (valor: string) => string[],
): boolean {
  const t = tablaDe(estado, base, tabla);
  if (!t) return false;

  const columnas = nuevas.map((opciones) =>
    t.columnas.find((c) => opciones.some((o) => igual(o, c.nombre))),
  );
  if (columnas.some((c) => !c)) return false;
  if (t.filas.length === 0) return false;

  return t.filas.every((fila) => {
    const valor = fila[original];
    if (typeof valor !== "string") return false;
    const esperadas = partes(valor);
    return columnas.every((col, i) => {
      const dado = fila[(col as { nombre: string }).nombre];
      return typeof dado === "string" && limpio(dado) === limpio(esperadas[i]);
    });
  });
}

function limpio(texto: string): string {
  return texto.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Primera palabra y el resto: "Ana María Pérez" → ["Ana", "María Pérez"]. */
export function primeraYResto(valor: string): string[] {
  const partes = valor.trim().split(/\s+/);
  return [partes[0] ?? "", partes.slice(1).join(" ")];
}

/** Dos partes separadas por un separador: "a | b" → ["a", "b"]. */
export function separadoPor(separador: string) {
  return (valor: string): string[] => {
    const i = valor.indexOf(separador);
    if (i === -1) return [valor.trim(), ""];
    return [valor.slice(0, i).trim(), valor.slice(i + separador.length).trim()];
  };
}

/** La columna de la tabla tiene llave foránea hacia la tabla esperada. */
export function tieneFK(
  estado: Estado,
  base: string,
  tabla: string,
  columna: string,
  tablaRef: string,
): boolean {
  const t = tablaDe(estado, base, tabla);
  const col = t?.columnas.find((c) => igual(c.nombre, columna));
  return !!col && !!col.fk && igual(col.fk.tabla, tablaRef);
}
