// Structure of the Breaker's authority. The behavior lives in Breaker.tla.
abstract sig Actor {}
sig Governance extends Actor {}
sig Breaker extends Actor { authority: one Governance }       // K1: a breaker answers to Governance
sig Other extends Actor {}
sig Halt { by: one Actor }                         // a halt the Adapter received
fact X1_halt_by_breaker { all h: Halt | h.by in Breaker }  // X1: halt crosses from Breaker to Adapter
fact K1_breaker_authority { all m: Breaker | m.authority in Governance }
assert A2_halts_from_governance { all h: Halt | h.by in Breaker and h.by.authority in Governance }   // A2
check A2_halts_from_governance for 4                      // reach: 4
