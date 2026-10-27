import { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import {
  Shield, Link2, ChevronDown, LogOut, ExternalLink, Copy, CheckCircle
} from "lucide-react";

function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function RoleBadge({ isOwner, isOfficer, isIssuer }) {
  if (isOwner)   return <span className="badge status-approved">Admin</span>;
  if (isOfficer) return <span className="badge status-review">Officer</span>;
  if (isIssuer)  return <span className="badge status-verified">Issuer</span>;
  return <span className="badge status-submitted">Applicant</span>;
}

export default function Navbar({ page, setPage }) {
  const { account, connectWallet, disconnect, connecting, isOwner, isOfficer, isIssuer } = useWeb3();
  const [copied, setCopied] = useState(false);

  const navLinks = [
    { id: "home",      label: "Home" },
    { id: "dashboard", label: "Dashboard" },
    { id: "documents", label: "Documents" },
    { id: "loans",     label: "Apply for Loan" },
    ...(isOwner || isOfficer ? [{ id: "officer", label: "Officer Panel" }] : []),
    { id: "audit",     label: "Audit Trail" },
    { id: "verify",    label: "Verify" },
  ];

  const copyAddr = () => {
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="navbar-brand" style={{ cursor: "pointer" }} onClick={() => setPage("home")}>
          <div className="brand-logo">
            <Link2 size={16} color="white" />
          </div>
          <span className="brand-name">LoanChain</span>
        </div>

        {/* Links */}
        <div className="navbar-links">
          {navLinks.map((l) => (
            <button
              key={l.id}
              className={`nav-link ${page === l.id ? "active" : ""}`}
              onClick={() => setPage(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Right section */}
        <div className="navbar-right">
          {account ? (
            <>
              <div className="network-badge">
                <span className="network-dot" />
                Sepolia
              </div>
              <RoleBadge isOwner={isOwner} isOfficer={isOfficer} isIssuer={isIssuer} />
              <div
                className="wallet-address"
                onClick={copyAddr}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                title={account}
              >
                {copied ? <CheckCircle size={12} color="#10B981" /> : <Copy size={12} />}
                {shortAddr(account)}
              </div>
              <a
                href={`https://sepolia.etherscan.io/address/${account}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
              >
                <ExternalLink size={13} />
              </a>
              <button className="btn btn-ghost btn-sm" onClick={disconnect}>
                <LogOut size={13} />
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={connectWallet}
              disabled={connecting}
            >
              {connecting ? <span className="spinner" /> : <Shield size={15} />}
              {connecting ? "Connecting…" : "Connect MetaMask"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
