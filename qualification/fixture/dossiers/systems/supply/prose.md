# Supply

Concern: supply

The Vault, the Adapter and the Token together: HRD is minted only against credit the Adapter takes from the Vault, and burned only when that credit returns, so the supply and the ledger never drift apart.

## Always
[A1] Always, {vault.debt = vault.free + vault.issued}. Scenarios: all-honest, user-malicious.
[A2] Always, {token.supply = vault.issued}. Scenarios: all-honest, user-malicious.
[A3] Always, {adapter.held = token.supply}. Scenarios: all-honest, user-malicious.

## Walks
[W1] Walk Mint under all-honest: from vault.Open, vault.borrow amount 2, adapter.exit amount 2, adapter.enter amount 1; ends adapter.Open.

## Words only
[T1] Prices, collateral and who holds the HRD are outside this composition.
