# Actors

Who sends events to Harbor's components, and the modes each may take under a scenario. Harbor's contracts are components, so they are not listed here: an event from the Adapter or the Timelock resolves to that component's dossier.

```yaml
actors:
  - id: chain
    name: the chain
    kind: chain
    modes: [honest, offline]
  - id: user
    name: the User
    kind: user
    modes: [honest, malicious, offline]
  - id: holder
    name: the Holder
    kind: user
    modes: [honest, malicious, offline]
  - id: governance
    name: Governance
    kind: governance
    modes: [honest, malicious, offline]
    pins: [timelock#actor:governance]
  - id: public
    name: the public
    kind: public
    modes: [honest, malicious, offline]
  - id: lane-a
    name: lane A
    kind: keeper
    modes: [honest, malicious, offline]
  - id: lane-b
    name: lane B
    kind: keeper
    modes: [honest, malicious, offline]
```
