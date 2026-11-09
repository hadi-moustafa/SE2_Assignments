import { Item, ItemCategory } from './Item';

/** A book order, as described by an entry of `book orders.json`. */
export class Book implements Item {
  constructor(
    private readonly id: string,
    private readonly title: string,
    private readonly author: string,
    private readonly genre: string,
    private readonly format: string,
    private readonly language: string,
    private readonly publisher: string,
    private readonly specialEdition: string,
    private readonly packaging: string,
    private readonly price: number,
    private readonly quantity: number,
  ) {}

  getCategory(): ItemCategory {
    return ItemCategory.BOOK;
  }

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  getAuthor(): string {
    return this.author;
  }

  getGenre(): string {
    return this.genre;
  }

  getFormat(): string {
    return this.format;
  }

  getLanguage(): string {
    return this.language;
  }

  getPublisher(): string {
    return this.publisher;
  }

  getSpecialEdition(): string {
    return this.specialEdition;
  }

  getPackaging(): string {
    return this.packaging;
  }

  getPrice(): number {
    return this.price;
  }

  getQuantity(): number {
    return this.quantity;
  }
}
