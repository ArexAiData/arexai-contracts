// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Test-only authorization harness. NOT Safe and NOT for deployment with real funds.
contract StakingSafeHarness {
    address[3] private signers;
    uint256 public nonce;
    mapping(bytes32 => mapping(address => bool)) public approvals;
    constructor(address a, address b, address c) { signers = [a,b,c]; }
    function getOwners() external view returns (address[] memory out) {
        out = new address[](3);
        for (uint256 i; i < 3; ++i) out[i] = signers[i];
    }
    function getThreshold() external pure returns (uint256) { return 2; }
    function confirm(address to, bytes calldata data) external {
        require(msg.sender == signers[0] || msg.sender == signers[1] || msg.sender == signers[2], "not signer");
        approvals[keccak256(abi.encode(to,data,nonce))][msg.sender] = true;
    }
    function execute(address to, bytes calldata data) external {
        bytes32 key = keccak256(abi.encode(to,data,nonce));
        uint256 count;
        for (uint256 i; i < 3; ++i) if (approvals[key][signers[i]]) ++count;
        require(count >= 2, "two approvals required");
        ++nonce;
        (bool ok, bytes memory reason) = to.call(data);
        if (!ok) assembly { revert(add(reason,32),mload(reason)) }
    }
}
