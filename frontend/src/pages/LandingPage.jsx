export default function LandingPage({ onEnter, connectWallet, connecting }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f6f8", display: "flex", flexDirection: "column" }}>

      {/* ── Top Bar ── */}
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
        <span style={{ fontSize: "18px", fontWeight: 700, color: "#1a202c", letterSpacing: "-0.02em" }}>
          LoanChain
        </span>
        <button
          className="btn btn-primary"
          onClick={connectWallet}
          disabled={connecting}
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      </div>

      {/* ── Hero Section ── */}
      <div style={{ flex: 1, padding: "72px 40px 56px" }}>
        <div style={{ maxWidth: "720px" }}>
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
              fontSize: "32px",
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
              maxWidth: "600px",
            }}
          >
            LoanChain anchors document hashes on-chain, applies AI content verification, and produces
            tamper-evident records — without storing raw files.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={connectWallet}
              disabled={connecting}
            >
              {connecting ? "Connecting..." : "Connect Wallet"}
            </button>
            <a
              href="#features"
              style={{ color: "#4a5568", fontSize: "14px", textDecoration: "underline" }}
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ borderTop: "1px solid #e0e4ea", margin: "0 40px" }} />

      {/* ── Feature Grid ── */}
      <div id="features" style={{ padding: "48px 40px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            maxWidth: "960px",
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
                padding: "12px 14px",
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

      {/* ── Divider ── */}
      <div style={{ borderTop: "1px solid #e0e4ea", margin: "0 40px" }} />

      {/* ── Bottom Bar ── */}
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
        <div>LoanChain — Sepolia Testnet</div>
        <div style={{ display: "flex", gap: "16px" }}>
          <a
            href="https://sepolia.etherscan.io"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#6b7280", textDecoration: "none" }}
          >
            Sepolia Etherscan
          </a>
          <a
            href="https://sepoliafaucet.com"
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
