// The pages the spine leads to, and what needs a person under each node. They are read off the map verify
// placed, v.map, by walking its tree: each component's entries as verify resolved them, and each node's
// sited compositions. The claims an entry takes come from selectedClaims, the function verify counts with,
// so a page lists what its node's counts count. Nothing here places, sites, flows or counts anew.
import { titleAndLead } from '../dossiers/map.ts';
import { selectedClaims } from '../verify/map.ts';
import { cellWords } from '../verify/render.ts';
import type { Verified } from '../commands/verify.ts';
import type { Analysis, CompositionAnalysis, PartAnalysis } from '../verify/analyze.ts';
import type { MapNode, MapNote, MapRootNode } from '../verify/map.ts';
import type { ClaimReport, MappingReport } from '../behaviors/report.ts';
import type { Backing } from '../prose/prose.ts';

// What a component holds of one dossier: the whole of it, or the behaviors and claims selected.
export interface Holding { ref: string; select: string[] | null }
// A decision prepared for the owner, `dossier decide <dossier> <verb> <args> -- ""`, the words left blank.
export interface Decide { dossier: string; verb: string; args: string[] }
// The page addresses that are not a map node's id.
export const ROOT = '@root', UNPLACED = '@unplaced';

const byRefOf = (v: Verified) => new Map<string, Analysis>([...v.parts, ...v.compositions].map(a => [a.ref, a]));
const named = (a: Analysis) => ({ ref: a.ref, kind: a.kind, id: a.id, title: a.title });
const leadOf = (text: string | null | undefined) => titleAndLead(String(text || '')).lead;
export const backingRef = (b: Backing | null) => (!b ? null : b.kind === 'record' ? b.ref : b.kind === 'external' ? b.runner : b.kind === 'none' ? null : `${b.path} ${b.rule}`);

// Every node of the tree by its id, the root under null, and the path from the root to a node.
export function treeIndex(tree: MapRootNode) {
  const byId = new Map<string | null, MapNode>(), parent = new Map<MapNode, MapNode | null>();
  const walk = (n: MapNode, up: MapNode | null) => { byId.set(n.id, n); parent.set(n, up); if (n.kind !== 'component') for (const c of [...n.groups, ...n.components]) walk(c, n); };
  walk(tree, null);
  const path = (n: MapNode) => { const out: MapNode[] = []; for (let x: MapNode | null = n; x; x = parent.get(x) ?? null) out.unshift(x); return out; };
  return { byId, path };
}
// What a node's subtree holds: its components' entries, and the compositions sited at it or below, whole.
export function holdingsUnder(node: MapNode): Holding[] {
  const out: Holding[] = [];
  const walk = (n: MapNode) => {
    if (n.kind === 'component') out.push(...n.dossiers.map(d => ({ ref: d.ref, select: d.select })));
    else for (const c of [...n.groups, ...n.components]) walk(c);
    out.push(...n.sited.map(ref => ({ ref, select: null })));
  };
  walk(node);
  return out;
}
// The ids of a node and of every node below it.
const idsUnder = (node: MapNode): Set<string | null> => {
  const ids = new Set<string | null>([node.id]);
  if (node.kind !== 'component') for (const c of [...node.groups, ...node.components]) for (const id of idsUnder(c)) ids.add(id);
  return ids;
};
// The holdings a page reaches: each dossier once, and each claim once by `<ref>#<behavior>/<claim>`.
export function reachOf(v: Verified, holdings: Holding[]) {
  const byRef = byRefOf(v);
  const dossiers = new Map<string, Analysis>(), claims = new Map<string, { a: Analysis; behavior: string; claim: ClaimReport }>();
  for (const h of holdings) {
    const a = byRef.get(h.ref);
    if (!a) continue;
    dossiers.set(a.ref, a);
    for (const c of selectedClaims(a, h.select)) claims.set(`${a.ref}#${c.key}`, { a, behavior: c.key.split('/')[0], claim: c });
  }
  return { dossiers, claims };
}

// ---------- Claims ----------
// The mappings that go against a claim: an assessment found it contradicted, or a review upheld a challenge.
const against = (c: ClaimReport): MappingReport[] => c.mappings.filter(m => m.assessment.results.includes('contradicted') || (m.relation === 'challenges' && m.assessment.results.includes('supported')));
// A contradicted claim whose violation the owner accepted: every mapping against it rests on a target the
// owner accepted, and no acceptance has lapsed. The acceptances, in the owner's words; else null.
export function acceptance(c: ClaimReport) {
  if (c.standing !== 'contradicted') return null;
  const facets = against(c).map(m => m.evidence.owner.filter(o => o.accepted && !o.acceptanceLapsed.length));
  if (!facets.length || facets.some(f => !f.length)) return null;
  return facets.flat().map(o => ({ dossier: o.dossier, passage: o.passage, scenario: o.scenario, words: o.accepted!.words, time: o.accepted!.time }));
}
// The decisions that settle a contradicted claim, where a verb exists: a risk on a violated cell the owner
// has not accepted, an accept or a reject of a passage the owner has not settled. Often none applies.
function decisionsFor(c: ClaimReport): Decide[] {
  const out: Decide[] = [], seen = new Set<string>();
  const add = (d: Decide) => { const k = JSON.stringify(d); if (!seen.has(k)) { seen.add(k); out.push(d); } };
  for (const m of against(c)) for (const o of m.evidence.owner) {
    if (o.scenario) { if (!o.accepted && m.evidence.formal?.mark === 'violated') add({ dossier: o.dossier, verb: 'risk', args: [o.passage, o.scenario] }); }
    else if (o.state !== 'settled') { add({ dossier: o.dossier, verb: 'accept', args: [o.passage] }); add({ dossier: o.dossier, verb: 'reject', args: [o.passage] }); }
  }
  return out;
}
// A claim as a page shows it: the report's claim, whether its violation was accepted, and the first
// paragraph of the reading beside each answer behind it.
function claimView(c: ClaimReport, byRef: Map<string, Analysis>) {
  const reading = (dossier: string, entry: string | null) => (entry ? leadOf(byRef.get(dossier)?.answers.find(x => x.name === entry)?.reading) : null);
  return {
    ...c, accepted: acceptance(c),
    mappings: c.mappings.map(m => ({ ...m, evidence: { ...m.evidence, evidence: m.evidence.evidence.map(e => ({ ...e, reading: reading(e.dossier, e.entry) })) } })),
  };
}

// ---------- What needs a person ----------
// The notes are every map note beneath the page, as the map counts them. Attention lists them in
// noteLines lines: on a map that places nothing, the `unplaced` dossiers in one, and each other note in
// its own.
export interface Attention {
  contradicted: unknown[]; contested: unknown[]; accepted: unknown[]; unreviewed: unknown[];
  reviews: unknown[]; doubts: unknown[]; decisions: unknown[]; reviewsOwed: unknown[]; tripwires: unknown[];
  notes: MapNote[]; root: { name: string; where: string }[]; emptyMap: boolean; unplaced: number; noteLines: number; total: number;
}
// What needs a person among what the holdings reach, each kind in the words of verify's counts: the claims
// contradicted, contested or with evidence awaiting review, the accepted contradictions apart; the stale
// reviews, open doubts, cells violated without an acceptance, reviews owed and dossiers with a tripwire.
export function attentionOf(v: Verified, holdings: Holding[], notes: MapNote[], { emptyMap = false, root = [] as { name: string; where: string }[] } = {}): Attention {
  const { dossiers, claims } = reachOf(v, holdings);
  const out: Attention = { contradicted: [], contested: [], accepted: [], unreviewed: [], reviews: [], doubts: [], decisions: [], reviewsOwed: [], tripwires: [], notes, root, emptyMap, unplaced: 0, noteLines: 0, total: 0 };
  for (const { a, behavior, claim: c } of claims.values()) {
    if (c.standing !== 'contradicted' && c.standing !== 'contested' && c.standing !== 'evidence-available') continue;
    const item = { ...named(a), behavior, behaviorTitle: a.behaviors!.behaviors.find(b => b.id === behavior)?.title ?? behavior, claim: c.id, statement: c.statement, standing: c.standing, claimKind: c.kind };
    if (c.standing === 'contested') out.contested.push(item);
    else if (c.standing === 'evidence-available') out.unreviewed.push(item);
    else { const accepted = acceptance(c); if (accepted) out.accepted.push({ ...item, accepted }); else out.contradicted.push({ ...item, decide: decisionsFor(c) }); }
  }
  for (const a of dossiers.values()) {
    for (const r of a.behaviors?.reviews.reviews || []) if (r.status === 'stale') out.reviews.push({ ...named(a), file: r.file, reasons: r.reasons });
    for (const d of a.doubts) if (d.status !== 'closed') out.doubts.push({ ...named(a), doubt: d.id, on: d.on, text: d.text, walks: d.walks, assumed: d.assumed, decide: Object.keys(d.walks || {}).map(alt => ({ dossier: a.ref, verb: 'answer', args: [d.id, alt] })) });
    if (a.kind === 'composition') for (const c of a.cells) if (c.mark === 'violated' && !c.accepted) out.decisions.push({ ...named(a), property: c.property, scenario: c.scenario, words: cellWords(c), text: a.prose.byId[c.property]?.text ?? '', moved: c.acceptanceLapsed || [], decide: [{ dossier: a.ref, verb: 'risk', args: [c.property, c.scenario] }] });
    const owed = a.flags.find(f => f.name === 'review owed');
    if (owed) out.reviewsOwed.push({ ...named(a), where: owed.where });
    if (a.tripwires.length) out.tripwires.push({ ...named(a), tripwires: a.tripwires.map(t => ({ name: t.name, where: t.where })) });
  }
  const lists = [out.contradicted, out.contested, out.accepted, out.unreviewed, out.reviews, out.doubts, out.decisions, out.reviewsOwed, out.tripwires];
  // On an empty map every live dossier is unplaced, and that is said once. Any other note, such as a
  // featured reading the empty root cannot hold, is still a line of its own.
  out.unplaced = emptyMap ? notes.filter(n => n.name === 'dossier unplaced').length : 0;
  out.noteLines = notes.length - out.unplaced + Math.min(out.unplaced, 1);
  out.total = lists.reduce((n, l) => n + l.length, 0) + out.noteLines + root.length;
  return out;
}

// How many of a dossier's claims are contradicted with their violation accepted.
export const acceptedIn = (a: Analysis) => (a.behaviors?.behaviors || []).reduce((n, b) => n + b.claims.filter(c => acceptance(c)).length, 0);

// ---------- Pages ----------
// A dossier at a glance: what a row, a flow or a featured reading names.
function glance(a: Analysis) {
  const s = a.behaviors!.summary;
  return { ...named(a), lead: leadOf(a.behaviorCollection?.collection?.body), summary: { behaviors: s.behaviors, claims: s.claims, supported: s.supported, evidenceAvailable: s.evidenceAvailable, hypotheses: s.hypotheses, contradicted: s.contradicted, contested: s.contested, stale: s.stale, accepted: acceptedIn(a) } };
}
// What a part relies on: its Guarantees with their backing, and its Givens.
function reliesOf(a: PartAnalysis) {
  const text = (id: string) => a.prose.byId[id]?.text ?? '';
  return {
    guarantees: a.prose.guarantees.map(k => ({ id: k.id, text: k.claim, backing: k.backing?.kind ?? null, names: backingRef(k.backing), status: a.backing[k.id]?.status ?? 'assumed', reason: a.backing[k.id]?.reason ?? null })),
    givens: a.prose.givens.map(g => ({ id: g.id, text: text(g.id), assumption: g.assumption ?? null, otherwise: g.otherwise ?? null, actor: g.actor, event: g.event, prompt: g.promptness === 'prompt' })),
  };
}
// The dossiers a component holds, or one dossier whole, as the page reads them: each with the behaviors
// and claims its entry takes, and for a part held whole, what it relies on.
function readingOf(v: Verified, holdings: Holding[]) {
  const byRef = byRefOf(v);
  return holdings.flatMap(h => {
    const a = byRef.get(h.ref);
    if (!a) return [];
    const take = new Set(selectedClaims(a, h.select).map(c => c.key));
    const behaviors = a.behaviors!.behaviors.map(b => ({ id: b.id, title: b.title, claims: b.claims.filter(c => take.has(c.key)).map(c => claimView(c, byRef)) })).filter(b => b.claims.length);
    return [{ ...glance(a), select: h.select, behaviors, relies: a.kind === 'part' && !h.select ? reliesOf(a as PartAnalysis) : null }];
  });
}
// A featured reading with the words it points at: the behavior's title, and the claim when it names one.
function featuredOf(v: Verified, readings: MapRootNode['featured']) {
  const byRef = byRefOf(v);
  return readings.flatMap(r => {
    const a = byRef.get(r.dossier);
    if (!a) return [];
    const [behavior, claim] = r.behavior.split('/');
    const b = a.behaviors!.behaviors.find(x => x.id === behavior);
    return [{ ...named(a), behavior, claim: claim ?? null, behaviorTitle: b?.title ?? behavior, statement: claim ? b?.claims.find(c => c.id === claim)?.statement ?? null : null, lead: r.lead }];
  });
}
// Each live dossier's places in the map: the components that hold it whole, then the node a composition
// sits at, then the components that hold some of it through a selection, each kind in the order of the
// tree. The first is where the spine and the breadcrumbs put the dossier: where it is held whole, not
// where another component takes one of its behaviors.
const PREFERRED = { whole: 0, sited: 1, selection: 2 } as const;
export function placesOf(tree: MapRootNode | null) {
  const out = new Map<string, { node: string | null; how: keyof typeof PREFERRED }[]>();
  if (!tree) return out;
  const add = (ref: string, node: string | null, how: keyof typeof PREFERRED) => (out.get(ref) || out.set(ref, []).get(ref)!).push({ node, how });
  const walk = (n: MapNode) => {
    if (n.kind === 'component') for (const d of n.dossiers) add(d.ref, n.id, d.select ? 'selection' : 'whole');
    else for (const c of [...n.groups, ...n.components]) walk(c);
    for (const ref of n.sited) add(ref, n.id, 'sited');
  };
  walk(tree);
  for (const places of out.values()) places.sort((x, y) => PREFERRED[x.how] - PREFERRED[y.how]);
  return out;
}
const emptyTree = (tree: MapRootNode) => !tree.groups.length && !tree.components.length;
const componentsUnder = (n: MapNode): number => (n.kind === 'component' ? 1 : [...n.groups, ...n.components].reduce((k, c) => k + componentsUnder(c), 0));
const summaryOf = (n: MapNode) => ({ kind: n.kind, id: n.id, title: n.title, lead: n.lead, counts: n.counts, components: componentsUnder(n) });

// The root, a group or a component, by its id: what it holds, its featured readings, its flows, and what
// needs a person beneath it. The root's attention takes in the dossiers no node places too.
export function nodePage(v: Verified, id: string) {
  const map = v.map, tree = map.tree;
  const byRef = byRefOf(v);
  const all: Holding[] = [...v.parts, ...v.compositions].map(a => ({ ref: a.ref, select: null }));
  if (id === UNPLACED) {
    const refs = map.unplaced?.dossiers ?? (tree ? [] : all.map(h => h.ref));
    const holdings = refs.map(ref => ({ ref, select: null }));
    return { kind: 'unplaced', id: UNPLACED, title: 'Not placed', lead: null, path: [], counts: map.unplaced?.counts ?? null, dossiers: holdings.map(h => glance(byRef.get(h.ref)!)), attention: attentionOf(v, holdings, map.notes.filter(n => n.name === 'dossier unplaced'), { emptyMap: !tree || emptyTree(tree) }) };
  }
  if (!tree) {
    if (id !== ROOT) return null;
    return { kind: 'root', id: ROOT, title: map.title, lead: map.lead, path: [], counts: null, malformed: true, children: [], featured: [], sited: [], unplaced: all.map(h => glance(byRef.get(h.ref)!)), attention: attentionOf(v, all, [], { root: v.tripwires }) };
  }
  const { byId, path } = treeIndex(tree);
  const node = byId.get(id === ROOT ? null : id);
  if (!node) return null;
  const crumbs = path(node).slice(1, -1).map(n => ({ id: n.id, title: n.title }));
  const base = { kind: node.kind, id: node.id ?? ROOT, title: node.kind === 'root' ? map.title : node.title, lead: node.kind === 'root' ? map.lead : node.lead, record: node.kind === 'root' ? null : node.record, path: crumbs, counts: node.counts, featured: featuredOf(v, node.featured), sited: node.sited.map(ref => glance(byRef.get(ref)!)) };
  if (node.kind === 'component') {
    return {
      ...base, flowsOff: node.flowsOff, holdings: readingOf(v, node.dossiers.map(d => ({ ref: d.ref, select: d.select }))),
      flows: node.flows.map(ref => glance(byRef.get(ref)!)),
      attention: attentionOf(v, holdingsUnder(node), map.notes.filter(n => n.node === node.id)),
    };
  }
  const ids = idsUnder(node);
  const root = node.kind === 'root';
  const unplaced = root ? (map.unplaced?.dossiers ?? []) : [];
  return {
    ...base, children: [...node.groups, ...node.components].map(summaryOf),
    unplaced: unplaced.map(ref => glance(byRef.get(ref)!)),
    attention: attentionOf(v, [...holdingsUnder(node), ...unplaced.map(ref => ({ ref, select: null }))], root ? map.notes : map.notes.filter(n => n.node !== null && ids.has(n.node)), { emptyMap: root && emptyTree(tree), root: root ? v.tripwires : [] }),
  };
}

// One dossier read whole: its behaviors and claims, what it relies on, its compositions or members, the
// places the map gives it, and what needs a person in it.
export function dossierPage(v: Verified, ref: string) {
  const a = byRefOf(v).get(ref);
  if (!a) return null;
  const holdings = [{ ref, select: null }];
  const places = placesOf(v.map.tree).get(ref) || [];
  const tree = v.map.tree, index = tree ? treeIndex(tree) : null;
  // Each place's title, the root's falling back to the word the top bar shows for it, and the way from the
  // root to it, the node itself included, since the page's own crumb is the dossier.
  const where = places.map(p => ({ ...p, title: p.node === null ? v.map.title || 'Dossiers' : (index?.byId.get(p.node)?.title ?? p.node), path: index && p.node !== null ? index.path(index.byId.get(p.node)!).slice(1).map(n => ({ id: n.id, title: n.title })) : [] }));
  const byRef = byRefOf(v);
  const compositions = a.kind === 'part' ? v.compositions.filter(s => s.wiring.members.some(m => m.part === a.id)).map(glance) : [];
  const members = a.kind === 'composition' ? (a as CompositionAnalysis).wiring.members.map(m => byRef.get(`parts/${m.part}`)).filter((x): x is Analysis => Boolean(x)).map(glance) : [];
  return { page: 'dossier', ...glance(a), tier: a.kind === 'part' ? (a as PartAnalysis).tier : 'composition', places: where, holdings: readingOf(v, holdings), compositions, members, attention: attentionOf(v, holdings, v.map.notes.filter(n => n.where === ref || n.where.startsWith(`${ref} `) || n.where.startsWith(`${ref}#`))) };
}

// How many claims under each node are contradicted with their violation accepted, by node id, ROOT and
// UNPLACED: what lets the spine and the counts read an accepted violation as accepted.
export function acceptedByNode(v: Verified): Record<string, number> {
  const out: Record<string, number> = {};
  const count = (holdings: Holding[]) => [...reachOf(v, holdings).claims.values()].filter(x => acceptance(x.claim)).length;
  if (v.map.tree) for (const [id, node] of treeIndex(v.map.tree).byId) out[id ?? ROOT] = count(holdingsUnder(node));
  out[UNPLACED] = count((v.map.unplaced?.dossiers ?? (v.map.tree ? [] : [...v.parts, ...v.compositions].map(a => a.ref))).map(ref => ({ ref, select: null })));
  return out;
}
