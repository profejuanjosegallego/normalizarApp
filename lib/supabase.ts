import type { Ejercicio } from "./tipos";

/**
 * Acceso a Supabase para publicar y abrir ejercicios por codigo.
 *
 * La app solo necesita tres operaciones y las tres son funciones RPC definidas
 * en `supabase/esquema.sql`. Llamarlas con `fetch` evita arrastrar el SDK
 * completo de Supabase (auth, realtime, storage), que aqui no se usa.
 *
 * La clave publicable viaja al navegador a proposito: no da acceso a ninguna
 * tabla. Lo que protege los datos son las funciones `security definer` del
 * esquema, que son lo unico que el rol `anon` puede ejecutar.
 */

const URL_BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const CLAVE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Sin variables de entorno la app sigue funcionando con enlaces `#e=`. */
export function hayBackend(): boolean {
  return URL_BASE.length > 0 && CLAVE.length > 0;
}

/** Error con mensaje ya redactado para mostrarle al usuario. */
export class ErrorBackend extends Error {}

async function rpc<T>(funcion: string, cuerpo: Record<string, unknown>): Promise<T> {
  if (!hayBackend()) {
    throw new ErrorBackend("Esta copia de la app no tiene configurado el servidor de ejercicios.");
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_BASE}/rest/v1/rpc/${funcion}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: CLAVE,
        Authorization: `Bearer ${CLAVE}`,
      },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorBackend("No hay conexión con el servidor. Revisa tu internet.");
  }

  if (!respuesta.ok) {
    // PostgREST responde el mensaje del `raise exception` en `message`.
    const detalle = await respuesta.text();
    let cuerpo: { message?: string; code?: string } = {};
    try {
      cuerpo = JSON.parse(detalle) as typeof cuerpo;
    } catch {
      cuerpo = {};
    }

    // PGRST202: la funcion no existe todavia en la base.
    if (cuerpo.code === "PGRST202") {
      throw new ErrorBackend(
        "La base de datos aun no tiene instaladas las funciones del taller. Ejecuta el archivo supabase/esquema.sql en el SQL Editor de Supabase.",
      );
    }
    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new ErrorBackend(
        "Supabase rechazo la clave publicable. Revisa NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
    }

    throw new ErrorBackend(cuerpo.message || `El servidor respondió ${respuesta.status}.`);
  }

  return (await respuesta.json()) as T;
}

export type EjercicioPublicado = {
  codigo: string;
  claveEdicion: string;
};

/** Publica el enunciado y devuelve el codigo que el docente dicta en clase. */
export async function publicarEjercicio(ejercicio: Ejercicio): Promise<EjercicioPublicado> {
  // La funcion devuelve una tabla de una fila; PostgREST la entrega como arreglo.
  const filas = await rpc<{ codigo: string; clave_edicion: string }[]>("norm_publicar", {
    p_datos: ejercicio,
  });
  const fila = filas?.[0];
  if (!fila?.codigo) throw new ErrorBackend("El servidor no devolvió un código.");
  return { codigo: fila.codigo, claveEdicion: fila.clave_edicion };
}

/** Reedita un ejercicio conservando codigo, id y el avance de los estudiantes. */
export async function actualizarEjercicio(
  codigo: string,
  claveEdicion: string,
  ejercicio: Ejercicio,
): Promise<void> {
  const ok = await rpc<boolean>("norm_actualizar", {
    p_codigo: codigo,
    p_clave: claveEdicion,
    p_datos: ejercicio,
  });
  if (!ok) {
    throw new ErrorBackend(
      "No se pudo actualizar: este navegador ya no tiene la clave de edición de ese código. Publica el ejercicio de nuevo para obtener otro código.",
    );
  }
}

/**
 * Borra el ejercicio del servidor. Necesita la clave de edicion, asi que solo
 * puede hacerlo el navegador desde el que se publico.
 */
export async function eliminarEjercicio(codigo: string, claveEdicion: string): Promise<void> {
  const ok = await rpc<boolean>("norm_eliminar", {
    p_codigo: codigo,
    p_clave: claveEdicion,
  });
  if (!ok) {
    throw new ErrorBackend(
      "No se pudo borrar: el código ya no existe en el servidor o este navegador no tiene su clave de edición.",
    );
  }
}

/** Devuelve `null` si el codigo no existe. */
export async function obtenerEjercicio(codigo: string): Promise<Ejercicio | null> {
  const datos = await rpc<Ejercicio | null>("norm_obtener", { p_codigo: codigo });
  if (!datos || typeof datos.enunciado !== "string") return null;
  return datos;
}
