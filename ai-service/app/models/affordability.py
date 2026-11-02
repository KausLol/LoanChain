from typing import Optional, List
from pydantic import BaseModel, Field


class AffordabilityAnalysis(BaseModel):
    monthly_income: float = Field(..., description="Estimated or verified net monthly income in INR")
    existing_obligations: float = Field(..., description="Estimated or verified existing monthly obligations/deductions in INR")
    current_dti_pct: float = Field(..., description="Existing Debt-To-Income percentage before new loan")
    safe_emi_min: float = Field(..., description="Lower bound of recommended safe EMI capacity in INR (e.g. 40% FOIR)")
    safe_emi_max: float = Field(..., description="Upper bound of recommended safe EMI capacity in INR (e.g. 50% FOIR)")

    # Proposed Loan metrics
    proposed_loan_amount_eth: Optional[float] = None
    proposed_loan_amount_inr: Optional[float] = None
    proposed_tenure_months: Optional[int] = None
    proposed_interest_rate_pct: Optional[float] = None
    proposed_emi_inr: Optional[float] = None
    projected_dti_pct: Optional[float] = None

    # Suggested Counter-Offer Adjustments
    suggested_loan_amount_eth: Optional[float] = None
    suggested_loan_amount_inr: Optional[float] = None
    suggested_tenure_months: Optional[int] = None

    # Assessment
    affordability_verdict: str = Field(..., description="'Affordable', 'Borderline', 'High DTI', or 'Unaffordable'")
    is_affordable: bool = Field(..., description="True if proposed loan EMI is within recommended ceiling")
    confidence: str = Field(..., description="'High', 'Medium', or 'Low'")
    confidence_score: float = Field(..., description="Confidence score between 0.0 and 1.0")

    summary: str = Field(..., description="Human-readable assessment summary")
    advisory_notes: List[str] = Field(default_factory=list)
    is_advisory: bool = True
