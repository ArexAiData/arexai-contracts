// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20Decimals is ERC20 {
    uint8 private immutable configuredDecimals;

    constructor(uint8 decimals_) ERC20("Mock Custom Decimals", "MCD") {
        configuredDecimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return configuredDecimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
