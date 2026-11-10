```json
{
  "format": "dossier-collection@0.2.0",
  "behaviors": [
    "preserve-credit",
    "match-token-backing",
    "convert-through-the-parts"
  ]
}
```

# Supply

Supply connects the Vault's credit ledger to the Adapter and HRD Token. A user borrows internal credit, exits through the Adapter to receive HRD, and enters to return tokens to credit. The concern is that these representations remain equal as actions move through the wiring.

Read the behaviors in this order:

1. [Preserve the credit equation](behaviors/preserve-credit.md#preserve-the-credit-equation): debt remains accounted for as free or issued credit.
2. [Match tokens to their backing](behaviors/match-token-backing.md#match-tokens-to-their-backing): token supply, issued credit and Adapter holdings agree.
3. [Convert through all three parts](behaviors/convert-through-the-parts.md#convert-through-all-three-parts): one composed borrowing, exit and entry path.

The [wiring](wiring.md) connects each Adapter effect to the receiving credit or token action. Its asset closure asks that every recorded module which mints, burns or accounts for HRD is included. The [formal properties](prose.md) omit collateral, prices and individual holdings.

All-honest proofs and user-malicious bounded checks retain different reach. No composition result establishes that the deployed contracts match these models or that the knowledge base lists every real participant.
