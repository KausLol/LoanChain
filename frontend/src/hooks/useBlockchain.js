import { useState, useCallback } from "react";
import { ethers } from "ethers";

/**
 * Compute the keccak256 hash of a file using browser's SubtleCrypto + ethers
 */
export async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  return ethers.keccak256(bytes);
}

/**
 * Generate a random salt (bytes32)
 */
export function generateSalt() {
  return ethers.hexlify(ethers.randomBytes(32));
}

/**
 * Build a simple Merkle root over an array of bytes32 hashes
 */
export function computeMerkleRoot(hashes) {
  if (hashes.length === 0) return ethers.ZeroHash;
  if (hashes.length === 1) return hashes[0];
  let layer = [...hashes];
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = i + 1 < layer.length ? layer[i + 1] : a;
      next.push(ethers.keccak256(ethers.concat([a, b])));
    }
    layer = next;
  }
  return layer[0];
}

/**
 * Custom hook for document operations
 */
export function useDocuments(contracts) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash]   = useState(null);
  const [error, setError]     = useState(null);

  const clearState = () => { setError(null); setTxHash(null); };

  const uploadDocument = useCallback(async ({ file, docType, ipfsCid, allDocHashes }) => {
    clearState();
    if (!contracts) throw new Error("Contracts not loaded");
    try {
      setLoading(true);
      const docHash    = await hashFile(file);
      const salt       = generateSalt();
      const merkleRoot = computeMerkleRoot(allDocHashes.length > 0 ? allDocHashes : [docHash]);

      const tx = await contracts.documentRegistry.uploadDocument(
        docHash, salt, docType, ipfsCid, merkleRoot
      );
      setTxHash(tx.hash);
      const receipt = await tx.wait();
      // Extract docId from event
      const iface = contracts.documentRegistry.interface;
      const event = receipt.logs
        .map(l => { try { return iface.parseLog(l); } catch { return null; } })
        .find(e => e?.name === "DocumentUploaded");
      return { docId: event?.args?.docId, txHash: tx.hash, docHash };
    } catch (err) {
      setError(err.reason || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contracts]);

  const verifyDocumentIntegrity = useCallback(async (docId, file) => {
    clearState();
    try {
      setLoading(true);
      const docHash = await hashFile(file);
      const isValid = await contracts.documentRegistry.verifyIntegrity(docId, docHash);
      return isValid;
    } catch (err) {
      setError(err.reason || err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [contracts]);

  const getMyDocuments = useCallback(async (address) => {
    try {
      const docIds = await contracts.documentRegistry.getApplicantDocs(address);
      const docs = await Promise.all(
        docIds.map(async (id) => {
          const d = await contracts.documentRegistry.getDocument(id);
          return {
            id,
            docHash: d.docHash,
            owner: d.docOwner,
            issuer: d.issuer,
            docType: Number(d.docType),
            status: Number(d.status),
            ipfsCid: d.ipfsCid,
            uploadedAt: Number(d.uploadedAt),
            attestedAt: Number(d.attestedAt),
            isRevoked: d.isRevoked,
            merkleRoot: d.merkleRoot,
          };
        })
      );
      return docs;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [contracts]);

  return { uploadDocument, verifyDocumentIntegrity, getMyDocuments, loading, txHash, error };
}

/**
 * Custom hook for loan operations
 */
export function useLoans(contracts) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash]   = useState(null);
  const [error, setError]     = useState(null);

  const clearState = () => { setError(null); setTxHash(null); };

  const submitLoan = useCallback(async ({ amount, tenure, interestRate, purpose, docIds }) => {
    clearState();
    try {
      setLoading(true);
      const amountWei = ethers.parseEther(amount.toString());
      const tx = await contracts.loanApplication.submitLoan(
        amountWei, tenure, interestRate, purpose, docIds
      );
      setTxHash(tx.hash);
      const receipt = await tx.wait();
      const iface = contracts.loanApplication.interface;
      const event = receipt.logs
        .map(l => { try { return iface.parseLog(l); } catch { return null; } })
        .find(e => e?.name === "LoanSubmitted");
      return { loanId: event?.args?.loanId?.toString(), txHash: tx.hash };
    } catch (err) {
      setError(err.reason || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contracts]);

  const getMyLoans = useCallback(async (address) => {
    try {
      const ids = await contracts.loanApplication.getApplicantLoans(address);
      const loans = await Promise.all(
        ids.map(async (id) => {
          const l = await contracts.loanApplication.getLoan(id);
          const docIds = await contracts.loanApplication.getLoanDocIds(id);
          return {
            id: id.toString(),
            applicant: l.applicant,
            amount: ethers.formatEther(l.amount),
            tenure: Number(l.tenure),
            interestRate: Number(l.interestRate),
            purpose: l.purpose,
            status: Number(l.status),
            submittedAt: Number(l.submittedAt),
            updatedAt: Number(l.updatedAt),
            assignedOfficer: l.assignedOfficer,
            rejectionReason: l.rejectionReason,
            disbursed: l.disbursed,
            docIds,
          };
        })
      );
      return loans;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [contracts]);

  const getAllLoans = useCallback(async () => {
    try {
      const total = await contracts.loanApplication.getTotalLoans();
      const ids = Array.from({ length: Number(total) }, (_, i) => i + 1);
      const loans = await Promise.all(
        ids.map(async (id) => {
          const l = await contracts.loanApplication.getLoan(id);
          return {
            id: id.toString(),
            applicant: l.applicant,
            amount: ethers.formatEther(l.amount),
            tenure: Number(l.tenure),
            interestRate: Number(l.interestRate),
            purpose: l.purpose,
            status: Number(l.status),
            submittedAt: Number(l.submittedAt),
            updatedAt: Number(l.updatedAt),
            assignedOfficer: l.assignedOfficer,
            rejectionReason: l.rejectionReason,
            disbursed: l.disbursed,
          };
        })
      );
      return loans;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, [contracts]);

  const getLoanAuditTrail = useCallback(async (loanId) => {
    try {
      const total = await contracts.loanApplication.getLoanAuditLength();
      const entries = [];
      for (let i = 0; i < Number(total); i++) {
        const e = await contracts.loanApplication.getLoanAuditEntry(i);
        if (e.loanId.toString() === loanId.toString()) {
          entries.push({
            loanId: e.loanId.toString(),
            fromStatus: Number(e.fromStatus),
            toStatus: Number(e.toStatus),
            actor: e.actor,
            note: e.note,
            timestamp: Number(e.timestamp),
          });
        }
      }
      return entries;
    } catch (err) {
      return [];
    }
  }, [contracts]);

  // Officer actions
  const officerAction = useCallback(async (action, ...args) => {
    clearState();
    try {
      setLoading(true);
      const tx = await contracts.loanApplication[action](...args);
      setTxHash(tx.hash);
      await tx.wait();
      return tx.hash;
    } catch (err) {
      setError(err.reason || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contracts]);

  return { submitLoan, getMyLoans, getAllLoans, getLoanAuditTrail, officerAction, loading, txHash, error };
}
