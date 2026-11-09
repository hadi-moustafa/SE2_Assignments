import { BuilderValidationError } from '../builders/validation';
import { parseCSV, parseJSONRecords, parseRecordsFile, parseXMLRecords } from '../parsers';
import { MappingError } from './MappingError';
import { RecordReader } from './RecordReader';

/** Converts one raw parsed record into a model object. */
export interface Mapper<T> {
  map(record: unknown): T;
}

/**
 * Base class for the model mappers. A subclass only describes how to fill its builder
 * from a RecordReader. This class handles errors and the CSV, JSON, XML and file entry points.
 *
 * - Parser failures (malformed input) are thrown as ParserError.
 * - Records that cannot become a model are thrown as MappingError, with the record index.
 */
export abstract class RecordMapper<T> implements Mapper<T> {
  protected abstract readonly modelName: string;

  /** Reads the record's fields, passes them to the model's builder and returns `build()`. */
  protected abstract buildFrom(reader: RecordReader): T;

  map(record: unknown): T {
    try {
      return this.buildFrom(new RecordReader(this.modelName, record));
    } catch (error) {
      if (error instanceof BuilderValidationError) {
        throw new MappingError(this.modelName, error.message, undefined, { cause: error });
      }
      throw error;
    }
  }

  mapAll(records: readonly unknown[]): T[] {
    return records.map((record, index) => {
      try {
        return this.map(record);
      } catch (error) {
        throw error instanceof MappingError ? error.atIndex(index) : error;
      }
    });
  }

  fromCSV(csv: string): T[] {
    return this.mapAll(parseCSV(csv));
  }

  fromJSON(json: string): T[] {
    return this.mapAll(parseJSONRecords(json));
  }

  /** Each `<recordTag>` element (default `<row>`) becomes one object. */
  fromXML(xml: string, recordTag = 'row'): T[] {
    return this.mapAll(parseXMLRecords(xml, recordTag));
  }

  /** Reads a .csv, .json or .xml file with the parser engine and maps every record. */
  async fromFile(filePath: string): Promise<T[]> {
    return this.mapAll(await parseRecordsFile(filePath));
  }
}
