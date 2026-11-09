import { BookBuilder, BuilderValidationError, CakeBuilder, ToyBuilder } from '../src/builders';
import { Book, Cake, ItemCategory, Toy } from '../src/models';

/** Simulates untyped input (e.g. straight from a parsed file) reaching a typed setter. */
const bad = <T>(value: unknown): T => value as T;

const NON_STRINGS: unknown[] = [42, true, null, undefined, {}, []];
const NON_NUMBERS: unknown[] = ['20', true, null, undefined, {}, NaN, Infinity, -Infinity];
const NON_BOOLEANS: unknown[] = ['Yes', 'true', 1, 0, null, undefined];

const fullCake = () =>
  CakeBuilder.newBuilder()
    .setId('0')
    .setType('Sponge')
    .setFlavor('Vanilla')
    .setFilling('Cream')
    .setSize(20)
    .setLayers(2)
    .setFrostingType('Buttercream')
    .setFrostingFlavor('Vanilla')
    .setDecorationType('Sprinkles')
    .setDecorationColor('Multi-color')
    .setCustomMessage('Happy Birthday')
    .setShape('Round')
    .setAllergies('Nut-Free')
    .setSpecialIngredients('Organic Ingredients')
    .setPackagingType('Standard Box')
    .setPrice(50)
    .setQuantity(1);

const fullBook = () =>
  BookBuilder.newBuilder()
    .setId('2001')
    .setTitle('Edge of Eternity')
    .setAuthor('Dan Brown')
    .setGenre('Science Fiction')
    .setFormat('Paperback')
    .setLanguage('French')
    .setPublisher('Oxford Press')
    .setSpecialEdition('Signed Copy')
    .setPackaging('Eco-Friendly Packaging')
    .setPrice(12)
    .setQuantity(5);

const fullToy = () =>
  ToyBuilder.newBuilder()
    .setId('5001')
    .setType('Plush Toy')
    .setAgeGroup('13+')
    .setBrand('FunTime')
    .setMaterial('Fabric')
    .setBatteryRequired(true)
    .setEducational(false)
    .setPrice(247)
    .setQuantity(7);

describe('CakeBuilder', () => {
  it('builds a Cake with every property set', () => {
    const cake = fullCake().build();
    expect(cake).toBeInstanceOf(Cake);
    expect(cake.getCategory()).toBe(ItemCategory.CAKE);
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
  });

  it('every setter returns the same builder (fluent API)', () => {
    const builder = new CakeBuilder();
    expect(builder.setId('1')).toBe(builder);
    expect(builder.setFlavor('Lemon')).toBe(builder);
  });

  it('applies defaults to optional fields when they are not set', () => {
    const cake = CakeBuilder.newBuilder()
      .setId('1').setType('Chocolate').setFlavor('Chocolate').setFilling('Ganache')
      .setSize(25).setLayers(3).setFrostingType('Fondant').setFrostingFlavor('Chocolate')
      .setDecorationType('Fondant Figures').setDecorationColor('Red').setShape('Square')
      .setPackagingType('Luxury Box').setPrice(75).setQuantity(2)
      .build();
    expect(cake.getCustomMessage()).toBe('');
    expect(cake.getAllergies()).toBe('None');
    expect(cake.getSpecialIngredients()).toBe('None');
  });

  it('accepts an empty custom message', () => {
    expect(fullCake().setCustomMessage('').build().getCustomMessage()).toBe('');
  });

  it('uses the last value when a setter is called twice', () => {
    expect(fullCake().setFlavor('Lemon').build().getFlavor()).toBe('Lemon');
  });

  it('builds independent objects from the same builder', () => {
    const builder = fullCake();
    const first = builder.build();
    const second = builder.setPrice(99).build();
    expect(first).not.toBe(second);
    expect(first.getPrice()).toBe(50);
    expect(second.getPrice()).toBe(99);
  });

  describe('missing required fields', () => {
    it('lists every missing field when nothing is set', () => {
      expect(() => new CakeBuilder().build()).toThrow(
        'Cannot build Cake: missing required field(s): id, type, flavor, filling, size, layers, ' +
          'frostingType, frostingFlavor, decorationType, decorationColor, shape, packagingType, price, quantity',
      );
    });

    it('names only the fields that are still missing', () => {
      expect(() => new CakeBuilder().setId('1').setType('Sponge').setPrice(10).build()).toThrow(
        /missing required field\(s\): flavor, filling, size, layers,.*packagingType, quantity$/,
      );
    });

    it('throws a BuilderValidationError', () => {
      expect(() => new CakeBuilder().build()).toThrow(BuilderValidationError);
    });
  });

  describe('incorrect data types and invalid values', () => {
    it.each(NON_STRINGS)('rejects non-string flavor %p', (value) => {
      expect(() => new CakeBuilder().setFlavor(bad(value))).toThrow(/flavor must be a string/);
    });

    it.each(NON_STRINGS)('rejects non-string custom message %p', (value) => {
      expect(() => new CakeBuilder().setCustomMessage(bad(value))).toThrow(/customMessage must be a string/);
    });

    it.each(['', '   '])('rejects empty required string %p', (value) => {
      expect(() => new CakeBuilder().setType(value)).toThrow('type must not be empty');
    });

    it.each(NON_NUMBERS)('rejects non-numeric size %p', (value) => {
      expect(() => new CakeBuilder().setSize(bad(value))).toThrow(/size must be a finite number/);
    });

    it.each([0, -5])('rejects size %p that is not greater than 0', (value) => {
      expect(() => new CakeBuilder().setSize(value)).toThrow('size must be greater than 0');
    });

    it('accepts a fractional size', () => {
      expect(fullCake().setSize(12.5).build().getSize()).toBe(12.5);
    });

    it.each([1.5, 2.01])('rejects non-integer layers %p', (value) => {
      expect(() => new CakeBuilder().setLayers(value)).toThrow('layers must be a whole number');
    });

    it.each([0, -1, '3'])('rejects invalid layers %p', (value) => {
      expect(() => new CakeBuilder().setLayers(bad(value))).toThrow(BuilderValidationError);
    });

    it.each([0, -10, NaN, '50'])('rejects invalid price %p', (value) => {
      expect(() => new CakeBuilder().setPrice(bad(value))).toThrow(/price must/);
    });

    it.each([0, -1, 1.5, '2'])('rejects invalid quantity %p', (value) => {
      expect(() => new CakeBuilder().setQuantity(bad(value))).toThrow(/quantity must/);
    });

    it('does not keep a rejected value', () => {
      const builder = fullCake();
      expect(() => builder.setPrice(-1)).toThrow();
      expect(builder.build().getPrice()).toBe(50);
    });
  });
});

describe('BookBuilder', () => {
  it('builds a Book with every property set', () => {
    const book = fullBook().build();
    expect(book).toBeInstanceOf(Book);
    expect(book.getCategory()).toBe(ItemCategory.BOOK);
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
  });

  it('defaults specialEdition to "None" when not set', () => {
    const book = BookBuilder.newBuilder()
      .setId('2002').setTitle('Beneath the Stars').setAuthor('Dan Brown').setGenre('Thriller')
      .setFormat('Paperback').setLanguage('Spanish').setPublisher('Hachette Book Group')
      .setPackaging('Standard Wrap').setPrice(48).setQuantity(1)
      .build();
    expect(book.getSpecialEdition()).toBe('None');
  });

  it('lists every missing field when nothing is set', () => {
    expect(() => new BookBuilder().build()).toThrow(
      'Cannot build Book: missing required field(s): id, title, author, genre, format, language, ' +
        'publisher, packaging, price, quantity',
    );
  });

  it('reports a single missing field', () => {
    const builder = new BookBuilder()
      .setId('1').setTitle('T').setAuthor('A').setGenre('G').setFormat('F')
      .setLanguage('L').setPublisher('P').setPackaging('Box').setPrice(1);
    expect(() => builder.build()).toThrow('Cannot build Book: missing required field(s): quantity');
  });

  it.each(NON_STRINGS)('rejects non-string title %p', (value) => {
    expect(() => new BookBuilder().setTitle(bad(value))).toThrow(/title must be a string/);
  });

  it.each([
    ['id', (b: BookBuilder) => b.setId('')],
    ['author', (b: BookBuilder) => b.setAuthor(' ')],
    ['genre', (b: BookBuilder) => b.setGenre('')],
    ['format', (b: BookBuilder) => b.setFormat('')],
    ['language', (b: BookBuilder) => b.setLanguage('')],
    ['publisher', (b: BookBuilder) => b.setPublisher('')],
    ['specialEdition', (b: BookBuilder) => b.setSpecialEdition('')],
    ['packaging', (b: BookBuilder) => b.setPackaging('')],
  ])('rejects empty %s', (field, set) => {
    expect(() => set(new BookBuilder())).toThrow(`${field} must not be empty`);
  });

  it.each(NON_NUMBERS)('rejects non-numeric price %p', (value) => {
    expect(() => new BookBuilder().setPrice(bad(value))).toThrow(/price must be a finite number/);
  });

  it.each([0, -3, 2.5])('rejects invalid quantity %p', (value) => {
    expect(() => new BookBuilder().setQuantity(value)).toThrow(BuilderValidationError);
  });
});

describe('ToyBuilder', () => {
  it('builds a Toy with every property set', () => {
    const toy = fullToy().build();
    expect(toy).toBeInstanceOf(Toy);
    expect(toy.getCategory()).toBe(ItemCategory.TOY);
    expect(toy.getId()).toBe('5001');
    expect(toy.getType()).toBe('Plush Toy');
    expect(toy.getAgeGroup()).toBe('13+');
    expect(toy.getBrand()).toBe('FunTime');
    expect(toy.getMaterial()).toBe('Fabric');
    expect(toy.isBatteryRequired()).toBe(true);
    expect(toy.isEducational()).toBe(false);
    expect(toy.getPrice()).toBe(247);
    expect(toy.getQuantity()).toBe(7);
  });

  it('lists every missing field when nothing is set', () => {
    expect(() => new ToyBuilder().build()).toThrow(
      'Cannot build Toy: missing required field(s): id, type, ageGroup, brand, material, ' +
        'batteryRequired, educational, price, quantity',
    );
  });

  it('treats false as a set value, not a missing one', () => {
    const toy = fullToy().setBatteryRequired(false).setEducational(false).build();
    expect(toy.isBatteryRequired()).toBe(false);
    expect(toy.isEducational()).toBe(false);
  });

  it.each(NON_BOOLEANS)('rejects non-boolean batteryRequired %p', (value) => {
    expect(() => new ToyBuilder().setBatteryRequired(bad(value))).toThrow(/batteryRequired must be a boolean/);
  });

  it.each(NON_BOOLEANS)('rejects non-boolean educational %p', (value) => {
    expect(() => new ToyBuilder().setEducational(bad(value))).toThrow(/educational must be a boolean/);
  });

  it.each([
    ['id', (b: ToyBuilder) => b.setId('')],
    ['type', (b: ToyBuilder) => b.setType('')],
    ['ageGroup', (b: ToyBuilder) => b.setAgeGroup('')],
    ['brand', (b: ToyBuilder) => b.setBrand(' ')],
    ['material', (b: ToyBuilder) => b.setMaterial('')],
  ])('rejects empty %s', (field, set) => {
    expect(() => set(new ToyBuilder())).toThrow(`${field} must not be empty`);
  });

  it.each([0, -1, '10', null])('rejects invalid price %p', (value) => {
    expect(() => new ToyBuilder().setPrice(bad(value))).toThrow(BuilderValidationError);
  });

  it.each([0, 1.2, '7'])('rejects invalid quantity %p', (value) => {
    expect(() => new ToyBuilder().setQuantity(bad(value))).toThrow(BuilderValidationError);
  });
});

describe('BuilderValidationError', () => {
  it('has a descriptive name and describes arrays and null clearly', () => {
    try {
      new ToyBuilder().setBrand(bad([]));
    } catch (e) {
      expect(e).toBeInstanceOf(BuilderValidationError);
      expect((e as Error).name).toBe('BuilderValidationError');
      expect((e as Error).message).toBe('brand must be a string, got array');
    }
    expect(() => new ToyBuilder().setBrand(bad(null))).toThrow('brand must be a string, got null');
    expect.assertions(4);
  });
});
