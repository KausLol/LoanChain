"""Generate a development AI signer keypair for LoanChain AI Service.

Outputs the public address and saves or updates .env.
"""

from pathlib import Path
from eth_account import Account


def generate_dev_signer(env_path: Path = None):
    # Enable unaudited HD wallet features if needed
    Account.enable_unaudited_hdwallet_features()
    acct = Account.create()
    priv_key = acct.key.hex()
    address = acct.address

    print("==================================================")
    print("Generated AI Signer Keypair for Development")
    print("==================================================")
    print(f"Address:     {address}")
    print(f"Private Key: {priv_key}")
    print("==================================================")

    if env_path is None:
        env_path = Path(__file__).resolve().parent.parent / ".env"

    if env_path.exists():
        content = env_path.read_text(encoding="utf-8")
        if "AI_SIGNER_PRIVATE_KEY=" in content:
            lines = []
            for line in content.splitlines():
                if line.startswith("AI_SIGNER_PRIVATE_KEY="):
                    lines.append(f"AI_SIGNER_PRIVATE_KEY={priv_key}")
                else:
                    lines.append(line)
            env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
            print(f"Updated AI_SIGNER_PRIVATE_KEY in {env_path}")
        else:
            with open(env_path, "a", encoding="utf-8") as f:
                f.write(f"\nAI_SIGNER_PRIVATE_KEY={priv_key}\n")
            print(f"Appended AI_SIGNER_PRIVATE_KEY to {env_path}")
    else:
        # copy from .env.example if exists
        example_path = env_path.parent / ".env.example"
        if example_path.exists():
            content = example_path.read_text(encoding="utf-8")
            content = content.replace(
                "AI_SIGNER_PRIVATE_KEY=0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                f"AI_SIGNER_PRIVATE_KEY={priv_key}",
            )
            env_path.write_text(content, encoding="utf-8")
            print(f"Created {env_path} from .env.example with new AI signer key")
        else:
            env_path.write_text(f"AI_SIGNER_PRIVATE_KEY={priv_key}\n", encoding="utf-8")
            print(f"Created {env_path}")

    return address, priv_key


if __name__ == "__main__":
    generate_dev_signer()
