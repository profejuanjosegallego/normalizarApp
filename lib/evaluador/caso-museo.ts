/**
 * Caso 1: la gala del museo.
 *
 * Un curador aparece muerto durante la inauguracion de una exposicion egipcia.
 * Las pruebas estan en la base de datos del museo: registros de acceso a las
 * salas, llamadas, pagos y el inventario de piezas. La asesina es Helena
 * Villamizar, la anticuaria que le vendio al museo una mascara falsa.
 */

import { columnasSeparadas, consejoPK, primeraYResto, tieneFK, tienePK } from "./chequeos";
import type { Caso } from "./tipos";

const BASE = "caso_museo";

const SCRIPT = `
CREATE DATABASE ${BASE};
USE ${BASE};

CREATE TABLE persona (
  id_persona INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo VARCHAR(80) NOT NULL,
  edad INT,
  ocupacion VARCHAR(40),
  ciudad VARCHAR(40)
);

INSERT INTO persona (nombre_completo, edad, ocupacion, ciudad) VALUES
  ('Ricardo Salcedo Peña', 58, 'Curador', 'Bogotá'),
  ('Valeria Ortiz Mena', 41, 'Restauradora', 'Medellín'),
  ('Tomás Vargas Ruiz', 35, 'Guardia de seguridad', 'Bogotá'),
  ('Helena Villamizar Cano', 47, 'Anticuaria', 'Cartagena'),
  ('Andrés Molina Soto', 29, 'Periodista', 'Cali'),
  ('Camila Duarte Rojas', 33, 'Perito de seguros', 'Bogotá'),
  ('Sebastián Ferrer Lima', 52, 'Coleccionista', 'Cartagena'),
  ('Lucía Navarro Prieto', 38, 'Directora del museo', 'Bogotá'),
  ('Mateo Quintero Díaz', 26, 'Guía turístico', 'Medellín'),
  ('Isabel Vidal Prada', 44, 'Anticuaria', 'Cali');

CREATE TABLE acceso (
  id_acceso INT AUTO_INCREMENT PRIMARY KEY,
  id_persona INT NOT NULL,
  sala VARCHAR(40) NOT NULL,
  hora VARCHAR(5) NOT NULL,
  FOREIGN KEY (id_persona) REFERENCES persona(id_persona)
);

INSERT INTO acceso (id_persona, sala, hora) VALUES
  (1, 'Vestíbulo', '20:00'),
  (8, 'Vestíbulo', '20:02'),
  (3, 'Vestíbulo', '20:05'),
  (2, 'Vestíbulo', '20:10'),
  (6, 'Vestíbulo', '20:12'),
  (4, 'Vestíbulo', '20:15'),
  (5, 'Vestíbulo', '20:18'),
  (7, 'Vestíbulo', '20:20'),
  (9, 'Vestíbulo', '20:22'),
  (10, 'Vestíbulo', '20:25'),
  (1, 'Salón principal', '20:30'),
  (8, 'Salón principal', '20:31'),
  (4, 'Salón principal', '20:35'),
  (7, 'Salón principal', '20:36'),
  (6, 'Sala Egipcia', '20:40'),
  (9, 'Sala Egipcia', '20:45'),
  (2, 'Depósito', '20:50'),
  (3, 'Depósito', '20:55'),
  (5, 'Salón principal', '21:00'),
  (6, 'Salón principal', '21:10'),
  (9, 'Sala Egipcia', '21:15'),
  (5, 'Sala Egipcia', '21:20'),
  (10, 'Sala Egipcia', '21:25'),
  (3, 'Vestíbulo', '21:30'),
  (4, 'Terraza', '21:40'),
  (1, 'Terraza', '21:45'),
  (7, 'Terraza', '21:50'),
  (10, 'Salón principal', '21:55'),
  (8, 'Salón principal', '22:00'),
  (1, 'Sala Egipcia', '22:05'),
  (3, 'Sala Egipcia', '22:12'),
  (9, 'Terraza', '22:20'),
  (4, 'Sala Egipcia', '22:25'),
  (7, 'Sala Egipcia', '22:33'),
  (2, 'Sala Egipcia', '22:38'),
  (4, 'Terraza', '22:42'),
  (8, 'Sala Egipcia', '22:46'),
  (5, 'Sala Egipcia', '22:50'),
  (3, 'Vestíbulo', '22:55'),
  (6, 'Sala Egipcia', '23:05');

-- A propósito sin llave primaria: la pista 3 pide ponerla.
CREATE TABLE llamada (
  id_llamada INT NOT NULL,
  id_origen INT NOT NULL,
  id_destino INT NOT NULL,
  hora VARCHAR(5) NOT NULL,
  duracion_seg INT,
  FOREIGN KEY (id_origen) REFERENCES persona(id_persona),
  FOREIGN KEY (id_destino) REFERENCES persona(id_persona)
);

INSERT INTO llamada (id_llamada, id_origen, id_destino, hora, duracion_seg) VALUES
  (1, 4, 1, '20:15', 300),
  (2, 2, 8, '20:28', 60),
  (3, 7, 10, '20:50', 120),
  (4, 4, 1, '21:40', 95),
  (5, 5, 9, '21:05', 40),
  (6, 3, 8, '21:32', 25),
  (7, 9, 5, '21:12', 30),
  (8, 6, 8, '21:18', 210),
  (9, 8, 3, '21:35', 15),
  (10, 4, 1, '22:02', 45),
  (11, 7, 10, '22:10', 80),
  (12, 2, 1, '21:58', 20),
  (13, 10, 7, '22:10', 60),
  (14, 4, 10, '22:48', 180),
  (15, 8, 3, '22:47', 12),
  (16, 3, 8, '22:49', 30),
  (17, 4, 10, '23:05', 240),
  (18, 5, 6, '22:55', 90),
  (19, 6, 5, '23:05', 45),
  (20, 9, 8, '22:30', 35);

-- A propósito sin llave foránea: la pista 4 pide ponerla.
CREATE TABLE pago (
  id_pago INT AUTO_INCREMENT PRIMARY KEY,
  id_persona INT NOT NULL,
  concepto VARCHAR(60) NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  fecha DATE NOT NULL
);

INSERT INTO pago (id_persona, concepto, monto, fecha) VALUES
  (4, 'Compra máscara funeraria', 48000000.00, '2026-07-10'),
  (4, 'Asesoría de autenticidad', 9000000.00, '2026-06-02'),
  (4, 'Asesoría de catálogo', 6500000.00, '2026-08-15'),
  (7, 'Compra vasija canópica', 12000000.00, '2026-05-20'),
  (2, 'Restauración de papiro', 4200000.00, '2026-06-30'),
  (2, 'Restauración de estatuilla', 1900000.00, '2026-08-01'),
  (6, 'Peritaje de seguros', 3800000.00, '2026-07-25'),
  (10, 'Compra escarabajo de lapislázuli', 6000000.00, '2026-04-11'),
  (10, 'Compra collar de fayenza', 4000000.00, '2026-04-11'),
  (9, 'Visitas guiadas de julio', 900000.00, '2026-07-31'),
  (9, 'Visitas guiadas de agosto', 950000.00, '2026-08-31'),
  (3, 'Turno extra', 350000.00, '2026-08-09'),
  (3, 'Turno extra', 350000.00, '2026-08-23'),
  (3, 'Turno extra', 350000.00, '2026-09-06'),
  (5, 'Reportaje para el catálogo', 1500000.00, '2026-08-20'),
  (8, 'Reembolso de viaje', 2300000.00, '2026-07-02');

CREATE TABLE pieza (
  id_pieza INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  sala VARCHAR(40) NOT NULL,
  valor_estimado DECIMAL(12,2) NOT NULL,
  id_vendedor INT,
  autenticada VARCHAR(2) NOT NULL,
  FOREIGN KEY (id_vendedor) REFERENCES persona(id_persona)
);

INSERT INTO pieza (nombre, sala, valor_estimado, id_vendedor, autenticada) VALUES
  ('Máscara funeraria de Amenhotep', 'Sala Egipcia', 48000000.00, 4, 'no'),
  ('Vasija canópica', 'Sala Egipcia', 12000000.00, 7, 'sí'),
  ('Papiro del Libro de los Muertos', 'Sala Egipcia', 15000000.00, NULL, 'sí'),
  ('Escarabajo de lapislázuli', 'Sala Egipcia', 6000000.00, 10, 'sí'),
  ('Estatuilla de Anubis', 'Sala Egipcia', 9000000.00, NULL, 'sí'),
  ('Collar de fayenza', 'Sala Egipcia', 4000000.00, 10, 'sí'),
  ('Retrato colonial', 'Salón principal', 7000000.00, NULL, 'sí'),
  ('Espada toledana', 'Salón principal', 5500000.00, NULL, 'sí'),
  ('Mapa del siglo XVII', 'Salón principal', 3200000.00, NULL, 'sí'),
  ('Ánfora griega', 'Depósito', 8000000.00, 7, 'sí'),
  ('Moneda romana', 'Depósito', 1200000.00, NULL, 'sí'),
  ('Reloj de bolsillo', 'Depósito', 900000.00, NULL, 'no');
`;

export const CASO_MUSEO: Caso = {
  id: "museo",
  titulo: "La gala del museo",
  subtitulo: "Un curador, una máscara egipcia y diez invitados con algo que esconder.",
  base: BASE,
  apertura:
    "Sábado, 22:46. En plena inauguración de la exposición «Tesoros del Nilo», la directora del Museo Arqueológico entra a la Sala Egipcia y encuentra al curador Ricardo Salcedo tendido detrás del sarcófago. No hay heridas visibles; el forense hablará de un golpe en la nuca. La vitrina de la máscara funeraria está abierta y vacía.\n\n" +
    "La policía cerró las puertas: nadie salió del museo. El sistema de tarjetas registró cada entrada a cada sala, la central telefónica guardó las llamadas de esa noche y contabilidad tiene los pagos del año. Todo está en la base de datos «caso_museo». Tú eres quien sabe leerla.",
  script: SCRIPT,
  pistas: [
    {
      id: "entrar",
      titulo: "El expediente",
      relato:
        "El detective te entrega un computador con el servidor del museo. Hay una base de datos con el nombre del caso, pero el servidor todavía no está trabajando dentro de ella.",
      tarea: "Entra a la base de datos caso_museo para poder consultarla.",
      herramientas: ["USE"],
      comprobar: {
        tipo: "estado",
        cumple: (e) => e.servidor.activa?.toLowerCase() === BASE,
      },
      hallazgo:
        "Ya estás dentro. En el panel de la derecha ves las cinco tablas del museo: persona, acceso, llamada, pago y pieza. Todo lo que pasó esa noche dejó una fila en alguna de ellas.",
    },
    {
      id: "invitados",
      titulo: "Los invitados",
      relato:
        "Diez personas tenían tarjeta de acceso esa noche: el personal del museo, dos anticuarias, un coleccionista, un periodista y una perito de seguros. Una de ellas es la víctima; otra, la asesina.",
      tarea: "Muestra la lista completa de personas, con todas sus columnas.",
      herramientas: ["SELECT", "FROM"],
      exige: ["SELECT"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT id_persona, nombre_completo, ocupacion, ciudad FROM persona;",
      },
      hallazgo:
        "La víctima es Ricardo Salcedo Peña, id 1, el curador. Fíjate en el id de cada persona: las demás tablas hablan de ellas por ese número, no por su nombre.",
    },
    {
      id: "llave",
      titulo: "Una prueba que no vale",
      relato:
        "La central telefónica exportó las llamadas de la noche, pero la tabla llamada llegó sin llave primaria. El abogado del museo es claro: un registro donde dos filas podrían ser la misma no sirve como prueba ante un juez.",
      tarea:
        "Mira las columnas de la tabla llamada, decide cuál identifica cada llamada sin repetirse nunca, y declárala como llave primaria.",
      herramientas: ["ALTER TABLE", "ADD PRIMARY KEY"],
      comprobar: {
        tipo: "estado",
        cumple: (e) => tienePK(e, BASE, "llamada", "id_llamada"),
        consejo: (e) =>
          consejoPK(
            e,
            BASE,
            "llamada",
            "id_llamada",
            "Dos llamadas pueden empezar a la misma hora o durar lo mismo; lo único que distingue una llamada de otra es su número de registro.",
          ),
      },
      hallazgo:
        "Con id_llamada como llave primaria, cada llamada es una prueba con nombre propio. Ahora el motor tampoco dejará que se cuelen registros repetidos.",
    },
    {
      id: "foranea",
      titulo: "Pagos a nadie",
      relato:
        "Contabilidad exportó la tabla pago, pero sin llave foránea: nada obliga a que el id_persona de un pago corresponda a una persona real. El abogado vuelve a protestar: un pago «a la persona 47» no acusa a nadie.",
      tarea:
        "Declara en la tabla pago la llave foránea que conecta su columna id_persona con la tabla persona.",
      herramientas: ["ALTER TABLE", "ADD FOREIGN KEY", "REFERENCES"],
      comprobar: {
        tipo: "estado",
        cumple: (e) => tieneFK(e, BASE, "pago", "id_persona", "persona"),
      },
      hallazgo:
        "Ahora cada pago apunta a una persona que existe, y el motor no dejará borrar a nadie que tenga pagos a su nombre. Las cuentas ya son evidencia.",
    },
    {
      id: "atomico",
      titulo: "Nombre y apellido",
      relato:
        "La aduana de Cartagena manda la lista de quienes declararon piezas arqueológicas este año, pero la trae por apellido. En la tabla persona el nombre y los apellidos van juntos en nombre_completo: una sola celda con varios datos, o sea, no es atómica. Así no hay forma de cruzar las listas.",
      tarea:
        "Agrega a persona las columnas nombre y apellido, y llénalas para las diez personas: en nombre va la primera palabra de nombre_completo y en apellido todo lo demás (los dos apellidos).",
      herramientas: ["ALTER TABLE", "ADD", "UPDATE", "SET", "WHERE"],
      comprobar: {
        tipo: "estado",
        cumple: (e) =>
          columnasSeparadas(
            e,
            BASE,
            "persona",
            "nombre_completo",
            [["nombre", "nombres"], ["apellido", "apellidos"]],
            primeraYResto,
          ),
      },
      hallazgo:
        "Ahora sí: diez nombres y diez apellidos en columnas propias. En la lista de la aduana aparecen tres apellidos de esta tabla: Villamizar, Ferrer y Vidal.",
    },
    {
      id: "hora",
      titulo: "La hora de la muerte",
      relato:
        "El forense es preciso: Ricardo murió entre las 22:10 y las 22:40. El registro de tarjetas dice quién entró a cada sala y a qué hora. La Sala Egipcia tiene una sola puerta.",
      tarea:
        "Muestra el id de la persona y la hora de cada entrada a la 'Sala Egipcia' ocurrida entre las '22:10' y las '22:40'.",
      herramientas: ["WHERE", "AND", "BETWEEN"],
      exige: ["WHERE", "BETWEEN"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_persona, hora FROM acceso WHERE sala = 'Sala Egipcia' AND hora BETWEEN '22:10' AND '22:40';",
      },
      hallazgo:
        "Cuatro personas entraron en ese lapso: el guardia (3) a las 22:12, Helena Villamizar (4) a las 22:25, Sebastián Ferrer (7) a las 22:33 y Valeria Ortiz (2) a las 22:38. Ricardo había entrado a las 22:05. Los demás quedan fuera.",
    },
    {
      id: "movimientos",
      titulo: "Qué hicieron después",
      relato:
        "Cuatro sospechosos. El detective quiere saber quién se movió después de la hora de la muerte: la sala es grande y el cuerpo quedó detrás del sarcófago, así que alguien pudo salir sin que los demás lo notaran.",
      tarea:
        "Muestra id_persona, sala y hora de las entradas de las personas 2, 3, 4 o 7 a partir de las '22:40' (incluida). Usa una lista para las personas.",
      herramientas: ["WHERE", "IN", "AND", ">="],
      exige: ["WHERE", "IN", "AND"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_persona, sala, hora FROM acceso WHERE id_persona IN (2, 3, 4, 7) AND hora >= '22:40';",
      },
      hallazgo:
        "Solo dos se movieron: la persona 4 salió a la terraza a las 22:42, diecisiete minutos después de entrar, y el guardia (3) volvió al vestíbulo a las 22:55. Valeria y Sebastián seguían en la sala cuando apareció el cuerpo.",
    },
    {
      id: "llamadas",
      titulo: "Las llamadas de los cuatro",
      relato:
        "Antes de interrogarlos, el detective quiere saber a quién llamaron esa noche. En la tabla llamada, id_origen es quien llama e id_destino quien recibe.",
      tarea:
        "Muestra id_origen, id_destino y hora de todas las llamadas hechas por las personas 2, 3, 4 o 7.",
      herramientas: ["WHERE", "IN"],
      exige: ["WHERE", "IN"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_origen, id_destino, hora FROM llamada WHERE id_origen IN (2, 3, 4, 7);",
      },
      hallazgo:
        "Once llamadas. La persona 4 llamó tres veces a la víctima (1): a las 20:15, a las 21:40 y a las 22:02, tres minutos antes de que Ricardo entrara a la sala. Después de la muerte, la 4 llamó dos veces a la 10.",
    },
    {
      id: "apellido",
      titulo: "«Señora V…»",
      relato:
        "Un mesero declara que, en la terraza, oyó a Ricardo discutir con una mujer a la que llamó «señora V…»; el apellido se le perdió entre la música. Menos mal que ya separaste los apellidos.",
      tarea: "Muestra el nombre completo de las personas cuyo apellido empieza por V.",
      herramientas: ["WHERE", "LIKE"],
      exige: ["WHERE", "LIKE"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT nombre_completo FROM persona WHERE nombre_completo LIKE '% V%';",
      },
      hallazgo:
        "Tres apellidos con V: Vargas (el guardia), Villamizar y Vidal. Dos son mujeres, pero solo Helena Villamizar estuvo en la Sala Egipcia a la hora de la muerte.",
    },
    {
      id: "cartagena",
      titulo: "La máscara vino de Cartagena",
      relato:
        "La pieza que falta es la máscara funeraria de Amenhotep. Según el archivo, llegó al museo desde Cartagena hace dos meses, vendida por una anticuaria. Quien viva allá, o se dedique a eso, sabe de dónde salió.",
      tarea:
        "Muestra nombre completo, ocupación y ciudad de quienes viven en 'Cartagena' o tienen como ocupación 'Anticuaria'.",
      herramientas: ["WHERE", "OR"],
      exige: ["WHERE", "OR"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT nombre_completo, ocupacion, ciudad FROM persona WHERE ciudad = 'Cartagena' OR ocupacion = 'Anticuaria';",
      },
      hallazgo:
        "Tres nombres: Helena Villamizar (anticuaria de Cartagena), Sebastián Ferrer (coleccionista de Cartagena) e Isabel Vidal (anticuaria de Cali). Helena cumple las dos condiciones.",
    },
    {
      id: "parentesis",
      titulo: "Dos ciudades, un oficio",
      relato:
        "La aduana afina el dato: la máscara entró al país por Cartagena y pasó por una tienda de Cali antes de llegar al museo. Solo una anticuaria de cualquiera de esas dos ciudades pudo moverla. Ojo: cuando mezclas OR con AND, los paréntesis deciden qué se evalúa primero.",
      tarea:
        "Muestra nombre completo y ciudad de quienes viven en 'Cartagena' o en 'Cali' y, además, son 'Anticuaria'. Agrupa las dos ciudades entre paréntesis.",
      herramientas: ["WHERE", "OR", "AND", "( )"],
      exige: ["WHERE", "OR", "AND"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT nombre_completo, ciudad FROM persona WHERE (ciudad = 'Cartagena' OR ciudad = 'Cali') AND ocupacion = 'Anticuaria';",
      },
      hallazgo:
        "Dos anticuarias: Helena Villamizar en Cartagena e Isabel Vidal en Cali. Si te salía también Sebastián Ferrer, el OR se comía al AND: eso lo arreglan los paréntesis.",
    },
    {
      id: "dinero",
      titulo: "Sigue el dinero",
      relato:
        "«Cuando no entiendas un crimen, mira quién cobró», dice el detective. Contabilidad entregó la tabla pago con todo lo que el museo desembolsó este año.",
      tarea: "Muestra id_persona, concepto y monto de todos los pagos, del monto más alto al más bajo.",
      herramientas: ["ORDER BY", "DESC"],
      exige: ["ORDER BY"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT id_persona, concepto, monto FROM pago ORDER BY monto DESC;",
        ordenado: true,
      },
      hallazgo:
        "El pago más grande del año, 48 millones por «Compra máscara funeraria», fue a la persona 4. Y le siguen dos asesorías, también a la 4.",
    },
    {
      id: "largas",
      titulo: "Las tres llamadas más largas",
      relato:
        "Una llamada de un minuto es un saludo; una de cinco es una discusión. El detective quiere solo las tres más largas de la noche, no toda la tabla.",
      tarea:
        "Muestra id_origen, id_destino y duracion_seg de las tres llamadas más largas, de la más larga a la más corta.",
      herramientas: ["ORDER BY", "DESC", "LIMIT"],
      exige: ["ORDER BY", "LIMIT"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_origen, id_destino, duracion_seg FROM llamada ORDER BY duracion_seg DESC LIMIT 3;",
        ordenado: true,
      },
      hallazgo:
        "La más larga: cinco minutos de la persona 4 a la víctima, a las 20:15. La segunda, cuatro minutos de la 4 a Isabel Vidal a las 23:05, con Ricardo ya muerto. La tercera es de la perito a la directora.",
    },
    {
      id: "conteo",
      titulo: "Quién llamó más",
      relato:
        "Once llamadas de cuatro sospechosos es mucho ruido. El detective quiere un solo número por persona: cuántas veces marcó cada una esa noche.",
      tarea: "Cuenta cuántas llamadas hizo cada persona: muestra id_origen y el total, agrupando por quien llama.",
      herramientas: ["COUNT", "GROUP BY"],
      exige: ["COUNT", "GROUP BY"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT id_origen, COUNT(*) FROM llamada GROUP BY id_origen;",
      },
      hallazgo:
        "La persona 4 hizo cinco llamadas; nadie más pasó de dos. Tres fueron a la víctima antes de la muerte y dos a Isabel Vidal, la otra anticuaria, después.",
    },
    {
      id: "insistente",
      titulo: "Solo quien insistió",
      relato:
        "Nueve filas siguen siendo muchas. El detective quiere que la consulta misma se quede solo con quien llamó más de dos veces. Un WHERE no sirve para eso: filtra filas antes de agrupar. Para filtrar grupos ya formados hay otra palabra.",
      tarea:
        "Muestra id_origen y el total de llamadas únicamente de las personas que hicieron más de 2 llamadas.",
      herramientas: ["GROUP BY", "HAVING", "COUNT"],
      exige: ["GROUP BY", "HAVING"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT id_origen, COUNT(*) FROM llamada GROUP BY id_origen HAVING COUNT(*) > 2;",
      },
      hallazgo:
        "Una sola fila: la persona 4, con cinco llamadas. Nadie más en el museo tenía tanto que decir esa noche.",
    },
    {
      id: "suma",
      titulo: "Cuánto cobró la 4",
      relato:
        "La directora confirma que Ricardo tenía dudas sobre la máscara y pensaba pedir la devolución de todo lo pagado a quien la vendió. ¿De cuánto estamos hablando?",
      tarea: "Muestra la suma de los montos de todos los pagos hechos a la persona 4.",
      herramientas: ["SUM", "WHERE"],
      exige: ["SUM"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT SUM(monto) FROM pago WHERE id_persona = 4;",
      },
      hallazgo:
        "63.500.000 pesos entre la máscara y dos asesorías. Si la pieza resultaba falsa, Helena tenía que devolverlo todo… y responder por fraude.",
    },
    {
      id: "piezas",
      titulo: "El valor de la máscara",
      relato:
        "La tabla pieza tiene el inventario con el valor estimado de cada objeto y si fue autenticado. Falta ver qué tan fuera de lo normal era la máscara.",
      tarea:
        "Muestra el valor estimado más alto y el valor promedio de las piezas de la 'Sala Egipcia'.",
      herramientas: ["MAX", "AVG", "WHERE"],
      exige: ["MAX", "AVG"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT MAX(valor_estimado), AVG(valor_estimado) FROM pieza WHERE sala = 'Sala Egipcia';",
      },
      hallazgo:
        "48 millones contra un promedio de 15,7: la máscara valía el triple que cualquier otra pieza de la sala. Y en el inventario figura como no autenticada. Ricardo lo sabía.",
    },
    {
      id: "nombres",
      titulo: "Nombres, no números",
      relato:
        "El detective está harto de los ids: «Yo interrogo personas, no números». Quiere la lista de entradas a la Sala Egipcia, pero con el nombre de cada persona al lado de la hora. Eso vive en dos tablas, así que hay que unirlas.",
      tarea:
        "Muestra el nombre completo y la hora de cada entrada a la 'Sala Egipcia', uniendo acceso con persona, en orden de hora.",
      herramientas: ["INNER JOIN", "ON", "WHERE", "ORDER BY"],
      exige: ["JOIN", "ON", "ORDER BY"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT p.nombre_completo, a.hora FROM acceso a INNER JOIN persona p ON a.id_persona = p.id_persona WHERE a.sala = 'Sala Egipcia' ORDER BY a.hora;",
        ordenado: true,
      },
      hallazgo:
        "Trece entradas, ahora con nombre y apellido. Se lee de corrido: Ricardo entra a las 22:05, el guardia a las 22:12, Helena a las 22:25… y la directora lo encuentra a las 22:46.",
    },
    {
      id: "distintas",
      titulo: "Cuántas personas, no cuántas entradas",
      relato:
        "Trece entradas no son trece personas: el guía entró dos veces, y la perito y el periodista también. Para el informe, el detective necesita el número de personas distintas que pisaron la sala.",
      tarea: "Cuenta cuántas personas distintas entraron a la 'Sala Egipcia' durante la noche.",
      herramientas: ["COUNT", "DISTINCT", "WHERE"],
      exige: ["COUNT", "DISTINCT"],
      comprobar: {
        tipo: "consulta",
        referencia: "SELECT COUNT(DISTINCT id_persona) FROM acceso WHERE sala = 'Sala Egipcia';",
      },
      hallazgo:
        "Diez personas distintas pasaron por la sala en la noche. Todas menos una tienen explicación para haber estado ahí.",
    },
    {
      id: "vendedora",
      titulo: "Quién vendió lo que no era",
      relato:
        "Última comprobación. En pieza, id_vendedor dice quién le vendió cada objeto al museo, y autenticada dice si un perito lo confirmó. El detective quiere ver, con nombre y apellido, quién vendió las piezas que nunca se autenticaron.",
      tarea:
        "Muestra el nombre de la pieza y el nombre completo de quien la vendió, solo para las piezas cuya autenticada sea 'no'. Une pieza con persona.",
      herramientas: ["INNER JOIN", "ON", "WHERE"],
      exige: ["JOIN", "ON", "WHERE"],
      comprobar: {
        tipo: "consulta",
        referencia:
          "SELECT pz.nombre, p.nombre_completo FROM pieza pz INNER JOIN persona p ON pz.id_vendedor = p.id_persona WHERE pz.autenticada = 'no';",
      },
      hallazgo:
        "Una sola fila: la máscara funeraria de Amenhotep, vendida por Helena Villamizar Cano. El reloj de bolsillo tampoco está autenticado, pero no tiene vendedor y el INNER JOIN lo deja fuera.",
    },
    {
      id: "culpable",
      titulo: "Solo hay una verdad",
      relato:
        "Ya tienes la hora, los movimientos, las llamadas, el dinero y el motivo. Con la máscara faltando de la vitrina, el detective se ajusta las gafas y espera tu respuesta.",
      tarea: "Escribe el nombre de quien mató al curador.",
      herramientas: [],
      comprobar: {
        tipo: "culpable",
        aceptados: [
          "Helena Villamizar Cano",
          "Helena Villamizar",
          "Villamizar",
          "Helena",
          "Villamizar Cano",
          "4",
        ],
      },
      hallazgo: "",
    },
  ],
  culpable: "Helena Villamizar Cano",
  resolucion:
    "Helena Villamizar le vendió al museo, a través de Ricardo, una máscara funeraria falsa por 48 millones, más 15,5 millones en asesorías para sostener la mentira. Ricardo descubrió la falsificación al preparar el catálogo y la citó esa noche: la llamó tres veces (20:15, 21:40 y 22:02) y discutieron en la terraza. A las 22:25 Helena entró a la Sala Egipcia, donde él la esperaba; lo golpeó, se llevó la máscara para que nadie pudiera peritarla y salió a la terraza a las 22:42. Después llamó dos veces a Isabel Vidal, su socia, para que la ayudara a sacar la pieza.\n\n" +
    "El guardia Tomás Vargas hacía su ronda; Sebastián Ferrer buscaba a Isabel para cerrar un negocio; Valeria Ortiz iba a revisar la humedad del papiro. Ninguno tenía motivo, ni un pago de 63 millones que devolver.",
};
