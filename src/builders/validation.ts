/** Thrown when a builder receives an invalid value or is built with required fields missing. */
export class BuilderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuilderValidationError';
  }
}

function describe(value: unknown): string {
  return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
}

export function requireNonEmptyString(field: string, value: unknown): string {
  if (typeof value !== 'string') {
    throw new BuilderValidationError(`${field} must be a string, got ${describe(value)}`);
  }
  if (value.trim() === '') {
    throw new BuilderValidationError(`${field} must not be empty`);
  }
  return value;
}

/** Like requireNonEmptyString, but allows an empty string (e.g. no custom message). */
export function requireString(field: string, value: unknown): string {
  if (typeof value !== 'string') {
    throw new BuilderValidationError(`${field} must be a string, got ${describe(value)}`);
  }
  return value;
}

export function requirePositiveNumber(field: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BuilderValidationError(`${field} must be a finite number, got ${describe(value)}`);
  }
  if (value <= 0) {
    throw new BuilderValidationError(`${field} must be greater than 0, got ${value}`);
  }
  return value;
}

export function requirePositiveInteger(field: string, value: unknown): number {
  const n = requirePositiveNumber(field, value);
  if (!Number.isInteger(n)) {
    throw new BuilderValidationError(`${field} must be a whole number, got ${n}`);
  }
  return n;
}

export function requireBoolean(field: string, value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new BuilderValidationError(`${field} must be a boolean, got ${describe(value)}`);
  }
  return value;
}

/** Throws listing every field whose value is still undefined. */
export function assertRequiredFields(model: string, fields: Record<string, unknown>): void {
  const missing = Object.keys(fields).filter((name) => fields[name] === undefined);
  if (missing.length > 0) {
    throw new BuilderValidationError(`Cannot build ${model}: missing required field(s): ${missing.join(', ')}`);
  }
}
