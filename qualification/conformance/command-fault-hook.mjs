// Test-only preload: kill the real CLI immediately after one filesystem rename.
// It adds no production fault switch and never changes the checked-out source.
// An answer's publication renames three times (STORE-ANSWER): integrity.json binds the candidate,
// the candidate becomes evidence/<name>.json, and the bundle moves to trials/<id>. A decision's
// publication renames decisions.log before the manifest binds it.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const selected = process.env.DOSSIER_QUAL_FAULT;
const directory = process.env.DOSSIER_QUAL_FAULT_DIR;
const after = {
  manifest: (target, scope) => target === join(scope, 'integrity.json'),
  entry: (target, scope) => dirname(target) === join(scope, 'evidence'),
  bundle: (target, scope) => dirname(target) === join(scope, 'trials'),
  decision: (target, scope) => target === join(scope, 'decisions.log'),
};
if (!Object.hasOwn(after, selected) || !directory) throw new Error('invalid command qualification fault configuration');
const scope = resolve(directory);
const rename = fs.renameSync;
fs.renameSync = function (from, to) {
  rename(from, to);
  if (after[selected](resolve(String(to)), scope)) process.kill(process.pid, 'SIGKILL');
};
syncBuiltinESMExports();
