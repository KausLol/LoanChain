// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IssuerRegistry
 * @notice Manages trusted document issuers (employers, banks) who can attest documents
 * @dev Only the contract owner (admin/bank) can add or revoke issuers
 */
contract IssuerRegistry {
    address public owner;

    struct Issuer {
        string name;
        string issuerType; // "employer" | "bank" | "government"
        bool isActive;
        uint256 registeredAt;
        address registeredBy;
    }

    mapping(address => Issuer) public issuers;
    address[] public issuerList;

    event IssuerAdded(address indexed issuerAddress, string name, string issuerType, uint256 timestamp);
    event IssuerRevoked(address indexed issuerAddress, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "IssuerRegistry: Only owner");
        _;
    }

    modifier onlyActiveIssuer() {
        require(issuers[msg.sender].isActive, "IssuerRegistry: Not an active issuer");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addIssuer(address _issuerAddress, string calldata _name, string calldata _issuerType) external onlyOwner {
        require(_issuerAddress != address(0), "IssuerRegistry: Zero address");
        require(bytes(_name).length > 0, "IssuerRegistry: Empty name");
        require(!issuers[_issuerAddress].isActive, "IssuerRegistry: Already active");

        issuers[_issuerAddress] = Issuer({
            name: _name,
            issuerType: _issuerType,
            isActive: true,
            registeredAt: block.timestamp,
            registeredBy: msg.sender
        });
        issuerList.push(_issuerAddress);

        emit IssuerAdded(_issuerAddress, _name, _issuerType, block.timestamp);
    }

    function revokeIssuer(address _issuerAddress) external onlyOwner {
        require(issuers[_issuerAddress].isActive, "IssuerRegistry: Not active");
        issuers[_issuerAddress].isActive = false;
        emit IssuerRevoked(_issuerAddress, block.timestamp);
    }

    function isActiveIssuer(address _addr) external view returns (bool) {
        return issuers[_addr].isActive;
    }

    function getIssuerCount() external view returns (uint256) {
        return issuerList.length;
    }

    function getIssuer(address _addr) external view returns (string memory name, string memory issuerType, bool active, uint256 registeredAt) {
        Issuer storage iss = issuers[_addr];
        return (iss.name, iss.issuerType, iss.isActive, iss.registeredAt);
    }
}
