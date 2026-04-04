from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str

    openai_api_key: str | None = None
    openai_model: str = "gpt-5.3-mini"

    gnews_api_key: str | None = None

    auto_approve_max_risk: float = 0.30
    auto_reject_min_risk: float = 0.70
    min_confidence_approve: float = 0.80
    min_confidence_reject: float = 0.85

    process_batch_size: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
