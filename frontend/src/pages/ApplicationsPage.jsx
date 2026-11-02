import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useLoans } from "../hooks/useBlockchain";
import { LOAN_STATUS_LABELS } from "../config/contracts";
import AIBadge from "../components/AIBadge";
import { verifyDocumentBundle } from "../services/aiService";
import {
  Plus,
  RefreshCw,
  FileSpreadsheet,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { ethers } from "ethers";

function shortAddr(addr) {
  if (!addr || addr === ethers.ZeroAddress) return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }) {
  const badgeClasses = {
    0: "badge-submitted",
    1: "badge-verified",
    2: "badge-review",
    3: "badge-approved",
    4: "badge-rejected",
    5: "badge-counter",
    6: "badge-disbursed",
    7: "badge-repaid",
    8: "badge-needsdocs",
  };

  return (
    <span className={`status-badge ${badgeClasses[status] || "badge-submitted"}`}>
      {LOAN_STATUS_LABELS[status] || "Submitted"}
    </span>
  );
}

export default function ApplicationsPage({ setPage }) {
  const { account, contracts, isOwner, isOfficer } = useWeb3();
  const { getMyLoans, getAllLoans, officerAction } = useLoans(contracts);

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [loanDocIds, setLoanDocIds] = useState([]);
  const [bundleVerdict, setBundleVerdict] = useState(null); // { verdict, attestedCount }
  const [strictAIRequired, setStrictAIRequired] = useState(false);
  const [docAttestations, setDocAttestations] = useState({});
  const [bundleFiles, setBundleFiles] = useState([]);
  const [bundleResult, setBundleResult] = useState(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleErr, setBundleErr] = useState(null);

  // Load document and AI attestation bundle details when selectedLoan changes
  useEffect(() => {
    if (!contracts || !selectedLoan) {
      setLoanDocIds([]);
      setBundleVerdict(null);
      setStrictAIRequired(false);
      setDocAttestations({});
      setBundleResult(null);
      setBundleFiles([]);
      setBundleErr(null);
      return;
    }

    let active = true;
    (async () => {
      try {
        const ids = await contracts.loanApplication.getLoanDocIds(selectedLoan.id);
        if (!active) return;
        const rawIds = Array.from(ids);
        setLoanDocIds(rawIds);

        // Check strict policy
        try {
          const req = await contracts.loanApplication.requireAIForDocsVerified();
          if (active) setStrictAIRequired(req);
        } catch {
          if (active) setStrictAIRequired(false);
        }

        // Query AIAttestation
        if (contracts.aiAttestation && rawIds.length > 0) {
          try {
            const bv = await contracts.aiAttestation.bundleVerdict(rawIds);
            if (active) {
              setBundleVerdict({
                verdict: Number(bv[0]),
                attestedCount: Number(bv[1]),
              });
            }

            const attMap = {};
            await Promise.all(
              rawIds.map(async (docId) => {
                try {
                  const has = await contracts.aiAttestation.hasAttestation(docId);
                  if (has) {
                    const att = await contracts.aiAttestation.getLatestAttestation(docId);
                    attMap[docId] = {
                      verdict: Number(att[2]),
                      confidenceBps: Number(att[3]),
                      templateRef: att[4],
                      explanationHash: att[6],
                    };
                  }
                } catch (e) {
                  console.warn("Failed checking attestation for", docId, e);
                }
              })
            );
            if (active) setDocAttestations(attMap);
          } catch (e) {
            console.warn("bundleVerdict query failed:", e);
          }
        }
      } catch (err) {
        console.warn("Failed to load loan documents:", err);
      }
    })();

    return () => {
      active = false;
    };
  }, [contracts, selectedLoan]);

  const handleBundleVerify = async (e) => {
    e.preventDefault();
    if (bundleFiles.length === 0) return;
    setBundleLoading(true);
    setBundleErr(null);
    try {
      // Build doc types based on indices or default
      const types = bundleFiles.map((_, i) => (i < 3 ? i : 5));
      const res = await verifyDocumentBundle({
        files: bundleFiles,
        docIds: loanDocIds.slice(0, bundleFiles.length),
        docTypes: types,
        loanId: selectedLoan?.id,
        skipChainCheck: false,
      });
      setBundleResult(res);
    } catch (err) {
      setBundleErr(err.message || "Bundle verification failed");
    } finally {
      setBundleLoading(false);
    }
  };

  const loadLoans = useCallback(async () => {
    if (!contracts || !account) {
      setLoans([]);
      return;
    }
    setLoading(true);
    try {
      // If officer/owner, can see all loans or their own loans
      const result = isOwner || isOfficer ? await getAllLoans() : await getMyLoans(account);
      setLoans(result || []);
    } catch (e) {
      console.error(e);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, [contracts, account, isOwner, isOfficer, getMyLoans, getAllLoans]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const handleOfficerAction = async (action, loanId, ...args) => {
    try {
      await officerAction(action, loanId, ...args);
      setActionMsg(`Action '${action}' recorded on Sepolia.`);
      await loadLoans();
    } catch (err) {
      setActionMsg(err.reason || err.message);
    }
  };

  const filtered = loans.filter((l) => {
    if (filter === "all") return true;
    return l.status === parseInt(filter);
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">
            {isOwner || isOfficer
              ? "Officer Portal: Review and manage loan applications across the network"
              : "Track and manage your submitted loan applications on Sepolia"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-outline btn-sm" onClick={loadLoans} disabled={loading}>
            <RefreshCw size={13} className={loading ? "spinner-icon" : ""} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setPage("new-loan")}>
            <Plus size={14} />
            <span>New Application</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="alert-box info" style={{ marginBottom: "16px" }}>
          <CheckCircle2 size={16} />
          <div>{actionMsg}</div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
        {["all", "0", "1", "2", "3", "4", "5", "8"].map((st) => (
          <button
            key={st}
            className={`btn btn-sm ${filter === st ? "btn-primary" : "btn-outline"}`}
            onClick={() => setFilter(st)}
          >
            {st === "all" ? "All" : LOAN_STATUS_LABELS[parseInt(st)]}
          </button>
        ))}
      </div>

      <div className="card">
        {loans.length === 0 ? (
          <div className="empty-placeholder">
            <FileSpreadsheet size={36} className="empty-placeholder-icon" />
            <div className="empty-placeholder-title">No Applications Found</div>
            <p className="empty-placeholder-desc">
              There are no loan applications submitted on-chain yet.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => setPage("new-loan")}>
              <Plus size={14} />
              <span>Submit New Application</span>
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Purpose</th>
                  <th>Applicant</th>
                  <th>Amount</th>
                  <th>Tenure</th>
                  <th>Status</th>
                  <th>Submitted On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((loan) => (
                  <tr key={loan.id}>
                    <td style={{ fontWeight: 700 }}>#{loan.id}</td>
                    <td style={{ fontWeight: 600, color: "var(--text-main)" }}>{loan.purpose}</td>
                    <td>
                      <span className="hash-tag">{shortAddr(loan.applicant)}</span>
                    </td>
                    <td>{parseFloat(loan.amount).toFixed(4)} ETH</td>
                    <td>{loan.tenure} mo</td>
                    <td><StatusBadge status={loan.status} /></td>
                    <td>{formatDate(loan.submittedAt)}</td>
                    <td>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setSelectedLoan(loan)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLoan && (
        <div className="modal-backdrop" onClick={() => setSelectedLoan(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <span className="modal-card-title">Loan Application #{selectedLoan.id}</span>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedLoan(null)}>✕</button>
            </div>
            <div className="modal-card-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "#6b7280" }}>Applicant Address</span>
                  <span className="hash-tag">{shortAddr(selectedLoan.applicant)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "#6b7280" }}>Loan Amount</span>
                  <span style={{ fontWeight: 600 }}>{selectedLoan.amount} ETH</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "#6b7280" }}>Tenure</span>
                  <span>{selectedLoan.tenure} Months</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "#6b7280" }}>Interest Rate</span>
                  <span>{(parseInt(selectedLoan.interestRate || 0) / 100).toFixed(2)}% p.a.</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "#6b7280" }}>Current Status</span>
                  <StatusBadge status={selectedLoan.status} />
                </div>

                {/* AI Attestation & Bundle Status */}
                <div style={{ marginTop: "10px", padding: "12px", background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13px", color: "var(--text-main)" }}>
                      <Shield size={16} color="#2563eb" />
                      <span>On-Chain AI Attestation Bundle</span>
                    </div>
                    {bundleVerdict != null && (
                      <AIBadge verdict={bundleVerdict.verdict} showConfidence={false} size="sm" />
                    )}
                  </div>

                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                    <span>Attested Documents: <strong>{bundleVerdict?.attestedCount || 0} / {loanDocIds.length}</strong></span>
                    <span>Policy: <strong>{strictAIRequired ? "Strict AI Gating Active" : "Advisory Mode"}</strong></span>
                  </div>

                  {loanDocIds.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {loanDocIds.map((docId, idx) => {
                        const att = docAttestations[docId];
                        return (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "#ffffff",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              fontSize: "12px",
                            }}
                          >
                            <span className="hash-tag">{docId.slice(0, 10)}…{docId.slice(-8)}</span>
                            <AIBadge verdict={att?.verdict} confidenceBps={att?.confidenceBps} size="sm" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Verification Status Summary */}
                  {loanDocIds.length > 0 && (
                    <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border-color)" }}>
                      {bundleVerdict?.attestedCount === loanDocIds.length ? (
                        bundleVerdict.verdict === 0 ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              background: "#f0fdf4",
                              border: "1px solid #bbf7d0",
                              borderRadius: "6px",
                              padding: "9px 12px",
                              fontSize: "12px",
                              color: "#166534",
                            }}
                          >
                            <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                            <span>
                              <strong>Verified on Sepolia:</strong> All attached documents ({loanDocIds.length} of {loanDocIds.length}) have valid cryptographic AI attestations anchored on-chain.
                            </span>
                          </div>
                        ) : bundleVerdict.verdict === 2 ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              background: "#fef2f2",
                              border: "1px solid #fecaca",
                              borderRadius: "6px",
                              padding: "9px 12px",
                              fontSize: "12px",
                              color: "#991b1b",
                            }}
                          >
                            <XCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                            <span>
                              <strong>AI Attestation Rejected:</strong> One or more documents failed cryptographic content verification.
                            </span>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              background: "#fffbeb",
                              border: "1px solid #fef3c7",
                              borderRadius: "6px",
                              padding: "9px 12px",
                              fontSize: "12px",
                              color: "#92400e",
                            }}
                          >
                            <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
                            <span>
                              <strong>Under Review:</strong> AI attestation flagged warnings requiring manual officer review.
                            </span>
                          </div>
                        )
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "#fffbeb",
                            border: "1px solid #fef3c7",
                            borderRadius: "6px",
                            padding: "9px 12px",
                            fontSize: "12px",
                            color: "#92400e",
                          }}
                        >
                          <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
                          <span>
                            <strong>Pending AI Verification:</strong> {loanDocIds.length - (bundleVerdict?.attestedCount || 0)} of {loanDocIds.length} document(s) in this application do not have an on-chain AI attestation.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Officer Cross-Document Consistency Audit (Only for multi-document applications) */}
                  {(isOwner || isOfficer) && loanDocIds.length > 1 && (
                    <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px" }}>
                        Officer Cross-Document Consistency Audit (Optional)
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#6b7280", marginBottom: "8px" }}>
                        Select the {loanDocIds.length} original files to reconcile names, employers, and salary figures across documents.
                      </div>
                      {!bundleResult ? (
                        <div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                              type="file"
                              multiple
                              onChange={(e) => setBundleFiles(Array.from(e.target.files || []))}
                              className="form-control"
                              style={{ fontSize: "12px", padding: "4px 8px" }}
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={handleBundleVerify}
                              disabled={bundleLoading || bundleFiles.length === 0}
                              style={{ flexShrink: 0 }}
                            >
                              {bundleLoading ? "Analyzing Bundle…" : "Run Bundle AI Check"}
                            </button>
                          </div>
                          {bundleErr && (
                            <div style={{ color: "#dc2626", fontSize: "11.5px", marginTop: "4px" }}>
                              {bundleErr}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "#ffffff", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 700, fontSize: "12.5px" }}>
                              Suggested Officer Action: <span style={{ color: bundleResult.verdict === 0 ? "#15803d" : bundleResult.verdict === 1 ? "#b45309" : "#b91c1c" }}>{bundleResult.suggested_action}</span>
                            </span>
                            <AIBadge verdict={bundleResult.verdict} confidenceBps={bundleResult.confidence_bps} size="sm" />
                          </div>
                          <div style={{ fontSize: "12px", color: "#4b5563" }}>
                            {bundleResult.summary}
                          </div>
                          {bundleResult.bundle_checks && bundleResult.bundle_checks.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                              {bundleResult.bundle_checks.map((chk, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px" }}>
                                  {chk.passed ? (
                                    <CheckCircle2 size={13} color="#16a34a" />
                                  ) : (
                                    <XCircle size={13} color="#dc2626" />
                                  )}
                                  <span>{chk.description}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedLoan.rejectionReason && (
                  <div className="alert-box error" style={{ marginTop: "8px" }}>
                    <XCircle size={16} />
                    <div><strong>Rejection Reason:</strong> {selectedLoan.rejectionReason}</div>
                  </div>
                )}

                {/* Officer Controls (Only visible to contract owner or officers) */}
                {(isOwner || isOfficer) && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
                      Officer Execution Controls
                    </div>
                    {strictAIRequired && (bundleVerdict?.verdict === 2 || (bundleVerdict?.attestedCount || 0) < loanDocIds.length) && (
                      <div className="alert-box warning" style={{ marginBottom: "10px", fontSize: "11.5px" }}>
                        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
                        <div>
                          <strong>Strict AI Enforcement:</strong> Cannot mark documents verified on-chain.
                          {bundleVerdict?.verdict === 2
                            ? " One or more documents are rejected by the AI verification layer."
                            : ` Only ${bundleVerdict?.attestedCount || 0} of ${loanDocIds.length} documents have on-chain AI attestations.`}
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {[0, 8].includes(selectedLoan.status) && (
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={strictAIRequired && (bundleVerdict?.verdict === 2 || (bundleVerdict?.attestedCount || 0) < loanDocIds.length)}
                          onClick={() => handleOfficerAction("markDocsVerified", selectedLoan.id)}
                          title={strictAIRequired && (bundleVerdict?.verdict === 2 || (bundleVerdict?.attestedCount || 0) < loanDocIds.length) ? "Blocked by on-chain AI policy" : "Mark documents verified"}
                        >
                          Mark Docs Verified
                        </button>
                      )}
                      {selectedLoan.status === 1 && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOfficerAction("markUnderReview", selectedLoan.id)}
                        >
                          Move to Under Review
                        </button>
                      )}
                      {[2, 5].includes(selectedLoan.status) && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                          onClick={() => handleOfficerAction("approveLoan", selectedLoan.id)}
                        >
                          Approve Loan
                        </button>
                      )}
                      {selectedLoan.status === 3 && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOfficerAction("disburseLoan", selectedLoan.id)}
                        >
                          Execute Disbursal
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-card-footer">
              <button className="btn btn-outline" onClick={() => setSelectedLoan(null)}>Close</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSelectedLoan(null);
                  setPage("audit");
                }}
              >
                View Audit History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
