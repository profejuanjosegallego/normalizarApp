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
  /** Valores del grupo que hubo que agregar a una tabla que ya existia. */
  valoresAgregados: string[];
};

/**
 * A donde van los valores del grupo de repeticion.
 *
 * Muchas veces el estudiante ya modeló la otra entidad —tiene `estudiante` y
 * tiene `materia`, y solo le falta la intermedia—. En ese caso no hay que
 * crearle otra tabla: se enlaza contra la que ya tiene.
 */
export type DestinoGrupo =
  | { modo: "crear"; nombre: string }
  /** `columnaValorId` es la columna de esa tabla donde están los valores. */
  | { modo: "existente"; tablaId: string; columnaValorId: string };

/** Siguiente entero libre para la PK de una tabla que ya tiene registros. */
function siguientePK(tabla: Tabla): number {
  const pk = columnasPK(tabla)[0];
  if (!pk) return tabla.filas.length + 1;
  const mayor = tabla.filas.reduce((max, fila) => {
    const n = Number((fila.valores[pk.id] ?? "").trim());
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return mayor + 1;
}

/**
 * Toma columnas como telefono1/telefono2 en `usuario`, lleva sus valores a una
 * tabla propia (nueva o ya existente) y crea la tabla de transicion
 * `usuario_telefono` que las asocia.
 */
export function resolverGrupoRepeticion(
  modelo: Tabla[],
  tablaOrigenId: string,
  grupo: string,
  columnasIds: string[],
  nombreTablaPuente: string,
  destino: DestinoGrupo,
): ResultadoGrupo | null {
  const origen = buscarTabla(modelo, tablaOrigenId);
  if (!origen || columnasIds.length === 0) return null;

  const columnasGrupo = origen.columnas.filter((c) => columnasIds.includes(c.id));
  if (columnasGrupo.length === 0) return null;

  const nombreValor = aSnake(grupo) || "valor";
  const idPorValor = new Map<string, string>();
  const valoresAgregados: string[] = [];

  let derivada: Tabla;
  let colValorId: string;
  let creoTabla: boolean;

  if (destino.modo === "crear") {
    creoTabla = true;
    derivada = nuevaTabla(destino.nombre, "2fn", "derivada", true);
    derivada.columnas[0].autogenerada = true;
    derivada.columnas[0].nombre = `id_${aSnake(destino.nombre)}`;
    const colValor = nuevaColumna(nombreValor, {
      tipo: columnasGrupo[0].tipo,
      atomicidad: "atomico",
      dependencia: "pk",
    });
    derivada.columnas.push(colValor);
    colValorId = colValor.id;
    derivada.nota = `Creada en 2FN desde el grupo de repetición "${grupo}" de ${origen.nombre}.`;

    // Un registro por valor distinto encontrado en el grupo.
    for (const fila of origen.filas) {
      for (const col of columnasGrupo) {
        const valor = (fila.valores[col.id] ?? "").trim();
        if (!valor || idPorValor.has(valor)) continue;
        const id = String(idPorValor.size + 1);
        idPorValor.set(valor, id);
        derivada.filas.push(
          nuevaFila(derivada.columnas, {
            [derivada.columnas[0].id]: id,
            [colValorId]: valor,
          }),
        );
      }
    }
  } else {
    // La tabla ya existe: se respeta tal cual y solo se leen sus registros para
    // saber que id le corresponde a cada valor del grupo.
    const existente = buscarTabla(modelo, destino.tablaId);
    if (!existente || existente.id === origen.id) return null;
    if (!existente.columnas.some((c) => c.id === destino.columnaValorId)) return null;

    creoTabla = false;
    colValorId = destino.columnaValorId;
    derivada = { ...existente, filas: [...existente.filas] };

    existente.filas.forEach((fila, i) => {
      const valor = (fila.valores[colValorId] ?? "").trim();
      if (valor && !idPorValor.has(valor)) idPorValor.set(valor, valorPK(existente, fila, i));
    });

    // Los valores del grupo que no estaban en la tabla se agregan como registros
    // nuevos; si no, la transicion quedaria apuntando a la nada.
    let proximo = siguientePK(existente);
    const pk = columnasPK(existente)[0];
    for (const fila of origen.filas) {
      for (const col of columnasGrupo) {
        const valor = (fila.valores[col.id] ?? "").trim();
        if (!valor || idPorValor.has(valor)) continue;
        const id = String(proximo);
        proximo += 1;
        idPorValor.set(valor, id);
        valoresAgregados.push(valor);
        derivada.filas.push(
          nuevaFila(derivada.columnas, {
            ...(pk ? { [pk.id]: id } : {}),
            [colValorId]: valor,
          }),
        );
      }
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
  const fkDerivada = nuevaColumna(`id_${aSnake(derivada.nombre)}`, {
    esFK: true,
    refTablaId: derivada.id,
    tipo: "INT",
    atomicidad: "atomico",
    dependencia: "pk",
  });
  puente.columnas.push(fkOrigen, fkDerivada);
  puente.nota = `Asocia ${origen.nombre} con ${derivada.nombre} (relación N:M).`;

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

  const nuevoModelo = modelo.map((t) =>
    t.id === origen.id ? origenLimpio : t.id === derivada.id ? derivada : t,
  );
  // La derivada solo se agrega si nacio aqui; si ya existia, ya quedo sustituida.
  if (creoTabla) nuevoModelo.push(derivada);
  nuevoModelo.push(puente);

  return {
    modelo: nuevoModelo,
    valoresAgregados,
    registro: {
      id: nuevoId("gr"),
      tablaOrigen: origen.nombre,
      grupo,
      columnasOriginales: columnasGrupo.map((c) => c.nombre),
      tablaCreada: derivada.nombre,
      creoTabla,
      tablaPuente: puente.nombre,
    },
  };
}

// ---------------------------------------------------------------------------
// 3FN: atributos que no dependen del id de su tabla
// ---------------------------------------------------------------------------

export type ResultadoRetiro = {
  modelo: Tabla[];
  registro: TransitivaResuelta;
};

/**
 * Saca una columna de su tabla porque no depende del id de esa tabla. La app no
 * decide a donde va: el estudiante la vuelve a crear en la tabla donde si
 * corresponde, que es justamente lo que se evalua en 3FN.
 */
export function retirarAtributo(
  modelo: Tabla[],
  tablaId: string,
  columnaId: string,
): ResultadoRetiro | null {
  const tabla = buscarTabla(modelo, tablaId);
  if (!tabla) return null;
  const columna = tabla.columnas.find((c) => c.id === columnaId);
  if (!columna) return null;

  const limpia: Tabla = {
    ...tabla,
    columnas: tabla.columnas.filter((c) => c.id !== columnaId),
    filas: tabla.filas.map((fila) => {
      const valores = { ...fila.valores };
      delete valores[columnaId];
      return { ...fila, valores };
    }),
  };

  return {
    modelo: modelo.map((t) => (t.id === tabla.id ? limpia : t)),
    registro: {
      id: nuevoId("tr"),
      tablaOrigen: tabla.nombre,
      atributosMovidos: [columna.nombre],
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
