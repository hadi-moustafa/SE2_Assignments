import { MappingError } from './MappingError';

/**
 * Normalises a field name so the same field matches in every format:
 * "Frosting Type" (CSV), "frostingType" (JSON) and "FrostingType" (XML) all become "frostingtype".
 */
export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const NUMBER_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const TRUE_WORDS = new Set(['yes', 'true', 'y', '1']);
const FALSE_WORDS = new Set(['no', 'false', 'n', '0']);

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'string') return JSON.stringify(value);
  return typeof value;
}

/**
 * Read-only view of one raw parsed record. Looks fields up by any of several names
 * and converts the raw value (usually a string) to the type the builder expects.
 *
 * Every `read*` method returns `undefined` when the field is absent, so the builder
 * can report it as missing, and throws a MappingError when the value has the wrong type.
 */
export class RecordReader {
  private readonly fields = new Map<string, { key: string; value: unknown }>();

  constructor(private readonly model: string, record: unknown) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      throw new MappingError(model, `Expected a record object but got ${describe(record)}`);
    }
    for (const [key, value] of Object.entries(record)) {
      const normalized = normalizeKey(key);
      if (!this.fields.has(normalized)) this.fields.set(normalized, { key, value });
    }
  }

  private find(names: string[]): { key: string; value: unknown } | undefined {
    for (const name of names) {
      const field = this.fields.get(normalizeKey(name));
      if (field !== undefined && field.value !== undefined && field.value !== null) return field;
    }
    return undefined;
  }

  private wrongType(key: string, expected: string, value: unknown): MappingError {
    return new MappingError(this.model, `Field "${key}" must be ${expected}, got ${describe(value)}`);
  }

  /** Reads a text field. Numbers are accepted and converted (e.g. a JSON id of 2001). */
  readText(...names: string[]): string | undefined {
    const field = this.find(names);
    if (field === undefined) return undefined;
    if (typeof field.value === 'string') return field.value.trim();
    if (typeof field.value === 'number' && Number.isFinite(field.value)) return String(field.value);
    throw this.wrongType(field.key, 'text', field.value);
  }

  /** Like readText, but a blank value counts as absent, so the builder's default is used. */
  readOptionalText(...names: string[]): string | undefined {
    const text = this.readText(...names);
    return text === '' ? undefined : text;
  }

  /** Reads a numeric field from a number or a numeric string such as "12" or "12.5". */
  readNumber(...names: string[]): number | undefined {
    const field = this.find(names);
    if (field === undefined) return undefined;
    if (typeof field.value === 'number') return field.value;
    if (typeof field.value === 'string' && NUMBER_PATTERN.test(field.value.trim())) {
      return Number(field.value.trim());
    }
    throw this.wrongType(field.key, 'a number', field.value);
  }

  /** Reads a yes/no field from a boolean or a string such as "Yes", "No", "true" or "false". */
  readBoolean(...names: string[]): boolean | undefined {
    const field = this.find(names);
    if (field === undefined) return undefined;
    if (typeof field.value === 'boolean') return field.value;
    if (typeof field.value === 'string') {
      const word = field.value.trim().toLowerCase();
      if (TRUE_WORDS.has(word)) return true;
      if (FALSE_WORDS.has(word)) return false;
    }
    throw this.wrongType(field.key, 'yes/no', field.value);
  }
}

/** Calls the builder setter only when the field was present in the record. */
export function setIfPresent<V>(value: V | undefined, setter: (value: V) => unknown): void {
  if (value !== undefined) setter(value);
}
