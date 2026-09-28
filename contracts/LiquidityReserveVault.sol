// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title ArexAI liquidity-token reserve
/// @notice Custodies up to 200M ARXAI before liquidity is supplied.
contract LiquidityReserveVault is Ownable2Step {
    using SafeERC20 for IERC20;

    uint256 public constant TOTAL_ALLOCATION = 200_000_000 ether;
    IERC20 public immutable token;
    address public immutable liquidityManager;
    uint256 public released;

    error InvalidAddress();
    error AllocationExceeded();

    event LiquidityTokensReleased(uint256 amount, uint256 totalReleased, address indexed liquidityManager);

    constructor(address token_, address liquidityManager_, address initialOwner_) Ownable(initialOwner_) {
        if (token_ == address(0) || liquidityManager_ == address(0) || initialOwner_ == address(0)) {
            revert InvalidAddress();
        }
        token = IERC20(token_);
        liquidityManager = liquidityManager_;
    }

    function releaseForLiquidity(uint256 amount) external onlyOwner {
        if (amount == 0 || released + amount > TOTAL_ALLOCATION) revert AllocationExceeded();
        released += amount;
        token.safeTransfer(liquidityManager, amount);
        emit LiquidityTokensReleased(amount, released, liquidityManager);
    }
}
