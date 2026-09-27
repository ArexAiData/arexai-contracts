// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

interface IBurnableToken is IERC20 {
    function burn(uint256 amount) external;
}

/// @title A single immutable ArexAI presale round
/// @notice Accepts one configured payment token and delivers ARXAI immediately.
contract PresaleRound is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 private constant TOKEN_SCALE = 1 ether;

    IBurnableToken public immutable saleToken;
    IERC20 public immutable paymentToken;
    address public immutable treasury;
    uint64 public immutable startTime;
    uint64 public immutable endTime;
    uint256 public immutable allocation;
    uint256 public immutable pricePerWholeToken;
    uint256 public immutable minimumPayment;
    uint256 public immutable maximumPaymentPerWallet;

    uint256 public totalSold;
    bool public finalized;
    mapping(address buyer => uint256 paymentAmount) public contributed;

    error InvalidAddress();
    error InvalidSchedule();
    error InvalidConfiguration();
    error PaymentDecimalsTooLarge();
    error SaleNotActive();
    error PaymentBelowMinimum();
    error WalletMaximumExceeded();
    error AllocationExceeded();
    error InsufficientInventory();
    error AlreadyFinalized();
    error SaleNotEnded();
    error ZeroTokenOutput();

    event TokensPurchased(address indexed buyer, uint256 paymentAmount, uint256 tokenAmount);
    event RoundFinalized(uint256 unsoldTokensBurned, uint256 finalTotalSold);

    constructor(
        address saleToken_,
        address paymentToken_,
        address treasury_,
        address initialOwner_,
        uint64 startTime_,
        uint64 endTime_,
        uint256 allocation_,
        uint256 pricePerWholeToken_,
        uint256 minimumPayment_,
        uint256 maximumPaymentPerWallet_
    ) Ownable(initialOwner_) {
        if (
            saleToken_ == address(0) || paymentToken_ == address(0) ||
            treasury_ == address(0) || initialOwner_ == address(0)
        ) revert InvalidAddress();
        if (startTime_ >= endTime_) revert InvalidSchedule();
        if (
            allocation_ == 0 || pricePerWholeToken_ == 0 || minimumPayment_ == 0 ||
            maximumPaymentPerWallet_ < minimumPayment_
        ) revert InvalidConfiguration();
        if (IERC20Metadata(paymentToken_).decimals() > 18) revert PaymentDecimalsTooLarge();

        saleToken = IBurnableToken(saleToken_);
        paymentToken = IERC20(paymentToken_);
        treasury = treasury_;
        startTime = startTime_;
        endTime = endTime_;
        allocation = allocation_;
        pricePerWholeToken = pricePerWholeToken_;
        minimumPayment = minimumPayment_;
        maximumPaymentPerWallet = maximumPaymentPerWallet_;
    }

    function buy(uint256 paymentAmount) external nonReentrant whenNotPaused {
        if (block.timestamp < startTime || block.timestamp >= endTime || finalized) {
            revert SaleNotActive();
        }
        if (paymentAmount < minimumPayment) revert PaymentBelowMinimum();

        uint256 updatedContribution = contributed[msg.sender] + paymentAmount;
        if (updatedContribution > maximumPaymentPerWallet) revert WalletMaximumExceeded();

        uint256 tokenAmount = Math.mulDiv(paymentAmount, TOKEN_SCALE, pricePerWholeToken);
        if (tokenAmount == 0) revert ZeroTokenOutput();
        if (totalSold + tokenAmount > allocation) revert AllocationExceeded();
        if (saleToken.balanceOf(address(this)) < tokenAmount) revert InsufficientInventory();

        contributed[msg.sender] = updatedContribution;
        totalSold += tokenAmount;

        paymentToken.safeTransferFrom(msg.sender, treasury, paymentAmount);
        IERC20(address(saleToken)).safeTransfer(msg.sender, tokenAmount);

        emit TokensPurchased(msg.sender, paymentAmount, tokenAmount);
    }

    function quote(uint256 paymentAmount) external view returns (uint256) {
        return Math.mulDiv(paymentAmount, TOKEN_SCALE, pricePerWholeToken);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function finalize() external onlyOwner nonReentrant {
        if (finalized) revert AlreadyFinalized();
        if (block.timestamp < endTime) revert SaleNotEnded();

        finalized = true;
        uint256 unsold = allocation - totalSold;
        if (saleToken.balanceOf(address(this)) < unsold) revert InsufficientInventory();
        if (unsold != 0) saleToken.burn(unsold);

        emit RoundFinalized(unsold, totalSold);
    }
}
