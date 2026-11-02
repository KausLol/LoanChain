from pathlib import Path
from app.core.forensics import analyze_pdf_forensics, perform_image_ela
from PIL import Image
import io

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DUMMY_DIR = REPO_ROOT / "dummy"
FIXTURES_DIR = REPO_ROOT / "ai-service" / "tests" / "fixtures" / "tampered"


def test_authentic_doc_has_no_high_forensic_alerts():
    salary_path = DUMMY_DIR / "salary1234.pdf"
    assert salary_path.exists()
    signals = analyze_pdf_forensics(salary_path.read_bytes())
    # Authentic document generated cleanly has no high or medium editor alerts
    editor_signals = [s for s in signals if s.code in ("META_EDITOR_PRODUCER", "OVERLAY_ARTIFACT_DETECTED")]
    assert len(editor_signals) == 0


def test_tampered_metadata_editor_flagged():
    meta_path = FIXTURES_DIR / "tampered_metadata_editor.pdf"
    assert meta_path.exists()
    signals = analyze_pdf_forensics(meta_path.read_bytes())
    # Should detect Photoshop/Canva producer injected in metadata
    found = any(s.code == "META_EDITOR_PRODUCER" for s in signals)
    assert found is True


def test_image_ela_clean_image():
    # Create simple solid image
    img = Image.new("RGB", (200, 200), color="white")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    bytes_data = buf.getvalue()
    score, sig = perform_image_ela(bytes_data)
    assert score is not None
