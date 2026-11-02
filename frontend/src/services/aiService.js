import { AI_SERVICE_URL } from "../config/contracts";

/**
 * Checks health, version, and connectivity of the LoanChain AI Verification service.
 */
export async function checkAIHealth() {
  const resp = await fetch(`${AI_SERVICE_URL}/v1/health`);
  if (!resp.ok) {
    throw new Error(`AI Service health check failed: HTTP ${resp.status}`);
  }
  return resp.json();
}

/**
 * Lists all declarative validation templates currently active in the service.
 */
export async function getAITemplates() {
  const resp = await fetch(`${AI_SERVICE_URL}/v1/templates`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch AI templates: HTTP ${resp.status}`);
  }
  return resp.json();
}

/**
 * Fetches an immutable, persisted explanation report by explanation hash.
 */
export async function getAIReport(explanationHash) {
  const resp = await fetch(`${AI_SERVICE_URL}/v1/report/${explanationHash}`);
  if (!resp.ok) {
    if (resp.status === 404) return null;
    throw new Error(`Failed to fetch AI report: HTTP ${resp.status}`);
  }
  return resp.json();
}

/**
 * Verifies a single registered document file against its on-chain registration.
 *
 * @param {Object} params
 * @param {File|Blob} params.file The document file (PDF, PNG, JPG)
 * @param {string} params.docId The 0x-prefixed 32-byte on-chain document ID
 * @param {number} params.docType Integer enum (0=Salary Slip, 1=Bank Statement, 2=ID Card, etc.)
 * @param {boolean} [params.skipChainCheck=false] Set true only in offline dev mode
 * @returns {Promise<Object>} VerificationResult with verdict, confidence, checks, signals, attestation, and signature
 */
export async function verifyDocument({ file, docId, docType, skipChainCheck = false }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("docId", docId);
  formData.append("docType", String(docType));
  formData.append("skip_chain_check", String(skipChainCheck));

  const resp = await fetch(`${AI_SERVICE_URL}/v1/verify/document`, {
    method: "POST",
    body: formData,
  });

  const data = await resp.json();

  if (!resp.ok) {
    const errorMsg = data?.detail?.error?.message || data?.detail || `HTTP ${resp.status} error`;
    const errorCode = data?.detail?.error?.code || "VERIFICATION_FAILED";
    const err = new Error(errorMsg);
    err.code = errorCode;
    throw err;
  }

  return data;
}

/**
 * Verifies an entire loan document bundle executing cross-document reconciliation rules.
 *
 * @param {Object} params
 * @param {Array<File|Blob>} params.files Array of document files
 * @param {Array<string>} params.docIds Array of on-chain document IDs
 * @param {Array<number>} params.docTypes Array of document types
 * @param {number|null} [params.loanId=null] Optional loan ID
 * @param {boolean} [params.skipChainCheck=false]
 * @returns {Promise<Object>} BundleResult with suggested action and cross-document check traces
 */
export async function verifyDocumentBundle({
  files,
  docIds,
  docTypes,
  loanId = null,
  loanAmount = null,
  tenure = null,
  interestRate = null,
  skipChainCheck = false,
}) {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  formData.append("docIds", docIds.join(","));
  formData.append("docTypes", docTypes.map(String).join(","));
  if (loanId != null) {
    formData.append("loanId", String(loanId));
  }
  if (loanAmount != null) {
    formData.append("loanAmount", String(loanAmount));
  }
  if (tenure != null) {
    formData.append("tenure", String(tenure));
  }
  if (interestRate != null) {
    formData.append("interestRate", String(interestRate));
  }
  formData.append("skip_chain_check", String(skipChainCheck));

  const resp = await fetch(`${AI_SERVICE_URL}/v1/verify/bundle`, {
    method: "POST",
    body: formData,
  });

  const data = await resp.json();

  if (!resp.ok) {
    const errorMsg = data?.detail?.error?.message || data?.detail || `HTTP ${resp.status} error`;
    const errorCode = data?.detail?.error?.code || "BUNDLE_VERIFICATION_FAILED";
    const err = new Error(errorMsg);
    err.code = errorCode;
    throw err;
  }

  return data;
}

/**
 * Performs AI-assisted loan affordability, DTI, and repayment capacity analysis.
 * Advisory recommendation only: Human officer remains authoritative.
 */
export async function analyzeAffordability({
  docIds = null,
  monthlyIncome = null,
  existingObligations = null,
  loanAmount = null,
  tenure = null,
  interestRate = null,
}) {
  const formData = new FormData();
  if (docIds && docIds.length > 0) {
    formData.append("docIds", Array.isArray(docIds) ? docIds.join(",") : String(docIds));
  }
  if (monthlyIncome != null) formData.append("monthlyIncome", String(monthlyIncome));
  if (existingObligations != null) formData.append("existingObligations", String(existingObligations));
  if (loanAmount != null) formData.append("loanAmount", String(loanAmount));
  if (tenure != null) formData.append("tenure", String(tenure));
  if (interestRate != null) formData.append("interestRate", String(interestRate));

  const resp = await fetch(`${AI_SERVICE_URL}/v1/analyze/affordability`, {
    method: "POST",
    body: formData,
  });

  const data = await resp.json();
  if (!resp.ok) {
    const errorMsg = data?.detail?.error?.message || data?.detail || `HTTP ${resp.status} error`;
    throw new Error(errorMsg);
  }
  return data;
}
