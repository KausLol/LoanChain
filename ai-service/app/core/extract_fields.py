import re
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from app.models.template import TemplateSchema, FieldSpec
from app.models.facts import (
    ExtractedField,
    ExtractedTable,
    ExtractedTableRow,
)
from app.core.extract_text import ExtractionResult
from app.core.validators import (
    normalize_name,
    normalize_money,
    normalize_date,
    mask_pan,
    mask_aadhaar,
    mask_account_number,
)


def extract_fields_and_tables(
    extraction: ExtractionResult,
    template: TemplateSchema,
) -> Tuple[Dict[str, ExtractedField], Dict[str, ExtractedTable]]:
    """
    Extracts structured fields and tables using template declarative specs.
    Handles label aliases, multi-line values, format normalization, and PII masking.
    """
    full_text = extraction.full_text
    raw_lines = [line_str.strip() for line_str in full_text.splitlines() if line_str.strip()]
    fields: Dict[str, ExtractedField] = {}
    tables: Dict[str, ExtractedTable] = {}

    # 1. Extract defined fields
    for field_name, spec in template.fields.items():
        extracted = _extract_single_field(field_name, spec, raw_lines, full_text)
        if extracted:
            fields[field_name] = extracted

    # 2. Extract defined tables (Earnings, Deductions, Bank Transactions)
    if template.docType == "SalarySlip":
        earnings_table, deductions_table = _extract_salary_tables(raw_lines)
        if earnings_table:
            tables["earnings"] = earnings_table
            # If gross_earnings was not captured by field aliases, use table total
            if "gross_earnings" not in fields and earnings_table.total_amount:
                fields["gross_earnings"] = ExtractedField(
                    name="gross_earnings",
                    raw_value=str(earnings_table.total_amount),
                    value_masked=f"₹{earnings_table.total_amount:,.2f}",
                    normalized_value=earnings_table.total_amount,
                )
        if deductions_table:
            tables["deductions"] = deductions_table
            if "total_deductions" not in fields and deductions_table.total_amount:
                fields["total_deductions"] = ExtractedField(
                    name="total_deductions",
                    raw_value=str(deductions_table.total_amount),
                    value_masked=f"₹{deductions_table.total_amount:,.2f}",
                    normalized_value=deductions_table.total_amount,
                )

    elif template.docType == "BankStatement":
        transactions_table = _extract_bank_transactions(raw_lines)
        if transactions_table:
            tables["transactions"] = transactions_table

    return fields, tables


def _extract_single_field(
    name: str,
    spec: FieldSpec,
    lines: List[str],
    full_text: str,
) -> Optional[ExtractedField]:
    """Locates and parses a field based on its aliases and type."""
    raw_val = None

    # Search through lines for alias match
    for alias in spec.aliases:
        alias_clean = alias.strip()
        # Case A: Same line: alias followed by optional colon/dash and value
        same_line_pat = re.compile(
            rf"(?:^|[•\*\?]\s*){re.escape(alias_clean)}\s*[:\-\—\=]?\s*(.+)$",
            re.IGNORECASE,
        )
        # Case B: Multi-line: line consists solely of the alias (with optional bullet/colon)
        label_only_pat = re.compile(
            rf"(?:^|[•\*\?]\s*){re.escape(alias_clean)}\s*[:\-\—\=]?\s*$",
            re.IGNORECASE,
        )

        for idx, line in enumerate(lines):
            # Check same line
            m = same_line_pat.search(line)
            if m:
                cand = m.group(1).strip()
                # Clean leading bullets
                cand = re.sub(r"^[•\*\?\-]\s*", "", cand)
                # If cand is not empty, use it
                if cand:
                    raw_val = cand
                    break

            # Check label on line idx, value on line idx+1
            if label_only_pat.search(line) and idx + 1 < len(lines):
                next_line = lines[idx + 1].strip()
                # Ensure next line is not a section header or bullet
                if next_line and not any(kw in next_line.lower() for kw in ["earnings", "deductions", "component", "details"]):
                    cand = re.sub(r"^[•\*\?\-]\s*", "", next_line)
                    if cand:
                        raw_val = cand
                        break

        if raw_val:
            break

    # If regex was specified in template and not found by alias
    if not raw_val and spec.regex:
        m = re.search(spec.regex, full_text)
        if m:
            raw_val = m.group(0).strip()

    if not raw_val:
        return None

    # Normalization and masking based on spec.type
    norm_val = raw_val
    masked_val = raw_val

    if spec.type == "name":
        norm_val = normalize_name(raw_val)
        masked_val = norm_val
    elif spec.type == "money":
        norm_val = normalize_money(raw_val)
        masked_val = f"₹{norm_val:,.2f}" if norm_val is not None else raw_val
    elif spec.type in ("date", "month"):
        norm_val = normalize_date(raw_val) or raw_val
        masked_val = norm_val
    elif spec.type == "pan":
        norm_val = raw_val.strip().upper()
        masked_val = mask_pan(norm_val)
    elif spec.type == "aadhaar":
        norm_val = re.sub(r"[\s\-]", "", raw_val)
        masked_val = mask_aadhaar(norm_val)
    elif spec.type == "account":
        norm_val = raw_val.strip()
        masked_val = mask_account_number(norm_val)
    elif spec.type in ("id", "text", "words"):
        norm_val = raw_val.strip()
        masked_val = norm_val

    return ExtractedField(
        name=name,
        raw_value=raw_val,
        value_masked=str(masked_val),
        normalized_value=norm_val,
        confidence=1.0,
        source="native",
        page=1,
    )


def _extract_salary_tables(lines: List[str]) -> Tuple[ExtractedTable, ExtractedTable]:
    """Extracts Earnings and Deductions line items from a salary slip."""
    earnings_rows: List[ExtractedTableRow] = []
    deductions_rows: List[ExtractedTableRow] = []

    current_section = None
    i = 0
    while i < len(lines):
        line = lines[i]
        lower = line.lower()

        if "earnings" in lower and "gross" not in lower:
            current_section = "earnings"
            i += 1
            continue
        elif "deductions" in lower and "total" not in lower:
            current_section = "deductions"
            i += 1
            continue
        elif "net salary" in lower or "net pay" in lower or "document reference" in lower:
            current_section = None

        if current_section:
            # Case 1: Component and amount on same line: "Basic Salary ₹25,000"
            m_same = re.match(r"^([^\d₹]+?)\s+([₹RsINR\.\d,]+)$", line)
            if m_same:
                comp_name = m_same.group(1).strip()
                amt = normalize_money(m_same.group(2))
                if amt is not None and "gross" not in comp_name.lower() and "total" not in comp_name.lower():
                    row = ExtractedTableRow(cells={"component": comp_name, "amount": str(amt)}, amount=amt)
                    if current_section == "earnings":
                        earnings_rows.append(row)
                    elif current_section == "deductions":
                        deductions_rows.append(row)
                i += 1
                continue

            # Case 2: Component on line i, Amount on line i+1:
            # line i = "Travel Allowance", line i+1 = "₹2,000"
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                amt_next = normalize_money(next_line)
                if amt_next is not None and not re.match(r"^[₹RsINR\.\d,]+$", line):
                    comp_name = line.strip()
                    if "gross" not in comp_name.lower() and "total" not in comp_name.lower() and "component" not in comp_name.lower():
                        row = ExtractedTableRow(cells={"component": comp_name, "amount": str(amt_next)}, amount=amt_next)
                        if current_section == "earnings":
                            earnings_rows.append(row)
                        elif current_section == "deductions":
                            deductions_rows.append(row)
                        i += 2
                        continue

        i += 1

    earnings_total = sum((r.amount for r in earnings_rows if r.amount is not None), Decimal("0.00"))
    deductions_total = sum((r.amount for r in deductions_rows if r.amount is not None), Decimal("0.00"))

    t_earnings = ExtractedTable(name="earnings", rows=earnings_rows, total_amount=earnings_total)
    t_deductions = ExtractedTable(name="deductions", rows=deductions_rows, total_amount=deductions_total)
    return t_earnings, t_deductions


def _extract_bank_transactions(lines: List[str]) -> ExtractedTable:
    """Extracts bank statement transaction table rows."""
    rows: List[ExtractedTableRow] = []
    in_table = False

    for line in lines:
        lower = line.lower()
        if "date" in lower and "description" in lower and "balance" in lower:
            in_table = True
            continue
        if "summary" in lower or "document reference" in lower:
            in_table = False

        if in_table:
            date_match = re.match(r"^(\d{2}[\-\/]\d{2}[\-\/]\d{4})\s+(.+)$", line)
            if date_match:
                tx_date = date_match.group(1)
                rest = date_match.group(2).strip()
                parts = rest.split()
                if len(parts) >= 2:
                    bal_str = parts[-1]
                    bal = normalize_money(bal_str)
                    desc = " ".join(parts[:-1])
                    debit = None
                    credit = None
                    if len(parts) >= 3:
                        prev_amt = normalize_money(parts[-2])
                        desc = " ".join(parts[:-2])
                        if "credit" in desc.lower() or "received" in desc.lower() or ("salary" in desc.lower()):
                            credit = prev_amt
                        else:
                            debit = prev_amt

                    row = ExtractedTableRow(
                        cells={
                            "date": tx_date,
                            "description": desc,
                            "debit": str(debit) if debit else "0.00",
                            "credit": str(credit) if credit else "0.00",
                            "balance": str(bal) if bal else "0.00",
                        },
                        amount=bal,
                    )
                    rows.append(row)

    return ExtractedTable(name="transactions", rows=rows, total_amount=None)
