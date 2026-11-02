import { CheckCircle2, AlertTriangle, XCircle, Shield, HelpCircle } from "lucide-react";
import { AI_VERDICT_LABELS, AI_VERDICT_BADGES } from "../config/contracts";

/**
 * Visual badge indicating AI verification status and confidence score.
 *
 * @param {Object} props
 * @param {number|null} props.verdict 0 = Approved, 1 = Borderline, 2 = Rejected, null = Unverified
 * @param {number|null} [props.confidenceBps] Confidence in basis points (e.g. 9850 -> 98.5%)
 * @param {boolean} [props.showConfidence=true]
 * @param {string} [props.size='md'] 'sm' or 'md'
 */
export default function AIBadge({ verdict, confidenceBps = null, showConfidence = true, size = "md" }) {
  if (verdict == null || verdict === undefined) {
    return (
      <span
        className="status-badge badge-submitted"
        style={{ fontSize: size === "sm" ? "11px" : "12px", padding: size === "sm" ? "2px 8px" : "3px 10px" }}
      >
        <HelpCircle size={size === "sm" ? 11 : 13} />
        <span>AI: Unverified</span>
      </span>
    );
  }

  const numVerdict = Number(verdict);
  const badgeClass = AI_VERDICT_BADGES[numVerdict] || "badge-submitted";
  const label = AI_VERDICT_LABELS[numVerdict] || "Unknown";

  let Icon = Shield;
  if (numVerdict === 0) Icon = CheckCircle2;
  else if (numVerdict === 1) Icon = AlertTriangle;
  else if (numVerdict === 2) Icon = XCircle;

  const confidencePct =
    confidenceBps != null ? `${(confidenceBps / 100).toFixed(1)}%` : null;

  return (
    <span
      className={`status-badge ${badgeClass}`}
      style={{
        fontSize: size === "sm" ? "11px" : "12.5px",
        padding: size === "sm" ? "2px 8px" : "3px 10px",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
      }}
      title={`AI Model Verdict: ${label}${confidencePct ? ` (${confidencePct} confidence)` : ""}`}
    >
      <Icon size={size === "sm" ? 12 : 14} style={{ flexShrink: 0 }} />
      <span>
        AI {label}
        {showConfidence && confidencePct ? ` (${confidencePct})` : ""}
      </span>
    </span>
  );
}
