from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origin: str = "http://localhost:5173"

    # Ethereum / Sepolia
    rpc_url: str = "https://rpc.sepolia.org"
    chain_id: int = 11155111
    document_registry_address: str = "0x0000000000000000000000000000000000000000"
    ai_attestation_address: str = "0x0000000000000000000000000000000000000000"
    loan_application_address: str = "0x0000000000000000000000000000000000000000"
    issuer_registry_address: str = "0x0000000000000000000000000000000000000000"

    # Private key for EIP-712 attestation signing
    ai_signer_private_key: str = ""

    # Path configurations
    thresholds_path: str = "config/thresholds.yaml"
    templates_dir: str = "templates"
    database_url: str = "sqlite:///data/reports.db"

    # Pinata IPFS
    pinata_jwt: str = ""
    pinata_api_key: str = ""
    pinata_api_secret: str = ""
    pinata_gateway: str = "https://gateway.pinata.cloud"

    # Limits & security
    max_upload_size_mb: int = 10
    max_pages: int = 20
    rate_limit_per_minute: int = 60
    log_level: str = "INFO"
    version: str = "0.1.0"

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
