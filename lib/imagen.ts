import type { Tabla } from "./tipos";

/**
 * Exportacion a PNG para el informe del estudiante.
 *
 * Dos caminos, sin dependencias externas:
 *
 *   1. `descargarTablasPNG` dibuja el modelo en un `<canvas>` a partir de los
 *      datos, no del DOM. Sale identico en cualquier navegador y no depende de
 *      como se vea la pagina en ese momento.
 *   2. `descargarSVGPNG` toma un `<svg>` que ya está en pantalla (los
 *      diagramas) y lo rasteriza.
 *
 * Las dos usan una paleta clara fija: la imagen termina pegada en un documento
 * de Word, donde un fondo oscuro no sirve aunque el estudiante tenga el tema
 * oscuro activado.
 */

/** Paleta de exportacion. Equivale al tema claro, con bordes un poco mas firmes. */
const PALETA: Record<string, string> = {
  "--fondo": "#ffffff",
  "--superficie": "#ffffff",
  "--superficie-2": "#f0f2f8",
  "--superficie-3": "#e6e9f2",
  "--borde": "#c9cfdd",
  "--borde-fuerte": "#98a1b8",
  "--texto": "#16192a",
  "--texto-suave": "#5d6480",
  "--acento": "#3b4fd8",
  "--acento-texto": "#ffffff",
  "--acento-suave": "#e6e9fd",
  "--ok": "#157a52",
  "--ok-suave": "#dff4ea",
  "--alerta": "#9a6100",
  "--alerta-suave": "#fdf0d5",
  "--error": "#b02a37",
  "--error-suave": "#fbe4e6",
  "--dg-principal": "#3b4fd8",
  "--dg-derivada": "#157a52",
  "--dg-puente": "#965e00",
};

const C = (nombre: string) => PALETA[nombre] ?? "#000000";

const TIPOGRAFIA = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Se dibuja al doble de tamaño para que el texto no salga borroso al ampliar. */
const ESCALA = 2;

/* --------------------------------------------------------------------------
 * Utilidades
 * ----------------------------------------------------------------------- */

function descargarCanvas(lienzo: HTMLCanvasElement, nombreArchivo: string): void {
  lienzo.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  }, "image/png");
}

function fuente(tamano: number, peso: number | string = 400): string {
  return `${peso} ${tamano}px ${TIPOGRAFIA}`;
}

/** Recorta con puntos suspensivos para que el texto quepa en `maxAncho`. */
function recortar(ctx: CanvasRenderingContext2D, texto: string, maxAncho: number): string {
  if (ctx.measureText(texto).width <= maxAncho) return texto;
  let corte = texto.length;
  while (corte > 1 && ctx.measureText(`${texto.slice(0, corte)}…`).width > maxAncho) {
    corte -= 1;
  }
  return `${texto.slice(0, corte)}…`;
}

function rectRedondeado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  radio: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.arcTo(x + ancho, y, x + ancho, y + alto, radio);
  ctx.arcTo(x + ancho, y + alto, x, y + alto, radio);
  ctx.arcTo(x, y + alto, x, y, radio);
  ctx.arcTo(x, y, x + ancho, y, radio);
  ctx.closePath();
}

/** Pastilla de color con texto, como los chips de la interfaz. */
function pastilla(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  fondo: string,
  color: string,
): number {
  ctx.font = fuente(9.5, 700);
  const ancho = ctx.measureText(texto).width + 10;
  ctx.fillStyle = fondo;
  rectRedondeado(ctx, x, y, ancho, 14, 7);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(texto, x + 5, y + 7.5);
  return ancho;
}

/* --------------------------------------------------------------------------
 * 1. Tablas con sus registros
 * ----------------------------------------------------------------------- */

const MARGEN = 34;
const SEPARACION = 26;
const ALTO_CABECERA_HOJA = 74;
const ALTO_TITULO_TABLA = 36;
const ALTO_ENCABEZADO = 46;
const ALTO_FILA = 27;
const RELLENO = 11;
const ANCHO_COL_MIN = 86;
const ANCHO_COL_MAX = 240;
/** A partir de este alto las tablas siguen en una columna nueva a la derecha. */
const ALTO_MAX_COLUMNA = 1500;

const COLOR_TITULO: Record<Tabla["tipo"], string> = {
  principal: "--dg-principal",
  derivada: "--dg-derivada",
  puente: "--dg-puente",
};

const ETIQUETA_TIPO: Record<Tabla["tipo"], string> = {
  principal: "PRINCIPAL",
  derivada: "DERIVADA",
  puente: "TABLA DE TRANSICIÓN",
};

type Caja = {
  tabla: Tabla;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  anchosCol: number[];
};

function medirTabla(
  ctx: CanvasRenderingContext2D,
  tabla: Tabla,
  modelo: Tabla[],
): { ancho: number; alto: number; anchosCol: number[] } {
  const anchosCol = tabla.columnas.map((col) => {
    ctx.font = fuente(12, 700);
    let necesario = ctx.measureText(col.nombre).width;

    // La segunda linea del encabezado lleva las marcas PK/FK y el tipo de dato.
    ctx.font = fuente(9.5, 700);
    const destino = col.esFK
      ? (modelo.find((t) => t.id === col.refTablaId)?.nombre ?? "?")
      : "";
    const marcas =
      (col.esPK ? ctx.measureText("PK").width + 14 : 0) +
      (col.esFK ? ctx.measureText(`FK → ${destino}`).width + 14 : 0) +
      (col.tipo ? ctx.measureText(col.tipo).width + 6 : 0);
    necesario = Math.max(necesario, marcas);

    ctx.font = fuente(12);
    for (const fila of tabla.filas) {
      necesario = Math.max(necesario, ctx.measureText(fila.valores[col.id] ?? "").width);
    }

    return Math.min(ANCHO_COL_MAX, Math.max(ANCHO_COL_MIN, Math.ceil(necesario) + RELLENO * 2));
  });

  let ancho = anchosCol.reduce((suma, a) => suma + a, 0);

  // Si el nombre de la tabla es mas ancho que la rejilla, se ensancha la columna
  // mas grande para que el borde no quede escalonado.
  ctx.font = fuente(14, 700);
  const minPorTitulo = Math.ceil(
    ctx.measureText(tabla.nombre).width + ctx.measureText(ETIQUETA_TIPO[tabla.tipo]).width + 60,
  );
  if (anchosCol.length > 0 && minPorTitulo > ancho) {
    const mayor = anchosCol.indexOf(Math.max(...anchosCol));
    anchosCol[mayor] += minPorTitulo - ancho;
    ancho = minPorTitulo;
  }
  ancho = Math.max(ancho, 220);

  const filas = Math.max(1, tabla.filas.length);
  const alto =
    ALTO_TITULO_TABLA +
    (anchosCol.length > 0 ? ALTO_ENCABEZADO + filas * ALTO_FILA : ALTO_FILA * 2);

  return { ancho, alto, anchosCol };
}

function dibujarTabla(ctx: CanvasRenderingContext2D, caja: Caja, modelo: Tabla[]): void {
  const { tabla, x, y, ancho, alto, anchosCol } = caja;

  // Marco
  ctx.fillStyle = C("--superficie");
  rectRedondeado(ctx, x, y, ancho, alto, 10);
  ctx.fill();

  // Banda de titulo
  ctx.save();
  rectRedondeado(ctx, x, y, ancho, alto, 10);
  ctx.clip();
  ctx.fillStyle = C(COLOR_TITULO[tabla.tipo]);
  ctx.fillRect(x, y, ancho, ALTO_TITULO_TABLA);
  ctx.restore();

  ctx.textBaseline = "middle";
  ctx.font = fuente(14, 700);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(
    recortar(ctx, tabla.nombre || "(sin nombre)", ancho - 150),
    x + RELLENO,
    y + ALTO_TITULO_TABLA / 2,
  );

  ctx.font = fuente(9, 700);
  ctx.globalAlpha = 0.85;
  ctx.textAlign = "right";
  ctx.fillText(ETIQUETA_TIPO[tabla.tipo], x + ancho - RELLENO, y + ALTO_TITULO_TABLA / 2 + 1);
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";

  if (anchosCol.length === 0) {
    ctx.font = fuente(12);
    ctx.fillStyle = C("--texto-suave");
    ctx.textAlign = "center";
    ctx.fillText("Sin atributos", x + ancho / 2, y + ALTO_TITULO_TABLA + ALTO_FILA);
    ctx.textAlign = "left";
    ctx.strokeStyle = C("--borde-fuerte");
    ctx.lineWidth = 1;
    rectRedondeado(ctx, x + 0.5, y + 0.5, ancho - 1, alto - 1, 10);
    ctx.stroke();
    return;
  }

  // Fila de encabezados
  const yEnc = y + ALTO_TITULO_TABLA;
  ctx.fillStyle = C("--superficie-2");
  ctx.fillRect(x, yEnc, ancho, ALTO_ENCABEZADO);

  let cx = x;
  tabla.columnas.forEach((col, i) => {
    const w = anchosCol[i];

    ctx.font = fuente(12, 700);
    ctx.fillStyle = C("--texto");
    ctx.fillText(recortar(ctx, col.nombre || "—", w - RELLENO * 2), cx + RELLENO, yEnc + 16);

    let mx = cx + RELLENO;
    const yMarcas = yEnc + 25;
    if (col.esPK) {
      mx += pastilla(ctx, "PK", mx, yMarcas, C("--alerta-suave"), C("--alerta")) + 4;
    }
    if (col.esFK) {
      const destino = modelo.find((t) => t.id === col.refTablaId)?.nombre ?? "?";
      mx += pastilla(ctx, `FK → ${destino}`, mx, yMarcas, C("--acento-suave"), C("--acento")) + 4;
    }
    if (col.tipo && mx + 30 < cx + w) {
      ctx.font = fuente(9.5);
      ctx.fillStyle = C("--texto-suave");
      ctx.fillText(recortar(ctx, col.tipo, cx + w - RELLENO - mx), mx, yMarcas + 7.5);
    }

    cx += w;
  });

  // Registros
  ctx.font = fuente(12);
  tabla.filas.forEach((fila, f) => {
    const yFila = yEnc + ALTO_ENCABEZADO + f * ALTO_FILA;
    if (f % 2 === 1) {
      ctx.fillStyle = C("--superficie-2");
      ctx.fillRect(x, yFila, ancho, ALTO_FILA);
    }
    let fx = x;
    tabla.columnas.forEach((col, i) => {
      const w = anchosCol[i];
      const valor = fila.valores[col.id] ?? "";
      ctx.fillStyle = valor ? C("--texto") : C("--texto-suave");
      ctx.fillText(
        recortar(ctx, valor || "—", w - RELLENO * 2),
        fx + RELLENO,
        yFila + ALTO_FILA / 2,
      );
      fx += w;
    });
  });

  if (tabla.filas.length === 0) {
    ctx.fillStyle = C("--texto-suave");
    ctx.textAlign = "center";
    ctx.fillText("Sin registros", x + ancho / 2, yEnc + ALTO_ENCABEZADO + ALTO_FILA / 2);
    ctx.textAlign = "left";
  }

  // Rejilla
  ctx.strokeStyle = C("--borde");
  ctx.lineWidth = 1;
  ctx.beginPath();
  let lx = x;
  for (let i = 0; i < anchosCol.length - 1; i += 1) {
    lx += anchosCol[i];
    ctx.moveTo(Math.round(lx) + 0.5, yEnc);
    ctx.lineTo(Math.round(lx) + 0.5, y + alto);
  }
  for (let f = 0; f <= Math.max(1, tabla.filas.length); f += 1) {
    const ly = yEnc + ALTO_ENCABEZADO + f * ALTO_FILA;
    if (ly > y + alto) break;
    ctx.moveTo(x, Math.round(ly) + 0.5);
    ctx.lineTo(x + ancho, Math.round(ly) + 0.5);
  }
  ctx.moveTo(x, Math.round(yEnc) + 0.5);
  ctx.lineTo(x + ancho, Math.round(yEnc) + 0.5);
  ctx.stroke();

  ctx.strokeStyle = C("--borde-fuerte");
  rectRedondeado(ctx, x + 0.5, y + 0.5, ancho - 1, alto - 1, 10);
  ctx.stroke();
}

export type OpcionesTablas = {
  modelo: Tabla[];
  /** Encabezado grande: normalmente el paso ("2FN · Segunda forma normal"). */
  titulo: string;
  /** Linea pequeña bajo el titulo: ejercicio, estudiante, fecha. */
  subtitulo: string;
  nombreArchivo: string;
};

export function descargarTablasPNG({
  modelo,
  titulo,
  subtitulo,
  nombreArchivo,
}: OpcionesTablas): void {
  const medidor = document.createElement("canvas").getContext("2d");
  if (!medidor) return;

  // Reparto en columnas: se apilan hacia abajo y se abre una columna nueva
  // cuando la actual se pasa de alto.
  const cajas: Caja[] = [];
  const anchosColumna: number[] = [];
  let columna = 0;
  let x = MARGEN;
  let y = MARGEN + ALTO_CABECERA_HOJA;
  let anchoColumna = 0;

  for (const tabla of modelo) {
    const { ancho, alto, anchosCol } = medirTabla(medidor, tabla, modelo);
    if (y > MARGEN + ALTO_CABECERA_HOJA && y + alto > ALTO_MAX_COLUMNA) {
      anchosColumna[columna] = anchoColumna;
      x += anchoColumna + SEPARACION;
      y = MARGEN + ALTO_CABECERA_HOJA;
      anchoColumna = 0;
      columna += 1;
    }
    cajas.push({ tabla, x, y, ancho, alto, anchosCol });
    y += alto + SEPARACION;
    anchoColumna = Math.max(anchoColumna, ancho);
  }
  anchosColumna[columna] = anchoColumna;

  const anchoTotal =
    MARGEN * 2 +
    anchosColumna.reduce((suma, a) => suma + a, 0) +
    SEPARACION * Math.max(0, anchosColumna.length - 1);
  const altoTotal =
    cajas.reduce((max, c) => Math.max(max, c.y + c.alto), MARGEN + ALTO_CABECERA_HOJA) + MARGEN;

  const lienzo = document.createElement("canvas");
  lienzo.width = Math.max(560, Math.ceil(anchoTotal)) * ESCALA;
  lienzo.height = Math.max(260, Math.ceil(altoTotal)) * ESCALA;
  const ctx = lienzo.getContext("2d");
  if (!ctx) return;
  ctx.scale(ESCALA, ESCALA);

  ctx.fillStyle = C("--fondo");
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);

  ctx.textBaseline = "middle";
  ctx.font = fuente(21, 800);
  ctx.fillStyle = C("--texto");
  ctx.fillText(titulo, MARGEN, MARGEN + 14);
  ctx.font = fuente(12.5);
  ctx.fillStyle = C("--texto-suave");
  ctx.fillText(subtitulo, MARGEN, MARGEN + 38);

  ctx.strokeStyle = C("--borde");
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGEN, MARGEN + 54.5);
  ctx.lineTo(Math.max(560, anchoTotal) - MARGEN, MARGEN + 54.5);
  ctx.stroke();

  if (cajas.length === 0) {
    ctx.font = fuente(13);
    ctx.fillStyle = C("--texto-suave");
    ctx.fillText("Todavía no hay tablas en el modelo.", MARGEN, MARGEN + ALTO_CABECERA_HOJA + 20);
  }

  for (const caja of cajas) dibujarTabla(ctx, caja, modelo);

  descargarCanvas(lienzo, nombreArchivo);
}

/* --------------------------------------------------------------------------
 * 2. Rasterizado de un SVG que ya esta en pantalla
 * ----------------------------------------------------------------------- */

/**
 * El SVG de la página usa variables CSS (`var(--borde)`), que no existen cuando
 * el archivo se abre suelto como imagen. Se reemplazan por el color literal de
 * la paleta de exportacion antes de rasterizar.
 */
function resolverVariables(svgTexto: string): string {
  return svgTexto.replace(/var\(\s*(--[a-z0-9-]+)\s*(?:,[^)]*)?\)/gi, (_, nombre: string) =>
    C(nombre),
  );
}

export type OpcionesSVG = {
  titulo: string;
  subtitulo: string;
  nombreArchivo: string;
};

export async function descargarSVGPNG(
  svg: SVGSVGElement,
  { titulo, subtitulo, nombreArchivo }: OpcionesSVG,
): Promise<void> {
  const viewBox = svg.viewBox.baseVal;
  const ancho = Math.ceil(viewBox.width || svg.clientWidth || 800);
  const alto = Math.ceil(viewBox.height || svg.clientHeight || 600);

  // Se clona para no tocar lo que el estudiante tiene en pantalla, y se fija el
  // tamaño real (el `width` del DOM lleva aplicado el zoom del visor).
  const copia = svg.cloneNode(true) as SVGSVGElement;
  copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copia.setAttribute("width", String(ancho));
  copia.setAttribute("height", String(alto));
  copia.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
  copia.style.fontFamily = TIPOGRAFIA;

  const texto = resolverVariables(new XMLSerializer().serializeToString(copia));
  const url = URL.createObjectURL(new Blob([texto], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const imagen = await new Promise<HTMLImageElement>((resolver, rechazar) => {
      const img = new Image();
      img.onload = () => resolver(img);
      img.onerror = () => rechazar(new Error("No se pudo rasterizar el diagrama."));
      img.src = url;
    });

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho * ESCALA;
    lienzo.height = (alto + ALTO_CABECERA_HOJA) * ESCALA;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return;
    ctx.scale(ESCALA, ESCALA);

    ctx.fillStyle = C("--fondo");
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);

    ctx.textBaseline = "middle";
    ctx.font = fuente(21, 800);
    ctx.fillStyle = C("--texto");
    ctx.fillText(titulo, MARGEN, MARGEN + 14);
    ctx.font = fuente(12.5);
    ctx.fillStyle = C("--texto-suave");
    ctx.fillText(subtitulo, MARGEN, MARGEN + 38);
    ctx.strokeStyle = C("--borde");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGEN, MARGEN + 54.5);
    ctx.lineTo(ancho - MARGEN, MARGEN + 54.5);
    ctx.stroke();

    ctx.drawImage(imagen, 0, ALTO_CABECERA_HOJA, ancho, alto);
    descargarCanvas(lienzo, nombreArchivo);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Nombre de archivo sin espacios ni tildes: "1fn-biblioteca-tablas.png". */
export function nombrePNG(partes: (string | undefined)[]): string {
  const limpio = partes
    .filter((p): p is string => !!p && p.trim().length > 0)
    .map((p) =>
      p
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join("-");
  return `${limpio || "taller"}.png`;
}
