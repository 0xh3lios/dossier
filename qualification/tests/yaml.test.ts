import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYaml, yamlBlocks, recordsOf } from '../../src/prose/yaml.ts';
import type { YamlMap } from '../../src/prose/yaml.ts';

const md = (...lines: string[]) => lines.join('\n');
const throwsAt = (text: string, line: number, pattern: string) =>
  assert.throws(() => parseYaml(text), { message: new RegExp(`^yaml line ${line}: .*${pattern}`), line });

test('comments and blank lines', () => {
  const v = parseYaml(md(
    '# leading comment',
    '',
    'a: 1 # trailing',
    '  # indented comment line',
    'b: "x # not a comment"',
    "c: 'y # neither'",
    'd: C#',
    'e: http://x/#frag',
    '',
    'f: # only a comment',
    '# end',
  ));
  assert.deepEqual(v, { a: 1, b: 'x # not a comment', c: 'y # neither', d: 'C#', e: 'http://x/#frag', f: null });
  assert.equal(parseYaml(''), null);
  assert.equal(parseYaml('# nothing\n\n'), null);
});

test('block mappings', () => {
  const v = parseYaml(md(
    'a.b: 1',
    '$ref: x',
    'path/to-it_2: y',
    'nested:',
    '    deep:',
    '          deeper: z',
    '    sibling: w',
    'empty:',
    '"quoted key": q',
    "'single': s",
    'after: done',
  ));
  assert.deepEqual(v, {
    'a.b': 1, $ref: 'x', 'path/to-it_2': 'y',
    nested: { deep: { deeper: 'z' }, sibling: 'w' },
    empty: null, 'quoted key': 'q', single: 's', after: 'done',
  });
  assert.deepEqual(parseYaml('---\r\na: 1\r\n'), { a: 1 });
  assert.deepEqual(parseYaml('\uFEFFa: 1'), { a: 1 });
  assert.deepEqual(Object.keys(parseYaml('__proto__: 1\nconstructor: 2') as YamlMap), ['__proto__', 'constructor']);
});

test('block sequences', () => {
  const v = parseYaml(md(
    'items:',
    '  - plain',
    '  - - nested',
    '    - seq',
    '  -',
    '    - on the next line',
    '  - id: x',
    '    kind: y',
    '    tags:',
    '    - a',
    '  -',
    '    id: z',
    '    "quoted": q',
    '  -',
    '  - "quoted"',
    '  - # just a comment',
    'top:',
    '- same indent',
    '- "id": on the dash line',
    '  n: 2',
    'last: 1',
  ));
  assert.deepEqual(v, {
    items: [
      'plain', ['nested', 'seq'], ['on the next line'],
      { id: 'x', kind: 'y', tags: ['a'] }, { id: 'z', quoted: 'q' }, null, 'quoted', null,
    ],
    top: ['same indent', { id: 'on the dash line', n: 2 }],
    last: 1,
  });
  assert.deepEqual(parseYaml('- a\n- b'), ['a', 'b']);
});

test('scalars', () => {
  const v = parseYaml(md(
    'str: plain text with: colon and - dash',
    'int: 42',
    'neg: -7',
    'dec: 3.14',
    'notnum1: 1e5',
    'notnum2: 0x1f',
    'date: 2026-09-23',
    'notnum3: 1.',
    'notnum4: .5',
    'notnum5: +3',
    't: true',
    'f: false',
    'n1: null',
    'n2: ~',
    'n3:',
    'dq: "a\\"b\\\\c\\nd\\te\\u00e9\\/"',
    "sq: 'it''s \\n raw'",
    'q1: "true"',
    'q2: "1"',
    'words: True',
  ));
  assert.deepEqual(v, {
    str: 'plain text with: colon and - dash', int: 42, neg: -7, dec: 3.14,
    notnum1: '1e5', notnum2: '0x1f', date: '2026-09-23', notnum3: '1.', notnum4: '.5', notnum5: '+3',
    t: true, f: false, n1: null, n2: null, n3: null,
    dq: 'a"b\\c\nd\teé/', sq: "it's \\n raw", q1: 'true', q2: '1', words: 'True',
  });
  assert.equal(parseYaml('"top level"'), 'top level');
  assert.equal(parseYaml('  12  '), 12);
});

test('flow sequences and mappings', () => {
  const v = parseYaml(md(
    'seq: [a, "b, c", 1, true, null, [x, [y]], {k: v}]',
    "map: { a: b, c: [1, 2], d: { e: 'f]g' }, \"q k\": 1, empty: }",
    'empty_seq: []',
    'empty_map: {}',
    'spaced: [ ]',
    'refs: [gov-timelock#observation:finalized-state-2026-09-07, contract:gov-timelock]',
    'trailing: [a, b,] # comment',
    'dash: ["- not an item", a - b]',
    'list:',
    '  - [1, 2]',
    '  - { x: [ { y: z } ] }',
  ));
  assert.deepEqual(v, {
    seq: ['a', 'b, c', 1, true, null, ['x', ['y']], { k: 'v' }],
    map: { a: 'b', c: [1, 2], d: { e: 'f]g' }, 'q k': 1, empty: null },
    empty_seq: [], empty_map: {}, spaced: [],
    refs: ['gov-timelock#observation:finalized-state-2026-09-07', 'contract:gov-timelock'],
    trailing: ['a', 'b'],
    dash: ['- not an item', 'a - b'],
    list: [[1, 2], { x: [{ y: 'z' }] }],
  });
  assert.deepEqual(parseYaml('[1, 2]'), [1, 2]);
});

test('block scalars', () => {
  const v = parseYaml(md(
    'lit: |',
    '    first',
    '      indented',
    '',
    '    # not a comment',
    '    last',
    '',
    '',
    'strip: |-',
    '  a',
    '  b',
    'keep: |+',
    '  a',
    '',
    'fold: > # comment',
    '  one',
    '  two',
    '',
    '  three',
    '',
    '',
    '  four',
    'item:',
    '  - |',
    '    in a list',
    '  - >-',
    '    folded',
    '    item',
    'empty: |',
    'after: 1',
  ));
  assert.deepEqual(v, {
    lit: 'first\n  indented\n\n# not a comment\nlast\n',
    strip: 'a\nb',
    keep: 'a\n\n',
    fold: 'one two\nthree\n\nfour\n',
    item: ['in a list\n', 'folded item'],
    empty: '',
    after: 1,
  });
});

test('a comment after a value is dropped', () => {
  const v = parseYaml(md(
    'kind: deposit # one of: deposit, withdraw',
    'name: ""',
    '# one of: a, b,',
    '# c',
    'other: x',
    'list: [] # typed targets, such as contract:<local-id>',
    'ref: null # select later',
    'items:',
    '  - a # first',
    '  - "b" # second',
  ));
  assert.deepEqual(v, { kind: 'deposit', name: '', other: 'x', list: [], ref: null, items: ['a', 'b'] });
});

test('"- " inside a quoted string does not start an item', () => {
  assert.deepEqual(parseYaml(md('- "- a"', "- '- b'", '- x - y', '- "c"')), ['- a', '- b', 'x - y', 'c']);
  assert.deepEqual(parseYaml('name: "a - b"\nflow: ["- c"]'), { name: 'a - b', flow: ['- c'] });
});

test('malformed input throws with the line number', () => {
  throwsAt('a: 1\nb: &anchor x', 2, '"&" is not supported');
  throwsAt('a: *alias', 1, '"\\*" is not supported');
  throwsAt('a: !!str 1', 1, '"!" is not supported');
  throwsAt('a: [1, &x]', 1, 'anchors');
  throwsAt('a: 1\n---\nb: 2', 2, 'multi-document');
  throwsAt('a: 1\n...', 2, 'multi-document');
  throwsAt('%YAML 1.2\na: 1', 1, 'directives');
  throwsAt('? complex\n: key', 1, 'complex keys');
  throwsAt('a:\n\tb: 1', 2, 'tabs');
  throwsAt('a: 1\n  b: 2', 2, 'unexpected indentation$');
  throwsAt('a: 1\na: 2', 2, 'duplicate key "a"');
  throwsAt('a: "open', 1, 'unterminated quoted string');
  throwsAt('a: "\\q"', 1, 'unknown escape \\\\q');
  throwsAt('a: [1, 2', 1, 'unterminated flow');
  throwsAt('a: [1, , 2]', 1, 'missing value');
  throwsAt('a: {b 1}', 1, 'expected ":"');
  throwsAt('a: [1] junk', 1, 'unexpected text');
  throwsAt('a: "x" y', 1, 'unexpected text');
  throwsAt('- a\nb: 1', 2, 'unexpected content');
  throwsAt('a:\n  - 1\n  b: 2', 3, 'unexpected indentation$');
  throwsAt('a: |2\n  x', 1, 'block scalar header');
  throwsAt('a: 1\n- b', 2, 'sequence item');
  throwsAt('- a\n  b', 2, 'multi-line scalars');
  throwsAt('just text\nmore', 2, 'unexpected content');
  throwsAt('a: 1\nno key here', 2, 'expected "key: value"');
});

test('yamlBlocks finds every yaml fence with its line', () => {
  const text = md(
    '# Title',
    '',
    '```yaml',
    'a: 1',
    '```',
    '',
    '```solidity',
    'contract: not yaml',
    '```',
    '',
    '```',
    'b: 2',
    '```',
    '',
    '````markdown',
    '```yaml',
    'c: 3',
    '```',
    '````',
    '',
    '~~~yaml',
    'd: [4]',
    '~~~',
    '',
    '  ```yaml extra info',
    '  e: 5',
    '  ```',
    '',
    '```yaml',
    '```',
  );
  assert.deepEqual(yamlBlocks(text).map((b) => [b.line, b.text, b.value]), [
    [3, 'a: 1', { a: 1 }],
    [21, 'd: [4]', { d: [4] }],
    [25, 'e: 5', { e: 5 }],
    [29, '', null],
  ]);
  assert.deepEqual(yamlBlocks('no fences\n'), []);
});

test('a yaml block that fails to parse throws with the markdown line', () => {
  const text = md('intro', '', '```yaml', 'a: 1', 'a: 2', '```');
  assert.throws(() => yamlBlocks(text), { message: 'yaml line 5: duplicate key "a"', line: 5 });
  assert.throws(() => yamlBlocks(md('text', '```yaml', 'a: 1')), { message: 'yaml line 2: unterminated yaml block', line: 2 });
});

test('recordsOf merges the blocks of a file', () => {
  const text = md(
    '## Actors', '```yaml', 'actors:', '  - id: a', 'count: 1', 'name: first', '```',
    '## More', '```yaml', 'actors:', '  - id: b', 'count: [2]', 'name: second', '```',
    '```yaml', '# empty block', '```',
  );
  assert.deepEqual(recordsOf(text), { actors: [{ id: 'a' }, { id: 'b' }], count: [2], name: 'second' });
  assert.deepEqual(recordsOf('no blocks'), {});
  assert.throws(() => recordsOf(md('```yaml', '- a', '```')), { message: 'yaml line 1: the block is not a mapping' });
});
