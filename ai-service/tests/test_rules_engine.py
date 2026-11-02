from decimal import Decimal
from datetime import date
from app.models.template import TemplateSchema, FieldSpec, RuleSpec
from app.models.facts import ExtractedField, ExtractedTable, ExtractedTableRow
from app.core.rules_engine import rules_engine


def test_salary_slip_arithmetic_rules_pass():
    # Setup template rules
    template = TemplateSchema(
        id="salary_slip.test",
        version="1.0.0",
        docType="SalarySlip",
        fields={
            "gross_earnings": FieldSpec(type="money", required=True),
            "total_deductions": FieldSpec(type="money", required=True),
            "net_pay": FieldSpec(type="money", required=True),
        },
        rules=[
            RuleSpec(
                id="ARITH_GROSS_SUM",
                blocking=True,
                expr="sum(tables.earnings) == fields.gross_earnings",
                reason_code="ARITH_GROSS_MISMATCH",
            ),
            RuleSpec(
                id="ARITH_NET",
                blocking=True,
                expr="fields.gross_earnings - fields.total_deductions == fields.net_pay",
                reason_code="ARITH_NET_MISMATCH",
            ),
        ],
    )

    fields = {
        "gross_earnings": ExtractedField(
            name="gross_earnings", raw_value="40,000", value_masked="₹40,000.00", normalized_value=Decimal("40000.00")
        ),
        "total_deductions": ExtractedField(
            name="total_deductions", raw_value="2,000", value_masked="₹2,000.00", normalized_value=Decimal("2000.00")
        ),
        "net_pay": ExtractedField(
            name="net_pay", raw_value="38,000", value_masked="₹38,000.00", normalized_value=Decimal("38000.00")
        ),
    }

    tables = {
        "earnings": ExtractedTable(
            name="earnings",
            rows=[
                ExtractedTableRow(cells={"comp": "Basic"}, amount=Decimal("25000.00")),
                ExtractedTableRow(cells={"comp": "HRA"}, amount=Decimal("15000.00")),
            ],
            total_amount=Decimal("40000.00"),
        )
    }

    evaluations = rules_engine.evaluate_document(template, fields, tables, today=date(2026, 10, 28))
    # All rules should pass
    for ev in evaluations:
        assert ev.passed is True, f"Rule {ev.rule_id} failed: {ev.premise_trace}"


def test_salary_slip_arithmetic_net_mismatch():
    template = TemplateSchema(
        id="salary_slip.test",
        version="1.0.0",
        docType="SalarySlip",
        fields={
            "gross_earnings": FieldSpec(type="money", required=True),
            "total_deductions": FieldSpec(type="money", required=True),
            "net_pay": FieldSpec(type="money", required=True),
        },
        rules=[
            RuleSpec(
                id="ARITH_NET",
                blocking=True,
                expr="fields.gross_earnings - fields.total_deductions == fields.net_pay",
                reason_code="ARITH_NET_MISMATCH",
            ),
        ],
    )

    # Forged Net Pay (48,000 instead of 38,000)
    fields = {
        "gross_earnings": ExtractedField(
            name="gross_earnings", raw_value="40,000", value_masked="₹40,000.00", normalized_value=Decimal("40000.00")
        ),
        "total_deductions": ExtractedField(
            name="total_deductions", raw_value="2,000", value_masked="₹2,000.00", normalized_value=Decimal("2000.00")
        ),
        "net_pay": ExtractedField(
            name="net_pay", raw_value="48,000", value_masked="₹48,000.00", normalized_value=Decimal("48000.00")
        ),
    }

    evaluations = rules_engine.evaluate_document(template, fields, {}, today=date(2026, 10, 28))
    failed = [e for e in evaluations if not e.passed]
    assert len(failed) == 1
    assert failed[0].rule_id == "ARITH_NET"
    assert failed[0].reason_code == "ARITH_NET_MISMATCH"
    assert "Expected(38000.00)" in failed[0].premise_trace


def test_bank_statement_running_balance_continuity():
    template = TemplateSchema(
        id="bank_statement.test",
        version="1.0.0",
        docType="BankStatement",
        fields={
            "opening_balance": FieldSpec(type="money", required=True),
            "closing_balance": FieldSpec(type="money", required=True),
            "total_credits": FieldSpec(type="money", required=True),
            "total_debits": FieldSpec(type="money", required=True),
        },
        rules=[
            RuleSpec(
                id="RUNNING_BALANCE_CONTINUITY",
                blocking=True,
                expr="verify_running_balances(tables.transactions, fields.opening_balance)",
                reason_code="RUNNING_BALANCE_DISCONTINUITY",
            ),
        ],
    )

    fields = {
        "opening_balance": ExtractedField(
            name="opening_balance", raw_value="25,000", value_masked="₹25,000.00", normalized_value=Decimal("25000.00")
        ),
        "closing_balance": ExtractedField(
            name="closing_balance", raw_value="29,500", value_masked="₹29,500.00", normalized_value=Decimal("29500.00")
        ),
        "total_credits": ExtractedField(
            name="total_credits", raw_value="8,000", value_masked="₹8,000.00", normalized_value=Decimal("8000.00")
        ),
        "total_debits": ExtractedField(
            name="total_debits", raw_value="3,500", value_masked="₹3,500.00", normalized_value=Decimal("3500.00")
        ),
    }

    # Consistent rows:
    # Open: 25,000
    # Row 1: Debit 2,000 -> Bal 23,000
    # Row 2: Credit 8,000 -> Bal 31,000
    # Row 3: Debit 1,500 -> Bal 29,500
    consistent_rows = [
        ExtractedTableRow(cells={"debit": "2000.00", "credit": "0.00"}, amount=Decimal("23000.00")),
        ExtractedTableRow(cells={"debit": "0.00", "credit": "8000.00"}, amount=Decimal("31000.00")),
        ExtractedTableRow(cells={"debit": "1500.00", "credit": "0.00"}, amount=Decimal("29500.00")),
    ]
    tables = {"transactions": ExtractedTable(name="transactions", rows=consistent_rows)}

    evals = rules_engine.evaluate_document(template, fields, tables)
    assert all(e.passed for e in evals)

    # Inconsistent row (Row 2 forged to 35,000)
    inconsistent_rows = [
        ExtractedTableRow(cells={"debit": "2000.00", "credit": "0.00"}, amount=Decimal("23000.00")),
        ExtractedTableRow(cells={"debit": "0.00", "credit": "8000.00"}, amount=Decimal("35000.00")),  # Forged!
        ExtractedTableRow(cells={"debit": "1500.00", "credit": "0.00"}, amount=Decimal("29500.00")),
    ]
    tables_inconsistent = {"transactions": ExtractedTable(name="transactions", rows=inconsistent_rows)}
    evals_inconsistent = rules_engine.evaluate_document(template, fields, tables_inconsistent)
    failed = [e for e in evals_inconsistent if not e.passed]
    assert len(failed) == 1
    assert failed[0].rule_id == "RUNNING_BALANCE_CONTINUITY"
    assert failed[0].reason_code == "RUNNING_BALANCE_DISCONTINUITY"
