// A small safe Markdown reader for authored text: paragraphs, headings, nested lists, tables, quotes,
// code, links, inline code and bold. Raw HTML is plain text. A link to a dossier's file becomes the
// explorer's address for it.
import { Fragment } from 'react';
import { documentHref } from './behavior-navigation.js';

function Inline({ text, source }) {
  const pieces = String(text).split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g);
  return pieces.map((piece, i) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(piece);
    if (link) {
      const href = documentHref(link[2], source);
      return href ? <a key={i} href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{link[1]}</a> : <span key={i} title={link[2]}>{link[1]}</span>;
    }
    if (piece.startsWith('`') && piece.endsWith('`') && piece.length > 1) return <code key={i}>{piece.slice(1, -1)}</code>;
    if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 3) return <strong key={i}>{piece.slice(2, -2)}</strong>;
    return <Fragment key={i}>{piece}</Fragment>;
  });
}
const ITEM = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
const indentOf = line => /^\s*/.exec(line)[0].replace(/\t/g, '  ').length;
// A list, nested by indentation: an item's indented lines are its continuation or its own list.
function parseList(lines, start) {
  const base = indentOf(lines[start]), items = [];
  let i = start;
  while (i < lines.length) {
    const m = ITEM.exec(lines[i]);
    if (!m || indentOf(lines[i]) !== base) break;
    const item = { ordered: /\d/.test(m[2]), text: [m[3]], children: null };
    i++;
    while (i < lines.length && lines[i].trim()) {
      const deeper = indentOf(lines[i]) > base;
      if (ITEM.test(lines[i]) && deeper) { const sub = parseList(lines, i); item.children = sub.list; i = sub.end; continue; }
      if (ITEM.test(lines[i]) || !deeper) break;
      item.text.push(lines[i++].trim());
    }
    items.push(item);
    // A blank line between two items keeps the list going; anything else after it ends the list.
    if (i < lines.length && !lines[i].trim() && ITEM.test(lines[i + 1] || '') && indentOf(lines[i + 1]) === base) i++;
  }
  return { list: { ordered: items[0]?.ordered, items }, end: i };
}
function ListView({ list, source }) {
  const Tag = list.ordered ? 'ol' : 'ul';
  return <Tag>{list.items.map((item, i) => <li key={i}><Inline text={item.text.join(' ')} source={source} />{item.children && <ListView list={item.children} source={source} />}</li>)}</Tag>;
}
export function DocumentText({ text, source, skipTitle = false }) {
  const lines = String(text || '').trim().split(/\r?\n/), blocks = [];
  let i = 0;
  if (skipTitle && /^# /.test(lines[0] || '')) i++;
  while (i < lines.length) {
    if (!lines[i].trim()) { i++; continue; }
    const key = i;
    if (/^\s*```/.test(lines[i])) {
      const code = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={key}><code>{code.join('\n')}</code></pre>);
      continue;
    }
    const heading = /^#{1,6}\s+(.+)$/.exec(lines[i]);
    if (heading) { blocks.push(<h4 key={key}><Inline text={heading[1]} source={source} /></h4>); i++; continue; }
    if (/^\s*\|/.test(lines[i])) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { if (!/^\s*\|\s*:?-/.test(lines[i])) rows.push(lines[i].trim().replace(/^\||\|\s*$/g, '').split('|').map(cell => cell.trim())); i++; }
      blocks.push(<div key={key} className="doc-table"><table className="dt"><tbody>{rows.map((row, r) => <tr key={r}>{row.map((cell, c) => r === 0 ? <th key={c}><Inline text={cell} source={source} /></th> : <td key={c}><Inline text={cell} source={source} /></td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (ITEM.test(lines[i])) { const { list, end } = parseList(lines, i); blocks.push(<ListView key={key} list={list} source={source} />); i = end; continue; }
    if (/^>\s?/.test(lines[i])) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(<blockquote key={key}><Inline text={quote.join(' ')} source={source} /></blockquote>);
      continue;
    }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(?:#{1,6}\s|\s*```|\s*\||\s*(?:[-*+]|\d+\.)\s|>)/.test(lines[i])) paragraph.push(lines[i++].trim());
    if (!paragraph.length) paragraph.push(lines[i++].trim());
    blocks.push(<p key={key}><Inline text={paragraph.join(' ')} source={source} /></p>);
  }
  return <div className="doc">{blocks}</div>;
}
