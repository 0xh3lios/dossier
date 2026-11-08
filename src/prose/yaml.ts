// The YAML subset the knowledge records use.
//
// Block mappings and sequences, flow collections, plain and quoted scalars,
// literal (|) and folded (>) block scalars, comments. Plain scalars are typed
// by exact match only: true, false, null, ~ and numbers matching
// /^-?\d+(\.\d+)?$/; everything else stays a string. Anchors, aliases, tags,
// directives, multi-document streams, complex keys and multi-line quoted or
// plain scalars are refused with an Error whose message starts with
// "yaml line <n>: " and whose .line is that number.

export type YamlValue = string | number | boolean | null | YamlValue[] | YamlMap;
export interface YamlMap { [key: string]: YamlValue }
// One ```yaml fenced block of a Markdown text.
export interface YamlBlock { line: number; text: string; value: YamlValue }
export interface YamlError extends Error { line: number }
interface Line { n: number; indent: number; text: string }
interface Fence { line: number; fence: string; strip: RegExp; yaml: boolean; body: string[] }

const PLAIN_KEY = /^([A-Za-z0-9_.$/-]+):(?:\s+(.*))?$/;
const NUMBER = /^-?\d+(\.\d+)?$/;
const ESCAPES: Record<string, string> = { '"': '"', '\\': '\\', '/': '/', n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', 0: '\0' };
const OPEN_FENCE = /^( {0,3})(`{3,}|~{3,})\s*(.*)$/;
const CLOSE_FENCE = /^ {0,3}(`{3,}|~{3,})\s*$/;

function fail(line: number, message: string): YamlError {
  const err = new Error(`yaml line ${line}: ${message}`) as YamlError;
  err.line = line;
  return err;
}

// An own property, so a "__proto__" key cannot reach the prototype.
const set = (obj: object, key: string, value: YamlValue) => Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });
const isDash = (text: string) => text === '-' || text.startsWith('- ');

function scalar(text: string, n: number): YamlValue {
  if (/^[&*!]/.test(text)) throw fail(n, `"${text[0]}" is not supported: anchors, aliases and tags are out of scope`);
  if (text === '' || text === 'null' || text === '~') return null;
  if (text === 'true') return true;
  if (text === 'false') return false;
  return NUMBER.test(text) ? Number(text) : text;
}

// The quoted string starting at s[i]: [value, index after the closing quote].
function quoted(s: string, i: number, n: number): [string, number] {
  const q = s[i];
  let out = '';
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === q && !(q === "'" && s[j + 1] === "'")) return [out, j + 1];
    if (c === q) { out += "'"; j++; }
    else if (c === '\\' && q === '"') {
      const e: string | undefined = s[++j];
      const hex = e === 'u' ? s.slice(j + 1, j + 5) : '';
      if (/^[0-9a-fA-F]{4}$/.test(hex)) { out += String.fromCharCode(parseInt(hex, 16)); j += 4; }
      else if (Object.hasOwn(ESCAPES, e ?? '')) out += ESCAPES[e!];
      else throw fail(n, `unknown escape \\${e ?? ''}`);
    } else out += c;
  }
  throw fail(n, 'unterminated quoted string');
}

// The flow collection starting at s[i]: [value, index after the closing bracket].
function flow(s: string, i: number, n: number): [YamlValue, number] {
  const ws = () => { while (s[i] === ' ' || s[i] === '\t') i++; };
  const plain = (stops: string) => { const j = i; while (i < s.length && !stops.includes(s[i])) i++; return s.slice(j, i).trim(); };
  const node = (): YamlValue => {
    ws();
    const c: string | undefined = s[i];
    if (c === '"' || c === "'") { const [v, end] = quoted(s, i, n); i = end; return v; }
    if (c !== '[' && c !== '{') {
      const t = plain(',]}');
      if (!t) throw fail(n, c === undefined ? 'unterminated flow collection' : 'missing value in flow collection');
      return scalar(t, n);
    }
    const close = c === '[' ? ']' : '}';
    const out: YamlValue[] | YamlMap = c === '[' ? [] : {};
    for (i++; ; ) {
      ws();
      if (s[i] === close) { i++; return out; }
      if (i >= s.length) throw fail(n, 'unterminated flow collection');
      if (Array.isArray(out)) out.push(node());
      else {
        let key: string;
        if (s[i] === '"' || s[i] === "'") [key, i] = quoted(s, i, n);
        else key = plain(':,]}');
        ws();
        if (s[i] !== ':') throw fail(n, 'expected ":" in flow mapping');
        i++;
        ws();
        set(out, key, s[i] === ',' || s[i] === close ? null : node());
      }
      ws();
      if (s[i] === ',') i++;
      else if (s[i] !== close) throw fail(n, i < s.length ? `expected "," or "${close}" in flow collection` : 'unterminated flow collection');
    }
  };
  const v = node();
  return [v, i];
}

// "key: rest" or "'key': rest" -> [key, rest]; null when the line is not a mapping entry.
function keyOf(text: string, n: number): [string, string] | null {
  if (text[0] !== '"' && text[0] !== "'") {
    const m = PLAIN_KEY.exec(text);
    return m && [m[1], m[2] ?? ''];
  }
  const [key, end] = quoted(text, 0, n);
  const m = /^:(?:\s+(.*))?$/.exec(text.slice(end));
  return m && [key, m[1] ?? ''];
}

const deeper = (L: Line) => fail(L.n, `unexpected indentation${isDash(L.text) || keyOf(L.text, L.n) ? '' : ' (multi-line scalars are not supported)'}`);

export function parseYaml(text: unknown): YamlValue {
  const lines: Line[] = String(text).replace(/^﻿/, '').split(/\r?\n/).map((raw, k) => {
    const line = raw.trimEnd();
    const indent = /^ */.exec(line)![0].length;
    return { n: k + 1, indent, text: line.slice(indent) };
  });
  const start = lines.find((L) => L.text && L.text[0] !== '#');
  if (start && start.indent === 0 && start.text === '---') start.text = ''; // one explicit document start is fine
  let pos = 0;

  // The next structural line (blank and comment lines skipped), or null at the end.
  const peek = (): Line | null => {
    for (; pos < lines.length; pos++) {
      const L = lines[pos];
      if (L.text === '' || L.text[0] === '#') continue;
      if (L.text[0] === '\t') throw fail(L.n, 'tabs are not allowed in indentation');
      if (L.indent === 0 && /^(---|\.\.\.)(\s|$)|^%/.test(L.text)) throw fail(L.n, 'directives and multi-document streams are not supported');
      if (L.text === '?' || L.text.startsWith('? ')) throw fail(L.n, 'complex keys are not supported');
      return L;
    }
    return null;
  };

  // The block node whose first line sits at `indent`.
  const block = (indent: number): YamlValue => {
    const L = peek()!;
    if (isDash(L.text)) return sequence(indent);
    if (keyOf(L.text, L.n)) return mapping(indent);
    pos++;
    return value(L.text, indent - 1, L.n, false);
  };

  const mapping = (indent: number): YamlMap => {
    const out: YamlMap = {};
    for (let L: Line | null; (L = peek()) && L.indent >= indent;) {
      if (L.indent > indent) throw deeper(L);
      const kv = keyOf(L.text, L.n);
      if (!kv) throw fail(L.n, isDash(L.text) ? 'sequence item where a mapping entry was expected' : 'expected "key: value"');
      if (Object.hasOwn(out, kv[0])) throw fail(L.n, `duplicate key "${kv[0]}"`);
      pos++;
      set(out, kv[0], value(kv[1], indent, L.n, true));
    }
    return out;
  };

  const sequence = (indent: number): YamlValue[] => {
    const out: YamlValue[] = [];
    for (let L: Line | null; (L = peek()) && L.indent >= indent;) {
      if (L.indent > indent) throw deeper(L);
      if (!isDash(L.text)) break; // the owning mapping's next key, at the same indent
      const rest = L.text.slice(1).trimStart();
      if (rest && (isDash(rest) || keyOf(rest, L.n))) { // a mapping or sequence starting on the dash line
        lines[pos] = { n: L.n, indent: L.indent + L.text.length - rest.length, text: rest };
        out.push(block(lines[pos].indent));
      } else {
        pos++;
        out.push(value(rest, L.indent, L.n, false));
      }
    }
    return out;
  };

  // The value written after "key:" or "- " (rest), or on the lines below it.
  const value = (rest: string, indent: number, n: number, ownSequence: boolean): YamlValue => {
    if (rest === '' || rest[0] === '#') {
      const next = peek();
      if (next && next.indent > indent) return block(next.indent);
      if (ownSequence && next && next.indent === indent && isDash(next.text)) return sequence(indent);
      return null;
    }
    const header = /^([|>])([+-]?)(\s+#.*)?$/.exec(rest);
    if (header) return blockScalar(header[1], header[2], indent);
    if (rest[0] === '|' || rest[0] === '>') throw fail(n, `unsupported block scalar header "${rest}"`);
    return inline(rest, n);
  };

  // A one-line value: a flow collection, a quoted string or a plain scalar, then optionally a comment.
  const inline = (s: string, n: number): YamlValue => {
    const c = s[0];
    if (c !== '"' && c !== "'" && c !== '[' && c !== '{') return scalar(s.replace(/\s#.*$/, '').trimEnd(), n);
    const [v, end] = c === '[' || c === '{' ? flow(s, 0, n) : quoted(s, 0, n);
    if (!/^\s*(#.*)?$/.test(s.slice(end))) throw fail(n, `unexpected text after ${s.slice(0, end)}`);
    return v;
  };

  // The lines below a | or > header that are indented deeper than `parent`.
  const blockScalar = (style: string, chomp: string, parent: number): string => {
    const chunk: string[] = [];
    let width = -1;
    for (let L: Line | undefined; (L = lines[pos]); pos++) {
      if (L.text === '') { chunk.push(''); continue; }
      if (width < 0 && L.indent > parent) width = L.indent;
      if (width < 0 || L.indent < width) break;
      chunk.push(' '.repeat(L.indent - width) + L.text);
    }
    const blanks = chunk.length - 1 - chunk.findLastIndex((l) => l !== '');
    chunk.length -= blanks;
    const body = style === '|'
      ? chunk.join('\n')
      : chunk.reduce((acc, l) => (l === '' ? acc + '\n' : acc === '' || acc.endsWith('\n') ? acc + l : acc + ' ' + l), '');
    return chomp === '-' ? body : chomp === '+' ? body + '\n'.repeat(blanks + 1) : body && body + '\n';
  };

  const first = peek();
  if (!first) return null;
  const doc = block(first.indent);
  const extra = peek();
  if (extra) throw extra.indent > first.indent ? deeper(extra) : fail(extra.n, 'unexpected content');
  return doc;
}

// Every ```yaml fenced block of a Markdown text as { line, text, value }, where
// line is the 1-based line of the opening fence and value = parseYaml(text).
// Fences with another info string are skipped. A block that fails to parse
// throws with the Markdown line number.
export function yamlBlocks(markdown: unknown): YamlBlock[] {
  const blocks: YamlBlock[] = [];
  let open = null as Fence | null;
  String(markdown).split(/\r?\n/).forEach((raw, k) => {
    if (!open) {
      const m = OPEN_FENCE.exec(raw);
      if (m && !(m[2][0] === '`' && m[3].includes('`'))) {
        open = { line: k + 1, fence: m[2], strip: new RegExp(`^ {0,${m[1].length}}`), yaml: m[3].split(/\s/)[0] === 'yaml', body: [] };
      }
      return;
    }
    const m = CLOSE_FENCE.exec(raw);
    if (m && m[1][0] === open.fence[0] && m[1].length >= open.fence.length) {
      if (open.yaml) blocks.push(parsedBlock(open));
      open = null;
    } else open.body.push(raw.replace(open.strip, ''));
  });
  if (open?.yaml) throw fail(open.line, 'unterminated yaml block');
  return blocks;
}

function parsedBlock({ line, body }: Fence): YamlBlock {
  const text = body.join('\n');
  try {
    return { line, text, value: parseYaml(text) };
  } catch (e) {
    if (!(e as YamlError).line) throw e;
    throw fail(line + (e as YamlError).line, (e as YamlError).message.slice((e as YamlError).message.indexOf(': ') + 2));
  }
}

// The top-level keys of every yaml block of a Markdown file, merged into one
// object: arrays concatenate, anything else is replaced by the later block.
export function recordsOf(markdown: unknown): YamlMap {
  const out: YamlMap = {};
  for (const { line, value } of yamlBlocks(markdown)) {
    if (value === null) continue;
    if (typeof value !== 'object' || Array.isArray(value)) throw fail(line, 'the block is not a mapping');
    for (const [key, v] of Object.entries(value)) set(out, key, Array.isArray(out[key]) && Array.isArray(v) ? (out[key] as YamlValue[]).concat(v) : v);
  }
  return out;
}
