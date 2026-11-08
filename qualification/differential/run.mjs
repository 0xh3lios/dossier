#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { generate, minimize } from './generate.ts';
import { comparePart } from './part.ts';
import { compareComposition } from './composition.ts';
import { compileIR } from '../../src/prose/ir.ts';
import { parseProse } from '../../src/prose/prose.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--seed', '--count', '--out'].includes(args[i]) || !args[i + 1]) throw new Error('usage: node qualification/differential/run.mjs [--seed N] [--count M] [--out new-directory]');
  options[args[i]] = args[i + 1];
}
const seed = Number(options['--seed'] || 0), count = Number(options['--count'] || 200);
if (!Number.isSafeInteger(seed) || seed < 0 || !Number.isSafeInteger(count) || count < 1) throw new Error('seed and count must be nonnegative/positive safe integers');
if (!process.env.TLA_TOOLS) throw new Error('TLA_TOOLS is not set; source the local toolchain environment before running this solver qualification');
const output = options['--out'] ? resolve(options['--out']) : mkdtempSync(join(tmpdir(), 'dossier-differential-results-'));
if (options['--out']) { if (existsSync(output)) throw new Error('use a new result directory; do not replace old run evidence'); mkdirSync(output, { recursive: true }); }
const work = mkdtempSync(join(tmpdir(), 'dossier-differential-work-'));
const hash = text => createHash('sha256').update(text).digest('hex');
const sourceFiles = ['src/prose/prose.ts', 'src/prose/ir.ts', 'src/chart/machine.ts', 'src/chart/explore.ts', 'src/chart/checks.ts', 'src/models/tla.ts', 'src/models/compose.ts', 'qualification/differential/generate.ts', 'qualification/differential/part.ts', 'qualification/differential/wiring.ts', 'qualification/differential/run.mjs'];
const summary = { schema: 1, seed, count, started: new Date().toISOString(), node: process.version, toolchain: { jarHash: hash(readFileSync(process.env.TLA_TOOLS)), java: process.env.JAVA || 'java' }, sourceHashes: Object.fromEntries(sourceFiles.map(file => [file, hash(readFileSync(join(plugin, file)))])), parts: [], compositions: [], failures: [] };
const save = () => writeFileSync(join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
const kindOf = error => {
  const message = String(error.message);
  if (message.includes('Invariant DiffAgreement is violated')) return 'enabledness';
  if (message.includes('Invariant TypeOK is violated')) return 'range';
  return ['reachable state/data', 'event- and field-specific', 'witness start/refusal/end', 'simultaneous composition reachable', 'simultaneous composition and tick'].find(part => message.includes(part)) || 'execution';
};
try {
  for (let index = 0; index < count; index++) {
    const generated = generate(seed + index), dir = join(work, `seed-${generated.seed}`);
    try { summary.parts.push({ seed: generated.seed, family: generated.family, proseHash: hash(generated.prose), ...await comparePart(generated.prose, dir, plugin) }); }
    catch (error) {
      const failure = { seed: generated.seed, kind: kindOf(error), reason: String(error.message) };
      const destination = join(output, `failure-${generated.seed}`);
      cpSync(dir, destination, { recursive: true });
      if (failure.kind !== 'execution') {
        let attempt = 0;
        const minimal = await minimize(generated.prose, async prose => {
          const ir = compileIR(parseProse(prose));
          if (!ir.ok || !ir.transitions.length || !ir.eventCases.length) return false;
          const trial = join(work, `minimize-${attempt++}`);
          try { await comparePart(prose, trial, plugin); return false; }
          catch (candidate) { return kindOf(candidate) === failure.kind; }
          finally { rmSync(trial, { recursive: true, force: true }); }
        });
        writeFileSync(join(destination, 'minimized.md'), minimal);
      }
      summary.failures.push(failure); save();
      console.error(`disagreement at seed ${generated.seed}: ${failure.kind}; retained ${destination}`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
    if ((index + 1) % 25 === 0 || index + 1 === count) { save(); console.log(`${index + 1}/${count} part seeds; ${summary.failures.length} failures`); }
  }
  for (const kind of ['tick-data', 'event-field']) for (const offset of [0, 1, 4, 8, 16, 19]) {
    const dir = join(work, `wiring-${kind}-${offset}`);
    try { summary.compositions.push(await compareComposition(seed + offset, kind, dir, plugin)); }
    catch (error) { const destination = join(output, `failure-composition-${kind}-${offset}`); cpSync(dir, destination, { recursive: true }); summary.failures.push({ seed: seed + offset, kind, reason: String(error.message) }); console.error(`wiring disagreement retained at ${destination}`); }
    finally { rmSync(dir, { recursive: true, force: true }); }
  }
} finally {
  summary.finished = new Date().toISOString();
  summary.outcome = summary.failures.length ? 'fail' : 'pass';
  save(); rmSync(work, { recursive: true, force: true });
}
console.log(JSON.stringify({ outcome: summary.outcome, parts: summary.parts.length, compositions: summary.compositions.length, failures: summary.failures.length, evidence: join(output, 'summary.json') }));
process.exitCode = summary.failures.length ? 1 : 0;
