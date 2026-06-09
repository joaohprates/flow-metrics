from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_DATABASE_URL = "postgresql://flowmetrics:flowmetrics@127.0.0.1:5432/flowmetrics"


class Settings(BaseSettings):
    database_url: str = DEFAULT_DATABASE_URL
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3010,http://127.0.0.1:3010,"
        "http://localhost:5173,http://127.0.0.1:5173"
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def has_external_database_url(self) -> bool:
        return self.database_url != DEFAULT_DATABASE_URL


@lru_cache
def get_settings() -> Settings:
    return Settings()
