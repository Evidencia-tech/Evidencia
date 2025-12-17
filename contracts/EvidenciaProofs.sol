// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EvidenciaProofs {
    struct Proof {
        bytes32 hash;
        uint256 timestamp;
        string uri;
    }

    mapping(bytes32 => Proof) public proofs;
    event ProofRegistered(bytes32 indexed hash, uint256 timestamp, string uri, address indexed sender);

    function registerProof(bytes32 hash, uint256 timestamp, string memory uri) public returns (bool) {
        require(hash != bytes32(0), "hash required");
        require(proofs[hash].timestamp == 0, "already registered");
        proofs[hash] = Proof({hash: hash, timestamp: timestamp, uri: uri});
        emit ProofRegistered(hash, timestamp, uri, msg.sender);
        return true;
    }

    function getProof(bytes32 hash) external view returns (Proof memory) {
        return proofs[hash];
    }
}
