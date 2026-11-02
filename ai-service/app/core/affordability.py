import math
import re
from decimal import Decimal
from typing import List, Optional, Dict, Any
from app.models.result import VerificationResult
from app.models.affordability import AffordabilityAnalysis

DEFAULT_ETH_PRICE_INR = 250000.0


def _parse_currency(val: Any) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    cleaned = re.sub(r"[₹\$\€\£RsINR,\s]", "", s)
    try:
        return float(cleaned)
    except Exception:
        return None


def calculate_emi(principal_inr: float, annual_rate_pct: float, tenure_months: int) -> float:
    """Standard reducing-balance monthly EMI calculation."""
    if tenure_months <= 0 or principal_inr <= 0:
        return 0.0
    if annual_rate_pct <= 0:
        return principal_inr / tenure_months
    r = (annual_rate_pct / 100.0) / 12.0
    n = tenure_months
    try:
        factor = math.pow(1.0 + r, n)
        return principal_inr * r * factor / (factor - 1.0)
    except Exception:
        return principal_inr / tenure_months


def calculate_max_loan_for_emi(target_emi: float, annual_rate_pct: float, tenure_months: int) -> float:
    """Calculates present value (max loan principal) for a given target EMI."""
    if target_emi <= 0 or tenure_months <= 0:
        return 0.0
    if annual_rate_pct <= 0:
        return target_emi * tenure_months
    r = (annual_rate_pct / 100.0) / 12.0
    n = tenure_months
    try:
        factor = math.pow(1.0 + r, n)
        return target_emi * (factor - 1.0) / (r * factor)
    except Exception:
        return target_emi * tenure_months


def calculate_tenure_for_emi(principal_inr: float, annual_rate_pct: float, target_emi: float) -> Optional[int]:
    """Calculates required tenure in months to achieve a target EMI."""
    if principal_inr <= 0 or target_emi <= 0:
        return None
    r = (annual_rate_pct / 100.0) / 12.0
    if target_emi <= principal_inr * r:
        # EMI does not even cover 1 month interest
        return None
    try:
        n = math.log(target_emi / (target_emi - principal_inr * r)) / math.log(1.0 + r)
        return max(1, int(math.ceil(n)))
    except Exception:
        return None


def evaluate_affordability(
    doc_results: Optional[List[VerificationResult]] = None,
    income_inr: Optional[float] = None,
    obligations_inr: Optional[float] = None,
    loan_amount_eth: Optional[float] = None,
    tenure_months: Optional[int] = None,
    interest_rate_bps: Optional[int] = None,
    eth_price_inr: float = DEFAULT_ETH_PRICE_INR,
) -> AffordabilityAnalysis:
    """
    Evaluates loan affordability using extracted document facts and proposed loan terms.
    Advisory only: Smart contract and authorized loan officer remain authoritative.
    """
    extracted_income: Optional[float] = income_inr
    extracted_obligations: Optional[float] = obligations_inr
    has_salary_slip = False
    has_bank_stmt = False
    salary_credit_reconciled = False
    notes: List[str] = []

    # 1. Extract income and obligations from document results if provided
    if doc_results:
        for r in doc_results:
            fields = r.extracted_fields or {}
            # Salary slip extraction
            if "salary_slip" in r.template_ref:
                has_salary_slip = True
                net = _parse_currency(fields.get("net_pay"))
                gross = _parse_currency(fields.get("gross_earnings"))
                deductions = _parse_currency(fields.get("total_deductions"))

                if net and net > 0:
                    if extracted_income is None:
                        extracted_income = net
                    notes.append(f"Net monthly salary of ₹{net:,.0f} verified from salary slip ({r.template_ref}).")
                elif gross and gross > 0:
                    ded = deductions or (gross * 0.1)
                    calc_net = gross - ded
                    if extracted_income is None:
                        extracted_income = calc_net
                    notes.append(f"Derived net income ₹{calc_net:,.0f} from gross salary ₹{gross:,.0f}.")

                # Existing obligations from salary slip
                if deductions and deductions > 0:
                    # In standard Indian payslips, deductions include PF, tax, and loan/advance recoveries
                    if extracted_obligations is None:
                        extracted_obligations = deductions * 0.7  # Ongoing debt/saving portion
                    notes.append(f"Deductions ₹{deductions:,.0f} noted from payslip.")

            # Bank statement extraction
            elif "bank_statement" in r.template_ref:
                has_bank_stmt = True
                total_credits = _parse_currency(fields.get("total_deposits")) or _parse_currency(fields.get("total_credits"))
                total_debits = _parse_currency(fields.get("total_withdrawals")) or _parse_currency(fields.get("total_debits"))

                # Check for salary credit reconciliation
                if extracted_income and total_credits:
                    if abs(total_credits - extracted_income) / max(1.0, extracted_income) < 0.2:
                        salary_credit_reconciled = True
                        notes.append(f"Bank deposits (₹{total_credits:,.0f}) reconcile with salary credits.")

                # If no salary slip, infer income from bank statement deposits
                if extracted_income is None and total_credits and total_credits > 0:
                    extracted_income = total_credits
                    notes.append(f"Monthly cash flow of ₹{total_credits:,.0f} verified from bank statement.")

                # Infer recurring obligations from debits if not already known
                if extracted_obligations is None and total_debits and total_debits > 0:
                    # Typical fixed recurring obligation is ~25-35% of total withdrawals
                    extracted_obligations = round(total_debits * 0.30, -2)
                    notes.append(f"Recurring monthly obligations estimated at ₹{extracted_obligations:,.0f} from bank debits.")

    # 2. Defaults if unextracted
    if extracted_income is None or extracted_income <= 0:
        extracted_income = 50000.0  # Safe demo benchmark
        notes.append("Using standard benchmark income of ₹50,000 (no payslip net pay detected).")

    if extracted_obligations is None or extracted_obligations < 0:
        # Standard conservative default: ~16% of income (e.g. ₹8,000 for ₹50,000 income)
        extracted_obligations = round(extracted_income * 0.16, -2)
        notes.append(f"Standard obligation reserve of ₹{extracted_obligations:,.0f} (16% of income) applied.")

    # 3. Safe EMI range (Banking heuristic: FOIR 40% conservative, 50% max)
    # Available EMI capacity = max(0, FOIR_ceiling * Income - Existing Obligations)
    current_dti = (extracted_obligations / extracted_income) * 100.0
    safe_emi_min = max(0.0, round(extracted_income * 0.40 - extracted_obligations, -2))
    safe_emi_max = max(0.0, round(extracted_income * 0.50 - extracted_obligations, -2))

    # Ensure min does not exceed max
    if safe_emi_min > safe_emi_max:
        safe_emi_min = safe_emi_max

    # 4. Proposed Loan calculations
    proposed_loan_inr: Optional[float] = None
    proposed_emi_inr: Optional[float] = None
    projected_dti: Optional[float] = None
    annual_rate_pct = (interest_rate_bps or 850) / 100.0
    tenure_m = tenure_months or 24

    if loan_amount_eth is not None and loan_amount_eth > 0:
        proposed_loan_inr = loan_amount_eth * eth_price_inr
        proposed_emi_inr = round(calculate_emi(proposed_loan_inr, annual_rate_pct, tenure_m), 2)
        total_post_obligations = extracted_obligations + proposed_emi_inr
        projected_dti = round((total_post_obligations / extracted_income) * 100.0, 1)

    # 5. Determine Affordability Verdict & Counter-Offer Suggestions
    suggested_loan_eth: Optional[float] = None
    suggested_loan_inr: Optional[float] = None
    suggested_tenure_m: Optional[int] = None

    if proposed_emi_inr is not None:
        if proposed_emi_inr <= safe_emi_max and projected_dti <= 50.0:
            is_affordable = True
            if projected_dti <= 38.0:
                verdict = "Affordable"
                notes.append(f"Proposed monthly EMI (₹{proposed_emi_inr:,.0f}) is comfortably below the ₹{safe_emi_max:,.0f} ceiling.")
            else:
                verdict = "Moderate"
                notes.append(f"Proposed monthly EMI (₹{proposed_emi_inr:,.0f}) is within acceptable range but near conservative limits.")
        else:
            is_affordable = False
            if projected_dti <= 65.0:
                verdict = "High DTI / Stretched"
                notes.append(f"Proposed EMI of ₹{proposed_emi_inr:,.0f} pushes total debt burden to {projected_dti:.1f}% (above 50% FOIR limit).")
            else:
                verdict = "Unaffordable"
                notes.append(f"Projected Debt-To-Income of {projected_dti:.1f}% exceeds safe lending threshold.")

            # Calculate Suggested Counter-Offer Adjustments
            if safe_emi_max > 0 and proposed_loan_inr:
                # 1) Suggested reduced loan amount at same tenure
                max_loan = calculate_max_loan_for_emi(safe_emi_max, annual_rate_pct, tenure_m)
                suggested_loan_inr = round(max_loan, -2)
                suggested_loan_eth = round(suggested_loan_inr / eth_price_inr, 4)

                # 2) Suggested extended tenure at current principal
                ext_tenure = calculate_tenure_for_emi(proposed_loan_inr, annual_rate_pct, safe_emi_max)
                if ext_tenure and ext_tenure <= 84:
                    suggested_tenure_m = ext_tenure
                    notes.append(f"Advisory: Extending tenure to {ext_tenure} months would lower EMI to ₹{safe_emi_max:,.0f}.")
                if suggested_loan_eth:
                    notes.append(f"Advisory: Reducing loan principal to {suggested_loan_eth} ETH fits within safe repayment capacity.")
    else:
        # No loan parameters supplied -> General repayment capacity verdict
        is_affordable = safe_emi_max > 0
        verdict = "Affordable" if safe_emi_max > 0 else "High Existing Debt"

    # 6. Affordability Confidence
    if has_salary_slip and has_bank_stmt and salary_credit_reconciled:
        confidence = "High"
        confidence_score = 0.95
    elif has_salary_slip or has_bank_stmt:
        confidence = "Medium"
        confidence_score = 0.75
    else:
        confidence = "Low"
        confidence_score = 0.50

    # 7. Format output summary matching user specification
    summary = (
        f"Verified monthly income: ₹{extracted_income:,.0f}. "
        f"Existing obligations: ₹{extracted_obligations:,.0f}. "
        f"Recommended EMI ceiling: ₹{safe_emi_min:,.0f}–₹{safe_emi_max:,.0f}. "
        f"Result: {verdict} with {confidence.lower()} confidence."
    )

    return AffordabilityAnalysis(
        monthly_income=round(extracted_income, 2),
        existing_obligations=round(extracted_obligations, 2),
        current_dti_pct=round(current_dti, 1),
        safe_emi_min=safe_emi_min,
        safe_emi_max=safe_emi_max,
        proposed_loan_amount_eth=loan_amount_eth,
        proposed_loan_amount_inr=proposed_loan_inr,
        proposed_tenure_months=tenure_m if loan_amount_eth else None,
        proposed_interest_rate_pct=annual_rate_pct if loan_amount_eth else None,
        proposed_emi_inr=proposed_emi_inr,
        projected_dti_pct=projected_dti,
        suggested_loan_amount_eth=suggested_loan_eth,
        suggested_loan_amount_inr=suggested_loan_inr,
        suggested_tenure_months=suggested_tenure_m,
        affordability_verdict=verdict,
        is_affordable=is_affordable,
        confidence=confidence,
        confidence_score=confidence_score,
        summary=summary,
        advisory_notes=notes,
        is_advisory=True,
    )
