// One component: its prose beside its statechart, the grid, the walks as lanes, and the players.
import { useEffect, useMemo, useState } from 'react';
import {
  Button, Cell, Column, Header, Input, Label, ListBox, ListBoxItem, ListBoxSection, Popover, Row, Select, SelectValue, Switch, Tab, Table,
  TableBody, TableHeader, TabList, TabPanel, Tabs, TextField, ToggleButton, ToggleButtonGroup,
} from 'react-aria-components';
import { api, argsText, dataOf, eventText, familyOf, isOpenMark, KIND, MAX_NODES, sentOf, setParams, shortTime, stripHash, useApp, useData, useNarrow } from './lib.js';
import { layoutChart } from './layout.js';
import { arrowHead, Graph } from './Graph.jsx';
import { Badge, DecideLine, Failed, KV, LinkButton, Loading, MarkBadge, MarkExplain, None, Owner, Sec } from './bits.jsx';
import { doubtTrack, lightsOf, pathTrack, traceTrack, walkTrack } from './tracks.js';

const fmt = v => (v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v));
const CENTERS = ['chart', 'grid', 'walks'];
// The moves among the passages that decide an event case or a step.
const moves = k => (k.by || []).filter(id => id.startsWith('M'));
// A step no passage decides: a trace's step that encodes no move, a condition that cannot be evaluated
// there, or, on the chart, a pair the prose leaves unsaid.
function NoDecider({ s, kind }) {
  if (kind === 'trace') return <span className="muted mono">{s.stuttering ? 'stutter' : s.action || '·'}</span>;
  if (s.byError || s.error) return <span title={s.byError || s.error}><Badge word="fail" label="cannot be evaluated" small /></span>;
  return <Badge word="unsaid" small />;
}

// play=walk:W1:2 · doubt:D1:a:0 · trace:<entry>:3 · sim:<snapshot> · path:<from>:<state>:<cond>:<step>
function parsePlay(s) {
  if (!s) return null;
  const p = s.split(':');
  if (p[0] === 'walk') return { kind: 'walk', id: p[1], step: Number(p[2] || 0) };
  if (p[0] === 'doubt') return { kind: 'doubt', id: p[1], alt: p[2] || 'a', step: Number(p[3] || 0) };
  if (p[0] === 'trace') return { kind: 'trace', id: p[1], step: Number(p[2] || 0) };
  if (p[0] === 'sim') return { kind: 'sim', at: p[1] === '' || p[1] == null ? null : Number(p[1]) };
  if (p[0] === 'path') return { kind: 'path', from: Number(p[1] || 0), state: p[2] || '', cond: decodeURIComponent(p[3] || ''), step: Number(p[4] || 0) };
  if (p[0] === 'find') return { kind: 'find', from: Number(p[1] || 0) };
  return null;
}
function formatPlay(p) {
  if (!p) return null;
  if (p.kind === 'walk') return `walk:${p.id}:${p.step}`;
  if (p.kind === 'doubt') return `doubt:${p.id}:${p.alt}:${p.step}`;
  if (p.kind === 'trace') return `trace:${p.id}:${p.step}`;
  if (p.kind === 'sim') return `sim:${p.at ?? ''}`;
  if (p.kind === 'path') return `path:${p.from}:${p.state}:${encodeURIComponent(p.cond || '')}:${p.step}`;
  if (p.kind === 'find') return `find:${p.from}`;
  return null;
}
function parseCond(cond) {
  const m = /^\s*([\w.]+)\s*=\s*(.+?)\s*$/.exec(cond || '');
  if (!m) return null;
  const raw = m[2];
  const value = raw === 'true' ? true : raw === 'false' ? false : /^-?\d+$/.test(raw) ? Number(raw) : raw;
  return { name: m[1], value };
}

function useTrack(id, run, play, version) {
  const traceId = play?.kind === 'trace' ? play.id : null;
  const { data: trace } = useData(traceId ? api.trace(id, traceId) : null, version);
  return useMemo(() => {
    if (!play || !run) return null;
    if (play.kind === 'walk') return walkTrack(run, play.id);
    if (play.kind === 'doubt') return doubtTrack(run, play.id, play.alt);
    if (play.kind === 'trace') return trace ? traceTrack(trace) : null;
    if (play.kind === 'path') {
      const cond = parseCond(play.cond);
      const title = `path to ${play.state}${cond ? ` with ${cond.name} ${cond.value}` : ''}`;
      return pathTrack(run, play.from, s => s && (!play.state || s.leaves.includes(play.state)) && (!cond || s.context[cond.name] === cond.value), title);
    }
    return null;
  }, [play?.kind, play?.id, play?.alt, play?.from, play?.state, play?.cond, run, trace]);
}

// What a passage points at on the chart.
function targetsOf(chart, pid) {
  const t = { nodes: new Set(), edges: new Set(), lines: new Set() };
  if (!pid || !chart) return t;
  if (pid.startsWith('S')) for (const s of chart.states) if (s.passages.includes(pid)) t.nodes.add(`st:${s.key}`);
  const m = chart.transitions.find(x => x.id === pid);
  if (m) (m.stays ? t.lines.add(pid) : t.edges.add(`mv:${pid}`));
  const r = chart.refusals.find(x => x.id === pid);
  if (r) { for (const st of r.states) t.nodes.add(`st:${st}`); t.lines.add(pid); }
  const ev = chart.events.find(x => x.id === pid);
  if (ev) for (const mv of chart.transitions.filter(x => x.event === ev.name)) (mv.stays ? t.lines.add(mv.id) : t.edges.add(`mv:${mv.id}`));
  return t;
}

export function ComponentView({ id, params }) {
  const { version, announce, colorMode } = useApp();
  const { data: c, error } = useData(api.component(id), version);
  const { data: run } = useData(api.run(id), version);
  const narrow = useNarrow();
  const sel = params.sel || null, center = params.center || 'chart';
  const tab = params.tab === 'prose' && !narrow ? 'detail' : params.tab || 'detail';
  const play = parsePlay(params.play);
  const track = useTrack(id, run, play, version);
  const step = play && 'step' in play ? Math.min(play.step, Math.max(0, (track?.steps?.length || 1) - 1)) : 0;
  const [hover, setHover] = useState(null);
  const [opts, setOpts] = useState({ showRefusals: false, showChanges: false });
  const [layout, setLayout] = useState(null);

  useEffect(() => {
    if (!c?.chart) return undefined;
    let live = true;
    setLayout(null);
    if (c.chart.states.length > MAX_NODES) { setLayout({ refused: c.chart.states.length }); return undefined; }
    layoutChart(c.chart, opts).then(l => live && setLayout({ ...l, opts, key: `${id}:${version}:${opts.showRefusals}:${opts.showChanges}` }), e => live && setLayout({ error: e }));
    return () => { live = false; };
  }, [c, opts.showRefusals, opts.showChanges]);

  const setStep = n => {
    if (!track?.steps?.length) return;
    const k = Math.max(0, Math.min(n, track.steps.length - 1));
    setParams({ play: formatPlay({ ...play, step: k }) });
    const s = track.steps[k];
    announce(`Step ${k} of ${track.steps.length - 1}: ${s.label}${s.by?.length ? `, ${s.by.join(' ')}` : ''}${s.refused ? ', refused' : ''}, ${(s.leaves || []).join(' and ')}${s.changed?.length ? `, changed ${s.changed.join(', ')}` : ''}`);
  };
  useEffect(() => {
    const onStep = e => { if (track) setStep(step + e.detail); };
    const onCenter = e => setParams({ center: CENTERS[e.detail - 1] });
    addEventListener('explorer:step', onStep);
    addEventListener('explorer:center', onCenter);
    return () => { removeEventListener('explorer:step', onStep); removeEventListener('explorer:center', onCenter); };
  });
  useEffect(() => {
    if (!sel) return;
    document.querySelector(`.prose [data-key="${CSS.escape(sel)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel, c]);

  if (error) return <Failed error={error} />;
  if (!c) return <Loading what={id} />;
  const select = pid => { setParams({ sel: pid, tab: pid ? 'detail' : tab }); if (pid) announce(`${pid} selected${c.marks[pid] ? `, ${c.marks[pid].mark}` : ''}`); };
  const lights = track ? lightsOf(track, step, c.chart) : play?.kind === 'sim' && run ? { nodes: new Set((run.snapshots[play.at ?? run.initial]?.leaves || []).map(l => `st:${l}`)), edges: new Set(), lines: new Set(), visitedEdges: new Set(), visitedLines: new Set() } : null;

  return (
    <div className={`cv${narrow ? ' is-narrow' : ''}`}>
      {!narrow && <ProsePane c={c} sel={sel} linked={hover} onSelect={select} onHover={setHover} />}
      <div className="center">
        <Tabs selectedKey={center} onSelectionChange={k => setParams({ center: k })} className="tabs is-center">
          <div className="center-bar">
            <TabList aria-label="View" className="tablist">
              <Tab id="chart">Chart</Tab><Tab id="grid">Grid</Tab><Tab id="walks">Walks</Tab>
            </TabList>
            <span className="top-gap" />
            {run && <span className="muted">chart {run.error ? <Badge word="fail" label={run.checks.length ? `${run.passed}/${run.checks.length}` : 'did not run'} small /> : <Badge word={run.outcome === 'pass' ? 'checked' : 'violated'} label={`${run.passed}/${run.checks.length}`} small />} · {run.explored} states</span>}
            <ToggleButton className="tbtn" isSelected={opts.showRefusals} onChange={v => setOpts(o => ({ ...o, showRefusals: v }))}>Refusals</ToggleButton>
            <ToggleButton className="tbtn" isSelected={opts.showChanges} onChange={v => setOpts(o => ({ ...o, showChanges: v }))}>Changes</ToggleButton>
          </div>
          <TabPanel id="chart" className="panel is-fill">
            <ChartPane c={c} layout={layout} sel={sel} hover={hover} lights={lights} onSelect={select} onHover={setHover} colorMode={colorMode} />
          </TabPanel>
          <TabPanel id="grid" className="panel is-scroll"><GridPane c={c} run={run} sel={sel} onSelect={select} /></TabPanel>
          <TabPanel id="walks" className="panel is-scroll"><LanesPane c={c} run={run} track={track} step={step} play={play} setStep={setStep} /></TabPanel>
        </Tabs>
      </div>
      <div className="side-r">
        <Tabs selectedKey={tab} onSelectionChange={k => setParams({ tab: k })} className="tabs">
          <TabList aria-label="Panels" className="tablist">
            {narrow && <Tab id="prose">Prose</Tab>}
            <Tab id="detail">Detail</Tab><Tab id="play">Play</Tab>
            <Tab id="evidence">Evidence <span className="muted">{c.evidence.length}</span></Tab>
            <Tab id="backing">Backing</Tab><Tab id="log">Log</Tab>
          </TabList>
          {narrow && <TabPanel id="prose" className="panel is-flex"><ProsePane c={c} sel={sel} linked={hover} onSelect={pid => { setParams({ sel: pid, tab: 'prose' }); }} onHover={setHover} /></TabPanel>}
          <TabPanel id="detail" className="panel is-scroll">{sel ? <PassageDetail c={c} run={run} pid={sel} /> : <Summary c={c} run={run} />}</TabPanel>
          <TabPanel id="play" className="panel is-scroll"><PlayPanel id={id} c={c} run={run} play={play} track={track} step={step} setStep={setStep} /></TabPanel>
          <TabPanel id="evidence" className="panel is-scroll"><EvidencePanel dossier={id} evidence={c.evidence} entry={params.entry} /></TabPanel>
          <TabPanel id="backing" className="panel is-scroll"><BackingPanel c={c} /></TabPanel>
          <TabPanel id="log" className="panel is-scroll"><LogPanel decisions={c.decisions} /></TabPanel>
        </Tabs>
      </div>
    </div>
  );
}

// ---------- The prose, synced with the chart ----------
function ProsePane({ c, sel, linked, onSelect, onHover }) {
  const kinds = useMemo(() => [...new Set(c.sections.flatMap(s => s.passages.map(p => p.kind)))], [c]);
  const [shown, setShown] = useState(new Set());
  const [unsettled, setUnsettled] = useState(false);
  const [open, setOpen] = useState(false);
  const isOpen = p => isOpenMark(c.marks[p.id]?.mark) || p.doubts.length > 0;
  const visible = p => (!shown.size || shown.has(p.kind)) && (!unsettled || p.owner !== 'settled') && (!open || isOpen(p));
  const sections = c.sections.map(s => ({ ...s, passages: s.passages.filter(visible) })).filter(s => s.passages.length);
  return (
    <aside className="prose" aria-label="Prose">
      <div className="prose-bar">
        <ToggleButtonGroup className="seg is-kinds" aria-label="Passage kinds" selectionMode="multiple" selectedKeys={shown} onSelectionChange={k => setShown(new Set(k))}>
          {kinds.map(k => <ToggleButton key={k} id={k} aria-label={KIND[k]}>{k}</ToggleButton>)}
        </ToggleButtonGroup>
        <Switch className="switch" isSelected={unsettled} onChange={setUnsettled}><span className="switch-track" aria-hidden="true" />Unsettled</Switch>
        <Switch className="switch" isSelected={open} onChange={setOpen}><span className="switch-track" aria-hidden="true" />Open</Switch>
      </div>
      <p className="boundary" title={c.boundary}>{c.boundary}</p>
      <ListBox className="plist" aria-label="Passages" selectionMode="single" selectedKeys={sel ? [sel] : []}
        onSelectionChange={keys => { const k = [...keys][0]; onSelect(k ? String(k) : null); }} renderEmptyState={() => <div className="pad muted">No passage matches.</div>}>
        {sections.map(s => (
          <ListBoxSection key={s.name} id={`sec-${s.name}`}>
            <Header className="plist-h">{s.name}</Header>
            {s.passages.map(p => (
              <ListBoxItem key={p.id} id={p.id} textValue={`${p.id} ${p.text}`} className={p.id === linked ? 'pitem is-linked' : 'pitem'} onHoverStart={() => onHover(p.id)} onHoverEnd={() => onHover(null)}>
                <span className="pid mono">{p.id}</span>
                <span className="ptext">{p.text}</span>
                <span className="pmeta">
                  {p.doubts.length ? <span className="glyph-doubt" title={`open doubt ${p.doubts.join(' ')}`}>?</span> : null}
                  <Owner owner={p.owner} />
                  {c.marks[p.id] && <Badge word={c.marks[p.id].mark} small />}
                </span>
              </ListBoxItem>
            ))}
          </ListBoxSection>
        ))}
      </ListBox>
    </aside>
  );
}

// ---------- The statechart ----------
function ChartPane({ c, layout, sel, hover, lights, onSelect, onHover, colorMode }) {
  const elements = useMemo(() => {
    if (!layout?.nodes) return null;
    const { chart, marks } = c;
    const fam = pid => familyOf(marks[pid]?.mark);
    const t = targetsOf(chart, sel), h = targetsOf(chart, hover);
    const L = lights || { nodes: new Set(), edges: new Set(), lines: new Set(), visitedEdges: new Set(), visitedLines: new Set() };
    const stays = {};
    for (const tr of chart.transitions) if (tr.stays) (stays[tr.from] ||= []).push(tr.id);
    const nodes = [], edges = [];
    const ordered = [...chart.states].sort((a, b) => (b.children ? 1 : 0) - (a.children ? 1 : 0));
    for (const s of ordered) {
      const id = `st:${s.key}`, box = layout.nodes.get(id);
      if (!box) continue;
      const content = layout.content[s.key];
      const lineIds = [...(stays[s.key] || []), ...(layout.opts.showRefusals ? chart.refusals.filter(r => r.states.includes(s.key)).map(r => r.id) : [])];
      const sp = s.passages.find(p => p.startsWith('S')) || s.passages[0];
      const doubt = s.passages.some(p => marks[p]?.doubt?.length) || lineIds.some(l => marks[l]?.doubt?.length);
      nodes.push({
        id, type: 'state', position: { x: box.x, y: box.y }, width: box.w, height: box.h, zIndex: s.children ? 0 : 1, ariaLabel: `State ${s.name}, ${marks[sp]?.mark || 'no mark'}${lineIds.length ? `, ${lineIds.length === 1 ? 'one move that stays' : `${lineIds.length} moves that stay`}` : ''}`,
        data: {
          w: box.w, h: box.h, name: s.name, aside: content.aside, lines: content.lines, lineIds, lineFamilies: lineIds.map(fam), family: fam(sp),
          compound: !!s.children, final: s.final, glyph: doubt ? '?' : null, glyphTitle: 'open doubt',
          selected: t.nodes.has(id), hover: h.nodes.has(id) && !t.nodes.has(id), current: L.nodes.has(id),
          activeLines: new Set([...L.lines, ...L.visitedLines]), selLine: t.lines.has(sel) ? sel : null, onLine: onSelect,
        },
      });
    }
    const init = layout.nodes.get('init');
    if (init) nodes.push({ id: 'init', type: 'init', position: { x: init.x, y: init.y }, width: 12, height: 12, focusable: false, selectable: false, data: {} });
    const ie = layout.edges.get('e:init');
    if (ie) edges.push({ id: 'e:init', source: 'init', target: `st:${chart.initial}`, type: 'routed', data: { points: ie.points, family: 'neutral' }, markerEnd: arrowHead('neutral') });
    for (const tr of chart.transitions.filter(x => !x.stays)) {
      const id = `mv:${tr.id}`, r = layout.edges.get(id);
      if (!r) continue;
      edges.push({
        id, source: `st:${tr.from}`, target: `st:${tr.to}`, type: 'routed', markerEnd: arrowHead(fam(tr.id)),
        data: { points: r.points, label: r.label, family: fam(tr.id), selected: t.edges.has(id), hover: h.edges.has(id) && !t.edges.has(id), current: L.edges.has(id), visited: L.visitedEdges.has(id), onSelect: () => onSelect(tr.id) },
      });
    }
    return { nodes, edges };
  }, [c, layout, sel, hover, lights]);
  if (layout?.refused) return <div className="pad"><b>Too large to draw:</b> {layout.refused} states, over the limit of {MAX_NODES}.</div>;
  if (layout?.error) return <Failed error={layout.error} />;
  if (!elements) return <Loading what="the chart" />;
  const sOf = key => c.chart.states.find(s => `st:${s.key}` === key)?.passages.find(p => p.startsWith('S'));
  const pidOf = (gid, kind) => (!gid ? null : kind === 'edge' ? gid.replace(/^mv:/, '') : sOf(gid) || null);
  return (
    <Graph graphKey={layout.key} bounds={{ width: layout.width, height: layout.height }} nodes={elements.nodes} edges={elements.edges} colorMode={colorMode} label={`Statechart of ${c.title}`}
      onHover={(gid, kind) => onHover?.(pidOf(gid, kind))}
      onSelect={(gid, kind) => { if (!gid) return onSelect(null); if (kind === 'edge') return onSelect(gid.replace(/^mv:/, '')); const s = sOf(gid); if (s) onSelect(s); }} />
  );
}

// ---------- The grid: every state by every event ----------
function GridPane({ c, run, sel, onSelect }) {
  const [owedOnly, setOwedOnly] = useState(false);
  const { chart, marks } = c;
  const leaves = chart.states.filter(s => !s.children);
  const events = chart.events.map(e => e.name);
  const cell = (state, ev) => chart.table.find(x => x.state === state && x.event === ev);
  const owed = s => events.some(ev => { const x = cell(s.key, ev); return x && !x.moves.length && !x.refusals.length; });
  const rows = leaves.filter(s => !owedOnly || owed(s));
  const gaps = run?.gaps || [];
  return (
    <div className="grid-pane">
      <div className="toolbar">
        <Switch className="switch" isSelected={owedOnly} onChange={setOwedOnly}><span className="switch-track" aria-hidden="true" />Owed only</Switch>
        <span className="muted">{chart.unsaid.length} unsaid · {chart.saidTwice.length} said twice · {gaps.length} unsaid under condition</span>
      </div>
      <Table aria-label="States by events" className="table is-grid">
        <TableHeader>
          <Column isRowHeader className="mono">state</Column>
          {events.map(ev => <Column key={ev} className="mono">{ev}</Column>)}
        </TableHeader>
        <TableBody>
          {rows.map(s => (
            <Row key={s.key} id={s.key}>
              <Cell className="t-strong">{s.name}</Cell>
              {events.map(ev => {
                const x = cell(s.key, ev);
                const ids = x ? [...x.moves, ...x.refusals] : [];
                return (
                  <Cell key={ev}>
                    {ids.length ? ids.map(pid => (
                      <Button key={pid} className={`idbtn${sel === pid ? ' is-selected' : ''}`} data-family={familyOf(marks[pid]?.mark)} onPress={() => onSelect(pid)}>{pid}</Button>
                    )) : x ? <Badge word="unsaid" small /> : <span className="muted">·</span>}
                  </Cell>
                );
              })}
            </Row>
          ))}
        </TableBody>
      </Table>
      {(chart.saidTwice.length > 0 || gaps.length > 0) && (
        <ul className="list">
          {chart.saidTwice.map((g, i) => <li key={`t${i}`}><Badge word="violated" label="said twice" small /> {g}</li>)}
          {gaps.map((g, i) => <li key={`g${i}`}><Badge word="unsaid" label="unsaid under condition" small /> {g.message ?? String(g)}</li>)}
        </ul>
      )}
    </div>
  );
}

// ---------- Walks as lanes: one column per sender, the component on the right ----------
function LanesPane({ c, run, track, step, play, setStep }) {
  const walks = run?.walks || [];
  const [pick, setPick] = useState(walks[0]?.id);
  const active = track && ['walk', 'doubt', 'trace', 'path'].includes(track.kind) ? track : (run ? walkTrack(run, pick || walks[0]?.id) : null);
  const cur = track && active === track ? step : -1;
  if (!run) return <Loading what="walks" />;
  if (!active) return <div className="pad muted">No walks.</div>;
  const senderOf = ev => c.chart.events.find(e => e.name === ev)?.sender || 'the public';
  const lanes = [...new Set(active.steps.slice(1).map(s => s.actor || (s.event ? senderOf(s.event) : null)).filter(Boolean))];
  return (
    <div className="lanes-pane">
      <div className="toolbar">
        {!(track && active === track) && walks.length > 0 && (
          <ToggleButtonGroup className="seg" aria-label="Walk" selectionMode="single" disallowEmptySelection selectedKeys={[pick || walks[0].id]} onSelectionChange={k => setPick([...k][0])}>
            {walks.map(w => <ToggleButton key={w.id} id={w.id}>{w.id} {w.name}</ToggleButton>)}
          </ToggleButtonGroup>
        )}
        <b>{active.title}</b>
        {active.error && <span className="t-crit">{active.error}</span>}
      </div>
      <table className="dt lanes">
        <thead><tr><th>#</th>{lanes.map(l => <th key={l}>{l}</th>)}<th>{c.title}</th><th>after</th><th>changed</th><th>sent</th></tr></thead>
        <tbody>
          {active.steps.map(s => {
            const sender = s.actor || (s.event ? senderOf(s.event) : null);
            return (
              <tr key={s.i} className={s.i === cur ? 'is-current' : ''}>
                <td>{track && active === track ? <Button className="idbtn" onPress={() => setStep(s.i)}>{s.i}</Button> : s.i}</td>
                {lanes.map(l => <td key={l} className={l === sender ? (s.refused ? 'lane-msg is-refused' : 'lane-msg') : ''}>{l === sender ? `${s.label} →` : ''}</td>)}
                <td>{s.i === 0 ? <span className="muted">start</span> : s.by?.length ? <Badge word={s.refused ? 'refused' : c.marks[s.by[0]]?.mark || 'text'} label={s.refused ? `✕ ${s.by.join(' ')}` : s.by.join(' ')} small /> : <NoDecider s={s} kind={active.kind} />}</td>
                <td>{(s.leaves || []).join(' + ')}</td>
                <td className="mono">{(s.changed || []).filter(k => k !== 'state').map(k => `${k}=${fmt(s.data?.[k])}`).join(' ')}</td>
                <td className="mono">{Object.entries(s.sent || {}).map(([e, n]) => `${e}×${n}`).join(' ')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Detail ----------
function Summary({ c, run }) {
  const s = c.summary || {};
  return (
    <div className="detail">
      <div className="d-head"><b>{c.title}</b> <span className="muted">{c.tier} · <span className="mono">{c.id}</span></span><LinkButton /></div>
      {c.route && <Sec title="Next" aside={c.route.pass}>{(c.route.why || []).map((w, i) => <div key={i} className="why">{w}</div>)}</Sec>}
      {(c.tripwires.length > 0 || c.flags.length > 0) && <Sec title="Flags">{c.tripwires.map((t, i) => <div key={`t${i}`}><Badge word="violated" label={t.name} small /> <span className="muted">{t.where}</span></div>)}{c.flags.map((f, i) => <div key={i}><span className="chip">{f.name}</span> <span className="muted">{f.where}</span></div>)}</Sec>}
      <Sec title="Standing">
        <KV rows={[['passages', `${s.passages} · settled ${s.settled} · confirmed ${s.confirmed} · unsettled ${s.unsettled}`], ['marks', ['proved', 'checked', 'drawn', 'pending', 'held', 'hollow', 'lapsed', 'miscalled'].filter(k => s[k]).map(k => <Badge key={k} word={k} label={`${s[k]} ${k}`} small />)], ['backing', `backed ${s.backed || 0} · assumed ${s.assumed || 0} · unresolved ${s.unresolved || 0}`], ['doubts open', s.doubtsOpen || 0]]} />
      </Sec>
      {run && <Sec title="Chart" aside={run.error && !run.checks.length ? 'did not run' : `${run.passed}/${run.checks.length} · ${run.explored} states`}>
        {run.error && <div><Badge word="fail" label={run.limitHit ? `over ${run.limit} states` : 'did not run'} small /> <span className="muted">{run.error}</span></div>}
        {run.checks.filter(x => x.status === 'failed').map((x, i) => <div key={i}><Badge word="fail" label="failed" small /> {x.name} <span className="muted">{x.message}</span></div>)}
        {!run.error && run.outcome === 'pass' && <None>every check passes</None>}
      </Sec>}
      <Sec title="Data">
        <table className="dt"><tbody>{c.chart.context.map(d => <tr key={d.name}><td className="mono">{d.name}</td><td>{d.type}{d.min != null ? ` ${d.min}..${d.max}` : ''}{d.values ? ` ${d.values.join(' | ')}` : ''}</td><td className="muted">starts {fmt(d.initial)}</td></tr>)}</tbody></table>
      </Sec>
      <Sec title="In systems">{c.inSystems.length ? c.inSystems.map(s => <a key={s} href={`#/s/${s}`} className="chip">{s}</a>) : <None />}</Sec>
    </div>
  );
}

function PassageDetail({ c, run, pid }) {
  const p = c.sections.flatMap(s => s.passages).find(x => x.id === pid);
  const m = c.marks[pid];
  if (!p) return <div className="pad muted">{pid} is not a passage here.</div>;
  const ch = c.chart;
  const trialEntry = Object.fromEntries(c.evidence.map(e => [e.trial, e.entry]));
  const move = ch.transitions.find(x => x.id === pid);
  const refusal = ch.refusals.find(x => x.id === pid);
  const state = ch.states.find(s => s.passages.includes(pid) && pid.startsWith('S'));
  const event = ch.events.find(x => x.id === pid);
  const walk = ch.walks.find(x => x.id === pid);
  const backing = c.backing.find(x => x.id === pid);
  const doubts = c.doubts.filter(d => d.on.includes(pid));
  return (
    <div className="detail">
      <div className="d-head"><b className="mono">{pid}</b> <span className="muted">{KIND[p.kind]}</span> <Owner owner={p.owner} /> {m && <MarkBadge m={m} />}<span className="top-gap" /><LinkButton /></div>
      <p className="ptext-full">{p.text}</p>
      {m && <Sec title="Mark" aside={m.mark}><MarkExplain m={m} />
        {m.trials?.length ? <div className="trials">{m.trials.map(t => <a key={t} className="chip mono" href={`#/c/${c.id}?tab=evidence&entry=${trialEntry[t] || ''}`}>{trialEntry[t] || t}</a>)}</div> : null}
      </Sec>}
      {move && <Sec title="Move"><KV rows={[['from → to', `${move.from} → ${move.to}${move.stays ? ' (stays)' : ''}`], ['event', `${move.event} · ${ch.events.find(e => e.name === move.event)?.sender || ''}`], ['guard', <span className="mono">{move.guard || 'none'}</span>], ['changes', <span className="mono">{move.changes.join(', ') || 'none'}</span>], ['sends', move.effects.join(', ') || 'nothing']]} /></Sec>}
      {refusal && <Sec title="Refusal"><KV rows={[['in', refusal.states.join(', ')], ['refuses', refusal.events.join(', ')], ['when', <span className="mono">{refusal.cond || 'always'}</span>], ['sends', refusal.effects.join(', ') || 'nothing']]} /></Sec>}
      {state && <Sec title="Every event here"><table className="dt"><tbody>{ch.table.filter(x => x.state === state.key).map(x => <tr key={x.event}><td className="mono">{x.event}</td><td>{[...x.moves, ...x.refusals].join(' ') || <Badge word="unsaid" small />}</td></tr>)}</tbody></table></Sec>}
      {event && <Sec title="Event"><KV rows={[['sender', event.sender], ['fields', (event.fields || []).map(f => f.name ?? JSON.stringify(f)).join(', ') || 'none'], ['handled by', ch.transitions.filter(t => t.event === event.name).map(t => t.id).join(' ') || 'nothing']]} /></Sec>}
      {walk && <Sec title="Walk"><div className="mono small">{walk.from} → {walk.steps.map(s => `${s.event}${argsText(s.args)}${s.refused ? ' ✕' : ''}`).join(', ')} → {walk.ends}</div><Button className="btn" onPress={() => setParams({ tab: 'play', play: `walk:${walk.id}:0` })}>Play</Button></Sec>}
      {backing && <Sec title="Backing"><KV rows={[['kind', backing.kind], ['names', backing.ref || 'nothing'], ['status', <Badge word={backing.status} small />], backing.path && ['found in', <span className="mono">{backing.path}</span>], backing.reason && ['why', backing.reason]]} /></Sec>}
      {doubts.map(d => (
        <Sec key={d.id} title={`Doubt ${d.id}`} aside={d.status}>
          <p className="small">{d.text}</p>
          {Object.entries(d.walks || {}).map(([alt, text]) => (
            <div key={alt} className="alt"><b>{alt}</b>{d.assumed === alt && <span className="chip">assumed</span>} <span className="mono small">{text}</span> <Button className="btn is-tiny" onPress={() => setParams({ tab: 'play', play: `doubt:${d.id}:${alt}:0` })}>Play</Button></div>
          ))}
          {d.status === 'open' && Object.keys(d.walks || {}).map(alt => <DecideLine key={alt} dossier={c.id} verb="answer" args={[d.id, alt]} />)}
        </Sec>
      ))}
      {p.owner !== 'settled' && <Sec title="Owner decides"><DecideLine dossier={c.id} verb="accept" args={[pid]} /><DecideLine dossier={c.id} verb="reject" args={[pid]} /></Sec>}
    </div>
  );
}

// ---------- Play: walks, doubts, traces, the simulator and the path finder ----------
function PlayPanel({ id, c, run, play, track, step, setStep }) {
  const traces = c.evidence.filter(e => e.answer?.steps > 0);
  const start = kindPlay => setParams({ play: formatPlay(kindPlay) });
  return (
    <div className="play">
      <div className="play-list">
        <span className="pl-h">Walks</span>{(run?.walks || []).map(w => <Button key={w.id} className={`chip-btn${play?.kind === 'walk' && play.id === w.id ? ' is-on' : ''}`} onPress={() => start({ kind: 'walk', id: w.id, step: 0 })}>{w.id}{w.error ? ' ✕' : ''}</Button>)}
        {c.doubts.length > 0 && <><span className="pl-h">Doubts</span>{c.doubts.flatMap(d => Object.keys(d.walks || {}).map(alt => <Button key={`${d.id}${alt}`} className={`chip-btn${play?.kind === 'doubt' && play.id === d.id && play.alt === alt ? ' is-on' : ''}`} onPress={() => start({ kind: 'doubt', id: d.id, alt, step: 0 })}>{d.id}{alt}</Button>))}</>}
        {traces.length > 0 && <><span className="pl-h">Traces</span>{traces.map(e => <Button key={e.entry} className={`chip-btn${play?.kind === 'trace' && play.id === e.entry ? ' is-on' : ''}`} onPress={() => start({ kind: 'trace', id: e.entry, step: 0 })}>{e.entry}</Button>)}</>}
        <span className="pl-h">Explore</span>
        <Button className={`chip-btn${play?.kind === 'sim' ? ' is-on' : ''}`} onPress={() => start({ kind: 'sim', at: run?.initial ?? 0 })}>Simulate</Button>
        <Button className={`chip-btn${play?.kind === 'find' || play?.kind === 'path' ? ' is-on' : ''}`} onPress={() => start({ kind: 'find', from: run?.initial ?? 0 })}>Find a path</Button>
      </div>
      {!play && <div className="pad muted">Nothing playing.</div>}
      {play && ['walk', 'doubt', 'trace', 'path'].includes(play.kind) && (track ? <Player c={c} track={track} step={step} setStep={setStep} /> : <Loading what="the track" />)}
      {play?.kind === 'doubt' && <DoubtNote c={c} play={play} />}
      {play?.kind === 'sim' && run && <Simulator id={id} run={run} at={play.at ?? run.initial} />}
      {play?.kind === 'find' && run && <PathFinder c={c} run={run} from={play.from} />}
    </div>
  );
}

function DoubtNote({ c, play }) {
  const d = c.doubts.find(x => x.id === play.id);
  if (!d) return null;
  return (
    <Sec title={`Doubt ${d.id}`} aside={`${d.status}${d.assumed ? ` · assumed ${d.assumed}` : ''}`}>
      <p className="small">{d.text}</p>
      <div className="mono small">{d.walks?.[play.alt]}</div>
      {d.status === 'open' && <DecideLine dossier={c.id} verb="answer" args={[d.id, play.alt]} />}
    </Sec>
  );
}

function DataTable({ data, changed = [], sent }) {
  const entries = Object.entries(data || {});
  return (
    <table className="dt data">
      <tbody>
        {entries.map(([k, v]) => <tr key={k} className={changed.includes(k) ? 'is-changed' : ''}><td className="mono">{k}</td><td className="mono">{fmt(v)}</td></tr>)}
        {sent && Object.keys(sent).length > 0 && <tr><td className="mono">sent</td><td className="mono">{Object.entries(sent).map(([e, n]) => `${e}×${n}`).join(' ')}</td></tr>}
      </tbody>
    </table>
  );
}

function Player({ c, track, step, setStep }) {
  if (track.error) return <div className="pad"><b>{track.title}</b> <span className="t-crit">{track.error}</span>{track.text && <div className="mono small">{track.text}</div>}</div>;
  const n = track.steps.length;
  const cur = track.steps[step] || track.steps[0];
  const meta = track.meta;
  return (
    <div className="player">
      <div className="player-bar">
        <b className="mono">{track.title}</b><span className="muted">step {step}/{n - 1}</span><span className="top-gap" />
        <Button className="btn is-tiny" aria-label="Previous step" isDisabled={step <= 0} onPress={() => setStep(step - 1)}>◀</Button>
        <Button className="btn is-tiny" aria-label="Next step" isDisabled={step >= n - 1} onPress={() => setStep(step + 1)}>▶</Button>
        <Button className="btn is-tiny" aria-label="First step" onPress={() => setStep(0)}>⟲</Button>
      </div>
      {meta && <div className="meta small">{Object.entries(meta.outcomes || {}).map(([k, v]) => <Badge key={k} word={v} label={`${k} ${v}`} small />)} <Badge word={meta.result} small /> <span className="muted">{meta.reach}</span></div>}
      <table className="dt steps">
        <thead><tr><th>#</th><th>step</th><th>by</th><th>state</th><th>changed</th></tr></thead>
        <tbody>
          {track.steps.map(s => (
            <tr key={s.i} className={s.i === step ? 'is-current' : ''}>
              <td><Button className="idbtn" aria-label={`Go to step ${s.i}`} onPress={() => setStep(s.i)}>{s.i}</Button></td>
              <td className={s.refused ? 'is-refused' : ''}>{s.actor && <span className="muted">{s.actor}: </span>}{s.label}{s.refused ? ' ✕' : ''}{s.error && <span className="t-crit"> {s.error}</span>}</td>
              <td className="mono">{s.by?.length ? s.by.join(' ') : s.i === 0 ? '' : <NoDecider s={s} kind={track.kind} />}</td>
              <td>{(s.leaves || []).join(' + ')}</td>
              <td className="mono">{(s.changed || []).filter(k => k !== 'state' && !k.startsWith('sent_')).map(k => `${k}=${fmt(s.data?.[k])}`).join(' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Sec title="At this step" aside={(cur.leaves || []).join(' + ')}><DataTable data={cur.data} changed={cur.changed} sent={cur.sent} /></Sec>
      {track.ends && <div className="small muted">ends {track.ends}</div>}
      {track.problems?.length ? <div className="small t-crit">{track.problems.join('; ')}</div> : null}
      {meta?.because && <Sec title="Call"><p className="small">{meta.because}</p></Sec>}
      {meta?.reading && <Sec title="Reading"><pre className="reading">{meta.reading}</pre></Sec>}
    </div>
  );
}

function Simulator({ id, run, at }) {
  const { version } = useApp();
  const { data: x, error } = useData(api.explain(id, at), version);
  const [history, setHistory] = useState([]);
  const go = (next, reset) => { setHistory(h => (reset ? [] : [...h, at])); setParams({ play: `sim:${next}` }); };
  if (run.error && !run.snapshots.length) return <div className="pad"><Badge word="fail" label="the chart did not run" small /> <span className="muted">{run.error}</span></div>;
  if (error) return <Failed error={error} />;
  if (!x || x.at !== at) return <Loading what="the state" />;
  const groups = new Map();
  for (const k of x.cases) { if (!groups.has(k.event.type)) groups.set(k.event.type, []); groups.get(k.event.type).push(k); }
  return (
    <div className="sim">
      <div className="player-bar">
        <b>{x.leaves.join(' + ')}</b><span className="muted">snapshot {at}</span><span className="top-gap" />
        <Button className="btn is-tiny" aria-label="Back" isDisabled={!history.length} onPress={() => { const h = [...history]; const prev = h.pop(); setHistory(h); setParams({ play: `sim:${prev}` }); }}>◀</Button>
        <Button className="btn is-tiny" aria-label="Back to the start" onPress={() => go(run.initial, true)}>⟲</Button>
        <Button className="btn is-tiny" onPress={() => setParams({ play: `find:${at}` })}>Find from here</Button>
      </div>
      <DataTable data={dataOf(x.context)} sent={sentOf(x.context)} />
      {[...groups.entries()].map(([type, cases]) => <SimEvent key={type} type={type} cases={cases} run={run} go={go} />)}
    </div>
  );
}

// One event at a snapshot: a chip per value of its fields, and the chosen case explained.
function SimEvent({ type, cases, run, go }) {
  const [pick, setPick] = useState(0);
  const shown = cases.length > 1 ? [cases[Math.min(pick, cases.length - 1)]] : cases;
  return (
    <div className="sim-ev">
      {cases.length > 1 && (
        <div className="sim-pick">
          <span className="mono">{type}</span>
          {cases.map((k, i) => (
            <Button key={i} className={`chip-btn${i === pick ? ' is-on' : ''}`} data-family={familyOf(moves(k).length ? 'checked' : k.by.length ? 'refused' : k.error ? 'fail' : 'unsaid')} onPress={() => setPick(i)}>
              {eventText(k.event).slice(type.length).trim() || '·'}{moves(k).length ? '' : k.by.length ? ' ✕' : k.error ? ' !' : ' ?'}
            </Button>
          ))}
        </div>
      )}
          {shown.map((k, i) => {
            const fires = moves(k).length > 0 && k.to != null;
            return (
              <div key={i} className="sim-case">
                <Button className={`case-btn${fires ? '' : ' is-inert'}`} isDisabled={!fires} onPress={() => go(k.to)}>
                  <span className="mono">{eventText(k.event)}</span> → {k.by.length ? (!moves(k).length ? <>refused <span className="mono">{k.by.join(' ')}</span></> : <>{run.snapshots[k.to]?.leaves.join(' + ')} <span className="mono">{k.by.join(' ')}</span></>) : <NoDecider s={{ byError: k.error }} kind="sim" />}
                </Button>
                <div className="cands">
                  {k.candidates.map(cd => (
                    <div key={cd.id} className={`cand${cd.holds ? ' holds' : ''}`}>
                      <span className="mono">{cd.id}</span> <span className="mono">{cd.cond || 'always'}</span>
                      {cd.refs.length > 0 && <span className="muted mono"> {cd.refs.map(r => `${r.name}=${fmt(r.value)}`).join(' ')}</span>}
                      <span className={`verdict${cd.holds ? ' is-holds' : ''}`} title={cd.error || undefined}>{cd.holds ? '✓ holds' : cd.error ? '✕ cannot be evaluated' : '· fails'}</span>
                    </div>
                  ))}
                  {k.changes.length > 0 && <div className="mono changes">{k.changes.map(ch => `${ch.name} ${fmt(ch.before)} → ${fmt(ch.after)}`).join('   ')}</div>}
                  {k.effects.length > 0 && <div className="mono muted">sends {k.effects.join(', ')}</div>}
                </div>
              </div>
            );
          })}
    </div>
  );
}

function PathFinder({ c, run, from }) {
  const states = c.chart.states.filter(s => !s.children);
  const [state, setState] = useState(states[0]?.key || '');
  const [cond, setCond] = useState('');
  const bad = cond && !parseCond(cond);
  return (
    <div className="finder">
      <div className="muted small">from snapshot {from}: {run.snapshots[from]?.leaves.join(' + ')}</div>
      <div className="row">
        <Select className="select" aria-label="Target state" selectedKey={state} onSelectionChange={k => setState(String(k))}>
          <Button className="btn"><SelectValue /> ▾</Button>
          <Popover className="popover"><ListBox className="menu">{states.map(s => <ListBoxItem key={s.key} id={s.key} className="mi">{s.name}</ListBoxItem>)}</ListBox></Popover>
        </Select>
        <TextField className="field" aria-label="Data condition" value={cond} onChange={setCond} isInvalid={!!bad}>
          <Input placeholder="name = value" />
        </TextField>
        <Button className="btn" isDisabled={!!bad} onPress={() => setParams({ play: formatPlay({ kind: 'path', from, state, cond, step: 0 }) })}>Find</Button>
      </div>
      {bad && <div className="t-crit small">Write it as name = value.</div>}
    </div>
  );
}

// ---------- Evidence, backing and the decision log ----------
export function EvidencePanel({ dossier, evidence, entry, system }) {
  const chosen = evidence.find(e => e.entry === entry);
  const asks = e => [...(e.question?.expects || []), e.question?.property, e.question?.scenario, e.question?.walk].filter(Boolean).join(' ');
  return (
    <div className="evidence">
      <Table aria-label="Evidence" className="table is-dense" selectionMode="single" selectedKeys={entry ? [entry] : []} onSelectionChange={keys => setParams({ entry: [...keys][0] || null })}>
        <TableHeader>
          <Column isRowHeader>entry</Column><Column>when</Column><Column>asks</Column><Column>answer</Column><Column>result</Column>
        </TableHeader>
        <TableBody items={evidence.map(e => ({ ...e, id: e.entry }))}>
          {e => (
            <Row id={e.entry}>
              <Cell><span className="mono">{e.entry}</span>{e.superseded && <span className="chip" title={e.superseded}>superseded</span>}{e.forgotten && <span className="chip">forgotten</span>}{e.gone && <span className="chip" title={e.gone}>question gone</span>}</Cell>
              <Cell>{shortTime(e.at)}</Cell>
              <Cell className="mono">{asks(e)}</Cell>
              <Cell>{Object.entries(e.answer?.outcomes || {}).map(([k, v]) => <Badge key={k} word={v} label={`${k} ${v}`} small />)}</Cell>
              <Cell><Badge word={e.answer?.result} small />{e.previous && <span className="chip" title="the previous different answer">prev</span>}</Cell>
            </Row>
          )}
        </TableBody>
      </Table>
      {chosen && (
        <div className="detail">
          <div className="d-head"><b className="mono">{chosen.entry}</b> <span className="muted">{chosen.kind} · {chosen.checker}</span><span className="top-gap" /><LinkButton />
            {chosen.answer?.steps > 0 && !system && <Button className="btn is-tiny" onPress={() => setParams({ tab: 'play', play: `trace:${chosen.entry}:0` })}>Play trace</Button>}
            {chosen.answer?.steps > 0 && system && chosen.question?.property && chosen.question?.scenario && <Button className="btn is-tiny" onPress={() => setParams({ tab: 'cells', cell: `${chosen.question.property}:${chosen.question.scenario}`, play: 'cell:0' })}>Play trace</Button>}
          </div>
          <KV rows={[
            ['trial', <span className="mono">{chosen.trial}</span>], ['when', shortTime(chosen.at)],
            ['executes', <span className="mono small">{(chosen.question?.executes || []).join(', ') || 'prose.md'}</span>],
            ['called', Object.entries(chosen.call?.expect || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'nothing'],
            ['answered', Object.entries(chosen.answer?.outcomes || {}).map(([k, v]) => `${k}: ${v}`).join(', ')],
            ['reach', chosen.answer?.reach || chosen.call?.reach],
            chosen.classification && ['classified', chosen.classification],
            chosen.previous && ['before', `${chosen.previous.result} · ${Object.entries(chosen.previous.outcomes || {}).map(([k, v]) => `${k}: ${v}`).join(', ')} · ${shortTime(chosen.previous.at)}${chosen.previous.classification ? ` · ${chosen.previous.classification}` : ''}`],
            chosen.superseded && ['superseded', chosen.superseded], chosen.forgotten && ['forgotten', chosen.forgotten.words], chosen.gone && ['question gone', chosen.gone],
            chosen.problems?.length ? ['problems', <span className="t-crit">{chosen.problems.join('; ')}</span>] : null,
          ]} />
          {chosen.call?.because && <Sec title="Because"><p className="small">{chosen.call.because}</p></Sec>}
          {chosen.reading && <Sec title="Reading"><pre className="reading">{chosen.reading}</pre></Sec>}
        </div>
      )}
    </div>
  );
}

function BackingPanel({ c }) {
  return (
    <div className="detail">
      <Sec title="Guarantees" aside={c.backing.length}>
        {c.backing.length ? (
          <table className="dt"><tbody>{c.backing.map(b => (
            <tr key={b.id}><td><a className="mono" href={`#/c/${c.id}?sel=${b.id}`}>{b.id}</a></td><td>{b.claim}</td><td className="mono small">{b.kind}{b.ref ? ` ${b.ref}` : ''}</td><td><Badge word={b.status} small /></td></tr>
          ))}</tbody></table>
        ) : <None />}
      </Sec>
      <Sec title="Pinned records" aside={c.pins.length}>
        {c.pins.length ? <table className="dt"><tbody>{c.pins.map(p => <tr key={p.ref}><td className="mono">{p.ref}</td><td><Badge word={p.resolved ? 'backed' : 'unresolved'} label={p.resolved ? 'resolves' : 'unresolved'} small /></td></tr>)}</tbody></table> : <None />}
      </Sec>
    </div>
  );
}

export function LogPanel({ decisions }) {
  if (!decisions.length) return <div className="pad muted">No decisions recorded.</div>;
  return (
    <table className="dt log">
      <tbody>
        {decisions.map(d => d.malformed
          ? <tr key={d.line}><td>{d.line}</td><td colSpan={3} className="t-crit mono">{d.raw}</td></tr>
          : <tr key={d.line}><td className="muted">{d.line}</td><td>{shortTime(d.time)}</td><td><b>{d.verb}</b> <span className="mono small">{d.args.map(stripHash).join(' ')}</span></td><td className="words">{d.words}</td></tr>)}
      </tbody>
    </table>
  );
}
