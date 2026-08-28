# 10 ejercicios de SQL — 5 tablas y relaciones

Diez casos para practicar en la sección **SQL** de la app (`/sql`). Cada ejercicio
crea **su propia base de datos**, con **5 tablas** y sus **llaves foráneas**, así
que puedes correrlos uno por uno sin que se crucen.

## Cómo usarlos

1. Entra a la práctica de SQL y **pega** el bloque de código de un ejercicio.
2. Pulsa **Ejecutar** (o `Ctrl + Enter`).
3. Mira cómo se arma la base en el panel **Tu base** y, más abajo, el
   **Esquema de la base** con las tablas y sus relaciones.
4. A partir de ahí, practica tus propios `SELECT`, `UPDATE` y `DELETE`.

> El dialecto imitado es **MySQL / MariaDB**. Las tablas se crean en orden: primero
> la tabla a la que se apunta y después la que tiene la llave foránea.

Al final hay una sección para practicar **`ALTER TABLE`** (agregar una llave
foránea olvidada).

---

## Ejercicio 1 — Biblioteca

**Enunciado.** Una biblioteca de barrio quiere llevar el control de sus préstamos.
De cada **libro** se guarda el título, su **autor** y la **editorial** que lo
publicó. Los **socios** se registran con nombre y documento, y cada vez que un
socio se lleva un libro se anota un **préstamo** con su fecha. Un autor puede
tener muchos libros; una editorial publica muchos libros; un socio hace muchos
préstamos.

**Tablas y relaciones (5).**
- `autor` — los escritores.
- `editorial` — las casas editoriales.
- `libro` → apunta a `autor` y a `editorial`.
- `socio` — quienes piden prestado.
- `prestamo` → apunta a `libro` y a `socio`.

```sql
CREATE DATABASE biblioteca;
USE biblioteca;

CREATE TABLE autor (
  id_autor INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  pais VARCHAR(40)
);

CREATE TABLE editorial (
  id_editorial INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  ciudad VARCHAR(40)
);

CREATE TABLE libro (
  id_libro INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(120) NOT NULL,
  anio INT,
  id_autor INT NOT NULL,
  id_editorial INT NOT NULL,
  FOREIGN KEY (id_autor) REFERENCES autor(id_autor),
  FOREIGN KEY (id_editorial) REFERENCES editorial(id_editorial)
);

CREATE TABLE socio (
  id_socio INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  documento VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE prestamo (
  id_prestamo INT AUTO_INCREMENT PRIMARY KEY,
  id_libro INT NOT NULL,
  id_socio INT NOT NULL,
  fecha_prestamo DATE NOT NULL,
  devuelto BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (id_libro) REFERENCES libro(id_libro),
  FOREIGN KEY (id_socio) REFERENCES socio(id_socio)
);

INSERT INTO autor (nombre, pais) VALUES
  ('Gabriel García Márquez', 'Colombia'),
  ('Isabel Allende', 'Chile');

INSERT INTO editorial (nombre, ciudad) VALUES
  ('Sudamericana', 'Buenos Aires'),
  ('Planeta', 'Barcelona');

INSERT INTO libro (titulo, anio, id_autor, id_editorial) VALUES
  ('Cien años de soledad', 1967, 1, 1),
  ('La casa de los espíritus', 1982, 2, 2),
  ('El amor en los tiempos del cólera', 1985, 1, 2);

INSERT INTO socio (nombre, documento) VALUES
  ('Ana Ruiz', '1001'),
  ('Beto Díaz', '1002');

INSERT INTO prestamo (id_libro, id_socio, fecha_prestamo, devuelto) VALUES
  (1, 1, '2026-03-01', TRUE),
  (3, 2, '2026-03-05', FALSE);
```

---

## Ejercicio 2 — Tienda en línea

**Enunciado.** Una tienda vende productos por internet. Cada **producto**
pertenece a una **categoría**. Los **clientes** hacen **pedidos**, y cada pedido
puede incluir varios productos con su cantidad: eso se guarda en el **detalle del
pedido**.

**Tablas y relaciones (5).**
- `categoria` — clasifica los productos.
- `producto` → apunta a `categoria`.
- `cliente` — quienes compran.
- `pedido` → apunta a `cliente`.
- `detalle_pedido` → apunta a `pedido` y a `producto`.

```sql
CREATE DATABASE tienda_online;
USE tienda_online;

CREATE TABLE categoria (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL
);

CREATE TABLE producto (
  id_producto INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  id_categoria INT NOT NULL,
  FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
);

CREATE TABLE cliente (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  correo VARCHAR(100) UNIQUE
);

CREATE TABLE pedido (
  id_pedido INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT NOT NULL,
  fecha DATE NOT NULL,
  FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

CREATE TABLE detalle_pedido (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_pedido INT NOT NULL,
  id_producto INT NOT NULL,
  cantidad INT NOT NULL,
  FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido),
  FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);

INSERT INTO categoria (nombre) VALUES ('Tecnología'), ('Hogar');

INSERT INTO producto (nombre, precio, id_categoria) VALUES
  ('Audífonos', 120000.00, 1),
  ('Teclado', 90000.00, 1),
  ('Lámpara', 45000.00, 2);

INSERT INTO cliente (nombre, correo) VALUES
  ('Ana Ruiz', 'ana@correo.com'),
  ('Beto Díaz', 'beto@correo.com');

INSERT INTO pedido (id_cliente, fecha) VALUES (1, '2026-04-10'), (2, '2026-04-11');

INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad) VALUES
  (1, 1, 1),
  (1, 2, 2),
  (2, 3, 1);
```

---

## Ejercicio 3 — Universidad

**Enunciado.** Una universidad organiza sus cursos por **departamento**. Cada
**profesor** pertenece a un departamento, y cada **curso** también. Los
**estudiantes** se **matriculan** en los cursos: un estudiante toma muchos cursos
y un curso tiene muchos estudiantes (relación muchos-a-muchos).

**Tablas y relaciones (5).**
- `departamento`
- `profesor` → apunta a `departamento`.
- `curso` → apunta a `departamento`.
- `estudiante`
- `matricula` → une `estudiante` y `curso` (llave primaria compuesta).

```sql
CREATE DATABASE universidad;
USE universidad;

CREATE TABLE departamento (
  id_departamento INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL
);

CREATE TABLE profesor (
  id_profesor INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  id_departamento INT NOT NULL,
  FOREIGN KEY (id_departamento) REFERENCES departamento(id_departamento)
);

CREATE TABLE curso (
  id_curso INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  creditos INT NOT NULL,
  id_departamento INT NOT NULL,
  FOREIGN KEY (id_departamento) REFERENCES departamento(id_departamento)
);

CREATE TABLE estudiante (
  id_estudiante INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  codigo VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE matricula (
  id_estudiante INT NOT NULL,
  id_curso INT NOT NULL,
  semestre VARCHAR(10) NOT NULL,
  PRIMARY KEY (id_estudiante, id_curso),
  FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_estudiante),
  FOREIGN KEY (id_curso) REFERENCES curso(id_curso)
);

INSERT INTO departamento (nombre) VALUES ('Sistemas'), ('Matemáticas');

INSERT INTO profesor (nombre, id_departamento) VALUES
  ('Carla Gómez', 1),
  ('Diego Peña', 2);

INSERT INTO curso (nombre, creditos, id_departamento) VALUES
  ('Bases de Datos', 3, 1),
  ('Cálculo I', 4, 2);

INSERT INTO estudiante (nombre, codigo) VALUES
  ('Ana Ruiz', 'E001'),
  ('Beto Díaz', 'E002');

INSERT INTO matricula (id_estudiante, id_curso, semestre) VALUES
  (1, 1, '2026-1'),
  (1, 2, '2026-1'),
  (2, 1, '2026-1');
```

---

## Ejercicio 4 — Clínica médica

**Enunciado.** Una clínica agenda **citas**. Cada **médico** tiene una
**especialidad**, los **pacientes** se registran con su documento, y las citas se
atienden en un **consultorio**. Una cita reúne a un médico, un paciente y un
consultorio en una fecha.

**Tablas y relaciones (5).**
- `especialidad`
- `medico` → apunta a `especialidad`.
- `consultorio`
- `paciente`
- `cita` → apunta a `medico`, `paciente` y `consultorio` (tres llaves foráneas).

```sql
CREATE DATABASE clinica;
USE clinica;

CREATE TABLE especialidad (
  id_especialidad INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL
);

CREATE TABLE medico (
  id_medico INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  id_especialidad INT NOT NULL,
  FOREIGN KEY (id_especialidad) REFERENCES especialidad(id_especialidad)
);

CREATE TABLE consultorio (
  id_consultorio INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(10) NOT NULL,
  piso INT
);

CREATE TABLE paciente (
  id_paciente INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  documento VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE cita (
  id_cita INT AUTO_INCREMENT PRIMARY KEY,
  id_medico INT NOT NULL,
  id_paciente INT NOT NULL,
  id_consultorio INT NOT NULL,
  fecha DATE NOT NULL,
  FOREIGN KEY (id_medico) REFERENCES medico(id_medico),
  FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente),
  FOREIGN KEY (id_consultorio) REFERENCES consultorio(id_consultorio)
);

INSERT INTO especialidad (nombre) VALUES ('Pediatría'), ('Cardiología');

INSERT INTO medico (nombre, id_especialidad) VALUES
  ('Dra. Laura Sáenz', 1),
  ('Dr. Iván Mora', 2);

INSERT INTO consultorio (numero, piso) VALUES ('101', 1), ('202', 2);

INSERT INTO paciente (nombre, documento) VALUES
  ('Ana Ruiz', '1001'),
  ('Beto Díaz', '1002');

INSERT INTO cita (id_medico, id_paciente, id_consultorio, fecha) VALUES
  (1, 1, 1, '2026-05-02'),
  (2, 2, 2, '2026-05-03');
```

---

## Ejercicio 5 — Restaurante

**Enunciado.** Un restaurante toma **comandas** por mesa. Cada **plato** pertenece
a una **categoría** (entradas, fuertes, postres). Cuando un cliente se sienta en
una **mesa**, se abre una comanda, y en el **detalle de la comanda** se anotan los
platos pedidos con su cantidad.

**Tablas y relaciones (5).**
- `categoria`
- `plato` → apunta a `categoria`.
- `mesa`
- `comanda` → apunta a `mesa`.
- `detalle_comanda` → apunta a `comanda` y a `plato`.

```sql
CREATE DATABASE restaurante;
USE restaurante;

CREATE TABLE categoria (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL
);

CREATE TABLE plato (
  id_plato INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  id_categoria INT NOT NULL,
  FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
);

CREATE TABLE mesa (
  id_mesa INT AUTO_INCREMENT PRIMARY KEY,
  numero INT NOT NULL UNIQUE,
  capacidad INT NOT NULL
);

CREATE TABLE comanda (
  id_comanda INT AUTO_INCREMENT PRIMARY KEY,
  id_mesa INT NOT NULL,
  fecha DATE NOT NULL,
  FOREIGN KEY (id_mesa) REFERENCES mesa(id_mesa)
);

CREATE TABLE detalle_comanda (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  id_comanda INT NOT NULL,
  id_plato INT NOT NULL,
  cantidad INT NOT NULL,
  FOREIGN KEY (id_comanda) REFERENCES comanda(id_comanda),
  FOREIGN KEY (id_plato) REFERENCES plato(id_plato)
);

INSERT INTO categoria (nombre) VALUES ('Entradas'), ('Fuertes'), ('Postres');

INSERT INTO plato (nombre, precio, id_categoria) VALUES
  ('Sopa del día', 12000.00, 1),
  ('Bandeja paisa', 32000.00, 2),
  ('Flan de caramelo', 9000.00, 3);

INSERT INTO mesa (numero, capacidad) VALUES (1, 4), (2, 2);

INSERT INTO comanda (id_mesa, fecha) VALUES (1, '2026-06-01'), (2, '2026-06-01');

INSERT INTO detalle_comanda (id_comanda, id_plato, cantidad) VALUES
  (1, 1, 2),
  (1, 2, 2),
  (2, 3, 1);
```

---

## Ejercicio 6 — Gimnasio

**Enunciado.** Un gimnasio ofrece **planes** de membresía. Cada **cliente** tiene
un plan. Los **entrenadores** dictan **clases** (spinning, yoga…), y los clientes
se **inscriben** en las clases: un cliente asiste a muchas clases y una clase tiene
muchos clientes.

**Tablas y relaciones (5).**
- `plan`
- `cliente` → apunta a `plan`.
- `entrenador`
- `clase` → apunta a `entrenador`.
- `inscripcion` → une `cliente` y `clase` (llave primaria compuesta).

```sql
CREATE DATABASE gimnasio;
USE gimnasio;

CREATE TABLE plan (
  id_plan INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  precio_mensual DECIMAL(10,2) NOT NULL
);

CREATE TABLE cliente (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  id_plan INT NOT NULL,
  FOREIGN KEY (id_plan) REFERENCES plan(id_plan)
);

CREATE TABLE entrenador (
  id_entrenador INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL
);

CREATE TABLE clase (
  id_clase INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  cupo INT NOT NULL,
  id_entrenador INT NOT NULL,
  FOREIGN KEY (id_entrenador) REFERENCES entrenador(id_entrenador)
);

CREATE TABLE inscripcion (
  id_cliente INT NOT NULL,
  id_clase INT NOT NULL,
  fecha DATE NOT NULL,
  PRIMARY KEY (id_cliente, id_clase),
  FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
  FOREIGN KEY (id_clase) REFERENCES clase(id_clase)
);

INSERT INTO plan (nombre, precio_mensual) VALUES
  ('Básico', 60000.00),
  ('Full', 95000.00);

INSERT INTO cliente (nombre, id_plan) VALUES
  ('Ana Ruiz', 2),
  ('Beto Díaz', 1);

INSERT INTO entrenador (nombre) VALUES ('Sara León'), ('Tomás Vera');

INSERT INTO clase (nombre, cupo, id_entrenador) VALUES
  ('Spinning', 20, 1),
  ('Yoga', 15, 2);

INSERT INTO inscripcion (id_cliente, id_clase, fecha) VALUES
  (1, 1, '2026-07-01'),
  (1, 2, '2026-07-01'),
  (2, 1, '2026-07-02');
```

---

## Ejercicio 7 — Cine

**Enunciado.** Un cine programa **funciones**. Cada función proyecta una
**película** en una **sala** a cierta hora. Los **clientes** compran **boletos**
para una función.

**Tablas y relaciones (5).**
- `pelicula`
- `sala`
- `funcion` → apunta a `pelicula` y a `sala`.
- `cliente`
- `boleto` → apunta a `funcion` y a `cliente`.

```sql
CREATE DATABASE cine;
USE cine;

CREATE TABLE pelicula (
  id_pelicula INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(120) NOT NULL,
  duracion_min INT NOT NULL
);

CREATE TABLE sala (
  id_sala INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL,
  butacas INT NOT NULL
);

CREATE TABLE funcion (
  id_funcion INT AUTO_INCREMENT PRIMARY KEY,
  id_pelicula INT NOT NULL,
  id_sala INT NOT NULL,
  fecha DATE NOT NULL,
  hora VARCHAR(5) NOT NULL,
  FOREIGN KEY (id_pelicula) REFERENCES pelicula(id_pelicula),
  FOREIGN KEY (id_sala) REFERENCES sala(id_sala)
);

CREATE TABLE cliente (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL
);

CREATE TABLE boleto (
  id_boleto INT AUTO_INCREMENT PRIMARY KEY,
  id_funcion INT NOT NULL,
  id_cliente INT NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_funcion) REFERENCES funcion(id_funcion),
  FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

INSERT INTO pelicula (titulo, duracion_min) VALUES
  ('El viaje', 120),
  ('La montaña', 95);

INSERT INTO sala (nombre, butacas) VALUES ('Sala 1', 100), ('Sala 2', 60);

INSERT INTO funcion (id_pelicula, id_sala, fecha, hora) VALUES
  (1, 1, '2026-08-01', '19:00'),
  (2, 2, '2026-08-01', '21:00');

INSERT INTO cliente (nombre) VALUES ('Ana Ruiz'), ('Beto Díaz');

INSERT INTO boleto (id_funcion, id_cliente, precio) VALUES
  (1, 1, 15000.00),
  (1, 2, 15000.00),
  (2, 2, 12000.00);
```

---

## Ejercicio 8 — Aerolínea

**Enunciado.** Una aerolínea programa **vuelos** entre **ciudades**. Cada vuelo
tiene una ciudad de **origen** y una de **destino** (ambas de la misma tabla) y usa
un **avión**. Los **pasajeros** hacen **reservas** en los vuelos.

**Tablas y relaciones (5).**
- `ciudad`
- `avion`
- `vuelo` → apunta **dos veces** a `ciudad` (origen y destino) y a `avion`.
- `pasajero`
- `reserva` → apunta a `vuelo` y a `pasajero`.

```sql
CREATE DATABASE aerolinea;
USE aerolinea;

CREATE TABLE ciudad (
  id_ciudad INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  pais VARCHAR(40) NOT NULL
);

CREATE TABLE avion (
  id_avion INT AUTO_INCREMENT PRIMARY KEY,
  matricula VARCHAR(15) NOT NULL UNIQUE,
  asientos INT NOT NULL
);

CREATE TABLE vuelo (
  id_vuelo INT AUTO_INCREMENT PRIMARY KEY,
  id_origen INT NOT NULL,
  id_destino INT NOT NULL,
  id_avion INT NOT NULL,
  fecha DATE NOT NULL,
  FOREIGN KEY (id_origen) REFERENCES ciudad(id_ciudad),
  FOREIGN KEY (id_destino) REFERENCES ciudad(id_ciudad),
  FOREIGN KEY (id_avion) REFERENCES avion(id_avion)
);

CREATE TABLE pasajero (
  id_pasajero INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  pasaporte VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE reserva (
  id_reserva INT AUTO_INCREMENT PRIMARY KEY,
  id_vuelo INT NOT NULL,
  id_pasajero INT NOT NULL,
  asiento VARCHAR(5),
  FOREIGN KEY (id_vuelo) REFERENCES vuelo(id_vuelo),
  FOREIGN KEY (id_pasajero) REFERENCES pasajero(id_pasajero)
);

INSERT INTO ciudad (nombre, pais) VALUES
  ('Bogotá', 'Colombia'),
  ('Medellín', 'Colombia'),
  ('Lima', 'Perú');

INSERT INTO avion (matricula, asientos) VALUES ('HK-101', 180), ('HK-202', 120);

INSERT INTO vuelo (id_origen, id_destino, id_avion, fecha) VALUES
  (1, 2, 1, '2026-09-01'),
  (1, 3, 2, '2026-09-02');

INSERT INTO pasajero (nombre, pasaporte) VALUES
  ('Ana Ruiz', 'P001'),
  ('Beto Díaz', 'P002');

INSERT INTO reserva (id_vuelo, id_pasajero, asiento) VALUES
  (1, 1, '12A'),
  (2, 2, '3C');
```

---

## Ejercicio 9 — Taller mecánico

**Enunciado.** Un taller repara vehículos. Cada **vehículo** pertenece a un
**cliente**. Los **mecánicos** realizan **servicios** (cambio de aceite, frenos…)
sobre los vehículos: cada **reparación** registra qué vehículo, qué mecánico y qué
servicio se hizo.

**Tablas y relaciones (5).**
- `cliente`
- `vehiculo` → apunta a `cliente`.
- `mecanico`
- `servicio`
- `reparacion` → apunta a `vehiculo`, `mecanico` y `servicio`.

```sql
CREATE DATABASE taller;
USE taller;

CREATE TABLE cliente (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  telefono VARCHAR(20)
);

CREATE TABLE vehiculo (
  id_vehiculo INT AUTO_INCREMENT PRIMARY KEY,
  placa VARCHAR(10) NOT NULL UNIQUE,
  marca VARCHAR(40) NOT NULL,
  id_cliente INT NOT NULL,
  FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

CREATE TABLE mecanico (
  id_mecanico INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL
);

CREATE TABLE servicio (
  id_servicio INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  costo DECIMAL(10,2) NOT NULL
);

CREATE TABLE reparacion (
  id_reparacion INT AUTO_INCREMENT PRIMARY KEY,
  id_vehiculo INT NOT NULL,
  id_mecanico INT NOT NULL,
  id_servicio INT NOT NULL,
  fecha DATE NOT NULL,
  FOREIGN KEY (id_vehiculo) REFERENCES vehiculo(id_vehiculo),
  FOREIGN KEY (id_mecanico) REFERENCES mecanico(id_mecanico),
  FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio)
);

INSERT INTO cliente (nombre, telefono) VALUES
  ('Ana Ruiz', '3001111'),
  ('Beto Díaz', '3002222');

INSERT INTO vehiculo (placa, marca, id_cliente) VALUES
  ('ABC123', 'Mazda', 1),
  ('XYZ789', 'Renault', 2);

INSERT INTO mecanico (nombre) VALUES ('Pedro Nieto'), ('Rosa Marín');

INSERT INTO servicio (nombre, costo) VALUES
  ('Cambio de aceite', 80000.00),
  ('Frenos', 150000.00);

INSERT INTO reparacion (id_vehiculo, id_mecanico, id_servicio, fecha) VALUES
  (1, 1, 1, '2026-10-05'),
  (2, 2, 2, '2026-10-06');
```

---

## Ejercicio 10 — Inmobiliaria

**Enunciado.** Una inmobiliaria administra **inmuebles** de varios **propietarios**.
Los **agentes** cierran **contratos** de arriendo entre un inmueble y un
**cliente**. Cada contrato registra el inmueble, el agente que lo gestionó y el
cliente que arrienda.

**Tablas y relaciones (5).**
- `propietario`
- `inmueble` → apunta a `propietario`.
- `agente`
- `cliente`
- `contrato` → apunta a `inmueble`, `agente` y `cliente`.

```sql
CREATE DATABASE inmobiliaria;
USE inmobiliaria;

CREATE TABLE propietario (
  id_propietario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  documento VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE inmueble (
  id_inmueble INT AUTO_INCREMENT PRIMARY KEY,
  direccion VARCHAR(120) NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  canon DECIMAL(10,2) NOT NULL,
  id_propietario INT NOT NULL,
  FOREIGN KEY (id_propietario) REFERENCES propietario(id_propietario)
);

CREATE TABLE agente (
  id_agente INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL
);

CREATE TABLE cliente (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  telefono VARCHAR(20)
);

CREATE TABLE contrato (
  id_contrato INT AUTO_INCREMENT PRIMARY KEY,
  id_inmueble INT NOT NULL,
  id_agente INT NOT NULL,
  id_cliente INT NOT NULL,
  fecha_inicio DATE NOT NULL,
  meses INT NOT NULL,
  FOREIGN KEY (id_inmueble) REFERENCES inmueble(id_inmueble),
  FOREIGN KEY (id_agente) REFERENCES agente(id_agente),
  FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

INSERT INTO propietario (nombre, documento) VALUES
  ('Ana Ruiz', '1001'),
  ('Beto Díaz', '1002');

INSERT INTO inmueble (direccion, tipo, canon, id_propietario) VALUES
  ('Calle 10 #5-20', 'Apartamento', 1200000.00, 1),
  ('Carrera 8 #4-15', 'Local', 2500000.00, 2);

INSERT INTO agente (nombre) VALUES ('Sofía Cano'), ('Julián Vega');

INSERT INTO cliente (nombre, telefono) VALUES
  ('Carlos Mena', '3005555'),
  ('Diana Soto', '3006666');

INSERT INTO contrato (id_inmueble, id_agente, id_cliente, fecha_inicio, meses) VALUES
  (1, 1, 1, '2026-11-01', 12),
  (2, 2, 2, '2026-11-15', 24);
```

---

## Bonus — Practicar `ALTER TABLE` (la llave foránea olvidada)

Un caso muy común: creaste la tabla hija **sin** la llave foránea. En vez de
borrarla y volverla a crear, la agregas con `ALTER TABLE`.

```sql
CREATE DATABASE practica_alter;
USE practica_alter;

CREATE TABLE cliente (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL
);

-- Se nos olvidó la llave foránea al crear pedido:
CREATE TABLE pedido (
  id_pedido INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT,
  total INT
);

INSERT INTO cliente (nombre) VALUES ('Ana'), ('Beto');
INSERT INTO pedido (id_cliente, total) VALUES (1, 100), (2, 250);

-- La agregamos después:
ALTER TABLE pedido
  ADD FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente);

-- Otra cosa que se puede AÑADIR con ALTER: una columna nueva.
ALTER TABLE cliente ADD correo VARCHAR(80);

-- Y darle llave primaria a una tabla que NO la tenga:
CREATE TABLE etiqueta (codigo INT, texto VARCHAR(20));
ALTER TABLE etiqueta ADD PRIMARY KEY (codigo);
```

> Tras el `ALTER`, la llave foránea queda **activa**: si intentas insertar un
> `pedido` con un `id_cliente` que no existe, el motor lo rechaza.

---

### Ideas para seguir practicando (sobre cualquier ejercicio)

- `SELECT * FROM tabla;` para ver el contenido.
- `SELECT ... WHERE ...` para filtrar (por precio, fecha, etc.).
- `SELECT COUNT(*) FROM tabla;` para contar filas.
- `ORDER BY columna ASC` / `DESC` para ordenar.
- `UPDATE ... SET ... WHERE ...` y `DELETE FROM ... WHERE ...` para cambiar datos.
- Prueba a borrar una fila "padre" que tenga hijos: el motor te explicará por qué
  no puede (la llave foránea protegiéndote).
