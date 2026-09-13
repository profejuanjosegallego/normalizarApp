# Tutorial del caso 3 · *Cena en El Faro*

Guía paso a paso del caso de práctica del **Evaluador final**. Sirve para el repaso previo al examen: recorre las 18 pistas en el mismo orden en que aparecen en la app, explica qué pide cada una, cómo funciona la instrucción de SQL que la resuelve y qué errores suelen aparecer.

> El caso es de acceso libre y permanente: no pide código, no tiene reloj y no da nota. Se puede empezar de cero las veces que haga falta.

---

## 1. Antes de empezar

### Cómo se abre

1. En la portada de la app, botón **Resolver los casos** (o directamente `/evaluador`).
2. Arriba, en la sección *Antes del examen · acceso libre*, está la tarjeta **Cena en El Faro**. Clic en **Abrir el caso**.
3. Aparece la pantalla previa: nombres (opcionales en la práctica), las reglas y la escena del crimen. Botón **Empezar la práctica**.

### Cómo es la pantalla del caso

| Zona | Qué hay |
|---|---|
| **Pista en curso** (arriba a la izquierda) | El relato, la **tarea** en el recuadro azul y unos chips con las herramientas que se esperan (`WHERE`, `BETWEEN`…). |
| **Editor de SQL** | Donde se escribe la instrucción. Se ejecuta con el botón **Ejecutar** o con `Ctrl + Enter`. Si se selecciona un trozo del texto, se ejecuta solo ese trozo. |
| **Resultado** | Lo que devolvió el motor: una rejilla de filas, un mensaje, o un error en rojo con su pista. |
| **Expediente** (pestaña derecha) | La lista de pistas: las resueltas con su hallazgo, la actual marcada *en curso*, las que faltan con candado. |
| **Tablas** (pestaña derecha) | Todas las tablas de la base con sus columnas, tipos, llaves y las primeras filas. **Mirar aquí no cuesta intentos.** |
| **Sintaxis** (pestaña derecha) | La chuleta con la forma de cada instrucción. |

### Cómo se resuelve una pista

Cada vez que se ejecuta algo, el detective compara lo que devolvió el motor con lo que la pista esperaba. Si coincide, la pista se marca sola y aparece el **Hallazgo** (el dato que empuja la historia). Si no:

- *"El resultado es el correcto, pero esta pista se resuelve con BETWEEN"* → llegaste al mismo resultado por otro camino; la pista quiere que practiques justo esa herramienta. Reescríbela.
- *"La consulta corrió, pero devolvió 10 filas y la pista espera 5"* → la condición del `WHERE` deja pasar filas de más (o de menos).
- *"…trae 3 filas, que es lo esperado, pero no las columnas o el orden que pide"* → revisa qué columnas hay que mostrar, o si pedía `ORDER BY`.
- Error en rojo → error de sintaxis o de nombres; el motor dice la línea y da una pista.

Cada ejecución que **no** resuelve la pista en curso cuenta como *intento fallido*. En la práctica solo se cuentan para que veas cómo será el examen; no descuentan nada.

**Regla de oro:** la comparación es tolerante con las columnas de más, los alias y el orden de las columnas. Lo que importa es que estén las filas correctas y las columnas que la tarea pide.

---

## 2. La base de datos `caso_faro`

Cinco tablas, 96 filas. Las relaciones van todas hacia `persona`.

```
persona (8)      id_persona PK, nombre, apellido, rol, direccion_completa
movimiento (28)  id_movimiento (SIN llave primaria), id_persona FK, lugar, hora
pedido (30)      id_pedido PK, id_persona (SIN llave foránea), plato, precio, hora
mensaje (18)     id_mensaje PK, id_emisor FK, id_receptor FK, hora, texto
insumo (12)      id_compra PK, id_persona FK, producto, cantidad, costo, fecha
```

Las personas:

| id | nombre | rol |
|---|---|---|
| 1 | Julián Prada Mora | Crítico gastronómico (la víctima) |
| 2 | Marcos Duque Villa | Chef |
| 3 | Beatriz Lara Ossa | Dueña del restaurante |
| 4 | Tomás Rendón Gil | Sommelier |
| 5 | Paula Ceballos Ruiz | Mesera |
| 6 | Andrés Salgado Peña | Crítico rival |
| 7 | Nora Vélez Ríos | Proveedora de insumos |
| 8 | David Ortega Lima | Sous-chef |

Dos detalles que conviene notar desde el principio: las **horas** están guardadas como texto `'HH:MM'` (por eso van entre comillas y se pueden comparar con `BETWEEN` y `>=`), y las demás tablas hablan de las personas **por su id**, no por su nombre.

---

## 3. Pista por pista

### Pista 1 · El expediente — `USE`

**Qué pide:** entrar a la base de datos del caso.

**Cómo funciona:** un servidor puede tener varias bases de datos. `USE` le dice en cuál vas a trabajar; hasta que no lo hagas, ningún `SELECT` sabe de qué tablas hablas. En la pestaña *Tablas* la base aparece sin el chip *en uso*.

```sql
USE caso_faro;
```

**Error típico:** olvidar el punto y coma, o escribir el nombre de la base con tilde o mayúsculas distintas (el motor no distingue mayúsculas, pero sí letras de más).

---

### Pista 2 · Los de esa noche — `SELECT *`

**Qué pide:** la lista completa de personas, con todas sus columnas.

**Cómo funciona:** `SELECT` elige columnas; `*` significa *todas*. `FROM` dice de qué tabla.

```sql
SELECT * FROM persona;
```

**Qué devuelve:** 8 filas. Fíjate en `direccion_completa`: trae la calle y la ciudad en una sola celda. Eso se arregla en la pista 5.

---

### Pista 3 · Movimientos sin identificar — `ALTER TABLE … ADD PRIMARY KEY`

**Qué pide:** decidir cuál columna identifica cada movimiento sin repetirse nunca y declararla llave primaria.

**Cómo funciona:** la **llave primaria** es la columna (o columnas) cuyo valor no se repite ni queda en NULL, y que sirve para señalar una fila y solo esa. `ALTER TABLE` modifica una tabla que ya existe; `ADD PRIMARY KEY (columna)` le pone la llave. El motor **rechaza** la llave si encuentra valores repetidos.

Mira las columnas en *Tablas*: `hora` se repite (dos personas pueden pasar a la misma hora), `lugar` se repite, `id_persona` se repite. La única que no se repite es `id_movimiento`, que existe justamente para eso.

```sql
ALTER TABLE movimiento ADD PRIMARY KEY (id_movimiento);
```

**Error típico:** elegir `hora` → *"No puedo poner esa llave primaria: el valor ('…') está repetido"*. Si por error pones una llave que el motor sí acepta pero no es la esperada, la pista avisa y hay que usar **Restaurar la base** (arriba) para volver a intentarlo, porque una llave primaria no se puede quitar.

---

### Pista 4 · Pedidos de nadie — `ALTER TABLE … ADD FOREIGN KEY`

**Qué pide:** declarar en `pedido` la llave foránea que conecta `id_persona` con `persona`.

**Cómo funciona:** la **llave foránea** es una columna que apunta a la llave primaria de otra tabla. Al declararla, el motor garantiza que cada pedido señale a una persona que exista, y no dejará borrar a una persona que tenga pedidos. La forma es: `FOREIGN KEY (columna propia) REFERENCES tabla_padre(columna de la tabla padre)`.

```sql
ALTER TABLE pedido ADD FOREIGN KEY (id_persona) REFERENCES persona(id_persona);
```

**Error típico:** confundir el orden: primero la columna de *esta* tabla, después `REFERENCES` con la tabla a la que apunta.

---

### Pista 5 · Calle y ciudad — `ALTER TABLE … ADD` + `UPDATE … SET … WHERE`

**Qué pide:** agregar las columnas `calle` y `ciudad` y llenarlas para las ocho personas, partiendo `direccion_completa` por la coma.

**Cómo funciona:** esto es **atomicidad** (1FN): una celda debe guardar un solo dato. Se hace en dos pasos:

1. Agregar las columnas nuevas con `ALTER TABLE … ADD`.
2. Llenarlas fila por fila con `UPDATE tabla SET columna = valor WHERE id = n`. **Sin el `WHERE`, el `UPDATE` cambia todas las filas.**

```sql
ALTER TABLE persona ADD calle VARCHAR(60), ADD ciudad VARCHAR(40);

UPDATE persona SET calle = 'Carrera 7 # 45-10',  ciudad = 'Bogotá'   WHERE id_persona = 1;
UPDATE persona SET calle = 'Calle 93 # 11-25',   ciudad = 'Bogotá'   WHERE id_persona = 2;
UPDATE persona SET calle = 'Carrera 43A # 5-60', ciudad = 'Medellín' WHERE id_persona = 3;
UPDATE persona SET calle = 'Avenida 6N # 23-40', ciudad = 'Cali'     WHERE id_persona = 4;
UPDATE persona SET calle = 'Calle 26 # 68-15',   ciudad = 'Bogotá'   WHERE id_persona = 5;
UPDATE persona SET calle = 'Calle 5 # 38-20',    ciudad = 'Cali'     WHERE id_persona = 6;
UPDATE persona SET calle = 'Carrera 70 # 1-80',  ciudad = 'Medellín' WHERE id_persona = 7;
UPDATE persona SET calle = 'Calle 134 # 9-30',   ciudad = 'Bogotá'   WHERE id_persona = 8;
```

Se puede pegar todo junto y ejecutar de una vez: el motor corre las instrucciones en orden. La pista se marca cuando las ocho filas tienen la calle y la ciudad correctas (se comparan sin importar mayúsculas ni espacios de sobra).

**Errores típicos:** olvidar una fila; escribir la ciudad sin tilde (`Bogota`): la comparación exige el texto tal como estaba en la celda original; dejar la coma dentro de la calle.

---

### Pista 6 · Quién entró a la cocina — `WHERE … AND … BETWEEN`

**Qué pide:** id de la persona y hora de cada entrada a la *Cocina* entre las 21:30 y las 22:00.

**Cómo funciona:** `WHERE` filtra filas: solo pasan las que cumplen la condición. `AND` exige que se cumplan las dos. `BETWEEN a AND b` es un rango **con los extremos incluidos**; como las horas son texto `'HH:MM'`, se comparan entre comillas y funcionan porque tienen siempre dos dígitos.

```sql
SELECT id_persona, hora
FROM movimiento
WHERE lugar = 'Cocina' AND hora BETWEEN '21:30' AND '22:00';
```

**Qué devuelve:** 4 filas: 2 (21:35), 8 (21:40), 3 (21:48) y 5 (21:55).

**Error típico:** escribir `hora >= '21:30' AND hora <= '22:00'`: da el mismo resultado, pero la pista pide practicar `BETWEEN` y avisa.

---

### Pista 7 · Qué hicieron después — `IN` + `AND` + `>=`

**Qué pide:** id, lugar y hora de los movimientos de las personas 2, 3, 5 u 8 a partir de las 22:00.

**Cómo funciona:** `IN (lista)` reemplaza una cadena de `OR` (`id = 2 OR id = 3 OR …`) por una lista de valores. Se combina con `AND` para la hora; `>=` incluye las 22:00 en punto.

```sql
SELECT id_persona, lugar, hora
FROM movimiento
WHERE id_persona IN (2, 3, 5, 8) AND hora >= '22:00';
```

**Qué devuelve:** 3 filas: la mesera (22:02) y la dueña (22:05) volvieron al salón; el sous-chef salió a las 22:40.

---

### Pista 8 · La reseña — `LIKE '%…%'`

**Qué pide:** los mensajes cuyo texto contenga la palabra *reseña*.

**Cómo funciona:** `LIKE` compara con un patrón. `%` significa "cualquier cosa (incluso nada)". `'%reseña%'` = la palabra en cualquier posición. `'reseña%'` sería solo al inicio; `'%reseña'` solo al final. El motor no distingue mayúsculas.

```sql
SELECT id_emisor, id_receptor, texto
FROM mensaje
WHERE texto LIKE '%reseña%';
```

**Qué devuelve:** 3 mensajes. El de las 20:00, de la víctima a la dueña, es la clave: *"la reseña ya está escrita. No hay nada que hablar"*.

---

### Pista 9 · A quién le dolía la reseña — `OR`

**Qué pide:** nombre, apellido y rol de quienes son *Dueña del restaurante* o *Proveedora de insumos*.

**Cómo funciona:** `OR` deja pasar la fila si se cumple **cualquiera** de las dos condiciones. Los valores de texto van entre comillas simples y tienen que escribirse exactamente como están en la tabla (con tilde y todo: `'Dueña del restaurante'`).

```sql
SELECT nombre, apellido, rol
FROM persona
WHERE rol = 'Dueña del restaurante' OR rol = 'Proveedora de insumos';
```

**Qué devuelve:** 2 filas: Beatriz Lara y Nora Vélez.

**Error típico:** usar `IN ('Dueña…', 'Proveedora…')`: correcto en SQL, pero la pista quiere `OR` y avisa.

---

### Pista 10 · Cocina o bodega — paréntesis con `OR` y `AND`

**Qué pide:** las pasadas por la *Cocina* o por la *Bodega* a partir de las 21:00.

**Cómo funciona:** cuando se mezclan `OR` y `AND`, el `AND` se evalúa **primero** y se pega a la condición que tiene al lado. Sin paréntesis, `lugar = 'Cocina' OR lugar = 'Bodega' AND hora >= '21:00'` se lee como *"cocina a cualquier hora, o bodega desde las 21:00"*, y salen filas de más. Los paréntesis agrupan el `OR` para que la hora aplique a los dos lugares.

```sql
SELECT id_persona, lugar, hora
FROM movimiento
WHERE (lugar = 'Cocina' OR lugar = 'Bodega') AND hora >= '21:00';
```

**Qué devuelve:** 5 filas. Sin paréntesis salen 10 y la pista lo dice: *"devolvió 10 filas y la pista espera 5"*.

---

### Pista 11 · Los tres pedidos más caros — `ORDER BY … DESC LIMIT`

**Qué pide:** id, plato y precio de los tres pedidos más caros, del más caro al más barato.

**Cómo funciona:** `ORDER BY columna` ordena el resultado; `DESC` de mayor a menor (`ASC`, el valor por defecto, de menor a mayor). `LIMIT n` se queda con las primeras *n* filas **después** de ordenar. El orden de las partes es fijo: `SELECT … FROM … WHERE … ORDER BY … LIMIT …`.

```sql
SELECT id_persona, plato, precio
FROM pedido
ORDER BY precio DESC
LIMIT 3;
```

**Qué devuelve:** el lomo al vino (78.000), el risotto (62.000) y una tabla de quesos (54.000). Aquí el orden de las filas sí se comprueba.

---

### Pista 12 · Cuántos pedidos hizo cada uno — `COUNT` + `GROUP BY`

**Qué pide:** id de la persona y cuántos pedidos hizo.

**Cómo funciona:** `COUNT(*)` cuenta filas. Solo, da un número para toda la tabla. Con `GROUP BY id_persona` arma un grupo por cada valor distinto de `id_persona` y cuenta dentro de cada grupo: una fila por persona. Regla: en el `SELECT` solo pueden ir la columna por la que se agrupa y funciones de agregado (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`).

```sql
SELECT id_persona, COUNT(*)
FROM pedido
GROUP BY id_persona;
```

**Qué devuelve:** 5 filas (solo cinco personas pidieron algo). Se puede poner alias: `COUNT(*) AS total`.

**Error típico:** meter en el `SELECT` una columna que no está en el `GROUP BY` (por ejemplo `plato`): el motor explica que dentro del grupo hay varios valores distintos.

---

### Pista 13 · Quién entró más a la cocina — `WHERE` + `GROUP BY` + `HAVING`

**Qué pide:** id y total de entradas a la cocina, solo de quienes entraron 2 o más veces.

**Cómo funciona:** hay dos filtros y actúan en momentos distintos:

- `WHERE` filtra **filas** antes de agrupar (aquí, solo las de la cocina).
- `HAVING` filtra **grupos** después de agrupar (aquí, los que tienen `COUNT(*) >= 2`).

Un `COUNT(*)` no puede ir en el `WHERE`, porque cuando el `WHERE` corre todavía no se ha contado nada.

```sql
SELECT id_persona, COUNT(*)
FROM movimiento
WHERE lugar = 'Cocina'
GROUP BY id_persona
HAVING COUNT(*) >= 2;
```

**Qué devuelve:** 4 filas: chef, sous-chef, mesera… y la dueña, que no cocina.

---

### Pista 14 · Cuánto compró la dueña — `SUM` + `WHERE`

**Qué pide:** la suma del costo de las compras de la persona 3.

**Cómo funciona:** `SUM(columna)` suma los valores de las filas que pasaron el `WHERE`. Sin `GROUP BY`, devuelve una sola fila con un solo número.

```sql
SELECT SUM(costo)
FROM insumo
WHERE id_persona = 3;
```

**Qué devuelve:** 1.270.000.

---

### Pista 15 · El insumo más caro y el promedio — `MAX` + `AVG`

**Qué pide:** el costo más alto y el costo promedio de todas las compras.

**Cómo funciona:** se pueden pedir varios agregados en el mismo `SELECT`; cada uno resume toda la tabla (no hay `WHERE` ni `GROUP BY`) y sale una sola fila con dos columnas. `MIN` funcionaría igual para el más bajo.

```sql
SELECT MAX(costo), AVG(costo)
FROM insumo;
```

**Qué devuelve:** 720.000 y 208.333,33.

---

### Pista 16 · Quién compró la almendra — `INNER JOIN … ON` + `LIKE`

**Qué pide:** nombre, apellido y producto de las compras cuyo producto contenga *almendra*.

**Cómo funciona:** el nombre está en `persona` y la compra en `insumo`; para verlos juntos hay que **unir** las tablas. `INNER JOIN persona p ON i.id_persona = p.id_persona` empareja cada compra con la persona cuyo id coincide. Los alias (`i`, `p`) acortan los nombres y sirven para decir de qué tabla es cada columna (`p.nombre`, `i.producto`). El `INNER JOIN` solo devuelve filas que tienen pareja en las dos tablas.

```sql
SELECT p.nombre, p.apellido, i.producto
FROM insumo i
INNER JOIN persona p ON i.id_persona = p.id_persona
WHERE i.producto LIKE '%almendra%';
```

**Qué devuelve:** 3 filas: la harina de almendras (chef), las almendras enteras y el **extracto de almendra amarga** (Beatriz Lara).

**Error típico:** olvidar el `ON` (el motor lo exige) o unir con coma (`FROM insumo, persona`): el motor pide `INNER JOIN`.

---

### Pista 17 · Cuántas personas distintas pidieron — `COUNT(DISTINCT …)`

**Qué pide:** el número de personas distintas que aparecen en `pedido`.

**Cómo funciona:** `COUNT(*)` contaría las 30 filas. `COUNT(DISTINCT id_persona)` cuenta cada valor una sola vez, sin importar cuántas veces se repita.

```sql
SELECT COUNT(DISTINCT id_persona)
FROM pedido;
```

**Qué devuelve:** 5.

---

### Pista 18 · Solo hay una verdad — acusar

Ya no hay SQL: aparece una casilla para escribir el nombre del culpable y el botón **Acusar**. Acepta el nombre completo, solo el nombre, solo el apellido o el id (`3`), sin importar mayúsculas ni tildes.

Con los hallazgos en el expediente: la reseña le dolía a la dueña, ella compró el extracto de almendra amarga, entró a la cocina a las 21:48 con la tarta emplatada, le dijo a la mesera que la tarta de la mesa 7 la llevaba ella, y a las 23:10 pidió borrar lo del extracto.

**Culpable: Beatriz Lara.** Una acusación equivocada muestra al detective Mouri riéndose y cuenta como intento fallido.

---

## 4. El cierre

- Aparece **Caso resuelto** con la explicación completa.
- En la práctica no hay nota, pero dice cuánto *habría* dado ese recorrido con las reglas por defecto del examen (5,0 menos 0,1 por cada intento fallido después de los 5 primeros).
- **Descargar informe (PDF)** abre una página aparte con todo el recorrido (cada consulta con su hora) y el botón *Guardar como PDF*. En el examen ese archivo es la entrega.
- **Empezar de cero** (arriba) borra todo y permite repetir.

---

## 5. Lo que cambia en el examen

| | Práctica (*Cena en El Faro*) | Examen (*La gala del museo*, *El último acorde*) |
|---|---|---|
| Acceso | Libre, siempre | Con el código de 6 caracteres que dicta el docente |
| Pistas | 18 | 21 por caso (mismas herramientas, dos `JOIN` cada uno) |
| Nombres y documentos | Opcionales | Obligatorios (se puede en pareja) |
| Reloj | No | Sí: arranca al pulsar *Empezar* y no se detiene |
| Nota | No (solo informativa) | 5,0 por el caso completo, −0,1 por intento fallido después de los libres |
| Informe PDF | Sí | Sí: es la entrega |

Consejo para el examen: **leer la tarea completa antes de escribir**, mirar las columnas en la pestaña *Tablas* (no cuesta intentos) y ejecutar una sola vez cuando la instrucción esté completa. Cada ejecución que no resuelve la pista cuenta.

---

## 6. Resumen de sintaxis usada en el caso

```sql
USE base;                                            -- entrar a la base
SELECT * FROM tabla;                                 -- todas las columnas
SELECT col1, col2 FROM tabla WHERE condicion;        -- filtrar filas
... WHERE a = 1 AND b = 2                            -- las dos
... WHERE a = 1 OR b = 2                             -- cualquiera
... WHERE (a = 1 OR a = 2) AND b >= 'x'              -- los paréntesis agrupan
... WHERE hora BETWEEN '21:30' AND '22:00'           -- rango, extremos incluidos
... WHERE id IN (2, 3, 5, 8)                         -- lista de valores
... WHERE texto LIKE '%palabra%'                     -- contiene
... ORDER BY col DESC LIMIT 3                        -- ordenar y recortar
SELECT col, COUNT(*) FROM tabla GROUP BY col;        -- contar por grupo
... GROUP BY col HAVING COUNT(*) >= 2                -- filtrar grupos
SELECT SUM(x), MAX(x), AVG(x), MIN(x) FROM tabla;    -- agregados
SELECT COUNT(DISTINCT col) FROM tabla;               -- valores distintos
SELECT p.nombre, i.producto                          -- unir dos tablas
  FROM insumo i INNER JOIN persona p ON i.id_persona = p.id_persona;
ALTER TABLE t ADD PRIMARY KEY (col);                 -- llave primaria
ALTER TABLE t ADD FOREIGN KEY (col) REFERENCES padre(col);  -- llave foránea
ALTER TABLE t ADD col TIPO;                          -- columna nueva
UPDATE t SET col = 'valor' WHERE id = n;             -- cambiar una fila
```
