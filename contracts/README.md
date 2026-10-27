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

## Initial Setup (Post Deployment)

1. **Add document issuers** via `IssuerRegistry.addIssuer(address, name, type)`
2. **Add bank officers** via `LoanApplication.addOfficer(address)`

## Key Addresses to Save (add to frontend .env)
```
REACT_APP_ISSUER_REGISTRY=<deployed address>
REACT_APP_DOC_REGISTRY=<deployed address>
REACT_APP_CONSENT_MANAGER=<deployed address>
REACT_APP_LOAN_APPLICATION=<deployed address>
```

## Network Settings
- Network: Sepolia Testnet
- Chain ID: 11155111
- RPC: https://sepolia.infura.io/v3/YOUR_KEY

## Solidity Version
- Compiler: `0.8.19`
- Optimization: Enabled (200 runs)
