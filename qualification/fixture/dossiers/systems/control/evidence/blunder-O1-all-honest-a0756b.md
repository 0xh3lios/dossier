retelling: The stored counterexample takes these steps. Action labels are TLC's labels; state 1 is the initial state.

| State | Action | Timelock | Remaining | Vault free | Vault issued |
| --- | --- | --- | --- | --- | --- |
| 1 | Initial predicate | "Idle" | 0 | 0 | 0 |
| 2 | User | "Idle" | 0 | 0 | 0 |
| 3 | User | "Idle" | 0 | 0 | 0 |
| 4 | Governance | "Idle" | 0 | 0 | 0 |
| 5 | User | "Idle" | 0 | 0 | 0 |
| 6 | User | "Idle" | 0 | 0 | 0 |
| 7 | User | "Idle" | 0 | 0 | 0 |
| 8 | User | "Idle" | 0 | 0 | 0 |
| 9 | Governance | "Scheduled" | 2 | 0 | 0 |
| 10 | User | "Scheduled" | 2 | 1 | 0 |
| 11 | vault_M3_Move | "Scheduled" | 2 | 0 | 1 |
| 12 | TickStep | "Scheduled" | 1 | 0 | 1 |
| 13 | TickStep | "Scheduled" | 0 | 0 | 1 |
| 14 | User | "Scheduled" | 0 | 1 | 1 |

The output closes the loop with: 13: Back to state: <User line 243, col 9 to line 243, col 130 of module unfair>

The loop returns to state 13 and keeps the Timelock scheduled and ready. Other recorded values change within the loop; this is not full-state stuttering. Removing the executor's fairness lets the plan remain unresolved; O1 fails. The control composition leaves the Vault sends free, so this path is evidence about that abstraction, not a replay of complete transactions.

Checker warnings:
- Declaring state or action constraints during liveness checking is dangerous: Please read section 14.3.5 on page 247 of Specifying Systems (https://lamport.azurewebsites.net/tla/book.html) and optionally the discussion at https://discuss.tlapl.us/msg00994.html for more details.
A state-constrained liveness run must not be generalized to unconstrained behavior.
