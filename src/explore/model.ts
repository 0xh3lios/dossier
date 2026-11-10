// What the explorer's pages read, taken from verify's analysis of the root: the board, the addresses
// the palette reaches, one part, one composition, each answer in evidence/ and the traces they hold.
// It reshapes what verify concluded and computes no standing of its own.
import { toLabel } from '../prose/expr.ts';
import { itfText } from '../commands/show.ts';
import { cellWords } from '../verify/render.ts';
import { cap, ident } from '../models/tla.ts';
import type { Verified } from '../commands/verify.ts';
import type { PartAnalysis, CompositionAnalysis } from '../verify/analyze.ts';
import type { Note } from '../verify/tripwires.ts';
import type { Expr, Value } from '../prose/expr.ts';
import type { Backing } from '../prose/prose.ts';
import type { Answer } from '../trials/answers.ts';
import type { Meanings } from './meanings.ts';
import type { BehaviorReport } from '../behaviors/report.ts';
import { REPORT_FORMAT } from '../behaviors/formats.ts';

type Analysis = PartAnalysis | CompositionAnalysis;
export function behaviorReportOf(a: Analysis): BehaviorReport {
  if (a.behaviors?.format !== REPORT_FORMAT) throw new Error(`${a.ref}: the explorer requires a current behavior report`);
  return a.behaviors;
}
// The report as the page reads it: the report itself, with the text of the authored files it names,
// the orientation, each behavior's explanation and each review's findings, read where they are kept.
export function readerReport(a: Analysis) {
  const report = behaviorReportOf(a), collection = a.behaviorCollection;
  const bodyOf = (id: string) => collection?.behaviors.find(b => b.record.id === id)?.body ?? '';
  return {
    ...report, orientation: collection?.collection?.body ?? '',
    behaviors: report.behaviors.map(b => ({ ...b, body: bodyOf(b.id) })),
    reviews: { ...report.reviews, reviews: report.reviews.reviews.map(r => ({ ...r, body: a.reviews.find(x => x.file === r.file)?.body ?? '' })) },
  };
}
const label = (x: Expr | null | undefined) => (x == null ? null : toLabel(x));
const literal = (x: Expr | null | undefined): Value | null => (x == null ? null : x.t === 'lit' || x.t === 'int' || x.t === 'bool' ? x.v : 'name' in x ? x.name : toLabel(x));
const withMeans = (notes: Note[], meanings: Meanings) => notes.map(n => ({ ...n, means: meanings.flag(n.name) }));
const decisionsOf = (a: Analysis) => a.decisions.map(d => ('malformed' in d ? { line: d.line, malformed: true, raw: d.raw } : { line: d.line, time: d.time, verb: d.verb, args: d.args || [], words: d.words || '' }));

// Who sends an event: a member part, an actor, or a name the root does not know.
function senderOf(a: PartAnalysis, sender: string | null) {
  if (!sender) return null;
  const c = a.partOf(sender);
  if (c) return { kind: 'part', id: c };
  const actor = a.actorOf(sender);
  if (actor) return { kind: 'actor', id: actor.id };
  return { kind: 'unknown', id: sender };
}
const compositionsOf = (v: Verified, id: string) => v.compositions.filter(s => s.wiring.members.some(m => m.part === id)).map(s => s.id);
const backingRef = (b: Backing | null) => (!b ? null : b.kind === 'record' ? b.ref : b.kind === 'external' ? b.runner : b.kind === 'none' ? null : `${b.path} ${b.rule}`);

// ---------- Evidence ----------
// A call's expectation for each name, as text: the outcome, and the failing ids or the trace it names.
const expectText = (expect: Record<string, unknown>) => Object.fromEntries(Object.entries(expect || {}).map(([k, v]) => {
  if (typeof v === 'string') return [k, v];
  const o = (v || {}) as { expect?: string; failing?: string[]; trace?: string[]; unknown?: boolean };
  return [k, [o.expect, o.failing?.length ? `failing ${o.failing.join(' ')}` : null, o.trace?.length ? `trace ${o.trace.join(' ')}` : null, o.unknown ? 'unknown' : null].filter(Boolean).join(', ')];
}));
const stepsIn = (trace: Answer['trace']) => (Array.isArray(trace) ? trace.length : trace?.states?.length || 0);

// Each answer in the dossier's evidence/, newest first, as the evidence panel lists it.
export function evidenceOf(a: Analysis) {
  const rows = new Map(a.answerRows.map(r => [r.entry, r]));
  return a.answers.map(x => {
    const row = rows.get(x.name);
    const problems = [...new Set([...x.problems.map(n => (n.where ? `${n.name} · ${n.where}` : n.name)), ...(row?.problems || [])])];
    const e = x.entry;
    const common = { entry: x.name, classification: row?.classification ?? null, superseded: a.superseded[x.name] || null, forgotten: a.forgotten[x.name] || null, gone: a.gone[x.name] || null, problems, reading: x.reading };
    if (!e) return { ...common, trial: null, at: null, problems: problems.length ? problems : ['the entry does not read'] };
    return {
      ...common,
      trial: e.established.trial, at: e.established.at, kind: e.question.kind, checker: e.question.checker,
      question: { expects: e.question.expects, property: e.question.property, scenario: e.question.scenario, walk: e.question.walk, executes: e.question.executes },
      call: { reach: e.call.reach, because: e.call.because?.trim() || null, expect: expectText(e.call.expect) },
      answer: { result: e.answer.result, outcomes: e.answer.outcomes || {}, reach: e.answer.reach?.text || null, steps: stepsIn(e.answer.trace), miscalls: e.answer.miscalls || null },
      previous: e.previous ? { result: e.previous.answer.result, outcomes: e.previous.answer.outcomes || {}, at: e.previous.established.at, trial: e.previous.established.trial, classification: e.previous.classification } : null,
    };
  }).sort((x, y) => String(y.at).localeCompare(String(x.at)));
}

// ---------- The root ----------
export function rootModel(v: Verified, root: string, version: string, meanings: Meanings) {
  const compact = (a: PartAnalysis) => Object.fromEntries(Object.entries(a.marks).map(([k, m]) => [k, m.mark]));
  const dossiers = [
    ...v.parts.map(a => ({ kind: 'part', id: a.id, title: a.title, tier: a.tier, route: a.route, summary: a.summary, flags: withMeans(a.flags, meanings), tripwires: a.tripwires, reviewOwed: a.reviewOwed, behaviorSummary: behaviorReportOf(a).summary, behaviorTitles: behaviorReportOf(a).behaviors.map(b => b.title), inCompositions: compositionsOf(v, a.id), marks: compact(a) })),
    ...v.compositions.map(a => ({ kind: 'composition', id: a.id, title: a.title, tier: 'composition', route: a.route, summary: a.summary, flags: withMeans(a.flags, meanings), tripwires: a.tripwires, reviewOwed: a.reviewOwed, behaviorSummary: behaviorReportOf(a).summary, behaviorTitles: behaviorReportOf(a).behaviors.map(b => b.title), members: a.wiring.members.map(m => m.part), marks: Object.fromEntries(a.cells.map(c => [`${c.property}/${c.scenario}`, cellWords(c)])) })),
  ];
  const parts = v.parts.map(a => ({
    id: a.id, title: a.title, tier: a.tier,
    events: a.ir.events.map(e => ({ name: e.name, sender: e.sender, from: senderOf(a, e.sender) })),
    effects: a.ir.effects.map(e => e.name),
    seams: a.ir.seams.map(s => ({ id: s.id, piece: s.piece, body: s.body })),
  }));
  const compositions = v.compositions.map(a => ({ id: a.id, title: a.title, members: a.wiring.members.map(m => m.part), wiring: a.wiring.wiring, free: a.wiring.free }));
  const actors = v.actors.actors.map(x => ({ id: x.id, name: x.name || x.id, kind: x.kind, modes: x.modes, pins: x.pins, notes: x.notes }));
  const scenarios = v.actors.scenarios.map(s => ({ id: s.id, modes: s.modes, windows: s.windows, start: s.start, strongerThan: s.strongerThan, notes: s.notes }));
  return { root, version, route: v.route, tripwires: v.tripwires, dossiers, parts, compositions, actors, scenarios, legend: meanings.legend };
}

// Every address the palette reaches, each by its id: dossiers, passages, doubts, walks, cells,
// answers, behaviors and claims.
export function addresses(v: Verified) {
  const out: { group: string; label: string; sub: string; href: string }[] = [];
  const snip = (t: string) => String(t || '').replace(/\s+/g, ' ').slice(0, 90);
  const counted = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  for (const a of v.parts) {
    out.push({ group: 'Parts', label: a.id, sub: `${a.title} · ${a.tier}`, href: `#/part/${a.id}` });
    for (const p of a.prose.passages.filter(p => !p.retired)) out.push({ group: 'Passages', label: `${a.id} ${p.id}`, sub: snip(p.text), href: `#/part/${a.id}?view=model&sel=${p.id}` });
    for (const d of a.doubts) out.push({ group: 'Doubts', label: `${a.id} ${d.id}`, sub: `${d.status} · on ${d.on.join(' ')}`, href: `#/part/${a.id}?view=model&sel=${d.on[0] || ''}&tab=play&play=doubt:${d.id}:a:0` });
    for (const w of a.ir.walks) out.push({ group: 'Walks', label: `${a.id} ${w.id}`, sub: w.name || '', href: `#/part/${a.id}?view=model&tab=play&play=walk:${w.id}:0` });
    for (const x of a.answers) out.push({ group: 'Evidence', label: `${a.id} ${x.name}`, sub: x.entry?.established.trial || '', href: `#/part/${a.id}?view=model&tab=evidence&entry=${x.name}` });
  }
  for (const a of v.compositions) {
    out.push({ group: 'Compositions', label: a.id, sub: `${a.title} · ${counted(a.wiring.members.length, 'member')}`, href: `#/composition/${a.id}` });
    for (const p of a.prose.passages.filter(p => !p.retired)) out.push({ group: 'Passages', label: `${a.id} ${p.id}`, sub: snip(p.text), href: `#/composition/${a.id}?view=model&tab=properties&sel=${p.id}` });
    for (const c of a.cells) out.push({ group: 'Cells', label: `${a.id} ${c.property} ${c.scenario}`, sub: c.mark, href: `#/composition/${a.id}?view=model&cell=${c.property}:${c.scenario}` });
    for (const x of a.answers) out.push({ group: 'Evidence', label: `${a.id} ${x.name}`, sub: x.entry?.established.trial || '', href: `#/composition/${a.id}?view=model&tab=evidence&entry=${x.name}` });
  }
  for (const a of [...v.parts, ...v.compositions]) {
    const base = `#/${a.kind}/${a.id}`;
    for (const b of behaviorReportOf(a).behaviors) {
      out.push({ group: 'Behaviors', label: `${a.id} ${b.id}`, sub: `${b.title} · ${counted(b.claims.length, 'claim')}`, href: `${base}?behavior=${encodeURIComponent(b.id)}` });
      for (const c of b.claims) out.push({ group: 'Claims', label: `${a.id} ${c.key}`, sub: `${c.label} · ${snip(c.statement)}`, href: `${base}?behavior=${encodeURIComponent(b.id)}&claim=${encodeURIComponent(c.id)}` });
    }
  }
  return out;
}

// ---------- One part ----------
export function partModel(v: Verified, a: PartAnalysis, meanings: Meanings) {
  const ir = a.ir;
  const marks = Object.fromEntries(Object.entries(a.marks).map(([pid, m]) => {
    const kind = a.prose.byId[pid]?.kind || pid[0];
    return [pid, { ...m, explain: { means: meanings.mark(kind, m.mark, a.tier) } }];
  }));
  const passages = a.prose.passages.filter(p => !p.retired).map(p => ({ id: p.id, kind: p.kind, section: p.section, text: p.text, line: p.line, owner: a.owner[p.id] || null, doubts: a.openDoubtOn[p.id] || [] }));
  const sections: { name: string | null; passages: typeof passages }[] = [];
  for (const p of passages) { const last = sections.at(-1); if (last && last.name === p.section) last.passages.push(p); else sections.push({ name: p.section, passages: [p] }); }
  return {
    kind: 'part', id: a.id, title: a.title, tier: a.tier, route: a.route, summary: a.summary, flags: withMeans(a.flags, meanings), tripwires: a.tripwires,
    behaviors: readerReport(a), reviewOwed: a.reviewOwed, inCompositions: compositionsOf(v, a.id), boundary: a.prose.boundary?.text || a.prose.lead.join(' '),
    sections, marks,
    chart: {
      initial: ir.initial,
      states: ir.states.map(s => ({ key: s.key, name: s.name, parent: s.parent, final: s.final, initial: s.initial, children: s.children, passages: s.passages })),
      transitions: ir.transitions.map(t => ({ id: t.id, from: t.from, to: t.stays ? t.from : t.target, stays: t.stays, event: t.event, guard: label(t.guard), changes: t.assigns.map(x => `${x.name} := ${label(x.expr)}`), effects: t.effects })),
      refusals: ir.refusals.map(r => ({ id: r.id, states: r.states, events: r.events === 'every' ? ['every event'] : r.events, cond: label(r.cond), effects: r.effects })),
      events: ir.events.map(e => ({ id: e.id, name: e.name, sender: e.sender, from: senderOf(a, e.sender), fields: e.fields })),
      context: ir.context,
      invariants: ir.invariants.map(x => ({ id: x.id, while: x.while, cond: label(x.cond) })),
      walks: ir.walks.map(w => ({ id: w.id, name: w.name, from: w.from, ends: w.ends, steps: w.steps.map(s => ({ event: s.event, args: Object.fromEntries(Object.entries(s.args).map(([k, x]) => [k, literal(x)])), refused: s.refused })) })),
      table: ir.table, unsaid: ir.unsaid, saidTwice: ir.saidTwice,
    },
    backing: ir.guarantees.map(g => ({ id: g.id, claim: g.claim, kind: g.backing?.kind ?? null, ref: backingRef(g.backing), ...(a.backing[g.id] || {}) })),
    pins: Object.entries(a.pins).map(([ref, hash]) => ({ ref, resolved: hash != null })),
    doubts: a.doubts.map(d => ({ id: d.id, on: d.on, status: d.status, answer: d.answer, assumed: d.assumed, walks: d.walks, text: d.text, malformed: d.malformed })),
    decisions: decisionsOf(a),
    evidence: evidenceOf(a),
  };
}

// ---------- Traces ----------
// A value as TLC prints it, read back: a string, a boolean or a whole number, or the text as given.
function tlaValue(s: string): Value {
  if (/^".*"$/.test(s)) return s.slice(1, -1);
  if (s === 'TRUE') return true;
  if (s === 'FALSE') return false;
  if (/^-?\d+$/.test(s)) return Number(s);
  return s;
}
// A trace's states as rows, from TLC's steps or Apalache's ITF states.
function traceRows(trace: Answer['trace']) {
  if (Array.isArray(trace)) return trace.map(step => ({ index: step.index, action: step.action || null, stuttering: !!step.stuttering, backTo: step.backTo ?? null, values: step.values ? Object.fromEntries(Object.entries(step.values).map(([k, x]) => [k, tlaValue(x)])) : null }));
  if (trace && Array.isArray(trace.states)) return trace.states.map((st, i) => ({ index: i + 1, action: null, stuttering: false, backTo: null, values: Object.fromEntries(Object.entries(st).filter(([k]) => !k.startsWith('#')).map(([k, x]) => [k, tlaValue(itfText(x))])) as Record<string, Value> | null }));
  return [];
}

// An answer's trace on one part, each step mapped onto the move its action encodes (M<n>_<Event>).
export function partTrace(a: PartAnalysis, entryName: string) {
  const x = a.answers.find(r => r.name === entryName);
  const e = x?.entry;
  if (!e) return null;
  const ir = a.ir, data = new Set(ir.context.map(d => d.name));
  const sender = (event: string | null) => ir.events.find(ev => ev.name === event)?.sender || null;
  let before: Record<string, Value> | null = null;
  const steps = traceRows(e.answer.trace).map(r => {
    const values = r.values || {};
    const m = /^M(\d+)_/.exec(r.action || '');
    const move = m ? ir.transitions.find(t => t.id === `M${m[1]}`) : null;
    const step = {
      index: r.index, action: r.action, stuttering: r.stuttering, backTo: r.backTo,
      move: move?.id || null, event: move?.event || null, sender: move ? sender(move.event) : null,
      state: values.state ?? null,
      data: Object.fromEntries(Object.entries(values).filter(([k]) => data.has(k))),
      sent: Object.fromEntries(Object.entries(values).filter(([k]) => k.startsWith('sent_')).map(([k, n]) => [k.slice(5), n])),
      changed: before ? Object.keys(values).filter(k => (data.has(k) || k === 'state' || k.startsWith('sent_')) && JSON.stringify(values[k]) !== JSON.stringify(before![k])) : [],
    };
    if (r.values) before = values;
    return step;
  });
  return { entry: entryName, question: e.question, outcomes: e.answer.outcomes || {}, result: e.answer.result, reach: e.answer.reach?.text || null, because: e.call.because?.trim() || null, reading: x!.reading, steps };
}

// ---------- One composition ----------
export function compositionModel(v: Verified, a: CompositionAnalysis, meanings: Meanings) {
  const claimed = a.wiring.scenarios;
  const scenarioIds = [...new Set([...claimed, ...a.cells.map(c => c.scenario)])];
  return {
    kind: 'composition', id: a.id, title: a.title, route: a.route, summary: a.summary, flags: withMeans(a.flags, meanings), tripwires: a.tripwires, reviewOwed: a.reviewOwed,
    behaviors: readerReport(a),
    members: a.wiring.members.map(m => ({ id: m.part, role: m.role, pins: m.pins })),
    wiring: a.wiring.wiring, free: a.wiring.free, closure: a.wiring.closure, closureMissing: a.closureMissing,
    // Why the wiring does not compose, as the composer says, for a composition whose graph is empty.
    errors: [...new Set([...a.wiring.errors, ...a.composed.errors])],
    scenarios: scenarioIds.map(s => { const sc = v.actors.scenarioById[s]; return sc ? { id: sc.id, modes: sc.modes, windows: sc.windows, start: sc.start, strongerThan: sc.strongerThan, notes: sc.notes, claimed: claimed.includes(s) } : { id: s, missing: true }; }),
    passages: a.prose.passages.filter(p => !p.retired).map(p => ({ id: p.id, kind: p.kind, section: p.section, text: p.text, owner: a.owner[p.id] || null, held: a.propertyHeld[p.id] || null })),
    cells: a.cells.map(c => ({
      property: c.property, scenario: c.scenario, mark: c.mark, words: cellWords(c), means: meanings.cell(c.mark), trial: c.trial, entry: c.entry, reach: c.reach?.text || null, held: c.held,
      lapsed: c.lapsed, accepted: c.accepted, acceptanceLapsed: c.acceptanceLapsed || null, open: !!c.open, impliedBy: c.impliedBy || null, problem: c.problem || null,
      steps: stepsIn(c.trace),
    })),
    walks: a.walks.map(w => ({ ...w, means: meanings.walk(w.mark) })), risks: a.risks,
    decisions: decisionsOf(a),
    evidence: evidenceOf(a),
  };
}

// Which member a variable of the generated module belongs to, and its own name there, by the prefix the
// composer gives a member's variables: its id as an identifier, then an underscore. The longest prefix
// wins, so price-feed's variables are not read as price's.
export function memberOfVariable(members: string[]): (variable: string) => [string | null, string] {
  const prefixes = members.map(id => [`${ident(id)}_`, id] as const).sort((x, y) => y[0].length - x[0].length);
  return variable => { const p = prefixes.find(([pre]) => variable.startsWith(pre)); return p ? [p[1], variable.slice(p[0].length)] : [null, variable]; };
}
// Who took a step of the generated module, by the names the composer gives the actions: an actor's or a
// sending member's id, capitalized as an identifier, and TickStep for the chain.
export function actorOfAction(actorIds: string[], senders: string[], chain: string | null): (action: string | null) => string | null {
  const actions = new Map<string, string>([...actorIds, ...senders].map(id => [cap(ident(id)), id]));
  return action => (!action ? null : action === 'TickStep' ? chain : actions.get(action) ?? null);
}

// A cell's trace, each step split by member and named by the actor or member that moved, where one did.
export function compositionTrace(v: Verified, a: CompositionAnalysis, property: string, scenario: string) {
  const cell = a.cells.find(c => c.property === property && c.scenario === scenario);
  if (!cell?.trace) return null;
  const steps = compositionTraceSteps(v, a, cell.trace);
  return { property, scenario, mark: cell.mark, reach: cell.reach?.text || null, accepted: cell.accepted, steps };
}

function compositionTraceSteps(v: Verified, a: CompositionAnalysis, trace: Answer['trace']) {
  const split = memberOfVariable(a.wiring.members.map(m => m.part));
  const actorOf = actorOfAction(a.composed.actors || [], a.composed.parts || [], v.actors.actors.find(x => x.kind === 'chain')?.id ?? null);
  let before: Record<string, Value> | null = null;
  const steps = traceRows(trace).map(r => {
    const values = r.values || {};
    const per: Record<string, Record<string, Value>> = {};
    for (const [k, val] of Object.entries(values)) { const [m, name] = split(k); if (m) (per[m] ||= {})[name] = val; }
    const changed = before ? Object.keys(values).filter(k => JSON.stringify(values[k]) !== JSON.stringify(before![k])) : [];
    const moved = [...new Set(changed.map(k => split(k)[0]).filter(Boolean))];
    const step = { index: r.index, action: r.action, actor: actorOf(r.action), stuttering: r.stuttering, backTo: r.backTo, members: per, moved, changed: changed.map(k => { const [m, name] = split(k); return { member: m, name, before: before?.[k], after: values[k] }; }) };
    if (r.values) before = values;
    return step;
  });
  return steps;
}

export function compositionWalk(v: Verified, a: CompositionAnalysis, id: string, scenario: string) {
  const walk = a.walks.find(w => w.id === id && w.scenario === scenario);
  const read = walk?.entry ? a.answers.find(x => x.name === walk.entry) : null;
  if (!walk || !read?.entry?.answer.trace) return null;
  return {
    id, scenario, mark: walk.mark, entry: read.name,
    reach: read.entry.answer.reach?.text || null,
    steps: compositionTraceSteps(v, a, read.entry.answer.trace),
  };
}
