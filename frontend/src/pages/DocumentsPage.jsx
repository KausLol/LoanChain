import { useState, useEffect, useCallback, useRef } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useDocuments } from "../hooks/useBlockchain";
import { DOC_TYPE_LABELS, DOC_STATUS_LABELS } from "../config/contracts";
import AIBadge from "../components/AIBadge";
import AIVerificationPanel from "../components/AIVerificationPanel";
import {
  Folder,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Lock,
  Copy,
  Check,
  ShieldCheck,
  Shield,
} from "lucide-react";

function StatusBadge({ status, aiAttestation }) {
  if (status === 4) {
    return <span className="status-badge badge-needsdocs">Revoked</span>;
  }
  if (status === 3) {
    return <span className="status-badge badge-rejected">Rejected</span>;
  }
  if (status === 1) {
    return <span className="status-badge badge-verified">Issuer Attested</span>;
  }
  if (status === 2) {
    return <span className="status-badge badge-approved">Officer Verified</span>;
  }
  if (aiAttestation) {
    if (aiAttestation.verdict === 0) {
      return <span className="status-badge badge-approved">Anchored on Chain</span>;
    } else if (aiAttestation.verdict === 1) {
      return <span className="status-badge badge-review">Under Review</span>;
    } else if (aiAttestation.verdict === 2) {
      return <span className="status-badge badge-rejected">AI Rejected</span>;
    }
  }
  return <span className="status-badge badge-submitted">Registered</span>;
}

function formatDate(ts) {
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

function shortHash(hash) {
  if (!hash) return "—";
  return hash.slice(0, 10) + "…" + hash.slice(-8);
}

export default function DocumentsPage() {
  const { account, contracts, connectWallet } = useWeb3();
  const { uploadDocument, getMyDocuments, loading } = useDocuments(contracts);

  const [docs, setDocs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState(0);
  const [ipfsCid, setIpfsCid] = useState("");
  const [success, setSuccess] = useState(null);
  const [uploadErr, setUploadErr] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [aiVerifyingDoc, setAiVerifyingDoc] = useState(null);
  const fileInputRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!contracts || !account) {
      setDocs([]);
      return;
    }
    setRefreshing(true);
    try {
      const d = await getMyDocuments(account);
      if (contracts.aiAttestation && d && d.length > 0) {
        const enriched = await Promise.all(
          d.map(async (item) => {
            try {
              const has = await contracts.aiAttestation.hasAttestation(item.id);
              if (has) {
                const att = await contracts.aiAttestation.getLatestAttestation(item.id);
                return {
                  ...item,
                  aiAttestation: {
                    verdict: Number(att[2]),
                    confidenceBps: Number(att[3]),
                    templateRef: att[4],
                    explanationHash: att[6],
                  },
                };
              }
            } catch (err) {
              console.warn("AI attestation check failed for", item.id, err);
            }
            return item;
          })
        );
        setDocs(enriched);
      } else {
        setDocs(d || []);
      }
    } catch (e) {
      console.error(e);
      setDocs([]);
    } finally {
      setRefreshing(false);
    }
  }, [contracts, account, getMyDocuments]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setSuccess(null);
      setUploadErr(null);
      if (!ipfsCid) {
        setIpfsCid(`ipfs://Qm${Math.random().toString(36).substring(2, 12)}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadErr(null);
    setSuccess(null);

    if (!file) {
      setUploadErr("Please select a document file to hash");
      return;
    }

    setUploading(true);
    try {
      const cidToUse = ipfsCid.trim() || `ipfs://Qm${Math.random().toString(36).substring(2, 12)}`;
      const result = await uploadDocument({
        file,
        docType: parseInt(docType),
        ipfsCid: cidToUse,
        allDocHashes: docs.map((d) => d.docHash),
      });
      setSuccess(result);
      setFile(null);
      setIpfsCid("");
      await refresh();
    } catch (err) {
      setUploadErr(err.reason || err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!account) {
    return (
      <div className="card empty-placeholder">
        <Folder size={42} className="empty-placeholder-icon" />
        <div className="empty-placeholder-title">Wallet Connection Required</div>
        <p className="empty-placeholder-desc">
          Connect MetaMask to register and inspect document hashes on Ethereum Sepolia.
        </p>
        <button className="btn btn-primary" onClick={connectWallet}>
          Connect MetaMask
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h1 className="page-title">My Documents</h1>
          <p className="page-subtitle">
            Cryptographic document registry on Sepolia. Your files stay private and encrypted off-chain.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? "spinner-icon" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "20px", alignItems: "start" }}>
        {/* Registration Card */}
        <div className="card">
          <h2 className="card-title">Register New Document Hash</h2>
          <p className="card-desc">
            Computes a client-side keccak256 hash and registers it in the on-chain registry.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              accept=".pdf,.png,.jpg,.jpeg"
            />

            {!file ? (
              <div
                className="clean-dropzone"
                onClick={() => fileInputRef.current?.click()}
                style={{ marginBottom: "16px" }}
              >
                <div className="dropzone-icon">
                  <Upload size={32} strokeWidth={1.5} />
                </div>
                <div className="dropzone-prompt">Choose document file</div>
                <div className="dropzone-subtext">PDF, PNG, JPG (Hashed locally in browser)</div>
              </div>
            ) : (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FileText size={20} color="#2563eb" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>{file.name}</div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      {(file.size / 1024).toFixed(1)} KB · Client-side keccak256
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setFile(null)}
                >
                  Change
                </button>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Document Type</label>
              <select
                className="form-control"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                {DOC_TYPE_LABELS.map((label, idx) => (
                  <option key={idx} value={idx}>{label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Off-Chain Encrypted Storage (IPFS CID)</label>
              <input
                type="text"
                className="form-control"
                placeholder="ipfs://QmX..."
                value={ipfsCid}
                onChange={(e) => setIpfsCid(e.target.value)}
              />
              <span className="form-hint">
                Only the CID is stored on-chain. No personal PII is written to the ledger.
              </span>
            </div>

            {uploadErr && (
              <div className="alert-box error" style={{ marginBottom: "16px" }}>
                <XCircle size={16} />
                <div>{uploadErr}</div>
              </div>
            )}

            {success && (
              <div className="alert-box success" style={{ marginBottom: "16px" }}>
                <CheckCircle2 size={16} />
                <div>
                  <div style={{ fontWeight: 600 }}>Registered On-Chain!</div>
                  <div style={{ fontSize: "11.5px", fontFamily: "monospace" }}>
                    Doc ID: {success.docId}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading || !file}
              style={{ width: "100%", padding: "9px" }}
            >
              <ShieldCheck size={16} />
              <span>{uploading ? "Anchoring Hash On-Chain…" : "Register Document on Blockchain"}</span>
            </button>
          </form>

          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "#f8fafc",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#6b7280",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <Lock size={15} color="#2563eb" style={{ flexShrink: 0, marginTop: "1px" }} />
            <div>
              <strong>Privacy Guarantee:</strong> Documents are never uploaded in plain text.
              Only the cryptographic keccak256 hash and Merkle bundle root are committed to Sepolia.
            </div>
          </div>
        </div>

        {/* Registered Documents List */}
        <div>
          <div className="card">
            <div className="card-title-row">
              <h2 className="card-title">Registered Documents ({docs.length})</h2>
              {docs.length > 0 && <span className="status-badge badge-verified">Merkle Bundle Active</span>}
            </div>

            {docs.length === 0 ? (
              <div className="empty-placeholder">
                <Folder size={36} className="empty-placeholder-icon" />
                <div className="empty-placeholder-title">No Documents Registered Yet</div>
                <p className="empty-placeholder-desc">
                  Use the form on the left to register your salary slip, bank statement, or ID card hash on Ethereum Sepolia.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "14px 16px",
                      background: "#ffffff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          background: "#eff6ff",
                          border: "1px solid #dbeafe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#2563eb",
                        }}
                      >
                        <FileText size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-main)" }}>
                          {DOC_TYPE_LABELS[doc.docType] || "Document"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>Hash:</span>
                          <span
                            className="hash-tag"
                            onClick={() => handleCopy(doc.docHash, doc.id)}
                            title="Click to copy full keccak256 hash"
                          >
                            {copiedId === doc.id ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                            {shortHash(doc.docHash)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <AIBadge
                        verdict={doc.aiAttestation?.verdict}
                        confidenceBps={doc.aiAttestation?.confidenceBps}
                        size="sm"
                      />
                      <StatusBadge status={doc.status} aiAttestation={doc.aiAttestation} />
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setAiVerifyingDoc(doc)}
                        title="Run AI Verification on this document"
                        style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                      >
                        <Shield size={12} color="#2563eb" />
                        <span>AI Verify</span>
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setSelectedDoc(doc)}
                        title="View Details"
                      >
                        <Eye size={13} />
                        <span>Details</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedDoc && (
        <div className="modal-backdrop" onClick={() => setSelectedDoc(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <span className="modal-card-title">Document Verification Record</span>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedDoc(null)}>✕</button>
            </div>
            <div className="modal-card-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "#6b7280" }}>Document Classification</span>
                  <span style={{ fontWeight: 600 }}>{DOC_TYPE_LABELS[selectedDoc.docType] || "Salary Slip"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "#6b7280" }}>Status</span>
                  <StatusBadge status={selectedDoc.status} aiAttestation={selectedDoc.aiAttestation} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "#6b7280", fontSize: "12px" }}>keccak256 Hash</span>
                  <span className="hash-tag" style={{ wordBreak: "break-all" }}>{selectedDoc.docHash}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "#6b7280", fontSize: "12px" }}>Merkle Bundle Root</span>
                  <span className="hash-tag" style={{ wordBreak: "break-all" }}>{selectedDoc.merkleRoot}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "#6b7280" }}>IPFS Storage Location</span>
                  <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{selectedDoc.ipfsCid}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "#6b7280" }}>Attested By</span>
                  <span style={{ fontSize: "12px" }}>{selectedDoc.issuer || "Self-Uploaded"}</span>
                </div>
                {selectedDoc.aiAttestation && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                    <span style={{ color: "#6b7280" }}>AI Attestation</span>
                    <AIBadge
                      verdict={selectedDoc.aiAttestation.verdict}
                      confidenceBps={selectedDoc.aiAttestation.confidenceBps}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-card-footer">
              <button className="btn btn-outline" onClick={() => setSelectedDoc(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Verification Modal */}
      {aiVerifyingDoc && (
        <div className="modal-backdrop" onClick={() => setAiVerifyingDoc(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-card-header">
              <span className="modal-card-title">AI Document Verification</span>
              <button className="btn btn-outline btn-sm" onClick={() => setAiVerifyingDoc(null)}>✕</button>
            </div>
            <div className="modal-card-body" style={{ padding: "0 20px 20px 20px" }}>
              <AIVerificationPanel
                doc={aiVerifyingDoc}
                contracts={contracts}
                onAnchored={async () => {
                  await refresh();
                }}
                onClose={() => setAiVerifyingDoc(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
