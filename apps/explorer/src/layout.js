// Layout by ELK. Boxes are sized from their measured text, and ELK routes every arrow and places
// every arrow label, so nothing is drawn through a box and labels do not collide.
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
export const FONTS = { title: `600 12px ${SANS}`, line: `11px ${MONO}`, small: `11px ${SANS}`, label: `11px ${SANS}` };
const ctx = document.createElement('canvas').getContext('2d');
export function textWidth(text, font) { ctx.font = font; return ctx.measureText(String(text)).width; }
export const clip = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));

const LINE = 15, PAD_X = 8, PAD_Y = 6, TITLE = 18;
const BASE = {
  'elk.algorithm': 'layered',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.spacing.nodeNodeBetweenLayers': '56',
  'elk.layered.spacing.edgeNodeBetweenLayers': '18',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '12',
  'elk.spacing.nodeNode': '36',
  'elk.spacing.edgeEdge': '12',
  'elk.spacing.edgeNode': '14',
  'elk.spacing.edgeLabel': '3',
  'elk.edgeLabels.inline': 'false',
  'elk.json.shapeCoords': 'ROOT',
  'elk.json.edgeCoords': 'ROOT',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
};

// A box from a title row and mono lines: the size that fits them.
export function boxSize(title, aside, lines) {
  const w = Math.max(textWidth(title, FONTS.title) + (aside ? 8 + textWidth(aside, FONTS.line) : 0), ...lines.map(l => textWidth(l, FONTS.line)));
  return { w: Math.ceil(w) + PAD_X * 2 + 2, h: TITLE + lines.length * LINE + PAD_Y * 2 };
}
function labelBox(text) { return { text, width: Math.ceil(textWidth(text, FONTS.label)) + 10, height: 16 }; }

async function run(graph) {
  const out = await elk.layout(graph);
  const nodes = new Map(), edges = new Map();
  const walk = n => { for (const c of n.children || []) { nodes.set(c.id, { x: c.x, y: c.y, w: c.width, h: c.height }); walk(c); } };
  walk(out);
  const gather = n => {
    for (const e of n.edges || []) {
      const s = e.sections?.[0];
      const points = s ? [s.startPoint, ...(s.bendPoints || []), s.endPoint].map(p => [p.x, p.y]) : [];
      const l = e.labels?.[0];
      edges.set(e.id, { points, label: l ? { x: l.x, y: l.y, w: l.width, h: l.height, text: l.text } : null });
    }
    for (const c of n.children || []) gather(c);
  };
  gather(out);
  return { nodes, edges, width: out.width, height: out.height };
}

// A part's statechart. Moves that stay in their state are lines inside the state's box.
export async function layoutChart(chart, { showRefusals = false, showChanges = false } = {}) {
  const stays = {};
  for (const t of chart.transitions) if (t.stays) (stays[t.from] ||= []).push(t);
  const content = {};
  for (const s of chart.states) {
    const lines = (stays[s.key] || []).map(t => clip(`↻ ${t.event}${t.guard ? ` [${t.guard}]` : ''}${showChanges && t.changes.length ? ` / ${t.changes.join(', ')}` : ''}  ${t.id}`, 64));
    if (showRefusals) for (const r of chart.refusals.filter(x => x.states.includes(s.key))) lines.push(clip(`✕ ${r.events.join(', ')}${r.cond ? ` when ${r.cond}` : ''}  ${r.id}`, 64));
    content[s.key] = { lines, aside: s.passages.filter(p => p.startsWith('S')).join(' ') };
  }
  const byParent = {};
  for (const s of chart.states) (byParent[s.parent || ''] ||= []).push(s);
  const nodeFor = s => {
    const kids = byParent[s.key] || [];
    const { lines, aside } = content[s.key];
    if (kids.length) return { id: `st:${s.key}`, layoutOptions: { 'elk.padding': '[top=26,left=10,bottom=10,right=10]' }, labels: [{ text: s.name }], children: kids.map(nodeFor) };
    const { w, h } = boxSize(s.name, aside, lines);
    return { id: `st:${s.key}`, width: w, height: h };
  };
  const moves = chart.transitions.filter(t => !t.stays);
  const arrow = t => `${t.event}${t.guard ? ` [${clip(t.guard, 36)}]` : ''}${showChanges && t.changes.length ? ` / ${clip(t.changes.join(', '), 30)}` : ''}  ${t.id}`;
  const graph = {
    id: 'root',
    layoutOptions: { ...BASE, 'elk.direction': 'DOWN' },
    children: [{ id: 'init', width: 12, height: 12 }, ...(byParent[''] || []).map(nodeFor)],
    edges: [
      { id: 'e:init', sources: ['init'], targets: [`st:${chart.initial}`] },
      ...moves.map(t => ({ id: `mv:${t.id}`, sources: [`st:${t.from}`], targets: [`st:${t.to}`], labels: [labelBox(arrow(t))] })),
    ],
  };
  const out = await run(graph);
  return { ...out, content };
}

// A composition's graph: members, the actors that send into them, and stubs for what lies outside.
// Laid out across and down, keeping whichever fits the pane at the larger scale.
export async function layoutComposition(nodes, edges, pane = { width: 800, height: 600 }) {
  const graph = direction => ({
    id: 'root',
    layoutOptions: { ...BASE, 'elk.direction': direction, 'elk.layered.spacing.nodeNodeBetweenLayers': direction === 'RIGHT' ? '90' : '60', 'elk.spacing.nodeNode': '28' },
    children: nodes.map(n => ({ id: n.id, width: n.w, height: n.h })),
    edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target], labels: e.label ? [labelBox(e.label)] : [] })),
  });
  const [across, down] = await Promise.all([run(graph('RIGHT')), run(graph('DOWN'))]);
  const scale = l => Math.min(pane.width / l.width, pane.height / l.height);
  return scale(down) > scale(across) * 1.05 ? down : across;
}

// An orthogonal route with its corners rounded.
export function roundedPath(points, r = 6) {
  if (!points.length) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1], [x, y] = points[i], [nx, ny] = points[i + 1];
    const d1 = Math.hypot(x - px, y - py), d2 = Math.hypot(nx - x, ny - y), k = Math.min(r, d1 / 2, d2 / 2);
    const ax = x - ((x - px) / d1) * k, ay = y - ((y - py) / d1) * k, bx = x + ((nx - x) / d2) * k, by = y + ((ny - y) / d2) * k;
    d += ` L ${ax} ${ay} Q ${x} ${y} ${bx} ${by}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${last[0]} ${last[1]}`;
}
