import path from 'node:path';
import { parseCSV, parseCSVFile, tokenizeCSV } from '../src/parsers/csvParser';
import { ParserError } from '../src/parsers/ParserError';

const fixture = (name: string) => path.join(__dirname, 'fixtures', name);
const dataFile = (name: string) => path.join(__dirname, '..', 'src', 'data', name);

describe('tokenizeCSV', () => {
  it('splits simple rows and fields', () => {
    expect(tokenizeCSV('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields containing delimiters, newlines and escaped quotes', () => {
    expect(tokenizeCSV('"a,b","line1\nline2","say ""hi"""')).toEqual([['a,b', 'line1\nline2', 'say "hi"']]);
  });

  it('accepts CRLF and lone CR line endings', () => {
    expect(tokenizeCSV('a,b\r\n1,2\r3,4\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('keeps empty fields, including quoted empty strings and trailing empties', () => {
    expect(tokenizeCSV('a,,""\n,,')).toEqual([
      ['a', '', ''],
      ['', '', ''],
    ]);
  });

  it('keeps a lone quoted empty field on its own line', () => {
    expect(tokenizeCSV('""')).toEqual([['']]);
  });

  it('skips blank lines', () => {
    expect(tokenizeCSV('\n\na\n\n\nb\n\n')).toEqual([['a'], ['b']]);
  });

  it('strips a UTF-8 byte order mark', () => {
    expect(tokenizeCSV('﻿a,b')).toEqual([['a', 'b']]);
  });

  it('supports a custom delimiter', () => {
    expect(tokenizeCSV('a;b\n"x;y";z', { delimiter: ';' })).toEqual([
      ['a', 'b'],
      ['x;y', 'z'],
    ]);
  });

  it('trims unquoted fields only when asked to', () => {
    expect(tokenizeCSV(' a , b ')).toEqual([[' a ', ' b ']]);
    expect(tokenizeCSV(' a , " b " ', { trim: true })).toEqual([['a', ' b ']]);
  });

  it('allows whitespace between a closing quote and the delimiter', () => {
    expect(tokenizeCSV('"a"  ,"b"\t\n')).toEqual([['a', 'b']]);
  });

  it('allows leading whitespace before an opening quote', () => {
    expect(tokenizeCSV('a,  "b"')).toEqual([['a', 'b']]);
  });

  it('returns no rows for empty or whitespace-only-lines input', () => {
    expect(tokenizeCSV('')).toEqual([]);
    expect(tokenizeCSV('\r\n\n')).toEqual([]);
  });

  describe('errors', () => {
    it('rejects an unterminated quoted field and reports where it started', () => {
      expect(() => tokenizeCSV('a,b\n1,"oops')).toThrow(
        expect.objectContaining({ name: 'ParserError', format: 'CSV', line: 2, column: 3 }),
      );
    });

    it('rejects a quote in the middle of an unquoted field', () => {
      expect(() => tokenizeCSV('ab"c"')).toThrow(/Unexpected quote inside a field/);
    });

    it('rejects a second quoted section in the same field', () => {
      expect(() => tokenizeCSV('"a" "b"')).toThrow(/Unexpected character after closing quote/);
    });

    it('rejects text after a closing quote', () => {
      expect(() => tokenizeCSV('"a"b,c')).toThrow(/Unexpected character after closing quote.*line 1, column 4/);
    });

    it.each([[''], [',,'], ['"'], ['\n'], ['\r']])('rejects invalid delimiter %j', (delimiter) => {
      expect(() => tokenizeCSV('a', { delimiter })).toThrow(/Invalid delimiter/);
    });
  });
});

describe('parseCSV', () => {
  it('maps rows to objects keyed by header', () => {
    expect(parseCSV('id,name\n1,Cake\n2,Pie\n')).toEqual([
      { id: '1', name: 'Cake' },
      { id: '2', name: 'Pie' },
    ]);
  });

  it('returns an empty array for empty input or a header-only file', () => {
    expect(parseCSV('')).toEqual([]);
    expect(parseCSV('id,name\n')).toEqual([]);
  });

  it('keeps missing values as empty strings when the column is present', () => {
    expect(parseCSV('id,message\n1,\n2,""')).toEqual([
      { id: '1', message: '' },
      { id: '2', message: '' },
    ]);
  });

  it('rejects rows with missing fields', () => {
    expect(() => parseCSV('id,name\n1')).toThrow(/Row 1 has 1 field\(s\) but the header defines 2/);
  });

  it('rejects rows with extra fields', () => {
    expect(() => parseCSV('id\n1\n2,3')).toThrow(/Row 2 has 2 field\(s\)/);
  });

  it('rejects empty header names', () => {
    expect(() => parseCSV('id,,name\n1,2,3')).toThrow(/Header column 2 is empty/);
  });

  it('rejects duplicate header names', () => {
    expect(() => parseCSV('id,id\n1,2')).toThrow(/Duplicate header "id"/);
  });

  it('throws ParserError instances', () => {
    expect(() => parseCSV('"')).toThrow(ParserError);
  });
});

describe('parseCSVFile', () => {
  it('parses a valid file', async () => {
    await expect(parseCSVFile(fixture('valid.csv'))).resolves.toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });

  it('returns an empty array for an empty file', async () => {
    await expect(parseCSVFile(fixture('empty.csv'))).resolves.toEqual([]);
  });

  it('rejects a file with a missing field', async () => {
    await expect(parseCSVFile(fixture('missing-field.csv'))).rejects.toThrow(/Row 2 has 1 field/);
  });

  it('rejects a malformed file', async () => {
    await expect(parseCSVFile(fixture('malformed.csv'))).rejects.toThrow(/Unterminated quoted field/);
  });

  it('reports a missing file as a ParserError', async () => {
    await expect(parseCSVFile(fixture('does-not-exist.csv'))).rejects.toThrow(
      expect.objectContaining({ name: 'ParserError', message: expect.stringMatching(/Unable to read file/) }),
    );
  });

  describe('store data: cake orders.csv', () => {
    let orders: Record<string, string>[];
    beforeAll(async () => {
      orders = await parseCSVFile(dataFile('cake orders.csv'));
    });

    it('parses every order', () => {
      expect(orders).toHaveLength(263);
    });

    it('produces the expected columns for every row', () => {
      const columns = Object.keys(orders[0]);
      expect(columns).toHaveLength(17);
      expect(columns).toEqual(expect.arrayContaining(['id', 'Type', 'Flavor', 'Custom Message', 'Price', 'Quantity']));
      for (const order of orders) expect(Object.keys(order)).toEqual(columns);
    });

    it('parses the first order correctly', () => {
      expect(orders[0]).toMatchObject({
        id: '0',
        Type: 'Sponge',
        Flavor: 'Vanilla',
        'Custom Message': 'Happy Birthday',
        Price: '50',
        Quantity: '1',
      });
    });

    it('keeps empty quoted values', () => {
      expect(orders[2]['Custom Message']).toBe('');
    });
  });
});
