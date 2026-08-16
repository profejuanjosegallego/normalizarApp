-- ============================================================================
-- Taller de Normalizacion — esquema para Supabase
--
-- Pega este archivo completo en el SQL Editor del proyecto de Supabase y
-- ejecutalo una sola vez. Es idempotente: puedes volver a correrlo sin romper
-- nada si mas adelante cambias algo.
--
-- Convive con otros proyectos en la misma base de datos: todo lo del taller
-- lleva el prefijo `norm_`, asi no se cruza con las tablas de tu sitio
-- personal.
--
-- IDEA DE SEGURIDAD
-- La clave publicable (`anon`) viaja dentro del JavaScript que corre en el
-- navegador del estudiante: hay que asumir que cualquiera puede leerla. Por eso
-- aqui `anon` NO tiene ningun permiso sobre la tabla. Lo unico que puede hacer
-- es ejecutar las tres funciones del final, que son `security definer` (corren
-- con permisos del dueño) y validan lo que reciben. En la practica:
--
--   * cualquiera puede LEER un ejercicio si conoce su codigo de 6 caracteres;
--   * cualquiera puede PUBLICAR un ejercicio nuevo;
--   * solo quien tenga la `clave_edicion` (que se guarda en el navegador del
--     docente al publicar) puede MODIFICAR o BORRAR un ejercicio ya existente.
--
-- Es decir: un estudiante curioso que saque la clave del bundle no puede
-- alterar ni borrar el enunciado del taller.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------------

create table if not exists public.norm_ejercicios (
  -- Codigo corto que el docente dicta en clase. Es la clave primaria.
  codigo          text primary key,
  -- Id interno del ejercicio: es la clave con la que el navegador del
  -- estudiante guarda su avance. Se conserva aunque el docente edite el
  -- enunciado, para que nadie pierda el trabajo hecho.
  ejercicio_id    text not null,
  -- El objeto `Ejercicio` completo, tal como lo define lib/tipos.ts.
  datos           jsonb not null,
  -- Secreto que habilita editar este ejercicio despues de publicarlo.
  clave_edicion   uuid not null default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

comment on table public.norm_ejercicios is
  'Enunciados publicados del taller de normalizacion. Solo accesible via las funciones norm_*.';

-- RLS encendido y sin ninguna policy: con `anon` la tabla es invisible.
alter table public.norm_ejercicios enable row level security;
revoke all on public.norm_ejercicios from anon, authenticated;


-- ---------------------------------------------------------------------------
-- Generador de codigos
-- ---------------------------------------------------------------------------

-- Alfabeto sin los caracteres que se confunden al dictarlos en voz alta o al
-- copiarlos de un tablero: sin I, sin O, sin 0, sin 1.
create or replace function public.norm_codigo_aleatorio()
returns text
language sql
volatile
as $$
  select string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                  1 + floor(random() * 32)::int, 1),
           '')
    from generate_series(1, 6);
$$;


-- ---------------------------------------------------------------------------
-- Publicar un ejercicio nuevo
-- ---------------------------------------------------------------------------

create or replace function public.norm_publicar(p_datos jsonb)
returns table (codigo text, clave_edicion uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  intento text;
  vuelta  int := 0;
begin
  if p_datos is null or coalesce(p_datos ->> 'enunciado', '') = '' then
    raise exception 'El ejercicio no trae enunciado.';
  end if;

  -- Tope de tamaño: un enunciado de taller no pasa de unos pocos KB. Evita que
  -- alguien use la funcion como almacenamiento gratis.
  if octet_length(p_datos::text) > 200000 then
    raise exception 'El ejercicio es demasiado grande.';
  end if;

  -- Reintenta si el codigo aleatorio ya estaba tomado.
  loop
    vuelta  := vuelta + 1;
    intento := norm_codigo_aleatorio();
    begin
      return query
        insert into norm_ejercicios (codigo, ejercicio_id, datos)
        values (intento, coalesce(p_datos ->> 'id', intento), p_datos)
        returning norm_ejercicios.codigo, norm_ejercicios.clave_edicion;
      return;
    exception when unique_violation then
      if vuelta >= 10 then
        raise exception 'No se pudo generar un codigo libre.';
      end if;
    end;
  end loop;
end;
$$;


-- ---------------------------------------------------------------------------
-- Abrir un ejercicio por su codigo
-- ---------------------------------------------------------------------------

-- Devuelve solo el enunciado. Nunca expone `clave_edicion`.
create or replace function public.norm_obtener(p_codigo text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select datos
    from norm_ejercicios
   where codigo = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
$$;


-- ---------------------------------------------------------------------------
-- Reeditar un ejercicio ya publicado
-- ---------------------------------------------------------------------------

-- Mantiene el mismo codigo y el mismo `ejercicio_id`, para que los estudiantes
-- conserven el avance que ya tenian.
create or replace function public.norm_actualizar(
  p_codigo text,
  p_clave  uuid,
  p_datos  jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  afectadas int;
begin
  if p_datos is null or coalesce(p_datos ->> 'enunciado', '') = '' then
    raise exception 'El ejercicio no trae enunciado.';
  end if;

  if octet_length(p_datos::text) > 200000 then
    raise exception 'El ejercicio es demasiado grande.';
  end if;

  update norm_ejercicios
     set datos          = p_datos,
         actualizado_en = now()
   where codigo        = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'))
     and clave_edicion = p_clave;

  get diagnostics afectadas = row_count;
  return afectadas > 0;
end;
$$;


-- ---------------------------------------------------------------------------
-- Borrar un ejercicio publicado
-- ---------------------------------------------------------------------------

-- Solo funciona con la `clave_edicion`, igual que reeditar. Sirve para limpiar
-- ejercicios de semestres pasados y liberar espacio.
create or replace function public.norm_eliminar(p_codigo text, p_clave uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  afectadas int;
begin
  delete from norm_ejercicios
   where codigo        = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'))
     and clave_edicion = p_clave;

  get diagnostics afectadas = row_count;
  return afectadas > 0;
end;
$$;


-- ---------------------------------------------------------------------------
-- Permisos: `anon` solo puede ejecutar estas cuatro funciones
-- ---------------------------------------------------------------------------

revoke all on function public.norm_codigo_aleatorio()            from public;
revoke all on function public.norm_publicar(jsonb)               from public;
revoke all on function public.norm_obtener(text)                 from public;
revoke all on function public.norm_actualizar(text, uuid, jsonb) from public;
revoke all on function public.norm_eliminar(text, uuid)          from public;

grant execute on function public.norm_publicar(jsonb)               to anon, authenticated;
grant execute on function public.norm_obtener(text)                 to anon, authenticated;
grant execute on function public.norm_actualizar(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.norm_eliminar(text, uuid)          to anon, authenticated;
