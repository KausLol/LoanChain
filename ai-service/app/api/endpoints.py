import logging
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.config import settings
from app.core.intake import validate_file_bytes, IntakeValidationError
from app.core.chain import compute_keccak256, chain_client
from app.core.classify import template_registry, DOC_TYPE_NAMES
from app.core.extract_text import extract_text_from_pdf, extract_text_from_image
from app.core.extract_fields import extract_fields_and_tables
from app.core.rules_engine import rules_engine
from app.core.forensics import analyze_pdf_forensics, perform_image_ela
from app.core.scoring import fraud_scorer
from app.core.bundle import verify_bundle
from app.core.explain import generate_explanation_report
from app.core.signing import sign_doc_attestation
from app.models.result import VerificationResult, BundleResult
from app.models.template import TemplateSchema
from app.store.report_store import report_store

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
def health_check():
    """Liveness, template inventory, and chain connectivity status."""
    templates = template_registry.list_templates()
    chain_ok = False
    try:
        chain_ok = chain_client.w3.is_connected()
    except Exception:
        chain_ok = False

    return {
        "status": "healthy",
        "service": "LoanChain AI Verification Layer",
        "version": settings.version,
        "templates_loaded": len(templates),
        "chain_connected": chain_ok,
        "chain_id": settings.chain_id,
        "signer_configured": bool(settings.ai_signer_private_key),
    }


@router.get("/templates", response_model=List[TemplateSchema])
def list_templates():
    """Lists all available declarative validation templates."""
    return template_registry.list_templates()


@router.get("/report/{explanation_hash}")
def get_explanation_report(explanation_hash: str):
    """Retrieves full explanation report from SQLite store by explanationHash."""
    report = report_store.get_report(explanation_hash)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "REPORT_NOT_FOUND", "message": f"No report found for hash {explanation_hash}"}},
        )
    return report


@router.post("/verify/document", response_model=VerificationResult)
async def verify_document(
    file: UploadFile = File(...),
    docId: str = Form(...),
    docType: int = Form(...),
    skip_chain_check: bool = Form(False),
):
    """
    Verifies content integrity of a registered loan document.
    Executes intake validation, template selection, text extraction,
    field parsing, deterministic rules, forensic checks, Bayesian scoring,
    and report storage.
    """
    # 1. Read file bytes
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "READ_ERROR", "message": f"Failed to read upload: {str(e)}"}},
        )

    # 2. Intake validation (magic bytes, size, hostile payload)
    try:
        file_type, _ = validate_file_bytes(
            file_bytes,
            max_size_mb=settings.max_upload_size_mb,
            max_pages=settings.max_pages,
        )
    except IntakeValidationError as ie:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": ie.code, "message": ie.message}},
        )

    # 3. Compute local keccak256 hash
    computed_hash = compute_keccak256(file_bytes)

    # 4. On-chain binding check
    is_issuer_attested = False
    applicant_address = None
    if not skip_chain_check:
        doc_info = chain_client.get_document_info(docId)
        if doc_info is not None:
            if doc_info["docHash"].lower() != computed_hash.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": {
                            "code": "HASH_MISMATCH",
                            "message": f"File hash {computed_hash} does not match on-chain registered docHash {doc_info['docHash']}",
                        }
                    },
                )
            if doc_info["isRevoked"] or doc_info["status"] == 3:  # Rejected
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": {
                            "code": "DOC_REVOKED_OR_REJECTED",
                            "message": "Document is marked as revoked or rejected on-chain",
                        }
                    },
                )
            applicant_address = doc_info.get("owner")
            if doc_info.get("issuer") and chain_client.is_active_issuer(doc_info["issuer"]):
                is_issuer_attested = True

    # 5. Extract text
    if file_type == "pdf":
        extraction = extract_text_from_pdf(file_bytes)
    else:
        extraction = extract_text_from_image(file_bytes)

    # 6. Template selection & DocType confirmation
    claimed_doc_type_name = DOC_TYPE_NAMES.get(docType, "Other")
    template, score, is_conforming = template_registry.select_template(
        claimed_doc_type=claimed_doc_type_name,
        text=extraction.full_text,
    )

    if not is_conforming or template is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "DOCTYPE_MISMATCH",
                    "message": f"Document content does not match claimed document type '{claimed_doc_type_name}' (Anchor score: {score:.2f})",
                }
            },
        )

    # 7. Extract fields and tables
    fields, tables = extract_fields_and_tables(extraction, template)

    # 8. Evaluate deterministic rules
    evaluations = rules_engine.evaluate_document(template, fields, tables)

    # 9. Forensic Signal Detection
    signals = []
    if file_type == "pdf":
        signals = analyze_pdf_forensics(pdf_bytes=file_bytes, template=template)
    else:
        _, ela_sig = perform_image_ela(file_bytes)
        if ela_sig:
            signals.append(ela_sig)

    # 10. Bayesian Risk Scoring
    blocking_failures = [ev for ev in evaluations if not ev.passed and ev.blocking]
    has_arith_fail = any("ARITH_" in ev.rule_id and not ev.passed for ev in evaluations)
    has_meta_anomaly = any(s.code in ("META_EDITOR_PRODUCER", "META_DATE_SHIFT") for s in signals)
    has_edit_artifacts = any(s.code in ("INCREMENTAL_UPDATE_DETECTED", "OVERLAY_ARTIFACT_DETECTED") for s in signals)
    template_conformance = "High" if score >= 0.8 else ("Medium" if score >= 0.5 else "Low")

    verdict, _, confidence_bps = fraud_scorer.score(
        template_conformance=template_conformance,
        has_arithmetic_failure=has_arith_fail,
        has_metadata_anomaly=has_meta_anomaly,
        has_edit_artifacts=has_edit_artifacts,
        extraction_quality=extraction.overall_quality,
        is_issuer_attested=is_issuer_attested,
        blocking_failures=blocking_failures,
    )

    # Masked fields dictionary for user display
    masked_fields_dict = {k: v.value_masked for k, v in fields.items()}
    template_ref = f"{template.id}@{template.version}"
    model_version = f"loanchain-ai-v{settings.version}"

    # 11. Generate explanation report
    report = generate_explanation_report(
        doc_id=docId,
        doc_hash=computed_hash,
        verdict=verdict,
        confidence_bps=confidence_bps,
        template_ref=template_ref,
        model_version=model_version,
        evaluations=evaluations,
        signals=signals,
        fields=masked_fields_dict,
    )

    # 12. Sign attestation (EIP-712) if private key is configured
    if settings.ai_signer_private_key:
        try:
            att, sig = sign_doc_attestation(
                doc_id=docId,
                doc_hash=computed_hash,
                verdict=verdict,
                confidence_bps=confidence_bps,
                template_ref=template_ref,
                model_version=model_version,
                explanation_hash=report.explanation_hash,
            )
            report.attestation = att
            report.signature = sig
        except Exception as e:
            logger.warning(f"Failed to sign attestation: {e}")

    # 13. Persist in SQLite report store (no raw files, no raw text)
    report_store.save_report(
        explanation_hash=report.explanation_hash,
        doc_id=docId,
        doc_hash=computed_hash,
        verdict=verdict,
        confidence_bps=confidence_bps,
        report_data=report.model_dump(),
        applicant_address=applicant_address,
    )

    return report


@router.post("/verify/bundle", response_model=BundleResult)
async def verify_document_bundle(
    files: List[UploadFile] = File(...),
    docIds: str = Form(description="Comma-separated on-chain docIds"),
    docTypes: str = Form(description="Comma-separated docType integers matching files"),
    loanId: Optional[int] = Form(None),
    skip_chain_check: bool = Form(False),
):
    """
    Verifies a full document application bundle:
    Runs per-document verification pipeline and executes cross-document invariants
    (name match, PAN match, salary credit reconciliation, advisory suggested action).
    """
    id_list = [d.strip() for d in docIds.split(",") if d.strip()]
    type_list = [int(t.strip()) for t in docTypes.split(",") if t.strip()]

    if len(files) != len(id_list) or len(files) != len(type_list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "COUNT_MISMATCH",
                    "message": f"Received {len(files)} files, but {len(id_list)} docIds and {len(type_list)} docTypes",
                }
            },
        )

    # Execute single-doc verification on each document
    doc_results: List[VerificationResult] = []
    for idx, f in enumerate(files):
        res = await verify_document(
            file=f,
            docId=id_list[idx],
            docType=type_list[idx],
            skip_chain_check=skip_chain_check,
        )
        doc_results.append(res)

    # Evaluate bundle-level invariants
    bundle_res = verify_bundle(doc_results=doc_results, loan_id=loanId)
    return bundle_res
