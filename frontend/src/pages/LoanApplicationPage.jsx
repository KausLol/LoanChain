import { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useLoans, useDocuments } from "../hooks/useBlockchain";
import { DOC_TYPE_LABELS } from "../config/contracts";
import { Send, FileText, CheckCircle2, XCircle, AlertCircle, Paperclip, ChevronRight, ArrowLeft } from "lucide-react";

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

  const [form, setForm] = useState({
    amount: "0.5",
    tenure: "24",
    interestRate: "850",
    purpose: PURPOSES[0],
    customPurpose: "",
  });

  useEffect(() => {
    if (!contracts || !account) return;
    getMyDocuments(account).then((docs) => {
      setMyDocs(docs);
      if (docs.length > 0) {
        setSelected([docs[0].id]);
      }
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

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
            <h2 className="card-title">Select Verified Documents</h2>
            <span className="status-badge badge-submitted">{selectedDocs.length} Selected</span>
          </div>
          <p className="card-desc">
            Attach document hashes from your registry to prove income and identity on-chain.
          </p>

          {myDocs.length === 0 ? (
            <div className="alert-box warning">
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
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
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
                        <div style={{ fontSize: "12px", color: "#6b7280", fontFamily: "monospace" }}>
                          Doc ID: {doc.id.slice(0, 16)}…
                        </div>
                      </div>
                    </div>
                    <span className="status-badge badge-verified">Verified on Chain</span>
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

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
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
              <span style={{ fontWeight: 600 }}>{selectedDocs.length} Document Bundle(s)</span>
            </div>
          </div>

          <div className="alert-box info" style={{ marginBottom: "20px" }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
            <div>
              <strong>Blockchain Guarantee:</strong> This application will be registered as a tamper-evident record on Ethereum Sepolia.
              Bank officers review the attested hashes directly via the smart contract.
            </div>
          </div>

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
