from fastapi.testclient import TestClient
from app.main import app
from app.core.affordability import (
    evaluate_affordability,
    calculate_emi,
    calculate_max_loan_for_emi,
    calculate_tenure_for_emi,
)

client = TestClient(app)


def test_affordability_direct_calculation():
    """Matches user prompt example: ₹50,000 income, ₹8,000 obligations."""
    analysis = evaluate_affordability(
        income_inr=50000.0,
        obligations_inr=8000.0,
        loan_amount_eth=0.5,  # ₹125,000 at ₹250k/ETH
        tenure_months=24,
        interest_rate_bps=850,  # 8.5%
    )

    assert analysis.monthly_income == 50000.0
    assert analysis.existing_obligations == 8000.0
    assert analysis.current_dti_pct == 16.0
    assert analysis.safe_emi_min == 12000.0  # 40% * 50,000 - 8,000
    assert analysis.safe_emi_max == 17000.0  # 50% * 50,000 - 8,000

    # Proposed EMI for ₹125,000 at 8.5% for 24 months is ~₹5,684
    assert 5600.0 <= analysis.proposed_emi_inr <= 5750.0
    assert analysis.projected_dti_pct < 30.0  # (8,000 + 5,684) / 50,000 = ~27.4%
    assert analysis.is_affordable is True
    assert analysis.affordability_verdict == "Affordable"
    assert "Verified monthly income: ₹50,000" in analysis.summary
    assert "Existing obligations: ₹8,000" in analysis.summary
    assert analysis.is_advisory is True


def test_affordability_overstretched_suggests_adjustments():
    """Tests high DTI detection and counter-offer adjustments."""
    analysis = evaluate_affordability(
        income_inr=40000.0,
        obligations_inr=15000.0,  # Already 37.5% DTI, leaving max EMI ₹5,000
        loan_amount_eth=0.75,     # ₹187,500 loan -> 24m EMI would be ~₹8,500 (DTI ~58.8%)
        tenure_months=24,
        interest_rate_bps=850,
    )

    assert analysis.is_affordable is False
    assert analysis.affordability_verdict in ("High DTI / Stretched", "Unaffordable")
    assert analysis.projected_dti_pct > 50.0

    # Must provide advisory counter-offer adjustments
    assert analysis.suggested_loan_amount_eth is not None
    assert analysis.suggested_loan_amount_eth < 0.75
    assert analysis.suggested_tenure_months is not None
    assert analysis.suggested_tenure_months > 24


def test_affordability_api_endpoint():
    """Tests the /v1/analyze/affordability endpoint."""
    response = client.post(
        "/v1/analyze/affordability",
        data={
            "monthlyIncome": 47000.0,
            "existingObligations": 7500.0,
            "loanAmount": 0.5,
            "tenure": 24,
            "interestRate": 850,
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["monthly_income"] == 47000.0
    assert data["existing_obligations"] == 7500.0
    assert data["is_affordable"] is True
    assert data["is_advisory"] is True
    assert "Result: Affordable" in data["summary"]
