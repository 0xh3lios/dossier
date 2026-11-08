# Control

Concern: control

The Timelock, the Vault, the Breaker and the Adapter together: nothing changes the Vault before the delay runs out, a halt lands at once, and a scheduled plan is always resolved.

## Always
[A1] Always, {not timelock.early}. Scenarios: all-honest, governance-captured, executor-offline.
[A2] Always, {not breaker.halted or adapter.Halted}. Scenarios: all-honest, governance-captured.

## Once
[O1] Once timelock.Scheduled, eventually timelock.Idle, given G1 and G2. Scenarios: all-honest.

## Within
[N1] Within 3 ticks of timelock.Scheduled, timelock.Idle, given G1 and G2. Scenarios: all-honest, governance-captured, executor-offline.

## Given
[G1] Given that someone executes a ready plan before the next block. If this is false, N1 and O1 are void. Actor: the public, on timelock.execute, prompt.
[G2] Given that the chain keeps ticking. If this is false, O1 is void. Actor: the chain.

## Walks
[W1] Walk Capture under governance-captured: from timelock.Idle, timelock.schedule, timelock.execute refused, timelock.tick, timelock.tick, timelock.execute; ends timelock.Idle.

## Words only
[T1] Who holds the governance key is outside this composition; captured Governance can schedule anything, and the delay is what stands between its plan and the Vault.
