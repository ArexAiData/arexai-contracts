// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {StakingDeadlineQueue} from "../StakingDeadlineQueue.sol";
contract StakingDeadlineQueueHarness {
    using StakingDeadlineQueue for StakingDeadlineQueue.Queue;
    StakingDeadlineQueue.Queue private q;
    function insert(uint256 id,uint256 at) external { q.insert(id,at); }
    function updateFirst(uint256 at) external { q.updateFirst(at); }
    function removeFirst() external { q.removeFirst(); }
    function first() external view returns(uint256,uint256) { return q.first(); }
    function length() external view returns(uint256) { return q.length(); }
}
