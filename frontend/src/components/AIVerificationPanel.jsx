import { useState, useRef } from "react";
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Lock,
  Upload,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import AIBadge from "./AIBadge";
import { useAIVerification } from "../hooks/useAIVerification";
import { DOC_TYPE_LABELS } from "../config/contracts";

/**
 * Interactive AI Document Verification & On-Chain Attestation Panel.
 */
export default function AIVerificationPanel({
  doc, // { id, docHash, docType, status, issuer }
  contracts,
  onAnchored = () => {},
  onClose = () => {},
}) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showTechnicalTrace, setShowTechnicalTrace] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const {
    status,
    loading,
    error,
    computedHash,
    result,
    txHash,
    prepareVerification,
    confirmConsentAndAnalyze,
    anchorAttestation,
    reset,
  } = useAIVerification(contracts);

  const handleFileSelected = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);

    const ok = await prepareVerification({
      fileToVerify: f,
      targetDocId: doc.id,
      targetDocType: doc.docType,
      expectedDocHash: doc.docHash,
    });

    if (ok) {
      setShowConsentModal(true);
    }
  };

  const handleConsentConfirmed = async () => {
    setShowConsentModal(false);
    await confirmConsentAndAnalyze(false);
  };

  const handleAnchor = async () => {
    try {
      const hash = await anchorAttestation();
      if (hash) {
        onAnchored(doc.id, hash);
      }
    } catch (e) {
      console.error("Anchoring failed:", e);
    }
  };

  return (
    <div className="card" style={{ padding: "20px", marginTop: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb",
            }}
          >
            <Shield size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>
              AI Document Verification Layer
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Content validation, arithmetic reconciliation, forensic anomaly detection & EIP-712 attestation
            </p>
          </div>
        </div>

        {result && <AIBadge verdict={result.verdict} confidenceBps={result.confidence_bps} />}
      </div>

      {/* Target Doc Metadata */}
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <span style={{ color: "#6b7280" }}>Document Type: </span>
          <strong>{DOC_TYPE_LABELS[doc.docType] || "Document"}</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#6b7280" }}>On-Chain Hash: </span>
          <span className="hash-tag">{doc.docHash ? `${doc.docHash.slice(0, 10)}…${doc.docHash.slice(-8)}` : "—"}</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert-box error" style={{ marginBottom: "16px" }}>
          <XCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <div style={{ fontWeight: 600 }}>
              {result ? "On-Chain Anchoring Failed" : "Verification Blocked"}
            </div>
            <div style={{ fontSize: "12.5px" }}>{error}</div>
          </div>
        </div>
      )}

      {/* State 1: File Selection & Local Re-hash */}
      {status === "idle" && (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            style={{ display: "none" }}
            accept=".pdf,.png,.jpg,.jpeg"
          />
          <div
            className="clean-dropzone"
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: "20px 16px" }}
          >
            <Upload size={28} className="dropzone-icon" />
            <div className="dropzone-prompt">Select Document File to Verify</div>
            <div className="dropzone-subtext">
              Rehashes locally in browser to confirm keccak256 matches on-chain docHash
            </div>
          </div>
        </div>
      )}

      {/* State 2: Hashing or Analyzing */}
      {(status === "hashing" || status === "analyzing") && (
        <div style={{ textAlign: "center", padding: "28px 16px" }}>
          <RefreshCw size={26} className="spinner-icon" style={{ color: "#2563eb", margin: "0 auto 12px" }} />
          <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-main)" }}>
            {status === "hashing" ? "Recomputing Local keccak256 Hash…" : "AI Verification Engine Analyzing Content…"}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            {status === "hashing"
              ? "Verifying exact byte-level match against on-chain registration"
              : "Running layout extraction, template matching, arithmetic rule solver, and forensic signal detector"}
          </div>
        </div>
      )}

      {/* State 3: Result Display */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Summary Box */}
          <div
            style={{
              background: result.verdict === 0 ? "#f0fdf4" : result.verdict === 1 ? "#fffbeb" : "#fef2f2",
              border: `1px solid ${result.verdict === 0 ? "#bbf7d0" : result.verdict === 1 ? "#fde68a" : "#fecaca"}`,
              borderRadius: "8px",
              padding: "12px 16px",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "13px", color: "#111827", marginBottom: "4px" }}>
              AI Verification Summary
            </div>
            <p style={{ fontSize: "13px", color: "#374151", margin: 0, lineHeight: 1.45 }}>
              {result.summary}
            </p>
          </div>

          {/* Extracted Masked Fields */}
          {result.extracted_fields && Object.keys(result.extracted_fields).length > 0 && (
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px 14px" }}>
              <div style={{ fontWeight: 700, fontSize: "12.5px", color: "var(--text-main)", marginBottom: "8px" }}>
                Extracted Fields (Masked for Privacy)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                {Object.entries(result.extracted_fields).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
                    <span style={{ color: "#6b7280", textTransform: "capitalize" }}>{k.replace(/_/g, " ")}:</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{v != null ? String(v) : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deterministic Rule Checks */}
          {result.checks && result.checks.length > 0 && (
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px 14px" }}>
              <div style={{ fontWeight: 700, fontSize: "12.5px", color: "var(--text-main)", marginBottom: "8px" }}>
                Deterministic Rule Evaluations ({result.checks.filter((c) => c.passed).length}/{result.checks.length} Passed)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {result.checks.map((chk, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      background: chk.passed ? "#f8fafc" : "#fef2f2",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      {chk.passed ? (
                        <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
                      ) : (
                        <XCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: chk.passed ? "#1e293b" : "#991b1b" }}>
                          {chk.description || chk.rule_id}
                        </div>
                        {chk.proof && (
                          <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>
                            {chk.proof}
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`status-badge ${chk.passed ? "badge-approved" : "badge-rejected"}`}
                      style={{ fontSize: "10.5px", padding: "1px 6px" }}
                    >
                      {chk.passed ? "Pass" : "Fail"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forensic Signals */}
          {result.signals && result.signals.length > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "12.5px", color: "#92400e", marginBottom: "8px" }}>
                <AlertTriangle size={15} />
                <span>Forensic Signals Detected ({result.signals.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {result.signals.map((sig, idx) => (
                  <div key={idx} style={{ fontSize: "12px", color: "#78350f" }}>
                    <strong>{sig.code}:</strong> {sig.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Trace Collapsible */}
          {result.technical_trace && (
            <div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowTechnicalTrace(!showTechnicalTrace)}
                style={{ width: "100%", justifyContent: "space-between" }}
              >
                <span>Technical Trace & Proof Chain</span>
                {showTechnicalTrace ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {showTechnicalTrace && (
                <pre
                  style={{
                    background: "#0f172a",
                    color: "#f8fafc",
                    padding: "12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    overflowX: "auto",
                    marginTop: "8px",
                  }}
                >
                  {result.technical_trace}
                </pre>
              )}
            </div>
          )}

          {/* Anchoring Section */}
          <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                Cryptographic Attestation (EIP-712)
              </div>
              <div style={{ fontSize: "11.5px", color: "#6b7280" }}>
                {status === "anchored" || txHash
                  ? "Anchored securely on Ethereum Sepolia"
                  : "Signed by AI service, ready to anchor on Sepolia"}
              </div>
            </div>

            {status === "anchored" || txHash ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="status-badge badge-approved">
                  <ShieldCheck size={13} />
                  <span>Anchored On-Chain</span>
                </span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  <ExternalLink size={12} />
                  <span>Tx</span>
                </a>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAnchor}
                disabled={loading || status === "anchoring" || !result.attestation}
              >
                <ShieldCheck size={14} />
                <span>{status === "anchoring" ? "Submitting to Sepolia…" : "Anchor AI Result on Sepolia"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {showConsentModal && (
        <div className="modal-backdrop" onClick={() => setShowConsentModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-card-header">
              <span className="modal-card-title">Document Privacy & AI Consent</span>
              <button className="btn btn-outline btn-sm" onClick={() => setShowConsentModal(false)}>✕</button>
            </div>
            <div className="modal-card-body">
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                    flexShrink: 0,
                  }}
                >
                  <Lock size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                    Ephemeral Local Processing Notice
                  </h4>
                  <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.45 }}>
                    Your document will be sent to the LoanChain AI Verification Service strictly for content and arithmetic validation.
                  </p>
                </div>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px", fontSize: "12px", color: "#475569" }}>
                <ul style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <li>Raw files and unmasked PII are <strong>never persisted or logged</strong>.</li>
                  <li>Processing occurs in memory and is wiped immediately in a secure <code>finally</code> block.</li>
                  <li>Only an explanation hash and masked values (e.g. <code>XXXX1234</code>) are stored.</li>
                  <li>A cryptographic signature is generated for you to anchor on Sepolia.</li>
                </ul>
              </div>
            </div>
            <div className="modal-card-footer">
              <button className="btn btn-outline" onClick={() => setShowConsentModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleConsentConfirmed}>
                I Consent & Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
