# Tutorial del caso 3 · *Cena en El Faro*

Guía paso a paso del caso de práctica del **Evaluador final**. Sirve para el repaso previo al examen: recorre las 18 pistas en el mismo orden en que aparecen en la app y, en cada una, presenta las **palabras reservadas** de SQL que se usan por primera vez —qué son, para qué sirven y cómo se escriben— antes de mostrar la consulta que resuelve la pista.

> El caso es de acceso libre y permanente: no pide código, no tiene reloj y no da nota. Se puede empezar de cero las veces que haga falta.
>
> En la app la pista **no dice qué instrucción usar**: solo describe el resultado que espera y pregunta *¿qué palabras reservadas necesitas para esto?* Este tutorial es la respuesta a esa pregunta, pista por pista.

---

## 1. Antes de empezar

### Cómo se abre

1. En la portada de la app, botón **Resolver los casos** (o directamente `/evaluador`).
2. Arriba, en la sección *Antes del examen · acceso libre*, está la tarjeta **Cena en El Faro**. Clic en **Abrir el caso**.
3. Aparece la pantalla previa: nombres (opcionales en la práctica), las reglas y la escena del crimen. Botón **Empezar la práctica**.

### Cómo es la pantalla del caso

| Zona | Qué hay |
|---|---|
| **Pista en curso** (arriba a la izquierda) | El relato y la **tarea** en el recuadro azul. No dice qué instrucción usar. Solo en la práctica hay un desplegable *Ver las herramientas* por si el grupo se atasca. |
| **Editor de SQL** | Donde se escribe la instrucción. Se ejecuta con el botón **Ejecutar** o con `Ctrl + Enter`. Si se selecciona un trozo del texto, se ejecuta solo ese trozo. |
| **Resultado** | Lo que devolvió el motor: una rejilla de filas, un mensaje, o un error en rojo con su pista. |
| **Expediente** (pestaña derecha) | La lista de pistas: las resueltas con su hallazgo, la actual marcada *en curso*, las que faltan con candado. |
| **Tablas** (pestaña derecha) | Todas las tablas de la base con sus columnas, tipos, llaves y las primeras filas. **Mirar aquí no cuesta intentos.** |
| **Sintaxis** (pestaña derecha) | La chuleta con la forma de cada instrucción. |

### Cómo se resuelve una pista

Cada vez que se ejecuta algo, el detective compara lo que devolvió el motor con lo que la pista esperaba. Si coincide, la pista se marca sola y aparece el **Hallazgo**. Si no:

- *"El resultado es el correcto, pero esta pista se resuelve con BETWEEN"* → llegaste al mismo resultado por otro camino; la pista quiere que practiques justo esa palabra. Reescríbela.
- *"La consulta corrió, pero devolvió 10 filas y la pista espera 5"* → la condición deja pasar filas de más (o de menos).
- *"…trae 3 filas, que es lo esperado, pero no las columnas o el orden que pide"* → revisa qué columnas hay que mostrar, o si pedía un orden.
- Error en rojo → error de sintaxis o de nombres; el motor dice la línea y da una pista.

Cada ejecución que **no** resuelve la pista en curso cuenta como *intento fallido*. En la práctica solo se cuentan para que veas cómo será el examen.

**Regla de oro:** la comparación es tolerante con las columnas de más, los alias y el orden de las columnas. Lo que importa es que estén las filas correctas y las columnas que la tarea pide.

### Qué es una palabra reservada

Las **palabras reservadas** son las palabras que SQL ya tiene apartadas para sus instrucciones: `SELECT`, `FROM`, `WHERE`, `AND`… No se pueden usar como nombre de tabla o de columna, y se escriben igual en cualquier base de datos. Por costumbre van en **MAYÚSCULAS** (el motor las entiende también en minúsculas, pero en mayúsculas se distinguen de los nombres de tus tablas). Cada pista de este caso introduce una o dos; al final del documento están todas juntas.

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

Dos detalles que conviene notar desde el principio: las **horas** están guardadas como texto `'HH:MM'` (por eso van entre comillas y se pueden comparar), y las demás tablas hablan de las personas **por su id**, no por su nombre.

---

## 3. Pista por pista

### Pista 1 · El expediente

**Qué pide:** entrar a la base de datos del caso.

#### Palabra reservada nueva: `USE`

- **Qué es:** la instrucción que elige la base de datos de trabajo.
- **Para qué sirve:** un servidor puede tener varias bases; hasta que no digas en cuál estás, ningún `SELECT` sabe de qué tablas hablas. En la pestaña *Tablas* la base sin activar aparece sin el chip *en uso*.
- **Forma:** `USE nombre_de_la_base;`

```sql
USE caso_faro;
```

**Error típico:** olvidar el punto y coma, o escribir letras de más en el nombre de la base.

---

### Pista 2 · Los de esa noche

**Qué pide:** la lista completa de personas, con todas sus columnas.

#### Palabras reservadas nuevas: `SELECT`, `FROM`, `*`

- **`SELECT`** — *seleccionar*. Es la instrucción de consulta: la que lee datos sin cambiarlos. Después de `SELECT` va la lista de columnas que quieres ver, separadas por coma.
- **`FROM`** — *desde*. Dice de qué tabla se leen esas columnas.
- **`*`** — el asterisco significa *todas las columnas*. Es cómodo para mirar una tabla; en el examen conviene nombrar las columnas que la pista pide.
- **Forma:** `SELECT columna1, columna2 FROM tabla;` o `SELECT * FROM tabla;`

```sql
SELECT * FROM persona;
```

**Qué devuelve:** 8 filas. Fíjate en `direccion_completa`: trae la calle y la ciudad en una sola celda. Eso se arregla en la pista 5.

---

### Pista 3 · Movimientos sin identificar

**Qué pide:** decidir cuál columna identifica cada movimiento sin repetirse nunca y declararla llave primaria.

#### Palabras reservadas nuevas: `ALTER TABLE`, `ADD`, `PRIMARY KEY`

- **`ALTER TABLE`** — *modificar tabla*. Cambia la estructura de una tabla que ya existe (no sus datos). Va seguida del nombre de la tabla y de lo que se le hace.
- **`ADD`** — *agregar*. Lo que se le añade a la tabla: una columna, una llave primaria, una llave foránea.
- **`PRIMARY KEY`** — *llave primaria*. Declara la columna cuyo valor identifica cada fila: no puede repetirse ni quedar en NULL. El motor **rechaza** la llave si encuentra valores repetidos.
- **Forma:** `ALTER TABLE tabla ADD PRIMARY KEY (columna);`

Mira las columnas en *Tablas*: `hora` se repite (dos personas pueden pasar a la misma hora), `lugar` se repite, `id_persona` se repite. La única que no se repite es `id_movimiento`, que existe justamente para eso.

```sql
ALTER TABLE movimiento ADD PRIMARY KEY (id_movimiento);
```

**Error típico:** elegir `hora` → *"No puedo poner esa llave primaria: el valor ('…') está repetido"*. Si pones una llave que el motor acepta pero no es la esperada, la pista avisa y hay que usar **Restaurar la base** (arriba), porque una llave primaria no se puede quitar.

---

### Pista 4 · Pedidos de nadie

**Qué pide:** declarar en `pedido` la llave foránea que conecta `id_persona` con `persona`.

#### Palabras reservadas nuevas: `FOREIGN KEY`, `REFERENCES`

- **`FOREIGN KEY`** — *llave foránea*. Declara que una columna de esta tabla apunta a la llave primaria de otra. Desde ese momento el motor garantiza que cada pedido señale a una persona que exista, y no dejará borrar a una persona que tenga pedidos.
- **`REFERENCES`** — *hace referencia a*. Dice a qué tabla y a qué columna apunta la llave foránea.
- **Forma:** `ALTER TABLE tabla_hija ADD FOREIGN KEY (columna_propia) REFERENCES tabla_padre(columna_padre);`

```sql
ALTER TABLE pedido ADD FOREIGN KEY (id_persona) REFERENCES persona(id_persona);
```

**Error típico:** invertir el orden: primero la columna de *esta* tabla, después `REFERENCES` con la tabla a la que apunta.

---

### Pista 5 · Calle y ciudad

**Qué pide:** agregar las columnas `calle` y `ciudad` y llenarlas para las ocho personas, partiendo `direccion_completa` por la coma.

#### Palabras reservadas nuevas: `UPDATE`, `SET`, `WHERE`, `VARCHAR`

- **`ADD columna TIPO`** (ya conocías `ADD`) — con `ALTER TABLE` también agrega columnas nuevas. **`VARCHAR(n)`** es el tipo de dato *texto de hasta n caracteres*.
- **`UPDATE`** — *actualizar*. Cambia el valor de columnas en filas que ya existen. Es la instrucción de corregir datos.
- **`SET`** — *fijar*. Dentro del `UPDATE`, dice qué columna toma qué valor: `SET columna = valor`. Varias columnas van separadas por coma.
- **`WHERE`** — *donde*. Es la **condición**: solo las filas que la cumplen se ven afectadas. Aparece aquí por primera vez y va a estar en casi todas las pistas siguientes. **Un `UPDATE` sin `WHERE` cambia todas las filas de la tabla.**
- **Forma:** `UPDATE tabla SET col1 = 'valor', col2 = 'valor' WHERE id = n;`

Esto es **atomicidad** (1FN): una celda debe guardar un solo dato. Dos pasos: agregar las columnas y llenarlas fila por fila.

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

Se puede pegar todo junto y ejecutar de una vez: el motor corre las instrucciones en orden. La pista se marca cuando las ocho filas tienen la calle y la ciudad correctas.

**Errores típicos:** olvidar una fila; escribir `Bogota` sin tilde (se compara con el texto original); dejar la coma dentro de la calle.

---

### Pista 6 · Quién entró a la cocina

**Qué pide:** id de la persona y hora de cada entrada a la *Cocina* entre las 21:30 y las 22:00.

#### Palabras reservadas nuevas: `AND`, `BETWEEN`

- **`WHERE` en un `SELECT`** — la misma condición de la pista anterior, ahora para *filtrar*: solo pasan al resultado las filas que la cumplen. Comparadores: `=`, `<>` (distinto), `<`, `>`, `<=`, `>=`.
- **`AND`** — *y*. Une dos condiciones y exige que se cumplan **las dos**. `lugar = 'Cocina' AND hora …` = *que sea la cocina y además esa hora*.
- **`BETWEEN … AND …`** — *entre … y …*. Un rango con los **dos extremos incluidos**. `hora BETWEEN '21:30' AND '22:00'` es lo mismo que `hora >= '21:30' AND hora <= '22:00'`, pero más corto y más claro. Ojo: el `AND` de adentro del `BETWEEN` es parte de la palabra, no una segunda condición.
- **Forma:** `SELECT … FROM tabla WHERE columna = 'valor' AND columna2 BETWEEN a AND b;`

Como las horas son texto `'HH:MM'`, van entre comillas y se comparan bien porque siempre tienen dos dígitos.

```sql
SELECT id_persona, hora
FROM movimiento
WHERE lugar = 'Cocina' AND hora BETWEEN '21:30' AND '22:00';
```

**Qué devuelve:** 4 filas: 2 (21:35), 8 (21:40), 3 (21:48) y 5 (21:55).

**Error típico:** escribir `hora >= '21:30' AND hora <= '22:00'`: da el mismo resultado, pero la pista pide practicar `BETWEEN` y avisa.

---

### Pista 7 · Qué hicieron después

**Qué pide:** id, lugar y hora de los movimientos de las personas 2, 3, 5 u 8 a partir de las 22:00.

#### Palabra reservada nueva: `IN`

- **`IN (lista)`** — *está en la lista*. Compara una columna con **varios valores** a la vez: la fila pasa si su valor es cualquiera de los de la lista. Reemplaza una cadena larga de `OR`: `id_persona = 2 OR id_persona = 3 OR id_persona = 5 OR id_persona = 8` se escribe `id_persona IN (2, 3, 5, 8)`. Los valores van entre paréntesis, separados por coma; si son texto, cada uno entre comillas.
- **`>=`** — *mayor o igual*. Incluye el valor exacto: `hora >= '22:00'` toma las 22:00 en punto y todo lo posterior.
- **Forma:** `WHERE columna IN (v1, v2, v3) AND otra >= 'x'`

```sql
SELECT id_persona, lugar, hora
FROM movimiento
WHERE id_persona IN (2, 3, 5, 8) AND hora >= '22:00';
```

**Qué devuelve:** 3 filas: la mesera (22:02) y la dueña (22:05) volvieron al salón; el sous-chef salió a las 22:40.

**Error típico:** escribir la cadena de `OR`: correcto en SQL, pero la pista quiere `IN` y avisa.

---

### Pista 8 · La reseña

**Qué pide:** los mensajes cuyo texto contenga la palabra *reseña*.

#### Palabras reservadas nuevas: `LIKE`, `%`

- **`LIKE`** — *parecido a*. Compara un texto con un **patrón**, no con un valor exacto. Sirve para buscar "contiene", "empieza por", "termina en".
- **`%`** — el comodín: *cualquier cosa, incluso nada*. Se combina así:
  - `'%reseña%'` → contiene *reseña* en cualquier posición.
  - `'reseña%'` → empieza por *reseña*.
  - `'%reseña'` → termina en *reseña*.
  - (Existe también `_`, que es *exactamente un carácter cualquiera*; no hace falta en este caso.)
- El motor no distingue mayúsculas de minúsculas al comparar.
- **Forma:** `WHERE columna LIKE '%texto%'`

```sql
SELECT id_emisor, id_receptor, texto
FROM mensaje
WHERE texto LIKE '%reseña%';
```

**Qué devuelve:** 3 mensajes. El de las 20:00, de la víctima a la dueña, es la clave: *"la reseña ya está escrita. No hay nada que hablar"*.

**Error típico:** usar `=` en vez de `LIKE` (`texto = 'reseña'` solo encontraría un mensaje que fuera exactamente esa palabra), u olvidar los `%`.

---

### Pista 9 · A quién le dolía la reseña

**Qué pide:** nombre, apellido y rol de quienes son *Dueña del restaurante* o *Proveedora de insumos*.

#### Palabra reservada nueva: `OR`

- **`OR`** — *o*. Une dos condiciones y deja pasar la fila si se cumple **cualquiera** de las dos (o las dos). Compáralo con `AND`, que exige las dos.
- Los valores de texto van entre comillas simples y se escriben exactamente como están en la tabla (con tilde y todo: `'Dueña del restaurante'`).
- **Forma:** `WHERE columna = 'a' OR columna = 'b'`

```sql
SELECT nombre, apellido, rol
FROM persona
WHERE rol = 'Dueña del restaurante' OR rol = 'Proveedora de insumos';
```

**Qué devuelve:** 2 filas: Beatriz Lara y Nora Vélez.

**Error típico:** usar `IN ('Dueña…', 'Proveedora…')`: correcto en SQL, pero la pista quiere `OR` y avisa. Otro clásico: `rol = 'Dueña del restaurante' OR 'Proveedora de insumos'` (falta repetir `rol =` en la segunda condición).

---

### Pista 10 · Cocina o bodega

**Qué pide:** las pasadas por la *Cocina* o por la *Bodega* a partir de las 21:00.

#### Nuevo: los paréntesis `( )` cuando se mezclan `OR` y `AND`

- No es una palabra, pero es la regla más importante de esta pista: cuando en un `WHERE` hay `OR` y `AND` juntos, **el `AND` se evalúa primero** y se pega a la condición que tiene al lado.
- Sin paréntesis, `lugar = 'Cocina' OR lugar = 'Bodega' AND hora >= '21:00'` se lee como *"cocina a cualquier hora, **o** bodega desde las 21:00"*, y salen filas de más.
- Los paréntesis agrupan: `(lugar = 'Cocina' OR lugar = 'Bodega') AND hora >= '21:00'` = *"cualquiera de los dos lugares, **y además** desde las 21:00"*.
- **Forma:** `WHERE (cond1 OR cond2) AND cond3`

```sql
SELECT id_persona, lugar, hora
FROM movimiento
WHERE (lugar = 'Cocina' OR lugar = 'Bodega') AND hora >= '21:00';
```

**Qué devuelve:** 5 filas. Sin paréntesis salen 10 y la pista lo dice: *"devolvió 10 filas y la pista espera 5"*.

---

### Pista 11 · Los tres pedidos más caros

**Qué pide:** id, plato y precio de los tres pedidos más caros, del más caro al más barato.

#### Palabras reservadas nuevas: `ORDER BY`, `DESC`, `ASC`, `LIMIT`

- **`ORDER BY columna`** — *ordenar por*. Ordena las filas del resultado según esa columna. Va **después** del `WHERE` (si lo hay).
- **`DESC`** — *descendente*: de mayor a menor. **`ASC`** — *ascendente*: de menor a mayor; es el valor por defecto, así que se puede omitir.
- **`LIMIT n`** — *límite*. Se queda solo con las primeras *n* filas del resultado, **después** de ordenar. Por eso "los tres más caros" = ordenar de mayor a menor y limitar a 3.
- **Forma (y el orden fijo de las partes):** `SELECT … FROM … WHERE … ORDER BY columna DESC LIMIT n;`

```sql
SELECT id_persona, plato, precio
FROM pedido
ORDER BY precio DESC
LIMIT 3;
```

**Qué devuelve:** el lomo al vino (78.000), el risotto (62.000) y una tabla de quesos (54.000). Aquí el orden de las filas sí se comprueba.

**Error típico:** poner `LIMIT` antes de `ORDER BY`, o usar `ORDER BY 3` (número de columna) en vez del nombre.

---

### Pista 12 · Cuántos pedidos hizo cada uno

**Qué pide:** id de la persona y cuántos pedidos hizo.

#### Palabras reservadas nuevas: `COUNT`, `GROUP BY`

- **`COUNT(*)`** — *contar*. Es una **función de agregado**: resume muchas filas en un número. `COUNT(*)` cuenta filas. Sola, devuelve un único número para toda la tabla.
- **`GROUP BY columna`** — *agrupar por*. Arma un grupo por cada valor distinto de la columna y aplica el agregado **dentro de cada grupo**: sale una fila por grupo. `GROUP BY id_persona` = un grupo por persona, y `COUNT(*)` cuenta los pedidos de cada una.
- **Regla:** en el `SELECT` solo pueden ir la columna por la que se agrupa y funciones de agregado (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`).
- **`AS`** (opcional) — *como*. Le pone un alias a la columna del resultado: `COUNT(*) AS total`.
- **Forma:** `SELECT columna, COUNT(*) FROM tabla GROUP BY columna;`

```sql
SELECT id_persona, COUNT(*)
FROM pedido
GROUP BY id_persona;
```

**Qué devuelve:** 5 filas (solo cinco personas pidieron algo).

**Error típico:** meter en el `SELECT` una columna que no está en el `GROUP BY` (por ejemplo `plato`): el motor explica que dentro del grupo hay varios valores distintos.

---

### Pista 13 · Quién entró más a la cocina

**Qué pide:** id y total de entradas a la cocina, solo de quienes entraron 2 o más veces.

#### Palabra reservada nueva: `HAVING`

- **`HAVING`** — *teniendo*. Es la condición **para grupos**: filtra los grupos que armó `GROUP BY` según su agregado. `HAVING COUNT(*) >= 2` = *solo los grupos con dos o más filas*.
- **Diferencia con `WHERE`:** los dos filtran, pero en momentos distintos.
  - `WHERE` filtra **filas** *antes* de agrupar (aquí: solo las de la cocina).
  - `HAVING` filtra **grupos** *después* de agrupar (aquí: los que tienen 2 o más).
  - Un `COUNT(*)` no puede ir en el `WHERE`, porque cuando el `WHERE` corre todavía no se ha contado nada.
- **Forma:** `SELECT columna, COUNT(*) FROM tabla WHERE … GROUP BY columna HAVING COUNT(*) >= n;`

```sql
SELECT id_persona, COUNT(*)
FROM movimiento
WHERE lugar = 'Cocina'
GROUP BY id_persona
HAVING COUNT(*) >= 2;
```

**Qué devuelve:** 4 filas: chef, sous-chef, mesera… y la dueña, que no cocina.

**Error típico:** `WHERE COUNT(*) >= 2` → el motor responde que el `WHERE` filtra fila por fila antes de agrupar.

---

### Pista 14 · Cuánto compró la dueña

**Qué pide:** la suma del costo de las compras de la persona 3.

#### Palabra reservada nueva: `SUM`

- **`SUM(columna)`** — *sumar*. Función de agregado: suma los valores numéricos de la columna en las filas que pasaron el `WHERE`. Sin `GROUP BY`, devuelve una sola fila con un solo número.
- Solo funciona con columnas numéricas (`INT`, `DECIMAL`).
- **Forma:** `SELECT SUM(columna) FROM tabla WHERE …;`

```sql
SELECT SUM(costo)
FROM insumo
WHERE id_persona = 3;
```

**Qué devuelve:** 1.270.000.

---

### Pista 15 · El insumo más caro y el promedio

**Qué pide:** el costo más alto y el costo promedio de todas las compras.

#### Palabras reservadas nuevas: `MAX`, `AVG` (y `MIN`)

- **`MAX(columna)`** — *máximo*. El valor más alto de la columna.
- **`MIN(columna)`** — *mínimo*. El más bajo. (No se usa en esta pista, pero es la pareja de `MAX` y sale en el examen.)
- **`AVG(columna)`** — *average*, promedio. La suma dividida por el número de filas.
- Se pueden pedir varios agregados en el mismo `SELECT`: sale una sola fila con una columna por agregado. Sin `WHERE` ni `GROUP BY`, resumen toda la tabla.
- **Forma:** `SELECT MAX(columna), AVG(columna) FROM tabla;`

```sql
SELECT MAX(costo), AVG(costo)
FROM insumo;
```

**Qué devuelve:** 720.000 y 208.333,33.

---

### Pista 16 · Quién compró la almendra

**Qué pide:** nombre, apellido y producto de las compras cuyo producto contenga *almendra*.

#### Palabras reservadas nuevas: `INNER JOIN`, `ON`

- **`INNER JOIN`** — *unión interna*. Junta dos tablas en una sola consulta, emparejando sus filas. Se necesita cuando lo que quieres mostrar está repartido: el nombre está en `persona` y la compra en `insumo`.
- **`ON`** — *sobre*. La condición de emparejamiento: qué columna de una tabla debe coincidir con qué columna de la otra. Casi siempre es la llave foránea contra la llave primaria: `ON i.id_persona = p.id_persona`.
- **Alias de tabla** (`insumo i`, `persona p`): un nombre corto para cada tabla, que luego se usa como prefijo para decir de cuál es cada columna (`p.nombre`, `i.producto`). Es obligatorio prefijar las columnas que existen en las dos tablas (`id_persona`).
- El `INNER JOIN` solo devuelve las filas que **tienen pareja** en las dos tablas.
- El `WHERE` y el `LIKE` funcionan igual después del `JOIN`.
- **Forma:** `SELECT a.col, b.col FROM tabla_a a INNER JOIN tabla_b b ON a.llave = b.llave WHERE …;`

```sql
SELECT p.nombre, p.apellido, i.producto
FROM insumo i
INNER JOIN persona p ON i.id_persona = p.id_persona
WHERE i.producto LIKE '%almendra%';
```

**Qué devuelve:** 3 filas: la harina de almendras (chef), las almendras enteras y el **extracto de almendra amarga** (Beatriz Lara).

**Error típico:** olvidar el `ON` (el motor lo exige) o unir con coma (`FROM insumo, persona`): el motor pide `INNER JOIN`.

---

### Pista 17 · Cuántas personas distintas pidieron

**Qué pide:** el número de personas distintas que aparecen en `pedido`.

#### Palabra reservada nueva: `DISTINCT`

- **`DISTINCT`** — *distinto*. Elimina los repetidos: cada valor se toma una sola vez.
- Dentro de `COUNT`: `COUNT(DISTINCT id_persona)` cuenta cuántos ids **diferentes** hay, sin importar cuántas veces se repita cada uno. `COUNT(*)` habría contado las 30 filas.
- También sirve solo: `SELECT DISTINCT id_persona FROM pedido;` lista los ids sin repetir.
- **Forma:** `SELECT COUNT(DISTINCT columna) FROM tabla;`

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
| Pistas | 18 | 21 por caso (mismas palabras, dos `JOIN` cada uno) |
| Ayuda de herramientas | Desplegable *Ver las herramientas* | No existe |
| Nombres y documentos | Opcionales | Obligatorios (se puede en pareja) |
| Reloj | No | Sí: arranca al pulsar *Empezar* y no se detiene |
| Nota | No (solo informativa) | 5,0 por el caso completo, −0,1 por intento fallido después de los libres |
| Informe PDF | Sí | Sí: es la entrega |

Consejo para el examen: **leer la tarea completa antes de escribir**, preguntarse qué palabras reservadas hacen falta, mirar las columnas en la pestaña *Tablas* (no cuesta intentos) y ejecutar una sola vez cuando la instrucción esté completa.

---

## 6. Diccionario de palabras reservadas del caso

En el orden en que aparecen.

| Palabra | Pista | Qué hace | Ejemplo |
|---|---|---|---|
| `USE` | 1 | Elige la base de datos de trabajo | `USE caso_faro;` |
| `SELECT` | 2 | Consulta: elige columnas | `SELECT nombre, rol` |
| `FROM` | 2 | De qué tabla | `FROM persona` |
| `*` | 2 | Todas las columnas | `SELECT * FROM persona;` |
| `ALTER TABLE` | 3 | Modifica la estructura de una tabla | `ALTER TABLE movimiento …` |
| `ADD` | 3 | Agrega columna o llave | `ADD calle VARCHAR(60)` |
| `PRIMARY KEY` | 3 | Llave primaria: identifica la fila, sin repetidos | `ADD PRIMARY KEY (id_movimiento)` |
| `FOREIGN KEY` | 4 | Llave foránea: apunta a otra tabla | `ADD FOREIGN KEY (id_persona)` |
| `REFERENCES` | 4 | Tabla y columna a la que apunta | `REFERENCES persona(id_persona)` |
| `VARCHAR(n)` | 5 | Tipo texto de hasta n caracteres | `ciudad VARCHAR(40)` |
| `UPDATE` | 5 | Cambia datos de filas existentes | `UPDATE persona …` |
| `SET` | 5 | Qué columna toma qué valor | `SET ciudad = 'Cali'` |
| `WHERE` | 5–6 | Condición: qué filas | `WHERE id_persona = 4` |
| `AND` | 6 | Las dos condiciones | `a = 1 AND b = 2` |
| `BETWEEN … AND …` | 6 | Rango, extremos incluidos | `hora BETWEEN '21:30' AND '22:00'` |
| `IN (…)` | 7 | Está en la lista | `id_persona IN (2, 3, 5, 8)` |
| `>=` `<=` `<>` | 7 | Comparadores | `hora >= '22:00'` |
| `LIKE` | 8 | Compara con un patrón | `texto LIKE '%reseña%'` |
| `%` | 8 | Comodín: cualquier cosa | `'%almendra%'` |
| `OR` | 9 | Cualquiera de las condiciones | `rol = 'a' OR rol = 'b'` |
| `( )` | 10 | Agrupa condiciones | `(a OR b) AND c` |
| `ORDER BY` | 11 | Ordena el resultado | `ORDER BY precio` |
| `DESC` / `ASC` | 11 | De mayor a menor / de menor a mayor | `ORDER BY precio DESC` |
| `LIMIT` | 11 | Solo las primeras n filas | `LIMIT 3` |
| `COUNT` | 12 | Cuenta filas | `COUNT(*)` |
| `GROUP BY` | 12 | Un grupo por cada valor | `GROUP BY id_persona` |
| `AS` | 12 | Alias | `COUNT(*) AS total` |
| `HAVING` | 13 | Condición sobre los grupos | `HAVING COUNT(*) >= 2` |
| `SUM` | 14 | Suma | `SUM(costo)` |
| `MAX` / `MIN` | 15 | Máximo / mínimo | `MAX(costo)` |
| `AVG` | 15 | Promedio | `AVG(costo)` |
| `INNER JOIN` | 16 | Une dos tablas | `insumo i INNER JOIN persona p` |
| `ON` | 16 | Condición de emparejamiento | `ON i.id_persona = p.id_persona` |
| `DISTINCT` | 17 | Sin repetidos | `COUNT(DISTINCT id_persona)` |
