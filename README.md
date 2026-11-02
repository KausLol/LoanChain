# LoanChain 

**Blockchain-Powered Loan Document Verification with Explainable AI**  
Built on Ethereum Sepolia · MetaMask · Solidity · React + Ethers.js v6 · FastAPI + PyMuPDF + pgmpy

---

## System Overview

LoanChain pairs a decentralized, tamper-evident blockchain layer with an off-chain explainable AI document verification engine:
1. **Phase 1: Blockchain Infrastructure (Sepolia)**:
   - Client-side in-browser `keccak256` hashing and Merkle bundle generation.
   - Strict state machine (`LoanApplication.sol`) and immutable on-chain audit trails.
   - Institutional trust anchors via accredited issuer attestations (`IssuerRegistry.sol`).
2. **Phase 2: Classical Explainable AI Verification Layer (`ai-service/`)**:
   - Layout-aware PDF and image text extraction with OCR fallback.
   - Versioned, declarative validation templates (`id@version`) specifying expected fields and arithmetic relations.
   - Deterministic forward-chaining rule engine (FOPL) generating verifiable proof traces.
   - Forensic signal detection (editing software metadata, font inconsistencies, incremental updates, overlay whiteouts, ELA).
   - Bayesian risk network (`pgmpy`) computing fraud probability and advisory verdicts (`Approved`, `Borderline`, `Rejected`).
   - Cryptographic EIP-712 typed-data signing anchored on-chain via `AIAttestation.sol`.

For full specifications and document generation prompts, see [`AI_VERIFICATION_GUIDE.md`](AI_VERIFICATION_GUIDE.md).

---

## Project Structure

```
loanchain_new/
├── ai-service/             ← Phase 2: Classical Explainable AI Verification Service
│   ├── app/
│   │   ├── api/            ← FastAPI endpoints (/verify/document, /verify/bundle, /report, /templates)
│   │   ├── core/           ← Intake, chain client, extract, rules, forensics, scoring, signing
│   │   ├── models/         ← Pydantic schemas (facts, template, result)
│   │   └── store/          ← SQLite report persistence (keyed by explanationHash)
│   ├── templates/          ← Versioned declarative YAML validation templates
│   ├── tests/              ← 39 automated pytest integration and unit tests
│   ├── .env.example
│   └── requirements.txt
│
├── contracts/              ← Solidity contracts (deploy via Remix IDE)
│   ├── IssuerRegistry.sol
│   ├── DocumentRegistry.sol
│   ├── ConsentManager.sol
│   ├── LoanApplication.sol ← State machine with requireAIForDocsVerified gating
│   ├── AIAttestation.sol   ← Phase 2: EIP-712 attestation verifier & bundle evaluator
│   └── README.md           ← Remix IDE deployment guide
│
├── frontend/               ← React 19 + Vite + Ethers.js v6 frontend
│   ├── src/
│   │   ├── components/     ← AIBadge, AIVerificationPanel, Header, Sidebar, Icons
│   │   ├── config/         ← ABIs, contract addresses, enum labels
│   │   ├── context/        ← Web3Context (MetaMask provider & contracts)
│   │   ├── hooks/          ← useAIVerification, useBlockchain
│   │   ├── services/       ← aiService (FastAPI client)
│   │   ├── pages/          ← Dashboard, Documents, LoanApplication, Applications, AuditTrail
│   │   └── index.css       ← Clean fintech design system (slate neutrals, royal blue)
│   ├── .env.example
│   └── package.json
│
├── dummy/                  ← Sample real-world test PDFs (Aarav Mehta & Priya Sharma bundles)
├── AI_VERIFICATION_GUIDE.md ← Comprehensive AI verification manual & generation guide
└── PROJECT_INFO.md         ← Full architectural and contract documentation
```

---

## Quick Start Guide

### Step 1 — Deploy Smart Contracts (Remix IDE)

Follow [`contracts/README.md`](contracts/README.md) to compile with Solidity `0.8.19` (200 optimizer runs):
1. Deploy `IssuerRegistry.sol`
2. Deploy `DocumentRegistry.sol` (arg: `IssuerRegistry` address)
3. Deploy `ConsentManager.sol`
4. Deploy `LoanApplication.sol` (args: `DocumentRegistry` address, `IssuerRegistry` address)
5. Deploy `AIAttestation.sol` (args: `DocumentRegistry` address, `AI_SIGNER_ADDRESS`)
6. Link attestation on `LoanApplication`: call `LoanApplication.setAIAttestation(AIAttestation_address)`

### Step 2 — Start the AI Verification Microservice

```bash
cd ai-service

# Create and activate Python 3.11 virtual environment
uv venv --python 3.11
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# Install pinned dependencies
uv pip install -r requirements.txt

# Run the test suite (39 tests)
pytest

# Launch FastAPI service on port 8000
uvicorn app.main:app --port 8000 --reload
```

### Step 3 — Start the Frontend Application

```bash
cd frontend

# Install dependencies
npm install

# Configure environment in frontend/.env
cp .env.example .env

# Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser. Ensure MetaMask is connected to **Ethereum Sepolia Testnet**.
