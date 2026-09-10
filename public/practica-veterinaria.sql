-- =========================================================================
--  CLÍNICA VETERINARIA — script de práctica
--  Curso de Bases de Datos · dialecto MySQL / MariaDB
--
--  Cinco tablas, una de ellas de transición (dueno_telefono), y las cuatro
--  operaciones sobre los datos: guardar, buscar, editar y eliminar.
--
--  Se puede pegar completo en la práctica de SQL: corre de principio a fin
--  sin un solo error. Los errores a propósito están al final, comentados.
-- =========================================================================

CREATE DATABASE IF NOT EXISTS veterinaria;
USE veterinaria;


-- =========================================================================
--  1. CREAR LAS TABLAS
--
--  El orden importa: una llave foránea solo puede apuntar a una tabla que
--  ya exista. Primero las que no dependen de nadie (dueno, telefono) y de
--  últimas las que apuntan a otras (dueno_telefono, mascota, consulta).
-- =========================================================================

-- ---------- 1. DUENO ----------
CREATE TABLE dueno (
  id_dueno INT NOT NULL AUTO_INCREMENT,
  cedula VARCHAR(15) NOT NULL UNIQUE,
  nombre VARCHAR(60) NOT NULL,
  apellido VARCHAR(60) NOT NULL,
  correo VARCHAR(80),
  PRIMARY KEY (id_dueno)
);

-- ---------- 2. TELEFONO ----------
-- Sale del grupo de repetición telefono1, telefono2, telefonoN del dueño.
CREATE TABLE telefono (
  id_telefono INT NOT NULL AUTO_INCREMENT,
  numero VARCHAR(20) NOT NULL UNIQUE,
  tipo VARCHAR(15) NOT NULL DEFAULT 'celular',
  PRIMARY KEY (id_telefono)
);

-- ---------- 3. DUENO_TELEFONO (tabla de transición) ----------
-- Un dueño puede tener varios teléfonos y un teléfono puede ser de varios
-- dueños (el fijo de la casa). Esta tabla es la que guarda esos vínculos:
-- no tiene datos propios, solo las dos llaves foráneas.
CREATE TABLE dueno_telefono (
  id_dueno_telefono INT NOT NULL AUTO_INCREMENT,
  id_dueno INT NOT NULL,
  id_telefono INT NOT NULL,
  PRIMARY KEY (id_dueno_telefono),
  CONSTRAINT fk_dueno_telefono_dueno FOREIGN KEY (id_dueno) REFERENCES dueno(id_dueno),
  CONSTRAINT fk_dueno_telefono_telefono FOREIGN KEY (id_telefono) REFERENCES telefono(id_telefono)
);

-- ---------- 4. MASCOTA ----------
CREATE TABLE mascota (
  id_mascota INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(40) NOT NULL,
  especie VARCHAR(20) NOT NULL,
  raza VARCHAR(40),
  fecha_nacimiento DATE,
  peso DECIMAL(5,2),
  id_dueno INT NOT NULL,
  PRIMARY KEY (id_mascota),
  CONSTRAINT fk_mascota_dueno FOREIGN KEY (id_dueno) REFERENCES dueno(id_dueno)
);

-- ---------- 5. CONSULTA ----------
CREATE TABLE consulta (
  id_consulta INT NOT NULL AUTO_INCREMENT,
  fecha DATE NOT NULL,
  motivo VARCHAR(120) NOT NULL,
  diagnostico TEXT,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  pagada BOOLEAN NOT NULL DEFAULT FALSE,
  id_mascota INT NOT NULL,
  PRIMARY KEY (id_consulta),
  CONSTRAINT fk_consulta_mascota FOREIGN KEY (id_mascota) REFERENCES mascota(id_mascota)
);

-- Revisar lo que quedó construido.
SHOW TABLES;
DESCRIBE consulta;


-- =========================================================================
--  2. GUARDAR  (INSERT)
--
--  De nuevo el orden manda: no se puede insertar una mascota si su dueño
--  todavía no existe. Primero los padres, después los hijos.
--  La columna id no se escribe: AUTO_INCREMENT la va llenando sola.
-- =========================================================================

INSERT INTO dueno (cedula, nombre, apellido, correo) VALUES
  ('1017234501', 'Marcela', 'Ríos',   'marcela.rios@correo.com'),
  ('1098765432', 'Andrés',  'Peña',   'andres.pena@correo.com'),
  ('1152003377', 'Lucía',   'Vargas', NULL);

INSERT INTO telefono (numero, tipo) VALUES
  ('3104455667', 'celular'),
  ('6045512233', 'fijo'),
  ('3209988776', 'celular'),
  ('3151122334', 'celular');

-- Marcela (id_dueno = 1) queda con dos teléfonos: el celular y el fijo.
-- Eso es exactamente lo que la tabla de transición vino a permitir.
INSERT INTO dueno_telefono (id_dueno, id_telefono) VALUES
  (1, 1),
  (1, 2),
  (2, 3),
  (3, 4);

INSERT INTO mascota (nombre, especie, raza, fecha_nacimiento, peso, id_dueno) VALUES
  ('Nube',   'perro', 'Criollo',  '2021-05-14', 12.40, 1),
  ('Tomás',  'gato',  'Siamés',   '2023-01-30',  4.15, 1),
  ('Rocco',  'perro', 'Labrador', '2019-11-02', 28.90, 2),
  ('Pelusa', 'gato',  'Criollo',  '2024-06-21',  2.80, 3);

INSERT INTO consulta (fecha, motivo, diagnostico, valor, pagada, id_mascota) VALUES
  ('2026-08-03', 'Vacunación anual',    'Sano',             85000,  TRUE,  1),
  ('2026-08-17', 'Cojera pata trasera', 'Esguince leve',   140000,  FALSE, 3),
  ('2026-09-01', 'Control de peso',     'Sobrepeso, dieta', 60000,  TRUE,  3),
  ('2026-09-04', 'Vómito',              NULL,              120000,  FALSE, 2);

SELECT * FROM dueno;
SELECT * FROM dueno_telefono;


-- =========================================================================
--  3. BUSCAR  (SELECT)
-- =========================================================================

-- Solo algunas columnas, en vez del * que trae todo.
SELECT nombre, especie, peso FROM mascota;

-- WHERE: filtrar filas.
SELECT nombre, raza FROM mascota WHERE especie = 'perro';

-- Comparación numérica y orden de mayor a menor.
SELECT nombre, peso FROM mascota WHERE peso > 10 ORDER BY peso DESC;

-- LIKE: 'R%' es "empieza por R". El % vale por cualquier resto de texto.
SELECT cedula, nombre, apellido FROM dueno WHERE apellido LIKE 'R%';

-- BETWEEN: un rango, con los dos extremos incluidos.
SELECT fecha, motivo, valor FROM consulta WHERE valor BETWEEN 80000 AND 150000;

-- IN: pertenecer a una lista.
SELECT nombre, especie FROM mascota WHERE especie IN ('gato', 'conejo');

-- Lo vacío se pregunta con IS NULL, nunca con = NULL.
SELECT nombre, apellido FROM dueno WHERE correo IS NULL;

-- DISTINCT: los valores sin repetir.
SELECT DISTINCT especie FROM mascota;

-- Un BOOLEAN se compara con TRUE / FALSE.
SELECT fecha, motivo FROM consulta WHERE pagada = FALSE ORDER BY fecha;

-- LIMIT: cortar el resultado. Las dos consultas más caras.
SELECT motivo, valor FROM consulta ORDER BY valor DESC LIMIT 2;

-- Funciones de agregación: resumen todas las filas en un solo número.
SELECT COUNT(*) AS total_mascotas FROM mascota;
SELECT SUM(valor) AS total_facturado, AVG(valor) AS promedio FROM consulta;
SELECT MIN(fecha) AS primera, MAX(fecha) AS ultima FROM consulta;

-- Los teléfonos de Marcela: la respuesta vive en la tabla de transición.
SELECT id_telefono FROM dueno_telefono WHERE id_dueno = 1;


-- =========================================================================
--  4. EDITAR  (UPDATE)
--
--  Regla de oro: un UPDATE sin WHERE cambia TODAS las filas de la tabla.
--  Antes de ejecutarlo, correr el mismo WHERE en un SELECT para ver a
--  cuántas filas les va a caer.
-- =========================================================================

UPDATE mascota  SET peso = 13.10 WHERE id_mascota = 1;
UPDATE consulta SET pagada = TRUE, valor = 130000 WHERE id_consulta = 2;
UPDATE dueno    SET correo = 'lucia.vargas@correo.com' WHERE cedula = '1152003377';
UPDATE telefono SET tipo = 'oficina' WHERE numero = '6045512233';

-- Comprobar que sí cambió lo que se quería cambiar.
SELECT id_mascota, nombre, peso FROM mascota WHERE id_mascota = 1;
SELECT id_consulta, valor, pagada FROM consulta WHERE id_consulta = 2;
SELECT nombre, correo FROM dueno WHERE cedula = '1152003377';


-- =========================================================================
--  5. ELIMINAR  (DELETE)
--
--  Se borra de la hija hacia el padre. La llave foránea no deja quitar una
--  fila mientras otra tabla la esté apuntando: eso es integridad
--  referencial, y es una protección, no un estorbo.
-- =========================================================================

-- Una consulta se borra sola: ninguna tabla la referencia.
DELETE FROM consulta WHERE id_consulta = 4;
SELECT id_consulta, motivo FROM consulta;

-- Un teléfono NO se puede borrar de una: primero se suelta el vínculo
-- en la tabla de transición, y solo entonces desaparece el teléfono.
DELETE FROM dueno_telefono WHERE id_dueno = 1 AND id_telefono = 2;
DELETE FROM telefono WHERE id_telefono = 2;
SELECT * FROM telefono;


-- =========================================================================
--  6. ERRORES A PROPÓSITO
--
--  Están comentados para que el script corra completo. Se descomenta UNO,
--  se ejecuta, se lee el mensaje y se vuelve a comentar antes de pasar al
--  siguiente: el motor detiene el script en el primer error.
--
--  Equivocarse aquí es el ejercicio. Lo que hay que aprender a leer es el
--  mensaje, no a evitar el error.
-- =========================================================================

-- 1. Llave foránea hacia una fila que no existe.
--    "No puedes poner id_dueno = 99 en «mascota»: en «dueno» no hay ninguna
--     fila con ese id_dueno."
-- INSERT INTO mascota (nombre, especie, id_dueno) VALUES ('Fantasma', 'perro', 99);

-- 2. Borrar un padre que todavía tiene hijas.
--    "«dueno_telefono» tiene 1 fila(s) que la referencian."
-- DELETE FROM dueno WHERE id_dueno = 1;

-- 3. Lo mismo, entrando por el otro lado de la tabla de transición.
-- DELETE FROM telefono WHERE id_telefono = 1;

-- 4. Repetir un valor declarado UNIQUE: dos dueños con la misma cédula.
-- INSERT INTO dueno (cedula, nombre, apellido) VALUES ('1017234501', 'Otra', 'Persona');

-- 5. Dejar vacía una columna NOT NULL.
-- INSERT INTO mascota (nombre, especie, id_dueno) VALUES ('Sin dueño', 'gato', NULL);

-- 6. Fecha en el formato equivocado. En SQL siempre es 'AAAA-MM-DD'.
-- INSERT INTO consulta (fecha, motivo, id_mascota) VALUES ('03-08-2026', 'Fecha mala', 1);

-- 7. Romper la llave foránea al editar, no al insertar.
-- UPDATE mascota SET id_dueno = 77 WHERE id_mascota = 1;


-- =========================================================================
--  7. BORRAR UN DUEÑO COMPLETO, BIEN HECHO
--
--  Para que el dueño 1 se pueda ir, antes tienen que irse sus consultas,
--  sus mascotas y sus vínculos de teléfono. De la hija al padre, siempre.
--  Este bloque sí corre entero; está comentado para no vaciar los datos
--  de la práctica sin querer.
-- =========================================================================

-- DELETE FROM consulta       WHERE id_mascota = 1;
-- DELETE FROM consulta       WHERE id_mascota = 2;
-- DELETE FROM mascota        WHERE id_dueno = 1;
-- DELETE FROM dueno_telefono WHERE id_dueno = 1;
-- DELETE FROM dueno          WHERE id_dueno = 1;
-- SELECT * FROM dueno;
