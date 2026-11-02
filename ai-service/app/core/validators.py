import re
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from typing import Optional


# ─── Verhoeff Checksum Algorithm (Aadhaar) ───────────────────────────────────

# Multiplication table d
_d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

# Permutation table p
_p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

# Inverse table inv
_inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]


def is_valid_aadhaar_verhoeff(aadhaar: str) -> bool:
    """Validates 12-digit Aadhaar number against the Verhoeff algorithm."""
    clean = re.sub(r"[\s\-]", "", aadhaar)
    if not re.match(r"^\d{12}$", clean):
        return False
    # Verhoeff verification: evaluate d(c, p(i, n_i))
    c = 0
    for i, item in enumerate(reversed(clean)):
        c = _d[c][_p[i % 8][int(item)]]
    return c == 0


def mask_aadhaar(aadhaar: str) -> str:
    """Masks Aadhaar number preserving only last 4 digits (e.g. XXXX XXXX 1234)."""
    clean = re.sub(r"[\s\-]", "", aadhaar)
    if len(clean) >= 4:
        return f"XXXX XXXX {clean[-4:]}"
    return "XXXX XXXX XXXX"


# ─── PAN Validator ───────────────────────────────────────────────────────────

PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")


def is_valid_pan(pan: str) -> bool:
    """Checks PAN 10-char format."""
    clean = pan.strip().upper()
    return bool(PAN_REGEX.match(clean))


def is_individual_pan(pan: str) -> bool:
    """Checks if the 4th character of PAN is 'P' (Person/Individual)."""
    clean = pan.strip().upper()
    return is_valid_pan(clean) and clean[3] == "P"


def mask_pan(pan: str) -> str:
    """Masks PAN: ABCDE****F."""
    clean = pan.strip().upper()
    if len(clean) == 10:
        return f"{clean[:5]}****{clean[-1]}"
    return "ABCDE****F"


# ─── IFSC & Bank Account Validator ───────────────────────────────────────────

IFSC_REGEX = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")


def is_valid_ifsc(ifsc: str) -> bool:
    """Validates Indian Financial System Code format."""
    return bool(IFSC_REGEX.match(ifsc.strip().upper()))


def is_valid_account_number(acc: str) -> bool:
    """Validates account number length (9 to 18 digits or alphanumeric)."""
    clean = re.sub(r"[\s\-]", "", acc)
    # Masked accounts with X's are acceptable
    if re.match(r"^[X\d]{9,18}$", clean, re.IGNORECASE):
        return True
    return bool(re.match(r"^\d{9,18}$", clean))


def mask_account_number(acc: str) -> str:
    """Masks account number: XXXXXX7890."""
    clean = re.sub(r"[\s\-]", "", acc)
    if len(clean) > 4:
        return "X" * (len(clean) - 4) + clean[-4:]
    return "XXXXXX" + clean


# ─── Number / Money Normalizer ───────────────────────────────────────────────

def normalize_money(text: str) -> Optional[Decimal]:
    """
    Normalizes monetary strings to Decimal:
    Handles ₹, Rs., INR, Indian grouping (1,23,456.00), commas, spaces.
    """
    if not text:
        return None
    # Strip currency symbols and whitespace
    clean = re.sub(r"[₹\$\€\£]|INR|Rs\.?|/-|\s", "", text, flags=re.IGNORECASE)
    # Remove commas
    clean = clean.replace(",", "")
    try:
        val = Decimal(clean)
        return val.quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None


# ─── Date Normalizer ─────────────────────────────────────────────────────────

DATE_FORMATS = [
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%Y-%m-%d",
    "%d %B %Y",
    "%d %b %Y",
    "%d-%b-%Y",
    "%d-%B-%Y",
    "%B %Y",
    "%b %Y",
    "%m/%Y",
    "%m-%Y",
]


def normalize_date(text: str) -> Optional[str]:
    """
    Normalizes various date formats to ISO YYYY-MM-DD or YYYY-MM.
    """
    if not text:
        return None
    clean = text.strip()
    for fmt in DATE_FORMATS:
        try:
            dt = datetime.strptime(clean, fmt)
            if "%d" in fmt:
                return dt.strftime("%Y-%m-%d")
            else:
                return dt.strftime("%Y-%m")
        except ValueError:
            continue
    return None


def calculate_months_between(date_str: str, ref_date: Optional[date] = None) -> int:
    """Calculates months between date_str and ref_date (default today)."""
    if ref_date is None:
        ref_date = date.today()
    try:
        if len(date_str) == 7:  # YYYY-MM
            d = datetime.strptime(date_str, "%Y-%m").date()
        else:
            d = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        return (ref_date.year - d.year) * 12 + (ref_date.month - d.month)
    except Exception:
        return 0


# ─── Name Normalizer ─────────────────────────────────────────────────────────

HONORIFICS = ["MR", "MRS", "MS", "DR", "SHRI", "SMT", "KUMAR", "KUMARI"]


def normalize_name(text: str) -> str:
    """Normalizes person names: uppercase, trims honorifics, collapses whitespace."""
    if not text:
        return ""
    words = re.sub(r"[^\w\s]", "", text).upper().split()
    filtered = [w for w in words if w not in HONORIFICS]
    return " ".join(filtered)
