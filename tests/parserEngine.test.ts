import path from 'node:path';
import { parseRecordsFile, ParserError, positionAt, UnsupportedFormatError } from '../src/parsers';

const fixture = (name: string) => path.join(__dirname, 'fixtures', name);
const dataFile = (name: string) => path.join(__dirname, '..', 'src', 'data', name);

describe('parseRecordsFile', () => {
  it.each([
    ['valid.csv', [{ name: 'Alice', age: '30' }, { name: 'Bob', age: '25' }]],
    ['valid.json', [{ id: 1, name: 'Pen', inStock: true, tags: ['a', 'b'], price: 1.5, discount: null }]],
    ['valid.xml', [{ id: '1', name: 'Car' }, { id: '2', name: 'Doll' }]],
  ])('picks the right parser for %s', async (file, expected) => {
    await expect(parseRecordsFile(fixture(file))).resolves.toEqual(expected);
  });

  it('parses every store data file into records', async () => {
    const [cakes, books, toys] = await Promise.all([
      parseRecordsFile(dataFile('cake orders.csv')),
      parseRecordsFile(dataFile('book orders.json')),
      parseRecordsFile(dataFile('toy orders.xml')),
    ]);
    expect([cakes.length, books.length, toys.length]).toEqual([263, 350, 250]);
  });

  it('matches extensions case-insensitively', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const dir = await mkdtemp(path.join(tmpdir(), 'parser-engine-'));
    try {
      const file = path.join(dir, 'ORDERS.CSV');
      await writeFile(file, 'a\n1\n');
      await expect(parseRecordsFile(file)).resolves.toEqual([{ a: '1' }]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it.each([
    ['notes.txt', '.txt'],
    ['no-extension', '(none)'],
  ])('rejects unsupported file %s', async (file, shown) => {
    const promise = parseRecordsFile(fixture(file));
    await expect(promise).rejects.toBeInstanceOf(UnsupportedFormatError);
    await expect(promise).rejects.toThrow(`Unsupported file extension "${shown}"`);
  });

  it('propagates parser errors', async () => {
    await expect(parseRecordsFile(fixture('malformed.json'))).rejects.toBeInstanceOf(ParserError);
  });
});

describe('ParserError', () => {
  it('formats the message with format and position', () => {
    const err = new ParserError('XML', 'Bad thing', { line: 3, column: 9 });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('[XML] Bad thing (line 3, column 9)');
    expect([err.format, err.line, err.column]).toEqual(['XML', 3, 9]);
  });

  it('omits the position when none is given', () => {
    expect(new ParserError('CSV', 'Bad thing').message).toBe('[CSV] Bad thing');
  });
});

describe('positionAt', () => {
  it('converts offsets into 1-based line and column', () => {
    expect(positionAt('ab\ncd\nef', 0)).toEqual({ line: 1, column: 1 });
    expect(positionAt('ab\ncd\nef', 4)).toEqual({ line: 2, column: 2 });
    expect(positionAt('ab\ncd\nef', 6)).toEqual({ line: 3, column: 1 });
  });
});
