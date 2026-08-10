let contador = 0;

/** Id corto, estable dentro de la sesion y suficiente para claves de React. */
export function nuevoId(prefijo = "id"): string {
  contador += 1;
  const azar = Math.random().toString(36).slice(2, 8);
  return `${prefijo}_${Date.now().toString(36)}${contador.toString(36)}${azar}`;
}

/** Marcas combinantes (tildes, dieresis) que deja `normalize("NFD")`. */
const MARCAS = /\p{M}/gu;

/** Convierte "Numero de Telefono" en "numero_de_telefono". */
export function aSnake(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(MARCAS, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Convierte "telefono_casa" en "Telefono casa" para titulos. */
export function aTitulo(texto: string): string {
  const limpio = texto.replace(/_/g, " ").trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}
