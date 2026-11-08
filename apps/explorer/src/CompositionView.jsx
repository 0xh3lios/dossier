// One composition: its members, the wiring between them and the actors that send into them, with the
// properties under each scenario, every cell's trace, closure, walks, evidence and the decision log.
import { useEffect, useMemo, useState } from 'react';
import { Button, Label, Radio, RadioGroup, Tab, TabList, TabPanel, Tabs, ToggleButton } from 'react-aria-components';
import { api, familyOf, MAX_NODES, setParams, shortTime, useApp, useData, useNarrow } from './lib.js';
import { boxSize, layoutComposition } from './layout.js';
import { arrowHead, Graph } from './Graph.jsx';
import { Badge, DecideLine, Failed, KV, LinkButton, Loading, None, Owner, Sec } from './bits.jsx';
import { EvidencePanel, LogPanel } from './PartView.jsx';

const fmt = v => (v === undefined || v === null ? '' : typeof v === 'string' ? v : JSON.stringify(v));
const ISSUES = ['lapsed', 'miscalled', 'hollow', 'held', 'pending', 'drawn', 'owed', 'unresolved'];
const issueLine = marks => {
  const c = {};
  for (const m of Object.values(marks || {})) if (ISSUES.includes(m)) c[m] = (c[m] || 0) + 1;
  return Object.entries(c).map(([m, n]) => `${n} ${m}`).join(' · ');
};

function useCompositionGraph(root, s, scenario, show) {
  const [g, setG] = useState(null);
  const model = useMemo(() => {
    if (!root || !s) return null;
    const members = new Set(s.members.map(m => m.id));
    const comp = id => root.parts.find(x => x.id === id);
    const dossier = id => root.dossiers.find(x => x.id === id);
    const sc = s.scenarios.find(x => x.id === scenario);
    const nodes = new Map(), edges = [];
    const node = (id, n) => { if (!nodes.has(id)) nodes.set(id, { id, ...n, ...boxSize(n.name, n.aside, n.lines || []) }); };
    for (const m of s.members) {
      const c = comp(m.id), line = issueLine(dossier(m.id)?.marks);
      node(m.id, { kind: 'member', name: m.id, aside: c?.tier || '', lines: line ? [line] : [], families: line ? ['warning'] : [] });
    }
    const outside = id => { node(`out:${id}`, { kind: 'outside', name: id, aside: 'outside', lines: [] }); return `out:${id}`; };
    for (const w of s.wiring) edges.push({ kind: 'wire', source: w.effect.part, target: w.event.part, label: `${w.effect.name} → ${w.event.name}` });
    const wired = new Set(s.wiring.map(w => `${w.event.part}.${w.event.name}`));
    const seams = new Set();
    for (const m of s.members) {
      const c = comp(m.id);
      if (!c) continue;
      const senders = new Map();
      for (const e of c.events) {
        if (!e.from || e.from.kind === 'unknown' || wired.has(`${m.id}.${e.name}`)) continue;
        let src;
        if (e.from.kind === 'actor') { if (!show.actors) continue; src = `actor:${e.from.id}`; }
        else if (members.has(e.from.id)) src = e.from.id;
        else { if (!show.outside) continue; src = outside(e.from.id); }
        if (!senders.has(src)) senders.set(src, []);
        senders.get(src).push(e.name);
      }
      for (const [src, names] of senders) {
        if (src.startsWith('actor:')) {
          const a = root.actors.find(x => `actor:${x.id}` === src);
          const mode = sc?.modes?.[a.id] || (sc ? 'honest' : null);
          const win = sc?.windows?.[a.id];
          node(src, { kind: 'actor', name: a.name, aside: a.kind, mode, lines: mode ? [`${mode}${win ? ` ticks ${win.from}..${win.until ?? '∞'}` : ''}`] : [] });
        }
        const free = members.has(src) ? names.filter(n => s.free.includes(`${m.id}.${n}`)) : [];
        const sent = names.filter(n => !free.includes(n));
        if (sent.length) edges.push({ kind: 'send', source: src, target: m.id, label: sent.join(', ') });
        if (free.length) edges.push({ kind: 'free', source: src, target: m.id, label: `${free.join(', ')} (unwired here)` });
      }
      if (show.seams) for (const sm of c.seams) {
        const pair = [m.id, sm.piece].sort().join('|');
        if (seams.has(pair)) continue;
        seams.add(pair);
        if (members.has(sm.piece)) edges.push({ kind: 'seam', source: m.id, target: sm.piece, label: sm.id });
        else if (show.outside) edges.push({ kind: 'seam', source: m.id, target: outside(sm.piece), label: sm.id });
      }
    }
    return { nodes: [...nodes.values()], edges: edges.map((e, i) => ({ ...e, id: `e${i}` })) };
  }, [root, s, scenario, show.actors, show.outside, show.seams]);
  useEffect(() => {
    if (!model) return undefined;
    if (model.nodes.length > MAX_NODES) { setG({ refused: model.nodes.length }); return undefined; }
    let live = true;
    const pane = document.querySelector('.sv .center')?.getBoundingClientRect() || { width: innerWidth - 660, height: innerHeight - 80 };
    layoutComposition(model.nodes, model.edges, { width: Math.max(300, pane.width - 56), height: Math.max(240, pane.height - 56) }).then(l => live && setG({ model, l, key: `${s.id}:${scenario}:${show.actors}${show.outside}${show.seams}:${Date.now()}` }), e => live && setG({ error: e }));
    return () => { live = false; };
  }, [model]);
  return g;
}

export function CompositionView({ id, params }) {
  const { version, root, colorMode, announce } = useApp();
  const { data: s, error } = useData(api.composition(id), version);
  const narrow = useNarrow();
  const tab = params.tab === 'setup' && !narrow ? 'cells' : params.tab || 'cells';
  const scenario = params.scenario || '', cellKey = params.cell || null, sel = params.sel || null;
  const [show, setShow] = useState({ actors: true, outside: true, seams: true });
  const g = useCompositionGraph(root, s, scenario, show);
  const [prop, scen] = cellKey ? cellKey.split(':') : [null, null];
  const playing = params.play?.startsWith('cell:') && prop;
  const { data: trace } = useData(playing ? api.compositionTrace(id, prop, scen) : null, version);
  const step = playing && trace ? Math.min(Number(params.play.split(':')[1] || 0), trace.steps.length - 1) : 0;
  const setStep = n => {
    if (!trace) return;
    const k = Math.max(0, Math.min(n, trace.steps.length - 1));
    setParams({ play: `cell:${k}` });
    const st = trace.steps[k];
    announce(`Step ${k}: ${st.action || ''}${st.moved.length ? `, ${st.moved.join(' and ')} moved` : ''}`);
  };
  useEffect(() => {
    const onStep = e => { if (trace) setStep(step + e.detail); };
    addEventListener('explorer:step', onStep);
    return () => removeEventListener('explorer:step', onStep);
  });

  const elements = useMemo(() => {
    if (!g?.l) return null;
    const cur = trace?.steps?.[step];
    const moved = new Set(cur?.moved || []), actor = cur?.actor ? `actor:${cur.actor}` : null;
    const nodes = g.model.nodes.map(n => {
      const box = g.l.nodes.get(n.id);
      return {
        id: n.id, type: 'box', position: { x: box.x, y: box.y }, width: n.w, height: n.h, ariaLabel: `${n.kind === 'actor' ? 'Actor' : n.kind === 'outside' ? 'Outside this composition' : 'Member'} ${n.name}${n.mode ? `, ${n.mode}` : ''}`,
        data: { ...n, lineFamilies: n.families, family: n.kind === 'actor' && n.mode === 'malicious' ? 'critical' : 'neutral', selected: sel === n.id, current: moved.has(n.id) || actor === n.id },
      };
    });
    const edges = g.model.edges.map(e => {
      const r = g.l.edges.get(e.id);
      return {
        id: e.id, source: e.source, target: e.target, type: 'routed', markerEnd: e.kind === 'seam' ? undefined : arrowHead(e.kind),
        data: { points: r?.points || [], label: r?.label, family: e.kind, dash: e.kind === 'free' ? '6 4' : e.kind === 'seam' ? '2 4' : undefined, selected: sel === e.id, current: !!(cur && moved.has(e.target) && (moved.has(e.source) || actor === e.source)) },
      };
    });
    return { nodes, edges };
  }, [g, sel, trace, step]);

  if (error) return <Failed error={error} />;
  if (!s || !root) return <Loading what={id} />;
  const selected = sel && g?.model?.nodes.find(n => n.id === sel);
  const setup = (
    <>
        <Sec title="Members" aside={s.members.length}>
          {s.members.map(m => {
            const d = root.dossiers.find(x => x.id === m.id), line = issueLine(d?.marks);
            return <div key={m.id} className="member"><a href={`#/part/${m.id}?from=${s.id}`} className="t-strong">{m.id}</a> <span className="muted">{d?.tier}</span>{line && <div className="small t-warn">{line}</div>}</div>;
          })}
        </Sec>
        <Sec title="Scenario">
          <RadioGroup className="radios" aria-label="Scenario" value={scenario} onChange={v => setParams({ scenario: v })}>
            <Radio value="">none</Radio>
            {s.scenarios.map(sc => <Radio key={sc.id} value={sc.id}>{sc.id}{sc.claimed ? '' : ' ·'}</Radio>)}
          </RadioGroup>
          {scenario && <ScenarioCard sc={s.scenarios.find(x => x.id === scenario)} actors={root.actors} />}
        </Sec>
        <Sec title="Show">
          <div className="tgl-row">
            <ToggleButton className="tbtn" isSelected={show.actors} onChange={v => setShow(o => ({ ...o, actors: v }))}>Actors</ToggleButton>
            <ToggleButton className="tbtn" isSelected={show.outside} onChange={v => setShow(o => ({ ...o, outside: v }))}>Outside</ToggleButton>
            <ToggleButton className="tbtn" isSelected={show.seams} onChange={v => setShow(o => ({ ...o, seams: v }))}>Seams</ToggleButton>
          </div>
        </Sec>
    </>
  );
  return (
    <div className={`sv${narrow ? ' is-narrow' : ''}`}>
      {!narrow && <aside className="side-l">{setup}</aside>}
      <div className="center">
        {g?.refused ? <div className="pad"><b>Too large to draw:</b> {g.refused} boxes, over the limit of {MAX_NODES}. Members: {s.members.map(m => <a key={m.id} className="chip" href={`#/part/${m.id}?from=${s.id}`}>{m.id}</a>)}</div>
          : g?.error ? <Failed error={g.error} />
          : !elements ? <Loading what="the graph" />
          : <Graph graphKey={g.key} bounds={{ width: g.l.width, height: g.l.height }} nodes={elements.nodes} edges={elements.edges} colorMode={colorMode} label={`Composition ${s.id}`}
              onSelect={nid => setParams({ sel: nid })}
              onActivate={nid => { const n = g.model.nodes.find(x => x.id === nid); if (n?.kind === 'member') location.hash = `/c/${nid}?from=${s.id}`; else if (n?.kind === 'outside') location.hash = `/c/${nid.slice(4)}`; else setParams({ sel: nid }); }} />}
      </div>
      <div className="side-r">
        <CompositionHead s={s} />
        {selected && <NodeCard n={selected} s={s} root={root} />}
        <Tabs selectedKey={tab} onSelectionChange={k => setParams({ tab: k })} className="tabs">
          <TabList aria-label="Panels" className="tablist">
            {narrow && <Tab id="setup">Setup</Tab>}
            <Tab id="cells">Cells</Tab><Tab id="properties">Properties</Tab><Tab id="walks">Walks</Tab>
            <Tab id="evidence">Evidence <span className="muted">{s.evidence.length}</span></Tab><Tab id="closure">Closure</Tab><Tab id="log">Log</Tab>
          </TabList>
          {narrow && <TabPanel id="setup" className="panel is-scroll">{setup}</TabPanel>}
          <TabPanel id="cells" className="panel is-scroll">
            <CellsMatrix s={s} scenario={scenario} cellKey={cellKey} />
            {cellKey && <CellDetail s={s} prop={prop} scen={scen} trace={playing ? trace : null} step={step} setStep={setStep} />}
          </TabPanel>
          <TabPanel id="properties" className="panel is-scroll"><Properties s={s} sel={sel} /></TabPanel>
          <TabPanel id="walks" className="panel is-scroll">
            {s.walks.length ? <table className="dt"><tbody>{s.walks.map(w => <tr key={`${w.id}${w.scenario}`}><td className="mono">{w.id}</td><td className="mono">{w.scenario}</td><td><Badge word={w.mark} small /></td><td className="mono small">{w.trial}</td>{w.lapsed?.length ? <td className="t-crit">{w.lapsed.join('; ')}</td> : <td />}</tr>)}</tbody></table> : <div className="pad muted">No walks.</div>}
          </TabPanel>
          <TabPanel id="evidence" className="panel is-scroll"><EvidencePanel dossier={id} evidence={s.evidence} entry={params.entry} composition /></TabPanel>
          <TabPanel id="closure" className="panel is-scroll"><Closure s={s} /></TabPanel>
          <TabPanel id="log" className="panel is-scroll"><LogPanel decisions={s.decisions} /></TabPanel>
        </Tabs>
      </div>
    </div>
  );
}

// The composition's next step as verify routes it, its tripwires and flags, and why its wiring does
// not compose, when it does not: what an empty graph or matrix needs said beside it.
function CompositionHead({ s }) {
  return (
    <div className="detail is-head">
      {s.route && <Sec title="Next" aside={s.route.pass}>{(s.route.why || []).map((w, i) => <div key={i} className="why">{w}</div>)}</Sec>}
      {s.errors?.length > 0 && <Sec title="Does not compose">{s.errors.map((e, i) => <div key={i} className="small t-crit">{e}</div>)}</Sec>}
      {(s.tripwires.length > 0 || s.flags.length > 0) && <Sec title="Flags">{s.tripwires.map((t, i) => <div key={`t${i}`}><Badge word="violated" label={t.name} small /> <span className="muted">{t.where}</span></div>)}{s.flags.map((f, i) => <div key={i}><span className="chip" title={f.means || undefined}>{f.name}</span> <span className="muted">{f.where}</span></div>)}</Sec>}
    </div>
  );
}

function ScenarioCard({ sc, actors }) {
  if (!sc) return null;
  if (sc.missing) return <div className="t-crit small">{sc.id} is not declared</div>;
  const name = id => actors.find(a => a.id === id)?.name || id;
  return (
    <div className="scard">
      <table className="dt"><tbody>
        {Object.entries(sc.modes || {}).map(([a, m]) => <tr key={a}><td>{name(a)}</td><td><span className={`mode is-${m}`}>{m}</span>{sc.windows?.[a] ? <span className="muted"> ticks {sc.windows[a].from}..{sc.windows[a].until ?? '∞'}</span> : null}</td></tr>)}
        {!Object.keys(sc.modes || {}).length && <tr><td colSpan={2} className="muted">every actor honest</td></tr>}
        {Object.entries(sc.start || {}).map(([k, v]) => <tr key={k}><td className="mono">{k}</td><td className="mono">starts {fmt(v)}</td></tr>)}
      </tbody></table>
      {sc.strongerThan?.length > 0 && <div className="small">stronger than {sc.strongerThan.join(', ')}</div>}
      {sc.notes && <div className="small muted">{sc.notes}</div>}
    </div>
  );
}

function NodeCard({ n, s, root }) {
  const comp = n.kind === 'actor' ? null : root.parts.find(c => c.id === (n.kind === 'outside' ? n.id.slice(4) : n.id));
  const actor = n.kind === 'actor' ? root.actors.find(a => `actor:${a.id}` === n.id) : null;
  return (
    <div className="ncard">
      <div className="d-head"><b>{n.name}</b> <span className="muted">{n.kind === 'actor' ? `actor · ${actor?.kind}` : n.kind === 'outside' ? 'outside this composition' : `member · ${comp?.tier}`}</span><span className="top-gap" />
        {comp && <a className="btn is-tiny" href={`#/part/${comp.id}?from=${s.id}`}>Open</a>}
        <Button className="btn is-tiny" aria-label="Clear selection" onPress={() => setParams({ sel: null })}>✕</Button>
      </div>
      {actor && <div className="small">modes {actor.modes.join(', ')}{actor.pins?.length ? ` · pins ${actor.pins.join(', ')}` : ''}</div>}
      {comp && <div className="small mono">{comp.events.map(e => `${e.name}←${e.sender}`).join(' · ')}</div>}
    </div>
  );
}

// Columns run from weaker to stronger: a scenario declared stronger than others comes after them.
function byStrength(ids, scenarios) {
  const stronger = id => scenarios.find(x => x.id === id)?.strongerThan || [];
  const depth = (id, seen = new Set()) => (seen.has(id) ? 0 : (seen.add(id), Math.max(0, ...stronger(id).map(w => 1 + depth(w, seen)))));
  return [...ids].sort((a, b) => depth(a) - depth(b));
}

function CellsMatrix({ s, scenario, cellKey }) {
  const props = [...new Set(s.cells.map(c => c.property))];
  const scens = byStrength(new Set(s.cells.map(c => c.scenario)), s.scenarios);
  const over = id => s.scenarios.find(x => x.id === id)?.strongerThan || [];
  const cell = (p, sc) => s.cells.find(c => c.property === p && c.scenario === sc);
  if (!props.length) return <div className="pad muted">No cells yet.</div>;
  return (
    <table className="dt matrix" aria-label="Properties under scenarios">
      <thead><tr><th />{scens.map(sc => <th key={sc} className={`mono${sc === scenario ? ' is-col' : ''}`}>{sc}{over(sc).length > 0 && <div className="muted small">≥ {over(sc).join(', ')}</div>}</th>)}</tr></thead>
      <tbody>
        {props.map(p => (
          <tr key={p}>
            <th className="mono">{p}</th>
            {scens.map(sc => {
              const c = cell(p, sc), key = `${p}:${sc}`;
              const word = c ? c.words : null;
              return (
                <td key={sc} className={`${sc === scenario ? 'is-col' : ''}${cellKey === key ? ' is-sel' : ''}`}>
                  {c ? <Button className="cellbtn" aria-label={`${p} under ${sc}: ${word}`} onPress={() => setParams({ cell: key, play: null })}><Badge word={word} small /></Button> : null}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CellDetail({ s, prop, scen, trace, step, setStep }) {
  const c = s.cells.find(x => x.property === prop && x.scenario === scen);
  if (!c) return null;
  const passage = s.passages.find(p => p.id === prop);
  const word = c.words;
  return (
    <div className="detail">
      <div className="d-head"><b className="mono">{prop}</b> <span className="muted">under</span> <b className="mono">{scen}</b> <Badge word={word} small /><span className="top-gap" /><LinkButton />
        {c.steps > 0 && <Button className="btn is-tiny" onPress={() => setParams({ play: 'cell:0' })}>Play trace</Button>}
      </div>
      {passage && <p className="ptext-full">{passage.text}</p>}
      <KV rows={[
        ['means', c.means], ['reach', c.reach], ['trial', <span className="mono">{c.trial}</span>], ['blunder', c.held],
        c.impliedBy && ['implied by', c.impliedBy], c.open && ['open', 'closure or scenario'],
        c.lapsed?.length ? ['moved', <span className="t-crit">{c.lapsed.join('; ')}</span>] : null,
        c.accepted && ['accepted', <span>“{c.accepted.words}” <span className="muted">{shortTime(c.accepted.time)}</span></span>],
        c.acceptanceLapsed && ['acceptance lapsed', <span className="t-crit">{c.acceptanceLapsed.join('; ')}</span>],
        c.problem && ['problem', <span className="t-crit">{c.problem}</span>],
      ]} />
      {c.mark === 'violated' && !c.accepted && <Sec title="Owner decides"><DecideLine dossier={s.id} verb="risk" args={[prop, scen]} /></Sec>}
      {trace && <CompositionTrace trace={trace} step={step} setStep={setStep} />}
    </div>
  );
}

function CompositionTrace({ trace, step, setStep }) {
  const n = trace.steps.length;
  return (
    <div className="player">
      <div className="player-bar">
        <b>Trace</b><span className="muted">step {step}/{n - 1}</span><span className="top-gap" />
        <Button className="btn is-tiny" aria-label="Previous step" isDisabled={step <= 0} onPress={() => setStep(step - 1)}>◀</Button>
        <Button className="btn is-tiny" aria-label="Next step" isDisabled={step >= n - 1} onPress={() => setStep(step + 1)}>▶</Button>
        <Button className="btn is-tiny" aria-label="First step" onPress={() => setStep(0)}>⟲</Button>
      </div>
      <table className="dt steps">
        <thead><tr><th>#</th><th>action</th><th>moved</th><th>changed</th></tr></thead>
        <tbody>
          {trace.steps.map((st, i) => (
            <tr key={i} className={i === step ? 'is-current' : ''}>
              <td><Button className="idbtn" aria-label={`Go to step ${i}`} onPress={() => setStep(i)}>{i}</Button></td>
              <td>{st.stuttering ? 'stutter' : st.backTo != null ? `back to ${st.backTo}` : st.action}{st.actor ? <span className="muted"> {st.actor}</span> : null}</td>
              <td>{st.moved.join(', ')}</td>
              <td className="mono small">{st.changed.map(ch => `${ch.member ? `${ch.member}.` : '·'}${ch.name} ${fmt(ch.before)}→${fmt(ch.after)}`).join('  ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Properties({ s, sel }) {
  return (
    <div className="detail">
      {s.passages.map(p => (
        <div key={p.id} className={`prop${sel === p.id ? ' is-sel' : ''}`}>
          <div className="d-head"><b className="mono">{p.id}</b> <Owner owner={p.owner} />{p.held && <Badge word={p.held === 'caught' ? 'checked' : p.held} label={`blunder ${p.held}`} small />}<span className="top-gap" /></div>
          <p className="small">{p.text}</p>
          {p.owner !== 'settled' && <DecideLine dossier={s.id} verb="accept" args={[p.id]} />}
        </div>
      ))}
    </div>
  );
}

function Closure({ s }) {
  return (
    <div className="detail">
      <Sec title="Wiring" aside={s.wiring.length}>{s.wiring.length ? s.wiring.map((w, i) => <div key={i} className="mono small">{w.effect.part}.{w.effect.name} → {w.event.part}.{w.event.name}</div>) : <None />}</Sec>
      <Sec title="Left unwired" aside={s.free.length}>{s.free.length ? <div className="mono small">{s.free.join(', ')}</div> : <None />}</Sec>
      <Sec title="Closure rules" aside={s.closure.length}>{s.closure.length ? s.closure.map((r, i) => <div key={i} className="small">{r.asset || 'any asset'} · edges {r.edges.join(', ') || 'none'}{r.modules.length ? ` · modules ${r.modules.join(', ')}` : ''}</div>) : <None />}</Sec>
      <Sec title="Missing from the closure" aside={s.closureMissing.length}>{s.closureMissing.length ? <div className="t-crit small">{s.closureMissing.join(', ')}</div> : <None />}</Sec>
    </div>
  );
}
