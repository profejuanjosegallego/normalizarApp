"use client";

/**
 * Referencia de sintaxis.
 *
 * Muestra la *forma* de cada instruccion con nombres genericos; no inserta nada
 * en el editor a proposito, porque escribir el SQL es justamente el ejercicio.
 */

type Ficha = { titulo: string; nota: string; codigo: string };

const FICHAS: Ficha[] = [
  {
    titulo: "Crear la base y entrar en ella",
    nota: "Sin USE, el servidor no sabe dónde crear las tablas.",
    codigo: "CREATE DATABASE nombre_base;\nUSE nombre_base;",
  },
  {
    titulo: "Crear una tabla",
    nota: "El identificador va primero, con AUTO_INCREMENT para que lo genere el servidor.",
    codigo:
      "CREATE TABLE nombre_tabla (\n" +
      "  id_tabla INT AUTO_INCREMENT,\n" +
      "  texto VARCHAR(60) NOT NULL,\n" +
      "  numero INT,\n" +
      "  cuando DATE,\n" +
      "  PRIMARY KEY (id_tabla)\n" +
      ");",
  },
  {
    titulo: "Llave foránea",
    nota: "Primero se crea la tabla a la que se apunta. La columna lleva el mismo tipo que la PK.",
    codigo:
      "CREATE TABLE tabla_hija (\n" +
      "  id_hija INT AUTO_INCREMENT PRIMARY KEY,\n" +
      "  id_padre INT NOT NULL,\n" +
      "  FOREIGN KEY (id_padre) REFERENCES tabla_padre(id_padre)\n" +
      ");",
  },
  {
    titulo: "Tipos de dato",
    nota: "El número entre paréntesis del VARCHAR es cuántos caracteres caben.",
    codigo:
      "INT            números enteros\n" +
      "DECIMAL(10,2)  números con decimales\n" +
      "VARCHAR(60)    texto de largo variable\n" +
      "CHAR(2)        texto de largo fijo\n" +
      "TEXT           texto largo\n" +
      "DATE           fecha: '2026-03-15'\n" +
      "BOOLEAN        TRUE o FALSE",
  },
  {
    titulo: "Insertar datos",
    nota: "Los textos y las fechas van entre comillas simples; los números, no.",
    codigo:
      "INSERT INTO nombre_tabla (texto, numero)\n" +
      "VALUES ('primer valor', 10),\n" +
      "       ('segundo valor', 25);",
  },
  {
    titulo: "Consultar",
    nota: "El asterisco trae todas las columnas; nombrarlas trae solo esas.",
    codigo:
      "SELECT * FROM nombre_tabla;\n" +
      "SELECT texto, numero FROM nombre_tabla;\n" +
      "SELECT * FROM nombre_tabla WHERE numero > 10;\n" +
      "SELECT * FROM nombre_tabla ORDER BY texto ASC;\n" +
      "SELECT COUNT(*) FROM nombre_tabla;",
  },
  {
    titulo: "Condiciones del WHERE",
    nota: "El % del LIKE significa «cualquier cosa».",
    codigo:
      "WHERE numero = 10\n" +
      "WHERE texto <> 'algo'\n" +
      "WHERE numero BETWEEN 1 AND 100\n" +
      "WHERE texto LIKE 'a%'\n" +
      "WHERE texto IS NULL\n" +
      "WHERE numero > 5 AND texto = 'algo'",
  },
  {
    titulo: "Cambiar y borrar",
    nota: "Sin WHERE se aplican a TODAS las filas de la tabla.",
    codigo:
      "UPDATE nombre_tabla SET numero = 99 WHERE id_tabla = 1;\n" +
      "DELETE FROM nombre_tabla WHERE id_tabla = 1;\n" +
      "DROP TABLE nombre_tabla;",
  },
  {
    titulo: "Mirar la estructura",
    nota: "Útil cuando ya no recuerdas cómo llamaste una columna.",
    codigo: "SHOW DATABASES;\nSHOW TABLES;\nDESCRIBE nombre_tabla;",
  },
];

export default function Chuleta() {
  return (
    <div className="space-y-3">
      <p className="suave text-xs leading-relaxed">
        La forma de cada instrucción, con nombres de ejemplo. Los nombres de tus tablas y columnas
        los pones tú.
      </p>

      {FICHAS.map((f) => (
        <details key={f.titulo} className="tarjeta-plana p-3">
          <summary className="cursor-pointer text-[0.82rem] font-semibold">{f.titulo}</summary>
          <p className="suave mt-1.5 text-xs leading-relaxed">{f.nota}</p>
          <pre
            className="mt-2 overflow-x-auto rounded-lg px-2.5 py-2 font-mono text-[0.7rem] leading-relaxed"
            style={{ background: "var(--superficie)" }}
          >
            {f.codigo}
          </pre>
        </details>
      ))}

      <p className="suave text-[0.7rem] leading-relaxed">
        Cada instrucción termina en punto y coma. Lo que va después de <code>--</code> es un
        comentario y no se ejecuta.
      </p>
    </div>
  );
}
