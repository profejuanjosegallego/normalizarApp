/**
 * Analisis lexico: parte el texto en tokens.
 *
 * Reconoce comentarios (`-- `, `#`, `/* *\/`), cadenas con comillas simples o
 * dobles, identificadores entre acentos graves y los simbolos del subconjunto
 * de SQL que soporta el motor.
 */

import { ErrorSQL } from "./tipos";

export type TipoToken =
  | "palabra"
  | "numero"
  | "cadena"
  | "simbolo"
  | "fin";

export type Token = {
  tipo: TipoToken;
  /** Texto tal como aparece en el script. */
  texto: string;
  /** Para "palabra": el texto en mayusculas, para comparar sin importar el caso. */
  clave: string;
  /** Valor ya interpretado en numeros y cadenas. */
  valor: string | number | null;
  linea: number;
  /** Posicion absoluta en el texto, para recortar el SQL de cada sentencia. */
  inicio: number;
  fin: number;
  /** Cierto cuando venia entre acentos graves o comillas dobles: nunca es palabra reservada. */
  citado: boolean;
};

const SIMBOLOS_DOBLES = ["<=", ">=", "<>", "!="];
const SIMBOLOS_SIMPLES = "(),;*=<>.+-/%";

function esInicioIdent(c: string): boolean {
  return /[A-Za-z_\u00C0-\u024F]/.test(c);
}

function esIdent(c: string): boolean {
  return /[A-Za-z0-9_\u00C0-\u024F]/.test(c);
}

export function tokenizar(texto: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let linea = 1;

  function avanzarLineas(desde: number, hasta: number) {
    for (let k = desde; k < hasta; k += 1) if (texto[k] === "\n") linea += 1;
  }

  while (i < texto.length) {
    const c = texto[i];

    // Espacios en blanco
    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      if (c === "\n") linea += 1;
      i += 1;
      continue;
    }

    // Comentario de linea
    if ((c === "-" && texto[i + 1] === "-") || c === "#") {
      while (i < texto.length && texto[i] !== "\n") i += 1;
      continue;
    }

    // Comentario de bloque
    if (c === "/" && texto[i + 1] === "*") {
      const cierre = texto.indexOf("*/", i + 2);
      const fin = cierre === -1 ? texto.length : cierre + 2;
      avanzarLineas(i, fin);
      i = fin;
      continue;
    }

    const inicio = i;
    const lineaToken = linea;

    // Cadena de texto
    if (c === "'" || c === '"') {
      const comilla = c;
      let valor = "";
      i += 1;
      let cerrada = false;
      while (i < texto.length) {
        const d = texto[i];
        if (d === "\\" && i + 1 < texto.length) {
          const sig = texto[i + 1];
          valor += sig === "n" ? "\n" : sig === "t" ? "\t" : sig;
          i += 2;
          continue;
        }
        if (d === comilla) {
          // Dos comillas seguidas son una comilla literal.
          if (texto[i + 1] === comilla) {
            valor += comilla;
            i += 2;
            continue;
          }
          i += 1;
          cerrada = true;
          break;
        }
        if (d === "\n") linea += 1;
        valor += d;
        i += 1;
      }
      if (!cerrada) {
        throw new ErrorSQL(
          `Falta cerrar la comilla que abriste en la línea ${lineaToken}.`,
          lineaToken,
          `Los textos van entre comillas simples, así: ${comilla}Ana${comilla}`,
        );
      }
      // Las comillas dobles se usan en clase para textos, igual que las simples.
      tokens.push({
        tipo: "cadena",
        texto: texto.slice(inicio, i),
        clave: "",
        valor,
        linea: lineaToken,
        inicio,
        fin: i,
        citado: true,
      });
      continue;
    }

    // Identificador entre acentos graves
    if (c === "`") {
      i += 1;
      let valor = "";
      while (i < texto.length && texto[i] !== "`") {
        if (texto[i] === "\n") linea += 1;
        valor += texto[i];
        i += 1;
      }
      if (i >= texto.length) {
        throw new ErrorSQL(
          "Falta cerrar el acento grave (`) del nombre.",
          lineaToken,
          "Los acentos graves van en pareja: `mi tabla`",
        );
      }
      i += 1;
      tokens.push({
        tipo: "palabra",
        texto: valor,
        clave: valor.toUpperCase(),
        valor,
        linea: lineaToken,
        inicio,
        fin: i,
        citado: true,
      });
      continue;
    }

    // Numero
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(texto[i + 1] ?? ""))) {
      while (i < texto.length && /[0-9]/.test(texto[i])) i += 1;
      if (texto[i] === "." ) {
        i += 1;
        while (i < texto.length && /[0-9]/.test(texto[i])) i += 1;
      }
      const crudo = texto.slice(inicio, i);
      tokens.push({
        tipo: "numero",
        texto: crudo,
        clave: crudo,
        valor: Number(crudo),
        linea: lineaToken,
        inicio,
        fin: i,
        citado: false,
      });
      continue;
    }

    // Palabra o identificador
    if (esInicioIdent(c)) {
      while (i < texto.length && esIdent(texto[i])) i += 1;
      const crudo = texto.slice(inicio, i);
      tokens.push({
        tipo: "palabra",
        texto: crudo,
        clave: crudo.toUpperCase(),
        valor: crudo,
        linea: lineaToken,
        inicio,
        fin: i,
        citado: false,
      });
      continue;
    }

    // Simbolos
    const doble = texto.slice(i, i + 2);
    if (SIMBOLOS_DOBLES.includes(doble)) {
      i += 2;
      tokens.push({
        tipo: "simbolo",
        texto: doble,
        clave: doble,
        valor: doble,
        linea: lineaToken,
        inicio,
        fin: i,
        citado: false,
      });
      continue;
    }

    if (SIMBOLOS_SIMPLES.includes(c)) {
      i += 1;
      tokens.push({
        tipo: "simbolo",
        texto: c,
        clave: c,
        valor: c,
        linea: lineaToken,
        inicio,
        fin: i,
        citado: false,
      });
      continue;
    }

    throw new ErrorSQL(
      `No entiendo el carácter «${c}» de la línea ${lineaToken}.`,
      lineaToken,
      "Revisa que no se haya colado un símbolo raro al copiar y pegar.",
    );
  }

  tokens.push({
    tipo: "fin",
    texto: "",
    clave: "",
    valor: null,
    linea,
    inicio: texto.length,
    fin: texto.length,
    citado: false,
  });

  return tokens;
}
