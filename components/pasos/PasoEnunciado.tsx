"use client";

import type { PropsPaso } from "../Taller";
import { Aviso, Campo, Seccion } from "../ui";

const METODO = [
  {
    titulo: "1. Entidades y relaciones",
    texto: "Extrae del enunciado los objetos del mundo real y di como se relacionan entre si.",
  },
  {
    titulo: "2. Tablas y registros",
    texto: "Convierte cada entidad en una tabla y llena registros de ejemplo para poder razonar sobre los datos.",
  },
  {
    titulo: "3. Primera forma normal",
    texto: "Verifica que el id sea unico y autogenerado, y que cada atributo sea atomico segun el contexto. Los no atomicos se senalan y se descomponen en mas columnas.",
  },
  {
    titulo: "4. Segunda forma normal",
    texto: "Si quedan grupos de repeticion (atributo1, atributo2, atributoN), se crea una tabla con el nombre del atributo y una tabla de transicion que la asocia.",
  },
  {
    titulo: "5. Tercera forma normal",
    texto: "Cada atributo debe depender unica y directamente del id de su tabla. Si depende de otro atributo, se crea una tabla nueva o se traslada a la tabla donde ya corresponde.",
  },
];

export default function PasoEnunciado({ trabajo, actualizar }: PropsPaso) {
  const { ejercicio, estudiante } = trabajo;

  function fijar(campo: keyof typeof estudiante, valor: string) {
    actualizar((t) => ({ ...t, estudiante: { ...t.estudiante, [campo]: valor } }));
  }

  return (
    <>
      <Seccion
        titulo={ejercicio.titulo}
        descripcion={[ejercicio.curso, ejercicio.docente].filter(Boolean).join(" · ") || undefined}
      >
        <p className="prosa">{ejercicio.enunciado}</p>

        {ejercicio.contextoAtomicidad ? (
          <div className="mt-5">
            <Aviso tono="alerta" titulo="Reglas de atomicidad para este ejercicio">
              <p className="prosa text-sm">{ejercicio.contextoAtomicidad}</p>
            </Aviso>
          </div>
        ) : null}

        {ejercicio.fechaEntrega ? (
          <p className="suave mt-4 text-sm">Fecha de entrega: {ejercicio.fechaEntrega}</p>
        ) : null}
      </Seccion>

      <Seccion
        titulo="Tus datos"
        descripcion="Aparecen en el archivo que entregas al final. Tu trabajo se guarda solo en este navegador."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo
            etiqueta="Nombre completo"
            value={estudiante.nombre}
            onChange={(e) => fijar("nombre", e.target.value)}
            placeholder="Ana Maria Perez"
          />
          <Campo
            etiqueta="Codigo o documento"
            value={estudiante.codigo}
            onChange={(e) => fijar("codigo", e.target.value)}
            placeholder="20241234"
          />
          <Campo
            etiqueta="Grupo"
            value={estudiante.grupo}
            onChange={(e) => fijar("grupo", e.target.value)}
            placeholder="G-02"
          />
        </div>
      </Seccion>

      <Seccion titulo="Como vas a trabajar" descripcion="El mismo proceso que hacias en Excel, paso a paso.">
        <ol className="grid gap-3 sm:grid-cols-2">
          {METODO.map((m) => (
            <li key={m.titulo} className="tarjeta-plana p-3">
              <p className="text-sm font-bold">{m.titulo}</p>
              <p className="suave mt-1 text-[0.82rem] leading-relaxed">{m.texto}</p>
            </li>
          ))}
        </ol>
      </Seccion>
    </>
  );
}
