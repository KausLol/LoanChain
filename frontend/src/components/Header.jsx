import { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { CubeLogo, MetaMaskFox } from "./Icons";
import { ChevronDown, Copy, Check, ExternalLink, LogOut, Shield } from "lucide-react";

function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function Header({ setPage }) {
  const { account, connectWallet, disconnect, connecting, isOwner, isOfficer } = useWeb3();
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCopy = () => {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="top-header">
      {/* Brand logo */}
      <div className="brand-section" onClick={() => setPage("dashboard")}>
        <div className="brand-logo-icon">
          <CubeLogo size={26} color="#111827" />
        </div>
        <span className="brand-title">LoanChain</span>
      </div>

      {/* Right controls matching reference image */}
      <div className="header-right">
        {/* Network indicator pill */}
        <div className="network-pill">
          <span className="network-dot" />
          <span>Sepolia Testnet</span>
          <ChevronDown size={14} color="#6b7280" />
        </div>

        {/* Wallet pill or Connect button */}
        {account ? (
          <div style={{ position: "relative" }}>
            <div
              className="account-pill"
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ cursor: "pointer" }}
              title="Click for account options"
            >
              <MetaMaskFox size={20} />
              <span>{shortAddr(account)}</span>
            </div>

            {showDropdown && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  background: "#ffffff",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  boxShadow: "var(--shadow-md)",
                  padding: "8px",
                  minWidth: "200px",
                  zIndex: 100,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ padding: "6px 10px", fontSize: "11px", color: "#6b7280", borderBottom: "1px solid var(--border-color)", marginBottom: "4px" }}>
                  Connected Wallet
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: "12px", marginTop: "2px" }}>
                    {shortAddr(account)}
                  </div>
                  {(isOwner || isOfficer) && (
                    <div style={{ marginTop: "4px" }}>
                      <span className="status-badge badge-verified" style={{ fontSize: "10px", padding: "1px 6px" }}>
                        {isOwner ? "Admin" : "Officer"}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  className="nav-item"
                  onClick={handleCopy}
                  style={{ padding: "6px 10px", fontSize: "12.5px" }}
                >
                  {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  <span>{copied ? "Address Copied" : "Copy Address"}</span>
                </button>

                <a
                  href={`https://sepolia.etherscan.io/address/${account}`}
                  target="_blank"
                  rel="noreferrer"
                  className="nav-item"
                  style={{ padding: "6px 10px", fontSize: "12.5px" }}
                >
                  <ExternalLink size={14} />
                  <span>View on Etherscan</span>
                </a>

                <button
                  className="nav-item"
                  onClick={() => {
                    disconnect();
                    setShowDropdown(false);
                  }}
                  style={{ padding: "6px 10px", fontSize: "12.5px", color: "#dc2626" }}
                >
                  <LogOut size={14} />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="btn btn-primary"
            onClick={connectWallet}
            disabled={connecting}
          >
            <MetaMaskFox size={18} />
            <span>{connecting ? "Connecting…" : "Connect Wallet"}</span>
          </button>
        )}
      </div>
    </header>
  );
}
