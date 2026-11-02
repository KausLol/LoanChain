import pytest
from pathlib import Path
from app.core.intake import validate_file_bytes, IntakeValidationError

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DUMMY_DIR = REPO_ROOT / "dummy"


def test_magic_bytes_detection():
    # Real PDF from dummy
    real_pdf = DUMMY_DIR / "salary1234.pdf"
    assert real_pdf.exists()
    ft, pages = validate_file_bytes(real_pdf.read_bytes())
    assert ft == "pdf"
    assert pages == 1

    # Unsupported format (plain text)
    with pytest.raises(IntakeValidationError) as exc:
        validate_file_bytes(b"HELLO WORLD PLAIN TEXT")
    assert exc.value.code == "UNSUPPORTED_FORMAT"


def test_hostile_pdf_payload_rejected():
    hostile_pdf = b"%PDF-1.7\n/Launch (calc.exe)\ntrailer\n%%EOF"
    with pytest.raises(IntakeValidationError) as exc:
        validate_file_bytes(hostile_pdf)
    assert exc.value.code == "HOSTILE_PDF_ELEMENT"

    js_pdf = b"%PDF-1.7\n/JavaScript (alert(1))\ntrailer\n%%EOF"
    with pytest.raises(IntakeValidationError) as exc:
        validate_file_bytes(js_pdf)
    assert exc.value.code == "HOSTILE_PDF_ELEMENT"


def test_file_size_limits():
    oversized = b"%PDF-" + b"0" * (11 * 1024 * 1024)
    with pytest.raises(IntakeValidationError) as exc:
        validate_file_bytes(oversized, max_size_mb=10)
    assert exc.value.code == "FILE_TOO_LARGE"
