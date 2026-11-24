// The Read lens: the root and each group with what it holds, a component merging the dossiers it holds,
// one dossier read whole, and what the map does not place. Claims read in plain words; selecting one opens
// why it holds beside the page. Every count is the map's or the report's, never worked out here.
import { useEffect, useRef } from 'react';
import { api, fromCounts, fromSummary, hrefFor, plainText, plural, READ_WORD, sentences, setParams, UNPLACED, useApp, useData } from './lib.js';
import { Badge, Failed, Loading } from './bits.jsx';
import { Dot, ReadCounts } from './Spine.jsx';
import { Inspector } from './Inspector.jsx';
import { selectionOf } from './behavior-navigation.js';

// A reading page with why its selected claim holds beside it; on a narrow window, over it. A behavior
// selected alone is marked on the page and opens nothing beside it.
function ReadFrame({ holdings, params, children }) {
  const sel = selectionOf(holdings, params);
  const claim = sel?.c ? sel : null;
  return <div className={`rd${claim ? ' has-why' : ''}`}>
    <div className="rd-page">{children}</div>
    {claim && <aside className="rd-why" aria-label="Why this holds"><Inspector claim={claim.c} behavior={claim.b.id} dossier={claim.h.ref} onClose={() => setParams({ claim: null, behavior: null, dossier: null })} /></aside>}
  </div>;
}

// The breadcrumb from the root to a page, in the lens the reader is in.
export function Crumbs({ path = [], here, lens }) {
  const { root } = useApp();
  const l = lens && lens !== 'read' ? { lens } : {};
  return <nav className="pg-crumbs" aria-label="Where">
    <a href={hrefFor({ view: 'node', params: l })}>{root?.title || 'Dossiers'}</a>
    {path.map(n => <span key={n.id}><span className="sep" aria-hidden="true">›</span><a href={hrefFor({ view: 'node', id: n.id, params: l })}>{n.title}</a></span>)}
    {here && <span><span className="sep" aria-hidden="true">›</span><span>{here}</span></span>}
  </nav>;
}

// What a page is about, in a sentence, and how its claims stand.
function Head({ title, lead, counts, kind, children }) {
  return <header className="pg-head">
    <h1>{title}</h1>
    {kind && <div className="pg-kind">{kind}</div>}
    {lead && <p className="pg-lead">{plainText(lead)}</p>}
    {counts && <div className="pg-facts"><ReadCounts c={counts} words /></div>}
    {children}
  </header>;
}

// One claim's line: its first sentence, the rest beneath, and its standing in a word. A claim of the
// behavior an address selects is marked as part of it.
function ClaimLine({ c, selected, marked, href }) {
  const [first, ...more] = sentences(c.statement);
  const word = c.accepted ? 'accepted' : c.standing;
  return <li className={`cl${selected ? ' is-on' : marked ? ' is-in' : ''}`}>
    <a className="cl-link" href={href} data-nav aria-current={selected ? 'true' : undefined}>
      <span className="cl-text">{first}{more.length > 0 && <span className="cl-more"> {more.join(' ')}</span>}</span>
      <span className="cl-tags"><Badge word={word === 'accepted' ? 'accepted' : word} label={READ_WORD[word]} small />{c.freshness !== 'current' && <Badge word={c.freshness} small />}</span>
    </a>
  </li>;
}

// The claims a section lists, a dossier's heading only where more than one dossier speaks.
function Section({ title, count, children }) {
  return <section className="pg-sec"><h2 className="pg-sec-h">{title} <span className="muted">· {count}</span></h2>{children}</section>;
}
const claimHref = (base, h, b, c) => hrefFor({ ...base, params: { ...base.params, dossier: base.dossier ? h.ref : undefined, behavior: b.id, claim: c.id } });

// Behaviors list the descriptive claims; Guarantees the requirements, each with its assumptions; Relies on
// what the parts held whole rest on: their Guarantee passages with the backing, and their Givens.
export function Holdings({ holdings, base, params }) {
  const behaviors = holdings.map(h => ({ h, list: h.behaviors.map(b => ({ b, claims: b.claims.filter(c => c.kind !== 'requirement') })).filter(x => x.claims.length) })).filter(x => x.list.length);
  const guarantees = holdings.map(h => ({ h, list: h.behaviors.flatMap(b => b.claims.filter(c => c.kind === 'requirement').map(c => ({ b, c }))) })).filter(x => x.list.length);
  const relies = holdings.filter(h => h.relies && (h.relies.guarantees.length || h.relies.givens.length));
  // What the address selects: one claim, or a behavior alone, marked wherever its claims are listed.
  const sel = selectionOf(holdings, params);
  const isSelected = (h, b, c) => Boolean(sel?.c && sel.h === h && sel.b === b && sel.c === c);
  const inSelected = (h, b) => Boolean(sel && !sel.c && sel.h === h && sel.b === b);
  const several = list => list.length > 1;
  const dossierHead = h => <h3 className="pg-dossier"><a href={hrefFor({ view: h.kind, id: h.id })}>{h.title}</a> <span className="mono muted">{h.id}</span>{h.select && <span className="muted"> · {h.select.join(', ')}</span>}</h3>;
  return <>
    {behaviors.length > 0 && <Section title="Behaviors" count={behaviors.reduce((n, x) => n + x.list.length, 0)}>
      {behaviors.map(({ h, list }) => <div key={h.ref}>
        {several(behaviors) && dossierHead(h)}
        {list.map(({ b, claims }) => <div key={b.id} className={`pg-beh${inSelected(h, b) ? ' is-on' : ''}`} aria-current={inSelected(h, b) ? 'true' : undefined}>
          <div className="pg-beh-h">{b.title}</div>
          <ul className="cls">{claims.map(c => <ClaimLine key={c.id} c={c} selected={isSelected(h, b, c)} href={claimHref(base, h, b, c)} />)}</ul>
        </div>)}
      </div>)}
    </Section>}
    {guarantees.length > 0 && <Section title="Guarantees" count={guarantees.reduce((n, x) => n + x.list.length, 0)}>
      {guarantees.map(({ h, list }) => <div key={h.ref}>
        {several(guarantees) && dossierHead(h)}
        <ul className="cls">{list.map(({ b, c }) => <div key={`${b.id}/${c.id}`}>
          <ClaimLine c={c} selected={isSelected(h, b, c)} marked={inSelected(h, b)} href={claimHref(base, h, b, c)} />
          {c.assumptions.length > 0 && <ul className="pg-assume" aria-label="Assumptions">{c.assumptions.map(a => <li key={a}>{a}</li>)}</ul>}
        </div>)}</ul>
      </div>)}
    </Section>}
    {relies.length > 0 && <Section title="Relies on" count={relies.reduce((n, h) => n + h.relies.guarantees.length + h.relies.givens.length, 0)}>
      {relies.map(h => <div key={h.ref}>
        {several(relies) && dossierHead(h)}
        <ul className="rel">
          {h.relies.guarantees.map(k => <li key={k.id}>
            <a href={hrefFor({ view: h.kind, id: h.id, params: { view: 'model', sel: k.id } })}>{k.text}</a>
            <span className="rel-tag"><Badge word={k.status} small />{k.names && <span className="mono muted small">{k.names}</span>}</span>
            {k.reason && <div className="small muted">{k.reason}</div>}
          </li>)}
          {h.relies.givens.map(g => <li key={g.id}>
            <a href={hrefFor({ view: h.kind, id: h.id, params: { view: 'model', sel: g.id } })}>{g.assumption ? `Given that ${g.assumption}` : g.text}</a>
            <span className="rel-tag"><Badge word="given" label="assumed" small /></span>
            {g.otherwise && <div className="small muted">If not, {g.otherwise}</div>}
          </li>)}
        </ul>
      </div>)}
    </Section>}
  </>;
}

// A dossier in a row: its title, its lead and how its claims stand.
export function DossierRow({ d, lens }) {
  const c = fromSummary(d.summary);
  return <li className="drow">
    <Dot c={c} />
    <div className="drow-main">
      <a className="drow-title" href={hrefFor({ view: d.kind, id: d.id, params: lens && lens !== 'read' ? { lens } : {} })} data-nav>{d.title}</a>
      <span className="mono muted">{d.id}</span>{d.kind === 'composition' && <span className="chip">composition</span>}
      {d.lead && <div className="drow-lead">{plainText(d.lead)}</div>}
    </div>
    <ReadCounts c={c} />
  </li>;
}
function Featured({ list }) {
  if (!list?.length) return null;
  return <Section title="Featured" count={list.length}>
    <ul className="feat">{list.map(f => <li key={`${f.ref}#${f.behavior}/${f.claim || ''}`}>
      <a href={hrefFor({ view: f.kind, id: f.id, params: { behavior: f.behavior, claim: f.claim } })}>{f.statement || f.behaviorTitle}</a>
      <div className="small">{f.lead}</div>
      <div className="small muted">{f.title}</div>
    </li>)}</ul>
  </Section>;
}
// What Attention lists beneath a page, counted, each kind in Dossier's own words and a way into the lens.
// The map notes are the lines Attention lists, as the server counts them into the total.
function NeedsLine({ a, route }) {
  if (!a || !a.total) return null;
  const parts = [[a.decisions.length, 'decision owed', 'decisions owed'], [a.contradicted.length, 'contradicted claim', 'contradicted claims'], [a.contested.length, 'contested claim', 'contested claims'], [a.doubts.length, 'open doubt', 'open doubts'],
    [a.unreviewed.length, 'claim with evidence awaiting review', 'claims with evidence awaiting review'], [a.reviews.length, 'stale review', 'stale reviews'], [a.reviewsOwed.length, 'review owed', 'reviews owed'],
    [a.tripwires.length + a.root.length, 'tripwire', 'tripwires'], [a.noteLines, 'map note', 'map notes'], [a.accepted.length, 'accepted violation', 'accepted violations']].filter(([n]) => n);
  return <p className="pg-needs"><a href={hrefFor({ ...route, params: { lens: 'attention' } })}><b>Attention · {a.total}</b></a><span className="muted"> · {parts.map(([n, one, many]) => `${n} ${n === 1 ? one : many}`).join(' · ')}</span></p>;
}

// ---------- The pages ----------
export function NodeRead({ route }) {
  const { version, root } = useApp();
  const { data, error } = useData(api.node(route.id), version);
  if (error) return <Failed error={error} />;
  if (!data) return <Loading what="the page" />;
  const accepted = root?.accepted?.[data.id] || 0;
  if (data.kind === 'unplaced') return <div className="pg">
    <Crumbs here="Not placed" />
    <Head title="Not placed" counts={fromCounts(data.counts, accepted)} lead={data.dossiers.length ? `${plural(data.dossiers.length, 'dossier')} that no component of the map holds.` : null} />
    <NeedsLine a={data.attention} route={route} />
    <ul className="drows">{data.dossiers.map(d => <DossierRow key={d.ref} d={d} />)}</ul>
  </div>;
  if (data.kind === 'component') return <ComponentRead data={data} route={route} accepted={accepted} />;
  // A root whose map places nothing counts what it does not place: every live dossier.
  const counts = data.kind === 'root' && !data.children.length && root?.map?.unplaced ? fromCounts(root.map.unplaced.counts, root.accepted?.['@unplaced'] || 0) : fromCounts(data.counts, accepted);
  return <div className="pg">
    {data.kind !== 'root' && <Crumbs path={data.path} here={data.title} />}
    <Head title={data.title || 'Dossiers'} lead={data.lead} counts={counts} kind={data.malformed ? 'The map does not read, so nothing is placed.' : null} />
    <NeedsLine a={data.attention} route={route} />
    <Featured list={data.featured} />
    {/* The map's own words: a group holds groups and components, in that order. */}
    {[['Groups', 'group'], ['Components', 'component']].map(([title, kind]) => {
      const nodes = data.children.filter(n => n.kind === kind);
      return nodes.length > 0 && <Section key={kind} title={title} count={nodes.length}>
        <ul className="nodes">{nodes.map(n => {
          const c = fromCounts(n.counts, root?.accepted?.[n.id] || 0);
          return <li key={n.id} className="nrow">
            <Dot c={c} />
            <div className="nrow-main">
              <a className="nrow-title" href={hrefFor({ view: 'node', id: n.id })} data-nav>{n.title}</a>
              {n.kind === 'group' && <span className="muted small">{plural(n.components, 'component')}</span>}
              <div className="nrow-lead">{n.lead}</div>
            </div>
            <ReadCounts c={c} />
          </li>;
        })}</ul>
      </Section>;
    })}
    {data.sited.length > 0 && <Section title="Compositions" count={data.sited.length}><ul className="drows">{data.sited.map(d => <DossierRow key={d.ref} d={d} />)}</ul></Section>}
    {data.unplaced?.length > 0 && <Section title="Not placed" count={data.unplaced.length}><ul className="drows">{data.unplaced.slice(0, 12).map(d => <DossierRow key={d.ref} d={d} />)}</ul>
      {data.unplaced.length > 12 && <p className="small"><a href={hrefFor({ view: 'node', id: UNPLACED })}>All {data.unplaced.length}</a></p>}</Section>}
  </div>;
}

function ComponentRead({ data, route, accepted }) {
  const base = { view: 'node', id: data.id, params: {}, dossier: true };
  const flows = [...data.flows, ...data.sited.filter(s => !data.flows.some(f => f.ref === s.ref))];
  useScrollToSelection(route.params, true);
  return <ReadFrame holdings={data.holdings} params={route.params}><div className="pg">
    <Crumbs path={data.path} here={data.title} />
    <Head title={data.title} lead={data.lead} counts={fromCounts(data.counts, accepted)} />
    <NeedsLine a={data.attention} route={route} />
    <Featured list={data.featured} />
    <Holdings holdings={data.holdings} base={base} params={route.params} />
    {flows.length > 0 && <Section title="Flows" count={flows.length}><ul className="drows">{flows.map(d => <DossierRow key={d.ref} d={d} />)}</ul></Section>}
  </div></ReadFrame>;
}

export function DossierRead({ route }) {
  const { version } = useApp();
  const { data, error } = useData(api.read(route.view, route.id), version);
  useScrollToSelection(route.params, Boolean(data));
  if (error) return <Failed error={error} />;
  if (!data) return <Loading what={route.id} />;
  const base = { view: route.view, id: route.id, params: {} };
  const where = data.places.length ? data.places : [];
  return <ReadFrame holdings={data.holdings} params={route.params}><div className="pg">
    <Crumbs path={where[0]?.path || []} here={data.title} />
    <Head title={data.title} lead={data.lead} counts={fromSummary(data.summary)} kind={`${data.kind === 'part' ? `part · ${data.tier}` : 'composition'} · ${data.id}`}>
      <div className="pg-where">{where.length ? <>{where.map((p, i) => <a key={i} className="chip" href={hrefFor({ view: 'node', id: p.node ?? undefined })}>{p.how === 'sited' ? `sits at ${p.title}` : p.how === 'selection' ? `${p.title}, in part` : p.title}</a>)}</> : <a className="chip" href={hrefFor({ view: 'node', id: UNPLACED })}>not placed</a>}</div>
    </Head>
    <NeedsLine a={data.attention} route={route} />
    <Holdings holdings={data.holdings} base={base} params={route.params} />
    {data.compositions.length > 0 && <Section title="Flows" count={data.compositions.length}><ul className="drows">{data.compositions.map(d => <DossierRow key={d.ref} d={d} />)}</ul></Section>}
    {data.members.length > 0 && <Section title="Members" count={data.members.length}><ul className="drows">{data.members.map(d => <DossierRow key={d.ref} d={d} />)}</ul></Section>}
  </div></ReadFrame>;
}

// Opening a claim or a behavior by its address brings it into view once the page is there: a claim where
// it is nearest, a behavior at the top with its claims beneath it. A live refresh of the same address
// leaves the page where the reader scrolled it.
function useScrollToSelection(params, ready) {
  const shown = useRef(null);
  const key = params.behavior ? `${params.dossier || ''}#${params.behavior}/${params.claim || ''}` : null;
  useEffect(() => {
    if (!key) { shown.current = null; return; }
    if (!ready || shown.current === key) return;
    shown.current = key;
    requestAnimationFrame(() => {
      const claim = document.querySelector('.cl.is-on');
      if (claim) claim.scrollIntoView({ block: 'nearest' });
      else document.querySelector('.pg-beh.is-on, .cl.is-in')?.scrollIntoView({ block: 'start' });
    });
  }, [key, ready]);
}
