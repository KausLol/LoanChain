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
9. [AI Verification Layer: Phase 2 Roadmap](#9-ai-verification-layer-phase-2-roadmap)

---

## 1. Project Overview & Problem Statement

Traditional loan origination and document processing suffer from four structural vulnerabilities:
1. **Forged and Altered Documents**: Wage slips, tax returns, and bank statements are easily manipulated with image editing software, making visual checks error-prone.
2. **Repeated Verification Cycles**: Each lender independently re-collects and re-verifies the same documents, imposing heavy delays and frictional costs on applicants and institutions.
3. **Absence of an Immutable Audit Trail**: In dispute or regulatory scrutiny, proving which exact file version was reviewed, who signed off, and why an approval or rejection occurred is exceedingly difficult.
4. **Opaque Underwriting Decisions**: Applicants frequently receive flat rejections with no actionable reason or accessible proof of evaluation.

### The LoanChain Solution (Phase 1: Blockchain Infrastructure)
LoanChain establishes a **decentralized, tamper-evident trust anchor** on the Ethereum blockchain:
- Document files are cryptographically digested on the client side using **keccak256**.
- Only salted hashes and Merkle root bundles are committed to the public ledger.
- A **formal state machine** governs every transition of a loan application (from `Submitted` to `Repaid`).
- An append-only on-chain **audit log** records every transition, the acting Ethereum address, timestamps, and reasoning.
- Trusted employers and financial institutions attest to documents directly on-chain via dedicated registry contracts.

*(Note: In accordance with project specifications, all automated AI components—OCR perception, FOPL rule evaluation, Bayesian fraud scoring, and A\* counter-offer search—are strictly reserved for Phase 2).*

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
| **Solidity** | `^0.8.19` | Smart Contracts | Core smart contracts defining registries, state machine, consent control, and audit logs. |
| **Ethereum Sepolia** | Chain ID: `11155111` | Blockchain | Public proof-of-stake test network for smart contract deployment, state storage, and gas execution. |
| **Remix IDE** | Web IDE | Tooling / Deploy | Compilation with optimizer enabled (200 runs), deployment order management, and test transactions. |
| **React** | `^19.3.1` | Frontend UI | Component architecture, state management, reactive view routing, modal dialogues, and table rendering. |
| **Vite** | `^8.3.5` | Build Tool | Development server with Hot Module Replacement (HMR) and optimized Rollup client production builds. |
| **Ethers.js** | `^6.17.0` | Web3 Library | Wallet connection, RPC provider orchestration, contract abstraction, ABI encoding, and client-side `keccak256` hashing. |
| **MetaMask** | Browser Extension | Wallet / Signer | Non-custodial key management, Sepolia network switching, account authorization, and gas transaction signing. |
| **Web Crypto API** | Browser Native | Security / Utility | In-browser file reading (`arrayBuffer`), byte extraction, and random 32-byte salt generation. |
| **Python** | `3.11+` | AI Service Runtime | Isolated virtual environment powering the explainable AI verification microservice. |
| **FastAPI / Uvicorn** | `^0.115.0` | AI Web Framework | High-performance asynchronous API endpoints for document and bundle verification. |
| **PyMuPDF / pdfplumber** | `^1.25.0` | Text & Layout Extraction | Native vector text, bounding box, font name, and structured tabular extraction. |
| **pgmpy** | `^0.1.26` | Uncertainty Reasoning | Discrete Bayesian Network scoring for multi-factor document risk probability estimation. |
| **Eth-Account / Eth-Hash**| `^0.13.0` | Cryptography & Signing | EIP-712 typed-data hashing and secp256k1 low-$s$ ECDSA signature generation. |
| **Lucide React** | `^1.62.0` | UI Design | Consistent, modern vector iconography replacing all emojis. |
| **CSS3 Design System** | Custom Properties | Styling | Clean, human-made fintech dashboard UI (slate neutrals, royal blue accents, zero AI gradients). |

---

## 4. Complete File Structure & Responsibilities

```
loanchain_new/
├── README.md                           # Project quick-start & deployment overview
├── PROJECT_INFO.md                     # Comprehensive technical documentation (this file)
│
├── contracts/                          # Solidity Smart Contracts (Remix IDE Ready)
│   ├── IssuerRegistry.sol              # Registry of trusted document issuers (employers, banks)
│   ├── DocumentRegistry.sol            # On-chain document hash storage, Merkle roots, and doc audit log
│   ├── ConsentManager.sol              # Time-limited document access management for applicants
│   ├── LoanApplication.sol             # 9-state loan lifecycle state machine & officer audit trail
│   └── README.md                       # Strict Remix deployment guide and constructor arguments
│
├── dummy/                              # Sample PDF documents for verification testing
│   ├── id123.pdf                       # Sample identity document
│   ├── id456.pdf                       # Sample secondary identity document
│   ├── salary1234.pdf                  # Sample authentic salary slip
│   ├── salary5678.pdf                  # Sample secondary salary slip
│   ├── statement123.pdf                # Sample authentic bank statement
│   └── statement456.pdf                # Sample secondary bank statement
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
        ├── App.jsx                     # Layout shell, page switching, and top-level provider
        ├── index.css                   # Global CSS design system (zero gradients, clean typography)
        │
        ├── config/
        │   └── contracts.js            # Contract addresses, ABIs, Sepolia network params, and enum mappings
        │
        ├── context/
        │   └── Web3Context.jsx         # React Context managing MetaMask state, provider, signer, and roles
        │
        ├── hooks/
        │   └── useBlockchain.js        # Custom hooks: useDocuments, useLoans, hashFile, computeMerkleRoot
        │
        ├── components/
        │   ├── Header.jsx              # Top navigation bar (Cube logo, Sepolia indicator, Wallet pill)
        │   ├── Sidebar.jsx             # Left vertical navigation (Dashboard, Apply, Docs, Applications, Audit)
        │   └── Icons.jsx               # SVG Cube logo and MetaMaskFox component
        │
        └── pages/
            ├── DashboardPage.jsx       # Main dashboard matching user's reference design
            ├── LoanApplicationPage.jsx # 3-step loan application form with dynamic EMI calculator
            ├── DocumentsPage.jsx       # Document hash registry with client-side hashing
            ├── ApplicationsPage.jsx    # Applications list with status filters and officer controls
            └── AuditTrailPage.jsx      # Immutable on-chain audit trail with dual tabs
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
  - `DocType`: `SalarySlip` (0), `BankStatement` (1), `IDCard` (2), `AddressProof` (3), `ITReturn` (4), `Other` (5)
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

### 6.3 User Interface Views
- **Header** ([`Header.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/components/Header.jsx)):
  - Geometric cube logo and brand title.
  - Active network badge (`Sepolia Testnet` with pulsing green indicator).
  - Connected account pill featuring the user-supplied MetaMask logo, truncated hex address, and dropdown for Etherscan linking and disconnect.
- **Sidebar** ([`Sidebar.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/components/Sidebar.jsx)):
  - Clean 5-item navigation: **Dashboard**, **New Application**, **My Documents**, **Applications**, **Audit Log**.
- **Dashboard** ([`DashboardPage.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/pages/DashboardPage.jsx)):
  - Top "Welcome back" banner with wallet card.
  - 4 dynamic metric cards reading directly from connected on-chain state (strictly `0` for new accounts).
  - Drag-and-drop document upload zone with client-side hashing and one-click Sepolia anchoring.
  - Real-time Recent Activity timeline.
  - Applications summary table with "View Details" modal.
- **New Application** ([`LoanApplicationPage.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/pages/LoanApplicationPage.jsx)):
  - Step 1: Loan parameters (Amount, Tenure, Purpose, Interest Rate) with live EMI calculation.
  - Step 2: Document selector to bundle previously registered on-chain hashes.
  - Step 3: Review & blockchain submission with Sepolia transaction receipt link.
- **My Documents** ([`DocumentsPage.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/pages/DocumentsPage.jsx)):
  - Document hashing & registration form.
  - Registered documents bundle card list with one-click hash copying and full metadata inspection.
- **Applications** ([`ApplicationsPage.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/pages/ApplicationsPage.jsx)):
  - Complete list of submitted loan applications with status filters.
  - Dynamic officer execution controls (Verify Docs, Move to Review, Approve, Disburse) visible only to authorized officer addresses.
- **Audit Log** ([`AuditTrailPage.jsx`](file:///c:/Data/Programs/loanchain_new/frontend/src/pages/AuditTrailPage.jsx)):
  - Dual tabs: "Loan State Transitions" (vertical timeline) and "Document Events Ledger" (tabular format).

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
| **Human-Made Clean UI** | Solid color palettes, Inter typography, Lucide icons | Zero AI-generated aesthetic; clean, professional fintech interface. |

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
1. **Connect Wallet**: Click "Connect Wallet" on the top-right header or dashboard widget.
2. **Register a Document**: Navigate to **My Documents** or use the dashboard dropzone. Select a PDF from the `dummy/` directory. The file is hashed in memory. Click "Register Document on Blockchain" and approve the transaction in MetaMask.
3. **Run AI Verification**: Click "AI Verify" on your registered document card. Review the privacy consent modal, inspect extracted masked fields and deterministic rule checks, then click "Anchor AI Result on Sepolia" to record the EIP-712 attestation.
4. **Submit Loan**: Go to **New Application**. Set desired amount, tenure, and purpose. In Step 2, select your AI-verified document. Review and click "Submit Loan Application".
5. **Inspect Audit Log**: Go to **Audit Log** to inspect state entries and open the **AI Attestations** tab to view the immutable cryptographic records.
6. **Officer Review**: If logged in with the contract owner or added officer wallet, open **Applications**, click "Details", view the AI bundle reconciliation report and advisory suggested action, and execute status transitions.

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

For full specifications, rules, and AI document generation prompts, see [`AI_VERIFICATION_GUIDE.md`](AI_VERIFICATION_GUIDE.md).
