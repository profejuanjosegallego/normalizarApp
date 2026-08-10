import { aSnake, nuevoId } from "./ids";
import type {
  Columna,
  Fila,
  FormaNormal,
  GrupoResuelto,
  Tabla,
  TipoTabla,
  TransitivaResuelta,
} from "./tipos";

// ---------------------------------------------------------------------------
// Constructores
// ---------------------------------------------------------------------------

export function nuevaColumna(nombre: string, extra: Partial<Columna> = {}): Columna {
  return {
    id: nuevoId("col"),
    nombre,
    tipo: "",
    esPK: false,
    autogenerada: false,
    esFK: false,
    refTablaId: null,
    atomicidad: null,
    notaAtomicidad: "",
    derivadaDe: null,
    grupoRepeticion: null,
    dependencia: null,
    determinanteId: null,
    ...extra,
  };
}

export function nuevaFila(columnas: Columna[], valores: Record<string, string> = {}): Fila {
  const base: Record<string, string> = {};
  for (const col of columnas) base[col.id] = valores[col.id] ?? "";
  return { id: nuevoId("fila"), valores: base };
}

/**
 * Crea una tabla. `conPK` solo se usa para las tablas que genera la app
 * (derivadas y puentes de 2FN/3FN): las tablas que crea el estudiante nacen
 * completamente vacias para que sea el quien decida el identificador.
 */
export function nuevaTabla(
  nombre: string,
  creadaEn: FormaNormal,
  tipo: TipoTabla = "principal",
  conPK = false,
): Tabla {
  const columnas = conPK
    ? [
        nuevaColumna(`id_${aSnake(nombre) || "tabla"}`, {
          esPK: true,
          autogenerada: false,
          tipo: "INT",
          atomicidad: "atomico",
          dependencia: "pk",
        }),
      ]
    : [];
  return {
    id: nuevoId("tab"),
    nombre,
    tipo,
    columnas,
    filas: [],
    nota: "",
    creadaEn,
  };
}

export function clonar<T>(dato: T): T {
  return JSON.parse(JSON.stringify(dato)) as T;
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export function columnasPK(tabla: Tabla): Columna[] {
  return tabla.columnas.filter((c) => c.esPK);
}

export function buscarTabla(modelo: Tabla[], id: string): Tabla | undefined {
  return modelo.find((t) => t.id === id);
}

export function nombreTabla(modelo: Tabla[], id: string | null): string {
  if (!id) return "?";
  return buscarTabla(modelo, id)?.nombre ?? "?";
}

/** Columnas que el estudiante debe clasificar en 3FN (ni PK ni FK). */
export function columnasEvaluables(tabla: Tabla): Columna[] {
  return tabla.columnas.filter((c) => !c.esPK && !c.esFK);
}

export type ChequeoUnicidad = {
  vacios: number;
  duplicados: string[];
  ok: boolean;
};

export function chequearUnicidad(tabla: Tabla, columnaId: string): ChequeoUnicidad {
  const vistos = new Map<string, number>();
  let vacios = 0;
  for (const fila of tabla.filas) {
    const valor = (fila.valores[columnaId] ?? "").trim();
    if (!valor) {
      vacios += 1;
      continue;
    }
    vistos.set(valor, (vistos.get(valor) ?? 0) + 1);
  }
  const duplicados = [...vistos.entries()].filter(([, n]) => n > 1).map(([v]) => v);
  return { vacios, duplicados, ok: vacios === 0 && duplicados.length === 0 };
}

/**
 * Sugiere grupos de repeticion buscando columnas que comparten prefijo y
 * terminan en numero: telefono1, telefono2, telefono3.
 */
export function sugerirGruposRepeticion(tabla: Tabla): { grupo: string; columnas: Columna[] }[] {
  const porPrefijo = new Map<string, Columna[]>();
  for (const col of tabla.columnas) {
    if (col.esPK || col.esFK) continue;
    const m = /^(.*?)[ _-]?(\d+)$/.exec(col.nombre.trim());
    if (!m) continue;
    const prefijo = aSnake(m[1]);
    if (!prefijo) continue;
    const lista = porPrefijo.get(prefijo) ?? [];
    lista.push(col);
    porPrefijo.set(prefijo, lista);
  }
  return [...porPrefijo.entries()]
    .filter(([, cols]) => cols.length >= 2)
    .map(([grupo, columnas]) => ({ grupo, columnas }));
}

/** Valor de la PK de una fila; si esta vacio usa la posicion como sustituto. */
function valorPK(tabla: Tabla, fila: Fila, indice: number): string {
  const pk = columnasPK(tabla)[0];
  const valor = pk ? (fila.valores[pk.id] ?? "").trim() : "";
  return valor || String(indice + 1);
}

// ---------------------------------------------------------------------------
// 1FN: descomponer un atributo no atomico
// ---------------------------------------------------------------------------

export type ResultadoDescomposicion = {
  tabla: Tabla;
  nombresCreados: string[];
};

/**
 * Reemplaza una columna no atomica por varias columnas atomicas. Si se indica un
 * separador, reparte los valores existentes entre las nuevas columnas.
 */
export function descomponerColumna(
  tabla: Tabla,
  columnaId: string,
  nombresNuevos: string[],
  separador: string,
): ResultadoDescomposicion {
  const original = tabla.columnas.find((c) => c.id === columnaId);
  if (!original) return { tabla, nombresCreados: [] };

  const limpios = nombresNuevos.map((n) => n.trim()).filter(Boolean);
  const nuevas = limpios.map((nombre) =>
    nuevaColumna(nombre, {
      tipo: original.tipo,
      atomicidad: "atomico",
      derivadaDe: original.nombre,
      dependencia: original.dependencia,
    }),
  );

  const indice = tabla.columnas.findIndex((c) => c.id === columnaId);
  const columnas = [...tabla.columnas];
  columnas.splice(indice, 1, ...nuevas);

  const filas = tabla.filas.map((fila) => {
    const valores = { ...fila.valores };
    const bruto = (valores[columnaId] ?? "").trim();
    delete valores[columnaId];
    const partes = separador ? bruto.split(separador).map((p) => p.trim()) : [];
    nuevas.forEach((col, i) => {
      valores[col.id] = partes[i] ?? "";
    });
    return { ...fila, valores };
  });

  return { tabla: { ...tabla, columnas, filas }, nombresCreados: limpios };
}

// ---------------------------------------------------------------------------
// 2FN: grupo de repeticion -> tabla propia + tabla de transicion
// ---------------------------------------------------------------------------

export type ResultadoGrupo = {
  modelo: Tabla[];
  registro: GrupoResuelto;
};

/**
 * Toma columnas como telefono1/telefono2 en `usuario`, crea la tabla `telefono`
 * con los valores distintos y la tabla puente `usuario_telefono` que las asocia.
 */
export function resolverGrupoRepeticion(
  modelo: Tabla[],
  tablaOrigenId: string,
  grupo: string,
  columnasIds: string[],
  nombreTablaNueva: string,
  nombreTablaPuente: string,
): ResultadoGrupo | null {
  const origen = buscarTabla(modelo, tablaOrigenId);
  if (!origen || columnasIds.length === 0) return null;

  const columnasGrupo = origen.columnas.filter((c) => columnasIds.includes(c.id));
  if (columnasGrupo.length === 0) return null;

  const nombreValor = aSnake(grupo) || "valor";

  // Tabla derivada: id autogenerado + la columna del atributo.
  const derivada = nuevaTabla(nombreTablaNueva, "2fn", "derivada", true);
  derivada.columnas[0].autogenerada = true;
  derivada.columnas[0].nombre = `id_${aSnake(nombreTablaNueva)}`;
  const colValor = nuevaColumna(nombreValor, {
    tipo: columnasGrupo[0].tipo,
    atomicidad: "atomico",
    dependencia: "pk",
  });
  derivada.columnas.push(colValor);
  derivada.nota = `Creada en 2FN desde el grupo de repeticion "${grupo}" de ${origen.nombre}.`;

  // Un registro por valor distinto encontrado en el grupo.
  const idPorValor = new Map<string, string>();
  for (const fila of origen.filas) {
    for (const col of columnasGrupo) {
      const valor = (fila.valores[col.id] ?? "").trim();
      if (!valor || idPorValor.has(valor)) continue;
      const id = String(idPorValor.size + 1);
      idPorValor.set(valor, id);
      derivada.filas.push(
        nuevaFila(derivada.columnas, {
          [derivada.columnas[0].id]: id,
          [colValor.id]: valor,
        }),
      );
    }
  }

  // Tabla puente.
  const puente = nuevaTabla(nombreTablaPuente, "2fn", "puente", true);
  puente.columnas[0].autogenerada = true;
  puente.columnas[0].nombre = `id_${aSnake(nombreTablaPuente)}`;
  const fkOrigen = nuevaColumna(`id_${aSnake(origen.nombre)}`, {
    esFK: true,
    refTablaId: origen.id,
    tipo: "INT",
    atomicidad: "atomico",
    dependencia: "pk",
  });
  const fkDerivada = nuevaColumna(`id_${aSnake(nombreTablaNueva)}`, {
    esFK: true,
    refTablaId: derivada.id,
    tipo: "INT",
    atomicidad: "atomico",
    dependencia: "pk",
  });
  puente.columnas.push(fkOrigen, fkDerivada);
  puente.nota = `Asocia ${origen.nombre} con ${nombreTablaNueva} (relacion N:M).`;

  origen.filas.forEach((fila, i) => {
    const idOrigen = valorPK(origen, fila, i);
    for (const col of columnasGrupo) {
      const valor = (fila.valores[col.id] ?? "").trim();
      if (!valor) continue;
      puente.filas.push(
        nuevaFila(puente.columnas, {
          [puente.columnas[0].id]: String(puente.filas.length + 1),
          [fkOrigen.id]: idOrigen,
          [fkDerivada.id]: idPorValor.get(valor) ?? "",
        }),
      );
    }
  });

  // La tabla origen pierde las columnas del grupo.
  const origenLimpio: Tabla = {
    ...origen,
    columnas: origen.columnas.filter((c) => !columnasIds.includes(c.id)),
    filas: origen.filas.map((fila) => {
      const valores = { ...fila.valores };
      for (const id of columnasIds) delete valores[id];
      return { ...fila, valores };
    }),
  };

  const nuevoModelo = modelo.map((t) => (t.id === origen.id ? origenLimpio : t));
  nuevoModelo.push(derivada, puente);

  return {
    modelo: nuevoModelo,
    registro: {
      id: nuevoId("gr"),
      tablaOrigen: origen.nombre,
      grupo,
      columnasOriginales: columnasGrupo.map((c) => c.nombre),
      tablaCreada: derivada.nombre,
      tablaPuente: puente.nombre,
    },
  };
}

// ---------------------------------------------------------------------------
// 3FN: dependencias transitivas
// ---------------------------------------------------------------------------

export type ResultadoTransitiva = {
  modelo: Tabla[];
  registro: TransitivaResuelta;
};

/**
 * El determinante y sus dependientes salen de la tabla original hacia una tabla
 * nueva; la original conserva solo una FK hacia ella.
 */
export function crearTablaDesdeDeterminante(
  modelo: Tabla[],
  tablaOrigenId: string,
  determinanteId: string,
  dependientesIds: string[],
  nombreNueva: string,
): ResultadoTransitiva | null {
  const origen = buscarTabla(modelo, tablaOrigenId);
  if (!origen) return null;
  const determinante = origen.columnas.find((c) => c.id === determinanteId);
  if (!determinante) return null;
  const dependientes = origen.columnas.filter((c) => dependientesIds.includes(c.id));

  const nueva = nuevaTabla(nombreNueva, "3fn", "derivada", true);
  nueva.columnas[0].autogenerada = true;
  nueva.columnas[0].nombre = `id_${aSnake(nombreNueva)}`;

  const colDeterminante = nuevaColumna(determinante.nombre, {
    tipo: determinante.tipo,
    atomicidad: determinante.atomicidad,
    dependencia: "pk",
  });
  const colsDependientes = dependientes.map((c) =>
    nuevaColumna(c.nombre, {
      tipo: c.tipo,
      atomicidad: c.atomicidad,
      dependencia: "pk",
    }),
  );
  nueva.columnas.push(colDeterminante, ...colsDependientes);
  nueva.nota = `Creada en 3FN: ${dependientes.map((d) => d.nombre).join(", ")} dependia(n) de ${determinante.nombre}, no de la PK de ${origen.nombre}.`;

  // Una fila por valor distinto del determinante.
  const idPorDeterminante = new Map<string, string>();
  for (const fila of origen.filas) {
    const clave = (fila.valores[determinante.id] ?? "").trim();
    if (!clave || idPorDeterminante.has(clave)) continue;
    const id = String(idPorDeterminante.size + 1);
    idPorDeterminante.set(clave, id);
    const valores: Record<string, string> = {
      [nueva.columnas[0].id]: id,
      [colDeterminante.id]: clave,
    };
    dependientes.forEach((dep, i) => {
      valores[colsDependientes[i].id] = (fila.valores[dep.id] ?? "").trim();
    });
    nueva.filas.push(nuevaFila(nueva.columnas, valores));
  }

  // La original cambia determinante + dependientes por una FK.
  const fk = nuevaColumna(`id_${aSnake(nombreNueva)}`, {
    esFK: true,
    refTablaId: nueva.id,
    tipo: "INT",
    atomicidad: "atomico",
    dependencia: "pk",
  });
  const aQuitar = new Set([determinante.id, ...dependientesIds]);
  const posicion = origen.columnas.findIndex((c) => c.id === determinante.id);
  const columnasRestantes = origen.columnas.filter((c) => !aQuitar.has(c.id));
  columnasRestantes.splice(Math.max(0, Math.min(posicion, columnasRestantes.length)), 0, fk);

  const origenLimpio: Tabla = {
    ...origen,
    columnas: columnasRestantes,
    filas: origen.filas.map((fila) => {
      const valores = { ...fila.valores };
      const clave = (valores[determinante.id] ?? "").trim();
      for (const id of aQuitar) delete valores[id];
      valores[fk.id] = idPorDeterminante.get(clave) ?? "";
      return { ...fila, valores };
    }),
  };

  const nuevoModelo = modelo.map((t) => (t.id === origen.id ? origenLimpio : t));
  nuevoModelo.push(nueva);

  return {
    modelo: nuevoModelo,
    registro: {
      id: nuevoId("tr"),
      tablaOrigen: origen.nombre,
      determinante: determinante.nombre,
      atributosMovidos: dependientes.map((d) => d.nombre),
      tablaDestino: nueva.nombre,
      creoTabla: true,
    },
  };
}

/** Traslada un atributo a una tabla que ya existe y deja la FK correspondiente. */
export function moverAtributo(
  modelo: Tabla[],
  tablaOrigenId: string,
  columnaId: string,
  tablaDestinoId: string,
): ResultadoTransitiva | null {
  const origen = buscarTabla(modelo, tablaOrigenId);
  const destino = buscarTabla(modelo, tablaDestinoId);
  if (!origen || !destino || origen.id === destino.id) return null;
  const columna = origen.columnas.find((c) => c.id === columnaId);
  if (!columna) return null;

  const trasladada = nuevaColumna(columna.nombre, {
    tipo: columna.tipo,
    atomicidad: columna.atomicidad,
    notaAtomicidad: columna.notaAtomicidad,
    dependencia: "pk",
  });

  const destinoActualizado: Tabla = {
    ...destino,
    columnas: [...destino.columnas, trasladada],
    filas: destino.filas.map((fila) => ({
      ...fila,
      valores: { ...fila.valores, [trasladada.id]: "" },
    })),
  };

  let columnasOrigen = origen.columnas.filter((c) => c.id !== columnaId);
  const tieneFK = columnasOrigen.some((c) => c.esFK && c.refTablaId === destino.id);
  let fkNueva: Columna | null = null;
  if (!tieneFK) {
    fkNueva = nuevaColumna(`id_${aSnake(destino.nombre)}`, {
      esFK: true,
      refTablaId: destino.id,
      tipo: "INT",
      atomicidad: "atomico",
      dependencia: "pk",
    });
    columnasOrigen = [...columnasOrigen, fkNueva];
  }

  const origenActualizado: Tabla = {
    ...origen,
    columnas: columnasOrigen,
    filas: origen.filas.map((fila) => {
      const valores = { ...fila.valores };
      delete valores[columnaId];
      if (fkNueva) valores[fkNueva.id] = "";
      return { ...fila, valores };
    }),
  };

  const nuevoModelo = modelo.map((t) => {
    if (t.id === origen.id) return origenActualizado;
    if (t.id === destino.id) return destinoActualizado;
    return t;
  });

  return {
    modelo: nuevoModelo,
    registro: {
      id: nuevoId("tr"),
      tablaOrigen: origen.nombre,
      determinante: "-",
      atributosMovidos: [columna.nombre],
      tablaDestino: destino.nombre,
      creoTabla: false,
    },
  };
}

/** Quita una tabla y limpia las FK que la referenciaban. */
export function eliminarTabla(modelo: Tabla[], tablaId: string): Tabla[] {
  return modelo
    .filter((t) => t.id !== tablaId)
    .map((t) => ({
      ...t,
      columnas: t.columnas.map((c) =>
        c.refTablaId === tablaId ? { ...c, esFK: false, refTablaId: null } : c,
      ),
    }));
}
