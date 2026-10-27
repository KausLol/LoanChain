import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useLoans } from "../hooks/useBlockchain";
import { LOAN_STATUS_LABELS } from "../config/contracts";
import { History, User, ArrowRight, RefreshCw } from "lucide-react";
import { ethers } from "ethers";

function formatDateTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortAddr(addr) {
  if (!addr || addr === ethers.ZeroAddress) return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
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

export default function AuditTrailPage() {
  const { account, contracts } = useWeb3();
  const { getAllLoans, getLoanAuditTrail } = useLoans(contracts);

  const [loans, setLoans] = useState([]);
  const [docAudit, setDocAudit] = useState([]);
  const [loanAudit, setLoanAudit] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState("");
  const [tab, setTab] = useState("loan");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!contracts) return;
    setRefreshing(true);
    try {
      const all = await getAllLoans();
      setLoans(all || []);
      if (all && all.length > 0 && !selectedLoan) {
        setSelectedLoan(all[0].id);
      }
    } catch (e) {
      console.error(e);
      setLoans([]);
    } finally {
      setRefreshing(false);
    }
  }, [contracts, getAllLoans, selectedLoan]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadLoanAudit = useCallback(async (id) => {
    if (!contracts || !id) {
      setLoanAudit([]);
      return;
    }
    try {
      const entries = await getLoanAuditTrail(id);
      setLoanAudit(entries || []);
    } catch {
      setLoanAudit([]);
    }
  }, [contracts, getLoanAuditTrail]);

  const loadDocAudit = useCallback(async () => {
    if (!contracts) {
      setDocAudit([]);
      return;
    }
    try {
      const total = await contracts.documentRegistry.getAuditLogLength();
      const entries = [];
      const n = Math.min(Number(total), 50);
      for (let i = 0; i < n; i++) {
        const e = await contracts.documentRegistry.getAuditEntry(i);
        entries.push({ docId: e[0], actor: e[1], action: e[2], timestamp: Number(e[3]) });
      }
      setDocAudit(entries.reverse());
    } catch {
      setDocAudit([]);
    }
  }, [contracts]);

  useEffect(() => {
    if (tab === "loan" && selectedLoan) loadLoanAudit(selectedLoan);
    if (tab === "doc") loadDocAudit();
  }, [tab, selectedLoan, loadLoanAudit, loadDocAudit]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">
            Tamper-evident, immutable on-chain record of all document events and loan state transitions on Sepolia
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? "spinner-icon" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button
          className={`btn btn-sm ${tab === "loan" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setTab("loan")}
        >
          Loan State Transitions
        </button>
        <button
          className={`btn btn-sm ${tab === "doc" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setTab("doc")}
        >
          Document Audit Trail
        </button>
      </div>

      {tab === "loan" && (
        <div className="card">
          <div className="card-title-row">
            <h2 className="card-title">State Machine Audit Trail</h2>
            {loans.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>Select Loan:</span>
                <select
                  className="form-control"
                  style={{ width: "auto", padding: "4px 10px", fontSize: "12.5px" }}
                  value={selectedLoan}
                  onChange={(e) => setSelectedLoan(e.target.value)}
                >
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>
                      Loan #{l.id} ({l.purpose})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loans.length === 0 ? (
            <div className="empty-placeholder">
              <History size={36} className="empty-placeholder-icon" />
              <div className="empty-placeholder-title">No Loans Recorded Yet</div>
              <p className="empty-placeholder-desc">
                When loan applications are submitted and processed through smart contracts, state transitions will be logged here.
              </p>
            </div>
          ) : loanAudit.length === 0 ? (
            <div className="empty-placeholder">
              <History size={32} className="empty-placeholder-icon" />
              <div className="empty-placeholder-title">No Transitions For This Loan</div>
              <p className="empty-placeholder-desc">No state transitions recorded for Loan #{selectedLoan}.</p>
            </div>
          ) : (
            <div className="activity-timeline" style={{ paddingLeft: "24px", marginTop: "16px" }}>
              {loanAudit.map((entry, idx) => (
                <div key={idx} className="activity-item" style={{ padding: "14px 0" }}>
                  <div className="activity-dot green" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <StatusBadge status={entry.fromStatus} />
                      <ArrowRight size={13} color="#94a3b8" />
                      <StatusBadge status={entry.toStatus} />
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
                      {entry.note}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                      <User size={12} />
                      <span>Actor: {shortAddr(entry.actor)}</span>
                    </div>
                  </div>
                  <div className="activity-meta">
                    <span className="activity-date">{formatDateTime(entry.timestamp)}</span>
                    <span className="status-badge badge-verified" style={{ fontSize: "11px", padding: "1px 6px" }}>
                      Verified on Sepolia
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "doc" && (
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: "16px" }}>Document Events Ledger</h2>
          {docAudit.length === 0 ? (
            <div className="empty-placeholder">
              <History size={36} className="empty-placeholder-icon" />
              <div className="empty-placeholder-title">No Document Events Recorded</div>
              <p className="empty-placeholder-desc">
                When document hashes are uploaded, attested, or verified, audit logs will be recorded on-chain.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document ID</th>
                    <th>Action</th>
                    <th>Signer / Actor</th>
                    <th>Timestamp</th>
                    <th>Ledger Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {docAudit.map((e, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="hash-tag">{e.docId.slice(0, 12)}…</span>
                      </td>
                      <td>
                        <span className="status-badge badge-verified">{e.action}</span>
                      </td>
                      <td>{shortAddr(e.actor)}</td>
                      <td>{formatDateTime(e.timestamp)}</td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 500 }}>
                          EVM Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
