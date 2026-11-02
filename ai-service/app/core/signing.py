import secrets
import time
from typing import Optional, Tuple
from eth_account import Account
from eth_account.messages import encode_typed_data
from eth_hash.auto import keccak
from app.config import settings
from app.models.result import EIP712Attestation

# Type hashes matching AIAttestation.sol
DOMAIN_TYPEHASH = "0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f"
STRUCT_TYPEHASH = "0xd8f9f8b3d8fae54e8580d4564bd51c77c49f560fb7e7bdf8e9fa47316a9b6910"


def to_bytes32_hex(val: str) -> str:
    """Ensures value is 0x-prefixed 64-character hex string (32 bytes)."""
    if val.startswith("0x") and len(val) == 66:
        return val
    # If raw string, compute keccak256
    digest = keccak(val.encode("utf-8"))
    return "0x" + digest.hex()


def sign_doc_attestation(
    doc_id: str,
    doc_hash: str,
    verdict: int,
    confidence_bps: int,
    template_ref: str,
    model_version: str,
    explanation_hash: str,
    private_key: Optional[str] = None,
    deadline_seconds: int = 3600,
    nonce: Optional[int | str] = None,
    verifying_contract: Optional[str] = None,
) -> Tuple[EIP712Attestation, str]:
    """
    Constructs and cryptographically signs an EIP-712 document attestation.
    Returns (attestation_struct, signature_hex).
    """
    key = private_key or settings.ai_signer_private_key
    if not key:
        raise ValueError("AI_SIGNER_PRIVATE_KEY is not configured in settings")

    # Ensure 32-byte representation for byte fields
    b32_doc_id = to_bytes32_hex(doc_id)
    b32_doc_hash = to_bytes32_hex(doc_hash)
    b32_template_ref = to_bytes32_hex(template_ref)
    b32_model_version = to_bytes32_hex(model_version)
    b32_explanation_hash = to_bytes32_hex(explanation_hash)

    now = int(time.time())
    deadline = now + deadline_seconds
    if nonce is not None:
        if isinstance(nonce, int):
            att_nonce_str = hex(nonce)
        else:
            att_nonce_str = str(nonce) if str(nonce).startswith("0x") else hex(int(nonce))
    else:
        att_nonce_str = hex(secrets.randbits(256))

    # Verifying contract address
    contract_addr = verifying_contract or settings.ai_attestation_address
    if not contract_addr or contract_addr == "0x0000000000000000000000000000000000000000":
        contract_addr = "0x0000000000000000000000000000000000000001"

    domain_data = {
        "name": "LoanChainAI",
        "version": "1",
        "chainId": settings.chain_id,
        "verifyingContract": contract_addr,
    }

    message_types = {
        "DocAttestation": [
            {"name": "docId", "type": "bytes32"},
            {"name": "docHash", "type": "bytes32"},
            {"name": "verdict", "type": "uint8"},
            {"name": "confidenceBps", "type": "uint16"},
            {"name": "templateRef", "type": "bytes32"},
            {"name": "modelVersion", "type": "bytes32"},
            {"name": "explanationHash", "type": "bytes32"},
            {"name": "nonce", "type": "uint256"},
            {"name": "deadline", "type": "uint256"},
        ]
    }

    message_data = {
        "docId": b32_doc_id,
        "docHash": b32_doc_hash,
        "verdict": verdict,
        "confidenceBps": confidence_bps,
        "templateRef": b32_template_ref,
        "modelVersion": b32_model_version,
        "explanationHash": b32_explanation_hash,
        "nonce": att_nonce_str,
        "deadline": deadline,
    }

    signable_message = encode_typed_data(
        domain_data=domain_data,
        message_types=message_types,
        message_data=message_data,
    )

    account = Account.from_key(key)
    signed = account.sign_message(signable_message)
    signature_hex = "0x" + signed.signature.hex()

    attestation = EIP712Attestation(
        docId=b32_doc_id,
        docHash=b32_doc_hash,
        verdict=verdict,
        confidenceBps=confidence_bps,
        templateRef=b32_template_ref,
        modelVersion=b32_model_version,
        explanationHash=b32_explanation_hash,
        nonce=att_nonce_str,
        deadline=deadline,
    )

    return attestation, signature_hex
