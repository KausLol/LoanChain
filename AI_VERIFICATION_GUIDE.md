# LoanChain Synthetic Document Generation Specification

This file is context for an LLM generating synthetic documents for the LoanChain AI verification service. It is a specification, not a prompt. Generate plain document text, paste it into Word, export a flattened PDF, register that exact PDF on-chain, and verify the unchanged file.

## Rules that apply to every document

- Generate new fictional values every time. Do not reuse example names, companies, banks, dates, amounts, identifiers, account numbers, PANs, Aadhaar numbers, or references.
- Return document text only. Do not return code, Markdown, JSON, HTML, explanations, or a PDF.
- Use selectable text, one field per physical line, as `Exact Label: Value`.
- Never split a label and its value across lines. Never put two labelled fields on one line.
- Use the exact labels specified below. Equivalent synonyms are not reliable.
- Include `SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE` near the top.
- Include a fictional-data disclaimer at the bottom.
- Do not use real personal data, real government identifiers, real bank accounts, official logos, seals, QR codes, barcodes, signatures, attachments, JavaScript, macros, annotations, password protection, or embedded files.
- Use dates in `DD/MM/YYYY` or `Month YYYY`. The service's deterministic rule tests use `28/10/2026` as their reference date.
- Keep the final upload at or below 10 MB and no more than 20 pages.
- Use a normal single-revision PDF. Word's `Microsoft Print to PDF` is acceptable; avoid editor metadata, unusual font substitutions, overlays, incremental updates, and whiteout/redaction drawings.
- A content-clean document can still receive a borderline result if issuer attestation is absent, extraction quality is poor, or PDF forensic signals are detected. The AI result is advisory.
- For a clean example, all required fields and equations must pass. For a tampered example, change only the stated value and intentionally fail the stated rule.
- After Word export, do not edit or re-export the PDF. Register and verify the exact same bytes; any export changes the on-chain hash.

## Frontend document types

| Document | Frontend `docType` | Template |
|---|---:|---|
| Salary Slip | 0 | `salary_slip.default` |
| Bank Statement | 1 | `bank_statement.default` |
| Aadhaar Card | 2 | `id_aadhaar.default` |
| PAN Card | 3 | `id_pan.default` |
| Address Proof | 4 | `address_proof.default` |
| Income Tax Return | 5 | `it_return.default` |
| Employee ID / generic document | 6 | `Other` |

---

## 1. Salary Slip — `docType: 0`

### Required structure

The text must contain salary-slip anchors such as `Salary Slip`, `Payslip`, `Earnings`, `Deductions`, and `Net Pay`.

Required labels:

```text
Employer:
Employee Name:
Pay Period:
Gross Earnings:
Total Deductions:
Net Pay:
```

Use the exact standalone label `Net Pay:`. Do not use only `NET PAY / NET SALARY`, `Net Salary`, or `Net Salary Payable`.

The `EARNINGS` section must contain at least two amount rows followed by `TOTAL GROSS EARNINGS:`. The `DEDUCTIONS` section must contain at least two amount rows followed by `TOTAL DEDUCTIONS:`.

Required equations:

```text
TOTAL GROSS EARNINGS = sum of all earnings rows
TOTAL DEDUCTIONS = sum of all deduction rows
Net Pay = Gross Earnings - Total Deductions
```

### Clean example

```text
SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE
MONTHLY SALARY SLIP / PAYSLIP
Document Type: Salary Slip
Employer: LumenArc Systems Pvt Ltd
Employee Name: Kavya Nair
Employee ID: EMP-LAS-4176
Designation: QA Automation Engineer
Department: Quality Engineering
Pay Period: October 2026
Payment Date: 31/10/2026

EARNINGS
Basic Salary: INR 33500.00
House Rent Allowance: INR 13400.00
Special Allowance: INR 8750.00
Other Allowances: INR 1250.00
TOTAL GROSS EARNINGS: INR 56900.00

DEDUCTIONS
Provident Fund: INR 4020.00
Professional Tax: INR 200.00
Tax Deducted at Source: INR 2100.00
Other Deductions: INR 180.00
TOTAL DEDUCTIONS: INR 6500.00

Gross Earnings: INR 56900.00
Total Deductions: INR 6500.00
Net Pay: INR 50400.00
Amount in Words: Fifty Thousand Four Hundred Rupees Only
Bank Account Number: XXXX XXXX 6148
Payment Status: Paid
Document Reference: LAS-PAY-202610-4176

This is fictional synthetic test data and does not represent a real employer, employee, account, or payment.
```

### Tampered example

Use the same structure and generate fresh values, but alter only `Net Pay` so it differs from gross minus deductions by more than INR 1.00.

```text
SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE
MONTHLY SALARY SLIP / PAYSLIP
Document Type: Salary Slip
Employer: LumenArc Systems Pvt Ltd
Employee Name: Kavya Nair
Employee ID: EMP-LAS-4176
Pay Period: October 2026

EARNINGS
Basic Salary: INR 33500.00
House Rent Allowance: INR 13400.00
Special Allowance: INR 8750.00
Other Allowances: INR 1250.00
TOTAL GROSS EARNINGS: INR 56900.00

DEDUCTIONS
Provident Fund: INR 4020.00
Professional Tax: INR 200.00
Tax Deducted at Source: INR 2100.00
Other Deductions: INR 180.00
TOTAL DEDUCTIONS: INR 6500.00

Gross Earnings: INR 56900.00
Total Deductions: INR 6500.00
Net Pay: INR 55000.00
Amount in Words: Fifty-Five Thousand Rupees Only
Document Reference: LAS-PAY-202610-TAMPERED

This is fictional synthetic test data. Net Pay was intentionally altered for ARITH_NET testing.
```

Expected tampered failure: `ARITH_NET` and the resulting blocking rejection.

---

## 2. Bank Statement — `docType: 1`

### Required structure

Required labels:

```text
Bank:
Account Holder:
Account Number:
Statement Period:
Opening Balance:
Total Credits:
Total Debits:
Closing Balance:
```

Do not use `Total Deposits` or `Total Withdrawals`; those are not the required field aliases.

Every transaction must be one physical line. The final two whitespace-separated tokens must be bare numeric values:

```text
DD/MM/YYYY DESCRIPTION TRANSACTION_AMOUNT RESULTING_BALANCE
```

The description must contain `DEBIT` for a debit or `CREDIT` for a credit. Do not put `INR` between the description and amount on transaction rows. `INR` is safe in summary fields, but the parser reads the second-last transaction token as the amount and the last token as the balance.

Required equations:

```text
resulting balance = previous balance + credit - debit
Closing Balance = Opening Balance + Total Credits - Total Debits
```

The final transaction balance must equal `Closing Balance`. Transaction dates should be chronological.

### Clean example

```text
SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE
BANK ACCOUNT STATEMENT
Document Type: Bank Statement
Bank: Silverline Community Bank
Account Holder: Kavya Nair
Account Number: XXXX XXXX 6148
Account Type: Savings
Statement Period: 01/10/2026 to 31/10/2026
Currency: INR
Opening Balance: INR 18450.00
Total Credits: INR 50550.00
Total Debits: INR 16850.00
Closing Balance: INR 52150.00

TRANSACTIONS
Date Description Amount Balance
03/10/2026 DEBIT Grocery Store Payment 2350.00 16100.00
08/10/2026 DEBIT Electricity Bill Payment 1650.00 14450.00
14/10/2026 DEBIT Monthly Rent Payment 12000.00 2450.00
18/10/2026 DEBIT Internet Bill Payment 850.00 1600.00
30/10/2026 CREDIT Savings Interest 150.00 1750.00
31/10/2026 CREDIT Salary Credit LumenArc Systems 50400.00 52150.00

This is fictional synthetic test data and does not represent a real bank, account, employee, or financial transaction.
```

### Tampered example

Start with a fully correct statement and change only one final balance.

```text
SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE
BANK ACCOUNT STATEMENT
Document Type: Bank Statement
Bank: Silverline Community Bank
Account Holder: Kavya Nair
Account Number: XXXX XXXX 6148
Statement Period: 01/10/2026 to 31/10/2026
Opening Balance: INR 18450.00
Total Credits: INR 50550.00
Total Debits: INR 16850.00
Closing Balance: INR 53150.00

TRANSACTIONS
Date Description Amount Balance
03/10/2026 DEBIT Grocery Store Payment 2350.00 16100.00
08/10/2026 DEBIT Electricity Bill Payment 1650.00 14450.00
14/10/2026 DEBIT Monthly Rent Payment 12000.00 2450.00
18/10/2026 DEBIT Internet Bill Payment 850.00 1600.00
30/10/2026 CREDIT Savings Interest 150.00 1750.00
31/10/2026 CREDIT Salary Credit LumenArc Systems 50400.00 53150.00

This is fictional synthetic test data. The final balance was intentionally altered for rule testing.
```

Expected tampered failures: `ARITH_STATEMENT_TOTALS` and `RUNNING_BALANCE_CONTINUITY`.

---

## 3. Aadhaar Card — `docType: 2`

### Required structure

Include `Aadhaar` and either `Unique Identification Authority of India` or `Government of India`.

Required labels:

```text
Aadhaar Number:
Name:
Date of Birth:
Gender:
```

The Aadhaar number must contain exactly 12 digits after spaces are removed and must pass the Verhoeff checksum. Do not use zero-filled placeholders, `TEST-ID`, or real numbers.

### Clean example

```text
SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE
AADHAAR TEST DOCUMENT
Government of India
Unique Identification Authority of India
Aadhaar
Mera Aadhaar, Meri Pehchan
Aadhaar Number: 9999 9999 0019
Name: Kavya Nair
Date of Birth: 22/04/1995
Gender: Female
VID: 9182 7364 5543 2109
Address: 18 Lakeview Road, Andheri East, Mumbai 400069

This is a fictional synthetic test document and is not an Aadhaar card or government identity document.
```

### Tampered example

Change only one digit of the valid example:

```text
Aadhaar Number: 9999 9999 0018
```

Keep all other fields and classification text unchanged. Expected failure: `AADHAAR_VERHOEFF_CHECKSUM`.

---

## 4. PAN Card — `docType: 3`

### Required structure

Include `INCOME TAX DEPARTMENT` or `Permanent Account Number Card`.

Required labels:

```text
PAN:
Name:
Date of Birth:
```

The PAN must be exactly 10 characters: five uppercase letters, four digits, and one uppercase letter (`AAAAA9999A`). For an individual, the fourth character must be `P`.

### Clean example

```text
SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE
PAN CARD TEST DOCUMENT
INCOME TAX DEPARTMENT
GOVT. OF INDIA
Permanent Account Number Card
PAN: ABCPE1234F
Name: Kavya Nair
Father's Name: Rajesh Nair
Date of Birth: 22/04/1995
Signature: Synthetic Test Signature

This is a fictional synthetic test document and is not a PAN card or government identity document.
```

### Tampered example

Change only the PAN to an invalid-length value:

```text
PAN: ABCPE1234
```

Keep all other fields unchanged. Expected failure: `PAN_SYNTAX_VALID`.

---

## 5. Employee ID — `docType: 6` with frontend selection `Other`

### Required structure

To select the employee-ID template rather than generic `Other`, include both exact phrases:

```text
Employee ID Card
Employee Information
```

Required labels:

```text
Full Name:
Organization:
Employee ID:
Valid Until:
```

The clean `Valid Until` date must be on or after `28/10/2026`. The tampered date must be before `28/10/2026`.

### Clean example

```text
SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE
EMPLOYEE ID CARD
Employee Information
Full Name: Kavya Nair
Organization: LumenArc Systems Pvt Ltd
Employee ID: EMP-LAS-4176
Designation: QA Automation Engineer
Department: Quality Engineering
Date of Joining: 01/06/2022
Issue Date: 01/06/2022
Valid Until: 31/12/2027
Work Location: Mumbai
Official Email: kavya.nair@example.test

This is a fictional synthetic employee ID for testing and is not an employment credential.
```

### Tampered example

Change only:

```text
Valid Until: 31/12/2025
```

Expected failure: `ID_NOT_EXPIRED`.

---

## 6. Address Proof — `docType: 4`

### Required structure

Include one anchor: `Electricity Bill`, `Utility Bill`, or `Proof of Address`.

Required labels:

```text
Consumer Name:
Service Address:
Bill Date:
```

For a clean example, `Bill Date` must be within six months before `28/10/2026`. The tampered example must use an older date.

### Clean example

```text
SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE
ELECTRICITY BILL
Document Type: Proof of Address
Consumer Name: Kavya Nair
Service Address: 18 Lakeview Road, Andheri East, Mumbai 400069
Bill Date: 15/10/2026
Consumer Number: TEST-CONS-4176
Amount Payable: INR 2350.00
Billing Period: October 2026

This is a fictional synthetic utility bill for testing and is not a real bill or proof of address.
```

### Tampered example

Change only:

```text
Bill Date: 15/01/2025
```

Expected result: `RECENT_BILL_DATE` fails as a non-blocking stale-document warning.

---

## 7. Income Tax Return — `docType: 5`

### Required structure

Include `Income Tax Return` or `Acknowledgement`.

Required labels:

```text
Name of Taxpayer:
PAN:
Assessment Year:
Gross Total Income:
Total Income:
```

`Total Deductions:` is optional. If present:

```text
Total Income = Gross Total Income - Total Deductions
```

If deductions are omitted, `Total Income` must equal `Gross Total Income`. Use a valid-format fictional PAN.

### Clean example

```text
SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE
INCOME TAX RETURN TEST DOCUMENT
Income Tax Return
Acknowledgement
Assessment Year: 2026-27
Name of Taxpayer: Kavya Nair
PAN: ABCPE1234F
Gross Total Income: INR 604800.00
Total Deductions: INR 50000.00
Total Income: INR 554800.00
Taxes Paid: INR 0.00

This is fictional synthetic test data and is not an income-tax return or government acknowledgement.
```

### Tampered example

Change only:

```text
Total Income: INR 654800.00
```

Expected failure: `ARITH_TAXABLE_INCOME`.

---

## 8. Generic Other document — `docType: 6`

Use this only when the document is not intended to match the employee-ID template. Do not include the employee-ID anchor phrases.

### Clean example

```text
SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE
SYNTHETIC SUPPORTING DOCUMENT
Document Type: Other
Applicant Name: Kavya Nair
Reference Number: TEST-OTHER-4176
Issue Date: 15/10/2026
Purpose: Supporting document for parser testing
Status: Test Document

This is fictional synthetic test data and is not an official identity, financial, employment, utility, or government document.
```

### Tampered example

Change only an ordinary reference/status value; generic `Other` has no blocking validation rules:

```text
Status: TEST CONTENT ALTERED AFTER ISSUE
```

This is suitable for manual-review testing, not automated fraud rejection.

---

## Final file checklist

Before upload:

1. Select the matching frontend `docType`.
2. Confirm every required label is present exactly.
3. Confirm text is selectable and extractable.
4. Confirm no label/value pair is wrapped across lines.
5. Confirm all clean arithmetic and running balances.
6. Confirm Aadhaar checksum and PAN format if applicable.
7. Confirm no embedded files, JavaScript, launch actions, annotations, or attachments.
8. Confirm the PDF is no larger than 10 MB and has no more than 20 pages.
9. Confirm the PDF has one final revision and no suspicious editing/overlay/font artifacts.
10. Register that exact final PDF on-chain.
11. Verify the unchanged registered file.
