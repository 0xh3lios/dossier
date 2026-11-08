import { createHash } from 'node:crypto';
import type { BinaryLike } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { PathLike } from 'node:fs';

export const sha256 = (data: BinaryLike): string => createHash('sha256').update(data).digest('hex');
export const short = (data: BinaryLike, n = 8): string => sha256(data).slice(0, n);
export const fileHash = (path: PathLike): string => sha256(readFileSync(path));
export const normalize = (text: unknown): string => String(text).replace(/\s+/g, ' ').trim();
// Canonical JSON: object keys sorted, so equal values print equally.
export const canonical = (value: unknown): string => JSON.stringify(value, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v));
// The passages a dossier holds, hashed as a ledger's header prints them (prose@<this>); a trial's
// row carries the same hash of the passages it found.
export const proseHash = (hashes: Record<string, string> | null | undefined): string => short(JSON.stringify(hashes || {}), 6);
