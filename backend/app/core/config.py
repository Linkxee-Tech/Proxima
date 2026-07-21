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
    proxima_allow_insecure_local_auth: bool = False
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 14
    proxima_password_reset_token_ttl_minutes: int = 30
    proxima_expose_reset_token: bool = False
    proxima_smtp_host: str = ""
    proxima_smtp_port: int = 587
    proxima_smtp_username: str = ""
    proxima_smtp_password: str = ""
    proxima_smtp_from: str = ""
    proxima_smtp_use_tls: bool = True
    proxima_smtp_use_ssl: bool = False
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
    proxima_rate_limit_per_minute: int = 100
    google_access_token: str = ""
    google_calendar_id: str = "primary"
    google_client_id: str = ""
    google_client_secret: str = ""
    slack_webhook_url: str = ""
    slack_client_id: str = ""
    slack_client_secret: str = ""
    notion_client_id: str = ""
    notion_client_secret: str = ""
    twitter_client_id: str = ""
    twitter_client_secret: str = ""
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    facebook_app_id: str = ""
    facebook_app_secret: str = ""
    facebook_page_id: str = ""
    proxima_meta_graph_api_version: str = "v22.0"
    proxima_linkedin_api_version: str = "202606"
    proxima_social_scheduler_interval_seconds: int = 30
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_business_account_id: str = ""
    proxima_enable_sandbox: bool = False
    proxima_sandbox_image: str = "node:22-alpine"
    proxima_sandbox_network: str = "none"
    proxima_allow_demo_fallback: bool = False


settings = Settings()
