// Reads what the ledger needs from an Alloy module: facts, asserts, runs and
// checks named for the passages they encode.
import { normalize, short } from '../hash.ts';

export interface AlsItem { kind: string; name: string; passage: string | null }
// A check or run command, with its scope and the overall bound it sets.
export interface AlsCommand { kind: string; name: string; scope: string; overall: number | null; passage: string | null }
export interface Als { items: AlsItem[]; commands: AlsCommand[] }
// A named paragraph with its body: a fact, assert, pred or fun, or a check or run that carries a
// block of its own. Its text is without comments, and its hash is of that text, spaces normalized.
export interface AlsParagraph { kind: string; name: string; text: string; hash: string }

const uncommented = (text: string) => text.replace(/\/\/.*$/gm, '').replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

export function parseAls(text: string): Als {
  const clean = uncommented(text);
  const passageOf = (name: string) => (name.match(/^([SEMRAONGWXKT]\d+)(?:_|$)/) || [])[1] || null;
  const items = [...clean.matchAll(/\b(fact|assert|pred|fun)\s+([A-Za-z_]\w*)/g)].map(m => ({ kind: m[1], name: m[2], passage: passageOf(m[2]) }));
  const commands = [...clean.matchAll(/\b(check|run)\s+([A-Za-z_]\w*)(?:\s*\{[^}]*\})?[ \t]*(for[^\n]*)?/g)].map(m => {
    const scope = (m[3] || '').trim();
    return { kind: m[1], name: m[2], scope, overall: scope.match(/for\s+(\d+)/) ? Number(scope.match(/for\s+(\d+)/)![1]) : null, passage: passageOf(m[2]) };
  });
  return { items, commands };
}

// The named paragraphs of a module with their bodies, each to its matching brace. A command
// without a block of its own has none, and is left out.
export function alsParagraphs(text: string): AlsParagraph[] {
  const clean = uncommented(text);
  const out: AlsParagraph[] = [];
  for (const m of clean.matchAll(/\b(fact|assert|pred|fun|check|run)\s+([A-Za-z_]\w*)/g)) {
    const after = m.index! + m[0].length;
    const open = m[1] === 'check' || m[1] === 'run' ? (/^\s*\{/.test(clean.slice(after)) ? clean.indexOf('{', after) : -1) : clean.indexOf('{', after);
    if (open < 0) continue;
    let depth = 0, close = open;
    for (; close < clean.length; close++) if (clean[close] === '{') depth++; else if (clean[close] === '}' && --depth === 0) break;
    const body = clean.slice(m.index!, close + 1);
    out.push({ kind: m[1], name: m[2], text: body, hash: short(normalize(body)) });
  }
  return out;
}
