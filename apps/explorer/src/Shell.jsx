// The frame around every view: the header, the change ribbon, the command palette and the help.
import { useMemo, useState } from 'react';
import {
  Autocomplete, Breadcrumb, Breadcrumbs, Button, Dialog, Disclosure, DisclosurePanel, Header, Heading, Input, Keyboard,
  Link, Menu, MenuItem, MenuSection, Modal, ModalOverlay, SearchField, ToggleButton, ToggleButtonGroup, useFilter,
} from 'react-aria-components';
import { api, familyOf, ICON, shortTime, useApp, useData } from './lib.js';
import { Badge } from './bits.jsx';

export function Header_({ crumbs, live, theme, setTheme, onPalette, onHelp }) {
  return (
    <header className="top">
      <strong className="brand">Dossier Explorer</strong>
      <Breadcrumbs className="crumbs">
        {crumbs.map((c, i) => <Breadcrumb key={i}>{c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}</Breadcrumb>)}
      </Breadcrumbs>
      <span className="top-gap" />
      <span className={`live is-${live}`} title={live === 'live' ? 'Following changes on disk' : 'Not following changes'}><span aria-hidden="true">●</span> {live}</span>
      <Button className="btn" onPress={onPalette}>Go to <Keyboard className="kbd">⌘K</Keyboard></Button>
      <ToggleButtonGroup className="seg" aria-label="Theme" selectionMode="single" disallowEmptySelection selectedKeys={[theme]} onSelectionChange={k => setTheme([...k][0])}>
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
          {changes.slice(0, 6).map((c, i) => <a key={i} className="chg" href={c.kind === 'composition' ? `#/composition/${c.dossier}?cell=${c.key.replace('/', ':')}` : `#/part/${c.dossier}?sel=${c.key}`}><span className="mono">{c.dossier} {c.key}</span> {c.before} → <Badge word={c.after} small /></a>)}
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

// Every address in the root: type `vault M3`, `A1`, a cell or a trial, and go there.
export function Palette({ isOpen, onOpenChange }) {
  const { version } = useApp();
  const { data } = useData(isOpen ? api.addresses : null, version);
  const { contains } = useFilter({ sensitivity: 'base' });
  const groups = useMemo(() => {
    const g = new Map();
    for (const x of data || []) { if (!g.has(x.group)) g.set(x.group, []); g.get(x.group).push(x); }
    return [...g.entries()];
  }, [data]);
  return (
    <ModalOverlay className="overlay" isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
      <Modal className="modal is-palette">
        <Dialog className="dialog" aria-label="Go to">
          <Autocomplete filter={(text, input) => input.trim().split(/\s+/).every(w => contains(text, w))}>
            <SearchField className="search" aria-label="Go to" autoFocus>
              <Input placeholder="vault M3 · control N1 · trial · walk" />
            </SearchField>
            <Menu className="menu" aria-label="Addresses" renderEmptyState={() => <div className="pad muted">No match</div>}
              onAction={key => { onOpenChange(false); location.hash = String(key).slice(1); }}>
              {groups.map(([name, items]) => (
                <MenuSection key={name} id={name}>
                  <Header className="menu-h">{name}</Header>
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
  ['⌘K / Ctrl K', 'Go to any address'], ['?', 'This help'], ['1 2 3', 'Chart, grid, walks'], ['[  ]', 'Step back, step forward in the player'],
  ['Tab', 'Move between panels and controls'], ['Arrow keys', 'Move between boxes on a graph, items in a list'], ['Enter', 'Open the focused box'], ['Escape', 'Clear the selection, close a dialog'],
];

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
              <h3>Levels</h3>
              <p><b>Board.</b> Every dossier, grouped by its next step as verify routes it.</p>
              <p><b>Composition.</b> The largest graph: the members, the wiring between them, the actors that send into them, and stubs for anything outside. Properties under scenarios, with each cell's trace.</p>
              <p><b>Behaviors.</b> A dossier opens on its behaviors, each one once with its claims beneath it. Select a behavior for its explanation, or a claim for its scope, assumptions, mappings and evidence, the review's assessment and the owner's decision. With nothing selected, the side shows the dossier's orientation. A claim's row names its kind, its scope and the passages, cells or walks it maps to.</p>
              <p><b>No behavior</b> lists what in the model no behavior maps to. It is not for that reason unfinished, and the list does not establish that the source is explained in full.</p>
              <p><b>Reviews.</b> A review of one behavior assesses that behavior's mappings and does not clear the review the dossier owes. A review turns stale when a file it bound changes, and its assessments then count for nothing. The exception is its subject's behavior file, which it binds claim by claim: a changed claim takes only its own assessments out of effect, a changed explanation takes none, and either is listed under Changed since. A dossier review with anything changed since no longer clears what the dossier owes.</p>
              <p><b>Model and evidence.</b> A part shows prose beside its statechart, the grid of states by events, and walks as lanes. A composition shows its members and properties under scenarios.</p>
              <p>A graph over 25 boxes is refused rather than drawn. Nothing draws parts together that no composition composes.</p>
              <h3>Players</h3>
              <p><b>Walk</b> and <b>doubt</b> replay over the graph the chart explored. <b>Trace</b> plays a trial's counterexample or witness, step by step, with the actor who moved. <b>Play</b> on a claim's walk steps through its recorded trace, or replays the walk on the chart where no trace is recorded. A chart replay adds no solver answer, and a refused step leaves the state as it was. <b>Simulate</b> fires any event from any explored state and shows each condition evaluated. <b>Find a path</b> searches the explored graph for a state.</p>
              <h3>Decisions</h3>
              <p>The explorer reads and never writes. Where the owner is asked for a decision, it prepares the <code>dossier decide</code> line with the words left blank, for the owner to fill in and run.</p>
              <h3>Live</h3>
              <p>A change on disk refreshes the page. The ribbon lists the marks that changed, and on first load, what changed since your last visit.</p>
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
                {legend.standing.map(r => <tr key={r.name}><td><Badge word={standingWord(r.name)} label={r.name} small /></td><td>{r.means}</td></tr>)}
                {legend.freshness.map(r => <tr key={r.name}><td><Badge word={r.name} small /></td><td>{r.means}</td></tr>)}
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
export { familyOf };
