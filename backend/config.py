from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_role_key: str = ""  # サービスロールキー（オプション）
    cors_origins: str = "http://localhost:3000"
    jwt_secret: str = "your-secret-key"
    jwt_algorithm: str = "HS256"

    class Config:
        env_file = ".env"

settings = Settings()
