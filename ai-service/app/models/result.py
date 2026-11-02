from enum import IntEnum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.facts import ForensicSignal, RuleEvaluation


class VerdictEnum(IntEnum):
    APPROVED = 0
    BORDERLINE = 1
    REJECTED = 2


class EIP712Attestation(BaseModel):
    docId: str
    docHash: str
    verdict: int
    confidenceBps: int
    templateRef: str
    modelVersion: str
    explanationHash: str
    nonce: str
    deadline: int


class VerificationResult(BaseModel):
    doc_id: str
    doc_hash: str
    verdict: int
    verdict_label: str
    confidence_bps: int
    template_ref: str
    model_version: str
    explanation_hash: str
    reason_codes: List[str] = Field(default_factory=list)
    checks: List[RuleEvaluation] = Field(default_factory=list)
    signals: List[ForensicSignal] = Field(default_factory=list)
    extracted_fields: Dict[str, Any] = Field(default_factory=dict)
    summary: str
    technical_trace: str
    attestation: Optional[EIP712Attestation] = None
    signature: Optional[str] = None


class BundleResult(BaseModel):
    loan_id: Optional[int] = None
    doc_ids: List[str] = Field(default_factory=list)
    verdict: int
    verdict_label: str
    confidence_bps: int
    suggested_action: str
    action_reasons: List[str] = Field(default_factory=list)
    doc_results: List[VerificationResult] = Field(default_factory=list)
    bundle_checks: List[RuleEvaluation] = Field(default_factory=list)
    summary: str
