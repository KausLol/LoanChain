import { CubeLogo } from "../components/Icons";

/* Blockchain diagram: static chain of 3 linked blocks */
function BlockchainDiagram() {
  const blocks = [
    { num: "#4817", hash: "0x3a4f…c291", label: "Doc Hash", time: "Oct 27" },
    { num: "#4818", hash: "0x8d1e…fa03", label: "AI Attest", time: "Oct 29" },
    { num: "#4819", hash: "0x2b7c…e55a", label: "Approved", time: "Nov 03" },
  ];

  const blockStyle = {
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    padding: "14px 16px",
    width: "145px",
    flexShrink: 0,
  };

  return (
    <div style={{ userSelect: "none" }}>
      <div style={{ fontSize: "10px", color: "#9ca3af", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "12px" }}>
        Ethereum Sepolia · Live Chain
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
        {blocks.map((b, i) => (
          <div key={b.num} style={{ display: "flex", alignItems: "center" }}>
            <div style={blockStyle}>
              <div style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "4px", fontWeight: 500 }}>
                Block {b.num}
              </div>
              <div style={{ fontSize: "11px", color: "#374151", fontFamily: "monospace", marginBottom: "6px", wordBreak: "break-all" }}>
                {b.hash}
              </div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "#1e3a5f", marginBottom: "2px" }}>
                {b.label}
              </div>
              <div style={{ fontSize: "10px", color: "#9ca3af" }}>{b.time}</div>
            </div>
            {i < blocks.length - 1 && (
              <div style={{ display: "flex", alignItems: "center", padding: "0 6px" }}>
                <svg width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="0" y1="6" x2="18" y2="6" stroke="#d1d5db" strokeWidth="1.5"/>
                  <polyline points="14,2 20,6 14,10" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
        ))}
        {/* Pending block */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "0 6px" }}>
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="0" y1="6" x2="18" y2="6" stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="3 2"/>
              <polyline points="14,2 20,6 14,10" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ ...blockStyle, borderStyle: "dashed", background: "#f9fafb" }}>
            <div style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "4px", fontWeight: 500 }}>
              Block #4820
            </div>
            <div style={{ fontSize: "11px", color: "#d1d5db", fontFamily: "monospace", marginBottom: "6px" }}>
              pending…
            </div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#9ca3af", marginBottom: "2px" }}>
              Pending
            </div>
            <div style={{ fontSize: "10px", color: "#d1d5db" }}>-</div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: "10px", color: "#d1d5db", marginTop: "10px" }}>
        keccak256 · EIP-712 · Sepolia Testnet
      </div>
    </div>
  );
}

export default function LandingPage({ onEnter, connectWallet, connecting }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f6f8", display: "flex", flexDirection: "column" }}>

      {/* Top Bar */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e0e4ea",
          height: "52px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
        }}
      >
        <div className="brand-section" style={{ cursor: "default" }}>
          <div className="brand-logo-icon">
            <CubeLogo size={26} color="#111827" />
          </div>
          <span className="brand-title">LoanChain</span>
        </div>
        <button
          className="btn btn-primary"
          onClick={connectWallet}
          disabled={connecting}
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      </div>

      {/* Hero Section */}
      <div style={{ flex: 1, padding: "72px 40px 56px", display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            gap: "48px",
          }}
        >
          {/* Left: text */}
          <div style={{ maxWidth: "620px" }}>
            <p
              style={{
                fontSize: "11px",
                color: "#6b7280",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "20px",
                fontWeight: 500,
              }}
            >
              Blockchain-Verified Loan Infrastructure
            </p>

            <h1
              style={{
                fontSize: "34px",
                fontWeight: 700,
                color: "#1a202c",
                lineHeight: 1.25,
                letterSpacing: "-0.02em",
                marginBottom: "20px",
              }}
            >
              Document verification and loan processing on Ethereum.
            </h1>

            <p
              style={{
                fontSize: "15px",
                color: "#4a5568",
                lineHeight: 1.65,
                marginBottom: "32px",
                maxWidth: "580px",
              }}
            >
              LoanChain anchors document hashes on-chain, applies AI content verification, and produces
              tamper-evident records without storing raw files.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={connectWallet}
                disabled={connecting}
              >
                {connecting ? "Connecting..." : "Connect Wallet"}
              </button>
              <button
                className="btn btn-outline btn-lg"
                onClick={onEnter}
              >
                Enter Dashboard
              </button>
            </div>
          </div>

          {/* Right: blockchain diagram */}
          <div style={{ flexShrink: 0 }}>
            <BlockchainDiagram />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #e0e4ea", margin: "0 40px" }} />

      {/* Feature Grid */}
      <div id="features" style={{ padding: "48px 40px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "28px 40px",
            width: "100%",
          }}
        >
          {[
            {
              label: "On-Chain Document Registry",
              desc: "keccak256 hashes stored permanently on Ethereum Sepolia",
            },
            {
              label: "AI Content Verification",
              desc: "Salary slips, bank statements and IDs checked by a local rule engine",
            },
            {
              label: "EIP-712 Attestation",
              desc: "Cryptographically signed results anchored on-chain by the AI signer",
            },
            {
              label: "Tamper Detection",
              desc: "Forensic signals and Bayesian scoring flag document inconsistencies",
            },
            {
              label: "Officer Execution",
              desc: "Loan officers review AI evidence and execute decisions on-chain",
            },
            {
              label: "Consent-Aware Processing",
              desc: "Documents sent to AI service only after explicit applicant consent",
            },
          ].map((f) => (
            <div
              key={f.label}
              style={{
                borderLeft: "2px solid #e0e4ea",
                padding: "12px 18px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#1a202c",
                  marginBottom: "6px",
                }}
              >
                {f.label}
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #e0e4ea", margin: "0 40px" }} />

      {/* Bottom Bar */}
      <div
        style={{
          background: "#ffffff",
          borderTop: "1px solid #e0e4ea",
          padding: "16px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "12px",
          color: "#6b7280",
        }}
      >
        <div>LoanChain · Sepolia Testnet</div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a
            href="https://sepolia.etherscan.io"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#6b7280", textDecoration: "none" }}
          >
            Sepolia Etherscan
          </a>
          <span style={{ color: "#cbd5e1" }}>|</span>
          <a
            href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#6b7280", textDecoration: "none" }}
          >
            Get Sepolia ETH
          </a>
        </div>
      </div>
    </div>
  );
}
