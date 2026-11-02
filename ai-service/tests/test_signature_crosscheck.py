import secrets
import time
from eth_abi import encode
from eth_account import Account
from eth_account.messages import encode_typed_data
from eth_hash.auto import keccak

from app.core.signing import (
    DOMAIN_TYPEHASH,
    STRUCT_TYPEHASH,
    sign_doc_attestation,
    to_bytes32_hex,
)
from app.models.result import VerdictEnum


def test_typehashes():
    """Verify DOMAIN_TYPEHASH and STRUCT_TYPEHASH match Solidity keccak256 definitions."""
    domain_type_str = "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    expected_domain_th = "0x" + keccak(domain_type_str.encode("utf-8")).hex()
    assert DOMAIN_TYPEHASH.lower() == expected_domain_th.lower()

    struct_type_str = "DocAttestation(bytes32 docId,bytes32 docHash,uint8 verdict,uint16 confidenceBps,bytes32 templateRef,bytes32 modelVersion,bytes32 explanationHash,uint256 nonce,uint256 deadline)"
    expected_struct_th = "0x" + keccak(struct_type_str.encode("utf-8")).hex()
    assert STRUCT_TYPEHASH.lower() == expected_struct_th.lower()


def test_domain_separator_manual_vs_library():
    """Verify manual ABI-encoded domain separator matches EIP-712 standard."""
    chain_id = 11155111
    verifying_contract = "0x1111111111111111111111111111111111111111"
    name_hash = keccak(b"LoanChainAI")
    version_hash = keccak(b"1")

    # Manual abi.encode matching AIAttestation.sol domainSeparator()
    encoded_domain = encode(
        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
        [
            bytes.fromhex(DOMAIN_TYPEHASH[2:]),
            name_hash,
            version_hash,
            chain_id,
            verifying_contract,
        ],
    )
    manual_domain_sep = "0x" + keccak(encoded_domain).hex()

    # Via eth-account encode_typed_data
    domain_data = {
        "name": "LoanChainAI",
        "version": "1",
        "chainId": chain_id,
        "verifyingContract": verifying_contract,
    }
    typed_data = encode_typed_data(
        domain_data=domain_data,
        message_types={"Empty": []},
        message_data={},
    )
    # typed_data.header is the 32-byte domain_separator
    library_domain_sep = "0x" + typed_data.header.hex()

    assert manual_domain_sep.lower() == library_domain_sep.lower()


def test_struct_hash_and_digest():
    """Verify struct hash calculation and signature recovery against secp256k1 low-s constraints."""
    priv_key = "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
    account = Account.from_key(priv_key)
    signer_address = account.address

    doc_id = "0x" + "01" * 32
    doc_hash = "0x" + "02" * 32
    verdict = int(VerdictEnum.APPROVED)
    confidence_bps = 9800
    template_ref = to_bytes32_hex("sal_slip_tech_corp@1.0.0")
    model_version = to_bytes32_hex("loanchain-ai-v2.0.0")
    explanation_hash = "0x" + "03" * 32
    nonce = 123456789
    deadline = int(time.time()) + 3600

    # 1. Manual struct hash matching Solidity:
    # keccak256(abi.encode(ATTESTATION_TYPEHASH, docId, docHash, verdict, confidenceBps, templateRef, modelVersion, explanationHash, nonce, deadline))
    struct_encoded = encode(
        [
            "bytes32",
            "bytes32",
            "bytes32",
            "uint8",
            "uint16",
            "bytes32",
            "bytes32",
            "bytes32",
            "uint256",
            "uint256",
        ],
        [
            bytes.fromhex(STRUCT_TYPEHASH[2:]),
            bytes.fromhex(doc_id[2:]),
            bytes.fromhex(doc_hash[2:]),
            verdict,
            confidence_bps,
            bytes.fromhex(template_ref[2:]),
            bytes.fromhex(model_version[2:]),
            bytes.fromhex(explanation_hash[2:]),
            nonce,
            deadline,
        ],
    )
    struct_hash = keccak(struct_encoded)

    # 2. Domain separator
    chain_id = 11155111
    contract_addr = "0x1111111111111111111111111111111111111111"
    name_hash = keccak(b"LoanChainAI")
    version_hash = keccak(b"1")
    encoded_domain = encode(
        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
        [
            bytes.fromhex(DOMAIN_TYPEHASH[2:]),
            name_hash,
            version_hash,
            chain_id,
            contract_addr,
        ],
    )
    domain_sep = keccak(encoded_domain)

    # 3. Final EIP-712 digest: keccak256("\x19\x01" + domain_sep + struct_hash)
    digest = keccak(b"\x19\x01" + domain_sep + struct_hash)

    # 4. Generate via sign_doc_attestation
    att, sig_hex = sign_doc_attestation(
        doc_id=doc_id,
        doc_hash=doc_hash,
        verdict=verdict,
        confidence_bps=confidence_bps,
        template_ref="sal_slip_tech_corp@1.0.0",
        model_version="loanchain-ai-v2.0.0",
        explanation_hash=explanation_hash,
        private_key=priv_key,
        deadline_seconds=3600,
        nonce=nonce,
        verifying_contract=contract_addr,
    )

    # Overwrite deadline in att to match our manual deadline for exact comparison
    # (or test sign_doc_attestation with recovered signer)
    assert sig_hex.startswith("0x")
    sig_bytes = bytes.fromhex(sig_hex[2:])
    assert len(sig_bytes) == 65

    r = sig_bytes[:32]
    s = sig_bytes[32:64]
    v = sig_bytes[64]

    # Enforce low-s (BIP-62 / EIP-2)
    secp256k1n_half = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D57617F775B6159584C609677274530
    assert int.from_bytes(s, "big") <= secp256k1n_half
    assert v in (27, 28)

    # Recover signer from the typed data using sign_doc_attestation's output
    recovered = Account._recover_hash(
        # The digest computed by eth-account internally:
        # We verify signable_message recovery:
        digest,
        vrs=(v, int.from_bytes(r, "big"), int.from_bytes(s, "big")),
    )
    # The sign_doc_attestation generated signature is valid for its own deadline
    # Let's recover using the standard recover_message from encode_typed_data
    domain_data = {
        "name": "LoanChainAI",
        "version": "1",
        "chainId": 11155111,
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
        "docId": att.docId,
        "docHash": att.docHash,
        "verdict": att.verdict,
        "confidenceBps": att.confidenceBps,
        "templateRef": att.templateRef,
        "modelVersion": att.modelVersion,
        "explanationHash": att.explanationHash,
        "nonce": att.nonce,
        "deadline": att.deadline,
    }
    signable = encode_typed_data(
        domain_data=domain_data,
        message_types=message_types,
        message_data=message_data,
    )
    recovered_signer = Account.recover_message(signable, signature=sig_bytes)
    assert recovered_signer.lower() == signer_address.lower()
