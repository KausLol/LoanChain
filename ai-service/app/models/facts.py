from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float
    page: int = 1


class ExtractedField(BaseModel):
    name: str
    raw_value: str
    value_masked: str
    normalized_value: Any
    confidence: float = 1.0
    source: str = "native"  # "native" | "ocr"
    page: int = 1
    bbox: Optional[BoundingBox] = None


class ExtractedTableRow(BaseModel):
    cells: Dict[str, str] = Field(default_factory=dict)
    amount: Optional[Decimal] = None


class ExtractedTable(BaseModel):
    name: str
    rows: List[ExtractedTableRow] = Field(default_factory=list)
    total_amount: Optional[Decimal] = None


class ForensicSignal(BaseModel):
    code: str
    severity: str  # "info" | "low" | "medium" | "high"
    weight: float
    evidence: str


class RuleEvaluation(BaseModel):
    rule_id: str
    description: str
    passed: bool
    blocking: bool = False
    premise_trace: str
    reason_code: Optional[str] = None


class DocumentFacts(BaseModel):
    doc_id: str
    doc_type: str
    template_id: str
    template_version: str
    fields: Dict[str, ExtractedField] = Field(default_factory=dict)
    tables: Dict[str, ExtractedTable] = Field(default_factory=dict)
    signals: List[ForensicSignal] = Field(default_factory=list)
    rule_evaluations: List[RuleEvaluation] = Field(default_factory=list)
    extraction_method: str = "native"
    extraction_quality: float = 1.0
    is_issuer_attested: bool = False
