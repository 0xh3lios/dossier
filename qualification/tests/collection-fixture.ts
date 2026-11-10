// Authored empty collections for small test dossiers. Tests that exercise missing collections omit it.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
export function emptyCollection(dir: string): void {
  mkdirSync(join(dir,'behaviors'),{recursive:true});
  const path=join(dir,'README.md');
  if (!existsSync(path)) writeFileSync(path,'```json\n{"format":"dossier-collection@0.2.0","behaviors":[]}\n```\n\n# Test dossier\n\nThis fixture isolates a formal engine boundary. Its behavior collection is intentionally empty.\n');
}
