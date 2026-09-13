/**
 * Caso 2: el último acorde.
 *
 * El vocalista de una banda muere envenenado en su camerino al cerrar la gira.
 * Las pruebas: tarjetas de acceso a las puertas del estadio, los mensajes de
 * esa noche, las compras de la cafetería y las cuentas de la gira. La asesina
 * es Sofía Restrepo, la productora, que cobraba el seguro de vida del cantante.
 */

import { columnasSeparadas, consejoPK, separadoPor, tieneFK, tienePK } from "./chequeos";
import type { Caso } from "./tipos";

const BASE = "caso_concierto";

const SCRIPT = `
CREATE DATABASE ${BASE};
USE ${BASE};

CREATE TABLE persona (
  id_persona INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  apellido VARCHAR(40) NOT NULL,
  rol VARCHAR(40) NOT NULL,
  contacto VARCHAR(90) NOT NULL
);

INSERT INTO persona (nombre, apellido, rol, contacto) VALUES
  ('Daniel', 'Arango Cortés', 'Vocalista', 'daniel.arango@nocturnos.co | 3105550101'),
  ('Julián', 'Mesa Toro', 'Guitarrista', 'julian.mesa@nocturnos.co | 3125550202'),
  ('Sofía', 'Restrepo Ángel', 'Productora', 'sofia@restrepoproducciones.com | 3005554471'),
  ('Camilo', 'Ríos Puerta', 'Representante', 'camilo.rios@nocturnos.co | 3155550404'),
  ('Renata', 'Gil Ospina', 'Corista', 'renata.gil@nocturnos.co | 3185550505'),
  ('Bruno', 'Salazar Peña', 'Técnico de sonido', 'bruno.salazar@sonidovivo.co | 3115550606'),
  ('Elena', 'Cortés Marín', 'Periodista', 'elena.cortes@elritmo.co | 3135550707'),
  ('Gabriel', 'Torres Nieto', 'Jefe de seguridad', 'gabriel.torres@estadio.co | 3165550808');

CREATE TABLE ingreso (
  id_ingreso INT AUTO_INCREMENT PRIMARY KEY,
  id_persona INT NOT NULL,
  puerta VARCHAR(40) NOT NULL,
  hora VARCHAR(5) NOT NULL,
  FOREIGN KEY (id_persona) REFERENCES persona(id_persona)
);

INSERT INTO ingreso (id_persona, puerta, hora) VALUES
  (8, 'Entrada de artistas', '19:00'),
  (6, 'Entrada de artistas', '19:05'),
  (6, 'Cabina de sonido', '19:10'),
  (3, 'Entrada de artistas', '19:20'),
  (4, 'Entrada de artistas', '19:25'),
  (1, 'Entrada de artistas', '19:30'),
  (2, 'Entrada de artistas', '19:32'),
  (5, 'Entrada de artistas', '19:35'),
  (1, 'Camerino', '19:40'),
  (7, 'Entrada de artistas', '19:50'),
  (3, 'Camerino', '20:00'),
  (4, 'Cafetería', '20:10'),
  (7, 'Cafetería', '20:15'),
  (1, 'Escenario', '20:25'),
  (2, 'Escenario', '20:26'),
  (5, 'Escenario', '20:27'),
  (3, 'Cafetería', '20:40'),
  (8, 'Salida trasera', '21:00'),
  (4, 'Camerino', '21:15'),
  (7, 'Cabina de sonido', '21:30'),
  (6, 'Camerino', '21:50'),
  (6, 'Cabina de sonido', '21:55'),
  (3, 'Cafetería', '22:05'),
  (8, 'Escenario', '22:20'),
  (1, 'Camerino', '22:34'),
  (2, 'Cafetería', '22:36'),
  (3, 'Camerino', '22:41'),
  (5, 'Camerino', '22:47'),
  (2, 'Camerino', '22:52'),
  (4, 'Cafetería', '22:56'),
  (8, 'Camerino', '23:05'),
  (6, 'Camerino', '23:08'),
  (4, 'Camerino', '23:10'),
  (7, 'Salida trasera', '23:15'),
  (3, 'Salida trasera', '23:20'),
  (8, 'Entrada de artistas', '23:30');

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
  (4, 1, '19:45', 'Después del show firmamos la renovación, ya está todo listo.'),
  (1, 4, '19:50', 'No voy a firmar nada, Camilo. Ya lo decidí.'),
  (3, 4, '19:55', 'Daniel no puede irse ahora, la gira se hunde sin él.'),
  (6, 1, '21:50', 'Te dejé la botella de agua de siempre en el camerino.'),
  (1, 6, '21:52', 'Gracias, Bruno. Como siempre.'),
  (3, 6, '22:20', '¿Ya dejaste la botella en el camerino? Necesito hablar con Daniel a solas.'),
  (6, 3, '22:22', 'Sí, desde las 21:50. El camerino queda vacío hasta que termine el bis.'),
  (7, 1, '22:00', 'Prima, ¿la entrevista de mañana sigue en pie?'),
  (1, 7, '22:03', 'Sigue. Tengo algo que contarte sobre la productora.'),
  (5, 1, '22:31', 'Estuviste increíble esta noche.'),
  (3, 1, '22:38', 'Sube a firmar antes de que te arrepientas. Voy al camerino.'),
  (2, 1, '22:45', 'Daniel, ¿estás en el camerino? Necesito la guitarra que dejaste.'),
  (5, 2, '22:50', 'Entré un segundo y estaba dormido en el sofá, no quise despertarlo.'),
  (2, 5, '22:51', 'Voy a entrar de todas formas, necesito la guitarra.'),
  (4, 3, '22:55', '¿Firmó?'),
  (3, 4, '22:57', 'Ya no hace falta que firme.'),
  (8, 4, '23:06', 'Venga al camerino YA. Llame a una ambulancia.'),
  (4, 8, '23:07', 'Voy.'),
  (7, 8, '23:12', '¿Qué pasó? No me dejan pasar.'),
  (3, 6, '23:20', 'Borra el mensaje de la botella.'),
  (6, 3, '23:22', 'No voy a borrar nada.'),
  (5, 7, '23:30', 'Estoy en la cafetería, ven.');

-- A propósito sin llave foránea: la pista 4 pide ponerla.
CREATE TABLE compra (
  id_compra INT AUTO_INCREMENT PRIMARY KEY,
  id_persona INT NOT NULL,
  producto VARCHAR(30) NOT NULL,
  cantidad INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  hora VARCHAR(5) NOT NULL
);

INSERT INTO compra (id_persona, producto, cantidad, total, hora) VALUES
  (8, 'Café', 1, 4500.00, '19:02'),
  (6, 'Gaseosa', 1, 5000.00, '19:12'),
  (5, 'Agua', 1, 3000.00, '19:38'),
  (4, 'Café', 1, 4500.00, '20:12'),
  (7, 'Sándwich', 1, 12000.00, '20:16'),
  (7, 'Café', 2, 9000.00, '20:17'),
  (3, 'Agua', 2, 6000.00, '20:42'),
  (3, 'Café', 1, 4500.00, '20:43'),
  (7, 'Agua', 1, 3000.00, '21:00'),
  (8, 'Gaseosa', 2, 10000.00, '21:02'),
  (3, 'Agua', 1, 3000.00, '22:06'),
  (3, 'Agua', 1, 3000.00, '22:07'),
  (2, 'Cerveza', 2, 16000.00, '22:37'),
  (2, 'Sándwich', 1, 12000.00, '22:38'),
  (4, 'Sándwich', 2, 24000.00, '22:57'),
  (4, 'Agua', 1, 3000.00, '22:58'),
  (7, 'Café', 1, 4500.00, '23:31'),
  (5, 'Café', 1, 4500.00, '23:32');

-- A propósito sin llave primaria: la pista 3 pide decidir cuál columna lo es.
CREATE TABLE presentacion (
  codigo_show VARCHAR(8) NOT NULL,
  ciudad VARCHAR(40) NOT NULL,
  fecha DATE NOT NULL,
  asistentes INT NOT NULL,
  recaudo DECIMAL(14,2) NOT NULL
);

INSERT INTO presentacion (codigo_show, ciudad, fecha, asistentes, recaudo) VALUES
  ('NOC-01', 'Bogotá', '2026-06-05', 12000, 960000000.00),
  ('NOC-02', 'Bogotá', '2026-06-05', 8500, 680000000.00),
  ('NOC-03', 'Medellín', '2026-06-12', 11000, 880000000.00),
  ('NOC-04', 'Cali', '2026-06-19', 9000, 720000000.00),
  ('NOC-05', 'Barranquilla', '2026-06-26', 7800, 624000000.00),
  ('NOC-06', 'Bucaramanga', '2026-07-03', 6500, 520000000.00),
  ('NOC-07', 'Pereira', '2026-07-10', 5200, 416000000.00),
  ('NOC-08', 'Cartagena', '2026-07-17', 6100, 488000000.00),
  ('NOC-09', 'Manizales', '2026-07-24', 4300, 344000000.00),
  ('NOC-10', 'Medellín', '2026-07-31', 6500, 455000000.00),
  ('NOC-11', 'Cali', '2026-08-07', 3900, 312000000.00),
  ('NOC-12', 'Bogotá', '2026-09-12', 4700, 376000000.00);
`;

export const CASO_CONCIERTO: Caso = {
  id: "concierto",
  titulo: "El último acorde",
  subtitulo: "Un vocalista, una botella de agua y ocho personas con acceso al camerino.",
  base: BASE,
  apertura:
    "Sábado, 23:05. La banda Los Nocturnos acaba de cerrar su gira en el estadio de Bogotá. Después del bis, el vocalista Daniel Arango subió a su camerino y no volvió a salir. El jefe de seguridad lo encuentra en el sofá, sin pulso, con la botella de agua a medio tomar en la mano. Huele a almendras amargas: cianuro.\n\n" +
    "Las puertas del estadio se abren con tarjeta y cada pasada queda registrada. El grupo de chat de la gira guardó todos los mensajes de la noche, la cafetería tiene sus ventas y la productora, las cuentas de los doce conciertos. Todo está en la base de datos «caso_concierto». El detective necesita a alguien que sepa preguntarle.",
  script: SCRIPT,
  pistas: [
    {
      id: "entrar",
      titulo: "El expediente",
      relato:
        "El servidor del estadio tiene la base de datos del caso, pero nadie ha entrado en ella todavía. Sin eso, ninguna consulta sabe de qué tablas hablas.",
      tarea: "Entra a la base de datos caso_concierto.",
      herramientas: ["USE"],
      comprobar: {
        tipo: "estado",
        cumple: (e) => e.servidor.activa?.toLowerCase() === BASE,
      },
      hallazgo:
        "Cinco tablas: persona, ingreso, mensaje, compra y presentacion. La noche entera está ahí, fila por fila.",
    },
    {
      id: "equipo",
      titulo: "La gira",
      relato:
        "Ocho personas tenían tarjeta de acceso esa noche: los tres músicos, la productora, el representante, el técnico de sonido, una periodista y el jefe de seguridad.",
      tarea: "Muestra la lista completa de personas, con todas sus columnas.",
      herramientas: ["SELECT", "FROM"],
      exige: ["SELECT"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT id_persona, nombre, apellido, rol FROM persona;",
      },
      hallazgo:
        "La víctima es Daniel Arango Cortés, id 1. Fíjate en la columna contacto: correo y teléfono metidos en la misma celda. Eso va a estorbar más adelante.",
    },
    {
      id: "llave",
      titulo: "Doce conciertos sin identificar",
      relato:
        "La productora entregó la tabla presentacion con los doce conciertos de la gira, pero sin llave primaria. Hay dos funciones el mismo día en la misma ciudad y dos con el mismo número de asistentes: el detective necesita poder señalar un concierto sin confundirlo con otro.",
      tarea:
        "Mira las columnas de presentacion, decide cuál identifica cada concierto sin repetirse nunca, y declárala como llave primaria.",
      herramientas: ["ALTER TABLE", "ADD PRIMARY KEY"],
      comprobar: {
        tipo: "estado",
        cumple: (e) => tienePK(e, BASE, "presentacion", "codigo_show"),
        consejo: (e) =>
          consejoPK(
            e,
            BASE,
            "presentacion",
            "codigo_show",
            "Que un valor no se repita hoy no lo vuelve identificador: mañana dos conciertos pueden recaudar lo mismo. El código del show existe justamente para eso.",
          ),
      },
      hallazgo:
        "codigo_show es la llave: fue creada para identificar, no para describir. Ciudad, fecha, asistentes y recaudo pueden repetirse; el código no.",
    },
    {
      id: "foranea",
      titulo: "Compras de un fantasma",
      relato:
        "La cafetería del estadio exportó sus ventas en la tabla compra, pero sin llave foránea: id_persona es un número suelto que podría apuntar a alguien que no existe. Para usar esas compras como prueba, cada una tiene que señalar a una persona real.",
      tarea:
        "Declara en la tabla compra la llave foránea que conecta su columna id_persona con la tabla persona.",
      herramientas: ["ALTER TABLE", "ADD FOREIGN KEY", "REFERENCES"],
      comprobar: {
        tipo: "estado",
        cumple: (e) => tieneFK(e, BASE, "compra", "id_persona", "persona"),
      },
      hallazgo:
        "Ahora ninguna compra puede quedar huérfana: las dieciocho apuntan a alguien de la lista. Ya se puede seguir el rastro de lo que compró cada uno.",
    },
    {
      id: "atomico",
      titulo: "Correo y teléfono",
      relato:
        "El celular de Daniel registró una llamada perdida a las 22:40, pero solo tenemos el número. Para cruzarlo con la tabla persona hace falta una columna de teléfono, y ahí el teléfono va pegado al correo dentro de contacto, separados por una barra: no es atómico.",
      tarea:
        "Agrega a persona las columnas correo y telefono, y llénalas para las ocho personas: a la izquierda de la barra ' | ' va el correo y a la derecha el teléfono.",
      herramientas: ["ALTER TABLE", "ADD", "UPDATE", "SET", "WHERE"],
      comprobar: {
        tipo: "estado",
        cumple: (e) =>
          columnasSeparadas(
            e,
            BASE,
            "persona",
            "contacto",
            [["correo", "email"], ["telefono", "celular"]],
            separadoPor("|"),
          ),
      },
      hallazgo:
        "Ocho correos y ocho teléfonos, cada uno en su columna. Ahora sí se puede buscar por número.",
    },
    {
      id: "camerino",
      titulo: "Quién entró al camerino",
      relato:
        "El forense sitúa la muerte entre las 22:35 y las 23:00. Daniel pasó su tarjeta en el camerino a las 22:34. El camerino tiene una sola puerta y cada pasada de tarjeta quedó en la tabla ingreso.",
      tarea:
        "Muestra el id de la persona y la hora de cada pasada por la puerta 'Camerino' entre las '22:35' y las '23:00'.",
      herramientas: ["WHERE", "AND", "BETWEEN"],
      exige: ["WHERE", "BETWEEN"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_persona, hora FROM ingreso WHERE puerta = 'Camerino' AND hora BETWEEN '22:35' AND '23:00';",
      },
      hallazgo:
        "Tres personas: Sofía Restrepo (3) a las 22:41, Renata Gil (5) a las 22:47 y Julián Mesa (2) a las 22:52. El jefe de seguridad entró a las 23:05, ya fuera del rango, y lo encontró.",
    },
    {
      id: "botella",
      titulo: "La botella",
      relato:
        "El veneno estaba en la botella de agua. Daniel solo tomaba de la que el técnico de sonido le dejaba en el camerino antes de cada show. Alguien tuvo que saber eso. El chat de la gira está en la tabla mensaje.",
      tarea:
        "Muestra id_emisor, id_receptor y texto de los mensajes en cuyo texto aparezca la palabra botella.",
      herramientas: ["WHERE", "LIKE"],
      exige: ["WHERE", "LIKE"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_emisor, id_receptor, texto FROM mensaje WHERE texto LIKE '%botella%';",
      },
      hallazgo:
        "Tres mensajes. Bruno (6) avisa a Daniel a las 21:50 que le dejó la botella. A las 22:20 la persona 3 le pregunta a Bruno si ya la dejó. Y a las 23:20, con Daniel muerto, la 3 le pide a Bruno que borre ese mensaje.",
    },
    {
      id: "mensajes",
      titulo: "Lo que le escribieron a Daniel",
      relato:
        "Tres personas entraron al camerino en la hora de la muerte: la 2, la 3 y la 5. El detective quiere leer exactamente lo que cada una le escribió a Daniel esa noche.",
      tarea:
        "Muestra id_emisor, hora y texto de los mensajes enviados por las personas 2, 3 o 5 cuyo receptor sea la persona 1.",
      herramientas: ["WHERE", "IN", "AND"],
      exige: ["WHERE", "IN", "AND"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_emisor, hora, texto FROM mensaje WHERE id_emisor IN (2, 3, 5) AND id_receptor = 1;",
      },
      hallazgo:
        "Renata lo felicita a las 22:31. Julián le pide la guitarra a las 22:45. Y la persona 3, a las 22:38: «Sube a firmar antes de que te arrepientas. Voy al camerino». Tres minutos después pasó su tarjeta.",
    },
    {
      id: "contrato",
      titulo: "El contrato",
      relato:
        "Daniel iba a dejar la banda: se lo dijo a su representante en el primer mensaje de la noche. Sin vocalista no hay gira, y sin gira dos personas pierden su negocio: la que produce y la que representa.",
      tarea:
        "Muestra nombre, apellido y rol de las personas cuyo rol sea 'Productora' o 'Representante'.",
      herramientas: ["WHERE", "OR"],
      exige: ["WHERE", "OR"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT nombre, apellido, rol FROM persona WHERE rol = 'Productora' OR rol = 'Representante';",
      },
      hallazgo:
        "Sofía Restrepo, productora, y Camilo Ríos, representante. Camilo estaba en la cafetería a la hora de la muerte; Sofía, en el camerino.",
    },
    {
      id: "parentesis",
      titulo: "Cafetería y camerino",
      relato:
        "La botella del camerino era de la cafetería. Quien la cambió tuvo que pasar por la cafetería y después por el camerino, ya entrada la noche. Ojo: una condición es «esto o aquello» y la otra es obligatoria; piensa en qué orden se evalúan.",
      tarea:
        "Muestra id_persona, puerta y hora de las pasadas por la puerta 'Camerino' o por la puerta 'Cafetería' ocurridas a partir de las '22:00' (incluida).",
      herramientas: ["WHERE", "OR", "AND", "( )", ">="],
      exige: ["WHERE", "OR", "AND"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_persona, puerta, hora FROM ingreso WHERE (puerta = 'Camerino' OR puerta = 'Cafetería') AND hora >= '22:00';",
      },
      hallazgo:
        "Diez pasadas. Dos personas hicieron el recorrido cafetería → camerino antes de las 23:00: la 2 (22:36 y 22:52) y la 3 (22:05 y 22:41). Si te salieron más de diez filas, faltaron los paréntesis. Falta ver cuál de las dos compró agua.",
    },
    {
      id: "telefono",
      titulo: "La llamada perdida",
      relato:
        "Volvemos al celular de Daniel: la llamada perdida de las 22:40 venía de un número que termina en 4471. Ya tienes la columna telefono para buscarlo.",
      tarea: "Muestra nombre y apellido de la persona cuyo teléfono termina en 4471.",
      herramientas: ["WHERE", "LIKE"],
      exige: ["WHERE", "LIKE"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT nombre, apellido FROM persona WHERE contacto LIKE '%4471';",
      },
      hallazgo:
        "Sofía Restrepo Ángel. Lo llamó a las 22:40, un minuto antes de entrar al camerino: quería saber si ya se había tomado el agua.",
    },
    {
      id: "recaudo",
      titulo: "Las cuentas de la gira",
      relato:
        "«Cuando no entiendas un crimen, mira quién cobra», repite el detective. La tabla presentacion tiene el recaudo de cada concierto. Vale la pena ver cómo le fue a la gira.",
      tarea: "Muestra ciudad, fecha y recaudo de todas las presentaciones, del recaudo más alto al más bajo.",
      herramientas: ["ORDER BY", "DESC"],
      exige: ["ORDER BY"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT ciudad, fecha, recaudo FROM presentacion ORDER BY recaudo DESC;",
        ordenado: true,
      },
      hallazgo:
        "Los primeros conciertos recaudaron casi mil millones; los últimos, poco más de trescientos. La gira se venía abajo, y la productora había asegurado la vida del vocalista por dos mil millones.",
    },
    {
      id: "vacios",
      titulo: "Los dos conciertos más vacíos",
      relato:
        "Para el informe, el detective no quiere los doce conciertos: solo los dos con menos público, que son los que hundieron la gira.",
      tarea:
        "Muestra ciudad, fecha y asistentes de los dos conciertos con menos asistentes, del más vacío al menos vacío.",
      herramientas: ["ORDER BY", "ASC", "LIMIT"],
      exige: ["ORDER BY", "LIMIT"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT ciudad, fecha, asistentes FROM presentacion ORDER BY asistentes ASC LIMIT 2;",
        ordenado: true,
      },
      hallazgo:
        "Cali con 3.900 y Manizales con 4.300: menos de la mitad del primer concierto de Bogotá. Con esas cifras, la productora no podía pagar la deuda de la gira.",
    },
    {
      id: "agua",
      titulo: "Quién compró agua",
      relato:
        "La botella del camerino no era la de Bruno: era una de la cafetería, de la misma marca. Alguien compró agua esa noche para cambiarla. Las ventas están en la tabla compra.",
      tarea:
        "Cuenta cuántas compras del producto 'Agua' hizo cada persona: muestra id_persona y el total de compras de esa persona.",
      herramientas: ["COUNT", "GROUP BY", "WHERE"],
      exige: ["COUNT", "GROUP BY", "WHERE"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_persona, COUNT(*) FROM compra WHERE producto = 'Agua' GROUP BY id_persona;",
      },
      hallazgo:
        "Cuatro personas compraron agua, pero solo la 3 lo hizo tres veces: a las 20:42 (dos botellas), a las 22:06 y a las 22:07. Las dos últimas, justo antes del bis, cuando el camerino estaba vacío.",
    },
    {
      id: "gasto",
      titulo: "Cuánto gastó cada uno",
      relato:
        "El detective quiere ver el gasto completo de la noche por persona, no solo el agua. La columna total ya trae el valor de cada compra; falta sumarlo por persona.",
      tarea: "Muestra id_persona y la suma de total de todas las compras de esa persona.",
      herramientas: ["SUM", "GROUP BY"],
      exige: ["SUM", "GROUP BY"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT id_persona, SUM(total) FROM compra GROUP BY id_persona;",
      },
      hallazgo:
        "Siete personas compraron algo. Los que más gastaron fueron Camilo (31.500) y Elena (28.500), en sándwiches y café. Sofía gastó 16.500, y 12.000 de ellos fueron en agua. Julián, en cambio, compró cerveza y un sándwich: ni una botella.",
    },
    {
      id: "charlatanes",
      titulo: "Quién escribió más",
      relato:
        "Veintidós mensajes en una noche. El detective quiere saber quién no soltó el celular, pero solo le interesa quien pasó de tres mensajes. Ojo: el total de mensajes no existe hasta que se agrupa, así que el filtro de siempre no lo ve.",
      tarea:
        "Muestra id_emisor y el total de mensajes únicamente de las personas que enviaron más de 3 mensajes.",
      herramientas: ["COUNT", "GROUP BY", "HAVING"],
      exige: ["GROUP BY", "HAVING"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_emisor, COUNT(*) FROM mensaje GROUP BY id_emisor HAVING COUNT(*) > 3;",
      },
      hallazgo:
        "Una sola persona: la 3, con cinco mensajes. Dos de ellos después de las 22:50, cuando Daniel ya no respondía.",
    },
    {
      id: "gira",
      titulo: "El total de la gira",
      relato:
        "Falta un número para cerrar el motivo. Si la gira recaudó menos de lo que costó, la póliza de dos mil millones era la única salida de la productora.",
      tarea:
        "Muestra la suma del recaudo de todas las presentaciones y el número de asistentes más bajo que tuvo un concierto.",
      herramientas: ["SUM", "MIN"],
      exige: ["SUM", "MIN"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT SUM(recaudo), MIN(asistentes) FROM presentacion;",
      },
      hallazgo:
        "6.775 millones en doce conciertos, con un mínimo de 3.900 asistentes en Cali. La gira costó 7.400 millones: perdía dinero, y Daniel se iba.",
    },
    {
      id: "puerta",
      titulo: "El camerino, con nombres",
      relato:
        "«Deje de hablarme de números», dice el detective. Quiere la lista completa de pasadas por el camerino, pero con el nombre y el apellido de cada persona junto a la hora. El nombre no está en la tabla ingreso.",
      tarea:
        "Muestra nombre, apellido y hora de cada pasada por la puerta 'Camerino', en orden de hora.",
      herramientas: ["INNER JOIN", "ON", "WHERE", "ORDER BY"],
      exige: ["JOIN", "ON", "ORDER BY"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT p.nombre, p.apellido, i.hora FROM ingreso i INNER JOIN persona p ON i.id_persona = p.id_persona WHERE i.puerta = 'Camerino' ORDER BY i.hora;",
        ordenado: true,
      },
      hallazgo:
        "Once pasadas, ya con nombre. Se lee de corrido: Bruno deja la botella a las 21:50, Daniel sube a las 22:34, Sofía entra a las 22:41, Renata a las 22:47, Julián a las 22:52 y Gabriel lo encuentra a las 23:05.",
    },
    {
      id: "ciudades",
      titulo: "Cuántas ciudades",
      relato:
        "Doce conciertos no son doce ciudades: Bogotá tuvo tres y Medellín y Cali dos cada una. Para el informe hace falta cuántas ciudades diferentes recorrió la gira, sin contar dos veces ninguna.",
      tarea: "Cuenta cuántas ciudades distintas aparecen en la tabla presentacion.",
      herramientas: ["COUNT", "DISTINCT"],
      exige: ["COUNT", "DISTINCT"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT COUNT(DISTINCT ciudad) FROM presentacion;",
      },
      hallazgo:
        "Ocho ciudades. La gira volvió a las grandes buscando recuperar plata, y aun así los últimos conciertos fueron los más flojos.",
    },
    {
      id: "remitentes",
      titulo: "Lo que recibió Daniel, con nombre",
      relato:
        "Última lectura antes de acusar. El detective quiere todos los mensajes que recibió Daniel esa noche, pero con el nombre de quien los envió, no con su número.",
      tarea:
        "Muestra el nombre del emisor, la hora y el texto de los mensajes cuyo receptor sea la persona 1.",
      herramientas: ["INNER JOIN", "ON", "WHERE"],
      exige: ["JOIN", "ON", "WHERE"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT p.nombre, m.hora, m.texto FROM mensaje m INNER JOIN persona p ON m.id_emisor = p.id_persona WHERE m.id_receptor = 1;",
      },
      hallazgo:
        "Seis mensajes: Camilo, Bruno, Elena, Renata, Sofía y Julián. El de Sofía, a las 22:38, es el único que le pide subir al camerino.",
    },
    {
      id: "culpable",
      titulo: "Solo hay una verdad",
      relato:
        "La hora, la puerta, los mensajes, la llamada, el agua y el seguro. El detective se ajusta las gafas y espera tu respuesta.",
      tarea: "Escribe el nombre de quien envenenó al vocalista.",
      herramientas: [],
      comprobar: {
        tipo: "culpable",
        aceptados: [
          "Sofía Restrepo Ángel",
          "Sofía Restrepo",
          "Restrepo",
          "Sofía",
          "Restrepo Ángel",
          "3",
        ],
      },
      hallazgo: "",
    },
  ],
  culpable: "Sofía Restrepo Ángel",
  resolucion:
    "Sofía Restrepo, la productora, sabía que la gira perdía dinero y que Daniel no iba a renovar. Tenía una póliza de vida sobre el vocalista por dos mil millones. Esa noche le preguntó a Bruno por la botella para confirmar que ya estaba en el camerino, compró agua en la cafetería a las 22:06 y 22:07, entró al camerino vacío durante el bis y cambió la botella por una con cianuro. A las 22:38 le escribió a Daniel que subiera; a las 22:40 lo llamó, y a las 22:41 pasó su tarjeta para asegurarse de que se la hubiera tomado. Cuando Camilo le preguntó «¿Firmó?», respondió: «Ya no hace falta que firme». A las 23:20 intentó que Bruno borrara el mensaje de la botella.\n\n" +
    "Renata subió a felicitarlo y lo vio dormido en el sofá; Julián entró a buscar la guitarra y pensó lo mismo. Ninguno de los dos tenía un seguro que cobrar.",
};
