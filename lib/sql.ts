import { aSnake } from "./ids";
import { columnasPK } from "./modelo";
import type { Columna, Tabla } from "./tipos";

/** Ordena las tablas para que una FK nunca apunte a una tabla aun no creada. */
function ordenarPorDependencia(modelo: Tabla[]): Tabla[] {
  const pendientes = [...modelo];
  const listas: Tabla[] = [];
  const emitidas = new Set<string>();

  let seguro = modelo.length * modelo.length + 1;
  while (pendientes.length > 0 && seguro > 0) {
    seguro -= 1;
    const i = pendientes.findIndex((t) =>
      t.columnas
        .filter((c) => c.esFK && c.refTablaId && c.refTablaId !== t.id)
        .every((c) => emitidas.has(c.refTablaId as string)),
    );
    const elegida = i >= 0 ? pendientes.splice(i, 1)[0] : pendientes.shift();
    if (!elegida) break;
    emitidas.add(elegida.id);
    listas.push(elegida);
  }
  return [...listas, ...pendientes];
}

function tipoSQL(col: Columna): string {
  const declarado = col.tipo.trim();
  if (declarado) return declarado.toUpperCase();
  if (col.esPK || col.esFK) return "INT";
  return "VARCHAR(100)";
}

function escapar(valor: string): string {
  return `'${valor.replace(/'/g, "''")}'`;
}

/** Genera un script MySQL/MariaDB a partir del modelo final. */
export function generarSQL(modelo: Tabla[]): string {
  const ordenadas = ordenarPorDependencia(modelo);
  const bloques: string[] = [
    "-- Script generado por el Taller de Normalización",
    "-- Dialecto: MySQL / MariaDB",
    "",
  ];

  for (const tabla of ordenadas) {
    const nombre = aSnake(tabla.nombre);
    const pk = columnasPK(tabla)[0];
    const lineas: string[] = [];

    for (const col of tabla.columnas) {
      const nombreCol = aSnake(col.nombre);
      let linea = `  ${nombreCol} ${tipoSQL(col)}`;
      if (col.esPK) {
        linea += col.autogenerada ? " NOT NULL AUTO_INCREMENT" : " NOT NULL";
      } else if (col.esFK) {
        linea += " NOT NULL";
      }
      lineas.push(linea);
    }

    if (pk) lineas.push(`  PRIMARY KEY (${aSnake(pk.nombre)})`);

    for (const col of tabla.columnas) {
      if (!col.esFK || !col.refTablaId) continue;
      const destino = modelo.find((t) => t.id === col.refTablaId);
      if (!destino) continue;
      const pkDestino = columnasPK(destino)[0];
      if (!pkDestino) continue;
      lineas.push(
        `  CONSTRAINT fk_${nombre}_${aSnake(destino.nombre)} FOREIGN KEY (${aSnake(col.nombre)}) REFERENCES ${aSnake(destino.nombre)}(${aSnake(pkDestino.nombre)})`,
      );
    }

    bloques.push(`CREATE TABLE ${nombre} (\n${lineas.join(",\n")}\n);`, "");
  }

  bloques.push("-- Registros de ejemplo", "");
  for (const tabla of ordenadas) {
    if (tabla.filas.length === 0) continue;
    const nombre = aSnake(tabla.nombre);
    const cols = tabla.columnas;
    const listaCols = cols.map((c) => aSnake(c.nombre)).join(", ");
    for (const fila of tabla.filas) {
      const valores = cols
        .map((c) => {
          const v = (fila.valores[c.id] ?? "").trim();
          return v ? escapar(v) : "NULL";
        })
        .join(", ");
      bloques.push(`INSERT INTO ${nombre} (${listaCols}) VALUES (${valores});`);
    }
    bloques.push("");
  }

  return bloques.join("\n");
}
