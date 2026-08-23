/**
 * Retos guiados de la practica de SQL.
 *
 * Cada reto se verifica solo, mirando el estado de la base (o los logros, para
 * lo que no deja rastro, como haber ejecutado un SELECT con WHERE). Igual que
 * en el resto del taller, la verificacion es estructural: comprueba que el
 * estudiante hizo la operacion, no si el modelo que invento es el correcto.
 * Eso lo califica el docente.
 */

import type { Estado, TablaBD } from "./sqlmotor";

export type Reto = {
  id: string;
  titulo: string;
  /** Forma de la instruccion, con nombres genericos: el contenido lo pone el estudiante. */
  forma: string;
  cumplido: (estado: Estado) => boolean;
};

export type BloqueRetos = {
  titulo: string;
  intro: string;
  retos: Reto[];
};

function tablas(estado: Estado): TablaBD[] {
  return estado.servidor.bases.flatMap((b) => b.tablas);
}

function tiene(estado: Estado, logro: string): boolean {
  return estado.logros.includes(logro);
}

export const BLOQUES: BloqueRetos[] = [
  {
    titulo: "1. La base de datos",
    intro:
      "Antes de guardar nada hay que tener dónde guardarlo. Una base de datos es el contenedor de todas tus tablas.",
    retos: [
      {
        id: "base",
        titulo: "Crea tu primera base de datos",
        forma: "CREATE DATABASE nombre_de_la_base;",
        cumplido: (e) => e.servidor.bases.length > 0,
      },
      {
        id: "usar",
        titulo: "Entra a trabajar dentro de ella",
        forma: "USE nombre_de_la_base;",
        cumplido: (e) => e.servidor.activa !== null,
      },
    ],
  },
  {
    titulo: "2. Las tablas",
    intro:
      "Cada entidad del modelo se vuelve una tabla. Al crearla decides el nombre de cada columna, su tipo de dato y cuál es la llave primaria.",
    retos: [
      {
        id: "tabla",
        titulo: "Crea una tabla con al menos tres columnas",
        forma: "CREATE TABLE nombre_tabla (\n  columna1 TIPO,\n  columna2 TIPO,\n  columna3 TIPO\n);",
        cumplido: (e) => tablas(e).some((t) => t.columnas.length >= 3),
      },
      {
        id: "tipos",
        titulo: "Usa dos tipos de dato distintos en la misma tabla",
        forma: "cantidad INT,  nombre VARCHAR(60),  fecha DATE",
        cumplido: (e) =>
          tablas(e).some((t) => new Set(t.columnas.map((c) => c.familia)).size >= 2),
      },
      {
        id: "pk",
        titulo: "Dale a esa tabla una llave primaria que se genere sola",
        forma: "id_algo INT AUTO_INCREMENT,\n  PRIMARY KEY (id_algo)",
        cumplido: (e) =>
          tablas(e).some(
            (t) => t.pk.length > 0 && t.columnas.some((c) => c.autoIncrement),
          ),
      },
      {
        id: "segunda",
        titulo: "Crea una segunda tabla",
        forma: "CREATE TABLE otra_tabla ( ... );",
        cumplido: (e) => tablas(e).length >= 2,
      },
      {
        id: "fk",
        titulo: "Conéctalas con una llave foránea",
        forma:
          "id_padre INT,\n  FOREIGN KEY (id_padre) REFERENCES tabla_padre(id_padre)",
        cumplido: (e) => tablas(e).some((t) => t.columnas.some((c) => c.fk)),
      },
    ],
  },
  {
    titulo: "3. Llenar los datos",
    intro:
      "Una tabla vacía no sirve de nada. Al insertar es cuando aparecen las reglas: los tipos, los NOT NULL y las llaves.",
    retos: [
      {
        id: "insert",
        titulo: "Inserta al menos tres filas en una tabla",
        forma: "INSERT INTO tabla (columna1, columna2) VALUES ('valor', 10);",
        cumplido: (e) => tablas(e).some((t) => t.filas.length >= 3),
      },
      {
        id: "insert_hijo",
        titulo: "Inserta filas en la tabla que tiene la llave foránea",
        forma: "INSERT INTO tabla_hija (id_padre, dato) VALUES (1, 'algo');",
        cumplido: (e) =>
          tablas(e).some((t) => {
            const fk = t.columnas.find((c) => c.fk);
            return !!fk && t.filas.some((f) => (f[fk.nombre] ?? null) !== null);
          }),
      },
      {
        id: "error_fk",
        titulo: "A propósito: intenta apuntar a un padre que no existe y lee el error",
        forma: "INSERT INTO tabla_hija (id_padre) VALUES (9999);",
        cumplido: (e) => tiene(e, "error_fk_insert"),
      },
    ],
  },
  {
    titulo: "4. Consultar",
    intro: "SELECT es la instrucción que más vas a escribir en tu vida. Empieza por lo simple.",
    retos: [
      {
        id: "select_todo",
        titulo: "Muestra todo el contenido de una tabla",
        forma: "SELECT * FROM tabla;",
        cumplido: (e) => tiene(e, "select_todo"),
      },
      {
        id: "select_cols",
        titulo: "Muestra solo algunas columnas",
        forma: "SELECT columna1, columna2 FROM tabla;",
        cumplido: (e) => tiene(e, "select_columnas"),
      },
      {
        id: "select_where",
        titulo: "Filtra las filas con una condición",
        forma: "SELECT * FROM tabla WHERE columna = 'valor';",
        cumplido: (e) => tiene(e, "select_where"),
      },
      {
        id: "select_orden",
        titulo: "Ordena el resultado",
        forma: "SELECT * FROM tabla ORDER BY columna DESC;",
        cumplido: (e) => tiene(e, "select_orden"),
      },
      {
        id: "select_contar",
        titulo: "Cuenta cuántas filas hay",
        forma: "SELECT COUNT(*) FROM tabla;",
        cumplido: (e) => tiene(e, "select_agregado"),
      },
    ],
  },
  {
    titulo: "5. Cambiar y borrar",
    intro:
      "Lo último es corregir y eliminar. Fíjate en el WHERE: sin él, la instrucción se aplica a toda la tabla.",
    retos: [
      {
        id: "update",
        titulo: "Cambia el dato de una fila",
        forma: "UPDATE tabla SET columna = 'nuevo valor' WHERE id_algo = 1;",
        cumplido: (e) => tiene(e, "update_hecho"),
      },
      {
        id: "delete",
        titulo: "Borra una fila concreta",
        forma: "DELETE FROM tabla WHERE id_algo = 3;",
        cumplido: (e) => tiene(e, "delete_where"),
      },
      {
        id: "error_delete",
        titulo: "A propósito: intenta borrar una fila a la que otra tabla apunta",
        forma: "DELETE FROM tabla_padre WHERE id_padre = 1;",
        cumplido: (e) => tiene(e, "error_fk_delete"),
      },
    ],
  },
];

export const TOTAL_RETOS = BLOQUES.reduce((n, b) => n + b.retos.length, 0);

export function retosCumplidos(estado: Estado): Set<string> {
  const cumplidos = new Set<string>();
  for (const bloque of BLOQUES) {
    for (const reto of bloque.retos) {
      if (reto.cumplido(estado)) cumplidos.add(reto.id);
    }
  }
  return cumplidos;
}
