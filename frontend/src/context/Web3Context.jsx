import { createContext, useContext, useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_ADDRESSES,
  SEPOLIA_CHAIN_ID,
  SEPOLIA_NETWORK,
  ISSUER_REGISTRY_ABI,
  DOCUMENT_REGISTRY_ABI,
  CONSENT_MANAGER_ABI,
  LOAN_APPLICATION_ABI,
  AI_ATTESTATION_ABI,
} from "../config/contracts";

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [account, setAccount]       = useState(null);
  const [provider, setProvider]     = useState(null);
  const [signer, setSigner]         = useState(null);
  const [chainId, setChainId]       = useState(null);
  const [isOwner, setIsOwner]       = useState(false);
  const [isOfficer, setIsOfficer]   = useState(false);
  const [isIssuer, setIsIssuer]     = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError]           = useState(null);

  // ── Contract instances ─────────────────────────────────────────────────────
  const getContracts = useCallback((signerOrProvider) => {
    const s = signerOrProvider;
    return {
      issuerRegistry:   new ethers.Contract(CONTRACT_ADDRESSES.IssuerRegistry,   ISSUER_REGISTRY_ABI,   s),
      documentRegistry: new ethers.Contract(CONTRACT_ADDRESSES.DocumentRegistry, DOCUMENT_REGISTRY_ABI, s),
      consentManager:   new ethers.Contract(CONTRACT_ADDRESSES.ConsentManager,   CONSENT_MANAGER_ABI,   s),
      loanApplication:  new ethers.Contract(CONTRACT_ADDRESSES.LoanApplication,  LOAN_APPLICATION_ABI,  s),
      aiAttestation:    new ethers.Contract(CONTRACT_ADDRESSES.AIAttestation,    AI_ATTESTATION_ABI,    s),
    };
  }, []);

  // ── Switch to Sepolia ──────────────────────────────────────────────────────
  const switchToSepolia = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchErr) {
      if (switchErr.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [SEPOLIA_NETWORK],
        });
      } else {
        throw switchErr;
      }
    }
  }, []);

  // ── Resolve roles ──────────────────────────────────────────────────────────
  const resolveRoles = useCallback(async (address, signerInstance) => {
    try {
      const c = getContracts(signerInstance);
      const [owner, officerStatus, issuerStatus] = await Promise.all([
        c.loanApplication.owner(),
        c.loanApplication.officers(address),
        c.issuerRegistry.isActiveIssuer(address),
      ]);
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
      setIsOfficer(officerStatus);
      setIsIssuer(issuerStatus);
    } catch {
      // contracts might not be deployed yet
      setIsOwner(false); setIsOfficer(false); setIsIssuer(false);
    }
  }, [getContracts]);

  // ── Connect wallet ─────────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    setError(null);
    if (!window.ethereum) {
      setError("MetaMask not found. Please install it from metamask.io");
      return;
    }
    try {
      setConnecting(true);
      await switchToSepolia();
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const network  = await browserProvider.getNetwork();
      const signerInstance = await browserProvider.getSigner();
      const addr = accounts[0];

      setProvider(browserProvider);
      setSigner(signerInstance);
      setAccount(addr);
      setChainId(network.chainId.toString());
      await resolveRoles(addr, signerInstance);

      // Listen for account/chain changes
      window.ethereum.on("accountsChanged", async (accs) => {
        if (accs.length === 0) { disconnect(); return; }
        const newSigner = await browserProvider.getSigner();
        setSigner(newSigner);
        setAccount(accs[0]);
        await resolveRoles(accs[0], newSigner);
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    } catch (err) {
      setError(err.message || "Connection failed");
    } finally {
      setConnecting(false);
    }
  }, [switchToSepolia, resolveRoles]);

  const disconnect = useCallback(() => {
    setAccount(null); setProvider(null); setSigner(null);
    setChainId(null); setIsOwner(false); setIsOfficer(false); setIsIssuer(false);
  }, []);

  const contracts = signer ? getContracts(signer) : null;

  return (
    <Web3Context.Provider value={{
      account, provider, signer, chainId,
      isOwner, isOfficer, isIssuer,
      connecting, error, contracts,
      connectWallet, disconnect,
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used within Web3Provider");
  return ctx;
}
