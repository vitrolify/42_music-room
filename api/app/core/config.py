from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Music Room API"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = True

    database_url: str = (
        "postgresql+asyncpg://music_room:music_room@localhost:5432/music_room"
    )

    db_echo: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
