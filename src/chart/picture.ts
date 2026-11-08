// The grid of states by events, read from the IR, never from the machine.
import type { Ir } from '../prose/ir.ts';

export function gridMarkdown(ir: Ir): string {
  const events = ir.events.map(e => e.name);
  const lines = [`| state \\ event | ${events.join(' | ')} |`, `| --- | ${events.map(() => '---').join(' | ')} |`];
  const leaves = ir.states.filter(s => !s.children);
  for (const s of leaves) {
    const cells = events.map(ev => {
      const cell = ir.table.find(c => c.state === s.key && c.event === ev);
      if (!cell) return '';
      const parts = [...cell.moves, ...cell.refusals];
      return parts.length ? parts.join(' ') : 'unsaid';
    });
    lines.push(`| ${s.key} | ${cells.join(' | ')} |`);
  }
  if (ir.unsaid.length) lines.push('', `Unsaid: ${ir.unsaid.join(', ')}`);
  return lines.join('\n') + '\n';
}
