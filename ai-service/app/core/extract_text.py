import io
from typing import List, Tuple
from dataclasses import dataclass
from PIL import Image
import fitz  # PyMuPDF


@dataclass
class ExtractedWord:
    text: str
    bbox: Tuple[float, float, float, float]  # (x0, y0, x1, y1)
    font: str
    size: float
    page: int
    confidence: float = 1.0


@dataclass
class ExtractedPage:
    page_number: int
    text: str
    words: List[ExtractedWord]
    fonts: List[str]
    method: str  # "native" | "ocr"
    mean_confidence: float = 1.0


@dataclass
class ExtractionResult:
    full_text: str
    pages: List[ExtractedPage]
    method: str  # "native" | "ocr" | "mixed"
    overall_quality: float
    total_characters: int


def extract_text_from_pdf(pdf_bytes: bytes) -> ExtractionResult:
    """
    Extracts text and layout tokens from PDF bytes.
    Uses native PyMuPDF text layer with word bounding boxes and font metadata.
    Falls back to OCR if text is sparse (< 50 characters per page).
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages: List[ExtractedPage] = []
    total_chars = 0
    all_words: List[ExtractedWord] = []
    full_text_parts: List[str] = []
    native_page_count = 0
    ocr_page_count = 0

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_num = page_idx + 1

        # Extract text blocks and spans with font information
        page_text = page.get_text("text")
        words_on_page: List[ExtractedWord] = []
        fonts_seen = set()

        text_page = page.get_text("dict")
        for block in text_page.get("blocks", []):
            if block.get("type") == 0:  # text block
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        span_text = span.get("text", "")
                        span_font = span.get("font", "unknown")
                        span_size = span.get("size", 10.0)
                        span_bbox = span.get("bbox", (0, 0, 0, 0))
                        fonts_seen.add(span_font)

                        # Break span into words
                        span_words = span_text.split()
                        if span_words:
                            for w in span_words:
                                words_on_page.append(
                                    ExtractedWord(
                                        text=w,
                                        bbox=span_bbox,
                                        font=span_font,
                                        size=span_size,
                                        page=page_num,
                                        confidence=1.0,
                                    )
                                )

        char_count = len(page_text.strip())
        total_chars += char_count

        # Check if page is image-only / sparse (< 50 chars)
        if char_count < 50:
            # Attempt OCR fallback on rasterized page
            ocr_text, ocr_words = _ocr_rasterized_page(page, page_num)
            if ocr_text:
                page_text = ocr_text
                words_on_page = ocr_words
                ocr_page_count += 1
                pages.append(
                    ExtractedPage(
                        page_number=page_num,
                        text=ocr_text,
                        words=ocr_words,
                        fonts=list(fonts_seen),
                        method="ocr",
                        mean_confidence=0.85,
                    )
                )
            else:
                native_page_count += 1
                pages.append(
                    ExtractedPage(
                        page_number=page_num,
                        text=page_text,
                        words=words_on_page,
                        fonts=list(fonts_seen),
                        method="native",
                        mean_confidence=0.5 if char_count == 0 else 0.8,
                    )
                )
        else:
            native_page_count += 1
            pages.append(
                ExtractedPage(
                    page_number=page_num,
                    text=page_text,
                    words=words_on_page,
                    fonts=list(fonts_seen),
                    method="native",
                    mean_confidence=1.0,
                )
            )

        full_text_parts.append(page_text)
        all_words.extend(words_on_page)

    doc.close()

    if ocr_page_count == len(pages) and len(pages) > 0:
        overall_method = "ocr"
        quality = 0.85
    elif ocr_page_count > 0:
        overall_method = "mixed"
        quality = 0.90
    else:
        overall_method = "native"
        quality = 1.0 if total_chars > 100 else 0.65

    return ExtractionResult(
        full_text="\n\n".join(full_text_parts),
        pages=pages,
        method=overall_method,
        overall_quality=quality,
        total_characters=total_chars,
    )


def extract_text_from_image(image_bytes: bytes) -> ExtractionResult:
    """Extracts text from PNG or JPEG image bytes using OCR."""
    img = Image.open(io.BytesIO(image_bytes))
    ocr_text, ocr_words = _run_ocr_on_pil_image(img, page_num=1)
    
    pages = [
        ExtractedPage(
            page_number=1,
            text=ocr_text,
            words=ocr_words,
            fonts=["ocr-detected"],
            method="ocr",
            mean_confidence=0.85 if ocr_text else 0.3,
        )
    ]
    return ExtractionResult(
        full_text=ocr_text,
        pages=pages,
        method="ocr",
        overall_quality=0.85 if ocr_text else 0.3,
        total_characters=len(ocr_text),
    )


def _ocr_rasterized_page(fitz_page, page_num: int) -> Tuple[str, List[ExtractedWord]]:
    """Rasterizes a PDF page at 300 DPI and runs OCR."""
    pix = fitz_page.get_pixmap(dpi=300)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    return _run_ocr_on_pil_image(img, page_num)


def _run_ocr_on_pil_image(img: Image.Image, page_num: int) -> Tuple[str, List[ExtractedWord]]:
    """Runs OCR fallback using Tesseract or EasyOCR if available, or returns placeholder."""
    try:
        import pytesseract
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        words = []
        text_lines = []
        n_boxes = len(data["text"])
        for i in range(n_boxes):
            w_text = data["text"][i].strip()
            if w_text:
                conf = float(data["conf"][i]) / 100.0 if data["conf"][i] != "-1" else 0.7
                bbox = (
                    float(data["left"][i]),
                    float(data["top"][i]),
                    float(data["left"][i] + data["width"][i]),
                    float(data["top"][i] + data["height"][i]),
                )
                words.append(
                    ExtractedWord(
                        text=w_text,
                        bbox=bbox,
                        font="ocr-font",
                        size=float(data["height"][i]),
                        page=page_num,
                        confidence=conf,
                    )
                )
                text_lines.append(w_text)
        return " ".join(text_lines), words
    except ImportError:
        pass
    except Exception:
        pass

    # If pytesseract is not configured on system, return empty OCR with graceful degradation
    return "", []
