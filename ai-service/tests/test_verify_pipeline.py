from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.core.chain import compute_keccak256

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DUMMY_DIR = REPO_ROOT / "dummy"

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["templates_loaded"] >= 6


def test_verify_salary1234_authentic():
    pdf_path = DUMMY_DIR / "salary1234.pdf"
    assert pdf_path.exists()
    file_bytes = pdf_path.read_bytes()
    doc_hash = compute_keccak256(file_bytes)

    response = client.post(
        "/v1/verify/document",
        files={"file": ("salary1234.pdf", file_bytes, "application/pdf")},
        data={"docId": doc_hash, "docType": 0, "skip_chain_check": True},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["verdict"] == 0  # Approved
    assert result["verdict_label"] == "Approved"
    assert result["confidence_bps"] >= 8000
    assert "ARITH_GROSS_MISMATCH" not in result["reason_codes"]
    assert "ARITH_NET_MISMATCH" not in result["reason_codes"]
    assert result["extracted_fields"]["employee_name"] == "AARAV MEHTA"
    assert result["extracted_fields"]["gross_earnings"] == "₹40,000.00"
    assert result["extracted_fields"]["total_deductions"] == "₹2,000.00"
    assert result["extracted_fields"]["net_pay"] == "₹38,000.00"


def test_verify_salary5678_authentic():
    pdf_path = DUMMY_DIR / "salary5678.pdf"
    assert pdf_path.exists()
    file_bytes = pdf_path.read_bytes()
    doc_hash = compute_keccak256(file_bytes)

    response = client.post(
        "/v1/verify/document",
        files={"file": ("salary5678.pdf", file_bytes, "application/pdf")},
        data={"docId": doc_hash, "docType": 0, "skip_chain_check": True},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["verdict"] == 0  # Approved
    assert result["verdict_label"] == "Approved"
    assert result["extracted_fields"]["employee_name"] == "PRIYA SHARMA"
    assert result["extracted_fields"]["gross_earnings"] == "₹50,000.00"
    assert result["extracted_fields"]["total_deductions"] == "₹3,000.00"
    assert result["extracted_fields"]["net_pay"] == "₹47,000.00"


def test_verify_statement123_authentic():
    pdf_path = DUMMY_DIR / "statement123.pdf"
    assert pdf_path.exists()
    file_bytes = pdf_path.read_bytes()
    doc_hash = compute_keccak256(file_bytes)

    response = client.post(
        "/v1/verify/document",
        files={"file": ("statement123.pdf", file_bytes, "application/pdf")},
        data={"docId": doc_hash, "docType": 1, "skip_chain_check": True},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["verdict"] == 0  # Approved
    assert result["verdict_label"] == "Approved"
    assert "ARITH_STATEMENT_TOTALS_MISMATCH" not in result["reason_codes"]
    assert result["extracted_fields"]["account_holder"] == "AARAV MEHTA"
    assert result["extracted_fields"]["opening_balance"] == "₹25,000.00"
    assert result["extracted_fields"]["closing_balance"] == "₹63,300.00"


def test_verify_statement456_authentic():
    pdf_path = DUMMY_DIR / "statement456.pdf"
    assert pdf_path.exists()
    file_bytes = pdf_path.read_bytes()
    doc_hash = compute_keccak256(file_bytes)

    response = client.post(
        "/v1/verify/document",
        files={"file": ("statement456.pdf", file_bytes, "application/pdf")},
        data={"docId": doc_hash, "docType": 1, "skip_chain_check": True},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["verdict"] == 0  # Approved
    assert result["extracted_fields"]["account_holder"] == "PRIYA SHARMA"
    assert result["extracted_fields"]["opening_balance"] == "₹18,000.00"
    assert result["extracted_fields"]["closing_balance"] == "₹45,900.00"


def test_verify_id123_authentic():
    pdf_path = DUMMY_DIR / "id123.pdf"
    assert pdf_path.exists()
    file_bytes = pdf_path.read_bytes()
    doc_hash = compute_keccak256(file_bytes)

    response = client.post(
        "/v1/verify/document",
        files={"file": ("id123.pdf", file_bytes, "application/pdf")},
        data={"docId": doc_hash, "docType": 2, "skip_chain_check": True},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["verdict"] == 0  # Approved
    assert result["extracted_fields"]["full_name"] == "AARAV MEHTA"
    assert result["extracted_fields"]["employee_id"] == "EMP-DEMO-001"


def test_verify_id456_authentic():
    pdf_path = DUMMY_DIR / "id456.pdf"
    assert pdf_path.exists()
    file_bytes = pdf_path.read_bytes()
    doc_hash = compute_keccak256(file_bytes)

    response = client.post(
        "/v1/verify/document",
        files={"file": ("id456.pdf", file_bytes, "application/pdf")},
        data={"docId": doc_hash, "docType": 2, "skip_chain_check": True},
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["verdict"] == 0  # Approved
    assert result["extracted_fields"]["full_name"] == "PRIYA SHARMA"
    assert result["extracted_fields"]["employee_id"] == "EMP-DEMO-002"


def test_doctype_mismatch_fails():
    pdf_path = DUMMY_DIR / "statement123.pdf"
    file_bytes = pdf_path.read_bytes()
    doc_hash = compute_keccak256(file_bytes)

    response = client.post(
        "/v1/verify/document",
        files={"file": ("statement123.pdf", file_bytes, "application/pdf")},
        data={"docId": doc_hash, "docType": 0, "skip_chain_check": True},  # Claiming SalarySlip
    )
    assert response.status_code == 400
    err = response.json()["error"]
    assert err["code"] == "DOCTYPE_MISMATCH"
