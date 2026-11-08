// Seeded, finite cases for the common non-temporal chart/TLA semantics.
export interface GeneratedCase { seed: number; prose: string; family: string }

export function generate(seed: number): GeneratedCase {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new Error('seed must be a non-negative safe integer');
  let bits = (seed + 1) >>> 0;
  const pick = (n: number) => { bits = (Math.imul(bits, 1664525) + 1013904223) >>> 0; return (bits >>> 16) % n; };
  const capacity = 1 + pick(4), reserve = capacity + pick(4), fieldMax = 1 + pick(3);
  const active = pick(2) ? 'Active' : 'Ready';
  const guarded = pick(2) ? 'amount > 0 and amount <= left and amount <= reserve' : 'amount <= left and amount > 0 and reserve >= amount';
  const assignments = pick(2) ? 'left drops by amount, reserve drops by amount, spent grows by amount' : '{left := left - amount}, {reserve := reserve - amount}, {spent := spent + amount}';
  const states = ['Ready', ...(active === 'Active' ? ['Active'] : []), 'Closed'];
  const moves = [
    `[M1] When Ready receives pay and {${guarded}}, it ${active === 'Ready' ? 'stays' : 'becomes'} ${active}, ${assignments}.`,
    ...(active === 'Active' ? [`[M2] When Active receives pay and {${guarded}}, it stays Active, ${assignments}.`] : []),
    `[M3] When ${active} receives close and {left = 0}, it becomes Closed.`,
    `[M4] When Closed receives reset, it becomes Ready, left becomes ${capacity}, reserve becomes ${reserve}, spent becomes 0.`,
  ];
  let refusal = 1;
  const refusals: string[] = [];
  for (const state of states) {
    if (state === 'Closed') refusals.push(`[R${refusal++}] In Closed, pay and close are refused.`);
    else {
      refusals.push(`[R${refusal++}] In ${state}, pay is refused when {amount = 0 or amount > left or amount > reserve}.`);
      refusals.push(state === active ? `[R${refusal++}] In ${state}, close is refused when {left > 0}.` : `[R${refusal++}] In ${state}, close is refused.`);
      refusals.push(`[R${refusal++}] In ${state}, reset is refused.`);
    }
  }
  const prose = `# Seed${seed}\nTier: modeled\nModule: seeded\n\nIt holds left, a count from 0 to ${capacity}, starting at ${capacity}. It holds reserve, a count from 0 to ${reserve}, starting at ${reserve}. It holds spent, a count from 0 to ${capacity}.\n\n## States\n${states.map((state, i) => `[S${i + 1}] ${state}: a finite payment stage.`).join('\n')}\n\n## Events\n[E1] pay, from the operator: request payment. Carries amount, a count from 0 to ${fieldMax}.\n[E2] close, from the operator: close an exhausted budget.\n[E3] reset, from the operator: begin another budget.\n\n## Moves\n${moves.join('\n')}\n${refusals.join('\n')}\n\n## Always\n[A1] Always, {left + spent = ${capacity}}.\n[A2] Always, {reserve + spent = ${reserve}}.\n\n## Walks\n[W1] Walk Pay: from Ready with left ${capacity}, pay amount 0 refused, pay amount 1; ends ${active} with left ${capacity - 1}, reserve ${reserve - 1}, spent 1.\n[W2] Walk Restart: from Closed with left 0, pay amount 1 refused, reset, pay amount 1; ends ${active} with left ${capacity - 1}, reserve ${reserve - 1}, spent 1.\n[W3] Walk FalseRefusal: from Ready with left ${capacity}, pay amount 1 refused; ends Ready with left ${capacity}.\n`;
  return { seed, prose, family: active === 'Active' ? 'three-state' : 'two-state' };
}

// Delta debugging only drops complete passage lines; a candidate is accepted
// only when the caller reproduces the same disagreement on valid input.
export async function minimize(prose: string, stillFails: (candidate: string) => Promise<boolean>): Promise<string> {
  let lines = prose.split('\n');
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = lines.length - 1; index >= 0; index--) {
      if (!/^\[[A-Z]\d+\]/.test(lines[index])) continue;
      const candidate = lines.filter((_, i) => i !== index);
      if (await stillFails(candidate.join('\n'))) { lines = candidate; changed = true; }
    }
  }
  return lines.join('\n');
}
