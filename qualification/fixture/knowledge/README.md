# Harbor knowledge base
Harbor is an invented stablecoin protocol: a vault that keeps the credit ledger, an adapter that turns credit into HRD and back, the HRD token, a timelock with a delay, a breaker that bypasses it, and an oracle posted by two keeper lanes.
It exists to exercise Dossier; nothing here describes a deployed system, and every address, block and transaction is made up.
The layout is the records format Dossier reads: `modules/<id>/` holds Markdown files with YAML record blocks for the module, its actors, assets, dependencies, edges, quantities, operations, invariants and contracts, plus `observations/` and a `source-cache/` for the vault.
`entities.yaml` names one entity per contract, as a protocol's entity catalog would.
