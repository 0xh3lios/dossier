// Shared plumbing: data from the server, routes as addresses, the status families, the bound.
import { createContext, useContext, useEffect, useState } from 'react';

export const api = {
  root: '/api/root',
  addresses: '/api/addresses',
  // A page the spine leads to: the root, a group or a component, or what the map does not place.
  node: id => (!id || id === ROOT ? '/api/node' : id === UNPLACED ? '/api/unplaced' : `/api/node/${id}`),
  read: (kind, id) => `/api/read/${kind}/${id}`,
  part: id => `/api/part/${id}`,
  run: id => `/api/part/${id}/run`,
  explain: (id, at) => `/api/part/${id}/explain?at=${at}`,
  trace: (id, entry) => `/api/part/${id}/trace/${entry}`,
  composition: id => `/api/composition/${id}`,
  compositionTrace: (id, property, scenario) => `/api/composition/${id}/trace/${property}/${scenario}`,
  compositionWalk: (id, walk, scenario) => `/api/composition/${id}/walk/${walk}/${scenario}`,
};

const cache = new Map();
export function fetchJSON(url) {
  if (!cache.has(url)) {
    const p = fetch(url).then(r => (r.ok ? r.json() : r.text().then(t => { throw new Error(t || r.statusText); })));
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return cache.get(url);
}
export const invalidate = () => cache.clear();

// Data for a URL, fetched again whenever the live version moves.
export function useData(url, version = 0) {
  const [state, set] = useState({ data: null, error: null, loading: !!url });
  useEffect(() => {
    if (!url) { set({ data: null, error: null, loading: false }); return undefined; }
    let live = true;
    set(s => ({ ...s, loading: true }));
    fetchJSON(url).then(data => live && set({ data, error: null, loading: false }), error => live && set({ data: null, error, loading: false }));
    return () => { live = false; };
  }, [url, version]);
  return state;
}

// ---------- Routes are addresses: every view and selection has a URL ----------
// The root and what the map does not place are pages too, under names no node id can take.
export const ROOT = '@root', UNPLACED = '@unplaced';
export function parseHash(hash = location.hash) {
  const h = hash.replace(/^#/, '') || '/';
  const [path, query = ''] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(query));
  if (parts[0] === 'part' && parts[1]) return { view: 'part', id: parts[1], params };
  if (parts[0] === 'composition' && parts[1]) return { view: 'composition', id: parts[1], params };
  if (parts[0] === 'node' && parts[1]) return { view: 'node', id: parts[1], params };
  if (parts[0] === 'unplaced') return { view: 'node', id: UNPLACED, params };
  return { view: 'node', id: ROOT, params };
}
export function hrefFor(route) {
  // Colons stay readable in addresses: play=walk:W1:2, cell=A1:all-honest.
  const q = Object.entries(route.params || {}).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v).replace(/%3A/gi, ':')}`).join('&');
  const base = route.view === 'part' ? `#/part/${route.id}` : route.view === 'composition' ? `#/composition/${route.id}`
    : route.view === 'node' && route.id && route.id !== ROOT ? (route.id === UNPLACED ? '#/unplaced' : `#/node/${route.id}`) : '#/';
  return q ? `${base}?${q}` : base;
}
// The lens a route is read through: Read by default, Attention, or Workbench, which a model view, a
// review or a run named in the address also opens.
export const LENSES = ['read', 'attention', 'work'];
export function lensOf(route) {
  const p = route.params || {};
  if (p.lens === 'attention') return 'attention';
  if (p.lens === 'work' || p.view === 'model' || p.review) return 'work';
  return 'read';
}
// The same place through another lens. A dossier's model view belongs to the Workbench, so the other
// lenses leave its view, panel and player behind, and keep the behavior and claim.
export function lensHref(route, lens) {
  const dossier = route.view === 'part' || route.view === 'composition';
  const keep = { ...(dossier ? {} : { dossier: route.params.dossier }), behavior: route.params.behavior, claim: route.params.claim };
  return hrefFor({ ...route, params: { ...(lens === 'read' ? {} : { lens }), ...keep } });
}
// A link that keeps the lens the reader is in.
export const inLens = (route, lens) => hrefFor({ ...route, params: { ...(lens && lens !== 'read' ? { lens } : {}), ...(route.params || {}) } });
export function useRoute() {
  const [route, set] = useState(parseHash());
  useEffect(() => {
    const on = () => set(parseHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}
// Change the current view's parameters. A selection or a step replaces the history entry; a view pushes one.
export function setParams(patch, { push = false } = {}) {
  const r = parseHash();
  const params = { ...r.params, ...patch };
  for (const k of Object.keys(params)) if (params[k] == null || params[k] === '') delete params[k];
  const href = hrefFor({ ...r, params });
  if (push) location.hash = href.slice(1);
  else { history.replaceState(null, '', href); dispatchEvent(new HashChangeEvent('hashchange')); }
}

// Narrow panes fold the side lists into the right-hand tabs.
export function useNarrow(query = '(max-width: 1400px)') {
  const [narrow, set] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = e => set(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return narrow;
}

// ---------- The app's shared state ----------
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// ---------- Status families: a status colour never travels without its icon and word ----------
const FAMILY = {
  supported: 'good', 'evidence-available': 'warning', hypothesis: 'warning', contradicted: 'critical', contested: 'serious', current: 'good', stale: 'serious', missing: 'warning', invalid: 'critical',
  proved: 'good', checked: 'good', implied: 'good', backed: 'good', grounded: 'good', 'as-called': 'good', pass: 'good', holds: 'good',
  drawn: 'warning', pending: 'warning', untried: 'warning', owed: 'warning', assumed: 'warning', open: 'warning', aborted: 'warning',
  held: 'serious', unresolved: 'serious', 'violated, accepted': 'serious', accepted: 'serious', unsettled: 'warning',
  violated: 'critical', 'violated, acceptance lapsed': 'critical', lapsed: 'critical', hollow: 'critical', miscalled: 'critical', fail: 'critical', unsaid: 'critical', refused: 'neutral', rejected: 'critical',
  text: 'neutral', given: 'neutral', settled: 'good',
  // A mapping's review: the assessment's result, or none yet.
  unreviewed: 'warning', 'too-broad': 'serious', inconclusive: 'warning',
};
export const ICON = { good: '✓', warning: '○', serious: '△', critical: '✕', neutral: '·' };
export const familyOf = word => FAMILY[word] || 'neutral';
export const KIND = { S: 'State', E: 'Event', M: 'Move', R: 'Refusal', A: 'Always', O: 'Once', N: 'Within', G: 'Given', W: 'Walk', X: 'Seam', K: 'Guarantee', T: 'Words only' };
export const PASSES = ['Fix', 'Write', 'Draw', 'Encode', 'Compose', 'Try', 'Refresh', 'Review', 'Report'];
// A mark that leaves something open: one of the warning, serious or critical families. The one
// definition the prose list's filter uses.
export const isOpenMark = mark => ['warning', 'serious', 'critical'].includes(familyOf(mark));

// The node cap: a graph over it is refused, not drawn.
export const MAX_NODES = 25;

// ---------- Small helpers ----------
export const shortTime = iso => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const stripHash = arg => String(arg).replace(/@[0-9a-f]{8}$/, '');
export function eventText(ev) {
  if (!ev) return '';
  return `${ev.type}${Object.entries(ev).filter(([k]) => k !== 'type').map(([k, v]) => ` ${k} ${v}`).join('')}`;
}
export function argsText(args) {
  return Object.entries(args || {}).map(([k, v]) => ` ${k} ${v}`).join('');
}
// Data at a snapshot without the effect counters, and the counters on their own.
export const dataOf = context => Object.fromEntries(Object.entries(context || {}).filter(([k]) => k !== 'sent'));
export const sentOf = context => Object.fromEntries(Object.entries(context?.sent || {}).filter(([, n]) => n));
export function changedKeys(before, after) {
  if (!before) return [];
  return Object.keys(after || {}).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

// Changes between two sets of marks, per dossier: what the ribbon reports.
export function diffMarks(before, after) {
  const out = [];
  for (const d of after) {
    const old = before?.[d.id];
    if (!old) continue;
    for (const [key, mark] of Object.entries(d.marks || {})) if (old[key] !== undefined && old[key] !== mark) out.push({ dossier: d.id, kind: d.kind, key, before: old[key], after: mark });
    for (const key of Object.keys(old)) if (!(key in (d.marks || {}))) out.push({ dossier: d.id, kind: d.kind, key, before: old[key], after: 'gone' });
    for (const key of Object.keys(d.marks || {})) if (!(key in old)) out.push({ dossier: d.id, kind: d.kind, key, before: 'new', after: d.marks[key] });
  }
  return out;
}
export const marksByDossier = dossiers => Object.fromEntries((dossiers || []).map(d => [d.id, d.marks || {}]));
const seenKey = root => `dossier-explorer:seen:${root}`;
export function loadSeen(root) { try { return JSON.parse(localStorage.getItem(seenKey(root)) || 'null'); } catch { return null; } }
export function saveSeen(root, marks) { try { localStorage.setItem(seenKey(root), JSON.stringify(marks)); } catch { /* storage may be unavailable */ } }

// A dossier's title, when it says more than its id does: `Timelock` adds nothing to `timelock`,
// nor `AllocatorRounding` to `dss-allocator-rounding`, while `Two-key exit budget` does.
const squash = s => String(s).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
export const titleBeyondId = (title, id) => (title && !squash(id).includes(squash(title)) ? title : null);

// ---------- Claims as the report gives them ----------
// The standings from the most to the least in need of a look, each in a word or two. The badge's title
// carries the report's own label.
export const STANDINGS = ['contradicted', 'contested', 'hypothesis', 'evidence-available', 'supported'];
export const STANDING_WORD = { supported: 'supported', 'evidence-available': 'evidence unreviewed', hypothesis: 'hypothesis', contradicted: 'contradicted', contested: 'contested' };
// The overview's counts, keyed as the server sends them, by the standing they count.
const COUNT_KEY = { supported: 'supported', 'evidence-available': 'evidenceAvailable', hypothesis: 'hypotheses', contradicted: 'contradicted', contested: 'contested' };
// Sums of the counts the report gives: a group's or a root's claims by standing. A sum, never a standing.
export function addCounts(into, counts) {
  for (const s of STANDINGS) into[s] = (into[s] || 0) + (counts?.[COUNT_KEY[s]] || 0);
  return into;
}
// The words the Read lens counts claims in, most at stake first: a contradiction the owner accepted reads
// as accepted, apart from one still open.
export const READ_ORDER = ['contradicted', 'contested', 'accepted', 'hypothesis', 'evidence-available', 'supported'];
export const READ_WORD = { ...STANDING_WORD, accepted: 'accepted' };
// A node's counts from the map, or a dossier's from its report, in those words.
export const fromCounts = (c, accepted = 0) => (c ? { claims: c.claims, supported: c.standing.supported, 'evidence-available': c.standing['evidence-available'], hypothesis: c.standing.hypothesis, contested: c.standing.contested, contradicted: c.standing.contradicted - accepted, accepted, stale: c.stale } : null);
export const fromSummary = (s, accepted = s?.accepted || 0) => (s ? { claims: s.claims, supported: s.supported, 'evidence-available': s.evidenceAvailable, hypothesis: s.hypotheses, contested: s.contested, contradicted: s.contradicted - accepted, accepted, stale: s.stale } : null);
// The family of a set of counts: its claim most at stake. A dot in this family stands for the counts and
// always carries their words in its title.
export function familyOfCounts(c) {
  if (!c || !c.claims) return 'neutral';
  if (c.contradicted > 0) return 'critical';
  if (c.contested > 0 || c.accepted > 0) return 'serious';
  if (c['evidence-available'] > 0 || c.hypothesis > 0 || c.stale > 0) return 'warning';
  return 'good';
}
export const countsWords = c => (!c ? '' : !c.claims ? 'no claims' : [...READ_ORDER.filter(s => c[s] > 0).map(s => `${c[s]} ${READ_WORD[s]}`), ...(c.stale ? [`${c.stale} stale`] : [])].join(' · '));
// The author's sentence boundaries, kept: decimal values and dotted names stay inside their sentence.
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('en', { granularity: 'sentence' }) : null;
export function sentences(text) {
  const t = String(text || '').trim();
  if (!t) return [];
  return segmenter ? [...segmenter.segment(t)].map(s => s.segment.trim()).filter(Boolean) : [t];
}
// Markdown inline syntax as plain words, for a line that is one link wide.
export const plainText = text => String(text || '').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/`([^`]*)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\s+/g, ' ').trim();
// Focus the next or the previous element that matches a selector, from the focused one.
export function focusSibling(selector, delta) {
  const all = [...document.querySelectorAll(selector)];
  if (!all.length) return false;
  const at = all.indexOf(document.activeElement);
  const next = all[at < 0 ? (delta > 0 ? 0 : all.length - 1) : Math.max(0, Math.min(all.length - 1, at + delta))];
  next.focus();
  next.scrollIntoView({ block: 'nearest' });
  return true;
}
