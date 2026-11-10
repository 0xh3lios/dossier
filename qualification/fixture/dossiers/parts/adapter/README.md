```json
{
  "format": "dossier-collection@0.2.0",
  "behaviors": [
    "convert-credit",
    "return-after-halt"
  ]
}
```

# Adapter

The Adapter exchanges the Vault's internal credit for HRD tokens and back. The User requests exit to obtain tokens or enter to return them. The Adapter sends the corresponding credit and token effects. A Breaker halt stops exits while leaving the guarded entry path available.

Read [Convert credit into tokens and back](behaviors/convert-credit.md#convert-credit-into-tokens-and-back), then [Return tokens after a halt](behaviors/return-after-halt.md#return-tokens-after-a-halt).

The [formal abstraction](prose.md) holds at most four units and accepts action amounts up to two. Its local walks show effects being sent. [Supply](../../compositions/supply/README.md) checks their relationship to the other parts. The local part does not establish token ownership, balances per user or atomic behavior in deployed code.

There is no enable action or eventual-return requirement. A usable return path does not promise that a user will take it.
