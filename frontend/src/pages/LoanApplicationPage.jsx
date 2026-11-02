import { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useLoans, useDocuments } from "../hooks/useBlockchain";
import { DOC_TYPE_LABELS } from "../config/contracts";
import AIBadge from "../components/AIBadge";
import AIAffordabilityCard from "../components/AIAffordabilityCard";
import { analyzeAffordability } from "../services/aiService";
import { Send, FileText, CheckCircle2, XCircle, AlertCircle, ChevronRight, ArrowLeft } from "lucide-react";

const PURPOSES = [
  "Personal Loan",
  "Home Purchase",
  "Home Renovation",
  "Education",
  "Business Expansion",
  "Vehicle Purchase",
  "Debt Consolidation",
  "Other",
];

function calculateEMI(amount, tenure, interestRateBps) {
  const P = parseFloat(amount);
  const n = parseInt(tenure);
  const r = (parseInt(interestRateBps) || 850) / 100 / 12 / 100;
  if (!P || !n || !r) return (P / (n || 1)).toFixed(4);
  const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return emi.toFixed(4);
}

export default function LoanApplicationPage({ setPage }) {
  const { account, contracts, connectWallet } = useWeb3();
  const { submitLoan, loading } = useLoans(contracts);
  const { getMyDocuments } = useDocuments(contracts);

  const [myDocs, setMyDocs] = useState([]);
  const [selectedDocs, setSelected] = useState([]);
  const [success, setSuccess] = useState(null);
  const [submitErr, setSubmitErr] = useState(null);
  const [step, setStep] = useState(1);
  const [affordability, setAffordability] = useState(null);
  const [affordabilityLoading, setAffordabilityLoading] = useState(false);

  const [form, setForm] = useState({
    amount: "0.5",
    tenure: "24",
    interestRate: "850",
    purpose: PURPOSES[0],
    customPurpose: "",
  });

  // Calculate advisory loan affordability based on selected parameters & documents
  useEffect(() => {
    let active = true;
    const amt = parseFloat(form.amount);
    const ten = parseInt(form.tenure);
    const rate = parseInt(form.interestRate) || 850;

    // Only analyze affordability if documents are actually selected
    if (!amt || amt <= 0 || !ten || ten <= 0 || !selectedDocs || selectedDocs.length === 0) {
      setAffordability(null);
      setAffordabilityLoading(false);
      return;
    }

    setAffordabilityLoading(true);
    analyzeAffordability({
      docIds: selectedDocs,
      loanAmount: amt,
      tenure: ten,
      interestRate: rate,
    })
      .then((res) => {
        if (active) {
          setAffordability(res);
          setAffordabilityLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Affordability preview failed:", err);
        if (active) setAffordabilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form.amount, form.tenure, form.interestRate, selectedDocs]);

  useEffect(() => {
    if (!contracts || !account) return;
    getMyDocuments(account).then(async (docs) => {
      if (!docs) {
        setMyDocs([]);
        return;
      }
      let enriched = docs;
      if (contracts.aiAttestation && docs.length > 0) {
        enriched = await Promise.all(
          docs.map(async (doc) => {
            try {
              const has = await contracts.aiAttestation.hasAttestation(doc.id);
              if (has) {
                const att = await contracts.aiAttestation.getLatestAttestation(doc.id);
                return {
                  ...doc,
                  aiAttestation: {
                    verdict: Number(att[2]),
                    confidenceBps: Number(att[3]),
                    templateRef: att[4],
                  },
                };
              }
            } catch (err) {
              console.warn("Could not query AI attestation for doc", doc.id, err);
            }
            return doc;
          })
        );
      }
      setMyDocs(enriched);
      // User selects documents in Step 2; do not pre-select automatically on initial load
    });
  }, [contracts, account, getMyDocuments]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleDoc = (docId) =>
    setSelected((prev) =>
      prev.includes(docId) ? prev.filter((d) => d !== docId) : [...prev, docId]
    );

  const handleSubmit = async () => {
    setSubmitErr(null);
    setSuccess(null);

    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      setSubmitErr("Please enter a valid loan amount in ETH");
      return;
    }
    if (!form.tenure || parseInt(form.tenure) < 1) {
      setSubmitErr("Please enter a valid tenure (minimum 1 month)");
      return;
    }
    if (selectedDocs.length === 0) {
      setSubmitErr("Please select at least one registered document bundle");
      return;
    }

    const purpose = form.purpose === "Other" ? form.customPurpose : form.purpose;
    if (!purpose.trim()) {
      setSubmitErr("Please specify the loan purpose");
      return;
    }

    try {
      const result = await submitLoan({
        amount: form.amount,
        tenure: parseInt(form.tenure),
        interestRate: parseInt(form.interestRate) || 850,
        purpose,
        docIds: selectedDocs,
      });
      setSuccess(result);
    } catch (err) {
      setSubmitErr(err.reason || err.message);
    }
  };

  if (!account) {
    return (
      <div className="card empty-placeholder">
        <FileText size={42} className="empty-placeholder-icon" />
        <div className="empty-placeholder-title">MetaMask Connection Required</div>
        <p className="empty-placeholder-desc">
          Connect your wallet on Ethereum Sepolia testnet to submit an on-chain loan application.
        </p>
        <button className="btn btn-primary" onClick={connectWallet}>
          Connect MetaMask
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 className="page-title">New Loan Application</h1>
        <p className="page-subtitle">
          Submit your loan request with cryptographically anchored document hashes
        </p>
      </div>

      {/* Stepper */}
      <div
        style={{
          display: "flex",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          background: "#ffffff",
          overflow: "hidden",
          marginBottom: "20px",
        }}
      >
        {[
          { num: 1, title: "Loan Details" },
          { num: 2, title: "Attach Documents" },
          { num: 3, title: "Review & Submit" },
        ].map((s, idx) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div
              key={s.num}
              onClick={() => isDone && setStep(s.num)}
              style={{
                flex: 1,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: isActive ? "#eff6ff" : "#ffffff",
                borderRight: idx < 2 ? "1px solid var(--border-color)" : "none",
                cursor: isDone ? "pointer" : "default",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: isDone ? "#16a34a" : isActive ? "#2563eb" : "#f1f5f9",
                  color: isDone || isActive ? "#ffffff" : "#64748b",
                }}
              >
                {isDone ? "✓" : s.num}
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#1e40af" : isDone ? "#111827" : "#64748b",
                }}
              >
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      {success && (
        <div className="alert-box success">
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px" }}>
              Loan Application #{success.loanId} Successfully Submitted!
            </div>
            <div style={{ fontSize: "12.5px", marginTop: "3px" }}>
              Recorded on Sepolia block ledger. Transaction Hash:{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${success.txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--primary)", fontWeight: 600 }}
              >
                {success.txHash?.slice(0, 16)}…
              </a>
            </div>
            <div style={{ marginTop: "10px" }}>
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => setPage("dashboard")}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {submitErr && (
        <div className="alert-box error">
          <XCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
          <div>{submitErr}</div>
        </div>
      )}

      {/* Step 1: Loan Details */}
      {step === 1 && (
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: "16px" }}>Loan Parameters</h2>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Requested Amount (ETH)</label>
              <input
                type="number"
                step="0.0001"
                min="0.01"
                className="form-control"
                placeholder="0.5"
                value={form.amount}
                onChange={(e) => setField("amount", e.target.value)}
              />
              <span className="form-hint">E.g. 0.5 ETH (~₹1,25,000 equivalent)</span>
            </div>

            <div className="form-group">
              <label className="form-label">Tenure (Months)</label>
              <input
                type="number"
                min="1"
                max="120"
                className="form-control"
                placeholder="24"
                value={form.tenure}
                onChange={(e) => setField("tenure", e.target.value)}
              />
              <span className="form-hint">Loan duration in months</span>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Loan Purpose</label>
              <select
                className="form-control"
                value={form.purpose}
                onChange={(e) => setField("purpose", e.target.value)}
              >
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Interest Rate Preference</label>
              <select
                className="form-control"
                value={form.interestRate}
                onChange={(e) => setField("interestRate", e.target.value)}
              >
                <option value="850">Standard Prime (8.50% p.a.)</option>
                <option value="920">Express Processing (9.20% p.a.)</option>
                <option value="780">Secured Tier (7.80% p.a.)</option>
              </select>
            </div>
          </div>

          {form.purpose === "Other" && (
            <div className="form-group">
              <label className="form-label">Custom Purpose Description</label>
              <input
                className="form-control"
                placeholder="Specify purpose"
                value={form.customPurpose}
                onChange={(e) => setField("customPurpose", e.target.value)}
              />
            </div>
          )}

          {/* EMI Estimate Box */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "14px 16px",
              margin: "12px 0 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>
                ESTIMATED MONTHLY REPAYMENT
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827", marginTop: "2px" }}>
                {calculateEMI(form.amount, form.tenure, form.interestRate)} ETH / month
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: "12px", color: "#6b7280" }}>
              Tenure: {form.tenure} Months<br />
              Rate: {(parseInt(form.interestRate) / 100).toFixed(2)}% p.a.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              <span>Continue to Documents</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Attach Documents */}
      {step === 2 && (
        <div className="card">
          <div className="card-title-row">
            <div>
              <h2 className="card-title">Select Verified Documents</h2>
              <p className="card-desc" style={{ marginTop: "4px", marginBottom: 0 }}>
                Attach document hashes from your registry to prove income and identity on-chain.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {myDocs.some((d) => d.aiAttestation?.verdict === 0) && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const approved = myDocs.filter((d) => d.aiAttestation?.verdict === 0).map((d) => d.id);
                    setSelected(approved);
                  }}
                >
                  Select All Verified
                </button>
              )}
              <span className="status-badge badge-submitted">{selectedDocs.length} Selected</span>
            </div>
          </div>

          {myDocs.length === 0 ? (
            <div className="alert-box warning" style={{ marginTop: "16px" }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
              <div>
                No document hashes found in your registry yet. Please upload your salary slip or bank statement first.
                <div style={{ marginTop: "6px" }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setPage("documents")}>
                    Go to My Documents
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "16px 0 20px" }}>
              {myDocs.map((doc) => {
                const isSelected = selectedDocs.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    style={{
                      border: `1.5px solid ${isSelected ? "#2563eb" : "var(--border-color)"}`,
                      background: isSelected ? "#eff6ff" : "#ffffff",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "4px",
                          border: `1.5px solid ${isSelected ? "#2563eb" : "#cbd5e1"}`,
                          background: isSelected ? "#2563eb" : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        {isSelected && "✓"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13.5px" }}>
                          {DOC_TYPE_LABELS[doc.docType] || "Salary Slip"}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#6b7280", fontFamily: "monospace", display: "flex", gap: "10px", marginTop: "2px" }}>
                          <span>ID: {doc.id.slice(0, 8)}…{doc.id.slice(-6)}</span>
                          <span>Hash: {doc.docHash?.slice(0, 10)}…{doc.docHash?.slice(-6)}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <AIBadge
                        verdict={doc.aiAttestation?.verdict}
                        confidenceBps={doc.aiAttestation?.confidenceBps}
                        size="sm"
                      />
                      {doc.aiAttestation?.verdict === 0 ? (
                        <span className="status-badge badge-approved">Anchored on Chain</span>
                      ) : (
                        <span className="status-badge badge-submitted">Registered</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
            <button className="btn btn-outline" onClick={() => setStep(1)}>
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setStep(3)}
              disabled={selectedDocs.length === 0}
            >
              <span>Review Application</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: "16px" }}>Review & Submit to Sepolia</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
              <span style={{ color: "#6b7280" }}>Loan Amount</span>
              <span style={{ fontWeight: 700, fontSize: "15px" }}>{form.amount} ETH</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
              <span style={{ color: "#6b7280" }}>Tenure</span>
              <span style={{ fontWeight: 600 }}>{form.tenure} Months</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
              <span style={{ color: "#6b7280" }}>Purpose</span>
              <span style={{ fontWeight: 600 }}>{form.purpose === "Other" ? form.customPurpose : form.purpose}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
              <span style={{ color: "#6b7280" }}>Interest Rate</span>
              <span style={{ fontWeight: 600 }}>{(parseInt(form.interestRate) / 100).toFixed(2)}% p.a.</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
              <span style={{ color: "#6b7280" }}>Attached Documents</span>
              <span style={{ fontWeight: 600 }}>{selectedDocs.length} Document(s) Selected</span>
            </div>
          </div>

          {/* Selected Documents Breakdown */}
          {selectedDocs.length > 0 && (
            <div style={{ marginBottom: "16px", padding: "12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                Selected Documents for this Application ({selectedDocs.length}):
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedDocs.map((docId) => {
                  const doc = myDocs.find((d) => d.id === docId);
                  return (
                    <div
                      key={docId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#ffffff",
                        border: "1px solid var(--border-color)",
                        borderRadius: "4px",
                        padding: "5px 10px",
                        fontSize: "12px",
                      }}
                    >
                      <FileText size={13} color="#1e3a5f" />
                      <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                        {doc ? DOC_TYPE_LABELS[doc.docType] || "Document" : "Document"}
                      </span>
                      <span className="hash-tag" style={{ fontSize: "11px" }}>
                        {docId.slice(0, 6)}…{docId.slice(-4)}
                      </span>
                      {doc?.aiAttestation?.verdict === 0 && (
                        <span style={{ fontSize: "10px", color: "#16a34a", fontWeight: 600 }}>✓ AI Verified</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Loan Affordability Analysis on Selected Documents */}
          <div style={{ marginBottom: "16px" }}>
            {affordabilityLoading ? (
              <div style={{ padding: "18px", textAlign: "center", background: "#f8fafc", borderRadius: "6px", border: "1px solid var(--border-color)", fontSize: "12.5px", color: "#64748b" }}>
                Analyzing affordability based on selected documents…
              </div>
            ) : (
              affordability && <AIAffordabilityCard affordability={affordability} />
            )}
          </div>

          <div className="alert-box info" style={{ marginBottom: "20px" }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
            <div>
              <strong>Blockchain Guarantee:</strong> This application will be registered as a tamper-evident record on Ethereum Sepolia.
              Bank officers review the attested hashes directly via the smart contract.
            </div>
          </div>

          {selectedDocs.some(
            (id) => !myDocs.find((d) => d.id === id)?.aiAttestation
          ) && (
            <div className="alert-box warning" style={{ marginBottom: "20px" }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
              <div>
                <strong>Advisory:</strong> One or more selected documents do not have on-chain AI verification attestations. You may still submit, but loan officers may request AI verification before marking documents verified.
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button className="btn btn-outline" onClick={() => setStep(2)}>
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              <Send size={14} />
              <span>{loading ? "Recording Transaction on Chain…" : "Submit Loan Application"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
