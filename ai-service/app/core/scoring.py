import warnings
from typing import List, Tuple
from pgmpy.models import BayesianNetwork
from pgmpy.factors.discrete import TabularCPD
from pgmpy.inference import VariableElimination

from app.models.facts import RuleEvaluation
from app.models.result import VerdictEnum

warnings.filterwarnings("ignore", category=FutureWarning)


class FraudRiskScorer:
    """
    Classical Bayesian Network for fraud risk scoring using pgmpy.
    CPTs are expert-set prior tables (uncalibrated, labeled as such).
    Guarantees monotonicity: adverse evidence never decreases P(Fraud).
    """

    def __init__(self):
        self.model = self._build_network()
        self.inference = VariableElimination(self.model)

    def _build_network(self) -> BayesianNetwork:
        edges = [
            ("TemplateConformance", "Fraudulent"),
            ("ArithmeticConsistency", "Fraudulent"),
            ("MetadataAnomaly", "Fraudulent"),
            ("EditArtifacts", "Fraudulent"),
            ("ExtractionQuality", "Fraudulent"),
            ("IssuerAttested", "Fraudulent"),
        ]
        model = BayesianNetwork(edges)

        cpd_template = TabularCPD("TemplateConformance", 3, [[0.85], [0.10], [0.05]])
        cpd_arith = TabularCPD("ArithmeticConsistency", 2, [[0.92], [0.08]])
        cpd_meta = TabularCPD("MetadataAnomaly", 2, [[0.94], [0.06]])
        cpd_edits = TabularCPD("EditArtifacts", 2, [[0.95], [0.05]])
        cpd_extract = TabularCPD("ExtractionQuality", 2, [[0.90], [0.10]])
        cpd_issuer = TabularCPD("IssuerAttested", 2, [[0.15], [0.85]])

        p_fraud_matrix = []
        p_clean_matrix = []

        for t in range(3):
            for a in range(2):
                for m in range(2):
                    for e in range(2):
                        for q in range(2):
                            for i in range(2):
                                score = 0.02
                                if t == 1:
                                    score += 0.15
                                elif t == 2:
                                    score += 0.40

                                if a == 1:
                                    score += 0.65
                                if m == 1:
                                    score += 0.25
                                if e == 1:
                                    score += 0.35
                                if q == 1:
                                    score += 0.08

                                if i == 0:
                                    score = max(0.01, score - 0.20)

                                p_true = min(0.99, max(0.01, score))
                                p_false = 1.0 - p_true
                                p_fraud_matrix.append(p_true)
                                p_clean_matrix.append(p_false)

        cpd_fraud = TabularCPD(
            variable="Fraudulent",
            variable_card=2,
            values=[p_clean_matrix, p_fraud_matrix],
            evidence=[
                "TemplateConformance",
                "ArithmeticConsistency",
                "MetadataAnomaly",
                "EditArtifacts",
                "ExtractionQuality",
                "IssuerAttested",
            ],
            evidence_card=[3, 2, 2, 2, 2, 2],
        )

        model.add_cpds(
            cpd_template,
            cpd_arith,
            cpd_meta,
            cpd_edits,
            cpd_extract,
            cpd_issuer,
            cpd_fraud,
        )
        assert model.check_model()
        return model

    def score(
        self,
        template_conformance: str,
        has_arithmetic_failure: bool,
        has_metadata_anomaly: bool,
        has_edit_artifacts: bool,
        extraction_quality: float,
        is_issuer_attested: bool,
        blocking_failures: List[RuleEvaluation],
    ) -> Tuple[int, float, int]:
        evidence = {
            "TemplateConformance": 0 if template_conformance == "High" else (1 if template_conformance == "Medium" else 2),
            "ArithmeticConsistency": 1 if has_arithmetic_failure else 0,
            "MetadataAnomaly": 1 if has_metadata_anomaly else 0,
            "EditArtifacts": 1 if has_edit_artifacts else 0,
            "ExtractionQuality": 0 if extraction_quality >= 0.70 else 1,
            "IssuerAttested": 0 if is_issuer_attested else 1,
        }

        result = self.inference.query(variables=["Fraudulent"], evidence=evidence, show_progress=False)
        p_fraud = float(result.values[1])

        margin = 2.0 * abs(p_fraud - 0.5)
        raw_conf = (0.5 * margin + 0.5 * extraction_quality) * 10000
        confidence_bps = int(min(9900, max(1000, raw_conf)))

        if blocking_failures:
            verdict = VerdictEnum.REJECTED
            p_fraud = max(p_fraud, 0.85)
            confidence_bps = max(confidence_bps, 9500)
            return int(verdict), p_fraud, confidence_bps

        if extraction_quality < 0.70:
            return int(VerdictEnum.BORDERLINE), p_fraud, int(extraction_quality * 7000)

        if p_fraud >= 0.60:
            return int(VerdictEnum.REJECTED), p_fraud, confidence_bps

        if p_fraud < 0.15:
            return int(VerdictEnum.APPROVED), p_fraud, confidence_bps

        return int(VerdictEnum.BORDERLINE), p_fraud, confidence_bps


fraud_scorer = FraudRiskScorer()
