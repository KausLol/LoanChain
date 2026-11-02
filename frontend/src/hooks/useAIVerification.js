import { useState, useCallback } from "react";
import { hashFile } from "./useBlockchain";
import { verifyDocument } from "../services/aiService";

/**
 * Hook for managing the complete lifecycle of AI document verification:
 * 1. Client-side keccak256 hash validation before transmission
 * 2. Explicit privacy consent prompt
 * 3. AI Service verification analysis
 * 4. On-chain EIP-712 attestation anchoring via MetaMask
 */
export function useAIVerification(contracts) {
  const [status, setStatus] = useState("idle"); // 'idle' | 'hashing' | 'consent' | 'analyzing' | 'result' | 'anchoring' | 'anchored' | 'error'
  const [file, setFile] = useState(null);
  const [docId, setDocId] = useState(null);
  const [docType, setDocType] = useState(0);
  const [registeredDocHash, setRegisteredDocHash] = useState(null);
  const [computedHash, setComputedHash] = useState(null);
  const [result, setResult] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setStatus("idle");
    setFile(null);
    setDocId(null);
    setDocType(0);
    setRegisteredDocHash(null);
    setComputedHash(null);
    setResult(null);
    setTxHash(null);
    setError(null);
    setLoading(false);
  }, []);

  /**
   * Prepares verification by rehashing the selected file in-browser and comparing
   * to the on-chain docHash. If matched, transitions to 'consent' state.
   */
  const prepareVerification = useCallback(async ({ fileToVerify, targetDocId, targetDocType, expectedDocHash }) => {
    setError(null);
    setFile(fileToVerify);
    setDocId(targetDocId);
    setDocType(targetDocType);
    setRegisteredDocHash(expectedDocHash);
    setStatus("hashing");
    setLoading(true);

    try {
      const localHash = await hashFile(fileToVerify);
      setComputedHash(localHash);

      if (expectedDocHash && localHash.toLowerCase() !== expectedDocHash.toLowerCase()) {
        const mismatchErr = new Error(
          `Local file keccak256 hash (${localHash.slice(0, 10)}…) does not match the registered on-chain docHash (${expectedDocHash.slice(0, 10)}…). Verification aborted to protect data integrity.`
        );
        mismatchErr.code = "HASH_MISMATCH";
        setError(mismatchErr.message);
        setStatus("error");
        setLoading(false);
        return false;
      }

      setStatus("consent");
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message || "Failed to hash local file");
      setStatus("error");
      setLoading(false);
      return false;
    }
  }, []);

  /**
   * Called when user confirms consent in the UI. Sends file to AI verification service.
   */
  const confirmConsentAndAnalyze = useCallback(async (skipChainCheck = false) => {
    if (!file || !docId) {
      setError("No document selected for analysis");
      setStatus("error");
      return null;
    }

    setStatus("analyzing");
    setLoading(true);
    setError(null);

    try {
      const data = await verifyDocument({
        file,
        docId,
        docType,
        skipChainCheck,
      });

      setResult(data);
      setStatus("result");
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message || "AI Verification failed");
      setStatus("error");
      setLoading(false);
      return null;
    }
  }, [file, docId, docType]);

  /**
   * Submits the EIP-712 signed attestation to AIAttestation.sol on Sepolia.
   */
  const anchorAttestation = useCallback(async () => {
    if (!contracts?.aiAttestation) {
      throw new Error("AIAttestation contract not initialized or loaded");
    }
    if (!result?.attestation || !result?.signature) {
      throw new Error("No cryptographic attestation available to anchor");
    }

    setStatus("anchoring");
    setLoading(true);
    setError(null);

    try {
      const att = result.attestation;
      const sig = result.signature;

      // Ensure nonce is formatted as a valid uint256 string or BigInt for ethers, preventing float overflow
      let safeNonce = att.nonce;
      if (typeof safeNonce === "string") {
        safeNonce = safeNonce.trim();
      } else if (typeof safeNonce === "number") {
        safeNonce = BigInt(Math.floor(safeNonce)).toString();
      }

      const attestationTuple = [
        att.docId,
        att.docHash,
        att.verdict,
        att.confidenceBps,
        att.templateRef,
        att.modelVersion,
        att.explanationHash,
        safeNonce,
        att.deadline,
      ];

      const tx = await contracts.aiAttestation.submitAttestation(attestationTuple, sig);
      setTxHash(tx.hash);
      await tx.wait();
      setStatus("anchored");
      setLoading(false);
      return tx.hash;
    } catch (err) {
      setError(err.reason || err.message || "Failed to submit attestation on-chain");
      setStatus("error");
      setLoading(false);
      throw err;
    }
  }, [contracts, result]);

  /**
   * Fetches latest on-chain attestation for a document ID if one exists.
   */
  const fetchOnChainAttestation = useCallback(async (targetDocId) => {
    if (!contracts?.aiAttestation || !targetDocId) return null;
    try {
      const exists = await contracts.aiAttestation.hasAttestation(targetDocId);
      if (!exists) return null;
      const att = await contracts.aiAttestation.getLatestAttestation(targetDocId);
      return {
        docId: att[0],
        docHash: att[1],
        verdict: Number(att[2]),
        confidenceBps: Number(att[3]),
        templateRef: att[4],
        modelVersion: att[5],
        explanationHash: att[6],
        nonce: att[7]?.toString(),
        deadline: Number(att[8]),
      };
    } catch (err) {
      console.warn("Could not fetch on-chain attestation:", err);
      return null;
    }
  }, [contracts]);

  return {
    status,
    loading,
    error,
    file,
    docId,
    docType,
    registeredDocHash,
    computedHash,
    result,
    txHash,
    reset,
    prepareVerification,
    confirmConsentAndAnalyze,
    anchorAttestation,
    fetchOnChainAttestation,
  };
}
