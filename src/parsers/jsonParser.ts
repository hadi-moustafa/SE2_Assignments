import { ParserError, positionAt, stripBom } from './ParserError';
import { readTextFile } from './fileReader';

export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

/**
 * Parses JSON text (RFC 8259) into a JavaScript value. Supports every JSON
 * data type: objects, arrays, strings, numbers, booleans and null.
 * Empty input and syntax errors raise a ParserError with line and column.
 */
export function parseJSON<T = JSONValue>(input: string): T {
  return new JSONReader(stripBom(input)).parseDocument() as T;
}

/** Parses JSON text that must be an array of objects (one object per record). */
export function parseJSONRecords<T extends object = Record<string, JSONValue>>(input: string): T[] {
  const value = parseJSON<unknown>(input);
  if (!Array.isArray(value)) {
    throw new ParserError('JSON', `Expected a top-level array of records but found ${describe(value)}`);
  }
  value.forEach((item, index) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw new ParserError('JSON', `Record at index ${index} must be an object but found ${describe(item)}`);
    }
  });
  return value as T[];
}

/** Reads and parses a JSON file from disk. */
export async function parseJSONFile<T = JSONValue>(filePath: string): Promise<T> {
  return parseJSON<T>(await readTextFile(filePath, 'JSON'));
}

/** Reads a JSON file from disk that must contain an array of record objects. */
export async function parseJSONRecordsFile<T extends object = Record<string, JSONValue>>(filePath: string): Promise<T[]> {
  return parseJSONRecords<T>(await readTextFile(filePath, 'JSON'));
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return `a ${typeof value}`;
}

const ESCAPES: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

/** Recursive-descent JSON reader that tracks its offset for error reporting. */
class JSONReader {
  private pos = 0;

  constructor(private readonly text: string) {}

  parseDocument(): JSONValue {
    this.skipWhitespace();
    if (this.pos >= this.text.length) this.fail('Input is empty');
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.pos < this.text.length) this.fail(`Unexpected ${this.describeCurrent()} after the JSON value`);
    return value;
  }

  private parseValue(): JSONValue {
    this.skipWhitespace();
    const ch = this.text[this.pos];
    switch (ch) {
      case '{':
        return this.parseObject();
      case '[':
        return this.parseArray();
      case '"':
        return this.parseString();
      case 't':
        return this.parseLiteral('true', true);
      case 'f':
        return this.parseLiteral('false', false);
      case 'n':
        return this.parseLiteral('null', null);
      default:
        if (ch === '-' || (ch >= '0' && ch <= '9')) return this.parseNumber();
        return this.fail(`Unexpected ${this.describeCurrent()}, expected a value`);
    }
  }

  private parseObject(): { [key: string]: JSONValue } {
    const result: { [key: string]: JSONValue } = {};
    this.pos++; // '{'
    this.skipWhitespace();
    if (this.text[this.pos] === '}') {
      this.pos++;
      return result;
    }
    while (true) {
      this.skipWhitespace();
      if (this.text[this.pos] !== '"') this.fail(`Expected a double-quoted property name but found ${this.describeCurrent()}`);
      const key = this.parseString();
      this.skipWhitespace();
      this.expect(':', `Expected ":" after property name "${key}"`);
      // defineProperty keeps keys such as "__proto__" as plain data.
      Object.defineProperty(result, key, { value: this.parseValue(), enumerable: true, writable: true, configurable: true });
      this.skipWhitespace();
      if (this.text[this.pos] === ',') {
        this.pos++;
        continue;
      }
      this.expect('}', `Expected "," or "}" in object but found ${this.describeCurrent()}`);
      return result;
    }
  }

  private parseArray(): JSONValue[] {
    const result: JSONValue[] = [];
    this.pos++; // '['
    this.skipWhitespace();
    if (this.text[this.pos] === ']') {
      this.pos++;
      return result;
    }
    while (true) {
      result.push(this.parseValue());
      this.skipWhitespace();
      if (this.text[this.pos] === ',') {
        this.pos++;
        continue;
      }
      this.expect(']', `Expected "," or "]" in array but found ${this.describeCurrent()}`);
      return result;
    }
  }

  private parseString(): string {
    const start = this.pos;
    this.pos++; // opening quote
    let result = '';
    while (true) {
      if (this.pos >= this.text.length) this.fail('Unterminated string', start);
      const ch = this.text[this.pos];
      if (ch === '"') {
        this.pos++;
        return result;
      }
      if (ch < ' ') this.fail('Control characters must be escaped inside strings');
      if (ch !== '\\') {
        result += ch;
        this.pos++;
        continue;
      }
      const esc = this.text[this.pos + 1];
      if (esc === 'u') {
        const hex = this.text.slice(this.pos + 2, this.pos + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail('Invalid unicode escape, expected \\u followed by 4 hex digits');
        result += String.fromCharCode(parseInt(hex, 16));
        this.pos += 6;
      } else if (esc !== undefined && esc in ESCAPES) {
        result += ESCAPES[esc];
        this.pos += 2;
      } else {
        this.fail(`Invalid escape sequence "\\${esc ?? ''}"`);
      }
    }
  }

  private parseNumber(): number {
    NUMBER.lastIndex = this.pos;
    const match = NUMBER.exec(this.text);
    if (!match) this.fail('Invalid number');
    const next = this.text[this.pos + match[0].length];
    if (next !== undefined && /[0-9.eE+\-]/.test(next)) this.fail('Invalid number', this.pos + match[0].length);
    this.pos += match[0].length;
    return Number(match[0]);
  }

  private parseLiteral<V extends JSONValue>(word: string, value: V): V {
    if (!this.text.startsWith(word, this.pos)) this.fail(`Unexpected ${this.describeCurrent()}, expected a value`);
    this.pos += word.length;
    return value;
  }

  private skipWhitespace(): void {
    while (this.pos < this.text.length && ' \t\n\r'.includes(this.text[this.pos])) this.pos++;
  }

  private expect(token: string, message: string): void {
    if (this.text[this.pos] !== token) this.fail(message);
    this.pos++;
  }

  private describeCurrent(): string {
    return this.pos >= this.text.length ? 'end of input' : `character "${this.text[this.pos]}"`;
  }

  private fail(message: string, at: number = this.pos): never {
    throw new ParserError('JSON', message, positionAt(this.text, at));
  }
}
