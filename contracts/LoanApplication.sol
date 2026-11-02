// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DocumentRegistry.sol";
import "./IssuerRegistry.sol";

interface IAIAttestation {
    function bundleVerdict(bytes32[] calldata docIds) external view returns (uint8 verdict, uint256 attestedCount);
}

/**
 * @title LoanApplication
 * @notice Full loan lifecycle with state machine
 * Loan states: Submitted → DocsVerified → UnderReview → Approved/Rejected/CounterOffered → Disbursed → Repaid
 */
contract LoanApplication {
    DocumentRegistry public documentRegistry;
    IssuerRegistry public issuerRegistry;
    address public owner; // bank admin
    address public aiAttestation;
    bool public requireAIForDocsVerified;

    enum LoanStatus {
        Submitted,          // 0
        DocsVerified,       // 1
        UnderReview,        // 2
        Approved,           // 3
        Rejected,           // 4
        CounterOffered,     // 5
        Disbursed,          // 6
        Repaid,             // 7
        NeedsMoreDocs       // 8
    }

    struct LoanApp {
        uint256 id;
        address applicant;
        uint256 loanAmount;       // in wei
        uint256 tenure;           // months
        uint256 interestRate;     // basis points (e.g., 850 = 8.5%)
        string purpose;
        LoanStatus status;
        bytes32[] docIds;         // references to DocumentRegistry
        uint256 submittedAt;
        uint256 updatedAt;
        address assignedOfficer;
        string rejectionReason;
        string counterOfferNote;
        uint256 counterOfferAmount;
        uint256 counterOfferTenure;
        bool disbursed;
    }

    uint256 public loanCounter;
    mapping(uint256 => LoanApp) private loans;
    mapping(address => uint256[]) public applicantLoans;

    // Officer management
    mapping(address => bool) public officers;
    address[] public officerList;

    // Audit trail for loan state changes
    struct LoanAudit {
        uint256 loanId;
        LoanStatus fromStatus;
        LoanStatus toStatus;
        address actor;
        string note;
        uint256 timestamp;
    }
    LoanAudit[] public loanAuditLog;

    // Events
    event LoanSubmitted(uint256 indexed loanId, address indexed applicant, uint256 amount, uint256 timestamp);
    event LoanStatusChanged(uint256 indexed loanId, LoanStatus indexed from, LoanStatus indexed to, address actor, uint256 timestamp);
    event OfficerAdded(address indexed officer, uint256 timestamp);
    event OfficerRemoved(address indexed officer, uint256 timestamp);
    event LoanAssigned(uint256 indexed loanId, address indexed officer, uint256 timestamp);
    event CounterOfferMade(uint256 indexed loanId, uint256 newAmount, uint256 newTenure, string note, uint256 timestamp);
    event LoanDisbursed(uint256 indexed loanId, address indexed applicant, uint256 amount, uint256 timestamp);
    event AIAttestationUpdated(address indexed oldAddress, address indexed newAddress);
    event RequireAIUpdated(bool required);

    modifier onlyOwner() {
        require(msg.sender == owner, "LoanApplication: Only owner");
        _;
    }

    modifier onlyOfficer() {
        require(officers[msg.sender] || msg.sender == owner, "LoanApplication: Only officer");
        _;
    }

    modifier validLoan(uint256 _loanId) {
        require(_loanId > 0 && _loanId <= loanCounter, "LoanApplication: Invalid loan ID");
        _;
    }

    modifier onlyApplicant(uint256 _loanId) {
        require(loans[_loanId].applicant == msg.sender, "LoanApplication: Not the applicant");
        _;
    }

    constructor(address _docRegistry, address _issuerRegistry) {
        documentRegistry = DocumentRegistry(_docRegistry);
        issuerRegistry = IssuerRegistry(_issuerRegistry);
        owner = msg.sender;
        officers[msg.sender] = true;
        officerList.push(msg.sender);
    }

    // ─── Officer Management ───────────────────────────────────────────

    function addOfficer(address _officer) external onlyOwner {
        require(!officers[_officer], "LoanApplication: Already officer");
        officers[_officer] = true;
        officerList.push(_officer);
        emit OfficerAdded(_officer, block.timestamp);
    }

    function removeOfficer(address _officer) external onlyOwner {
        require(_officer != owner, "LoanApplication: Cannot remove owner");
        officers[_officer] = false;
        emit OfficerRemoved(_officer, block.timestamp);
    }

    // ─── AI Attestation Integration ───────────────────────────────────

    function setAIAttestation(address _aiAttestation) external onlyOwner {
        address old = aiAttestation;
        aiAttestation = _aiAttestation;
        emit AIAttestationUpdated(old, _aiAttestation);
    }

    function setRequireAIForDocsVerified(bool _require) external onlyOwner {
        requireAIForDocsVerified = _require;
        emit RequireAIUpdated(_require);
    }

    // ─── Loan Submission ──────────────────────────────────────────────

    /**
     * @notice Applicant submits a loan application with document references
     */
    function submitLoan(
        uint256 _amount,
        uint256 _tenure,
        uint256 _interestRate,
        string calldata _purpose,
        bytes32[] calldata _docIds
    ) external returns (uint256 loanId) {
        require(_amount > 0, "LoanApplication: Amount must be > 0");
        require(_tenure > 0, "LoanApplication: Tenure must be > 0");
        require(_docIds.length > 0, "LoanApplication: Must attach documents");
        require(bytes(_purpose).length > 0, "LoanApplication: Purpose required");

        loanCounter++;
        loanId = loanCounter;

        loans[loanId] = LoanApp({
            id: loanId,
            applicant: msg.sender,
            loanAmount: _amount,
            tenure: _tenure,
            interestRate: _interestRate,
            purpose: _purpose,
            status: LoanStatus.Submitted,
            docIds: _docIds,
            submittedAt: block.timestamp,
            updatedAt: block.timestamp,
            assignedOfficer: address(0),
            rejectionReason: "",
            counterOfferNote: "",
            counterOfferAmount: 0,
            counterOfferTenure: 0,
            disbursed: false
        });

        applicantLoans[msg.sender].push(loanId);
        _logLoanAudit(loanId, LoanStatus.Submitted, LoanStatus.Submitted, msg.sender, "Loan submitted");
        emit LoanSubmitted(loanId, msg.sender, _amount, block.timestamp);
    }

    // ─── State Transitions ────────────────────────────────────────────

    function markDocsVerified(uint256 _loanId) external onlyOfficer validLoan(_loanId) {
        LoanApp storage loan = loans[_loanId];
        require(loan.status == LoanStatus.Submitted || loan.status == LoanStatus.NeedsMoreDocs,
            "LoanApplication: Invalid transition");

        string memory auditNote = "Documents verified";
        if (requireAIForDocsVerified) {
            require(aiAttestation != address(0), "LoanApplication: AI attestation contract not set");
            (uint8 verdict, uint256 attestedCount) = IAIAttestation(aiAttestation).bundleVerdict(loan.docIds);
            require(verdict != 2, "LoanApplication: AI verification rejected one or more documents");
            require(attestedCount == loan.docIds.length, "LoanApplication: Not all documents have AI attestations");
            auditNote = verdict == 0 ? "Documents verified (AI bundle passed)" : "Documents verified (AI bundle borderline reviewed)";
        }

        _changeStatus(_loanId, LoanStatus.DocsVerified, msg.sender, auditNote);
    }

    function markUnderReview(uint256 _loanId) external onlyOfficer validLoan(_loanId) {
        LoanApp storage loan = loans[_loanId];
        require(loan.status == LoanStatus.DocsVerified, "LoanApplication: Must be DocsVerified");
        _changeStatus(_loanId, LoanStatus.UnderReview, msg.sender, "Under review");
    }

    function approveLoan(uint256 _loanId) external onlyOfficer validLoan(_loanId) {
        LoanApp storage loan = loans[_loanId];
        require(
            loan.status == LoanStatus.UnderReview || loan.status == LoanStatus.CounterOffered,
            "LoanApplication: Invalid transition"
        );
        _changeStatus(_loanId, LoanStatus.Approved, msg.sender, "Loan approved");
    }

    function rejectLoan(uint256 _loanId, string calldata _reason) external onlyOfficer validLoan(_loanId) {
        require(bytes(_reason).length > 0, "LoanApplication: Rejection reason required");
        LoanApp storage loan = loans[_loanId];
        require(
            loan.status == LoanStatus.UnderReview || loan.status == LoanStatus.DocsVerified,
            "LoanApplication: Invalid transition"
        );
        loan.rejectionReason = _reason;
        _changeStatus(_loanId, LoanStatus.Rejected, msg.sender, _reason);
    }

    function makeCounterOffer(
        uint256 _loanId,
        uint256 _newAmount,
        uint256 _newTenure,
        string calldata _note
    ) external onlyOfficer validLoan(_loanId) {
        LoanApp storage loan = loans[_loanId];
        require(loan.status == LoanStatus.UnderReview, "LoanApplication: Must be UnderReview");
        loan.counterOfferAmount = _newAmount;
        loan.counterOfferTenure = _newTenure;
        loan.counterOfferNote = _note;
        _changeStatus(_loanId, LoanStatus.CounterOffered, msg.sender, "Counter offer made");
        emit CounterOfferMade(_loanId, _newAmount, _newTenure, _note, block.timestamp);
    }

    function requestMoreDocs(uint256 _loanId, string calldata _note) external onlyOfficer validLoan(_loanId) {
        LoanApp storage loan = loans[_loanId];
        require(
            loan.status == LoanStatus.Submitted || loan.status == LoanStatus.DocsVerified,
            "LoanApplication: Invalid transition"
        );
        _changeStatus(_loanId, LoanStatus.NeedsMoreDocs, msg.sender, _note);
    }

    function disburseLoan(uint256 _loanId) external onlyOwner validLoan(_loanId) {
        LoanApp storage loan = loans[_loanId];
        require(loan.status == LoanStatus.Approved, "LoanApplication: Must be Approved");
        require(!loan.disbursed, "LoanApplication: Already disbursed");
        loan.disbursed = true;
        _changeStatus(_loanId, LoanStatus.Disbursed, msg.sender, "Loan disbursed");
        emit LoanDisbursed(_loanId, loan.applicant, loan.loanAmount, block.timestamp);
    }

    function markRepaid(uint256 _loanId) external onlyOfficer validLoan(_loanId) {
        LoanApp storage loan = loans[_loanId];
        require(loan.status == LoanStatus.Disbursed, "LoanApplication: Must be Disbursed");
        _changeStatus(_loanId, LoanStatus.Repaid, msg.sender, "Loan repaid");
    }

    // ─── Officer Assignment ───────────────────────────────────────────

    function assignOfficer(uint256 _loanId, address _officer) external onlyOwner validLoan(_loanId) {
        require(officers[_officer], "LoanApplication: Not an officer");
        loans[_loanId].assignedOfficer = _officer;
        emit LoanAssigned(_loanId, _officer, block.timestamp);
    }

    // ─── View Functions ───────────────────────────────────────────────

    function getLoan(uint256 _loanId) external view returns (
        address applicant, uint256 amount, uint256 tenure, uint256 interestRate,
        string memory purpose, uint8 status, uint256 submittedAt, uint256 updatedAt,
        address assignedOfficer, string memory rejectionReason, bool disbursed
    ) {
        LoanApp storage loan = loans[_loanId];
        return (
            loan.applicant, loan.loanAmount, loan.tenure, loan.interestRate,
            loan.purpose, uint8(loan.status), loan.submittedAt, loan.updatedAt,
            loan.assignedOfficer, loan.rejectionReason, loan.disbursed
        );
    }

    function getLoanDocIds(uint256 _loanId) external view returns (bytes32[] memory) {
        return loans[_loanId].docIds;
    }

    function getApplicantLoans(address _applicant) external view returns (uint256[] memory) {
        return applicantLoans[_applicant];
    }

    function getLoanAuditLength() external view returns (uint256) {
        return loanAuditLog.length;
    }

    function getLoanAuditEntry(uint256 _index) external view returns (
        uint256 loanId, uint8 fromStatus, uint8 toStatus, address actor, string memory note, uint256 timestamp
    ) {
        LoanAudit storage entry = loanAuditLog[_index];
        return (entry.loanId, uint8(entry.fromStatus), uint8(entry.toStatus), entry.actor, entry.note, entry.timestamp);
    }

    function getTotalLoans() external view returns (uint256) {
        return loanCounter;
    }

    // ─── Internal ─────────────────────────────────────────────────────

    function _changeStatus(uint256 _loanId, LoanStatus _newStatus, address _actor, string memory _note) internal {
        LoanStatus old = loans[_loanId].status;
        loans[_loanId].status = _newStatus;
        loans[_loanId].updatedAt = block.timestamp;
        _logLoanAudit(_loanId, old, _newStatus, _actor, _note);
        emit LoanStatusChanged(_loanId, old, _newStatus, _actor, block.timestamp);
    }

    function _logLoanAudit(
        uint256 _loanId, LoanStatus _from, LoanStatus _to, address _actor, string memory _note
    ) internal {
        loanAuditLog.push(LoanAudit({
            loanId: _loanId,
            fromStatus: _from,
            toStatus: _to,
            actor: _actor,
            note: _note,
            timestamp: block.timestamp
        }));
    }
}
