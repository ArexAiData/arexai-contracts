// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title ArexAI fixed-supply token
/// @notice The entire supply is minted once to the initial holder. There is no mint function or owner role.
contract ArexAIToken is ERC20, ERC20Burnable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 ether;

    error InvalidInitialHolder();

    constructor(address initialHolder) ERC20("ArexAI", "ARXAI") {
        if (initialHolder == address(0)) revert InvalidInitialHolder();
        _mint(initialHolder, INITIAL_SUPPLY);
    }
}
