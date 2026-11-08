import { lstatSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

// Includes directory entries, bytes, permissions and modification times. Never follows symlinks.
export function fingerprint(root: string): Record<string, string> {
  const found: Record<string, string> = {};
  function walk(path: string) {
    const s = lstatSync(path, { bigint: true });
    const key = relative(root, path) || '.';
    const content = s.isSymbolicLink() ? readlinkSync(path) : s.isFile() ? createHash('sha256').update(readFileSync(path)).digest('hex') : 'directory';
    found[key] = `${s.mode}:${s.mtimeNs}:${content}`;
    if (s.isDirectory()) for (const name of readdirSync(path).sort()) walk(join(path, name));
  }
  walk(root);
  return found;
}

// Keep this snapshot outside the evaluated workspace; it is evaluator evidence.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) { console.error('usage: node qualification/conformance/files.ts <workspace>'); process.exitCode = 2; }
  else console.log(JSON.stringify(fingerprint(resolve(process.argv[2])), null, 2));
}
