import { extname } from 'node:path';
import { parseCSVFile } from './csvParser';
import { parseJSONRecordsFile } from './jsonParser';
import { parseXMLRecordsFile } from './xmlParser';

export * from './ParserError';
export * from './csvParser';
export * from './jsonParser';
export * from './xmlParser';

export type SupportedExtension = '.csv' | '.json' | '.xml';

export type StoreRecord = Record<string, unknown>;

/** Thrown when the engine has no parser for a file's extension. */
export class UnsupportedFormatError extends Error {
  constructor(readonly filePath: string, readonly extension: string) {
    super(`Unsupported file extension "${extension || '(none)'}" for "${filePath}"`);
    this.name = 'UnsupportedFormatError';
  }
}

/**
 * Parser engine entry point: picks the parser from the file extension and
 * returns the file's records as an array of plain objects.
 */
export async function parseRecordsFile(filePath: string): Promise<StoreRecord[]> {
  const extension = extname(filePath).toLowerCase();
  switch (extension) {
    case '.csv':
      return parseCSVFile(filePath);
    case '.json':
      return parseJSONRecordsFile(filePath);
    case '.xml':
      return parseXMLRecordsFile(filePath);
    default:
      throw new UnsupportedFormatError(filePath, extension);
  }
}
