// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ArexAI team vesting
/// @notice 50M ARXAI stays locked for six months after round two, then unlocks in 20 monthly 5% tranches.
contract ArexAITeamVesting is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant TOTAL_ALLOCATION = 50_000_000 ether;
    uint256 public constant TRANCHE_AMOUNT = 2_500_000 ether;
    uint256 public constant TRANCHE_COUNT = 20;
    uint256 public constant VESTING_START = 1_795_305_600; // 2026-11-22 00:00 UTC
    uint256 public constant CLIFF_END = 1_810_944_000; // 2027-05-22 00:00 UTC

    IERC20 public immutable token;
    address public immutable beneficiary;
    uint256 public released;
    uint64[20] private releaseTimes;

    error ZeroAddress();
    error NothingToRelease();
    error Underfunded();
    error InvalidTranche();

    event TokensReleased(address indexed beneficiary, uint256 amount, uint256 cumulativeReleased);

    constructor(address tokenAddress, address beneficiaryAddress) {
        if (tokenAddress == address(0) || beneficiaryAddress == address(0)) revert ZeroAddress();
        token = IERC20(tokenAddress);
        beneficiary = beneficiaryAddress;
        releaseTimes = [
            1_813_622_400, 1_816_214_400, 1_818_892_800, 1_821_571_200, 1_824_163_200,
            1_826_841_600, 1_829_433_600, 1_832_112_000, 1_834_790_400, 1_837_296_000,
            1_839_974_400, 1_842_566_400, 1_845_244_800, 1_847_836_800, 1_850_515_200,
            1_853_193_600, 1_855_785_600, 1_858_464_000, 1_861_056_000, 1_863_734_400
        ];
    }

    function releaseTime(uint256 index) external view returns (uint256) {
        if (index >= TRANCHE_COUNT) revert InvalidTranche();
        return releaseTimes[index];
    }

    function unlockedTranches(uint256 timestamp) public view returns (uint256 count) {
        for (uint256 i; i < TRANCHE_COUNT; ++i) {
            if (timestamp < releaseTimes[i]) break;
            ++count;
        }
    }

    function vestedAmount(uint256 timestamp) public view returns (uint256) {
        return unlockedTranches(timestamp) * TRANCHE_AMOUNT;
    }

    function releasable() public view returns (uint256) {
        return vestedAmount(block.timestamp) - released;
    }

    function funded() external view returns (bool) {
        return token.balanceOf(address(this)) + released >= TOTAL_ALLOCATION;
    }

    function release() external nonReentrant {
        uint256 amount = releasable();
        if (amount == 0) revert NothingToRelease();
        if (token.balanceOf(address(this)) < amount) revert Underfunded();

        released += amount;
        token.safeTransfer(beneficiary, amount);
        emit TokensReleased(beneficiary, amount, released);
    }
}
