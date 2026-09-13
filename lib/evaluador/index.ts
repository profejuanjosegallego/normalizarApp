import { CASO_CONCIERTO } from "./caso-concierto";
import { CASO_MUSEO } from "./caso-museo";
import { CASO_RESTAURANTE } from "./caso-restaurante";
import type { Caso } from "./tipos";

export * from "./tipos";
export * from "./verificar";

/** Los casos, en el orden en que se ofrecen: primero el de practica. */
export const CASOS: Caso[] = [CASO_RESTAURANTE, CASO_MUSEO, CASO_CONCIERTO];

/** Los que cuentan para el examen (con codigo, reloj y nota). */
export const CASOS_EXAMEN: Caso[] = CASOS.filter((c) => !c.libre);
export const CASOS_PRACTICA: Caso[] = CASOS.filter((c) => !!c.libre);

export function buscarCaso(id: string): Caso | null {
  return CASOS.find((c) => c.id === id) ?? null;
}
