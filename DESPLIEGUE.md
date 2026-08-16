# Puesta en marcha: Supabase y Vercel

Guía para dejar la app funcionando con códigos de ejercicio. Son dos cosas
independientes y hay que hacer las dos:

1. **Supabase** guarda los enunciados. Sin esto, el botón "Publicar y obtener
   código" falla.
2. **Vercel** necesita saber la dirección de tu Supabase. Sin esto, la app
   desplegada no encuentra el servidor aunque el paso 1 esté hecho.

Al final hay una sección de comprobación para verificar que quedó bien.

---

## Parte 1 · Supabase: crear las tablas y funciones

Se hace **una sola vez**. Vas a reutilizar el mismo proyecto de tu web personal
(`xvbatmcnohbtknexfqty`); las tablas del taller llevan el prefijo `norm_` y no
se cruzan con las que ya tienes.

1. Entra a **https://supabase.com/dashboard** e inicia sesión.

2. En la lista de proyectos, abre el proyecto **`xvbatmcnohbtknexfqty`** (el
   mismo de tu sitio personal).

3. En la barra lateral izquierda busca el icono de **SQL Editor** (dice `SQL`).
   Haz clic.

4. Arriba a la izquierda del editor, pulsa **`+ New query`** (o "New snippet").
   Se abre un recuadro de texto vacío.

5. Abre el archivo **`supabase/esquema.sql`** de este proyecto, selecciona
   **todo** el contenido (`Ctrl+A`) y cópialo (`Ctrl+C`).

6. Pégalo (`Ctrl+V`) dentro del recuadro del SQL Editor.

7. Pulsa el botón verde **`Run`** abajo a la derecha (o `Ctrl+Enter`).

8. Debe aparecer abajo un mensaje verde tipo **`Success. No rows returned`**.
   Eso es lo correcto: el script crea cosas, no consulta datos.

   > Si sale un error en rojo, léelo y avísame con el texto exacto. El script se
   > puede volver a ejecutar tantas veces como quieras sin romper nada.

### Comprobar que quedó creado

- En la barra lateral entra a **Table Editor**. En el desplegable de esquema
  (arriba, dice `public`) debe aparecer la tabla **`norm_ejercicios`**, vacía.
- En **Database → Functions** deben aparecer `norm_publicar`, `norm_obtener`,
  `norm_actualizar`, `norm_eliminar` y `norm_codigo_aleatorio`.

### Dónde ver los ejercicios publicados

Cuando ya hayas publicado alguno: **Table Editor → `norm_ejercicios`**. Ahí ves
el código, la fecha y el enunciado completo en la columna `datos`.

> Puedes borrar filas desde aquí también, pero es más cómodo hacerlo desde
> `/profesor`, que te muestra el título de cada uno.

---

## Parte 2 · Vercel: cargar las variables de entorno

La app necesita dos valores para saber a qué Supabase hablarle. Ya te dejé el
archivo **`supa.env`** en la raíz del proyecto con los dos, listo para subir.

> `supa.env` está en `.gitignore` a propósito: vive solo en tu computador.

### Si el proyecto **todavía no existe** en Vercel

1. Entra a **https://vercel.com** e inicia sesión con tu cuenta de GitHub.
2. Pulsa **`Add New…` → `Project`**.
3. Busca el repositorio **`bdnormalizacion`** y pulsa **`Import`**.
4. En la pantalla de configuración, **antes de desplegar**, despliega la sección
   **`Environment Variables`**.
5. Ahí mismo puedes arrastrar el archivo `supa.env`, o pulsar el enlace
   **`Import .env`** y seleccionarlo. Deben aparecer las dos variables
   (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
6. Pulsa **`Deploy`** y espera a que termine.

### Si el proyecto **ya existe** en Vercel

1. Entra al proyecto **`bdnormalizacion`** en Vercel.
2. Arriba, pestaña **`Settings`**.
3. En el menú izquierdo, **`Environment Variables`**.
4. Pulsa **`Import .env`** y elige el archivo `supa.env` (o crea las dos
   variables a mano, una por una, con el botón `Add Another`).
5. Asegúrate de que en **Environments** estén marcados los tres:
   **Production, Preview y Development**.
6. Pulsa **`Save`**.
7. **Importante:** las variables solo entran en el sitio con un despliegue
   nuevo. Ve a la pestaña **`Deployments`**, abre el último de la lista, pulsa
   el menú **`···`** de la derecha y elige **`Redeploy`**.

   > Si no haces este último paso, el sitio sigue funcionando con las variables
   > viejas (o sin ninguna) y seguirás viendo "Sin servidor configurado".

---

## Parte 3 · Comprobar que todo quedó bien

1. Abre tu sitio en Vercel y entra a **`/profesor`** (escribiendo la ruta en la
   barra de direcciones: la portada ya no tiene ese enlace).
2. Pulsa **`Usar ejemplo`** para llenar el formulario rápido.
3. Baja hasta **Compartir** y pulsa **`Publicar y obtener código`**.
4. Debe aparecer un código de 6 caracteres, en grande, y el aviso verde
   **"Publicado y al día"**.
5. Abre la portada del sitio en otra pestaña, escribe ese código y pulsa
   **Empezar**. Debe cargar el enunciado.
6. Vuelve a `/profesor`, baja a **Ejercicios publicados** y bórralo con
   **`Borrar`** para no dejar el ejemplo dando vueltas.

### Si algo falla

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| "La base de datos aún no tiene instaladas las funciones del taller" | Falta la Parte 1 | Corre `supabase/esquema.sql` en el SQL Editor |
| "Sin servidor configurado" | Faltan las variables | Parte 2, y **redeploy** |
| "Supabase rechazó la clave publicable" | La clave está mal copiada | Cópiala de nuevo desde Supabase (ver abajo) |
| "No hay conexión con el servidor" | Internet, o el proyecto de Supabase está pausado | Entra al dashboard de Supabase y reactívalo |

### De dónde salen esos dos valores

En Supabase: **Project Settings → API Keys**.

- `NEXT_PUBLIC_SUPABASE_URL` es la **Project URL**.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` es la clave **publishable / anon**, la que
  empieza por `sb_publishable_`.

La clave publicable está pensada para ir en el navegador: no da acceso a
ninguna tabla. Lo que protege los datos son las funciones del esquema, que son
lo único que puede ejecutar. **La clave secreta (`service_role`) no se usa en
este proyecto y no debe ponerse aquí.**

---

## Notas de mantenimiento

- **Los proyectos gratuitos de Supabase se pausan tras ~una semana sin
  actividad.** Como este es el mismo de tu web personal, se mantiene despierto
  solo. Si alguna vez ves "No hay conexión", entra al dashboard y reactívalo.

- **Borrar ejercicios viejos.** En `/profesor`, sección *Ejercicios
  publicados*. Solo salen los que publicaste **desde ese navegador**: la clave
  que autoriza el borrado se guarda ahí. Si formateas el equipo o borras los
  datos del sitio, esos ejercicios quedan huérfanos y solo los puedes eliminar
  desde el Table Editor de Supabase.

- **Reeditar un enunciado.** Corrige el texto en `/profesor` y pulsa *Publicar
  los cambios*: el código no cambia y tus estudiantes conservan el avance.
