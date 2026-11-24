// Small shared pieces: status badges, claim counts, mark explanations, prepared decisions, key-value lists.
import { Component, Fragment, useState } from 'react';
import { Button, Tooltip, TooltipTrigger } from 'react-aria-components';
import { familyOf, ICON, STANDING_WORD, STANDINGS, useApp } from './lib.js';

// Claims by standing, each an icon and a number, with the word beside it or in its title.
export function Counts({ counts, words = false, stale = 0 }) {
  const shown = STANDINGS.filter(s => counts?.[s]);
  return <span className="counts">
    {shown.map(s => <Badge key={s} word={s} small label={words ? `${counts[s]} ${STANDING_WORD[s]}` : String(counts[s])} title={`${counts[s]} ${STANDING_WORD[s]}`} />)}
    {stale > 0 && <Badge word="stale" small label={`${stale} stale`} title={`${stale} not current`} />}
  </span>;
}
// A dossier's tripwires and flags, each name once with how many times it is raised; where each is
// raised is in its title.
export function Flags({ tripwires = [], flags = [] }) {
  const group = list => {
    const by = new Map();
    for (const f of list) { if (!by.has(f.name)) by.set(f.name, { name: f.name, means: f.means, where: [] }); if (f.where) by.get(f.name).where.push(f.where); }
    return [...by.values()];
  };
  const times = f => (f.where.length > 1 ? ` ×${f.where.length}` : '');
  return <>
    {group(tripwires).map(t => <Badge key={`t:${t.name}`} word="violated" label={`${t.name}${times(t)}`} small title={t.where.join('\n')} />)}
    {group(flags).map(f => <span key={`f:${f.name}`} className="chip" title={[f.means, ...f.where].filter(Boolean).join('\n')}>{f.name}{times(f)}</span>)}
  </>;
}
// The same, as a section of a detail pane: the names first, where each is raised folded beneath.
export function FlagsSection({ tripwires = [], flags = [] }) {
  if (!tripwires.length && !flags.length) return null;
  const all = [...tripwires.map(t => ({ ...t, trip: true })), ...flags];
  return <Sec title="Flags" aside={all.length}>
    <div><Flags tripwires={tripwires} flags={flags} /></div>
    {all.some(f => f.where) && <details className="limits"><summary>Where</summary><ul className="list">{all.map((f, i) => <li key={i}><b>{f.name}</b> <span className="wrap">{f.where}</span></li>)}</ul></details>}
  </Sec>;
}
// A claim list's counts by standing, as Counts reads them.
export const countClaims = claims => Object.fromEntries(STANDINGS.map(s => [s, claims.filter(c => c.standing === s).length]));

export function Badge({ word, label, small, title }) {
  const family = familyOf(word);
  return (
    <span className={`badge${small ? ' is-small' : ''}`} data-family={family} title={title}>
      <span className="badge-icon" aria-hidden="true">{ICON[family]}</span>{label ?? word}
    </span>
  );
}

export function MarkExplain({ m }) {
  const e = m.explain || {};
  return (
    <KV rows={[
      ['means', e.means],
      e.raise && ['stronger', e.raise],
      e.lapse && ['lapses on', e.lapse],
      m.lapsed?.length ? ['moved', <span className="t-crit">{m.lapsed.join('; ')}</span>] : null,
      m.reach && ['reach', m.reach],
      m.grounded && ['grounded', m.groundedBy],
      m.doubt?.length ? ['doubt', m.doubt.join(' ')] : null,
    ]} />
  );
}

// A mark that explains itself on hover or focus.
export function MarkBadge({ m, small }) {
  if (!m) return null;
  return (
    <TooltipTrigger delay={250} closeDelay={60}>
      <Button className="badge-btn" aria-label={`${m.mark}: ${m.explain?.means || ''}`}><Badge word={m.mark} small={small} /></Button>
      <Tooltip className="tip" placement="bottom start" offset={6}><MarkExplain m={m} /></Tooltip>
    </TooltipTrigger>
  );
}

export function Owner({ owner }) {
  if (!owner) return null;
  const glyph = owner === 'settled' ? '✓' : owner === 'rejected' ? '✕' : '○';
  return <span className={`owner is-${owner}`} title={`owner: ${owner}`}><span aria-hidden="true">{glyph}</span><span className="sr-only">owner {owner}</span></span>;
}

function CopyButton({ text, label = 'Copy' }) {
  const { announce } = useApp();
  const [done, setDone] = useState(false);
  return (
    <Button className="btn is-tiny" onPress={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); announce('Copied'); setTimeout(() => setDone(false), 1200); } catch { announce('Copy failed'); }
    }}>{done ? 'Copied' : label}</Button>
  );
}

// A decision prepared for the owner: the command, with the words left for them to write.
export function DecideLine({ dossier, verb, args = [] }) {
  const line = `dossier decide ${dossier} ${verb}${args.length ? ` ${args.join(' ')}` : ''} -- ""`;
  return <div className="decide"><code>{line}</code><CopyButton text={line} /></div>;
}

export function LinkButton() {
  const { announce } = useApp();
  return (
    <Button className="btn is-tiny" aria-label="Copy link to this selection" onPress={async () => {
      try { await navigator.clipboard.writeText(location.href); announce('Link copied'); } catch { announce('Copy failed'); }
    }}>Link</Button>
  );
}

export function KV({ rows }) {
  return (
    <dl className="kv">
      {rows.filter(Boolean).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}
    </dl>
  );
}

export function Sec({ title, aside, children }) {
  return (
    <section className="sec">
      <h3 className="sec-h"><span>{title}</span>{aside != null && <span className="sec-aside">{aside}</span>}</h3>
      {children}
    </section>
  );
}

export const None = ({ children = 'none' }) => <span className="muted">{children}</span>;
export const Mono = ({ children }) => <span className="mono">{children}</span>;
export function Loading({ what }) { return <div className="pad muted">Loading {what}…</div>; }
export function Failed({ error }) { return <div className="pad t-crit">{String(error?.message || error)}</div>; }

// One view that fails as it renders says so, and leaves the top bar and the spine standing. Another
// address, or a change on disk, which `at` names, tries the view again. It adds no element of its own,
// so the page's layout is the same with it.
export class ViewBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(before) { if (this.state.error && before.at !== this.props.at) this.setState({ error: null }); }
  render() { return this.state.error ? <div className="pad t-crit" role="alert">This view failed: {String(this.state.error?.message || this.state.error)}</div> : this.props.children; }
}
