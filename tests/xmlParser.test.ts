import path from 'node:path';
import { parseXML, parseXMLFile, parseXMLRecords, parseXMLRecordsFile, XMLObject } from '../src/parsers/xmlParser';
import { ParserError } from '../src/parsers/ParserError';

const fixture = (name: string) => path.join(__dirname, 'fixtures', name);
const dataFile = (name: string) => path.join(__dirname, '..', 'src', 'data', name);

describe('parseXML', () => {
  describe('structure', () => {
    it('parses a single text element', () => {
      expect(parseXML('<name>Car</name>')).toEqual({ name: 'Car' });
    });

    it('parses empty and self-closing elements as empty strings', () => {
      expect(parseXML('<a><b></b><c/><d /></a>')).toEqual({ a: { b: '', c: '', d: '' } });
    });

    it('parses an empty root', () => {
      expect(parseXML('<root/>')).toEqual({ root: '' });
    });

    it('parses deeply nested elements', () => {
      const xml = `
        <store>
          <owner><name>Ann</name><address><city>Beirut</city><zip>1100</zip></address></owner>
        </store>`;
      expect(parseXML(xml)).toEqual({
        store: { owner: { name: 'Ann', address: { city: 'Beirut', zip: '1100' } } },
      });
    });

    it('turns repeated siblings into an array in document order', () => {
      expect(parseXML('<list><item>1</item><other>x</other><item>2</item><item>3</item></list>')).toEqual({
        list: { item: ['1', '2', '3'], other: 'x' },
      });
    });

    it('supports repeated siblings that are themselves objects', () => {
      expect(parseXML('<l><i><v>1</v></i><i><v>2</v></i></l>')).toEqual({ l: { i: [{ v: '1' }, { v: '2' }] } });
    });

    it('keeps nested arrays separate from repeated siblings', () => {
      expect(parseXML('<r><g><i>1</i><i>2</i></g><g><i>3</i></g></r>')).toEqual({
        r: { g: [{ i: ['1', '2'] }, { i: '3' }] },
      });
    });

    it('forces configured tags into arrays', () => {
      expect(parseXML('<list><item>1</item></list>', { alwaysArray: ['item'] })).toEqual({ list: { item: ['1'] } });
    });

    it('preserves whitespace inside text-only elements', () => {
      expect(parseXML('<a>  spaced  out </a>')).toEqual({ a: '  spaced  out ' });
    });

    it('ignores indentation between child elements', () => {
      expect(parseXML('<a>\n  <b>1</b>\n  <c>2</c>\n</a>')).toEqual({ a: { b: '1', c: '2' } });
    });

    it('keeps mixed text content under the text key', () => {
      expect(parseXML('<p>Hello <b>world</b> !</p>')).toEqual({ p: { b: 'world', '#text': 'Hello  !' } });
    });

    it('accepts names with digits, dashes, dots, underscores and namespaces', () => {
      expect(parseXML('<ns:root><_a-1.b>x</_a-1.b></ns:root>')).toEqual({ 'ns:root': { '_a-1.b': 'x' } });
    });

    it('allows whitespace before the end of a closing tag', () => {
      expect(parseXML('<a>1</a  >')).toEqual({ a: '1' });
    });
  });

  describe('attributes', () => {
    it('parses double- and single-quoted attributes', () => {
      expect(parseXML(`<toy id="5" brand='Fun'/>`)).toEqual({ toy: { '@id': '5', '@brand': 'Fun' } });
    });

    it('combines attributes with child elements and text', () => {
      expect(parseXML('<toy id="5"><name>Car</name></toy>')).toEqual({ toy: { '@id': '5', name: 'Car' } });
      expect(parseXML('<price currency="USD">10</price>')).toEqual({ price: { '@currency': 'USD', '#text': '10' } });
    });

    it('allows whitespace around "=" and between attributes', () => {
      expect(parseXML('<a  x = "1"\n\ty="2" ></a>')).toEqual({ a: { '@x': '1', '@y': '2' } });
    });

    it('decodes entities in attribute values', () => {
      expect(parseXML('<a t="&quot;Tom&quot; &amp; Jerry"/>')).toEqual({ a: { '@t': '"Tom" & Jerry' } });
    });

    it('supports custom attribute prefix and text key', () => {
      expect(parseXML('<a id="1">x</a>', { attributePrefix: '_', textKey: 'value' })).toEqual({ a: { _id: '1', value: 'x' } });
    });

    it('rejects a child element that collides with an attribute key', () => {
      expect(() => parseXML('<a id="1"><id>2</id></a>', { attributePrefix: '' })).toThrow(/conflicts with an attribute/);
    });
  });

  describe('special content', () => {
    it('decodes predefined, decimal and hexadecimal entities', () => {
      expect(parseXML('<a>&lt;&gt;&amp;&quot;&apos; &#233; &#x1F600;</a>')).toEqual({ a: `<>&"' é 😀` });
    });

    it('returns CDATA content verbatim', () => {
      expect(parseXML('<a><![CDATA[<b>not a tag</b> & raw]]></a>')).toEqual({ a: '<b>not a tag</b> & raw' });
    });

    it('joins CDATA with surrounding text', () => {
      expect(parseXML('<a>x<![CDATA[y]]>z</a>')).toEqual({ a: 'xyz' });
    });

    it('ignores comments and processing instructions everywhere', () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
        <!-- header comment -->
        <?app setting?>
        <a><!-- inside --><b>1</b><?pi?></a>
        <!-- trailing comment -->`;
      expect(parseXML(xml)).toEqual({ a: { b: '1' } });
    });

    it('skips a DOCTYPE declaration including an internal subset', () => {
      expect(parseXML('<!DOCTYPE note [<!ELEMENT note (#PCDATA)>]><note>hi</note>')).toEqual({ note: 'hi' });
    });

    it('strips a byte order mark', () => {
      expect(parseXML('﻿<a>1</a>')).toEqual({ a: '1' });
    });
  });

  describe('errors', () => {
    const cases: Array<[string, string, RegExp]> = [
      ['empty input', '', /Input is empty/],
      ['whitespace-only input', '  \n ', /Input is empty/],
      ['only a declaration', '<?xml version="1.0"?>', /no root element/],
      ['text instead of a root', 'hello', /Text is not allowed outside the root element/],
      ['text after the root', '<a/>tail', /Text is not allowed outside the root element/],
      ['two roots', '<a/><b/>', /Only one root element is allowed/],
      ['an unclosed element', '<a><b>1</b>', /Unclosed element <a>/],
      ['text running to the end of input', '<a>dangling text', /Unclosed element <a>/],
      ['a closing tag cut off at the end of input', '<a></', /Invalid or missing closing tag name/],
      ['mismatched tags', '<a><b>1</a></b>', /Mismatched closing tag: expected <\/b> but found <\/a>/],
      ['an invalid element name', '<1a/>', /Invalid or missing element name/],
      ['a missing closing ">"', '<a></a', /Expected ">" to finish closing tag/],
      ['garbage in a start tag', '<a ?>', /Invalid or missing attribute name/],
      ['an end of input inside a tag', '<a x="1"', /Unexpected end of input inside start tag/],
      ['an attribute without whitespace', '<a x="1"y="2"/>', /Expected whitespace before attribute/],
      ['an attribute without "="', '<a x/>', /Expected "=" after attribute "x"/],
      ['an unquoted attribute', '<a x=1/>', /must be quoted/],
      ['an unterminated attribute value', '<a x="1/>', /Unterminated value for attribute "x"/],
      ['"<" in an attribute value', '<a x="<"/>', /must not contain "<"/],
      ['a duplicate attribute', '<a x="1" x="2"/>', /Duplicate attribute "x"/],
      ['a bare ampersand', '<a>Tom & Jerry</a>', /Unescaped "&"/],
      ['an unknown entity', '<a>&nbsp;</a>', /Unknown entity "&nbsp;"/],
      ['an invalid decimal reference', '<a>&#12a;</a>', /Invalid character reference/],
      ['an invalid hex reference', '<a>&#xZZ;</a>', /Invalid character reference/],
      ['an out-of-range reference', '<a>&#x110000;</a>', /Invalid character reference/],
      ['"]]>" in text', '<a>x]]>y</a>', /"\]\]>" is not allowed/],
      ['an unterminated comment', '<a><!-- oops</a>', /Unterminated comment/],
      ['an unterminated CDATA section', '<a><![CDATA[oops</a>', /Unterminated CDATA section/],
      ['an unterminated declaration', '<?xml version="1.0"', /Unterminated XML declaration/],
      ['an unterminated processing instruction', '<a><?pi</a>', /Unterminated processing instruction/],
      ['an unterminated DOCTYPE', '<!DOCTYPE a [ <a/>', /Unterminated DOCTYPE/],
      ['a DOCTYPE after the root', '<a/><!DOCTYPE a>', /Only one root element/],
    ];

    it.each(cases)('rejects %s', (_label, input, message) => {
      expect(() => parseXML(input)).toThrow(message);
    });

    it('throws ParserError with an accurate line and column', () => {
      expect(() => parseXML('<a>\n  <b>1</c>\n</a>')).toThrow(
        expect.objectContaining({ name: 'ParserError', format: 'XML', line: 2, column: 7 }),
      );
      expect(() => parseXML('<a/>x')).toThrow(ParserError);
    });
  });
});

describe('parseXMLRecords', () => {
  it('always returns an array of records', () => {
    expect(parseXMLRecords('<data><row><id>1</id></row></data>')).toEqual([{ id: '1' }]);
    expect(parseXMLRecords('<data><row><id>1</id></row><row><id>2</id></row></data>')).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('returns an empty array for a root without records', () => {
    expect(parseXMLRecords('<data></data>')).toEqual([]);
    expect(parseXMLRecords('<data/>')).toEqual([]);
    expect(parseXMLRecords('<data><meta>x</meta></data>')).toEqual([]);
  });

  it('supports a custom record tag and keeps other options', () => {
    expect(parseXMLRecords('<toys><toy id="1"/><toy id="2"/></toys>', 'toy', { attributePrefix: '' })).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('normalises empty and text-only records to objects', () => {
    expect(parseXMLRecords('<d><row/><row>note</row></d>')).toEqual([{}, { '#text': 'note' }]);
  });

  it('keeps missing fields absent rather than inventing them', () => {
    const records = parseXMLRecords('<d><row><id>1</id><name>Car</name></row><row><id>2</id></row></d>');
    expect(records[1]).toEqual({ id: '2' });
    expect(records[1].name).toBeUndefined();
  });

  it('rejects a root that contains text instead of records', () => {
    expect(() => parseXMLRecords('<data>oops</data>')).toThrow(/contains text instead of <row> records/);
  });
});

describe('file parsing', () => {
  it('parses a valid file', async () => {
    await expect(parseXMLFile(fixture('valid.xml'))).resolves.toEqual({
      data: { row: [{ id: '1', name: 'Car' }, { id: '2', name: 'Doll' }] },
    });
  });

  it('rejects an empty file', async () => {
    await expect(parseXMLFile(fixture('empty.xml'))).rejects.toThrow(/Input is empty/);
  });

  it('rejects a malformed file', async () => {
    await expect(parseXMLRecordsFile(fixture('malformed.xml'))).rejects.toThrow(/Unclosed element <data>/);
  });

  it('reports a missing file as a ParserError', async () => {
    await expect(parseXMLFile(fixture('missing.xml'))).rejects.toThrow(/\[XML\] Unable to read file/);
  });

  describe('store data: toy orders.xml', () => {
    let orders: XMLObject[];
    beforeAll(async () => {
      orders = await parseXMLRecordsFile(dataFile('toy orders.xml'));
    });

    it('parses every order', () => {
      expect(orders).toHaveLength(250);
    });

    it('gives every order the same fields', () => {
      const fields = ['OrderID', 'Type', 'AgeGroup', 'Brand', 'Material', 'BatteryRequired', 'Educational', 'Price', 'Quantity'];
      for (const order of orders) expect(Object.keys(order)).toEqual(fields);
    });

    it('parses the first order correctly', () => {
      expect(orders[0]).toEqual({
        OrderID: '5001',
        Type: 'Plush Toy',
        AgeGroup: '13+',
        Brand: 'FunTime',
        Material: 'Fabric',
        BatteryRequired: 'Yes',
        Educational: 'Yes',
        Price: '247',
        Quantity: '7',
      });
    });
  });
});
