// The Workbench at a node: every dossier its subtree reaches, under the next step verify routes it to,
// from Fix to Report with the empty steps shown, each with its claims counted, why, and its flags and
// tripwires. A dossier leads on to its claims in full, its chart or its system. Nothing is ranked.
import { useMemo } from 'react';
import { Input, SearchField, Switch, ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { addCounts, hrefFor, PASSES, plural, ROOT, setParams, titleBeyondId, UNPLACED, useApp } from './lib.js';
import { Counts, Flags } from './bits.jsx';
import { Crumbs } from './Read.jsx';

const isOpen = d => d.route?.pass !== 'Report' || (d.tripwires?.length || 0) > 0;
// The dossiers a node's subtree reaches: the entries of its components and the compositions sited in it.
function refsUnder(node) {
  const out = new Set();
  const walk = n => { if (n.kind === 'component') for (const d of n.dossiers) out.add(d.ref); else for (const c of [...n.groups, ...n.components]) walk(c); for (const r of n.sited) out.add(r); };
  walk(node);
  return out;
}
function findNode(tree, id) {
  if (!tree) return null;
  const walk = n => (n.id === id ? n : n.kind === 'component' ? null : [...n.groups, ...n.components].map(walk).find(Boolean) || null);
  return walk(tree);
}

export function Board({ route }) {
  const { root, changes } = useApp();
  const params = route.params;
  const kind = ['part', 'composition'].includes(params.kind) ? params.kind : 'all';
  const q = params.q || '', openOnly = params.open === '1';
  const changed = useMemo(() => new Set(changes.map(c => c.dossier)), [changes]);
  const tree = root?.map?.tree;
  const node = route.id === ROOT || route.id === UNPLACED ? null : findNode(tree, route.id);
  const refs = route.id === ROOT ? null : route.id === UNPLACED ? new Set(root?.map?.unplaced?.dossiers ?? (tree ? [] : (root?.dossiers || []).map(d => `${d.kind}s/${d.id}`))) : node ? refsUnder(node) : new Set();
  const all = (root?.dossiers || []).filter(d => !refs || refs.has(`${d.kind}s/${d.id}`));
  const list = all.filter(d => (kind === 'all' || d.kind === kind) && (!openOnly || isOpen(d)) &&
    (!q || [d.id, d.title, d.module, ...(d.route?.why || []), ...(d.flags || []).map(f => f.name), ...(d.tripwires || []).map(t => t.name)].join(' ').toLowerCase().includes(q.toLowerCase())));
  const groups = PASSES.map(p => ({ name: p, list: list.filter(d => d.route?.pass === p) }));
  const other = list.filter(d => !PASSES.includes(d.route?.pass));
  const title = route.id === ROOT ? root?.title || 'Dossiers' : route.id === UNPLACED ? 'Not placed' : node?.title || route.id;
  const r = route.id === ROOT ? root?.route : null;
  return <div className="pg is-wide">
    {route.id !== ROOT && <Crumbs here={title} lens="work" />}
    <header className="pg-head"><h1>{title}</h1>
      <div className="pg-facts"><span>{plural(all.filter(d => d.kind === 'part').length, 'part')} · {plural(all.filter(d => d.kind === 'composition').length, 'composition')}</span>
        {r && <span className="ov-next"><span className="muted">next</span> <b>{r.pass}</b>{r.why?.[0] ? <span className="muted"> {r.why[0]}</span> : null}</span>}
        {route.id === ROOT && root?.tripwires?.length ? <Flags tripwires={root.tripwires} /> : null}
      </div>
    </header>
    <div className="toolbar ov-bar">
      <SearchField className="search is-inline" aria-label="Filter dossiers" value={q} onChange={v => setParams({ q: v || null })}><Input placeholder="Filter" /></SearchField>
      <ToggleButtonGroup className="seg" aria-label="Kind" selectionMode="single" disallowEmptySelection selectedKeys={[kind]} onSelectionChange={k => { const v = [...k][0]; setParams({ kind: v === 'all' ? null : v }); }}>
        <ToggleButton id="all">All</ToggleButton><ToggleButton id="part">Parts</ToggleButton><ToggleButton id="composition">Compositions</ToggleButton>
      </ToggleButtonGroup>
      <Switch className="switch" isSelected={openOnly} onChange={v => setParams({ open: v ? '1' : null })}><span className="switch-track" aria-hidden="true" />Open items</Switch>
      {list.length !== all.length && <span className="muted">{list.length} of {all.length}</span>}
    </div>
    <div className="ov-body">
      {[...groups, ...(other.length ? [{ name: 'Other', list: other }] : [])].map(g => !g.list.length
        ? (!q ? <section key={g.name} className="og is-empty"><h2 className="og-h">{g.name} <span className="muted">0</span></h2></section> : null)
        : <section key={g.name} className="og"><h2 className="og-h"><span className="og-name">{g.name}</span> <span className="muted og-sum">{plural(g.list.length, 'dossier')}</span></h2>
          <ul className="og-rows">{g.list.map(d => <Row key={`${d.kind}:${d.id}`} d={d} changed={changed.has(d.id)} />)}</ul>
        </section>)}
      {!list.length && <div className="pad muted">No dossier matches.</div>}
    </div>
  </div>;
}

function Row({ d, changed }) {
  const beyond = titleBeyondId(d.title, d.id);
  const model = d.kind === 'part' ? 'Chart' : 'System';
  return <li className="orow">
    <div className="orow-main">
      <div className="orow-line">
        {changed && <span className="dot-changed" title="changed"><span className="sr-only">changed</span></span>}
        <a className="orow-title" href={hrefFor({ view: d.kind, id: d.id, params: { lens: 'work' } })} data-nav>{beyond || d.title || d.id}</a>
        {beyond && <span className="mono muted">{d.id}</span>}
        {d.kind === 'composition' && <span className="chip">composition</span>}
        <a className="chip" href={hrefFor({ view: d.kind, id: d.id, params: { view: 'model' } })}>{model}</a>
      </div>
      {d.route?.why?.length > 0 && <div className="orow-why" title={d.route.why.join('\n')}>{d.route.why[0]}{d.route.why.length > 1 ? ` +${d.route.why.length - 1}` : ''}</div>}
      {d.members?.length > 0 && <div className="orow-members"><span className="muted">members</span>{d.members.map(m => <a key={m} className="chip mono" href={hrefFor({ view: 'part', id: m, params: { lens: 'work', from: d.id } })}>{m}</a>)}</div>}
    </div>
    <div className="orow-side">
      <Counts counts={addCounts({}, d.behaviorSummary)} stale={d.behaviorSummary.stale} />
      <Flags tripwires={d.tripwires} flags={d.flags} />
    </div>
  </li>;
}
