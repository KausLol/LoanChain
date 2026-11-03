/**
 * Pinata IPFS Integration Service for LoanChain
 * Supports uploading documents to Public Pinata IPFS and resolving gateway URLs
 */

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || "";
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY || "";
const PINATA_API_SECRET = import.meta.env.VITE_PINATA_API_SECRET || "";
const PINATA_GATEWAY = (import.meta.env.VITE_PINATA_GATEWAY || "https://gateway.pinata.cloud").replace(/\/$/, "");
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";

/**
 * Checks if Pinata credentials are configured in frontend or backend
 */
export function isPinataConfigured() {
  return Boolean(PINATA_JWT.trim() || (PINATA_API_KEY.trim() && PINATA_API_SECRET.trim()));
}

/**
 * Cleans an IPFS CID by stripping prefixes like "ipfs://", "/ipfs/", etc.
 */
export function cleanIpfsCid(cid) {
  if (!cid) return "";
  return String(cid)
    .trim()
    .replace(/^ipfs:\/\//i, "")
    .replace(/^\/ipfs\//i, "")
    .trim();
}

/**
 * Returns a public IPFS gateway URL for a given CID
 */
export function getIpfsGatewayUrl(cid) {
  const clean = cleanIpfsCid(cid);
  if (!clean) return "";
  return `${PINATA_GATEWAY}/ipfs/${clean}`;
}

/**
 * Returns alternative public gateway links in case of gateway rate limits
 */
export function getGatewayOptions(cid) {
  const clean = cleanIpfsCid(cid);
  if (!clean) return [];
  return [
    { name: "Pinata Gateway", url: `${PINATA_GATEWAY}/ipfs/${clean}` },
    { name: "IPFS.io", url: `https://ipfs.io/ipfs/${clean}` },
    { name: "dweb.link", url: `https://dweb.link/ipfs/${clean}` },
    { name: "Cloudflare IPFS", url: `https://cloudflare-ipfs.com/ipfs/${clean}` },
  ];
}

/**
 * Uploads a document file to Pinata IPFS
 * @param {File|Blob} file The file to pin to IPFS
 * @param {Object} [metadata={}] Optional key-value metadata tags
 * @returns {Promise<{ cid: string, ipfsUri: string, gatewayUrl: string, pinSize: number, timestamp: string }>}
 */
export async function uploadFileToPinata(file, metadata = {}) {
  if (!file) throw new Error("No file provided for IPFS upload");

  const formData = new FormData();
  formData.append("file", file);

  const pinataMetadata = JSON.stringify({
    name: file.name || `doc-${Date.now()}.pdf`,
    keyvalues: {
      app: "LoanChain",
      uploadedAt: new Date().toISOString(),
      ...metadata,
    },
  });
  formData.append("pinataMetadata", pinataMetadata);

  const pinataOptions = JSON.stringify({
    cidVersion: 1,
  });
  formData.append("pinataOptions", pinataOptions);

  // Strategy 1: Direct upload via Frontend JWT
  if (PINATA_JWT.trim()) {
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT.trim()}`,
      },
      body: formData,
    });

    if (!res.ok) {
      let errDetail = "";
      try {
        const errJson = await res.json();
        errDetail = errJson.error?.details || errJson.error || errJson.message || "";
      } catch {
        errDetail = `HTTP ${res.status}`;
      }
      throw new Error(`Pinata upload failed (${res.status}): ${errDetail}`);
    }

    const data = await res.json();
    const cid = data.IpfsHash;
    return {
      cid,
      ipfsUri: `ipfs://${cid}`,
      gatewayUrl: getIpfsGatewayUrl(cid),
      pinSize: data.PinSize,
      timestamp: data.Timestamp,
    };
  }

  // Strategy 2: Direct upload via API Key + Secret
  if (PINATA_API_KEY.trim() && PINATA_API_SECRET.trim()) {
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: PINATA_API_KEY.trim(),
        pinata_secret_api_key: PINATA_API_SECRET.trim(),
      },
      body: formData,
    });

    if (!res.ok) {
      let errDetail = "";
      try {
        const errJson = await res.json();
        errDetail = errJson.error?.details || errJson.error || errJson.message || "";
      } catch {
        errDetail = `HTTP ${res.status}`;
      }
      throw new Error(`Pinata upload failed (${res.status}): ${errDetail}`);
    }

    const data = await res.json();
    const cid = data.IpfsHash;
    return {
      cid,
      ipfsUri: `ipfs://${cid}`,
      gatewayUrl: getIpfsGatewayUrl(cid),
      pinSize: data.PinSize,
      timestamp: data.Timestamp,
    };
  }

  // Strategy 3: Backend relay via ai-service
  try {
    const backendForm = new FormData();
    backendForm.append("file", file);
    if (metadata.docType !== undefined) {
      backendForm.append("docType", String(metadata.docType));
    }

    const backendRes = await fetch(`${AI_SERVICE_URL}/v1/ipfs/upload`, {
      method: "POST",
      body: backendForm,
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      const cid = data.cid || data.IpfsHash;
      return {
        cid,
        ipfsUri: `ipfs://${cid}`,
        gatewayUrl: getIpfsGatewayUrl(cid),
        pinSize: data.pinSize || data.PinSize,
        timestamp: data.timestamp || data.Timestamp,
      };
    }
  } catch (backendErr) {
    console.warn("Backend IPFS relay unreachable:", backendErr);
  }

  // If credentials are not configured anywhere
  throw new Error(
    "Pinata IPFS is not configured. Please add VITE_PINATA_JWT to frontend/.env (or PINATA_JWT to ai-service/.env) to enable real IPFS document pinning."
  );
}
