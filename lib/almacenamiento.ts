import { avanceVacio, type Avance } from "./evaluador/tipos";
import type { Convocatoria, Prueba } from "./evaluador/prueba";
import type { Estado } from "./sqlmotor";
import type { Ejercicio, Trabajo } from "./tipos";

const PREFIJO = "bdnorm:trabajo:";
const INDICE = "bdnorm:indice";
const BORRADOR_DOCENTE = "bdnorm:docente:borrador";

export type EntradaIndice = {
  ejercicioId: string;
  titulo: string;
  estudiante: string;
  paso: number;
  actualizado: string;
};

function disponible(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function claveTrabajo(ejercicioId: string): string {
  return PREFIJO + ejercicioId;
}

export function guardarTrabajo(trabajo: Trabajo): void {
  if (!disponible()) return;
  const conFecha: Trabajo = { ...trabajo, actualizado: new Date().toISOString() };
  try {
    localStorage.setItem(claveTrabajo(trabajo.ejercicio.id), JSON.stringify(conFecha));
    actualizarIndice(conFecha);
  } catch {
    // Cuota llena o modo privado: el estudiante siempre puede exportar el archivo.
  }
}

export function cargarTrabajo(ejercicioId: string): Trabajo | null {
  if (!disponible()) return null;
  const crudo = localStorage.getItem(claveTrabajo(ejercicioId));
  if (!crudo) return null;
  try {
    const dato = JSON.parse(crudo) as Trabajo;
    return dato.version === 1 ? dato : null;
  } catch {
    return null;
  }
}

export function borrarTrabajo(ejercicioId: string): void {
  if (!disponible()) return;
  localStorage.removeItem(claveTrabajo(ejercicioId));
  const indice = leerIndice().filter((e) => e.ejercicioId !== ejercicioId);
  localStorage.setItem(INDICE, JSON.stringify(indice));
}

function actualizarIndice(trabajo: Trabajo): void {
  const indice = leerIndice().filter((e) => e.ejercicioId !== trabajo.ejercicio.id);
  indice.unshift({
    ejercicioId: trabajo.ejercicio.id,
    titulo: trabajo.ejercicio.titulo,
    estudiante: trabajo.estudiante.nombre,
    paso: trabajo.pasoActual,
    actualizado: trabajo.actualizado,
  });
  localStorage.setItem(INDICE, JSON.stringify(indice.slice(0, 20)));
}

export function leerIndice(): EntradaIndice[] {
  if (!disponible()) return [];
  try {
    const crudo = localStorage.getItem(INDICE);
    return crudo ? (JSON.parse(crudo) as EntradaIndice[]) : [];
  } catch {
    return [];
  }
}

export function guardarBorradorDocente(ejercicio: Ejercicio): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(BORRADOR_DOCENTE, JSON.stringify(ejercicio));
  } catch {
    // sin efecto
  }
}

export function cargarBorradorDocente(): Ejercicio | null {
  if (!disponible()) return null;
  try {
    const crudo = localStorage.getItem(BORRADOR_DOCENTE);
    return crudo ? (JSON.parse(crudo) as Ejercicio) : null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------
 * Codigos publicados por el docente
 *
 * Al publicar un ejercicio, Supabase devuelve una `clave_edicion` que es lo
 * unico que permite reeditarlo despues. Se guarda aqui, en el navegador del
 * docente: si la pierde puede volver a publicar, pero saldra un codigo nuevo.
 * ----------------------------------------------------------------------- */

const PUBLICADOS = "bdnorm:docente:publicados";

export type Publicacion = {
  codigo: string;
  claveEdicion: string;
  publicadoEn: string;
  /** Codificacion del enunciado tal como se publico, para avisar si cambio. */
  firma: string;
  /** Para poder listarlos sin consultar el servidor. */
  titulo?: string;
};

export type PublicacionListada = Publicacion & { ejercicioId: string };

function leerPublicados(): Record<string, Publicacion> {
  if (!disponible()) return {};
  try {
    const crudo = localStorage.getItem(PUBLICADOS);
    return crudo ? (JSON.parse(crudo) as Record<string, Publicacion>) : {};
  } catch {
    return {};
  }
}

/** Todos los ejercicios publicados desde este navegador, del mas nuevo al mas viejo. */
export function listarPublicaciones(): PublicacionListada[] {
  return Object.entries(leerPublicados())
    .map(([ejercicioId, p]) => ({ ...p, ejercicioId }))
    .sort((a, b) => (a.publicadoEn < b.publicadoEn ? 1 : -1));
}

/** Olvida la publicacion en este navegador (no toca el servidor). */
export function olvidarPublicacion(ejercicioId: string): void {
  if (!disponible()) return;
  const todas = leerPublicados();
  delete todas[ejercicioId];
  try {
    localStorage.setItem(PUBLICADOS, JSON.stringify(todas));
  } catch {
    // sin efecto
  }
}

export function guardarPublicacion(ejercicioId: string, publicacion: Publicacion): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(
      PUBLICADOS,
      JSON.stringify({ ...leerPublicados(), [ejercicioId]: publicacion }),
    );
  } catch {
    // sin efecto: el docente igual ve el codigo en pantalla
  }
}

export function cargarPublicacion(ejercicioId: string): Publicacion | null {
  return leerPublicados()[ejercicioId] ?? null;
}

/* --------------------------------------------------------------------------
 * Practica de SQL
 *
 * La base de datos que arma el estudiante y el texto del editor viven aqui, en
 * su navegador, igual que el resto del taller. Nada de esto viaja al servidor.
 * ----------------------------------------------------------------------- */

const SQL_ESTADO = "bdnorm:sql:estado";
const SQL_EDITOR = "bdnorm:sql:editor";

export function guardarEstadoSQL(estado: Estado): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(SQL_ESTADO, JSON.stringify(estado));
  } catch {
    // Cuota llena: el estudiante puede seguir trabajando en esta sesion.
  }
}

export function cargarEstadoSQL(): Estado | null {
  if (!disponible()) return null;
  try {
    const crudo = localStorage.getItem(SQL_ESTADO);
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as Estado;
    if (!dato || !dato.servidor || !Array.isArray(dato.servidor.bases)) return null;
    return { servidor: dato.servidor, logros: Array.isArray(dato.logros) ? dato.logros : [] };
  } catch {
    return null;
  }
}

export function guardarEditorSQL(texto: string): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(SQL_EDITOR, texto);
  } catch {
    // sin efecto
  }
}

export function cargarEditorSQL(): string {
  if (!disponible()) return "";
  return localStorage.getItem(SQL_EDITOR) ?? "";
}

export function olvidarSQL(): void {
  if (!disponible()) return;
  localStorage.removeItem(SQL_ESTADO);
  localStorage.removeItem(SQL_EDITOR);
}

/* --------------------------------------------------------------------------
 * Evaluador final
 *
 * Cada caso tiene su propio servidor, su editor y su avance, separados de la
 * practica de SQL para que resolver un caso no toque lo que el estudiante
 * tenia armado en /sql (ni al reves).
 * ----------------------------------------------------------------------- */

const EVALUADOR = "bdnorm:evaluador:";

export function guardarEstadoCaso(casoId: string, estado: Estado): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(EVALUADOR + casoId + ":estado", JSON.stringify(estado));
  } catch {
    // Cuota llena: sigue funcionando en esta sesion.
  }
}

export function cargarEstadoCaso(casoId: string): Estado | null {
  if (!disponible()) return null;
  try {
    const crudo = localStorage.getItem(EVALUADOR + casoId + ":estado");
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as Estado;
    if (!dato || !dato.servidor || !Array.isArray(dato.servidor.bases)) return null;
    return { servidor: dato.servidor, logros: Array.isArray(dato.logros) ? dato.logros : [] };
  } catch {
    return null;
  }
}

export function guardarEditorCaso(casoId: string, texto: string): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(EVALUADOR + casoId + ":editor", texto);
  } catch {
    // sin efecto
  }
}

export function cargarEditorCaso(casoId: string): string {
  if (!disponible()) return "";
  return localStorage.getItem(EVALUADOR + casoId + ":editor") ?? "";
}

export function guardarAvanceCaso(avance: Avance): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(EVALUADOR + avance.casoId + ":avance", JSON.stringify(avance));
  } catch {
    // sin efecto
  }
}

export function cargarAvanceCaso(casoId: string): Avance | null {
  if (!disponible()) return null;
  try {
    const crudo = localStorage.getItem(EVALUADOR + casoId + ":avance");
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as Partial<Avance> & { estudiante?: string };
    if (!dato || !Array.isArray(dato.resueltas)) return null;
    const base = avanceVacio(casoId, typeof dato.pruebaCodigo === "string" ? dato.pruebaCodigo : "");
    const integrantes = Array.isArray(dato.integrantes)
      ? dato.integrantes.map((i) => ({
          nombre: typeof i?.nombre === "string" ? i.nombre : "",
          documento: typeof i?.documento === "string" ? i.documento : "",
        }))
      : [];
    // Avances de la version 1 traian un solo nombre suelto.
    if (integrantes.length === 0 && typeof dato.estudiante === "string") {
      integrantes.push({ nombre: dato.estudiante, documento: "" });
    }
    while (integrantes.length < 2) integrantes.push({ nombre: "", documento: "" });
    return {
      ...base,
      integrantes: integrantes.slice(0, 2),
      inicio: typeof dato.inicio === "string" ? dato.inicio : null,
      resueltas: dato.resueltas,
      intentosFallidos: Number(dato.intentosFallidos) || 0,
      intentosCulpable: Number(dato.intentosCulpable) || 0,
      reinicios: Number(dato.reinicios) || 0,
      cerrado: typeof dato.cerrado === "string" ? dato.cerrado : null,
    };
  } catch {
    return null;
  }
}

/** Borra el servidor, el editor y el avance de un caso: empezar de cero. */
export function olvidarCaso(casoId: string): void {
  if (!disponible()) return;
  for (const sufijo of [":estado", ":editor", ":avance"]) {
    localStorage.removeItem(EVALUADOR + casoId + sufijo);
  }
}

/* Prueba habilitada por el docente, del lado del estudiante. */

export function guardarPrueba(prueba: Prueba): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(EVALUADOR + "prueba", JSON.stringify(prueba));
  } catch {
    // sin efecto
  }
}

export function cargarPrueba(): Prueba | null {
  if (!disponible()) return null;
  try {
    const crudo = localStorage.getItem(EVALUADOR + "prueba");
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as Prueba;
    if (!dato || typeof dato.codigo !== "string" || !dato.config) return null;
    return dato;
  } catch {
    return null;
  }
}

export function olvidarPrueba(): void {
  if (!disponible()) return;
  localStorage.removeItem(EVALUADOR + "prueba");
}

/* Convocatorias del docente: codigo + clave de edicion, como las publicaciones. */

const CONVOCATORIAS = "bdnorm:docente:pruebas";

export function listarConvocatorias(): Convocatoria[] {
  if (!disponible()) return [];
  try {
    const crudo = localStorage.getItem(CONVOCATORIAS);
    const lista = crudo ? (JSON.parse(crudo) as Convocatoria[]) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function guardarConvocatorias(lista: Convocatoria[]): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(CONVOCATORIAS, JSON.stringify(lista));
  } catch {
    // sin efecto
  }
}

/** Preferencia de musica del evaluador (encendida o no). */
export function cargarMusica(): boolean {
  if (!disponible()) return false;
  return localStorage.getItem(EVALUADOR + "musica") === "1";
}

export function guardarMusica(encendida: boolean): void {
  if (!disponible()) return;
  try {
    localStorage.setItem(EVALUADOR + "musica", encendida ? "1" : "0");
  } catch {
    // sin efecto
  }
}

export function descargarJSON(nombreArchivo: string, dato: unknown): void {
  const blob = new Blob([JSON.stringify(dato, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

export function descargarTexto(nombreArchivo: string, contenido: string): void {
  const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
