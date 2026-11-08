// Tracks: a walk, a doubt's reading, a trace or a found path, as one list of steps the players share.
import { argsText, changedKeys, dataOf, sentOf } from './lib.js';

function fromReplay(run, { kind, id, title, replay, text }) {
  if (!replay || replay.error) return { kind, id, title, text, error: replay?.error || 'nothing to play', steps: [] };
  let prev = null;
  const steps = replay.steps.map((s, i) => {
    const snap = run.snapshots[s.at] || { leaves: [], context: {} };
    const data = dataOf(snap.context);
    const step = {
      i, label: s.step === null || s.step === undefined ? 'start' : `${s.event}${argsText(s.args)}`, event: s.event || null,
      refused: !!s.refused, by: s.by || [], byError: s.byError || null, error: s.error || null, at: s.at, leaves: snap.leaves, data, sent: sentOf(snap.context), changed: changedKeys(prev, data),
    };
    prev = data;
    return step;
  });
  return { kind, id, title, text, steps, ends: replay.ends, problems: replay.problems || [] };
}

export const walkTrack = (run, id) => {
  const w = run?.walks?.find(x => x.id === id);
  return w ? fromReplay(run, { kind: 'walk', id, title: `${w.id} ${w.name}`, replay: w }) : null;
};

export const doubtTrack = (run, id, alt) => {
  const r = run?.doubts?.find(x => x.id === id)?.walks?.[alt];
  return r ? fromReplay(run, { kind: 'doubt', id: `${id}:${alt}`, title: `${id}, reading ${alt}`, replay: r, text: r.text }) : null;
};

export function traceTrack(trace) {
  if (!trace) return null;
  const steps = trace.steps.map((s, i) => ({
    i, label: s.stuttering ? 'stutter' : s.backTo != null ? `back to ${s.backTo}` : s.event || (i === 0 ? 'start' : s.action || ''),
    action: s.action, event: s.event, stuttering: !!s.stuttering, refused: false, by: s.move ? [s.move] : [], actor: s.sender, leaves: s.state ? [s.state] : [],
    data: s.data, sent: Object.fromEntries(Object.entries(s.sent || {}).filter(([, n]) => n)), changed: s.changed,
  }));
  return { kind: 'trace', id: trace.entry, title: trace.entry, steps, meta: trace };
}

// The shortest run of moves through the explored graph from one snapshot to one matching a test.
export function findPath(run, from, test) {
  const out = new Map();
  for (const e of run.edges) if (e.to != null && e.to !== e.from && e.by.some(id => id.startsWith('M'))) { if (!out.has(e.from)) out.set(e.from, []); out.get(e.from).push(e); }
  const back = new Map([[from, null]]);
  const queue = [from];
  let hit = test(run.snapshots[from]) ? from : null;
  while (queue.length && hit === null) {
    const at = queue.shift();
    for (const e of out.get(at) || []) {
      if (back.has(e.to)) continue;
      back.set(e.to, e);
      if (test(run.snapshots[e.to])) { hit = e.to; break; }
      queue.push(e.to);
    }
  }
  if (hit === null) return null;
  const edges = [];
  for (let at = hit; back.get(at); at = back.get(at).from) edges.unshift(back.get(at));
  return { steps: [{ at: from, step: null }, ...edges.map((e, i) => ({ at: e.to, step: i, event: e.event.type, args: Object.fromEntries(Object.entries(e.event).filter(([k]) => k !== 'type')), by: e.by }))] };
}
export const pathTrack = (run, from, test, title) => {
  const replay = findPath(run, from, test);
  return replay ? fromReplay(run, { kind: 'path', id: title, title, replay }) : { kind: 'path', id: title, title, error: 'no explored path reaches it', steps: [] };
};

// What a step lights on the chart: the states it is in, the move it took, and the moves before it.
export function lightsOf(track, i, chart) {
  const out = { nodes: new Set(), edges: new Set(), lines: new Set(), visitedEdges: new Set(), visitedLines: new Set() };
  if (!track?.steps?.length) return out;
  const stays = new Set(chart.transitions.filter(t => t.stays).map(t => t.id));
  const mark = (step, edges, lines) => {
    if (!step?.by || step.refused) return;
    for (const id of step.by.filter(x => x.startsWith('M'))) { if (stays.has(id)) lines.add(id); else edges.add(`mv:${id}`); }
  };
  const step = track.steps[Math.min(i, track.steps.length - 1)];
  for (const leaf of step.leaves || []) out.nodes.add(`st:${leaf}`);
  mark(step, out.edges, out.lines);
  for (const s of track.steps.slice(1, i)) mark(s, out.visitedEdges, out.visitedLines);
  return out;
}
