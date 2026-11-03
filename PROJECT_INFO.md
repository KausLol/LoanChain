# LoanChain: Detailed Project Documentation & Technical Specification

> **Blockchain-Powered Tamper-Evident Loan Document Verification**  
> Built on Ethereum Sepolia Testnet · Solidity · Remix IDE · React 19 · Ethers.js v6 · MetaMask

---

## Table of Contents
1. [Project Overview & Problem Statement](#1-project-overview--problem-statement)
2. [Architectural Principles & Design Decisions](#2-architectural-principles--design-decisions)
3. [Technology Stack & Usage Map](#3-technology-stack--usage-map)
4. [Complete File Structure & Responsibilities](#4-complete-file-structure--responsibilities)
5. [Smart Contract Deep Dive](#5-smart-contract-deep-dive)
6. [Frontend Architecture & Workflow Pipeline](#6-frontend-architecture--workflow-pipeline)
7. [Detailed Feature Matrix](#7-detailed-feature-matrix)
8. [Deployment, Configuration & Usage Guide](#8-deployment-configuration--usage-guide)
9. [AI Verification Layer: Phase 2 Architecture (Completed)](#9-ai-verification-layer-phase-2-architecture-completed)
10. [AI-Assisted Loan Affordability & Repayment Capacity Engine](#10-ai-assisted-loan-affordability--repayment-capacity-engine)
11. [IPFS Storage & Pinata Public Gateway Integration](#11-ipfs-storage--pinata-public-gateway-integration)

---

## 1. Project Overview & Problem Statement

Traditional loan origination and document processing suffer from four structural vulnerabilities:
1. **Forged and Altered Documents**: Wage slips, tax returns, and bank statements are easily manipulated with image editing software, making visual checks error-prone.
2. **Repeated Verification Cycles**: Each lender independently re-collects and re-verifies the same documents, imposing heavy delays and frictional costs on applicants and institutions.
3. **Absence of an Immutable Audit Trail**: In dispute or regulatory scrutiny, proving which exact file version was reviewed, who signed off, and why an approval or rejection occurred is exceedingly difficult.
4. **Opaque Underwriting Decisions**: Applicants frequently receive flat rejections with no actionable reason or accessible proof of evaluation.

### The LoanChain Solution (Full Dual-Layer Architecture)
LoanChain establishes a **decentralized, tamper-evident trust anchor** on the Ethereum blockchain, augmented by an explainable **AI verification and affordability advisory microservice**:
- **Zero-Knowledge Document Hashing**: Document files are cryptographically digested on the client side using **keccak256**. Only salted hashes and Merkle root bundles are committed to the public ledger.
- **Strict State Machine Lifecycle**: A formal smart contract state machine governs every transition of a loan application (from `Submitted` to `Repaid`).
- **Immutable On-Chain Audit Log**: An append-only on-chain audit log records every transition, the acting Ethereum address, timestamps, and reasoning.
- **Institutional Attestation**: Trusted employers and financial institutions attest to documents directly on-chain via dedicated registry contracts.
- **Deterministic AI Verification & EIP-712 Attestation**: AI service analyzes native text layers, executes deterministic First-Order Predicate Logic (FOPL) arithmetic checks, computes Bayesian fraud risk, and signs cryptographic EIP-712 attestations verifiable on-chain.
- **AI-Assisted Affordability Analysis**: Extracted net pay, recurring bank debits, and FOIR metrics produce advisory repayment capacity recommendations directly on loan applications without overriding human authority.

*(Note: Both Phase 1 blockchain infrastructure and Phase 2 AI verification & affordability analysis are fully implemented, tested, and operational).*

---

## 2. Architectural Principles & Design Decisions

### 2.1 Off-Chain Document Storage, On-Chain Cryptographic Anchors
- **Privacy & Compliance**: Under digital lending regulations and data protection mandates (e.g., GDPR, DPDP), storing Personally Identifiable Information (PII) on a public, immutable ledger is prohibited.
- **Implementation**: Actual documents reside encrypted off-chain (e.g., IPFS or encrypted object stores). The blockchain stores strictly:
  $$\text{docHash} = \text{keccak256}(\text{fileBytes})$$
  $$\text{saltedHash} = \text{keccak256}(\text{docHash} \mathbin{\Vert} \text{salt})$$
  $$\text{MerkleRoot} = \text{RootNode}(\text{docHash}_1, \text{docHash}_2, \dots)$$

### 2.2 Hash Proves Integrity, Issuer Proves Authenticity
- A cryptographic hash guarantees that a file has **not been altered** since it was registered, but does not verify whether the original content was factual.
- LoanChain addresses this by using **Issuer Attestation**: an active, registered employer or bank (`IssuerRegistry`) signs the on-chain document record, anchoring institutional trust.

### 2.3 Strict State Machine & Human-in-the-Loop Decisions
- Smart contracts enforce valid state transitions with modifier guards.
- Officers and administrators execute review actions, approvals, counter-offers, or rejections with mandatory reasons logged immutably.

---

## 3. Technology Stack & Usage Map

| Technology | Version / Standard | Layer | Where & How Used in LoanChain |
|---|---|---|---|
| **Solidity** | `^0.8.19` | Smart Contracts | Core smart contracts defining registries, state machine, consent control, EIP-712 AI attestation, and audit logs. |
| **Ethereum Sepolia** | Chain ID: `11155111` | Blockchain | Public proof-of-stake test network for smart contract deployment, state storage, and gas execution. |
| **Remix IDE** | Web IDE | Tooling / Deploy | Compilation with optimizer enabled (200 runs), deployment order management, and test transactions. |
| **React** | `^19.3.1` | Frontend UI | Component architecture, state management, reactive view routing, modal dialogues, and table rendering. |
| **Vite** | `^8.3.5` | Build Tool | Development server with Hot Module Replacement (HMR) and optimized Rollup client production builds. |
| **Ethers.js** | `^6.17.0` | Web3 Library | Wallet connection, RPC provider orchestration, contract abstraction, ABI encoding, client-side `keccak256` hashing, and frozen `Result` proxy unrolling via `Array.from()`. |
| **MetaMask** | Browser Extension | Wallet / Signer | Non-custodial key management, Sepolia network switching, account authorization, and gas transaction signing. |
| **Web Crypto API** | Browser Native | Security / Utility | In-browser file reading (`arrayBuffer`), byte extraction, and random 32-byte salt generation. |
| **Python** | `3.11+` | AI Service Runtime | Isolated virtual environment powering explainable AI verification, forensics, and affordability analysis. |
| **FastAPI / Uvicorn** | `^0.115.0` | AI Web Framework | High-performance asynchronous API endpoints for document, bundle, and affordability verification. |
| **PyMuPDF / pdfplumber** | `^1.25.0` | Text & Layout Extraction | Native vector text, bounding box, font name, and structured tabular extraction. |
| **pgmpy** | `^0.1.26` | Uncertainty Reasoning | Discrete Bayesian Network scoring for multi-factor document risk probability estimation. |
| **Eth-Account / Eth-Hash**| `^0.13.0` | Cryptography & Signing | EIP-712 typed-data hashing and secp256k1 low-$s$ ECDSA signature generation. |
| **Financial Math Engine** | Python / Standard Library | Underwriting Advisory | Reducing-balance EMI amortization, dynamic tenure expansion, present-value borrowing capacity, and FOIR DTI ratio modeling. |
| **Lucide React** | `^1.62.0` | UI Design | Consistent, modern vector iconography replacing all emojis. |
| **Pinata IPFS** | REST API v1 / Gateway | Storage Layer | Decentralized document file storage for unverified/manual review documents; public gateway (`gateway.pinata.cloud`) resolution. |
| **CSS3 Design System** | Custom Properties | Styling | Clean, human-crafted fintech UI (dark navy `#1e3a5f`, slate neutrals, 4px/6px radii, 3px badges, zero AI gradients/glows, mathematically centered timeline, bounded scrollbars). |

---

## 4. Complete File Structure & Responsibilities

```
loanchain_new/
├── README.md                           # Project quick-start & deployment overview
├── PROJECT_INFO.md                     # Comprehensive technical documentation (this file)
├── AI_VERIFICATION_GUIDE.md            # AI verification prompt specs, document generation guides & rules
│
├── contracts/                          # Solidity Smart Contracts (Remix IDE Ready)
│   ├── IssuerRegistry.sol              # Registry of trusted document issuers (employers, banks)
│   ├── DocumentRegistry.sol            # On-chain document hash storage, Merkle roots, and doc audit log
│   ├── ConsentManager.sol              # Time-limited document access management for applicants
│   ├── LoanApplication.sol             # 9-state loan lifecycle state machine & officer audit trail
│   ├── AIAttestation.sol               # EIP-712 AI verification anchoring & bundle verdict engine
│   └── README.md                       # Strict Remix deployment guide and constructor arguments
│
├── dummy/                              # Sample PDF documents for verification testing
│   ├── aadhaar_test.pdf                # Generated valid Aadhaar card with Verhoeff-compliant UID
│   ├── pan_test.pdf                    # Generated valid PAN card with valid 10-char alphanumeric structure
│   ├── salary1234.pdf                  # Authentic salary slip (₹50k gross, ₹3k deductions, ₹47k net)
│   ├── salary5678.pdf                  # Secondary authentic salary slip
│   ├── statement123.pdf                # Authentic bank statement with credit/debit cash flows
│   ├── statement456.pdf                # Secondary authentic bank statement
│   ├── id123.pdf                       # Sample employee identity card
│   └── id456.pdf                       # Secondary sample identity card
│
├── ai-service/                         # Explainable AI Verification & Affordability Microservice
│   ├── pyproject.toml / requirements.txt # Python dependency configurations
│   ├── .env / .env.example             # Private key, chain ID, RPC, and service port settings
│   │
│   ├── app/
│   │   ├── main.py                     # FastAPI application entry point and CORS middleware
│   │   ├── config.py                   # Environment settings loader (EIP-712 domain, keys, RPC)
│   │   │
│   │   ├── api/
│   │   │   └── endpoints.py            # REST endpoints (/v1/verify/document, /v1/verify/bundle, /v1/analyze/affordability)
│   │   │
│   │   ├── core/
│   │   │   ├── affordability.py        # DTI, safe EMI ceiling (40-50% FOIR), reducing-balance EMI & counter-offer search
│   │   │   ├── bundle.py               # Cross-document applicant/employer reconciliation engine
│   │   │   ├── chain.py                # Web3 Sepolia RPC integration & DocumentRegistry verifyIntegrity check
│   │   │   ├── classify.py             # Automatic document type detection & template selector (Aadhaar, PAN, Salary, Bank)
│   │   │   ├── explain.py              # RFC 8785 canonical JSON explanation serialization & hashing
│   │   │   ├── extract_fields.py       # Regex and anchor-based field value parser
│   │   │   ├── extract_text.py         # PyMuPDF text & font extractor with Tesseract fallback
│   │   │   ├── forensics.py            # PDF metadata, font tampering, whiteout rectangle, and ELA detection
│   │   │   ├── intake.py               # Magic-byte sniff, file size, page limit, decompression bomb defense
│   │   │   ├── rules_engine.py         # Deterministic FOPL arithmetic validator (±₹1.00 tolerance)
│   │   │   ├── scoring.py              # Discrete Bayesian Network (pgmpy) fraud risk probability estimator
│   │   │   ├── signing.py              # EIP-712 typed-data hash & secp256k1 low-s signer
│   │   │   └── validators.py           # Field-level regex, date format, and range validators
│   │   │
│   │   ├── models/
│   │   │   ├── affordability.py        # Pydantic models for affordability request, analysis, and counter-offers
│   │   │   ├── facts.py                # Extracted document facts schema
│   │   │   ├── result.py               # VerificationResult, RuleResult, and EIP712Attestation models
│   │   │   └── template.py             # Declarative YAML template schema
│   │   │
│   │   └── store/
│   │       └── report_store.py         # SQLite persistent store for explanation JSON reports and audit lookup
│   │
│   ├── templates/defaults/             # Versioned declarative verification templates
│   │   ├── id_aadhaar.yaml             # Aadhaar card UID pattern, Verhoeff check, DOB, Gender
│   │   ├── id_pan.yaml                 # PAN card 10-char format ([A-Z]{5}[0-9]{4}[A-Z]), Name, Father's Name
│   │   ├── salary_slip.yaml            # Gross, deductions, net salary arithmetic reconciliation rules
│   │   ├── bank_statement.yaml         # Opening balance + deposits - withdrawals = closing balance rules
│   │   ├── id_employee.yaml            # Corporate employee identity card template
│   │   ├── address_proof.yaml          # Utility bill / voter card address verification template
│   │   └── it_return.yaml              # Income tax return form acknowledgment template
│   │
│   └── tests/                          # Automated Pytest suite (43 passed test cases)
│       ├── test_affordability.py       # Unit tests for income extraction, safe EMI, DTI, and tenure counter-offers
│       ├── test_bundle.py              # Cross-document name/employer consistency tests
│       ├── test_forensics.py           # Tampering detection tests
│       ├── test_rules_engine.py        # FOPL arithmetic tests
│       ├── test_scoring.py             # Bayesian risk scoring tests
│       └── test_verify_pipeline.py     # End-to-end PDF verification tests
│
└── frontend/                           # React + Vite Web Application
    ├── .env.example                    # Template for deployed contract addresses
    ├── .env                            # Active contract configuration (Sepolia addresses)
    ├── index.html                      # HTML root with Inter font stylesheet links
    ├── package.json                    # Project dependencies and Vite build scripts
    ├── vite.config.js                  # Vite configuration with React plugin
    │
    ├── public/                         # Public static assets
    │   ├── metamask-fox.png            # Official high-resolution MetaMask fox logo
    │   ├── favicon.svg                 # LoanChain browser tab icon
    │   └── icons.svg                   # Standard SVG definitions
    │
    └── src/                            # Frontend Source Code
        ├── main.jsx                    # Application entry point rendering React DOM root
        ├── App.jsx                     # Layout shell, view switcher (Landing vs App), notification system
        ├── index.css                   # Global fintech CSS design system (slate neutrals, dark navy #1e3a5f, 4px/6px radii)
        │
        ├── config/
        │   └── contracts.js            # Contract addresses, ABIs, Sepolia network params, and enum mappings
        │
        ├── context/
        │   └── Web3Context.jsx         # React Context managing MetaMask state, provider, signer, and roles
        │
        ├── hooks/
        │   ├── useBlockchain.js        # Custom hooks: useDocuments, useLoans, hashFile, computeMerkleRoot
        │   └── useAIVerification.js    # Hook coordinating off-chain AI analysis and on-chain EIP-712 anchoring
        │
        ├── services/
        │   ├── aiService.js            # Client HTTP service communicating with FastAPI endpoints
        │   └── pinataService.js        # Public Pinata IPFS pinning service and gateway resolution (gateway.pinata.cloud)
        │
        ├── components/
        │   ├── AIAffordabilityCard.jsx # Advisory card: verified income, obligations, safe EMI, DTI, counter-offers
        │   ├── AIBadge.jsx             # Visual badge for AI Approved, Borderline, Rejected, and Unverified
        │   ├── AIVerificationPanel.jsx # Slide-out drawer/modal inspecting extracted fields, rules, forensics & on-chain anchor
        │   ├── Header.jsx              # Top navigation bar (Cube logo, Sepolia indicator, Wallet pill)
        │   ├── Sidebar.jsx             # Left vertical navigation (Dashboard, Apply, Docs, Applications, Audit)
        │   └── Icons.jsx               # SVG Cube logo and MetaMaskFox component
        │
        └── pages/
            ├── LandingPage.jsx         # Corporate fintech landing page (hero, value propositions, feature matrix, wallet CTA)
            ├── DashboardPage.jsx       # Main dashboard with live on-chain stats, upload dropzone, recent timeline
            ├── LoanApplicationPage.jsx # 3-step loan application form with dynamic EMI calculator and Affordability card
            ├── DocumentsPage.jsx       # Document hash registry with dynamic status badges and AI verification trigger
            ├── ApplicationsPage.jsx    # Applications list with status filters, AI bundle reconciliation, and officer controls
            └── AuditTrailPage.jsx      # Immutable on-chain audit trail with dual tabs and Sepolia 25,000 block window query
```

---

## 5. Smart Contract Deep Dive

### 5.1 `IssuerRegistry.sol`
- **Location**: [`contracts/IssuerRegistry.sol`](file:///c:/Data/Programs/loanchain_new/contracts/IssuerRegistry.sol)
- **Role**: Manages the directory of approved institutions (employers, banks, government bodies) permitted to attest document integrity.
- **Key Struct**:
  ```solidity
  struct Issuer {
      string name;
      string issuerType; // "employer" | "bank" | "government"
      bool isActive;
      uint256 registeredAt;
      address registeredBy;
  }
  ```
- **Key Functions**:
  - `addIssuer(address, string, string)`: Adds an active issuer (`onlyOwner`).
  - `revokeIssuer(address)`: Deactivates an issuer (`onlyOwner`).
  - `isActiveIssuer(address)`: View function returning boolean attestation permission.
  - `getIssuer(address)`: Returns issuer details.

### 5.2 `DocumentRegistry.sol`
- **Location**: [`contracts/DocumentRegistry.sol`](file:///c:/Data/Programs/loanchain_new/contracts/DocumentRegistry.sol)
- **Role**: The core document anchor. Holds hashes, IPFS CIDs, issuer signatures, Merkle roots, and an append-only audit trail.
- **Enums**:
  - `DocType`: `SalarySlip` (0), `BankStatement` (1), `AadhaarCard` (2), `PANCard` (3), `AddressProof` (4), `ITReturn` (5), `Other` (6)
  - `DocStatus`: `Pending` (0), `IssuerAttested` (1), `Verified` (2), `Rejected` (3), `Revoked` (4)
- **Key Functions**:
  - `uploadDocument(bytes32 _docHash, bytes32 _salt, DocType _docType, string _ipfsCid, bytes32 _merkleRoot)`: Generates unique `docId` using `keccak256(msg.sender, _docHash, block.timestamp)`, stores salted hash, binds to applicant, logs audit event.
  - `attestDocument(bytes32 _docId)`: Callable only by an active issuer from `IssuerRegistry`. Changes status to `IssuerAttested`.
  - `verifyDocument(bytes32 _docId)`: Admin sign-off changing status to `Verified`.
  - `verifyIntegrity(bytes32 _docId, bytes32 _docHash)`: Pure cryptographic check returning `true` if and only if the hash matches the unrevoked on-chain record.
  - `getAuditLogLength()` & `getAuditEntry(uint256)`: Exposes the append-only document audit log.

### 5.3 `ConsentManager.sol`
- **Location**: [`contracts/ConsentManager.sol`](file:///c:/Data/Programs/loanchain_new/contracts/ConsentManager.sol)
- **Role**: Empowers applicants with self-sovereign control over which institutions can inspect their documents.
- **Key Functions**:
  - `grantConsent(address _grantedTo, bytes32[] _docIds, uint256 _durationSeconds)`: Creates an active consent record with an explicit timestamp expiry.
  - `revokeConsent(bytes32 _consentId)`: Revokes granted access immediately.
  - `hasValidConsent(address _applicant, bytes32 _consentId, address _requester)`: Validates that consent is active, granted to requester, and not expired.

### 5.4 `LoanApplication.sol`
- **Location**: [`contracts/LoanApplication.sol`](file:///c:/Data/Programs/loanchain_new/contracts/LoanApplication.sol)
- **Role**: Complete state machine orchestrating the loan lifecycle.
- **Loan State Machine**:
  ```
  [0] Submitted ──────> [1] DocsVerified ──────> [2] UnderReview ──────> [3] Approved ──────> [6] Disbursed ──────> [7] Repaid
          ▲                      ▲                      │
          │                      │                      ├──> [4] Rejected
          └── [8] NeedsMoreDocs ─┴                      │
                                                        └──> [5] CounterOffered ──> [3] Approved
  ```
- **Key Functions & Modifiers**:
  - `submitLoan(uint256 _amount, uint256 _tenure, uint256 _interestRate, string _purpose, bytes32[] _docIds)`: Submits new loan with document bundle references.
  - `markDocsVerified(uint256 _loanId)`: Officer verifies attached document hashes. Transitions $0 \to 1$ or $8 \to 1$.
  - `markUnderReview(uint256 _loanId)`: Officer advances verified loan to active evaluation. Transitions $1 \to 2$.
  - `approveLoan(uint256 _loanId)`: Officer formal approval. Transitions $2 \to 3$ or $5 \to 3$.
  - `rejectLoan(uint256 _loanId, string _reason)`: Officer rejection with mandatory on-chain explanation. Transitions $1 \to 4$ or $2 \to 4$.
  - `makeCounterOffer(uint256 _loanId, uint256 _newAmount, uint256 _newTenure, string _note)`: Proposes alternative terms. Transitions $2 \to 5$.
  - `requestMoreDocs(uint256 _loanId, string _note)`: Reverts loan for additional documentation. Transitions $0 \to 8$ or $1 \to 8$.
  - `disburseLoan(uint256 _loanId)`: Owner executes disbursement. Transitions $3 \to 6$.
  - `markRepaid(uint256 _loanId)`: Officer records full repayment. Transitions $6 \to 7$.

### 5.5 `AIAttestation.sol`
- **Location**: [`contracts/AIAttestation.sol`](file:///c:/Data/Programs/loanchain_new/contracts/AIAttestation.sol)
- **Role**: Anchors cryptographically signed off-chain AI document verification results on Sepolia using EIP-712 typed-data standards. Provides tamper-evident replay protection and aggregate bundle evaluation for loan underwriting.
- **Key Struct**:
  ```solidity
  struct DocAttestation {
      bytes32 docId;
      bytes32 docHash;
      uint8 verdict;         // 0 = Approved, 1 = Borderline, 2 = Rejected
      uint16 confidenceBps;  // e.g. 9800 = 98.00%
      bytes32 templateRef;   // keccak256 of template name (e.g. salary_slip)
      bytes32 modelVersion;  // keccak256 of AI model & git commit
      bytes32 explanationHash;// keccak256 of canonical RFC 8785 JSON report
      uint256 nonce;          // Unique 256-bit single-use random value
      uint256 deadline;       // Unix timestamp validity ceiling
  }
  ```
- **Security & Cryptographic Guarantees**:
  - **Dynamic EIP-712 Domain**: Incorporates `block.chainid` dynamically to prevent cross-network replay between local, testnet, and mainnet chains.
  - **Single-Use Replay Protection**: Records `usedNonces[nonce] = true`. Repeated submissions with identical nonces revert.
  - **On-Chain Document Integrity Check**: Asserts `documentRegistry.verifyIntegrity(att.docId, att.docHash) == true` before permitting attestation storage.
  - **Low-$s$ Signature Enforcement**: Rejects signatures with $s > \text{secp256k1n}/2$ to guard against EVM signature malleability exploits.
  - **Authorized Signer Recovery**: Recovers signer address via `ecrecover(digest, v, r, s)` and asserts `recovered == aiSigner`.
- **Aggregate Bundle Logic (`bundleVerdict`)**:
  - Evaluates an array of document IDs (`bytes32[] docIds`).
  - Returns `(verdict, attestedCount)`:
    - Verdict `2` (Rejected): If *any* document in the bundle has an AI `Rejected` verdict.
    - Verdict `0` (Approved): If *all* documents have on-chain attestations and *all* are `Approved`.
    - Verdict `1` (Borderline / Incomplete): If any document is borderline or missing an attestation.
- **Integration with `LoanApplication.sol`**:
  - `LoanApplication.markDocsVerified()` interrogates `IAIAttestation.bundleVerdict(loan.docIds)`.
  - When `requireAIForDocsVerified` is enabled, loans cannot advance to `DocsVerified` unless all documents are attested and none are rejected.

---

## 6. Frontend Architecture & Workflow Pipeline

### 6.1 State Flow & Reactive Web3 Provider
[`Web3Context.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/context/Web3Context.jsx) initializes an `ethers.BrowserProvider` connecting to `window.ethereum`:
1. Requests active account from MetaMask (`eth_requestAccounts`).
2. Checks network Chain ID against Sepolia (`0xaa36a7` / `11155111`). Automatically requests chain switch or adds Sepolia RPC if missing.
3. Obtains `ethers.JsonRpcSigner`.
4. Concurrently queries `LoanApplication.owner()`, `LoanApplication.officers(address)`, and `IssuerRegistry.isActiveIssuer(address)` to dynamically establish user permissions (`isOwner`, `isOfficer`, `isIssuer`).
5. Sets up listeners for `accountsChanged` and `chainChanged`.

### 6.2 Client-Side Cryptographic Hashing Engine
[`useBlockchain.js`](file:///c:/Data/Programs/loanchain_new/frontend/src/hooks/useBlockchain.js) implements secure, local hashing:
- **Zero Upload of Raw Files**: Files never leave the browser unencrypted.
- **Hashing Function**:
  ```javascript
  export async function hashFile(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return ethers.keccak256(bytes);
  }
  ```
- **Merkle Tree Root Construction**: Recursively pairwise-hashes all document bundle hashes to generate a single 32-byte bundle root anchor:
  $$\text{Root} = \text{keccak256}(\text{Hash}_A \mathbin{\Vert} \text{Hash}_B)$$

### 6.3 User Interface Views & Key Components
- **Corporate Landing Page** ([`LandingPage.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/pages/LandingPage.jsx)):
  - Production-grade, non-AI corporate presentation for visitors and new borrowers.
  - Left-aligned hero with clear value propositions, trust signals, and direct "Launch Application" / "Connect Wallet" CTA.
  - 6-feature technical architecture grid (Cryptographic Hashing, Formal State Machine, EIP-712 AI Verification, Affordability Engine, On-Chain Audit Log, Self-Sovereign Consent).
  - Seamlessly switches to the authenticated dashboard view upon MetaMask authorization.
- **Header** ([`Header.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/components/Header.jsx)):
  - Geometric cube logo and brand title.
  - Active network badge (`Sepolia Testnet` with green status dot).
  - Connected account pill featuring MetaMask logo, truncated hex address, and dropdown for Etherscan linking and disconnect.
- **Sidebar** ([`Sidebar.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/components/Sidebar.jsx)):
  - Clean 5-item vertical navigation: **Dashboard**, **New Application**, **My Documents**, **Applications**, **Audit Log**.
- **Dashboard** ([`DashboardPage.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/pages/DashboardPage.jsx)):
  - Top "Welcome back" banner with wallet identity card.
  - 4 dynamic metric cards reading directly from connected on-chain state (strictly `0` for new accounts).
  - Drag-and-drop document upload zone with client-side hashing, automated Public Pinata IPFS pinning, and one-click Sepolia anchoring.
  - Real-time Recent Activity timeline with exact mathematical dot-and-line vertical alignment (centered at 9px), housed in a bounded scrollable container (`max-height: 310px`) with custom slim scrollbar preventing infinite vertical stretching.
  - Applications summary table with "View Details" modal.
- **New Application** ([`LoanApplicationPage.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/pages/LoanApplicationPage.jsx)):
  - Step 1: Loan parameters (Amount, Tenure, Purpose, Interest Rate) with live reducing-balance EMI calculation.
  - Step 2: Document selector bundling previously registered on-chain hashes.
  - Step 3: Review & Submit featuring live **AI Affordability Analysis** advisory card evaluated strictly against the borrower's selected documents, with clear advisories for non-AI-verified documents requiring manual officer inspection via IPFS.
- **My Documents** ([`DocumentsPage.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/pages/DocumentsPage.jsx)):
  - Document registration dropzone supporting Aadhaar, PAN, Salary Slips, Bank Statements, Address Proof, and IT Returns, with automated Public Pinata IPFS background pinning and explicit `Storage Engine: Public Pinata IPFS (Auto-Pinned)` indicator (no manual CID typing required).
  - Registered documents list with quiet, non-wrapping monospace hash display (`0x473e4e7d…e3e6d60c`), subtle inline copy button with immediate `Copied!` tooltip, and inline `· IPFS ↗` gateway link.
  - Unified single status badge (`AI Approved`, `AI Rejected`, `Under Review`, `Registered`, `Officer Verified`) eliminating redundant duplicate badge pairings and pill overload.
  - Streamlined action group (`[AI Verify]` for unverified, `[Details]` with 1-click AI report access).
- **Applications** ([`ApplicationsPage.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/pages/ApplicationsPage.jsx)):
  - Complete list of submitted loan applications with status filters (`All`, `Under Review`, `Approved`, `Rejected`, `Disbursed`).
  - Officer execution modal featuring:
    - On-chain document metadata resolution via `getDocument(docId)` to display document types (`Aadhaar Card`, `PAN Card`, `Salary Slip`, `Bank Statement`).
    - Dedicated `Manual Review Required` badge and direct **"View on IPFS"** link button for non-AI-verified documents, allowing visual inspection of original files off-chain.
    - Explicit officer advisory alert explaining manual inspection requirements before on-chain approval.
    - On-chain AI attestation bundle status (`bundleVerdict`) with Ethers v6 frozen array proxy resolution via `Array.from(ids)`.
    - Integrated **AI Affordability Card** ([`AIAffordabilityCard.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/components/AIAffordabilityCard.jsx)) displaying verified monthly income, obligations, safe EMI ceiling, DTI, and suggested counter-offer terms.
    - Cross-Document Reconciliation trigger (`/v1/verify/bundle`) comparing employee name and company name across attached payslips, PAN, and Aadhaar documents.
    - Officer execution controls (Verify Docs, Move to Review, Approve, Disburse, Reject, Counter-Offer) visible only to authorized officer addresses.
- **Audit Log** ([`AuditTrailPage.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/pages/AuditTrailPage.jsx)):
  - Dual tabs: "Loan State Transitions" (vertical timeline) and "Document Events Ledger" (tabular format).
  - Safe 25,000 block window query filtering (`currentBlock - 25000` to `latest`) preventing Sepolia RPC `-32005` block range overflow errors.
- **AI Affordability Card Component** ([`AIAffordabilityCard.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/components/AIAffordabilityCard.jsx)):
  - Embedded advisory component presenting:
    - Verified Monthly Income & Existing Obligations.
    - Recommended Safe EMI Ceiling (40% to 50% FOIR range).
    - Current DTI vs Projected Post-Loan DTI ratio.
    - Advisory verdict badge (`Affordable`, `Moderate`, `High DTI / Stretched`, `Unaffordable`).
    - Counter-offer recommendation terms: suggested maximum affordable loan principal ($P_{\text{max}}$) and extended tenure ($n_{\text{adj}}$ up to 84 months).
    - Explicit human-in-the-loop advisory notice emphasizing that officer and smart contract retain authoritative decision power.

---

## 7. Detailed Feature Matrix

| Feature | Implementation Mechanism | User / Officer Benefit |
|---|---|---|
| **Zero-PII On-Chain Hashing** | Client-side `keccak256` via browser Web Crypto + Ethers.js | Complete privacy compliance; applicants' personal files never touch the public ledger. |
| **Merkle Bundle Root** | Iterative pairwise hashing of document hashes | Proves inclusion of an entire application document bundle in a single 32-byte state variable. |
| **Issuer Attestation Anchor** | `IssuerRegistry.sol` authorization modifiers | Shifts reliance from unverified self-assertions to cryptographically signed institutional claims. |
| **Applicant Consent Governance** | `ConsentManager.sol` mapping with expiry timestamps | Applicants grant and revoke time-limited access per document to specific lender addresses. |
| **Deterministic State Machine** | `LoanApplication.sol` enum states and require checks | Prevents illegal state jumps (e.g. loans cannot be disbursed without prior approval). |
| **Transparent Rejection Reasons** | On-chain string storage in `rejectLoan` function | Eliminates opaque "black box" denials; applicants see exact verified justification. |
| **Counter-Offer Negotiation** | `makeCounterOffer` with adjusted amount/tenure params | Enables banks to propose approvable alternative terms rather than issuing outright rejections. |
| **Append-Only Audit Log** | Dynamic arrays of `LoanAudit` and `AuditEntry` structs | Produces an indelible chronological history of every transition and participating address. |
| **Real-Time Dynamic EMI Calculator** | Compound interest amortization formula in React | Real-time calculation of monthly repayments based on amount, tenure, and basis points. |
| **EIP-712 Cryptographic Attestation** | Off-chain ECDSA typed data signing anchored on `AIAttestation.sol` | Verifiable authenticity of AI inspection with replay protection and EVM signature malleability defense. |
| **AI-Assisted Affordability Analysis** | Extracted facts (payslip net pay, bank cashflows) evaluated via 40-50% FOIR rules | Generates real-time advisory repayment capacity, safe EMI ceiling, and current vs projected DTI metrics. |
| **Automated Counter-Offer Advisory** | Present-value capacity ($P_{\text{max}}$) and logarithmic tenure expansion ($n_{\text{adj}} \le 84$) | Recommends viable adjusted loan terms for applicants whose requested loans exceed safe debt limits. |
| **Aadhaar & PAN Native Verifiers** | Verhoeff checksum algorithm, 10-char alphanumeric regex, and digital forensics | Automated verification for Indian national identity documents replacing generic ID card types. |
| **Corporate Fintech Landing Page** | Minimalist typography, dark navy `#1e3a5f`, solid cards, no AI graphics | Mature, professional public entry point with automatic wallet connection redirection. |
| **Human-Made Clean UI** | Solid color palettes, Inter typography, Lucide icons, exact timeline centering | Zero AI-generated aesthetic; clean, professional fintech interface. |

---

## 8. Deployment, Configuration & Usage Guide

### 8.1 Remix IDE Deployment Sequence
Because contracts inherit addresses from one another, they **must be deployed in this exact sequence** on Ethereum Sepolia Testnet (`0.8.19` compiler with 200 runs optimization):

1. **Deploy `IssuerRegistry.sol`**
   - Constructor arguments: *None*
   - Copy deployed address $\to$ `ISSUER_REGISTRY_ADDRESS`
2. **Deploy `DocumentRegistry.sol`**
   - Constructor argument: `ISSUER_REGISTRY_ADDRESS`
   - Copy deployed address $\to$ `DOCUMENT_REGISTRY_ADDRESS`
3. **Deploy `ConsentManager.sol`**
   - Constructor arguments: *None*
   - Copy deployed address $\to$ `CONSENT_MANAGER_ADDRESS`
4. **Deploy `LoanApplication.sol`**
   - Constructor arguments: `DOCUMENT_REGISTRY_ADDRESS`, `ISSUER_REGISTRY_ADDRESS`
   - Copy deployed address $\to$ `LOAN_APPLICATION_ADDRESS`
5. **Deploy `AIAttestation.sol`** (Phase 2 AI Verification Layer)
   - Constructor arguments: `DOCUMENT_REGISTRY_ADDRESS`, `AI_SIGNER_ADDRESS`
   - Copy deployed address $\to$ `AI_ATTESTATION_ADDRESS`
6. **Post-Deployment Linking**:
   - Link attestation contract: `LoanApplication.setAIAttestation(AI_ATTESTATION_ADDRESS)`
   - *(Optional)* Enable strict AI enforcement: `LoanApplication.setRequireAIForDocsVerified(true)`

### 8.2 Frontend Configuration
Create or update `frontend/.env`:
```env
VITE_ISSUER_REGISTRY=0xYourIssuerRegistryAddress
VITE_DOC_REGISTRY=0xYourDocumentRegistryAddress
VITE_CONSENT_MANAGER=0xYourConsentManagerAddress
VITE_LOAN_APPLICATION=0xYourLoanApplicationAddress
VITE_AI_ATTESTATION=0xYourAIAttestationAddress
VITE_AI_SERVICE_URL=http://localhost:8000
VITE_PINATA_JWT=your_pinata_jwt_here
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud
```

### 8.3 Starting the Development Server
```bash
# Terminal 1: Start AI Verification Service
cd ai-service
.\.venv\Scripts\uvicorn app.main:app --port 8000 --reload

# Terminal 2: Start Frontend Application
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. Ensure MetaMask is connected to **Sepolia Testnet**.

### 8.4 Testing the End-to-End Workflow
1. **Explore Landing Page & Connect Wallet**: Visit `http://localhost:5173`. Review the value proposition and feature architecture. Click "Launch Application" or "Connect Wallet" to authorize MetaMask on **Sepolia Testnet**. The interface automatically transitions to the borrower dashboard.
2. **Register Identity & Financial Documents**: Navigate to **My Documents** or use the dashboard dropzone. Select documents from the `dummy/` directory (e.g. `aadhaar_test.pdf`, `pan_test.pdf`, `salary1234.pdf`, `statement123.pdf`). The file is automatically pinned to Public Pinata IPFS in the background (or assigned a simulated CID if Pinata is unconfigured) and cryptographically digested in memory (`keccak256`). Click "Register Document on Blockchain" and approve the transaction in MetaMask.
3. **Run AI Verification & On-Chain Anchoring**: Click "AI Verify" on each registered document card. Review the privacy consent modal, inspect extracted masked fields (e.g. Aadhaar UID, PAN number, salary earnings, net pay) and deterministic rule checks. Click "Anchor AI Result on Sepolia" to record the EIP-712 cryptographic attestation on `AIAttestation.sol`. Notice the unified badge updates dynamically to `AI Approved (98%)`.
4. **Submit Loan with Live Affordability Preview**: Go to **New Application**. Enter desired loan parameters (e.g. `0.5 ETH`, 24 months, 8.5% interest rate). In Step 2, select your verified documents. In Step 3 (Review & Submit), the integrated **AI Affordability Engine** automatically analyzes your net income, calculates existing obligations, computes your projected DTI, and displays the advisory repayment card. If non-AI-verified documents are attached, an advisory confirms they will be manually inspected via IPFS. Review and click "Submit Loan Application".
5. **Inspect Audit Log & Attestations**: Navigate to **Audit Log** to inspect state entries, then switch to the **AI Attestations** tab to view the immutable cryptographic records anchored on Sepolia.
6. **Officer Review, IPFS Document Inspection & Advisory Counter-Offers**: If logged in with the contract owner or authorized officer wallet, open **Applications**, click "Details" on an application:
   - For non-AI-verified documents, review the amber `Manual Review Required` badge and click **"View on IPFS"** to visually verify the customer's original dummy document on `gateway.pinata.cloud`.
   - Inspect the on-chain AI attestation bundle status (`bundleVerdict`).
   - Run the Cross-Document Reconciliation check to verify that employee name and company name match across payslips, PAN, and Aadhaar cards.
   - Review the **AI Affordability Card**: check whether the applicant is within the 50% FOIR threshold or if an advisory counter-offer (adjusted amount or tenure) is recommended.
   - Execute status transitions (`Verify Docs`, `Move to Review`, `Approve`, `Counter-Offer`, or `Reject`).
   - If approved, execute `Disburse Loan` once loan terms are finalized.

---

## 9. AI Verification Layer: Phase 2 Architecture (Completed)

The Phase 2 AI verification layer is fully implemented and operational across the off-chain Python microservice, the Sepolia smart contracts, and the React frontend:

```
[Applicant Document PDF / Image]
          │
          ▼
[AI Service (Off-Chain: Python 3.11 / FastAPI)]
  ├── Secure Intake: Magic-byte sniffing, size & page limits, decompression bomb prevention
  ├── On-Chain Binding: keccak256 rehash verification vs DocumentRegistry.verifyIntegrity
  ├── Layout & Text Extraction: PyMuPDF native layer + Tesseract OCR fallback
  ├── Declarative Templates: Versioned YAML specs (earnings, deductions, balances, anchors)
  ├── Rule Engine (FOPL): Forward chaining consistency & exact arithmetic reconciliation (±₹1.00)
  ├── Digital Forensics: Metadata editor traces, incremental updates, overlay whiteouts, ELA
  ├── Risk Scoring: Discrete Bayesian Network (pgmpy) with monotonic CPTs & BPS confidence
  ├── Explanation & Hashing: RFC 8785 canonical JSON sorting & keccak256 explanationHash
  └── EIP-712 Signer: Low-s ECDSA signature with 256-bit random replay nonces
          │
          ▼
[AIAttestation.sol Smart Contract (Sepolia)]
  ├── Replay protection (!usedNonces[nonce]) & deadline verification
  ├── On-chain hash integrity assertion with DocumentRegistry
  ├── Low-s malleability check & ecrecover(digest, v, r, s) == aiSigner
  └── Aggregate bundle evaluation: bundleVerdict(bytes32[] docIds)
          │
          ▼
[LoanApplication.sol]
  └── Gated markDocsVerified() with requireAIForDocsVerified policy switch
```

### 9.1 Specialized Document Verifiers & Declarative Templates
The AI service utilizes declarative YAML specifications in `ai-service/templates/defaults/` to define extraction patterns, mandatory field sets, and deterministic First-Order Predicate Logic (FOPL) rules:
1. **Aadhaar Card Verifier (`id_aadhaar.yaml`)**:
   - Matches Indian 12-digit Unique Identification Numbers (`\d{4}\s\d{4}\s\d{4}`).
   - Executes algorithmic **Verhoeff checksum validation** across the base-10 dihedral group $D_5$.
   - Verifies mandatory metadata: Holder Name, Date of Birth / Year of Birth, and Gender.
   - Detects digital signature stamps and QR code bounding boxes.
2. **PAN Card Verifier (`id_pan.yaml`)**:
   - Enforces the statutory 10-character alphanumeric Indian Income Tax Department pattern (`[A-Z]{5}[0-9]{4}[A-Z]`).
   - Validates entity classification character (4th character: `P` for individual person, `C` for company, etc.).
   - Extracts and verifies Primary Name, Father's / Parent's Name, and Date of Birth.
3. **Salary Slip Verifier (`salary_slip.yaml`)**:
   - Extracts earnings components (Basic, HRA, Conveyance, Allowances) and deductions (PF, Professional Tax, TDS).
   - Enforces exact mathematical identity:
     $$\text{Gross Earnings} = \sum \text{Earnings Components} \quad (\pm ₹1.00)$$
     $$\text{Net Pay} = \text{Gross Earnings} - \text{Total Deductions} \quad (\pm ₹1.00)$$
   - Asserts pay period recency window (within 90 days of application).
4. **Bank Statement Verifier (`bank_statement.yaml`)**:
   - Reconciles cash flow balance arithmetic:
     $$\text{Closing Balance} = \text{Opening Balance} + \text{Total Deposits} - \text{Total Withdrawals} \quad (\pm ₹1.00)$$
   - Analyzes periodic salary credits and recurring debt obligations.

### 9.2 Cross-Document Bundle Reconciliation (`bundle.py`)
In multi-document loan applications, verifying individual documents in isolation is insufficient. The bundle verification engine performs cross-document entity resolution:
- **Identity Consistency**: Normalizes and matches applicant name across Aadhaar card, PAN card, and salary slips using token sort and Levenshtein distance thresholds ($\ge 85\%$).
- **Employer Verification**: Confirms that the employer name listed on the salary slip matches the issuing organization or corporate domain registered in `IssuerRegistry`.
- **Cash Flow Alignment**: Matches net salary credits on the bank statement against the net pay stated on the applicant's salary slip within a $\pm 10\%$ tolerance.

### 9.3 Persistent Explanation Storage (`report_store.py`)
To maintain complete explainability without storing sensitive PII on the Ethereum blockchain:
- The AI service serializes the full verification output into a canonical JSON object per **RFC 8785**.
- A cryptographic digest is computed:
  $$\text{explanationHash} = \text{keccak256}(\text{CanonicalJSON})$$
- The canonical report is stored in a persistent local SQLite store (`data/reports.db`).
- Only `explanationHash` is committed to Sepolia in `AIAttestation.sol`.
- Any auditor, officer, or applicant holding the report can independently verify its exact identity against the on-chain hash.

For full specifications, rules, and AI document generation prompts, see [`AI_VERIFICATION_GUIDE.md`](AI_VERIFICATION_GUIDE.md).

---

## 10. AI-Assisted Loan Affordability & Repayment Capacity Engine

### 10.1 Background & Design Philosophy
Traditional loan verification validates whether documents are authentic, but fails to address the fundamental underwriting question: **Can the applicant afford the loan repayments without defaulting?**

LoanChain's **AI Affordability Engine** bridges this gap by transforming verified document facts (from salary slips and bank statements) directly into actionable underwriting metrics.

> [!IMPORTANT]
> **Advisory-Only Design Principle (`is_advisory: true`)**:
> The AI affordability engine operates strictly as an **underwriting advisor**, not the final decision maker. The smart contract state machine (`LoanApplication.sol`) and authorized human loan officers remain authoritative. The AI engine provides transparent mathematical guidance, flags debt-to-income risks, and suggests counter-offer terms, but never executes automatic approvals or rejections.

```
[Verified Salary Slip] ──┐
                         ├──> [AI Affordability Engine] ──> [Advisory Assessment] ──> [Human Loan Officer]
[Verified Bank Statement] ──┘         (FOIR & DTI Rules)           (AIAffordabilityCard)         (Authoritative Decision)
```

---

### 10.2 Mathematical Underwriting Formulations

The engine executes deterministic financial calculations based on standard retail banking heuristics:

#### 1. Monthly Income Extraction
Extracted directly from verified document fields in order of evidentiary strength:
1. **Salary Slip**: $\text{Monthly Income} = \text{Net Pay}$. If net pay is missing, derived from $\text{Gross} - \text{Deductions}$.
2. **Bank Statement**: If no salary slip is attached, verified from monthly recurring credit turnover:
   $$\text{Monthly Income} = \text{Total Deposits}$$
3. **Fallback Benchmark**: If unextracted, conservative demo benchmark of ₹50,000 is applied with a flagged advisory note.

#### 2. Existing Monthly Obligations Derivation
Determines the applicant's existing fixed monthly debt burden:
1. **From Salary Slip Deductions**:
   $$\text{Existing Obligations} = \text{Total Deductions} \times 0.70$$
   *(Reflecting statutory deductions, provident fund contributions, and existing payroll advances).*
2. **From Bank Statement Debits**:
   $$\text{Existing Obligations} = \text{Total Withdrawals} \times 0.30$$
   *(Reflecting recurring monthly loan EMIs, rent, and utility debits).*
3. **Standard Reserve**: If unextracted, a conservative reserve of 16% of monthly income is applied:
   $$\text{Existing Obligations} = \text{Monthly Income} \times 0.16$$

#### 3. Current Debt-to-Income (DTI) Ratio
Measures existing debt commitments against verified income:
$$\text{DTI}_{\text{current}} = \left(\frac{\text{Existing Obligations}}{\text{Monthly Income}}\right) \times 100\%$$

#### 4. Safe EMI Range (Fixed Obligation to Income Ratio — FOIR)
Banking guidelines restrict total debt commitments (existing obligations + new EMI) to between 40% (conservative) and 50% (maximum regulatory ceiling) of monthly income:
$$\text{Safe EMI}_{\text{min}} = \max\left(0, (\text{Monthly Income} \times 0.40) - \text{Existing Obligations}\right)$$
$$\text{Safe EMI}_{\text{max}} = \max\left(0, (\text{Monthly Income} \times 0.50) - \text{Existing Obligations}\right)$$

#### 5. Proposed Loan EMI Amortization
Calculated using the standard reducing-balance compound interest amortization formula:
$$\text{EMI} = \frac{P \cdot r \cdot (1 + r)^n}{(1 + r)^n - 1}$$
Where:
- $P = \text{Loan Principal in INR} = \text{Loan Amount in ETH} \times \text{ETH Price in INR}$ (default: ₹250,000 / ETH)
- $r = \frac{\text{Annual Interest Rate \%}}{100 \times 12} = \frac{\text{basis points}}{10000 \times 12}$ (e.g., $850 \text{ bps} \implies 8.5\% \text{ p.a.}$)
- $n = \text{Tenure in Months}$

#### 6. Total Projected Debt Burden (Projected DTI)
Evaluates applicant solvency if the proposed loan is approved:
$$\text{DTI}_{\text{projected}} = \left(\frac{\text{Existing Obligations} + \text{Proposed EMI}}{\text{Monthly Income}}\right) \times 100\%$$

#### 7. Affordability Verdict Matrix
| Projected DTI | Status Verdict | Actionable Meaning |
|---|---|---|
| $\le 38.0\%$ | **Affordable** | Loan repayments are comfortably within the borrower's cash flow surplus. |
| $38.1\% - 50.0\%$ | **Moderate** | Within acceptable banking parameters; near conservative limit. |
| $50.1\% - 65.0\%$ | **High DTI / Stretched** | Exceeds safe 50% FOIR ceiling; high default risk without term adjustments. |
| $> 65.0\%$ | **Unaffordable** | Severely overleveraged; loan cannot be safely serviced under requested terms. |

#### 8. Automated Advisory Counter-Offer Search
When a loan is flagged as **High DTI / Stretched** or **Unaffordable** ($\text{DTI}_{\text{projected}} > 50\%$), the engine automatically calculates two viable restructuring options to assist loan officers:

- **Strategy 1: Suggested Maximum Safe Principal ($P_{\text{max}}$)**  
  Calculates the maximum principal amount that yields an EMI equal to $\text{Safe EMI}_{\text{max}}$ at the requested tenure:
  $$P_{\text{max}} = \text{Safe EMI}_{\text{max}} \cdot \left[ \frac{(1 + r)^n - 1}{r(1 + r)^n} \right]$$
  Converted back to ETH:
  $$\text{Suggested Loan (ETH)} = \frac{P_{\text{max}}}{\text{ETH Price in INR}}$$

- **Strategy 2: Suggested Extended Tenure ($n_{\text{adj}}$)**  
  Solves for the required repayment tenure to reduce the proposed loan's EMI down to $\text{Safe EMI}_{\text{max}}$:
  $$n_{\text{adj}} = \left\lceil \frac{-\ln\left(1 - \frac{P \cdot r}{\text{Safe EMI}_{\text{max}}}\right)}{\ln(1 + r)} \right\rceil$$
  *Guardrail*: Only suggested if $n_{\text{adj}} \le 84 \text{ months}$ (7 years maximum retail tenure) and $\text{Safe EMI}_{\text{max}} > P \cdot r$ (EMI exceeds monthly interest charge).

---

### 10.3 Affordability Confidence Model
Confidence is derived deterministically from the evidentiary backing of the underlying documents:

```
                  ┌── Salary Slip Verified? ──┐
                  │                           │
                 Yes                          No
                  │                           │
          ┌───────┴───────┐           ┌───────┴───────┐
          │ Bank Statement│           │ Bank Statement│
          │   Verified?   │           │   Verified?   │
          └───────┬───────┘           └───────┬───────┘
                 / \                         / \
               Yes  No                     Yes  No
               /     \                     /     \
    Reconciled?     Medium                Medium   Low
       /    \       (75%)                 (75%)   (50%)
     Yes     No
     /        \
   High      Medium
  (95%)      (75%)
```

- **High Confidence (0.95)**: Both salary slip and bank statement are verified, and salary credit deposits match payslip net pay within $\pm 20\%$.
- **Medium Confidence (0.75)**: Either a salary slip or a bank statement is verified with clear earnings data.
- **Low Confidence (0.50)**: No income documents provided; calculations rely on standard conservative demographic benchmarks.

---

### 10.4 REST API Specification

#### `POST /v1/analyze/affordability`
Direct endpoint for on-demand affordability evaluations.

- **Request Body (`AffordabilityRequest`)**:
  ```json
  {
    "income_inr": 50000.0,
    "obligations_inr": 8000.0,
    "loan_amount_eth": 0.5,
    "tenure_months": 24,
    "interest_rate_bps": 850,
    "eth_price_inr": 250000.0,
    "doc_ids": ["0x2dd145fb...34bcc877"]
  }
  ```

- **Response Body (`AffordabilityAnalysis`)**:
  ```json
  {
    "monthly_income": 50000.0,
    "existing_obligations": 8000.0,
    "current_dti_pct": 16.0,
    "safe_emi_min": 12000.0,
    "safe_emi_max": 17000.0,
    "proposed_loan_amount_eth": 0.5,
    "proposed_loan_amount_inr": 125000.0,
    "proposed_tenure_months": 24,
    "proposed_interest_rate_pct": 8.5,
    "proposed_emi_inr": 5683.0,
    "projected_dti_pct": 27.4,
    "suggested_loan_amount_eth": null,
    "suggested_loan_amount_inr": null,
    "suggested_tenure_months": null,
    "affordability_verdict": "Affordable",
    "is_affordable": true,
    "confidence": "High",
    "confidence_score": 0.95,
    "summary": "Verified monthly income: ₹50,000. Existing obligations: ₹8,000. Recommended EMI ceiling: ₹12,000–₹17,000. Result: Affordable with high confidence.",
    "advisory_notes": [
      "Net monthly salary of ₹47,000 verified from salary slip.",
      "Bank deposits (₹50,000) reconcile with salary credits.",
      "Proposed monthly EMI (₹5,683) is comfortably below the ₹17,000 ceiling."
    ],
    "is_advisory": true
  }
  ```

#### Integrated Bundle Response (`POST /v1/verify/bundle`)
When performing cross-document bundle verification, the response automatically embeds an `affordability` block incorporating facts extracted across all attached documents:
```json
{
  "all_approved": true,
  "bundle_verdict": 0,
  "bundle_verdict_label": "Approved",
  "name_match": true,
  "employer_match": true,
  "affordability": { ... }
}
```

---

### 10.5 Frontend User Experience & Advisory Components

The affordability engine is visualized cleanly across the application via [`AIAffordabilityCard.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/components/AIAffordabilityCard.jsx):

```
┌────────────────────────────────────────────────────────────────────────┐
│  AI-Assisted Affordability Analysis         [Affordable (High Conf)]   │
│  Advisory assessment based on verified document cash flows             │
├────────────────────────────────────────────────────────────────────────┤
│  VERIFIED INCOME        EXISTING OBLIGATIONS       SAFE EMI CEILING    │
│  ₹50,000                ₹8,000                     ₹12,000 – ₹17,000   │
├────────────────────────────────────────────────────────────────────────┤
│  PROPOSED LOAN EMI      PROJECTED DTI                                  │
│  ₹5,683 / month         27.4% [█████████░░░░░░░░░░░░░░]                │
├────────────────────────────────────────────────────────────────────────┤
│  Summary: Verified monthly income: ₹50,000. Existing obligations:      │
│  ₹8,000. Recommended EMI ceiling: ₹12,000–₹17,000. Result: Affordable │
│  with high confidence.                                                 │
│                                                                        │
│  Advisory Notes:                                                       │
│  • Net monthly salary of ₹47,000 verified from salary slip.           │
│  • Bank deposits (₹50,000) reconcile with salary credits.             │
│  • Proposed monthly EMI (₹5,683) is comfortably below ceiling.        │
│                                                                        │
│  Advisory Notice: This assessment is an automated recommendation.      │
│  The loan officer and smart contract retain authoritative authority.   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Key UI Touchpoints:
1. **Applicant Self-Check** (`LoanApplicationPage.jsx`):
   - When selecting documents in Step 2 of loan submission, the page automatically runs the affordability analysis in the background.
   - The applicant sees real-time feedback on whether their requested amount and tenure align with their verified income, reducing preventable loan rejections before gas is spent on Sepolia.
2. **Officer Underwriting Modal** (`ApplicationsPage.jsx`):
   - When an officer opens application details, the affordability card is prominently displayed alongside the on-chain attestation bundle status.
   - If an application is overstretched ($\text{DTI} > 50\%$), the card displays the suggested counter-offer terms ($P_{\text{max}}$ or $n_{\text{adj}}$).
   - The officer can click "Accept Suggested Terms" to immediately populate the counter-offer transaction input fields in `LoanApplication.sol`.

---

## 11. IPFS Storage & Pinata Public Gateway Integration

### 11.1 Problem & Motivation for Manual Review
While LoanChain provides deterministic EIP-712 cryptographic AI verification for standardized documents (Salary Slips, Bank Statements, Aadhaar, PAN Cards), real-world lending requires handling non-standard, legacy, or self-uploaded documents where:
1. An applicant uploads an unconventional format or issuer not covered by active AI templates.
2. The AI attestation is missing, or the applicant proceeds with a document without running AI verification.
3. The loan officer must perform a visual, manual review of the original file before deciding whether to verify the documents and approve the loan on Sepolia.

Under GDPR/DPDP privacy constraints, the original document file must never be placed on the public Ethereum ledger. Instead, LoanChain pins the document file to **IPFS (InterPlanetary File System)** via **Pinata**, storing only the content identifier (`ipfsCid`) on-chain in `DocumentRegistry.sol`.

---

### 11.2 Dual-Tier Architecture & Pinata Service

The Pinata integration is designed with a resilient dual-tier fallback architecture:

```
┌────────────────────────────────────────────────────────┐
│                      Frontend UI                       │
│  (DocumentsPage.jsx / DashboardPage.jsx / AppsPage)    │
└───────────┬────────────────────────────────┬───────────┘
            │ Direct Browser Upload          │ Backend Relay Upload
            │ (if VITE_PINATA_JWT set)       │ (if PINATA_JWT in ai-service)
            ▼                                ▼
┌───────────────────────┐        ┌───────────────────────┐
│   Pinata Cloud API    │        │   FastAPI AI Service  │
│  pinFileToIPFS (v1)   │        │   POST /v1/ipfs/upload│
└───────────┬───────────┘        └───────────┬───────────┘
            │                                │
            ▼                                ▼
┌────────────────────────────────────────────────────────┐
│                   Public Pinata IPFS                   │
│   CID: bafy... or Qm...                                │
│   Public Gateway: https://gateway.pinata.cloud/ipfs/   │
└────────────────────────────────────────────────────────┘
```

#### Core Service Module: `frontend/src/services/pinataService.js`
- `isPinataConfigured()`: Checks if frontend or backend Pinata credentials exist.
- `cleanIpfsCid(cid)`: Strips `ipfs://`, `/ipfs/`, or white-space prefixes from CIDs.
- `getIpfsGatewayUrl(cid)`: Generates the public gateway URL (`${PINATA_GATEWAY}/ipfs/${cleanCid}`).
- `getGatewayOptions(cid)`: Provides fallback mirrors (`gateway.pinata.cloud`, `ipfs.io`, `dweb.link`, `cloudflare-ipfs.com`).
- `uploadFileToPinata(file, metadata)`: Pins the file to Pinata with automatic fallback from frontend JWT to API key/secret to backend relay `POST /v1/ipfs/upload`.

---

### 11.3 End-to-End Workflow for Non-AI Verified Documents

1. **Document Registration (`DocumentsPage.jsx` & `DashboardPage.jsx`)**:
   - The user selects a document file and selects its classification.
   - **Automated Background Pinning**: No manual CID text entry is required. The UI displays a clean `Storage Engine: ● Public Pinata IPFS (Auto-Pinned)` indicator.
   - If Pinata is configured, the file is pinned to Pinata IPFS, returning a real CID (`ipfs://bafy...`).
   - The client-side `keccak256` hash and CID are registered on Sepolia via `DocumentRegistry.uploadDocument(hash, salt, docType, ipfsCid, merkleRoot)`.
   - In the document list, each document displays a quiet, non-wrapping monospace hash (`0x473e4e7d…e3e6d60c`), a subtle copy icon with `Copied!` tooltip, an inline `· IPFS ↗` link, and a unified status badge (`[✓ AI Approved (98%)]`, `[✕ AI Rejected (95%)]`, `[⚠ Under Review]`, `[Registered]`).
   - If Pinata is unconfigured, simulated CIDs are used automatically for sandbox development without blocking transactions.

2. **Loan Submission with Unverified Documents (`LoanApplicationPage.jsx`)**:
   - The applicant selects their registered document(s) and proceeds to Review & Submit.
   - If any attached document lacks an AI attestation, an advisory banner informs the borrower:
     > *"Manual Verification Required: One or more selected documents do not have on-chain AI attestations. The loan officer will manually inspect your original files hosted on IPFS before verifying or approving your application."*

3. **Officer Manual Review Portal (`ApplicationsPage.jsx`)**:
   - The loan officer opens the loan details modal.
   - For every attached document, the officer sees:
     - Document type (`DOC_TYPE_LABELS`).
     - Document hash on Sepolia.
     - Attestation status: `AI Approved` badge, or `Manual Review Required` (amber tag).
     - Direct **"View on IPFS"** link button (`ExternalLink` icon) pointing to the public Pinata gateway URL.
   - If unverified documents exist, a prominent officer alert displays:
     > *"Manual Officer Inspection Required: X of Y document(s) in this application do not have on-chain AI attestations. Use the View on IPFS button for each non-attested document above to review the customer's original file before verifying or approving this loan."*
   - The officer clicks **View on IPFS** to inspect the PDF in a new tab, verifies that the details match, and clicks **Mark Docs Verified** / **Approve Loan** directly on Sepolia.

---

### 11.4 Configuration & Setup

To enable live Public Pinata IPFS uploads:

1. **Sign up at [Pinata Cloud](https://app.pinata.cloud/)** (Free Tier includes 1 GB storage and public gateway access).
2. Go to **API Keys** → **New Key**, enable `pinFileToIPFS` permissions, and generate a **JWT (Secret Access Token)**.
3. Add the token to `frontend/.env`:
   ```bash
   VITE_PINATA_JWT=your_pinata_jwt_here
   VITE_PINATA_GATEWAY=https://gateway.pinata.cloud
   ```
4. (Optional) For backend server-side uploads, also add to `ai-service/.env`:
   ```bash
   PINATA_JWT=your_pinata_jwt_here
   PINATA_GATEWAY=https://gateway.pinata.cloud
   ```
