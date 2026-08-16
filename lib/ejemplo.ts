import type { Ejercicio } from "./tipos";

/** Ejercicio de demostración para probar la app sin cargar un enunciado propio. */
export const EJERCICIO_DEMO: Ejercicio = {
  id: "demo-biblioteca",
  titulo: "Biblioteca universitaria (demo)",
  curso: "Bases de Datos",
  docente: "Docente",
  enunciado: `La biblioteca de la universidad necesita un sistema para controlar los préstamos de libros.

De cada usuario se registra su nombre completo, su documento de identidad, la dirección de residencia, el correo institucional y los teléfonos de contacto (un usuario puede registrar hasta tres números). Cada usuario pertenece a un programa académico, y de ese programa interesa conocer su nombre y la facultad a la que pertenece.

De cada libro se guarda el título, el ISBN, el año de publicación, la editorial y el país de la editorial. Un libro puede tener varios autores y un autor puede haber escrito varios libros.

Cuando un usuario toma un libro en préstamo se registra la fecha de préstamo y la fecha de devolución pactada.`,
  contextoAtomicidad: `Para este ejercicio:
- El nombre completo SÍ debe descomponerse en nombres y apellidos.
- La dirección SÍ debe descomponerse (calle, número, ciudad).
- Las fechas se dejan como un solo atributo tipo DATE, NO se descomponen.
- El correo se deja como un solo atributo.`,
  minRegistros: 2,
  pistas: [
    "El país de la editorial no depende del libro: depende de la editorial.",
    "La facultad no depende del usuario: depende del programa académico.",
    "Un libro con varios autores y un autor con varios libros es una relación N:M.",
  ],
  fechaEntrega: "",
  creado: "",
};
