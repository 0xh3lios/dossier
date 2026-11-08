retelling: The stored counterexample takes these steps. Action labels are TLC's labels; state 1 is the initial state.

| State | Action | Timelock | Remaining | Vault free | Vault issued |
| --- | --- | --- | --- | --- | --- |
| 1 | Initial predicate | "Idle" | 0 | 0 | 0 |
| 2 | Governance | "Scheduled" | 2 | 0 | 0 |
| 3 | User | "Scheduled" | 2 | 0 | 0 |
| 4 | User | "Scheduled" | 2 | 2 | 0 |
| 5 | User | "Scheduled" | 2 | 2 | 0 |
| 6 | TickStep | "Scheduled" | 1 | 2 | 0 |
| 7 | TickStep | "Scheduled" | 0 | 2 | 0 |
| 8 | vault_M3_Move | "Scheduled" | 0 | 0 | 2 |
| 9 | User | "Scheduled" | 0 | 0 | 2 |
| 10 | Governance | "Scheduled" | 0 | 0 | 2 |
| 11 | User | "Scheduled" | 0 | 0 | 2 |
| 12 | vault_M4_Release | "Scheduled" | 0 | 2 | 0 |

The output closes the loop with: 11: Back to state: <vault_M3_Move line 163, col 5 to line 170, col 17 of module unfair>

The loop returns to state 11 and keeps the Timelock scheduled and ready. Other recorded values change within the loop; this is not full-state stuttering. Removing the executor's fairness lets the plan remain unresolved; O1 fails. The control wiring leaves the Vault sends free, so this path is evidence about that abstraction, not a replay of complete transactions.

Checker warnings:
- Declaring state or action constraints during liveness checking is dangerous: Please read section 14.3.5 on page 247 of Specifying Systems (https://lamport.azurewebsites.net/tla/book.html) and optionally the discussion at https://discuss.tlapl.us/msg00994.html for more details.
A state-constrained liveness run must not be generalized to unconstrained behavior.
