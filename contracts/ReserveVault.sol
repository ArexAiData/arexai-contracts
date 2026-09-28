// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title ArexAI staged listing reserve
/// @notice Releases the 575M reserve in exactly twenty auditable 28.75M tranches.
contract ReserveVault is Ownable2Step {
    using SafeERC20 for IERC20;

    uint256 public constant TOTAL_ALLOCATION = 575_000_000 ether;
    uint256 public constant TRANCHE_COUNT = 20;
    uint256 public constant TRANCHE_AMOUNT = 28_750_000 ether;

    IERC20 public immutable token;
    address public immutable beneficiary;
    uint256 public releasedTranches;

    error InvalidAddress();
    error AllTranchesReleased();
    error InsufficientVaultBalance();

    event TrancheReleased(uint256 indexed trancheNumber, uint256 amount, address indexed beneficiary);

    constructor(address token_, address beneficiary_, address initialOwner_) Ownable(initialOwner_) {
        if (token_ == address(0) || beneficiary_ == address(0) || initialOwner_ == address(0)) {
            revert InvalidAddress();
        }
        token = IERC20(token_);
        beneficiary = beneficiary_;
    }

    function releaseNextTranche() external onlyOwner {
        if (releasedTranches >= TRANCHE_COUNT) revert AllTranchesReleased();
        if (token.balanceOf(address(this)) < TRANCHE_AMOUNT) revert InsufficientVaultBalance();
        unchecked { ++releasedTranches; }
        token.safeTransfer(beneficiary, TRANCHE_AMOUNT);
        emit TrancheReleased(releasedTranches, TRANCHE_AMOUNT, beneficiary);
    }
}
