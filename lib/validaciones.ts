import { aSnake } from "./ids";
import { chequearUnicidad, columnasEvaluables, columnasPK, sugerirGruposRepeticion } from "./modelo";
import type { Tabla, Trabajo } from "./tipos";

export type Chequeo = {
  id: string;
  etiqueta: string;
  ok: boolean;
  /** Qué falta exactamente. Se muestra solo cuando `ok` es falso. */
  detalle?: string;
};

function lista(items: string[], max = 6): string {
  if (items.length <= max) return items.join(", ");
  return `${items.slice(0, max).join(", ")} y ${items.length - max} más`;
}

function duplicados(nombres: string[]): string[] {
  const conteo = new Map<string, number>();
  for (const n of nombres) {
    const clave = aSnake(n);
    if (!clave) continue;
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }
  return [...conteo.entries()].filter(([, n]) => n > 1).map(([n]) => n);
}

function celdasVacias(tabla: Tabla): number {
  let vacias = 0;
  for (const fila of tabla.filas) {
    for (const col of tabla.columnas) {
      if (!(fila.valores[col.id] ?? "").trim()) vacias += 1;
    }
  }
  return vacias;
}

// ---------------------------------------------------------------------------

function validarDatos(t: Trabajo): Chequeo[] {
  return [
    {
      id: "nombre",
      etiqueta: "Escribiste tu nombre",
      ok: t.estudiante.nombre.trim().length > 1,
      detalle: "Necesario para identificar tu entrega.",
    },
    {
      id: "leido",
      etiqueta: "Leíste el enunciado completo",
      ok: t.ejercicio.enunciado.trim().length > 0,
      detalle: "Este ejercicio no tiene enunciado cargado.",
    },
  ];
}

function validarEntidades(t: Trabajo): Chequeo[] {
  const sinNombre = t.entidades.filter((e) => !e.nombre.trim()).length;
  const repetidas = duplicados(t.entidades.map((e) => e.nombre));
  const relacionesIncompletas = t.relaciones.filter((r) => !r.origenId || !r.destinoId).length;

  return [
    {
      id: "hay-entidades",
      etiqueta: "Identificaste al menos una entidad",
      ok: t.entidades.length >= 1,
      detalle: "Extrae del enunciado los sustantivos que se convertirán en tablas.",
    },
    {
      id: "entidades-con-nombre",
      etiqueta: "Todas las entidades tienen nombre",
      ok: sinNombre === 0,
      detalle: `${sinNombre} entidad(es) sin nombre.`,
    },
    {
      id: "entidades-unicas",
      etiqueta: "No hay entidades repetidas",
      ok: repetidas.length === 0,
      detalle: `Repetidas: ${lista(repetidas)}.`,
    },
    {
      id: "hay-relaciones",
      etiqueta: "Relacionaste las entidades",
      ok: t.entidades.length < 2 || t.relaciones.length >= 1,
      detalle: "Con dos o más entidades debes declarar al menos una relación.",
    },
    {
      id: "relaciones-completas",
      etiqueta: "Todas las relaciones tienen origen y destino",
      ok: relacionesIncompletas === 0,
      detalle: `${relacionesIncompletas} relación(es) incompleta(s).`,
    },
  ];
}

function validarTablas(t: Trabajo): Chequeo[] {
  const min = t.ejercicio.minRegistros;
  const sinColumnas = t.modelo.filter((tb) => tb.columnas.length === 0).map((tb) => tb.nombre);
  const pocosRegistros = t.modelo.filter((tb) => tb.filas.length < min).map((tb) => tb.nombre);
  const nombresRepetidos = duplicados(t.modelo.map((tb) => tb.nombre));
  const columnasRepetidas = t.modelo
    .filter((tb) => duplicados(tb.columnas.map((c) => c.nombre)).length > 0)
    .map((tb) => tb.nombre);
  const conVacias = t.modelo.filter((tb) => celdasVacias(tb) > 0).map((tb) => tb.nombre);

  return [
    {
      id: "hay-tablas",
      etiqueta: "Creaste al menos una tabla",
      ok: t.modelo.length >= 1,
      detalle: "Convierte cada entidad en una tabla.",
    },
    {
      id: "tablas-con-atributos",
      etiqueta: "Cada tabla tiene sus atributos definidos",
      ok: sinColumnas.length === 0,
      detalle: `Sin ninguna columna: ${lista(sinColumnas)}. Decide tú qué atributos lleva cada tabla.`,
    },
    {
      id: "nombres-tabla-unicos",
      etiqueta: "Los nombres de tabla no se repiten",
      ok: nombresRepetidos.length === 0,
      detalle: `Repetidos: ${lista(nombresRepetidos)}.`,
    },
    {
      id: "nombres-columna-unicos",
      etiqueta: "Los nombres de columna no se repiten dentro de una tabla",
      ok: columnasRepetidas.length === 0,
      detalle: `Revisa: ${lista(columnasRepetidas)}.`,
    },
    {
      id: "minimo-registros",
      etiqueta: `Cada tabla tiene al menos ${min} registros`,
      ok: pocosRegistros.length === 0,
      detalle: `Faltan registros en: ${lista(pocosRegistros)}.`,
    },
    {
      id: "sin-celdas-vacias",
      etiqueta: "No quedan celdas vacías",
      ok: conVacias.length === 0,
      detalle: `Celdas vacías en: ${lista(conVacias)}.`,
    },
  ];
}

function validarPrimeraFN(t: Trabajo): Chequeo[] {
  const sinPK = t.modelo.filter((tb) => columnasPK(tb).length === 0).map((tb) => tb.nombre);
  const pkMultiple = t.modelo.filter((tb) => columnasPK(tb).length > 1).map((tb) => tb.nombre);
  const noAutogenerada = t.modelo
    .filter((tb) => columnasPK(tb).some((c) => !c.autogenerada))
    .map((tb) => tb.nombre);

  const pkNoUnica: string[] = [];
  for (const tb of t.modelo) {
    for (const pk of columnasPK(tb)) {
      const r = chequearUnicidad(tb, pk.id);
      if (!r.ok) {
        pkNoUnica.push(
          `${tb.nombre}.${pk.nombre}${r.duplicados.length ? ` (repite ${lista(r.duplicados, 3)})` : " (hay vacíos)"}`,
        );
      }
    }
  }

  const sinClasificar: string[] = [];
  const noAtomicasPendientes: string[] = [];
  for (const tb of t.modelo) {
    for (const col of tb.columnas) {
      if (col.esPK || col.esFK) continue;
      if (col.atomicidad === null) sinClasificar.push(`${tb.nombre}.${col.nombre}`);
      if (col.atomicidad === "no-atomico") noAtomicasPendientes.push(`${tb.nombre}.${col.nombre}`);
    }
  }

  return [
    {
      id: "pk-existe",
      etiqueta: "Cada tabla tiene una clave primaria",
      ok: sinPK.length === 0,
      detalle: `Sin PK: ${lista(sinPK)}.`,
    },
    {
      id: "pk-simple",
      etiqueta: "Cada tabla tiene una sola columna como PK",
      ok: pkMultiple.length === 0,
      detalle: `Con PK múltiple: ${lista(pkMultiple)}.`,
    },
    {
      id: "pk-autogenerada",
      etiqueta: "La PK está marcada como autogenerada",
      ok: noAutogenerada.length === 0,
      detalle: `Falta marcar autogenerada en: ${lista(noAutogenerada)}.`,
    },
    {
      id: "pk-unica",
      etiqueta: "Los valores de la PK son únicos y no vacíos",
      ok: pkNoUnica.length === 0,
      detalle: `Problemas en: ${lista(pkNoUnica)}.`,
    },
    {
      id: "atomicidad-clasificada",
      etiqueta: "Clasificaste cada atributo como atómico o no atómico",
      ok: sinClasificar.length === 0,
      detalle: `Falta clasificar: ${lista(sinClasificar)}.`,
    },
    {
      id: "no-atomicos-resueltos",
      etiqueta: "Descompusiste todos los atributos no atómicos",
      ok: noAtomicasPendientes.length === 0,
      detalle: `Pendientes de descomponer: ${lista(noAtomicasPendientes)}.`,
    },
  ];
}

function validarSegundaFN(t: Trabajo): Chequeo[] {
  const marcadosSinResolver: string[] = [];
  for (const tb of t.modelo) {
    for (const col of tb.columnas) {
      if (col.grupoRepeticion) marcadosSinResolver.push(`${tb.nombre}.${col.nombre}`);
    }
  }

  const sugeridos = t.modelo.flatMap((tb) =>
    sugerirGruposRepeticion(tb).map((g) => `${tb.nombre}: ${g.grupo}*`),
  );

  const resueltos = t.bitacora.gruposResueltos.length;
  const revisado = resueltos > 0 || t.declaraciones.sinGruposRepeticion;

  const puentesFaltantes = t.bitacora.gruposResueltos
    .filter((g) => !t.modelo.some((tb) => tb.nombre === g.tablaPuente))
    .map((g) => g.tablaPuente);

  return [
    {
      id: "revision-hecha",
      etiqueta: "Revisaste todas las tablas buscando grupos de repetición",
      ok: revisado,
      detalle:
        "Resuelve al menos un grupo o declara explícitamente que no encontraste ninguno.",
    },
    {
      id: "sin-sugerencias",
      etiqueta: "No quedan columnas con patrón atributo1, atributo2, atributoN",
      ok: sugeridos.length === 0,
      detalle: `La app detecta este patrón en: ${lista(sugeridos)}. Márcalos como grupo y genéralos.`,
    },
    {
      id: "grupos-resueltos",
      etiqueta: "Todo grupo marcado fue convertido en tabla + tabla de transición",
      ok: marcadosSinResolver.length === 0,
      detalle: `Marcados sin resolver: ${lista(marcadosSinResolver)}.`,
    },
    {
      id: "puentes-existen",
      etiqueta: "Cada tabla derivada conserva su tabla de transición",
      ok: puentesFaltantes.length === 0,
      detalle: `Falta la tabla de transición: ${lista(puentesFaltantes)}.`,
    },
  ];
}

function validarTerceraFN(t: Trabajo): Chequeo[] {
  const sinDeclarar: string[] = [];
  const transitivasPendientes: string[] = [];
  for (const tb of t.modelo) {
    for (const col of columnasEvaluables(tb)) {
      if (col.dependencia === null) sinDeclarar.push(`${tb.nombre}.${col.nombre}`);
      if (col.dependencia === "otro") transitivasPendientes.push(`${tb.nombre}.${col.nombre}`);
    }
  }

  const resueltas = t.bitacora.transitivasResueltas.length;
  const revisado = resueltas > 0 || t.declaraciones.sinTransitivas;

  return [
    {
      id: "dependencias-declaradas",
      etiqueta: "Declaraste de qué depende cada atributo",
      ok: sinDeclarar.length === 0,
      detalle: `Falta declarar: ${lista(sinDeclarar)}.`,
    },
    {
      id: "transitivas-resueltas",
      etiqueta: "Ningún atributo depende de otro atributo que no sea la PK",
      ok: transitivasPendientes.length === 0,
      detalle: `Pendientes de mover: ${lista(transitivasPendientes)}.`,
    },
    {
      id: "revision-3fn",
      etiqueta: "Cerraste la revisión de dependencias transitivas",
      ok: revisado,
      detalle: "Resuelve al menos una o declara que todas dependían ya de la PK.",
    },
  ];
}

export function validarPaso(paso: number, trabajo: Trabajo): Chequeo[] {
  switch (paso) {
    case 0:
      return validarDatos(trabajo);
    case 1:
      return validarEntidades(trabajo);
    case 2:
      return validarTablas(trabajo);
    case 3:
      return validarPrimeraFN(trabajo);
    case 4:
      return validarSegundaFN(trabajo);
    case 5:
      return validarTerceraFN(trabajo);
    default:
      return [];
  }
}

export function pasoAprobado(paso: number, trabajo: Trabajo): boolean {
  return validarPaso(paso, trabajo).every((c) => c.ok);
}

/** Porcentaje de avance sobre el total de chequeos de todos los pasos. */
export function progresoGlobal(trabajo: Trabajo): { hechos: number; total: number } {
  let hechos = 0;
  let total = 0;
  for (let p = 0; p <= 5; p += 1) {
    for (const c of validarPaso(p, trabajo)) {
      total += 1;
      if (c.ok) hechos += 1;
    }
  }
  return { hechos, total };
}
