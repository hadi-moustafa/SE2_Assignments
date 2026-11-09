import { join } from 'node:path';
import { BuilderValidationError } from '../src/builders';
import {
  BookMapper,
  CakeMapper,
  MappingError,
  normalizeKey,
  RecordReader,
  ToyMapper,
} from '../src/mappers';
import { Book, Cake, Toy } from '../src/models';
import { ParserError, UnsupportedFormatError } from '../src/parsers';

const DATA = join(__dirname, '..', 'src', 'data');
const FIXTURES = join(__dirname, 'fixtures');

const cakes = new CakeMapper();
const books = new BookMapper();
const toys = new ToyMapper();

/** Asserts the thrown error is a MappingError with the expected message. */
function expectMappingError(fn: () => unknown, message: string | RegExp): MappingError {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(MappingError);
  expect((caught as Error).message).toMatch(message);
  return caught as MappingError;
}

// ---------------------------------------------------------------------------------------------
// Shared fixtures: the same cake / book / toy written in every format and key style.
// ---------------------------------------------------------------------------------------------

const CAKE_HEADER =
  '"id","Type","Flavor","Filling","Size","Layers","Frosting Type","Frosting Flavor","Decoration Type",' +
  '"Decoration Color","Custom Message","Shape","Allergies","Special Ingredients","Packaging Type","Price","Quantity"';
const CAKE_ROW =
  '"0","Sponge","Vanilla","Cream","20","2","Buttercream","Vanilla","Sprinkles","Multi-color","Happy Birthday",' +
  '"Round","Nut-Free","Organic Ingredients","Standard Box","50","1"';
const CAKE_RECORD = {
  id: '0', Type: 'Sponge', Flavor: 'Vanilla', Filling: 'Cream', Size: '20', Layers: '2',
  'Frosting Type': 'Buttercream', 'Frosting Flavor': 'Vanilla', 'Decoration Type': 'Sprinkles',
  'Decoration Color': 'Multi-color', 'Custom Message': 'Happy Birthday', Shape: 'Round',
  Allergies: 'Nut-Free', 'Special Ingredients': 'Organic Ingredients', 'Packaging Type': 'Standard Box',
  Price: '50', Quantity: '1',
};

const BOOK_RECORD = {
  'Order ID': '2001', 'Book Title': 'Edge of Eternity', Author: 'Dan Brown', Genre: 'Science Fiction',
  Format: 'Paperback', Language: 'French', Publisher: 'Oxford Press', 'Special Edition': 'Signed Copy',
  Packaging: 'Eco-Friendly Packaging', Price: '12', Quantity: '5',
};

const TOY_XML_ROW =
  '<row><OrderID>5001</OrderID><Type>Plush Toy</Type><AgeGroup>13+</AgeGroup><Brand>FunTime</Brand>' +
  '<Material>Fabric</Material><BatteryRequired>Yes</BatteryRequired><Educational>No</Educational>' +
  '<Price>247</Price><Quantity>7</Quantity></row>';
const TOY_RECORD = {
  OrderID: '5001', Type: 'Plush Toy', AgeGroup: '13+', Brand: 'FunTime', Material: 'Fabric',
  BatteryRequired: 'Yes', Educational: 'No', Price: '247', Quantity: '7',
};

const without = <T extends object>(record: T, ...keys: (keyof T)[]): Partial<T> => {
  const copy = { ...record };
  keys.forEach((k) => delete copy[k]);
  return copy;
};

/** Converts a flat record into `<data><row>...</row></data>` XML. */
const toXML = (...records: Record<string, string>[]) =>
  '<?xml version="1.0"?><data>' +
  records
    .map((r) => '<row>' + Object.entries(r).map(([k, v]) => `<${k.replace(/ /g, '')}>${v}</${k.replace(/ /g, '')}>`).join('') + '</row>')
    .join('') +
  '</data>';

const toCSV = (...records: Record<string, string>[]) =>
  [Object.keys(records[0]).join(','), ...records.map((r) => Object.values(r).map((v) => `"${v}"`).join(','))].join('\n');

const expectFirstCake = (cake: Cake) => {
  expect(cake).toBeInstanceOf(Cake);
  expect(cake.getId()).toBe('0');
  expect(cake.getType()).toBe('Sponge');
  expect(cake.getFlavor()).toBe('Vanilla');
  expect(cake.getFilling()).toBe('Cream');
  expect(cake.getSize()).toBe(20);
  expect(cake.getLayers()).toBe(2);
  expect(cake.getFrostingType()).toBe('Buttercream');
  expect(cake.getFrostingFlavor()).toBe('Vanilla');
  expect(cake.getDecorationType()).toBe('Sprinkles');
  expect(cake.getDecorationColor()).toBe('Multi-color');
  expect(cake.getCustomMessage()).toBe('Happy Birthday');
  expect(cake.getShape()).toBe('Round');
  expect(cake.getAllergies()).toBe('Nut-Free');
  expect(cake.getSpecialIngredients()).toBe('Organic Ingredients');
  expect(cake.getPackagingType()).toBe('Standard Box');
  expect(cake.getPrice()).toBe(50);
  expect(cake.getQuantity()).toBe(1);
};

const expectFirstBook = (book: Book) => {
  expect(book).toBeInstanceOf(Book);
  expect(book.getId()).toBe('2001');
  expect(book.getTitle()).toBe('Edge of Eternity');
  expect(book.getAuthor()).toBe('Dan Brown');
  expect(book.getGenre()).toBe('Science Fiction');
  expect(book.getFormat()).toBe('Paperback');
  expect(book.getLanguage()).toBe('French');
  expect(book.getPublisher()).toBe('Oxford Press');
  expect(book.getSpecialEdition()).toBe('Signed Copy');
  expect(book.getPackaging()).toBe('Eco-Friendly Packaging');
  expect(book.getPrice()).toBe(12);
  expect(book.getQuantity()).toBe(5);
};

const expectFirstToy = (toy: Toy) => {
  expect(toy).toBeInstanceOf(Toy);
  expect(toy.getId()).toBe('5001');
  expect(toy.getType()).toBe('Plush Toy');
  expect(toy.getAgeGroup()).toBe('13+');
  expect(toy.getBrand()).toBe('FunTime');
  expect(toy.getMaterial()).toBe('Fabric');
  expect(toy.isBatteryRequired()).toBe(true);
  expect(toy.isEducational()).toBe(false);
  expect(toy.getPrice()).toBe(247);
  expect(toy.getQuantity()).toBe(7);
};

// ---------------------------------------------------------------------------------------------

describe('normalizeKey', () => {
  it.each([
    ['Frosting Type', 'frostingtype'],
    ['frostingType', 'frostingtype'],
    ['FrostingType', 'frostingtype'],
    ['frosting_type', 'frostingtype'],
    ['Order ID', 'orderid'],
    ['OrderID', 'orderid'],
  ])('%s -> %s', (key, expected) => {
    expect(normalizeKey(key)).toBe(expected);
  });
});

describe('RecordReader', () => {
  it.each([null, undefined, 'text', 42, [], [{ id: 1 }]])('rejects a non-object record %p', (record) => {
    expect(() => new RecordReader('Cake', record)).toThrow(/\[Cake mapper\] Expected a record object/);
  });

  it('returns undefined for absent, null and undefined fields', () => {
    const r = new RecordReader('Toy', { a: null, b: undefined });
    expect(r.readText('a')).toBeUndefined();
    expect(r.readNumber('b')).toBeUndefined();
    expect(r.readBoolean('c')).toBeUndefined();
  });

  it('falls back to the next alias when the first is absent', () => {
    expect(new RecordReader('Book', { Title: 'X' }).readText('Book Title', 'Title')).toBe('X');
  });

  it('uses the first key when two keys normalise to the same name', () => {
    expect(new RecordReader('Book', { Price: '1', price: '2' }).readNumber('price')).toBe(1);
  });

  it('trims text and accepts numbers as text', () => {
    const r = new RecordReader('Book', { a: '  hi  ', b: 2001 });
    expect(r.readText('a')).toBe('hi');
    expect(r.readText('b')).toBe('2001');
  });

  it.each([true, {}, ['x'], NaN, Infinity])('rejects non-text value %p', (value) => {
    expect(() => new RecordReader('Book', { Author: value }).readText('Author')).toThrow(/Field "Author" must be text/);
  });

  it('treats blank optional text as absent', () => {
    const r = new RecordReader('Book', { a: '   ', b: 'x' });
    expect(r.readOptionalText('a')).toBeUndefined();
    expect(r.readOptionalText('b')).toBe('x');
  });

  it.each([
    ['12', 12],
    [' 12.5 ', 12.5],
    ['-3', -3],
    ['.5', 0.5],
    ['1e3', 1000],
    [7, 7],
  ])('reads number %p as %p', (value, expected) => {
    expect(new RecordReader('Cake', { Price: value }).readNumber('Price')).toBe(expected);
  });

  it.each(['', ' ', 'abc', '12abc', '1,000', '$5', '0x10', true, {}, []])('rejects non-numeric %p', (value) => {
    expect(() => new RecordReader('Cake', { Price: value }).readNumber('Price')).toThrow(/Field "Price" must be a number/);
  });

  it.each([
    ['Yes', true], ['yes', true], [' YES ', true], ['true', true], ['Y', true], ['1', true], [true, true],
    ['No', false], ['no', false], ['false', false], ['N', false], ['0', false], [false, false],
  ])('reads boolean %p as %p', (value, expected) => {
    expect(new RecordReader('Toy', { Educational: value }).readBoolean('Educational')).toBe(expected);
  });

  it.each(['', 'maybe', 'yess', 1, 0, {}])('rejects non-boolean %p', (value) => {
    expect(() => new RecordReader('Toy', { Educational: value }).readBoolean('Educational')).toThrow(
      /Field "Educational" must be yes\/no/,
    );
  });

  it('describes the bad value in the message', () => {
    expect(() => new RecordReader('Toy', { Price: 'abc' }).readNumber('Price')).toThrow(
      '[Toy mapper] Field "Price" must be a number, got "abc"',
    );
    expect(() => new RecordReader('Toy', { Price: [] }).readNumber('Price')).toThrow('got array');
  });
});

// ---------------------------------------------------------------------------------------------

describe('CakeMapper', () => {
  describe('formats', () => {
    it('maps CSV', () => {
      const result = cakes.fromCSV(`${CAKE_HEADER}\n${CAKE_ROW}\n`);
      expect(result).toHaveLength(1);
      expectFirstCake(result[0]);
    });

    it('maps JSON (camelCase keys and native numbers)', () => {
      const json = JSON.stringify([{
        id: 0, type: 'Sponge', flavor: 'Vanilla', filling: 'Cream', size: 20, layers: 2,
        frostingType: 'Buttercream', frostingFlavor: 'Vanilla', decorationType: 'Sprinkles',
        decorationColor: 'Multi-color', customMessage: 'Happy Birthday', shape: 'Round',
        allergies: 'Nut-Free', specialIngredients: 'Organic Ingredients', packagingType: 'Standard Box',
        price: 50, quantity: 1,
      }]);
      expectFirstCake(cakes.fromJSON(json)[0]);
    });

    it('maps XML (PascalCase tags)', () => {
      expectFirstCake(cakes.fromXML(toXML(CAKE_RECORD))[0]);
    });

    it('maps a record object directly', () => {
      expectFirstCake(cakes.map(CAKE_RECORD));
    });

    it('maps the real cake orders.csv data file', async () => {
      const result = await cakes.fromFile(join(DATA, 'cake orders.csv'));
      expect(result).toHaveLength(263);
      expect(result.every((c) => c instanceof Cake)).toBe(true);
      expectFirstCake(result[0]);
    });
  });

  describe('optional fields', () => {
    it('uses builder defaults when optional fields are absent', () => {
      const cake = cakes.map(without(CAKE_RECORD, 'Custom Message', 'Allergies', 'Special Ingredients'));
      expect(cake.getCustomMessage()).toBe('');
      expect(cake.getAllergies()).toBe('None');
      expect(cake.getSpecialIngredients()).toBe('None');
    });

    it('treats blank allergies / special ingredients as not given', () => {
      const cake = cakes.map({ ...CAKE_RECORD, Allergies: '', 'Special Ingredients': ' ' });
      expect(cake.getAllergies()).toBe('None');
      expect(cake.getSpecialIngredients()).toBe('None');
    });

    it('keeps an empty custom message from CSV', () => {
      const row = CAKE_ROW.replace('"Happy Birthday"', '""');
      expect(cakes.fromCSV(`${CAKE_HEADER}\n${row}`)[0].getCustomMessage()).toBe('');
    });
  });

  describe('missing fields', () => {
    it('reports the missing required field', () => {
      expectMappingError(
        () => cakes.map(without(CAKE_RECORD, 'Flavor')),
        '[Cake mapper] Cannot build Cake: missing required field(s): flavor',
      );
    });

    it('reports every missing required field at once', () => {
      expectMappingError(() => cakes.map({}), /missing required field\(s\): id, type, flavor, .*price, quantity$/);
    });

    it('rejects a required field that is present but empty', () => {
      expectMappingError(() => cakes.map({ ...CAKE_RECORD, Shape: '' }), 'shape must not be empty');
    });

    it('rejects a CSV row that is missing a column', () => {
      expect(() => cakes.fromCSV(`${CAKE_HEADER}\n"0","Sponge"`)).toThrow(ParserError);
    });

    it('keeps the builder error as the cause', () => {
      const error = expectMappingError(() => cakes.map({}), /missing/);
      expect(error.cause).toBeInstanceOf(BuilderValidationError);
      expect(error.model).toBe('Cake');
    });
  });

  describe('incorrect data types', () => {
    it.each([
      ['Size', 'large', /Field "Size" must be a number, got "large"/],
      ['Layers', 'two', /Field "Layers" must be a number/],
      ['Price', '', /Field "Price" must be a number, got ""/],
      ['Quantity', 'many', /Field "Quantity" must be a number/],
      ['Flavor', true, /Field "Flavor" must be text, got boolean/],
    ])('rejects %s = %p', (field, value, message) => {
      expectMappingError(() => cakes.map({ ...CAKE_RECORD, [field]: value }), message);
    });

    it.each([
      ['Size', '-5', 'size must be greater than 0'],
      ['Layers', '1.5', 'layers must be a whole number'],
      ['Price', '0', 'price must be greater than 0'],
      ['Quantity', '2.5', 'quantity must be a whole number'],
    ])('rejects out-of-range %s = %p (from the builder)', (field, value, message) => {
      expectMappingError(() => cakes.map({ ...CAKE_RECORD, [field]: value }), message);
    });

    it('rejects a nested XML element where text is expected', () => {
      const xml = toXML(CAKE_RECORD).replace('<Flavor>Vanilla</Flavor>', '<Flavor><Main>Vanilla</Main></Flavor>');
      expect(() => cakes.fromXML(xml)).toThrow(/Field "Flavor" must be text, got object/);
    });
  });
});

// ---------------------------------------------------------------------------------------------

describe('BookMapper', () => {
  describe('formats', () => {
    it('maps JSON', () => {
      expectFirstBook(books.fromJSON(JSON.stringify([BOOK_RECORD]))[0]);
    });

    it('maps JSON with native numbers', () => {
      const book = books.fromJSON(JSON.stringify([{ ...BOOK_RECORD, 'Order ID': 2001, Price: 12, Quantity: 5 }]))[0];
      expectFirstBook(book);
    });

    it('maps CSV', () => {
      expectFirstBook(books.fromCSV(toCSV(BOOK_RECORD))[0]);
    });

    it('maps XML', () => {
      expectFirstBook(books.fromXML(toXML(BOOK_RECORD))[0]);
    });

    it('accepts "Title" and "id" as alternative field names', () => {
      const record = { ...without(BOOK_RECORD, 'Book Title', 'Order ID'), Title: 'Edge of Eternity', id: '2001' };
      expectFirstBook(books.map(record));
    });

    it('maps the real book orders.json data file', async () => {
      const result = await books.fromFile(join(DATA, 'book orders.json'));
      expect(result).toHaveLength(350);
      expectFirstBook(result[0]);
    });
  });

  it('defaults Special Edition to "None" when blank or absent', () => {
    expect(books.map(without(BOOK_RECORD, 'Special Edition')).getSpecialEdition()).toBe('None');
    expect(books.map({ ...BOOK_RECORD, 'Special Edition': '' }).getSpecialEdition()).toBe('None');
  });

  it('reports missing required fields', () => {
    expectMappingError(
      () => books.map(without(BOOK_RECORD, 'Author', 'Price')),
      'Cannot build Book: missing required field(s): author, price',
    );
  });

  it('treats a null JSON value as missing', () => {
    expectMappingError(() => books.map({ ...BOOK_RECORD, Genre: null }), 'missing required field(s): genre');
  });

  it.each([
    ['Price', 'twelve', /Field "Price" must be a number/],
    ['Price', true, /Field "Price" must be a number, got boolean/],
    ['Quantity', null, /missing required field\(s\): quantity/],
    ['Quantity', '-1', /quantity must be greater than 0/],
    ['Author', ['Dan Brown'], /Field "Author" must be text, got array/],
    ['Book Title', { en: 'x' }, /Field "Book Title" must be text, got object/],
  ])('rejects %s = %p', (field, value, message) => {
    expectMappingError(() => books.map({ ...BOOK_RECORD, [field]: value }), message);
  });

  it('rejects JSON that is not an array of records', () => {
    expect(() => books.fromJSON(JSON.stringify(BOOK_RECORD))).toThrow(/Expected a top-level array/);
    expect(() => books.fromJSON('[1, 2]')).toThrow(/Record at index 0 must be an object/);
  });
});

// ---------------------------------------------------------------------------------------------

describe('ToyMapper', () => {
  describe('formats', () => {
    it('maps XML', () => {
      const result = toys.fromXML(`<?xml version="1.0"?><data>${TOY_XML_ROW}</data>`);
      expect(result).toHaveLength(1);
      expectFirstToy(result[0]);
    });

    it('maps XML with a custom record tag', () => {
      const xml = `<toys>${TOY_XML_ROW.replace(/<(\/?)row>/g, '<$1toy>')}</toys>`;
      expectFirstToy(toys.fromXML(xml, 'toy')[0]);
    });

    it('maps JSON with native booleans', () => {
      const json = JSON.stringify([{ ...TOY_RECORD, BatteryRequired: true, Educational: false }]);
      expectFirstToy(toys.fromJSON(json)[0]);
    });

    it('maps CSV with spaced headers', () => {
      const csv =
        'Order ID,Type,Age Group,Brand,Material,Battery Required,Educational,Price,Quantity\n' +
        '5001,Plush Toy,13+,FunTime,Fabric,Yes,No,247,7';
      expectFirstToy(toys.fromCSV(csv)[0]);
    });

    it('maps the real toy orders.xml data file', async () => {
      const result = await toys.fromFile(join(DATA, 'toy orders.xml'));
      expect(result).toHaveLength(250);
      expect(result[0].getId()).toBe('5001');
      expect(result[0].isBatteryRequired()).toBe(true);
    });
  });

  it('reports missing required fields', () => {
    expectMappingError(
      () => toys.map(without(TOY_RECORD, 'BatteryRequired', 'Educational')),
      'Cannot build Toy: missing required field(s): batteryRequired, educational',
    );
  });

  it('reports a field missing from one XML row', () => {
    const xml = `<data>${TOY_XML_ROW}${TOY_XML_ROW.replace('<Brand>FunTime</Brand>', '')}</data>`;
    expect(() => toys.fromXML(xml)).toThrow('[Toy mapper] record 1: Cannot build Toy: missing required field(s): brand');
  });

  it('treats an empty XML record as missing everything', () => {
    expect(() => toys.fromXML('<data><row/></data>')).toThrow(/record 0: .*missing required field\(s\): id, type/);
  });

  it.each([
    ['BatteryRequired', 'Sometimes', /Field "BatteryRequired" must be yes\/no, got "Sometimes"/],
    ['Educational', '', /Field "Educational" must be yes\/no/],
    ['Price', 'free', /Field "Price" must be a number/],
    ['Quantity', '0', /quantity must be greater than 0/],
    ['Brand', '   ', /brand must not be empty/],
  ])('rejects %s = %p', (field, value, message) => {
    expectMappingError(() => toys.map({ ...TOY_RECORD, [field]: value }), message);
  });

  it('returns an empty list for a document with no records', () => {
    expect(toys.fromXML('<data></data>')).toEqual([]);
    expect(toys.fromJSON('[]')).toEqual([]);
    expect(toys.fromCSV('')).toEqual([]);
    expect(toys.fromCSV('OrderID,Type\n')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------

describe('RecordMapper (shared behaviour)', () => {
  it('mapAll reports which record failed', () => {
    const good = CAKE_RECORD;
    const bad = { ...CAKE_RECORD, Price: 'abc' };
    const error = expectMappingError(
      () => cakes.mapAll([good, good, bad]),
      '[Cake mapper] record 2: Field "Price" must be a number, got "abc"',
    );
    expect(error.recordIndex).toBe(2);
  });

  it('mapAll rejects a non-object entry with its index', () => {
    expect(() => toys.mapAll([TOY_RECORD, 'oops'])).toThrow('[Toy mapper] record 1: Expected a record object but got "oops"');
  });

  it('lets unexpected errors through unchanged', () => {
    const boom = new Error('boom');
    const record = new Proxy({}, { ownKeys: () => { throw boom; } });
    expect(() => cakes.map(record)).toThrow(boom);
    expect(() => cakes.mapAll([record])).toThrow(boom);
  });

  describe('malformed input', () => {
    it.each([
      ['CSV', () => cakes.fromCSV('id,name\n1,"never closed')],
      ['JSON', () => books.fromJSON('[{"id":1,}]')],
      ['XML', () => toys.fromXML('<data><row><id>1</id></row>')],
      ['XML with mismatched tags', () => toys.fromXML('<data><row></wor></data>')],
      ['empty JSON', () => books.fromJSON('')],
      ['empty XML', () => toys.fromXML('')],
    ])('throws a ParserError for %s', (_label, run) => {
      expect(run).toThrow(ParserError);
    });

    it.each([
      ['malformed.csv', cakes],
      ['malformed.json', books],
      ['malformed.xml', toys],
    ] as const)('fromFile rejects %s with a ParserError', async (file, mapper) => {
      await expect(mapper.fromFile(join(FIXTURES, file))).rejects.toThrow(ParserError);
    });

    it('fromFile rejects a missing file', async () => {
      await expect(cakes.fromFile(join(FIXTURES, 'nope.csv'))).rejects.toThrow(ParserError);
    });

    it('fromFile rejects an unsupported file type', async () => {
      await expect(toys.fromFile(join(FIXTURES, 'notes.txt'))).rejects.toThrow(UnsupportedFormatError);
    });

    it('fromFile maps a parsable file whose records do not fit the model', async () => {
      await expect(toys.fromFile(join(FIXTURES, 'valid.xml'))).rejects.toThrow(
        /\[Toy mapper\] record 0: Cannot build Toy: missing required field\(s\): type, ageGroup/,
      );
    });
  });
});
