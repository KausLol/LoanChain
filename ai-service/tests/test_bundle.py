from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.core.chain import compute_keccak256

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DUMMY_DIR = REPO_ROOT / "dummy"

client = TestClient(app)


def test_authentic_bundle_1_verified():
    """Bundle 1: aadhaar_test, salary1234, statement123 (Aarav Mehta)."""
    id_bytes = (DUMMY_DIR / "aadhaar_test.pdf").read_bytes()
    sal_bytes = (DUMMY_DIR / "salary1234.pdf").read_bytes()
    stmt_bytes = (DUMMY_DIR / "statement123.pdf").read_bytes()

    h_id = compute_keccak256(id_bytes)
    h_sal = compute_keccak256(sal_bytes)
    h_stmt = compute_keccak256(stmt_bytes)

    response = client.post(
        "/v1/verify/bundle",
        files=[
            ("files", ("aadhaar_test.pdf", id_bytes, "application/pdf")),
            ("files", ("salary1234.pdf", sal_bytes, "application/pdf")),
            ("files", ("statement123.pdf", stmt_bytes, "application/pdf")),
        ],
        data={
            "docIds": f"{h_id},{h_sal},{h_stmt}",
            "docTypes": "2,0,1",  # 2 = AadhaarCard, 0 = SalarySlip, 1 = BankStatement
            "loanId": 101,
            "loanAmount": 0.5,
            "tenure": 24,
            "interestRate": 850,
            "skip_chain_check": True,
        },
    )
    assert response.status_code == 200, response.text
    bundle = response.json()
    assert bundle["verdict"] == 0  # Approved
    assert bundle["verdict_label"] == "Approved"
    assert bundle["suggested_action"] == "MarkDocsVerified"
    assert len(bundle["doc_results"]) == 3
    assert bundle.get("affordability") is not None
    assert bundle["affordability"]["is_affordable"] is True
    assert "Verified monthly income" in bundle["affordability"]["summary"]

    # Check cross-document rules passed
    passed_rules = {c["rule_id"] for c in bundle["bundle_checks"] if c["passed"]}
    assert "BUNDLE_NAME_MATCH_ID_SLIP" in passed_rules
    assert "BUNDLE_NAME_MATCH_ID_STATEMENT" in passed_rules
    assert "BUNDLE_SALARY_CREDIT_MATCH" in passed_rules


def test_authentic_bundle_2_verified():
    """Bundle 2: pan_test, salary1234, statement123 (Aarav Mehta)."""
    id_bytes = (DUMMY_DIR / "pan_test.pdf").read_bytes()
    sal_bytes = (DUMMY_DIR / "salary1234.pdf").read_bytes()
    stmt_bytes = (DUMMY_DIR / "statement123.pdf").read_bytes()

    h_id = compute_keccak256(id_bytes)
    h_sal = compute_keccak256(sal_bytes)
    h_stmt = compute_keccak256(stmt_bytes)

    response = client.post(
        "/v1/verify/bundle",
        files=[
            ("files", ("pan_test.pdf", id_bytes, "application/pdf")),
            ("files", ("salary1234.pdf", sal_bytes, "application/pdf")),
            ("files", ("statement123.pdf", stmt_bytes, "application/pdf")),
        ],
        data={
            "docIds": f"{h_id},{h_sal},{h_stmt}",
            "docTypes": "3,0,1",  # 3 = PANCard, 0 = SalarySlip, 1 = BankStatement
            "loanId": 102,
            "skip_chain_check": True,
        },
    )
    assert response.status_code == 200, response.text
    bundle = response.json()
    assert bundle["verdict"] == 0
    assert bundle.get("affordability") is not None
    assert bundle["verdict"] == 0  # Approved
    assert bundle["suggested_action"] == "MarkDocsVerified"


def test_mismatched_bundle_rejected():
    """Mismatched Bundle: Aarav Mehta salary slip with Priya Sharma bank statement."""
    sal_bytes = (DUMMY_DIR / "salary1234.pdf").read_bytes()   # Aarav Mehta
    stmt_bytes = (DUMMY_DIR / "statement456.pdf").read_bytes() # Priya Sharma

    h_sal = compute_keccak256(sal_bytes)
    h_stmt = compute_keccak256(stmt_bytes)

    response = client.post(
        "/v1/verify/bundle",
        files=[
            ("files", ("salary1234.pdf", sal_bytes, "application/pdf")),
            ("files", ("statement456.pdf", stmt_bytes, "application/pdf")),
        ],
        data={
            "docIds": f"{h_sal},{h_stmt}",
            "docTypes": "0,1",
            "loanId": 103,
            "skip_chain_check": True,
        },
    )
    assert response.status_code == 200, response.text
    bundle = response.json()
    assert bundle["verdict"] == 2  # Rejected
    assert bundle["suggested_action"] == "RequestMoreDocs"

    failed_reasons = bundle["action_reasons"]
    # Check that name mismatch or salary credit mismatch is noted
    assert any("NAME_MISMATCH" in r or "Name" in r or "SALARY_CREDIT_MISMATCH" in r for r in failed_reasons)
