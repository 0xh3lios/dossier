// What each mark, cell, walk mark and flag means, in the words of docs/reference/marks.md, the page
// that defines them. The explorer quotes the page and never words a mark itself, so the page and the
// explorer cannot drift apart; qualification/tests/explore.test.ts holds every mark verify gives
// Harbor to a row of the page.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// A row of the page's component marks table: the mark, the passage kinds it is for, the tier the row
// is limited to, if any, and what it means.
interface MarkRow { mark: string; kinds: Set<string> | 'any'; tier: string | null; means: string; for: string }
export interface Meanings {
  // The page's rows as the help dialog lists them: each component mark with the kinds it is for, and each cell.
  legend: { marks: { mark: string; for: string; means: string }[]; cells: { mark: string; means: string }[] };
  mark(kind: string, mark: string, tier: string): string | null;
  cell(mark: string): string | null;
  walk(mark: string): string | null;
  flag(name: string): string | null;
}

// The page's sections, by heading, each as its table rows: the cells of every row after the separator.
function tables(text: string): Record<string, string[][]> {
  const out: Record<string, string[][]> = {};
  let section = '';
  for (const line of text.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) { section = heading[1]; continue; }
    if (!line.startsWith('|') || /^\|\s*-/.test(line)) continue;
    const cells = line.slice(1, line.endsWith('|') ? -1 : undefined).split('|').map(c => c.trim());
    (out[section] ||= []).push(cells);
  }
  // Each table's first row is its header.
  for (const rows of Object.values(out)) rows.shift();
  return out;
}

const plain = (cell: string) => cell.replace(/`/g, '');
const named = (cell: string) => cell.match(/^`([^`]+)`$/)?.[1] ?? null;

export function readMeanings(pluginRoot: string): Meanings {
  const page = tables(readFileSync(join(pluginRoot, 'docs', 'reference', 'marks.md'), 'utf8'));
  const marks: MarkRow[] = (page['Component marks'] || []).flatMap(([mark, forText, means]) => {
    const name = named(mark || '');
    if (!name || !forText || !means) return [];
    const tier = forText.match(/in a (charted|modeled) component/)?.[1] ?? null;
    const kinds = forText === 'any' ? 'any' as const : new Set(forText.match(/\b[A-Z]\b/g) || []);
    return [{ mark: name, kinds, tier, means: plain(means), for: forText }];
  });
  const byName = (section: string) => new Map((page[section] || []).flatMap(([name, means]) => { const n = named(name || ''); return n && means ? [[n, plain(means)] as const] : []; }));
  const cells = byName('Cells'), walks = byName('Walks in a system'), flags = byName('Flags');
  return {
    legend: { marks: marks.map(r => ({ mark: r.mark, for: r.for, means: r.means })), cells: [...cells].map(([mark, means]) => ({ mark, means })) },
    // A row for the tier first, then one for every tier.
    mark(kind, mark, tier) {
      const fits = marks.filter(r => r.mark === mark && (r.kinds === 'any' || r.kinds.has(kind)) && (!r.tier || r.tier === tier));
      return (fits.find(r => r.tier === tier) || fits[0])?.means ?? null;
    },
    cell: mark => cells.get(mark) ?? null,
    walk: mark => walks.get(mark) ?? null,
    flag: name => flags.get(name) ?? null,
  };
}
