# LoanChain 

**Blockchain-Powered Loan Document Verification**
Built on Ethereum Sepolia · MetaMask · Solidity · React + ethers.js

---

## Clean, Human-Made UI Design

The user interface has been completely redesigned following real-world fintech & SaaS design systems:
- **Zero AI Gradients**: Pure solid colors (Slate, Royal Blue, Emerald, Amber, Rose).
- **Zero Emojis**: Every emoji replaced with crisp SVG and Lucide icons.
- **Reference-Accurate Dashboard**:
  - **Top Header**: Clean geometric cube outline logo + "LoanChain", network pill with active green dot (`Sepolia Testnet`), and MetaMask wallet pill (`0x3f2...a7C1`).
  - **Left Sidebar**: Clear navigation (`Dashboard`, `New Application`, `My Documents`, `Applications`, `Audit Log`, `Officer Panel`, `Document Verifier`).
  - **4 Clean Metric Cards**: Verified Documents, Active Application, Approved Applications, Pending Actions.
  - **Upload Document Card**: Dashed dropzone with local browser-side keccak256 hashing and IPFS CID storage.
  - **Recent Activity Card**: Vertical timeline with connected line, color-coded event dots, and direct "View on Blockchain" links.
  - **Your Applications**: Clean data table with soft status badges (`Under Review`, `Approved`, `Rejected`, `Counter Offered`) and details modal.

---

## Project Structure

```
loanchain_new/
├── contracts/              ← Solidity contracts (deploy via Remix IDE)
│   ├── IssuerRegistry.sol
│   ├── DocumentRegistry.sol
│   ├── ConsentManager.sol
│   ├── LoanApplication.sol
│   └── README.md           ← Remix IDE deployment guide
│
└── frontend/               ← React + ethers.js frontend
    ├── src/
    │   ├── components/
    │   │   ├── Header.jsx      ← Clean top bar with network & MetaMask pills
    │   │   ├── Sidebar.jsx     ← Clean vertical navigation sidebar
    │   │   └── Icons.jsx       ← Geometric cube logo & MetaMask Fox SVG
    │   ├── config/
    │   │   └── contracts.js    ← ABIs, contract addresses, enum labels
    │   ├── context/
    │   │   └── Web3Context.jsx ← MetaMask / ethers.js provider
    │   ├── hooks/
    │   │   └── useBlockchain.js ← Document & loan lifecycle hooks
    │   ├── pages/
    │   │   ├── DashboardPage.jsx   ← Primary dashboard matching reference screenshot
    │   │   ├── LoanApplicationPage.jsx ← 3-step loan application form with EMI calculator
    │   │   ├── DocumentsPage.jsx   ← My Documents registry & client-side hashing
    │   │   ├── ApplicationsPage.jsx ← Filterable loan applications table
    │   │   ├── AuditTrailPage.jsx  ← State machine & document event logs
    │   │   ├── OfficerPanelPage.jsx ← Bank officer review, counter-offers, decisions
    │   │   └── VerifyPage.jsx      ← Document integrity tamper-check tool
    │   ├── index.css           ← Clean design system (no gradients, solid colors)
    │   └── App.jsx
    ├── .env.example
    └── index.html
```

---

## Quick Start

### Step 1 — Deploy Contracts (Remix IDE)

See [`contracts/README.md`](contracts/README.md) for full instructions.

**Order:**
1. `IssuerRegistry.sol`
2. `DocumentRegistry.sol` (arg: IssuerRegistry address)
3. `ConsentManager.sol`
4. `LoanApplication.sol` (args: DocumentRegistry address, IssuerRegistry address)

**Network:** Ethereum Sepolia Testnet (Chain ID: `11155111`)

### Step 2 — Configure Frontend (ONLY FOR OFFICER ACCOUNT)

```bash
cd frontend
cp .env.example .env
```

Set your contract addresses:
```
VITE_ISSUER_REGISTRY=0x...
VITE_DOC_REGISTRY=0x...
VITE_CONSENT_MANAGER=0x...
VITE_LOAN_APPLICATION=0x...
```

### Step 3 — Run Development Server

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser and connect MetaMask.
