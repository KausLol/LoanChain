import { useState } from "react";
import { Web3Provider } from "./context/Web3Context";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import LoanApplicationPage from "./pages/LoanApplicationPage";
import DocumentsPage from "./pages/DocumentsPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import AuditTrailPage from "./pages/AuditTrailPage";
import "./index.css";

const PAGES = {
  dashboard:    DashboardPage,
  "new-loan":   LoanApplicationPage,
  documents:    DocumentsPage,
  applications: ApplicationsPage,
  audit:        AuditTrailPage,
};

function Footer() {
  return (
    <footer
      style={{
        padding: "16px 32px",
        borderTop: "1px solid var(--border-color)",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "12px",
        color: "#6b7280",
      }}
    >
      <div>LoanChain — Blockchain Loan Verification Platform (Sepolia Testnet)</div>
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
        <a
          href="https://remix.ethereum.org"
          target="_blank"
          rel="noreferrer"
          style={{ color: "#6b7280", textDecoration: "none" }}
        >
          Remix IDE
        </a>
      </div>
    </footer>
  );
}

function AppContent() {
  const [page, setPage] = useState("dashboard");
  const CurrentPage = PAGES[page] || DashboardPage;

  return (
    <div className="app-container">
      <Header setPage={setPage} />
      <div className="main-wrapper">
        <Sidebar page={page} setPage={setPage} />
        <main className="content-area">
          <CurrentPage setPage={setPage} />
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  );
}
