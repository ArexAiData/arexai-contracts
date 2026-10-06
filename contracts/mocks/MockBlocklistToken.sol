// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Test-only transfer rejection model, not an implementation of USDC or USDT.
/// @dev Unrestricted mint/block setters are intentional fixture controls. Never deploy for production.
contract MockBlocklistToken is ERC20 {
    mapping(address => bool) public blocked;
    error BlockedAccount(address account);

    constructor() ERC20("Test blocklist token", "TBL") {}

    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function setBlocked(address account, bool value) external { blocked[account] = value; }

    function _update(address from, address to, uint256 amount) internal override {
        if (blocked[from]) revert BlockedAccount(from);
        if (blocked[to]) revert BlockedAccount(to);
        super._update(from, to, amount);
    }
}
