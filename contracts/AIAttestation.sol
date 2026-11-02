// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @dev Interface for DocumentRegistry on-chain integrity check
 */
interface IDocumentRegistry {
    function verifyIntegrity(bytes32 _docId, bytes32 _docHash) external view returns (bool);
}

/**
 * @title AIAttestation
 * @notice Anchors cryptographically signed off-chain AI document verification results.
 * @dev EIP-712 typed-data signature verification with replay & malleability protection.
 * Self-contained for Remix IDE compilation (Solidity ^0.8.19, 200 optimizer runs).
 */
contract AIAttestation {
    address public owner;
    address public aiSigner;
    IDocumentRegistry public documentRegistry;

    // EIP-712 TypeHashes
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "DocAttestation(bytes32 docId,bytes32 docHash,uint8 verdict,uint16 confidenceBps,bytes32 templateRef,bytes32 modelVersion,bytes32 explanationHash,uint256 nonce,uint256 deadline)"
    );

    bytes32 private immutable NAME_HASH = keccak256(bytes("LoanChainAI"));
    bytes32 private immutable VERSION_HASH = keccak256(bytes("1"));

    // Attestation data structure (verdict: 0 = Approved, 1 = Borderline, 2 = Rejected)
    struct DocAttestation {
        bytes32 docId;
        bytes32 docHash;
        uint8 verdict;
        uint16 confidenceBps;
        bytes32 templateRef;
        bytes32 modelVersion;
        bytes32 explanationHash;
        uint256 nonce;
        uint256 deadline;
    }

    // Replay protection: tracking spent nonces
    mapping(uint256 => bool) public usedNonces;

    // Latest attestation record per docId
    mapping(bytes32 => DocAttestation) public latestAttestation;
    mapping(bytes32 => bool) public hasAttestation;

    // Append-only audit history of attestations per docId
    mapping(bytes32 => DocAttestation[]) private attestationHistory;

    // Events
    event DocumentAIAttested(
        bytes32 indexed docId,
        uint8 verdict,
        uint16 confidenceBps,
        bytes32 explanationHash,
        address indexed submitter,
        uint256 timestamp
    );

    event AISignerUpdated(address indexed oldSigner, address indexed newSigner);

    modifier onlyOwner() {
        require(msg.sender == owner, "AIAttestation: Only owner");
        _;
    }

    constructor(address _documentRegistry, address _aiSigner) {
        require(_documentRegistry != address(0), "AIAttestation: Zero document registry");
        require(_aiSigner != address(0), "AIAttestation: Zero AI signer");
        owner = msg.sender;
        documentRegistry = IDocumentRegistry(_documentRegistry);
        aiSigner = _aiSigner;
    }

    function setAISigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "AIAttestation: Zero address");
        address old = aiSigner;
        aiSigner = _newSigner;
        emit AISignerUpdated(old, _newSigner);
    }

    function setDocumentRegistry(address _registry) external onlyOwner {
        require(_registry != address(0), "AIAttestation: Zero address");
        documentRegistry = IDocumentRegistry(_registry);
    }

    /**
     * @notice Computes EIP-712 domain separator dynamically incorporating chainid
     */
    function domainSeparator() public view returns (bytes32) {
        return keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                NAME_HASH,
                VERSION_HASH,
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Submits an EIP-712 signed AI verification attestation for on-chain anchoring.
     * @param att Attestation payload
     * @param signature 65-byte cryptographic signature signed by aiSigner
     */
    function submitAttestation(
        DocAttestation calldata att,
        bytes calldata signature
    ) external {
        // 1. Expiration check
        require(block.timestamp <= att.deadline, "AIAttestation: Attestation expired");

        // 2. Nonce replay protection
        require(!usedNonces[att.nonce], "AIAttestation: Nonce already used");
        usedNonces[att.nonce] = true;

        // 3. Document integrity check with DocumentRegistry
        require(
            documentRegistry.verifyIntegrity(att.docId, att.docHash),
            "AIAttestation: Document hash mismatch or revoked"
        );

        // 4. Compute EIP-712 struct hash
        bytes32 structHash = keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                att.docId,
                att.docHash,
                att.verdict,
                att.confidenceBps,
                att.templateRef,
                att.modelVersion,
                att.explanationHash,
                att.nonce,
                att.deadline
            )
        );

        // 5. Compute final EIP-712 digest
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator(), structHash));

        // 6. Recover and verify signer
        require(signature.length == 65, "AIAttestation: Invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        // Enforce low-s malleability check (secp256k1n / 2)
        require(
            uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D57617F775B6159584C609677274530,
            "AIAttestation: Invalid signature s"
        );
        require(v == 27 || v == 28, "AIAttestation: Invalid signature v");

        address recovered = ecrecover(digest, v, r, s);
        require(recovered != address(0) && recovered == aiSigner, "AIAttestation: Invalid AI signer");

        // 7. Store latest attestation & append to immutable history
        latestAttestation[att.docId] = att;
        hasAttestation[att.docId] = true;
        attestationHistory[att.docId].push(att);

        emit DocumentAIAttested(
            att.docId,
            att.verdict,
            att.confidenceBps,
            att.explanationHash,
            msg.sender,
            block.timestamp
        );
    }

    // ─── View Functions ───────────────────────────────────────────────

    function getLatestAttestation(bytes32 docId) external view returns (DocAttestation memory) {
        require(hasAttestation[docId], "AIAttestation: No attestation exists");
        return latestAttestation[docId];
    }

    function getAttestationHistoryLength(bytes32 docId) external view returns (uint256) {
        return attestationHistory[docId].length;
    }

    function getAttestationAt(bytes32 docId, uint256 index) external view returns (DocAttestation memory) {
        require(index < attestationHistory[docId].length, "AIAttestation: Index out of bounds");
        return attestationHistory[docId][index];
    }

    /**
     * @notice Computes aggregate bundle verdict across an array of document IDs.
     * @return verdict 0 = All Approved, 1 = Borderline or Incomplete, 2 = Any Rejected
     * @return attestedCount Number of documents in bundle with on-chain attestations
     */
    function bundleVerdict(bytes32[] calldata docIds) external view returns (uint8 verdict, uint256 attestedCount) {
        if (docIds.length == 0) return (1, 0);

        uint256 count = 0;
        bool allApproved = true;

        for (uint256 i = 0; i < docIds.length; i++) {
            bytes32 dId = docIds[i];
            if (hasAttestation[dId]) {
                count++;
                uint8 v = latestAttestation[dId].verdict;
                if (v == 2) {
                    // Any rejection immediately causes bundle rejection
                    return (2, count);
                }
                if (v != 0) {
                    allApproved = false;
                }
            } else {
                allApproved = false;
            }
        }

        if (count == docIds.length && allApproved) {
            return (0, count); // All Approved
        }
        return (1, count); // Borderline or partially attested
    }
}
