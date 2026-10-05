// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IStakingSafe {
    function getOwners() external view returns (address[] memory);
    function getThreshold() external view returns (uint256);
}
interface IBurnableARXAI is IERC20 { function burn(uint256 amount) external; }

/// @notice Unreleased prototype. No mainnet deployment is authorized by this source.
/// @dev Permissionless bounded checkpoints settle every eligible flexible position
/// before claims or new reservations, preventing claim-order priority at exhaustion.
contract ArexAIStaking is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;

    uint256 public constant REWARD_CAP = 115_000_000 ether;
    uint256 public constant YEAR = 365 days;
    uint256 public constant MAX_BATCH = 64;
    IERC20 public immutable token;
    address public immutable governance;
    enum Mode { Flexible, Days30, Days60, Days90 }
    enum Phase { Idle, Scan, Allocate }
    struct Position {
        address holder;
        uint256 principal;
        uint256 started;
        uint256 ends;
        uint256 settledDays;
        uint256 reward;
        Mode mode;
        bool active;
    }
    mapping(uint256 => Position) public positions;
    mapping(uint256 => uint256) private pending;
    EnumerableSet.UintSet private activePositions;
    EnumerableSet.UintSet private flexiblePositions;
    uint256 public nextId = 1;
    uint256 public totalPrincipal;
    uint256 public freeRewards;
    uint256 public reservedLocked;
    uint256 public owedFlexible;
    uint256 public paidRewards;
    uint256 public burnedRewards;
    bool public activated;
    bool public permanentlyClosed;
    bool public shutdownFinalized;
    uint256 public shutdownAt;
    uint256 public flexResumeAt;
    uint256 public nextFlexibleDue = type(uint256).max;
    Phase public phase;
    uint256 public checkpointAt;
    uint256 public checkpointCursor;
    uint256 public checkpointCount;
    uint256 public checkpointTotalDue;
    uint256 public checkpointSaved;
    uint256 public checkpointBudget;
    uint256 public checkpointRemaining;
    uint256 private lastEligible;
    uint256 private followingDue;

    error InvalidConfiguration();
    error NotReady();
    error Closed();
    error InvalidAmount();
    error InsufficientRewards();
    error CheckpointRequired();
    error InvalidBatch();
    error NotHolder();
    error InvalidPosition();
    error WrongMode();
    error NoReward();
    error NotGovernance();
    error AlreadyClosed();
    event Activated(uint256 amount);
    event Staked(uint256 indexed id, address indexed holder, Mode mode, uint256 amount, uint256 ends, uint256 rewardReserved);
    event RewardClaimed(uint256 indexed id, address indexed holder, uint256 reward);
    event Withdrawn(uint256 indexed id, address indexed holder, uint256 principal, uint256 reward, bool early);
    event CheckpointStarted(uint256 at, uint256 count, bool emergency);
    event CheckpointCompleted(uint256 at, uint256 flexibleAllocated);
    event EmergencyClosed(uint256 at);
    event UnusedRewardsBurned(uint256 amount);

    constructor(address token_, address governance_) {
        if (token_.code.length == 0 || governance_.code.length == 0) revert InvalidConfiguration();
        token = IERC20(token_);
        governance = governance_;
        _checkSafe();
    }

    function _checkSafe() private view {
        address[] memory owners = IStakingSafe(governance).getOwners();
        if (owners.length != 3 || IStakingSafe(governance).getThreshold() != 2) revert InvalidConfiguration();
        if (owners[0] == address(0) || owners[1] == address(0) || owners[2] == address(0)
            || owners[0] == owners[1] || owners[0] == owners[2] || owners[1] == owners[2]) revert InvalidConfiguration();
    }

    function activate() external nonReentrant { _activate(); }
    function _activate() private {
        if (activated) revert NotReady();
        if (token.balanceOf(address(this)) < REWARD_CAP) revert NotReady();
        activated = true;
        freeRewards = REWARD_CAP;
        flexResumeAt = block.timestamp;
        emit Activated(REWARD_CAP);
    }
    function fundAndActivate() external nonReentrant {
        if (activated) revert NotReady();
        token.safeTransferFrom(msg.sender, address(this), REWARD_CAP);
        _activate();
    }

    function aprBps(Mode mode) public pure returns (uint256) {
        if (mode == Mode.Flexible) return 200;
        if (mode == Mode.Days30) return 500;
        if (mode == Mode.Days60) return 800;
        return 1200;
    }
    function duration(Mode mode) public pure returns (uint256) {
        if (mode == Mode.Flexible) return 0;
        if (mode == Mode.Days30) return 30 days;
        if (mode == Mode.Days60) return 60 days;
        return 90 days;
    }
    function quote(uint256 amount, Mode mode) public pure returns (uint256) {
        uint256 seconds_ = mode == Mode.Flexible ? 1 days : duration(mode);
        return Math.mulDiv(amount, aprBps(mode) * seconds_, 10_000 * YEAR);
    }

    function stake(uint256 amount, Mode mode) external nonReentrant returns (uint256 id) {
        if (!activated) {
            if (token.balanceOf(address(this)) >= REWARD_CAP) _activate();
            else revert NotReady();
        }
        if (permanentlyClosed) revert Closed();
        _requireSettled();
        if (amount == 0) revert InvalidAmount();
        if (freeRewards == 0) revert InsufficientRewards();
        uint256 reserved = mode == Mode.Flexible ? 0 : quote(amount, mode);
        if (reserved > freeRewards) revert InsufficientRewards();
        freeRewards -= reserved;
        reservedLocked += reserved;
        uint256 balance = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        if (token.balanceOf(address(this)) - balance != amount) revert InvalidAmount();
        id = nextId++;
        uint256 ends = mode == Mode.Flexible ? 0 : block.timestamp + duration(mode);
        positions[id] = Position(msg.sender, amount, block.timestamp, ends, 0, reserved, mode, true);
        activePositions.add(id);
        totalPrincipal += amount;
        if (mode == Mode.Flexible && quote(amount, mode) > 0) {
            flexiblePositions.add(id);
            nextFlexibleDue = Math.min(nextFlexibleDue, block.timestamp + 1 days);
        }
        if (freeRewards == 0) flexResumeAt = type(uint256).max;
        emit Staked(id, msg.sender, mode, amount, ends, reserved);
    }

    function activeCount() external view returns (uint256) { return activePositions.length(); }
    function activeIdAt(uint256 index) external view returns (uint256) { return activePositions.at(index); }

    function _requireSettled() private view {
        if (phase != Phase.Idle) revert CheckpointRequired();
        if (!permanentlyClosed && block.timestamp >= nextFlexibleDue) revert CheckpointRequired();
        if (permanentlyClosed && !shutdownFinalized) revert CheckpointRequired();
    }

    function _daysAndDue(Position storage p, uint256 at) private view returns (uint256 days_, uint256 due) {
        days_ = (at - p.started) / 1 days;
        if (flexResumeAt == type(uint256).max) return (days_, 0);
        uint256 baseline = p.settledDays;
        if (flexResumeAt > p.started) {
            baseline = Math.max(baseline, Math.ceilDiv(flexResumeAt - p.started, 1 days));
        }
        if (days_ > baseline) due = (days_ - baseline) * quote(p.principal, Mode.Flexible);
    }

    /// @notice Anyone may advance a due settlement. Work is capped, never loops over all users in one transaction.
    function checkpoint(uint256 maxWork) external nonReentrant {
        if (maxWork == 0 || maxWork > MAX_BATCH) revert InvalidBatch();
        if (!activated || shutdownFinalized) revert NotReady();
        if (phase == Phase.Idle) {
            if (permanentlyClosed || block.timestamp < nextFlexibleDue) revert NotReady();
            _startCheckpoint(block.timestamp);
        }
        for (uint256 work; work < maxWork && phase != Phase.Idle; ++work) {
            if (phase == Phase.Scan) _scanOne();
            else _allocateOne();
        }
    }

    function _startCheckpoint(uint256 at) private {
        phase = Phase.Scan;
        checkpointAt = at;
        checkpointCursor = 0;
        checkpointCount = permanentlyClosed ? activePositions.length() : flexiblePositions.length();
        checkpointTotalDue = 0;
        checkpointSaved = 0;
        lastEligible = 0;
        followingDue = type(uint256).max;
        emit CheckpointStarted(at, checkpointCount, permanentlyClosed);
        if (checkpointCount == 0) _finishScan();
    }
    function _idAt(uint256 index) private view returns (uint256) {
        return permanentlyClosed ? activePositions.at(index) : flexiblePositions.at(index);
    }
    function _scanOne() private {
        uint256 id = _idAt(checkpointCursor);
        Position storage p = positions[id];
        uint256 due;
        if (p.mode == Mode.Flexible) {
            (uint256 days_, uint256 amount) = _daysAndDue(p, checkpointAt);
            due = amount;
            p.settledDays = days_;
            followingDue = Math.min(followingDue, p.started + (days_ + 1) * 1 days);
            checkpointTotalDue += due;
            if (due > 0) lastEligible = id;
        } else {
            due = Math.mulDiv(p.principal, aprBps(p.mode) * (Math.min(checkpointAt, p.ends) - p.started), 10_000 * YEAR);
            checkpointSaved += p.reward - due;
        }
        pending[id] = due;
        ++checkpointCursor;
        if (checkpointCursor == checkpointCount) _finishScan();
    }
    function _finishScan() private {
        if (permanentlyClosed) {
            reservedLocked -= checkpointSaved;
            freeRewards += checkpointSaved;
        }
        checkpointBudget = Math.min(checkpointTotalDue, freeRewards);
        checkpointRemaining = checkpointBudget;
        checkpointCursor = 0;
        phase = Phase.Allocate;
        if (checkpointCount == 0) _finishCheckpoint();
    }
    function _allocateOne() private {
        uint256 id = _idAt(checkpointCursor);
        Position storage p = positions[id];
        if (p.mode == Mode.Flexible) {
            uint256 reward;
            if (pending[id] > 0) {
                reward = id == lastEligible ? checkpointRemaining : Math.mulDiv(pending[id], checkpointBudget, checkpointTotalDue);
                checkpointRemaining -= reward;
            }
            p.reward += reward;
            owedFlexible += reward;
            freeRewards -= reward;
        } else p.reward = pending[id];
        delete pending[id];
        ++checkpointCursor;
        if (checkpointCursor == checkpointCount) _finishCheckpoint();
    }
    function _finishCheckpoint() private {
        phase = Phase.Idle;
        nextFlexibleDue = followingDue;
        if (freeRewards == 0) flexResumeAt = type(uint256).max;
        if (permanentlyClosed) {
            shutdownFinalized = true;
            uint256 toBurn = freeRewards;
            freeRewards = 0;
            burnedRewards += toBurn;
            if (toBurn > 0) IBurnableARXAI(address(token)).burn(toBurn);
            emit UnusedRewardsBurned(toBurn);
        }
        emit CheckpointCompleted(checkpointAt, checkpointBudget);
    }

    function claim(uint256 id) external nonReentrant {
        _requireSettled();
        Position storage p = _position(id);
        if (p.mode != Mode.Flexible) revert WrongMode();
        uint256 reward = p.reward;
        if (reward == 0) revert NoReward();
        p.reward = 0;
        owedFlexible -= reward;
        paidRewards += reward;
        token.safeTransfer(msg.sender, reward);
        emit RewardClaimed(id, msg.sender, reward);
    }
    function withdraw(uint256 id) external nonReentrant {
        _requireSettled();
        Position storage p = _position(id);
        uint256 principal = p.principal;
        uint256 reward;
        bool early = !permanentlyClosed && p.mode != Mode.Flexible && block.timestamp < p.ends;
        if (p.mode == Mode.Flexible) {
            reward = p.reward;
            owedFlexible -= reward;
            flexiblePositions.remove(id);
        } else {
            reservedLocked -= p.reward;
            if (early) {
                bool resume = freeRewards == 0;
                freeRewards += p.reward;
                if (resume && freeRewards > 0) flexResumeAt = block.timestamp;
            } else reward = p.reward;
        }
        paidRewards += reward;
        totalPrincipal -= principal;
        p.active = false;
        p.principal = 0;
        p.reward = 0;
        activePositions.remove(id);
        token.safeTransfer(msg.sender, principal + reward);
        emit Withdrawn(id, msg.sender, principal, reward, early);
    }
    function _position(uint256 id) private view returns (Position storage p) {
        p = positions[id];
        if (!p.active) revert InvalidPosition();
        if (p.holder != msg.sender) revert NotHolder();
    }

    /// @notice Irreversible. A configured 2-of-3 Safe must authorize the call.
    /// Finish any in-progress checkpoint first; anyone can progress it in bounded batches.
    function emergencyClose() external nonReentrant {
        if (msg.sender != governance) revert NotGovernance();
        _checkSafe();
        if (permanentlyClosed) revert AlreadyClosed();
        if (!activated) revert NotReady();
        if (phase != Phase.Idle) revert CheckpointRequired();
        permanentlyClosed = true;
        shutdownAt = block.timestamp;
        emit EmergencyClosed(shutdownAt);
        _startCheckpoint(shutdownAt);
    }
}
