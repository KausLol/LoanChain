import json
from decimal import Decimal
from typing import Dict, List, Any
from eth_hash.auto import keccak
from app.models.facts import RuleEvaluation, ForensicSignal
from app.models.result import VerificationResult, VerdictEnum

# Reason Code Registry: Dual-audience messages
REASON_CODES = {
    "HASH_MISMATCH": {
        "applicant": "The uploaded file does not match the cryptographic hash registered on the blockchain.",
        "officer": "Uploaded file keccak256 digest differs from on-chain DocumentRegistry docHash.",
    },
    "DOCTYPE_MISMATCH": {
        "applicant": "The document content does not match the selected document type.",
        "officer": "Template classification score below threshold. Key structural anchor keywords not found.",
    },
    "ARITH_GROSS_MISMATCH": {
        "applicant": "The listed earnings components do not add up to the stated gross earnings.",
        "officer": "Arithmetic failure: sum(earnings) != gross_earnings (beyond ±₹1.00 tolerance).",
    },
    "ARITH_NET_MISMATCH": {
        "applicant": "Gross salary minus total deductions does not equal the net salary payable.",
        "officer": "Arithmetic failure: gross_earnings - total_deductions != net_pay (beyond ±₹1.00 tolerance).",
    },
    "ARITH_STATEMENT_TOTALS_MISMATCH": {
        "applicant": "The opening balance and credit/debit totals do not reconcile with the closing balance.",
        "officer": "Arithmetic failure: opening_balance + total_credits - total_debits != closing_balance.",
    },
    "RUNNING_BALANCE_DISCONTINUITY": {
        "applicant": "One or more transaction entries in the bank statement contain an inconsistent running balance.",
        "officer": "Transaction row verification failed: current_bal != prev_bal + credit - debit.",
    },
    "MISSING_MANDATORY_FIELD": {
        "applicant": "A required field could not be found or extracted from the document.",
        "officer": "Required template field is missing or below extraction confidence threshold.",
    },
    "INVALID_PAN_FORMAT": {
        "applicant": "The Permanent Account Number (PAN) does not match the valid Indian PAN format.",
        "officer": "PAN failed regex validation ^[A-Z]{5}[0-9]{4}[A-Z]$.",
    },
    "INVALID_AADHAAR_CHECKSUM": {
        "applicant": "The Aadhaar number does not satisfy the official Verhoeff checksum algorithm.",
        "officer": "12-digit Aadhaar number failed Verhoeff checksum calculation.",
    },
    "ID_EXPIRED": {
        "applicant": "The identification document has expired.",
        "officer": "Document valid_until date precedes current verification date.",
    },
    "META_EDITOR_PRODUCER": {
        "applicant": "Document metadata indicates it was created or modified using an image editing tool.",
        "officer": "Forensic alert: PDF Producer/Creator matches desktop graphics software (Photoshop/Canva/GIMP).",
    },
    "INCREMENTAL_UPDATE_DETECTED": {
        "applicant": "Document structure indicates post-generation modifications.",
        "officer": "Forensic alert: Multiple %%EOF markers / xref tables found, indicating incremental PDF edits.",
    },
    "FONT_ANOMALY_DETECTED": {
        "applicant": "Visual inconsistencies detected in document fonts or numbers.",
        "officer": "Forensic alert: Mixed fonts or irregular font sizes detected in numeric columns.",
    },
    "LOW_EXTRACTION_QUALITY": {
        "applicant": "Document text quality is too low for reliable automatic reading.",
        "officer": "Extraction quality / OCR confidence below 0.70 threshold. Manual review recommended.",
    },
    "NAME_MISMATCH": {
        "applicant": "Applicant name differs across the submitted document bundle.",
        "officer": "Cross-document verification failed: Name fuzzy match score below acceptable threshold.",
    },
    "SALARY_CREDIT_MISMATCH": {
        "applicant": "Bank statement does not show a salary deposit matching the net salary slip amount.",
        "officer": "Cross-document verification failed: Statement lacks salary credit matching net pay ±2%.",
    },
}


class CustomJSONEncoder(json.JSONEncoder):
    """Encodes Decimals, sets, and special types deterministically."""

    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, set):
            return sorted(list(obj))
        return super().default(obj)


def canonical_json(data: Any) -> str:
    """Serializes data into canonical JSON (sorted keys, no whitespace, UTF-8)."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"), cls=CustomJSONEncoder)


def compute_explanation_hash(report_dict: Dict[str, Any]) -> str:
    """Computes keccak256 hash of canonical JSON report."""
    canonical_bytes = canonical_json(report_dict).encode("utf-8")
    digest = keccak(canonical_bytes)
    return "0x" + digest.hex()


def generate_explanation_report(
    doc_id: str,
    doc_hash: str,
    verdict: int,
    confidence_bps: int,
    template_ref: str,
    model_version: str,
    evaluations: List[RuleEvaluation],
    signals: List[ForensicSignal],
    fields: Dict[str, Any],
) -> VerificationResult:
    """Builds a structured explainable result with dual-audience summaries."""
    reason_codes = []
    applicant_points = []
    technical_points = []

    # 1. Collect failed checks
    for ev in evaluations:
        if not ev.passed:
            code = ev.reason_code or "FAILED_CHECK"
            reason_codes.append(code)
            rc_info = REASON_CODES.get(
                code,
                {
                    "applicant": f"Check failed: {ev.description}",
                    "officer": f"Rule failure ({ev.rule_id}): {ev.premise_trace}",
                },
            )
            applicant_points.append(rc_info["applicant"])
            technical_points.append(f"[{ev.rule_id}] {rc_info['officer']} ({ev.premise_trace})")

    # 2. Collect high/medium forensic signals
    for sig in signals:
        if sig.severity in ("high", "medium"):
            reason_codes.append(sig.code)
            rc_info = REASON_CODES.get(
                sig.code,
                {
                    "applicant": f"Document anomaly: {sig.evidence}",
                    "officer": f"Forensic signal ({sig.code}): {sig.evidence}",
                },
            )
            applicant_points.append(rc_info["applicant"])
            technical_points.append(f"[FORENSIC_{sig.code}] {rc_info['officer']}")

    verdict_labels = {
        VerdictEnum.APPROVED: "Approved",
        VerdictEnum.BORDERLINE: "Borderline",
        VerdictEnum.REJECTED: "Rejected",
    }
    verdict_label = verdict_labels.get(verdict, "Borderline")

    if verdict == VerdictEnum.APPROVED:
        summary = "Document successfully verified: all arithmetic checks, template rules, and integrity signals passed."
    elif verdict == VerdictEnum.REJECTED:
        summary = "Verification failed: " + "; ".join(applicant_points[:3])
    else:
        summary = "Verification requires manual review: " + (
            "; ".join(applicant_points[:3]) if applicant_points else "Intermediate risk score."
        )

    technical_trace = "\n".join(technical_points) if technical_points else "All automated invariant rules satisfied."

    # Build report dict for canonical hashing
    report_dict = {
        "doc_id": doc_id,
        "doc_hash": doc_hash,
        "verdict": verdict,
        "confidence_bps": confidence_bps,
        "template_ref": template_ref,
        "model_version": model_version,
        "reason_codes": sorted(list(set(reason_codes))),
        "checks": [
            {
                "rule_id": c.rule_id,
                "passed": c.passed,
                "blocking": c.blocking,
                "trace": c.premise_trace,
            }
            for c in evaluations
        ],
        "signals": [{"code": s.code, "severity": s.severity, "evidence": s.evidence} for s in signals],
        "extracted_fields": fields,
    }

    explanation_hash = compute_explanation_hash(report_dict)

    return VerificationResult(
        doc_id=doc_id,
        doc_hash=doc_hash,
        verdict=verdict,
        verdict_label=verdict_label,
        confidence_bps=confidence_bps,
        template_ref=template_ref,
        model_version=model_version,
        explanation_hash=explanation_hash,
        reason_codes=sorted(list(set(reason_codes))),
        checks=evaluations,
        signals=signals,
        extracted_fields=fields,
        summary=summary,
        technical_trace=technical_trace,
    )
