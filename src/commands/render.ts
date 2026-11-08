// Explicit human-view materialization. Verification remains read-only by default.
import { main as verify } from './verify.ts';
import type { CommandContext } from '../cli.ts';

export async function main(_command: string, args: string[], context: CommandContext): Promise<number> {
  return verify('render', args, context);
}
