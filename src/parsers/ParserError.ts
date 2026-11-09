export type ParserFormat = 'CSV' | 'JSON' | 'XML';

export interface ErrorPosition {
  line: number;
  column: number;
}

/**
 * Single error type thrown by every parser in the engine, so callers can
 * handle failures uniformly regardless of the input format.
 */
export class ParserError extends Error {
  readonly format: ParserFormat;
  readonly line?: number;
  readonly column?: number;

  constructor(format: ParserFormat, message: string, position?: ErrorPosition, options?: { cause?: unknown }) {
    const where = position ? ` (line ${position.line}, column ${position.column})` : '';
    super(`[${format}] ${message}${where}`, options);
    this.name = 'ParserError';
    this.format = format;
    this.line = position?.line;
    this.column = position?.column;
  }
}

/** Converts a character offset into a 1-based line/column position. */
export function positionAt(text: string, offset: number): ErrorPosition {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

/** Removes a leading UTF-8 byte order mark, which some editors add to files. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
