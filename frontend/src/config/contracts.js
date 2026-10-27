// ─── Contract Addresses (update after Remix IDE deployment) ─────────────────
// Deploy order: IssuerRegistry → DocumentRegistry → ConsentManager → LoanApplication

export const CONTRACT_ADDRESSES = {
  IssuerRegistry:   import.meta.env.VITE_ISSUER_REGISTRY   || "0x0000000000000000000000000000000000000000",
  DocumentRegistry: import.meta.env.VITE_DOC_REGISTRY       || "0x0000000000000000000000000000000000000000",
  ConsentManager:   import.meta.env.VITE_CONSENT_MANAGER    || "0x0000000000000000000000000000000000000000",
  LoanApplication:  import.meta.env.VITE_LOAN_APPLICATION   || "0x0000000000000000000000000000000000000000",
};

export const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex

export const SEPOLIA_NETWORK = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: "Sepolia Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

// ─── ABIs ────────────────────────────────────────────────────────────────────

export const ISSUER_REGISTRY_ABI = [
  "function owner() view returns (address)",
  "function addIssuer(address _issuerAddress, string _name, string _issuerType) external",
  "function revokeIssuer(address _issuerAddress) external",
  "function isActiveIssuer(address _addr) view returns (bool)",
  "function getIssuer(address _addr) view returns (string name, string issuerType, bool active, uint256 registeredAt)",
  "function getIssuerCount() view returns (uint256)",
  "function issuerList(uint256) view returns (address)",
  "event IssuerAdded(address indexed issuerAddress, string name, string issuerType, uint256 timestamp)",
  "event IssuerRevoked(address indexed issuerAddress, uint256 timestamp)",
];

export const DOCUMENT_REGISTRY_ABI = [
  "function uploadDocument(bytes32 _docHash, bytes32 _salt, uint8 _docType, string _ipfsCid, bytes32 _merkleRoot) external returns (bytes32 docId)",
  "function attestDocument(bytes32 _docId) external",
  "function verifyDocument(bytes32 _docId) external",
  "function rejectDocument(bytes32 _docId) external",
  "function revokeDocument(bytes32 _docId) external",
  "function verifyIntegrity(bytes32 _docId, bytes32 _docHash) view returns (bool)",
  "function getApplicantDocs(address _applicant) view returns (bytes32[])",
  "function getDocument(bytes32 _docId) view returns (bytes32 docHash, address docOwner, address issuer, uint8 docType, uint8 status, string ipfsCid, uint256 uploadedAt, uint256 attestedAt, bool isRevoked, bytes32 merkleRoot)",
  "function getAuditLogLength() view returns (uint256)",
  "function getAuditEntry(uint256 _index) view returns (bytes32, address, string, uint256)",
  "event DocumentUploaded(bytes32 indexed docId, address indexed owner, uint8 docType, uint256 timestamp)",
  "event DocumentAttested(bytes32 indexed docId, address indexed issuer, uint256 timestamp)",
  "event DocumentRevoked(bytes32 indexed docId, address indexed revokedBy, uint256 timestamp)",
  "event AuditLogged(bytes32 indexed docId, address indexed actor, string action, uint256 timestamp)",
];

export const CONSENT_MANAGER_ABI = [
  "function grantConsent(address _grantedTo, bytes32[] _docIds, uint256 _durationSeconds) external returns (bytes32 consentId)",
  "function revokeConsent(bytes32 _consentId) external",
  "function hasValidConsent(address _applicant, bytes32 _consentId, address _requester) view returns (bool)",
  "function getApplicantConsents(address _applicant) view returns (bytes32[])",
  "function getConsent(address _applicant, bytes32 _consentId) view returns (address grantedTo, uint256 expiresAt, bool isActive, uint256 grantedAt, uint256 docCount)",
  "event ConsentGranted(address indexed applicant, address indexed grantedTo, bytes32 consentId, uint256 expiresAt)",
  "event ConsentRevoked(address indexed applicant, bytes32 consentId, uint256 timestamp)",
];

export const LOAN_APPLICATION_ABI = [
  "function owner() view returns (address)",
  "function loanCounter() view returns (uint256)",
  "function officers(address) view returns (bool)",
  "function submitLoan(uint256 _amount, uint256 _tenure, uint256 _interestRate, string _purpose, bytes32[] _docIds) external returns (uint256 loanId)",
  "function markDocsVerified(uint256 _loanId) external",
  "function markUnderReview(uint256 _loanId) external",
  "function approveLoan(uint256 _loanId) external",
  "function rejectLoan(uint256 _loanId, string _reason) external",
  "function makeCounterOffer(uint256 _loanId, uint256 _newAmount, uint256 _newTenure, string _note) external",
  "function requestMoreDocs(uint256 _loanId, string _note) external",
  "function disburseLoan(uint256 _loanId) external",
  "function markRepaid(uint256 _loanId) external",
  "function addOfficer(address _officer) external",
  "function removeOfficer(address _officer) external",
  "function assignOfficer(uint256 _loanId, address _officer) external",
  "function getLoan(uint256 _loanId) view returns (address applicant, uint256 amount, uint256 tenure, uint256 interestRate, string purpose, uint8 status, uint256 submittedAt, uint256 updatedAt, address assignedOfficer, string rejectionReason, bool disbursed)",
  "function getLoanDocIds(uint256 _loanId) view returns (bytes32[])",
  "function getApplicantLoans(address _applicant) view returns (uint256[])",
  "function getLoanAuditLength() view returns (uint256)",
  "function getLoanAuditEntry(uint256 _index) view returns (uint256 loanId, uint8 fromStatus, uint8 toStatus, address actor, string note, uint256 timestamp)",
  "function getTotalLoans() view returns (uint256)",
  "event LoanSubmitted(uint256 indexed loanId, address indexed applicant, uint256 amount, uint256 timestamp)",
  "event LoanStatusChanged(uint256 indexed loanId, uint8 indexed from, uint8 indexed to, address actor, uint256 timestamp)",
  "event CounterOfferMade(uint256 indexed loanId, uint256 newAmount, uint256 newTenure, string note, uint256 timestamp)",
  "event LoanDisbursed(uint256 indexed loanId, address indexed applicant, uint256 amount, uint256 timestamp)",
];

// ─── Enum Labels ─────────────────────────────────────────────────────────────

export const LOAN_STATUS_LABELS = [
  "Submitted",
  "Docs Verified",
  "Under Review",
  "Approved",
  "Rejected",
  "Counter Offered",
  "Disbursed",
  "Repaid",
  "Needs More Docs",
];

export const LOAN_STATUS_COLORS = {
  0: "status-submitted",
  1: "status-verified",
  2: "status-review",
  3: "status-approved",
  4: "status-rejected",
  5: "status-counter",
  6: "status-disbursed",
  7: "status-repaid",
  8: "status-needsdocs",
};

export const DOC_TYPE_LABELS = [
  "Salary Slip",
  "Bank Statement",
  "ID Card",
  "Address Proof",
  "IT Return",
  "Other",
];

export const DOC_STATUS_LABELS = [
  "Pending",
  "Issuer Attested",
  "Verified",
  "Rejected",
  "Revoked",
];
