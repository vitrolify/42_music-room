from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Music Room API"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = True

    # Overriden in .env file for production
    database_url: str = (
        "postgresql+asyncpg://music_room:music_room@localhost:5432/music_room"
    )

    db_echo: bool = False

    cors_origins: list[str] = [
        "http://localhost:8081",
        "http://localhost:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8080",
    ]

    firebase_credentials_path: str = "secrets/vitrolify-sa.json"
    firebase_project_id: str = "vitrolify-5c94a"

    model_config: SettingsConfigDict = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
