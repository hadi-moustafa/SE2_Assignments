import { ParserError, positionAt, stripBom } from './ParserError';
import { readTextFile } from './fileReader';

export type CSVRow = Record<string, string>;

export interface CSVParseOptions {
  /** Field separator. Defaults to ",". */
  delimiter?: string;
  /** Trim whitespace around unquoted fields. Defaults to false. */
  trim?: boolean;
}

/**
 * Splits CSV text into rows of raw fields (RFC 4180):
 * - fields may be wrapped in double quotes
 * - a quoted field may contain delimiters, newlines and escaped quotes ("")
 * - LF and CRLF line endings are both accepted
 * - completely empty lines are skipped
 */
export function tokenizeCSV(input: string, options: CSVParseOptions = {}): string[][] {
  const delimiter = options.delimiter ?? ',';
  if (delimiter.length !== 1 || delimiter === '"' || delimiter === '\n' || delimiter === '\r') {
    throw new ParserError('CSV', `Invalid delimiter ${JSON.stringify(delimiter)}: must be a single character other than a quote or newline`);
  }
  const text = stripBom(input);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let fieldWasQuoted = false;
  let i = 0;

  const pushField = () => {
    row.push(fieldWasQuoted || !options.trim ? field : field.trim());
    field = '';
    fieldWasQuoted = false;
  };
  const pushRow = () => {
    const lastFieldWasQuoted = fieldWasQuoted;
    pushField();
    const isBlankLine = row.length === 1 && row[0] === '' && !lastFieldWasQuoted;
    if (!isBlankLine) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (ch === '"') {
      if (field.trim() !== '' || fieldWasQuoted) {
        throw new ParserError('CSV', 'Unexpected quote inside a field; quoted fields must start with a quote', positionAt(text, i));
      }
      field = '';
      fieldWasQuoted = true;
      const start = i;
      i++;
      while (true) {
        if (i >= text.length) {
          throw new ParserError('CSV', 'Unterminated quoted field', positionAt(text, start));
        }
        if (text[i] === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        field += text[i++];
      }
      // After a closing quote only whitespace, a delimiter or a line break may follow.
      while (text[i] === ' ' || text[i] === '\t') i++;
      if (i < text.length && text[i] !== delimiter && text[i] !== '\n' && text[i] !== '\r') {
        throw new ParserError('CSV', 'Unexpected character after closing quote', positionAt(text, i));
      }
      continue;
    }

    if (ch === delimiter) {
      pushField();
      i++;
    } else if (ch === '\r' || ch === '\n') {
      pushRow();
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
    } else {
      field += ch;
      i++;
    }
  }

  if (field !== '' || fieldWasQuoted || row.length > 0) pushRow();
  return rows;
}

/**
 * Parses CSV text whose first row is a header into an array of objects
 * keyed by column name. All values are returned as strings.
 */
export function parseCSV(input: string, options: CSVParseOptions = {}): CSVRow[] {
  const rows = tokenizeCSV(input, options);
  if (rows.length === 0) return [];

  const [headers, ...records] = rows;
  validateHeaders(headers);

  return records.map((fields, index) => {
    if (fields.length !== headers.length) {
      throw new ParserError(
        'CSV',
        `Row ${index + 1} has ${fields.length} field(s) but the header defines ${headers.length}`,
      );
    }
    const record: CSVRow = {};
    headers.forEach((header, col) => {
      record[header] = fields[col];
    });
    return record;
  });
}

/** Reads and parses a CSV file from disk. */
export async function parseCSVFile(filePath: string, options: CSVParseOptions = {}): Promise<CSVRow[]> {
  return parseCSV(await readTextFile(filePath, 'CSV'), options);
}

function validateHeaders(headers: string[]): void {
  const seen = new Set<string>();
  headers.forEach((header, col) => {
    if (header.trim() === '') {
      throw new ParserError('CSV', `Header column ${col + 1} is empty`);
    }
    if (seen.has(header)) {
      throw new ParserError('CSV', `Duplicate header "${header}"`);
    }
    seen.add(header);
  });
}
