// Small shared pieces: status badges, mark explanations, prepared decisions, key-value lists.
import { Fragment, useState } from 'react';
import { Button, Tooltip, TooltipTrigger } from 'react-aria-components';
import { familyOf, ICON, useApp } from './lib.js';

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
