// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.24;

/// The Harbor credit ledger.
contract Vault {
    address public immutable adapter;
    mapping(address => uint256) public admins;
    mapping(address => uint256) public credit;
    uint256 public debt;
    uint256 public free;
    uint256 public issued;
    uint256 public ceiling;

    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event Move(address indexed user, uint256 amount);
    event Release(address indexed user, uint256 amount);
    event CeilingSet(uint256 data);

    modifier auth() { require(admins[msg.sender] == 1, "Vault/not-authorized"); _; }
    modifier onlyAdapter() { require(msg.sender == adapter, "Vault/not-adapter"); _; }

    constructor(address adapter_, uint256 ceiling_) {
        adapter = adapter_;
        ceiling = ceiling_;
        admins[msg.sender] = 1;
    }

    function setCeiling(uint256 data) external auth {
        require(data >= debt, "Vault/ceiling-below-debt");
        ceiling = data;
        emit CeilingSet(data);
    }

    function borrow(uint256 amount) external {
        require(debt + amount <= ceiling, "Vault/ceiling-exceeded");
        debt += amount;
        free += amount;
        credit[msg.sender] += amount;
        emit Borrow(msg.sender, amount);
    }

    function repay(uint256 amount) external {
        credit[msg.sender] -= amount;
        free -= amount;
        debt -= amount;
        emit Repay(msg.sender, amount);
    }

    function move(address user, uint256 amount) external onlyAdapter {
        credit[user] -= amount;
        free -= amount;
        issued += amount;
        emit Move(user, amount);
    }

    function release(address user, uint256 amount) external onlyAdapter {
        issued -= amount;
        free += amount;
        credit[user] += amount;
        emit Release(user, amount);
    }
}
