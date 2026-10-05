// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ArexAI team vesting
/// @notice Releases 50M ARXAI in twenty calendar-date tranches of 2.5M.
contract TeamVesting {
    using SafeERC20 for IERC20;

    uint256 public constant TOTAL_ALLOCATION = 50_000_000 ether;
    uint256 public constant TRANCHE_COUNT = 20;
    uint256 public constant TRANCHE_AMOUNT = TOTAL_ALLOCATION / TRANCHE_COUNT;

    IERC20 public immutable token;
    address public immutable beneficiary;
    uint64[20] public releaseTimes;
    uint256 public released;

    error InvalidAddress();
    error InvalidReleaseSchedule();
    error NothingToRelease();

    event TokensReleased(address indexed beneficiary, uint256 amount, uint256 totalReleased);

    constructor(address token_, address beneficiary_, uint64[20] memory releaseTimes_) {
        if (token_ == address(0) || beneficiary_ == address(0)) revert InvalidAddress();
        for (uint256 i = 0; i < TRANCHE_COUNT; ++i) {
            if (releaseTimes_[i] == 0 || (i != 0 && releaseTimes_[i] <= releaseTimes_[i - 1])) {
                revert InvalidReleaseSchedule();
            }
            releaseTimes[i] = releaseTimes_[i];
        }
        token = IERC20(token_);
        beneficiary = beneficiary_;
    }

    function vestedTranches() public view returns (uint256 count) {
        while (count < TRANCHE_COUNT && block.timestamp >= releaseTimes[count]) {
            unchecked { ++count; }
        }
    }

    function vestedAmount() public view returns (uint256) {
        return vestedTranches() * TRANCHE_AMOUNT;
    }

    function releasable() public view returns (uint256) {
        return vestedAmount() - released;
    }

    function release() external {
        uint256 amount = releasable();
        if (amount == 0) revert NothingToRelease();
        released += amount;
        token.safeTransfer(beneficiary, amount);
        emit TokensReleased(beneficiary, amount, released);
    }
}
