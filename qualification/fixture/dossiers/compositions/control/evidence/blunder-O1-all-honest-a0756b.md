retelling: The stored counterexample takes these steps. Action labels are TLC's labels; state 1 is the initial state.

| State | Action | Timelock | Remaining | Vault free | Vault issued |
| --- | --- | --- | --- | --- | --- |
| 1 | Initial predicate | "Idle" | 0 | 0 | 0 |
| 2 | User | "Idle" | 0 | 0 | 0 |
| 3 | User | "Idle" | 0 | 0 | 0 |
| 4 | User | "Idle" | 0 | 0 | 0 |
| 5 | User | "Idle" | 0 | 0 | 0 |
| 6 | Governance | "Idle" | 0 | 0 | 0 |
| 7 | Governance | "Scheduled" | 2 | 0 | 0 |
| 8 | User | "Scheduled" | 2 | 0 | 0 |
| 9 | TickStep | "Scheduled" | 1 | 0 | 0 |
| 10 | TickStep | "Scheduled" | 0 | 0 | 0 |

The output closes the loop with: 11: Stuttering

State 10 repeats indefinitely: this is full-state stuttering, with the Timelock scheduled and ready. Removing the executor's fairness lets the plan remain unresolved; O1 fails. The control wiring leaves the Vault sends free, so this path is evidence about that abstraction, not a replay of complete transactions.

Checker warnings:
- Declaring state or action constraints during liveness checking is dangerous: Please read section 14.3.5 on page 247 of Specifying Systems (https://lamport.azurewebsites.net/tla/book.html) and optionally the discussion at https://discuss.tlapl.us/msg00994.html for more details.
A state-constrained liveness run must not be generalized to unconstrained behavior.
