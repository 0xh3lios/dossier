# External runners

Read when a walk should be replayed against something that is not a model: a fork of the deployment, a stand-in implementation, a simulator. The runner is the team's own program, declared in `dossier.json`. Dossier runs it through the trial discipline and records what it reports.

## Declaring one

Example `external-config`. Fragment of dossier.json; wrap in an object before JSON parsing.

```json
"external": {
  "replay": { "command": ["node", "tools/replay.mjs"], "cwd": ".." }
}
```

The command runs with `cwd` relative to the dossiers root. It receives one JSON object on stdin: `dossier` (the kind, the id, and the dossier's folder as `dir`), `call` (kind, executes, expect, reach), `ir` (the component's compiled prose, with every walk's steps and expected end), `root`, and `files` (each executed path mapped to its absolute path). Its environment also holds `DOSSIER_ROOT`, the dossiers root. It prints one JSON object on its last line: `outcomes` as `{ "W1": "pass" | "fail" }`, `covers` listing the ids its evidence covers, `evidence` of any shape, and optionally `reach`.

## The call

Example `external-call`. Complete call form; plan against Harbor Token with its declared replay runner.

```
kind: external
runner: replay
executes:
  - prose.md
reach: the stand-in deployment, each walk from a fresh instance
expect:
  W1: pass
  W2: pass
because: |
  The stand-in applies the arithmetic the prose states.
```

## What it means

A walk the runner lists under `covers` is `grounded` when its answer came back as called. The abstraction and the deployment then agree on that path. A replay call expects every walk to pass, so a failed walk makes the answer miscalled, and it grounds none. A guarantee whose backing is `external <runner>` is `backed` while the latest answer from that runner that names it came back as called and lists its K id under `covers`, at its current words, and `unresolved` otherwise. A failed replay is a miscall to classify like any other, and the usual cause is the prose, not the deployment. The runner's evidence is kept with its answer, in the question's entry in `evidence/`. Its program is the team's, versioned with the team's code, and Dossier does not verify it.

A Certora rule is not run this way. It is a backing on a Guarantee, read from the knowledge base. Fork replays, simulators and stand-ins are what external runners are for.
