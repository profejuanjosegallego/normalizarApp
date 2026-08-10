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
