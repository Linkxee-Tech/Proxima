from pathlib import Path
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    port: int = 8000
    proxima_data_dir: str = str(Path(__file__).resolve().parents[3] / ".proxima-data")
    proxima_storage_backend: Literal["local", "postgres"] = "local"
    proxima_database_url: str = ""
    proxima_jwt_secret: str = ""
    proxima_cors_origins: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    openai_api_key: str = ""
    proxima_openai_model: str = "gpt-5.6"
    proxima_social_text_model: str = "gpt-5.6-terra"
    proxima_image_model: str = "gpt-image-2"
    proxima_upload_max_bytes: int = 10 * 1024 * 1024
    pinecone_api_key: str = ""
    pinecone_index_host: str = ""
    pinecone_namespace: str = "proxima"
    redis_url: str = ""
    proxima_public_app_url: str = "http://localhost:3001"
    proxima_public_api_url: str = "http://localhost:8000"
    proxima_token_encryption_key: str = ""
    proxima_frontend_callback_url: str = "http://localhost:3001/dashboard/integrations"
    proxima_oauth_state_ttl_seconds: int = 600
    proxima_rate_limit_per_minute: int = 60


settings = Settings()
