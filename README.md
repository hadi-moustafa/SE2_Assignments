# SE2 E-commerce Project — Parser Engine

The stores we acquired keep their order data in different formats. The parser engine reads CSV, JSON and XML files and turns each one into JavaScript objects.

## Getting started

```bash
npm install
npm test               # run the test suite
npm run test:coverage  # run the tests with a coverage report
npm run build          # compile TypeScript to dist/
```

## Usage

```ts
import { parseRecordsFile } from './src/parsers';

const cakes = await parseRecordsFile('src/data/cake orders.csv'); // CSV
const books = await parseRecordsFile('src/data/book orders.json'); // JSON
const toys  = await parseRecordsFile('src/data/toy orders.xml');   // XML
```

`parseRecordsFile` chooses the parser from the file extension and always returns an array of record objects. You can also call each parser directly:

| Parser | File | Text input | File input |
| --- | --- | --- | --- |
| CSV | `src/parsers/csvParser.ts` | `parseCSV(text, { delimiter?, trim? })` | `parseCSVFile(path)` |
| JSON | `src/parsers/jsonParser.ts` | `parseJSON(text)`, `parseJSONRecords(text)` | `parseJSONFile(path)`, `parseJSONRecordsFile(path)` |
| XML | `src/parsers/xmlParser.ts` | `parseXML(text, options?)`, `parseXMLRecords(text, tag?)` | `parseXMLFile(path)`, `parseXMLRecordsFile(path, tag?)` |

### What each parser supports

- **CSV** (RFC 4180): uses the header row as keys. Handles quoted fields with commas, newlines and escaped `""` quotes, CRLF line endings, a UTF-8 BOM, blank lines and custom delimiters. It rejects rows with missing or extra fields, empty or duplicate headers, and unterminated quotes.
- **JSON** (RFC 8259): a hand-written recursive-descent parser that supports objects, arrays, strings (including every escape and `\u` sequences), numbers, booleans and `null`. It rejects trailing commas, comments, single quotes, invalid numbers and empty input.
- **XML**: a hand-written recursive-descent parser. Nested elements become nested objects, and repeated sibling elements become arrays. Attributes are stored under `@name`, and mixed text is stored under `#text`. It supports self-closing tags, CDATA, comments, processing instructions, DOCTYPE, and predefined and numeric entities. It rejects mismatched or unclosed tags, more than one root element, unknown entities and duplicate attributes.

```xml
<data><row id="1"><Type>Doll</Type></row></data>
```
becomes
```js
{ data: { row: { '@id': '1', Type: 'Doll' } } }
```

`parseXMLRecords` always returns an array, even when there is only one record.

### Error handling

When input is invalid, the parsers throw a `ParserError`. It carries `format` (`'CSV' | 'JSON' | 'XML'`) and, where it applies, the `line` and `column` of the problem:

```
[JSON] Expected "," or "}" in object but found character "\"" (line 3, column 12)
[XML] Mismatched closing tag: expected </Price> but found </row> (line 10, column 9)
```

A file that cannot be read is also reported as a `ParserError`. An unknown file extension raises an `UnsupportedFormatError`.

## Project layout

```
src/
  data/        store order files (cake orders.csv, book orders.json, toy orders.xml)
  parsers/     csvParser.ts, jsonParser.ts, xmlParser.ts, ParserError.ts, index.ts
tests/
  fixtures/    small valid, empty and malformed files used in tests
  *.test.ts    Jest unit tests for each parser and the engine
```
