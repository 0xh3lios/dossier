# Replay walks against a deployment

Play a part's example walks against something that is not a model: a fork of the deployment, a stand-in implementation or a simulator. A trial runs your runner on a call through `dossier trial`. When its answer comes back as called, each walk the runner passed is marked grounded.

## Steps

1. **Write the runner.** It is your own program. It reads one JSON object on standard input, with these fields:

   | Field | Holds |
   | --- | --- |
   | `dossier` | the dossier's kind, its id, and its folder as `dir` |
   | `call` | the call's kind, executes, expect and reach |
   | `ir` | the part's compiled prose, with every walk's steps and expected end |
   | `root` | the dossiers root |
   | `files` | each declared executed path, mapped to its absolute private-copy path |

   Read declared inputs through `files`, so the runner reads the bytes Dossier captured. The runner also receives the live dossiers root as `root` and `DOSSIER_ROOT`. Its command, working directory and undeclared dependencies are not frozen. [Execution identity](../../spec/models.md#execution-identity) states what the answer records about the execution.

   It prints one JSON object on its last line of output:

   ```json
   { "outcomes": { "W1": "pass", "W2": "pass" }, "covers": ["W1", "W2"], "evidence": { "block": 21000000 } }
   ```

   `outcomes` says `pass` or `fail` per id, `covers` lists the ids the replay covers, `evidence` holds what the runner observed in any shape, and an optional `reach` describes how far it looked.

2. **Declare it in `dossier.json`.** Add it yourself. `dossier.json` is yours to edit, not the agent's.

   ```json
   "external": {
     "replay": { "command": ["node", "tools/replay.mjs"], "cwd": ".." }
   }
   ```

   `cwd` is relative to the dossiers root. Running `dossier setup` again keeps the declaration.

3. **Let the agent call it.** The call names the runner and expects each walk to pass. The agent may write it with `dossier call`, naming the runner with `--runner`. The command writes the kind, the runner, the executed prose and an `expect:` line for each walk, and the agent adds the reach, the outcomes and the reason:

   ```
   kind: external
   runner: replay
   executes:
     - prose.md
   reach: the fork at the pinned block, each walk from a fresh instance
   expect:
     W1: pass
     W2: pass
   because: |
     The deployment applies the arithmetic the prose states.
   ```

## Check

The part's ledger shows `grounded` beside each walk the runner lists under `covers`, when the trial's answer came back as called. The call expects every walk to pass, so an answer in which one fails is miscalled and grounds none of them. A guarantee whose backing is `external <runner>` becomes `backed` once an answer from that runner comes back as called and lists its K id under `covers`. A failed replay is a miscall the agent must classify, and the usual cause is the prose rather than the deployment. The answer keeps what your runner printed under `evidence`. It is in the entry for the call's question, under the dossier's `evidence/`, and `dossier show` prints it. Dossier does not verify the runner itself, so version it with your code.
