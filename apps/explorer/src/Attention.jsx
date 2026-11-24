// The Attention lens: only what an owner, a reviewer or the agent must act on beneath the page the spine names, each kind once, in plain
// words. Where a decision settles an item, its `dossier decide` line is prepared with the owner's words
// left blank; the explorer never runs it. A violation the owner accepted is listed apart, last.
import { useState } from 'react';
import { api, hrefFor, plural, sentences, shortTime, UNPLACED, useApp, useData } from './lib.js';
import { DecideLine, Failed, Loading } from './bits.jsx';
import { Crumbs } from './Read.jsx';

const NOTE = {
  'dossier unplaced': 'Not placed', 'dossier unknown': 'Names no dossier', 'dossier retired': 'Still lists a retired dossier',
  'reading unknown': 'Names a behavior or claim its dossier lacks', 'reading outside its node': 'Features a dossier outside its node', 'record unresolved': 'Cites a record that does not resolve',
};
const first = text => sentences(text)[0] || text;
const claimHref = c => hrefFor({ view: c.kind, id: c.id, params: { behavior: c.behavior, claim: c.claim } });
const workHref = (d, params = {}) => hrefFor({ view: d.kind, id: d.id, params: { lens: 'work', ...params } });

function Group({ title, items, children, open = true }) {
  if (!items.length) return null;
  return <section className="at-sec"><h2 className="pg-sec-h">{title} <span className="muted">· {items.length}</span></h2>{open && children}</section>;
}
const Where = ({ d }) => <span className="at-where"><a href={hrefFor({ view: d.kind, id: d.id })}>{d.title}</a></span>;
const Decides = ({ list }) => list?.length ? <div className="at-decide">{list.map((d, i) => <DecideLine key={i} dossier={d.dossier} verb={d.verb} args={d.args} />)}</div> : null;

// Claims a person reads, grouped by the dossier they belong to; a long group shows its first few.
function ClaimsByDossier({ items, note }) {
  const groups = [];
  for (const c of items) { const g = groups.find(x => x.ref === c.ref); if (g) g.items.push(c); else groups.push({ ref: c.ref, d: c, items: [c] }); }
  return <ul className="at-list">{groups.map(g => <ClaimGroup key={g.ref} g={g} note={note} />)}</ul>;
}
function ClaimGroup({ g, note }) {
  const [all, setAll] = useState(false);
  const shown = all ? g.items : g.items.slice(0, 5);
  return <li className="at-item">
    <div className="at-line"><Where d={g.d} /><span className="muted small">{plural(g.items.length, 'claim')}</span></div>
    <ul className="at-claims">{shown.map(c => <li key={`${c.behavior}/${c.claim}`}><a href={claimHref(c)} data-nav>{first(c.statement)}</a>{note && note(c)}</li>)}</ul>
    {g.items.length > shown.length && <button type="button" className="linkbtn small" onClick={() => setAll(true)}>All {g.items.length}</button>}
  </li>;
}

export function AttentionPage({ route }) {
  const { version } = useApp();
  const dossier = route.view === 'part' || route.view === 'composition';
  const { data, error } = useData(dossier ? api.read(route.view, route.id) : api.node(route.id), version);
  if (error) return <Failed error={error} />;
  if (!data) return <Loading what="Attention" />;
  const a = data.attention;
  const title = dossier ? data.title : data.kind === 'unplaced' ? 'Not placed' : data.title || 'Dossiers';
  // On a map that places nothing, the dossiers it does not place are said in one line, as the server
  // counts them; every other note is listed.
  const notes = a.unplaced ? a.notes.filter(n => n.name !== 'dossier unplaced') : a.notes;
  return <div className="pg">
    <Crumbs path={dossier ? (data.places?.[0]?.path || []) : (data.path || [])} here={route.id === '@root' ? null : title} lens="attention" />
    <header className="pg-head"><h1>{title}</h1><p className="pg-lead">{a.total ? `Attention · ${a.total}` : 'Attention is empty here.'}</p></header>
    <Group title="Tripwires" items={[...a.root, ...a.tripwires]}>
      <ul className="at-list">
        {a.root.map((t, i) => <li key={`r${i}`} className="at-item"><div className="at-line"><b>{t.name}</b> <span className="small">{t.where}</span></div></li>)}
        {a.tripwires.map(d => <li key={d.ref} className="at-item"><div className="at-line"><Where d={d} /><a className="small" href={workHref(d)}>Workbench</a></div>{d.tripwires.map((t, i) => <div key={i} className="small"><b>{t.name}</b> {t.where}</div>)}</li>)}
      </ul>
    </Group>
    <Group title="Decisions owed" items={a.decisions}>
      <ul className="at-list">{a.decisions.map(d => <li key={`${d.ref}:${d.property}:${d.scenario}`} className="at-item">
        <div className="at-line"><Where d={d} /><a className="mono small" href={workHref(d, { view: 'model', tab: 'cells', cell: `${d.property}:${d.scenario}` })}>{d.property} under {d.scenario}</a><span className="small">{d.moved.length ? 'the acceptance lapsed' : 'a run broke it'}</span></div>
        {d.text && <div className="small muted">{d.text}</div>}
        <Decides list={d.decide} />
      </li>)}</ul>
    </Group>
    <Group title="Contradicted" items={a.contradicted}>
      <ul className="at-list">{a.contradicted.map(c => <li key={`${c.ref}#${c.behavior}/${c.claim}`} className="at-item">
        <div className="at-line"><Where d={c} /><span className="muted small">{c.behaviorTitle}</span></div>
        <a href={claimHref(c)} data-nav>{c.statement}</a>
        {c.decide.length ? <Decides list={c.decide} /> : <div className="small muted">No decision settles it: the claim or the model changes.</div>}
      </li>)}</ul>
    </Group>
    <Group title="Contested" items={a.contested}><ClaimsByDossier items={a.contested} /></Group>
    <Group title="Open doubts" items={a.doubts}>
      <ul className="at-list">{a.doubts.map(d => <li key={`${d.ref}:${d.doubt}`} className="at-item">
        <div className="at-line"><Where d={d} /><a className="mono small" href={workHref(d, { view: 'model', tab: 'play', play: `doubt:${d.doubt}:a:0` })}>{d.doubt}</a><span className="small muted">assumed {d.assumed}</span></div>
        {d.text && <div>{d.text}</div>}
        {Object.entries(d.walks || {}).map(([alt, text]) => <div key={alt} className="small"><b>{alt}</b> <span className="mono">{text}</span></div>)}
        <Decides list={d.decide} />
      </li>)}</ul>
    </Group>
    <Group title="Evidence awaiting review" items={a.unreviewed}><ClaimsByDossier items={a.unreviewed} /></Group>
    <Group title="Stale reviews" items={a.reviews}>
      <ul className="at-list">{a.reviews.map(r => <li key={`${r.ref}:${r.file}`} className="at-item"><div className="at-line"><Where d={r} /><a className="mono small" href={workHref(r, { review: r.file })}>{r.file.replace(/^reviews\//, '')}</a></div>{r.reasons.slice(0, 2).map(x => <div key={x} className="small muted">{x}</div>)}</li>)}</ul>
    </Group>
    <Group title="Reviews owed" items={a.reviewsOwed}>
      <ul className="at-list">{a.reviewsOwed.map(d => <li key={d.ref} className="at-item"><div className="at-line"><Where d={d} /><span className="small muted" title={d.where}>no current review covers the whole dossier</span></div></li>)}</ul>
    </Group>
    {a.unplaced > 0 && <section className="at-sec"><h2 className="pg-sec-h">Map <span className="muted">· 1</span></h2>
      <ul className="at-list"><li className="at-item"><div className="at-line"><span>No map yet: <a href={hrefFor({ view: 'node', id: UNPLACED })}>{plural(a.unplaced, 'dossier')}</a> not placed.</span></div><div className="small muted mono">dossier place &lt;dossier&gt; &lt;component&gt; --title &lt;words&gt; --lead &lt;words&gt;</div></li></ul>
    </section>}
    <Group title="Map notes" items={notes}>
      <ul className="at-list">{notes.map((n, i) => <li key={i} className="at-item"><div className="at-line"><span>{NOTE[n.name] || n.name}</span><span className="mono small">{n.where}</span>{n.node && <a className="small" href={hrefFor({ view: 'node', id: n.node })}>{n.node}</a>}</div></li>)}</ul>
    </Group>
    <Group title="Accepted violations" items={a.accepted}>
      <ul className="at-list">{a.accepted.map(c => <li key={`${c.ref}#${c.behavior}/${c.claim}`} className="at-item">
        <div className="at-line"><Where d={c} /><span className="muted small">{c.behaviorTitle}</span></div>
        <a href={claimHref(c)} data-nav>{c.statement}</a>
        {c.accepted.map((x, i) => <div key={i} className="small">“{x.words}” <span className="muted">{x.passage}{x.scenario ? ` under ${x.scenario}` : ''} · {shortTime(x.time)}</span></div>)}
      </li>)}</ul>
    </Group>
  </div>;
}
