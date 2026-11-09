import path from 'node:path';
import { parseJSON, parseJSONFile, parseJSONRecords, parseJSONRecordsFile } from '../src/parsers/jsonParser';
import { ParserError } from '../src/parsers/ParserError';

const fixture = (name: string) => path.join(__dirname, 'fixtures', name);
const dataFile = (name: string) => path.join(__dirname, '..', 'src', 'data', name);

describe('parseJSON', () => {
  it('parses every JSON data type', () => {
    const input = JSON.stringify({
      text: 'hello',
      integer: 42,
      negative: -7,
      float: 3.14,
      exponent: 1e3,
      yes: true,
      no: false,
      nothing: null,
      list: [1, 'two', false, null, [3]],
      nested: { deep: { deeper: 'value' } },
    });
    const result = parseJSON<Record<string, unknown>>(input);
    expect(result).toEqual({
      text: 'hello',
      integer: 42,
      negative: -7,
      float: 3.14,
      exponent: 1000,
      yes: true,
      no: false,
      nothing: null,
      list: [1, 'two', false, null, [3]],
      nested: { deep: { deeper: 'value' } },
    });
    expect(typeof result.integer).toBe('number');
    expect(typeof result.yes).toBe('boolean');
    expect(Array.isArray(result.list)).toBe(true);
  });

  it.each([
    ['"text"', 'text'],
    ['12', 12],
    ['true', true],
    ['null', null],
    ['[]', []],
    ['{}', {}],
  ])('parses top-level value %s', (input, expected) => {
    expect(parseJSON(input)).toEqual(expected);
  });

  it('decodes escapes and unicode', () => {
    expect(parseJSON('"line\\nbreak \\"quoted\\" \\u00e9"')).toBe('line\nbreak "quoted" é');
  });

  it('strips a byte order mark and surrounding whitespace', () => {
    expect(parseJSON('\uFEFF  \n {"a": 1} \n')).toEqual({ a: 1 });
  });

  describe('errors', () => {
    it.each([[''], ['   '], ['\n\t']])('rejects empty input %j', (input) => {
      expect(() => parseJSON(input)).toThrow(/\[JSON\] Input is empty/);
    });

    it('reports the line and column of a syntax error', () => {
      expect(() => parseJSON('{\n  "a": 1,\n  "b": }')).toThrow(
        expect.objectContaining({ name: 'ParserError', format: 'JSON', line: 3, column: 8 }),
      );
    });

    it('reports truncated input at its end', () => {
      expect(() => parseJSON('[1, 2')).toThrow(expect.objectContaining({ line: 1, column: 6 }));
    });

    it.each([
      ['a trailing comma in an array', '[1, 2,]', /Unexpected character "\]", expected a value/],
      ['a trailing comma in an object', '{"a": 1,}', /Expected a double-quoted property name/],
      ['single quotes', "{'a': 1}", /Expected a double-quoted property name/],
      ['an unquoted key', '{a: 1}', /Expected a double-quoted property name/],
      ['a missing colon', '{"a" 1}', /Expected ":" after property name "a"/],
      ['a missing comma in an object', '{"a": 1 "b": 2}', /Expected "," or "}" in object/],
      ['a missing comma in an array', '[1 2]', /Expected "," or "\]" in array/],
      ['a comment', '{"a": 1 // c\n}', /Expected "," or "}" in object but found character "\/"/],
      ['NaN', 'NaN', /Unexpected character "N", expected a value/],
      ['a misspelled literal', 'tru', /Unexpected character "t", expected a value/],
      ['two values', '{} {}', /Unexpected character "{" after the JSON value/],
      ['an unterminated string', '{"a": "abc', /Unterminated string \(line 1, column 7\)/],
      ['a raw newline in a string', '"a\nb"', /Control characters must be escaped/],
      ['an invalid escape', '"\\x"', /Invalid escape sequence "\\x"/],
      ['a trailing backslash', '"\\', /Invalid escape sequence "\\"/],
      ['a short unicode escape', '"\\u12"', /Invalid unicode escape/],
      ['a leading zero', '01', /Invalid number/],
      ['a leading plus', '+1', /expected a value/],
      ['a bare minus', '-', /Invalid number/],
      ['a trailing decimal point', '1.', /Invalid number/],
      ['an incomplete exponent', '1e', /Invalid number/],
      ['a truncated object', '{"a": ', /Unexpected end of input, expected a value/],
    ])('rejects %s', (_label, input, message) => {
      expect(() => parseJSON(input)).toThrow(ParserError);
      expect(() => parseJSON(input)).toThrow(message);
    });

    it('treats "__proto__" as an ordinary key', () => {
      const result = parseJSON<Record<string, unknown>>('{"__proto__": {"polluted": true}}');
      expect(Object.keys(result)).toEqual(['__proto__']);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    });

    it('parses large nested documents', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({ id: i, ok: i % 2 === 0, tags: [`t${i}`], meta: { score: i / 10 } }));
      expect(parseJSON(JSON.stringify(data, null, 2))).toEqual(data);
    });
  });
});

describe('parseJSONRecords', () => {
  it('returns an array of record objects', () => {
    expect(parseJSONRecords('[{"id": "1"}, {"id": "2", "tags": ["x"]}]')).toEqual([{ id: '1' }, { id: '2', tags: ['x'] }]);
  });

  it('accepts an empty array', () => {
    expect(parseJSONRecords('[]')).toEqual([]);
  });

  it.each([
    ['an object', '{"id": 1}', /found a object/],
    ['a string', '"x"', /found a string/],
    ['null', 'null', /found null/],
  ])('rejects %s at the top level', (_label, input, message) => {
    expect(() => parseJSONRecords(input)).toThrow(message);
  });

  it.each([
    ['a number', '[{"id": 1}, 2]', /index 1 must be an object but found a number/],
    ['null', '[null]', /index 0 must be an object but found null/],
    ['an array', '[[1]]', /index 0 must be an object but found an array/],
  ])('rejects records that are %s', (_label, input, message) => {
    expect(() => parseJSONRecords(input)).toThrow(message);
  });
});

describe('file parsing', () => {
  it('parses a valid file with mixed data types', async () => {
    await expect(parseJSONFile(fixture('valid.json'))).resolves.toEqual([
      { id: 1, name: 'Pen', inStock: true, tags: ['a', 'b'], price: 1.5, discount: null },
    ]);
  });

  it('rejects an empty file', async () => {
    await expect(parseJSONFile(fixture('empty.json'))).rejects.toThrow(/Input is empty/);
  });

  it('rejects a malformed file', async () => {
    await expect(parseJSONFile(fixture('malformed.json'))).rejects.toThrow(/Expected a double-quoted property name.*line 1, column 10/);
  });

  it('rejects a record file whose top level is not an array', async () => {
    await expect(parseJSONRecordsFile(fixture('not-array.json'))).rejects.toThrow(/Expected a top-level array/);
  });

  it('reports a missing file as a ParserError', async () => {
    await expect(parseJSONFile(fixture('nope.json'))).rejects.toThrow(/\[JSON\] Unable to read file/);
  });

  describe('store data: book orders.json', () => {
    let orders: Record<string, unknown>[];
    beforeAll(async () => {
      orders = await parseJSONRecordsFile(dataFile('book orders.json'));
    });

    it('parses every order', () => {
      expect(orders).toHaveLength(350);
    });

    it('gives every order the same fields', () => {
      const fields = ['Order ID', 'Book Title', 'Author', 'Genre', 'Format', 'Language', 'Publisher', 'Special Edition', 'Packaging', 'Price', 'Quantity'];
      for (const order of orders) expect(Object.keys(order)).toEqual(fields);
    });

    it('parses the first order correctly', () => {
      expect(orders[0]).toEqual({
        'Order ID': '2001',
        'Book Title': 'Edge of Eternity',
        Author: 'Dan Brown',
        Genre: 'Science Fiction',
        Format: 'Paperback',
        Language: 'French',
        Publisher: 'Oxford Press',
        'Special Edition': 'Signed Copy',
        Packaging: 'Eco-Friendly Packaging',
        Price: '12',
        Quantity: '5',
      });
    });
  });
});
