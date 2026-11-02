from pathlib import Path
from typing import Dict, List, Optional, Tuple
import yaml
from app.models.template import TemplateSchema

# Mapping from DocumentRegistry DocType integer to standard string name
DOC_TYPE_NAMES = {
    0: "SalarySlip",
    1: "BankStatement",
    2: "AadhaarCard",
    3: "PANCard",
    4: "AddressProof",
    5: "ITReturn",
    6: "Other",
}

DOC_TYPE_INTEGERS = {v: k for k, v in DOC_TYPE_NAMES.items()}


class TemplateRegistry:
    def __init__(self, templates_dir: Optional[Path] = None):
        self.templates_dir = templates_dir or Path(__file__).resolve().parent.parent.parent / "templates"
        self._templates: Dict[str, TemplateSchema] = {}
        self.load_all_templates()

    def load_all_templates(self):
        """Loads and parses all YAML templates in templates_dir."""
        self._templates.clear()
        if not self.templates_dir.exists():
            return

        for yf in self.templates_dir.rglob("*.yaml"):
            try:
                with open(yf, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                if data and "id" in data:
                    t = TemplateSchema(**data)
                    self._templates[t.id] = t
            except Exception as e:
                print(f"Warning: Failed to load template {yf}: {e}")

    def list_templates(self) -> List[TemplateSchema]:
        return list(self._templates.values())

    def get_template(self, template_id: str) -> Optional[TemplateSchema]:
        return self._templates.get(template_id)

    def select_template(
        self,
        claimed_doc_type: str,
        text: str,
        issuer_slug: Optional[str] = None,
    ) -> Tuple[Optional[TemplateSchema], float, bool]:
        """
        Selects best template for the document:
        1. Filters candidate templates matching claimed_doc_type.
        2. Evaluates anchor keyword groups against extracted text.
        3. Returns (best_template, match_score, is_conforming).
        """
        text_lower = text.lower()
        candidates: List[TemplateSchema] = [
            t for t in self._templates.values() if t.docType == claimed_doc_type
        ]

        if not candidates:
            # Check if generic 'Other' exists
            other = self._templates.get("other.default")
            if other and claimed_doc_type == "Other":
                return other, 1.0, True
            return None, 0.0, False

        best_template = None
        best_score = -1.0

        for t in candidates:
            if not t.anchors:
                # E.g. other.default
                score = 0.5
            else:
                group_matches = 0
                for group in t.anchors:
                    if any(anchor.lower() in text_lower for anchor in group):
                        group_matches += 1
                score = group_matches / len(t.anchors)

            if score > best_score:
                best_score = score
                best_template = t

        # If claimed_doc_type is not Other and score is 0, it's a doc type mismatch
        is_conforming = best_score >= 0.5 or claimed_doc_type == "Other"
        return best_template, best_score, is_conforming


template_registry = TemplateRegistry()
