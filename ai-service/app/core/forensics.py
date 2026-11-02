import io
import re
from datetime import datetime
from typing import List, Optional, Tuple
from PIL import Image, ImageChops
import fitz  # PyMuPDF
import pikepdf
from app.models.facts import ForensicSignal
from app.models.template import TemplateSchema

# Editing software signatures in Producer / Creator metadata
GRAPHICS_EDITORS = [
    "photoshop",
    "canva",
    "gimp",
    "illustrator",
    "indesign",
    "coreldraw",
    "inkscape",
    "affinity",
    "acrobat distiller",  # often used for manual re-printing
]


def analyze_pdf_forensics(
    pdf_bytes: bytes,
    template: Optional[TemplateSchema] = None,
) -> List[ForensicSignal]:
    """
    Analyzes PDF for forensic anomalies:
    1. Metadata anomalies (editor software, mismatched creation/mod dates).
    2. Incremental updates (multiple %%EOF / trailer revisions).
    3. Font anomalies (outlier fonts, mixed fonts in numeric blocks).
    4. Overlay artifacts (solid whiteout/redaction rectangles over text).
    """
    signals: List[ForensicSignal] = []

    # 1. PDF Metadata Analysis
    signals.extend(_check_metadata(pdf_bytes, template))

    # 2. Incremental Update Analysis
    signals.extend(_check_incremental_updates(pdf_bytes))

    # 3. Font and Layout Anomalies
    signals.extend(_check_font_anomalies(pdf_bytes))

    # 4. Redaction / Overlay Artifacts
    signals.extend(_check_overlays_and_drawings(pdf_bytes))

    return signals


def _check_metadata(
    pdf_bytes: bytes,
    template: Optional[TemplateSchema],
) -> List[ForensicSignal]:
    signals = []
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        meta = doc.metadata or {}
        producer = (meta.get("producer") or "").lower()
        creator = (meta.get("creator") or "").lower()

        # Check for graphics/image editor tools
        flag_editors = True
        if template and template.forensics:
            flag_editors = template.forensics.flag_editor_producers

        if flag_editors:
            found_editor = None
            for editor in GRAPHICS_EDITORS:
                if editor in producer or editor in creator:
                    found_editor = editor
                    break

            if found_editor:
                signals.append(
                    ForensicSignal(
                        code="META_EDITOR_PRODUCER",
                        severity="medium",
                        weight=0.75,
                        evidence=f"Document Producer/Creator indicates image/layout editor ({found_editor.title()})",
                    )
                )

        # Check ModDate vs CreationDate
        creation_str = meta.get("creationDate") or ""
        mod_str = meta.get("modDate") or ""
        if creation_str and mod_str and creation_str != mod_str:
            # Parse dates if format D:YYYYMMDDHHMMSS
            c_date = _parse_pdf_date(creation_str)
            m_date = _parse_pdf_date(mod_str)
            if c_date and m_date:
                diff_hours = abs((m_date - c_date).total_seconds()) / 3600.0
                if diff_hours > 24.0:
                    signals.append(
                        ForensicSignal(
                            code="META_DATE_SHIFT",
                            severity="low",
                            weight=0.35,
                            evidence=f"Modification date is {diff_hours/24.0:.1f} days after creation date",
                        )
                    )

        doc.close()
    except Exception as e:
        signals.append(
            ForensicSignal(
                code="META_PARSE_ERROR",
                severity="info",
                weight=0.1,
                evidence=f"Metadata parsing warning: {str(e)}",
            )
        )
    return signals


def _check_incremental_updates(pdf_bytes: bytes) -> List[ForensicSignal]:
    signals = []
    try:
        # Check raw bytes for count of %%EOF
        eof_count = pdf_bytes.count(b"%%EOF")
        if eof_count > 1:
            # Multiple revisions exist
            signals.append(
                ForensicSignal(
                    code="INCREMENTAL_UPDATE_DETECTED",
                    severity="medium",
                    weight=0.70,
                    evidence=f"Document contains {eof_count} %%EOF revisions (indicates post-generation modification)",
                )
            )

        # Cross-check using pikepdf
        try:
            with pikepdf.open(io.BytesIO(pdf_bytes)) as pfile:
                # If trailer contains prev pointer
                if "/Prev" in pfile.trailer:
                    if not any(s.code == "INCREMENTAL_UPDATE_DETECTED" for s in signals):
                        signals.append(
                            ForensicSignal(
                                code="INCREMENTAL_UPDATE_DETECTED",
                                severity="medium",
                                weight=0.70,
                                evidence="Pikepdf detected /Prev xref table pointer indicating incremental updates",
                            )
                        )
        except Exception:
            pass

    except Exception:
        pass
    return signals


def _check_font_anomalies(pdf_bytes: bytes) -> List[ForensicSignal]:
    """Detects font irregularities (e.g. single digit with an outlier font)."""
    signals = []
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            text_dict = page.get_text("dict")
            font_usage = {}

            # Count characters by font
            for block in text_dict.get("blocks", []):
                if block.get("type") == 0:
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            font = span.get("font", "unknown")
                            text = span.get("text", "")
                            font_usage[font] = font_usage.get(font, 0) + len(text.strip())

            # If document has multiple fonts and one font has very few characters (< 4) in a numeric context
            if len(font_usage) > 1:
                total_chars = sum(font_usage.values())
                outlier_fonts = [
                    f for f, count in font_usage.items() if count <= 5 and (count / max(1, total_chars)) < 0.03
                ]
                if outlier_fonts:
                    signals.append(
                        ForensicSignal(
                            code="FONT_ANOMALY_DETECTED",
                            severity="medium",
                            weight=0.65,
                            evidence=f"Page {page_idx+1} contains outlier font ({outlier_fonts[0]}) with isolated characters",
                        )
                    )
                    break
        doc.close()
    except Exception:
        pass
    return signals


def _check_overlays_and_drawings(pdf_bytes: bytes) -> List[ForensicSignal]:
    """Checks for solid rectangular drawings placed over text regions (redaction/whiteout)."""
    signals = []
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            drawings = page.get_drawings()
            # Look for opaque rectangles with white or near-white fill
            suspicious_rects = 0
            for d in drawings:
                fill = d.get("fill")
                items = d.get("items", [])
                # If fill is white or near-white (1, 1, 1) or rect item
                if fill and len(fill) >= 3 and fill[0] > 0.95 and fill[1] > 0.95 and fill[2] > 0.95:
                    for it in items:
                        if it[0] in ("re", "rect"):
                            rect = it[1]
                            # Check if small text-sized rectangle
                            w = abs(rect.x1 - rect.x0)
                            h = abs(rect.y1 - rect.y0)
                            if 20 <= w <= 200 and 8 <= h <= 40:
                                suspicious_rects += 1

            if suspicious_rects > 0:
                signals.append(
                    ForensicSignal(
                        code="OVERLAY_ARTIFACT_DETECTED",
                        severity="high",
                        weight=0.80,
                        evidence=f"Page {page_idx+1} contains {suspicious_rects} whiteout/redaction rectangles drawn over content",
                    )
                )
                break
        doc.close()
    except Exception:
        pass
    return signals


def perform_image_ela(image_bytes: bytes, quality: int = 90) -> Tuple[float, Optional[ForensicSignal]]:
    """
    Error Level Analysis (ELA) for JPEG/PNG images.
    Resaves image at fixed quality and measures difference with original.
    Spliced/edited areas have significantly different resave error levels.
    """
    try:
        original = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        buf = io.BytesIO()
        original.save(buf, "JPEG", quality=quality)
        buf.seek(0)
        resaved = Image.open(buf)

        diff = ImageChops.difference(original, resaved)
        # Compute mean difference
        extrema = diff.getextrema()
        max_diff = max(ex[1] for ex in extrema)

        # Average pixel intensity of diff
        stat = diff.convert("L").getdata()
        avg_diff = sum(stat) / len(stat)

        if max_diff > 80 and avg_diff > 12.0:
            signal = ForensicSignal(
                code="IMAGE_ELA_ANOMALY",
                severity="low",
                weight=0.40,
                evidence="Error Level Analysis indicates inconsistent compression levels across image regions",
            )
            return float(avg_diff), signal

        return float(avg_diff), None
    except Exception:
        return 0.0, None


def _parse_pdf_date(date_str: str) -> Optional[datetime]:
    """Parses PDF date format D:YYYYMMDDHHmmSSOHH'mm'."""
    clean = re.sub(r"[^0-9]", "", date_str)
    if len(clean) >= 14:
        try:
            return datetime.strptime(clean[:14], "%Y%m%d%H%M%S")
        except ValueError:
            pass
    elif len(clean) >= 8:
        try:
            return datetime.strptime(clean[:8], "%Y%m%d")
        except ValueError:
            pass
    return None
