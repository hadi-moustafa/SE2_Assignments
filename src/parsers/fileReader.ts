import { readFile } from 'node:fs/promises';
import { ParserError, ParserFormat } from './ParserError';

/** Reads a UTF-8 file, turning file-system failures into a ParserError. */
export async function readTextFile(filePath: string, format: ParserFormat): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (err) {
    // Node's fs always rejects with an Error (e.g. ENOENT, EISDIR, EACCES).
    throw new ParserError(format, `Unable to read file "${filePath}": ${(err as Error).message}`, undefined, { cause: err });
  }
}
