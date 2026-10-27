// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ConsentManager
 * @notice Applicant controls which banks/institutions can access their documents
 */
contract ConsentManager {
    struct Consent {
        address grantedTo;     // bank or institution address
        bytes32[] docIds;      // specific documents consented
        uint256 expiresAt;     // unix timestamp
        bool isActive;
        uint256 grantedAt;
    }

    // applicant => consentId => Consent
    mapping(address => mapping(bytes32 => Consent)) public consents;
    // applicant => list of consentIds
    mapping(address => bytes32[]) public applicantConsents;

    event ConsentGranted(address indexed applicant, address indexed grantedTo, bytes32 consentId, uint256 expiresAt);
    event ConsentRevoked(address indexed applicant, bytes32 consentId, uint256 timestamp);

    /**
     * @notice Grant time-limited access to a specific bank for specific documents
     */
    function grantConsent(
        address _grantedTo,
        bytes32[] calldata _docIds,
        uint256 _durationSeconds
    ) external returns (bytes32 consentId) {
        require(_grantedTo != address(0), "ConsentManager: Zero address");
        require(_docIds.length > 0, "ConsentManager: No docs specified");
        require(_durationSeconds > 0, "ConsentManager: Duration must be > 0");

        uint256 expiresAt = block.timestamp + _durationSeconds;
        consentId = keccak256(abi.encodePacked(msg.sender, _grantedTo, block.timestamp));

        consents[msg.sender][consentId] = Consent({
            grantedTo: _grantedTo,
            docIds: _docIds,
            expiresAt: expiresAt,
            isActive: true,
            grantedAt: block.timestamp
        });

        applicantConsents[msg.sender].push(consentId);
        emit ConsentGranted(msg.sender, _grantedTo, consentId, expiresAt);
    }

    /**
     * @notice Revoke a previously granted consent
     */
    function revokeConsent(bytes32 _consentId) external {
        Consent storage consent = consents[msg.sender][_consentId];
        require(consent.isActive, "ConsentManager: Consent not active");
        consent.isActive = false;
        emit ConsentRevoked(msg.sender, _consentId, block.timestamp);
    }

    /**
     * @notice Check if a bank has valid consent for a document
     */
    function hasValidConsent(
        address _applicant,
        bytes32 _consentId,
        address _requester
    ) external view returns (bool) {
        Consent storage consent = consents[_applicant][_consentId];
        return consent.isActive &&
               consent.grantedTo == _requester &&
               block.timestamp <= consent.expiresAt;
    }

    function getApplicantConsents(address _applicant) external view returns (bytes32[] memory) {
        return applicantConsents[_applicant];
    }

    function getConsent(address _applicant, bytes32 _consentId) external view returns (
        address grantedTo, uint256 expiresAt, bool isActive, uint256 grantedAt, uint256 docCount
    ) {
        Consent storage c = consents[_applicant][_consentId];
        return (c.grantedTo, c.expiresAt, c.isActive, c.grantedAt, c.docIds.length);
    }
}
