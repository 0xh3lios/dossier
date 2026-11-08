// doubts.md: one entry per doubt, posed as two walks that differ.
//   ## D1
//   on: M1 M2 W3
//   assumed: a
//   <why>
//   Walk a: ...
//   Walk b: ...
// Whether a doubt is open is not written here: the owner's answer decision, bound to the
// alternatives' hash, closes it. The analysis sets status and answer from the decisions.
import { normalize, short } from '../hash.ts';

export interface Doubt {
  id: string;
  hash: string;
  on: string[];
  status: 'open' | 'closed';
  answer: string | null;
  assumed: string | null;
  walks: Record<string, string>;
  // The doubt's own words: the lines under its header that are not on:, assumed: or a walk.
  text: string;
  malformed: string[];
}

export function parseDoubts(text: string): Doubt[] {
  const entries: Doubt[] = [];
  let cur: Doubt | null = null;
  let authored: string[] = [];
  const finish = () => { if (cur) cur.hash = short(normalize(authored.join('\n'))); };
  const start = (id: string, malformed: string[] = []): Doubt => ({ id, hash: '', on: [], status: 'open', answer: null, assumed: null, walks: {}, text: '', malformed });
  for (const line of text.split(/\r?\n/)) {
    const head = line.match(/^##\s+(D\d+)\s*$/);
    if (head) { finish(); cur = start(head[1]); authored = [line]; entries.push(cur); continue; }
    if (/^##\s+D\d+/.test(line)) { finish(); cur = start((line.match(/D\d+/) || [])[0]!, ['the header is "## D<n>" alone; on: and assumed: follow on their own lines']); authored = [line]; entries.push(cur); continue; }
    if (!cur) continue;
    authored.push(line);
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^on:\s*(.+)$/))) { cur.on = m[1].split(/[,\s]+/).filter(Boolean); continue; }
    if (/^\s*status:/.test(line)) { cur.malformed.push('status: is not written by hand; the owner\'s answer decision closes a doubt'); continue; }
    if ((m = line.match(/^assumed:\s*([ab])\s*$/))) { cur.assumed = m[1]; continue; }
    if (/^assumed:/.test(line)) { cur.malformed.push('assumed: is a or b'); continue; }
    if ((m = line.match(/^Walk ([ab]):\s*(.+)$/))) { cur.walks[m[1]] = m[2]; continue; }
    if (line.trim()) cur.text = cur.text ? `${cur.text} ${line.trim()}` : line.trim();
  }
  finish();
  for (const e of entries) {
    if (entries.filter(other => other.id === e.id).length > 1) e.malformed.push('doubt id appears more than once');
    if (e.on.length === 0) e.malformed.push('needs "on: <passage ids>"');
    if (!e.assumed) e.malformed.push('needs "assumed: a" or "assumed: b"');
    if (!e.walks.a || !e.walks.b) e.malformed.push('needs a "Walk a:" line and a "Walk b:" line');
  }
  return entries;
}
