// The pages agree with the tool and with each other: every relative link and anchor resolves,
// every known defect a user could meet is listed among the limits, and a host's mechanism is
// never given for one host alone. packaging.test.ts holds the pages to what the plugin ships.
//   node --test qualification/tests/pages.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const markdownUnder = (dir: string) => readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' }).filter(path => path.endsWith('.md')).map(path => join(dir, path)).sort();
const userPages = ['README.md', ...markdownUnder('docs')];
const pages = [...userPages, ...markdownUnder('spec'), ...markdownUnder('skills'), 'qualification/README.md', 'qualification/conformance/README.md', 'qualification/differential/README.md'];
const withoutCode = (text: string) => text.replace(/^ *```[\s\S]*?^ *```/gm, '');

// GitHub's heading anchors: lower case, punctuation dropped, spaces as hyphens, repeats numbered.
function anchors(path: string): Set<string> {
  const seen = new Map<string, number>(), found = new Set<string>();
  for (const line of withoutCode(read(path)).split('\n')) {
    const heading = line.match(/^#{1,6} +(.+?) *#*$/);
    if (!heading) continue;
    const base = heading[1].toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    found.add(count ? `${base}-${count}` : base);
  }
  return found;
}

test('every relative link and anchor in the pages resolves', () => {
  const broken: string[] = [];
  for (const page of pages) {
    for (const [, href] of withoutCode(read(page)).matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:/i.test(href)) continue;
      const [path, anchor] = href.split('#');
      const target = path ? normalize(join(dirname(page), path)) : page;
      if (!existsSync(join(root, target))) { broken.push(`${page}: ${href} (no such file)`); continue; }
      if (anchor && target.endsWith('.md') && statSync(join(root, target)).isFile() && !anchors(target).has(anchor)) broken.push(`${page}: ${href} (no such heading)`);
    }
  }
  assert.deepEqual(broken, []);
});

test('every known defect a user could meet is disclosed among the limits', () => {
  // A test marked todo records a defect a later release fixes. Its reason ends with
  // "(limits: <the bold title of its bullet in docs/explanation/limits.md>)" or "(maintainer only)".
  const limits = read('docs/explanation/limits.md');
  const problems: string[] = [];
  for (const file of readdirSync(join(root, 'qualification/tests')).filter(name => name.endsWith('.test.ts'))) {
    for (const [, reason] of read(join('qualification/tests', file)).matchAll(/\btodo:\s*'((?:[^'\\]|\\.)*)'/g)) {
      const disclosed = reason.match(/\(limits: ([^)]+)\)$/);
      if (disclosed) { if (!limits.includes(`**${disclosed[1]}.**`)) problems.push(`${file}: no limit titled "${disclosed[1]}"`); }
      else if (!/\(maintainer only\)$/.test(reason)) problems.push(`${file}: "${reason}" names neither a limit nor maintainer only`);
    }
  }
  assert.deepEqual(problems, []);
});

test('a paragraph that names one host\'s mechanism names the other host or speaks of your agent', () => {
  // The install sections headed by a host's name are that host's own, side by side with the other.
  const claude = /Claude Code|\.claude\/|\/dossier:|Bash\(/, openai = /ChatGPT|Codex/, either = /\b(?:your|an|the|each|either) (?:agent|host)\b/i;
  const oneSided: string[] = [];
  for (const page of userPages) {
    let heading = '';
    for (const block of withoutCode(read(page)).split(/\n\s*\n/)) {
      const title = block.match(/^#{1,6} +(.+)$/m);
      if (title) heading = title[1].trim();
      if (['ChatGPT', 'Claude Code'].includes(heading)) continue;
      const body = block.replace(/^#{1,6} .*$/gm, '');
      if ((claude.test(body) && !openai.test(body) && !either.test(body)) || (openai.test(body) && !claude.test(body) && !either.test(body))) oneSided.push(`${page}: ${body.trim().slice(0, 80)}`);
    }
  }
  assert.deepEqual(oneSided, []);
});

test('the pages call an actor\'s mode malicious, never compromised', () => {
  // One word for one mode: "captured" stays in scenario names such as governance-captured.
  const pagesAndDescriptions = [...userPages, ...markdownUnder('skills'), 'plugin.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json'];
  const second = pagesAndDescriptions.flatMap(page => read(page).split('\n').flatMap((line, i) => /\bcompromis(?:e|ed|es|ing)\b/i.test(line) ? [`${page}:${i + 1}`] : []));
  assert.deepEqual(second, []);
});
