// The map: the authored hierarchy of a dossiers root, the fenced json block the root's README.md begins
// with. Groups nest to any depth and components are the leaves; a component names the dossiers it holds.
// Storage stays flat: the map is a view over parts/ and compositions/, and no review, integrity record or
// answer binds it. This module reads the block, keeps its one canonical spelling, and rewrites the block
// alone; src/verify/map.ts places the dossiers and counts their claims.
import { lstatSync } from 'node:fs';
import { join } from 'node:path';
import { MAP_FORMAT } from '../behaviors/formats.ts';
import { BEHAVIOR_ID, DOSSIER_REF, leadingBlock, parseUniqueJson, readRecordFile } from '../behaviors/records.ts';
import { parseRef } from '../knowledge.ts';
import { durableWrite } from './publication.ts';

// A featured reading: a dossier under the node, one of its behaviors or one claim, and a line saying why.
export interface MapReading { dossier: string; behavior: string; lead: string }
// What a component holds of one dossier: the whole dossier, by its ref, or the behaviors and claims selected.
export type MapEntry = string | { ref: string; select: string[] };
export interface MapComponent { id: string; title: string; lead: string; record?: string; featured?: MapReading[]; flows?: boolean; dossiers: MapEntry[] }
export interface MapGroup { id: string; title: string; lead: string; record?: string; featured?: MapReading[]; groups?: MapGroup[]; components?: MapComponent[] }
// The root holds what a group holds. Its title and its explanation are the README's heading and paragraphs.
export interface DossierMap { format: typeof MAP_FORMAT; featured?: MapReading[]; groups?: MapGroup[]; components?: MapComponent[] }

// The root's README as verify reads it: the map, or why its block does not read, and the root's title and
// lead. A README without a block, or no README at all, reads as an empty map.
export interface RootMap {
  map: DossierMap | null;
  error: string | null;
  block: boolean;
  title: string | null;
  lead: string | null;
}

export const README = 'README.md';
export const emptyMap = (): DossierMap => ({ format: MAP_FORMAT, groups: [] });
// A behavior, or one claim of it: what a selection or a featured reading names.
export const READING = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\/C[1-9]\d*)?$/;
const FENCE = /^```json\r?\n/;
// A json fence meant as the map that is not its opening fence at byte zero: after a byte order mark or blank
// lines, or with more than `json` on its line. Reading it as no map would drop the hierarchy without a word.
const NEAR_FENCE = /^﻿?(?:[ \t]*\r?\n)*[ \t]*```[ \t]*json\b/i;
function nearFenceProblem(text: string): string {
  if (text.startsWith('﻿')) return "it begins with a byte order mark, and the map's ```json fence must be at byte zero";
  if (!text.startsWith('```')) return "blank space comes before the map's ```json fence, which must be at byte zero";
  return "the map's opening fence must be ```json alone on its line";
}

function fail(message: string): never { throw new Error(message); }
const isObject = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);
// The fields of one object: every required one present, and none outside the required and the optional.
function shape(x: unknown, required: string[], optional: string[], at: string): Record<string, unknown> {
  if (!isObject(x)) fail(`${at} must be an object`);
  for (const key of Object.keys(x)) if (!required.includes(key) && !optional.includes(key)) fail(`${at} has an unknown field ${JSON.stringify(key)}`);
  for (const key of required) if (!Object.hasOwn(x, key)) fail(`${at} lacks the field ${JSON.stringify(key)}`);
  return x;
}
// A title or a lead: one line of words.
function line(x: unknown, at: string): string {
  if (typeof x !== 'string' || !x.trim()) fail(`${at} must be a nonempty string`);
  if (/[\r\n]/.test(x)) fail(`${at} must be one line`);
  return x;
}
function pattern(x: unknown, re: RegExp, what: string, at: string): string {
  if (typeof x !== 'string' || !re.test(x)) fail(`${at} must be ${what}`);
  return x;
}
function list(x: unknown, at: string): unknown[] { if (!Array.isArray(x)) fail(`${at} must be an array`); return x; }

// The block's JSON, checked against the format: the fields of each node, ids that follow the dossier id's
// pattern and are unique across the map, refs, selections and readings of the right shape, each once.
export function parseMap(value: unknown): DossierMap {
  const ids = new Set<string>();
  const id = (x: unknown, at: string): string => {
    const v = pattern(x, BEHAVIOR_ID, 'an id: lowercase letters and digits joined by single hyphens, starting with a letter', at);
    if (ids.has(v)) fail(`${at}: the node id ${v} is used twice; a node's id is its address`);
    ids.add(v);
    return v;
  };
  const record = (x: unknown, at: string): string => {
    if (typeof x !== 'string' || x !== x.trim() || !parseRef(x)) fail(`${at} must be a typed knowledge reference, <module>#<type>:<id>`);
    return x;
  };
  const featured = (x: unknown, at: string): MapReading[] => {
    const seen = new Set<string>();
    return list(x, at).map((r, i) => {
      const where = `${at}[${i}]`;
      const o = shape(r, ['dossier', 'behavior', 'lead'], [], where);
      const reading = { dossier: pattern(o.dossier, DOSSIER_REF, 'parts/<id> or compositions/<id>', `${where}.dossier`), behavior: pattern(o.behavior, READING, '<behavior> or <behavior>/C<n>', `${where}.behavior`), lead: line(o.lead, `${where}.lead`) };
      const key = `${reading.dossier}#${reading.behavior}`;
      if (seen.has(key)) fail(`${where}: ${key} is featured twice`);
      seen.add(key);
      return reading;
    });
  };
  const entry = (x: unknown, at: string): MapEntry => {
    if (typeof x === 'string') return pattern(x, DOSSIER_REF, 'parts/<id> or compositions/<id>', at);
    const o = shape(x, ['ref', 'select'], [], at);
    const select = list(o.select, `${at}.select`).map((s, i) => pattern(s, READING, '<behavior> or <behavior>/C<n>', `${at}.select[${i}]`));
    if (!select.length) fail(`${at}.select must name at least one behavior or claim; a whole dossier is its ref alone`);
    if (new Set(select).size !== select.length) fail(`${at}.select names one behavior or claim twice`);
    return { ref: pattern(o.ref, DOSSIER_REF, 'parts/<id> or compositions/<id>', `${at}.ref`), select };
  };
  const component = (x: unknown, at: string): MapComponent => {
    const o = shape(x, ['id', 'title', 'lead', 'dossiers'], ['record', 'featured', 'flows'], at);
    const c: MapComponent = { id: id(o.id, `${at}.id`), title: line(o.title, `${at}.title`), lead: line(o.lead, `${at}.lead`), dossiers: [] };
    if (o.record !== undefined) c.record = record(o.record, `${at}.record`);
    if (o.featured !== undefined) c.featured = featured(o.featured, `${at}.featured`);
    if (o.flows !== undefined) { if (typeof o.flows !== 'boolean') fail(`${at}.flows must be true or false`); c.flows = o.flows; }
    c.dossiers = list(o.dossiers, `${at}.dossiers`).map((e, i) => entry(e, `${at}.dossiers[${i}]`));
    const refs = c.dossiers.map(refOf);
    const twice = refs.find((r, i) => refs.indexOf(r) !== i);
    if (twice) fail(`${at}.dossiers lists ${twice} twice`);
    return c;
  };
  const children = (o: Record<string, unknown>, node: { groups?: MapGroup[]; components?: MapComponent[] }, at: string) => {
    if (o.groups !== undefined) node.groups = list(o.groups, `${at}.groups`).map((g, i) => group(g, `${at}.groups[${i}]`));
    if (o.components !== undefined) node.components = list(o.components, `${at}.components`).map((c, i) => component(c, `${at}.components[${i}]`));
  };
  const group = (x: unknown, at: string): MapGroup => {
    const o = shape(x, ['id', 'title', 'lead'], ['record', 'featured', 'groups', 'components'], at);
    const g: MapGroup = { id: id(o.id, `${at}.id`), title: line(o.title, `${at}.title`), lead: line(o.lead, `${at}.lead`) };
    if (o.record !== undefined) g.record = record(o.record, `${at}.record`);
    if (o.featured !== undefined) g.featured = featured(o.featured, `${at}.featured`);
    children(o, g, at);
    return g;
  };
  const o = shape(value, ['format'], ['featured', 'groups', 'components'], 'map');
  if (o.format !== MAP_FORMAT) fail(`map.format must be ${MAP_FORMAT}`);
  const map: DossierMap = { format: MAP_FORMAT };
  if (o.featured !== undefined) map.featured = featured(o.featured, 'map.featured');
  children(o, map, 'map');
  return map;
}

export const refOf = (e: MapEntry): string => (typeof e === 'string' ? e : e.ref);
export const selectionOf = (e: MapEntry): string[] | null => (typeof e === 'string' ? null : e.select);

// The one spelling of a map: two spaces of indentation, one item a line, and the keys in a fixed order. An
// optional field that is absent stays absent, and one that is present stays, even empty.
function ordered(map: DossierMap): unknown {
  const reading = (r: MapReading) => ({ dossier: r.dossier, behavior: r.behavior, lead: r.lead });
  const entry = (e: MapEntry) => (typeof e === 'string' ? e : { ref: e.ref, select: [...e.select] });
  const component = (c: MapComponent) => ({
    id: c.id, title: c.title, lead: c.lead,
    ...(c.record !== undefined && { record: c.record }), ...(c.featured !== undefined && { featured: c.featured.map(reading) }),
    ...(c.flows !== undefined && { flows: c.flows }), dossiers: c.dossiers.map(entry),
  });
  const group = (g: MapGroup): unknown => ({
    id: g.id, title: g.title, lead: g.lead,
    ...(g.record !== undefined && { record: g.record }), ...(g.featured !== undefined && { featured: g.featured.map(reading) }),
    ...(g.groups !== undefined && { groups: g.groups.map(group) }), ...(g.components !== undefined && { components: g.components.map(component) }),
  });
  return {
    format: map.format,
    ...(map.featured !== undefined && { featured: map.featured.map(reading) }),
    ...(map.groups !== undefined && { groups: map.groups.map(group) }), ...(map.components !== undefined && { components: map.components.map(component) }),
  };
}
export const canonicalMap = (map: DossierMap): string => JSON.stringify(ordered(map), null, 2);

// The README's title, its first level-one heading, and its lead: the first paragraph after the title, or
// the first item when that is a list, as the author wrote it. Fences, other headings and tables are not lead.
export function titleAndLead(body: string): { title: string | null; lead: string | null } {
  const lines = body.split(/\r?\n/);
  let i = 0, fence = false, title: string | null = null;
  for (; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { fence = !fence; continue; }
    if (fence) continue;
    const heading = /^#\s+(.+?)\s*#*\s*$/.exec(lines[i]);
    if (heading) { title = heading[1]; i++; break; }
  }
  if (title === null) i = 0;
  fence = false;
  for (; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { fence = !fence; continue; }
    if (fence || !lines[i].trim() || /^#{1,6}\s/.test(lines[i]) || /^\s*\|/.test(lines[i])) continue;
    break;
  }
  const item = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/.exec(lines[i] || '');
  if (item) return { title, lead: item[1].trim() || null };
  const paragraph: string[] = [];
  for (; i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*(```|~~~|\|))/.test(lines[i]); i++) paragraph.push(lines[i].trim());
  return { title, lead: paragraph.join(' ') || null };
}

// The root's README.md, read as the map. A README that is a link, or that is not UTF-8, does not read. The
// root folder itself may be a link, as a dossiers root may be: only the README is checked for one.
export function readRootMap(root: string): RootMap {
  const path = join(root, README);
  let stat;
  try { stat = lstatSync(path); } catch { return { map: emptyMap(), error: null, block: false, title: null, lead: null }; }
  let text: string;
  try {
    if (stat.isSymbolicLink() || !stat.isFile()) fail(`${README} must be a regular file, not a symbolic link or special file`);
    text = readRecordFile(root, README, true);
  } catch (e) { return { map: null, error: (e as Error).message, block: false, title: null, lead: null }; }
  return mapFromText(text);
}

// The README's text read as the map, the same way for verify and for a rewrite about to be written.
export function mapFromText(text: string): RootMap {
  if (!FENCE.test(text)) {
    if (NEAR_FENCE.test(text)) return { map: null, error: nearFenceProblem(text), block: true, title: null, lead: null };
    return { map: emptyMap(), error: null, block: false, ...titleAndLead(text) };
  }
  try {
    const lead = leadingBlock(text);
    if (!lead) fail('the json block at byte zero has no closing fence on a line of its own');
    return { map: parseMap(parseUniqueJson(lead.json)), error: null, block: true, ...titleAndLead(lead.body) };
  } catch (e) { return { map: null, error: (e as Error).message, block: true, title: null, lead: null }; }
}

// The README with its block replaced by the map's canonical form, and the rest byte for byte as it was. A
// README without a block gets one at byte zero, followed by a blank line, in the README's own line ending:
// CRLF when its first line ends so. A rewritten block keeps CRLF when its opening fence had one.
export function withMapBlock(text: string, map: DossierMap): string {
  const json = canonicalMap(map);
  if (!FENCE.test(text)) {
    if (NEAR_FENCE.test(text)) fail(nearFenceProblem(text));
    const eol = /\r?\n/.exec(text)?.[0] === '\r\n' ? '\r\n' : '\n';
    return '```json' + eol + json.replace(/\n/g, eol) + eol + '```' + eol + eol + text;
  }
  const lead = leadingBlock(text);
  if (!lead) fail('the json block at byte zero has no closing fence on a line of its own');
  const eol = lead.block.startsWith('```json\r\n') ? '\r\n' : '\n';
  const after = /```(\r?\n)?$/.exec(lead.block)![1] ?? '';
  return '```json' + eol + json.replace(/\n/g, eol) + eol + '```' + after + lead.body;
}

// Rewrite the root README's block, under the caller's root lock, by atomic replacement. Returns whether
// anything changed. A map equal to the one the block holds writes nothing, however the block is spelled, so
// a command that changes nothing leaves a hand-written block as it was. What is written must read back as
// this map, or the root would fail where it passed.
export function writeMapBlock(root: string, map: DossierMap): boolean {
  parseMap(parseUniqueJson(canonicalMap(map)));
  if (lstatSync(join(root, README)).isSymbolicLink()) fail(`${README} must be a regular file, not a symbolic link`);
  const text = readRecordFile(root, README, true);
  const current = mapFromText(text);
  if (current.block && current.map && canonicalMap(current.map) === canonicalMap(map)) return false;
  const next = withMapBlock(text, map);
  if (next === text) return false;
  const back = mapFromText(next);
  if (back.error || !back.map || canonicalMap(back.map) !== canonicalMap(map)) fail(`${README} would not read as the map after this change (${back.error ?? 'it reads as another map'}); fix ${README} first`);
  durableWrite(join(root, README), next, {}, 'map');
  return true;
}
