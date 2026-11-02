// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IssuerRegistry.sol";

/**
 * @title DocumentRegistry
 * @notice Stores document hashes on-chain. Actual documents stored off-chain (IPFS).
 * @dev Documents are identified by their keccak256 hash. No personal data stored on-chain.
 */
contract DocumentRegistry {
    IssuerRegistry public issuerRegistry;
    address public owner;

    enum DocType { SalarySlip, BankStatement, AadhaarCard, PANCard, AddressProof, ITReturn, Other }
    enum DocStatus { Pending, IssuerAttested, Verified, Rejected, Revoked }

    struct Document {
        bytes32 docHash;          // keccak256 of file content
        bytes32 saltedHash;       // keccak256(docHash + salt) for privacy
        address owner;            // applicant address
        address issuer;           // issuer who attested (0x0 if self-uploaded)
        DocType docType;
        DocStatus status;
        string ipfsCid;           // off-chain storage CID (encrypted file)
        uint256 uploadedAt;
        uint256 attestedAt;
        bool isRevoked;
        bytes32 merkleRoot;       // Merkle root of applicant's document bundle
    }

    // docId => Document
    mapping(bytes32 => Document) public documents;
    // applicant => list of docIds
    mapping(address => bytes32[]) public applicantDocs;
    // docHash => exists (prevent duplicate uploads)
    mapping(bytes32 => bool) public hashExists;

    // Audit log
    struct AuditEntry {
        bytes32 docId;
        address actor;
        string action;
        uint256 timestamp;
    }
    AuditEntry[] public auditLog;

    event DocumentUploaded(bytes32 indexed docId, address indexed owner, DocType docType, uint256 timestamp);
    event DocumentAttested(bytes32 indexed docId, address indexed issuer, uint256 timestamp);
    event DocumentVerified(bytes32 indexed docId, uint256 timestamp);
    event DocumentRevoked(bytes32 indexed docId, address indexed revokedBy, uint256 timestamp);
    event AuditLogged(bytes32 indexed docId, address indexed actor, string action, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "DocumentRegistry: Only owner");
        _;
    }

    modifier onlyDocOwner(bytes32 _docId) {
        require(documents[_docId].owner == msg.sender, "DocumentRegistry: Not doc owner");
        _;
    }

    constructor(address _issuerRegistry) {
        issuerRegistry = IssuerRegistry(_issuerRegistry);
        owner = msg.sender;
    }

    /**
     * @notice Upload a document hash. Actual file stays off-chain.
     * @param _docHash keccak256 hash of document content
     * @param _salt A random salt (bytes32) for salted hash privacy
     * @param _docType Document type enum
     * @param _ipfsCid IPFS CID of the encrypted document
     * @param _merkleRoot Merkle root of the applicant's full document bundle
     */
    function uploadDocument(
        bytes32 _docHash,
        bytes32 _salt,
        DocType _docType,
        string calldata _ipfsCid,
        bytes32 _merkleRoot
    ) external returns (bytes32 docId) {
        require(!hashExists[_docHash], "DocumentRegistry: Hash already registered");
        require(bytes(_ipfsCid).length > 0, "DocumentRegistry: Empty CID");

        bytes32 saltedHash = keccak256(abi.encodePacked(_docHash, _salt));
        docId = keccak256(abi.encodePacked(msg.sender, _docHash, block.timestamp));

        documents[docId] = Document({
            docHash: _docHash,
            saltedHash: saltedHash,
            owner: msg.sender,
            issuer: address(0),
            docType: _docType,
            status: DocStatus.Pending,
            ipfsCid: _ipfsCid,
            uploadedAt: block.timestamp,
            attestedAt: 0,
            isRevoked: false,
            merkleRoot: _merkleRoot
        });

        applicantDocs[msg.sender].push(docId);
        hashExists[_docHash] = true;

        _logAudit(docId, msg.sender, "UPLOADED");
        emit DocumentUploaded(docId, msg.sender, _docType, block.timestamp);
    }

    /**
     * @notice Issuer attests a document (e.g., employer confirms salary slip)
     */
    function attestDocument(bytes32 _docId) external {
        require(issuerRegistry.isActiveIssuer(msg.sender), "DocumentRegistry: Not a registered issuer");
        Document storage doc = documents[_docId];
        require(doc.owner != address(0), "DocumentRegistry: Doc not found");
        require(doc.status == DocStatus.Pending, "DocumentRegistry: Already processed");
        require(!doc.isRevoked, "DocumentRegistry: Doc revoked");

        doc.issuer = msg.sender;
        doc.status = DocStatus.IssuerAttested;
        doc.attestedAt = block.timestamp;

        _logAudit(_docId, msg.sender, "ISSUER_ATTESTED");
        emit DocumentAttested(_docId, msg.sender, block.timestamp);
    }

    /**
     * @notice Admin verifies a document (post AI check)
     */
    function verifyDocument(bytes32 _docId) external onlyOwner {
        Document storage doc = documents[_docId];
        require(doc.owner != address(0), "DocumentRegistry: Doc not found");
        doc.status = DocStatus.Verified;
        _logAudit(_docId, msg.sender, "VERIFIED");
        emit DocumentVerified(_docId, block.timestamp);
    }

    /**
     * @notice Reject a document
     */
    function rejectDocument(bytes32 _docId) external onlyOwner {
        Document storage doc = documents[_docId];
        require(doc.owner != address(0), "DocumentRegistry: Doc not found");
        doc.status = DocStatus.Rejected;
        _logAudit(_docId, msg.sender, "REJECTED");
    }

    /**
     * @notice Applicant or admin can revoke a document
     */
    function revokeDocument(bytes32 _docId) external {
        Document storage doc = documents[_docId];
        require(doc.owner == msg.sender || msg.sender == owner, "DocumentRegistry: Unauthorized");
        require(!doc.isRevoked, "DocumentRegistry: Already revoked");
        doc.isRevoked = true;
        doc.status = DocStatus.Revoked;
        _logAudit(_docId, msg.sender, "REVOKED");
        emit DocumentRevoked(_docId, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify document integrity — checks if a hash matches on-chain record
     */
    function verifyIntegrity(bytes32 _docId, bytes32 _docHash) external view returns (bool) {
        return documents[_docId].docHash == _docHash && !documents[_docId].isRevoked;
    }

    function getApplicantDocs(address _applicant) external view returns (bytes32[] memory) {
        return applicantDocs[_applicant];
    }

    function getDocument(bytes32 _docId) external view returns (
        bytes32 docHash, address docOwner, address issuer,
        uint8 docType, uint8 status, string memory ipfsCid,
        uint256 uploadedAt, uint256 attestedAt, bool isRevoked, bytes32 merkleRoot
    ) {
        Document storage doc = documents[_docId];
        return (
            doc.docHash, doc.owner, doc.issuer,
            uint8(doc.docType), uint8(doc.status), doc.ipfsCid,
            doc.uploadedAt, doc.attestedAt, doc.isRevoked, doc.merkleRoot
        );
    }

    function getAuditLogLength() external view returns (uint256) {
        return auditLog.length;
    }

    function getAuditEntry(uint256 _index) external view returns (bytes32, address, string memory, uint256) {
        AuditEntry storage entry = auditLog[_index];
        return (entry.docId, entry.actor, entry.action, entry.timestamp);
    }

    function _logAudit(bytes32 _docId, address _actor, string memory _action) internal {
        auditLog.push(AuditEntry({
            docId: _docId,
            actor: _actor,
            action: _action,
            timestamp: block.timestamp
        }));
        emit AuditLogged(_docId, _actor, _action, block.timestamp);
    }
}
