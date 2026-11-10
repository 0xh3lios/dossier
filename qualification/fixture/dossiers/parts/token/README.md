```json
{
  "format": "dossier-collection@0.2.0",
  "behaviors": [
    "mint-and-burn",
    "transfer-without-supply-change"
  ]
}
```

# Token

The Token records Harbor's total HRD supply. The Adapter may mint or burn, and the Holder may transfer. The model tracks supply only. It does not track individual balances, allowances or destinations.

Read [Mint and burn within the cap](behaviors/mint-and-burn.md#mint-and-burn-within-the-cap), then [Transfer without changing supply](behaviors/transfer-without-supply-change.md#transfer-without-changing-supply).

The [formal abstraction](prose.md) bounds supply at four and mint or burn amounts at two. [Supply](../../compositions/supply/README.md) relates this total to the Vault and Adapter. The Mint-and-burn walk is drawn and has a stand-in replay, but lacks a model-side witness. That difference remains visible in its claim rather than being promoted to a universal source result.
