import { BookBuilder } from '../builders/BookBuilder';
import { Book } from '../models/Book';
import { RecordMapper } from './Mapper';
import { RecordReader, setIfPresent } from './RecordReader';

/** Maps a raw book record (e.g. an entry of `book orders.json`) to a {@link Book}. */
export class BookMapper extends RecordMapper<Book> {
  protected readonly modelName = 'Book';

  protected buildFrom(r: RecordReader): Book {
    const b = BookBuilder.newBuilder();
    setIfPresent(r.readText('Order ID', 'id'), (v) => b.setId(v));
    setIfPresent(r.readText('Book Title', 'Title'), (v) => b.setTitle(v));
    setIfPresent(r.readText('Author'), (v) => b.setAuthor(v));
    setIfPresent(r.readText('Genre'), (v) => b.setGenre(v));
    setIfPresent(r.readText('Format'), (v) => b.setFormat(v));
    setIfPresent(r.readText('Language'), (v) => b.setLanguage(v));
    setIfPresent(r.readText('Publisher'), (v) => b.setPublisher(v));
    setIfPresent(r.readOptionalText('Special Edition'), (v) => b.setSpecialEdition(v));
    setIfPresent(r.readText('Packaging'), (v) => b.setPackaging(v));
    setIfPresent(r.readNumber('Price'), (v) => b.setPrice(v));
    setIfPresent(r.readNumber('Quantity'), (v) => b.setQuantity(v));
    return b.build();
  }
}
