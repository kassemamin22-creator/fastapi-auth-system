from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    # MongoDB connection
    MONGODB_URL: str
    DATABASE_NAME: str

    # JWT auth
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    JWT_EXPIRATION_MINUTES: int

    # Tells pydantic-settings where to read env vars from
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# Single shared settings instance, imported wherever config values are needed
settings = Settings()
