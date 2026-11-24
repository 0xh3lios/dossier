retelling: The stored counterexample takes these steps. Action labels are TLC's labels; state 1 is the initial state.

| State | Action | Timelock | Remaining | Vault free | Vault issued |
| --- | --- | --- | --- | --- | --- |
| 1 | Initial predicate | "Idle" | 0 | 0 | 0 |
| 2 | Governance | "Scheduled" | 2 | 0 | 0 |
| 3 | User | "Scheduled" | 2 | 0 | 0 |
| 4 | User | "Scheduled" | 2 | 0 | 0 |
| 5 | TickStep | "Scheduled" | 1 | 0 | 0 |
| 6 | User | "Scheduled" | 1 | 0 | 0 |
| 7 | User | "Scheduled" | 1 | 2 | 0 |
| 8 | TickStep | "Scheduled" | 0 | 2 | 0 |
| 9 | User | "Scheduled" | 0 | 2 | 0 |
| 10 | User | "Scheduled" | 0 | 2 | 0 |
| 11 | User | "Scheduled" | 0 | 2 | 0 |
| 12 | User | "Scheduled" | 0 | 2 | 0 |
| 13 | Governance | "Scheduled" | 0 | 2 | 0 |
| 14 | User | "Scheduled" | 0 | 2 | 0 |
| 15 | User | "Scheduled" | 0 | 1 | 0 |

The output closes the loop with: 14: Back to state: <User line 243, col 9 to line 243, col 130 of module unfair>

The loop returns to state 14 and keeps the Timelock scheduled and ready. Other recorded values change within the loop; this is not full-state stuttering. Removing the executor's fairness lets the plan remain unresolved; O1 fails. The control wiring leaves the Vault sends free, so this path is evidence about that abstraction, not a replay of complete transactions.

Checker warnings:
- Declaring state or action constraints during liveness checking is dangerous: Please read section 14.3.5 on page 247 of Specifying Systems (https://lamport.azurewebsites.net/tla/book.html) and optionally the discussion at https://discuss.tlapl.us/msg00994.html for more details.
A state-constrained liveness run must not be generalized to unconstrained behavior.
