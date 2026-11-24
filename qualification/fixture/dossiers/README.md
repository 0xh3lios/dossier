```json
{
  "format": "dossier-map@0.3.0",
  "featured": [
    {
      "dossier": "compositions/control",
      "behavior": "emergency-halt",
      "lead": "A Breaker halt stops exits at once, while a Timelock plan still waits out its delay."
    }
  ],
  "groups": [
    {
      "id": "credit",
      "title": "Credit and HRD",
      "lead": "The Vault's credit ledger, and the HRD tokens the Adapter issues against it.",
      "featured": [
        {
          "dossier": "compositions/supply",
          "behavior": "match-token-backing",
          "lead": "Issued credit, the Adapter's holdings and the HRD supply stay equal as credit moves."
        }
      ],
      "components": [
        {
          "id": "vault",
          "title": "Vault",
          "lead": "Records debt, free and issued credit, and the ceiling on borrowing.",
          "record": "vault#contract:vault",
          "dossiers": [
            "parts/vault"
          ]
        },
        {
          "id": "conversion",
          "title": "Conversion",
          "lead": "The Adapter exchanges credit for HRD, which the Token mints and burns.",
          "record": "adapter#contract:adapter",
          "dossiers": [
            "parts/adapter",
            {
              "ref": "parts/token",
              "select": [
                "mint-and-burn"
              ]
            }
          ]
        },
        {
          "id": "token",
          "title": "Token",
          "lead": "Records the total HRD supply, which a transfer leaves unchanged.",
          "record": "token#contract:token",
          "dossiers": [
            "parts/token"
          ]
        }
      ]
    },
    {
      "id": "governance",
      "title": "Governance",
      "lead": "Plans that wait out the Timelock's delay, and the emergency halt that does not.",
      "components": [
        {
          "id": "timelock",
          "title": "Timelock",
          "lead": "Holds one plan while its delay runs down, then sends its change to the Vault.",
          "record": "timelock#contract:timelock",
          "dossiers": [
            "parts/timelock"
          ]
        },
        {
          "id": "breaker",
          "title": "Breaker",
          "lead": "Relays one emergency halt from Governance to the Adapter.",
          "record": "breaker#contract:breaker",
          "dossiers": [
            "parts/breaker"
          ]
        }
      ]
    },
    {
      "id": "prices",
      "title": "Prices",
      "lead": "The Oracle's price, and the two keeper lanes that keep it fresh.",
      "components": [
        {
          "id": "oracle",
          "title": "Oracle",
          "lead": "Stores a price and its age; either keeper lane may post a replacement.",
          "record": "oracle#contract:oracle",
          "dossiers": [
            "parts/oracle"
          ]
        }
      ]
    }
  ]
}
```

# Harbor dossiers

The plugin's fixture: six parts of the invented Harbor protocol, three compositions wired from them, actors and scenarios, with every trial run through the runner and its receipt intact. The knowledge base they read is `../knowledge`, laid out like a protocol team's own records. `index.md` says where everything stands.

The block above is Harbor's map. Credit and HRD, Governance and Prices group the six parts into components, and the Conversion component also holds the Token's minting and burning. Each composition sits where the components holding its members meet: Supply under Credit and HRD, Control at the top, and Upkeep at the Oracle.
