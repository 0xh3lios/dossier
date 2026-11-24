// A dossier read as a page: its orientation's lead, each behavior once as a heading with its claims
// beneath it in the author's sentences, each claim's standing, scope and evidence on one line, and the
// ways down into its model. The engine derives the report. This view selects and arranges it.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'react-aria-components';
import { api, hrefFor, plural, sentences, setParams, STANDING_WORD, useApp, useData } from './lib.js';
import { Badge, Counts, countClaims, Failed, Flags, KV, LinkButton, Loading, Sec } from './bits.jsx';
import { PartView } from './PartView.jsx';
import { CompositionView } from './CompositionView.jsx';
import { dossierHref, evidenceHref, splitOrientation, targetHref, targetLabel, unassociatedHref } from './behavior-navigation.js';
import { DocumentText } from './markdown.jsx';
import { walkTrack, traceTrack } from './tracks.js';

const REPORT = 'dossier-behavior-report@0.2.0';
const show = value => typeof value === 'string' ? value : JSON.stringify(value);
const words = kind => kind.replaceAll('-', ' ');
const reviewName = file => file.replace(/^reviews\//, '').replace(/\.md$/, '');
const behaviorAnchor = id => `behavior-${id}`;
const claimAnchor = (behavior, claim) => `claim-${behavior}-${claim}`;
const reviewAnchor = file => `review-${file.replace(/[^\w-]/g, '_')}`;
// A link into the model keeps the behavior and the claim, so the dossier's crumb returns to them.
function claimModelHref(href, dossier, mapping) {
  if (!href?.startsWith(`${dossierHref(dossier)}?`)) return href;
  const [path, query] = href.split('?');
  const params = new URLSearchParams(query), [behavior, claim] = mapping.key.split('/');
  params.set('behavior', behavior); params.set('claim', claim);
  return `${path}?${params}`;
}
// What a review's assessment says of a mapping, in a word whose family the badge reads.
const resultWord = result => (result === 'supported' ? 'supported' : result === 'contradicted' ? 'contradicted' : result);

// A heading whose section has nothing left under it, as when the README's list of behaviors left it.
function dropEmptySections(text) {
  const lines = String(text || '').split(/\r?\n/), level = l => /^(#{1,6})\s/.exec(l)?.[1].length || 0;
  return lines.filter((line, i) => {
    const L = level(line);
    if (!L || L === 1) return true;
    for (let j = i + 1; j < lines.length; j++) {
      const k = level(lines[j]);
      if (k && k <= L) break;
      if (!k && lines[j].trim()) return true;
    }
    return false;
  }).join('\n');
}
// The orientation's first block after its title, and the rest.
function splitLead(text) {
  const lines = String(text || '').split(/\r?\n/);
  let i = 0;
  while (i < lines.length && (!lines[i].trim() || /^# /.test(lines[i]))) i++;
  if (/^#{2,6}\s/.test(lines[i] || '')) return { lead: '', rest: lines.slice(i).join('\n').trim() };
  let end = i;
  while (end < lines.length && lines[end].trim()) end++;
  return { lead: lines.slice(i, end).join('\n'), rest: lines.slice(end).join('\n').trim() };
}

export function DossierView({ id, kind, params }) {
  const { version } = useApp();
  const { data, error } = useData(kind === 'part' ? api.part(id) : api.composition(id), version);
  if (error) return <Failed error={error} />;
  if (!data) return <Loading what={id} />;
  if (data.behaviors?.format !== REPORT) return <Failed error={new Error(`${id}: no behavior report in the format ${REPORT}`)} />;
  if (params.view === 'model') return <div className="dossier-model">{kind === 'part' ? <PartView id={id} params={params} /> : <CompositionView id={id} params={params} />}</div>;
  return <Reading data={data} kind={kind} id={id} params={params} />;
}

// ---------- The page ----------
function Reading({ data, kind, id, params }) {
  const report = data.behaviors;
  const { lead, rest, blurbs } = useMemo(() => {
    const split = splitOrientation(report.orientation, report.dossier, report.order);
    return { ...splitLead(dropEmptySections(split.text)), blurbs: split.blurbs };
  }, [report]);
  const quiet = useRef(false);
  const openBehavior = params.behavior || null, openClaim = params.claim || null, openReview = params.review || null;
  // Opening by address scrolls to what it names; opening by a click leaves the page where it is.
  useEffect(() => {
    if (quiet.current) { quiet.current = false; return; }
    const target = openReview ? reviewAnchor(openReview) : openClaim && openBehavior ? claimAnchor(openBehavior, openClaim) : openBehavior ? behaviorAnchor(openBehavior) : null;
    if (!target) return;
    requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: 'start' }));
  }, [openBehavior, openClaim, openReview]);
  const select = patch => { quiet.current = true; setParams({ behavior: null, claim: null, review: null, ...patch }); };
  const toggleClaim = (b, c) => select(openBehavior === b && openClaim === c ? {} : { behavior: b, claim: c });
  const toggleBehavior = b => select(openBehavior === b && !openClaim ? {} : { behavior: b });
  const toggleReview = file => select(openReview === file ? {} : { review: file });
  const escape = e => {
    if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('[role="dialog"]')) return;
    if (openClaim || openReview || openBehavior) {
      e.preventDefault();
      const back = openReview ? reviewAnchor(openReview) : openClaim ? claimAnchor(openBehavior, openClaim) : behaviorAnchor(openBehavior);
      select({});
      requestAnimationFrame(() => document.getElementById(back)?.querySelector('[data-nav]')?.focus({ preventScroll: true }));
    }
  };
  const reviews = report.reviews.reviews, unmapped = report.coverage.unassociated;
  return <div className="read-scroll" onKeyDown={escape}>
    <article className="read">
      <ReadingHead data={data} kind={kind} id={id} lead={lead} rest={rest} />
      {report.issues.length > 0 && <ul className="list t-crit read-issues" role="status">{report.issues.map((issue, i) => <li key={i}><code>{issue.path}</code> {issue.message}</li>)}</ul>}
      {report.behaviors.map((b, i) => <BehaviorSection key={b.id} b={b} n={i + 1} blurb={blurbs[b.id]} dossier={report.dossier}
        explaining={openBehavior === b.id && !openClaim} openClaim={openBehavior === b.id ? openClaim : null} onBehavior={() => toggleBehavior(b.id)} onClaim={c => toggleClaim(b.id, c)} />)}
      {!report.behaviors.length && <p className="muted">No behaviors.</p>}
      {reviews.length > 0 && <section className="rs" id="reviews" aria-labelledby="reviews-h">
        <h2 className="rs-h" id="reviews-h">Reviews <span className="muted">{reviews.length}</span>{!report.reviews.dossierReviewed && <span className="muted rs-owed">dossier review owed</span>}</h2>
        <ul className="rs-list">{reviews.map(r => <ReviewItem key={r.file} review={r} report={report} open={openReview === r.file} onToggle={() => toggleReview(r.file)} />)}</ul>
      </section>}
      {unmapped.length > 0 && <section className="rs" aria-labelledby="unmapped-h">
        <h2 className="rs-h" id="unmapped-h">No behavior <span className="muted">{unmapped.length}</span></h2>
        <div className="bv-rest">{unmapped.map((item, i) => <a key={`${item.kind}:${item.id}:${item.scenario}:${i}`} className="chip" href={unassociatedHref(item, report.dossier)}>{item.kind === 'passage' || item.kind === 'walk' ? '' : `${item.kind} `}{item.id}{item.scenario && item.kind !== 'scenario' ? ` × ${item.scenario}` : ''}</a>)}</div>
      </section>}
    </article>
  </div>;
}

// The dossier's name, its lead, where it stands, and the ways down into its model and evidence.
function ReadingHead({ data, kind, id, lead, rest }) {
  const report = data.behaviors, s = report.summary;
  const model = extra => hrefFor({ view: kind, id, params: { view: 'model', ...extra } });
  const ways = kind === 'part'
    ? [['Chart', model({ center: 'chart' })], ['Grid', model({ center: 'grid' })], ['Walks', model({ center: 'walks' }), data.chart.walks.length], ['Play', model({ tab: 'play' })],
      ['Runs', model({ tab: 'evidence' }), data.evidence.length], ['Backing', model({ tab: 'backing' }), data.backing.length], ['Decisions', model({ tab: 'log' }), data.decisions.length]]
    : [['System', model({})], ['Cells', model({ tab: 'cells' }), data.cells.length], ['Properties', model({ tab: 'properties' }), data.passages.length], ['Walks', model({ tab: 'walks' }), data.walks.length],
      ['Runs', model({ tab: 'evidence' }), data.evidence.length], ['Closure', model({ tab: 'closure' })], ['Decisions', model({ tab: 'log' }), data.decisions.length]];
  const why = data.route?.why || [];
  return <header className="read-head">
    <h1>{data.title || id}</h1>
    <div className="read-id"><span className="mono">{id}</span> · {kind === 'part' ? `part · ${data.tier}` : `composition · ${plural(data.members.length, 'member')}`}</div>
    {lead && <div className="read-lead"><DocumentText text={lead} source={`${report.dossier}/README.md`} /></div>}
    <dl className="read-facts">
      <dt>Claims</dt><dd><span>{plural(s.behaviors, 'behavior')} · {plural(s.claims, 'claim')}</span> <Counts counts={countClaims(report.behaviors.flatMap(b => b.claims))} words stale={s.stale} /></dd>
      {data.route && <><dt>Next</dt><dd><b>{data.route.pass}</b>{why.length ? <span className="read-why"> {why.join('; ')}</span> : null}</dd></>}
      {(data.tripwires.length > 0 || data.flags.length > 0) && <><dt>Flags</dt><dd><Flags tripwires={data.tripwires} flags={data.flags} /></dd></>}
      {/* This page is the Workbench's, so the dossiers it names open there too, as the board's members do. */}
      {kind === 'part' && data.inCompositions.length > 0 && <><dt>In</dt><dd>{data.inCompositions.map(c => <a key={c} className="chip mono" href={hrefFor({ view: 'composition', id: c, params: { lens: 'work' } })}>{c}</a>)}</dd></>}
      {kind === 'composition' && <><dt>Members</dt><dd>{data.members.map(m => <a key={m.id} className="chip mono" href={hrefFor({ view: 'part', id: m.id, params: { lens: 'work', from: id } })}>{m.id}</a>)}</dd></>}
    </dl>
    <nav className="ways" aria-label={kind === 'part' ? 'The chart and its runs' : 'The system and its runs'}>
      {ways.map(([label, href, n]) => <a key={label} className="way" href={href}>{label}{n != null && <span className="muted"> {n}</span>}</a>)}
      {report.reviews.reviews.length > 0 && <a className="way" href="#reviews" onClick={e => { e.preventDefault(); document.getElementById('reviews')?.scrollIntoView({ block: 'start' }); }}>Reviews<span className="muted"> {report.reviews.reviews.length}</span></a>}
    </nav>
    {rest && <details className="read-more"><summary>Orientation</summary><DocumentText text={rest} source={`${report.dossier}/README.md`} /></details>}
  </header>;
}

// ---------- A behavior: its heading, its explanation on demand, its claims ----------
function BehaviorSection({ b, n, blurb, dossier, explaining, openClaim, onBehavior, onClaim }) {
  return <section className="rb" id={behaviorAnchor(b.id)} aria-labelledby={`${behaviorAnchor(b.id)}-h`}>
    <h2 className="rb-h" id={`${behaviorAnchor(b.id)}-h`}>
      <span className="rb-n mono" aria-hidden="true">{n}</span>
      <button type="button" className="rb-toggle" data-nav aria-expanded={explaining} onClick={onBehavior}><span className="chev" aria-hidden="true">▸</span>{b.title}</button>
      <Counts counts={countClaims(b.claims)} stale={b.claims.filter(c => c.freshness !== 'current').length} />
    </h2>
    {blurb && <p className="rb-blurb">{blurb}</p>}
    {explaining && <div className="rb-expl"><DocumentText text={b.body} source={b.path} skipTitle /><div className="rb-src muted mono">{b.path}</div></div>}
    <ol className="claims" aria-label={`Claims of ${b.title}`}>
      {b.claims.map(c => <ClaimItem key={c.id} b={b} c={c} dossier={dossier} open={openClaim === c.id} onToggle={() => onClaim(c.id)} />)}
    </ol>
  </section>;
}

// One claim: its sentences, then its standing, its scope and each mapping's target, mark, run and
// review on one line. Open, its scope, assumptions and every mapping in full.
function ClaimItem({ b, c, dossier, open, onToggle }) {
  const [first, ...more] = sentences(c.statement);
  return <li className={`cr${open ? ' is-open' : ''}`} id={claimAnchor(b.id, c.id)}>
    <span className="cr-id mono">{c.id}</span>
    <div className="cr-body">
      <button type="button" className="cr-toggle" data-nav aria-expanded={open} onClick={onToggle}>
        <span className="cr-lead">{first}</span>{more.map((sentence, i) => <span key={i} className="cr-more">{sentence}</span>)}
      </button>
      <div className="cr-glance">
        <Badge word={c.standing} label={STANDING_WORD[c.standing]} title={c.label} small />
        {c.freshness !== 'current' && <Badge word={c.freshness} small />}
        <span className="cr-scope" title={c.scope.description}>{c.scope.level}{c.kind === 'requirement' ? ' requirement' : ''}</span>
        {c.mappings.map(m => <MappingGlance key={m.key} mapping={m} dossier={dossier} />)}
        {!c.mappings.length && <span className="muted">no mapping</span>}
      </div>
      {open && <ClaimDetail claim={c} behavior={b} dossier={dossier} />}
    </div>
  </li>;
}

function MappingGlance({ mapping, dossier }) {
  const target = claimModelHref(targetHref(mapping.target), dossier, mapping), label = targetLabel(mapping.target, dossier);
  const formal = mapping.evidence.formal, records = mapping.assessment.records;
  // One link per checker, to the run that decides, or the first that has an entry.
  const runs = [];
  for (const item of [...mapping.evidence.evidence].sort((x, y) => Number(!!y.deciding) - Number(!!x.deciding))) {
    const name = item.checker || words(item.kind), held = runs.find(r => r.name === name);
    if (held) { if (item.entry) held.entries.push(item.entry); if (!held.href && item.entry) held.href = claimModelHref(evidenceHref(item), dossier, mapping); continue; }
    runs.push({ name, entries: item.entry ? [item.entry] : [], href: item.entry ? claimModelHref(evidenceHref(item), dossier, mapping) : null });
  }
  const review = mapping.assessment.state === 'contested' ? 'contested' : records.length ? (records.every(r => r.result === 'supported') ? 'supported' : resultWord(records.find(r => r.result !== 'supported').result)) : 'unreviewed';
  return <span className="mg">
    {mapping.relation !== 'supports' && <span className="muted">{mapping.relation}</span>}
    {target ? <a className="mono" href={target}>{label}</a> : <span className="mono">{label}</span>}
    {formal && <Badge word={formal.mark} small />}
    {runs.map((r, i) => r.href ? <a key={i} className="mg-run" href={r.href} title={r.entries.join('\n')}>{r.name}{r.entries.length > 1 ? <span className="muted"> ×{r.entries.length}</span> : null}</a> : <span key={i} className="mg-run muted">{r.name}</span>)}
    <Badge word={review} small label={review === 'unreviewed' ? 'not reviewed' : review === 'contested' ? 'review contested' : `review ${review}`} />
  </span>;
}

function ClaimDetail({ claim, behavior, dossier }) {
  return <div className="cr-detail">
    <div className="d-head"><span className="mono">{behavior.id}/{claim.id}</span><Badge word={claim.standing} label={claim.label} small />{claim.freshness !== 'current' && <Badge word={claim.freshness} small />}<span className="top-gap" /><LinkButton /></div>
    <Sec title="Scope" aside={`${claim.scope.level} · ${claim.kind}`}>
      <p className="cr-scope-text">{claim.scope.description}</p>
      {claim.pins.length > 0 && <KV rows={claim.pins.map(pin => [<Badge word={pin.freshness} small />, <><span className="mono wrap">{pin.ref}</span>{pin.reasons.map(reason => <div key={reason} className="t-warn">{reason}</div>)}</>])} />}
    </Sec>
    {claim.reasons.length > 0 && <Sec title="Not current"><ul className="list t-warn">{claim.reasons.map(text => <li key={text}>{text}</li>)}</ul></Sec>}
    {claim.assumptions.length > 0 && <Sec title="Assumptions" aside={claim.assumptions.length}><ul className="list">{claim.assumptions.map(text => <li key={text}>{text}</li>)}</ul></Sec>}
    {claim.mappings.map(mapping => <MappingSection key={mapping.key} mapping={mapping} dossier={dossier} />)}
    <details className="raw"><summary>Record</summary><pre>{JSON.stringify(claim, null, 2)}</pre></details>
  </div>;
}

function MappingSection({ mapping, dossier }) {
  const evidence = mapping.evidence, formal = evidence.formal;
  const link = claimModelHref(targetHref(mapping.target), dossier, mapping);
  const label = targetLabel(mapping.target, dossier);
  const [playing, setPlaying] = useState(false);
  const walk = mapping.target.kind === 'walk';
  const limits = [...new Set([...mapping.limitations, ...evidence.evidence.flatMap(item => item.limitations), ...mapping.assessment.records.flatMap(record => record.limitations)])];
  return <Sec title={<><span className="mono">{mapping.id}</span> {mapping.relation} {link ? <a href={link} className="mono">{label}</a> : <span className="mono">{label}</span>}</>}
    aside={walk && <Button className="btn is-tiny" onPress={() => setPlaying(!playing)}>{playing ? 'Close' : 'Play'}</Button>}>
    <p className="map-why">{mapping.rationale}</p>
    <KV rows={[
      formal && ['mark', <><Badge word={formal.mark} small />{formal.held && <Badge word={formal.held} label={formal.held === 'caught' ? 'blunder caught' : formal.held} small />}{formal.assumptions.length > 0 && <span className="muted"> given {formal.assumptions.join(' ')}</span>}</>],
      formal?.open.length > 0 && ['open', <span className="t-warn">{formal.open.join('; ')}</span>],
      !evidence.evidence.length && ['evidence', <><Badge word={evidence.freshness} small />{evidence.reasons.join('; ')}</>],
      ...evidence.evidence.map((item, i) => [i === 0 ? 'evidence' : '', <EvidenceRow key={`${item.path}:${i}`} item={item} dossier={dossier} mapping={mapping} />]),
      ['review', mapping.assessment.records.length ? mapping.assessment.records.map((record, i) => <div key={`${record.review}:${i}`}><Badge word={resultWord(record.result)} label={record.result} small /><a className="mono" href={dossierHref(dossier, { review: record.review })}>{reviewName(record.review)}</a><div>{record.rationale}</div></div>) : <span className="muted">unreviewed</span>],
      ...evidence.owner.flatMap((owner, i) => owner.state || owner.decision || owner.accepted || owner.acceptanceLapsed.length ? [[i === 0 ? 'owner' : '', <OwnerRow key={i} owner={owner} />]] : []),
    ]} />
    {evidence.conflicts.length > 0 && <ul className="list t-crit">{evidence.conflicts.map(reason => <li key={reason}>{reason}</li>)}</ul>}
    {limits.length > 0 && <details className="limits"><summary>Limits <span className="muted">{limits.length}</span></summary><ul className="list">{limits.map(text => <li key={text}>{text}</li>)}</ul></details>}
    {walk && playing && <WalkPlayer mapping={mapping} modelHref={link} />}
  </Sec>;
}

function EvidenceRow({ item, dossier, mapping }) {
  const href = item.entry ? claimModelHref(evidenceHref(item), dossier, mapping) : null;
  return <div className="ev">
    <span>{words(item.kind)}</span>{item.checker && <span className="muted"> {item.checker}</span>} {item.freshness !== 'current' && <Badge word={item.freshness} small />}{item.deciding && <span className="chip">decides</span>}{!item.admissible && <span className="chip">not admissible</span>}
    {Object.entries(item.outcomes).map(([check, outcome]) => <span className="chip mono" key={check}>{check} {outcome}</span>)}
    <div className="small wrap">{href ? <a className="mono" href={href}>{item.entry}</a> : <span className="mono">{item.path}</span>}{item.trial && <span className="muted"> {item.trial}</span>}</div>
    {item.reach?.text && <Reach text={item.reach.text} />}
    {item.reasons.length > 0 && <div className="small t-warn">{item.reasons.join('; ')}</div>}
  </div>;
}

// How far a check looked: its first sentence, and the rest on demand.
function Reach({ text }) {
  const [first, ...more] = sentences(text);
  if (!more.length) return <div className="small muted">{text}</div>;
  return <details className="reach small muted"><summary>{first}</summary>{more.join(' ')}</details>;
}

function OwnerRow({ owner }) {
  return <div>
    <span className="mono">{owner.passage}{owner.scenario ? ` × ${owner.scenario}` : ''}</span> {owner.state && <Badge word={owner.state} small />}{owner.accepted && <Badge word="violated, accepted" label="risk accepted" small />}
    {owner.decision && <div>{owner.decision.words} <span className="muted small">{owner.decision.time}</span></div>}
    {owner.accepted && <div>{owner.accepted.words} <span className="muted small">{owner.accepted.time}</span></div>}
    {owner.acceptanceLapsed.length > 0 && <div className="t-warn">acceptance lapsed: {owner.acceptanceLapsed.join('; ')}</div>}
  </div>;
}

function WalkPlayer({ mapping, modelHref }) {
  const { version } = useApp();
  const target = mapping.target, part = target.dossier.startsWith('parts/'), id = target.dossier.split('/')[1];
  const witness = mapping.evidence.evidence.find(e => e.kind === 'path-witness' && ['tlc', 'apalache'].includes(e.checker) && e.entry && e.admissible && e.freshness === 'current');
  const source = part ? witness ? api.trace(id, witness.entry) : api.run(id) : api.compositionWalk(id, target.id, target.scenario);
  const { data, error } = useData(source, version);
  const [at, setAt] = useState(0);
  if (error) return <div className="walk-player muted">No trace. <a href={modelHref}>{part ? 'Chart' : 'System'}</a></div>;
  if (!data) return <Loading what="the walk" />;
  const track = part ? witness ? traceTrack(data) : walkTrack(data, target.id) : null;
  const steps = part ? track?.steps || [] : data.steps || [];
  const index = Math.min(at, Math.max(0, steps.length - 1)), step = steps[index];
  return <div className="walk-player">
    <div className="player-bar">
      <Button className="btn is-tiny" aria-label="Previous step" isDisabled={index === 0} onPress={() => setAt(index - 1)}>‹</Button>
      <Button className="btn is-tiny" aria-label="Next step" isDisabled={index >= steps.length - 1} onPress={() => setAt(index + 1)}>›</Button>
      <span className="mono">{steps.length ? `${index} / ${steps.length - 1}` : 'no steps'}</span>
      {step && <span>{part ? step.label : step.action || 'initial state'}{part && step.refused ? ' · refused' : ''}</span>}
      <span className="top-gap" /><span className="muted">{part && !witness ? 'chart replay' : 'recorded trace'}</span>
    </div>
    {track?.error && <p className="t-warn">{track.error}</p>}
    {step && (part
      ? <KV rows={[['state', step.leaves.join(', ')], ...Object.entries(step.data || {}).map(([name, value]) => [name, show(value)])]} />
      : <div className="walk-members">{Object.entries(step.members || {}).map(([member, values]) => <div key={member}><span className="mono">{member}</span><KV rows={Object.entries(values).map(([name, value]) => [name, show(value)])} /></div>)}</div>)}
  </div>;
}

// ---------- Reviews ----------
// How many claims and explanations of a review's subject changed since it was written.
const changedSince = review => review.changed.claims.length + review.changed.explanations.length;
function ReviewItem({ review, report, open, onToggle }) {
  const record = review.record;
  const subject = !record ? '' : record.subject.kind === 'dossier' ? 'the dossier' : record.subject.behaviors.map(id => report.behaviors.find(b => b.id === id)?.title || id).join(', ');
  return <li className={`rv${open ? ' is-open' : ''}`} id={reviewAnchor(review.file)}>
    <div className="rv-row">
      <button type="button" className="rv-toggle" data-nav aria-expanded={open} onClick={onToggle}><span className="chev" aria-hidden="true">▸</span><span className="mono">{reviewName(review.file)}</span></button>
      <Badge word={review.status} small />
      {changedSince(review) > 0 && <Badge word="stale" label={`${changedSince(review)} changed since`} small />}
      {subject && <span className="muted">{subject}</span>}
    </div>
    {open && <ReviewDetail review={review} dossier={report.dossier} />}
  </li>;
}

function ReviewDetail({ review, dossier }) {
  const record = review.record;
  return <div className="cr-detail">
    <div className="d-head"><span className="mono">{review.file}</span><Badge word={review.status} small /><span className="top-gap" /><LinkButton /></div>
    {review.reasons.length > 0 && <Sec title={review.status === 'invalid' ? 'Invalid' : 'Stale'}><ul className="list t-warn">{review.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></Sec>}
    {changedSince(review) > 0 && <Sec title="Changed since"><KV rows={[
      ...(review.changed.claims.length ? [['claims', <span className="mono wrap">{review.changed.claims.join(' ')}</span>]] : []),
      ...(review.changed.explanations.length ? [['explanation', <span className="mono wrap">{review.changed.explanations.join(' ')}</span>]] : []),
    ]} /></Sec>}
    {record && <Sec title="Subject" aside={record.subject.kind}>
      <KV rows={[
        ['behaviors', record.subject.behaviors.join(', ') || 'none'],
        ['basis', `${plural(record.basis.required, 'required file')}${record.basis.additional ? `, ${record.basis.additional} additional` : ''}`],
        ['examined', <span className="mono wrap">{record.coverage.examined.join(' ') || 'none'}</span>],
      ]} />
    </Sec>}
    {record?.coverage.unexamined.length > 0 && <Sec title="Unexamined" aside={record.coverage.unexamined.length}><table className="dt"><tbody>{record.coverage.unexamined.map(item => <tr key={item.item}><td className="mono">{item.item}</td><td>{item.reason}</td></tr>)}</tbody></table></Sec>}
    {record?.assessments.length > 0 && <Sec title="Assessments" aside={record.assessments.length}><table className="dt"><tbody>{record.assessments.map(a => <tr key={a.mapping}><td><a className="mono" href={dossierHref(dossier, { behavior: a.mapping.split('/')[0], claim: a.mapping.split('/')[1] })}>{a.mapping}</a></td><td><Badge word={resultWord(a.result)} label={a.result} small />{review.changed.claims.includes(a.mapping.split('/').slice(0, 2).join('/')) && <Badge word="stale" label="out of effect" small />}</td></tr>)}</tbody></table></Sec>}
    <div className="doc-pad"><DocumentText text={review.body} source={`${dossier}/${review.file}`} /></div>
  </div>;
}
