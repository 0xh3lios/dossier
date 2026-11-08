// Vault.spec: the Harbor credit ledger

using Vault as vault;

methods {
    function debt() external returns (uint256) envfree;
    function free() external returns (uint256) envfree;
    function issued() external returns (uint256) envfree;
    function ceiling() external returns (uint256) envfree;
    function credit(address) external returns (uint256) envfree;
    function adapter() external returns (address) envfree;
}

definition UNIT() returns mathint = 10^18;

ghost mathint creditSum {
    init_state axiom creditSum == 0;
}

hook Sstore credit[KEY address user] uint256 value (uint256 old_value) {
    creditSum = creditSum + value - old_value;
}

invariant debtEqualsCredit()
    to_mathint(debt()) == to_mathint(free()) + to_mathint(issued())
    {
        preserved move(address user, uint256 amount) with (env e) {
            require e.msg.sender == adapter();
        }
        preserved release(address user, uint256 amount) with (env e) {
            require e.msg.sender == adapter();
        }
    }

invariant creditSumsToFree()
    creditSum == to_mathint(free())

rule borrowIncreasesDebt(uint256 amount) {
    env e;
    requireInvariant debtEqualsCredit();

    mathint debtBefore = debt();
    mathint freeBefore = free();
    mathint creditBefore = credit(e.msg.sender);

    borrow(e, amount);

    assert to_mathint(debt()) == debtBefore + amount, "borrow adds amount to debt";
    assert to_mathint(free()) == freeBefore + amount, "borrow adds amount to free";
    assert to_mathint(credit(e.msg.sender)) == creditBefore + amount, "borrow credits the caller";
    assert to_mathint(debt()) <= to_mathint(ceiling()), "borrow respects the ceiling";
}

rule repayDecreasesDebt(uint256 amount) {
    env e;
    requireInvariant debtEqualsCredit();

    mathint debtBefore = debt();
    mathint freeBefore = free();

    repay(e, amount);

    assert to_mathint(debt()) == debtBefore - amount, "repay removes amount from debt";
    assert to_mathint(free()) == freeBefore - amount, "repay removes amount from free";
}

rule onlyAdapterMovesCredit(method f) filtered {
    f -> f.selector == sig:move(address,uint256).selector
      || f.selector == sig:release(address,uint256).selector
} {
    env e;
    calldataarg args;
    f(e, args);
    assert e.msg.sender == adapter(), "move and release are adapter-only";
}
