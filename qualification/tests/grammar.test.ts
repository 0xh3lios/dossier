// The grammar: brace expressions and controlled phrases (expr.ts), the
// prose of a component and a system (prose.ts), and the intermediate form
// (ir.ts). Run: node --test qualification/tests/grammar.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  NUMBER_WORDS, evaluate, parseAssignment, parseAtom, parseClauses, parseCondition, parseExpr, parseValue, resolveIds, splitTop, toLabel, toTla,
} from '../../src/prose/expr.ts';
import { EVENT_CASES, KINDS, RANGE_SPAN, SYSTEM_KINDS, parseBoundary, parseProse, parseSystemProse, parseTypePhrase, passageHashes, senderId } from '../../src/prose/prose.ts';
import { compileIR } from '../../src/prose/ir.ts';
import type { BinOp, Expr, Value } from '../../src/prose/expr.ts';
import type { Datum } from '../../src/prose/prose.ts';

const int = (v: number): Expr => ({ t: 'int', v });
const id = (name: string): Expr => ({ t: 'id', name });
const bin = (op: BinOp, l: Expr, r: Expr): Expr => ({ t: 'bin', op, l, r });

// ---------------------------------------------------------------- expr

describe('parseExpr', () => {
  it('binds not tighter than and, and and tighter than or', () => {
    assert.deepEqual(parseExpr('a or b and not c'), bin('or', id('a'), bin('and', id('b'), { t: 'not', e: id('c') })));
  });

  it('binds arithmetic tighter than comparisons and comparisons tighter than and', () => {
    assert.deepEqual(parseExpr('a + 1 < b * 2 and c'), bin('and', bin('<', bin('+', id('a'), int(1)), bin('*', id('b'), int(2))), id('c')));
  });

  it('keeps + - left associative and * div mod above them', () => {
    assert.deepEqual(parseExpr('a - b - c'), bin('-', bin('-', id('a'), id('b')), id('c')));
    assert.deepEqual(parseExpr('a + b div 2 mod 3'), bin('+', id('a'), bin('mod', bin('div', id('b'), int(2)), int(3))));
  });

  it('honors parentheses', () => {
    assert.deepEqual(parseExpr('(a or b) and c'), bin('and', bin('or', id('a'), id('b')), id('c')));
    assert.deepEqual(parseExpr('(a + b) * c'), bin('*', bin('+', id('a'), id('b')), id('c')));
  });

  it('reads negation, booleans, dotted names and == as =', () => {
    assert.deepEqual(parseExpr('-a * 2'), bin('*', { t: 'neg', e: id('a') }, int(2)));
    assert.deepEqual(parseExpr('- -1'), { t: 'neg', e: { t: 'neg', e: int(1) } });
    assert.deepEqual(parseExpr('true and not false'), bin('and', { t: 'bool', v: true }, { t: 'not', e: { t: 'bool', v: false } }));
    assert.deepEqual(parseExpr('vault.debt == 3'), bin('=', id('vault.debt'), int(3)));
    assert.deepEqual(parseExpr('a != b'), bin('!=', id('a'), id('b')));
    assert.deepEqual(parseExpr('a >= 1'), bin('>=', id('a'), int(1)));
  });

  it('refuses malformed input', () => {
    assert.throws(() => parseExpr('a +'), /unexpected end of \{a \+\}/);
    assert.throws(() => parseExpr('a b'), /unexpected "id" after expression/);
    assert.throws(() => parseExpr('(a'), /expected "\)"/);
    assert.throws(() => parseExpr('a $ b'), /unexpected character "\$"/);
    assert.throws(() => parseExpr(''), /unexpected end/);
  });
});

describe('parseAssignment, splitTop and parseValue', () => {
  it('reads {name := expr}', () => {
    assert.deepEqual(parseAssignment('x := y + 1'), { name: 'x', expr: bin('+', id('y'), int(1)) });
    assert.throws(() => parseAssignment('x = 1'), /reads \{name := expr\}/);
  });

  it('splits on separators only outside braces', () => {
    assert.deepEqual(splitTop('a and {b and c} and d', [' and ']), ['a', '{b and c}', 'd']);
    assert.deepEqual(splitTop('with x 0, {y := z, 2} and f is set', [', ', ' and ']), ['with x 0', '{y := z, 2}', 'f is set']);
    assert.deepEqual(splitTop('', [' and ']), []);
  });

  it('reads integers, number words, booleans, names and braces as values', () => {
    assert.deepEqual(parseValue('3'), int(3));
    assert.deepEqual(parseValue(' -2 '), int(-2));
    assert.deepEqual(parseValue('two'), int(2));
    assert.deepEqual(parseValue('ten'), int(10));
    assert.deepEqual(parseValue('true'), { t: 'bool', v: true });
    assert.deepEqual(parseValue('Idle'), id('Idle'));
    assert.deepEqual(parseValue('vault.debt'), id('vault.debt'));
    assert.deepEqual(parseValue('{a + 1}'), bin('+', id('a'), int(1)));
    assert.throws(() => parseValue('a b'), /not a value: "a b"/);
    assert.equal(NUMBER_WORDS.zero, 0);
    assert.equal(Object.keys(NUMBER_WORDS).length, 11);
  });
});

describe('parseCondition', () => {
  it('reads every controlled atom', () => {
    assert.deepEqual(parseAtom('x is below 2'), bin('<', id('x'), int(2)));
    assert.deepEqual(parseAtom('x is above two'), bin('>', id('x'), int(2)));
    assert.deepEqual(parseAtom('x is at least 1'), bin('>=', id('x'), int(1)));
    assert.deepEqual(parseAtom('x is at most ten'), bin('<=', id('x'), int(10)));
    assert.deepEqual(parseAtom('x is not Idle'), bin('!=', id('x'), id('Idle')));
    assert.deepEqual(parseAtom('flag is set'), id('flag'));
    assert.deepEqual(parseAtom('flag is clear'), { t: 'not', e: id('flag') });
    assert.deepEqual(parseAtom('x is Idle'), bin('=', id('x'), id('Idle')));
    assert.deepEqual(parseAtom('x is delay'), bin('=', id('x'), id('delay')));
  });

  it('reads braces as a brace expression, where or is allowed', () => {
    assert.deepEqual(parseAtom('{x + 1 = y}'), bin('=', bin('+', id('x'), int(1)), id('y')));
    assert.deepEqual(parseCondition('{x > 1 or f}'), bin('or', bin('>', id('x'), int(1)), id('f')));
    assert.throws(() => parseCondition('x is 1 or f is set'), /not a value/);
  });

  it('joins atoms with and, respecting braces', () => {
    assert.deepEqual(parseCondition('x is 1 and f is set'), bin('and', bin('=', id('x'), int(1)), id('f')));
    assert.deepEqual(parseCondition('x is below 2 and {y > 1 or z} and g is clear'),
      bin('and', bin('and', bin('<', id('x'), int(2)), bin('or', bin('>', id('y'), int(1)), id('z'))), { t: 'not', e: id('g') }));
  });

  it('refuses what is not a condition', () => {
    assert.throws(() => parseAtom('nothing here'), /not a condition: "nothing here"/);
    assert.throws(() => parseCondition('x is 1 and and'), /not a condition/);
    assert.throws(() => parseCondition('   '), /empty condition/);
  });
});

describe('parseClauses', () => {
  it('reads each clause form', () => {
    assert.deepEqual(parseClauses('with x 0'), { assigns: [{ name: 'x', expr: int(0) }], effects: [] });
    assert.deepEqual(parseClauses('x grows by one').assigns, [{ name: 'x', expr: bin('+', id('x'), int(1)) }]);
    assert.deepEqual(parseClauses('x drops by 2').assigns, [{ name: 'x', expr: bin('-', id('x'), int(2)) }]);
    assert.deepEqual(parseClauses('x becomes y').assigns, [{ name: 'x', expr: id('y') }]);
    assert.deepEqual(parseClauses('f is set').assigns, [{ name: 'f', expr: { t: 'bool', v: true } }]);
    assert.deepEqual(parseClauses('f is cleared').assigns, [{ name: 'f', expr: { t: 'bool', v: false } }]);
    assert.deepEqual(parseClauses('{x := y + 1}').assigns, [{ name: 'x', expr: bin('+', id('y'), int(1)) }]);
    assert.deepEqual(parseClauses('sends notify').effects, [{ name: 'notify', to: null }]);
    assert.deepEqual(parseClauses('sends mint to the Token').effects, [{ name: 'mint', to: 'the Token' }]);
  });

  it('reads a mixed list after the target, separated by commas and and', () => {
    const r = parseClauses(', with x 0, y grows by one and f is set, {z := x * 2} and sends notify, sends halt to the Adapter.');
    assert.deepEqual(r.assigns.map(a => a.name), ['x', 'y', 'f', 'z']);
    assert.deepEqual(r.assigns[3].expr, bin('*', id('x'), int(2)));
    assert.deepEqual(r.effects, [{ name: 'notify', to: null }, { name: 'halt', to: 'the Adapter' }]);
  });

  it('reads nothing from an empty tail and refuses other words', () => {
    assert.deepEqual(parseClauses(''), { assigns: [], effects: [] });
    assert.deepEqual(parseClauses('.'), { assigns: [], effects: [] });
    assert.throws(() => parseClauses(', dances'), /not a change or effect: "dances"/);
    assert.throws(() => parseClauses('x grows by'), /not a change or effect/);
  });
});

describe('evaluate', () => {
  const lookup = (env: Record<string, Value>) => (name: string) => env[name];

  it('floors div and keeps mod non-negative', () => {
    assert.equal(evaluate(parseExpr('7 div 2'), lookup({})), 3);
    assert.equal(evaluate(parseExpr('-7 div 2'), lookup({})), -4);
    assert.equal(evaluate(parseExpr('7 mod 3'), lookup({})), 1);
    assert.equal(evaluate(parseExpr('-7 mod 3'), lookup({})), 2);
    assert.equal(evaluate(parseExpr('-1 mod 3'), lookup({})), 2);
  });

  it('throws on division by zero and on an unknown name', () => {
    assert.throws(() => evaluate(parseExpr('1 div 0'), lookup({})), /division by zero/);
    assert.throws(() => evaluate(parseExpr('1 mod 0'), lookup({})), /division by zero/);
    assert.throws(() => evaluate(parseExpr('x + 1'), lookup({})), /unknown name "x"/);
    assert.throws(() => evaluate({ t: 'ref', name: 'y' }, lookup({ x: 1 })), /unknown name "y"/);
  });

  it('evaluates comparisons, logic, negation and literals from a lookup', () => {
    const env = lookup({ x: 1, y: 3, f: false, lane: 'A' });
    assert.equal(evaluate(parseExpr('x + 1 < y and not f'), env), true);
    assert.equal(evaluate(parseExpr('x = 1 and y != 3'), env), false);
    assert.equal(evaluate(parseExpr('x >= 1 or false'), env), true);
    assert.equal(evaluate(parseExpr('x <= 0 or y > 2'), env), true);
    assert.equal(evaluate(parseExpr('-x * y'), env), -3);
    assert.equal(evaluate({ t: 'lit', v: 'Idle' }, env), 'Idle');
    assert.equal(evaluate(bin('=', { t: 'ref', name: 'lane' }, { t: 'lit', v: 'A' }), env), true);
    assert.equal(evaluate(bin('=', { t: 'field', name: 'lane' }, { t: 'lit', v: 'B' }), env), false);
  });

  it('refuses a node it does not know', () => {
    assert.throws(() => evaluate({ t: 'what' } as unknown as Expr, lookup({})), /cannot evaluate node what/);
  });
});

describe('toTla and toLabel', () => {
  it('prints TLA+ operators with quoted literals', () => {
    assert.equal(toTla(parseExpr('a + b * 2')), '(a + (b * 2))');
    assert.equal(toTla(parseExpr('a div 2 = b mod 3')), '((a \\div 2) = (b % 3))');
    assert.equal(toTla(parseExpr('a != b')), '(a /= b)');
    assert.equal(toTla(parseExpr('a and b or not c')), '((a /\\ b) \\/ ~(c))');
    assert.equal(toTla(parseExpr('-a <= 1')), '((0 - a) <= 1)');
    assert.equal(toTla(parseExpr('true or false')), '(TRUE \\/ FALSE)');
    assert.equal(toTla(parseExpr('a >= 1 and a < 2 and a > 0')), '(((a >= 1) /\\ (a < 2)) /\\ (a > 0))');
    assert.equal(toTla({ t: 'lit', v: 'Idle' }), '"Idle"');
    assert.equal(toTla(bin('=', { t: 'ref', name: 'lane' }, { t: 'lit', v: 'A' })), '(lane = "A")');
  });

  it('maps references through mapRef and refuses unknown nodes', () => {
    assert.equal(toTla(parseExpr('vault.debt = 1 and adapter.held > 0'), n => n.replace('.', '_')), '((vault_debt = 1) /\\ (adapter_held > 0))');
    assert.equal(toTla({ t: 'field', name: 'amount' }, n => `f_${n}`), 'f_amount');
    assert.throws(() => toTla({ t: 'what' } as unknown as Expr), /cannot print node what/);
  });

  it('prints a readable label', () => {
    assert.equal(toLabel(parseExpr('a + b * 2 >= 3 and not f')), 'a + b * 2 >= 3 and not f');
    assert.equal(toLabel(parseExpr('-a or true')), '-a or true');
    assert.equal(toLabel(bin('=', { t: 'ref', name: 'lane' }, { t: 'lit', v: 'A' })), 'lane = A');
    assert.equal(toLabel({ t: 'what' } as unknown as Expr), '?');
  });

  it('parenthesizes a label where the shape needs it, so it reads back as the same expression', () => {
    for (const [src, label] of [
      ['(a + b) * c', '(a + b) * c'],
      ['a + b * c', 'a + b * c'],
      ['a - (b - c)', 'a - (b - c)'],
      ['a - b - c', 'a - b - c'],
      ['(a or b) and c', '(a or b) and c'],
      ['a or b and c', 'a or b and c'],
      ['not (x > 1)', 'not (x > 1)'],
      ['not (a and b)', 'not (a and b)'],
      ['-(a + b) * 2', '-(a + b) * 2'],
      ['(a < b) = c', '(a < b) = c'],
      ['n div d = 1', 'n div d = 1'],
    ]) {
      assert.equal(toLabel(parseExpr(src)), label, src);
      assert.deepEqual(parseExpr(toLabel(parseExpr(src))), parseExpr(src), `${label} reads back as ${src}`);
    }
  });
});

describe('a member reference whose component id has hyphens', () => {
  it('reads price-feed.price as one name, in braces and in a controlled phrase, while a - b stays a subtraction', () => {
    assert.deepEqual(parseExpr('price-feed.price > 1'), bin('>', id('price-feed.price'), int(1)));
    assert.deepEqual(parseExpr('oracle.price-lane-a.price'), bin('-', id('oracle.price'), id('lane-a.price')));
    assert.deepEqual(parseExpr('held-amount'), bin('-', id('held'), id('amount')));
    assert.deepEqual(parseCondition('price-feed.price is at most 2'), bin('<=', id('price-feed.price'), int(2)));
    assert.deepEqual(parseValue('price-feed.price'), id('price-feed.price'));
    assert.throws(() => parseValue('price--feed.price'), /not a value/);
  });

  it('resolves a hyphened component id as a sender, as the commands validate ids', () => {
    assert.equal(senderId('the Price-Feed'), 'price-feed');
    assert.equal(senderId('Price Feed'), 'price-feed');
    assert.equal(senderId('lane A'), 'lane-a');
  });
});

describe('resolveIds', () => {
  it('replaces id nodes with what the resolver says and keeps the rest', () => {
    const resolver = (name: string): Expr | null => (name === 'x' ? { t: 'ref', name } : name === 'Idle' ? { t: 'lit', v: 'Idle' } : name === 'd' ? { t: 'field', name } : null);
    const ast = resolveIds(parseExpr('x + d > 1 and not (state = Idle) and -unknown < 0'), resolver);
    assert.deepEqual(ast, bin('and', bin('and', bin('>', bin('+', { t: 'ref', name: 'x' }, { t: 'field', name: 'd' }), int(1)), { t: 'not', e: bin('=', id('state'), { t: 'lit', v: 'Idle' }) }), bin('<', { t: 'neg', e: id('unknown') }, int(0))));
  });
});

// ---------------------------------------------------------------- prose

describe('parseTypePhrase', () => {
  it('reads counts, flags, amounts and enums', () => {
    assert.deepEqual(parseTypePhrase('a count from 0 to 2'), { type: 'count', min: 0, max: 2 });
    assert.deepEqual(parseTypePhrase('a count from zero to ten.'), { type: 'count', min: 0, max: 10 });
    assert.deepEqual(parseTypePhrase('a flag'), { type: 'flag' });
    assert.deepEqual(parseTypePhrase('an amount of HRD up to 3'), { type: 'amount', unit: 'HRD', min: 0, max: 3 });
    assert.deepEqual(parseTypePhrase('one of A, B or C'), { type: 'enum', values: ['A', 'B', 'C'] });
    assert.deepEqual(parseTypePhrase('one of Low or High'), { type: 'enum', values: ['Low', 'High'] });
    assert.equal(parseTypePhrase('a number'), null);
  });

  it('reads the starting value', () => {
    assert.deepEqual(parseTypePhrase('a count from 0 to 2, starting at 1'), { type: 'count', min: 0, max: 2, initial: 1 });
    assert.deepEqual(parseTypePhrase('an amount of HRD up to 3, starting at two'), { type: 'amount', unit: 'HRD', min: 0, max: 3, initial: 2 });
    assert.deepEqual(parseTypePhrase('a flag, starting set'), { type: 'flag', initial: true });
    assert.deepEqual(parseTypePhrase('a flag, starting clear'), { type: 'flag', initial: false });
    assert.deepEqual(parseTypePhrase('one of A, B or C, starting at B'), { type: 'enum', values: ['A', 'B', 'C'], initial: 'B' });
  });

  // A throw here once escaped verify, draw and scaffold as an internal error for the whole root.
  it('returns a bound or a starting value the type cannot hold as a problem, and never throws', () => {
    const cases: [string, string][] = [
      ['a count from 0 to lots', 'bound "lots" is not a whole number'],
      ['a count from few to 2', 'bound "few" is not a whole number'],
      ['a count from -1 to 2', 'bound "-1" is not a whole number'],
      ['a count from 0 to 2.5', 'bound "2.5" is not a whole number'],
      ['an amount of HRD up to lots', 'bound "lots" is not a whole number'],
      ['a count from 3 to 1', 'the range from 3 to 1 holds no value'],
      ['a count from 0 to 2, starting at Idle', 'starting value "Idle" is not a whole number'],
      ['a count from 0 to 2, starting at lots.', 'starting value "lots" is not a whole number'],
      ['a count from 0 to 2, starting at 5', 'starting value 5 is outside the range from 0 to 2'],
      ['an amount of HRD up to 3, starting at four', 'starting value 4 is outside the range from 0 to 3'],
      ['a flag, starting lots', 'starting value "lots" is not set or clear'],
      ['one of A or B, starting at C', 'starting value "C" is not one of A, B'],
    ];
    for (const [phrase, problem] of cases) assert.deepEqual(parseTypePhrase(phrase), { problem }, phrase);
    assert.deepEqual(parseTypePhrase('a count from two to two'), { type: 'count', min: 2, max: 2 }, 'a range of one value reads');
  });
});

describe('parseBoundary', () => {
  it('reads holds and sends sentences with defaults for the initial values', () => {
    const b = parseBoundary('The Adapter moves credit. It holds held, a count from 0 to 2. It holds live, a flag, starting set. It holds lane, one of A or B. It sends halt to the Adapter, carrying amount and lane. It sends mint to the Token, and burn to the Token.');
    assert.deepEqual(b.errors, []);
    assert.deepEqual(b.data, [
      { name: 'held', type: 'count', min: 0, max: 2, initial: 0 },
      { name: 'live', type: 'flag', initial: true },
      { name: 'lane', type: 'enum', values: ['A', 'B'], initial: 'A' },
    ]);
    assert.deepEqual(b.effects, [
      { name: 'halt', to: 'the Adapter', fields: ['amount', 'lane'] },
      { name: 'mint', to: 'the Token', fields: [] },
      { name: 'burn', to: 'the Token', fields: [] },
    ]);
  });

  it('reports unreadable declarations', () => {
    const b = parseBoundary('It holds x, something odd. It holds Bad, a flag. It sends nowhere.');
    assert.deepEqual(b.data, []);
    assert.deepEqual(b.effects, []);
    assert.match(b.errors[0], /"x" has no readable type: "something odd"/);
    assert.match(b.errors[1], /data name "Bad" must be lower case/);
    assert.match(b.errors[2], /effect declaration not readable: "nowhere"/);
  });

  it('reports a datum whose bound or starting value does not read, and keeps the rest', () => {
    const b = parseBoundary('It holds x, a count from 0 to lots. It holds y, a count from 0 to 2, starting at lots. It holds z, a flag.');
    assert.deepEqual(b.errors, ['"x" has no readable type: bound "lots" is not a whole number', '"y" has no readable type: starting value "lots" is not a whole number']);
    assert.deepEqual(b.data.map(d => d.name), ['z']);
  });

  it('takes data and field names of lower case letters, digits and underscores only', () => {
    const b = parseBoundary('It holds debt_2, a flag. It holds bigDebt, a flag. It holds _spare, a count from 0 to 1.');
    assert.deepEqual(b.data.map(d => d.name), ['debt_2', '_spare']);
    assert.deepEqual(b.errors, ['data name "bigDebt" must be lower case letters, digits and underscores']);
    const p = parseProse('# Piece\n\nIt holds f, a flag.\n\n## States\n[S1] Idle: a.\n\n## Events\n[E1] go, from Governance: x. Carries newDelay, a count from 1 to 2, and fast, a flag.\n');
    assert.deepEqual(p.errors, ['E1: field name "newDelay" must be lower case letters, digits and underscores']);
    assert.deepEqual(p.events[0].fields.map(f => f.name), ['fast']);
    const sys = parseSystemProse('# Supply\nConcern: supply\n\n## Walks\n[W1] Walk Go: from adapter.Open, adapter.exit Amount 1; ends adapter.Open.\n');
    assert.deepEqual(sys.errors, ['W1: step "adapter.exit Amount 1" is not "<component>.<event>[ <field> <value>...][ refused]"']);
  });
});

// A component using every kind of passage and every form the grammar names.
const COMPLETE = `# Timelock
Tier: modeled
Module: gov-timelock
Pins: gov-timelock#contract:timelock, gov-timelock#observation:finalized

The Timelock holds a plan and executes it after a delay. It holds remaining, a count from 0 to 2. It holds early, a flag. It holds lane, one of A, B or C. It holds credit, an amount of HRD up to 2, starting at 1. It sends change to the Vault, and notify to Governance. It sends halt to the Adapter, carrying lane.

## States
[S1] Idle: nothing is planned.
[S2] Scheduled: a plan waits. Within it, it is either Waiting or Ready; it starts Waiting.
[S3] Scheduled.Waiting: the delay has not run out.
[S4] Scheduled.Ready: the delay has run out.
[S5] Spent: the timelock is over. Final.
[S6] Running: both halves run. Within it, it is both Clock and Beam.
[S7] Running.Clock: the clock half.
[S8] Running.Beam: the beam half.

## Events
[E1] schedule, from Governance: a plan is proposed. Carries delay, a count from 1 to 2, and fast, a flag.
[E2] tick, from the chain: a block passes.
[E3] execute, from the public: the plan is executed.
[E4] cancel, from Governance: the plan is abandoned.
[E5] retire, from Governance: the timelock is retired.
[E6] run, from Governance: both halves start.

## Moves
[M1] When Idle receives schedule, it becomes Scheduled, with remaining delay, early becomes fast.
[M2] When Scheduled.Waiting receives tick and remaining is above 1, it stays Scheduled.Waiting, remaining drops by one.
[M3] When Scheduled.Waiting receives tick and remaining is at most 1, it becomes Scheduled.Ready, remaining becomes 0.
[M4] When Scheduled.Ready receives execute, it becomes Idle, sends change.
[M5] When Scheduled receives cancel, it becomes Idle, remaining becomes 0, early is cleared, sends notify.
[M6] When Idle receives retire, it becomes Spent, {credit := credit - 1}, sends halt to the Adapter.
[M7] When Idle receives run and lane is A, it becomes Running.
[M8] When Running receives cancel, it becomes Idle.
[R1] In Idle, tick, execute and cancel are refused.
[R2] In Scheduled, schedule, retire and run are refused.
[R3] In Scheduled.Waiting, execute is refused, sends notify.
[R4] In Scheduled.Ready, tick is refused.
[R5] In Spent, every event is refused.
[R6] In Idle, run is refused when lane is not A.
[R7] In Running, schedule, tick, execute, retire and run are refused.

## Always
[A1] Always, remaining is at most 2.
[A2] Always, while Idle, remaining is 0.
[A3] Always, in structure, every plan names one governance.

## Once
[O1] Once Scheduled, eventually Idle, given G1 and G2.
[O2] Once remaining is above 0, eventually remaining is 0, given G2.

## Within
[N1] Within two ticks of Scheduled.Ready, Idle, given G1.

## Given
[G1] Given that the executor runs a ready plan. If this is false, plans wait forever. Actor: the public, on execute, prompt.
[G2] Given that the chain keeps ticking. If this is false, nothing moves. Actor: the chain.
[G3] Given that Governance is honest. If this is false, plans may be cancelled.

## Walks
[W1] Walk Plan: from Idle, schedule delay 2 fast false, execute refused, tick, tick, execute; ends Idle with remaining 0; change sent once; notify not sent.
[W2] Walk Cancel: from Scheduled.Waiting with remaining 1, cancel; ends Idle; notify sent 1 times.
[W3] Walk Retire: from Idle with credit 1 and lane A, retire; ends Spent with credit 0 and lane A; sends halt.

## Seams
[X1] Seam with Vault: change carries the new ceiling.

## Guarantees
[K1] The delay is enforced on chain. Backing: certora certora/Timelock.spec#delayEnforced at 1A2B3C4D.
[K2] Only Governance schedules. Backing: file evidence/governance.md#only-governance.
[K3] The executor is public. Backing: external replay.
[K4] Nothing else. Backing: none.

## Words only
[T1] The Timelock knows nothing of the plan's content.

## Retired
[M9] When Idle receives schedule, it becomes Spent.
`;

describe('a complete component prose', () => {
  const prose = parseProse(COMPLETE);

  it('reads the header, the lead and the sections', () => {
    assert.equal(prose.title, 'Timelock');
    assert.equal(prose.tier, 'modeled');
    assert.equal(prose.module, 'gov-timelock');
    assert.deepEqual(prose.pins, ['gov-timelock#contract:timelock', 'gov-timelock#observation:finalized']);
    assert.deepEqual(prose.sections, ['States', 'Events', 'Moves', 'Always', 'Once', 'Within', 'Given', 'Walks', 'Seams', 'Guarantees', 'Words only', 'Retired']);
    assert.deepEqual(prose.errors, []);
    assert.deepEqual(prose.misnamed, []);
    assert.equal(KINDS.K, 'Guarantee');
    assert.ok(SYSTEM_KINDS.has('W') && !SYSTEM_KINDS.has('S'));
  });

  it('reads the boundary declarations', () => {
    assert.deepEqual(prose.boundary.data.map(d => [d.name, d.type, d.initial]), [['remaining', 'count', 0], ['early', 'flag', false], ['lane', 'enum', 'A'], ['credit', 'amount', 1]]);
    assert.equal((prose.boundary.data[3] as Extract<Datum, { type: 'amount' }>).unit, 'HRD');
    assert.deepEqual(prose.boundary.effects, [{ name: 'change', to: 'the Vault', fields: [] }, { name: 'notify', to: 'Governance', fields: [] }, { name: 'halt', to: 'the Adapter', fields: ['lane'] }]);
  });

  it('reads plain, final, child and parallel States', () => {
    const s = Object.fromEntries(prose.states.map(x => [x.id, x]));
    assert.deepEqual(s.S1, { id: 'S1', name: 'Idle', path: ['Idle'], parent: null, text: 'nothing is planned.', final: false, initial: true, children: null });
    assert.equal(s.S5.final, true);
    assert.equal(s.S5.initial, false);
    assert.deepEqual(s.S3.path, ['Scheduled', 'Waiting']);
    assert.equal(s.S3.parent, 'Scheduled');
    assert.equal(s.S3.name, 'Waiting');
    assert.equal(s.S3.initial, false);
    assert.deepEqual(s.S6.children, { kind: 'parallel', names: ['Clock', 'Beam'] });
    assert.equal(s.S6.text, 'both halves run.');
    assert.equal(s.S7.parent, 'Running');
  });

  it('reads a compound State: its children and where it starts', () => {
    const s2 = prose.states.find(x => x.id === 'S2')!;
    assert.deepEqual(s2.children, { kind: 'compound', names: ['Waiting', 'Ready'], initial: 'Waiting' });
    assert.equal(s2.text, 'a plan waits.');
    // With the children known, the leaves are Idle, Scheduled.Waiting, Scheduled.Ready, Spent and the two halves: every pair is said.
    assert.deepEqual(prose.unsaid, []);
  });

  it('reads Events with their senders and typed fields', () => {
    const e = Object.fromEntries(prose.events.map(x => [x.id, x]));
    assert.equal(e.E1.name, 'schedule');
    assert.equal(e.E1.sender, 'Governance');
    assert.deepEqual(e.E1.fields, [{ name: 'delay', type: 'count', min: 1, max: 2 }, { name: 'fast', type: 'flag' }]);
    assert.equal(e.E2.sender, 'the chain');
    assert.deepEqual(e.E2.fields, []);
    assert.equal(e.E3.sender, 'the public');
  });

  it('reads Moves: condition, target, stays, changes and effects', () => {
    const m = Object.fromEntries(prose.moves.map(x => [x.id, x]));
    assert.deepEqual(m.M1, { id: 'M1', state: 'Idle', event: 'schedule', guard: null, stays: false, to: 'Scheduled', assigns: [{ name: 'remaining', expr: id('delay') }, { name: 'early', expr: id('fast') }], effects: [] });
    assert.deepEqual(m.M2.guard, bin('>', id('remaining'), int(1)));
    assert.equal(m.M2.stays, true);
    assert.equal(m.M2.to, 'Scheduled.Waiting');
    assert.deepEqual(m.M2.assigns, [{ name: 'remaining', expr: bin('-', id('remaining'), int(1)) }]);
    assert.deepEqual(m.M4.effects, [{ name: 'change', to: null }]);
    assert.deepEqual(m.M5.assigns, [{ name: 'remaining', expr: int(0) }, { name: 'early', expr: { t: 'bool', v: false } }]);
    assert.deepEqual(m.M6.assigns, [{ name: 'credit', expr: bin('-', id('credit'), int(1)) }]);
    assert.deepEqual(m.M6.effects, [{ name: 'halt', to: 'the Adapter' }]);
    assert.deepEqual(m.M7.guard, bin('=', id('lane'), id('A')));
    assert.equal(prose.moves.some(x => x.id === 'M9'), false, 'retired passages are not read');
  });

  it('reads Refusals: plain, with effects, conditional and every event', () => {
    const r = Object.fromEntries(prose.refusals.map(x => [x.id, x]));
    assert.deepEqual(r.R1, { id: 'R1', states: ['Idle'], events: ['tick', 'execute', 'cancel'], effects: [], cond: null });
    assert.deepEqual(r.R3.effects, [{ name: 'notify', to: null }]);
    assert.equal(r.R5.events, 'every');
    assert.deepEqual(r.R6.cond, bin('!=', id('lane'), id('A')));
    assert.deepEqual(r.R6.events, ['run']);
  });

  it('reads Always plain, while a State, and in structure', () => {
    const a = Object.fromEntries(prose.always.map(x => [x.id, x]));
    assert.deepEqual(a.A1, { id: 'A1', while: null, cond: bin('<=', id('remaining'), int(2)), givens: [] });
    assert.deepEqual(a.A2, { id: 'A2', while: 'Idle', cond: bin('=', id('remaining'), int(0)), givens: [] });
    assert.deepEqual(a.A3, { id: 'A3', while: null, cond: null, givens: [], structural: true, text: 'every plan names one governance' });
  });

  it('reads Once, Within and Given', () => {
    assert.deepEqual(prose.onces[0], { id: 'O1', trigger: { state: 'Scheduled' }, goal: { state: 'Idle' }, givens: ['G1', 'G2'] });
    assert.deepEqual(prose.onces[1], { id: 'O2', trigger: { cond: bin('>', id('remaining'), int(0)) }, goal: { cond: bin('=', id('remaining'), int(0)) }, givens: ['G2'] });
    assert.deepEqual(prose.withins[0], { id: 'N1', k: 2, trigger: { state: 'Scheduled.Ready' }, goal: { state: 'Idle' }, givens: ['G1'] });
    const g = Object.fromEntries(prose.givens.map(x => [x.id, x]));
    assert.deepEqual(g.G1, { id: 'G1', assumption: 'the executor runs a ready plan', otherwise: 'plans wait forever', actor: 'the public', event: 'execute', promptness: 'prompt', when: null });
    assert.deepEqual(g.G2, { id: 'G2', assumption: 'the chain keeps ticking', otherwise: 'nothing moves', actor: 'the chain', event: null, promptness: 'eventual', when: null });
    assert.equal(g.G3.actor, null);
  });

  it('reads Walks: arguments, refused steps, the start data and the end clauses', () => {
    const w = Object.fromEntries(prose.walks.map(x => [x.id, x]));
    assert.equal(w.W1.name, 'Plan');
    assert.equal(w.W1.scenario, null);
    assert.equal(w.W1.from, 'Idle');
    assert.deepEqual(w.W1.steps, [
      { event: 'schedule', args: { delay: int(2), fast: { t: 'bool', v: false } }, refused: false },
      { event: 'execute', args: {}, refused: true },
      { event: 'tick', args: {}, refused: false },
      { event: 'tick', args: {}, refused: false },
      { event: 'execute', args: {}, refused: false },
    ]);
    assert.equal(w.W1.ends, 'Idle');
    assert.deepEqual(w.W1.endData, { remaining: int(0) });
    assert.deepEqual(w.W1.sent, { change: 1 });
    assert.deepEqual(w.W1.notSent, ['notify']);
    assert.deepEqual(w.W2.with, { remaining: int(1) });
    assert.deepEqual(w.W2.sent, { notify: 1 });
    assert.deepEqual(w.W3.with, { credit: int(1), lane: id('A') });
    assert.deepEqual(w.W3.endData, { credit: int(0), lane: id('A') });
    assert.deepEqual(w.W3.sent, { halt: 1 });
  });

  it('reads Seams, Guarantees with every backing, and Words only', () => {
    assert.deepEqual(prose.seams, [{ id: 'X1', piece: 'Vault', body: 'change carries the new ceiling.' }]);
    const k = Object.fromEntries(prose.guarantees.map(x => [x.id, x]));
    assert.deepEqual(k.K1, { id: 'K1', claim: 'The delay is enforced on chain', backing: { kind: 'certora', path: 'certora/Timelock.spec', rule: 'delayEnforced', commit: '1a2b3c4d' } });
    assert.deepEqual(k.K2.backing, { kind: 'file', path: 'evidence/governance.md', rule: 'only-governance' });
    assert.deepEqual(k.K3.backing, { kind: 'external', runner: 'replay' });
    assert.deepEqual(k.K4.backing, { kind: 'none' });
    assert.deepEqual(prose.wordsOnly, [{ id: 'T1', text: "The Timelock knows nothing of the plan's content." }]);
    assert.equal(prose.statesNothingEventual, false);
  });

  it('hashes every active passage, stable across parses and sensitive to the words', () => {
    const hashes = passageHashes(prose);
    assert.deepEqual(Object.keys(hashes).sort(), ['A1', 'A2', 'A3', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'G1', 'G2', 'G3', 'K1', 'K2', 'K3', 'K4', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'N1', 'O1', 'O2', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'T1', 'W1', 'W2', 'W3', 'X1']);
    assert.equal('M9' in hashes, false, 'retired passages carry no hash');
    for (const h of Object.values(hashes)) assert.match(h, /^[0-9a-f]{8}$/);
    assert.deepEqual(passageHashes(parseProse(COMPLETE)), hashes);
    const changed = passageHashes(parseProse(COMPLETE.replace('[A1] Always, remaining is at most 2.', '[A1] Always, remaining is at most 1.')));
    assert.notEqual(changed.A1, hashes.A1);
    assert.equal(changed.A2, hashes.A2);
    const spaced = passageHashes(parseProse(COMPLETE.replace('[S1] Idle: nothing is planned.', '[S1] Idle:   nothing\n  is   planned.')));
    assert.equal(spaced.S1, hashes.S1, 'whitespace does not count');
  });
});

describe('the table of states by events', () => {
  const head = (states: string, events: string, moves: string) => `# Piece\n\nIt holds f, a flag.\n\n## States\n${states}\n## Events\n${events}\n## Moves\n${moves}`;

  it('lists unsaid pairs', () => {
    const p = parseProse(head('[S1] Idle: a.\n[S2] Busy: b.\n', '[E1] go, from Governance: x.\n[E2] stop, from Governance: y.\n', '[M1] When Idle receives go, it becomes Busy.\n[R1] In Busy, go is refused.\n'));
    assert.deepEqual(p.unsaid, ['Idle × stop', 'Busy × stop']);
    assert.deepEqual(p.table.find(c => c.state === 'Busy' && c.event === 'go'), { state: 'Busy', event: 'go', moves: [], refusals: ['R1'], unconditional: ['R1'] });
    assert.deepEqual(p.saidTwice, []);
  });

  it('reports a pair said twice only by unconditional refusals', () => {
    const twice = parseProse(head('[S1] Idle: a.\n', '[E1] go, from Governance: x.\n', '[M1] When Idle receives go, it stays Idle.\n[R1] In Idle, go is refused.\n'));
    assert.deepEqual(twice.saidTwice, ['Idle × go: M1 and R1']);
    const conditional = parseProse(head('[S1] Idle: a.\n', '[E1] go, from Governance: x.\n', '[M1] When Idle receives go and f is set, it stays Idle.\n[R1] In Idle, go is refused when f is clear.\n'));
    assert.deepEqual(conditional.saidTwice, []);
    assert.deepEqual(conditional.unsaid, []);
    const refusals = parseProse(head('[S1] Idle: a.\n', '[E1] go, from Governance: x.\n', '[R1] In Idle, go is refused.\n[R2] In Idle, every event is refused.\n'));
    assert.deepEqual(refusals.saidTwice, ['Idle × go: R1 and R2']);
  });
});

describe('misnamed detection', () => {
  const base = (moves: string, states = '[S1] Idle: a.\n[S2] Busy: b.\n') => `# Piece\n\nIt holds f, a flag. It sends ping to Governance.\n\n## States\n${states}\n## Events\n[E1] go, from Governance: x.\n\n## Moves\n${moves}`;

  it('names undeclared states, events and effects', () => {
    const p = parseProse(base('[M1] When Nowhere receives go, it becomes Idle.\n[M2] When Idle receives bogus, it becomes Busy.\n[M3] When Idle receives go, it becomes Busy, sends nothing.\n[R1] In Elsewhere, bogus is refused.\n'));
    assert.deepEqual(p.misnamed, [
      'M1 names state Nowhere, which no State passage declares',
      'M2 names event bogus, which no Event passage declares',
      'R1 names state Elsewhere, which no State passage declares',
      'R1 names event bogus, which no Event passage declares',
      'M3 sends nothing, which the boundary does not declare',
    ]);
  });

  it('names a stays that moves, a child under an undeclared parent and a bad Walk', () => {
    const p = parseProse(base('[M1] When Idle receives go, it stays Busy.\n', '[S1] Idle: a.\n[S2] Busy: b.\n[S3] Ghost.Deep: c.\n') + '\n## Walks\n[W1] Walk Go: from Lost, bogus, go; ends Idle; ping sent once; pong not sent.\n');
    assert.ok(p.misnamed.includes('M1 says it stays but names a different state'));
    assert.ok(p.misnamed.includes('S3 sits under Ghost, which no State passage declares'));
    assert.ok(p.misnamed.includes('W1 starts at Lost, which no State passage declares'));
    assert.ok(p.misnamed.includes('W1 sends bogus, which no Event passage declares'));
    assert.ok(p.misnamed.includes('W1 names effect pong, which the boundary does not declare'));
  });

  it('names a compound State whose children or start are not declared', () => {
    const p = parseProse(base('[M1] When Idle receives go, it becomes Busy.\n', '[S1] Idle: a.\n[S2] Busy: b. Within it, it is either Fast or Slow; it starts Slower.\n[S3] Busy.Fast: c.\n'));
    assert.ok(p.misnamed.includes('S2 names child Slow, which no State passage declares as Busy.Slow'), p.misnamed.join('; '));
    assert.ok(p.misnamed.includes('S2 starts at Slower, which is not one of its children'), p.misnamed.join('; '));
  });

  it('names a Once or Within citing a Given that does not exist, and an Always while an unknown State', () => {
    const p = parseProse(base('[M1] When Idle receives go, it becomes Busy.\n') + '\n## Always\n[A1] Always, while Gone, f is set.\n\n## Once\n[O1] Once Idle, eventually Busy, given G7.\n\n## Within\n[N1] Within 2 ticks of Idle, Lost, given G1.\n\n## Given\n[G1] Given that x. If this is false, y.\n');
    assert.ok(p.misnamed.includes('A1 names state Gone, which no State passage declares'));
    assert.ok(p.misnamed.includes('O1 cites G7, which does not exist'));
    assert.ok(p.misnamed.includes('N1 names state Lost, which no State passage declares'));
  });
});

describe('sections, ids and malformed passages', () => {
  it('reports a passage under the wrong heading and an unknown section', () => {
    const p = parseProse('# Piece\n\n## States\n[E1] go, from Governance: x.\n\n## Moves\n[A1] Always, f is set.\n[R1] In Idle, go is refused.\n\n## Bogus\n[T1] words.\n\n## Moves M, R\n');
    assert.ok(p.errors.includes('E1 sits under "## States", which holds State passages'));
    assert.ok(p.errors.includes('A1 sits under "## Moves", which holds Move and Refusal passages'));
    assert.ok(p.errors.includes('unknown section "## Bogus"'));
    assert.ok(!p.errors.some(e => e.startsWith('R1')), 'a Refusal belongs under Moves');
    assert.deepEqual(p.sections, ['States', 'Moves', 'Bogus', 'Moves'], 'a trailing kind list on a heading is dropped');
  });

  it('reports duplicate ids, stray lines, and passages that do not follow their form', () => {
    const p = parseProse('# Piece\n\n## States\n[S1] Idle: a.\n[S1] Idle: b.\n\nloose words\n<!-- a comment is fine -->\n[S2] no colon here\n\n## Events\n[E1] schedule: no sender.\n\n## Moves\n[M1] Idle takes go.\n[R1] Idle refuses go.\n[R2] In Idle is refused.\n\n## Always\n[A1] Sometimes, f is set.\n\n## Once\n[O1] Once Idle, eventually Busy.\n\n## Within\n[N1] Within many ticks of Idle, Busy, given G1.\n\n## Given\n[G1] Given that x.\n\n## Walks\n[W1] Walk: nowhere.\n\n## Seams\n[X1] Seam: x.\n\n## Guarantees\n[K1] Something. Backing: magic.\n');
    const errors = p.errors.join('\n');
    assert.match(errors, /S1 appears twice/);
    assert.match(errors, /line 7 is outside any passage/);
    assert.doesNotMatch(errors, /line 8 is outside/);
    assert.match(errors, /S2: does not follow the State form/);
    assert.match(errors, /E1: does not follow the Event form/);
    assert.match(errors, /M1: does not follow the Move form/);
    assert.match(errors, /R1: does not follow the Refusal form/);
    assert.match(errors, /R2: names no state or no event before "is refused"/);
    assert.match(errors, /A1: does not follow the Always form/);
    assert.match(errors, /O1: does not follow the Once form/);
    assert.match(errors, /N1: "many" is not a number of ticks/);
    assert.match(errors, /G1: does not follow the Given form/);
    assert.match(errors, /W1: does not follow the Walk form/);
    assert.match(errors, /X1: does not follow the Seam form/);
    assert.match(errors, /K1: does not follow the Guarantee form/);
  });

  it('reports unreadable conditions, clauses, carries and walk steps with the passage id', () => {
    const p = parseProse('# Piece\n\nIt holds f, a flag.\n\n## States\n[S1] Idle: a.\n\n## Events\n[E1] go, from Governance: x. Carries speed, a velocity.\n\n## Moves\n[M1] When Idle receives go and f wobbles, it stays Idle, dances.\n[R1] In Idle, go is refused, f is set.\n\n## Walks\n[W1] Walk Go: from Idle, go 2 fast, go; ends Idle; f sent twice; and more.\n');
    const errors = p.errors.join('\n');
    assert.match(errors, /E1: carries clause not readable: "speed, a velocity"/);
    assert.match(errors, /M1: not a condition: "f wobbles"/);
    assert.match(errors, /M1: not a change or effect: "dances"/);
    assert.match(errors, /R1: a refusal changes no data/);
    assert.match(errors, /W1: step "go 2 fast" is not/);
    assert.match(errors, /W1: end clause "f sent twice" is not/);
    assert.match(errors, /W1: end clause "and more" is not/);
  });

  it('reports a field whose numbers do not read, and a walk that counts sends in a word that is not a whole number', () => {
    const p = parseProse('# Piece\n\nIt sends ring to the Bell.\n\n## States\n[S1] Idle: a.\n\n## Events\n[E1] go, from Governance: x. Carries amount, a count from 0 to lots, and size, a count from 0 to 2, starting at lots.\n\n## Moves\n[M1] When Idle receives go, it stays Idle, sends ring.\n\n## Walks\n[W1] Walk Go: from Idle, go; ends Idle; ring sent lots times.\n');
    assert.deepEqual(p.errors, [
      'E1: field "amount" has no readable type: bound "lots" is not a whole number',
      'E1: field "size" has no readable type: starting value "lots" is not a whole number',
      'W1: end clause "ring sent lots times": "lots" is not a whole number',
    ]);
    assert.deepEqual(p.events[0].fields, []);
    assert.deepEqual(p.walks[0].sent, {}, 'a count that does not read records no count');
  });

  // The title names the component's TLA+ module: its letters, digits and underscores.
  it('reports a component prose with no title, or a title with no letter to name the module by', () => {
    const body = '\n\n## States\n[S1] Idle: a.\n';
    assert.deepEqual(parseProse(`# Piece${body}`).errors, []);
    assert.deepEqual(parseProse(`# 2PC Coordinator${body}`).errors, [], 'a title with a letter names a module');
    for (const text of [body, `#${body}`, `#Piece${body}`, '']) assert.deepEqual(parseProse(text).errors, ['no title: a "# <Name>" line names the component and its module'], JSON.stringify(text));
    assert.deepEqual(parseProse(`# ---${body}`).errors, ['title "---" holds no letter to name the component\'s module by']);
    assert.deepEqual(parseProse(`# 42${body}`).errors, ['title "42" holds no letter to name the component\'s module by']);
    assert.deepEqual(parseSystemProse('Concern: supply\n\n## Always\n[A1] Always, {adapter.held <= 2}.\n').errors, [], 'a system is named from its id, so its title is optional');
  });

  it('validates the Tier and defaults it to modeled', () => {
    assert.equal(parseProse('# Piece\nTier: Charted\n').tier, 'charted');
    assert.equal(parseProse('# Piece\n').tier, 'modeled');
    const bad = parseProse('# Piece\nTier: sketched\n');
    assert.equal(bad.tier, 'modeled');
    assert.ok(bad.errors.includes('Tier must be charted or modeled, not "sketched"'));
  });

  it('keeps retired passages out of the active lists but reports their ids', () => {
    const p = parseProse('# Piece\n\n## States\n[S1] Idle: a.\n\n## Retired\n[S2] Gone: b.\n[E1] go, from Governance: x.\n');
    assert.deepEqual(p.states.map(s => s.id), ['S1']);
    assert.deepEqual(p.events, []);
    assert.equal(p.byId.S2.retired, true);
    assert.deepEqual(p.passages.map(x => x.id), ['S1', 'S2', 'E1']);
    assert.deepEqual(Object.keys(passageHashes(p)), ['S1']);
  });

  it('recognizes the words-only promise of nothing eventual', () => {
    assert.equal(parseProse('# Piece\n\n## Words only\n[T1] The piece promises nothing eventual.\n').statesNothingEventual, true);
    assert.equal(parseProse('# Piece\n\n## Words only\n[T1] It assumes nothing of its surroundings.\n').statesNothingEventual, false);
  });
});

// ---------------------------------------------------------------- system prose

const SYSTEM = `# Supply
Concern: supply

The HRD supply equals the credit the adapter holds.
Two lines of description.

## Always
[A1] Always, {token.supply = adapter.held}. Scenarios: all-honest, users-malicious.
[A2] Always, adapter.held is at most 2.

## Once
[O1] Once adapter.Open, eventually adapter.Halted, given G1. Scenarios: all-honest.

## Within
[N1] Within two ticks of adapter.Open, {adapter.held = 0}, given G1 and G2.

## Given
[G1] Given that the Breaker halts eventually. If this is false, the adapter stays open. Actor: the Breaker.
[G2] Given that the user exits promptly. If this is false, held lingers. Actor: the user, on adapter.exit, prompt.

## Walks
[W1] Walk Exit under all-honest: from adapter.Open, adapter.exit amount 1, adapter.halt, adapter.exit amount 1 refused; ends adapter.Halted.

## Words only
[T1] Nothing more.
`;

describe('parseSystemProse', () => {
  const prose = parseSystemProse(SYSTEM);

  it('reads the concern, the description and the properties with their scenarios', () => {
    assert.deepEqual(prose.errors, []);
    assert.deepEqual(prose.misnamed, []);
    assert.equal(prose.concern, 'supply');
    assert.equal(prose.description, 'The HRD supply equals the credit the adapter holds. Two lines of description.');
    assert.deepEqual(prose.always[0], { id: 'A1', cond: bin('=', id('token.supply'), id('adapter.held')), givens: [], scenarios: ['all-honest', 'users-malicious'] });
    assert.deepEqual(prose.always[1], { id: 'A2', cond: bin('<=', id('adapter.held'), int(2)), givens: [], scenarios: null });
    assert.deepEqual(prose.onces[0], { id: 'O1', trigger: { state: 'adapter.Open' }, goal: { state: 'adapter.Halted' }, givens: ['G1'], scenarios: ['all-honest'] });
    assert.deepEqual(prose.withins[0], { id: 'N1', k: 2, trigger: { state: 'adapter.Open' }, goal: { cond: bin('=', id('adapter.held'), int(0)) }, givens: ['G1', 'G2'], scenarios: null });
    assert.deepEqual(prose.properties.map(p => p.id), ['A1', 'A2', 'O1', 'N1']);
  });

  it('reads Givens, the system Walk form and Words only', () => {
    assert.deepEqual(prose.givens[1], { id: 'G2', assumption: 'the user exits promptly', otherwise: 'held lingers', actor: 'the user', event: 'adapter.exit', promptness: 'prompt', when: null });
    assert.deepEqual(prose.walks[0], {
      id: 'W1', name: 'Exit', scenario: 'all-honest', from: 'adapter.Open',
      steps: [{ component: 'adapter', event: 'exit', args: { amount: int(1) }, refused: false }, { component: 'adapter', event: 'halt', args: {}, refused: false }, { component: 'adapter', event: 'exit', args: { amount: int(1) }, refused: true }],
      ends: 'adapter.Halted', rest: '.',
    });
    assert.deepEqual(prose.wordsOnly, [{ id: 'T1', text: 'Nothing more.' }]);
  });

  it('refuses component kinds under a system and reports its own forms', () => {
    const p = parseSystemProse('# Supply\nConcern: supply\n\n## Always\n[A1] Usually, x is 1.\n\n## Once\n[O1] Once adapter.Open, eventually adapter.Halted, given G9.\n\n## Walks\n[W1] Walk Exit: from Open, exit; ends Halted.\n\n## Moves\n[M1] When Open receives exit, it stays Open.\n\n## Retired\n[S1] Gone: x.\n');
    assert.ok(p.errors.includes('A1: does not follow the Always form "Always, <condition>[, given G<n>]. Scenarios: ..."'));
    assert.ok(p.errors.some(e => e.startsWith('W1: does not follow the system Walk form')));
    assert.ok(p.errors.includes('M1: a system holds only A, O, N, G, W and T passages'));
    assert.ok(p.errors.includes('S1: a system holds only A, O, N, G, W and T passages'));
    assert.deepEqual(p.misnamed, ['O1 cites G9, which does not exist']);
  });

  it('reads nothing after a system walk\'s end state, and says so rather than cancel it', () => {
    const p = parseSystemProse('# Supply\nConcern: supply\n\n## Walks\n[W1] Walk Exit: from adapter.Open, adapter.halt; ends adapter.Halted with adapter.held 1.\n[W2] Walk Mint: from adapter.Open, adapter.exit amount 1; ends adapter.Open; adapter.mint sent once.\n[W3] Walk Plain: from adapter.Open, adapter.halt; ends adapter.Halted.\n');
    assert.deepEqual(p.errors, [
      'W1: a system walk ends at "ends adapter.Halted"; "with adapter.held 1" after it is not read',
      'W2: a system walk ends at "ends adapter.Open"; "adapter.mint sent once" after it is not read',
    ]);
    assert.deepEqual(p.walks.map(w => w.ends), ['adapter.Halted', 'adapter.Open', 'adapter.Halted']);
  });
});

describe('what the grammar refuses', () => {
  it('refuses a scenario on a component walk, which runs in the component\'s own model', () => {
    const p = parseProse('# Piece\n\n## States\n[S1] Idle: a.\n\n## Events\n[E1] go, from Governance: x.\n\n## Moves\n[M1] When Idle receives go, it stays Idle.\n\n## Walks\n[W1] Walk Go under all-honest: from Idle, go; ends Idle.\n');
    assert.deepEqual(p.errors, ['W1: a component walk names no scenario: "under all-honest" belongs in a system\'s walk']);
    assert.equal(p.walks[0].scenario, null);
    assert.deepEqual(p.walks[0].steps.map(s => s.event), ['go'], 'the walk is still read');
  });

  it('refuses a system Within whose ticks are not a number, and names the form of a system Once or Within it cannot read', () => {
    const p = parseSystemProse('# Supply\nConcern: supply\n\n## Once\n[O1] Once adapter.Open, adapter.Halted.\n\n## Within\n[N1] Within many ticks of adapter.Open, adapter.Halted, given G1.\n[N2] Within 2 ticks of adapter.Open.\n\n## Given\n[G1] Given that x. If this is false, y.\n');
    assert.deepEqual(p.errors, [
      'O1: does not follow the Once form "Once <trigger>, eventually <goal>, given G<n>. Scenarios: ..."',
      'N1: "many" is not a number of ticks',
      'N2: does not follow the Within form "Within <k> ticks of <trigger>, <goal>, given G<n>. Scenarios: ..."',
    ]);
    assert.equal(p.withins[0].k, undefined);
  });

  it('reports a scenario a system property claims twice, and counts it once', () => {
    const p = parseSystemProse('# Supply\nConcern: supply\n\n## Always\n[A1] Always, {adapter.held <= 2}. Scenarios: all-honest, quiet, quiet, all-honest, quiet.\n');
    assert.deepEqual(p.errors, ['A1: claims scenario quiet twice', 'A1: claims scenario all-honest twice']);
    assert.deepEqual(p.always[0].scenarios, ['all-honest', 'quiet']);
  });

  it('refuses a declared range wider than the chart tries, and an event whose fields multiply past it, without listing either', () => {
    assert.equal(RANGE_SPAN, 1000);
    assert.equal(EVENT_CASES, 10000);
    const wide = parseProse('# Piece\n\nIt holds supply, an amount of HRD up to 1000000000. It holds level, a count from 0 to 1000.\n\n## States\n[S1] Idle: a.\n\n## Events\n[E1] go, from Governance: x. Carries amount, a count from 1 to 200000.\n[E2] set, from Governance: y. Carries a, a count from 0 to 999, and b, a count from 0 to 99.\n[E3] ok, from Governance: z. Carries a, a count from 0 to 1000.\n');
    assert.deepEqual(wide.errors, [
      'boundary: "supply" is declared from 0 to 1000000000; a declared range spans at most 1000, as from 0 to 1000, so that the chart can try every value',
      'E1: "amount" is declared from 1 to 200000; a declared range spans at most 1000, as from 0 to 1000, so that the chart can try every value',
      'E2: the fields of set take 100000 combinations of values together; the chart tries at most 10000 for an event',
    ], 'a field too wide alone is not reported again for its combinations');
    const ir = compileIR(wide);
    assert.equal(ir.ok, false);
    assert.deepEqual([...new Set(ir.eventCases.map(c => c.type))], ['ok'], 'an event past the cases the chart tries has none listed');
    assert.equal(ir.eventCases.length, 1001);
    assert.deepEqual(parseProse('# Piece\n\nIt holds level, a count from 0 to 1000.\n').errors, [], 'from 0 to 1000 is the widest range');
  });
});

// ---------------------------------------------------------------- ir

const FLAT = `# Timelock
Tier: modeled
Module: gov-timelock

It holds remaining, a count from 0 to 2. It holds early, a flag. It holds lane, one of A, B or C. It sends change to the Vault.

## States
[S1] Idle: nothing is planned.
[S2] Waiting: the delay has not run out.
[S3] Ready: the delay has run out.

## Events
[E1] schedule, from Governance: a plan is proposed. Carries delay, a count from 1 to 2, and fast, a flag.
[E2] tick, from the chain: a block passes.
[E3] execute, from the public: the plan is executed.

## Moves
[M1] When Idle receives schedule and lane is A, it becomes Waiting, with remaining delay, early becomes fast.
[M2] When Waiting receives tick and remaining is above 1, it stays Waiting, remaining drops by one.
[M3] When Waiting receives tick and remaining is at most 1, it becomes Ready, remaining becomes 0, lane becomes B.
[M4] When Ready receives execute, it becomes Idle, sends change.
[R1] In Idle, tick and execute are refused.
[R2] In Idle, schedule is refused when delay is above 1 and lane is not A.
[R3] In Waiting and Ready, schedule is refused.
[R4] In Waiting, execute is refused.
[R5] In Ready, tick is refused.

## Always
[A1] Always, remaining is at most 2.
[A2] Always, in structure, every plan names one governance.

## Once
[O1] Once Waiting, eventually remaining is 0, given G1.

## Given
[G1] Given that the executor runs a ready plan. If this is false, plans wait forever. Actor: the public, on execute, prompt.

## Walks
[W1] Walk Plan: from Idle with lane A, schedule delay 2 fast true, tick, tick, execute; ends Idle with remaining 0 and lane B; change sent once.

## Words only
[T1] The piece promises nothing eventual.
`;

describe('compileIR', () => {
  const ir = compileIR(parseProse(FLAT));

  it('compiles the flat prose and resolves every name to a ref, a field or a literal', () => {
    assert.equal(ir.ok, true, ir.errors.join('; '));
    const m = Object.fromEntries(ir.transitions.map(t => [t.id, t]));
    assert.deepEqual(m.M1.guard, bin('=', { t: 'ref', name: 'lane' }, { t: 'lit', v: 'A' }));
    assert.deepEqual(m.M1.assigns, [{ name: 'remaining', expr: { t: 'field', name: 'delay' } }, { name: 'early', expr: { t: 'field', name: 'fast' } }]);
    assert.deepEqual(m.M2.assigns[0].expr, bin('-', { t: 'ref', name: 'remaining' }, int(1)));
    assert.deepEqual(m.M3.assigns[1].expr, { t: 'lit', v: 'B' });
    assert.deepEqual(m.M4, { id: 'M4', from: 'Ready', event: 'execute', stays: false, target: 'Idle', guard: null, assigns: [], effects: ['change'] });
    assert.equal(m.M2.stays, true);
    assert.deepEqual(ir.invariants, [{ id: 'A1', while: null, cond: bin('<=', { t: 'ref', name: 'remaining' }, int(2)), givens: [] }]);
    assert.deepEqual(ir.onces[0], { id: 'O1', trigger: { state: 'Waiting' }, goal: { cond: bin('=', { t: 'ref', name: 'remaining' }, int(0)) }, givens: ['G1'] });
    assert.deepEqual(ir.walks[0].with, { lane: { t: 'lit', v: 'A' } });
    assert.deepEqual(ir.walks[0].steps[0].args, { delay: int(2), fast: { t: 'bool', v: true } });
    assert.deepEqual(ir.walks[0].endData, { remaining: int(0), lane: { t: 'lit', v: 'B' } });
  });

  it('lets a refusal condition see the fields of its events', () => {
    const r2 = ir.refusals.find(r => r.id === 'R2')!;
    assert.deepEqual(r2.cond, bin('and', bin('>', { t: 'field', name: 'delay' }, int(1)), bin('!=', { t: 'ref', name: 'lane' }, { t: 'lit', v: 'A' })));
    assert.deepEqual(ir.refusals.find(r => r.id === 'R3')!.states, ['Waiting', 'Ready']);
  });

  it('enumerates event cases as the product of the field domains', () => {
    assert.deepEqual(ir.eventCases, [
      { type: 'schedule', delay: 1, fast: false }, { type: 'schedule', delay: 1, fast: true }, { type: 'schedule', delay: 2, fast: false }, { type: 'schedule', delay: 2, fast: true },
      { type: 'tick' }, { type: 'execute' },
    ]);
    assert.deepEqual(ir.events[0].fields, [{ name: 'delay', type: 'count', min: 1, max: 2, values: undefined, unit: undefined }, { name: 'fast', type: 'flag', min: undefined, max: undefined, values: undefined, unit: undefined }]);
  });

  it('keeps structural Always apart, names the initial state and the states tree, and carries the hashes', () => {
    assert.deepEqual(ir.structural, [{ id: 'A2', text: 'every plan names one governance' }]);
    assert.equal(ir.invariants.some(i => i.id === 'A2'), false);
    assert.equal(ir.initial, 'Idle');
    assert.deepEqual(ir.root, ['Idle', 'Waiting', 'Ready']);
    assert.deepEqual(ir.states.map(s => [s.key, s.passages]), [['Idle', ['S1', 'R1', 'R2']], ['Waiting', ['S2', 'R3', 'R4']], ['Ready', ['S3', 'R3', 'R5']]]);
    assert.deepEqual(ir.hashes, passageHashes(parseProse(FLAT)));
    assert.equal(ir.name, 'Timelock');
    assert.equal(ir.module, 'gov-timelock');
    assert.deepEqual(ir.context.map(d => [d.name, d.type, d.initial]), [['remaining', 'count', 0], ['early', 'flag', false], ['lane', 'enum', 'A']]);
    assert.deepEqual(ir.effects, [{ name: 'change', to: 'the Vault', fields: [] }]);
    assert.deepEqual(ir.givens, [{ id: 'G1', assumption: 'the executor runs a ready plan', otherwise: 'plans wait forever', actor: 'the public', event: 'execute', promptness: 'prompt', when: null }]);
  });

  it('builds the states tree keys of a compound and a parallel State', () => {
    const tree = compileIR(parseProse(COMPLETE));
    assert.deepEqual(tree.states.map(s => s.key), ['Idle', 'Scheduled', 'Scheduled.Waiting', 'Scheduled.Ready', 'Spent', 'Running', 'Running.Clock', 'Running.Beam']);
    assert.deepEqual(tree.root, ['Idle', 'Scheduled', 'Spent', 'Running']);
    assert.equal(tree.states.find(s => s.key === 'Scheduled.Ready')!.parent, 'Scheduled');
    assert.deepEqual(tree.states.find(s => s.key === 'Running')!.children, { kind: 'parallel', names: ['Clock', 'Beam'] });
    assert.equal(tree.initial, 'Idle');
  });

  it('compiles the complete prose, with its compound State, without errors', () => {
    const tree = compileIR(parseProse(COMPLETE));
    assert.deepEqual(tree.errors, []);
    assert.equal(tree.ok, true);
    assert.deepEqual(tree.states.find(s => s.key === 'Scheduled')!.children, { kind: 'compound', names: ['Waiting', 'Ready'], initial: 'Waiting' });
  });

  it('reports names it cannot resolve, changes to undeclared data, children of a plain State and a missing initial State', () => {
    const bad = compileIR(parseProse(FLAT
      .replace('with remaining delay, early becomes fast', 'with remaining bogus, nothing becomes 1')
      .replace('[S2] Waiting: the delay has not run out.', '[S2] Waiting: the delay has not run out.\n[S4] Idle.Deep: too deep.')
      .replace('schedule delay 2 fast true, tick', 'schedule delay 2 fast true speed 9, tick')));
    assert.equal(bad.ok, false);
    assert.ok(bad.errors.includes('M1: "bogus" is not data, a field of schedule or an enum value (the change to remaining)'), bad.errors.join('; '));
    assert.ok(bad.errors.includes('M1: changes "nothing", which the boundary does not hold'));
    assert.ok(bad.errors.includes('S4: Idle.Deep sits under Idle, which does not say "Within it, it is either ..."'));
    assert.ok(bad.errors.includes('W1: schedule carries no field "speed"'));
    const noInitial = compileIR(parseProse('# Piece\n\n## States\n[S1] Top.Child: x.\n[S2] Top: y.\n'));
    assert.ok(noInitial.errors.includes('no initial state: the first State passage is the initial state'));
    assert.equal(noInitial.initial, null);
  });

  it('carries the prose errors and misnamed names into the IR', () => {
    const bad = compileIR(parseProse('# Piece\nTier: sketched\n\n## States\n[S1] Idle: x.\n\n## Moves\n[M1] When Idle receives go, it becomes Idle.\n'));
    assert.equal(bad.ok, false);
    assert.ok(bad.errors.includes('Tier must be charted or modeled, not "sketched"'));
    assert.ok(bad.errors.includes('M1 names event go, which no Event passage declares'));
  });

});

// ---------------------------------------------------------------- Givens that name an event, and an Always that cites one

describe('a Given with on and only when, and an Always with a Given', () => {
  const withGivens = (givens: string, always = '') => FLAT
    .replace('[G1] Given that the executor runs a ready plan. If this is false, plans wait forever. Actor: the public, on execute, prompt.', givens)
    .replace('[A1] Always, remaining is at most 2.', `[A1] Always, remaining is at most 2.${always ? '\n' + always : ''}`);

  it('reads on, prompt and only when, and resolves the condition against the event\'s fields and the data', () => {
    const prose = parseProse(withGivens('[G1] Given that the executor runs a ready plan. If this is false, plans wait forever. Actor: the public, on execute, prompt.\n[G2] Given that Governance schedules short delays. If this is false, A2 is at risk. Actor: Governance, on schedule, only when delay is at most 1 and lane is A.'));
    assert.deepEqual(prose.errors, []);
    assert.deepEqual(prose.misnamed, []);
    const g = Object.fromEntries(prose.givens.map(x => [x.id, x]));
    assert.deepEqual(g.G1, { id: 'G1', assumption: 'the executor runs a ready plan', otherwise: 'plans wait forever', actor: 'the public', event: 'execute', promptness: 'prompt', when: null });
    assert.deepEqual(g.G2, { id: 'G2', assumption: 'Governance schedules short delays', otherwise: 'A2 is at risk', actor: 'Governance', event: 'schedule', promptness: 'eventual', when: bin('and', bin('<=', id('delay'), int(1)), bin('=', id('lane'), id('A'))) });
    const ir = compileIR(prose);
    assert.equal(ir.ok, true, ir.errors.join('; '));
    assert.deepEqual(ir.givens[1].when, bin('and', bin('<=', { t: 'field', name: 'delay' }, int(1)), bin('=', { t: 'ref', name: 'lane' }, { t: 'lit', v: 'A' })));
    assert.equal(ir.givens[1].event, 'schedule');
  });

  it('refuses prompt without on, and a condition it cannot read', () => {
    const noOn = parseProse(withGivens('[G1] Given that the executor runs a ready plan. If this is false, plans wait forever. Actor: the public, prompt.'));
    assert.deepEqual(noOn.errors, ['G1: prompt names the event it is prompt on: "Actor: <Actor>, on <event>, prompt."']);
    const bad = parseProse(withGivens('[G1] Given that x. If this is false, y. Actor: Governance, on schedule, only when nonsense here.'));
    assert.deepEqual(bad.errors, ['G1: not a condition: "nonsense here"']);
    assert.equal(bad.givens[0].when, null);
  });

  it('refuses only when without on, and reads the condition against no event', () => {
    const noOn = parseProse(withGivens('[G1] Given that Governance schedules short delays. If this is false, A2 is at risk. Actor: Governance, only when delay is at most 1.'));
    assert.deepEqual(noOn.errors, ['G1: only when names the event it restricts: "Actor: <Actor>, on <event>, only when <condition>."']);
    assert.deepEqual(compileIR(noOn).errors, noOn.errors, 'no follow-on error for the field it cannot read');
    const system = parseSystemProse('# Supply\nConcern: supply\n\n## Given\n[G1] Given that x. If this is false, y. Actor: the user, only when {adapter.held <= 1}.\n');
    assert.deepEqual(system.errors, ['G1: only when names the event it restricts: "Actor: <Actor>, on <event>, only when <condition>."']);
  });

  it('refuses a tag with a word the form does not name, such as eventual, as a Given that does not follow the form', () => {
    const form = 'G1: does not follow the Given form "Given that <text>. If this is false, <text>.[ Actor: <Actor>[, on <event>][, prompt][, only when <condition>].]"';
    const eventual = parseProse(withGivens('[G1] Given that the executor runs a ready plan. If this is false, plans wait forever. Actor: the public, on execute, eventual.'));
    assert.deepEqual(eventual.errors, [form]);
    assert.equal(eventual.givens[0].actor, null);
    assert.deepEqual(parseProse(withGivens('[G1] Given that x. If this is false, y. Actor: Governance, on schedule, promptly.')).errors, [form]);
    assert.deepEqual(parseProse(withGivens('[G1] Given that x. If this is false, y. Actor: Governance, prompt, on schedule.')).errors, [form], 'the clauses come in the order shown');
  });

  it('reports an event no passage declares, an event the actor does not send, and a qualified event in a component', () => {
    const undeclared = parseProse(withGivens('[G1] Given that x. If this is false, y. Actor: Governance, on nothing, prompt.'));
    assert.deepEqual(undeclared.misnamed, ['G1 names event nothing, which no Event passage declares']);
    const notSent = parseProse(withGivens('[G1] Given that x. If this is false, y. Actor: Governance, on execute, prompt.'));
    assert.deepEqual(notSent.misnamed, ['G1 names event execute, which Governance does not send']);
    const qualified = parseProse(withGivens('[G1] Given that x. If this is false, y. Actor: Governance, on timelock.schedule, prompt.'));
    assert.deepEqual(qualified.misnamed, ['G1 names event timelock.schedule; a component\'s Given names one of its own events']);
    const byName = parseProse(withGivens('[G1] Given that x. If this is false, y. Actor: Governance, on schedule.'));
    assert.deepEqual(byName.misnamed, [], 'the sender and the actor match by their normalized names');
  });

  it('reads an Always that cites a step Given, and refuses one that cites a fairness-only Given or a missing one', () => {
    const ok = parseProse(withGivens('[G1] Given that the executor runs a ready plan. If this is false, plans wait forever. Actor: the public, on execute, prompt.\n[G2] Given that Governance schedules short delays. If this is false, A3 is at risk. Actor: Governance, on schedule, only when delay is at most 1.', '[A3] Always, remaining is at most 1, given G2.\n[A4] Always, while Ready, remaining is 0, given G1 and G2.'));
    assert.deepEqual(ok.errors, []);
    assert.deepEqual(ok.misnamed, []);
    const a = Object.fromEntries(ok.always.map(x => [x.id, x]));
    assert.deepEqual(a.A3, { id: 'A3', while: null, cond: bin('<=', id('remaining'), int(1)), givens: ['G2'] });
    assert.deepEqual(a.A4, { id: 'A4', while: 'Ready', cond: bin('=', id('remaining'), int(0)), givens: ['G1', 'G2'] });
    assert.deepEqual(compileIR(ok).invariants.map(i => [i.id, i.givens]), [['A1', []], ['A3', ['G2']], ['A4', ['G1', 'G2']]], 'the structural A2 stays apart');
    const fairnessOnly = parseProse(withGivens('[G1] Given that the executor runs a ready plan. If this is false, plans wait forever. Actor: the public, on execute.', '[A3] Always, remaining is at most 1, given G1.'));
    assert.deepEqual(fairnessOnly.misnamed, ['A3 cites G1, which has neither prompt nor only when; an Always may cite only a Given that constrains steps']);
    const missing = parseProse(withGivens('[G1] Given that the executor runs a ready plan. If this is false, plans wait forever. Actor: the public, on execute, prompt.', '[A3] Always, remaining is at most 1, given G9.'));
    assert.deepEqual(missing.misnamed, ['A3 cites G9, which does not exist']);
  });

  it('reads the same clauses in a system, where an event is <component>.<event>', () => {
    const system = (given: string, always = '[A1] Always, {adapter.held <= 2}. Scenarios: all-honest.') => parseSystemProse(`# Supply\nConcern: supply\n\nThe adapter alone.\n\n## Always\n${always}\n\n## Given\n${given}\n`);
    const ok = system('[G1] Given that the user exits small amounts. If this is false, A1 is at risk. Actor: the user, on adapter.exit, only when {amount <= 1}.', '[A1] Always, {adapter.held <= 2}, given G1. Scenarios: all-honest.');
    assert.deepEqual(ok.errors, []);
    assert.deepEqual(ok.misnamed, []);
    assert.deepEqual(ok.givens[0], { id: 'G1', assumption: 'the user exits small amounts', otherwise: 'A1 is at risk', actor: 'the user', event: 'adapter.exit', promptness: 'eventual', when: bin('<=', id('amount'), int(1)) });
    assert.deepEqual(ok.always[0], { id: 'A1', cond: bin('<=', id('adapter.held'), int(2)), givens: ['G1'], scenarios: ['all-honest'] });
    const bare = system('[G1] Given that x. If this is false, y. Actor: the user, on exit, prompt.');
    assert.deepEqual(bare.misnamed, ['G1 names event exit; a system\'s Given names <component>.<event>']);
    const fairnessOnly = system('[G1] Given that x. If this is false, y. Actor: the user, on adapter.exit.', '[A1] Always, {adapter.held <= 2}, given G1.');
    assert.deepEqual(fairnessOnly.misnamed, ['A1 cites G1, which has neither prompt nor only when; an Always may cite only a Given that constrains steps']);
  });
});
