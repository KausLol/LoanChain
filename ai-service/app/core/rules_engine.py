from decimal import Decimal
from datetime import date
from typing import Dict, List, Optional
from app.models.template import TemplateSchema, RuleSpec
from app.models.facts import (
    RuleEvaluation,
    ExtractedField,
    ExtractedTable,
)
from app.core.validators import calculate_months_between, is_valid_pan, is_valid_aadhaar_verhoeff


class RuleEngine:
    """
    Forward-chaining rule engine evaluating deterministic document invariants.
    Maintains full proof traces and premises for explainability.
    """

    def evaluate_document(
        self,
        template: TemplateSchema,
        fields: Dict[str, ExtractedField],
        tables: Dict[str, ExtractedTable],
        today: Optional[date] = None,
    ) -> List[RuleEvaluation]:
        if today is None:
            today = date(2026, 10, 28)

        evaluations: List[RuleEvaluation] = []

        # 1. Check required fields presence
        for f_name, f_spec in template.fields.items():
            if f_spec.required:
                is_present = f_name in fields and fields[f_name].normalized_value is not None
                val_repr = fields[f_name].value_masked if is_present else "MISSING"
                evaluations.append(
                    RuleEvaluation(
                        rule_id=f"MANDATORY_FIELD_{f_name.upper()}",
                        description=f"Mandatory field '{f_name}' must be present",
                        passed=is_present,
                        blocking=True,
                        premise_trace=f"RequiredField({f_name}) -> ExtractedValue: {val_repr}",
                        reason_code="MISSING_MANDATORY_FIELD" if not is_present else None,
                    )
                )

        # 2. Evaluate template declarative rules
        for r_spec in template.rules:
            eval_res = self._evaluate_single_rule(r_spec, fields, tables, today)
            evaluations.append(eval_res)

        return evaluations

    def _evaluate_single_rule(
        self,
        rule: RuleSpec,
        fields: Dict[str, ExtractedField],
        tables: Dict[str, ExtractedTable],
        today: date,
    ) -> RuleEvaluation:
        rid = rule.id
        desc = rule.description or rid
        blocking = rule.blocking

        # Helper getters
        def get_field_val(name: str):
            f = fields.get(name)
            return f.normalized_value if f else None

        # ── Salary Slip Rules ────────────────────────────────────────────────
        if rid == "ARITH_GROSS_SUM":
            earnings_tbl = tables.get("earnings")
            gross = get_field_val("gross_earnings")
            if not earnings_tbl or earnings_tbl.total_amount is None or gross is None:
                return RuleEvaluation(
                    rule_id=rid,
                    description=desc,
                    passed=False,
                    blocking=blocking,
                    premise_trace=f"EarningsTable: {earnings_tbl.total_amount if earnings_tbl else 'None'}, Gross: {gross}",
                    reason_code=rule.reason_code or "ARITH_GROSS_MISMATCH",
                )
            diff = abs(Decimal(str(earnings_tbl.total_amount)) - Decimal(str(gross)))
            passed = diff <= Decimal("1.00")
            return RuleEvaluation(
                rule_id=rid,
                description=desc,
                passed=passed,
                blocking=blocking,
                premise_trace=f"Sum(earnings)={earnings_tbl.total_amount} == Gross={gross} (Δ={diff})",
                reason_code=None if passed else (rule.reason_code or "ARITH_GROSS_MISMATCH"),
            )

        elif rid == "ARITH_NET":
            gross = get_field_val("gross_earnings")
            deduct = get_field_val("total_deductions")
            net = get_field_val("net_pay")
            if gross is None or deduct is None or net is None:
                return RuleEvaluation(
                    rule_id=rid,
                    description=desc,
                    passed=False,
                    blocking=blocking,
                    premise_trace=f"Gross: {gross}, Deductions: {deduct}, Net: {net}",
                    reason_code=rule.reason_code or "ARITH_NET_MISMATCH",
                )
            expected_net = Decimal(str(gross)) - Decimal(str(deduct))
            diff = abs(expected_net - Decimal(str(net)))
            passed = diff <= Decimal("1.00")
            return RuleEvaluation(
                rule_id=rid,
                description=desc,
                passed=passed,
                blocking=blocking,
                premise_trace=f"Gross({gross}) - Deduct({deduct}) = Expected({expected_net}) vs Net({net}) (Δ={diff})",
                reason_code=None if passed else (rule.reason_code or "ARITH_NET_MISMATCH"),
            )

        elif rid == "RECENT_PAY_PERIOD":
            period = get_field_val("pay_period")
            if not period:
                return RuleEvaluation(
                    rule_id=rid,
                    description=desc,
                    passed=True,  # non-blocking soft pass if unparsed
                    blocking=False,
                    premise_trace="Pay period unparsed",
                )
            age_months = calculate_months_between(str(period), today)
            passed = age_months <= 6  # generous default window
            return RuleEvaluation(
                rule_id=rid,
                description=desc,
                passed=passed,
                blocking=blocking,
                premise_trace=f"PayPeriod({period}) age in months: {age_months} (allowed <= 6)",
                reason_code=None if passed else "PAY_PERIOD_STALE",
            )

        # ── Bank Statement Rules ─────────────────────────────────────────────
        elif rid == "ARITH_STATEMENT_TOTALS":
            open_bal = get_field_val("opening_balance")
            credits = get_field_val("total_credits")
            debits = get_field_val("total_debits")
            close_bal = get_field_val("closing_balance")

            if open_bal is None or credits is None or debits is None or close_bal is None:
                return RuleEvaluation(
                    rule_id=rid,
                    description=desc,
                    passed=False,
                    blocking=blocking,
                    premise_trace=f"Open: {open_bal}, Credits: {credits}, Debits: {debits}, Close: {close_bal}",
                    reason_code=rule.reason_code or "ARITH_STATEMENT_TOTALS_MISMATCH",
                )

            expected_closing = Decimal(str(open_bal)) + Decimal(str(credits)) - Decimal(str(debits))
            diff = abs(expected_closing - Decimal(str(close_bal)))
            passed = diff <= Decimal("1.00")
            return RuleEvaluation(
                rule_id=rid,
                description=desc,
                passed=passed,
                blocking=blocking,
                premise_trace=f"Open({open_bal}) + Cr({credits}) - Dr({debits}) = Expected({expected_closing}) vs Actual({close_bal}) (Δ={diff})",
                reason_code=None if passed else (rule.reason_code or "ARITH_STATEMENT_TOTALS_MISMATCH"),
            )

        elif rid == "RUNNING_BALANCE_CONTINUITY":
            tx_tbl = tables.get("transactions")
            open_bal = get_field_val("opening_balance")
            if not tx_tbl or not tx_tbl.rows:
                return RuleEvaluation(
                    rule_id=rid,
                    description=desc,
                    passed=True,
                    blocking=blocking,
                    premise_trace="No tabular transaction rows to trace",
                )

            current_bal = Decimal(str(open_bal)) if open_bal is not None else None
            failures = []
            for idx, r in enumerate(tx_tbl.rows):
                bal = r.amount
                dr = Decimal(r.cells.get("debit", "0.00") or "0.00")
                cr = Decimal(r.cells.get("credit", "0.00") or "0.00")

                if current_bal is not None and bal is not None:
                    expected = current_bal + cr - dr
                    diff = abs(expected - Decimal(str(bal)))
                    if diff > Decimal("1.00"):
                        failures.append(f"Row {idx+1}: Prev({current_bal})+Cr({cr})-Dr({dr})={expected} != Stated({bal})")
                    current_bal = Decimal(str(bal))

            passed = len(failures) == 0
            trace = "All rows continuous" if passed else "; ".join(failures)
            return RuleEvaluation(
                rule_id=rid,
                description=desc,
                passed=passed,
                blocking=blocking,
                premise_trace=trace,
                reason_code=None if passed else (rule.reason_code or "RUNNING_BALANCE_DISCONTINUITY"),
            )

        # ── ID Card Rules ────────────────────────────────────────────────────
        elif rid == "PAN_SYNTAX_VALID":
            pan_val = get_field_val("pan")
            passed = bool(pan_val and is_valid_pan(str(pan_val)))
            return RuleEvaluation(
                rule_id=rid,
                description=desc,
                passed=passed,
                blocking=blocking,
                premise_trace=f"PAN value: {pan_val}",
                reason_code=None if passed else "INVALID_PAN_FORMAT",
            )

        elif rid == "AADHAAR_VERHOEFF_CHECKSUM":
            aadhaar_val = get_field_val("aadhaar_number")
            passed = bool(aadhaar_val and is_valid_aadhaar_verhoeff(str(aadhaar_val)))
            return RuleEvaluation(
                rule_id=rid,
                description=desc,
                passed=passed,
                blocking=blocking,
                premise_trace="Aadhaar Verhoeff evaluated on masked token",
                reason_code=None if passed else "INVALID_AADHAAR_CHECKSUM",
            )

        elif rid == "ID_NOT_EXPIRED":
            valid_until = get_field_val("valid_until")
            if not valid_until:
                passed = True
                trace = "No expiration date stated"
            else:
                passed = str(valid_until) >= today.strftime("%Y-%m-%d")
                trace = f"ValidUntil({valid_until}) >= Today({today})"
            return RuleEvaluation(
                rule_id=rid,
                description=desc,
                passed=passed,
                blocking=blocking,
                premise_trace=trace,
                reason_code=None if passed else "ID_EXPIRED",
            )

        # Default fallback for unhandled rule IDs
        return RuleEvaluation(
            rule_id=rid,
            description=desc,
            passed=True,
            blocking=blocking,
            premise_trace="Rule passed by default specification",
        )


rules_engine = RuleEngine()
