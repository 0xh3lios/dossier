# Harbor, the fixture

Harbor is an invented stablecoin system, small enough to read in a sitting. It ships with the plugin as a repository in miniature under `qualification/fixture/`: a knowledge base under `knowledge/`, a stand-in deployment under `protocol/` with a replay runner under `tools/`, and the dossiers under `dossiers/`. Every answer there came from the runner, and the model trials ran with the real solvers. Like a team's repository, Harbor keeps each dossier's [entries](files.md#evidence) under `evidence/`, the agent's readings beside them, and the owner's decisions.

## Reading it

Start with [Control's orientation and reading order](../../qualification/fixture/dossiers/compositions/control/README.md#control), then [Resolve a scheduled plan](../../qualification/fixture/dossiers/compositions/control/behaviors/resolve-plan.md#resolve-a-scheduled-plan). Its claims tell completion under a prompt executor apart from the deadline that fails when nobody executes. The links open at the explanation. Each file's leading JSON block holds the claims, their scopes and their mappings to evidence, which the tools read. The [explorer](../how-to/open-the-explorer.md) shows those fields beside the explanation, and puts the walks and the evidence under their behaviors.

Follow the failed deadline to the [offline executor answer](../../qualification/fixture/dossiers/compositions/control/evidence/tlc-N1-executor-offline-4dafb3.json) and its [reading](../../qualification/fixture/dossiers/compositions/control/evidence/tlc-N1-executor-offline-4dafb3.md). The answer records a plan scheduled, then ticks in which nobody executes it. The owner's acceptance leaves the requirement violated. For a part, start with [Timelock's orientation](../../qualification/fixture/dossiers/parts/timelock/README.md), then its cancellation and completion behaviors.

The [Harbor index](../../qualification/fixture/dossiers/index.md), [Control ledger](../../qualification/fixture/dossiers/compositions/control/ledger.md) and [Timelock ledger](../../qualification/fixture/dossiers/parts/timelock/ledger.md) hold the formal tables beneath that account. The [Timelock prose](../../qualification/fixture/dossiers/parts/timelock/prose.md) defines the shared abstraction. `dossier show <dossier> <entry> --root qualification/fixture/dossiers`, which you or the agent can run from the plugin's folder, prints an answer with its trace as a table.

Where the solvers are installed, you or the agent can recheck Harbor with `dossier recheck --root qualification/fixture/dossiers` from the plugin's folder, as [Commands](commands.md#the-command) describes.

## Behaviors

Each dossier is read from its behaviors, in this order.

| Dossier | Behaviors |
| --- | --- |
| `vault` | Borrow and repay. Move credit through the Adapter. Raise the ceiling. |
| `adapter` | Convert credit into tokens and back. Return tokens after a halt. |
| `token` | Mint and burn within the cap. Transfer without changing supply. |
| `timelock` | Schedule and execute a plan. Cancel a waiting governance plan. Complete a scheduled plan. |
| `breaker` | Send one emergency halt. Restrict the structural halt authority. |
| `oracle` | Refresh a stale price. Limit each price step. Saturate the age counter. |
| `supply` | Preserve the credit equation. Match tokens to their backing. Convert through all three parts. |
| `control` | Delay a governance change. Halt exits immediately. Resolve a scheduled plan. |
| `upkeep` | Refresh with a backup lane. Recover from a keeper outage. Keep price steps within the honest-lane band. |

## Parts

| Part | Stands for | Shows |
| --- | --- | --- |
| `vault` | the core ledger | conservation proved by induction; a debt ceiling whose first proof is miscalled and then strengthened with a lemma; Certora-backed guarantees; a rejected guarantee; walks replayed on the stand-in |
| `adapter` | the adapter between credit and the token | effects that carry amounts; a halt from the Breaker; a guarantee backed by a record |
| `token` | the stablecoin | a cap; a transfer that changes nothing |
| `timelock` | a delayed-execution timelock | a delay counted in ticks; a prompt executor; Within and Once with Givens; a witness; a liveness trial |
| `breaker` | a circuit breaker that skips the delay | a final state; a structural Always checked in Alloy, with a blunder |
| `oracle` | a price feed posted by keeper lanes | two prompt lanes; a bounded response; a price that an honest lane moves one step per post, with an Always that rests on the two `only when` Givens and a blunder that drops them; an open doubt |

## Compositions

| Composition | Members | Shows |
| --- | --- | --- |
| `supply` | vault, adapter, token | effects wired to events; closure over the asset; three conservation invariants proved under all-honest with lemmas in `extras.tla`, and checked with a malicious user; three composition blunders; a walk checked by a witness under all-honest |
| `control` | timelock, vault, breaker, adapter | malicious Governance that cannot execute early; a halt that lands at once; liveness under fairness; the Adapter's supply sends declared free; a cell violated by design with the executor offline, accepted as a risk; a walk checked by a witness under `governance-captured`; an inductive call that was wrong, classified, and let go by the owner's `forget` once a proof with the lemma decided the cell |
| `upkeep` | oracle | redundant keeper lanes: holds with one lane offline, violated with both, and accepted as a risk; windows that take both lanes down for the first block, where it holds, and for the first two, where it is violated and accepted as a risk; a start with the Oracle already three blocks stale, where it holds; a band on the price that holds with honest lanes and is violated with lane A malicious, accepted as a risk |

## Rebuilding it

`node qualification/rebuild-fixture.mjs --out <isolated dir> [--install]`, which you run from the plugin's folder with the solvers installed, regenerates it. The rebuild seeds a new root in the isolated folder, which must be new or empty, from the fixture's authored inputs. It runs every trial with the real solvers, renders the views, verifies, and writes `observed-marks.json` in the output. With `--install`, the output's dossiers replace `qualification/fixture/dossiers`, but only when verify passes on the rebuild and the observed marks equal `qualification/fixture/expected-marks.json`. That file is the reviewed golden, which a rebuild never writes, and the tests compare the fixture against it. The rebuild writes the executed fixture. Behavior explanations and independent reviews are written separately. Rebuilt answers invalidate the earlier reviews, which then require a new independent read. Trial ids, timestamps and decision hashes change with every rebuild.
