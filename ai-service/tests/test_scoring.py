from app.core.scoring import fraud_scorer
from app.models.facts import RuleEvaluation


def test_scorer_monotonicity():
    """
    Test Bayesian monotonicity property:
    Adding adverse evidence must never decrease P(Fraud).
    """
    # Baseline: clean document
    v1, p1, _ = fraud_scorer.score(
        template_conformance="High",
        has_arithmetic_failure=False,
        has_metadata_anomaly=False,
        has_edit_artifacts=False,
        extraction_quality=1.0,
        is_issuer_attested=False,
        blocking_failures=[],
    )

    # Adverse evidence 1: metadata anomaly added
    v2, p2, _ = fraud_scorer.score(
        template_conformance="High",
        has_arithmetic_failure=False,
        has_metadata_anomaly=True,
        has_edit_artifacts=False,
        extraction_quality=1.0,
        is_issuer_attested=False,
        blocking_failures=[],
    )
    assert p2 >= p1, f"Expected p2 >= p1, got {p2} vs {p1}"

    # Adverse evidence 2: edit artifacts added
    v3, p3, _ = fraud_scorer.score(
        template_conformance="High",
        has_arithmetic_failure=False,
        has_metadata_anomaly=True,
        has_edit_artifacts=True,
        extraction_quality=1.0,
        is_issuer_attested=False,
        blocking_failures=[],
    )
    assert p3 >= p2, f"Expected p3 >= p2, got {p3} vs {p2}"

    # Adverse evidence 3: arithmetic failure added
    v4, p4, _ = fraud_scorer.score(
        template_conformance="High",
        has_arithmetic_failure=True,
        has_metadata_anomaly=True,
        has_edit_artifacts=True,
        extraction_quality=1.0,
        is_issuer_attested=False,
        blocking_failures=[],
    )
    assert p4 >= p3, f"Expected p4 >= p3, got {p4} vs {p3}"


def test_issuer_attestation_lowers_prior():
    """Issuer attestation should reduce fraud probability."""
    _, p_unattested, _ = fraud_scorer.score(
        template_conformance="High",
        has_arithmetic_failure=False,
        has_metadata_anomaly=False,
        has_edit_artifacts=False,
        extraction_quality=1.0,
        is_issuer_attested=False,
        blocking_failures=[],
    )

    _, p_attested, _ = fraud_scorer.score(
        template_conformance="High",
        has_arithmetic_failure=False,
        has_metadata_anomaly=False,
        has_edit_artifacts=False,
        extraction_quality=1.0,
        is_issuer_attested=True,
        blocking_failures=[],
    )
    assert p_attested <= p_unattested


def test_blocking_failure_triggers_rejected():
    blocking_ev = RuleEvaluation(
        rule_id="ARITH_GROSS_SUM",
        description="Gross sum failure",
        passed=False,
        blocking=True,
        premise_trace="Failed",
    )
    verdict, p_fraud, _ = fraud_scorer.score(
        template_conformance="High",
        has_arithmetic_failure=True,
        has_metadata_anomaly=False,
        has_edit_artifacts=False,
        extraction_quality=1.0,
        is_issuer_attested=False,
        blocking_failures=[blocking_ev],
    )
    assert verdict == 2  # Rejected
