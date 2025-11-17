from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional

class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_role_key: Optional[str] = None  # サービスロールキー（オプション）
    cors_origins: str = "http://localhost:3000,https://ai-study-quote-collector.vercel.app"
    environment: str = "development"  # development or production

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        case_sensitive=False,
        extra='ignore'  # 未定義のフィールドを無視（.envに古い設定があっても動作する）
    )

settings = Settings()
