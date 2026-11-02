from decimal import Decimal
from app.core.validators import (
    is_valid_pan,
    is_individual_pan,
    mask_pan,
    is_valid_aadhaar_verhoeff,
    mask_aadhaar,
    is_valid_ifsc,
    is_valid_account_number,
    mask_account_number,
    normalize_money,
    normalize_name,
    normalize_date,
)


def test_pan_validation():
    # Valid individual PAN
    assert is_valid_pan("ABCDE1234F") is True
    assert is_individual_pan("ABCDE1234F") is False  # 4th char is D
    assert is_individual_pan("ABCPK1234F") is True   # 4th char is P

    # Invalid PANs
    assert is_valid_pan("ABC123456F") is False
    assert is_valid_pan("ABCDE12345") is False
    assert is_valid_pan("12345ABCDE") is False

    # Masking
    assert mask_pan("ABCPK1234F") == "ABCPK****F"


def test_aadhaar_verhoeff():
    # Valid Aadhaar numbers using Verhoeff
    # Sample valid Verhoeff test number: 216999999993, 999999990019
    # Let's test a known Verhoeff generation:
    # Any number where checksum digit matches:
    # Let's test with a known valid 12-digit number:
    valid_test_aadhaar = "999999990019"
    assert is_valid_aadhaar_verhoeff(valid_test_aadhaar) is True

    # Tampering one digit must fail Verhoeff check
    invalid_test_aadhaar = "999999990018"
    assert is_valid_aadhaar_verhoeff(invalid_test_aadhaar) is False

    # Aadhaar with spaces
    assert is_valid_aadhaar_verhoeff("9999 9999 0019") is True

    # Masking
    assert mask_aadhaar("999999990019") == "XXXX XXXX 0019"
    assert mask_aadhaar("9999 9999 0019") == "XXXX XXXX 0019"


def test_ifsc_and_account_validation():
    assert is_valid_ifsc("HDFC0001234") is True
    assert is_valid_ifsc("SBIN0000001") is True
    assert is_valid_ifsc("INVALID123") is False

    assert is_valid_account_number("123456789012") is True
    assert is_valid_account_number("XXXX-XXXX-1001") is True
    assert is_valid_account_number("123") is False

    assert mask_account_number("123456789012") == "XXXXXXXX9012"


def test_money_normalization():
    assert normalize_money("₹40,000") == Decimal("40000.00")
    assert normalize_money("INR 1,23,456.50") == Decimal("123456.50")
    assert normalize_money("Rs. 25000/-") == Decimal("25000.00")
    assert normalize_money("38,000") == Decimal("38000.00")
    assert normalize_money(None) is None
    assert normalize_money("INVALID") is None


def test_name_normalization():
    assert normalize_name("Mr. Aarav Mehta") == "AARAV MEHTA"
    assert normalize_name("DR. PRIYA SHARMA") == "PRIYA SHARMA"
    assert normalize_name("Shri Rahul Sharma") == "RAHUL SHARMA"


def test_date_normalization():
    assert normalize_date("30 September 2026") == "2026-09-30"
    assert normalize_date("01-09-2026") == "2026-09-01"
    assert normalize_date("September 2026") == "2026-09"
    assert normalize_date("10/12/2026") == "2026-12-10"
