// The board: every dossier, grouped by the next step verify routes it to.
import { useMemo, useState } from 'react';
import { Cell, Column, Input, Link, Row, SearchField, Switch, Table, TableBody, TableHeader, ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { PASSES, titleBeyondId, useApp } from './lib.js';
import { Badge } from './bits.jsx';

const ORDER = ['proved', 'checked', 'implied', 'drawn', 'pending', 'untried', 'held', 'hollow', 'lapsed', 'miscalled', 'violated', 'violated, acceptance lapsed', 'violated, accepted', 'open', 'owed', 'unresolved', 'assumed'];
const countMarks = marks => { const c = {}; for (const m of Object.values(marks || {})) c[m] = (c[m] || 0) + 1; return c; };
// Open, as verify routes it: a next step before Report, or a tripwire.
const isOpen = d => d.route?.pass !== 'Report' || (d.tripwires?.length || 0) > 0;

export function Board() {
  const { root, changes } = useApp();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [openOnly, setOpenOnly] = useState(false);
  const changed = useMemo(() => new Set(changes.map(c => c.dossier)), [changes]);
  const rows = useMemo(() => (root?.dossiers || []).filter(d =>
    (kind === 'all' || d.kind === kind) && (!openOnly || isOpen(d)) &&
    (!q || `${d.id} ${d.title} ${(d.route?.why || []).join(' ')}`.toLowerCase().includes(q.toLowerCase()))), [root, q, kind, openOnly]);
  // Every step shows, in work order, even when no dossier is waiting on it.
  const groups = PASSES.map(p => [p, rows.filter(d => d.route?.pass === p)]);
  const other = rows.filter(d => !PASSES.includes(d.route?.pass));
  if (other.length) groups.push(['Other', other]);
  const r = root?.route;
  return (
    <div className="board">
      <div className="toolbar">
        <SearchField className="search is-inline" aria-label="Filter dossiers" value={q} onChange={setQ}><Input placeholder="Filter" /></SearchField>
        <ToggleButtonGroup className="seg" aria-label="Kind" selectionMode="single" disallowEmptySelection selectedKeys={[kind]} onSelectionChange={k => setKind([...k][0])}>
          <ToggleButton id="all">All</ToggleButton><ToggleButton id="part">Parts</ToggleButton><ToggleButton id="composition">Compositions</ToggleButton>
        </ToggleButtonGroup>
        <Switch className="switch" isSelected={openOnly} onChange={setOpenOnly}><span className="switch-track" aria-hidden="true" />Open items</Switch>
        <span className="top-gap" />
        {r && <span className="muted">root next: <b className="t-ink">{r.pass}</b> {r.why?.length ? `· ${r.why.length} reason${r.why.length === 1 ? '' : 's'}` : ''}</span>}
        {root?.tripwires?.length ? <Badge word="violated" label={`${root.tripwires.length} root tripwire${root.tripwires.length === 1 ? '' : 's'}`} /> : null}
      </div>
      <div className="board-body">
        {groups.map(([pass, list]) => !list.length ? (
          <section key={pass} className="grp is-empty">
            <h2 className="grp-h">{pass} <span className="muted">0</span></h2>
          </section>
        ) : (
          <section key={pass} className="grp">
            <h2 className="grp-h">{pass} <span className="muted">{list.length}</span></h2>
            <Table aria-label={`${pass}: ${list.length} dossiers`} className="table" onRowAction={key => { location.hash = String(key); }}>
              <TableHeader>
                <Column isRowHeader className="col-name">Dossier</Column>
                <Column className="col-kind">Kind</Column>
                <Column className="col-why">Why</Column>
                <Column className="col-stand">Standing</Column>
                <Column className="col-flags">Flags</Column>
              </TableHeader>
              <TableBody items={list}>
                {d => {
                  const counts = countMarks(d.marks);
                  const href = d.kind === 'composition' ? `#/composition/${d.id}` : `#/part/${d.id}`;
                  return (
                    <Row id={href.slice(1)}>
                      <Cell>
                        {changed.has(d.id) && <span className="dot-changed" title="changed"><span className="sr-only">changed</span></span>}
                        <Link href={href} className="t-strong">{d.id}</Link>{titleBeyondId(d.title, d.id) ? <> <span className="muted">{d.title}</span></> : null}
                      </Cell>
                      <Cell>{d.kind === 'composition' ? `composition · ${d.members?.length} members` : d.tier}</Cell>
                      <Cell><span className="why">{d.route?.why?.[0] || ''}</span>{d.route?.why?.length > 1 && <span className="muted"> +{d.route.why.length - 1}</span>}</Cell>
                      <Cell>
                        {d.kind === 'part' && d.summary && <span className="muted">{d.summary.settled}/{d.summary.passages} settled </span>}
                        {ORDER.filter(m => counts[m]).map(m => <Badge key={m} word={m} label={`${counts[m]} ${m}`} small />)}
                      </Cell>
                      <Cell>
                        {(d.tripwires || []).map((t, i) => <Badge key={`t${i}`} word="violated" label={t.name} small />)}
                        {(d.flags || []).map((f, i) => <span key={i} className="chip" title={f.where}>{f.name}</span>)}
                      </Cell>
                    </Row>
                  );
                }}
              </TableBody>
            </Table>
          </section>
        ))}

      </div>
    </div>
  );
}
