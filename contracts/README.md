# LoanChain Smart Contracts — Remix IDE Deployment Guide

## Contract Deployment Order

Deploy in this exact order on **Ethereum Sepolia Testnet**:

### Step 1: Deploy `IssuerRegistry.sol`
- No constructor arguments needed
- Copy the deployed contract address → call it `ISSUER_REGISTRY_ADDRESS`

### Step 2: Deploy `DocumentRegistry.sol`
- Constructor argument: `ISSUER_REGISTRY_ADDRESS`
- Copy the deployed contract address → call it `DOC_REGISTRY_ADDRESS`

### Step 3: Deploy `ConsentManager.sol`
- No constructor arguments needed

### Step 4: Deploy `LoanApplication.sol`
- Constructor arguments: `DOC_REGISTRY_ADDRESS`, `ISSUER_REGISTRY_ADDRESS`
- Copy the deployed contract address → call it `LOAN_APPLICATION_ADDRESS`

### Step 5: Deploy `AIAttestation.sol` (Phase 2 AI Verification Layer)
- Constructor arguments: `DOC_REGISTRY_ADDRESS`, `AI_SIGNER_ADDRESS`
  - `DOC_REGISTRY_ADDRESS`: The deployed address from Step 2
  - `AI_SIGNER_ADDRESS`: The Ethereum address of the AI service signer key (from `ai-service/.env` `AI_SIGNER_PRIVATE_KEY`)
- Copy the deployed contract address → call it `AI_ATTESTATION_ADDRESS`

## Initial Setup (Post Deployment)

1. **Add document issuers** via `IssuerRegistry.addIssuer(address, name, type)`
2. **Add bank officers** via `LoanApplication.addOfficer(address)`
3. **Link AI Attestation to Loan Application** (Phase 2):
   - Call `LoanApplication.setAIAttestation(AI_ATTESTATION_ADDRESS)`
   - *(Optional)* Enable strict AI enforcement: `LoanApplication.setRequireAIForDocsVerified(true)`
     *(When true, officers cannot mark documents verified unless every document has an approved/borderline AI attestation)*

## Key Addresses to Save (add to frontend .env)
```env
# Phase 1 Contracts
VITE_ISSUER_REGISTRY=<deployed address>
VITE_DOC_REGISTRY=<deployed address>
VITE_CONSENT_MANAGER=<deployed address>
VITE_LOAN_APPLICATION=<deployed address>

# Phase 2 AI Attestation & Service
VITE_AI_ATTESTATION=<deployed address>
VITE_AI_SERVICE_URL=http://localhost:8000
```
*(Note: Legacy Create-React-App `REACT_APP_*` prefixes can also be mirrored if using an alternative bundler).*

## Network Settings
- Network: Sepolia Testnet
- Chain ID: 11155111
- RPC: https://sepolia.infura.io/v3/YOUR_KEY

## Solidity Version
- Compiler: `0.8.19`
- Optimization: Enabled (200 runs)
