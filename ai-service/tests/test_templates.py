from pathlib import Path
from tools.template_lint import lint_templates
from app.core.classify import template_registry


def test_all_templates_schema_valid():
    tpl_dir = Path(__file__).resolve().parent.parent / "templates"
    assert lint_templates(tpl_dir) is True


def test_template_registry_loaded():
    templates = template_registry.list_templates()
    assert len(templates) >= 6
    doc_types = {t.docType for t in templates}
    assert "SalarySlip" in doc_types
    assert "BankStatement" in doc_types
    assert "IDCard" in doc_types
    assert "ITReturn" in doc_types
    assert "AddressProof" in doc_types
    assert "Other" in doc_types


def test_template_classification_salary():
    sample_salary_text = """
    SAMPLE SALARY SLIP
    Company Name: BluePeak Technologies Pvt. Ltd.
    Employee Name: Aarav Mehta
    Gross Earnings: 40,000
    Total Deductions: 2,000
    Net Salary Payable: 38,000
    """
    tpl, score, is_conforming = template_registry.select_template("SalarySlip", sample_salary_text)
    assert is_conforming is True
    assert tpl is not None
    assert tpl.id == "salary_slip.default"


def test_template_classification_bank():
    sample_bank_text = """
    SAMPLE BANK STATEMENT
    Demo National Bank
    Account Holder: Aarav Mehta
    Opening Balance: 25,000
    Closing Balance: 63,300
    Total Credits: 46,000
    Total Debits: 7,700
    """
    tpl, score, is_conforming = template_registry.select_template("BankStatement", sample_bank_text)
    assert is_conforming is True
    assert tpl is not None
    assert tpl.id == "bank_statement.default"
