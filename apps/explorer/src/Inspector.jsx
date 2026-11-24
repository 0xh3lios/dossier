// Why a claim holds, in four steps built from its records: what it is about and the source it pins, what
// each run behind it showed, the independent review, and the owner's decision. Each step opens the record
// or the Workbench view it comes from. The chain arranges the report; it concludes nothing.
import { Button } from 'react-aria-components';
import { hrefFor, READ_WORD, sentences, shortTime } from './lib.js';
import { Badge } from './bits.jsx';
import { dossierHref, evidenceHref, targetHref, targetLabel } from './behavior-navigation.js';

const LEVEL = { model: 'the model', source: 'the source', deployment: 'the deployment' };
const RELATION = { supports: 'Supports it', challenges: 'Tests it against', illustrates: 'Illustrates it' };
// What a kind of evidence is, and what its answer showed, in plain words.
const KIND = { 'path-witness': 'a recorded path', 'finite-chart': 'the chart\'s check over every state', 'bounded-model': 'a model check within its reach', 'inductive-model': 'a proof by induction', 'model-observation': 'a model check that saw it happen', 'external-cases': 'cases an external runner executed', sensitivity: 'a planted fault', 'knowledge-backing': 'a record in the knowledge base' };
const SHOWED = { holds: 'it holds', counterexample: 'it found a path that breaks it', witness: 'the path occurs', observed: 'it was seen', available: 'the record resolves', unknown: 'no outcome' };
const RESULT = { supported: 'supported', contradicted: 'contradicted', 'too-broad': 'too broad for the evidence', inconclusive: 'inconclusive' };
const reviewName = file => file.replace(/^reviews\//, '').replace(/\.md$/, '');
const first = text => sentences(text)[0] || text;

function Step({ n, title, children, links }) {
  return <li className="why-step">
    <span className="why-n" aria-hidden="true">{n}</span>
    <div className="why-body">
      <div className="why-title">{title}</div>
      {children}
      {links?.length > 0 && <div className="why-links">{links.filter(Boolean).map(([label, href]) => <a key={label} href={href}>{label}</a>)}</div>}
    </div>
  </li>;
}

export function Inspector({ claim, behavior, dossier, onClose }) {
  if (!claim) return null;
  const [kindPlural, id] = dossier.split('/');
  const kind = kindPlural === 'parts' ? 'part' : 'composition';
  const work = params => hrefFor({ view: kind, id, params: { lens: 'work', ...params } });
  const word = claim.accepted ? 'accepted' : claim.standing;
  const owners = claim.mappings.flatMap(m => m.evidence.owner.map(o => ({ ...o, mapping: m.id })));
  return <div className="why">
    <div className="why-head">
      <h2>Why this holds</h2>
      <Button className="btn is-tiny" aria-label="Close" onPress={onClose}>✕</Button>
    </div>
    <p className="why-claim">{claim.statement}</p>
    <div className="why-tags"><Badge word={word} label={READ_WORD[word]} small title={claim.label} />{claim.freshness !== 'current' && <Badge word={claim.freshness} small />}<span className="muted small">{claim.kind === 'requirement' ? 'requirement' : 'description'}</span></div>
    <ol className="why-steps">
      <Step n={1} title="Source" links={[['Record', work({ behavior, claim: claim.id })]]}>
        <div>About {LEVEL[claim.scope.level] || claim.scope.level}: <span className="muted">{claim.scope.description}</span></div>
        {claim.scope.pins.length ? claim.pins.map(p => <div key={p.ref} className="small"><span className="mono">{p.ref}</span> at <span className="mono">{p.revision}</span>{p.freshness !== 'current' && <> <Badge word={p.freshness} small /></>}{p.reasons.map(r => <div key={r} className="t-warn">{r}</div>)}</div>) : <div className="small muted">Pins no record.</div>}
        {claim.assumptions.length > 0 && <div className="small">Assumes: {claim.assumptions.join(' ')}</div>}
      </Step>
      <Step n={2} title="Run" links={[]}>
        {!claim.mappings.length && <div className="muted">Nothing maps it to the model yet.</div>}
        {claim.mappings.map(m => {
          const items = [...m.evidence.evidence].sort((x, y) => Number(!!y.deciding) - Number(!!x.deciding));
          const target = targetHref(m.target);
          return <div key={m.id} className="why-map">
            <div>{RELATION[m.relation] || m.relation}: {target ? <a className="mono" href={target}>{targetLabel(m.target, dossier)}</a> : <span className="mono">{targetLabel(m.target, dossier)}</span>}</div>
            {!items.length && <div className="small muted">No run yet{m.evidence.reasons.length ? `: ${m.evidence.reasons.join('; ')}` : ''}.</div>}
            {items.slice(0, 3).map((e, i) => <div key={`${e.path}:${i}`} className="small why-run">
              <span>{KIND[e.kind] || e.kind}{e.checker ? <span className="muted"> ({e.checker})</span> : null}: {e.kind === 'sensitivity' ? (Object.values(e.outcomes || {}).some(o => /violated|counterexample|fail/.test(o)) ? 'the check caught it' : 'the check missed it') : SHOWED[e.polarity] || e.polarity}{e.freshness !== 'current' ? <> <Badge word={e.freshness} small /></> : null}</span>
              {e.reach?.text && <div className="muted">{first(e.reach.text)}</div>}
              {e.reading && <div className="why-reading">{first(e.reading)}</div>}
              {e.entry && <a href={evidenceHref(e)}>Run {e.entry}</a>}
            </div>)}
            {items.length > 3 && <div className="small muted">+{items.length - 3} more runs</div>}
            {m.evidence.conflicts.length > 0 && <div className="small t-crit">{m.evidence.conflicts.join('; ')}</div>}
          </div>;
        })}
      </Step>
      <Step n={3} title="Independent review">
        {claim.mappings.map(m => <div key={m.id} className="why-map">
          {m.assessment.state === 'unreviewed' && <div className="muted">Not yet reviewed{claim.mappings.length > 1 ? ` (${m.id})` : ''}.</div>}
          {m.assessment.state === 'contested' && <div className="t-warn">The reviews disagree{claim.mappings.length > 1 ? ` on ${m.id}` : ''}.</div>}
          {m.assessment.records.map((r, i) => <div key={`${r.review}:${i}`} className="small">
            <Badge word={r.result === 'supported' ? 'supported' : r.result === 'contradicted' ? 'contradicted' : r.result} label={RESULT[r.result] || r.result} small />
            <a href={dossierHref(dossier, { lens: 'work', review: r.review })}>{reviewName(r.review)}</a>
            {r.rationale && <div className="muted">{first(r.rationale)}</div>}
          </div>)}
        </div>)}
      </Step>
      <Step n={4} title="Owner" links={[['Decisions', work({ view: 'model', tab: 'log' })]]}>
        {!owners.length && <div className="muted">No decision of the owner bears on it.</div>}
        {owners.map((o, i) => <div key={i} className="small">
          <span className="mono">{o.passage}{o.scenario ? ` × ${o.scenario}` : ''}</span>{' '}
          {o.accepted ? <>accepted the violation: “{o.accepted.words}” <span className="muted">{shortTime(o.accepted.time)}</span></>
            : o.decision ? <>{o.decision.verb === 'accept' ? 'accepted it' : o.decision.verb === 'reject' ? 'rejected it' : o.decision.verb}: “{o.decision.words}” <span className="muted">{shortTime(o.decision.time)}</span></>
            : o.state === 'settled' ? 'accepted it' : 'not yet accepted'}
          {o.acceptanceLapsed.length > 0 && <div className="t-warn">The acceptance lapsed: {o.acceptanceLapsed.join('; ')}</div>}
        </div>)}
      </Step>
    </ol>
    <a className="why-open" href={work({ behavior, claim: claim.id })}>Open in workbench →</a>
  </div>;
}
