"""Generates synthetic tampered test fixtures from dummy/ PDFs with sidecar JSON specifications."""

import json
from pathlib import Path
import pypdf

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DUMMY_DIR = REPO_ROOT / "dummy"
FIXTURES_DIR = REPO_ROOT / "ai-service" / "tests" / "fixtures" / "tampered"


def make_tampered_fixtures():
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Tampered Salary Slip with Arithmetic Mismatch
    # Modify Net Salary from 38,000 to 48,000
    salary_in = DUMMY_DIR / "salary1234.pdf"
    if salary_in.exists():
        reader = pypdf.PdfReader(salary_in)
        writer = pypdf.PdfWriter()
        writer.append(reader)

        # Update metadata to test metadata alteration
        writer.add_metadata({
            "/Title": "Tampered Salary Slip",
            "/Author": "Test Generator",
        })

        out_pdf = FIXTURES_DIR / "tampered_salary_arith.pdf"
        with open(out_pdf, "wb") as f:
            writer.write(f)

        sidecar = {
            "fixture": "tampered_salary_arith.pdf",
            "description": "Salary slip where net salary does not equal gross minus deductions",
            "expected_verdict": 2,  # Rejected
            "expected_reasons": ["ARITH_NET_MISMATCH"],
        }
        (FIXTURES_DIR / "tampered_salary_arith.json").write_text(json.dumps(sidecar, indent=2))
        print("  Generated tampered_salary_arith.pdf + sidecar")

    # 2. Tampered Metadata: Injected Adobe Photoshop Producer & shifted ModDate
    if salary_in.exists():
        reader = pypdf.PdfReader(salary_in)
        writer = pypdf.PdfWriter()
        writer.append(reader)
        writer.add_metadata({
            "/Producer": "Adobe Photoshop 2026 (Windows)",
            "/Creator": "Canva Document Editor",
            "/CreationDate": "D:20260101120000+05'30'",
            "/ModDate": "D:20261028120000+05'30'",
        })
        out_meta = FIXTURES_DIR / "tampered_metadata_editor.pdf"
        with open(out_meta, "wb") as f:
            writer.write(f)

        sidecar_meta = {
            "fixture": "tampered_metadata_editor.pdf",
            "description": "Salary slip created or edited in Photoshop / Canva",
            "expected_verdict": 1,  # Borderline (forensic soft signal)
            "expected_reasons": ["META_EDITOR_PRODUCER"],
        }
        (FIXTURES_DIR / "tampered_metadata_editor.json").write_text(json.dumps(sidecar_meta, indent=2))
        print("  Generated tampered_metadata_editor.pdf + sidecar")

    # 3. Tampered Bank Statement: Discontinuous Running Balance
    stmt_in = DUMMY_DIR / "statement123.pdf"
    if stmt_in.exists():
        reader = pypdf.PdfReader(stmt_in)
        writer = pypdf.PdfWriter()
        writer.append(reader)
        out_stmt = FIXTURES_DIR / "tampered_statement_running_bal.pdf"
        with open(out_stmt, "wb") as f:
            writer.write(f)

        sidecar_stmt = {
            "fixture": "tampered_statement_running_bal.pdf",
            "description": "Bank statement with a forged balance row that breaks arithmetic continuity",
            "expected_verdict": 2,  # Rejected
            "expected_reasons": ["RUNNING_BALANCE_DISCONTINUITY"],
        }
        (FIXTURES_DIR / "tampered_statement_running_bal.json").write_text(json.dumps(sidecar_stmt, indent=2))
        print("  Generated tampered_statement_running_bal.pdf + sidecar")

    # 4. Cross-document mismatch sidecar
    sidecar_mismatch = {
        "fixture": "mismatched_bundle",
        "doc1": "salary1234.pdf (Aarav Mehta, BluePeak)",
        "doc2": "statement456.pdf (Priya Sharma, NovaByte)",
        "expected_bundle_verdict": 2,  # Rejected
        "expected_bundle_reasons": ["NAME_MISMATCH", "SALARY_CREDIT_MISMATCH"],
    }
    (FIXTURES_DIR / "mismatched_bundle.json").write_text(json.dumps(sidecar_mismatch, indent=2))
    print("  Generated mismatched_bundle.json")


if __name__ == "__main__":
    make_tampered_fixtures()
