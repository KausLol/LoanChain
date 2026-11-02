import io
from typing import Tuple
from PIL import Image
import pypdf

# Magic bytes definitions
MAGIC_PDF = b"%PDF-"
MAGIC_PNG = b"\x89PNG\r\n\x1a\n"
MAGIC_JPEG = b"\xff\xd8\xff"

# Prohibited PDF action keywords for security
HOSTILE_PDF_TOKENS = [b"/Launch", b"/JavaScript", b"/JS", b"/EmbeddedFiles"]


class IntakeValidationError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def validate_file_bytes(
    data: bytes,
    max_size_mb: int = 10,
    max_pages: int = 20,
) -> Tuple[str, int]:
    """
    Validates uploaded file bytes:
    1. Size check
    2. Magic bytes validation (PDF, PNG, JPG)
    3. Structural & hostile payload checks
    Returns: (file_type: 'pdf' | 'png' | 'jpeg', page_count: int)
    """
    size_bytes = len(data)
    if size_bytes == 0:
        raise IntakeValidationError("EMPTY_FILE", "Uploaded file is empty (0 bytes)")

    max_bytes = max_size_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise IntakeValidationError(
            "FILE_TOO_LARGE",
            f"File size {size_bytes / (1024*1024):.2f} MB exceeds maximum limit of {max_size_mb} MB",
        )

    # 1. Magic bytes check
    if data.startswith(MAGIC_PDF):
        file_type = "pdf"
        # Check hostile tokens
        for token in HOSTILE_PDF_TOKENS:
            if token in data:
                raise IntakeValidationError(
                    "HOSTILE_PDF_ELEMENT",
                    f"PDF contains prohibited interactive/executable element ({token.decode(errors='ignore')})",
                )

        # Parse PDF structure safely
        try:
            reader = pypdf.PdfReader(io.BytesIO(data))
            if reader.is_encrypted:
                raise IntakeValidationError("ENCRYPTED_PDF", "Encrypted or password-protected PDFs are not supported")

            page_count = len(reader.pages)
            if page_count > max_pages:
                raise IntakeValidationError(
                    "TOO_MANY_PAGES",
                    f"PDF has {page_count} pages, exceeding the maximum allowed ({max_pages} pages)",
                )
        except IntakeValidationError:
            raise
        except Exception as e:
            raise IntakeValidationError("MALFORMED_PDF", f"Unable to parse PDF structure: {str(e)}")

        return file_type, page_count

    elif data.startswith(MAGIC_PNG):
        file_type = "png"
    elif data.startswith(MAGIC_JPEG):
        file_type = "jpeg"
    else:
        raise IntakeValidationError(
            "UNSUPPORTED_FORMAT",
            "Unsupported file format. Only PDF, PNG, and JPEG documents are permitted",
        )

    # Image validation (decompression bomb guard)
    try:
        # Prevent decompression bombs
        Image.MAX_IMAGE_PIXELS = 50_000_000
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
    except Exception as e:
        raise IntakeValidationError("MALFORMED_IMAGE", f"Corrupt or unsafe image file: {str(e)}")

    return file_type, 1
