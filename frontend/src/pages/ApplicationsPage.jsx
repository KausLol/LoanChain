import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useLoans } from "../hooks/useBlockchain";
import { LOAN_STATUS_LABELS } from "../config/contracts";
import { Layers, Plus, RefreshCw, FileSpreadsheet, XCircle, CheckCircle2 } from "lucide-react";
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
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {[0, 8].includes(selectedLoan.status) && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOfficerAction("markDocsVerified", selectedLoan.id)}
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
