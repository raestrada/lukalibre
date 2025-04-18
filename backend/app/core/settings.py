from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "sqlite:///./lukalibre.db"
    groq_api_key: str = ""
    class Config:
        env_file = ".env"
settings = Settings()
