// The receipt: hashes of the runner-written files and of what was executed.
// Raw output beyond the size limit is stored outside the repository by hash.
import { lstatSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileHash, sha256 } from '../hash.ts';

// Where output.txt's text went: whole in the trial, in the evidence store, or truncated.
export interface PlacedOutput { hash: string; size: number; stored: 'trial' | 'external' | 'truncated' }
// receipt.json: who ran it, when, the hashes of the runner-written files and of every executed file.
export interface Receipt { runner: string; at: string; files: Record<string, string>; output: PlacedOutput; executed: Record<string, string> }

export const RECEIPTED = ['call.md', 'result.json'];
export const OUTPUT_LIMIT = 512 * 1024;

// A canonical artifact name is a portable, relative path inside this bundle. The receipt cannot
// list itself.
export function sealedArtifactName(name: string): boolean {
  return Boolean(name) && !name.includes('\\') && !/^[A-Za-z]:/.test(name)
    && name.split('/').every(part => part !== '' && part !== '.' && part !== '..' && part !== '.DS_Store')
    && name !== 'receipt.json';
}

// Inspect the complete tree before reading artifact bytes. A parent directory
// such as alloy/ must not redirect a child outside the sealed bundle. Ancestor
// aliases above the supplied bundle root (for example macOS /tmp) are allowed.
export function sealedFileHashes(dir: string): Record<string, string> {
  const files: string[] = [];
  const root = lstatSync(dir);
  if (root.isSymbolicLink() || !root.isDirectory()) throw new Error('the trial bundle must be a directory, not a symbolic link or special file');
  const walk = (folder: string, prefix: string): void => {
    for (const name of readdirSync(folder).sort()) {
      const relative = prefix ? `${prefix}/${name}` : name;
      if (name.includes('\\') || /^[A-Za-z]:/.test(name)) throw new Error(`noncanonical sealed artifact path: ${relative}`);
      const path = join(folder, name), stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`symbolic link in trial bundle: ${relative}`);
      if (name === '.DS_Store') {
        if (!stat.isFile()) throw new Error(`not a regular trial file: ${relative}`);
        continue;
      }
      if (stat.isDirectory()) walk(path, relative);
      else if (stat.isFile()) files.push(relative);
      else throw new Error(`not a regular trial file: ${relative}`);
    }
  };
  walk(dir, '');
  return Object.fromEntries(files.sort().map(name => [name, fileHash(join(dir, name))]));
}

// The sorted JSON array of [relative POSIX path, SHA-256 of file bytes] pairs
// binds names as well as content, without delimiter ambiguity. The unchanged
// receipt is included; Finder metadata is not evidence.
export function bundleDigest(dir: string): string {
  const inventory = Object.entries(sealedFileHashes(dir)).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return sha256(JSON.stringify(inventory));
}

export function placeOutput(dir: string, text: string, { limit = OUTPUT_LIMIT, store = process.env.DOSSIER_EVIDENCE_STORE }: { limit?: number; store?: string } = {}): PlacedOutput {
  const hash = sha256(text);
  const size = Buffer.byteLength(text);
  if (size <= limit) { writeFileSync(join(dir, 'output.txt'), text); return { hash, size, stored: 'trial' }; }
  if (store) {
    mkdirSync(store, { recursive: true });
    writeFileSync(join(store, `${hash}.txt`), text);
    writeFileSync(join(dir, 'output.txt'), `stored outside the repository as ${hash}.txt under the evidence store (${size} bytes)\n`);
    return { hash, size, stored: 'external' };
  }
  writeFileSync(join(dir, 'output.txt'), Buffer.concat([headBytes(text, limit), Buffer.from(`\n--- truncated: ${size} bytes, sha256 ${hash}; set DOSSIER_EVIDENCE_STORE to keep the whole output ---\n`)]));
  return { hash, size, stored: 'truncated' };
}

// The longest head of the text, in UTF-8, that fits the byte limit and ends on a whole character.
export function headBytes(text: string, limit: number): Buffer {
  const bytes = Buffer.from(text);
  let end = Math.min(limit, bytes.length);
  while (end > 0 && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
  return bytes.subarray(0, end);
}

export function writeReceipt(dir: string, { runner, at, executed, output }: Omit<Receipt, 'files'>): Receipt {
  const files = sealedFileHashes(dir);
  delete files['receipt.json'];
  for (const name of [...RECEIPTED, 'output.txt']) if (!Object.hasOwn(files, name)) throw new Error(`cannot seal a trial without ${name}`);
  const receipt = { runner, at, files, output, executed };
  writeFileSync(join(dir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  return receipt;
}
