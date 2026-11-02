# LoanChain AI Document Verification Layer — Complete Guide

This guide provides both a **plain-language overview** for loan applicants and bank officers, and an **in-depth technical specification** for developers, smart contract auditors, and security evaluators. It also includes explicit document schemas and ready-to-use recipes for generating valid or tampered test documents using AI tools.

---

## 1. Plain-Language Explanation (For Applicants & Loan Officers)

### What Does the AI Verification Service Do?
When an applicant applies for a loan in LoanChain, they upload documents (such as salary slips, bank account statements, and employee ID cards).
- **In Phase 1**, the blockchain only proved that a document file had not been modified after upload (integrity of the registered `docHash`). However, if an applicant uploaded an *already-fabricated* or *edited* salary slip, Phase 1 had no way of knowing whether the numbers inside were legitimate or internally consistent.
- **In Phase 2**, the **AI Verification Layer** inspects the **content** of the document:
  1. It reads the text, numbers, and tables from the document file.
  2. It verifies that all salary numbers mathematically add up (e.g., Gross Pay minus Deductions equals Net Pay).
  3. It verifies that dates, PAN formats, and ID numbers conform to real-world financial standards.
  4. It scans the PDF file for signs of digital tampering (such as editing software traces, retrofitted text layers, font inconsistencies, or white-out overlays covering old numbers).
  5. It reconciles documents across the bundle (e.g., confirming that the net salary on the payslip matches the salary credit deposit on the bank statement).
  6. It produces an **advisory verdict** (`Approved`, `Borderline`, or `Rejected`) and a **cryptographic signature** that can be permanently recorded on Ethereum Sepolia.

### Why the AI Does Not Make the Final Lending Decision (Human-in-the-Loop)
The AI is strictly an **evidence generator**, not a loan officer.
- The AI cannot prove that a company in the real world actually exists unless attested by an accredited issuer (`IssuerRegistry.sol`).
- The AI cannot account for special officer exemptions or manual bank waivers.
- Therefore, the AI provides an explainable score, a list of passed/failed checks, and an **advisory suggested action**. The authorized loan officer remains the sole human decision-maker who approves, rejects, or counter-offers the loan.

### Privacy & Consent Guarantees
LoanChain is built on user privacy:
1. **Explicit Consent**: You must approve sending your file to the AI service before any data leaves your browser.
2. **Local Pre-Verification**: Your browser calculates the `keccak256` hash of your selected file and checks it against the blockchain record. If the file is not the exact file registered on-chain, it is rejected locally without sending anything over the network.
3. **Zero Persistent Storage**: Files are processed entirely in ephemeral memory and wiped immediately in a secure `finally` code block. Neither the original document nor the raw extracted text is ever written to disk or recorded in server logs.
4. **PII Masking**: Only masked identifiers (e.g., PAN `ABCDE****F`, Account `XXXXXX7890`, Aadhaar `XXXX XXXX 1234`) are retained in audit reports. Full government identity numbers are never stored.

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

### 3.3 Employee Identity Card (`id_employee@1.0.0`)

| Requirement | Specification | Notes |
| :--- | :--- | :--- |
| **Document Classification** | `docType == 2` | Mapped to `DOC_TYPE_LABELS[2]` |
| **Mandatory Anchors** | `["employee id", "identity card", "staff id", "employee code"]` | At least 2 must be present |
| **Required Fields** | `employee_name`, `employee_id`, `company_name` | Name compared against salary slip |
| **Cross-Doc Rule** | Fuzzy name match (`token_set_ratio >= 85`) with salary slip name | Non-blocking warning if 70-84; fails if < 70 |

### 3.4 Income Tax PAN Card (`id_pan@1.0.0`)

| Requirement | Specification | Notes |
| :--- | :--- | :--- |
| **Format Regex** | `^[A-Z]{5}[0-9]{4}[A-Z]$` | 10 alphanumeric characters |
| **Entity Character (4th)** | `P` = Individual, `C` = Company, `H` = HUF, `F` = Firm | Standard Indian Income Tax syntax |
| **Surname Initial (5th)** | Must match the first letter of the applicant's last name | Verified during field normalization |

### 3.5 Aadhaar Card (`id_aadhaar@1.0.0`)

| Requirement | Specification | Notes |
| :--- | :--- | :--- |
| **Format Regex** | `^[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}$` | 12 digits, cannot start with 0 or 1 |
| **Checksum Algorithm** | Verhoeff algorithm | Base-10 dihedral group $D_5$ multiplication check |
| **Privacy Masking** | Stored strictly as `XXXX XXXX 1234` | Full Aadhaar number is never retained or returned |

---

## 4. How to Generate Dummy Documents Using AI Tools

You can use commercial LLMs (ChatGPT, Claude, Gemini, DeepSeek) to generate synthetic PDFs for testing LoanChain. Follow the instructions and prompt templates below.

### 4.1 Prompt for Generating a Fully Valid Bundle (Bundle A: Clean Application)

Copy and paste this prompt into an AI tool to generate a Python script that builds 3 authentic test PDFs using `reportlab`:

```text
Please write a clean Python script using `reportlab` that generates three PDF documents for testing a financial verification system:

1. Employee ID Card (`id_test.pdf`):
   - Company: "Apex Global Technologies Pvt Ltd"
   - Employee Name: "Aditya Verma"
   - Employee ID: "EMP-APEX-9042"
   - Designation: "Senior Systems Engineer"
   - Issue Date: "01/01/2024", Valid Thru: "31/12/2026"

2. Salary Slip (`salary_test.pdf`):
   - Company: "Apex Global Technologies Pvt Ltd"
   - Employee Name: "Aditya Verma", Employee ID: "EMP-APEX-9042"
   - Pay Period: "October 2026", Issue Date: "31/10/2026"
   - Earnings Table:
     * Basic Salary: INR 28,000.00
     * House Rent Allowance (HRA): INR 12,000.00
     * Special Allowance: INR 8,500.00
     * Gross Earnings: INR 48,500.00 (Must exactly equal sum of basic + hra + special allowance)
   - Deductions Table:
     * Provident Fund: INR 3,360.00
     * Professional Tax: INR 200.00
     * Income Tax (TDS): INR 1,500.00
     * Total Deductions: INR 5,060.00 (Must exactly equal sum of deductions)
   - Net Pay Summary:
     * Net Salary: INR 43,440.00 (Must exactly equal Gross Earnings - Total Deductions)
     * Disbursed via Bank Transfer to Account ending in 8912

3. Bank Account Statement (`statement_test.pdf`):
   - Bank Name: "National Commercial Bank"
   - Account Holder: "Aditya Verma"
   - Account Number: "987654328912"
   - Statement Period: "01/10/2026 to 31/10/2026"
   - Summary:
     * Opening Balance: INR 15,200.00
     * Total Deposits: INR 43,440.00
     * Total Withdrawals: INR 18,500.00
     * Closing Balance: INR 40,140.00 (Must exactly equal Opening + Deposits - Withdrawals)
   - Transactions list must include:
     * Date: "31/10/2026", Description: "SALARY CREDIT - APEX GLOBAL TECHNOLOGIES", Credit: "43,440.00"

Formatting requirements:
- Use standard Helvetica fonts only.
- Render clean borders, distinct table grids, and correct date formats (DD/MM/YYYY).
- Ensure all numbers strictly adhere to the arithmetic formulas without rounding discrepancies.
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
