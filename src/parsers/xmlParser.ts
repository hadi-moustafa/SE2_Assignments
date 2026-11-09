import { ParserError, positionAt, stripBom } from './ParserError';
import { readTextFile } from './fileReader';

/**
 * Value produced for an XML element:
 * - an element with only text (or nothing) becomes a string
 * - an element with child elements or attributes becomes an object
 * - sibling elements sharing a tag name become an array
 */
export type XMLValue = string | XMLObject | XMLValue[];
export interface XMLObject {
  [key: string]: XMLValue;
}

export interface XMLParseOptions {
  /** Prefix for attribute keys. Defaults to "@". */
  attributePrefix?: string;
  /** Key used for text when an element also has attributes or children. Defaults to "#text". */
  textKey?: string;
  /** Tag names that are always returned as arrays, even when they occur once. */
  alwaysArray?: string[];
}

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const NAME_START = /[A-Za-z_:À-￿]/;
const NAME_CHAR = /[A-Za-z0-9_:.\-·À-￿]/;

/**
 * A small recursive-descent XML parser. Supports the XML declaration,
 * processing instructions, comments, DOCTYPE, CDATA sections, attributes,
 * self-closing tags, predefined and numeric entities and nested elements.
 *
 * Returns an object with the root element's name as its single key.
 */
export function parseXML(input: string, options: XMLParseOptions = {}): XMLObject {
  return new XMLReader(stripBom(input), options).parseDocument();
}

/** Reads and parses an XML file from disk. */
export async function parseXMLFile(filePath: string, options: XMLParseOptions = {}): Promise<XMLObject> {
  return parseXML(await readTextFile(filePath, 'XML'), options);
}

/**
 * Convenience for record-style documents such as
 * `<data><row>...</row><row>...</row></data>`: returns the repeated child
 * elements of the root as an array (always an array, even for 0 or 1 records).
 */
export function parseXMLRecords(input: string, recordTag = 'row', options: XMLParseOptions = {}): XMLObject[] {
  const doc = parseXML(input, { ...options, alwaysArray: [...(options.alwaysArray ?? []), recordTag] });
  const rootName = Object.keys(doc)[0];
  const root = doc[rootName];
  if (typeof root === 'string') {
    if (root.trim() === '') return [];
    throw new ParserError('XML', `Root element <${rootName}> contains text instead of <${recordTag}> records`);
  }
  const records = (root as XMLObject)[recordTag] ?? [];
  // Element values are never arrays themselves, so each record is a string or an object.
  return (records as Array<string | XMLObject>).map((record) => {
    if (typeof record !== 'string') return record;
    return record === '' ? {} : { [options.textKey ?? '#text']: record };
  });
}

/** Reads an XML file of repeated record elements. */
export async function parseXMLRecordsFile(filePath: string, recordTag = 'row', options: XMLParseOptions = {}): Promise<XMLObject[]> {
  return parseXMLRecords(await readTextFile(filePath, 'XML'), recordTag, options);
}

class XMLReader {
  private pos = 0;
  private readonly attrPrefix: string;
  private readonly textKey: string;
  private readonly alwaysArray: Set<string>;

  constructor(private readonly text: string, options: XMLParseOptions) {
    this.attrPrefix = options.attributePrefix ?? '@';
    this.textKey = options.textKey ?? '#text';
    this.alwaysArray = new Set(options.alwaysArray ?? []);
  }

  parseDocument(): XMLObject {
    if (this.text.trim() === '') this.fail('Input is empty', 0);

    if (this.text.startsWith('<?xml', this.pos)) this.skipPast('?>', 'XML declaration');
    this.skipMisc(true);

    if (this.pos >= this.text.length) this.fail('Document has no root element');
    if (this.text[this.pos] !== '<') this.fail('Text is not allowed outside the root element');

    const { name, value } = this.parseElement();
    this.skipMisc(false);
    if (this.pos < this.text.length) {
      this.fail(this.text[this.pos] === '<' ? 'Only one root element is allowed' : 'Text is not allowed outside the root element');
    }
    return { [name]: value };
  }

  /** Skips whitespace, comments, processing instructions and (optionally) a DOCTYPE. */
  private skipMisc(allowDoctype: boolean): void {
    while (true) {
      this.skipWhitespace();
      if (this.text.startsWith('<!--', this.pos)) this.skipComment();
      else if (this.text.startsWith('<?', this.pos)) this.skipPast('?>', 'processing instruction');
      else if (allowDoctype && this.text.startsWith('<!DOCTYPE', this.pos)) this.skipDoctype();
      else return;
    }
  }

  private parseElement(): { name: string; value: XMLValue } {
    const start = this.pos;
    this.pos++; // '<'
    const name = this.readName('element name');
    const attributes = this.parseAttributes(name);

    if (this.text.startsWith('/>', this.pos)) {
      this.pos += 2;
      return { name, value: this.buildValue(attributes, [], '') };
    }
    this.expect('>', `Expected ">" to close start tag <${name}>`);

    const children: Array<[string, XMLValue]> = [];
    let text = '';
    while (true) {
      if (this.pos >= this.text.length) this.fail(`Unclosed element <${name}>`, start);

      if (this.text.startsWith('</', this.pos)) {
        const closeStart = this.pos;
        this.pos += 2;
        const closeName = this.readName('closing tag name');
        this.skipWhitespace();
        this.expect('>', `Expected ">" to finish closing tag </${closeName}>`);
        if (closeName !== name) {
          this.fail(`Mismatched closing tag: expected </${name}> but found </${closeName}>`, closeStart);
        }
        break;
      }
      if (this.text.startsWith('<!--', this.pos)) this.skipComment();
      else if (this.text.startsWith('<![CDATA[', this.pos)) text += this.readCData();
      else if (this.text.startsWith('<?', this.pos)) this.skipPast('?>', 'processing instruction');
      else if (this.text[this.pos] === '<') {
        const child = this.parseElement();
        children.push([child.name, child.value]);
      } else text += this.readText();
    }

    return { name, value: this.buildValue(attributes, children, text) };
  }

  private buildValue(attributes: XMLObject, children: Array<[string, XMLValue]>, rawText: string): XMLValue {
    const hasAttributes = Object.keys(attributes).length > 0;
    // Whitespace used for indentation between child elements is not content.
    const text = children.length > 0 && rawText.trim() === '' ? '' : rawText;
    if (!hasAttributes && children.length === 0) return text;

    const groups = new Map<string, XMLValue[]>();
    for (const [childName, childValue] of children) {
      const group = groups.get(childName);
      if (group) group.push(childValue);
      else groups.set(childName, [childValue]);
    }

    const obj: XMLObject = { ...attributes };
    for (const [childName, values] of groups) {
      if (childName in obj) this.fail(`Child element <${childName}> conflicts with an attribute key`);
      obj[childName] = values.length > 1 || this.alwaysArray.has(childName) ? values : values[0];
    }
    if (text.trim() !== '') obj[this.textKey] = text.trim();
    return obj;
  }

  private parseAttributes(elementName: string): XMLObject {
    const attributes: XMLObject = {};
    while (true) {
      const hadWhitespace = this.skipWhitespace();
      const ch = this.text[this.pos];
      if (ch === '>' || this.text.startsWith('/>', this.pos)) return attributes;
      if (ch === undefined) this.fail(`Unexpected end of input inside start tag <${elementName}>`);
      if (!hadWhitespace) this.fail(`Expected whitespace before attribute in <${elementName}>`);

      const attrStart = this.pos;
      const attrName = this.readName('attribute name');
      this.skipWhitespace();
      this.expect('=', `Expected "=" after attribute "${attrName}"`);
      this.skipWhitespace();
      const quote = this.text[this.pos];
      if (quote !== '"' && quote !== "'") this.fail(`Attribute "${attrName}" value must be quoted`);
      const valueStart = ++this.pos;
      const end = this.text.indexOf(quote, valueStart);
      if (end === -1) this.fail(`Unterminated value for attribute "${attrName}"`, valueStart - 1);
      const raw = this.text.slice(valueStart, end);
      if (raw.includes('<')) this.fail(`Attribute "${attrName}" value must not contain "<"`, valueStart);
      this.pos = end + 1;

      const key = this.attrPrefix + attrName;
      if (key in attributes) this.fail(`Duplicate attribute "${attrName}" on <${elementName}>`, attrStart);
      attributes[key] = this.decodeEntities(raw, valueStart);
    }
  }

  private readText(): string {
    const start = this.pos;
    const end = this.text.indexOf('<', start);
    this.pos = end === -1 ? this.text.length : end;
    const raw = this.text.slice(start, this.pos);
    if (raw.includes(']]>')) this.fail('The sequence "]]>" is not allowed in text', start + raw.indexOf(']]>'));
    return this.decodeEntities(raw, start);
  }

  private readCData(): string {
    const start = this.pos;
    const end = this.text.indexOf(']]>', start + 9);
    if (end === -1) this.fail('Unterminated CDATA section', start);
    this.pos = end + 3;
    return this.text.slice(start + 9, end);
  }

  private skipComment(): void {
    const start = this.pos;
    const end = this.text.indexOf('-->', start + 4);
    if (end === -1) this.fail('Unterminated comment', start);
    this.pos = end + 3;
  }

  private skipDoctype(): void {
    const start = this.pos;
    let depth = 0;
    for (let i = start; i < this.text.length; i++) {
      const ch = this.text[i];
      if (ch === '[') depth++;
      else if (ch === ']') depth--;
      else if (ch === '>' && depth === 0) {
        this.pos = i + 1;
        return;
      }
    }
    this.fail('Unterminated DOCTYPE declaration', start);
  }

  private skipPast(terminator: string, what: string): void {
    const start = this.pos;
    const end = this.text.indexOf(terminator, start);
    if (end === -1) this.fail(`Unterminated ${what}`, start);
    this.pos = end + terminator.length;
  }

  private decodeEntities(raw: string, offset: number): string {
    return raw.replace(/&([^;\s<&]*);?/g, (match, body: string, index: number) => {
      const at = offset + index;
      if (!match.endsWith(';')) this.fail(`Unescaped "&" or unterminated entity reference`, at);
      if (body.startsWith('#')) {
        const code = body[1] === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        const digitsValid = body[1] === 'x' ? /^#x[0-9a-fA-F]+$/.test(body) : /^#[0-9]+$/.test(body);
        if (!digitsValid || code > 0x10ffff) this.fail(`Invalid character reference "${match}"`, at);
        return String.fromCodePoint(code);
      }
      if (!(body in ENTITIES)) this.fail(`Unknown entity "${match}"`, at);
      return ENTITIES[body];
    });
  }

  private readName(what: string): string {
    const start = this.pos;
    if (!NAME_START.test(this.text[this.pos] ?? '')) this.fail(`Invalid or missing ${what}`);
    this.pos++;
    while (this.pos < this.text.length && NAME_CHAR.test(this.text[this.pos])) this.pos++;
    return this.text.slice(start, this.pos);
  }

  private skipWhitespace(): boolean {
    const start = this.pos;
    while (this.pos < this.text.length && /\s/.test(this.text[this.pos])) this.pos++;
    return this.pos > start;
  }

  private expect(token: string, message: string): void {
    if (!this.text.startsWith(token, this.pos)) this.fail(message);
    this.pos += token.length;
  }

  private fail(message: string, at: number = this.pos): never {
    throw new ParserError('XML', message, positionAt(this.text, at));
  }
}
