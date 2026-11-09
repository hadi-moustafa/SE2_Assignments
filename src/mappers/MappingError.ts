/** Thrown when a parsed record cannot be turned into a model object. */
export class MappingError extends Error {
  constructor(
    readonly model: string,
    readonly reason: string,
    readonly recordIndex?: number,
    options?: { cause?: unknown },
  ) {
    const where = recordIndex === undefined ? '' : ` record ${recordIndex}:`;
    super(`[${model} mapper]${where} ${reason}`, options);
    this.name = 'MappingError';
  }

  /** Returns a copy of this error that also says which record failed. */
  atIndex(recordIndex: number): MappingError {
    return new MappingError(this.model, this.reason, recordIndex, { cause: this.cause });
  }
}
