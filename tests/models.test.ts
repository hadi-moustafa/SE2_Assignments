import { Book, Cake, ItemCategory, Toy } from '../src/models';

describe('Cake', () => {
  const cake = new Cake(
    '0', 'Sponge', 'Vanilla', 'Cream', 20, 2, 'Buttercream', 'Vanilla',
    'Sprinkles', 'Multi-color', 'Happy Birthday', 'Round', 'Nut-Free',
    'Organic Ingredients', 'Standard Box', 50, 1,
  );

  it('exposes every property through a getter', () => {
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
});

describe('Book', () => {
  const book = new Book(
    '2001', 'Edge of Eternity', 'Dan Brown', 'Science Fiction', 'Paperback',
    'French', 'Oxford Press', 'Signed Copy', 'Eco-Friendly Packaging', 12, 5,
  );

  it('exposes every property through a getter', () => {
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
});

describe('Toy', () => {
  const toy = new Toy('5001', 'Plush Toy', '13+', 'FunTime', 'Fabric', true, false, 247, 7);

  it('exposes every property through a getter', () => {
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
});

describe('encapsulation', () => {
  it('does not expose setters', () => {
    const toy = new Toy('1', 'Doll', '4-7', 'Brand', 'Plastic', false, true, 10, 1);
    const methods = Object.getOwnPropertyNames(Toy.prototype);
    expect(methods.some((m) => m.startsWith('set'))).toBe(false);
    expect(toy.getPrice()).toBe(10);
  });
});
