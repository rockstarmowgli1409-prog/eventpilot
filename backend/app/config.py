from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5-5"
    database_url: str = "sqlite:///./eventpilot.db"
    allowed_origins: str = "http://localhost:5173"
    daily_cost_cap_usd: float = 3.0
    rate_limit_per_minute: int = 10
    # Estimated USD per million tokens; override via env if the model's pricing differs.
    price_input_per_mtok: float = 3.0
    price_output_per_mtok: float = 15.0

    @field_validator("database_url")
    @classmethod
    def _normalise_db_url(cls, v: str) -> str:
        # Render hands out postgres:// or postgresql:// URLs; SQLAlchemy needs the driver name.
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix) :]
        return v

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
