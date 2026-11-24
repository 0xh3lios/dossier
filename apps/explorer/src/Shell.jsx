// The frame around every view: the header, the change ribbon, the command palette and the help.
import { useMemo, useState } from 'react';
import {
  Autocomplete, Button, Dialog, Disclosure, DisclosurePanel, Header, Heading, Input, Keyboard,
  Menu, MenuItem, MenuSection, Modal, ModalOverlay, SearchField, ToggleButton, ToggleButtonGroup, useFilter,
} from 'react-aria-components';
import { api, familyOf, hrefFor, ICON, lensHref, READ_WORD, shortTime, STANDING_WORD, useApp, useData } from './lib.js';
import { Badge } from './bits.jsx';

// The top bar: the root's title, the three lenses with Attention's count, the palette, whether
// the page follows changes on disk, the theme and the help.
export function TopBar({ title, lens, route, total, live, theme, setTheme, onPalette, onHelp, onMap, narrow }) {
  return (
    <header className="top">
      {narrow && <Button className="btn" onPress={onMap} aria-label="Map">☰</Button>}
      <a className="brand" href={hrefFor({ view: 'node', params: lens === 'read' ? {} : { lens } })}>{title}</a>
      <ToggleButtonGroup className="seg lenses" aria-label="Lens" selectionMode="single" disallowEmptySelection selectedKeys={[lens]} onSelectionChange={k => { location.hash = lensHref(route, [...k][0]).slice(1); }}>
        <ToggleButton id="read">Read</ToggleButton>
        <ToggleButton id="attention">Attention{total != null && <span className="lens-n">{total}</span>}</ToggleButton>
        <ToggleButton id="work">Workbench</ToggleButton>
      </ToggleButtonGroup>
      <span className="top-gap" />
      <span className={`live is-${live}`} title={live === 'live' ? 'Following changes on disk' : 'Not following changes'}><span aria-hidden="true">●</span> {live}</span>
      <Button className="btn" onPress={onPalette}>Go to <Keyboard className="kbd">⌘K</Keyboard></Button>
      <ToggleButtonGroup className="seg theme" aria-label="Theme" selectionMode="single" disallowEmptySelection selectedKeys={[theme]} onSelectionChange={k => setTheme([...k][0])}>
        <ToggleButton id="auto">Auto</ToggleButton>
        <ToggleButton id="light">Light</ToggleButton>
        <ToggleButton id="dark">Dark</ToggleButton>
      </ToggleButtonGroup>
      <Button className="btn" aria-label="Help" onPress={onHelp}>?</Button>
    </header>
  );
}

// What moved since the last look: mark changes per dossier, and the files that changed on disk.
export function Ribbon({ changes, files, since, onDismiss }) {
  if (!changes.length && !files.length) return null;
  const byDossier = {};
  for (const c of changes) (byDossier[c.dossier] ||= []).push(c);
  return (
    <Disclosure className="ribbon">
      <div className="ribbon-row">
        <Button slot="trigger" className="ribbon-toggle">
          <span aria-hidden="true">▸</span> {changes.length} mark change{changes.length === 1 ? '' : 's'}{files.length ? ` · ${files.length} file${files.length === 1 ? '' : 's'}` : ''} <span className="muted">{since}</span>
        </Button>
        <span className="ribbon-inline">
          {changes.slice(0, 6).map((c, i) => <a key={i} className="chg" href={c.kind === 'composition' ? `#/composition/${c.dossier}?view=model&tab=cells&cell=${c.key.replace('/', ':')}` : `#/part/${c.dossier}?view=model&sel=${c.key}`}><span className="mono">{c.dossier} {c.key}</span> {c.before} → <Badge word={c.after} small /></a>)}
          {changes.length > 6 && <span className="muted">+{changes.length - 6}</span>}
        </span>
        <Button className="btn is-tiny" onPress={onDismiss}>Dismiss</Button>
      </div>
      <DisclosurePanel className="ribbon-panel">
        <table className="dt">
          <tbody>
            {Object.entries(byDossier).map(([d, list]) => list.map((c, i) => (
              <tr key={`${d}${i}`}><td className="mono">{i === 0 ? d : ''}</td><td className="mono">{c.key}</td><td>{c.before}</td><td>→ <Badge word={c.after} small /></td></tr>
            )))}
            {files.map(f => <tr key={f}><td colSpan={4} className="mono muted">{f}</td></tr>)}
          </tbody>
        </table>
      </DisclosurePanel>
    </Disclosure>
  );
}

// Every address in the root: type `vault M3`, `A1`, a cell or a trial, and go there. Each group shows
// its first matches, so a root of thousands of addresses stays quick to type into.
const CAP = 40;
export function Palette({ isOpen, onOpenChange }) {
  const { version } = useApp();
  const { data } = useData(isOpen ? api.addresses : null, version);
  const [text, setText] = useState('');
  const { contains } = useFilter({ sensitivity: 'base' });
  const groups = useMemo(() => {
    const words = text.trim().split(/\s+/).filter(Boolean), g = new Map();
    for (const x of data || []) {
      if (words.length && !words.every(w => contains(`${x.label} ${x.sub}`, w))) continue;
      if (!g.has(x.group)) g.set(x.group, { items: [], total: 0 });
      const e = g.get(x.group);
      e.total++;
      if (e.items.length < CAP) e.items.push(x);
    }
    return [...g.entries()];
  }, [data, text, contains]);
  return (
    <ModalOverlay className="overlay" isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
      <Modal className="modal is-palette">
        <Dialog className="dialog" aria-label="Go to">
          <Autocomplete inputValue={text} onInputChange={setText}>
            <SearchField className="search" aria-label="Go to" autoFocus>
              <Input placeholder="vault M3 · control N1 · trial · walk" />
            </SearchField>
            <Menu className="menu" aria-label="Addresses" renderEmptyState={() => <div className="pad muted">{data ? 'No match' : 'Loading the addresses…'}</div>}
              onAction={key => { onOpenChange(false); location.hash = String(key).slice(1); }}>
              {groups.map(([name, { items, total }]) => (
                <MenuSection key={name} id={name}>
                  <Header className="menu-h">{name} <span className="muted">{total > items.length ? `${items.length} of ${total}` : total}</span></Header>
                  {items.map(x => (
                    <MenuItem key={x.href} id={x.href} textValue={`${x.label} ${x.sub}`} className="mi">
                      <span className="mi-label">{x.label}</span><span className="mi-sub">{x.sub}</span>
                    </MenuItem>
                  ))}
                </MenuSection>
              ))}
            </Menu>
          </Autocomplete>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

const KEYS = [
  ['⌘K / Ctrl K', 'Go to any address'], ['?', 'This help'], ['r  a  w', 'Read, Attention, Workbench'], ['h', 'The root, in the same lens'],
  ['j  k', 'Next, previous row: a claim, a node, a dossier'], ['Escape', 'Close why a claim holds, clear a selection, close a dialog'],
  ['b  m', 'In the Workbench: a dossier\'s claims, its chart or system'], ['1 2 3', 'Statechart, grid, walks'], ['[  ]', 'Step back, step forward in the player'],
  ['Tab', 'Move between panels and controls'], ['Arrow keys', 'Move between boxes on a graph, items in a list'],
];
// The words the Read and Attention lenses use, each with the term the specification and the tools use.
const WORDS = [
  ['supported', '`supported`: supported within the stated scope, by a current mapping a current independent review assessed'],
  ['evidence unreviewed', '`evidence-available`: a current answer supports it, and no independent review has assessed the mapping'],
  ['hypothesis', '`hypothesis`: no adequate support yet'],
  ['contested', '`contested`: reviews of one mapping disagree, or its answers conflict'],
  ['contradicted', '`contradicted`: a current review found it contradicted, or upheld a challenge'],
  ['accepted, accepted violations', '`contradicted`, where every mapping against it rests on a cell whose violation the owner accepted: the cell reads `violated, accepted`'],
  ['stale, missing, invalid', 'Claim freshness: an answer or a record it rests on moved, does not resolve, or does not read'],
  ['Relies on', 'A part\'s Guarantee passages (K) with their backing, `backed`, `assumed` or `unresolved`, and its Givens (G)'],
  ['Guarantees', 'Claims of kind `requirement`, each with its assumptions. Behaviors list the `descriptive` claims'],
  ['Flows', 'The compositions a component\'s whole dossiers take part in, and those that sit there'],
  ['decisions owed', 'A cell `violated` without an acceptance that holds: `dossier decide <composition> risk <property> <scenario>`'],
  ['open doubts', 'A doubt the owner has not answered, flag `doubt open`: `dossier decide <part> answer D<n> a|b`'],
  ['evidence awaiting review', 'Claims that are `evidence-available`'],
  ['stale reviews', 'A review whose status is `stale`: a file it bound changed'],
  ['reviews owed', 'The flag `review owed`: no current review of the whole dossier'],
  ['tripwires', 'Findings that make verify print FAIL until they are fixed'],
  ['Not placed', 'The map note `dossier unplaced`; on a root without a map, every live dossier'],
  ['Names no dossier, still lists a retired dossier', 'The map notes `dossier unknown`, `dossier retired`'],
  ['Names a behavior or claim its dossier lacks', 'The map note `reading unknown`'],
  ['Features a dossier outside its node, cites a record that does not resolve', 'The map notes `reading outside its node`, `record unresolved`'],
];
const Code = ({ text }) => String(text).split(/(`[^`]+`)/).map((p, i) => (p.startsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : p));

// The marks as the plugin's reference page defines them, served with the root.
export function Help({ isOpen, onOpenChange }) {
  const { root } = useApp();
  const legend = { marks: [], cells: [], standing: [], freshness: [], evidence: [], ...root?.legend };
  // A standing's badge takes its family from the word the report uses for it.
  const standingWord = name => (name.startsWith('evidence') ? 'evidence-available' : name.split(' ')[0]);
  return (
    <ModalOverlay className="overlay" isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
      <Modal className="modal is-help">
        <Dialog className="dialog help">
          <div className="help-head"><Heading slot="title">Dossier Explorer</Heading><Button slot="close" className="btn">Close</Button></div>
          <div className="help-cols">
            <section>
              <h3>The map and the lenses</h3>
              <p>The spine is the map the root's README begins with: groups to any depth, and components as the leaves, each holding parts and compositions, whole or some of their behaviors and claims. A dot stands for how the claims beneath a node stand, the one most at stake: its words are in its title. A dossier no component holds is listed under <b>Not placed</b>. The counts are verify's, over distinct claims, a claim reached twice counted once.</p>
              <p><b>Read</b> explains. The root and a group list what they hold, each with its lead and counts, their featured readings and the Attention line. A component merges the dossiers it holds: <b>Behaviors</b>, headed by dossier where more than one speaks; <b>Guarantees</b>, each with its assumptions; <b>Relies on</b>; and <b>Flows</b>. A claim opens <b>Why this holds</b> beside the page: 1 what it is about and the source it pins, 2 what each run behind it showed, 3 the independent review, 4 the owner's decision. Each step opens the record or the Workbench view it comes from.</p>
              <p><b>Attention</b> lists only what an owner, a reviewer or the agent must act on beneath the page: tripwires, decisions owed, contradicted and contested claims, open doubts, evidence awaiting review, stale and owed reviews, and map notes. Where a decision settles an item, its <code>dossier decide</code> line is prepared, with the owner's words left blank. A violation the owner accepted is listed apart, last.</p>
              <p><b>Workbench</b> holds the tools. At a node, every dossier under it by the next step verify routes it to, from Fix to Report, with its flags and tripwires. For a dossier, <b>Claims</b>: each claim's scope, mappings, marks, runs, reviews, the owner's decisions, limits and raw record, then its reviews and what no behavior maps to. And <b>Chart</b> for a part, the machine compiled from its prose: the prose beside the statechart, synced both ways, the grid of states by events, the walks as lanes, the players, the simulator and the path finder, with its runs, backing and decisions. Or <b>System</b> for a composition: its members, wiring, actors and stubs, and each property under each scenario, from weaker to stronger.</p>
              <p><b>Runs</b> are the answers under <code>evidence/</code>: the trial that produced each, its question, outcomes, reach, the agent's reading and its trace. A graph over 25 boxes is refused rather than drawn.</p>
              <p><b>Reviews.</b> A review of one behavior assesses that behavior's mappings and does not clear the review the dossier owes. A review turns stale when a file it bound changes. The exception is its subject's behavior file, which it binds claim by claim: a changed claim takes only its own assessments out of effect.</p>
              <h3>Players</h3>
              <p><b>Walk</b> and <b>doubt</b> replay over the graph the chart explored. <b>Trace</b> plays a trial's counterexample or witness, step by step, with the actor who moved. <b>Simulate</b> fires any event from any explored state and shows each condition evaluated. <b>Find a path</b> searches the explored graph for a state. A chart replay adds no solver answer.</p>
              <h3>Live</h3>
              <p>The explorer reads and never writes. A change on disk refreshes the page, and the ribbon lists the marks that changed, and on first load, what changed since your last visit.</p>
              <h3>Words</h3>
              <table className="dt"><tbody>{WORDS.map(([w, m]) => <tr key={w}><td>{w}</td><td><Code text={m} /></td></tr>)}</tbody></table>
            </section>
            <section>
              <h3>Keyboard</h3>
              <table className="dt"><tbody>{KEYS.map(([k, v]) => <tr key={k}><td><Keyboard className="kbd">{k}</Keyboard></td><td>{v}</td></tr>)}</tbody></table>
              <h3>Marks</h3>
              <table className="dt"><tbody>{legend.marks.map((r, i) => <tr key={i}><td><Badge word={r.mark} small /></td><td className="mono">{r.for}</td><td>{r.means}</td></tr>)}</tbody></table>
              <h3>Cells</h3>
              <table className="dt"><tbody>{legend.cells.map(r => <tr key={r.mark}><td><Badge word={r.mark} small /></td><td>{r.means}</td></tr>)}</tbody></table>
              <h3>Claims</h3>
              <table className="dt"><tbody>
                {legend.standing.map(r => <tr key={r.name}><td><Badge word={standingWord(r.name)} label={STANDING_WORD[standingWord(r.name)] || r.name} small /></td><td className="mono small">{r.name}</td><td>{r.means}</td></tr>)}
                {legend.freshness.map(r => <tr key={r.name}><td><Badge word={r.name} small /></td><td className="mono small">{r.name}</td><td>{r.means}</td></tr>)}
              </tbody></table>
              <h3>Evidence</h3>
              <table className="dt"><tbody>{legend.evidence.map(r => <tr key={r.name}><td className="mono">{r.name.replaceAll('-', ' ')}</td><td>{r.means}</td></tr>)}</tbody></table>
              <h3>Families</h3>
              <p className="legend">{['good', 'warning', 'serious', 'critical', 'neutral'].map(f => <span key={f} className="badge is-small" data-family={f}><span className="badge-icon" aria-hidden="true">{ICON[f]}</span>{f}</span>)}</p>
              <h3>Owner</h3>
              <p><span className="owner is-settled">✓</span> settled · <span className="owner is-unsettled">○</span> unsettled · <span className="owner is-rejected">✕</span> rejected</p>
            </section>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export function LiveRegion({ message }) {
  return <div className="sr-only" aria-live="polite" aria-atomic="true">{message}</div>;
}

export const sinceText = iso => (iso ? `since ${shortTime(iso)}` : '');
export { familyOf, READ_WORD };
