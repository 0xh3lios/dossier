// The map placed over the dossiers verify analyzed: which component holds each dossier, where each
// composition no component holds sits, the flows each component takes part in, the notes, and each node's
// claims counted by standing over its subtree. It reads the behavior reports and the analyses and computes
// no standing of its own. Nothing here is a time or an absolute path.
import { refOf, selectionOf } from '../dossiers/map.ts';
import type { DossierMap, MapComponent, MapGroup, MapReading, RootMap } from '../dossiers/map.ts';
import type { LoadedKnowledge } from '../dossiers/load.ts';
import type { ClaimReport, ClaimStanding } from '../behaviors/report.ts';
import type { Analysis, CompositionAnalysis } from './analyze.ts';

// The notes, in the order the summary counts them. A note never fails verify.
export const MAP_NOTES = ['dossier unplaced', 'dossier unknown', 'dossier retired', 'reading unknown', 'reading outside its node', 'record unresolved'] as const;
export type MapNoteName = typeof MAP_NOTES[number];
// A note: its name, what it concerns, and the node it was found on, null for the root or for no node.
export interface MapNote { name: MapNoteName; where: string; node: string | null }
export const STANDINGS: readonly ClaimStanding[] = ['supported', 'evidence-available', 'hypothesis', 'contradicted', 'contested'];
// What needs a person: the claims contradicted, contested or with evidence awaiting review; the stale
// reviews, the open doubts and the cells violated without an acceptance that holds, of the dossiers
// reached; the notes on the node or under it; and the dossiers reached that owe a review of the whole
// dossier, or hold a tripwire, each dossier once.
export interface MapNeeds { claims: number; reviews: number; doubts: number; decisions: number; notes: number; reviewsOwed: number; tripwires: number }
export interface MapCounts { dossiers: number; claims: number; standing: Record<ClaimStanding, number>; stale: number; needs: MapNeeds }
interface NodeCommon { id: string | null; title: string | null; lead: string | null; featured: MapReading[]; sited: string[]; counts: MapCounts }
export interface MapRootNode extends NodeCommon { kind: 'root'; groups: MapGroupNode[]; components: MapComponentNode[] }
export interface MapGroupNode extends NodeCommon { kind: 'group'; id: string; record: string | null; groups: MapGroupNode[]; components: MapComponentNode[] }
export interface MapComponentNode extends NodeCommon { kind: 'component'; id: string; record: string | null; dossiers: { ref: string; select: string[] | null }[]; flows: string[]; flowsOff: boolean }
export type MapNode = MapRootNode | MapGroupNode | MapComponentNode;
// What verify --json carries as `map`: the root's title and lead, the tree, the dossiers no component
// places, and the notes. The tree and the unplaced are null while the block does not read.
export interface MapView { title: string | null; lead: string | null; tree: MapRootNode | null; unplaced: { dossiers: string[]; counts: MapCounts } | null; notes: MapNote[] }

interface PlaceInput { readme: RootMap; analyses: Analysis[]; retired: string[]; knowledge: LoadedKnowledge }
// What a node's subtree reaches: dossiers, and claims by their address across the root.
interface Reach { dossiers: Set<string>; claims: Map<string, ClaimReport> }

const zero = (): MapCounts => ({ dossiers: 0, claims: 0, standing: { supported: 0, 'evidence-available': 0, hypothesis: 0, contradicted: 0, contested: 0 }, stale: 0, needs: { claims: 0, reviews: 0, doubts: 0, decisions: 0, notes: 0, reviewsOwed: 0, tripwires: 0 } });
const NEEDS_A_PERSON: readonly ClaimStanding[] = ['contradicted', 'contested', 'evidence-available'];

// The claims of one dossier a selection takes: all of them without a selection, else each selected
// behavior's and each selected claim. A selected item the dossier lacks takes nothing.
export function selectedClaims(a: Analysis, select: string[] | null): ClaimReport[] {
  const behaviors = a.behaviors?.behaviors || [];
  if (!select) return behaviors.flatMap(b => b.claims);
  return behaviors.flatMap(b => select.includes(b.id) ? b.claims : b.claims.filter(c => select.includes(`${b.id}/${c.id}`)));
}
// Whether a dossier has the behavior, or the claim, a reading names.
export function readingExists(a: Analysis, reading: string): boolean {
  const [behavior, claim] = reading.split('/');
  const b = (a.behaviors?.behaviors || []).find(x => x.id === behavior);
  return Boolean(b && (!claim || b.claims.some(c => c.id === claim)));
}

export function counted(reach: Reach, byRef: Map<string, Analysis>, notes: number): MapCounts {
  const counts = zero();
  counts.dossiers = reach.dossiers.size;
  counts.claims = reach.claims.size;
  for (const c of reach.claims.values()) {
    counts.standing[c.standing] += 1;
    if (c.freshness !== 'current') counts.stale += 1;
    if (NEEDS_A_PERSON.includes(c.standing)) counts.needs.claims += 1;
  }
  for (const ref of reach.dossiers) {
    const a = byRef.get(ref);
    if (!a) continue;
    counts.needs.reviews += (a.behaviors?.reviews.reviews || []).filter(r => r.status === 'stale').length;
    counts.needs.doubts += a.summary.doubtsOpen || 0;
    if (a.kind === 'composition') counts.needs.decisions += a.cells.filter(c => c.mark === 'violated' && !c.accepted).length;
    if (a.flags.some(f => f.name === 'review owed')) counts.needs.reviewsOwed += 1;
    if (a.tripwires.length) counts.needs.tripwires += 1;
  }
  counts.needs.notes = notes;
  return counts;
}

export function placeMap({ readme, analyses, retired, knowledge }: PlaceInput): MapView {
  const { title, lead } = readme;
  if (!readme.map) return { title, lead, tree: null, unplaced: null, notes: [] };
  const map: DossierMap = readme.map;
  const byRef = new Map(analyses.map(a => [a.ref, a]));
  const retiredRefs = new Set(retired);
  const compositions = analyses.filter((a): a is CompositionAnalysis => a.kind === 'composition');
  const notes: MapNote[] = [];
  const note = (name: MapNoteName, where: string, node: string | null) => notes.push({ name, where, node });
  const checkRecords = knowledge.kind === 'records' || 'error' in knowledge;
  const at = (node: string | null) => (node ? `in ${node}` : 'at the root');

  // The tree, with each component's live entries; who holds each dossier, through any entry; and who holds
  // it whole, through an entry without a selection. A selection is a cross-reference: it places the
  // dossier it names, but only whole holdings site a composition and make a flow.
  const holders = new Map<string, MapComponentNode[]>();
  const wholeHolders = new Map<string, MapComponentNode[]>();
  const parentOf = new Map<MapNode, MapNode | null>();
  const allNodes: MapNode[] = [];
  const authoredFeatured = new Map<MapNode, MapReading[]>();
  const recordOf = (node: MapGroup | MapComponent) => {
    if (node.record && checkRecords && !knowledge.resolve(node.record)) note('record unresolved', `${node.record} cited by ${node.id}`, node.id);
    return node.record ?? null;
  };
  const buildComponent = (c: MapComponent, parent: MapNode): MapComponentNode => {
    const node: MapComponentNode = { kind: 'component', id: c.id, title: c.title, lead: c.lead, record: recordOf(c), featured: [], dossiers: [], flows: [], flowsOff: c.flows === false, sited: [], counts: zero() };
    parentOf.set(node, parent); allNodes.push(node); authoredFeatured.set(node, c.featured || []);
    for (const e of c.dossiers) {
      const ref = refOf(e), select = selectionOf(e);
      if (retiredRefs.has(ref)) { note('dossier retired', `${ref} ${at(c.id)}`, c.id); continue; }
      const a = byRef.get(ref);
      if (!a) { note('dossier unknown', `${ref} ${at(c.id)}`, c.id); continue; }
      for (const s of select || []) if (!readingExists(a, s)) note('reading unknown', `${ref}#${s} ${at(c.id)}`, c.id);
      node.dossiers.push({ ref, select: select ? select.filter(s => readingExists(a, s)) : null });
      (holders.get(ref) || holders.set(ref, []).get(ref)!).push(node);
      if (!select) (wholeHolders.get(ref) || wholeHolders.set(ref, []).get(ref)!).push(node);
    }
    return node;
  };
  const buildGroup = (g: MapGroup, parent: MapNode): MapGroupNode => {
    const node: MapGroupNode = { kind: 'group', id: g.id, title: g.title, lead: g.lead, record: recordOf(g), featured: [], groups: [], components: [], sited: [], counts: zero() };
    parentOf.set(node, parent); allNodes.push(node); authoredFeatured.set(node, g.featured || []);
    node.groups = (g.groups || []).map(x => buildGroup(x, node));
    node.components = (g.components || []).map(x => buildComponent(x, node));
    return node;
  };
  const tree: MapRootNode = { kind: 'root', id: null, title, lead, featured: [], groups: [], components: [], sited: [], counts: zero() };
  parentOf.set(tree, null); allNodes.push(tree); authoredFeatured.set(tree, map.featured || []);
  tree.groups = (map.groups || []).map(g => buildGroup(g, tree));
  tree.components = (map.components || []).map(c => buildComponent(c, tree));

  // A composition no component holds sits at the lowest node whose subtree holds every component that
  // holds one of its members whole. With no member held whole anywhere, it is unplaced: there is no
  // fallback to the holdings a selection makes.
  const pathOf = (node: MapNode): MapNode[] => { const path: MapNode[] = []; for (let n: MapNode | null = node; n; n = parentOf.get(n) ?? null) path.unshift(n); return path; };
  const membersOf = (c: CompositionAnalysis) => c.wiring.members.map(m => `parts/${m.part}`);
  const sitedAt = new Map<string, MapNode>();
  for (const c of compositions) {
    if (holders.has(c.ref)) continue;
    const held = [...new Set(membersOf(c).flatMap(m => wholeHolders.get(m) || []))];
    if (!held.length) continue;
    const paths = held.map(pathOf);
    let site: MapNode = tree;
    for (let depth = 0; paths.every(p => p[depth] && p[depth] === paths[0][depth]); depth++) site = paths[0][depth];
    site.sited.push(c.ref);
    sitedAt.set(c.ref, site);
  }
  // Flows: each composition with a member a component holds whole, unless the component turns them off or
  // holds the composition itself.
  for (const node of allNodes) {
    if (node.kind !== 'component' || node.flowsOff) continue;
    const held = new Set(node.dossiers.map(d => d.ref)), whole = new Set(node.dossiers.filter(d => !d.select).map(d => d.ref));
    for (const c of compositions) if (!held.has(c.ref) && membersOf(c).some(m => whole.has(m))) node.flows.push(c.ref);
  }

  // What each subtree reaches: its components' dossiers, with their selections, and the compositions sited in it.
  const reaches = new Map<MapNode, Reach>();
  const reachOf = (node: MapNode): Reach => {
    const reach: Reach = { dossiers: new Set(), claims: new Map() };
    const add = (ref: string, select: string[] | null) => {
      const a = byRef.get(ref);
      if (!a) return;
      reach.dossiers.add(ref);
      for (const c of selectedClaims(a, select)) reach.claims.set(`${ref}#${c.key}`, c);
    };
    if (node.kind === 'component') for (const d of node.dossiers) add(d.ref, d.select);
    else for (const child of [...node.groups, ...node.components]) {
      const r = reachOf(child);
      for (const ref of r.dossiers) reach.dossiers.add(ref);
      for (const [key, c] of r.claims) reach.claims.set(key, c);
    }
    for (const ref of node.sited) add(ref, null);
    reaches.set(node, reach);
    return reach;
  };
  reachOf(tree);

  // Featured readings: a dossier under the node, and a behavior or claim it has. One that is not drops out.
  for (const node of allNodes) for (const r of authoredFeatured.get(node) || []) {
    const where = `${r.dossier}#${r.behavior} featured ${at(node.id)}`;
    if (retiredRefs.has(r.dossier)) { note('dossier retired', where, node.id); continue; }
    const a = byRef.get(r.dossier);
    if (!a) { note('dossier unknown', where, node.id); continue; }
    if (!reaches.get(node)!.dossiers.has(r.dossier)) { note('reading outside its node', where, node.id); continue; }
    if (!readingExists(a, r.behavior)) { note('reading unknown', where, node.id); continue; }
    node.featured.push({ dossier: r.dossier, behavior: r.behavior, lead: r.lead });
  }

  // Every live part a component holds, and every live composition held or sited, is placed.
  const unplaced = analyses.filter(a => !holders.has(a.ref) && !sitedAt.has(a.ref)).map(a => a.ref);
  for (const ref of unplaced) note('dossier unplaced', ref, null);

  // The notes in the order of the tree, the unplaced last; then each node's counts.
  const order = new Map(allNodes.map((n, i) => [n.id, i]));
  const sorted = [...notes.filter(n => n.name !== 'dossier unplaced')].sort((x, y) => (order.get(x.node) ?? 0) - (order.get(y.node) ?? 0));
  const ordered = [...sorted, ...notes.filter(n => n.name === 'dossier unplaced')];
  const below = (node: MapNode): Set<string | null> => {
    const ids = new Set<string | null>([node.id]);
    if (node.kind !== 'component') for (const child of [...node.groups, ...node.components]) for (const id of below(child)) ids.add(id);
    return ids;
  };
  for (const node of allNodes) {
    const ids = below(node);
    node.counts = counted(reaches.get(node)!, byRef, node.kind === 'root' ? ordered.length : ordered.filter(n => n.node !== null && ids.has(n.node)).length);
  }
  const unplacedReach: Reach = { dossiers: new Set(unplaced), claims: new Map() };
  for (const ref of unplaced) for (const c of selectedClaims(byRef.get(ref)!, null)) unplacedReach.claims.set(`${ref}#${c.key}`, c);
  return { title, lead, tree, unplaced: { dossiers: unplaced, counts: counted(unplacedReach, byRef, unplaced.length) }, notes: ordered };
}
