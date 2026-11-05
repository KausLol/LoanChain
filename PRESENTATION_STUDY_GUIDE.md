# LoanChain Presentation Study Guide

## 1. One-minute project explanation

LoanChain is a blockchain-powered loan document verification system.

It combines:

1. **Blockchain integrity** - proves that the exact document submitted later is the same document that was originally registered.
2. **Explainable AI verification** - checks document type, required fields, arithmetic consistency, and signs of editing or tampering.
3. **Loan workflow management** - tracks a loan from submission through review, approval, disbursement, and repayment.
4. **Consent and auditability** - records important actions and lets applicants control document access.

The main idea is:

> The document itself stays off-chain, while its cryptographic identity, verification result, and audit history can be checked on-chain.

The AI result is an advisory verification result. A bank officer remains responsible for the final lending decision.

---

## 2. Technology stack in brief

| Layer | Technology | Purpose |
|---|---|---|
| Blockchain | Ethereum Sepolia, Solidity | Stores hashes, statuses, attestations, and audit events |
| Smart-contract tools | Remix IDE, MetaMask | Deploys contracts and signs transactions |
| Frontend | React, Vite, Ethers.js | User interface, wallet connection, hashing, and contract calls |
| AI service | Python, FastAPI, Uvicorn | Receives documents and returns verification results |
| Document processing | PyMuPDF, OCR fallback | Extracts text, layout, and PDF information |
| Rules and scoring | YAML templates, Python rules, pgmpy | Performs explainable checks and fraud-risk scoring |
| Storage | IPFS/Pinata | Stores document files off-chain using a CID |
| Database | SQLite | Stores explanation reports without storing raw document files |

This project uses **classical, explainable AI**, not a generative chatbot. The result is produced by templates, deterministic rules, forensic signals, and a Bayesian risk score.

---

## 3. The complete system flow

### Phase A: Contract and service setup

1. Deploy the contracts on Ethereum Sepolia.
2. Register trusted issuers such as employers or banks.
3. Add bank officers.
4. Configure the frontend with the deployed contract addresses.
5. Start the AI service on port `8000`.
6. Configure the AI signer address and the matching private key securely.
7. Link `AIAttestation` to `LoanApplication`.
8. Optionally enable `requireAIForDocsVerified`.

### Phase B: Applicant registers a document

1. The applicant selects a PDF or image in the frontend.
2. The browser reads the file locally.
3. Ethers.js calculates the file's `keccak256` hash.
4. The file may be pinned to IPFS and receives an IPFS CID.
5. The applicant submits a blockchain transaction.
6. `DocumentRegistry` stores:
   - document ID,
   - document hash,
   - salted hash,
   - document type,
   - applicant address,
   - IPFS CID,
   - status,
   - Merkle bundle root.
7. The actual document is not written into the blockchain.

At this point, the document is **registered**, not yet AI verified.

### Phase C: AI verification

1. The user clicks **AI Verify** for a registered document.
2. The user selects the exact same file again.
3. The browser hashes it locally and compares it with the on-chain hash.
4. If the hashes do not match, verification stops.
5. The user confirms privacy consent.
6. The frontend sends the file, document ID, and document type to:

   `POST /v1/verify/document`

7. The AI service validates and analyzes the file.
8. It returns a verdict, confidence, checks, signals, masked fields, explanation hash, and—if configured—an EIP-712 signature.

### Phase D: Attestation anchoring

1. The frontend receives the signed AI result.
2. The user submits the result to `AIAttestation`.
3. The contract checks:
   - the attestation has not expired,
   - its nonce has not been used,
   - the document hash still matches `DocumentRegistry`,
   - the signature was created by the configured AI signer.
4. The contract stores the latest attestation and appends it to the document's history.
5. An event is emitted for the audit trail.

The document now has a verifiable, on-chain AI result.

### Phase E: Loan review

1. The applicant submits a loan application with document IDs.
2. The application starts in `Submitted`.
3. An officer reviews the documents and AI results.
4. The officer can move the application through:

   `Submitted -> DocsVerified -> UnderReview -> Approved/Rejected/CounterOffered -> Disbursed -> Repaid`

5. If strict AI enforcement is enabled, the application cannot move to `DocsVerified` unless every attached document has an AI attestation and the bundle is not rejected.
6. The AI affordability module provides an advisory EMI, DTI, FOIR, or counter-offer analysis.
7. The officer remains the final decision-maker.

---

## 4. Recommended live demonstration

### Before the presentation

- Connect MetaMask to **Ethereum Sepolia**.
- Confirm the frontend contract addresses are correct.
- Start the AI service:

  ```powershell
  cd ai-service
  .\.venv\Scripts\Activate.ps1
  uvicorn app.main:app --port 8000 --reload
  ```

- Start the frontend:

  ```powershell
  cd frontend
  npm run dev
  ```

- Keep these sample files ready:
  - a clean Aadhaar PDF,
  - a clean salary slip,
  - a clean bank statement,
  - one tampered document.

Use synthetic files only. Do not upload real identity or banking data during a demonstration.

### Demonstration script

#### Opening

> “LoanChain addresses a problem in digital lending: a document may be altered after it was submitted, and a reviewer may not have a reliable audit trail. Our system stores a cryptographic proof of the document on Ethereum, analyzes the document off-chain, and anchors the AI result back on-chain.”

#### Step 1: Show the network and wallet

> “The application is connected to MetaMask on Ethereum Sepolia. Sepolia is a test network, so this demonstration does not use real funds.”

Show:

- connected wallet,
- Sepolia network,
- contract addresses if needed.

#### Step 2: Register a clean document

1. Open **Documents**.
2. Select a clean salary slip.
3. Choose **Salary Slip**.
4. Register the document.

Say:

> “The browser hashes the file before registration. The blockchain stores the hash and a reference to the off-chain file, not the document contents.”

Point out that the status is initially **Registered**.

#### Step 3: Run AI verification

1. Click **AI Verify**.
2. Select the unchanged PDF.
3. Show the local hash match.
4. Confirm consent.
5. Wait for the AI result.

Say:

> “The AI service first checks that the uploaded file is the same byte-for-byte file registered on-chain. It then extracts text, identifies the template, checks required fields and arithmetic, looks for forensic anomalies, and calculates an explainable risk score.”

Show:

- document type,
- extracted masked fields,
- passed rules,
- confidence,
- explanation summary.

#### Step 4: Anchor the result

1. Click the button to anchor the attestation.
2. Confirm the MetaMask transaction.
3. Wait for confirmation.

Say:

> “The AI service signs the result off-chain using EIP-712. The smart contract verifies that signature and records the result against this exact document hash.”

Show the status changing to an AI-approved or AI-reviewed badge.

#### Step 5: Demonstrate a tampered document

1. Register or select a tampered sample.
2. Run AI verification.
3. Show the failed rule.

Examples:

- Aadhaar: invalid Verhoeff checksum.
- Salary slip: net pay does not equal gross earnings minus deductions.
- Bank statement: closing balance or running balances are inconsistent.

Say:

> “The file can be a valid PDF and still fail verification. PDF validation only proves that the file can be safely read. The business rules identify whether its contents are internally inconsistent.”

Expected result: **Rejected**.

#### Step 6: Demonstrate the loan workflow

1. Submit a loan application.
2. Attach the document IDs.
3. Show the application in `Submitted`.
4. Open the officer review area.
5. Show the AI bundle result.
6. Move the application to review or approval only when the configured checks allow it.

Say:

> “The loan contract is a state machine. Officers cannot skip arbitrary stages, and important actions are recorded with an actor, timestamp, and reason.”

#### Closing

> “The result is a combination of three proofs: the hash proves file integrity, the AI report explains document consistency, and the EIP-712 attestation proves that the result came from the authorized AI signer. The final credit decision remains with the authorized officer.”

---

## 5. How the AI service verifies a document

The service runs the following pipeline:

### 5.1 Intake validation

It checks:

- file is not empty,
- file is within the size limit,
- file begins with the correct PDF or image signature,
- PDF structure can be parsed,
- page count is within the limit,
- encrypted or password-protected PDFs are rejected,
- hostile PDF features such as JavaScript or embedded files are rejected.

### 5.2 Hash and blockchain binding

The service computes the file hash again. Unless offline mode is explicitly used, it reads the document record from `DocumentRegistry` and compares the submitted hash with the registered hash.

If the file was changed, the result is stopped with a hash mismatch.

### 5.3 Text and layout extraction

- Native PDF text is extracted with PyMuPDF.
- Word positions, fonts, page numbers, and layout information are collected.
- Sparse or image-only pages can use OCR fallback.
- Extraction quality becomes part of the final score.

### 5.4 Template selection

The document type supplied by the frontend is compared with versioned templates:

| `docType` | Template |
|---:|---|
| 0 | Salary slip |
| 1 | Bank statement |
| 2 | Aadhaar card |
| 3 | PAN card |
| 4 | Address proof |
| 5 | Income tax return |
| 6 | Other |

Anchor words are used to check whether the content resembles the claimed document type.

### 5.5 Field extraction

The service extracts fields such as:

- employee name,
- employer,
- gross earnings,
- deductions,
- net pay,
- account holder,
- balances,
- Aadhaar number,
- date of birth.

The report displays masked values rather than exposing sensitive values unnecessarily.

### 5.6 Deterministic rules

These are repeatable business checks, not subjective opinions.

Examples:

- salary components add up to gross salary,
- gross salary minus deductions equals net pay,
- bank opening balance plus credits minus debits equals closing balance,
- every transaction's running balance is correct,
- Aadhaar number passes the Verhoeff checksum,
- mandatory fields are present,
- dates are in the expected order.

A blocking rule failure causes a rejected verdict.

### 5.7 Forensic checks

The service can look for:

- suspicious PDF producer metadata,
- inconsistent fonts,
- multiple revisions,
- incremental updates,
- overlay or whiteout artifacts,
- image editing signals.

These signals support the decision but should be explained as evidence, not as absolute proof of fraud.

### 5.8 Bayesian risk score

The service combines:

- template conformance,
- arithmetic failures,
- metadata anomalies,
- edit artifacts,
- extraction quality,
- issuer attestation.

It produces:

- `Approved`,
- `Borderline`,
- `Rejected`,
- a confidence score.

The score is advisory and does not replace human underwriting.

### 5.9 Explanation report

The service generates an explanation report containing the checks, reasons, signals, and masked fields. The report is stored in SQLite using an `explanationHash`, rather than storing the original document in the database.

---

## 6. Smart contracts in simple words

### 6.1 `IssuerRegistry`

**Purpose:** Maintains the list of trusted issuers, such as employers, banks, or government institutions.

**What it does:**

- adds an issuer,
- marks an issuer active,
- revokes an issuer,
- lets other contracts check whether an address is trusted.

**Depends on:** Nothing.

**Used by:** `DocumentRegistry` and `LoanApplication`.

### 6.2 `DocumentRegistry`

**Purpose:** Creates the on-chain identity of each document.

**What it stores:**

- document hash,
- salted hash,
- document type,
- applicant,
- issuer,
- status,
- IPFS CID,
- Merkle root,
- timestamps.

**What it does:**

- registers a document hash,
- prevents duplicate hashes,
- allows a trusted issuer to attest a document,
- allows an administrator to verify or reject it,
- supports revocation,
- exposes an integrity check for `AIAttestation`.

**Depends on:** `IssuerRegistry`, because it checks whether an issuer is active.

**Used by:** `LoanApplication` and `AIAttestation`.

### 6.3 `ConsentManager`

**Purpose:** Gives an applicant control over which institution can access selected documents.

**What it does:**

- grants access to specific documents,
- limits access to a time period,
- revokes access,
- checks whether consent is still valid.

**Depends on:** No contract dependency.

**Important note:** It is a separate access-control contract. It does not store the file and does not itself perform AI verification.

### 6.4 `LoanApplication`

**Purpose:** Manages the loan lifecycle and officer workflow.

**What it does:**

- submits loan applications,
- attaches document IDs,
- manages officers,
- assigns applications,
- enforces valid state transitions,
- records rejection reasons and counter-offers,
- records loan audit entries,
- optionally requires AI attestations before documents can be marked verified.

**Depends on:**

- `DocumentRegistry` for document references,
- `IssuerRegistry` for issuer-related checks,
- `AIAttestation` optionally, when AI enforcement is enabled.

### 6.5 `AIAttestation`

**Purpose:** Stores a cryptographically signed AI result on-chain.

**What it does:**

- verifies the AI signer's EIP-712 signature,
- checks that the document hash is still valid,
- rejects expired attestations,
- prevents nonce replay,
- stores the latest result,
- keeps an append-only history,
- calculates an aggregate bundle verdict.

**Depends on:** `DocumentRegistry` and the configured AI signer address.

**Used by:** `LoanApplication` when strict AI verification is enabled.

---

## 7. Contract dependency map

```text
IssuerRegistry
       ^
       |
DocumentRegistry <--------- AIAttestation <--------- AI service signer
       ^                         ^
       |                         |
       +------ LoanApplication ---+

ConsentManager
  (separate applicant consent module)
```

Deployment order:

1. `IssuerRegistry`
2. `DocumentRegistry(IssuerRegistry address)`
3. `ConsentManager`
4. `LoanApplication(DocumentRegistry address, IssuerRegistry address)`
5. `AIAttestation(DocumentRegistry address, AI signer address)`
6. Link the attestation contract to `LoanApplication`

---

## 8. EIP-712 and attestation, without unnecessary jargon

### What problem does EIP-712 solve?

The AI service must prove that a verification result really came from the authorized AI service and was not changed before being placed on-chain.

EIP-712 provides a standard way to sign structured data. Instead of signing an unclear string, the signer signs a named and typed document-attestation object.

### What is signed?

The attestation contains:

- `docId` - which document is being discussed,
- `docHash` - the exact file hash,
- `verdict` - approved, borderline, or rejected,
- `confidenceBps` - confidence in basis points,
- `templateRef` - the validation template and version,
- `modelVersion` - the AI service version,
- `explanationHash` - identifier for the detailed report,
- `nonce` - unique number used once,
- `deadline` - expiry time.

### What is the EIP-712 domain?

The domain identifies where the signature is valid:

- name: `LoanChainAI`,
- version: `1`,
- chain ID: Sepolia,
- verifying contract: the deployed `AIAttestation` address.

This prevents a signature intended for one chain or contract from being reused somewhere else.

### How the attestation works

1. The AI service finishes the document analysis.
2. It creates the typed attestation data.
3. It signs that data with the private key corresponding to the configured AI signer address.
4. The frontend receives the attestation and signature.
5. The user submits both to `AIAttestation`.
6. The contract reconstructs the same typed-data digest.
7. `ecrecover` recovers the signer address from the signature.
8. The contract compares the recovered address with `aiSigner`.
9. If they match, the result is stored.

### Protection included in the contract

- **Deadline:** expired results cannot be submitted.
- **Nonce:** a result cannot be replayed.
- **Document hash check:** the result must refer to the registered, non-revoked file.
- **Domain separator:** the signature is bound to the chain and contract.
- **Low-`s` check:** prevents signature malleability.
- **Signature length and `v` validation:** rejects malformed signatures.

The wallet submitting the transaction pays gas, but the AI signer is the identity that authorizes the result.

---

## 9. Important concepts to explain during questions

### Hash versus encryption

A hash is a one-way fingerprint. It proves that two files are identical, but it does not hide a file by itself and does not prove that the contents are truthful.

Encryption protects confidentiality. The project keeps document content off-chain and uses the IPFS CID as a reference. Explain the exact storage configuration used in the demonstration rather than promising privacy that has not been configured.

### Integrity versus authenticity

- **Integrity:** the file has not changed. This is checked with `keccak256`.
- **Authenticity:** the information came from a trusted source. This is supported by issuer attestations and authorized AI signing.
- **Business correctness:** the numbers and fields are internally consistent. This is checked by the AI rules.

These are different checks.

### Why not put PDFs directly on Ethereum?

Ethereum is public, expensive, and unsuitable for storing large private files. The project stores compact proofs and references on-chain instead.

### Why use both AI and smart contracts?

The AI service is good at reading and evaluating document content. Smart contracts are good at enforcing rules, preserving history, and making verification independently checkable. Each layer covers the other's weakness.

### What happens if the PDF is edited?

Even a one-byte change creates a different hash. The frontend detects the mismatch before sending the file for analysis, and the backend checks it again against `DocumentRegistry`.

### Is AI approval automatic loan approval?

No. AI verification concerns document confidence and consistency. The bank officer still makes the credit decision, subject to the configured loan workflow and business policy.

---

## 10. Common presentation pitfalls

- Registering a document is not the same as AI verifying it.
- The AI service must be running and reachable by the frontend.
- The exact original PDF must be selected for verification.
- Re-exporting or editing a PDF changes its hash.
- A valid PDF can still fail business rules.
- A clean AI result can still be borderline if issuer attestation is missing or forensic signals are present.
- AI attestation requires the deployed contract address, chain ID, and AI signer configuration to match.
- Never display or share a real private key, Pinata secret, or personal document during the presentation.

---

## 11. Short answers for likely questions

**What does the blockchain verify?**  
It verifies the document fingerprint, contract state, signer, timestamps, and audit history.

**What does the AI verify?**  
It verifies document structure, fields, arithmetic relationships, document type, and possible tampering signals.

**Where is the PDF stored?**  
Off-chain, referenced through an IPFS CID. The PDF contents are not stored in the smart contract.

**Who signs the AI result?**  
The configured AI service signer. The smart contract checks that the signature belongs to that address.

**Can an applicant change an approved PDF later?**  
Not without changing its hash. The changed file will no longer match the registered document.

**What if the AI service is unavailable?**  
New AI verification and signing cannot complete. Existing on-chain registrations and attestations remain readable.

**What does `confidenceBps` mean?**  
Confidence in basis points: `9500` means 95.00%.

**What are the verdict values?**  
`0 = Approved`, `1 = Borderline`, `2 = Rejected`.

**Why is the result explainable?**  
The report includes the template, extracted masked fields, individual rule outcomes, forensic signals, and reasons instead of only returning a black-box label.

---

## 12. Final presentation summary

End with these three points:

1. **The hash protects document integrity.**
2. **The AI pipeline explains whether the document is internally consistent and suspicious.**
3. **The EIP-712 attestation connects that AI result to an authorized signer and anchors it on-chain.**

LoanChain therefore creates a tamper-evident, explainable, and auditable document-verification layer for digital lending.
