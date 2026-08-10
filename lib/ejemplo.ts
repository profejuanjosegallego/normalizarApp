import type { Ejercicio } from "./tipos";

/** Ejercicio de demostracion para probar la app sin cargar un enunciado propio. */
export const EJERCICIO_DEMO: Ejercicio = {
  id: "demo-biblioteca",
  titulo: "Biblioteca universitaria (demo)",
  curso: "Bases de Datos",
  docente: "Docente",
  enunciado: `La biblioteca de la universidad necesita un sistema para controlar los prestamos de libros.

De cada usuario se registra su nombre completo, su documento de identidad, la direccion de residencia, el correo institucional y los telefonos de contacto (un usuario puede registrar hasta tres numeros). Cada usuario pertenece a un programa academico, y de ese programa interesa conocer su nombre y la facultad a la que pertenece.

De cada libro se guarda el titulo, el ISBN, el anio de publicacion, la editorial y el pais de la editorial. Un libro puede tener varios autores y un autor puede haber escrito varios libros.

Cuando un usuario toma un libro en prestamo se registra la fecha de prestamo y la fecha de devolucion pactada.`,
  contextoAtomicidad: `Para este ejercicio:
- El nombre completo SI debe descomponerse en nombres y apellidos.
- La direccion SI debe descomponerse (calle, numero, ciudad).
- Las fechas se dejan como un solo atributo tipo DATE, NO se descomponen.
- El correo se deja como un solo atributo.`,
  minRegistros: 2,
  pistas: [
    "El pais de la editorial no depende del libro: depende de la editorial.",
    "La facultad no depende del usuario: depende del programa academico.",
    "Un libro con varios autores y un autor con varios libros es una relacion N:M.",
  ],
  fechaEntrega: "",
  creado: "",
};
