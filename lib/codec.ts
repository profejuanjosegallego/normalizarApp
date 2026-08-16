import type { Ejercicio } from "./tipos";

/**
 * El enunciado viaja dentro del propio enlace (fragmento `#`), asi la app no
 * necesita backend ni base de datos: Vercel sirve estatico y el navegador
 * decodifica. El fragmento no se envia al servidor.
 */

function aBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function desdeBase64Url(texto: string): Uint8Array {
  const relleno = texto.replace(/-/g, "+").replace(/_/g, "/");
  const completo = relleno + "=".repeat((4 - (relleno.length % 4)) % 4);
  const binario = atob(completo);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

export function codificarEjercicio(ejercicio: Ejercicio): string {
  const json = JSON.stringify(ejercicio);
  return aBase64Url(new TextEncoder().encode(json));
}

export function decodificarEjercicio(codigo: string): Ejercicio | null {
  try {
    const json = new TextDecoder().decode(desdeBase64Url(codigo.trim()));
    const dato = JSON.parse(json) as Partial<Ejercicio>;
    if (!dato || typeof dato.enunciado !== "string" || typeof dato.titulo !== "string") {
      return null;
    }
    return {
      id: dato.id ?? "sin-id",
      titulo: dato.titulo,
      curso: dato.curso ?? "",
      docente: dato.docente ?? "",
      enunciado: dato.enunciado,
      contextoAtomicidad: dato.contextoAtomicidad ?? "",
      minRegistros: Number(dato.minRegistros) > 0 ? Number(dato.minRegistros) : 2,
      pistas: Array.isArray(dato.pistas) ? dato.pistas.filter((p) => typeof p === "string") : [],
      fechaEntrega: dato.fechaEntrega ?? "",
      creado: dato.creado ?? "",
    };
  } catch {
    return null;
  }
}

/** Acepta un enlace completo o solo el codigo pegado por el estudiante. */
export function extraerCodigo(entrada: string): string {
  const texto = entrada.trim();
  const corte = texto.lastIndexOf("#e=");
  if (corte >= 0) return texto.slice(corte + 3);
  return texto;
}

/* --------------------------------------------------------------------------
 * Codigos cortos
 *
 * El enunciado tambien se puede publicar en Supabase y quedar detras de un
 * codigo de 6 caracteres que el docente dicta en clase. Es el mismo alfabeto
 * del esquema SQL: sin I, sin O, sin 0 y sin 1, para que no se confundan al
 * copiarlos del tablero.
 * ----------------------------------------------------------------------- */

export const LARGO_CODIGO_CORTO = 6;

const ALFABETO_CORTO = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

/** Quita espacios, guiones y acomoda a mayusculas: "k7q-m3p" -> "K7QM3P". */
export function normalizarCodigoCorto(entrada: string): string {
  return entrada.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function esCodigoCorto(texto: string): boolean {
  return ALFABETO_CORTO.test(texto);
}

export type EntradaEjercicio =
  | { tipo: "corto"; codigo: string }
  | { tipo: "largo"; codigo: string };

/**
 * Interpreta lo que el estudiante pego en el inicio: puede ser un codigo de 6
 * caracteres, un enlace `#c=` o `#e=`, o el codigo largo suelto.
 */
export function interpretarEntrada(entrada: string): EntradaEjercicio | null {
  const texto = entrada.trim();
  if (!texto) return null;

  const corteCorto = texto.lastIndexOf("#c=");
  if (corteCorto >= 0) {
    const codigo = normalizarCodigoCorto(texto.slice(corteCorto + 3));
    return esCodigoCorto(codigo) ? { tipo: "corto", codigo } : null;
  }

  const corteLargo = texto.lastIndexOf("#e=");
  if (corteLargo >= 0) {
    const codigo = texto.slice(corteLargo + 3).trim();
    return codigo ? { tipo: "largo", codigo } : null;
  }

  // Sin enlace: si tiene la forma de un codigo corto, se asume que lo es.
  const posibleCorto = normalizarCodigoCorto(texto);
  if (esCodigoCorto(posibleCorto)) return { tipo: "corto", codigo: posibleCorto };

  return { tipo: "largo", codigo: texto };
}
