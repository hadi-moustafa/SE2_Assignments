import { Book } from '../models/Book';
import {
  assertRequiredFields,
  requireNonEmptyString,
  requirePositiveInteger,
  requirePositiveNumber,
} from './validation';

/**
 * Step-by-step builder for {@link Book}.
 *
 * Every setter validates its value immediately and returns the builder so calls can be chained.
 * `build()` fails if any required field was never set.
 * Optional fields: specialEdition (default 'None').
 */
export class BookBuilder {
  private id?: string;
  private title?: string;
  private author?: string;
  private genre?: string;
  private format?: string;
  private language?: string;
  private publisher?: string;
  private specialEdition = 'None';
  private packaging?: string;
  private price?: number;
  private quantity?: number;

  static newBuilder(): BookBuilder {
    return new BookBuilder();
  }

  setId(id: string): this {
    this.id = requireNonEmptyString('id', id);
    return this;
  }

  setTitle(title: string): this {
    this.title = requireNonEmptyString('title', title);
    return this;
  }

  setAuthor(author: string): this {
    this.author = requireNonEmptyString('author', author);
    return this;
  }

  setGenre(genre: string): this {
    this.genre = requireNonEmptyString('genre', genre);
    return this;
  }

  /** e.g. 'Paperback', 'Hardcover', 'E-Book', 'Audiobook'. */
  setFormat(format: string): this {
    this.format = requireNonEmptyString('format', format);
    return this;
  }

  setLanguage(language: string): this {
    this.language = requireNonEmptyString('language', language);
    return this;
  }

  setPublisher(publisher: string): this {
    this.publisher = requireNonEmptyString('publisher', publisher);
    return this;
  }

  /** Optional. Defaults to 'None'. */
  setSpecialEdition(specialEdition: string): this {
    this.specialEdition = requireNonEmptyString('specialEdition', specialEdition);
    return this;
  }

  setPackaging(packaging: string): this {
    this.packaging = requireNonEmptyString('packaging', packaging);
    return this;
  }

  /** Must be greater than 0. */
  setPrice(price: number): this {
    this.price = requirePositiveNumber('price', price);
    return this;
  }

  /** Must be a whole number greater than 0. */
  setQuantity(quantity: number): this {
    this.quantity = requirePositiveInteger('quantity', quantity);
    return this;
  }

  build(): Book {
    assertRequiredFields('Book', {
      id: this.id,
      title: this.title,
      author: this.author,
      genre: this.genre,
      format: this.format,
      language: this.language,
      publisher: this.publisher,
      packaging: this.packaging,
      price: this.price,
      quantity: this.quantity,
    });
    return new Book(
      this.id!,
      this.title!,
      this.author!,
      this.genre!,
      this.format!,
      this.language!,
      this.publisher!,
      this.specialEdition,
      this.packaging!,
      this.price!,
      this.quantity!,
    );
  }
}
