# Budget exercise

Use the keep skill at `skills/keep/SKILL.md` in the plugin checkout. Work only in the isolated repository supplied by the evaluator. Use the plugin's `bin/dossier` command. Do not install dependencies or alter the plugin.

An operator can request payment of one fixed lot from a budget. Initially the budget has capacity for two lots and inventory of three lots. A payment consumes one capacity unit and one inventory unit and increments the amount paid. Both limits must allow a payment. Nothing refills capacity or inventory. There is one live operating state.

Create a charted component named `budget`, record an appropriate chart trial and interpret its answer. Answer whether a third payment can succeed after two payments, and explain what the tools establish about that answer. Preserve the evidence and identify anything still requiring an owner or a different kind of check. The owner has not accepted any passages or risks.

Leave a concise `answer.md` at the isolated repository root, with links or relative paths to the produced artifacts. Also write `answer.json` with these fields: `component`, `trial` (the id of the trial that established the answer you rely on, as its entry in `evidence/` names it), `checker`, `proof` (boolean), `thirdPaymentAllowed` (boolean), `remainingCapacity` (number), `remainingInventory` (number), `limitations` (array of strings). This structured answer is an exercise artifact, not a Dossier record.
