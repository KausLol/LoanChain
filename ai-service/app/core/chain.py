from typing import Dict, Any, Optional
from eth_hash.auto import keccak
from web3 import Web3
from app.config import settings

# ABI snippet for DocumentRegistry
DOC_REGISTRY_ABI = [
    {
        "inputs": [{"name": "_docId", "type": "bytes32"}],
        "name": "getDocument",
        "outputs": [
            {"name": "docHash", "type": "bytes32"},
            {"name": "docOwner", "type": "address"},
            {"name": "issuer", "type": "address"},
            {"name": "docType", "type": "uint8"},
            {"name": "status", "type": "uint8"},
            {"name": "ipfsCid", "type": "string"},
            {"name": "uploadedAt", "type": "uint256"},
            {"name": "attestedAt", "type": "uint256"},
            {"name": "isRevoked", "type": "bool"},
            {"name": "merkleRoot", "type": "bytes32"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "_docId", "type": "bytes32"},
            {"name": "_docHash", "type": "bytes32"},
        ],
        "name": "verifyIntegrity",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
]

ISSUER_REGISTRY_ABI = [
    {
        "inputs": [{"name": "_addr", "type": "address"}],
        "name": "isActiveIssuer",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    }
]


def compute_keccak256(data: bytes) -> str:
    """Computes keccak256 hex digest prefixed with 0x."""
    digest = keccak(data)
    return "0x" + digest.hex()


class ChainClient:
    def __init__(self, rpc_url: Optional[str] = None):
        self.rpc_url = rpc_url or settings.rpc_url
        self._w3: Optional[Web3] = None

    @property
    def w3(self) -> Web3:
        if self._w3 is None:
            self._w3 = Web3(Web3.HTTPProvider(self.rpc_url, request_kwargs={"timeout": 10}))
        return self._w3

    def get_document_info(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """
        Reads document metadata from DocumentRegistry contract.
        Returns dict with docHash, owner, issuer, docType, status, isRevoked.
        Returns None if document not found or contract call fails.
        """
        registry_addr = settings.document_registry_address
        if not registry_addr or registry_addr == "0x0000000000000000000000000000000000000000":
            return None

        try:
            checksum_addr = Web3.to_checksum_address(registry_addr)
            contract = self.w3.eth.contract(address=checksum_addr, abi=DOC_REGISTRY_ABI)
            # Ensure doc_id is 32-byte hex
            doc_id_bytes = bytes.fromhex(doc_id[2:] if doc_id.startswith("0x") else doc_id)
            res = contract.functions.getDocument(doc_id_bytes).call()
            doc_hash = "0x" + res[0].hex()
            if doc_hash == "0x" + "00" * 32:
                return None

            return {
                "docHash": doc_hash,
                "owner": res[1],
                "issuer": res[2],
                "docType": res[3],
                "status": res[4],
                "ipfsCid": res[5],
                "uploadedAt": res[6],
                "attestedAt": res[7],
                "isRevoked": res[8],
                "merkleRoot": "0x" + res[9].hex(),
            }
        except Exception:
            return None

    def is_active_issuer(self, issuer_address: str) -> bool:
        """Checks if address is a verified active issuer."""
        reg_addr = settings.issuer_registry_address
        if not reg_addr or reg_addr == "0x0000000000000000000000000000000000000000":
            return False
        try:
            checksum_addr = Web3.to_checksum_address(reg_addr)
            contract = self.w3.eth.contract(address=checksum_addr, abi=ISSUER_REGISTRY_ABI)
            return contract.functions.isActiveIssuer(Web3.to_checksum_address(issuer_address)).call()
        except Exception:
            return False


chain_client = ChainClient()
