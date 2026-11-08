// Shared plumbing: data from the server, routes as addresses, the status families, the bound.
import { createContext, useContext, useEffect, useState } from 'react';

export const api = {
  root: '/api/root',
  addresses: '/api/addresses',
  part: id => `/api/part/${id}`,
  run: id => `/api/part/${id}/run`,
  explain: (id, at) => `/api/part/${id}/explain?at=${at}`,
  trace: (id, entry) => `/api/part/${id}/trace/${entry}`,
  composition: id => `/api/composition/${id}`,
  compositionTrace: (id, property, scenario) => `/api/composition/${id}/trace/${property}/${scenario}`,
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
export function parseHash(hash = location.hash) {
  const h = hash.replace(/^#/, '') || '/';
  const [path, query = ''] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(query));
  if (parts[0] === 'part' && parts[1]) return { view: 'part', id: parts[1], params };
  if (parts[0] === 'composition' && parts[1]) return { view: 'composition', id: parts[1], params };
  return { view: 'board', id: null, params };
}
export function hrefFor(route) {
  // Colons stay readable in addresses: play=walk:W1:2, cell=A1:all-honest.
  const q = Object.entries(route.params || {}).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v).replace(/%3A/gi, ':')}`).join('&');
  const base = route.view === 'part' ? `#/part/${route.id}` : route.view === 'composition' ? `#/composition/${route.id}` : '#/';
  return q ? `${base}?${q}` : base;
}
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
export function useNarrow(query = '(max-width: 1180px)') {
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
  proved: 'good', checked: 'good', implied: 'good', backed: 'good', grounded: 'good', 'as-called': 'good', pass: 'good', holds: 'good',
  drawn: 'warning', pending: 'warning', untried: 'warning', owed: 'warning', assumed: 'warning', open: 'warning', aborted: 'warning',
  held: 'serious', unresolved: 'serious', 'violated, accepted': 'serious', unsettled: 'warning',
  violated: 'critical', 'violated, acceptance lapsed': 'critical', lapsed: 'critical', hollow: 'critical', miscalled: 'critical', fail: 'critical', unsaid: 'critical', refused: 'neutral', rejected: 'critical',
  text: 'neutral', given: 'neutral', settled: 'good',
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
