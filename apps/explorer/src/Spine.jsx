// The spine: the map's tree, always beside the page, each node with a dot for how its claims stand.
// Groups fold, a filter narrows it, and its links keep the lens the reader is in. What the map does not
// place hangs below it as one node. The root is not a row: the title in the top bar opens it.
import { useEffect, useMemo, useState } from 'react';
import { Input, SearchField } from 'react-aria-components';
import { familyOfCounts, fromCounts, fromSummary, hrefFor, ICON, READ_ORDER, READ_WORD, ROOT, UNPLACED, countsWords } from './lib.js';
import { Badge } from './bits.jsx';

// A dot in the family of the counts it stands for: an icon in that family's colour, with the counts in
// words for a screen reader and on hover, so the colour never travels alone. A dot with no counts to
// stand for is given the words that say why.
export function Dot({ c, why }) {
  const f = familyOfCounts(c), words = why || countsWords(c);
  return <span className="dot" data-family={f} title={words} aria-label={words} role="img">{ICON[f]}</span>;
}
// Claims by standing in the Read lens's words, the stale ones after them.
export function ReadCounts({ c, words = false }) {
  if (!c) return null;
  if (!c.claims) return <span className="counts muted small">no claims</span>;
  return <span className="counts">
    {READ_ORDER.filter(s => c[s] > 0).map(s => <Badge key={s} word={s} small label={words ? `${c[s]} ${READ_WORD[s]}` : String(c[s])} title={`${c[s]} ${READ_WORD[s]}`} />)}
    {c.stale > 0 && <Badge word="stale" small label={words ? `${c.stale} stale` : String(c.stale)} title={`${c.stale} stale`} />}
  </span>;
}

const componentsUnder = n => (n.kind === 'component' ? 1 : [...n.groups, ...n.components].reduce((k, c) => k + componentsUnder(c), 0));
const matches = (n, q) => `${n.title} ${n.id}`.toLowerCase().includes(q);
// The ids on the way from the root to a node, the node included.
function pathTo(tree, id) {
  const walk = (n, trail) => { if (n.id === id) return [...trail, n.id]; if (n.kind === 'component') return null; for (const c of [...n.groups, ...n.components]) { const p = walk(c, [...trail, n.id]); if (p) return p; } return null; };
  return tree ? walk(tree, []) || [] : [];
}

export function Spine({ root, route, lens, here, onNavigate }) {
  const tree = root?.map?.tree || null;
  const unplaced = root?.map?.unplaced?.dossiers ?? (tree ? [] : (root?.dossiers || []).map(d => `${d.kind}s/${d.id}`));
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(() => new Set(tree ? tree.groups.map(g => g.id) : []));
  // On a root whose map places nothing, the one node there is lists every live dossier from the start.
  const [openUnplaced, setOpenUnplaced] = useState(() => !tree || (!tree.groups.length && !tree.components.length));
  const current = route.view === 'node' ? route.id : here;
  // The way to the page shown stays open.
  useEffect(() => { const p = pathTo(tree, current === ROOT ? null : current); if (p.length) setOpen(o => new Set([...o, ...p.filter(Boolean)])); }, [current, tree]);
  const l = lens && lens !== 'read' ? { lens } : {};
  const link = id => hrefFor({ view: 'node', id, params: l });
  const byRef = useMemo(() => new Map((root?.dossiers || []).map(d => [`${d.kind}s/${d.id}`, d])), [root]);
  const query = q.trim().toLowerCase();
  const visible = n => !query || matches(n, query) || (n.kind !== 'component' && [...n.groups, ...n.components].some(visible));
  const row = (n, depth) => {
    if (!visible(n)) return null;
    const c = fromCounts(n.counts, root?.accepted?.[n.id] || 0);
    const isOpen = query || open.has(n.id), group = n.kind === 'group';
    return <li key={n.id} role="treeitem" aria-expanded={group ? Boolean(isOpen) : undefined} aria-selected={current === n.id}>
      <div className={`sp-row${current === n.id ? ' is-here' : ''}`} style={{ paddingLeft: 6 + depth * 12 }}>
        {group ? <button type="button" className="sp-fold" aria-label={isOpen ? `Fold ${n.title}` : `Open ${n.title}`} onClick={() => setOpen(o => { const x = new Set(o); x.has(n.id) ? x.delete(n.id) : x.add(n.id); return x; })}><span className="chev" aria-hidden="true">{isOpen ? '▾' : '▸'}</span></button> : <span className="sp-fold" />}
        <Dot c={c} />
        <a href={link(n.id)} className="sp-title" onClick={onNavigate}>{n.title}</a>
        {group && <span className="sp-n">{componentsUnder(n)}</span>}
      </div>
      {group && isOpen && <ul role="group">{[...n.groups, ...n.components].map(x => row(x, depth + 1))}</ul>}
    </li>;
  };
  const shownUnplaced = unplaced.filter(ref => !query || ref.includes(query) || (byRef.get(ref)?.title || '').toLowerCase().includes(query));
  return <nav className="spine" aria-label="Map">
    <div className="sp-head">
      <SearchField className="search" aria-label="Filter the map" value={q} onChange={setQ}><Input placeholder="Filter the map" /></SearchField>
    </div>
    <ul className="sp-tree" role="tree" aria-label="Map">
      {tree &&[...tree.groups, ...tree.components].map(n => row(n, 0))}
      {(unplaced.length > 0 && (!query || shownUnplaced.length > 0 || 'not placed'.includes(query))) && <li role="treeitem" aria-expanded={openUnplaced || Boolean(query)} aria-selected={current === UNPLACED}>
        <div className={`sp-row is-unplaced${current === UNPLACED ? ' is-here' : ''}`}>
          <button type="button" className="sp-fold" aria-label={openUnplaced ? 'Fold Not placed' : 'Open Not placed'} onClick={() => setOpenUnplaced(o => !o)}><span className="chev" aria-hidden="true">{openUnplaced || query ? '▾' : '▸'}</span></button>
          {/* Verify counts nothing while the map does not read, so the dot says that instead. */}
          <Dot c={fromCounts(root?.map?.unplaced?.counts, root?.accepted?.[UNPLACED] || 0)} why={tree ? null : 'the map does not read'} />
          <a href={link(UNPLACED)} className="sp-title" onClick={onNavigate}>Not placed</a><span className="sp-n">{unplaced.length}</span>
        </div>
        {(openUnplaced || query) && <ul role="group">{shownUnplaced.map(ref => {
          const d = byRef.get(ref);
          if (!d) return null;
          return <li key={ref} role="treeitem" aria-selected={here === ref}><div className={`sp-row${here === ref ? ' is-here' : ''}`} style={{ paddingLeft: 18 }}><span className="sp-fold" /><Dot c={fromSummary(d.behaviorSummary, d.accepted)} /><a href={hrefFor({ view: d.kind, id: d.id, params: l })} className="sp-title" onClick={onNavigate}>{d.title}</a></div></li>;
        })}</ul>}
      </li>}
    </ul>
  </nav>;
}
