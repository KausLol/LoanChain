import { CheckCircle2, AlertTriangle, Calculator, Info } from "lucide-react";

export default function AIAffordabilityCard({ affordability, compact = false }) {
  if (!affordability) return null;

  const {
    monthly_income,
    existing_obligations,
    current_dti_pct,
    safe_emi_min,
    safe_emi_max,
    proposed_loan_amount_eth,
    proposed_emi_inr,
    projected_dti_pct,
    proposed_tenure_months,
    suggested_loan_amount_eth,
    suggested_tenure_months,
    affordability_verdict,
    is_affordable,
    confidence,
    summary,
    advisory_notes,
  } = affordability;

  const isGood = is_affordable && (projected_dti_pct == null || projected_dti_pct <= 45.0);
  const isModerate = is_affordable && projected_dti_pct != null && projected_dti_pct > 45.0;

  // Solid, non-neon fintech status colors
  const badgeBg = isGood ? "#f0fdf4" : isModerate ? "#fffbeb" : "#fef2f2";
  const badgeColor = isGood ? "#166534" : isModerate ? "#92400e" : "#991b1b";
  const badgeBorder = isGood ? "#bbf7d0" : isModerate ? "#fde68a" : "#fecaca";

  const roundedIncome = Math.round(Number(monthly_income) || 0);
  const roundedObligations = Math.round(Number(existing_obligations) || 0);
  const roundedSafeMin = Math.round(Number(safe_emi_min) || 0);
  const roundedSafeMax = Math.round(Number(safe_emi_max) || 0);
  const roundedProposedEmi = proposed_emi_inr != null ? Math.round(Number(proposed_emi_inr)) : null;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid var(--border-color)",
        borderRadius: "6px",
        padding: compact ? "12px" : "14px 16px",
        marginTop: "12px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          paddingBottom: "10px",
          borderBottom: "1px solid var(--border-color)",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Calculator size={15} color="#1e3a5f" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
            Loan Affordability Analysis
          </span>
          <span
            style={{
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "3px",
              background: "#f1f5f9",
              color: "#475569",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Advisory
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "11.5px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "3px",
              background: badgeBg,
              color: badgeColor,
              border: `1px solid ${badgeBorder}`,
            }}
          >
            {affordability_verdict}
          </span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            ({confidence} Conf.)
          </span>
        </div>
      </div>

      {/* Metrics 2x2 Grid (Prevents text wrapping) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        {/* Metric 1: Income */}
        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Verified Monthly Income</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>
            ₹{roundedIncome.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
            Net cash flow after tax
          </div>
        </div>

        {/* Metric 2: Existing Debt */}
        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Existing Monthly Debt</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>
            ₹{roundedObligations.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
            Current DTI: <strong style={{ color: "#475569" }}>{current_dti_pct}%</strong>
          </div>
        </div>

        {/* Metric 3: Safe EMI Capacity */}
        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Safe EMI Capacity (40%–50% FOIR)</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#166534", marginTop: "2px", whiteSpace: "nowrap" }}>
            ₹{roundedSafeMin.toLocaleString("en-IN")} – ₹{roundedSafeMax.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
            Max recommended monthly ceiling
          </div>
        </div>

        {/* Metric 4: Proposed Loan EMI */}
        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Proposed Loan EMI</div>
          {roundedProposedEmi != null ? (
            <>
              <div style={{ fontSize: "15px", fontWeight: 700, color: is_affordable ? "#166534" : "#991b1b", marginTop: "2px" }}>
                ₹{roundedProposedEmi.toLocaleString("en-IN")} / mo
              </div>
              <div style={{ fontSize: "11px", color: is_affordable ? "#166534" : "#991b1b", marginTop: "2px" }}>
                Projected DTI: <strong>{projected_dti_pct}%</strong>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", marginTop: "2px" }}>
                Pending Loan Terms
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                Calculated on application
              </div>
            </>
          )}
        </div>
      </div>

      {/* DTI Assessment Banner */}
      {roundedProposedEmi != null && (
        <div
          style={{
            padding: "9px 12px",
            borderRadius: "4px",
            background: isGood ? "#f0fdf4" : isModerate ? "#fffbeb" : "#fef2f2",
            border: `1px solid ${isGood ? "#bbf7d0" : isModerate ? "#fde68a" : "#fecaca"}`,
            fontSize: "12px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            color: isGood ? "#166534" : isModerate ? "#92400e" : "#991b1b",
          }}
        >
          {isGood ? (
            <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
          ) : (
            <AlertTriangle size={15} color={isModerate ? "#d97706" : "#dc2626"} style={{ flexShrink: 0, marginTop: "2px" }} />
          )}
          <div style={{ flex: 1, lineHeight: "1.4" }}>
            {is_affordable ? (
              <span>
                <strong>Within Safe Repayment Capacity:</strong> Proposed monthly repayments require <strong>{projected_dti_pct}%</strong> of verified income, safely below the 50.0% FOIR ceiling.
              </span>
            ) : (
              <span>
                <strong>Debt Burden Exceeds Safe Capacity:</strong> Proposed repayments require <strong>{projected_dti_pct}%</strong> of verified income (safe limit is 50.0%). The monthly payment exceeds the ₹{roundedSafeMax.toLocaleString("en-IN")} safe ceiling by ₹{Math.max(0, roundedProposedEmi - roundedSafeMax).toLocaleString("en-IN")}/month.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Advisory Counter-Offer Suggestions */}
      {!is_affordable && (suggested_loan_amount_eth != null || suggested_tenure_months != null) && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            padding: "10px 12px",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Advisory Counter-Offer Terms (To Fit ₹{roundedSafeMax.toLocaleString("en-IN")} Safe Ceiling)
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: suggested_loan_amount_eth != null && suggested_tenure_months != null ? "1fr 1fr" : "1fr",
              gap: "8px",
            }}
          >
            {suggested_loan_amount_eth != null && (
              <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "8px 10px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Option 1: Adjusted Principal</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>
                  {suggested_loan_amount_eth} ETH
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  Fits safe EMI at requested {proposed_tenure_months || 12} mo tenure
                </div>
              </div>
            )}
            {suggested_tenure_months != null && (
              <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "8px 10px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Option 2: Extended Tenure</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>
                  {suggested_tenure_months} Months
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  Spreads repayments to fit safe EMI capacity
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Underwriting Summary Callout */}
      {summary && (
        <div
          style={{
            fontSize: "12px",
            background: "#f8fafc",
            borderLeft: `3px solid ${isGood ? "#16a34a" : isModerate ? "#d97706" : "#dc2626"}`,
            padding: "8px 12px",
            borderRadius: "0 4px 4px 0",
            color: "#334155",
            lineHeight: 1.45,
            marginBottom: "10px",
          }}
        >
          <div style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", marginBottom: "2px" }}>
            Underwriting Assessment
          </div>
          <div>{summary}</div>
        </div>
      )}

      {/* Detailed Reconciled Facts List */}
      {advisory_notes && advisory_notes.length > 0 && (
        <div style={{ marginBottom: "10px", paddingLeft: "4px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
            Reconciled Evidence:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {advisory_notes.map((note, idx) => (
              <div key={idx} style={{ fontSize: "11.5px", color: "#475569", display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ color: "#94a3b8" }}>•</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Human-in-the-loop disclaimer */}
      <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "5px", paddingTop: "6px", borderTop: "1px solid var(--border-color)" }}>
        <Info size={12} color="#64748b" style={{ flexShrink: 0 }} />
        <span>
          Advisory recommendation only. The authorized loan officer and smart contract retain authoritative credit approval.
        </span>
      </div>
    </div>
  );
}
