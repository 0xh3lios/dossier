// A dossier's behaviors, shown once: an outline of the behaviors and their claims beside the detail
// of the one selected. The engine derives the report. This view selects and arranges it.
import { Fragment, useMemo, useState } from 'react';
import { Button, Header, ListBox, ListBoxItem, ListBoxSection, Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { api, plural, setParams, useApp, useData, useNarrow } from './lib.js';
import { Badge, Failed, KV, LinkButton, Loading, Sec } from './bits.jsx';
import { PartView } from './PartView.jsx';
import { CompositionView } from './CompositionView.jsx';
import { documentHref, dossierHref, evidenceHref, splitOrientation, targetHref, targetLabel, unassociatedHref } from './behavior-navigation.js';
import { walkTrack, traceTrack } from './tracks.js';

const REPORT = 'dossier-behavior-report@0.2.0';
// The standing in one or two words. The badge's title carries the report's own label.
const SHORT = { supported: 'supported', 'evidence-available': 'evidence unreviewed', hypothesis: 'hypothesis', contradicted: 'contradicted', contested: 'contested' };
const STANDINGS = ['contradicted', 'contested', 'hypothesis', 'evidence-available', 'supported'];
const show = value => typeof value === 'string' ? value : JSON.stringify(value);
const words = kind => kind.replaceAll('-', ' ');
const reviewName = file => file.replace(/^reviews\//, '').replace(/\.md$/, '');
// A link into the model keeps the behavior and the claim, so the Behaviors tab returns to them.
function claimModelHref(href, dossier, mapping) {
  if (!href?.startsWith(`${dossierHref(dossier)}?`)) return href;
  const [path, query] = href.split('?');
  const params = new URLSearchParams(query), [behavior, claim] = mapping.key.split('/');
  params.set('behavior', behavior); params.set('claim', claim);
  return `${path}?${params}`;
}

// A small safe Markdown reader for authored explanations. Raw HTML is plain text.
function Inline({ text, source }) {
  const pieces = text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g);
  return pieces.map((piece, i) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(piece);
    if (link) {
      const href = documentHref(link[2], source);
      return href ? <a key={i} href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{link[1]}</a> : <span key={i} title={link[2]}>{link[1]}</span>;
    }
    if (piece.startsWith('`') && piece.endsWith('`')) return <code key={i}>{piece.slice(1, -1)}</code>;
    if (piece.startsWith('**') && piece.endsWith('**')) return <strong key={i}>{piece.slice(2, -2)}</strong>;
    return <Fragment key={i}>{piece}</Fragment>;
  });
}
export function DocumentText({ text, source, skipTitle = false }) {
  const lines = String(text || '').trim().split(/\r?\n/), blocks = [];
  let i = 0;
  if (skipTitle && /^# /.test(lines[0] || '')) i++;
  while (i < lines.length) {
    if (!lines[i].trim()) { i++; continue; }
    const key = i;
    if (/^```/.test(lines[i])) {
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={key}><code>{code.join('\n')}</code></pre>);
      continue;
    }
    const heading = /^#{1,6}\s+(.+)$/.exec(lines[i]);
    if (heading) { blocks.push(<h4 key={key}><Inline text={heading[1]} source={source} /></h4>); i++; continue; }
    if (/^\|/.test(lines[i])) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { if (!/^\|\s*:?-/.test(lines[i])) rows.push(lines[i].replace(/^\||\|\s*$/g, '').split('|').map(cell => cell.trim())); i++; }
      blocks.push(<table key={key} className="dt"><tbody>{rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c}><Inline text={cell} source={source} /></td>)}</tr>)}</tbody></table>);
      continue;
    }
    const list = /^(?:[-*]|\d+\.)\s+/.exec(lines[i]);
    if (list) {
      const ordered = /^\d/.test(list[0]), items = [];
      while (i < lines.length && /^(?:[-*]|\d+\.)\s+/.test(lines[i])) items.push(<li key={i}><Inline text={lines[i++].replace(/^(?:[-*]|\d+\.)\s+/, '')} source={source} /></li>);
      blocks.push(ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>);
      continue;
    }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(?:#{1,6}\s|```|\||[-*]\s|\d+\.\s)/.test(lines[i])) paragraph.push(lines[i++]);
    blocks.push(<p key={key}><Inline text={paragraph.join(' ')} source={source} /></p>);
  }
  return <div className="doc">{blocks}</div>;
}

export function DossierView({ id, kind, params }) {
  const { version } = useApp();
  const { data, error } = useData(kind === 'part' ? api.part(id) : api.composition(id), version);
  const view = params.view === 'model' ? 'model' : 'behaviors';
  if (error) return <Failed error={error} />;
  if (!data) return <Loading what={id} />;
  if (data.behaviors?.format !== REPORT) return <Failed error={new Error(`${id}: no behavior report in the format ${REPORT}`)} />;
  return <div className="dossier-reader">
    <Tabs className="tabs" selectedKey={view} onSelectionChange={key => setParams({ view: key === 'model' ? 'model' : null })}>
      <div className="dossier-reader-head">
        <TabList className="tablist" aria-label="Dossier view"><Tab id="behaviors">Behaviors <span className="muted">{data.behaviors.summary.behaviors}</span></Tab><Tab id="model">Model and evidence</Tab></TabList>
        <div><strong>{data.title || id}</strong><span className="muted"> {kind}</span></div>
      </div>
      <TabPanel id="behaviors" className="panel"><BehaviorWorkspace report={data.behaviors} params={params} /></TabPanel>
      <TabPanel id="model" className="panel">{kind === 'part' ? <PartView id={id} params={params} /> : <CompositionView id={id} params={params} />}</TabPanel>
    </Tabs>
  </div>;
}

function BehaviorWorkspace({ report, params }) {
  const narrow = useNarrow();
  const { text, blurbs } = useMemo(() => splitOrientation(report.orientation, report.dossier, report.order), [report]);
  const behavior = report.behaviors.find(b => b.id === params.behavior) || null;
  const claim = behavior?.claims.find(c => c.id === params.claim) || null;
  const review = !behavior && params.review ? report.reviews.reviews.find(r => r.file === params.review) || null : null;
  const selected = claim ? `c:${behavior.id}:${claim.id}` : behavior ? `b:${behavior.id}` : review ? `r:${review.file}` : null;
  const select = key => {
    if (!key) return setParams({ behavior: null, claim: null, review: null });
    if (key.startsWith('r:')) return setParams({ behavior: null, claim: null, review: key.slice(2) });
    const [, b, c] = key.split(':');
    return setParams({ behavior: b, claim: c || null, review: null });
  };
  return <div className={`bv${narrow ? ' is-narrow' : ''}`}>
    <Outline report={report} blurbs={blurbs} selected={selected} onSelect={select} />
    <div className="side-r"><div className="panel is-scroll">
      {claim ? <ClaimDetail claim={claim} behavior={behavior} dossier={report.dossier} />
        : behavior ? <BehaviorDetail behavior={behavior} />
        : review ? <ReviewDetail review={review} dossier={report.dossier} />
        : <div className="detail"><div className="d-head"><strong>Orientation</strong><span className="muted">{plural(report.summary.behaviors, 'behavior')} · {plural(report.summary.claims, 'claim')}</span></div><div className="doc-pad"><DocumentText text={text} source={`${report.dossier}/README.md`} skipTitle /></div></div>}
    </div></div>
  </div>;
}

// ---------- The outline: every behavior once, its claims beneath it ----------
function StandingCounts({ claims }) {
  return STANDINGS.map(standing => {
    const n = claims.filter(c => c.standing === standing).length;
    return n ? <Badge key={standing} word={standing} label={String(n)} title={`${n} ${SHORT[standing]}`} small /> : null;
  });
}
function Outline({ report, blurbs, selected, onSelect }) {
  const rest = report.coverage.unassociated, reviews = report.reviews.reviews;
  return <aside className="prose" aria-label="Behaviors">
    {report.issues.length > 0 && <ul className="list t-crit" role="status">{report.issues.map((issue, i) => <li key={i}><code>{issue.path}</code> {issue.message}</li>)}</ul>}
    <div className="bv-scroll">
      <ListBox className="plist" aria-label="Behaviors and claims" selectionMode="single" selectedKeys={selected ? [selected] : []}
        onSelectionChange={keys => { const key = [...keys][0]; onSelect(key ? String(key) : null); }} renderEmptyState={() => <div className="pad muted">No behaviors.</div>}>
        {report.behaviors.map((b, i) => <ListBoxSection key={b.id} id={`s:${b.id}`} aria-label={b.title}>
          <ListBoxItem id={`b:${b.id}`} textValue={b.title} className="pitem is-behavior">
            <span className="pid mono">{i + 1}</span>
            <span className="pbody"><strong>{b.title}</strong>{blurbs[b.id] && <span className="psub">{blurbs[b.id]}</span>}</span>
            <span className="pmeta"><StandingCounts claims={b.claims} /></span>
          </ListBoxItem>
          {b.claims.map(c => <ListBoxItem key={c.id} id={`c:${b.id}:${c.id}`} textValue={`${c.id} ${c.statement}`} className="pitem">
            <span className="pid mono">{c.id}</span>
            <span className="pbody"><span className="ptext">{c.statement}</span><span className="psub">{[c.kind, c.scope.level, ...c.mappings.map(m => targetLabel(m.target, report.dossier))].join(' · ')}</span></span>
            <span className="pmeta">{c.freshness !== 'current' && <Badge word={c.freshness} small />}<Badge word={c.standing} label={SHORT[c.standing]} title={c.label} small /></span>
          </ListBoxItem>)}
        </ListBoxSection>)}
        {reviews.length > 0 && <ListBoxSection id="s:reviews">
          <Header className="plist-h">Reviews <span className="muted">{reviews.length}</span>{!report.reviews.dossierReviewed && <span className="muted"> · dossier review owed</span>}</Header>
          {reviews.map(r => <ListBoxItem key={r.file} id={`r:${r.file}`} textValue={r.file} className="pitem">
            <span className="pid" />
            <span className="pbody"><span className="mono">{reviewName(r.file)}</span>{r.record && <span className="psub">{r.record.subject.kind === 'dossier' ? 'dossier' : r.record.subject.behaviors.join(', ')}</span>}</span>
            <span className="pmeta">{changedSince(r) > 0 && <Badge word="stale" label={`${changedSince(r)} changed`} small />}<Badge word={r.status} small /></span>
          </ListBoxItem>)}
        </ListBoxSection>}
      </ListBox>
      {rest.length > 0 && <section aria-label="Without a behavior">
        <div className="plist-h">No behavior <span className="muted">{rest.length}</span></div>
        <div className="bv-rest">{rest.map((item, i) => <a key={`${item.kind}:${item.id}:${item.scenario}:${i}`} className="chip" href={unassociatedHref(item, report.dossier)}>{item.kind === 'passage' || item.kind === 'walk' ? '' : `${item.kind} `}{item.id}{item.scenario && item.kind !== 'scenario' ? ` × ${item.scenario}` : ''}</a>)}</div>
      </section>}
    </div>
  </aside>;
}

// ---------- The detail of the selected behavior, claim or review ----------
function BehaviorDetail({ behavior }) {
  return <div className="detail">
    <div className="d-head"><strong>{behavior.title}</strong><span className="mono muted">{behavior.id}</span><StandingCounts claims={behavior.claims} /><span className="top-gap" /><LinkButton /></div>
    <div className="doc-pad"><DocumentText text={behavior.body} source={behavior.path} skipTitle /></div>
  </div>;
}

function ClaimDetail({ claim, behavior, dossier }) {
  return <div className="detail">
    <div className="d-head"><span className="mono">{behavior.id}/{claim.id}</span><Badge word={claim.standing} label={claim.label} /><Badge word={claim.freshness} /><span className="top-gap" /><LinkButton /></div>
    <p className="ptext-full">{claim.statement}</p>
    <Sec title="Scope" aside={claim.kind}>
      <KV rows={[[claim.scope.level, claim.scope.description], ...claim.pins.map(pin => [<Badge word={pin.freshness} small />, <><span className="mono wrap">{pin.ref}</span>{pin.reasons.map(reason => <div key={reason} className="t-warn">{reason}</div>)}</>])]} />
    </Sec>
    {claim.reasons.length > 0 && <Sec title="Not current"><ul className="list t-warn">{claim.reasons.map(text => <li key={text}>{text}</li>)}</ul></Sec>}
    {claim.assumptions.length > 0 && <Sec title="Assumptions" aside={claim.assumptions.length}><ul className="list">{claim.assumptions.map(text => <li key={text}>{text}</li>)}</ul></Sec>}
    {claim.mappings.length ? claim.mappings.map(mapping => <MappingSection key={mapping.key} mapping={mapping} dossier={dossier} />) : <Sec title="Mappings" aside="none" />}
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
      ['review', mapping.assessment.records.length ? mapping.assessment.records.map((record, i) => <div key={`${record.review}:${i}`}><Badge word={record.result === 'supported' ? 'supported' : record.result === 'contradicted' ? 'contradicted' : 'pending'} label={record.result} small /><a className="mono" href={dossierHref(dossier, { review: record.review })}>{reviewName(record.review)}</a><div>{record.rationale}</div></div>) : <span className="muted">unreviewed</span>],
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
    <span>{words(item.kind)}</span>{item.freshness !== 'current' && <Badge word={item.freshness} small />}{item.deciding && <span className="chip">decides</span>}{!item.admissible && <span className="chip">not admissible</span>}
    {Object.entries(item.outcomes).map(([check, outcome]) => <span className="chip mono" key={check}>{check} {outcome}</span>)}
    <div className="small wrap">{href ? <a className="mono" href={href}>{item.entry}</a> : <span className="mono">{item.path}</span>}{item.trial && <span className="muted"> {item.trial}</span>}</div>
    {item.reach?.text && <div className="small muted">{item.reach.text}</div>}
    {item.reasons.length > 0 && <div className="small t-warn">{item.reasons.join('; ')}</div>}
  </div>;
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
  if (error) return <div className="walk-player muted">No trace. <a href={modelHref}>Model</a></div>;
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

function ReviewDetail({ review, dossier }) {
  const record = review.record;
  return <div className="detail">
    <div className="d-head"><span className="mono">{reviewName(review.file)}</span><Badge word={review.status} /><span className="top-gap" /><LinkButton /></div>
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
    {record?.assessments.length > 0 && <Sec title="Assessments" aside={record.assessments.length}><table className="dt"><tbody>{record.assessments.map(a => <tr key={a.mapping}><td><a className="mono" href={dossierHref(dossier, { behavior: a.mapping.split('/')[0], claim: a.mapping.split('/')[1] })}>{a.mapping}</a></td><td><Badge word={a.result === 'supported' ? 'supported' : a.result === 'contradicted' ? 'contradicted' : 'pending'} label={a.result} small />{review.changed.claims.includes(a.mapping.split('/').slice(0, 2).join('/')) && <Badge word="stale" label="out of effect" small />}</td></tr>)}</tbody></table></Sec>}
    <div className="doc-pad"><DocumentText text={review.body} source={`${dossier}/${review.file}`} /></div>
  </div>;
}
// How many claims and explanations of a review's subject changed since it was written.
const changedSince = review => review.changed.claims.length + review.changed.explanations.length;
