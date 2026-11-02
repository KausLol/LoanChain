from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class FieldSpec(BaseModel):
    aliases: List[str] = Field(default_factory=list)
    type: str = Field(description="name, text, month, date, pan, aadhaar, account, money, words, id")
    required: bool = False
    regex: Optional[str] = None


class TableSpec(BaseModel):
    header_aliases: List[str] = Field(default_factory=list)
    amount_column: str = "Amount"


class ToleranceSpec(BaseModel):
    abs: Optional[float] = None
    pct: Optional[float] = None


class RuleSpec(BaseModel):
    id: str
    blocking: bool = False
    description: Optional[str] = None
    expr: str
    tolerance: Optional[ToleranceSpec] = None
    reason_code: Optional[str] = None


class ForensicsSpec(BaseModel):
    expected_producers_hint: Optional[List[str]] = None
    flag_editor_producers: bool = True
    require_single_revision: bool = True
    check_font_uniformity: bool = True


class TemplateSchema(BaseModel):
    id: str
    version: str
    docType: str
    extends: Optional[str] = None
    anchors: List[List[str]] = Field(default_factory=list)
    fields: Dict[str, FieldSpec] = Field(default_factory=dict)
    tables: Optional[Dict[str, TableSpec]] = Field(default_factory=dict)
    rules: List[RuleSpec] = Field(default_factory=list)
    forensics: Optional[ForensicsSpec] = Field(default_factory=ForensicsSpec)
