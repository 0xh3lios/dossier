import { createHash } from 'node:crypto';
import type { BinaryLike } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import type { PathLike } from 'node:fs';

export const sha256 = (data: BinaryLike): string => createHash('sha256').update(data).digest('hex');
export const short = (data: BinaryLike, n = 8): string => sha256(data).slice(0, n);
export const fileHash = (path: PathLike): string => sha256(readFileSync(path));
// The SHA-256 of a file's bytes, read again only when its size, times or inode moved. Reviews bind
// files of tens of megabytes, which every verify and every refresh of the explorer would hash again.
// `check` sees the bytes on a read, and may throw to refuse them.
const digests = new Map<string, { signature: string; digest: string }>();
export function cachedFileHash(path: string, check?: (bytes: Buffer) => void): string {
  const s = statSync(path), signature = `${s.size}:${s.mtimeMs}:${s.ctimeMs}:${s.ino}`;
  const known = digests.get(path);
  if (known && known.signature === signature) return known.digest;
  const bytes = readFileSync(path);
  check?.(bytes);
  const digest = sha256(bytes);
  digests.set(path, { signature, digest });
  return digest;
}
export const normalize = (text: unknown): string => String(text).replace(/\s+/g, ' ').trim();
// Canonical JSON: object keys sorted, so equal values print equally.
export const canonical = (value: unknown): string => JSON.stringify(value, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v));
// The passages a dossier holds, hashed as a ledger's header prints them (prose@<this>); a trial's
// row carries the same hash of the passages it found.
export const proseHash = (hashes: Record<string, string> | null | undefined): string => short(JSON.stringify(hashes || {}), 6);
