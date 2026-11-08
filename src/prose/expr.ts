// Conditions, changes and brace expressions: one AST, parsed from controlled
// phrases or from {braces}, evaluated in JS, printed as TLA+ and as labels.
//
// Nodes: {t:'int',v} {t:'bool',v} {t:'id',name} (unresolved) {t:'ref',name}
// (data or field, resolved) {t:'lit',v} (enum literal or state name)
// {t:'bin',op,l,r} {t:'not',e} {t:'neg',e}

export type BinOp = '+' | '-' | '*' | 'div' | 'mod' | '<' | '<=' | '=' | '!=' | '>' | '>=' | 'and' | 'or';
export type Expr =
  | { t: 'int'; v: number }
  | { t: 'bool'; v: boolean }
  | { t: 'id'; name: string }
  | { t: 'ref'; name: string }
  | { t: 'field'; name: string }
  | { t: 'lit'; v: string }
  | { t: 'bin'; op: BinOp; l: Expr; r: Expr }
  | { t: 'not'; e: Expr }
  | { t: 'neg'; e: Expr };
// What an expression evaluates to: a count, a flag, or an enum literal or state name.
export type Value = number | boolean | string;
// {name := expr}, and the changes a move's clauses make.
export interface Assignment { name: string; expr: Expr }
// "sends <name> [to <target>]"
export interface Effect { name: string; to: string | null }
export interface Clauses { assigns: Assignment[]; effects: Effect[] }
interface Token { k: string; v?: number | string }
type Clause = { assign?: Assignment; effect?: Effect };

export const NUMBER_WORDS: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const KEYWORDS = new Set(['and', 'or', 'not', 'div', 'mod', 'true', 'false']);
// A member reference whose part id has hyphens, such as price-feed.price: the hyphens
// belong to the id, so it reads as one name and not as a subtraction.
const HYPHENED_REF = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+\.[A-Za-z_][\w.]*/;

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (j < src.length && /[0-9]/.test(src[j])) j++; tokens.push({ k: 'int', v: Number(src.slice(i, j)) }); i = j; continue; }
    const ref = src.slice(i).match(HYPHENED_REF);
    if (ref) { tokens.push({ k: 'id', v: ref[0] }); i += ref[0].length; continue; }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < src.length && /[A-Za-z0-9_.]/.test(src[j])) j++;
      const w = src.slice(i, j);
      tokens.push(KEYWORDS.has(w) ? { k: w } : { k: 'id', v: w });
      i = j; continue;
    }
    const two = src.slice(i, i + 2);
    if (['<=', '>=', '!=', '==', ':='].includes(two)) { tokens.push({ k: two === '==' ? '=' : two }); i += 2; continue; }
    if ('+-*<>=()'.includes(c)) { tokens.push({ k: c }); i++; continue; }
    throw new Error(`unexpected character "${c}" in {${src}}`);
  }
  return tokens;
}

class Parser {
  declare src: string;
  declare tokens: Token[];
  declare i: number;
  constructor(src: string) { this.src = src; this.tokens = tokenize(src); this.i = 0; }
  peek(): Token | undefined { return this.tokens[this.i]; }
  next(): Token | undefined { return this.tokens[this.i++]; }
  at(k: string) { const t = this.peek(); return t && t.k === k; }
  expect(k: string) { if (!this.at(k)) throw new Error(`expected "${k}" in {${this.src}}`); return this.next(); }
  parseOr(): Expr { let e = this.parseAnd(); while (this.at('or')) { this.next(); e = { t: 'bin', op: 'or', l: e, r: this.parseAnd() }; } return e; }
  parseAnd(): Expr { let e = this.parseNot(); while (this.at('and')) { this.next(); e = { t: 'bin', op: 'and', l: e, r: this.parseNot() }; } return e; }
  parseNot(): Expr { if (this.at('not')) { this.next(); return { t: 'not', e: this.parseNot() }; } return this.parseCmp(); }
  parseCmp(): Expr {
    const l = this.parseAdd();
    const t = this.peek();
    if (t && ['<', '<=', '=', '!=', '>', '>='].includes(t.k)) { this.next(); return { t: 'bin', op: t.k as BinOp, l, r: this.parseAdd() }; }
    return l;
  }
  parseAdd(): Expr { let e = this.parseMul(); while (this.at('+') || this.at('-')) { const op = this.next()!.k as BinOp; e = { t: 'bin', op, l: e, r: this.parseMul() }; } return e; }
  parseMul(): Expr { let e = this.parseUnary(); while (this.at('*') || this.at('div') || this.at('mod')) { const op = this.next()!.k as BinOp; e = { t: 'bin', op, l: e, r: this.parseUnary() }; } return e; }
  parseUnary(): Expr { if (this.at('-')) { this.next(); return { t: 'neg', e: this.parseUnary() }; } return this.parsePrimary(); }
  parsePrimary(): Expr {
    const t = this.next();
    if (!t) throw new Error(`unexpected end of {${this.src}}`);
    if (t.k === 'int') return { t: 'int', v: t.v as number };
    if (t.k === 'true') return { t: 'bool', v: true };
    if (t.k === 'false') return { t: 'bool', v: false };
    if (t.k === 'id') return { t: 'id', name: t.v as string };
    if (t.k === '(') { const e = this.parseOr(); this.expect(')'); return e; }
    throw new Error(`unexpected "${t.k}" in {${this.src}}`);
  }
}

export function parseExpr(src: string): Expr {
  const p = new Parser(src);
  const e = p.parseOr();
  if (p.peek()) throw new Error(`unexpected "${p.peek()!.k}" after expression in {${src}}`);
  return e;
}

// {name := expr}
export function parseAssignment(src: string): Assignment {
  const m = src.match(/^\s*([A-Za-z_][\w.]*)\s*:=\s*(.+)$/s);
  if (!m) throw new Error(`a brace change reads {name := expr}: {${src}}`);
  return { name: m[1], expr: parseExpr(m[2]) };
}

// Split on a separator at brace depth zero.
export function splitTop(text: string, separators: string[]): string[] {
  const parts: string[] = [];
  let depth = 0, start = 0, i = 0;
  outer: while (i < text.length) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (depth === 0) {
      for (const sep of separators) {
        if (text.startsWith(sep, i)) { parts.push(text.slice(start, i)); i += sep.length; start = i; continue outer; }
      }
    }
    i++;
  }
  parts.push(text.slice(start));
  return parts.map(s => s.trim()).filter(Boolean);
}

export function parseValue(text: string): Expr {
  const t = text.trim();
  if (/^\{.*\}$/s.test(t)) return parseExpr(t.slice(1, -1));
  if (/^-?\d+$/.test(t)) return { t: 'int', v: Number(t) };
  if (t in NUMBER_WORDS) return { t: 'int', v: NUMBER_WORDS[t] };
  if (t === 'true' || t === 'false') return { t: 'bool', v: t === 'true' };
  if (/^[A-Za-z_][\w.]*$/.test(t) || new RegExp(`${HYPHENED_REF.source}$`).test(t)) return { t: 'id', name: t };
  throw new Error(`not a value: "${t}"`);
}

const ATOMS: [RegExp, BinOp | 'set' | 'clear'][] = [
  [/^(.+?) is below (.+)$/, '<'],
  [/^(.+?) is above (.+)$/, '>'],
  [/^(.+?) is at least (.+)$/, '>='],
  [/^(.+?) is at most (.+)$/, '<='],
  [/^(.+?) is not (.+)$/, '!='],
  [/^(.+?) is set$/, 'set'],
  [/^(.+?) is clear$/, 'clear'],
  [/^(.+?) is (.+)$/, '='],
];

export function parseAtom(text: string): Expr {
  const t = text.trim();
  if (/^\{.*\}$/s.test(t)) return parseExpr(t.slice(1, -1));
  for (const [re, op] of ATOMS) {
    const m = t.match(re);
    if (!m) continue;
    const l = parseValue(m[1]);
    if (op === 'set') return l;
    if (op === 'clear') return { t: 'not', e: l };
    return { t: 'bin', op, l, r: parseValue(m[2]) };
  }
  throw new Error(`not a condition: "${t}"`);
}

// Atoms joined by "and"; "or" only inside braces.
export function parseCondition(text: string): Expr {
  const atoms = splitTop(text, [' and ']);
  if (atoms.length === 0) throw new Error('empty condition');
  return atoms.map(parseAtom).reduce((l, r) => ({ t: 'bin', op: 'and', l, r }));
}

const CLAUSES: [RegExp, (m: RegExpMatchArray) => Clause][] = [
  [/^with ([A-Za-z_][\w.]*) (.+)$/, (m) => ({ assign: { name: m[1], expr: parseValue(m[2]) } })],
  [/^([A-Za-z_][\w.]*) grows by (.+)$/, (m) => ({ assign: { name: m[1], expr: { t: 'bin', op: '+', l: { t: 'id', name: m[1] }, r: parseValue(m[2]) } } })],
  [/^([A-Za-z_][\w.]*) drops by (.+)$/, (m) => ({ assign: { name: m[1], expr: { t: 'bin', op: '-', l: { t: 'id', name: m[1] }, r: parseValue(m[2]) } } })],
  [/^([A-Za-z_][\w.]*) becomes (.+)$/, (m) => ({ assign: { name: m[1], expr: parseValue(m[2]) } })],
  [/^([A-Za-z_][\w.]*) is set$/, (m) => ({ assign: { name: m[1], expr: { t: 'bool', v: true } } })],
  [/^([A-Za-z_][\w.]*) is cleared$/, (m) => ({ assign: { name: m[1], expr: { t: 'bool', v: false } } })],
  [/^\{(.+)\}$/s, (m) => ({ assign: parseAssignment(m[1]) })],
  [/^sends ([a-z][\w-]*)(?: to (.+))?$/, (m) => ({ effect: { name: m[1], to: m[2] || null } })],
];

// The clauses after a move's target: changes and effects, separated by commas and "and".
export function parseClauses(text: string): Clauses {
  const out: Clauses = { assigns: [], effects: [] };
  const t = text.trim().replace(/\.$/, '');
  if (!t) return out;
  for (const clause of splitTop(t.replace(/^(,|and)\s+/, ''), [', ', ' and '])) {
    let matched = false;
    for (const [re, build] of CLAUSES) {
      const m = clause.match(re);
      if (!m) continue;
      const r = build(m);
      if (r.assign) out.assigns.push(r.assign); else out.effects.push(r.effect!);
      matched = true;
      break;
    }
    if (!matched) throw new Error(`not a change or effect: "${clause}"`);
  }
  return out;
}

// Replace id nodes with what the resolver says: {t:'ref'}, {t:'lit'} or a field.
export function resolveIds(ast: Expr, resolver: (name: string) => Expr | null | undefined): Expr {
  const walk = (n: Expr): Expr => {
    switch (n.t) {
      case 'id': return resolver(n.name) || n;
      case 'bin': return { ...n, l: walk(n.l), r: walk(n.r) };
      case 'not': case 'neg': return { ...n, e: walk(n.e) };
      default: return n;
    }
  };
  return walk(ast);
}

export function evaluate(ast: Expr, lookup: (name: string) => Value | undefined): Value {
  const ev = (n: Expr): Value => {
    switch (n.t) {
      case 'int': case 'bool': return n.v;
      case 'lit': return n.v;
      case 'id': case 'ref': case 'field': {
        const v = lookup(n.name);
        if (v === undefined) throw new Error(`unknown name "${n.name}"`);
        return v;
      }
      case 'not': return !ev(n.e);
      case 'neg': return -(ev(n.e) as number);
      case 'bin': {
        // Arithmetic and order read numbers; =, !=, and, or take any value.
        const l = ev(n.l) as number, r = ev(n.r) as number;
        switch (n.op) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case 'div': if (r === 0) throw new Error('division by zero'); return Math.floor(l / r);
          case 'mod': if (r === 0) throw new Error('division by zero'); return ((l % r) + r) % r;
          case '<': return l < r;
          case '<=': return l <= r;
          case '>': return l > r;
          case '>=': return l >= r;
          case '=': return l === r;
          case '!=': return l !== r;
          case 'and': return Boolean(l) && Boolean(r);
          case 'or': return Boolean(l) || Boolean(r);
        }
      }
    }
    throw new Error(`cannot evaluate node ${(n as Expr).t}`);
  };
  return ev(ast);
}

const TLA_OPS: Record<BinOp, string> = { '+': '+', '-': '-', '*': '*', div: '\\div', mod: '%', '<': '<', '<=': '<=', '>': '>', '>=': '>=', '=': '=', '!=': '/=', and: '/\\', or: '\\/' };

export function toTla(ast: Expr, mapRef: (name: string) => string = (name) => name): string {
  const p = (n: Expr): string => {
    switch (n.t) {
      case 'int': return String(n.v);
      case 'bool': return n.v ? 'TRUE' : 'FALSE';
      case 'lit': return `"${n.v}"`;
      case 'id': case 'ref': case 'field': return mapRef(n.name);
      case 'not': return `~(${p(n.e)})`;
      case 'neg': return `(0 - ${p(n.e)})`;
      case 'bin': return `(${p(n.l)} ${TLA_OPS[n.op]} ${p(n.r)})`;
    }
    throw new Error(`cannot print node ${(n as Expr).t}`);
  };
  return p(ast);
}

// How tightly each operator binds, as the parser reads it: or, and, not, the comparisons,
// + and -, then * div mod, then negation; a name or a literal binds tightest.
const BINDS: Record<BinOp, number> = { or: 1, and: 2, '<': 4, '<=': 4, '=': 4, '!=': 4, '>': 4, '>=': 4, '+': 5, '-': 5, '*': 6, div: 6, mod: 6 };
const bindsOf = (n: Expr) => (n.t === 'bin' ? BINDS[n.op] : n.t === 'not' ? 3 : n.t === 'neg' ? 7 : 8);

// The expression as the prose would write it, with the parentheses its shape needs: (a + b) * c,
// a - (b - c), not (x > 1). A comparison takes no comparison on either side unparenthesized.
export function toLabel(ast: Expr): string {
  const wrap = (n: Expr, parens: boolean) => (parens ? `(${p(n)})` : p(n));
  const p = (n: Expr): string => {
    switch (n.t) {
      case 'int': return String(n.v);
      case 'bool': return n.v ? 'true' : 'false';
      case 'lit': return n.v;
      case 'id': case 'ref': case 'field': return n.name;
      case 'not': return `not ${wrap(n.e, n.e.t === 'bin')}`;
      case 'neg': return `-${wrap(n.e, bindsOf(n.e) < 7)}`;
      case 'bin': {
        const level = BINDS[n.op];
        return `${wrap(n.l, level === 4 ? bindsOf(n.l) <= level : bindsOf(n.l) < level)} ${n.op} ${wrap(n.r, bindsOf(n.r) <= level)}`;
      }
    }
    return '?';
  };
  return p(ast);
}
