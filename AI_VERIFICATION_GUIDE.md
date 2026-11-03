# LoanChain AI Document Verification Layer — Complete Guide

This guide provides both a **plain-language overview** for loan applicants and bank officers, and an **in-depth technical specification** for developers, smart contract auditors, and security evaluators. It also includes explicit document schemas and ready-to-use recipes for generating valid or tampered test documents using AI tools.

---

## 1. Plain-Language Explanation (For Applicants & Loan Officers)

### What Does the AI Verification Service Do?
When an applicant applies for a loan in LoanChain, they upload documents (such as salary slips, bank account statements, Aadhaar cards, and PAN cards).
- **In Phase 1**, the blockchain only proved that a document file had not been modified after upload (integrity of the registered `docHash`). However, if an applicant uploaded an *already-fabricated* or *edited* salary slip, Phase 1 had no way of knowing whether the numbers inside were legitimate or internally consistent.
- **In Phase 2**, the **AI Verification Layer** inspects the **content** of the document:
  1. It reads the text, numbers, and tables from the document file.
  2. It verifies that all salary numbers mathematically add up (e.g., Gross Pay minus Deductions equals Net Pay).
  3. It verifies that dates, PAN formats, and ID numbers conform to real-world financial standards.
  4. It scans the PDF file for signs of digital tampering (such as editing software traces, retrofitted text layers, font inconsistencies, or white-out overlays covering old numbers).
  5. It reconciles documents across the bundle (e.g., confirming that the net salary on the payslip matches the salary credit deposit on the bank statement).
  6. It produces an **advisory verdict** (`Approved`, `Borderline`, or `Rejected`) and a **cryptographic signature** that can be permanently recorded on Ethereum Sepolia.
- **In Phase 2.5 & IPFS Layer**:
  1. **AI Affordability Engine**: Computes debt-to-income (DTI) and FOIR capacity, estimating safe monthly EMI ceilings and advisory counter-offers.
  2. **Public Pinata IPFS for Manual Review**: If an applicant attaches documents that have not been AI-verified, the files are pinned to Public IPFS. Loan officers are flagged with `Manual Review Required` and can inspect the original dummy PDF/image via one-click **"View on IPFS"** links before making credit decisions.

### Why the AI Does Not Make the Final Lending Decision (Human-in-the-Loop)
The AI is strictly an **evidence generator**, not a loan officer.
- The AI cannot prove that a company in the real world actually exists unless attested by an accredited issuer (`IssuerRegistry.sol`).
- The AI cannot account for special officer exemptions or manual bank waivers.
- Therefore, the AI provides an explainable score, a list of passed/failed checks, and an **advisory suggested action**. The authorized loan officer remains the sole human decision-maker who approves, rejects, or counter-offers the loan. For non-AI-verified documents, the officer uses the integrated IPFS viewer to review original files directly.

### Privacy & Consent Guarantees
LoanChain is built on user privacy:
1. **Explicit Consent**: You must approve sending your file to the AI service before any data leaves your browser.
2. **Local Pre-Verification**: Your browser calculates the `keccak256` hash of your selected file and checks it against the blockchain record. If the file is not the exact file registered on-chain, it is rejected locally without sending anything over the network.
3. **Zero Persistent Storage**: Files are processed entirely in ephemeral memory and wiped immediately in a secure `finally` code block. Neither the original document nor the raw extracted text is ever written to disk or recorded in server logs.
4. **PII Masking**: Only masked identifiers (e.g., PAN `ABCDE****F`, Account `XXXXXX7890`, Aadhaar `XXXX XXXX 1234`) are retained in audit reports. Full government identity numbers are never stored.
5. **Decentralized IPFS Storage**: Off-chain files reside on IPFS addressed strictly by their cryptographic content identifier (CID); personal PII is never committed to the public Ethereum ledger.

### What is the On-Chain AI Attestation?
Once verified, the AI service uses a private cryptographic key to generate an **EIP-712 digital signature** certifying the result (`verdict`, `confidence`, `templateRef`, `explanationHash`).
- Anyone (the applicant or the loan officer) can submit this signature to the `AIAttestation.sol` smart contract on Ethereum Sepolia.
- The smart contract verifies the cryptographic signature directly against the registered `aiSigner` address without needing to trust any centralized server response.
- Once anchored on-chain, the verification is tamper-evident, immutable, and permanently auditable.

---

## 2. Technical Architecture & Deep-Dive (For Developers & Auditors)

```
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                           React 19 Frontend (Vite)                          │
   │  1. Hash file in browser (ethers.keccak256) -> verify against DocumentRegistry│
   │  2. Display explicit consent modal                                          │
   │  3. POST /v1/verify/document or /v1/verify/bundle                           │
   └──────────────────────────────────────┬──────────────────────────────────────┘
                                          │ HTTPS (Multipart)
                                          ▼
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                  FastAPI AI Verification Service (Python 3.11)              │
   │                                                                             │
   │  [A. Intake & Sanitization]                                                 │
   │      • Magic byte sniffing (PDF, PNG, JPEG)                                 │
   │      • Size limit (15MB) & page limit (10 pages)                            │
   │      • Decompression bomb protection (pypdf strict stream parsing)          │
   │                                                                             │
   │  [B. On-Chain Binding]                                                      │
   │      • Recompute keccak256(bytes)                                           │
   │      • Query Sepolia RPC: DocumentRegistry.verifyIntegrity(docId, docHash)   │
   │      • Assert document is not Revoked or Rejected on-chain                  │
   │      • Check IssuerRegistry for accredited issuer status                    │
   │                                                                             │
   │  [C. Text & Layout Extraction]                                              │
   │      • Native PDF layer extraction via PyMuPDF (fitz)                       │
   │      • Structured block & table line preservation                           │
   │      • Tesseract OCR fallback with confidence tracking                      │
   │                                                                             │
   │  [D. Declarative Template Matching]                                         │
   │      • Automatic template scoring via anchor frequency                      │
   │      • Schema-validated YAML validation spec (Pydantic TemplateSchema)      │
   │      • Normalized field parsing (PAN, IFSC, Currency, Dates)                │
   │                                                                             │
   │  [E. Deterministic Rules Engine (FOPL)]                                     │
   │      • Forward-chaining evaluation of field existence & formats             │
   │      • Exact arithmetic reconciliation with ±1.00 tolerance margin          │
   │      • Proof trace generation for every evaluated rule                      │
   │                                                                             │
   │  [F. Digital Forensic Signals Engine]                                       │
   │      • Metadata inspection (creation/mod date divergence, editing software) │
   │      • Incremental update scanning (multiple %%EOF markers)                 │
   │      • Font anomaly detection (foreign fonts in numeric table cells)        │
   │      • Whiteout overlay detection (monochrome rectangles over text)         │
   │      • Error Level Analysis (ELA) for image compression anomalies           │
   │                                                                             │
   │  [G. Bayesian Risk Scoring (pgmpy)]                                         │
   │      • Directed Acyclic Graph (DAG) Bayesian Network                        │
   │      • Monotonic Conditional Probability Tables (CPTs)                      │
   │      • Variable Elimination inference -> P(Fraud = True)                    │
   │      • Verdict mapping (Approved < 0.20, Borderline 0.20-0.50, Rejected>0.50)│
   │                                                                             │
   │  [H. Canonical Explanation Hashing (RFC 8785)]                              │
   │      • Lexicographically sorted JSON serialization                          │
   │      • keccak256(canonical_json) -> explanationHash                         │
   │                                                                             │
   │  [I. EIP-712 Cryptographic Signer]                                          │
   │      • Typed data struct: DocAttestation                                    │
   │      • Domain: LoanChainAI, chainId: 11155111, verifyingContract           │
   │      • 256-bit random replay protection nonce + 1-hour deadline             │
   │      • secp256k1 low-s enforced signature (eth_account)                     │
   └──────────────────────────────────────┬──────────────────────────────────────┘
                                          │
                        EIP-712 Signature │ + Attestation Struct
                                          ▼
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                         Ethereum Sepolia Testnet                            │
   │                                                                             │
   │   AIAttestation.sol:                                                        │
   │      • verifyIntegrity(att.docId, att.docHash) with DocumentRegistry        │
   │      • Require block.timestamp <= deadline                                  │
   │      • Require !usedNonces[nonce] -> usedNonces[nonce] = true               │
   │      • Low-s check (s <= secp256k1n / 2)                                    │
   │      • ecrecover(digest, v, r, s) == aiSigner                               │
   │      • Store latest attestation & emit DocumentAIAttested                   │
   │                                                                             │
   │   LoanApplication.sol:                                                      │
   │      • requireAIForDocsVerified gating flag                                 │
   │      • bundleVerdict(docIds) check before markDocsVerified()                │
   └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Supported Document Specifications & Validation Invariants

### 3.1 Salary Slip (`sal_slip_tech_corp@1.0.0`, `sal_slip_enterprise@1.0.0`, `sal_slip_generic@1.0.0`)

| Requirement | Specification | Notes |
| :--- | :--- | :--- |
| **Document Classification** | `docType == 0` | Mapped to `DOC_TYPE_LABELS[0]` |
| **Mandatory Anchors** | `["salary slip", "payslip", "earnings", "deductions", "net pay"]` | At least 3 must be present |
| **Required Fields** | `employee_name`, `employee_id`, `pay_period` or `pay_month`, `gross_earnings`, `total_deductions`, `net_pay` | Must extract with confidence > 0.6 |
| **Optional Fields** | `pan`, `bank_account_no`, `designation`, `department`, `pf_number`, `basic_salary`, `hra` | Masked in UI & reports |
| **Arithmetic Rule 1** | `gross_earnings == basic_salary + hra + allowances` | Tolerance: `abs(diff) <= 1.00` |
| **Arithmetic Rule 2** | `total_deductions == pf + prof_tax + tds + deductions` | Tolerance: `abs(diff) <= 1.00` |
| **Arithmetic Rule 3** | `net_pay == gross_earnings - total_deductions` | **Blocking Rule**. Tolerance: `abs(diff) <= 1.00` |
| **Date Ordering** | `issue_date >= pay_period_end` | Slip cannot be issued before pay period concludes |

### 3.2 Bank Account Statement (`bank_stmt_national@1.0.0`, `bank_stmt_coop@1.0.0`, `bank_stmt_generic@1.0.0`)

| Requirement | Specification | Notes |
| :--- | :--- | :--- |
| **Document Classification** | `docType == 1` | Mapped to `DOC_TYPE_LABELS[1]` |
| **Mandatory Anchors** | `["bank", "account statement", "opening balance", "closing balance", "withdrawals", "deposits"]` | At least 3 must be present |
| **Required Fields** | `account_holder_name`, `account_number`, `statement_period`, `opening_balance`, `closing_balance`, `total_deposits`, `total_withdrawals` | Normalizes to `Decimal` currency |
| **Arithmetic Rule** | `closing_balance == opening_balance + total_deposits - total_withdrawals` | **Blocking Rule**. Tolerance: `abs(diff) <= 1.00` |
| **Salary Credit Match** | Transaction description matches `SALARY` or employer name, credit amount equals `net_pay` | Tolerance: `abs(diff) <= 5.00` |

### 3.3 Aadhaar Card (`id_aadhaar@1.0.0`)

| Requirement | Specification | Notes |
| :--- | :--- | :--- |
| **Document Classification** | `docType == 2` | Mapped to `DOC_TYPE_LABELS[2]` (`Aadhaar Card`) |
| **Mandatory Anchors** | `["unique identification authority of india", "uidai", "aadhaar", "government of india"]`, `["mera aadhaar", "enrolment", "dob", "gender", "vid", "help@uidai.gov.in"]` | Must match UIDAI official headers |
| **Required Fields** | `aadhaar_number`, `full_name`, `dob` | Extracted and normalized |
| **Format & Checksum** | 12-digit number satisfying Verhoeff checksum algorithm | Cannot begin with 0 or 1 |
| **Age Requirement** | Minimum 18 years based on Date of Birth (`dob`) | Underage applicants rejected |
| **Privacy Masking** | Stored strictly as `XXXX XXXX 1234` | Full Aadhaar number is never persisted or logged |

### 3.4 Income Tax PAN Card (`id_pan@1.0.0`)

| Requirement | Specification | Notes |
| :--- | :--- | :--- |
| **Document Classification** | `docType == 3` | Mapped to `DOC_TYPE_LABELS[3]` (`PAN Card`) |
| **Mandatory Anchors** | `["income tax department", "permanent account number", "pan card", "govt. of india"]`, `["father's name", "date of birth", "pan", "signature"]` | Official Income Tax Department anchors |
| **Required Fields** | `pan`, `full_name`, `dob` | Extracted and normalized |
| **Format Regex** | `^[A-Z]{5}[0-9]{4}[A-Z]$` | 10 alphanumeric characters |
| **Entity Character (4th)** | `P` = Individual (`fields.pan[3] == 'P'`) | Must be individual entity for personal loans |
| **Age Requirement** | Minimum 18 years based on Date of Birth (`dob`) | Adult applicant validation |
| **Privacy Masking** | Masked as `ABCDE****F` | Only first 5 and last character visible in reports |

### 3.5 AI-Assisted Loan Affordability Analysis

Connecting verified document facts directly to loan parameters, the AI service evaluates repayment capacity and Debt-to-Income (DTI) metrics:

| Metric | Estimation Methodology | Formula / Standard |
| :--- | :--- | :--- |
| **Monthly Income** | Extracted and verified net salary from payslip or recurring bank deposits | $I = \text{net\_pay}$ or average monthly credits |
| **Existing Obligations** | Detected debt deductions on payslip and recurring bank debits (EMIs/rent) | $O = \text{deductions}_{\text{recurring}} + \text{debits}_{\text{recurring}}$ |
| **Current DTI** | Existing Debt-to-Income percentage before any new loan | $\text{DTI}_{\text{current}} = (O / I) \times 100\%$ |
| **Safe EMI Range** | Conservative (40% FOIR) to ceiling (50% FOIR) available capacity | $\text{EMI}_{\text{safe}} = [0.40 \cdot I - O,\, 0.50 \cdot I - O]$ |
| **Proposed Loan EMI** | Monthly repayment calculated using standard reducing-balance formula | $\text{EMI} = P \cdot r \cdot \frac{(1+r)^n}{(1+r)^n - 1}$ |
| **Projected DTI** | Total debt obligations inclusive of requested loan EMI | $\text{DTI}_{\text{projected}} = \frac{O + \text{EMI}}{I} \times 100\%$ |
| **Counter-Offer Suggestions** | If proposed EMI > safe ceiling, calculates adjusted principal or extended tenure | Principal clamped to safe capacity; tenure extended up to 84 months |
| **Advisory Nature** | **Strictly human-in-the-loop**: recommendations are advisory only | Loan officer and smart contract remain authoritative |

**Example Assessment Output:**
> *“Verified monthly income: ₹50,000. Existing obligations: ₹8,000. Recommended EMI ceiling: ₹12,000–₹17,000. Result: Affordable with high confidence.”*

---

## 4. How to Generate Dummy Documents Using AI Tools

You can use commercial LLMs (ChatGPT, Claude, Gemini, DeepSeek) to generate synthetic PDFs for testing LoanChain. Follow the instructions and prompt templates below.

### 4.1 Prompt for Generating Valid Identity Documents (Aadhaar Card & PAN Card)

Copy and paste this prompt into an AI tool to generate a Python script using `reportlab` or `fitz` (PyMuPDF) to create authentic test Aadhaar and PAN documents:

```text
Please write a Python script to generate authentic Indian identity documents for testing a financial verification system:

1. Aadhaar Card (`aadhaar_test.pdf` - docType: 2):
   - Header: "Government of India", "Unique Identification Authority of India (UIDAI)"
   - Subtitle: "Enrollment No: 1234/56789/01234", "Mera Aadhaar, Meri Pehchan"
   - Recipient Name: "Aarav Mehta"
   - Address: "42 Palm Avenue, Bandra West, Mumbai 400050"
   - Details:
     * Name: "Aarav Mehta"
     * Date of Birth: "15/08/1992"
     * Gender: "Male"
   - Aadhaar Number: "9999 9999 0019" (Note: Must be a valid Verhoeff checksum number)
   - Footer: "VID: 9182 7364 5543 2109", "help@uidai.gov.in | www.uidai.gov.in"

2. PAN Card (`pan_test.pdf` - docType: 3):
   - Header: "INCOME TAX DEPARTMENT", "GOVT. OF INDIA"
   - Card Title: "Permanent Account Number Card", "PAN Card"
   - Permanent Account Number: "ABCPE1234F" (4th char 'P' for Individual, 5th char 'E')
   - Details:
     * Name: "Aarav Mehta"
     * Father's Name: "Suresh Mehta"
     * Date of Birth: "15/08/1992"
   - Footer: "Signature" placeholder

Formatting guidelines:
- Clean Helvetica standard font.
- Crisp vector layout with standard 595x842 (A4) or credit card proportions.
```

### 4.2 Prompt for Generating a Complete 4-Document Clean Bundle (Bundle A)

Copy and paste this prompt into an AI tool to generate a Python script that builds all 4 documents in an authentic borrower bundle:

```text
Please write a clean Python script using `reportlab` or `pymupdf` that generates four documents for testing a blockchain loan verification bundle:

1. Aadhaar Card (`aadhaar_test.pdf` - docType 2):
   - Name: "Aarav Mehta", DOB: "15/08/1992", Aadhaar: "9999 9999 0019"

2. PAN Card (`pan_test.pdf` - docType 3):
   - Name: "Aarav Mehta", DOB: "15/08/1992", PAN: "ABCPE1234F"

3. Salary Slip (`salary_test.pdf` - docType 0):
   - Company: "Apex Global Technologies Pvt Ltd"
   - Employee Name: "Aarav Mehta", Employee ID: "EMP-APEX-9042"
   - Pay Period: "October 2026", Issue Date: "31/10/2026"
   - Basic Salary: INR 28,000.00, HRA: INR 12,000.00, Special Allowance: INR 8,500.00
   - Gross Earnings: INR 48,500.00
   - PF: INR 3,360.00, Prof Tax: INR 200.00, TDS: INR 1,500.00
   - Total Deductions: INR 5,060.00
   - Net Salary: INR 43,440.00 (Gross - Deductions)
   - Bank Account: Ending in 8912

4. Bank Account Statement (`statement_test.pdf` - docType 1):
   - Bank: "National Commercial Bank"
   - Account Holder: "Aarav Mehta", Account Number: "987654328912"
   - Statement Period: "01/10/2026 to 31/10/2026"
   - Opening Balance: INR 15,200.00
   - Total Deposits: INR 43,440.00
   - Total Withdrawals: INR 18,500.00
   - Closing Balance: INR 40,140.00 (Opening + Deposits - Withdrawals)
   - Transactions list must include:
     Date: "31/10/2026", Description: "SALARY CREDIT - APEX GLOBAL TECHNOLOGIES", Credit: "43,440.00"
```

---

### 4.2 Prompts for Generating Tampered / Fraudulent Documents (Testing AI Rejection)

To test that the AI layer properly detects fraud and flags documents, use these scenarios:

#### Scenario 1: Arithmetic Tampering (Inflation of Net Pay)
```text
Generate a Python script to create a tampered salary slip (`tampered_salary.pdf`):
- Employee: "Aditya Verma"
- Gross Earnings: INR 48,500.00
- Total Deductions: INR 5,060.00
- TAMPERED Net Salary: Set Net Salary to INR 55,000.00 instead of 43,440.00.
(This tests the forward-chaining rules engine rule `ARITH_NET_EQUALS_GROSS_MINUS_DEDUCTIONS`, which will fail and trigger an advisory rejection).
```

#### Scenario 2: Digital Forensics Tampering (Metadata & Overlay Artifacts)
```text
Write a script using `pypdf` or `pymupdf` that takes a valid PDF and introduces forensic tampering artifacts:
1. Modify the PDF metadata `/Producer` tag to "Adobe Photoshop 2024" or "Canva".
2. Append an incremental update (`%%EOF` marker appended to the file).
3. Draw a white filled rectangle (overlay) directly over the Gross Earnings text and write a new value on top using a non-standard font (e.g. Courier or Arial instead of Helvetica).
(This tests the digital forensics engine signals: `META_EDITOR_PRODUCER`, `INCREMENTAL_UPDATE_DETECTED`, `FONT_ANOMALY_IN_NUMERIC_FIELD`, and `OVERLAY_ARTIFACT_DETECTED`).
```

#### Scenario 3: Cross-Document Identity Mismatch
```text
Generate a bundle where:
- The Employee ID card is issued to "Aditya Verma".
- The Salary Slip is issued to "Vikramaditya Sharma".
- The Bank Statement is issued to "Aditya Verma".
(This tests the bundle cross-document engine fuzzy name matcher, which flags the mismatch across the bundle with code `BUNDLE_NAME_MISMATCH` and advises officer review).
```

---

## 5. Ready-to-Run Test Bundles Included in the Repository

The repository ships with ready-to-test dummy documents located in the `dummy/` directory:

| Bundle | Document | File | Key Facts & Quantities |
| :--- | :--- | :--- | :--- |
| **Bundle 1** | Employee ID | [`id123.pdf`](file:///c:/Data/Programs/loanchain_new/dummy/id123.pdf) | Aarav Mehta, ID: `EMP-DEMO-001`, BluePeak Tech |
| | Salary Slip | [`salary1234.pdf`](file:///c:/Data/Programs/loanchain_new/dummy/salary1234.pdf) | Aarav Mehta, Gross: ₹42,000, Deductions: ₹4,000, **Net Pay: ₹38,000** |
| | Bank Statement | [`statement123.pdf`](file:///c:/Data/Programs/loanchain_new/dummy/statement123.pdf) | Aarav Mehta, Opening: ₹12,500, Deposit: **₹38,000 (Salary)**, Closing: ₹32,000 |
| **Bundle 2** | Employee ID | [`id456.pdf`](file:///c:/Data/Programs/loanchain_new/dummy/id456.pdf) | Priya Sharma, ID: `NOV-2024-089`, NovaByte Solutions |
| | Salary Slip | [`salary5678.pdf`](file:///c:/Data/Programs/loanchain_new/dummy/salary5678.pdf) | Priya Sharma, Gross: ₹52,000, Deductions: ₹5,000, **Net Pay: ₹47,000** |
| | Bank Statement | [`statement456.pdf`](file:///c:/Data/Programs/loanchain_new/dummy/statement456.pdf) | Priya Sharma, Opening: ₹24,000, Deposit: **₹47,000 (Salary)**, Closing: ₹53,000 |

Both bundles are validated by automated unit and integration tests in [`test_verify_pipeline.py`](file:///c:/Data/Programs/loanchain_new/ai-service/tests/test_verify_pipeline.py) and [`test_bundle.py`](file:///c:/Data/Programs/loanchain_new/ai-service/tests/test_bundle.py).

---

## 6. IPFS Document Storage & Pinata Gateway for Manual Inspection

### 6.1 Purpose & Role in the Underwriting Flow
When an applicant submits documents that are not yet AI-verified, or whose templates are not supported by automated rules, LoanChain guarantees an unblocked credit evaluation path:
1. **Automated Background IPFS Pinning**: When the borrower uploads a file (in `DocumentsPage.jsx` or `DashboardPage.jsx`), it is automatically pinned to Public Pinata IPFS. Only the resulting `ipfs://<CID>` is recorded on Sepolia in `DocumentRegistry.sol`.
2. **Borrower Advisory Banner**: When submitting a loan application with unverified documents (`LoanApplicationPage.jsx`), the borrower is notified that their files will be reviewed manually via IPFS.
3. **Officer Manual Review Mode**: When the officer opens the loan in `ApplicationsPage.jsx`:
   - Non-AI-verified documents are flagged with an amber `Manual Review Required` badge.
   - A prominent officer callout directs the underwriter to inspect the customer's original files.
   - Every document provides a direct **"View on IPFS"** link opening the document via `https://gateway.pinata.cloud/ipfs/<CID>`.
   - The officer visually checks the file, confirms consistency, and executes on-chain verification or approval.

### 6.2 Setting Up Free Public Pinata IPFS

1. Sign up for a free account at [Pinata Cloud](https://app.pinata.cloud/) (includes 1 GB free storage and public gateway access).
2. Navigate to **API Keys** → **New Key**, select `Admin` or enable `pinFileToIPFS`, and generate a **JWT (Secret Access Token)**.
3. Add the token to `frontend/.env`:
   ```env
   VITE_PINATA_JWT=your_pinata_jwt_here
   VITE_PINATA_GATEWAY=https://gateway.pinata.cloud
   ```
4. Once saved, the upload panel in **My Documents** displays:
   `Storage Engine: ● Public Pinata IPFS (Auto-Pinned)`.
