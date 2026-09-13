/**
 * Caso de practica: cena en El Faro.
 *
 * Un critico gastronomico muere envenenado durante la cena de aniversario de
 * un restaurante. Es el caso de repaso: acceso libre, sin reloj ni nota, con
 * las mismas herramientas que piden los dos casos del examen. La asesina es
 * Beatriz Lara, la dueña, que puso extracto de almendra amarga en el postre
 * para frenar una reseña que iba a hundir el negocio.
 */

import { columnasSeparadas, consejoPK, separadoPor, tieneFK, tienePK } from "./chequeos";
import type { Caso } from "./tipos";

const BASE = "caso_faro";

const SCRIPT = `
CREATE DATABASE ${BASE};
USE ${BASE};

CREATE TABLE persona (
  id_persona INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  apellido VARCHAR(40) NOT NULL,
  rol VARCHAR(40) NOT NULL,
  direccion_completa VARCHAR(90) NOT NULL
);

INSERT INTO persona (nombre, apellido, rol, direccion_completa) VALUES
  ('Julián', 'Prada Mora', 'Crítico gastronómico', 'Carrera 7 # 45-10, Bogotá'),
  ('Marcos', 'Duque Villa', 'Chef', 'Calle 93 # 11-25, Bogotá'),
  ('Beatriz', 'Lara Ossa', 'Dueña del restaurante', 'Carrera 43A # 5-60, Medellín'),
  ('Tomás', 'Rendón Gil', 'Sommelier', 'Avenida 6N # 23-40, Cali'),
  ('Paula', 'Ceballos Ruiz', 'Mesera', 'Calle 26 # 68-15, Bogotá'),
  ('Andrés', 'Salgado Peña', 'Crítico rival', 'Calle 5 # 38-20, Cali'),
  ('Nora', 'Vélez Ríos', 'Proveedora de insumos', 'Carrera 70 # 1-80, Medellín'),
  ('David', 'Ortega Lima', 'Sous-chef', 'Calle 134 # 9-30, Bogotá');

-- A propósito sin llave primaria: la pista 3 pide ponerla.
CREATE TABLE movimiento (
  id_movimiento INT NOT NULL,
  id_persona INT NOT NULL,
  lugar VARCHAR(30) NOT NULL,
  hora VARCHAR(5) NOT NULL,
  FOREIGN KEY (id_persona) REFERENCES persona(id_persona)
);

INSERT INTO movimiento (id_movimiento, id_persona, lugar, hora) VALUES
  (1, 2, 'Cocina', '18:00'),
  (2, 8, 'Cocina', '18:05'),
  (3, 3, 'Salón', '18:30'),
  (4, 5, 'Salón', '18:40'),
  (5, 4, 'Bodega', '18:45'),
  (6, 7, 'Bodega', '19:00'),
  (7, 7, 'Cocina', '19:10'),
  (8, 1, 'Salón', '19:30'),
  (9, 6, 'Salón', '19:32'),
  (10, 4, 'Salón', '19:40'),
  (11, 3, 'Cocina', '19:50'),
  (12, 5, 'Cocina', '20:05'),
  (13, 5, 'Salón', '20:10'),
  (14, 1, 'Terraza', '20:30'),
  (15, 3, 'Terraza', '20:35'),
  (16, 6, 'Terraza', '20:50'),
  (17, 4, 'Bodega', '21:00'),
  (18, 1, 'Salón', '21:05'),
  (19, 7, 'Salón', '21:15'),
  (20, 2, 'Cocina', '21:35'),
  (21, 8, 'Cocina', '21:40'),
  (22, 3, 'Cocina', '21:48'),
  (23, 5, 'Cocina', '21:55'),
  (24, 5, 'Salón', '22:02'),
  (25, 3, 'Salón', '22:05'),
  (26, 6, 'Baños', '22:10'),
  (27, 4, 'Salón', '22:20'),
  (28, 8, 'Salón', '22:40');

-- A propósito sin llave foránea: la pista 4 pide ponerla.
CREATE TABLE pedido (
  id_pedido INT AUTO_INCREMENT PRIMARY KEY,
  id_persona INT NOT NULL,
  plato VARCHAR(50) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  hora VARCHAR(5) NOT NULL
);

INSERT INTO pedido (id_persona, plato, precio, hora) VALUES
  (1, 'Copa de vino tinto', 32000.00, '19:35'),
  (6, 'Copa de vino blanco', 30000.00, '19:36'),
  (1, 'Ceviche de corvina', 48000.00, '19:45'),
  (6, 'Carpaccio de res', 45000.00, '19:46'),
  (4, 'Agua con gas', 8000.00, '19:50'),
  (3, 'Copa de vino tinto', 32000.00, '19:55'),
  (1, 'Risotto de hongos', 62000.00, '20:15'),
  (6, 'Lomo al vino', 78000.00, '20:16'),
  (7, 'Ensalada del huerto', 36000.00, '20:20'),
  (3, 'Sopa de tomate', 28000.00, '20:22'),
  (4, 'Tabla de quesos', 54000.00, '20:30'),
  (1, 'Copa de vino tinto', 32000.00, '20:40'),
  (6, 'Copa de vino blanco', 30000.00, '20:41'),
  (7, 'Té de jengibre', 9000.00, '20:45'),
  (3, 'Agua sin gas', 7000.00, '20:50'),
  (1, 'Tarta de almendras', 34000.00, '21:50'),
  (6, 'Helado de vainilla', 24000.00, '21:51'),
  (3, 'Café espresso', 9000.00, '21:52'),
  (4, 'Copa de oporto', 41000.00, '21:53'),
  (7, 'Tarta de almendras', 34000.00, '21:54'),
  (6, 'Café espresso', 9000.00, '22:00'),
  (4, 'Café espresso', 9000.00, '22:01'),
  (1, 'Agua sin gas', 7000.00, '22:03'),
  (7, 'Café con leche', 10000.00, '22:05'),
  (3, 'Copa de vino tinto', 32000.00, '22:08'),
  (6, 'Copa de oporto', 41000.00, '22:12'),
  (4, 'Tabla de quesos', 54000.00, '22:15'),
  (7, 'Agua con gas', 8000.00, '22:18'),
  (6, 'Copa de vino blanco', 30000.00, '22:25'),
  (3, 'Café espresso', 9000.00, '22:30');

CREATE TABLE mensaje (
  id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
  id_emisor INT NOT NULL,
  id_receptor INT NOT NULL,
  hora VARCHAR(5) NOT NULL,
  texto VARCHAR(120) NOT NULL,
  FOREIGN KEY (id_emisor) REFERENCES persona(id_persona),
  FOREIGN KEY (id_receptor) REFERENCES persona(id_persona)
);

INSERT INTO mensaje (id_emisor, id_receptor, hora, texto) VALUES
  (1, 6, '17:40', 'Mañana sale la reseña de El Faro. No van a sobrevivirla.'),
  (6, 1, '17:45', 'Ya leí tu reseña. Es brutal, pero justa.'),
  (3, 2, '18:20', 'Que todo salga perfecto hoy. Prada va a escribir sobre nosotros.'),
  (2, 3, '18:22', 'La cocina está lista. Tranquila.'),
  (3, 7, '18:50', '¿Trajiste el extracto de almendra que te pedí?'),
  (7, 3, '18:55', 'Sí, quedó en la bodega junto a las harinas. Cuidado, es el amargo.'),
  (1, 3, '20:00', 'Beatriz, la reseña ya está escrita. No hay nada que hablar.'),
  (3, 1, '20:32', 'Solo te pido cinco minutos en la terraza.'),
  (4, 3, '21:00', 'El oporto que pidió Salgado no está en la bodega.'),
  (3, 4, '21:02', 'Busca en el estante de abajo.'),
  (3, 5, '21:47', 'La tarta de la mesa 7 la llevo yo. Tú lleva el helado.'),
  (5, 3, '21:49', 'Listo, jefa.'),
  (8, 2, '21:58', '¿Quién cambió el emplatado de la tarta? Tenía otra decoración.'),
  (2, 8, '22:00', 'Yo no fui. Pregúntale a Beatriz.'),
  (6, 1, '22:20', 'Julián, ¿estás bien? Te ves pálido.'),
  (5, 3, '22:35', 'El de la mesa 7 se desmayó. Llamo a la ambulancia.'),
  (3, 5, '22:36', 'No toques nada de la mesa.'),
  (3, 7, '23:10', 'Borra lo del extracto. No lo menciones.');

CREATE TABLE insumo (
  id_compra INT AUTO_INCREMENT PRIMARY KEY,
  id_persona INT NOT NULL,
  producto VARCHAR(50) NOT NULL,
  cantidad INT NOT NULL,
  costo DECIMAL(10,2) NOT NULL,
  fecha DATE NOT NULL,
  FOREIGN KEY (id_persona) REFERENCES persona(id_persona)
);

INSERT INTO insumo (id_persona, producto, cantidad, costo, fecha) VALUES
  (2, 'Corvina fresca', 6, 180000.00, '2026-09-10'),
  (2, 'Hongos portobello', 4, 96000.00, '2026-09-10'),
  (8, 'Lomo de res', 5, 250000.00, '2026-09-11'),
  (3, 'Vino tinto reserva', 12, 720000.00, '2026-09-08'),
  (3, 'Extracto de almendra amarga', 1, 45000.00, '2026-09-11'),
  (2, 'Harina de almendras', 3, 84000.00, '2026-09-09'),
  (8, 'Tomate chonto', 10, 40000.00, '2026-09-11'),
  (3, 'Oporto', 4, 380000.00, '2026-09-05'),
  (4, 'Vino blanco', 8, 400000.00, '2026-09-07'),
  (2, 'Queso azul', 2, 110000.00, '2026-09-10'),
  (3, 'Almendras enteras', 5, 125000.00, '2026-09-09'),
  (8, 'Vainilla en vaina', 2, 70000.00, '2026-09-11');
`;

export const CASO_RESTAURANTE: Caso = {
  id: "faro",
  titulo: "Cena en El Faro",
  subtitulo: "Un crítico, una tarta de almendras y ocho personas en un restaurante. Caso de práctica.",
  libre: true,
  base: BASE,
  apertura:
    "Viernes, 22:35. El restaurante El Faro celebra sus diez años con una cena de gala. En la mesa 7, el crítico gastronómico Julián Prada acaba de terminar el postre —una tarta de almendras— cuando se lleva la mano al pecho y se desploma. La mesera llama a la ambulancia; llega tarde. El médico habla de cianuro: huele a almendras amargas, y en un postre de almendras nadie lo notaría.\n\n" +
    "El restaurante tiene tarjetas para entrar a la cocina, la bodega y la terraza, la caja registró cada pedido, el chat del personal guardó los mensajes y compras tiene las facturas de la semana. Todo está en la base de datos «caso_faro». Este caso es de práctica: sin reloj y sin nota, para repasar antes del examen.",
  script: SCRIPT,
  pistas: [
    {
      id: "entrar",
      titulo: "El expediente",
      relato:
        "El servidor del restaurante tiene la base de datos del caso, pero nadie ha entrado en ella. Sin eso, ninguna consulta sabe de qué tablas hablas.",
      tarea: "Entra a la base de datos caso_faro.",
      herramientas: ["USE"],
      comprobar: {
        tipo: "estado",
        cumple: (e) => e.servidor.activa?.toLowerCase() === BASE,
      },
      hallazgo:
        "Cinco tablas: persona, movimiento, pedido, mensaje e insumo. Mira la pestaña Tablas: ahí están todas las columnas y las filas.",
    },
    {
      id: "gente",
      titulo: "Los de esa noche",
      relato:
        "Ocho personas tenían tarjeta de acceso: el crítico, el chef, la dueña, el sommelier, la mesera, un crítico rival, la proveedora de insumos y el sous-chef.",
      tarea: "Muestra la lista completa de personas, con todas sus columnas.",
      herramientas: ["SELECT", "FROM"],
      exige: ["SELECT"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT id_persona, nombre, apellido, rol FROM persona;",
      },
      hallazgo:
        "La víctima es Julián Prada Mora, id 1. Fíjate en direccion_completa: calle y ciudad en la misma celda. Eso va a estorbar.",
    },
    {
      id: "llave",
      titulo: "Movimientos sin identificar",
      relato:
        "La tabla movimiento llegó sin llave primaria. Un registro donde dos filas podrían ser la misma no sirve de prueba.",
      tarea:
        "Mira las columnas de movimiento, decide cuál identifica cada movimiento sin repetirse nunca, y declárala como llave primaria.",
      herramientas: ["ALTER TABLE", "ADD PRIMARY KEY"],
      comprobar: {
        tipo: "estado",
        cumple: (e) => tienePK(e, BASE, "movimiento", "id_movimiento"),
        consejo: (e) =>
          consejoPK(
            e,
            BASE,
            "movimiento",
            "id_movimiento",
            "Dos personas pueden pasar por el mismo lugar o a la misma hora; lo único que distingue un movimiento de otro es su número de registro.",
          ),
      },
      hallazgo:
        "Con id_movimiento como llave primaria, cada pasada de tarjeta es una prueba con nombre propio.",
    },
    {
      id: "foranea",
      titulo: "Pedidos de nadie",
      relato:
        "La caja exportó la tabla pedido sin llave foránea: el id_persona de un pedido podría apuntar a alguien que no existe. Para usar los pedidos como prueba, cada uno tiene que señalar a una persona real.",
      tarea: "Declara en la tabla pedido la llave foránea que conecta su columna id_persona con la tabla persona.",
      herramientas: ["ALTER TABLE", "ADD FOREIGN KEY", "REFERENCES"],
      comprobar: {
        tipo: "estado",
        cumple: (e) => tieneFK(e, BASE, "pedido", "id_persona", "persona"),
      },
      hallazgo: "Ahora ningún pedido queda huérfano: los treinta apuntan a alguien de la lista.",
    },
    {
      id: "atomico",
      titulo: "Calle y ciudad",
      relato:
        "La policía quiere saber quiénes viven fuera de Bogotá, pero en persona la calle y la ciudad van juntas en direccion_completa, separadas por una coma: no es atómica.",
      tarea:
        "Agrega a persona las columnas calle y ciudad, y llénalas para las ocho personas: antes de la coma va la calle y después la ciudad.",
      herramientas: ["ALTER TABLE", "ADD", "UPDATE", "SET", "WHERE"],
      comprobar: {
        tipo: "estado",
        cumple: (e) =>
          columnasSeparadas(
            e,
            BASE,
            "persona",
            "direccion_completa",
            [["calle", "direccion"], ["ciudad", "municipio"]],
            separadoPor(","),
          ),
      },
      hallazgo:
        "Ocho calles y ocho ciudades, cada una en su columna. Dos personas viven en Medellín: la dueña y la proveedora.",
    },
    {
      id: "cocina",
      titulo: "Quién entró a la cocina",
      relato:
        "La tarta de la mesa 7 se emplató a las 21:45 y salió a las 21:55. Quien la envenenó estuvo en la cocina en ese rato. Cada pasada de tarjeta quedó en la tabla movimiento.",
      tarea:
        "Muestra el id de la persona y la hora de cada entrada a la 'Cocina' entre las '21:30' y las '22:00'.",
      herramientas: ["WHERE", "AND", "BETWEEN"],
      exige: ["WHERE", "BETWEEN"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_persona, hora FROM movimiento WHERE lugar = 'Cocina' AND hora BETWEEN '21:30' AND '22:00';",
      },
      hallazgo:
        "Cuatro personas: el chef (2) a las 21:35, el sous-chef (8) a las 21:40, la dueña (3) a las 21:48 y la mesera (5) a las 21:55. Los cuatro tocaron la cocina con la tarta ahí.",
    },
    {
      id: "despues",
      titulo: "Qué hicieron después",
      relato:
        "Cuatro sospechosos. El detective quiere ver a dónde fueron después de las diez de la noche.",
      tarea:
        "Muestra id_persona, lugar y hora de los movimientos de las personas 2, 3, 5 u 8 a partir de las '22:00' (incluida).",
      herramientas: ["WHERE", "IN", "AND", ">="],
      exige: ["WHERE", "IN", "AND"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_persona, lugar, hora FROM movimiento WHERE id_persona IN (2, 3, 5, 8) AND hora >= '22:00';",
      },
      hallazgo:
        "La mesera y la dueña volvieron al salón a las 22:02 y 22:05, justo cuando la tarta llegaba a la mesa. El sous-chef salió a las 22:40; el chef no volvió a pasar la tarjeta.",
    },
    {
      id: "resena",
      titulo: "La reseña",
      relato:
        "El crítico iba a publicar algo al día siguiente. El chat del personal está en la tabla mensaje; busca lo que se dijo sobre la reseña.",
      tarea:
        "Muestra id_emisor, id_receptor y texto de los mensajes en cuyo texto aparezca la palabra reseña.",
      herramientas: ["WHERE", "LIKE"],
      exige: ["WHERE", "LIKE"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT id_emisor, id_receptor, texto FROM mensaje WHERE texto LIKE '%reseña%';",
      },
      hallazgo:
        "Tres mensajes. Julián le dice al crítico rival que El Faro «no va a sobrevivir» la reseña, y a las 20:00 le escribe a la dueña (3) que ya está escrita y «no hay nada que hablar».",
    },
    {
      id: "negocio",
      titulo: "A quién le dolía la reseña",
      relato:
        "Una reseña que hunde un restaurante le duele a quien lo posee… y a quien le vende los insumos. Busca los dos roles.",
      tarea:
        "Muestra nombre, apellido y rol de las personas cuyo rol sea 'Dueña del restaurante' o 'Proveedora de insumos'.",
      herramientas: ["WHERE", "OR"],
      exige: ["WHERE", "OR"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT nombre, apellido, rol FROM persona WHERE rol = 'Dueña del restaurante' OR rol = 'Proveedora de insumos';",
      },
      hallazgo:
        "Beatriz Lara, la dueña, y Nora Vélez, la proveedora. Las dos viven en Medellín y las dos se escribieron esa tarde sobre un extracto de almendra.",
    },
    {
      id: "parentesis",
      titulo: "Cocina o bodega",
      relato:
        "El extracto se guardó en la bodega y terminó en la cocina. Quien lo movió pasó por los dos sitios ya entrada la noche. Ojo: una condición es «esto o aquello» y la otra es obligatoria; piensa en qué orden se evalúan.",
      tarea:
        "Muestra id_persona, lugar y hora de las pasadas por la 'Cocina' o por la 'Bodega' ocurridas a partir de las '21:00' (incluida).",
      herramientas: ["WHERE", "OR", "AND", "( )", ">="],
      exige: ["WHERE", "OR", "AND"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_persona, lugar, hora FROM movimiento WHERE (lugar = 'Cocina' OR lugar = 'Bodega') AND hora >= '21:00';",
      },
      hallazgo:
        "Cinco pasadas: el sommelier a la bodega a las 21:00 y luego cuatro entradas a la cocina. Si te salieron más filas, faltaron los paréntesis.",
    },
    {
      id: "caros",
      titulo: "Los tres pedidos más caros",
      relato:
        "Contabilidad quiere saber qué se pidió esa noche, pero solo lo más caro.",
      tarea:
        "Muestra id_persona, plato y precio de los tres pedidos más caros, del más caro al más barato.",
      herramientas: ["ORDER BY", "DESC", "LIMIT"],
      exige: ["ORDER BY", "LIMIT"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT id_persona, plato, precio FROM pedido ORDER BY precio DESC LIMIT 3;",
        ordenado: true,
      },
      hallazgo:
        "El lomo al vino del crítico rival (78.000), el risotto de la víctima (62.000) y una tabla de quesos del sommelier (54.000). Nada raro ahí: la clave no está en lo caro sino en la tarta.",
    },
    {
      id: "pedidos",
      titulo: "Cuántos pedidos hizo cada uno",
      relato:
        "Treinta pedidos es mucho ruido. El detective quiere un solo número por persona.",
      tarea: "Cuenta cuántos pedidos hizo cada persona: muestra id_persona y el total de pedidos de esa persona.",
      herramientas: ["COUNT", "GROUP BY"],
      exige: ["COUNT", "GROUP BY"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT id_persona, COUNT(*) FROM pedido GROUP BY id_persona;",
      },
      hallazgo:
        "Cinco personas pidieron algo: el crítico rival (8), la víctima (6), la dueña (6), el sommelier (5) y la proveedora (5). El chef, el sous-chef y la mesera trabajaban.",
    },
    {
      id: "insistente",
      titulo: "Quién entró más a la cocina",
      relato:
        "El detective quiere que la consulta misma se quede solo con quien entró a la cocina al menos dos veces. Ojo: el total de entradas no existe hasta que se agrupa, así que el filtro de siempre no lo ve.",
      tarea:
        "Muestra id_persona y el total de entradas a la 'Cocina' únicamente de las personas con 2 o más entradas.",
      herramientas: ["WHERE", "GROUP BY", "HAVING", "COUNT"],
      exige: ["GROUP BY", "HAVING"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_persona, COUNT(*) FROM movimiento WHERE lugar = 'Cocina' GROUP BY id_persona HAVING COUNT(*) >= 2;",
      },
      hallazgo:
        "Cuatro personas con dos entradas: el chef, el sous-chef, la mesera… y la dueña, que no cocina. Entró a las 19:50 y a las 21:48, tres minutos después de emplatar la tarta.",
    },
    {
      id: "gasto",
      titulo: "Cuánto compró la dueña",
      relato:
        "La tabla insumo tiene las compras de la semana con quién las hizo. El detective quiere saber cuánto gastó la persona 3.",
      tarea: "Muestra la suma del costo de todas las compras hechas por la persona 3.",
      herramientas: ["SUM", "WHERE"],
      exige: ["SUM"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT SUM(costo) FROM insumo WHERE id_persona = 3;",
      },
      hallazgo:
        "1.270.000 pesos en cuatro compras: vino, oporto, almendras… y una sola unidad de extracto de almendra amarga, comprada el día antes de la cena.",
    },
    {
      id: "costos",
      titulo: "El insumo más caro y el promedio",
      relato:
        "Para el informe, contabilidad pide dos números de la tabla insumo: la compra más cara y el costo promedio.",
      tarea: "Muestra el costo más alto y el costo promedio de todas las compras de insumo.",
      herramientas: ["MAX", "AVG"],
      exige: ["MAX", "AVG"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT MAX(costo), AVG(costo) FROM insumo;",
      },
      hallazgo:
        "La más cara fue el vino reserva (720.000) y el promedio ronda los 208.000. El extracto costó 45.000: barato para lo que hizo.",
    },
    {
      id: "almendra",
      titulo: "Quién compró la almendra",
      relato:
        "Última lectura. El detective quiere, con nombre y apellido, quién compró cada insumo que tenga que ver con almendras. El nombre no está en la tabla insumo.",
      tarea:
        "Muestra nombre, apellido y producto de las compras cuyo producto contenga la palabra almendra.",
      herramientas: ["INNER JOIN", "ON", "WHERE", "LIKE"],
      exige: ["JOIN", "ON", "LIKE"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT p.nombre, p.apellido, i.producto FROM insumo i INNER JOIN persona p ON i.id_persona = p.id_persona WHERE i.producto LIKE '%almendra%';",
      },
      hallazgo:
        "Tres compras: la harina de almendras la trajo el chef; las almendras enteras y el extracto de almendra amarga, Beatriz Lara. El extracto no aparece en ninguna receta de la carta.",
    },
    {
      id: "distintos",
      titulo: "Cuántas personas distintas pidieron",
      relato:
        "Treinta pedidos no son treinta comensales. Para el informe hace falta cuántas personas diferentes pidieron algo, sin contar dos veces a nadie.",
      tarea: "Cuenta cuántas personas distintas aparecen en la tabla pedido.",
      herramientas: ["COUNT", "DISTINCT"],
      exige: ["COUNT", "DISTINCT"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT COUNT(DISTINCT id_persona) FROM pedido;",
      },
      hallazgo:
        "Cinco comensales. De ellos, solo uno tenía un motivo y el veneno en la bodega.",
    },
    {
      id: "culpable",
      titulo: "Solo hay una verdad",
      relato:
        "La cocina, los mensajes, las compras y la reseña. El detective se ajusta las gafas y espera tu respuesta.",
      tarea: "Escribe el nombre de quien envenenó al crítico.",
      herramientas: [],
      comprobar: {
        tipo: "culpable",
        aceptados: ["Beatriz Lara Ossa", "Beatriz Lara", "Lara", "Beatriz", "Lara Ossa", "3"],
      },
      hallazgo: "",
    },
  ],
  culpable: "Beatriz Lara Ossa",
  resolucion:
    "Beatriz Lara sabía desde las 17:40 que la reseña de Julián Prada iba a hundir El Faro. Le pidió a la proveedora extracto de almendra amarga, que quedó en la bodega junto a las harinas; a las 20:32 intentó convencer a Julián en la terraza y no lo logró. A las 21:48 entró a la cocina, cambió el emplatado de la tarta de la mesa 7 —el sous-chef lo notó— y a las 21:47 le escribió a la mesera que esa tarta la llevaba ella misma. A las 23:10 le pidió a la proveedora que borrara lo del extracto.\n\n" +
    "El chef y el sous-chef estaban en la cocina porque cocinaban; la mesera recogía los postres; el crítico rival solo pidió lomo y oporto, y fue quien notó que Julián estaba pálido.",
};
